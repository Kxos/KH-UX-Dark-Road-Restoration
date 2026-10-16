// Prova delle rotte dello Shop in server.js: node server/test-gacha-server.js
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const SAVE = path.join(os.tmpdir(), `khux-test-gacha-${process.pid}.json`);
const BANNERS = path.join(os.tmpdir(), `khux-test-gacha-banners-${process.pid}.json`);
try { fs.unlinkSync(SAVE); } catch { /* nuovo */ }
process.env.KHUX_SAVE = SAVE;
process.env.KHUX_MASTER_DIR = path.resolve(process.argv[2] || path.join(__dirname, 'master_data'));
process.env.KHUX_REVISION = '118';
process.env.KHUX_GACHA_BANNERS = BANNERS;
process.env.KHUX_GACHA_SIZES = '1,3,10';
delete process.env.KHUX_GACHA_TEST; delete process.env.KHUX_REAL_NOW; delete process.env.KHUX_SERVER_TIME;
const at = (iso) => { const ms = Date.parse(iso); Date.now = () => ms; };
at('2026-10-16T15:00:00Z');
const banners = [
  { drawMedalTypeId: 10001, rowId: 'B0001', name: 'DAILY DEAL!', payType: 1, price: 600, lotCount: 3, isDayLimited: 1, rarityMix: [[4, 1], [3, 2]],
    pool: { 3: [11013], 4: [11014] }, test: false, sortId: 10, comment: 'x', startDate: '2016-04-07', endDate: '2018-01-31', image: 'a.png' },
  { drawMedalTypeId: 10011, rowId: 'B0011', name: 'Epic Medal Carnival', payType: 1, price: 3000, lotCount: 10, isDayLimited: 0, rarityMix: [[3, 10]],
    pool: { 3: [11013] }, test: false, sortId: 30, comment: 'x', startDate: '2016-05-13', endDate: '2016-05-19', image: 'b.png' },
  // 90041 e' impilabile (validPack 1): non deve mai uscire
  { drawMedalTypeId: 10021, rowId: 'B0021', name: 'Stack Test', payType: 1, price: 3000, lotCount: 10, isDayLimited: 0, rarityMix: [[3, 10]],
    pool: { 3: [90041, 11013] }, test: false, sortId: 40, comment: 'x', startDate: '2016-05-13', endDate: '2016-05-19', image: 'c.png' },
];
fs.writeFileSync(BANNERS, JSON.stringify({ banners }));
const log = console.log;
const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };
const raw = (fn, ...a) => { let b = null, h = null; quiet(() => fn({ writeHead(c, hd) { h = hd; }, end(x) { b = x; } }, ...a)); return { body: b, headers: h }; };
call(t.respondUserCreate, { name: 'Prova', unionId: 1 });
const p = t.player;

// lista
let l = call(t.respondGachaList);
check(Array.isArray(l.petGachaList) && l.gachaList[0].drawMedalTypeId === 9001 && l.gachaList.length === 4, 'lista: Catalog + 3 banner');

// estrazione x3 pagata in jewel
p.freeStone = 1000;
check(!p.medals, 'salvataggio nuovo: nessuna lista medaglie');
const before = 0;
let r = call(t.respondGachaDraw, { drawMedalTypeId: 10001, count: 3 });
check(r.userMedalIds && p.freeStone === 400 && p.medals.length === before + 3, 'salvataggio nuovo: estrazione senza eccezioni, -600 jewel, +3 medaglie');
check(r.userMedalIds.length === 3 && new Set(r.userMedalIds).size === 3, 'x3: 3 id distinti');
const sent = new Set(r.userMedals.map((m) => m.userMedalId));
check(r.userMedalIds.every((id) => sent.has(id)), 'x3: ogni id in userMedals');
check(r.effectNumbers.join() === '0,0,0' && r.gachaBonus.addType === 1, 'x3: effetti e bonus neutri');
check(Array.isArray(r.guiltBurstFirstUserMedalIds) && Array.isArray(r.guiltBurstMaxUserMedalIds) && Array.isArray(r.userSkills) && Array.isArray(r.userMaterials), 'x3: liste obbligatorie');
check(r.userData.userPoint && typeof r.userData.userPoint.limitedDrawTicket1 === 'number', 'x3: userPoint');
{
  const byId = new Map(p.medals.map((m) => [m.userMedalId, m.medalId]));
  const want = new Set(r.userMedalIds.map((id) => byId.get(id))).size;
  check(r.firstGetUserMedalIds.length === want && r.firstGetUserMedalIds.every((id) => r.userMedalIds.includes(id)), 'x3: una novita per ogni medalId distinto (tutte nuove)');
}
check(call(t.respondGachaList).gachaList.find((x) => x.drawMedalTypeId === 10001).userLimitedCount === 0, 'lista: Daily usato oggi');

// rifiuti: niente cambia
const stone = p.freeStone, n = p.medals.length;
r = call(t.respondGachaDraw, { drawMedalTypeId: 10001, count: 3 });
check(!r.userMedalIds && p.freeStone === stone && p.medals.length === n, 'Daily: seconda volta rifiutata');
r = call(t.respondGachaDraw, { drawMedalTypeId: 10011, count: 10 });
check(!r.userMedalIds && p.freeStone === stone, 'x10 senza jewel: rifiutata');
r = call(t.respondGachaDraw, { drawMedalTypeId: 9001, count: 1 });
check(!r.userMedalIds, 'Catalog: rifiutata');

// x10 con la stessa medaglia: una sola novita'
p.freeStone = 3000;
p.medals = p.medals.filter((m) => m.medalId !== 11013);
r = call(t.respondGachaDraw, { drawMedalTypeId: 10011, count: 10 });
check(r.userMedalIds.length === 10 && new Set(r.userMedalIds).size === 10 && r.firstGetUserMedalIds.length === 1, 'x10: 10 id, una novita');
check(r.userMedalIds.every((id) => r.userMedals.some((m) => m.userMedalId === id)), 'x10: ogni id in userMedals');
check(p.freeStone === 0, 'x10: -3000');

// medaglie impilabili: tolte dal pool al caricamento, non escono mai
p.medals = p.medals.filter((m) => m.medalId !== 11013);
let packed = 0;
for (let i = 0; i < 5; i++) {
  p.freeStone = 3000;
  r = call(t.respondGachaDraw, { drawMedalTypeId: 10021, count: 10 });
  if (!r.userMedalIds) { packed = -1000; break; }
  packed += p.medals.filter((m) => m.medalId === 90041).length;
  check(r.userMedalIds.every((id) => r.userMedals.some((m) => m.userMedalId === id)), 'impilabili: ogni id in userMedals');
}
check(packed === 0, 'impilabili: validPack mai estratta');

// box pieno
p.freeStone = 3000;
p.medalMaxExtra = -100000;
r = call(t.respondGachaDraw, { drawMedalTypeId: 10011, count: 10 });
check(!r.userMedalIds && p.freeStone === 3000, 'box pieno: rifiutata');
p.medalMaxExtra = 0;

// pagine e immagini
let w = raw(t.respondGachaWeb, '/web/gacha/detail/10001');
check(String(w.body).includes('DAILY DEAL!') && /text\/html/.test(w.headers['Content-Type']), 'pagina dettagli');
w = raw(t.respondGachaWeb, '/web/gacha/odds');
check(String(w.body).includes('Draw Odds'), 'pagina odds');
w = raw(t.respondGachaWeb, '/web/gacha/catalog');
check(String(w.body).includes('/web/gacha/detail/10011'), 'pagina catalogo');
w = raw(t.respondGachaWeb, '/web/gacha/detail/77');
check(w.headers && String(w.body).includes('not found'), 'banner sconosciuto: pagina di errore');
w = raw(t.respondGachaWeb, '/web/gacha/img/../../save/x.png');
check(!w.headers || w.headers['Content-Type'] !== 'image/png', 'immagine: niente percorsi fuori cartella');

// login: link Draw Odds
const login = call(t.respondLogin, {});
check(/\/web\/gacha\/odds$/.test(login.odds || ''), 'login: odds');

// catalogo assente: solo la piastra Catalog
fs.writeFileSync(BANNERS, 'non json');
t.reloadGachaBanners();
l = call(t.respondGachaList);
check(l.gachaList.length === 1 && l.gachaList[0].drawMedalTypeId === 9001, 'catalogo assente: solo Catalog');

fs.unlinkSync(BANNERS);
try { fs.unlinkSync(SAVE); } catch { /* gia' tolto */ }
if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: gacha server');
