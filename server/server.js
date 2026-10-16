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
 *   bootstrap -> { maintenance, url, nativeToken }    letto da [fn]
 *   sessione  -> { nativeSessionId, sharedSecurityKey } letto da [fn]
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
const { makeMulti, routeMulti } = require('./multi');
const { makeKeybladeEvo, routeKeybladeEvo } = require('./keyblade-evo');
const { makeGuiltBurst } = require('./guilt-burst');
const medalGuilt = require('./medal-guilt');
const infoAlbum = require('./routes-info-album');
const legalPages = require('./legal-pages');
const { routePartyRanking, respondPartyRanking } = require('./routes-party-ranking');
const medalSkill = require('./medal-skill');
// Pet / 6° slot (server/pet.js): KHUX_PET=1, default spento
const { routePet, makePet, petBaseSlotMedal, setPetBaseSlotMedal, ENABLED: PET_ENABLED } = require('./pet');

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
  if (p === '/web/passive') return 'passivepage';
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
  if (p.startsWith('/user/keyblade/update')) return 'keybladeupdate';
  if (p === '/user/deck') return 'userdeck';
  if (p === '/keyblade/subslot') return 'kbsubslot';
  if (routeKeybladeEvo(p)) return routeKeybladeEvo(p);
  if (routePet(p)) return routePet(p);
  if (p === '/user/medal') return 'usermedal';
  if (p === '/user/skill') return 'userskill';
  if (p === '/user/medal/sell') return 'medalsell';
  if (p === '/user/medal/lock') return 'medallock';
  if (p === '/user/medal/enhance') return 'medalenhance';
  if (p === '/user/medal/evolve') return 'medalevolve';
  if (p === '/user/medal/remove') return 'medalremove';
  if (p === '/user/material/sell') return 'materialsell';
  if (p === '/moogleshop/buy') return 'moogleshopbuy';
  if (p === '/shop/medal/max') return 'medalmax';
  if (p === '/union/change') return 'unionchange';
  if (p === '/moogleshop/list') return 'moogleshoplist';
  if (/^\/stage\/\d+$/.test(p)) return 'stagelist';
  if (p === '/stage/start') return 'stagestart';
  if (p === '/stage/continue' || p === '/stage/retire') return 'stagecontinue';
  if (p === '/stage/clear') return 'stageclear';
  if (p === '/shop/ap/recover') return 'aprecover';
  if (p === '/stage/event') return 'stageevent';
  if (p === '/stage/pickup') return 'stagepickup';
  if (p === '/user/notice') return 'usernotice';
  if (p === '/colosseum') return 'colosseum';
  if (p === '/user/point' || p === '/user/sphere/reset') return 'userpoint';
  if (p === '/user/stone') return 'userstone';
  if (p === '/user/present') return 'userpresent';
  if (p === '/user/present/receive') return 'presentreceive';
  if (p === '/user/material') return 'usermaterial';
  if (p === '/campaign') return 'campaign';
  if (p === '/ranking/reward/check') return 'rankingrewardcheck';
  if (routePartyRanking(p)) return routePartyRanking(p);
  // Coliseum PvP (azioni 194-205): respondPvp
  // /pvp/keyblade resta alla risposta generica (com'era prima del 14-10): con la risposta del ramo pvp
  // (userDecks) ogni battaglia andava in crash creando l'HUD, con solo ret «200 ERROR :196»
  if (p !== '/pvp/keyblade' && (p === '/pvp' || p.startsWith('/pvp/') || p.startsWith('/ranking/pvp'))) return 'pvp'; // anche pvpparade
  if (p.startsWith('/multi/')) return routeMulti(p); // Union Cross: server/multi.js
  if (p.startsWith('/raid/list')) return 'raidlist';
  if (p.startsWith('/raid/reward')) return 'raidreward';
  if (p === '/user/support' || p === '/user/support/update') return 'usersupport';
  if (p === '/stage/support/list') return 'supportlist';
  if (p === '/user/avatar' || p === '/user/avatar/all' || p === '/user/avatar/parts') return 'useravatar';
  if (p === '/user') return 'user';
  if (p === '/user/profile') return 'userprofile';
  if (p === '/mypage') return 'mypage';
  if (p === '/user/birthday') return 'userbirthday';
  if (p === '/user/title') return 'usertitle';
  if (p === '/user/mission/list') return 'missionlist';
  if (p === '/user/mission') return 'usermission';
  if (p === '/web/beginner') return 'beginnerpage';
  if (p === '/system/information/list') return 'infolist';
  if (p.startsWith('/system/information/list/')) return 'infopopup';
  if (p === '/web/notices') return 'noticespage';
  if (p === '/web/agreement') return 'agreementpage';
  if (p === '/web/license') return 'licensepage';
  if (p.startsWith('/user/album/') && !p.startsWith('/user/album/challenge')) return 'album';
  if (p === '/user/sphere') return 'spherelist';
  if (p === '/user/sphere/update') return 'sphereupdate';
  if (p.startsWith('/user/sphere/check')) return 'spherecheck';
  if (p === '/user/mission/receive') return 'missionreceive';
  if (p === '/user/update') return 'userupdate';
  if (p === '/user/playstyle/update' || p === '/user/title/update') return 'userdetailupdate';
  if (p.includes('system/master')) return 'master';
  if (p.startsWith('/master/')) return 'masterfile';
  if (p.includes('session')) return 'session';
  if (p.includes('login/token')) return 'bootstrap';
  if (p.includes('bootstrap') || p.includes('startup') || p.includes('init')) return 'bootstrap';
  return null;
}

function respondStatus(res) {
  // PUT /system/status, richiesta 251 (0xfb). Letto da [fn]:
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
  return serverTimeAt(Date.now());
}

// L'ora del server corrispondente a un istante reale (ms): per i tempi salvati
// (player.apTime), che restano coerenti anche dopo un riavvio del server.
function serverTimeAt(realMs) {
  // Formato letto da [fn]: "YYYY-MM-DD HH:MM:SS".
  const t = new Date(SERVER_TIME_START + (realMs - STARTED_AT));
  return t.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * L'involucro "ret" di ogni risposta di gioco, letto da [fn]. Il client
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
// [fn]: link a pagine web (supporto, termini, store, social...). Il
// client le pretende tutte, come stringhe; vuote bastano per proseguire.
const LOGIN_LINKS = [
  'support', 'register', 'update', 'help', 'staff', 'agreement', 'license',
  'shikin', 'tokutei', 'store', 'odds', 'petOdds', 'appUpdate', 'officialSite',
  'officialTwitter', 'movie', 'beginnersGuide', 'passiveSettingList', 'darkHelp',
  'darkOdds', 'officialTwitterCustom',
];

// "data" della risposta di login, letto da [fn]: almeno 4 stringhe
// Base64 (cocos2d::base64Decode) che il client si aspetta di 8, 32, 32 e 32
// byte. Hanno l'aria di un seme e di tre chiavi da 256 bit. Il QUARTO e' la chiave
// dei record md5/size degli indici delle risorse scaricate ([fn] legge
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
  // Il ramo 0xfb di [fn] pretende systemLogin ([fn]) e data
  // ([fn]); i link li legge [fn].
  const body = {
    ret: ret(),
    // Un nuovo giocatore NON scarica le risorse all'avvio ([fn]): fa il
    // tutorial con la grafica gia' installata (APK + OBB). KHUX_NEWCOMER=0
    // presenta un giocatore esistente, l'unico che arriva all'azione 28.
    systemLogin: { newcomerKhux: isNewcomer(), newcomerDark: isNewcomer() },
    data: LOGIN_DATA,
  };
  for (const k of LOGIN_LINKS) body[k] = '';
  body.passiveSettingList = `${SESSION_BASE.replace(/^https:/, 'http:')}/web/passive`; // «Passive Effects» (I-065): in https la WebView rifiuta il certificato
  // «Beginner's Guide» della home: [fn] apre una WebView (titolo testo 106210101)
  // sull'URL beginnersGuide (link +0x210); vuoto = finestra vuota. Pagina nostra, /web/beginner
  body.beginnersGuide = `${SESSION_BASE.replace(/^https:/, 'http:')}/web/beginner`;
  // Legal Information: User Agreement (+0x78) e License (+0x90), WebView (server/legal-pages.js)
  body.agreement = `${SESSION_BASE.replace(/^https:/, 'http:')}/web/agreement`;
  body.license = `${SESSION_BASE.replace(/^https:/, 'http:')}/web/license`;
  send(res, 200, body);
}

function respondCoppa(res) {
  // GET /system/coppa, azione 26, letto da [fn]: un oggetto "misc" di
  // interi senza segno, con chiavi numeriche. Il significato dei codici non e'
  // ancora noto; 0 basta perche' il client li accetti.
  const misc = {};
  for (const k of ['116', '804', '900', '901', '902', '903', '904', '905', '906', '907']) {
    misc[k] = 0;
  }
  // misc 116 non puo' essere 0. A fine download SceneDownload::update ([fn] ->
  // [fn]) confronta il suo campo +0x3bc (0 dal costruttore) con la voce 116 di
  // questa mappa (oggetto di sessione +0x3a0, chiave 0x74): se sono uguali chiama un
  // metodo sul nodo +0x3a8, che nella SceneDownload dei soli master non viene mai creato
  // (memoria non inizializzata): crash a 0x12c1ee0 dopo ogni aggiornamento dei master
  // per chi rientra. Trovato con tools/ldplayer/armtrace (x30 = 0xcfb310). Con un valore
  // diverso il client prende l'altra strada ([fn]) e prosegue verso la home.
  misc['116'] = Number(process.env.KHUX_COPPA_116 || 1);
  send(res, 200, { ret: ret(), misc });
}

function respondResourceSize(res, req) {
  // PUT /system/resourcesize/<data>, azione 242. Corpo: {resoMode,
  // masterRevision, resourceRevision, commonMasterRevision, evResourceIds}.
  // Il ramo 242 di [fn] legge solo "size", intero senza segno: i byte
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
// GET /system/master/<data> (azione 27, [fn]) restituisce per ogni
// tabella {revision, url, key, md5}. Il client scarica url e lo decodifica come
// ogni risposta "application/encoded-json" o "application/octet-stream"
// ([fn]): curl_easy_unescape -> base64 -> AES-256-CBC con key (i 32
// byte della stringa), IV a zero, PKCS#7 -> JSON. md5: ipotesi, MD5 esadecimale
// del corpo scaricato (cosi' fa il downloader generico [fn]).
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
// GET /system/resource (azione 28, richiesta da [fn] con corpo
// {revision, resoMode}; risposta letta da [fn]):
//   { resource: { mode, minVersion, versions: [ {data: [file], index: [file]} ] } }
// mode 0 = niente da scaricare, 1 o 2 = scarica. La versione i-esima vale
// minVersion + i. file = {url, md5, size}: stringhe non vuote e size > 0.
//
// Il downloader ([fn] -> [fn]) accetta un file solo se il
// corpo e' lungo `size`, il suo MD5 esadecimale e' `md5` e il Content-Type
// contiene "application/octet-stream". Lo salva nella cartella scrivibile con un
// nome derivato dall'url; la cache ([fn]) rifa' lo stesso controllo.
//
// Il client chiede l'azione 28 solo se le revisioni delle risorse differiscono,
// il giocatore NON e' nuovo e il tutorial risulta finito (stato del tutorial,
// [fn], campo isFinished).
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
  // GET /system/resourceEv (azione 29, [fn]): array "resourceEv" di
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
  // GET/PUT /tutorial/status (azioni 69/70), letto da [fn] alla radice:
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
  // /system/coppa. Letto da [fn]: gameLogin.acquirableLoginBonus (bool).
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

// GET /user (azione 1, callUserGetAPI). Il ramo 1 di [fn] chiama, tutti
// obbligatori: [fn] (userData.user), [fn] (userData.userPoint),
// [fn] (userData.userDetail), [fn] (userData.stageResumption),
// [fn] (userData.medalResumption), poi pretende userPopUp.isPopBenefitStone.
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
// [fn] (userAvatar, elementi di userAvatars) e [fn] (elementi di
// userAvatarParts). Al rientro la home costruisce l'avatar da qui ([fn]):
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
  // indossate e guadagnate (premi degli Avatar Boards, player.avatarParts)
  const ids = [a.hairPartsId, a.hairColorPartsId, a.facePartsId, a.bodyPartsId, a.skinPartsId, ...a.accessoriesPartsIds,
    ...(player.avatarParts || [])].filter(Boolean);
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
  // bodyPartsId, skinPartsId, accessoriesPartsIds}. Il ramo 253 di [fn]
  // chiama [fn] con 1 (legge solo systemLogin.newcomerKhux, bool, e lo copia
  // nel flag "nuovo giocatore" della sessione, +0x88) e [fn]
  // (gameLogin.acquirableLoginBonus, bool): entrambi obbligatori.
  if (req) {
    player.name = req.name ?? player.name;
    player.unionId = req.unionId ?? player.unionId;
    player.birthday = req.birthday ?? player.birthday;
    player.avatar = req.updateAvatarData ?? player.avatar;
    player.gender = player.avatar?.gender ?? player.gender;
  }
  player.created = true;
  grantMissingKeyblades(); // I-087: keyblade senza premio nel master
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
// [fn]), cerca in userTreasures l'elemento con lo stesso uniqueTreasureId e
// legge la riga di `reward` indicata dalla mappa (stage/mappoi_stg<id>_NN.bin
// dell'addnl); dei suoi premi tiene quelli il cui tipo compare, nella stessa
// posizione, in dropItemTypeIds. Tipi ([fn]): 4 monete, 8 CP (Attack Prize,
// barra degli speciali), 9 HP. Prologue (1010): forziere arancione id 18, reward 81
// (record 948,1778,81,14,18 della sezione +0x28 di mappoi_stg01010_01.bin, letto da
// [fn]: x, y, reward, tipo, id).
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

// Drop dei nemici: userEnemyDropItems[] ([fn]: uniqueEnemyId, dropItemTypeIds
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

// userData.userPoint, letto da [fn] sia in GET /user sia in POST /stage/start.
// Il livello del giocatore e' il rango Lux: la barra dei risultati ([fn] ->
// [fn]) usa userDetail.luxRank come livello e userPoint.lux come valore,
// contro le soglie cumulative needExp della tabella player (righe lv e lv+1). Con
// luxRank 0 la soglia del livello 1 e' 0: «LEVEL UP!» e barra piena a ogni stage.
function sphereBonus() {
  return player.sphereBonus || { hp: 0, ap: 0, cost: 0 };
}

function luxRankFor(lux) {
  const rows = masterRows('player').filter((r) => r.lv >= 1 && r.needExp <= lux);
  return Math.max(1, ...rows.map((r) => r.lv));
}

// AP. Il client ([fn], AP mostrato; [fn], secondi al pieno) ricalcola
// da solo la ricarica: se ap < maxAp e lastApDatetime e' passato, AP = ap + (secondi
// trascorsi) / (misc 101 x 60), fino a maxAp; con ap >= maxAp mostra ap e non ricarica
// (l'AP oltre il massimo viene dal level up o dal recupero con jewel). Il server tiene
// ap e l'istante reale da cui conta la ricarica (player.ap, player.apTime) e fa lo
// stesso conto. maxAp = colonna ap della tabella player al rango Lux (16 al livello 1,
// 160 dal 200) + i nodi AP degli Avatar Boards.
function miscValue(id, def) {
  return masterRows('misc').find((r) => r.miscId === id)?.value ?? def;
}

function apRecoverMs() {
  return (miscValue(101, 3) || 3) * 60 * 1000; // misc 101 = 3: 1 AP ogni 3 minuti
}

function maxAp() {
  return (masterRows('player').find((r) => r.lv === luxRankFor(player.lux))?.ap ?? 16) + sphereBonus().ap;
}

// AP attuale e istante (ms reali) da cui conta il prossimo punto
function apState(nowMs = Date.now()) {
  const max = maxAp();
  if (typeof player.ap !== 'number') return { ap: max, time: nowMs };
  let ap = player.ap, time = Number(player.apTime) || nowMs;
  if (ap < max && time <= nowMs) {
    const n = Math.floor((nowMs - time) / apRecoverMs());
    if (ap + n >= max) { ap = max; time = nowMs; } else { ap += n; time += n * apRecoverMs(); }
  } else if (ap >= max) time = nowMs;
  return { ap, time };
}

// Cambia l'AP di delta (negativo = spesa). Se prima era pieno la ricarica parte da
// adesso, altrimenti conserva il punto parziale gia' maturato.
function changeAp(delta, nowMs = Date.now()) {
  const st = apState(nowMs);
  player.ap = Math.max(0, st.ap + delta);
  player.apTime = st.ap >= maxAp() ? nowMs : st.time;
  return player.ap;
}

// Posti medaglia (userDetail.maxMedal). Base: KHUX_MAX_MEDAL o 300 (segnaposto), sempre sopra le
// medaglie possedute; player.medalMaxExtra = posti comprati con Increase Storage (I-100).
const MEDAL_MAX_LIMIT = 3000;        // «(Max: 3000 slots)» del popup
const MEDAL_MAX_STEP = 5, MEDAL_MAX_COST = 100;   // «Spend 100 Jewels ... by 5 slots?»
function maxMedal() {
  const base = Math.max(Number(process.env.KHUX_MAX_MEDAL || 300), player.medals.length + 50);
  return Math.min(MEDAL_MAX_LIMIT, base + (player.medalMaxExtra || 0));
}

// POST /shop/medal/max (azione 71, Shop > Increase Storage), corpo {count} = scatti del cursore
// del popup PopupNormal_MedalPossessed1. Ramo 0x7c3a68 di [fn]: solo [fn]
// (userData.userDetail, obbligatorio: senza, «200 ERROR :71»); i jewel il client li rilegge con
// GET /user/stone. Ogni scatto: +5 posti, -100 jewel.
function respondMedalMax(res, body) {
  const now = serverTime();
  const room = Math.floor((MEDAL_MAX_LIMIT - maxMedal()) / MEDAL_MAX_STEP);
  const n = Math.min(Math.max(1, Number(body?.count) || 1), room);
  const cost = n * MEDAL_MAX_COST;
  if (n > 0 && (player.freeStone || 0) >= cost) {
    player.freeStone -= cost;
    player.medalMaxExtra = (player.medalMaxExtra || 0) + n * MEDAL_MAX_STEP;
    savePlayer();
    console.log(`  [increase storage] +${n * MEDAL_MAX_STEP} posti (${maxMedal()}), -${cost} jewel`);
  } else console.log(`  [increase storage] rifiutato: count ${body?.count}, jewel ${player.freeStone || 0}, posti ${maxMedal()}`);
  send(res, 200, { ret: ret(), userData: { userPoint: userPointData(now), userDetail: userDetailData() } });
}

// POST /union/change (azione 74, Other > Transfer Unions > OK > scelta della Union > OK), corpo
// {unionId} 1-5. Stesso ramo della 71 (0x7c3a68): solo userData.userDetail, i jewel il client li
// rilegge. «It will cost 100 Jewels»; i lux settimanali/mensili non li teniamo (niente da azzerare).
const UNION_CHANGE_COST = 100;
function respondUnionChange(res, body) {
  const now = serverTime();
  const id = Number(body?.unionId);
  if (id >= 1 && id <= 5 && id !== player.unionId && (player.freeStone || 0) >= UNION_CHANGE_COST) {
    console.log(`  [union] ${player.unionId} -> ${id}, -${UNION_CHANGE_COST} jewel`);
    player.unionId = id;
    player.freeStone -= UNION_CHANGE_COST;
    savePlayer();
  } else console.log(`  [union] rifiutato: unionId ${body?.unionId}, attuale ${player.unionId}, jewel ${player.freeStone || 0}`);
  send(res, 200, { ret: ret(), userData: { userPoint: userPointData(now), userDetail: userDetailData() } });
}

// Elemento giocatore [fn] (supportUsers di /stage/support/list, partyLeader e partyUserList del
// party): il giocatore stesso con una medaglia (userMedal [fn], userSkills[], userAvatar).
function selfPlayerElement(now, medal, partyId = 0) {
  return {
    supportUserId: 1, level: luxRankFor(player.lux), unionId: player.unionId, userName: player.name,
    ...playerTitleIds(), addKizunaPoint: 0,
    keybladeId: favoriteKeyblade().keybladeId, partyId, isParty: partyId ? 1 : 0, isGuilt: 0, isLinkThumbnail: 0,
    userMedal: medal, userSkills: userSkillsData(now).filter((s) => s.userMedalId === medal.userMedalId),
    userAvatar: userAvatarData(),
    lastActionDatetime: now, earnLuxRank: 0,
  };
}

function userPointData(now) {
  const ap = apState();
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
    // + i bonus dei nodi degli Avatar Boards (player.sphereBonus)
    baseHp: levelHp(1) + sphereBonus().hp, hp: levelHp(1) + sphereBonus().hp, ap: ap.ap,
    maxHp: levelHp(1) + sphereBonus().hp, maxAp: maxAp(),
    lastApDatetime: serverTimeAt(ap.time), // da qui il client conta la ricarica
    stageSpherePoint: 0, raidSpherePoint: 0, colosseumSpherePoint: 0,
    // da qui in poi uint
    specialPoint: 0, stageSkipTicket: player.stageSkipTicket || 0, superSkipTicket: 0, vipPoint: 0,
    // livello del Burst (pulsante rosso in battaglia, una volta per missione; [fn] non
    // lo crea a 0): +1 alla prima guilt di ogni medaglia, +5 alla prima guilt massima
    guiltBurstLv: guiltBurst().level(), multiPoint: 0, missionPoint: 0, limitedVipPoint: 0,
    drawTicket1: 0, drawTicket2: 0, drawTicket3: 0,
    limitedDrawTicket1: 0, limitedDrawTicket2: 0, limitedDrawTicket3: 0,
  };
}

function respondStageStart(res, req) {
  // POST /stage/start (azione 113). Corpo: stageId, supportUserId, userKeybladeId
  // (+ stageSkip, eventId, isSteal). Il ramo 113 di [fn] chiama, tutti
  // obbligatori: [fn] (userData.userPoint), [fn] (userRandomEnemies[],
  // userEnemyDropItems[], userTreasures[], startStageData, campaigns[],
  // luxMagnifications) e [fn]("supportUsers"). Elementi: [fn]
  // (nemico: uniqueEnemyId, dropItemTypeIds int[] <= 4, stealType), [fn]
  // (tesoro), [fn] (startStageData: stageId, supportUserId uint64,
  // userKeybladeId uint64, clearMissionIds int[] <= 3, stageSkip, eventId,
  // highScore uint64).
  const now = serverTime();
  // /stage/clear non riporta lo stage: vale quello avviato qui
  player.currentStageId = req?.stageId ?? START_STAGE_ID;
  player.currentUserKeybladeId = Number(req?.userKeybladeId) || USER_KEYBLADE_ID; // gauge: setKeybladeBurst
  // costo in AP: campo useAp della tabella stage (Quest 130 = 10). Il client controlla
  // prima l'AP (popup PopupNormal_AP_Recovery se non basta); /stage/retire non rimborsa
  const useAp = Number(masterRows('stage').find((r) => r.stageId === Number(player.currentStageId))?.useAp) || 0;
  if (useAp) {
    const before = apState().ap;
    if (before < useAp) console.log(`[ap] stage ${player.currentStageId}: costo ${useAp} AP, disponibili ${before}`);
    console.log(`[ap] stage ${player.currentStageId}: -${useAp} AP -> ${changeAp(-useAp)}/${maxAp()}`);
  }
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
    // deck senza gli slot vuoti per la battaglia (vedi sentKeybladeDeck); da verificare che il
    // ramo 113 li rilegga (I-075)
    userDecks: userDecksData(true),
  });
}

// Messaggio del Profilo di chi non ne ha scritto uno (ISSUES I-071). Il fumetto bianco
// sopra l'avatar della home e' MyPage_MpBaloon.json (nodi «avatarFukidashi_%d», creati in
// [fn]): l'azione casuale dell'avatar ([fn], 10% dei casi) ne scrive
// Txt_Comment_Label con userData.user.comment (record utente della sessione, +0x3c, 256
// byte), senza controllare che sia vuoto: con comment "" il fumetto compare vuoto. Negli
// originali li' c'era il messaggio del Profilo (reference\profile: «For hearth and
// home!»; reference\home: «R.I.P. $5 VIP deal..»). Il campo Message accetta 20 caratteri;
// il testo d'esempio del layout originale e' «はじめまして！初心者なのでお手柔らかに！».
const DEFAULT_COMMENT = process.env.KHUX_DEFAULT_COMMENT ?? 'Nice to meet you!';

// userData.user ([fn]): GET /user, /user/profile, POST /user/update
function userObject(now) {
  return {
    userId: 1, // uint64
    nativeUserId: 1, // uint64
    platformId: 0,
    userName: player.name, // max 32 byte
    gender: player.gender,
    // max 256 byte: messaggio del Profilo e fumetto della home; vuoto = DEFAULT_COMMENT
    comment: player.comment || DEFAULT_COMMENT,
    deviceType: 2,
    continueLoginCount: 1,
    isFleeze: 0,
    fleezedDatetime: now,
    isAdult: 1,
    nativeTagName: '', // max 14 byte; letto solo da GET /user (modo 1)
  };
}

function respondUser(res) {
  const now = serverTime();
  const userData = {
    user: userObject(now),
    userPoint: userPointData(now),
    userDetail: userDetailData(),
    stageResumption: stageResumptionData(),
    medalResumption: { userShuffleSkills: [], resumptionStatus: 0 },
  };
  send(res, 200, { ret: ret(), userData, userPopUp: { isPopBenefitStone: 0 } });
}

// GET /mypage (azione 59, ramo 0x7c4eb8 di [fn] -> parser [fn]), tutto
// obbligatorio e in quest'ordine: adminMypageTexts[] ([fn]: type int, priority int,
// text stringa), openBanners[] ([fn]: type, id, limitDate), userPresentCount int,
// isChangeCoordinate int, rankingRewards ([fn], 7 int), backgroundId uint (riga di
// mypageBackground, senza crash in [fn]; 150911 = sfondo predefinito),
// isNewAlbumChallenge uint, isMissionReward bool. Prima la dava lo schema generico
// (schemaResponse): stessi campi e valori, ora con una rotta propria.
// adminMypageTexts sono i testi dell'amministrazione: forse la striscia scorrevole sotto la
// barra in alto (negli originali «Tap the face icon to customize your avatar. Tap the
// screen to view party members' progress.», testo che non sta in text/ui), ma chi li legge
// non e' ancora trovato, ne' il significato di type/priority: solo con KHUX_MYPAGE_TICKER=1.
const MYPAGE_TICKER = "Tap the face icon to customize your avatar. Tap the screen to view party members' progress.";
function respondMyPage(res) {
  const body = schemaResponse('/mypage') || { ret: ret() };
  Object.assign(body, {
    adminMypageTexts: process.env.KHUX_MYPAGE_TICKER === '1'
      ? [{ type: Number(process.env.KHUX_MYPAGE_TICKER_TYPE || 1), priority: 1, text: MYPAGE_TICKER }] : [],
    openBanners: [],
    userPresentCount: livePresents().length, // badge «!» del pulsante Presents
    isChangeCoordinate: 0,
    backgroundId: body.backgroundId || 150911,
    isNewAlbumChallenge: 0,
    isMissionReward: false,
  });
  send(res, 200, body);
}

// GET /user/profile (azione 5, AvatarInfoDialog::open [fn]; corpo userId e
// platformType). Parser [fn], tutto obbligatorio: userData.user/userDetail/
// userPoint ([fn]/0078babc/0078b230, come GET /user) e
// userData.lastActionDatetime; userMedals ([fn]), userSkills ([fn]),
// userAvatar ([fn]); userKeyblade (oggetto, [fn]), userRecord
// ([fn]: 55 contatori uint64), userRanking ([fn]), party ([fn]),
// linkPlatformId, isLinkThumbnail, userColosseumRanking ([fn]), petBaseSlotMedal,
// userPvpRanking ([fn]), followerNum, isFollow. Solo il profilo del giocatore.
const USER_RECORD_KEYS = ['login', 'continueLogin', 'getMoney', 'getSpherePoint', 'useMoney', 'sellMedal',
  'sellMedalCount', 'sellMaterial', 'sellMaterialCount', 'getKizunaPoint', 'useKizunaPoint', 'zukanMedal',
  'yamiSpeedZukan', 'yamiPowerZukan', 'yamiMagicZukan', 'hikariSpeedZukan', 'hikariPowerZukan',
  'hikariMagicZukan', 'getMedal', 'medalEnhanceSuccess', 'medalEnhanceBigSuccess', 'medalEnhanceGreatSuccess',
  'medalEvolveSuccess', 'keybladeEnhance', 'useMaterial', 'kizunaDraw', 'raiseDraw', 'getStar1Medal',
  'getStar2Medal', 'getStar3Medal', 'getStar4Medal', 'getStar5Medal', 'getStar6Medal', 'getStar7Medal',
  'stageClear', 'challengeClear', 'dropEnemy', 'dropMimic', 'dropRareEnemy', 'bossBattleJoinMe',
  'bossBattleJoinOther', 'dropBoss', 'getLux', 'getLuxMax', 'dropParts', 'maxDamageOneTurn', 'openTreasure',
  'getMaterial', 'openAllSphere', 'openGrid', 'unionPersonalRankingHighest', 'unionPartyRankingHighest',
  'totalPersonalRankingHighest', 'colosseumRankingHighest', 'pvpRankingRankHighest', 'pvpRankingClassHighest'];

// POST /user/update (azione 38, Name/Message del Profilo): {name, comment}; il ramo del
// dispatcher rilegge userData.user ([fn])
function respondUserUpdate(res, body) {
  if (typeof body?.name === 'string' && body.name) player.name = body.name;
  if (typeof body?.comment === 'string') player.comment = body.comment;
  savePlayer();
  send(res, 200, { ret: ret(), userData: { user: userObject(serverTime()) } });
}

// POST /user/playstyle/update (azione 40) e /user/title/update (azione 41): il ramo rilegge
// userData.userDetail ([fn]). I campi del corpo che userDetail conosce si salvano
// nel giocatore (playTimezones, playFrequently, titleLeftId/RightId/PlateId).
const USER_DETAIL_EDITABLE = ['playTimezones', 'playFrequently', 'titleLeftId', 'titleRightId', 'titlePlateId'];
function respondUserDetailUpdate(res, apiPath, body) {
  for (const k of USER_DETAIL_EDITABLE) if (body && k in body) player[k] = body[k];
  console.log(`[profilo] ${apiPath}: ${JSON.stringify(body)}`);
  savePlayer();
  send(res, 200, { ret: ret(), userData: { userDetail: userDetailData() } });
}

function respondUserProfile(res) {
  const now = serverTime();
  const userRecord = Object.fromEntries(USER_RECORD_KEYS.map((k) => [k, 0]));
  userRecord.login = 1;
  userRecord.getLux = player.lux || 0;
  send(res, 200, {
    ret: ret(),
    userData: {
      user: userObject(now),
      userPoint: userPointData(now),
      userDetail: userDetailData(),
      lastActionDatetime: now,
    },
    userMedals: userMedalsData(now),
    userSkills: userSkillsData(now),
    userAvatar: userAvatarData(),
    userKeyblade: userKeybladeData(favoriteKeyblade()), // il preferito
    userRecord,
    userRanking: { lux: 0, rank: 0 },
    party: {
      partyId: 0, unionId: player.unionId || 0, rank: 0, name: '', playStyle: 0, agreeType: 0, message: '',
      memberCount: 0, leaderUserId: 0, adminUserIds: [], leaderAppointDate: now, newcomerDate: now, chatId: 0,
      chatEndpointUrl: '',
    },
    linkPlatformId: '',
    isLinkThumbnail: 0,
    userColosseumRanking: {
      colosseumStageId: 0, colosseumStatus: 0, rank: 0,
      userColosseum: { userRank: 0, userStageCount: 0, userStageTotalCount: 0 },
    },
    // 6° slot del keyblade preferito (server/pet.js; 0 con KHUX_PET spento)
    petBaseSlotMedal: petBaseSlotMedal(player, favoriteKeyblade().userKeybladeId,
      new Set(userMedalList().map((m) => m.userMedalId))),
    userPvpRanking: { rank: 0, class: 0, point: 0 },
    followerNum: 0,
    isFollow: 0,
  });
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
  else if (type === 26) player.stageSkipTicket = (player.stageSkipTicket || 0) + num; // Skip Ticket (setItemImageData 1.0.1)
  // 11 Lux (testo 100200001 in SceneUtil::setItemImageData della 1.0.1, 0x46C71C)
  else if (type === 11) player.lux = (player.lux || 0) + num;
  else if (type === 5 && id) {
    player.materials = player.materials || {};
    player.materials[id] = (player.materials[id] || 0) + num;
  } else if (type === 13 && id) grantKeyblade(id); // keyblade (tabella keyblade)
  else console.log(`  [inventario] tipo ${type} (id ${id}, x${num}) non gestito`);
}

// userMaterials[] ([fn]): userMaterialId uint64, materialId, number
function userMaterialsData() {
  return Object.entries(player.materials || {}).filter(([, n]) => n > 0)
    .map(([id, n]) => ({ userMaterialId: Number(id), materialId: Number(id), number: n }));
}

// Missione di storia (id 1-525) piu' avanzata gia' superata. Il suo numero (stageNumber) va in lastStageId dei
// membri del party: la bolla della home in Quest Progress mostra il valore com'e' («Quest 5020» con lo stageId,
// «Quest 0» con 0; banco 16-10).
function lastStoryStageId() {
  const done = new Set(Object.keys(player.stageScores || {}).map(Number));
  let best = null;
  for (const r of masterRows('stage')) {
    if (done.has(r.stageId) && r.id >= 1 && r.id <= 525 && (!best || r.id > best.id)) best = r;
  }
  return best ? best.stageId : 0;
}

function stageNumber(stageId) {
  if (!stageId) return 0;
  return masterRows('stage').find((r) => r.stageId === stageId)?.id ?? 0;
}

// Titolo del giocatore (tabella title: due parole + targa, il cui label sceglie
// img/userTitle/title_%04d). Con 0 il Profilo va in crash ([fn]). Di default i
// titoli di categoria 1 («Default Title»): «Budding Newbie» sulla targa di Budding.
function playerTitleIds() {
  return { titleLeftId: player.titleLeftId || 1001, titleRightId: player.titleRightId || 1002,
    titlePlateId: player.titlePlateId || 1001 };
}

// userData.userDetail ([fn]), in GET /user e POST /stage/clear.
function userDetailData() {
  return {
    level: luxRankFor(player.lux), exp: 0, luxRank: luxRankFor(player.lux), luxGetRatio: 0,
    // maxDeckCost: con 0 «Begin» apre il popup di costo superato (PopupNormal_Cost_Over,
    // assente dalle risorse): crash. Dal campo cost della tabella player.
    ...playerTitleIds(),
    maxDeckCost: (masterRows('player').find((r) => r.lv === luxRankFor(player.lux))?.cost ?? 10) + sphereBonus().cost,
    playTimezones: player.playTimezones || [], // int[], al massimo 6 (Play Style del Profilo)
    playFrequently: player.playFrequently || 0,
    partyId: 0, // uint64
    // maxMedal: medaglie possedibili. Con 0 (e 3 medaglie) «Begin» apre il popup di
    // limite superato (PopupNormal_MedalOver.json, assente dalle risorse): crash.
    // 300 e' un segnaposto, il valore iniziale vero non e' noto; sempre sopra le medaglie
    // possedute (prova con tutte le medaglie: server/grant-all-medals.js)
    unionId: player.unionId,
    maxMedal: maxMedal(), mvpCount: 0,
    equipCoordinateNo: player.avatar ? AVATAR_COORDINATE : 0, // coordinato indossato (userAvatars)
    // numero della missione (campo id della tabella stage: Prologue = 1), non lo stageId
    // (1010): la schermata Quests ([fn]) lo confronta con misc 106 (130) per
    // sbloccare il quarto pulsante, e da sbloccato cerca un testo che non c'e' (crash).
    lastClearStageId: stageNumber(player.lastClearStageId),
    // isGuilt (+0x44): con 0 niente pulsante del Burst ([fn] -> [fn]), ne'
    // sblocco/rilancio della guilt e Magic Mirror nel Level Up ([fn]): Power Bangle,
    // Quest 34 (isGuiltUnlocked). Il pulsante resta nascosto finche' guiltBurstLv e' 0.
    // isPet (+0x45): 1 = pet sbloccato (6° slot, catena /pet/profile all'avvio): server/pet.js
    isGuilt: isGuiltUnlocked(), isPet: PET_ENABLED ? 1 : 0, pvpClass: 0, pvpMvpCount: 0, // uint
  };
}

// userData.stageResumption ([fn]): 0 = niente da riprendere.
function stageResumptionData() {
  return { resumptionStatus: 0, stageId: 0, raidId: 0, colosseumStageId: 0 };
}

// prezzo del Continue in jewel: misc 113 (100), letto dal popup PopupNormal_Continue
const CONTINUE_STONE = 100;

function respondStageContinue(res, path, body) {
  // POST /stage/continue (azione 115, dopo il KO) e /stage/retire (114): il ramo
  // rilegge userKeyblades ([fn]); retire anche userData.stageResumption.
  // Il Continue costa CONTINUE_STONE jewel (provato l'11 ottobre: prima restavano invariati);
  // il client li rilegge con GET /user/stone subito dopo.
  if (String(path).toLowerCase() === '/stage/continue') {
    player.freeStone = Math.max(0, (player.freeStone || 0) - CONTINUE_STONE);
    savePlayer();
  }
  // Give Up: «the special attack gauge will reset», il corpo porta {burst: 0}
  if (String(path).toLowerCase() === '/stage/retire' && typeof body?.burst === 'number') {
    setKeybladeBurst(body.burst);
    console.log(`[gauge] /stage/retire burst = ${body.burst}: salvata nel keyblade`);
    savePlayer();
  }
  send(res, 200, { ret: ret(), userKeyblades: userKeybladesData(), userData: { stageResumption: stageResumptionData() } });
}

// POST /shop/ap/recover (azione 72, costruttore [fn], corpo vuoto): recupero
// dell'AP con jewel dal popup PopupNormal_AP_Recovery ([fn], che nel testo
// mostra il prezzo: misc 112 = 100). Il ramo rilegge userData.userPoint ([fn])
// e userKeyblades ([fn]); i jewel li rilegge con GET /user/stone. Si aggiunge un
// pieno (maxAp) all'AP attuale, come il level up.
function respondApRecover(res) {
  const cost = miscValue(112, 100);
  if ((player.freeStone || 0) >= cost) {
    player.freeStone -= cost;
    const st = apState();
    player.ap = st.ap + maxAp();
    player.apTime = Date.now();
    // «Fills special attack gauges of all Keyblades.» (testo del popup; dopo: «AP and special
    // attack gauges are fully restored!»): gauge di ogni keyblade al massimo della sua riga
    for (const k of ownedKeyblades()) {
      const full = (masterRows('keyblade').find((r) => r.keybladeId === k.keybladeId)?.maxBurstGauge || 0) * 10000;
      if (k.userKeybladeId === USER_KEYBLADE_ID) player.keybladeBurst = full;
      else {
        const kk = player.keyblades.find((x) => x.userKeybladeId === k.userKeybladeId);
        if (kk) kk.burst = full;
      }
    }
    console.log(`[ap] recupero: -${cost} jewel, AP ${st.ap} -> ${player.ap}/${maxAp()}, gauge dei keyblade al massimo`);
    savePlayer();
  } else console.log(`[ap] recupero: jewel insufficienti (${player.freeStone || 0} < ${cost})`);
  send(res, 200, { ret: ret(), userData: { userPoint: userPointData(serverTime()) }, userKeyblades: userKeybladesData() });
}

function respondStageClear(res, req) {
  // POST /stage/clear (azione 116). Il ramo chiama [fn] (userData.userPoint),
  // [fn] (userData.userDetail), [fn] (stageRewardUserMedalIds[]
  // {rewardkind, userMedalId uint64, display}, poi per uno stage normale
  // highScoreReward[] (clearTimeMissionIds[] / pvpPointReward[] in altri modi),
  // firstClearFlag, stageOpenNum, clearMissionIds[], userPvpRanking {rank, class,
  // point}, status, userMaterials[], getLux uint64), [fn]
  // (userData.stageResumption) e [fn] (guiltBurstFirstUserMedalIds[],
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
  // gauge degli attacchi speciali: resta salvata nel keyblade (userKeyblades[].burst), non
  // riparte da 0 a ogni missione. Campo `burst` del corpo (banco: "burst":24000; prima si
  // prendeva il primo campo con burst nel nome, guiltBurstMaximumDamage = 0, e la gauge si azzerava)
  if (typeof req?.burst === 'number') {
    setKeybladeBurst(req.burst);
    console.log(`[gauge] /stage/clear burst = ${req.burst}: salvata nel keyblade`);
  }
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
  const rankBefore = luxRankFor(player.lux);
  const apBefore = apState().ap; // con la soglia del livello di prima
  player.lux += lux; // userPoint.lux/totalLux e luxRank nella risposta: dopo lo stage
  // level up: si aggiunge un pieno di AP (il nuovo maxAp) a quello che c'era, anche
  // oltre il massimo (il client lo ammette: [fn] non ricarica sopra maxAp)
  if (luxRankFor(player.lux) > rankBefore) {
    player.ap = apBefore + maxAp();
    player.apTime = Date.now();
    console.log(`[ap] level up ${rankBefore} -> ${luxRankFor(player.lux)}: AP ${apBefore} -> ${player.ap}/${maxAp()}`);
  }
  missionCount('quest', 1);
  missionCount('lux', lux);
  weeklyLux(lux);
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
    // stage normale: anche [fn] (pet.userPetParts[]) e [fn]
    // (emblemIds[]), entrambi obbligatori (senza: «200 ERROR :116»)
    pet: { userPetParts: [] },
    emblemIds: [],
    // poi, tutti obbligatori e in quest'ordine, l'inventario aggiornato:
    // userMaterials ([fn]), userMedals ([fn]), userSkills
    // ([fn]), userTitles ([fn]), userKeyblades ([fn]),
    // userDecks ([fn]), userAvatarParts ([fn]), subslot
    // ([fn] modo 1), infine getLux
    userMedals: userMedalsData(now),
    userSkills: userSkillsData(now),
    userTitles: [],
    userKeyblades: userKeybladesData(),
    userDecks: userDecksData(),
    userAvatarParts: [],
    subslotMaxNum: kbEvo().subslotMaxNum(),
    userKeybladeSubslots: userKeybladeSubslotsData(),
    ...guiltBurst().lists(), // guiltBurstFirst/MaxUserMedalIds
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

// Righe di un master in cache, rilette solo se il file cambia (mtime/dimensione). Prima ogni
// chiamata rileggeva e decodificava il file: medal.json (migliaia di righe) veniva riletto
// decine di volte per una sola vendita di medaglie. Si restituisce una copia dell'array
// (un sort/push del chiamante non tocca la cache); le righe sono condivise: solo lettura.
const masterCache = new Map();
function masterRows(name) {
  const file = path.join(MASTER_DIR, name + '.json');
  try {
    const st = fs.statSync(file);
    const c = masterCache.get(name);
    if (c && c.mtimeMs === st.mtimeMs && c.size === st.size) return c.rows.slice();
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    masterCache.set(name, { mtimeMs: st.mtimeMs, size: st.size, rows });
    return rows.slice();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Avatar Boards (le «sphere» del client; master sphere/sphereArray/sphereMasu in server/tables,
// protocollo in stage_gen/boards/SERVER.md). player.sphere[sphereBoardId] = {id, unlock[],
// getDatetime}: le bacheche si aprono col livello (openParam <= rango Lux); unlock = numeri
// dei nodi 1..23 (indice negli array di sphereMasu, valore della cella in spCol0..4).
// ---------------------------------------------------------------------------
function sphereNodes(board) {
  const arr = masterRows('sphereArray').find((r) => r.arryId === board.arryId);
  const nodes = new Set();
  for (const k of ['spCol0', 'spCol1', 'spCol2', 'spCol3', 'spCol4']) {
    for (const v of arr?.[k] || []) if (v >= 1 && v <= 23) nodes.add(v);
  }
  return [...nodes].sort((a, b) => a - b);
}

function sphereBoards() {
  player.sphere = player.sphere || {};
  const level = luxRankFor(player.lux);
  for (const b of masterRows('sphere')) {
    if (b.price || b.openParam > level || player.sphere[b.sphereBoardId]) continue;
    const id = Math.max(0, ...Object.values(player.sphere).map((s) => s.id)) + 1;
    player.sphere[b.sphereBoardId] = { id, unlock: [], getDatetime: serverTime() };
  }
  return player.sphere;
}

function userSphereData(sphereBoardId) {
  const s = sphereBoards()[sphereBoardId];
  const board = masterRows('sphere').find((r) => r.sphereBoardId === Number(sphereBoardId));
  const done = board && sphereNodes(board).every((n) => s.unlock.includes(n));
  return { userSphereBoardId: s.id, sphereBoardId: Number(sphereBoardId), isBuy: 1, status: done ? 3 : 1,
    unlockMasuIds: s.unlock.slice(0, 23), getDatetime: s.getDatetime };
}

function userSphereAll() {
  return { userSphereDatas: Object.keys(sphereBoards()).map(userSphereData), notChargedSphereBoardIds: [] };
}

// POST /user/sphere/check (azioni 60/61): ogni voce di userSphereDatas e' per il client una
// bacheca appena sbloccata e finisce nell'elenco ([fn]()+0x6a8) da cui la home, i
// risultati e l'elenco delle bacheche aprono il popup BattleResult_LB_ver120 ([fn]),
// una volta per voce. Si mandano solo le bacheche non ancora annunciate (player.sphereNotified);
// l'array vuoto svuota l'elenco, la chiave mancante lo lascerebbe com'e'. L'elenco completo
// arriva da GET /user/sphere. Salvataggi di prima: le bacheche gia' possedute contano come annunciate.
function respondSphereCheck(res) {
  const owned = Object.keys(sphereBoards());
  if (!player.sphereNotified) player.sphereNotified = owned.map(Number);
  const fresh = owned.filter((id) => !player.sphereNotified.includes(Number(id)));
  player.sphereNotified.push(...fresh.map(Number));
  savePlayer();
  const userSphere = { userSphereDatas: fresh.map(userSphereData), notChargedSphereBoardIds: [] };
  send(res, 200, { ret: ret(), userSphere, closeEventSphereBoardIds: [] });
}

// premio di un nodo (rewardSelect di sphereMasu): 12 HP, 21 AP, 22 costo del deck (bonus sommati
// in userPointData/userDetailData), 3 medaglia, 19/20/23 parti dell'avatar
function grantSphereReward(masu, i) {
  const sel = masu.rewardSelect[i], id = masu.rewardId[i], val = masu.rewardValue[i] || 1;
  const bonus = player.sphereBonus = player.sphereBonus || { hp: 0, ap: 0, cost: 0 };
  if (sel === 12) bonus.hp += val;
  else if (sel === 21) bonus.ap += val;
  else if (sel === 22) bonus.cost += val;
  else if (sel === 3) grantItem(3, id, 1);
  else if (sel === 19 || sel === 20 || sel === 23) player.avatarParts = [...new Set([...(player.avatarParts || []), id])];
  else if (sel === 2) grantItem(2, 0, val);
  else console.log(`  [sphere] premio rewardSelect ${sel} (id ${id}) non gestito`);
}

// POST /user/sphere/update (azione 44): {sphereBoardId, releaseMasuId} o {releaseMasuId 0, allOpen 1}.
// Si scalano gli Avatar Coin, si danno i premi e, a bacheca completa, il titolo 2000+N
function respondSphereUpdate(res, req) {
  const now = serverTime();
  const snap = inventorySnapshot(now); // solo le voci toccate dai premi (vedi inventoryBlocks)
  const boardId = Number(req?.sphereBoardId);
  const board = masterRows('sphere').find((r) => r.sphereBoardId === boardId);
  const s = sphereBoards()[boardId];
  if (board && s) {
    const masu = masterRows('sphereMasu').find((r) => r.masuId === board.masuId);
    const todo = req?.allOpen ? sphereNodes(board).filter((n) => !s.unlock.includes(n))
      : [Number(req?.releaseMasuId)].filter((n) => n >= 1 && n <= 23 && !s.unlock.includes(n));
    const cost = todo.reduce((t, n) => t + (masu?.spherePoint[n - 1] || 0), 0);
    if (masu && todo.length && cost <= (player.spherePoint || 0)) {
      player.spherePoint -= cost;
      for (const n of todo) { s.unlock.push(n); grantSphereReward(masu, n - 1); }
      if (sphereNodes(board).every((n) => s.unlock.includes(n))) {
        const title = 2000 + (boardId - 2100000);
        if (masterRows('title').some((t) => t.titleId === title)) player.titles = [...new Set([...(player.titles || []), title])];
      }
      console.log(`[sphere] bacheca ${boardId}: nodi ${todo.join(',')} (-${cost} Avatar Coin)`);
    } else console.log(`[sphere] sblocco rifiutato: bacheca ${boardId}, nodi ${todo.join(',') || '-'}, costo ${cost}`);
  }
  savePlayer();
  send(res, 200, {
    ret: ret(),
    userData: { userPoint: userPointData(now), userDetail: userDetailData() },
    userSphere: { userSphereDatas: s ? [userSphereData(boardId)] : [], notChargedSphereBoardIds: [] },
    ...inventoryBlocks(now, snap),
  });
}

// Liste dell'inventario delle risposte 44/49/190 (rami 0x7c33bc e 0x7cad14 di [fn]).
// Ogni chiave e' OBBLIGATORIA: parser nullo (chiave assente o non array, [fn]) = errore
// del dispatcher (cbz -> w19 = 0). Ma l'array vuoto e' valido e il client NON sostituisce le
// liste: userMaterials/userMedals/userSkills passano voce per voce per un upsert per id
// ([fn] materiali, number 0 = tolto; [fn] medaglie; [fn] skill) che
// ricopia tutto l'elenco e ne ricostruisce l'indice a ogni voce: con ~2000 medaglie O(n^2),
// ~6,5 s di attesa dopo ogni sblocco di nodo (banco 14 ottobre, come I-083 per il Level Up).
// Con snap (inventorySnapshot preso prima dei premi) si mandano solo le voci nuove o cambiate;
// se una voce e' sparita (l'upsert non sa togliere medaglie/skill) si rimanda la lista intera.
// KHUX_FULL_INVENTORY=1 torna alle liste complete. Le altre liste restano complete (piccole;
// keyblade/deck/parti/titoli non verificati, sub-slot e Burst li sostituisce: +0x890, +0x930).
const INVENTORY_DELTA = { userMaterials: 'userMaterialId', userMedals: 'userMedalId', userSkills: 'userSkillId' };
const FULL_INVENTORY = process.env.KHUX_FULL_INVENTORY === '1';

function inventoryDeltaLists(now) {
  return { userMaterials: userMaterialsData(), userMedals: userMedalsData(now), userSkills: userSkillsData(now) };
}

function inventorySnapshot(now) {
  if (FULL_INVENTORY) return null;
  const lists = inventoryDeltaLists(now), snap = {};
  for (const [k, id] of Object.entries(INVENTORY_DELTA)) snap[k] = new Map(lists[k].map((e) => [e[id], JSON.stringify(e)]));
  return snap;
}

function inventoryBlocks(now, snap = null) {
  const lists = inventoryDeltaLists(now);
  if (snap) {
    for (const [k, id] of Object.entries(INVENTORY_DELTA)) {
      const cur = new Set(lists[k].map((e) => e[id]));
      if ([...snap[k].keys()].some((x) => !cur.has(x))) continue; // voce sparita: lista intera
      lists[k] = lists[k].filter((e) => snap[k].get(e[id]) !== JSON.stringify(e));
    }
  }
  return {
    ...lists, // userMaterials, userMedals, userSkills
    userKeyblades: userKeybladesData(),
    userDecks: userDecksData(),
    userAvatarParts: userAvatarPartsData(),
    userTitles: userTitlesData(),
    pet: { userPetParts: [] },
    emblemIds: [],
    subslotMaxNum: kbEvo().subslotMaxNum(),
    userKeybladeSubslots: userKeybladeSubslotsData(),
    ...guiltBurst().lists(), // guiltBurstFirst/MaxUserMedalIds
  };
}

// userTitles[] {userTitleId uint64, titleId}: categoria 1 («Default Title») e titoli guadagnati
function userTitlesData() {
  const ids = [...new Set([...masterRows('title').filter((r) => r.category === 1).map((r) => r.titleId),
    ...(player.titles || [])])];
  return ids.map((titleId, i) => ({ userTitleId: i + 1, titleId }));
}

// ---------------------------------------------------------------------------
// Missioni (master `mission`, server/tables/mission.json; formato in stage_gen/missions/NOTE.md
// e docs/notes/home_profilo.md#missioni). La scheda la decide SOLO il client, dal campo
// missionType della riga del master ([fn]: id della risposta -> riga -> +4):
// 1 Beginner, 2 Daily, 3 Weekly (party), 4 Limited; il server manda tutte le righe attive
// in un unico missions[]. Il periodo: giornaliere da startDate + k giorni (l'ora di
// startDate e' anche quella del conto alla rovescia del client, [fn]),
// settimanali da startDate + k settimane, Beginner e Limited senza azzeramento (valgono
// fino a beginnerLimitTime / endDate). conditionId: 1 quest completate, 3/6 Raid Boss,
// 4/9 Lux, 12 Union Cross, 28 PVP (6, 9 e 12 sono del party: senza party si contano quelli
// del giocatore).
// ---------------------------------------------------------------------------
const MISSION_COUNTER = { 1: 'quest', 3: 'raid', 6: 'raid', 4: 'lux', 9: 'lux', 12: 'union', 28: 'pvp' };
const MISSION_SPAN = { 2: 86400000, 3: 7 * 86400000 }; // 1 e 4: nessun azzeramento
// Condizioni delle Beginner (make-beginner-missions.js) calcolate dallo stato del giocatore a ogni elenco,
// non da un contatore: 30 storia superata fino alla quest targetId, 31 STR del keyblade preferito,
// 32 livello +N della serie di keyblade targetId (category), 33 Lux totali, 34 medaglie con lo Special
// Attack Bonus al massimo del tier. 35-44 non hanno ancora una funzione: restano a 0.
const MISSION_DERIVED = {
  30: (r) => (stageNumber(player.lastClearStageId) >= (r.targetId?.[0] || 0) ? 1 : 0),
  31: () => keybladeDeckStats(favoriteKeybladeId()).attack || 0,
  32: (r) => {
    const rows = masterRows('keyblade');
    const lv = ownedKeyblades().map((k) => rows.find((x) => x.keybladeId === k.keybladeId))
      .filter((x) => x && x.category === r.targetId?.[0]).map((x) => x.lv || 0);
    return lv.length ? Math.max(...lv) : 0;
  },
  33: () => player.lux || 0,
  34: () => {
    const medals = new Map(masterRows('medal').map((m) => [m.medalId, m]));
    const prob = masterRows('guiltProb');
    return userMedalList().filter((u) => {
      const tier = medals.get(u.medalId)?.guiltValue || 0;
      const max = tier ? medalGuilt.guiltRange(prob, tier).max : 0;
      return max > 0 && (u.guiltFactor || 0) >= max;
    }).length;
  },
};
const missionProgress = (row, s) => (MISSION_DERIVED[row.conditionId] ? MISSION_DERIVED[row.conditionId](row) : s.count);
// Durata della scheda Beginner dal primo elenco (ipotesi: il valore originale non e' noto)
const BEGINNER_DAYS = Number(process.env.KHUX_BEGINNER_DAYS || 30);

const masterDateMs = (d) => Date.parse(String(d).replace(' ', 'T') + 'Z');

function missionPeriod(row, nowMs) {
  const span = MISSION_SPAN[row.missionType];
  return span ? Math.floor((nowMs - masterDateMs(row.startDate)) / span) : 0;
}

// Righe che il client puo' mostrare: scheda 1-4 (le altre le ignora), gia' iniziate, non
// scadute; le Beginner solo fino a beginnerLimitTime.
function missionActive(row, nowMs) {
  if (!(row.missionType >= 1 && row.missionType <= 4)) return false;
  if (nowMs < masterDateMs(row.startDate) || nowMs >= masterDateMs(row.endDate)) return false;
  if (row.missionType === 1) return nowMs < masterDateMs(beginnerLimitTime());
  return true;
}

// beginnerLimitTime di /user/mission/list e /receive: null senza righe Beginner (il client lo
// usa solo per l'etichetta del tempo delle missionType 1); altrimenti la scadenza della
// scheda, BEGINNER_DAYS dal primo elenco (player.beginnerSince)
function beginnerLimitTime() {
  if (!masterRows('mission').some((r) => r.missionType === 1)) return null;
  if (!player.beginnerSince) player.beginnerSince = serverTime();
  return new Date(masterDateMs(player.beginnerSince) + BEGINNER_DAYS * 86400000)
    .toISOString().slice(0, 19).replace('T', ' ');
}

// contatori del periodo corrente di ogni missione: player.missions[id] = {period, count, received}
function missionState(row, nowMs) {
  player.missions = player.missions || {};
  const period = missionPeriod(row, nowMs);
  let s = player.missions[row.id];
  if (!s || s.period !== period) s = player.missions[row.id] = { period, count: 0, received: false };
  return s;
}

// Lux della settimana (bolla della home «Weekly Lux» dei membri del party, userRanking.lux): stessa settimana
// delle missioni settimanali (missionType 3), player.weeklyLux = {period, lux}. weeklyLux(n) aggiunge, weeklyLux() legge.
function weeklyLux(n = 0) {
  const nowMs = Date.parse(serverTime().replace(' ', 'T') + 'Z');
  const row = masterRows('mission').find((r) => r.missionType === 3);
  const base = row ? masterDateMs(row.startDate) : Date.UTC(2021, 0, 4);
  const period = Math.floor((nowMs - base) / (7 * 86400000));
  if (!player.weeklyLux || player.weeklyLux.period !== period) player.weeklyLux = { period, lux: 0 };
  player.weeklyLux.lux += n;
  return player.weeklyLux.lux;
}

function missionCount(counter, n) {
  if (!n) return;
  const nowMs = Date.parse(serverTime().replace(' ', 'T') + 'Z');
  for (const row of masterRows('mission')) {
    if (MISSION_COUNTER[row.conditionId] === counter && missionActive(row, nowMs)) missionState(row, nowMs).count += n;
  }
}

// missions[] di /user/mission/list e /user/mission/receive: solo id del master (altrimenti il
// client va in crash), status 0 in corso, 1 da riscuotere, 2 riscossa
function missionsData() {
  const nowMs = Date.parse(serverTime().replace(' ', 'T') + 'Z');
  return masterRows('mission').filter((r) => missionActive(r, nowMs)).map((r) => {
    const s = missionState(r, nowMs);
    const goal = r.targetNum?.[0] || 1;
    const count = missionProgress(r, s);
    const done = count >= goal;
    return { id: r.id, status: s.received ? 2 : done ? 1 : 0, numUpper: Math.min(count, goal), numLower: goal };
  });
}

// POST /user/mission/receive (azione 190): {receiveMissionIds}; premio rewardType/itemId/itemNum,
// poi la lista aggiornata e l'inventario completo, come /stage/clear
function respondMissionReceive(res, req) {
  const now = serverTime();
  const snap = inventorySnapshot(now); // solo le voci toccate dai premi (vedi inventoryBlocks)
  const nowMs = Date.parse(now.replace(' ', 'T') + 'Z');
  const rows = new Map(masterRows('mission').map((r) => [r.id, r]));
  for (const id of req?.receiveMissionIds || []) {
    const r = rows.get(id);
    if (!r || !missionActive(r, nowMs)) continue;
    const s = missionState(r, nowMs);
    if (s.received || missionProgress(r, s) < (r.targetNum?.[0] || 1)) continue;
    s.received = true;
    grantItem(r.rewardType, r.itemId, r.itemNum);
  }
  savePlayer();
  send(res, 200, {
    ret: ret(),
    userData: { userPoint: userPointData(now), userDetail: userDetailData() },
    missions: missionsData(), beginnerLimitTime: beginnerLimitTime(),
    userSphere: userSphereAll(),
    ...inventoryBlocks(now, snap),
  });
}

// GET /user/mission (azione 187, all'ingresso della home): parser [fn] legge solo
// "id" (day/isFinish solo per l'azione 183 /user/mission/update), salvato nello stato di
// gioco +0x830. Non e' la finestra Missioni: id e' la riga di un'altra tabella master
// ([fn], campi +0x908..+0x914 = stage e intervallo) letta da [fn]; id 0 =
// nessuna, il client prosegue (callback con true).
function respondUserMission(res) {
  send(res, 200, { ret: ret(), id: 0, day: 0, isFinish: false });
}

// Pagina della WebView «Beginner's Guide» (login.beginnersGuide): le missioni Daily/Weekly
// dal master con premi e orari di azzeramento, e le basi della guida dell'utente
// (reference\guida_basi). Stesso stile della pagina /web/passive.
function respondBeginnerPage(res) {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rows = masterRows('mission');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const section = (type, title, reset) => {
    const list = rows.filter((r) => r.missionType === type).sort((a, b) => (a.sortId || 0) - (b.sortId || 0));
    if (!list.length) return '';
    const items = list.map((r) => `<li>${esc(r.missionName)}<span>${r.rewardType === 2 ? 'Jewel' : 'Reward'} x${esc(r.itemNum)}</span></li>`).join('');
    return `<h2>${title}</h2><p>${reset(list[0])}</p><ul>${items}</ul>`;
  };
  const hour = (r) => String(r.startDate).slice(11, 16);
  const html = '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<style>body{margin:0;padding:12px;background:#08304f;color:#fff;font:18px sans-serif}'
    + 'h2{font-size:20px;color:#ffe27a;margin:18px 0 6px}p{margin:4px 0 8px;color:#cfe3f7}'
    + 'ul{list-style:none;margin:0;padding:0}li{padding:8px 4px;border-bottom:1px solid #2f6fa8}'
    + 'li span{float:right;color:#ffe27a}</style></head><body>'
    + '<h2>Missions</h2><p>Tap the scroll under your avatar on the home screen. Clear the goals, '
    + 'then tap Receive (or Collect All) to get the rewards.</p>'
    + section(1, 'Beginner', () => 'Available for a limited time after you start playing.')
    + section(2, 'Daily', (r) => `Reset every day at ${esc(hour(r))} (server time).`)
    + section(3, 'Weekly (party)', (r) => `Reset every ${days[new Date(masterDateMs(r.startDate)).getUTCDay()]} at `
      + `${esc(hour(r))} (server time). Progress is shared with your party: join a party to take them on.`)
    + section(4, 'Limited', () => 'Available until the date shown on each mission.')
    + '<h2>Jewels</h2><p>Jewels come from missions, quests and login bonuses. Use them to draw '
    + 'medals and buy boards.</p></body></html>';
  const buf = Buffer.from(html, 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': buf.length });
  res.end(buf);
}

// ---------------------------------------------------------------------------
// Presents (docs/notes/home_profilo.md#presents). player.presents[] = {userPresentId,
// resourceType, resourceId, number, limitDatetime, comment, created[, test]}; resourceType
// come reward.type di grantItem (1/2 jewel, 3 medaglia, 4 munny, 5 materiale, 11 Lux,
// 13 keyblade, 14 Avatar Coin).
// GET /user/present (azione 20, nessun parametro; ramo 0x7c3848 di [fn] -> parser
// [fn], tutto obbligatorio): userPresent {userPresentDatas[], presentCount,
// presentCountMax, stonePresentCount, stonePresentCountMax} (int). Elemento [fn]:
// userPresentId uint64, resourceType/resourceId/number int, limitDatetime stringa data,
// comment stringa, created stringa data (come UserPresent::Present::init della 1.0.1,
// 0x4A6014). La scena ([fn]) elenca tutte le righe e scrive presentCount/Max
// accanto a «Other» (testo 106250104) e stonePresentCount/Max accanto a «Jewels» (106250103).
// ---------------------------------------------------------------------------
const PRESENT_MAX = 200; // «Presents over the limit of 200 will be deleted» (testo 103500013)

// KHUX_TEST_PRESENTS=1: se nella scatola non resta nessun regalo di prova se ne aggiungono
// alcuni di tipi diversi (per provare le righe e la riscossione sul banco)
// Una sola volta per avvio del server: se ricomparivano subito dopo Collect All, il client
// (che rilegge la scatola dopo la riscossione) scriveva «There are items that cannot be
// collected.» (banco 14-10)
let testPresentsSeeded = false;
function seedTestPresents() {
  if (process.env.KHUX_TEST_PRESENTS !== '1' || testPresentsSeeded) return;
  testPresentsSeeded = true;
  player.presents = player.presents || [];
  if (player.presents.some((p) => p.test)) return;
  const now = serverTime();
  const limit = serverTimeAt(Date.now() + 29 * 86400000);
  const medalId = masterRows('medal').some((m) => m.medalId === 90041) ? 90041 : masterRows('medal')[0]?.medalId;
  const materialId = masterRows('material')[0]?.materialId;
  const rows = [
    [2, 0, 300, 'Daily Login Bonus Reward'],
    [11, 0, 1000, 'Test: Lux'],
    [4, 0, 5000, 'Test: Munny'],
    [14, 0, 6, 'Test: Avatar Coin'],
    ...(medalId ? [[3, medalId, 1, 'Test: Medal']] : []),
    ...(materialId ? [[5, materialId, 3, 'Test: Material']] : []),
  ];
  // id progressivi mai riusati (player.presentLastId)
  let id = Math.max(player.presentLastId || 0, ...player.presents.map((p) => p.userPresentId));
  for (const [resourceType, resourceId, number, comment] of rows) {
    player.presents.push({ userPresentId: ++id, resourceType, resourceId, number, limitDatetime: limit, comment, created: now, test: true });
  }
  player.presentLastId = id;
  console.log(`[presents] ${rows.length} regali di prova aggiunti (KHUX_TEST_PRESENTS=1)`);
  savePlayer();
}

// un regalo nella scatola (id progressivi mai riusati), valido 30 giorni come gli originali
function addPresent(resourceType, resourceId, number, comment) {
  player.presents = player.presents || [];
  const id = Math.max(player.presentLastId || 0, ...player.presents.map((p) => p.userPresentId)) + 1;
  player.presents.push({ userPresentId: id, resourceType, resourceId, number,
    limitDatetime: serverTimeAt(Date.now() + 30 * 86400000), comment, created: serverTime() });
  player.presentLastId = id;
}

// regali ancora validi: quelli scaduti (limitDatetime passato, ora del server) si tolgono
function livePresents() {
  seedTestPresents();
  const now = serverTime();
  const all = player.presents || [];
  const live = all.filter((p) => !p.limitDatetime || p.limitDatetime > now);
  if (live.length !== all.length) { player.presents = live; savePlayer(); }
  return live;
}

const isStonePresent = (p) => p.resourceType === 1 || p.resourceType === 2;

function userPresentData() {
  const list = livePresents();
  const stones = list.filter(isStonePresent).length;
  return {
    // i piu' recenti in alto
    userPresentDatas: list.slice().reverse().map((p) => ({
      userPresentId: p.userPresentId, resourceType: p.resourceType, resourceId: p.resourceId || 0,
      number: p.number, limitDatetime: p.limitDatetime, comment: p.comment || '', created: p.created,
    })),
    presentCount: list.length - stones, presentCountMax: PRESENT_MAX,
    stonePresentCount: stones, stonePresentCountMax: PRESENT_MAX,
  };
}

function respondUserPresent(res) {
  send(res, 200, { ret: ret(), userPresent: userPresentData() });
}

// POST /user/present/receive (azione 49, [fn]): {receivePresentIds: [uint64]}, sia
// Collect sia Collect All. Ramo 0x7cad14 di [fn], tutto obbligatorio: userData
// (userPoint, [fn]), userMaterials, userMedals, userSkills, userKeyblades, userDecks,
// userAvatarParts, userTitles, pet, emblemIds, sub-slot, liste del Burst (come 190), poi
// lastUserPresentIds [uint64]: i regali RIMASTI nella scatola; il client segna come riscossi
// ([fn], byte +0x40 della riga) quelli della sua lista che non ci sono (0x7d0fd0).
// userStone non lo legge (la 1.0.1 si'): lo si manda lo stesso per i jewel.
function respondPresentReceive(res, body) {
  const now = serverTime();
  const snap = inventorySnapshot(now); // solo le voci toccate dai regali (vedi inventoryBlocks)
  const want = new Set((body?.receivePresentIds || []).map(Number));
  const keep = [];
  for (const p of livePresents()) {
    if (!want.has(p.userPresentId)) { keep.push(p); continue; }
    grantItem(p.resourceType === 1 ? 2 : p.resourceType, p.resourceId, p.number);
    console.log(`[presents] riscosso ${p.userPresentId}: tipo ${p.resourceType} id ${p.resourceId} x${p.number}`);
  }
  player.presents = keep;
  savePlayer();
  send(res, 200, {
    ret: ret(),
    userData: { userPoint: userPointData(now) },
    ...inventoryBlocks(now, snap),
    lastUserPresentIds: keep.map((p) => p.userPresentId),
    userStone: { freeStone: player.freeStone || 0, payStone: 0 },
  });
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

// userMedals[], elemento letto da [fn] (userSkills al massimo 2,
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
    // Level Up con medaglie speciali (server/medal-guilt.js), salvati in medalState: STR/DEF di
    // Chip/Dale, pallini dell'attacco speciale, riduzione del costo di Cid
    attackUpperNumber: m.attackUpperNumber || 0, defenseUpperNumber: m.defenseUpperNumber || 0,
    burstUpperNumber: m.burstUpperNumber || 0,
    lock: player.medalLocks?.[m.userMedalId] ? 1 : 0,
    // upperCost (int con segno): variazione del costo, NEGATIVA per Cid. Il client la nega
    // ([fn]: oggetto +0x2c = -upperCost) e usa cost - (+0x2c): costo del deck
    // ([fn]), ordinamento ([fn]), Optimize ([fn]), anteprima ([fn])
    // ed effetto 6 del risultato ([fn]). medalState.upperCost = riduzione (positiva).
    upperCost: -(m.upperCost || 0),
    guiltFactor: m.guiltFactor || 0, // guiltFactor: uint, centesimi di % (10000 = +100%)
    // skill (I-088, server/medal-skill.js): solo l'id, l'oggetto va nella lista userSkills
    userSkills: [medalSkillOf(m)].filter(Boolean).map((s) => s.userSkillId),
    userShuffleSkills: medalTraits(m.userMedalId),
    getDatetime: m.getDatetime || now,
  };
}

// Trait di una medaglia (Moogle Shop): player.medalTraits[userMedalId] = [{userShuffleSkillId,
// shuffleSkillId, type, getDatetime}]. Elemento letto da [fn]: userShuffleSkillId
// (uint64), shuffleSkillId, userMedalId (uint64), getDatetime, type (al massimo 6 per medaglia).
// Skill di una medaglia (server/medal-skill.js): player.medalSkills[userMedalId] = {userSkillId,
// skillId, level, exp, getDatetime} dopo un Overwrite riuscito; senza voce, le Scrooge hanno la
// loro skill calcolata. Tabelle lette una volta per richiesta (userMedalsData chiama medalSkillOf
// per ~2000 medaglie: masterRows a ogni chiamata costava troppo).
let medalSkillMemo = null;
function medalSkillTables() {
  if (!medalSkillMemo) {
    const skills = masterRows('skill');
    medalSkillMemo = { skills, byId: new Map(skills.map((r) => [r.skillId, r])),
      medals: new Map(masterRows('medal').map((r) => [r.medalId, r])) };
    setImmediate(() => { medalSkillMemo = null; });
  }
  return medalSkillMemo;
}
function skillRowsById() {
  return medalSkillTables().byId;
}

function medalSkillOf(m) {
  const t = medalSkillTables();
  const saved = player.medalSkills?.[m.userMedalId];
  if (saved !== undefined) return saved && t.byId.has(saved.skillId) ? saved : null;
  return medalSkill.scroogeSkill(t.medals.get(m.medalId), m.userMedalId, t.skills);
}

// elemento di userSkills ([fn])
function userSkillElement(m, s, now) {
  return { userSkillId: s.userSkillId, skillId: s.skillId, level: s.level, exp: s.exp || 0,
    userMedalId: m.userMedalId, getDatetime: s.getDatetime || m.getDatetime || now };
}

// lista userSkills ([fn]): tutte le skill delle medaglie possedute, perche' il client
// cerca ogni id di userMedal.userSkills in questa tabella (un id mancante = crash)
function userSkillsData(now = serverTime(), medals = userMedalList()) {
  const out = [];
  for (const m of medals) {
    const s = medalSkillOf(m);
    if (s) out.push(userSkillElement(m, s, now));
  }
  return out;
}

function medalTraits(userMedalId) {
  return (player.medalTraits?.[userMedalId] || []).map((t) => ({ ...t, userMedalId }));
}

function userMedalsData(now) {
  return stackedMedalList().map((m) => userMedalElement(m, now));
}

// Level Up ed Evolve: solo le medaglie toccate (il client le fonde nel suo elenco). Con tutte le
// ~2000 il client restava fermo 6 s prima dell'animazione (banco dl5, I-083). Le pile dei
// materiali si rimandano per medalId: consumata la copia in cima, la pila ha un altro userMedalId.
function touchedMedalsData(baseId, comps, now, baseMedalId) {
  const ids = new Set(comps.map((m) => m.medalId));
  if (baseMedalId) ids.add(baseMedalId); // Evolve: la pila in cui e' entrata la medaglia evoluta
  return stackedMedalList().filter((m) => m.userMedalId === baseId || ids.has(m.medalId))
    .map((m) => userMedalElement(m, now));
}

// Curva dell'EXP delle medaglie, come il client ([fn]): per expType t la riga
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

// EXP dato da un materiale ([fn]): materialExp + B*((lv-1)/(N-1))^(P/10000) con
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
// poi [fn] (before/afterEnhanceUserMedal come gli elementi di userMedals,
// enhanceEffect, overwriteSkills, successOverwrite, guiltBurstFirstLv/MaxLv) e pet
// (facoltativo), infine [fn] (medalResumption). Costo come [fn]: medalMisc 115 (80) x livello x materiali.
// Great Success: x1,5 (medalMisc 118, ipotesi: il client manda gia' l'esito).
function respondMedalEnhance(res, body) {
  const rows = new Map(masterRows('medal').map((r) => [r.medalId, r]));
  const list = new Map(userMedalList().map((m) => [m.userMedalId, m]));
  const base = list.get(Number(body?.baseUserMedalId));
  // celle impilate: numbers[i] copie della cella componentUserMedalIds[i] (vuoto = 1)
  const cells = (body?.componentUserMedalIds || []).map(Number);
  // trascinando piu' volte la stessa cella il client la ripete ([440,440,440] senza numbers,
  // banco gu_35): ogni ripetizione prende le copie successive, non di nuovo la prima
  const taken = new Map();
  const comps = cells.flatMap((id, i) => {
    const n = Math.max(1, Number(body?.numbers?.[i]) || 1);
    const from = taken.get(id) || 0;
    taken.set(id, from + n);
    return stackCopies(id, from + n).slice(from);
  }).map((id) => list.get(id)).filter(Boolean);
  const now = serverTime();
  if (!base || !rows.get(base.medalId)) {
    console.log('  [level up] medaglia base assente:', body?.baseUserMedalId);
    return send(res, 200, { ret: ret() });
  }
  const row = rows.get(base.medalId);
  const before = userMedalElement(base, now);
  let gain = comps.reduce((s, m) => s + (rows.get(m.medalId) ? materialExpFor(row, rows.get(m.medalId), m.level || 1) : 0), 0);
  if (Number(body.isGreatSuccess)) gain = Math.trunc(gain * medalMiscValue(118)[0] / 10000);
  // con la base gia' al livello massimo (copie per pallini/guilt) x medalMisc 123 (2500: 2.000
  // invece di 8.000 a LV 100, banco gu_21)
  let cost = medalMiscValue(115)[0] * (base.level || 1) * comps.length;
  if ((base.level || 1) >= row.maxLv) cost = Math.trunc(cost * medalMiscValue(123)[0] / 10000);
  const exp = (base.exp || 0) + gain;
  const level = medalLevelFor(row, base.level || 1, exp);
  // medaglie speciali e copie (server/medal-guilt.js, docs/notes/guilt.md): pallini, sblocco e
  // rilancio della guilt, Magic Mirror, Chip/Dale (STR/DEF), Cid (costo), con i limiti della base
  const burstRow = row.validBurst ? masterRows('burst').find((b) => b.burstId === row.burstId) : null;
  const { state, events } = medalGuilt.applyEnhance(row, base,
    comps.map((m) => ({ row: rows.get(m.medalId), burstUpperNumber: m.burstUpperNumber || 0 })).filter((c) => c.row),
    { burstRow, guiltProb: masterRows('guiltProb'), isGuilt: isGuiltUnlocked() });
  // Overwrite Skill (I-088, server/medal-skill.js): con isOverwriteSkill la skill del materiale piu'
  // a sinistra passa alla base con la probabilita' del client (20% al livello 1, 100% al massimo);
  // altrimenti le skill dei materiali si perdono con i materiali
  let overwrite = null, overwriteOk = false;
  if (Number(body.isOverwriteSkill)) {
    overwrite = medalSkill.overwriteChance(comps.map((m) => ({ skill: medalSkillOf(m) })), skillRowsById(),
      medalMiscValue(121)[0], medalMiscValue(122)[0]);
    if (overwrite) {
      overwriteOk = Math.random() < overwrite.chance;
      if (overwriteOk) {
        player.nextUserSkillId = (player.nextUserSkillId || 0) + 1;
        player.medalSkills = player.medalSkills || {};
        const { skillId, level: lv, exp: sexp } = overwrite.skill;
        player.medalSkills[base.userMedalId] = { userSkillId: player.nextUserSkillId, skillId, level: lv, exp: sexp || 0, getDatetime: now };
      }
    }
  }
  setMedalState(base.userMedalId, { level, exp, ...state });
  for (const m of comps) setMedalState(m.userMedalId, { removed: true });
  player.money = Math.max(0, (player.money || 0) - cost);
  savePlayer();
  if (overwrite) console.log(`  [level up] Overwrite Skill ${overwrite.skill.skillId} LV ${overwrite.skill.level}: ` +
    `${Math.round(overwrite.chance * 100)}% -> ${overwriteOk ? 'riuscito' : 'fallito'}`);
  console.log(`  [level up] ${base.userMedalId} (${row.name}) +${gain} EXP: LV ${base.level || 1} -> ${level}, ` +
    `materiali ${comps.map((m) => m.userMedalId).join(',')}, -${cost} munny; ` +
    `pallini ${base.burstUpperNumber || 0}->${state.burstUpperNumber}, guilt ${base.guiltFactor || 0}->${state.guiltFactor}` +
    (events.rolls.length ? ` (tiri ${events.rolls.join(',')})` : '') +
    `, STR +${state.attackUpperNumber}, DEF +${state.defenseUpperNumber}, costo -${state.upperCost}`);
  // livelli del Burst dati da questa fusione (prima guilt / guilt massima): solo con il popup
  // GuiltBonus_BurstLvup (KHUX_GUILT_BURST_POPUP=1, LWF assente dalle risorse), come guilt-burst.js
  const burstGain = guiltBurst().gained();
  send(res, 200, {
    ret: ret(),
    userData: { userPoint: userPointData(now) },
    // tutte le skill (la tabella del client deve avere ogni id citato dalle medaglie)
    userSkills: userSkillsData(now),
    userMedals: touchedMedalsData(base.userMedalId, comps, now),
    beforeEnhanceUserMedal: before,
    afterEnhanceUserMedal: userMedalElement({ ...base, level, exp, ...state }, now),
    enhanceEffect: Number(body.isGreatSuccess) ? 1 : 0,
    // [fn]: overwriteSkills = elementi userSkill ([fn]), successOverwrite -> +0x2b0
    // (il risultato mostra il nome della skill nuova della base, [fn])
    overwriteSkills: overwriteOk ? userSkillsData(now, [base]) : [],
    successOverwrite: overwriteOk ? 1 : 0,
    guiltBurstFirstLv: burstGain.first, guiltBurstMaxLv: burstGain.max,
    // [fn], obbligatorio: senza, «200 ERROR :55»
    medalResumption: { userShuffleSkills: [], resumptionStatus: 0 },
    // [fn] (pet.petSubslot, [fn]): senza, il ramo 55 va in errore se isPet
    // (+0x45) e' acceso; il ramo lo copia nel pet della sessione solo se esiste (0x7ce17c)
    pet: { petSubslot: petSubslotNow() },
    // letto dal dispatcher dopo pet (0x7cec50, uint64): le medaglie consumate, che il
    // client toglie dall'elenco; senza, «200 ERROR :55»
    // solo le celle sparite: una pila con copie rimaste resta (arriva in userMedals)
    componentUserMedalIds: cells.filter((id) => !stackedMedalList().some((m) => m.userMedalId === id)),
  });
}

// POST /user/medal/evolve (azione 56), corpo visto sul banco:
// {"baseUserMedalId":1,"attachmentMedalIds":[116]}. La medaglia diventa evolveId della
// tabella medal, torna al livello 1; materiali consumati, costo evolveMoney. Ramo 56 del
// dispatcher: userData.userPoint, userMedals, [fn] (before/afterEvolveUserMedal
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
    userMedals: touchedMedalsData(base.userMedalId, comps, now, row.evolveId),
    beforeEvolveUserMedal: before,
    afterEvolveUserMedal: userMedalElement({ ...base, medalId: row.evolveId, level: 1, exp: 0 }, now),
    pet: { petSubslot: petSubslotNow() }, // come il ramo 55 (copia solo se il pet c'e', 0x7ceeac)
    // solo le celle sparite (una pila con copie rimaste resta)
    // e la base, se l'evoluta e' entrata in una pila esistente (validPack, es. Fantasia Mickey B):
    // senza, il client teneva due celle separate fino al login successivo
    attachmentMedalIds: [...new Set([...cells, base.userMedalId])]
      .filter((id) => !stackedMedalList().some((m) => m.userMedalId === id)),
  });
}

// POST /user/material/sell (azione 50) {userMaterialId, number}: dalla Sell Materials del
// Moogle Shop (EquipSellScene). Accredita il campo sell della tabella material per copia.
// Risposta (ramo 50 del dispatcher: [fn] userData.userPoint, poi l'oggetto
// userMaterial letto da [fn]): userMaterialId, materialId, number = copie rimaste.
function respondMaterialSell(res, body) {
  const id = Number(body?.userMaterialId);
  player.materials = player.materials || {};
  const have = player.materials[id] || 0;
  const n = Math.max(0, Math.min(Number(body?.number) || 0, have));
  const row = masterRows('material').find((r) => r.materialId === id);
  const gain = n * (row?.sell || 0);
  player.materials[id] = have - n;
  player.money = (player.money || 0) + gain;
  savePlayer();
  console.log(`  [vendita] materiale ${id} x${n}: +${gain} munny`);
  send(res, 200, {
    ret: ret(),
    userData: { userPoint: userPointData(serverTime()) },
    userMaterial: { userMaterialId: id, materialId: id, number: have - n },
  });
}

// POST /moogleshop/buy (azione 248): scambio di un articolo del Moogle Shop (tabella master
// moogleshop, make-moogleshop.js). Corpo non ancora visto: moogleshopId e quantita' cercati
// con piu' nomi. payType 1 = jewel (freeStone), altrimenti munny; l'articolo arriva con
// grantItem(itemType, itemId, itemNum). Risposta (ramo 248: [fn]
// shuffleskillUserMedals, userMaterials, emblemIds; [fn] guiltBurstFirst/MaxUserMedalIds;
// [fn] userData.userPoint). I jewel non sono nella risposta.
// Trait (scheda Traits, type 1): corpo {moogleshopId, userMedalId, userShuffleSkillId} dal
// popup «Select Medal»; userShuffleSkillId = trait da sostituire (0 = slot libero). Il trait
// e' shuffleSkillId della riga; la medaglia aggiornata torna in shuffleskillUserMedals (stesso
// formato di userMedals, [fn]). Il costo si scala solo se lo scambio riesce.
function respondMoogleshopBuy(res, body) {
  body = body || {};
  const id = Number(body.moogleshopId ?? body.id);
  const n = Math.max(1, Number(body.num ?? body.number ?? body.count ?? 1) || 1);
  const row = masterRows('moogleshop').find((r) => r.moogleshopId === id);
  const now = serverTime();
  const changed = [];
  const snap = inventorySnapshot(now);
  const fail = (why) => {
    console.log(`  [moogle shop] articolo ${id} rifiutato: ${why} (corpo ${JSON.stringify(body)})`);
    // codice d'errore del server ignoto: senza i campi della risposta il client mostra
    // «200 ERROR :248» e non tocca i saldi
    send(res, 200, { ret: ret() });
  };
  if (!row) return fail('assente');
  const cost = row.price * n;
  const wallet = row.payType === 1 ? 'freeStone' : 'money';
  if ((player[wallet] || 0) < cost) return fail(`${wallet} insufficienti (${player[wallet] || 0} < ${cost})`);
  if (row.count && (player.moogleshopBought?.[id] || 0) + n > row.count) return fail('scambi esauriti');
  if (row.type === 1) {
    const medal = userMedalList().find((m) => m.userMedalId === Number(body.userMedalId));
    const mrow = medal && masterRows('medal').find((r) => r.medalId === medal.medalId);
    if (!mrow) return fail('medaglia assente');
    player.medalTraits = player.medalTraits || {};
    const list = player.medalTraits[medal.userMedalId] || [];
    const replace = Number(body.userShuffleSkillId) || 0;
    const at = replace ? list.findIndex((x) => x.userShuffleSkillId === replace) : list.length;
    if (at < 0) return fail(`trait ${replace} assente dalla medaglia ${medal.userMedalId}`);
    // La Special Trait del Training del pet (shuffleskill type 2) ha uno slot a parte: non conta
    const special = new Set(masterRows('shuffleskill').filter((r) => r.type === 2).map((r) => r.shuffleSkillId));
    const normal = list.filter((x) => !special.has(x.shuffleSkillId)).length;
    if (!replace && normal >= (mrow.shuffleskillSlot || 0)) {
      return fail(`slot pieni (${normal}/${mrow.shuffleskillSlot})`);
    }
    player.nextShuffleSkillId = (player.nextShuffleSkillId || 1000) + 1;
    list[at] = { userShuffleSkillId: player.nextShuffleSkillId, shuffleSkillId: row.shuffleSkillId, type: 0,
      getDatetime: now };
    player.medalTraits[medal.userMedalId] = list;
    changed.push(medal);
    console.log(`  [moogle shop] trait ${row.shuffleSkillId} sulla medaglia ${medal.userMedalId} (${mrow.name})` +
      `${replace ? `, sostituisce ${replace}` : ''}: ${list.length}/${mrow.shuffleskillSlot}`);
  } else grantItem(row.itemType, row.itemId, row.itemNum * n);
  player[wallet] = player[wallet] - cost;
  player.moogleshopBought = player.moogleshopBought || {};
  player.moogleshopBought[id] = (player.moogleshopBought[id] || 0) + n;
  savePlayer();
  console.log(`  [moogle shop] articolo ${id} x${n}: tipo ${row.itemType} id ${row.itemId} x${row.itemNum * n}, -${cost} ${row.payType === 1 ? 'jewel' : 'munny'}`);
  // solo le voci cambiate (inventoryBlocks): con le liste intere (~2000 medaglie) il client
  // restava fermo ~5,8 s dopo «Set Trait» (banco 14-10), come lo sblocco dei nodi
  const inv = inventoryBlocks(now, snap);
  send(res, 200, {
    ret: ret(),
    userData: { userPoint: userPointData(now) },
    shuffleskillUserMedals: changed.map((m) => userMedalElement(m, now)),
    // [fn] legge anche userMedals e userSkills ([fn]/[fn] col nome
    // predefinito): senza, «200 ERROR :248»
    userMedals: inv.userMedals,
    userSkills: inv.userSkills,
    userMaterials: inv.userMaterials,
    emblemIds: [],
    ...guiltBurst().lists(), // guiltBurstFirst/MaxUserMedalIds
  });
}

// POST /user/medal/sell (azione 51): risposta letta da [fn] (userData.userPoint).
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
  // celle impilate: si vendono le prime N copie della pila. Elenco a celle calcolato una
  // volta sola (stackCopies lo ricostruiva per ogni medaglia venduta: vendite lente con
  // migliaia di medaglie)
  const cells = new Map(stackedMedalList().map((m) => [m.userMedalId, m]));
  const copies = new Set([...sold].flatMap(([id, n]) => {
    const cell = cells.get(Number(id));
    return cell ? cell.copies.slice(0, Math.max(1, Number(n) || 1)) : [Number(id)];
  }));
  let gain = 0;
  player.medals = (player.medals || []).filter((m) => {
    if (!copies.has(m.userMedalId)) return true;
    gain += rows.get(m.medalId)?.sell || 0;
    copies.delete(m.userMedalId);
    return false;
  });
  // medaglie iniziali (1-3, startingInventory): non stanno in player.medals, si segnano
  // rimosse come dopo un Level Up (banco v33: Goofy venduto restava, +90 invece di 180)
  for (const m of startingInventory().medals) {
    if (!copies.has(m.userMedalId)) continue;
    gain += rows.get(m.medalId)?.sell || 0;
    setMedalState(m.userMedalId, { removed: true });
  }
  player.money = (player.money || 0) + gain;
  savePlayer();
  console.log(`  [vendita] medaglie ${[...sold.keys()].join(',') || '(nessun id nel corpo)'}: +${gain} munny`);
  // ramo 51 del dispatcher (action_case.py): [fn] (userData.userPoint), poi
  // [fn] (userSkills), [fn] (userMedals), infine sellUserMedalIds;
  // senza i tre in radice «200 ERROR :51»
  const now = serverTime();
  const after = stackedMedalList();
  const left = new Set(after.map((m) => m.userMedalId));
  send(res, 200, {
    ret: ret(),
    userData: { userPoint: userPointData(now) },
    userSkills: userSkillsData(now),
    userMedals: after.map((m) => userMedalElement(m, now)),
    // solo le celle sparite (una pila con copie rimaste resta)
    sellUserMedalIds: [...sold.keys()].filter((id) => !left.has(id)),
  });
}

// POST /user/medal/lock (azione 46), corpo visto sul banco:
// {"userMedalIds":[110],"isLocks":[1], ...}. Lo stato va in player.medalLocks (anche per
// le medaglie iniziali 1-3, che non sono in player.medals) e torna nel campo lock di
// userMedals. Ramo 46 del dispatcher: [fn] (userMedals), deleteUserMedalIds,
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

// Slot vuoti in battaglia: [fn] fa un turno per voce di deckMedals e non salta mai:
// uno 0 diventa una medaglia finta (master 1, Paperino blu) che attacca; i negativi fanno
// rifiutare tutto userDecks. Vedi stage_gen\deck_empty_slot e sentKeybladeDeck(id, compact).

// POST /user/medal/remove (azione 237, Unequip dal dettaglio), corpo visto sul banco:
// {"removeUserMedalId":2}. Lo slot del deck torna vuoto (0). Ramo 237: [fn] =
// userKeyblades, userDecks, petSubslots (pet di [fn] sulla radice di quel campo),
// subslotMaxNum + userKeybladeSubslots.
function respondMedalRemove(res, body) {
  const id = Number(body?.removeUserMedalId);
  player.deck = deckMedalIds().map((x) => (x === id ? 0 : x));
  // anche dai deck degli altri keyblade (il corpo non dice quale: la si toglie da tutti)
  for (const d of Object.values(player.keybladeDecks || {})) d.forEach((x, i) => { if (x === id) d[i] = 0; });
  if (PET_ENABLED) pet().onMedalRemoved(id); // Gear del pet e 6° slot dei deck
  savePlayer();
  console.log(`  [unequip] ${id}: deck ${player.deck.join(',')}`);
  send(res, 200, {
    ret: ret(),
    userKeyblades: userKeybladesData(),
    userDecks: userDecksData(),
    // array (il primo elemento sarebbe letto come petSubslot, [fn] modo 1): con un
    // elemento il dispatcher lo copia nell'oggetto pet della sessione (+0x7c0) senza controllo
    // del null (0x7c8d40, il crash di I-005): il pet lo crea solo l'azione 170 (/pet/profile),
    // che il client chiede all'avvio solo con isPet 1. Quindi l'elemento solo con KHUX_PET=1.
    petSubslots: PET_ENABLED ? [pet().petSubslotData()] : [],
    subslotMaxNum: kbEvo().subslotMaxNum(), userKeybladeSubslots: userKeybladeSubslotsData(),
  });
}

// Keyblade posseduti. Starlight (initItem categoria 13) e' userKeybladeId 1, con il deck
// player.deck; gli altri arrivano come premio di tipo 13 (grantItem: es. Treasure Trove 2000
// dalla Quest 14, stage 1110) e stanno in player.keyblades [{userKeybladeId, keybladeId,
// getDatetime, burst}], con il deck in player.keybladeDecks[userKeybladeId] (0 = slot vuoto,
// come player.deck). Ogni keyblade ha userDeckId e userKeybladeSubslotId uguali al suo
// userKeybladeId. Preferito (isFavorite, Profilo): player.favoriteKeybladeId, di default 1.
function ownedKeyblades() {
  return [
    { userKeybladeId: USER_KEYBLADE_ID, keybladeId: kbEvo().starlightKeybladeId(startingInventory().keybladeId), burst: player.keybladeBurst || 0,
      getDatetime: serverTime() },
    ...(player.keyblades || []).map((k) => ({ ...k, burst: k.burst || 0 })),
  ];
}

function keybladeDeckIds(userKeybladeId) {
  if (userKeybladeId === USER_KEYBLADE_ID) return deckMedalIds();
  return (player.keybladeDecks || {})[userKeybladeId] || [];
}

// deckMedals da mandare: le medaglie non piu' possedute (vendute, usate come materiale) diventano
// 0, perche' un id sconosciuto il client lo cerca e non lo trova. Il client usa la lunghezza di
// deckMedals come numero di slot: Optimize ([fn] -> [fn], struttura userDecks
// 0x48) riempie solo quelli, e [fn] segna il deck come cambiato (quindi lo manda in
// /user/keyblade/update/170516) confrontando solo quelle voci. Quindi fuori dalla battaglia il
// deck va completo, con uno 0 per ogni slot vuoto fino agli slot sbloccati (validConsist della
// riga keyblade): con il deck compatto Optimize riempiva solo gli slot gia' pieni (banco 12
// ottobre, Treasure Trove 2/5, I-075). compact = senza gli 0, solo per /stage/start (in
// battaglia uno 0 diventa una medaglia finta, vedi sopra deckMedalIds); un deck tutto vuoto resta
// a zeri anche li'.
function keybladeSlotCount(userKeybladeId) {
  const k = ownedKeyblades().find((x) => x.userKeybladeId === userKeybladeId);
  return Math.min(5, masterRows('keyblade').find((r) => r.keybladeId === k?.keybladeId)?.validConsist || 3);
}

function sentKeybladeDeck(userKeybladeId, compact = false) {
  const owned = new Set(userMedalList().map((m) => m.userMedalId));
  const ids = keybladeDeckIds(userKeybladeId).slice(0, 5).map((id) => (id > 0 && owned.has(id) ? id : 0));
  const filled = ids.filter((id) => id > 0);
  if (compact && filled.length) return filled;
  const slots = keybladeSlotCount(userKeybladeId);
  while (ids.length < slots) ids.push(0);
  while (ids.length > slots && ids[ids.length - 1] === 0) ids.pop();
  return ids;
}

function keybladeDeckStats(userKeybladeId) {
  if (userKeybladeId === USER_KEYBLADE_ID) return deckStats();
  const medals = masterRows('medal');
  const byId = new Map(userMedalList().map((m) => [m.userMedalId, m]));
  let attack = 0;
  let defense = 0;
  for (const id of sentKeybladeDeck(userKeybladeId)) {
    const row = medals.find((r) => r.medalId === byId.get(id)?.medalId);
    if (row) { attack += row.attack; defense += row.defense; }
  }
  return { attack, defense };
}

function favoriteKeybladeId() {
  const fav = player.favoriteKeybladeId;
  return ownedKeyblades().some((k) => k.userKeybladeId === fav) ? fav : USER_KEYBLADE_ID;
}

function favoriteKeyblade() {
  return ownedKeyblades().find((k) => k.userKeybladeId === favoriteKeybladeId());
}

// Premio di tipo 13 (keyblade): un keyblade per serie (category della tabella keyblade: le
// evoluzioni +N hanno la stessa), una copia gia' posseduta non si duplica.
function grantKeyblade(keybladeId) {
  const row = masterRows('keyblade').find((r) => r.keybladeId === keybladeId);
  if (!row) { console.log(`  [keyblade] ${keybladeId} assente dalla tabella keyblade`); return; }
  const cat = (id) => masterRows('keyblade').find((r) => r.keybladeId === id)?.category;
  if (ownedKeyblades().some((k) => cat(k.keybladeId) === row.category)) {
    console.log(`  [keyblade] ${row.name} (${keybladeId}) gia' posseduto`);
    return;
  }
  player.keyblades = player.keyblades || [];
  const userKeybladeId = Math.max(...ownedKeyblades().map((k) => k.userKeybladeId)) + 1;
  player.keyblades.push({ userKeybladeId, keybladeId, getDatetime: serverTime(), burst: 0 });
  console.log(`  [keyblade] ottenuto ${row.name} (${keybladeId}): userKeybladeId ${userKeybladeId}`);
}

// Gauge degli attacchi speciali salvata nel keyblade usato (userKeybladeId di /stage/start)
function setKeybladeBurst(v) {
  const k = (player.keyblades || []).find((x) => x.userKeybladeId === player.currentUserKeybladeId);
  if (k) k.burst = v;
  else player.keybladeBurst = v;
}

// userKeyblades[], elemento letto da [fn] (deckMedals: al massimo 5 uint64).
// totalAttack/totalDefense = somma del deck, come userPoint.attack/defense. category =
// quella della tabella keyblade (Starlight 1, Treasure Trove 201, ...).
function userKeybladeData(k) {
  const { attack, defense } = keybladeDeckStats(k.userKeybladeId);
  return {
    userKeybladeId: k.userKeybladeId, // uint64
    userDeckId: k.userKeybladeId, // uint64
    userKeybladeSubslotId: k.userKeybladeId, // uint64 (vedi /keyblade/subslot)
    category: masterRows('keyblade').find((r) => r.keybladeId === k.keybladeId)?.category ?? 1,
    keybladeId: k.keybladeId,
    deckMedals: sentKeybladeDeck(k.userKeybladeId),
    // isFavorite: il Profilo (createLayout [fn]) mostra il keyblade preferito; senza
    // nessun preferito la riga del keyblade resta nulla (crash in [fn])
    burst: k.burst, totalAttack: attack, totalDefense: defense,
    isFavorite: k.userKeybladeId === favoriteKeybladeId() ? 1 : 0,
    skillUpperTotalHp: 0, skillUpperTotalBurst: 0, skillUpperTotalAttack: 0,
    skillUpperTotalDefence: 0, subslotRate: kbEvo().keybladeSubslotRate(k.keybladeId), // uint
    getDatetime: k.getDatetime || serverTime(),
  };
}

function userKeybladesData() {
  return ownedKeyblades().map(userKeybladeData);
}

function respondUserKeyblade(res) {
  // GET /user/keyblade (azione 11)
  send(res, 200, { ret: ret(), userKeyblades: userKeybladesData() });
}

// userDecks[], elemento letto da [fn]: un deck per keyblade.
// petBaseSlotMedal (uint64, deck +0x40, obbligatorio) = il 6° slot, quello del pet: 0 se
// KHUX_PET e' spento o lo slot e' vuoto (server/pet.js)
function userDecksData(compact = false) {
  const ownedMedals = new Set(userMedalList().map((m) => m.userMedalId));
  return ownedKeyblades().map((k) => ({
    userDeckId: k.userKeybladeId, userKeybladeId: k.userKeybladeId, // uint64
    deckMedals: sentKeybladeDeck(k.userKeybladeId, compact),
    petBaseSlotMedal: petBaseSlotMedal(player, k.userKeybladeId, ownedMedals),
  }));
}

// POST /user/keyblade/update/170516 (azione 45): il client salva i deck e il preferito.
// Corpo ([fn]): userKeyblades [{userKeybladeId, userDeckId, isFavorite}] e
// userDecks [{userDeckId, medals (userMedalId[]), petBaseSlotMedal}]. Risposta: userKeyblades
// ([fn]) e userDecks ([fn]), gli elenchi completi.
function respondKeybladeUpdate(res, body) {
  const owned = new Set(ownedKeyblades().map((k) => k.userKeybladeId));
  for (const k of body?.userKeyblades || []) {
    const id = Number(k.userKeybladeId);
    if (owned.has(id) && Number(k.isFavorite)) player.favoriteKeybladeId = id;
  }
  for (const d of body?.userDecks || []) {
    const id = Number(d.userDeckId); // userDeckId = userKeybladeId
    if (!owned.has(id) || !Array.isArray(d.medals)) continue;
    const medals = d.medals.map(Number).slice(0, 5);
    if (id === USER_KEYBLADE_ID) player.deck = medals;
    else (player.keybladeDecks = player.keybladeDecks || {})[id] = medals;
    setPetBaseSlotMedal(player, id, d.petBaseSlotMedal); // 6° slot (solo con KHUX_PET=1)
    console.log(`  [keyblade] deck ${id}: ${medals.join(',')}` + (PET_ENABLED ? ` + pet ${d.petBaseSlotMedal || 0}` : ''));
  }
  savePlayer();
  send(res, 200, { ret: ret(), userKeyblades: userKeybladesData(), userDecks: userDecksData() });
}

// GET /keyblade/subslot: subslotMaxNum (uint) e userKeybladeSubslots[], letti da
// [fn] (elemento [fn]: keybladeSubslotId uint64, subslotRate uint,
// subslots[] = {slotNumber 1..subslotMaxNum, userMedalId uint64}, [fn]). Ogni
// keyblade deve avere il suo subslot (userKeybladeSubslotId), anche senza slot: la
// schermata Equipment ([fn]) lo cerca in una mappa e, se manca, l'indice -1
// sfora il vettore (std::out_of_range, crash).
function userKeybladeSubslotsData() {
  return kbEvo().userKeybladeSubslotsData(); // server/keyblade-evo.js
}

function respondKeybladeSubslot(res) {
  send(res, 200, { ret: ret(), subslotMaxNum: kbEvo().subslotMaxNum(), userKeybladeSubslots: userKeybladeSubslotsData() });
}

function respondUserDeck(res) {
  // GET /user/deck (azione 12)
  send(res, 200, { ret: ret(), userDecks: userDecksData() });
}

// GET /stage/event (azione 109, tasto «Events» dell'elenco Story, [fn]):
// events[] obbligatorio (elemento [fn] -> [fn]: stages[] come in
// /stage/160310, eventStageId int, showIcon int, bannerUrl string, eventType int, status int,
// endTime "YYYY-MM-DD HH:MM:SS"; poi newStageId int, isLock uint, complete int),
// highScoreRank uint obbligatorio; eventCategory int facoltativo (radice, +0x71).
// Senza eventi il client mostra Txt_NoEvent. Per provare un evento: save/event.json con
// l'array events (forma in docs/notes/server.md).
function respondStageEvent(res) {
  let events = [];
  const evPath = path.join(path.dirname(SAVE_FILE), 'event.json');
  if (fs.existsSync(evPath)) {
    try { events = JSON.parse(fs.readFileSync(evPath, 'utf8')); } catch (e) { console.log('[event] event.json non valido:', e.message); }
  }
  send(res, 200, { ret: ret(), events, highScoreRank: 0 });
}
// GET /user/notice (azione 241, [fn]): raidNotice {isSelfRaid, isOthersRaid} uint,
// obbligatori. Il client lo chiede scegliendo «Coliseum» nel popup PvP_SelectWindow.
// GET /colosseum (azione 124, [fn]): colosseumInfo {colosseumStageId int, status int},
// colosseumStages[] ({stageId, useAp, rank, stageCount} int, [fn]), colosseumRank uint,
// userColosseum {userRank, userStageCount, userStageTotalCount} int. status 1 = in corso
// ([fn] riempie la mappa con colosseumStages), 2 = «This event is unavailable.»
// ([fn], Txt_Description). Le tabelle master colosseum/colosseumStage della 5.0.1 sono
// vuote: senza righe il Colosseo non si puo' giocare, quindi status 2 e nessuno stage.
function respondColosseum(res) {
  send(res, 200, {
    ret: ret(),
    colosseumInfo: { colosseumStageId: 0, status: 2 },
    colosseumStages: [],
    colosseumRank: 0,
    userColosseum: { userRank: 0, userStageCount: 0, userStageTotalCount: 0 },
  });
}
// Coliseum PvP, stato «vuoto» ma valido (nessun avversario, nessuna classifica). Rami di
// [fn] e parser (indirizzi Ghidra; un parser che restituisce null = «200 ERROR :<id>»):
// - GET /pvp (195, ramo 0x7ca204, [fn]): pvp {pvpId, playNumber, pvpPoint, pvpClass,
//   pvpRank uint; openRankingId uint64; numParticipant uint}, tutti obbligatori. pvpId = riga
//   della tabella master pvp (id 0x47, getter [fn]): il pannello AdventureTop2_PvP_Button
//   ([fn], detailUrl a +0x94) e [fn] la leggono SENZA controllo del null.
//   pvpClass 1..8 ([fn]: array::at su pvpClass - 1 con la riga rankingPvp presente).
// - GET/POST /pvp/keyblade (196/197, ramo 0x7c3b9c, [fn]): pvp.keybladeIds [uint64] e
//   pvp.userDecks ([fn], elemento [fn] come /user/deck). Corpo del POST
//   ([fn]): userDecks [{userDeckId, medals, petBaseSlotMedal}], keybladeIds [uint64].
// - GET /pvp/vs_list (198, ramo 0x7c559c, [fn]): vsUsers [] (elemento [fn]).
// - GET /ranking/pvpParade (199, ramo 0x7c9a24, [fn]): pvpParade {pvpClass uint,
//   rankingPvpTopRanker [] (elemento [fn])}.
// - GET /ranking/pvp, /own, /border (200/201/202, rami 0x7c6ec8/0x7c5d20/0x7c6db0, [fn]
//   con chiave pvpRanking/pvpRankingOwn/pvpRankingBorder): {rankingDatas [] (elemento
//   [fn]: userData, userDetail... per giocatore), rankingStatus int, rankingTermStart e
//   rankingTermEnd "YYYY-MM-DD HH:MM:SS"}. rankingStatus 2 = elenco ([fn]), 1/3 = messaggi.
// - GET /pvp/rewardlist (203, ramo 0x7ca344, [fn]): pvpPoint uint64, scoreRewardId [uint].
// - POST /pvp/entry (204), DELETE /pvp/lock (205): nessun parser (0x7d0f0c, esito 1): solo ret.
// Sequenza AdventureTop PvP: DELETE /pvp/lock (lambda [fn]) -> /pvp ([fn]) ->
// /pvp/keyblade ([fn]) -> /pvp/vs_list ([fn]) -> [fn] -> [fn].
const PVP_ID = Number(process.env.KHUX_PVP_ID || 1);
function pvpSeason() {
  // stagione segnaposto: il mese corrente dell'ora del server
  const [y, m] = serverTime().slice(0, 7).split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  return { start: `${y}-${mm}-01 00:00:00`, end: `${y}-${mm}-${last} 23:59:59` };
}
function respondPvp(res, p, method, body) {
  if (p === '/pvp') {
    return send(res, 200, { ret: ret(), pvp: {
      pvpId: PVP_ID, playNumber: 0, pvpPoint: 0, pvpClass: 1, pvpRank: 0, openRankingId: 0, numParticipant: 0 } });
  }
  if (p === '/pvp/keyblade') {
    if (method === 'POST' && Array.isArray(body?.keybladeIds)) {
      player.pvpKeybladeIds = body.keybladeIds.map(Number).filter((n) => Number.isSafeInteger(n) && n >= 0);
      savePlayer();
    }
    // solo ret, come prima del 14-10: con pvp.userDecks (parser dei deck, [fn]) il client
      // sostituiva i deck all'avvio e ogni battaglia andava in crash creando l'HUD del giocatore
      // ([fn] / [fn], banco 14-10, risorse 35). Il Coliseo PvP resta comunque bloccato (I-120)
      return send(res, 200, { ret: ret() });
  }
  if (p === '/pvp/vs_list') return send(res, 200, { ret: ret(), vsUsers: [] });
  if (p === '/ranking/pvpParade') return send(res, 200, { ret: ret(), pvpParade: { pvpClass: 1, rankingPvpTopRanker: [] } });
  const rankingKey = { '/ranking/pvp': 'pvpRanking', '/ranking/pvp/own': 'pvpRankingOwn', '/ranking/pvp/border': 'pvpRankingBorder' }[p];
  if (rankingKey) {
    const s = pvpSeason();
    return send(res, 200, { ret: ret(), [rankingKey]: { rankingDatas: [], rankingStatus: 2, rankingTermStart: s.start, rankingTermEnd: s.end } });
  }
  if (p === '/pvp/rewardlist') return send(res, 200, { ret: ret(), pvpPoint: 0, scoreRewardId: [] });
  // /pvp/entry, /pvp/lock, /pvp/clear (194, non analizzata) e altro: il solo involucro
  return send(res, 200, { ret: ret() });
}
const STAGE_CLEARED = Number(process.env.KHUX_STAGE_CLEARED || 2);

function respondStageList(res) {
  // GET /stage/160310 (azione 108, [fn]): stories[] (elemento [fn]:
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
  // Prova automatica delle missioni (tools/ldplayer/smoke_quests.ps1): se esiste
  // save/smoke.json {"stageId": N} l'elenco contiene solo quella missione, nuova;
  // {"stageIds": [N, ...]} (es. i tour 991001-991008) contiene solo quelle, tutte nuove
  const smokePath = path.join(path.dirname(SAVE_FILE), 'smoke.json');
  if (fs.existsSync(smokePath)) {
    const smoke = JSON.parse(fs.readFileSync(smokePath, 'utf8'));
    const ids = Array.isArray(smoke.stageIds) ? smoke.stageIds : [smoke.stageId];
    const rows = ids.map((id) => stages.find((x) => x.stageId === id)).filter(Boolean);
    if (rows.length) {
      stories.length = 0;
      for (const r of rows) stories.push({ stageId: r.stageId, useAp: 0, score: 0, playStatus: 0, clearMissionIds: [] });
      next = rows[0];
    }
  }
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
  // Letto da [fn]: due stringhe, entrambe decise da noi.
  send(res, 200, {
    nativeSessionId: SESSION.nativeSessionId,
    sharedSecurityKey: SESSION.sharedSecurityKey,
  });
}

function respondBootstrap(res) {
  // GET /login/token?m=0, letto da [fn]. "url" non e' una base: e' l'URL
  // completo della richiesta di sessione (corpo UUID, deviceType, nativeToken;
  // risposta letta da [fn]).
  send(res, 200, {
    url: `${SESSION_BASE}/session`,
    nativeToken: SESSION.nativeToken,
  });
}

function send(res, code, obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  // risposte grandi (inventario completo): il client impiega secondi a leggerle
  if (body.length > 200000) console.log(`[send] risposta di ${Math.round(body.length / 1024)} KB`);
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
      if (kind === 'keybladeupdate') return respondKeybladeUpdate(res, entry.bodyDecoded);
      if (kind === 'userdeck') return respondUserDeck(res);
      if (kind === 'kbsubslot') return kbEvo().respondSubslot(res, req.method, entry.bodyDecoded);
      if (kind === 'kbenhance') return kbEvo().respondEnhance(res, entry.bodyDecoded);
      if (kind === 'kbburstmax') return kbEvo().respondBurstMax(res, entry.bodyDecoded);
      if (kind === 'passivepage') return kbEvo().respondPassivePage(res); // pagina passiveSettingList, I-065
      if (kind === 'passivelist') return kbEvo().respondPassiveList(res, entry.bodyDecoded); // PUT /passive/list (249), I-065
      // Pet (server/pet.js, solo con KHUX_PET=1): 170-175 e 236
      if (kind === 'petprofile') return pet().respondProfile(res);
      if (kind === 'petparts') return pet().respondParts(res);
      if (kind === 'petcoordall') return pet().respondCoordinateAll(res);
      if (kind === 'petcoordupdate') return pet().respondCoordinateUpdate(res, entry.bodyDecoded);
      if (kind === 'petname') return pet().respondName(res, entry.bodyDecoded);
      if (kind === 'petsubslot') return pet().respondSubslot(res, entry.bodyDecoded);
      if (kind === 'petexpedition') return pet().respondExpedition(res, req.method, entry.bodyDecoded, req.url.split('?')[0]);
      if (kind === 'medalpreremove') return pet().respondPreremove(res, '/user/medal/preremove', entry.bodyDecoded);
      // GET /stage/pickup (azione 250, dopo ogni clear): missioni in evidenza, elemento
      // [fn]; la chiave e' scritta cosi' nel binario. Nessuna in evidenza: []
      if (kind === 'stagepickup') return send(res, 200, { ret: ret(), pisckupStages: [] });
      if (kind === 'usermedal') return respondUserMedal(res);
      // GET /user/skill (azione 13): userSkills completa. Senza risposta il client restava con la lista
      // vuota e la cella di una medaglia con skill (Scrooge, Overwrite) cercava il suo userSkillId nella
      // tabella di sessione +0x1c8 senza trovarlo: riga skill 0 = crash in [fn] (pc 0xeb78a4,
      // chiamata da [fn]). Moogle Shop > Traits > Select Medal (I-121, banco 14-10)
      if (kind === 'userskill') return send(res, 200, { ret: ret(), userSkills: userSkillsData() });
      if (kind === 'medalsell') return respondMedalSell(res, entry.bodyDecoded);
      if (kind === 'medallock') return respondMedalLock(res, entry.bodyDecoded);
      if (kind === 'medalenhance') return respondMedalEnhance(res, entry.bodyDecoded);
      if (kind === 'medalevolve') return respondMedalEvolve(res, entry.bodyDecoded);
      if (kind === 'medalremove') return respondMedalRemove(res, entry.bodyDecoded);
      if (kind === 'materialsell') return respondMaterialSell(res, entry.bodyDecoded);
      if (kind === 'moogleshopbuy') return respondMoogleshopBuy(res, entry.bodyDecoded);
      if (kind === 'medalmax') return respondMedalMax(res, entry.bodyDecoded);
      if (kind === 'unionchange') return respondUnionChange(res, entry.bodyDecoded);
      if (kind === 'userupdate') return respondUserUpdate(res, entry.bodyDecoded);
      // GET /user/mission/list (azione 189): missions[] e beginnerLimitTime
      if (kind === 'missionlist') { const missions = missionsData(); const beginner = beginnerLimitTime(); savePlayer(); return send(res, 200, { ret: ret(), missions, beginnerLimitTime: beginner }); }
      if (kind === 'usermission') return respondUserMission(res); // GET /user/mission (187)
      if (kind === 'beginnerpage') return respondBeginnerPage(res); // WebView «Beginner's Guide»
      // Notices (azioni 30/31, WebView /web/notices) e Album (17): server/routes-info-album.js
      if (kind === 'infolist') return send(res, 200, { ret: ret(), ...infoAlbum.informationList(SESSION_BASE) });
      if (kind === 'infopopup') return send(res, 200, { ret: ret(), ...infoAlbum.informationPopup(SESSION_BASE) });
      if (kind === 'noticespage') {
        const buf = Buffer.from(infoAlbum.noticesPage(), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': buf.length });
        return res.end(buf);
      }
      if (kind === 'agreementpage' || kind === 'licensepage') {
        const buf = Buffer.from(kind === 'agreementpage' ? legalPages.agreementPage() : legalPages.licensePage(), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': buf.length });
        return res.end(buf);
      }
      if (kind === 'album') return send(res, 200, { ret: ret(), ...infoAlbum.albumData(userMedalList(), masterRows('medal'),
        (t) => (medalGuilt.GUILT_RANGES[t] || {}).max || 0) });
      // Party (82, 87) e classifiche (129-140, 178-184): server/routes-party-ranking.js
      if (['partylogin', 'partysearch', 'rankinglist', 'partycreate', 'party', 'partymembers', 'partydetail', 'partyupdate', 'partyleave', 'partyemptylist'].includes(kind)) {
        return respondPartyRanking({ send, ret, serverTime, player, userObject, userDetailData, userAvatarData, savePlayer, addPresent,
          selfElement: (now, partyId) => selfPlayerElement(now, userMedalsData(now)[0], partyId),
          keyblade: () => userKeybladeData(favoriteKeyblade()), lastStoryQuest: () => stageNumber(lastStoryStageId()), weeklyLux: () => weeklyLux() },
          res, kind, req.url.split('?')[0].toLowerCase(), entry.bodyDecoded);
      }
      // Avatar Boards: GET /user/sphere (azione 10, sostituisce l'elenco), POST /user/sphere/check e
      // /check/170119 (azioni 60/61: userSphere in merge, closeEventSphereBoardIds se checkTypes ha 3)
      if (kind === 'spherelist') { const userSphere = userSphereAll(); savePlayer(); return send(res, 200, { ret: ret(), userSphere }); }
      if (kind === 'sphereupdate') return respondSphereUpdate(res, entry.bodyDecoded);
      if (kind === 'spherecheck') return respondSphereCheck(res);
      if (kind === 'missionreceive') return respondMissionReceive(res, entry.bodyDecoded);
      if (kind === 'userdetailupdate') return respondUserDetailUpdate(res, req.url.split('?')[0], entry.bodyDecoded);
      // GET /moogleshop/list: [fn], moogleshops[] = {moogleshopId, limitCount} (acquisti
      // gia' fatti per riga); le righe vendute stanno nella tabella master moogleshop
      // Prova (10 ottobre): con la tabella piena ma moogleshops vuoto il client scrive «No
      // items available.»: si elencano le righe attive, limitCount = scambi rimasti
      if (kind === 'moogleshoplist') {
        const bought = player.moogleshopBought || {};
        return send(res, 200, { ret: ret(), moogleshops: masterRows('moogleshop').map((r) => ({
          moogleshopId: r.moogleshopId, limitCount: r.count ? Math.max(0, r.count - (bought[r.moogleshopId] || 0)) : 0 })) });
      }
      if (kind === 'stagelist') return respondStageList(res);
      if (kind === 'stagestart') return respondStageStart(res, entry.bodyDecoded);
      if (kind === 'stagecontinue') return respondStageContinue(res, req.url.split('?')[0], entry.bodyDecoded);
      if (kind === 'stageclear') return respondStageClear(res, entry.bodyDecoded);
      if (kind === 'aprecover') return respondApRecover(res);
  if (kind === 'stageevent') return respondStageEvent(res);
  if (kind === 'usernotice') return send(res, 200, { ret: ret(), raidNotice: { isSelfRaid: 0, isOthersRaid: 0 } });
  if (kind === 'colosseum') return respondColosseum(res);
      // GET /campaign (azione 143): campaigns, array di int (id delle campagne attive)
      if (kind === 'campaign') return send(res, 200, { ret: ret(), campaigns: [] });
      // POST /ranking/reward/check (azione 142, ramo 0x7c9708 di [fn]): prima [fn]
      // vuole tre array in radice (lastRankingResults, rankingRewardIds, openRankingIds; tipo 3 =
      // oggetto, 4 = array), poi rankingReward: array vuoto = nessun premio di classifica, salto a
      // 0x7d0ed0 (esito 1). Senza: «200 ERROR :142» al Challenge della Daily del Coliseum (banco 14-10)
      if (kind === 'rankingrewardcheck') {
        return send(res, 200, { ret: ret(), lastRankingResults: [], rankingRewardIds: [], openRankingIds: [], rankingReward: [] });
      }
      if (kind === 'pvp') return respondPvp(res, req.url.split('?')[0], req.method, entry.bodyDecoded);
      // GET /raid/list/181221 (azione 240, [fn]): selfRaid ([fn] modo 0:
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
      // medalId 0 la home cerca la medaglia 0 e va in crash ([fn], riga nulla):
      // si usa la prima medaglia del deck, con la keyblade iniziale.
      // POST /user/support/update {supportMedalId = userMedalId} (azione 47, Share del dettaglio della medaglia):
      // stesso ramo della 19 (0x7c4124), stessa risposta; la medaglia scelta resta in player.supportUserMedalId.
      if (kind === 'usersupport') {
        const sid = Number(entry.bodyDecoded?.supportMedalId);
        if (sid && userMedalList().some((u) => u.userMedalId === sid)) {
          player.supportUserMedalId = sid; savePlayer();
          console.log(`  [support] medaglia condivisa ${sid}`);
        }
        const shared = player.supportUserMedalId && userMedalList().find((u) => u.userMedalId === player.supportUserMedalId);
        const m = shared || startingInventory().medals[0] || { userMedalId: 0, medalId: 0 };
        return send(res, 200, {
          ret: ret(),
          supportUser: {
            supportUserId: 1, userName: player.name, level: luxRankFor(player.lux),
            ...playerTitleIds(), partyId: 0,
            userKeybladeId: favoriteKeybladeId(), keybladeId: favoriteKeyblade().keybladeId,
            userMedalId: m.userMedalId, medalId: m.medalId, lastActionDatetime: serverTime(),
          },
        });
      }
      // GET /stage/support/list (azione 111, [fn] "supportUsers"): prima della
      // scelta del deck. Con la lista vuota il client va in crash sulle statistiche di una
      // medaglia senza riga ([fn]). Elemento [fn], con userMedal
      // ([fn] -> [fn]), userSkills[] e userAvatar ([fn]). Un
      // supporto: il giocatore stesso, con la prima medaglia del deck.
      if (kind === 'supportlist') {
        const now = serverTime();
        const medal = userMedalsData(now)[0];
        const supportUsers = medal ? [selfPlayerElement(now, medal)] : [];
        return send(res, 200, { ret: ret(), supportUsers });
      }
      // GET /user/avatar (21), /user/avatar/all (22), /user/avatar/parts (23)
      if (kind === 'useravatar') {
        const p = req.url.split('?')[0];
        if (p === '/user/avatar/parts') return send(res, 200, { ret: ret(), userAvatarParts: userAvatarPartsData() });
        if (p === '/user/avatar/all') return send(res, 200, { ret: ret(), userAvatars: [userAvatarData()] });
        return send(res, 200, { ret: ret(), userAvatar: userAvatarData() });
      }
      // GET /raid/reward/151101 (azione 120): userData.userPoint ([fn]),
      // raidRewards[] ([fn]) e i due array di [fn]. Nessun premio.
      if (kind === 'raidreward') {
        return send(res, 200, {
          ret: ret(),
          userData: { userPoint: userPointData(serverTime()) },
          raidRewards: [],
          ...guiltBurst().lists(), // guiltBurstFirst/MaxUserMedalIds
        });
      }
      // GET /user/point (azione 2) e POST /user/sphere/reset (azione 62): solo
      // userData.userPoint ([fn])
      if (kind === 'userpoint') return send(res, 200, { ret: ret(), userData: { userPoint: userPointData(serverTime()) } });
      // GET /user/stone (azione 7, [fn]): i jewel. freeStone = guadagnati in
      // gioco (premi delle missioni), payStone = comprati (sempre 0)
      if (kind === 'userstone') return send(res, 200, { ret: ret(), userStone: { freeStone: player.freeStone || 0, payStone: 0 } });
      // Presents: GET /user/present (azione 20) e POST /user/present/receive (azione 49)
      if (kind === 'userpresent') return respondUserPresent(res);
      if (kind === 'presentreceive') return respondPresentReceive(res, entry.bodyDecoded);
      // GET /user/material (azione 16): userMaterials[]
      if (kind === 'usermaterial') return send(res, 200, { ret: ret(), userMaterials: userMaterialsData() });
      if (kind === 'user') return respondUser(res);
      if (kind === 'userprofile') return respondUserProfile(res);
      if (kind === 'mypage') return respondMyPage(res);
      // GET /user/birthday (azione 9, [fn]): birthday = AAAAMM (anno = /100, mese =
      // %100), dalla data di POST /user/create. Con 0 il client tratta il giocatore come minore
      // di 13 anni: popup Name/Message senza messaggio (AvatarInfo_Comment_U13, [fn])
      // GET /user/title (azione 18, [fn]): userTitles[] {userTitleId uint64, titleId}.
      // Titoli posseduti: quelli di categoria 1 («Default Title», li ha ogni giocatore) e quelli
      // guadagnati (player.titles). Li elenca il popup Titles del Profilo (Edit, Nameplate).
      if (kind === 'usertitle') {
        return send(res, 200, { ret: ret(), userTitles: userTitlesData() });

      }
      if (kind === 'userbirthday') {
        const m = /^(\d{4})-(\d{2})/.exec(player.birthday || '');
        return send(res, 200, { ret: ret(), birthday: m ? Number(m[1]) * 100 + Number(m[2]) : 0 });
      }
      if (kind === 'session') return respondSession(res);
      if (kind === 'bootstrap') return respondBootstrap(res);
      if (kind && kind.startsWith('multi')) return multi().respond(kind, res, entry.bodyDecoded);

      const generated = schemaResponse(req.url.split('?')[0]);
      if (generated) return send(res, 200, generated);

      // Sconosciuta: rispondiamo il minimo che il client accetta, cioe' il solo
      // involucro "ret", perche' prosegua e ci mostri la richiesta successiva.
      // Scoprire la sequenza vale piu' che rispondere bene a una singola chiamata.
      send(res, 200, { ret: ret() });
    });
  };
}

// Union Cross (server/multi.js): le funzioni del giocatore che gli servono
// Potenziamento/evoluzione dei keyblade e sub-slot (server/keyblade-evo.js)
var kbEvoInstance = null; // var: ownedKeyblades() puo' servire prima di questa riga
function kbEvo() {
  return kbEvoInstance ??= makeKeybladeEvo({
    ret, send, serverTime, masterRows, player, savePlayer, ownedKeyblades, userMedalList,
    userKeybladesData, userDecksData, userMaterialsData, userTitlesData, USER_KEYBLADE_ID,
    luxLevel: () => luxRankFor(player.lux), // condizioni Lux delle passive (PUT /passive/list)
  });
}

// Burst: livello, isGuilt e liste di [fn] (server/guilt-burst.js)
var guiltBurstInstance = null;
function guiltBurst() {
  return guiltBurstInstance ??= makeGuiltBurst({ getPlayer: () => player, userMedalList, masterRows });
}

// userDetail.isGuilt: Power Bangle, premio della Quest 34 (guida dell'utente p. 16, khuxwiki;
// docs/notes/guilt.md). lastClearStageId e' uno stageId, il confronto e' sul numero della
// missione (campo id di stage, come userDetail.lastClearStageId). Con KHUX_GUILT_BURST_LV (livello
// fisso per le prove del Burst) sempre 1, come prima.
const POWER_BANGLE_QUEST = 34;
function isGuiltUnlocked() {
  const fixed = process.env.KHUX_GUILT_BURST_LV;
  if (fixed !== undefined && fixed !== '' && Number(fixed) > 0) return 1;
  return stageNumber(player.lastClearStageId) >= POWER_BANGLE_QUEST ? 1 : 0;
}

// Pet / 6° slot (server/pet.js, KHUX_PET=1)
var petInstance = null;
function pet() {
  return petInstance ??= makePet({
    ret, send, serverTime, masterRows, player, savePlayer, userMedalList, userMedalElement, schemaResponse,
  });
}
// petSubslot per i rami 55/56: spento = il segnaposto di prima (tutto a 0)
function petSubslotNow() {
  return PET_ENABLED ? pet().petSubslotData()
    : { subslotUserMedalIds: [], openSkillIds: [], rank: 0, pt: 0, magnification: 0 };
}

let multiInstance = null;
function multi() {
  return multiInstance ??= makeMulti({
    ret, send, serverTime, masterRows, userPointData, userKeybladesData, schemaResponse, player, savePlayer,
    publicHost: () => (/^https?:\/\/([^/:]+)/.exec(PUBLIC_URL) || [])[1] || '127.0.0.1',
  });
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

  multi().startPhotonLogger();

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

// Keyblade da dare senza passare dal premio (I-087), a ogni avvio e alla creazione del giocatore:
// 1. premi gia' ricevuti, cioe' primo completamento (clearGetItemType 13, es. stage 1110 ->
//    Treasure Trove) e obiettivi compiuti (submissionRewardType 13): riparazione dei salvataggi
//    (prima solo con player.keyblades assente; il salvataggio del 12-10 aveva la Quest 34 superata
//    senza Three Wishes);
// 2. serie senza nessun premio nel master 5.0.1: Moogle O' Glory (Moogle Quest), Sleeping Lion,
//    Counterpoint, Fenrir, Darkgnaw, Missing Ache, Diamond Dust (Proud Mode, assente), Stroke of
//    Midnight, Fairy Stars, Bad Guy Breaker (quest 595/683/880, oltre la 525): altrimenti
//    irraggiungibili (khuxwiki, reference\keyblades\keyblade_levels.json «obtain»);
// 3. KHUX_KB_ALL=1: anche le serie della storia non ancora raggiunte (Divine Rose, Quest 433).
// KHUX_KB_UNOBTAINABLE=0 spegne il punto 2. Un keyblade per serie (grantKeyblade), mai doppioni.
function keybladeRewardIds() {
  const ids = [];
  for (const st of masterRows('stage')) {
    (st.clearGetItemType || []).forEach((t, i) => { if (t === 13) ids.push({ id: st.clearGetItemId[i], st, clear: true }); });
    (st.submissionRewardType || []).forEach((t, i) => { if (t === 13) ids.push({ id: st.submissionItemId[i], st, mission: i + 1 }); });
  }
  return ids;
}

function grantMissingKeyblades() {
  player.keyblades = player.keyblades || [];
  const cat = (id) => masterRows('keyblade').find((r) => r.keybladeId === id)?.category;
  const owned = () => new Set(ownedKeyblades().map((k) => cat(k.keybladeId)));
  const give = (id, why) => {
    if (owned().has(cat(id))) return;
    grantKeyblade(id);
    console.log(`[save] keyblade ${id} dato: ${why}`);
  };
  const rewards = keybladeRewardIds();
  for (const r of rewards) {
    const got = r.clear ? r.st.validClearGetItem && r.st.stageId in (player.stageScores || {})
      : ((player.clearMissions || {})[r.st.stageId] || []).includes(r.mission);
    if (got) give(r.id, `premio gia' ricevuto (stage ${r.st.stageId})`);
    else if (process.env.KHUX_KB_ALL === '1') give(r.id, `KHUX_KB_ALL (premio dello stage ${r.st.stageId})`);
  }
  if (process.env.KHUX_KB_UNOBTAINABLE !== '0') {
    const rewarded = new Set(rewards.map((r) => cat(r.id)));
    const base = masterRows('keyblade').filter((r) => r.lv === 0 && !rewarded.has(r.category));
    for (const r of base.sort((a, b) => a.category - b.category)) give(r.keybladeId, 'nessun premio nel master');
  }
}

if (player.created) {
  const before = (player.keyblades || []).length;
  grantMissingKeyblades();
  if (player.keyblades.length !== before) savePlayer();
}

if (require.main === module) start();
module.exports = { SESSION, parseBody, start, route, multi };
// per i test senza client (server/test-medal-enhance.js, con KHUX_SAVE e KHUX_MASTER_DIR propri)
module.exports._test = {
  player, respondMedalEnhance, userMedalList, userMedalElement, userPointData, isGuiltUnlocked, userSkillsData,
  // server/test-keyblades.js
  kbEvo, ownedKeyblades, grantKeyblade, grantMissingKeyblades, userKeybladesData, userDecksData, masterRows,
  // server/test-keyblade-unlock.js
  respondUserCreate, respondStageClear,
};
