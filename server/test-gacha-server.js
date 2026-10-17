// Prova delle rotte dello Shop in server.js: node server/test-gacha-server.js [cartella master]
// Catalogo sintetico nel formato di gacha_catalog.json (contract-ext.md), medaglie con gli id veri di medal.json.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const SAVE = path.join(os.tmpdir(), `khux-test-gacha-${process.pid}.json`);
const BANNERS = path.join(os.tmpdir(), `khux-test-gacha-banners-${process.pid}.json`);
try { fs.unlinkSync(SAVE); } catch { /* nuovo */ }
process.env.KHUX_SAVE = SAVE;
// master temporaneo: copia di quello vero (argv[2] o master_data) con una riga boosted sintetica (Supernova+ - Ava
// 1000/1000, medal-boost.boostedRow), le sole righe burst che servono (maxEnhanceCount 5) e guiltProb da
// medal-guilt.guiltProbRows (Tier 10: massimo 32000); burst.json vero (7 MB) non si copia
const SRC_MASTER = path.resolve(process.argv[2] || path.join(__dirname, 'master_data'));
const MASTER = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-test-gacha-master-'));
const AVA = 301880, AVA_BOOSTED = 2301880;
{
  const mb = require('./medal-boost'), mg = require('./medal-guilt');
  for (const f of fs.readdirSync(SRC_MASTER).filter((x) => x.endsWith('.json') && !['burst.json', 'medal.json', 'guiltProb.json'].includes(x))) {
    fs.copyFileSync(path.join(SRC_MASTER, f), path.join(MASTER, f));
  }
  const medalRows = JSON.parse(fs.readFileSync(path.join(SRC_MASTER, 'medal.json'), 'utf8')).filter((r) => r.medalId !== AVA_BOOSTED);
  const ava = medalRows.find((r) => r.medalId === AVA);
  medalRows.push(mb.boostedRow(ava, 1000, 1000));
  fs.writeFileSync(path.join(MASTER, 'medal.json'), JSON.stringify(medalRows));
  const burst = JSON.parse(fs.readFileSync(path.join(SRC_MASTER, 'burst.json'), 'utf8')).filter((b) => b.burstId === ava.burstId);
  fs.writeFileSync(path.join(MASTER, 'burst.json'), JSON.stringify(burst.length ? burst.map((b) => ({ ...b, maxEnhanceCount: 5 })) : [{ burstId: ava.burstId, maxEnhanceCount: 5 }]));
  fs.writeFileSync(path.join(MASTER, 'guiltProb.json'), JSON.stringify(mg.guiltProbRows()));
}
process.on('exit', () => { try { fs.rmSync(MASTER, { recursive: true, force: true }); } catch { /* gia' tolta */ } });
process.env.KHUX_MASTER_DIR = MASTER;
process.env.KHUX_REVISION = '118';
process.env.KHUX_GACHA_BANNERS = BANNERS;
process.env.KHUX_GACHA_SIZES = '1,3,10';
process.env.KHUX_GACHA_SHOW = 'B0005,B0008';
delete process.env.KHUX_REAL_NOW; delete process.env.KHUX_SERVER_TIME;
const at = (iso) => { const ms = Date.parse(iso); Date.now = () => ms; };
at('2026-10-16T15:00:00Z');

const v = (base, date, rares = [3, 4, 5]) => rares.map((r) => [base + r, r, date]);
const medals = {
  wakka: { date: '2016-04-07', ids: v(11010, '2016-04-07'), std: true, origin: 'ffkh', att: 'power' },
  tidus: { date: '2016-04-07', ids: v(12010, '2016-04-07'), std: true, origin: 'ffkh', att: 'speed' },
  'kh cloud': { date: '2016-04-15', ids: v(21070, '2016-04-15'), std: true, origin: 'ffkh', att: 'power' },
  minnie: { date: '2016-04-15', ids: v(33070, '2016-04-15'), std: true, origin: 'disney', att: 'magic' },
  'blue fairy': { date: '2018-05-25', ids: [[301495, 6, '2018-05-25']], std: false, origin: 'disney', att: 'magic' },
};
const LATER = new Set([...medals['kh cloud'].ids, ...medals.minnie.ids].map(([id]) => id));
let nextId = 1;
const mk = (o = {}) => {
  const n = nextId++;
  return {
    rowId: `B000${n}`, drawMedalTypeId: 10000 + n, name: `Banner ${n}`, type: 'TIME_LIMITED', flags: [], start: '2016-04-07', end: '2016-04-30',
    endSource: 'original', unlockQuest: 200, payType: 1, currency: 'jewel', prices: [3000], lotCount: 10, rarityMix: [[4, 1], [3, 9]],
    epicBoost: false, dayLimit: 0, vipFree: false, pool: { mode: 'released', sets: [], names: [], featured: [], filter: [], inheritAfter: null, evolve: null },
    guarantee: { list: [], count: 0, pity: null, every: null }, skill: null, bonus: [], catalogOnly: null, guaranteesText: '', ...o,
  };
};
const banners = [
  mk({ name: 'DAILY DEAL!', type: 'DAILY', flags: ['PERMANENT', 'DAY_LIMITED'], end: '2018-01-31', prices: [600], lotCount: 3, rarityMix: [[4, 1], [3, 2]], dayLimit: 1 }),
  mk({ name: 'Epic Medal Carnival', prices: [3000, 2500], pool: { mode: 'sets', sets: ['1.1', '1.2'], names: [], featured: [], filter: [] } }),
  mk({ name: 'VIP Free Deal', unlockQuest: 1, vipFree: true, prices: [0], lotCount: 1, rarityMix: [[5, 1]] }),
  mk({ name: 'Bonus Skill Deal', prices: [300], lotCount: 3, rarityMix: [[3, 3]], bonus: [[5, 48, 2]], skill: { table: '50106', slots: 'first' } }),
  mk({ name: 'Platinum Ticket Draw', type: 'T_EVOLVE', flags: ['PERMANENT'], start: '2019-01-25', end: '2019-03-31', unlockQuest: 825, payType: 7,
    currency: 'platinum', prices: [1], lotCount: 3, rarityMix: [[6, 3]], pool: { mode: 'evolve', evolve: [[301682, 7], [301683, 8], [301684, 9]] } }),
  mk({ name: 'VIP Twin Deal', catalogOnly: 'VIP_TWIN', prices: [100], lotCount: 1, rarityMix: [[5, 1]] }),
  mk({ name: 'Later Deal', unlockQuest: 1, start: '2016-06-01', end: '2016-06-30', prices: [10], lotCount: 1, rarityMix: [[3, 1]],
    pool: { mode: 'sets', sets: [], names: ['wakka'], featured: [], filter: [] } }),
  // solo Blue Fairy (6★) per uno slot 5★: sanitizeBanners lo scarta (resta nel catalogo WebView)
  mk({ name: 'Blue Fairy Deal', unlockQuest: 1, start: '2018-06-01', end: '2018-06-30', prices: [10], lotCount: 1, rarityMix: [[5, 1]],
    pool: { mode: 'sets', sets: [], names: ['blue fairy'], featured: [], filter: [] } }),
  mk({ name: 'Unknown Deal', catalogOnly: 'INCOMPLETE', flags: ['INCOMPLETE'], prices: [], lotCount: null, rarityMix: [] }),
];
const catalog = {
  version: 1, firstRarity: { 3: '2016-04-07', 4: '2016-04-07', 5: '2016-04-07', 6: '2016-07-15', 7: '2018-05-25' },
  story: [[1, 200, '2016-04-07'], [201, 250, '2016-04-21'], [251, 525, '2016-05-05']],
  subsets: { '1.1': { date: '2016-04-07', names: ['wakka', 'tidus'] }, '1.2': { date: '2016-04-15', names: ['kh cloud', 'minnie'] } },
  medals, banners,
};
const writeCatalog = (c) => fs.writeFileSync(BANNERS, typeof c === 'string' ? c : JSON.stringify(c));
writeCatalog(catalog);
const log = console.log, logs = [];
const quiet = (fn) => { console.log = (...a) => logs.push(a.join(' ')); try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };
const raw = (fn, ...a) => { let b = null, h = null; quiet(() => fn({ writeHead(c, hd) { h = hd; }, end(x) { b = x; } }, ...a)); return { body: b, headers: h }; };
const page = (url) => String(raw(t.respondGachaWeb, url).body);
const saved = () => JSON.parse(fs.readFileSync(SAVE, 'utf8'));
call(t.respondUserCreate, { name: 'Prova', unionId: 1 });
const p = t.player;
const questStage = (q) => t.masterRows('stage').find((r) => r.id === q).stageId;
const setQuest = (q) => { p.stageScores = { [questStage(q)]: 1 }; };
setQuest(200);
const ids = (l) => l.gachaList.map((x) => x.drawMedalTypeId);
const plate = (l, id) => l.gachaList.find((x) => x.drawMedalTypeId === id);
const inMedals = (r) => r.userMedalIds.every((id) => r.userMedals.some((m) => m.userMedalId === id));
const neutral = (r) => r.effectNumbers.every((x) => x === 0) && r.effectNumbers.length === r.userMedalIds.length
  && JSON.stringify(r.gachaBonus) === '{"addType":1,"number":0,"userMedalIds":[]}' && r.userMedalIds.length <= 10;

const missing = ['gachaCatalog', 'sanitizeBanners', 'reloadGachaBanners'].filter((k) => typeof t[k] !== 'function');
if (missing.length) { console.log(`ERRORI (${missing.length}):\n  export mancante: ${missing.join(', ')}`); process.exit(1); }

// catalogo: il banner Blue Fairy (slot senza medaglie) e' scartato
check(quiet(() => t.sanitizeBanners(t.gachaCatalog())).banners.length === banners.length, 'sanitizeBanners: nessun banner sparisce dal catalogo');
check(logs.some((x) => /B0008/.test(x)), 'sanitizeBanners: log del banner scartato');
// ricetta guasta (expandPool lancia): scartato, e il log dice perche'
logs.length = 0;
const broken = { ...catalog, banners: [mk({ rowId: 'B0099', name: 'Broken Deal', pool: { mode: 'sets', sets: 5, names: [], featured: [], filter: [] } })] };
check(quiet(() => t.sanitizeBanners(broken)).banners[0].catalogOnly === 'NO_MEDALS', 'sanitizeBanners: ricetta guasta scartata');
check(logs.some((x) => /B0099/.test(x) && /not iterable/.test(x)), `sanitizeBanners: errore nel log (${logs.join(' | ')})`);
check(t.gachaCatalog().banners.find((b) => b.rowId === 'B0008').catalogOnly, 'Blue Fairy: solo catalogo');

// lista alla quest 200 (storia al 2016-04-07): show B0005 per primo (start 2019), poi start uguale per id
let l = call(t.respondGachaList);
check(Array.isArray(l.petGachaList) && JSON.stringify(ids(l)) === '[9001,10005,10001,10002,10003,10004]', `lista: ${ids(l)}`);
check(plate(l, 10002).price === 3000 && plate(l, 10003).price === 1, 'lista: prezzi dinamici (3000, VIP 1)');

// estrazioni rifiutate senza addebito: catalogOnly, fuori periodo, scartato, sconosciuto, Catalog
p.freeStone = 1000;
for (const [id, what] of [[10006, 'catalogOnly'], [10007, 'fuori periodo'], [10008, 'Blue Fairy scartato'], [10009, 'INCOMPLETE'], [77, 'sconosciuto'], [9001, 'Catalog']]) {
  const r = call(t.respondGachaDraw, { drawMedalTypeId: id, count: 1 });
  check(!r.userMedalIds && Object.keys(r).join() === 'ret' && p.freeStone === 1000 && !(p.medals || []).length, `${what}: rifiuto {ret} senza addebito`);
}

// PERMANENT alla quest 200: solo medaglie uscite entro il 2016-04-07
p.freeStone = 600 * 20;
let later = 0, ok = 0;
for (let i = 0; i < 20; i++) {
  p.gacha.used = {};
  const r = call(t.respondGachaDraw, { drawMedalTypeId: 10001, count: 3 });
  if (!r.userMedalIds || !inMedals(r) || !neutral(r)) continue;
  ok++;
  const byId = new Map(p.medals.map((m) => [m.userMedalId, m.medalId]));
  later += r.userMedalIds.filter((id) => LATER.has(byId.get(id))).length;
}
check(ok === 20 && p.freeStone === 0, `PERMANENT: 20 estrazioni riuscite (${ok}), -600 l'una`);
check(later === 0, `PERMANENT alla quest 200: ${later} medaglie del 2016-04-15`);
check(call(t.respondGachaList).gachaList.find((x) => x.drawMedalTypeId === 10001).userLimitedCount === 0, 'lista: Daily usato oggi');
let d = page('/web/gacha/detail/10001');
check(d.includes('Wakka') && !d.includes('KH Cloud'), 'dettagli PERMANENT alla quest 200: niente KH Cloud');
setQuest(250);
d = page('/web/gacha/detail/10001');
check(d.includes('KH Cloud') && d.includes('Minnie'), 'dettagli PERMANENT alla quest 250: KH Cloud e Minnie');
setQuest(200);

// prezzo calante: lista e prezzo pagato coincidono
p.freeStone = 3000;
let r = call(t.respondGachaDraw, { drawMedalTypeId: 10002, count: 10 });
check(r.userMedalIds && r.userMedalIds.length === 10 && p.freeStone === 0 && inMedals(r) && neutral(r), 'x10: -3000, ogni id in userMedals');
check(plate(call(t.respondGachaList), 10002).price === 2500, 'lista dopo la prima: 2500');
p.freeStone = 2500;
r = call(t.respondGachaDraw, { drawMedalTypeId: 10002, count: 10 });
check(r.userMedalIds && p.freeStone === 0, 'seconda estrazione: -2500');

// errore durante la consegna (qui: elenco medaglie congelato, grantItem lancia): niente addebitato,
// niente consegnato a meta', il giocatore torna com'era e il client riceve solo {ret}
p.freeStone = 2500;
const before = JSON.stringify(p);
Object.freeze(p.medals);
logs.length = 0;
try { r = call(t.respondGachaDraw, { drawMedalTypeId: 10002, count: 10 }); } catch (e) { r = { thrown: e.message }; }
check(r && Object.keys(r).join() === 'ret', `consegna fallita: risposta {ret} (${JSON.stringify(r).slice(0, 80)})`);
check(p.freeStone === 2500 && JSON.stringify(p) === before, 'consegna fallita: nessun addebito, giocatore invariato');
check(!Object.isFrozen(p.medals), 'consegna fallita: elenco medaglie ripristinato');
check(logs.some((x) => /consegna/.test(x)), 'consegna fallita: log');

// VIP gratuito: 1 Jewel, una volta al giorno
p.freeStone = 5;
r = call(t.respondGachaDraw, { drawMedalTypeId: 10003, count: 1 });
check(r.userMedalIds && p.freeStone === 4, 'VIP: costa 1 Jewel');
r = call(t.respondGachaDraw, { drawMedalTypeId: 10003, count: 1 });
check(!r.userMedalIds && p.freeStone === 4, 'VIP: seconda rifiutata');

// abilita' e bonus
p.freeStone = 300;
const presents = (p.presents || []).length;
r = call(t.respondGachaDraw, { drawMedalTypeId: 10004, count: 3 });
check(r.userMedalIds && p.freeStone === 0 && inMedals(r), 'Bonus Skill Deal: estrazione');
{
  const first = r.userMedalIds[0];
  const sk = r.userSkills.find((s) => s.userMedalId === first);
  check(sk && sk.level === 1 && p.medalSkills && p.medalSkills[first] && p.medalSkills[first].skillId === sk.skillId, 'skill: userSkills della prima medaglia, livello 1, in medalSkills');
  check(r.userMedals.find((m) => m.userMedalId === first).userSkills.includes(sk && sk.userSkillId), 'skill: id nella medaglia');
  check(r.userMedalIds.slice(1).every((id) => !p.medalSkills[id]), 'skill: solo la prima medaglia');
  const bonus = p.presents.slice(presents);
  check(bonus.length === 1 && bonus[0].resourceType === 5 && bonus[0].resourceId === 48 && bonus[0].number === 2 && /Bonus Skill Deal/.test(bonus[0].comment), 'bonus nei Presents');
}

// evolve (Dual Meow Wow, impilabili): l'id restituito e' quello della cella
{
  const rnd = Math.random;
  Math.random = () => 0.5; // sempre il livello 8
  p.limitedDrawTicket1 = 1;
  const r1 = call(t.respondGachaDraw, { drawMedalTypeId: 10005, count: 3 });
  p.limitedDrawTicket1 = 1;
  const r2 = call(t.respondGachaDraw, { drawMedalTypeId: 10005, count: 3 });
  Math.random = rnd;
  check(r1.userMedalIds && r2.userMedalIds && p.limitedDrawTicket1 === 0, 'evolve: due estrazioni con 1 Platinum Ticket l\'una');
  check(r1.userMedalIds && inMedals(r1) && inMedals(r2) && neutral(r1) && neutral(r2), 'evolve: ogni id in userMedals');
  const cell = r1.userMedalIds && r1.userMedalIds[0];
  check(r1.userMedalIds && [...r1.userMedalIds, ...r2.userMedalIds].every((id) => id === cell), 'evolve: stesso id di cella nelle due estrazioni');
  check(r2.userMedals && r2.userMedals.find((m) => m.userMedalId === cell).number === 6, 'evolve: cella con 6 copie');
  check(JSON.stringify(r1.firstGetUserMedalIds) === JSON.stringify([cell]) && r2.firstGetUserMedalIds.length === 0, 'evolve: novita una volta, con l\'id della cella');
}

// biglietti: vecchio salvataggio con limitedDrawTicket2
delete p.drawTickets;
p.limitedDrawTicket2 = 4;
call(t.respondGachaList);
check(t.userPointData(t.serverTime()).limitedDrawTicket2 === 4, 'migrazione: limitedDrawTicket2 = 4');
check(saved().drawTickets && saved().drawTickets.draw === 4 && !('limitedDrawTicket2' in saved()), 'migrazione: salvataggio con drawTickets.draw 4');
quiet(() => t.grantItem(41, 0, 3));
check(p.drawTickets.draw === 7 && t.userPointData(t.serverTime()).limitedDrawTicket2 === 7, 'grantItem 41: drawTickets.draw +3');

// box pieno
p.freeStone = 3000; p.gacha.count = {};
p.medalMaxExtra = -100000;
r = call(t.respondGachaDraw, { drawMedalTypeId: 10002, count: 10 });
check(!r.userMedalIds && p.freeStone === 3000, 'box pieno: rifiutata');
p.medalMaxExtra = 0;

// pagine e immagini
let w = raw(t.respondGachaWeb, '/web/gacha/detail/10001');
check(String(w.body).includes('DAILY DEAL!') && /text\/html/.test(w.headers['Content-Type']), 'pagina dettagli');
check(page('/web/gacha/detail/10005').includes('Dual Meow Wow [SAB LV 8]'), 'dettagli evolve: nomi da medal.json');
check(page('/web/gacha/detail/10004').includes('Attack Boost II'), 'dettagli: skill presenti in skill.json');
check(page('/web/gacha/detail/10006').includes('VIP variant'), 'dettagli di un banner solo catalogo');
check(page('/web/gacha/detail/10009').includes('Original details missing'), 'dettagli INCOMPLETE senza eccezioni');
check(page('/web/gacha/detail/10008').includes('Medals not available yet'), 'dettagli del banner scartato');
w = raw(t.respondGachaWeb, '/web/gacha/odds');
check(String(w.body).includes('Draw Odds') && String(w.body).includes('DAILY DEAL!'), 'pagina odds');
w = raw(t.respondGachaWeb, '/web/gacha/odds/10002');
check(String(w.body).includes('Epic Medal Carnival') && !String(w.body).includes('DAILY DEAL!'), 'odds di una piastra (id accodato dal client)');
w = raw(t.respondGachaWeb, '/web/gacha/odds/9001');
check(String(w.body).includes('Epic Medal Carnival') && String(w.body).includes('DAILY DEAL!') && !String(w.body).includes('VIP Twin Deal'), 'odds della piastra Catalog: i banner della lista');
w = raw(t.respondGachaWeb, '/web/gacha/catalog');
{
  const c = String(w.body);
  check(banners.every((b) => c.includes(`/web/gacha/detail/${b.drawMedalTypeId}`)), 'catalogo: tutti i banner');
  check(c.includes('In the Shop now') && c.includes('Not in the Shop now') && c.includes('Medals not available yet'), 'catalogo: stati');
}
w = raw(t.respondGachaWeb, '/web/gacha/detail/77');
check(w.headers && String(w.body).includes('not found'), 'banner sconosciuto: pagina di errore');
w = raw(t.respondGachaWeb, '/web/gacha/img/../../save/x.png');
check(!w.headers || w.headers['Content-Type'] !== 'image/png', 'immagine: niente percorsi fuori cartella');

// login: link Draw Odds
const login = call(t.respondLogin, {});
check(/\/web\/gacha\/odds\/$/.test(login.odds || ''), 'login: odds (il client accoda il drawMedalTypeId)');

// rollDraw che lancia: risposta {ret}, niente addebito
{
  const gd = require('./gacha-data');
  p.freeStone = 3000; p.gacha.count = {};
  const n = p.medals.length;
  const orig = gd.rollDraw; gd.rollDraw = () => { throw new Error('prova'); };
  let thrown = null;
  try { r = call(t.respondGachaDraw, { drawMedalTypeId: 10002, count: 10 }); } catch (e) { thrown = e; }
  gd.rollDraw = orig;
  check(!thrown && !r.userMedalIds && p.freeStone === 3000 && p.medals.length === n, 'rollDraw che lancia: risposta {ret}, jewel intatti');
}

// posti liberi: contano le celle che il client vede, non le copie vendute/fuse rimaste in player.medals
{
  p.freeStone = 3000; p.gacha.count = {};
  p.medals = [];
  p.medalState = p.medalState || {};
  for (let i = 0; i < 3000; i++) {
    const id = 50000 + i;
    p.medals.push({ userMedalId: id, medalId: 11013, level: 1, exp: 0 });
    if (i >= 10) p.medalState[id] = { removed: true };
  }
  check(t.maxMedal() === 3000, 'tetto 3000 raggiunto con le copie rimosse');
  r = call(t.respondGachaDraw, { drawMedalTypeId: 10002, count: 10 });
  check(r.userMedalIds && r.userMedalIds.length === 10, 'celle visibili con spazio: estrazione consentita anche a 3000 copie in elenco');
  p.freeStone = 3000; p.gacha.count = {};
  p.medalState = {};
  p.medals = p.medals.slice(0, 2995);
  r = call(t.respondGachaDraw, { drawMedalTypeId: 10002, count: 10 });
  check(!r.userMedalIds, 'celle visibili piene: estrazione rifiutata');
  p.medals = []; p.medalState = {};
}

// payType sconosciuto nelle pagine: niente eccezioni
{
  const g = require('./gacha');
  let okp = true;
  try { g.detailPage({ ...banners[0], payType: 99 }, undefined, new Map(), { storyQuest: 0, sizes: new Set([3]) }); } catch { okp = false; }
  check(okp, 'detailPage: payType sconosciuto non lancia');
}

// riga drawMedalType senza bannerUrl/detailUrl: non lancia
{
  let okr = true;
  try { t.servedMasterRows('drawMedalType', Date.now()); } catch { okr = false; }
  check(okr, 'servedMasterRows drawMedalType non lancia');
}

// gestore HTTP: un errore in una rotta non abbatte il server, risposta {ret}
{
  const EventEmitter = require('events');
  const req = new EventEmitter(); req.url = '/gacha/draw'; req.method = 'POST'; req.headers = {};
  let sent = null, calls = 0;
  const res = { headersSent: false, writeHead() { if (calls++ === 0) throw new Error('rotta guasta'); }, end(x) { sent = JSON.parse(x.toString('utf8')); } };
  let thrown = null;
  quiet(() => { try { t.handler('http')(req, res); req.emit('end'); } catch (e) { thrown = e; } });
  check(!thrown && sent && sent.ret !== undefined, 'handler: errore in rotta -> risposta {ret}, nessuna eccezione');
}

// --- sotto-progetto 2b, Task 6: consegna dei potenziamenti, pityGift, piastra col contatore, Nova per gruppo ---
// catalogo v3 a parte (storia al 2018-06-10): 7★ di Tier 10 (Supernova+ - Ava) e Wakka 5★
try {
  const RES7 = { kind: 'tier', slot: 0, count: 1, star: 7, names: [], tierMin: 10, tierMax: 10 };
  const G = (o) => ({ list: [], count: 0, slot: 0, pity: null, every: null, slots: [RES7], pityNames: [], pityStar: null, pitySlot: null,
    pityGift: null, erratum: null, source: null, ...o });
  const EN = (o) => ({ preset: [], boosted: [], maxSkill: [], notReproduced: [], ...o });
  let n6 = 600;
  const b6 = (o) => { const n = ++n6; return mk({ rowId: `B0${n}`, drawMedalTypeId: 10000 + n, name: `Banner ${n}`, start: '2018-06-01', end: '2018-06-30',
    unlockQuest: 1, prices: [10], lotCount: 1, rarityMix: [[7, 1]], pool: { mode: 'sets', sets: [], names: ['supernova+ - ava'], featured: [], filter: [] },
    guarantee: G({}), enhance: EN({}), ...o }); };
  const PRESET = [{ on: { slots: [0] }, dots: 'max', guilt: 'max' }];
  const BOOST = [{ on: { slots: [0] }, str: 1000, def: 1000, chance: 'guaranteed' }];
  const bPre = b6({ enhance: EN({ preset: PRESET }) });
  const bBoost = b6({ enhance: EN({ boosted: BOOST }) });
  const bBoostPre = b6({ enhance: EN({ boosted: BOOST, preset: PRESET }) });
  const bSkill = b6({ enhance: EN({ maxSkill: [{ on: { slots: [0] }, skills: ['abilita assente', 'paralysis'] }] }) });
  const bNoSkill = b6({ enhance: EN({ maxSkill: [{ on: { slots: [0] }, skills: ['abilita assente'] }] }) });
  const bGift = b6({ rarityMix: [[5, 1]], pool: { mode: 'sets', sets: [], names: ['wakka'], featured: [], filter: [] },
    guarantee: G({ pity: 3, slots: [], pityGift: [3, 301684, 1] }) });
  const bPity = b6({ rarityMix: [[5, 1]], pool: { mode: 'sets', sets: [], names: ['wakka'], featured: [], filter: [] },
    guarantee: G({ pity: 3, slots: [], pityNames: ['supernova+ - ava'], pityStar: 7, pitySlot: 0 }) });
  const cat6 = { ...catalog, version: 3, story: [[1, 525, '2018-06-10']], medals: { ...medals, 'supernova+ - ava': { date: '2018-05-25', ids: [[AVA, 7, '2018-05-25', 10]], std: false } },
    banners: [bPre, bBoost, bBoostPre, bSkill, bNoSkill, bGift, bPity] };
  writeCatalog(cat6);
  t.reloadGachaBanners();
  process.env.KHUX_GUILT_BURST_POPUP = '1';
  delete process.env.KHUX_GUILT_BURST_LV;
  p.medals = []; p.medalState = {}; p.medalSkills = {}; p.gacha = {}; p.presents = [];
  p.guiltBurst = { first: [], max: [] };
  quiet(() => t.guiltBurst().lists()); // copie in attesa delle prove precedenti
  const draw6 = (b) => { p.freeStone = 10; return call(t.respondGachaDraw, { drawMedalTypeId: b.drawMedalTypeId, count: 1 }); };
  const um = (r, id) => r.userMedals.find((m) => m.userMedalId === id);
  const ids6 = ids(call(t.respondGachaList));
  check([bPre, bBoost, bPity].every((b) => ids6.includes(b.drawMedalTypeId)), `2b: banner v3 nella lista (${ids6})`);

  // preset dots 'max', guilt 'max' su una 7★ di Tier 10: pallini 5, guilt 32000, Nova +1 +5 con le copie nella risposta
  const lv0 = t.guiltBurst().level();
  r = draw6(bPre);
  const idP = r.userMedalIds && r.userMedalIds[0];
  const mP = idP && um(r, idP);
  check(mP && mP.medalId === AVA && mP.burstUpperNumber === 5 && mP.guiltFactor === 32000, `preset: pallini 5 e guilt 32000 (${JSON.stringify(mP && { b: mP.burstUpperNumber, g: mP.guiltFactor })})`);
  check(r.guiltBurstFirstUserMedalIds && r.guiltBurstFirstUserMedalIds.includes(idP) && r.guiltBurstMaxUserMedalIds.includes(idP),
    `preset: copia in guiltBurstFirst/MaxUserMedalIds (${JSON.stringify([r.guiltBurstFirstUserMedalIds, r.guiltBurstMaxUserMedalIds])})`);
  check(t.guiltBurst().level() === lv0 + 6, `preset: Nova +1 +5 (${lv0} -> ${t.guiltBurst().level()})`);

  // Nova per gruppo: la boosted della stessa medaglia (gia' nel registro first e max) non aggiunge livelli
  r = draw6(bBoostPre);
  const idBP = r.userMedalIds && r.userMedalIds[0];
  check(idBP && um(r, idBP).medalId === AVA_BOOSTED && um(r, idBP).guiltFactor === 32000, 'Nova per gruppo: boosted al massimo consegnata');
  check(t.guiltBurst().level() === lv0 + 6 && !r.guiltBurstFirstUserMedalIds.length && !r.guiltBurstMaxUserMedalIds.length,
    `Nova per gruppo: nessun livello in piu' (${t.guiltBurst().level()}, ${JSON.stringify([r.guiltBurstFirstUserMedalIds, r.guiltBurstMaxUserMedalIds])})`);

  // boosted «guaranteed»: medalId boosted, cella propria, identica dopo un ricaricamento del salvataggio
  r = draw6(bBoost);
  const idB = r.userMedalIds && r.userMedalIds[0];
  const mB = idB && um(r, idB);
  check(mB && mB.medalId === AVA_BOOSTED && mB.number === 1 && inMedals(r), `boosted: medalId ${mB && mB.medalId} in userMedals`);
  // la risposta ha solo le celle cambiate (inventoryBlocks): la copia di prima resta una cella a parte
  const cells = quiet(() => t.inventoryBlocks(t.serverTime())).userMedals.filter((m) => m.medalId === AVA_BOOSTED);
  check(idB !== idBP && cells.length === 2 && cells.every((m) => m.number === 1), `boosted: una cella per copia, validPack 0 (${cells.map((m) => `${m.userMedalId}x${m.number}`)})`);
  {
    const { execFileSync } = require('child_process');
    const js = `const t=require(${JSON.stringify(path.join(__dirname, 'server'))})._test;const m=t.userMedalList().find((x)=>x.userMedalId===${idB});`
      + 'const e=m&&t.userMedalElement(m,0);if(e)delete e.getDatetime;process.stdout.write("\\n@@"+JSON.stringify(e));';
    let out = '';
    try { out = execFileSync(process.execPath, ['-e', js], { env: process.env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { out = String(e.stdout || ''); }
    const after = out.split('@@').pop();
    const now = quiet(() => { const e = t.userMedalElement(t.userMedalList().find((x) => x.userMedalId === idB), 0); delete e.getDatetime; return JSON.stringify(e); });
    check(after === now, `boosted: identica dopo il ricaricamento (${after.slice(0, 120)} / ${now.slice(0, 120)})`);
  }

  // maxSkill: la prima abilita' presente in skill.json al livello massimo; assente: nessuna skill, nessun errore
  r = draw6(bSkill);
  const idS = r.userMedalIds && r.userMedalIds[0];
  const para = t.masterRows('skill').find((s) => s.name === 'Paralysis');
  check(idS && p.medalSkills[idS] && p.medalSkills[idS].skillId === para.skillId && p.medalSkills[idS].level === para.maxLv,
    `maxSkill: Paralysis al livello ${para && para.maxLv} (${JSON.stringify(idS && p.medalSkills[idS])})`);
  check(idS && r.userSkills.some((s) => s.userMedalId === idS && s.level === para.maxLv) && um(r, idS).userSkills.length === 1, 'maxSkill: in userSkills e nella medaglia');
  r = draw6(bNoSkill);
  check(r.userMedalIds && r.userMedalIds.length === 1 && !p.medalSkills[r.userMedalIds[0]], 'maxSkill assente: nessuna skill, estrazione riuscita');

  // pityGift [3, 301684, 1] alla 3a estrazione: un regalo nel Present Box, nessuna medaglia in piu'
  const gifts = () => p.presents.filter((x) => x.resourceType === 3 && x.resourceId === 301684 && x.number === 1).length;
  const g1 = draw6(bGift), g2 = draw6(bGift);
  check(g1.userMedalIds && g2.userMedalIds && gifts() === 0, `pityGift: niente prima della 3a (${gifts()})`);
  const g3 = draw6(bGift);
  check(g3.userMedalIds && g3.userMedalIds.length === 1 && gifts() === 1, `pityGift: un regalo alla 3a, una medaglia (${gifts()}, ${g3.userMedalIds})`);
  const gp = plate(call(t.respondGachaList), bGift.drawMedalTypeId);
  check(gp.userWarrantDisplayOfTime === 3 && JSON.stringify(gp.warrantMedalIds) === '[301684]', `pityGift: piastra ${JSON.stringify(gp)}`);

  // /gacha/list: il contatore scende a ogni estrazione senza bersaglio e torna alla pity quando il bersaglio esce
  const seen = [];
  const wp = () => plate(call(t.respondGachaList), bPity.drawMedalTypeId);
  seen.push(wp().userWarrantDisplayOfTime);
  const got = [];
  for (let k = 0; k < 3; k++) { const x = draw6(bPity); got.push(x.userMedalIds && um(x, x.userMedalIds[0]).medalId); seen.push(wp().userWarrantDisplayOfTime); }
  check(JSON.stringify(seen) === '[3,2,1,3]' && got[2] === AVA && got[0] !== AVA, `piastra: contatore ${seen} (medaglie ${got})`);
  check(JSON.stringify(wp().warrantMedalIds) === `[${AVA}]`, 'piastra: warrantMedalIds = bersaglio alla pityStar');
  // fix 1: expandFor che lancia su un banner con pity: piastra con warrantMedalIds non vuota (ids del catalogo dei
  // pityNames), striscia nascosta, una riga di log per banner
  {
    const gdm = require('./gacha-data');
    t.reloadGachaBanners();
    t.gachaCatalog(); // sanitizeBanners con l'expandPool vero
    const orig = gdm.expandPool;
    gdm.expandPool = (b, ...a) => { if (b.drawMedalTypeId === bPity.drawMedalTypeId) throw new Error('ricetta di prova'); return orig(b, ...a); };
    logs.length = 0;
    let pl1, pl2;
    try {
      pl1 = plate(call(t.respondGachaList), bPity.drawMedalTypeId);
      pl2 = plate(call(t.respondGachaList), bPity.drawMedalTypeId);
    } finally { gdm.expandPool = orig; }
    check(pl1 && JSON.stringify(pl1.warrantMedalIds) === `[${AVA}]` && pl1.userWarrantDisplayOfTime === 0, `expandFor che lancia: piastra ${JSON.stringify(pl1 && [pl1.userWarrantDisplayOfTime, pl1.warrantMedalIds])}`);
    check(pl2 && pl2.warrantMedalIds.length === 1, 'expandFor che lancia: seconda lista non vuota');
    const lines = logs.filter((x) => x.includes(bPity.rowId) && /ricetta di prova/.test(x));
    check(lines.length === 1, `expandFor che lancia: una riga di log per banner (${lines.length}: ${logs.join(' | ')})`);
    t.reloadGachaBanners();
  }
  delete process.env.KHUX_GUILT_BURST_POPUP;
} catch (err) { errors.push(`2b: eccezione ${err.stack}`); }

// catalogo assente: solo la piastra Catalog, estrazione rifiutata
writeCatalog('non json');
t.reloadGachaBanners();
l = call(t.respondGachaList);
check(l.gachaList.length === 1 && l.gachaList[0].drawMedalTypeId === 9001, 'catalogo assente: solo Catalog');
p.freeStone = 3000; p.gacha.count = {};
r = call(t.respondGachaDraw, { drawMedalTypeId: 10002, count: 10 });
check(!r.userMedalIds && p.freeStone === 3000, 'catalogo assente: estrazione rifiutata');
check(page('/web/gacha/catalog').includes('0 original banners'), 'catalogo assente: pagina vuota');

fs.unlinkSync(BANNERS);
try { fs.unlinkSync(SAVE); } catch { /* gia' tolto */ }
if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: gacha server');
