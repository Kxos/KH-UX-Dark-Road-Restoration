'use strict';
/**
 * Server privato KHUX - fase B.
 *
 * Obiettivo di questa fase: rispondere al bootstrap e all'handshake di sessione,
 * e soprattutto REGISTRARE TUTTO. Non conosciamo la superficie REST del gioco: gli
 * endpoint principali non sono enumerabili dalle stringhe del binario. Il client,
 * quando parla con noi, ce la racconta da solo.
 *
 * Contratto ricavato dal binario (vedi PHASE-A.md):
 *   bootstrap -> { maintenance, url, nativeToken }    letto da FUN_007be0d0
 *   sessione  -> { nativeSessionId, sharedSecurityKey } letto da FUN_007bd5b8
 *   header successivi: X-HTTP-USER-TOKEN: <token>
 *
 * Avvio:  node server/server.js
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const codec = require('./khux-codec');
const { startDns } = require('./dns');

// ---------------------------------------------------------------------------
// Configurazione
// ---------------------------------------------------------------------------
const HTTP_PORT = Number(process.env.KHUX_HTTP_PORT || 80);
const HTTPS_PORT = Number(process.env.KHUX_HTTPS_PORT || 443);
const CERT_DIR = path.join(__dirname, 'certs');
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'requests.ndjson');
const DNS_LOG_FILE = path.join(LOG_DIR, 'dns.ndjson');

// DNS: l'IP verso cui dirottare e i domini da dirottare.
const DNS_ENABLED = process.env.KHUX_DNS !== '0';
const DNS_PORT = Number(process.env.KHUX_DNS_PORT || 53);
const DNS_UPSTREAM = process.env.KHUX_DNS_UPSTREAM || '1.1.1.1';
const HIJACK = (process.env.KHUX_HIJACK || 'sqex-bridge.jp,kingdomhearts.com,square-enix.com')
  .split(',').map((s) => s.trim()).filter(Boolean);

// La url che consegniamo al client nel bootstrap: deve essere raggiungibile DAL
// TELEFONO, quindi l'IP della macchina sulla rete locale, non localhost.
const PUBLIC_URL = process.env.KHUX_PUBLIC_URL || 'https://127.0.0.1';

// Dove mandare la richiesta di sessione. Per nome, non per IP: l'host di
// bootstrap risolve gia' su di noi ed e' coperto dal certificato.
const SESSION_BASE = process.env.KHUX_SESSION_BASE || 'https://api-s.sp.kingdomhearts.com';

// Stato di sessione. La sharedSecurityKey la scegliamo noi: e' il punto in cui
// prendiamo il controllo dell'intero canale cifrato.
const SESSION = {
  nativeSessionId: crypto.randomUUID(),
  sharedSecurityKey: codec.newSecurityKey(),
  nativeToken: crypto.randomBytes(24).toString('hex'),
};

fs.mkdirSync(LOG_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
let seq = 0;

function logRequest(entry) {
  entry.seq = ++seq;
  entry.ts = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');

  const mark = entry.handled ? '\x1b[32m[ok]\x1b[0m' : '\x1b[33m[?]\x1b[0m ';
  console.log(`${mark} #${entry.seq} ${entry.method} ${entry.url}`);
  for (const [k, v] of Object.entries(entry.headers)) {
    if (/token|auth|session|key|user-agent|content-type/i.test(k)) {
      console.log(`      ${k}: ${v}`);
    }
  }
  if (entry.bodyJson) {
    console.log('      body(json):', JSON.stringify(entry.bodyJson).slice(0, 400));
  } else if (entry.bodyDecoded) {
    console.log(`      body(decifrato, iv=${entry.ivStrategy}):`,
      JSON.stringify(entry.bodyDecoded).slice(0, 400));
  } else if (entry.bodyText) {
    console.log('      body(testo):', entry.bodyText.slice(0, 300));
  } else if (entry.bodyBase64) {
    console.log(`      body(opaco, ${entry.bodyBytes} byte):`, entry.bodyBase64.slice(0, 120));
  }
}

// ---------------------------------------------------------------------------
// Parsing del corpo: proviamo in ordine JSON, payload cifrato, testo, opaco
// ---------------------------------------------------------------------------
function parseBody(buf, headers) {
  const out = { bodyBytes: buf.length };
  if (!buf.length) return out;

  let data = buf;
  if (/gzip/i.test(headers['content-encoding'] || '')) {
    try { data = zlib.gunzipSync(buf); } catch { /* lo teniamo grezzo */ }
  }
  data = codec.maybeGunzip(data);

  if (codec.looksLikeJson(data)) {
    out.bodyJson = JSON.parse(data.toString('utf8'));
    return out;
  }

  const asText = data.toString('utf8');
  // Dopo la sessione il client manda form urlencoded con un solo campo:
  // v=<base64 di AES-256-CBC(JSON), IV a zero>.
  const form = /^v=/.test(asText) ? new URLSearchParams(asText).get('v') : null;
  const dec = codec.decode((form || asText).trim(), SESSION.sharedSecurityKey);
  if (dec.ok) {
    out.bodyDecoded = dec.json;
    out.ivStrategy = dec.strategy;
    return out;
  }
  out.decodeAttempts = dec.attempts;

  if (/^[\x20-\x7e\s]*$/.test(asText) && asText.trim()) {
    out.bodyText = asText;
  } else {
    out.bodyBase64 = data.toString('base64');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rotte note
// ---------------------------------------------------------------------------
function route(url) {
  const p = url.split('?')[0].toLowerCase();
  if (p.includes('system/status')) return 'status';
  if (p.includes('system/login')) return 'login';
  if (p.includes('system/coppa')) return 'coppa';
  if (p.includes('system/resourcesize')) return 'resourcesize';
  if (p.includes('system/resourceev')) return 'resourceev';
  if (p.includes('system/resource')) return 'resource';
  if (p.startsWith('/resource/')) return 'resourcefile';
  if (p.includes('tutorial/status')) return 'tutorialstatus';
  if (p.includes('khux/login')) return 'khuxlogin';
  if (p === '/user/create') return 'usercreate';
  if (p === '/user') return 'user';
  if (p.includes('system/master')) return 'master';
  if (p.startsWith('/master/')) return 'masterfile';
  if (p.includes('session')) return 'session';
  if (p.includes('login/token')) return 'bootstrap';
  if (p.includes('bootstrap') || p.includes('startup') || p.includes('init')) return 'bootstrap';
  return null;
}

function respondStatus(res) {
  // PUT /system/status, richiesta 251 (0xfb). Letto da FUN_007bd720:
  //  - maintenance deve mancare (o essere null), altrimenti ramo manutenzione;
  //  - appStatus.{mode,current,server} devono essere stringhe, altrimenti errore;
  //  - server vuoto = resta sul dominio predefinito e passa al bootstrap. Pieno,
  //    e' un URL cifrato (chiave da systemStatusUpdateResult+current+mode) che
  //    sostituisce il dominio: non ci serve.
  send(res, 200, {
    appStatus: { mode: '', current: '', server: '' },
  });
}

// Ora del server consegnata al client: deve stare prima della chiusura del
// 29/6/2021, come l'orologio del guest. Scorre da quando il server e' partito.
const SERVER_TIME_START = Date.parse(process.env.KHUX_SERVER_TIME || '2021-05-15T12:00:00Z');
const STARTED_AT = Date.now();
const REVISION = Number(process.env.KHUX_REVISION || 0);
const NEWCOMER = process.env.KHUX_NEWCOMER !== '0';

function serverTime() {
  // Formato letto da FUN_007197ec: "YYYY-MM-DD HH:MM:SS".
  const t = new Date(SERVER_TIME_START + (Date.now() - STARTED_AT));
  return t.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * L'involucro "ret" di ogni risposta di gioco, letto da FUN_0077eb98. Il client
 * valida i campi in quest'ordine, e al primo tipo sbagliato tratta la risposta
 * come errore: i booleani devono essere booleani, i numeri interi.
 */
function ret() {
  return {
    isMaintenance: false,
    isPhotonMaintenance: false,
    isKhuxMaintenance: false,
    isDarkMaintenance: false,
    sessionTO: false,
    isNewDayPeriod: 0,
    isRetry: false,
    versionApp: '4.3.1',
    // Revisioni di risorse e dati master dichiarate dal server. Il client le
    // confronta con le sue (0 su un'installazione vergine) per decidere cosa
    // scaricare: con tutto a 0 crede di essere aggiornato.
    // Per le risorse: l'ultima versione presente in resource_data (0 se nessuna).
    // Dopo un'installazione riuscita il client dichiara quella revisione; se il
    // server ne dichiarasse un'altra, riproporrebbe il download a ogni avvio.
    versionRes: latestResourceVersion(),
    versionResLow: latestResourceVersion(),
    versionDat: REVISION,
    commonVersionDat: REVISION,
    darkVersionRes: REVISION,
    darkVersionDat: REVISION,
    functionFlags: 0,
    serverTime: serverTime(),
    // "error" (con "viewUrl") e "isCommunicationMaintenance" sono facoltativi
  };
}

// Le stringhe della risposta a /system/login, nell'ordine in cui le legge
// FUN_00791070: link a pagine web (supporto, termini, store, social...). Il
// client le pretende tutte, come stringhe; vuote bastano per proseguire.
const LOGIN_LINKS = [
  'support', 'register', 'update', 'help', 'staff', 'agreement', 'license',
  'shikin', 'tokutei', 'store', 'odds', 'petOdds', 'appUpdate', 'officialSite',
  'officialTwitter', 'movie', 'beginnersGuide', 'passiveSettingList', 'darkHelp',
  'darkOdds', 'officialTwitterCustom',
];

// "data" della risposta di login, letto da FUN_0077f830: almeno 4 stringhe
// Base64 (cocos2d::base64Decode) che il client si aspetta di 8, 32, 32 e 32
// byte. Hanno l'aria di un seme e di tre chiavi da 256 bit. Il QUARTO e' la chiave
// dei record md5/size degli indici delle risorse scaricate (FUN_00ec75f4 legge
// l'offset 0x48 del record): deve essere quella con cui recon/tools/
// resource_index.py ha cifrato l'indice, quindi e' derivata allo stesso modo
// (o data in esadecimale con KHUX_RESOURCE_KEY). Gli altri tre, casuali ma
// stabili per tutta la vita del server: a cosa servano non e' ancora chiaro.
const RESOURCE_KEY = process.env.KHUX_RESOURCE_KEY
  ? Buffer.from(process.env.KHUX_RESOURCE_KEY, 'hex')
  : crypto.createHash('sha256').update('khux-resource-index').digest();
const LOGIN_DATA = [8, 32, 32].map((n) => crypto.randomBytes(n).toString('base64'))
  .concat(RESOURCE_KEY.toString('base64'));

function respondLogin(res) {
  // POST /system/login, azione 251: corpo cifrato {length, digest, ruv,
  // deviceType, systemVersion, appVersion}. length e digest descrivono
  // libcocos2dcpp.so: il server originale ci controllava l'integrita' del client.
  // Il ramo 0xfb di FUN_007c3204 pretende systemLogin (FUN_0077f650) e data
  // (FUN_0077f830); i link li legge FUN_00791070.
  const body = {
    ret: ret(),
    // Un nuovo giocatore NON scarica le risorse all'avvio (FUN_00ecd988): fa il
    // tutorial con la grafica gia' installata (APK + OBB). KHUX_NEWCOMER=0
    // presenta un giocatore esistente, l'unico che arriva all'azione 28.
    systemLogin: { newcomerKhux: NEWCOMER, newcomerDark: NEWCOMER },
    data: LOGIN_DATA,
  };
  for (const k of LOGIN_LINKS) body[k] = '';
  send(res, 200, body);
}

function respondCoppa(res) {
  // GET /system/coppa, azione 26, letto da FUN_00778b64: un oggetto "misc" di
  // interi senza segno, con chiavi numeriche. Il significato dei codici non e'
  // ancora noto; 0 basta perche' il client li accetti.
  const misc = {};
  for (const k of ['116', '804', '900', '901', '902', '903', '904', '905', '906', '907']) {
    misc[k] = 0;
  }
  send(res, 200, { ret: ret(), misc });
}

function respondResourceSize(res) {
  // PUT /system/resourcesize/<data>, azione 242. Corpo: {resoMode,
  // masterRevision, resourceRevision, commonMasterRevision, evResourceIds}.
  // Il ramo 242 di FUN_007c3204 legge solo "size", intero senza segno: i byte
  // da scaricare prima di giocare.
  // Con 0 il client salta il download e, senza dati master, va in crash dopo il
  // filmato introduttivo. KHUX_RESOURCE_SIZE serve a provocare il download per
  // scoprirne il protocollo.
  send(res, 200, { ret: ret(), size: Number(process.env.KHUX_RESOURCE_SIZE || 0) });
}

// ---------------------------------------------------------------------------
// Dati master
//
// GET /system/master/<data> (azione 27, FUN_00eba4bc) restituisce per ogni
// tabella {revision, url, key, md5}. Il client scarica url e lo decodifica come
// ogni risposta "application/encoded-json" o "application/octet-stream"
// (FUN_00771b3c): curl_easy_unescape -> base64 -> AES-256-CBC con key (i 32
// byte della stringa), IV a zero, PKCS#7 -> JSON. md5: ipotesi, MD5 esadecimale
// del corpo scaricato (cosi' fa il downloader generico FUN_00eccf04).
//
// Le tabelle sono i file <nome>.json di MASTER_DIR (non versionata: sono dati
// di Square Enix o ne derivano). Nessun file, nessuna tabella.
// ---------------------------------------------------------------------------
const MASTER_DIR = process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data');

function masterKey(name) {
  // 32 caratteri stabili tra i riavvii: il client li usa come chiave AES-256.
  return crypto.createHash('sha256').update('khux-master:' + name).digest('hex').slice(0, 32);
}

function masterBody(name) {
  const file = path.join(MASTER_DIR, name + '.json');
  if (!/^[A-Za-z0-9]+$/.test(name) || !fs.existsSync(file)) return null;
  const c = crypto.createCipheriv('aes-256-cbc', Buffer.from(masterKey(name), 'utf8'), Buffer.alloc(16));
  const enc = Buffer.concat([c.update(fs.readFileSync(file)), c.final()]);
  return Buffer.from(enc.toString('base64'), 'utf8');
}

// Lo schema (recon/out/master_types_ww431.json, ricavato dai lettori di riga)
// dice tipo e limiti di ogni campo. Il client vuole un ARRAY di righe; in ogni
// riga TUTTI i campi, del tipo esatto: un campo assente o sbagliato fa fallire
// la riga, e con lei l'intera tabella (errore 3). Le chiavi in piu' sono ignorate.
const MASTER_SCHEMA_FILE = path.join(__dirname, '..', 'recon', 'out', 'master_types_ww431.json');
const MASTER_SCHEMA = fs.existsSync(MASTER_SCHEMA_FILE)
  ? JSON.parse(fs.readFileSync(MASTER_SCHEMA_FILE, 'utf8')) : {};
// Per le prove sul banco: servire anche le tabelle che lo schema rifiuta.
const MASTER_SERVE_INVALID = process.env.KHUX_MASTER_SERVE_INVALID === '1';

function checkMasterValue(v, type) {
  // type: int | int64 | string(N) | string | <elemento>[N]
  const arr = /^(.*)\[(\d+)\]$/.exec(type);
  if (arr) {
    if (!Array.isArray(v)) return 'non e\' un array';
    if (v.length > Number(arr[2])) return `piu' di ${arr[2]} elementi`;
    for (const e of v) {
      const err = checkMasterValue(e, arr[1]);
      if (err) return 'elemento: ' + err;
    }
    return null;
  }
  if (type === 'int') {
    return Number.isInteger(v) && v >= -2147483648 && v <= 2147483647 ? null : 'non e\' un int32';
  }
  if (type === 'int64') return Number.isInteger(v) ? null : 'non e\' un intero';
  // string(N): il client copia con strncpy, quindi oltre N byte tronca senza errore
  if (/^string(?:\(\d+\))?$/.test(type)) return typeof v === 'string' ? null : 'non e\' una stringa';
  return `tipo sconosciuto ${type}`;
}

function checkMasterTable(name, rows) {
  const schema = MASTER_SCHEMA[name];
  if (!schema) return [`tabella sconosciuta: ${name}`];
  if (!Array.isArray(rows)) return ['la radice deve essere un array di righe'];
  const errors = [];
  rows.forEach((row, i) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      errors.push(`riga ${i}: non e' un oggetto`);
      return;
    }
    for (const [field, type] of schema) {
      if (!(field in row)) errors.push(`riga ${i}: manca ${field}`);
      else {
        const err = checkMasterValue(row[field], type);
        if (err) errors.push(`riga ${i}: ${field} ${err} (${type})`);
      }
    }
  });
  return errors;
}

function masterTables() {
  if (!fs.existsSync(MASTER_DIR)) return [];
  const names = fs.readdirSync(MASTER_DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  return names.filter((name) => {
    let errors;
    try {
      errors = checkMasterTable(name, JSON.parse(fs.readFileSync(path.join(MASTER_DIR, name + '.json'), 'utf8')));
    } catch (e) {
      errors = ['JSON non valido: ' + e.message];
    }
    if (errors.length === 0) return true;
    console.warn(`[master] ${name}: ${errors.length} errori, es. ${errors.slice(0, 3).join('; ')}`
      + (MASTER_SERVE_INVALID ? ' — la servo lo stesso' : ' — non la servo'));
    return MASTER_SERVE_INVALID;
  });
}

function respondMaster(res) {
  const body = { ret: ret() };
  const tables = masterTables();
  body.master = { revision: REVISION, commonRevision: REVISION, count: tables.length };
  for (const name of tables) {
    body[name] = {
      revision: REVISION,
      url: `${SESSION_BASE}/master/${name}`,
      key: masterKey(name),
      md5: crypto.createHash('md5').update(masterBody(name)).digest('hex'),
    };
  }
  send(res, 200, body);
}

function respondMasterFile(req, res) {
  const name = req.url.split('?')[0].split('/').pop();
  const body = masterBody(name);
  if (!body) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': body.length });
  res.end(body);
}

// ---------------------------------------------------------------------------
// Risorse
//
// GET /system/resource (azione 28, richiesta da FUN_007e518c con corpo
// {revision, resoMode}; risposta letta da FUN_00ec7ad0):
//   { resource: { mode, minVersion, versions: [ {data: [file], index: [file]} ] } }
// mode 0 = niente da scaricare, 1 o 2 = scarica. La versione i-esima vale
// minVersion + i. file = {url, md5, size}: stringhe non vuote e size > 0.
//
// Il downloader (FUN_00ec8304 -> FUN_00eccf04) accetta un file solo se il
// corpo e' lungo `size`, il suo MD5 esadecimale e' `md5` e il Content-Type
// contiene "application/octet-stream". Lo salva nella cartella scrivibile con un
// nome derivato dall'url; la cache (FUN_00824bfc) rifa' lo stesso controllo.
//
// Il client chiede l'azione 28 solo se le revisioni delle risorse differiscono,
// il giocatore NON e' nuovo e il tutorial risulta finito (stato del tutorial,
// FUN_0079004c, campo isFinished).
//
// I pacchetti sono i file di RESOURCE_DIR/<versione>/{data,index}/ (cartella non
// versionata: conterra' risorse di Square Enix).
// ---------------------------------------------------------------------------
const RESOURCE_DIR = process.env.KHUX_RESOURCE_DIR || path.join(__dirname, 'resource_data');

// I pacchetti possono pesare gigabyte (gli OBB): l'MD5 si calcola una volta, a
// blocchi, e si tiene in cache finche' dimensione e data del file non cambiano.
const md5Cache = new Map();

function fileMd5(file) {
  const st = fs.statSync(file);
  const k = `${file}|${st.size}|${st.mtimeMs}`;
  if (!md5Cache.has(k)) {
    const h = crypto.createHash('md5');
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(16 * 1024 * 1024);
    let n;
    while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
    fs.closeSync(fd);
    md5Cache.set(k, h.digest('hex'));
  }
  return md5Cache.get(k);
}

function resourceFiles(version, kind) {
  const dir = path.join(RESOURCE_DIR, String(version), kind);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).sort().map((name) => {
    const file = path.join(dir, name);
    return {
      url: `${SESSION_BASE}/resource/${version}/${kind}/${encodeURIComponent(name)}`,
      md5: fileMd5(file),
      size: fs.statSync(file).size,
    };
  }).filter((f) => f.size > 0);
}

function resourceVersions() {
  return fs.existsSync(RESOURCE_DIR)
    ? fs.readdirSync(RESOURCE_DIR).filter((v) => /^\d+$/.test(v)).map(Number).sort((a, b) => a - b)
    : [];
}

function latestResourceVersion() {
  const v = resourceVersions();
  return v.length ? v[v.length - 1] : 0;
}

function respondResource(res) {
  const versions = resourceVersions();
  const body = { ret: ret() };
  if (versions.length === 0) {
    body.resource = { mode: 0, minVersion: 0, versions: [] };
  } else {
    // le versioni devono essere consecutive: la i-esima vale minVersion + i
    const min = versions[0];
    const list = [];
    for (let v = min; v <= versions[versions.length - 1]; v++) {
      list.push({ data: resourceFiles(v, 'data'), index: resourceFiles(v, 'index') });
    }
    body.resource = { mode: 1, minVersion: min, versions: list };
  }
  send(res, 200, body);
}

function respondResourceEv(res) {
  // GET /system/resourceEv (azione 29, FUN_00ec7f80): array "resourceEv" di
  // {resourceId (uint), versions}. Nessuna risorsa evento.
  send(res, 200, { ret: ret(), resourceEv: [] });
}

function respondResourceFile(req, res) {
  const parts = req.url.split('?')[0].split('/').slice(2).map(decodeURIComponent);
  const [version, kind, name] = parts;
  if (parts.length !== 3 || !/^\d+$/.test(version) || !['data', 'index'].includes(kind)
      || name.includes('/') || name.includes('\\') || name.startsWith('.')) {
    res.writeHead(404);
    return res.end();
  }
  const file = path.join(RESOURCE_DIR, version, kind, name);
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': fs.statSync(file).size });
  fs.createReadStream(file).pipe(res);
}

function respondTutorialStatus(res) {
  // GET/PUT /tutorial/status (azioni 69/70), letto da FUN_0079004c alla radice:
  // phase (uint), popupFlag (uint64), isFinished (uint), acquireTutorialJewel
  // (bool). isFinished decide, con newcomer, se scaricare le risorse all'avvio.
  const finished = process.env.KHUX_TUTORIAL_FINISHED === '1' || !NEWCOMER;
  send(res, 200, {
    ret: ret(),
    phase: 0,
    popupFlag: 0,
    isFinished: finished ? 1 : 0,
    acquireTutorialJewel: false,
  });
}

function respondKhuxLogin(res) {
  // POST /khux/login (azione 252), solo per un giocatore esistente: dopo
  // /system/coppa. Letto da FUN_0077f764: gameLogin.acquirableLoginBonus (bool).
  send(res, 200, { ret: ret(), gameLogin: { acquirableLoginBonus: false } });
}

// ---------------------------------------------------------------------------
// Risposte generate dagli schemi (recon/out/api_responses_ww431.json): per le
// rotte che non gestiamo a mano, la risposta minima che il parser accetta. Ogni
// campo dello schema e' obbligatorio; gli array restano vuoti.
// ---------------------------------------------------------------------------
const API_SCHEMA_FILE = path.join(__dirname, '..', 'recon', 'out', 'api_responses_ww431.json');
const API_SCHEMA = fs.existsSync(API_SCHEMA_FILE)
  ? JSON.parse(fs.readFileSync(API_SCHEMA_FILE, 'utf8')) : {};

function defaultFor(type) {
  switch (type) {
    case 'object': return {};
    case 'array': return [];
    case 'string': return '';
    case 'datetime': return serverTime();
    case 'bool': return false;
    default: return 0; // int, uint, int64, uint64
  }
}

function schemaResponse(apiPath) {
  const entry = API_SCHEMA[apiPath];
  if (!entry || !entry.fields) return null;
  const body = { ret: ret() };
  // i genitori prima dei figli: l'ordine alfabetico dei percorsi lo garantisce
  for (const p of Object.keys(entry.fields).sort()) {
    if (p.includes('[]')) continue;
    const keys = p.split('.');
    let o = body;
    for (const k of keys.slice(0, -1)) o = (o[k] ??= {});
    if (!(keys[keys.length - 1] in o)) o[keys[keys.length - 1]] = defaultFor(entry.fields[p]);
  }
  return body;
}

// GET /user (azione 1, callUserGetAPI). Il ramo 1 di FUN_007c3204 chiama, tutti
// obbligatori: FUN_0078ade0 (userData.user), FUN_0078b230 (userData.userPoint),
// FUN_0078babc (userData.userDetail), FUN_0078c138 (userData.stageResumption),
// FUN_0078e30c (userData.medalResumption), poi pretende userPopUp.isPopBenefitStone.
// Tipi da recon/tools/response_schema.py. I valori sono nostri segnaposto: un
// giocatore di livello 1, senza progressi.
const PLAYER_NAME = process.env.KHUX_PLAYER_NAME || 'Player';

// Il giocatore creato con POST /user/create (solo in memoria, per ora).
const player = { name: PLAYER_NAME, gender: 0, unionId: 0, birthday: null, avatar: null };

function respondUserCreate(res, req) {
  // POST /user/create (azione 253), alla fine del tutorial iniziale (nome, data di
  // nascita, editor avatar, scelta della Union). Corpo: birthday, name, unionId,
  // updateAvatarData {gender, hairPartsId, hairColorPartsId, facePartsId,
  // bodyPartsId, skinPartsId, accessoriesPartsIds}. Il ramo 253 di FUN_007c3204
  // chiama FUN_0077f650 con 1 (legge solo systemLogin.newcomerKhux, bool, e lo copia
  // nel flag "nuovo giocatore" della sessione, +0x88) e FUN_0077f764
  // (gameLogin.acquirableLoginBonus, bool): entrambi obbligatori.
  if (req) {
    player.name = req.name ?? player.name;
    player.unionId = req.unionId ?? player.unionId;
    player.birthday = req.birthday ?? player.birthday;
    player.avatar = req.updateAvatarData ?? player.avatar;
    player.gender = player.avatar?.gender ?? player.gender;
  }
  send(res, 200, {
    ret: ret(),
    systemLogin: { newcomerKhux: false, newcomerDark: false },
    gameLogin: { acquirableLoginBonus: false },
  });
}

function respondUser(res) {
  const now = serverTime();
  const userData = {
    user: {
      userId: 1, // uint64
      nativeUserId: 1, // uint64
      platformId: 0,
      userName: player.name, // max 32 byte
      gender: player.gender,
      comment: '', // max 256 byte
      deviceType: 2,
      continueLoginCount: 1,
      isFleeze: 0,
      fleezedDatetime: now,
      isAdult: 1,
      nativeTagName: '', // max 14 byte; letto solo da GET /user (modo 1)
    },
    userPoint: {
      money: 0, lux: 0, totalLux: 0, // lux e totalLux: uint64
      spherePoint: 0, kizunaPoint: 0, raidPoint: 0,
      attack: 0, defense: 0, baseHp: 0, hp: 0, ap: 10, maxHp: 0, maxAp: 10,
      lastApDatetime: now,
      stageSpherePoint: 0, raidSpherePoint: 0, colosseumSpherePoint: 0,
      // da qui in poi uint
      specialPoint: 0, stageSkipTicket: 0, superSkipTicket: 0, vipPoint: 0,
      guiltBurstLv: 0, multiPoint: 0, missionPoint: 0, limitedVipPoint: 0,
      drawTicket1: 0, drawTicket2: 0, drawTicket3: 0,
      limitedDrawTicket1: 0, limitedDrawTicket2: 0, limitedDrawTicket3: 0,
    },
    userDetail: {
      level: 1, exp: 0, luxRank: 0, luxGetRatio: 0,
      titleLeftId: 0, titleRightId: 0, titlePlateId: 0, maxDeckCost: 0,
      playTimezones: [], // int[], al massimo 6
      playFrequently: 0,
      partyId: 0, // uint64
      unionId: player.unionId, maxMedal: 0, mvpCount: 0, equipCoordinateNo: 0, lastClearStageId: 0,
      isGuilt: 0, isPet: 0, pvpClass: 0, pvpMvpCount: 0, // uint
    },
    stageResumption: { resumptionStatus: 0, stageId: 0, raidId: 0, colosseumStageId: 0 },
    medalResumption: { userShuffleSkills: [], resumptionStatus: 0 },
  };
  send(res, 200, { ret: ret(), userData, userPopUp: { isPopBenefitStone: 0 } });
}

// In tutte le risposte di avvio "maintenance" va OMESSO: il client controlla che
// il suo tipo JSON sia null. Anche un 0 numerico vale come manutenzione attiva.

function respondSession(res) {
  // Letto da FUN_007bd5b8: due stringhe, entrambe decise da noi.
  send(res, 200, {
    nativeSessionId: SESSION.nativeSessionId,
    sharedSecurityKey: SESSION.sharedSecurityKey,
  });
}

function respondBootstrap(res) {
  // GET /login/token?m=0, letto da FUN_007be0d0. "url" non e' una base: e' l'URL
  // completo della richiesta di sessione (corpo UUID, deviceType, nativeToken;
  // risposta letta da FUN_007bd5b8).
  send(res, 200, {
    url: `${SESSION_BASE}/session`,
    nativeToken: SESSION.nativeToken,
  });
}

function send(res, code, obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
  });
  res.end(body);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
function handler(scheme) {
  return (req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      let buf = Buffer.concat(chunks);
      // Le GET portano il payload cifrato nella query: ?m=0&v=<base64>. Lo si
      // tratta come se fosse il corpo, cosi' passa dallo stesso decodificatore.
      const qv = new URLSearchParams(req.url.split('?')[1] || '').get('v');
      if (!buf.length && qv) buf = Buffer.from('v=' + encodeURIComponent(qv));
      const kind = route(req.url);
      const entry = {
        scheme,
        method: req.method,
        url: req.url,
        headers: req.headers,
        handled: Boolean(kind),
        route: kind,
        ...parseBody(buf, req.headers),
      };
      logRequest(entry);

      if (kind === 'status') return respondStatus(res);
      if (kind === 'login') return respondLogin(res);
      if (kind === 'coppa') return respondCoppa(res);
      if (kind === 'resourcesize') return respondResourceSize(res);
      if (kind === 'master') return respondMaster(res);
      if (kind === 'masterfile') return respondMasterFile(req, res);
      if (kind === 'resource') return respondResource(res);
      if (kind === 'resourceev') return respondResourceEv(res);
      if (kind === 'resourcefile') return respondResourceFile(req, res);
      if (kind === 'tutorialstatus') return respondTutorialStatus(res);
      if (kind === 'khuxlogin') return respondKhuxLogin(res);
      if (kind === 'usercreate') return respondUserCreate(res, entry.bodyDecoded);
      if (kind === 'user') return respondUser(res);
      if (kind === 'session') return respondSession(res);
      if (kind === 'bootstrap') return respondBootstrap(res);

      const generated = schemaResponse(req.url.split('?')[0]);
      if (generated) return send(res, 200, generated);

      // Sconosciuta: rispondiamo il minimo che il client accetta, cioe' il solo
      // involucro "ret", perche' prosegua e ci mostri la richiesta successiva.
      // Scoprire la sequenza vale piu' che rispondere bene a una singola chiamata.
      send(res, 200, { ret: ret() });
    });
  };
}

// ---------------------------------------------------------------------------
// Avvio
// ---------------------------------------------------------------------------
function start() {
  console.log('--- server privato KHUX (fase B) ---');
  // MD5 dei pacchetti di risorse calcolati subito, non alla prima richiesta del client
  for (const v of resourceVersions()) {
    const n = resourceFiles(v, 'data').length + resourceFiles(v, 'index').length;
    console.log(`risorse versione ${v}: ${n} file pronti`);
  }
  console.log('url consegnata al client :', PUBLIC_URL);
  console.log('nativeSessionId          :', SESSION.nativeSessionId);
  console.log('sharedSecurityKey        :', SESSION.sharedSecurityKey);
  console.log('log delle richieste      :', LOG_FILE);
  console.log();

  http.createServer(handler('http')).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`in ascolto su http://0.0.0.0:${HTTP_PORT}`);
  }).on('error', (e) => console.error('HTTP non avviato:', e.message));

  const key = path.join(CERT_DIR, 'server.key');
  const cert = path.join(CERT_DIR, 'server.crt');
  if (fs.existsSync(key) && fs.existsSync(cert)) {
    // Lo SNI dice quale host il client voleva raggiungere, anche quando l'handshake
    // poi fallisce: e' l'unico modo di vedere il nome se il DNS non passa da noi
    // (LDPlayer risolve fuori dal guest e noi dirottiamo solo il TCP).
    const sniSeen = new Set();
    https.createServer(
      {
        key: fs.readFileSync(key),
        cert: fs.readFileSync(cert),
        SNICallback: (servername, cb) => {
          if (!sniSeen.has(servername)) {
            sniSeen.add(servername);
            console.log(`\x1b[36m[tls:sni]\x1b[0m ${servername}`);
          }
          cb(null);
        },
      },
      handler('https')
    ).listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`in ascolto su https://0.0.0.0:${HTTPS_PORT}`);
    }).on('tlsClientError', (e, sock) => {
      const sni = sock.servername || '-';
      console.log(`\x1b[31m[tls:errore]\x1b[0m ${sni}  ${e.code || ''} ${e.message}`);
    }).on('error', (e) => console.error('HTTPS non avviato:', e.message));
  } else {
    console.log('HTTPS disattivato: certificato assente. Generalo con server/make-cert.sh');
  }

  if (DNS_ENABLED) {
    // L'IP da annunciare e' quello della nostra url pubblica.
    const m = PUBLIC_URL.match(/^https?:\/\/([^/:]+)/);
    const ip = m ? m[1] : '127.0.0.1';
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
      console.log(`DNS disattivato: KHUX_PUBLIC_URL deve contenere un IP, non "${ip}"`);
    } else {
      startDns({ ip, hijack: HIJACK, upstream: DNS_UPSTREAM, port: DNS_PORT, logFile: DNS_LOG_FILE });
    }
  }
}

if (require.main === module) start();
module.exports = { SESSION, parseBody, start };
