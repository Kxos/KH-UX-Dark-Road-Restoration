// Prova della logica dello Shop: node server/test-gacha.js
'use strict';
const g = require('./gacha');
const clock = require('./clock');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const U = (y, mo, d, h = 0) => Date.UTC(y, mo - 1, d, h);

const daily = { drawMedalTypeId: 10001, rowId: 'B0001', name: 'DAILY DEAL!', payType: 1, price: 600, lotCount: 3, isDayLimited: 1,
  rarityMix: [[4, 1], [3, 2]], pool: { 3: [11013], 4: [11014] }, test: false, sortId: 10, comment: '3 Medals', startDate: '2016-04-07', endDate: '2018-01-31', image: 'a.png' };
const plat = { ...daily, drawMedalTypeId: 10456, name: 'Platinum Ticket Draw', payType: 7, price: 1, lotCount: 5, isDayLimited: 0, test: true, sortId: 90 };
const big = { ...daily, drawMedalTypeId: 10011, name: 'Epic Medal Carnival', price: 3000, lotCount: 10, isDayLimited: 0, sortId: 30 };
const banners = [daily, big, plat];
const sizes = new Set([1, 3, 10]);
const t0 = U(2026, 10, 16, 15);

// lista
let l = g.gachaListData(banners, { freeStone: 0 }, { realMs: t0, webBase: 'http://h', test: false, sizes });
check(l.petGachaList.length === 0 && l.gachaList[0].drawMedalTypeId === 9001, 'Catalog in cima');
check(l.gachaList.length === 3 && !l.gachaList.some((x) => x.drawMedalTypeId === 10456), 'banner di prova nascosto');
const e = l.gachaList.find((x) => x.drawMedalTypeId === 10001);
check(e.isDayLimited === 1 && e.userLimitedCount === 1 && e.lotCount === 3 && e.bannerUrl === 'http://h/web/gacha/img/10001.png', 'elemento Daily');
check(['validAdd', 'drawMedalTypeId', 'drawType', 'sortId', 'payType', 'price', 'lotCount', 'isDayLimited', 'userLimitedCount',
  'userWarrantDisplayOfTime', 'name', 'description', 'bannerUrl', 'warrantMedalIds', 'drawTicketlimitDate'].every((k) => k in e), 'campi obbligatori');
const cat = l.gachaList[0];
check(cat.payType === 6 && cat.price === 1 && cat.drawType === 1, 'Catalog innocuo');
l = g.gachaListData(banners, {}, { realMs: t0, webBase: 'http://h', test: true, sizes: new Set([1, 3, 5, 10]) });
check(l.gachaList.some((x) => x.drawMedalTypeId === 10456), 'banner di prova con KHUX_GACHA_TEST');
l = g.gachaListData(banners, {}, { realMs: t0, webBase: 'http://h', test: false, sizes: new Set([1, 3]) });
check(!l.gachaList.some((x) => x.drawMedalTypeId === 10011), 'x10 senza animazione: nascosto');

// controlli dell'estrazione
const p = { freeStone: 1000, limitedDrawTicket1: 0 };
const opt = { realMs: t0, test: false, freeSlots: 100, sizes };
check(g.checkDraw(daily, p, { drawMedalTypeId: 10001, count: 3 }, opt) === null, 'Daily ok');
check(g.checkDraw(undefined, p, { drawMedalTypeId: 1 }, opt) !== null, 'banner sconosciuto');
check(g.checkDraw({ drawMedalTypeId: 9001, payType: 6 }, p, {}, opt) !== null, 'Catalog rifiutato');
check(g.checkDraw(big, p, { count: 10 }, opt) !== null, 'jewel insufficienti');
check(g.checkDraw(daily, p, { count: 3 }, { ...opt, freeSlots: 2 }) !== null, 'box senza posti per 3');
check(g.checkDraw(plat, { limitedDrawTicket1: 5 }, { count: 5 }, opt) !== null, 'prova senza KHUX_GACHA_TEST');
check(g.checkDraw(plat, { limitedDrawTicket1: 5 }, { count: 5 }, { ...opt, test: true, sizes: new Set([1, 3, 5, 10]) }) === null, 'Platinum con biglietti');
check(g.checkDraw(plat, { limitedDrawTicket1: 0 }, { count: 5 }, { ...opt, test: true, sizes: new Set([5]) }) !== null, 'Platinum senza biglietti');
check(g.checkDraw(big, { freeStone: 9999 }, { count: 10 }, { ...opt, sizes: new Set([1, 3]) }) !== null, 'dimensione senza animazione');

// pagamento e limite giornaliero
g.payDraw(daily, p, t0);
check(p.freeStone === 400, 'jewel scalati una volta');
check(g.dayLeft(p, daily, t0) === 0 && g.checkDraw(daily, { ...p, freeStone: 5000 }, { count: 3 }, opt) !== null, 'Daily: seconda volta rifiutata');
const next = clock.dayEnd(t0) + 1;
check(g.dayLeft(p, daily, next) === 1, 'Daily: il giorno dopo di nuovo disponibile');
const q = { limitedDrawTicket1: 3 };
g.payDraw(plat, q, t0);
check(q.limitedDrawTicket1 === 2, 'biglietto scalato');

// campi del risultato
const r = g.drawResultFields([501, 502], [501]);
check(JSON.stringify(r) === JSON.stringify({ gachaBonus: { addType: 1, number: 0, userMedalIds: [] }, firstGetUserMedalIds: [501], userMedalIds: [501, 502], effectNumbers: [0, 0] }), 'campi del risultato');

// pagine
const names = new Map([[11013, 'Wakka'], [11014, 'Wakka']]);
const d = g.detailPage(daily, names);
check(d.includes('DAILY DEAL!') && d.includes('Wakka') && d.includes('reconstructed') && d.includes('once per day'), 'pagina dettagli');
const o = g.oddsPage(banners.filter((b) => !b.test));
check(o.includes('DAILY DEAL!') && o.includes('92%') && o.includes('8%'), 'pagina odds');
const c = g.catalogPage(banners, { test: false });
check(c.includes('/web/gacha/detail/10001') && !c.includes('10456'), 'pagina catalogo');
check(!g.detailPage({ ...daily, name: '<b>' }, names).includes('<b>'), 'escape HTML');

if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: gacha');
