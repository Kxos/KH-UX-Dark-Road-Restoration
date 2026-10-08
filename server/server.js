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
    versionRes: REVISION,
    versionResLow: REVISION,
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
// byte. Hanno l'aria di un seme e di tre chiavi da 256 bit; a cosa servano non
// e' ancora chiaro. Casuali, ma stabili per tutta la vita del server.
const LOGIN_DATA = [8, 32, 32, 32].map((n) => crypto.randomBytes(n).toString('base64'));

function respondLogin(res) {
  // POST /system/login, azione 251: corpo cifrato {length, digest, ruv,
  // deviceType, systemVersion, appVersion}. length e digest descrivono
  // libcocos2dcpp.so: il server originale ci controllava l'integrita' del client.
  // Il ramo 0xfb di FUN_007c3204 pretende systemLogin (FUN_0077f650) e data
  // (FUN_0077f830); i link li legge FUN_00791070.
  const body = {
    ret: ret(),
    systemLogin: { newcomerKhux: true, newcomerDark: true },
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

function masterTables() {
  if (!fs.existsSync(MASTER_DIR)) return [];
  return fs.readdirSync(MASTER_DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
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
      if (kind === 'session') return respondSession(res);
      if (kind === 'bootstrap') return respondBootstrap(res);

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
