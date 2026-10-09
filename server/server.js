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
  if (p === '/user/keyblade') return 'userkeyblade';
  if (p === '/user/deck') return 'userdeck';
  if (p === '/keyblade/subslot') return 'kbsubslot';
  if (p === '/user/medal') return 'usermedal';
  if (p === '/user/medal/sell') return 'medalsell';
  if (p === '/user/medal/lock') return 'medallock';
  if (p === '/user/medal/enhance') return 'medalenhance';
  if (p === '/user/medal/evolve') return 'medalevolve';
  if (p === '/user/medal/remove') return 'medalremove';
  if (/^\/stage\/\d+$/.test(p)) return 'stagelist';
  if (p === '/stage/start') return 'stagestart';
  if (p === '/stage/continue' || p === '/stage/retire') return 'stagecontinue';
  if (p === '/stage/clear') return 'stageclear';
  if (p === '/user/point' || p === '/user/sphere/reset') return 'userpoint';
  if (p === '/user/stone') return 'userstone';
  if (p === '/user/material') return 'usermaterial';
  if (p === '/campaign') return 'campaign';
  if (p.startsWith('/raid/list')) return 'raidlist';
  if (p.startsWith('/raid/reward')) return 'raidreward';
  if (p === '/user/support') return 'usersupport';
  if (p === '/stage/support/list') return 'supportlist';
  if (p === '/user/avatar' || p === '/user/avatar/all' || p === '/user/avatar/parts') return 'useravatar';
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
    systemLogin: { newcomerKhux: isNewcomer(), newcomerDark: isNewcomer() },
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
  // misc 116 non puo' essere 0. A fine download SceneDownload::update (FUN_00cfbef8 ->
  // FUN_00cfb268) confronta il suo campo +0x3bc (0 dal costruttore) con la voce 116 di
  // questa mappa (oggetto di sessione +0x3a0, chiave 0x74): se sono uguali chiama un
  // metodo sul nodo +0x3a8, che nella SceneDownload dei soli master non viene mai creato
  // (memoria non inizializzata): crash a 0x12c1ee0 dopo ogni aggiornamento dei master
  // per chi rientra. Trovato con tools/ldplayer/armtrace (x30 = 0xcfb310). Con un valore
  // diverso il client prende l'altra strada (FUN_00cfbd78) e prosegue verso la home.
  misc['116'] = Number(process.env.KHUX_COPPA_116 || 1);
  send(res, 200, { ret: ret(), misc });
}

function respondResourceSize(res, req) {
  // PUT /system/resourcesize/<data>, azione 242. Corpo: {resoMode,
  // masterRevision, resourceRevision, commonMasterRevision, evResourceIds}.
  // Il ramo 242 di FUN_007c3204 legge solo "size", intero senza segno: i byte
  // da scaricare prima di giocare.
  // Con 0 il client salta il download e, senza dati master, va in crash dopo il
  // filmato introduttivo. KHUX_RESOURCE_SIZE serve a provocare il download per
  // scoprirne il protocollo.
  // Se il client dichiara master e risorse gia' aggiornati la dimensione e' 0. (Il «0
  // manda in crash» del 7 ottobre riguardava un client senza master, revisione 0.)
  // Il crash dopo un aggiornamento dei master per chi rientra (0x12c1ee0) NON dipende da
  // qui: vedi HANDOFF, «Il crash dopo l'aggiornamento dei master».
  const upToDate = Number(req?.masterRevision) >= REVISION
    && Number(req?.resourceRevision) >= latestResourceVersion();
  send(res, 200, { ret: ret(), size: upToDate ? 0 : Number(process.env.KHUX_RESOURCE_SIZE || 0) });
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
    // Solo l'ultima versione: ognuna delle nostre e' un pacchetto completo (la 4 = la 3
    // + le mappe generate). Con mode 1 il client scarica i data di TUTTE le versioni
    // elencate e li concatena: con 3 e 4 insieme misc.mp4 veniva di 4,6 GB, la
    // dimensione non tornava con l'indice e compariva «Save error».
    const last = versions[versions.length - 1];
    body.resource = {
      mode: 1, minVersion: last,
      versions: [{ data: resourceFiles(last, 'data'), index: resourceFiles(last, 'index') }],
    };
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

// Tutorial finito dalla fase 995 (dopo il Prologue). Con isFinished 0 il client resta
// nella guida per principianti e il menu a tendina accetta solo i passi guidati (MENU si
// apre, le voci non rispondono). isFinished 1 fa creare alla home il pet e gli NPC
// (lwf/pet/motion/*, lwf/character/npc/<id>/wait): assenti dalle risorse, li fornisce
// come LWF vuoti il pacchetto generato (risorse versione 9).
const TUTORIAL_LAST_PHASE = Number(process.env.KHUX_TUTORIAL_LAST_PHASE || 995);
// popupFlag: un bit per finestra di spiegazione gia' vista (PUT manda il bit della
// finestra appena chiusa, es. 2^28, 2^34, 2^35). A tutorial finito tutte risultano viste
// (2^53 - 1, il massimo esatto in JSON): altrimenti a ogni rientro il client le mostra
// tutte in fila, compresa quella di Dark Road, che va in crash
// (SceneDarkroadHome::darkroadPartySeclectPopup). KHUX_POPUP_FLAG la cambia.
const POPUP_ALL_SEEN = Number(process.env.KHUX_POPUP_FLAG || Number.MAX_SAFE_INTEGER);

function respondTutorialStatus(res, req) {
  // GET/PUT /tutorial/status (azioni 69/70), letto da FUN_0079004c alla radice:
  // phase (uint), popupFlag (uint64), isFinished (uint), acquireTutorialJewel
  // (bool). isFinished decide, con newcomer, se scaricare le risorse all'avvio.
  // PUT porta la fase raggiunta (50 prima del Prologue, 995 dopo): si salva e GET la
  // restituisce, cosi' chi rientra riprende da li'.
  if (Number.isInteger(req?.phase) && req.phase !== player.tutorialPhase) {
    player.tutorialPhase = req.phase;
    savePlayer();
  }
  if (Number.isInteger(req?.popupFlag) && req.popupFlag > 0) {
    player.popupFlag = Number(BigInt(player.popupFlag || 0) | BigInt(req.popupFlag));
    savePlayer();
  }
  const finished = process.env.KHUX_TUTORIAL_FINISHED === '1' || player.tutorialPhase >= TUTORIAL_LAST_PHASE;
  send(res, 200, {
    ret: ret(),
    phase: player.tutorialPhase,
    popupFlag: finished ? POPUP_ALL_SEEN : player.popupFlag || 0,
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
// Gli schemi candidati di recon/tools/batch_schema.py valgono solo dove manca una voce
// verificata.
const API_SCHEMA_AUTO_FILE = path.join(__dirname, '..', 'recon', 'out', 'api_responses_auto_ww431.json');
const API_SCHEMA = Object.assign(
  fs.existsSync(API_SCHEMA_AUTO_FILE) ? JSON.parse(fs.readFileSync(API_SCHEMA_AUTO_FILE, 'utf8')) : {},
  fs.existsSync(API_SCHEMA_FILE) ? JSON.parse(fs.readFileSync(API_SCHEMA_FILE, 'utf8')) : {});

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
    if (!(keys[keys.length - 1] in o)) {
      o[keys[keys.length - 1]] = entry.values && p in entry.values ? entry.values[p] : defaultFor(entry.fields[p]);
    }
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

// Il giocatore creato con POST /user/create. Si salva su disco (KHUX_SAVE, di default
// server/save/player.json, fuori dal repository) a ogni modifica e si ricarica
// all'avvio: chi ha gia' fatto il tutorial, rientrando, va dritto alla home con i suoi
// dati. Un solo giocatore per server; per ricominciare da capo si cancella il file.
const SAVE_FILE = process.env.KHUX_SAVE || path.join(__dirname, 'save', 'player.json');
const player = {
  name: PLAYER_NAME, gender: 0, unionId: 0, birthday: null, avatar: null, clearMissions: {}, lux: 0,
  created: false, // true dopo POST /user/create: non e' piu' un nuovo giocatore
  tutorialPhase: 0, // ultima fase di PUT /tutorial/status (50 prima del Prologue, 995 dopo)
};
try {
  Object.assign(player, JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8')));
  console.log(`[save] giocatore caricato da ${SAVE_FILE}: ${player.name}, fase ${player.tutorialPhase}, ${player.lux} Lux`);
} catch {
  console.log(`[save] nessun salvataggio in ${SAVE_FILE}: nuovo giocatore`);
}
// Salvataggi di prima degli Avatar Coin: si accreditano una volta quelli degli obiettivi
// gia' compiuti
if (player.created && player.spherePoint === undefined) {
  player.spherePoint = 0;
  for (const [sid, done] of Object.entries(player.clearMissions || {})) {
    const st = masterRows('stage').find((r) => r.stageId === Number(sid));
    for (const n of done) if (st?.submissionRewardType?.[n - 1] === 14) player.spherePoint += st.submissionItemNum[n - 1];
  }
  console.log(`[save] Avatar Coin degli obiettivi gia' compiuti: ${player.spherePoint}`);
}

function savePlayer() {
  fs.mkdirSync(path.dirname(SAVE_FILE), { recursive: true });
  fs.writeFileSync(SAVE_FILE + '.tmp', JSON.stringify(player, null, 1));
  fs.renameSync(SAVE_FILE + '.tmp', SAVE_FILE);
}

// L'avatar del giocatore (updateAvatarData di /user/create), come lo leggono
// FUN_0078c55c (userAvatar, elementi di userAvatars) e FUN_007a1be8 (elementi di
// userAvatarParts). Al rientro la home costruisce l'avatar da qui (FUN_00b3c350):
// senza, crash.
const AVATAR_COORDINATE = 1;

function userAvatarData() {
  const a = player.avatar || {};
  return {
    myCoordinateNo: AVATAR_COORDINATE, gender: a.gender ?? player.gender,
    hairPartsId: a.hairPartsId || 0, hairColorPartsId: a.hairColorPartsId || 0,
    facePartsId: a.facePartsId || 0, bodyPartsId: a.bodyPartsId || 0, skinPartsId: a.skinPartsId || 0,
    accessoriesPartsIds: a.accessoriesPartsIds || [],
  };
}

// Parti possedute: quelle indossate (tipo dalla tabella avatarParts).
function userAvatarPartsData() {
  const a = userAvatarData();
  const ids = [a.hairPartsId, a.hairColorPartsId, a.facePartsId, a.bodyPartsId, a.skinPartsId, ...a.accessoriesPartsIds]
    .filter(Boolean);
  const rows = masterRows('avatarParts');
  return [...new Set(ids)].map((id, i) => ({
    userAvatarPartsId: i + 1, // uint64
    partsType: rows.find((r) => r.avatarPartsId === id)?.partsType ?? 0,
    avatarPartsId: id,
    getDatetime: serverTime(),
  }));
}

// Nuovo giocatore (tutorial dall'inizio) finche' non ha fatto /user/create.
// KHUX_NEWCOMER=0/1 lo forza, per le prove.
function isNewcomer() {
  if (process.env.KHUX_NEWCOMER === '0') return false;
  if (process.env.KHUX_NEWCOMER === '1') return true;
  return !player.created;
}

// Missioni dello stage completate finora (id 1-3, al massimo 3).
function stageClearMissions(stageId) {
  return player.clearMissions[stageId] || [];
}

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
  player.created = true;
  savePlayer();
  send(res, 200, {
    ret: ret(),
    systemLogin: { newcomerKhux: false, newcomerDark: false },
    gameLogin: { acquirableLoginBonus: false },
  });
}

function deckStats() {
  const medals = masterRows('medal');
  let attack = 0;
  let defense = 0;
  const byId = new Map(userMedalList().map((m) => [m.userMedalId, m]));
  for (const id of deckMedalIds()) {
    const m = byId.get(id);
    const row = m && medals.find((r) => r.medalId === m.medalId);
    if (row) { attack += row.attack; defense += row.defense; }
  }
  return { attack, defense };
}

// Forzieri degli stage. Il client, aprendo un forziere (StageUtil::getTreasurePrizes,
// FUN_00e7e980), cerca in userTreasures l'elemento con lo stesso uniqueTreasureId e
// legge la riga di `reward` indicata dalla mappa (stage/mappoi_stg<id>_NN.bin
// dell'addnl); dei suoi premi tiene quelli il cui tipo compare, nella stessa
// posizione, in dropItemTypeIds. Tipi (FUN_00b07090): 4 monete, 8 CP (Attack Prize,
// barra degli speciali), 9 HP. Prologue (1010): forziere arancione id 18, reward 81
// (record 948,1778,81,14,18 della sezione +0x28 di mappoi_stg01010_01.bin, letto da
// FUN_00e60f28: x, y, reward, tipo, id).
// Forzieri e nemici di ogni stage: server/game_data/stage_poi.json, generato dalle
// mappe con recon/tools/stage_poi.py (non versionato: dati di gioco). Le righe di
// reward le scrive make-game-tables.js: posizione 0 il premio del nemico (tipo 5),
// posizione 1 quello del forziere quando la riga serve a entrambi (es. la 1).
const ENEMY_DROP_TYPE = Number(process.env.KHUX_ENEMY_DROP_TYPE || 5);
let STAGE_POI = {};
try {
  STAGE_POI = JSON.parse(fs.readFileSync(path.join(__dirname, 'game_data', 'stage_poi.json'), 'utf8'));
} catch {
  console.warn('[poi] server/game_data/stage_poi.json assente: forzieri e drop solo nel Prologue');
  STAGE_POI = { 1010: { chests: [{ uid: 18, reward: 81 }], enemies: [{ uid: 17 }] } };
}

function rewardRowById(rewardId) {
  return masterRows('reward').find((r) => r.rewardId === rewardId);
}

// dropItemTypeIds di un forziere: per ogni premio della riga il suo tipo, 0 dove il
// premio e' del nemico (materiale: nel forziere resta vuoto)
function chestDropTypes(rewardId) {
  const row = rewardRowById(rewardId);
  if (!row) return [];
  return row.type.slice(0, 4).map((t) => (t === ENEMY_DROP_TYPE ? 0 : t));
}

function stageTreasures(stageId) {
  return (STAGE_POI[stageId]?.chests || [])
    .map((c) => ({ uniqueTreasureId: c.uid, dropItemTypeIds: chestDropTypes(c.reward) }))
    .filter((t) => t.dropItemTypeIds.some(Boolean));
}

// Drop dei nemici: userEnemyDropItems[] (FUN_007a11c8: uniqueEnemyId, dropItemTypeIds
// int[] <= 4, stealType), come per i forzieri. uniqueEnemyId = ultimo numero del
// record del nemico nella mappa (x, y, enemyId, 1, 1, 1, 1, id). Il contenuto e' la
// riga di reward del nemico (make-game-tables.js). Sul banco: con tipo 5 (materiale) il
// nemico lascia un sacchetto argento, contato dall'HUD in alto; in CONGRATULATIONS i
// sacchetti si aprono e rivelano l'oggetto. Non tutti gli uid dei nemici compaiono
// come record nella mappa (es. 1 nel Prologue): si mandano tutti quelli da 1 al
// massimo, tolti i forzieri (stesso spazio di id).
function stageEnemyDrops(stageId) {
  const poi = STAGE_POI[stageId];
  if (!poi) return [];
  const chests = new Set(poi.chests.map((c) => c.uid));
  const max = Math.max(0, ...poi.enemies.map((e) => e.uid));
  const ids = [];
  for (let id = 1; id <= max; id++) if (!chests.has(id)) ids.push(id);
  return ids.map((id) => ({ uniqueEnemyId: id, dropItemTypeIds: [ENEMY_DROP_TYPE], stealType: 0 }));
}

// userData.userPoint, letto da FUN_0078b230 sia in GET /user sia in POST /stage/start.
// Il livello del giocatore e' il rango Lux: la barra dei risultati (FUN_009aaad0 ->
// FUN_006ea1b4) usa userDetail.luxRank come livello e userPoint.lux come valore,
// contro le soglie cumulative needExp della tabella player (righe lv e lv+1). Con
// luxRank 0 la soglia del livello 1 e' 0: «LEVEL UP!» e barra piena a ogni stage.
function luxRankFor(lux) {
  const rows = masterRows('player').filter((r) => r.lv >= 1 && r.needExp <= lux);
  return Math.max(1, ...rows.map((r) => r.lv));
}

function userPointData(now) {
  return {
    money: player.money || 0, // munny
    lux: player.lux, totalLux: player.lux, // lux e totalLux: uint64
    spherePoint: player.spherePoint || 0, // Avatar Coin
    kizunaPoint: 0, raidPoint: 0,
    // In battaglia il client mostra maxHp e colora l'HP in rapporto a hp/baseHp
    // (provato con 111/222/333): per un giocatore integro coincidono, dal livello 1
    // della tabella player.
    // attack/defense: somma di STR e DEF (livello 1) delle medaglie del deck. A 0 il
    // giocatore non ha difesa: nel Prologue moriva in un turno, e nel tutorial non si
    // poteva morire.
    ...deckStats(),
    baseHp: levelHp(1), hp: levelHp(1), ap: 10, maxHp: levelHp(1), maxAp: 10,
    lastApDatetime: now,
    stageSpherePoint: 0, raidSpherePoint: 0, colosseumSpherePoint: 0,
    // da qui in poi uint
    specialPoint: 0, stageSkipTicket: 0, superSkipTicket: 0, vipPoint: 0,
    guiltBurstLv: 0, multiPoint: 0, missionPoint: 0, limitedVipPoint: 0,
    drawTicket1: 0, drawTicket2: 0, drawTicket3: 0,
    limitedDrawTicket1: 0, limitedDrawTicket2: 0, limitedDrawTicket3: 0,
  };
}

function respondStageStart(res, req) {
  // POST /stage/start (azione 113). Corpo: stageId, supportUserId, userKeybladeId
  // (+ stageSkip, eventId, isSteal). Il ramo 113 di FUN_007c3204 chiama, tutti
  // obbligatori: FUN_0078b230 (userData.userPoint), FUN_007a1690 (userRandomEnemies[],
  // userEnemyDropItems[], userTreasures[], startStageData, campaigns[],
  // luxMagnifications) e FUN_0078aa3c("supportUsers"). Elementi: FUN_007a11c8
  // (nemico: uniqueEnemyId, dropItemTypeIds int[] <= 4, stealType), FUN_007a1308
  // (tesoro), FUN_007a1428 (startStageData: stageId, supportUserId uint64,
  // userKeybladeId uint64, clearMissionIds int[] <= 3, stageSkip, eventId,
  // highScore uint64).
  const now = serverTime();
  // /stage/clear non riporta lo stage: vale quello avviato qui
  player.currentStageId = req?.stageId ?? START_STAGE_ID;
  savePlayer();
  send(res, 200, {
    ret: ret(),
    userData: { userPoint: userPointData(now) },
    startStageData: {
      stageId: req?.stageId ?? START_STAGE_ID,
      supportUserId: req?.supportUserId ?? 0,
      userKeybladeId: req?.userKeybladeId ?? USER_KEYBLADE_ID,
      clearMissionIds: stageClearMissions(req?.stageId ?? START_STAGE_ID),
      stageSkip: req?.stageSkip ?? 0,
      eventId: req?.eventId ?? 0,
      highScore: 0,
    },
    userRandomEnemies: [],
    userEnemyDropItems: stageEnemyDrops(req?.stageId ?? START_STAGE_ID),
    userTreasures: stageTreasures(req?.stageId ?? START_STAGE_ID),
    campaigns: [],
    luxMagnifications: { campaign: 0, party: 0 },
    supportUsers: [],
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
    userPoint: userPointData(now),
    userDetail: userDetailData(),
    stageResumption: stageResumptionData(),
    medalResumption: { userShuffleSkills: [], resumptionStatus: 0 },
  };
  send(res, 200, { ret: ret(), userData, userPopUp: { isPopBenefitStone: 0 } });
}

// Inventario del giocatore per tipo di oggetto, come lo usano le tabelle master
// (clearGetItemType, submissionRewardType, reward.type): 2 jewel (userStone.freeStone),
// 4 munny (userPoint.money), 5 materiale (userMaterials, id della tabella material),
// 14 Avatar Coin (userPoint.spherePoint: gli Avatar Boards sono le «sphere» del client,
// /user/sphere/buy sblocca i nodi, masu; CONGRATULATIONS: «Avatar Coin x6»),
// 3 medaglia (id della tabella medal: es. 90041 = Dewey ★ in The Dark Forest Pt. 2,
// riconosciuta confrontando la tabella stage con khuxwiki; una userMedal per copia).
// Gli altri tipi non sono ancora ricavati: si annotano nel log.
function grantItem(type, id, num) {
  num = Number(num) || 0;
  if (!type || !num) return;
  if (type === 3 && id) {
    player.medals = player.medals || [];
    for (let k = 0; k < num; k++) {
      // mai riusare un id (vendite e Level Up tolgono medaglie; medalState resta per id)
      const used = [100, ...player.medals.map((m) => m.userMedalId), ...Object.keys(player.medalState || {}).map(Number)];
      const userMedalId = Math.max(...used) + 1;
      player.medals.push({ userMedalId, medalId: id, level: 1, getDatetime: serverTime() });
    }
    if (!masterRows('medal').some((m) => m.medalId === id)) console.log(`  [inventario] medaglia ${id} assente dalla tabella medal`);
  } else if (type === 2) player.freeStone = (player.freeStone || 0) + num;
  else if (type === 4) player.money = (player.money || 0) + num;
  else if (type === 14) player.spherePoint = (player.spherePoint || 0) + num;
  else if (type === 5 && id) {
    player.materials = player.materials || {};
    player.materials[id] = (player.materials[id] || 0) + num;
  } else console.log(`  [inventario] tipo ${type} (id ${id}, x${num}) non gestito`);
}

// userMaterials[] (FUN_007a25e8): userMaterialId uint64, materialId, number
function userMaterialsData() {
  return Object.entries(player.materials || {}).filter(([, n]) => n > 0)
    .map(([id, n]) => ({ userMaterialId: Number(id), materialId: Number(id), number: n }));
}

function stageNumber(stageId) {
  if (!stageId) return 0;
  return masterRows('stage').find((r) => r.stageId === stageId)?.id ?? 0;
}

// userData.userDetail (FUN_0078babc), in GET /user e POST /stage/clear.
function userDetailData() {
  return {
    level: luxRankFor(player.lux), exp: 0, luxRank: luxRankFor(player.lux), luxGetRatio: 0,
    // maxDeckCost: con 0 «Begin» apre il popup di costo superato (PopupNormal_Cost_Over,
    // assente dalle risorse): crash. Dal campo cost della tabella player.
    titleLeftId: 0, titleRightId: 0, titlePlateId: 0,
    maxDeckCost: masterRows('player').find((r) => r.lv === luxRankFor(player.lux))?.cost ?? 10,
    playTimezones: [], // int[], al massimo 6
    playFrequently: 0,
    partyId: 0, // uint64
    // maxMedal: medaglie possedibili. Con 0 (e 3 medaglie) «Begin» apre il popup di
    // limite superato (PopupNormal_MedalOver.json, assente dalle risorse): crash.
    // 300 e' un segnaposto, il valore iniziale vero non e' noto.
    unionId: player.unionId, maxMedal: Number(process.env.KHUX_MAX_MEDAL || 300), mvpCount: 0,
    equipCoordinateNo: player.avatar ? AVATAR_COORDINATE : 0, // coordinato indossato (userAvatars)
    // numero della missione (campo id della tabella stage: Prologue = 1), non lo stageId
    // (1010): la schermata Quests (FUN_00d97410) lo confronta con misc 106 (130) per
    // sbloccare il quarto pulsante, e da sbloccato cerca un testo che non c'e' (crash).
    lastClearStageId: stageNumber(player.lastClearStageId),
    isGuilt: 0, isPet: 0, pvpClass: 0, pvpMvpCount: 0, // uint
  };
}

// userData.stageResumption (FUN_0078c138): 0 = niente da riprendere.
function stageResumptionData() {
  return { resumptionStatus: 0, stageId: 0, raidId: 0, colosseumStageId: 0 };
}

function respondStageContinue(res) {
  // POST /stage/continue (azione 115, dopo il KO) e /stage/retire (114): il ramo
  // rilegge userKeyblades (FUN_0078cca8); retire anche userData.stageResumption.
  send(res, 200, { ret: ret(), userKeyblades: userKeybladesData(), userData: { stageResumption: stageResumptionData() } });
}

function respondStageClear(res, req) {
  // POST /stage/clear (azione 116). Il ramo chiama FUN_0078b230 (userData.userPoint),
  // FUN_0078babc (userData.userDetail), FUN_007817a0 (stageRewardUserMedalIds[]
  // {rewardkind, userMedalId uint64, display}, poi per uno stage normale
  // highScoreReward[] (clearTimeMissionIds[] / pvpPointReward[] in altri modi),
  // firstClearFlag, stageOpenNum, clearMissionIds[], userPvpRanking {rank, class,
  // point}, status, userMaterials[], getLux uint64), FUN_0078c138
  // (userData.stageResumption) e FUN_007a5dec (guiltBurstFirstUserMedalIds[],
  // guiltBurstMaxUserMedalIds[]).
  const now = serverTime();
  // il corpo non porta stageId (solo l'esito): lo stage e' quello di /stage/start
  const stageId = req?.stageId ?? player.currentStageId ?? START_STAGE_ID;
  player.stageScores = player.stageScores || {};
  const first = !(stageId in player.stageScores); // mai completato prima
  const stage = masterRows('stage').find((r) => r.stageId === stageId);
  // l'ultimo stage completato avanza solo (rigiocare il Prologue non lo riporta indietro)
  if (stageNumber(stageId) >= stageNumber(player.lastClearStageId)) player.lastClearStageId = stageId;
  // munny e materiali raccolti (sacchetti dei nemici, forzieri) come li riporta il client
  player.money = (player.money || 0) + (Number(req?.getPoint?.money) || 0);
  for (const m of req?.getMaterials || []) grantItem(5, m.materialId, m.number);
  // sacchetti dei nemici: il client riporta solo gli uid (getEnemyDropItems), il
  // contenuto e' la riga di reward del nemico nella mappa (1 se l'uid non ha record),
  // come in CONGRATULATIONS (es. Spring Water x12 in Combat 102)
  const enemyRows = new Map((STAGE_POI[stageId]?.enemies || []).map((e) => [e.uid, e.reward]));
  for (const uid of req?.getEnemyDropItems || []) {
    const row = rewardRowById(enemyRows.get(uid) ?? 1);
    row?.type.forEach((t, i) => { if (t === ENEMY_DROP_TYPE) grantItem(t, row.id[i], row.num[i]); });
  }
  // premio del primo completamento («Quest Complete!»: es. Combat 101, 300 jewel)
  if (first && stage?.validClearGetItem) {
    stage.clearGetItemType.forEach((t, i) => grantItem(t, stage.clearGetItemId[i], stage.clearGetItemNum[i]));
  }
  // clearMissionIds: le missioni compiute in questa partita, come le riporta il corpo
  // della richiesta; il client le spunta nella schermata RESULTS. Vuoto = nessuna spunta.
  // Le missioni sui Lux (submissionRequire 29, «Collect %d or more Lux») il client non
  // le riporta: le valuta il server sui Lux della partita (getPoint.lux), che
  // restituisce in getLux (la barra Lux di RESULTS).
  const lux = Number(req?.getPoint?.lux) || 0;
  player.lux += lux; // userPoint.lux/totalLux e luxRank nella risposta: dopo lo stage
  const cleared = Array.isArray(req?.clearMissionIds) ? [...req.clearMissionIds] : [];
  (stage?.submissionRequire || []).forEach((kind, i) => {
    if (kind === 29 && lux >= (stage.submissionNum?.[i] ?? Infinity) && !cleared.includes(i + 1)) cleared.push(i + 1);
  });
  cleared.sort((a, b) => a - b).splice(3);
  // premio di ogni obiettivo compiuto per la prima volta («Objective Complete!»)
  const before = stageClearMissions(stageId);
  for (const n of cleared.filter((n) => !before.includes(n))) {
    grantItem(stage?.submissionRewardType?.[n - 1], stage?.submissionItemId?.[n - 1], stage?.submissionItemNum?.[n - 1]);
  }
  player.clearMissions[stageId] = [...new Set([...before, ...cleared])].sort((a, b) => a - b).slice(0, 3);
  // stage completato, con il record di Lux (Lux Record nell'elenco delle missioni)
  player.stageScores[stageId] = Math.max(player.stageScores[stageId] || 0, lux);
  savePlayer();
  send(res, 200, {
    ret: ret(),
    userData: { userPoint: userPointData(now), userDetail: userDetailData(), stageResumption: stageResumptionData() },
    stageRewardUserMedalIds: [],
    highScoreReward: [], clearTimeMissionIds: [], pvpPointReward: [],
    firstClearFlag: first ? 1 : 0,
    stageOpenNum: 1,
    clearMissionIds: cleared,
    userPvpRanking: { rank: 0, class: 0, point: 0 },
    status: 0,
    userMaterials: userMaterialsData(),
    getLux: lux, // uint64
    // stage normale: anche FUN_00794094 (pet.userPetParts[]) e FUN_00797a84
    // (emblemIds[]), entrambi obbligatori (senza: «200 ERROR :116»)
    pet: { userPetParts: [] },
    emblemIds: [],
    // poi, tutti obbligatori e in quest'ordine, l'inventario aggiornato:
    // userMaterials (FUN_007a25e8), userMedals (FUN_0078da18), userSkills
    // (FUN_0078e934), userTitles (FUN_007a2ed0), userKeyblades (FUN_0078cca8),
    // userDecks (FUN_00792bf4), userAvatarParts (FUN_007a1d14), subslot
    // (FUN_00798a64 modo 1), infine getLux
    userMedals: userMedalsData(now),
    userSkills: [],
    userTitles: [],
    userKeyblades: userKeybladesData(),
    userDecks: userDecksData(),
    userAvatarParts: [],
    subslotMaxNum: 0,
    userKeybladeSubslots: userKeybladeSubslotsData(),
    guiltBurstFirstUserMedalIds: [], guiltBurstMaxUserMedalIds: [],
  });
}

// ---------------------------------------------------------------------------
// Inventario iniziale e storia: il minimo per la prima battaglia del tutorial.
// Gli id rimandano alle tabelle master della 5.0.1 offline (keyblade 1000 =
// Starlight, stage 1010 = Prologue). La tabella medal non c'e': deck senza medaglie.
// ---------------------------------------------------------------------------
const START_STAGE_ID = Number(process.env.KHUX_START_STAGE || 1010);
const USER_KEYBLADE_ID = 1;
const USER_DECK_ID = 1;
const USER_KEYBLADE_SUBSLOT_ID = 1;

function masterRows(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(MASTER_DIR, name + '.json'), 'utf8'));
  } catch {
    return [];
  }
}

// Inventario iniziale da initItem: categoria 3 = medaglie del deck (equipType 3,
// equipNo = slot, param = livello), categoria 13 = keyblade iniziale. Le medaglie
// hanno userMedalId 1, 2, 3 nell'ordine degli slot.
function startingInventory() {
  const rows = masterRows('initItem');
  const medals = rows.filter((r) => r.category === 3).sort((a, b) => a.equipNo - b.equipNo)
    .map((r, i) => ({ userMedalId: i + 1, medalId: r.itemId, level: r.param || 1 }));
  const kb = rows.find((r) => r.category === 13);
  return { medals, keybladeId: kb ? kb.itemId : 1000 };
}

// HP del livello 1 dalla tabella player (generata da make-game-tables.js).
function levelHp(lv = 1) {
  const row = masterRows('player').find((r) => r.lv === lv);
  return row ? row.hp : 0;
}

// userMedals[], elemento letto da FUN_0078d608 (userSkills al massimo 2,
// userShuffleSkills).
// Le medaglie iniziali del deck (userMedalId 1-3) e quelle ricevute come premio
// (player.medals, userMedalId da 101). player.medalState[userMedalId] = {medalId, level,
// exp, removed} sovrascrive entrambe (Level Up, Evolve, materiali consumati).
function userMedalList() {
  const st = player.medalState || {};
  return [...startingInventory().medals, ...(player.medals || [])]
    .filter((m) => !st[m.userMedalId]?.removed)
    .map((m) => ({ ...m, ...(st[m.userMedalId] || {}) }));
}

// Medaglie impilabili (validPack, le medaglie di supporto): il salvataggio tiene le copie
// separate, il client le vede come una cella sola con number = copie (badge rosso), con
// userMedalId della prima copia (fino a 99 per cella, come negli screenshot originali).
function stackedMedalList() {
  const pack = new Set(masterRows('medal').filter((r) => r.validPack).map((r) => r.medalId));
  const out = [], stacks = new Map();
  for (const m of userMedalList()) {
    const s = pack.has(m.medalId) && stacks.get(m.medalId);
    if (s && s.number < 99) { s.number++; s.copies.push(m.userMedalId); continue; }
    const e = { ...m, number: 1, copies: [m.userMedalId] };
    if (pack.has(m.medalId)) stacks.set(m.medalId, e);
    out.push(e);
  }
  return out;
}

// Le copie da consumare per (userMedalId della cella, numero): vendita e Level Up.
function stackCopies(userMedalId, number) {
  const cell = stackedMedalList().find((m) => m.userMedalId === Number(userMedalId));
  return cell ? cell.copies.slice(0, Math.max(1, Number(number) || 1)) : [Number(userMedalId)];
}

function userMedalElement(m, now) {
  return {
    userMedalId: m.userMedalId, // uint64
    medalId: m.medalId,
    number: m.number || 1, // uint
    level: m.level || 1, exp: m.exp || 0, // exp cumulativo (struttura +0x14, livello +0x10)
    attackUpperNumber: 0, defenseUpperNumber: 0, burstUpperNumber: 0,
    lock: player.medalLocks?.[m.userMedalId] ? 1 : 0,
    upperCost: 0, guiltFactor: 0, // guiltFactor: uint
    userSkills: [], userShuffleSkills: [],
    getDatetime: m.getDatetime || now,
  };
}

function userMedalsData(now) {
  return stackedMedalList().map((m) => userMedalElement(m, now));
}

// Curva dell'EXP delle medaglie, come il client (FUN_00722620): per expType t la riga
// medalMisc 105+t = [N, A, P]; l'EXP cumulativo per superare il livello L e'
// A * (L / (N-1)) ^ (P/10000), in float. Tipo 1: L1 8, L2 37, L3 88 (banco: LV1 + 70 EXP
// = LV3, «LV Up in 18»).
function medalMiscValue(id) {
  return masterRows('medalMisc').find((r) => r.medalMiscId === id)?.value || [0, 0, 0];
}

function medalExpToPass(row, lv) {
  const [n, a, p] = medalMiscValue(105 + (row.expType >= 1 && row.expType <= 6 ? row.expType : 1));
  const f = Math.fround;
  return Math.trunc(f(a * f(Math.pow(f(lv / f(n - 1)), f(p / 10000)))));
}

function medalLevelFor(row, lv, exp) {
  while (lv < row.maxLv && medalExpToPass(row, lv) <= exp) lv++;
  return lv;
}

// EXP dato da un materiale (FUN_00c82da0): materialExp + B*((lv-1)/(N-1))^(P/10000) con
// [N, B, P] = medalMisc 112; x1,5 (113) se ha lo stesso attributo della base, x1,5 (114)
// se condividono una fonte (source).
function materialExpFor(baseRow, matRow, matLevel) {
  const f = Math.fround;
  const [n, b, p] = medalMiscValue(112);
  let e = Math.trunc(f(matRow.materialExp + f(b * f(Math.pow(f((matLevel - 1) / f(n - 1)), f(p / 10000))))));
  if (baseRow.attribute === matRow.attribute) e = Math.trunc(f(e * (medalMiscValue(113)[0] / 10000)));
  const src = (r) => (r.source || []).slice(0, r.validSource || 0);
  if (src(baseRow).some((s) => src(matRow).includes(s))) e = Math.trunc(f(e * (medalMiscValue(114)[0] / 10000)));
  return e;
}

function setMedalState(id, patch) {
  player.medalState = player.medalState || {};
  player.medalState[id] = { ...(player.medalState[id] || {}), ...patch };
}

// POST /user/medal/enhance (azione 55, Level Up), corpo visto sul banco:
// {"baseUserMedalId":1,"componentUserMedalIds":[105],"isOverwriteSkill":0,"numbers":[],
// "isGreatSuccess":1}. Ramo 55 del dispatcher: userSkills, userData.userPoint, userMedals,
// poi FUN_0078f990 (before/afterEnhanceUserMedal come gli elementi di userMedals,
// enhanceEffect, overwriteSkills, successOverwrite, guiltBurstFirstLv/MaxLv) e pet
// (facoltativo), infine FUN_0078e30c (medalResumption). Costo come FUN_00c833e4: medalMisc 115 (80) x livello x materiali.
// Great Success: x1,5 (medalMisc 118, ipotesi: il client manda gia' l'esito).
function respondMedalEnhance(res, body) {
  const rows = new Map(masterRows('medal').map((r) => [r.medalId, r]));
  const list = new Map(userMedalList().map((m) => [m.userMedalId, m]));
  const base = list.get(Number(body?.baseUserMedalId));
  // celle impilate: numbers[i] copie della cella componentUserMedalIds[i] (vuoto = 1)
  const cells = (body?.componentUserMedalIds || []).map(Number);
  const comps = cells.flatMap((id, i) => stackCopies(id, body?.numbers?.[i]))
    .map((id) => list.get(id)).filter(Boolean);
  const now = serverTime();
  if (!base || !rows.get(base.medalId)) {
    console.log('  [level up] medaglia base assente:', body?.baseUserMedalId);
    return send(res, 200, { ret: ret() });
  }
  const row = rows.get(base.medalId);
  const before = userMedalElement(base, now);
  let gain = comps.reduce((s, m) => s + (rows.get(m.medalId) ? materialExpFor(row, rows.get(m.medalId), m.level || 1) : 0), 0);
  if (Number(body.isGreatSuccess)) gain = Math.trunc(gain * medalMiscValue(118)[0] / 10000);
  const cost = medalMiscValue(115)[0] * (base.level || 1) * comps.length;
  const exp = (base.exp || 0) + gain;
  const level = medalLevelFor(row, base.level || 1, exp);
  setMedalState(base.userMedalId, { level, exp });
  for (const m of comps) setMedalState(m.userMedalId, { removed: true });
  player.money = Math.max(0, (player.money || 0) - cost);
  savePlayer();
  console.log(`  [level up] ${base.userMedalId} (${row.name}) +${gain} EXP: LV ${base.level || 1} -> ${level}, ` +
    `materiali ${comps.map((m) => m.userMedalId).join(',')}, -${cost} munny`);
  send(res, 200, {
    ret: ret(),
    userData: { userPoint: userPointData(now) },
    userSkills: [],
    userMedals: userMedalsData(now),
    beforeEnhanceUserMedal: before,
    afterEnhanceUserMedal: userMedalElement({ ...base, level, exp }, now),
    enhanceEffect: Number(body.isGreatSuccess) ? 1 : 0,
    overwriteSkills: [],
    successOverwrite: 0,
    guiltBurstFirstLv: 0, guiltBurstMaxLv: 0,
    // FUN_0078e30c, obbligatorio: senza, «200 ERROR :55»
    medalResumption: { userShuffleSkills: [], resumptionStatus: 0 },
    // FUN_007948d0 (pet.petSubslot, FUN_007949f0): senza, il ramo 55 va in errore se un
    // flag della sessione e' acceso
    pet: { petSubslot: { subslotUserMedalIds: [], openSkillIds: [], rank: 0, pt: 0, magnification: 0 } },
    // letto dal dispatcher dopo pet (0x7cec50, uint64): le medaglie consumate, che il
    // client toglie dall'elenco; senza, «200 ERROR :55»
    // solo le celle sparite: una pila con copie rimaste resta (arriva in userMedals)
    componentUserMedalIds: cells.filter((id) => !stackedMedalList().some((m) => m.userMedalId === id)),
  });
}

// POST /user/medal/evolve (azione 56), corpo visto sul banco:
// {"baseUserMedalId":1,"attachmentMedalIds":[116]}. La medaglia diventa evolveId della
// tabella medal, torna al livello 1; materiali consumati, costo evolveMoney. Ramo 56 del
// dispatcher: userData.userPoint, userMedals, FUN_00777670 (before/afterEvolveUserMedal
// come gli elementi di userMedals), pet, poi attachmentMedalIds (uint64).
function respondMedalEvolve(res, body) {
  const rows = new Map(masterRows('medal').map((r) => [r.medalId, r]));
  const list = new Map(userMedalList().map((m) => [m.userMedalId, m]));
  const base = list.get(Number(body?.baseUserMedalId));
  const cells = (body?.attachmentMedalIds || []).map(Number);
  // celle impilate: una copia per ogni volta che la cella compare nell'elenco
  const used = new Map();
  const comps = cells.map((id) => {
    const copies = stackCopies(id, (used.get(id) || 0) + 1);
    used.set(id, copies.length);
    return list.get(copies[copies.length - 1]);
  }).filter(Boolean);
  const now = serverTime();
  const row = base && rows.get(base.medalId);
  if (!row || !row.validEvolve || !rows.get(row.evolveId)) {
    console.log('  [evolve] non evolvibile:', body?.baseUserMedalId, row?.name);
    return send(res, 200, { ret: ret() });
  }
  const before = userMedalElement(base, now);
  setMedalState(base.userMedalId, { medalId: row.evolveId, level: 1, exp: 0 });
  for (const m of comps) setMedalState(m.userMedalId, { removed: true });
  player.money = Math.max(0, (player.money || 0) - (row.evolveMoney || 0));
  savePlayer();
  console.log(`  [evolve] ${base.userMedalId} ${row.name} ${row.medalId} -> ${row.evolveId}, ` +
    `materiali ${comps.map((m) => m.userMedalId).join(',')}, -${row.evolveMoney} munny`);
  send(res, 200, {
    ret: ret(),
    userData: { userPoint: userPointData(now) },
    userMedals: userMedalsData(now),
    beforeEvolveUserMedal: before,
    afterEvolveUserMedal: userMedalElement({ ...base, medalId: row.evolveId, level: 1, exp: 0 }, now),
    pet: { petSubslot: { subslotUserMedalIds: [], openSkillIds: [], rank: 0, pt: 0, magnification: 0 } },
    // solo le celle sparite (una pila con copie rimaste resta)
    attachmentMedalIds: [...new Set(cells)].filter((id) => !stackedMedalList().some((m) => m.userMedalId === id)),
  });
}

// POST /user/medal/sell (azione 51): risposta letta da FUN_0078b230 (userData.userPoint).
// Il corpo elenca le medaglie vendute: si raccolgono tutti gli userMedalId (campi con quel
// nome o array di id), si tolgono dal salvataggio e si accredita il campo sell della
// tabella medal (moltiplicato per number, se c'e'). Le medaglie iniziali del deck
// (userMedalId 1-3) non sono nel salvataggio e il client non le lascia vendere.
function soldMedalIds(body) {
  const ids = new Map();          // userMedalId -> number
  // corpo visto sul banco: {"userMedalIds":[106],"numbers":[1], ...}
  if (Array.isArray(body.userMedalIds)) {
    body.userMedalIds.forEach((id, i) => ids.set(Number(id), Number(body.numbers?.[i]) || 1));
    return ids;
  }
  (function walk(v, key) {
    if (Array.isArray(v)) {
      for (const x of v) {
        if (typeof x === 'number' && /medal/i.test(key || '')) ids.set(x, (ids.get(x) || 0) + 1);
        else walk(x, key);
      }
    } else if (v && typeof v === 'object') {
      if (v.userMedalId !== undefined) ids.set(Number(v.userMedalId), Number(v.number) || 1);
      for (const [k, x] of Object.entries(v)) if (k !== 'userMedalId') walk(x, k);
    }
  })(body, '');
  return ids;
}

function respondMedalSell(res, body) {
  const sold = soldMedalIds(body || {});
  const rows = new Map(masterRows('medal').map((r) => [r.medalId, r]));
  // celle impilate: si vendono le prime N copie della pila
  const copies = new Set([...sold].flatMap(([id, n]) => stackCopies(id, n)));
  let gain = 0;
  player.medals = (player.medals || []).filter((m) => {
    if (!copies.has(m.userMedalId)) return true;
    gain += rows.get(m.medalId)?.sell || 0;
    return false;
  });
  player.money = (player.money || 0) + gain;
  savePlayer();
  console.log(`  [vendita] medaglie ${[...sold.keys()].join(',') || '(nessun id nel corpo)'}: +${gain} munny`);
  // ramo 51 del dispatcher (action_case.py): FUN_0078b230 (userData.userPoint), poi
  // FUN_0078e934 (userSkills), FUN_0078da18 (userMedals), infine sellUserMedalIds;
  // senza i tre in radice «200 ERROR :51»
  const now = serverTime();
  send(res, 200, {
    ret: ret(),
    userData: { userPoint: userPointData(now) },
    userSkills: [],
    userMedals: userMedalsData(now),
    // solo le celle sparite (una pila con copie rimaste resta)
    sellUserMedalIds: [...sold.keys()].filter((id) => !stackedMedalList().some((m) => m.userMedalId === id)),
  });
}

// POST /user/medal/lock (azione 46), corpo visto sul banco:
// {"userMedalIds":[110],"isLocks":[1], ...}. Lo stato va in player.medalLocks (anche per
// le medaglie iniziali 1-3, che non sono in player.medals) e torna nel campo lock di
// userMedals. Ramo 46 del dispatcher: FUN_0078da18 (userMedals), deleteUserMedalIds,
// poi isSubslotUpdate (intero letto come flag != 0): senza, «200 ERROR :46».
function respondMedalLock(res, body) {
  const ids = Array.isArray(body?.userMedalIds) ? body.userMedalIds : [];
  player.medalLocks = player.medalLocks || {};
  ids.forEach((id, i) => {
    if (Number(body.isLocks?.[i])) player.medalLocks[Number(id)] = 1;
    else delete player.medalLocks[Number(id)];
  });
  savePlayer();
  console.log(`  [lucchetto] ${ids.map((id, i) => `${id}=${Number(body.isLocks?.[i]) ? 1 : 0}`).join(',')}`);
  send(res, 200, { ret: ret(), userMedals: userMedalsData(serverTime()), deleteUserMedalIds: [],
    isSubslotUpdate: 0 });
}

function respondUserMedal(res) {
  // GET /user/medal (azione 15)
  send(res, 200, { ret: ret(), userMedals: userMedalsData(serverTime()) });
}

// medaglie del deck: player.deck (0 = slot vuoto) dopo Unequip, altrimenti quelle iniziali
function deckMedalIds() {
  return player.deck || startingInventory().medals.map((m) => m.userMedalId);
}

// POST /user/medal/remove (azione 237, Unequip dal dettaglio), corpo visto sul banco:
// {"removeUserMedalId":2}. Lo slot del deck torna vuoto (0). Ramo 237: FUN_007aa8c0 =
// userKeyblades, userDecks, petSubslots (pet di FUN_007948d0 sulla radice di quel campo),
// subslotMaxNum + userKeybladeSubslots.
function respondMedalRemove(res, body) {
  const id = Number(body?.removeUserMedalId);
  player.deck = deckMedalIds().map((x) => (x === id ? 0 : x));
  savePlayer();
  console.log(`  [unequip] ${id}: deck ${player.deck.join(',')}`);
  send(res, 200, {
    ret: ret(),
    userKeyblades: userKeybladesData(),
    userDecks: userDecksData(),
    // array (il primo elemento sarebbe letto come petSubslot, FUN_007948d0 modo 1): vuoto,
    // perche' con un elemento il dispatcher lo copia nell'oggetto pet della sessione (+0x7c0),
    // creato solo dall'azione 170 (pet), e senza pet va in crash (0x7c8d40)
    petSubslots: [],
    subslotMaxNum: 0, userKeybladeSubslots: userKeybladeSubslotsData(),
  });
}

// userKeyblades[], elemento letto da FUN_0078c904 (deckMedals: al massimo 5 uint64).
// totalAttack/totalDefense = somma del deck, come userPoint.attack/defense.
function userKeybladesData() {
  const { attack, defense } = deckStats();
  return [{
    userKeybladeId: USER_KEYBLADE_ID, // uint64
    userDeckId: USER_DECK_ID, // uint64
    userKeybladeSubslotId: USER_KEYBLADE_SUBSLOT_ID, // uint64 (vedi /keyblade/subslot)
    category: 1,
    keybladeId: startingInventory().keybladeId,
    deckMedals: deckMedalIds(),
    burst: 0, totalAttack: attack, totalDefense: defense, isFavorite: 0,
    skillUpperTotalHp: 0, skillUpperTotalBurst: 0, skillUpperTotalAttack: 0,
    skillUpperTotalDefence: 0, subslotRate: 10000, // uint
    getDatetime: serverTime(),
  }];
}

function respondUserKeyblade(res) {
  // GET /user/keyblade (azione 11)
  send(res, 200, { ret: ret(), userKeyblades: userKeybladesData() });
}

// userDecks[], elemento letto da FUN_00792a8c.
function userDecksData() {
  return [{
    userDeckId: USER_DECK_ID, userKeybladeId: USER_KEYBLADE_ID, // uint64
    deckMedals: deckMedalIds(), petBaseSlotMedal: 0,
  }];
}

// GET /keyblade/subslot: subslotMaxNum (uint) e userKeybladeSubslots[], letti da
// FUN_00798a64 (elemento FUN_00798980: keybladeSubslotId uint64, subslotRate uint,
// subslots[] = {slotNumber 1..subslotMaxNum, userMedalId uint64}, FUN_00798750). Ogni
// keyblade deve avere il suo subslot (userKeybladeSubslotId), anche senza slot: la
// schermata Equipment (FUN_00c16d14) lo cerca in una mappa e, se manca, l'indice -1
// sfora il vettore (std::out_of_range, crash).
function userKeybladeSubslotsData() {
  return [{ keybladeSubslotId: USER_KEYBLADE_SUBSLOT_ID, subslotRate: 10000, subslots: [] }];
}

function respondKeybladeSubslot(res) {
  send(res, 200, { ret: ret(), subslotMaxNum: 0, userKeybladeSubslots: userKeybladeSubslotsData() });
}

function respondUserDeck(res) {
  // GET /user/deck (azione 12)
  send(res, 200, { ret: ret(), userDecks: userDecksData() });
}

const STAGE_CLEARED = Number(process.env.KHUX_STAGE_CLEARED || 2);

function respondStageList(res) {
  // GET /stage/160310 (azione 108, FUN_0079f1fc): stories[] (elemento FUN_0079e794:
  // stageId, useAp, score uint64, playStatus, clearMissionIds int[] <= 3),
  // newStageId, luxRank, openRankingId (uint).
  // Gli stage completati (player.stageScores: stageId -> record di Lux) e poi il primo
  // non ancora completato, nell'ordine del numero di missione (campo id della tabella
  // stage). playStatus: 0 = nuovo, STAGE_CLEARED (2, da verificare) = completato.
  const stages = masterRows('stage').filter((r) => r.stageKind === 1).sort((a, b) => a.id - b.id);
  const scores = player.stageScores || {};
  const stories = [];
  let next = null;
  for (const r of stages) {
    if (r.stageId in scores) {
      stories.push({ stageId: r.stageId, useAp: r.useAp, score: scores[r.stageId], playStatus: STAGE_CLEARED,
        clearMissionIds: stageClearMissions(r.stageId) });
    } else {
      next = r;
      stories.push({ stageId: r.stageId, useAp: r.useAp, score: 0, playStatus: 0, clearMissionIds: [] });
      break;
    }
  }
  if (!stories.length) stories.push({ stageId: START_STAGE_ID, useAp: 0, score: 0, playStatus: 0, clearMissionIds: [] });
  send(res, 200, {
    ret: ret(),
    stories,
    newStageId: next ? next.stageId : stories[stories.length - 1].stageId,
    luxRank: 0,
    openRankingId: 0,
  });
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
      if (kind === 'resourcesize') return respondResourceSize(res, entry.bodyDecoded);
      if (kind === 'master') return respondMaster(res);
      if (kind === 'masterfile') return respondMasterFile(req, res);
      if (kind === 'resource') return respondResource(res);
      if (kind === 'resourceev') return respondResourceEv(res);
      if (kind === 'resourcefile') return respondResourceFile(req, res);
      if (kind === 'tutorialstatus') return respondTutorialStatus(res, entry.bodyDecoded);
      if (kind === 'khuxlogin') return respondKhuxLogin(res);
      if (kind === 'usercreate') return respondUserCreate(res, entry.bodyDecoded);
      if (kind === 'userkeyblade') return respondUserKeyblade(res);
      if (kind === 'userdeck') return respondUserDeck(res);
      if (kind === 'kbsubslot') return respondKeybladeSubslot(res);
      if (kind === 'usermedal') return respondUserMedal(res);
      if (kind === 'medalsell') return respondMedalSell(res, entry.bodyDecoded);
      if (kind === 'medallock') return respondMedalLock(res, entry.bodyDecoded);
      if (kind === 'medalenhance') return respondMedalEnhance(res, entry.bodyDecoded);
      if (kind === 'medalevolve') return respondMedalEvolve(res, entry.bodyDecoded);
      if (kind === 'medalremove') return respondMedalRemove(res, entry.bodyDecoded);
      if (kind === 'stagelist') return respondStageList(res);
      if (kind === 'stagestart') return respondStageStart(res, entry.bodyDecoded);
      if (kind === 'stagecontinue') return respondStageContinue(res);
      if (kind === 'stageclear') return respondStageClear(res, entry.bodyDecoded);
      // GET /campaign (azione 143): campaigns, array di int (id delle campagne attive)
      if (kind === 'campaign') return send(res, 200, { ret: ret(), campaigns: [] });
      // GET /raid/list/181221 (azione 240, FUN_007aadc0): selfRaid (FUN_0079c07c modo 0:
      // raidStatus int, raid {raidId uint64, level, useAp, timeLeft, feverFlag,
      // feverTime, stageId, parts[]}) e raids[] ({...raid, isRelief, isEntry}).
      // Nessun raid: raidStatus 0.
      if (kind === 'raidlist') {
        const now = serverTime();
        return send(res, 200, {
          ret: ret(),
          selfRaid: {
            raidStatus: 0,
            raid: { raidId: 0, level: 0, useAp: 0, timeLeft: now, feverFlag: 0, feverTime: now, stageId: 0, parts: [] },
          },
          raids: [],
        });
      }
      // GET /user/support: la medaglia di supporto del giocatore (supportUser). Con
      // medalId 0 la home cerca la medaglia 0 e va in crash (FUN_00721a24, riga nulla):
      // si usa la prima medaglia del deck, con la keyblade iniziale.
      if (kind === 'usersupport') {
        const m = startingInventory().medals[0] || { userMedalId: 0, medalId: 0 };
        return send(res, 200, {
          ret: ret(),
          supportUser: {
            supportUserId: 1, userName: player.name, level: luxRankFor(player.lux),
            titleLeftId: 0, titleRightId: 0, titlePlateId: 0, partyId: 0,
            userKeybladeId: USER_KEYBLADE_ID, keybladeId: startingInventory().keybladeId,
            userMedalId: m.userMedalId, medalId: m.medalId, lastActionDatetime: serverTime(),
          },
        });
      }
      // GET /stage/support/list (azione 111, FUN_0078aa3c "supportUsers"): prima della
      // scelta del deck. Con la lista vuota il client va in crash sulle statistiche di una
      // medaglia senza riga (FUN_00721a24). Elemento FUN_0078a5c4, con userMedal
      // (FUN_0078dd60 -> FUN_0078d608), userSkills[] e userAvatar (FUN_0078c55c). Un
      // supporto: il giocatore stesso, con la prima medaglia del deck.
      if (kind === 'supportlist') {
        const now = serverTime();
        const medal = userMedalsData(now)[0];
        const supportUsers = medal ? [{
          supportUserId: 1, level: luxRankFor(player.lux), unionId: player.unionId, userName: player.name,
          titleLeftId: 0, titleRightId: 0, titlePlateId: 0, addKizunaPoint: 0,
          keybladeId: startingInventory().keybladeId, partyId: 0, isParty: 0, isGuilt: 0, isLinkThumbnail: 0,
          userMedal: medal, userSkills: [], userAvatar: userAvatarData(),
          lastActionDatetime: now, earnLuxRank: 0,
        }] : [];
        return send(res, 200, { ret: ret(), supportUsers });
      }
      // GET /user/avatar (21), /user/avatar/all (22), /user/avatar/parts (23)
      if (kind === 'useravatar') {
        const p = req.url.split('?')[0];
        if (p === '/user/avatar/parts') return send(res, 200, { ret: ret(), userAvatarParts: userAvatarPartsData() });
        if (p === '/user/avatar/all') return send(res, 200, { ret: ret(), userAvatars: [userAvatarData()] });
        return send(res, 200, { ret: ret(), userAvatar: userAvatarData() });
      }
      // GET /raid/reward/151101 (azione 120): userData.userPoint (FUN_0078b230),
      // raidRewards[] (FUN_0079cac0) e i due array di FUN_007a5dec. Nessun premio.
      if (kind === 'raidreward') {
        return send(res, 200, {
          ret: ret(),
          userData: { userPoint: userPointData(serverTime()) },
          raidRewards: [],
          guiltBurstFirstUserMedalIds: [], guiltBurstMaxUserMedalIds: [],
        });
      }
      // GET /user/point (azione 2) e POST /user/sphere/reset (azione 62): solo
      // userData.userPoint (FUN_0078b230)
      if (kind === 'userpoint') return send(res, 200, { ret: ret(), userData: { userPoint: userPointData(serverTime()) } });
      // GET /user/stone (azione 7, FUN_00776e38): i jewel. freeStone = guadagnati in
      // gioco (premi delle missioni), payStone = comprati (sempre 0)
      if (kind === 'userstone') return send(res, 200, { ret: ret(), userStone: { freeStone: player.freeStone || 0, payStone: 0 } });
      // GET /user/material (azione 16): userMaterials[]
      if (kind === 'usermaterial') return send(res, 200, { ret: ret(), userMaterials: userMaterialsData() });
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
  // MD5 dei pacchetti di risorse calcolati subito, non alla prima richiesta del client;
  // solo l'ultima versione (l'unica annunciata): con tutte, a dozzine di GB, il server si
  // metteva in ascolto dopo minuti e il client andava in timeout («28 ERROR :251», curl 28)
  for (const v of resourceVersions().slice(-1)) {
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
