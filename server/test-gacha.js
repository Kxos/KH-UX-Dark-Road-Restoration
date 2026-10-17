// Prova della logica dello Shop: node server/test-gacha.js
'use strict';
const g = require('./gacha');
const gd = require('./gacha-data');
const clock = require('./clock');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const U = (y, mo, d, h = 0) => Date.UTC(y, mo - 1, d, h);

// banner sintetici con i campi del contratto del catalogo
let nextId = 10100;
const mk = (o = {}) => ({
  rowId: `B${nextId - 10000}`, drawMedalTypeId: nextId++, name: 'Banner', type: 'TIME_LIMITED', flags: [], start: '2016-12-01', end: '2016-12-15',
  unlockQuest: 200, payType: 1, currency: 'jewel', prices: [3000], lotCount: 10, rarityMix: [[5, 1], [4, 9]], epicBoost: false,
  dayLimit: 0, vipFree: false, pool: { mode: 'released' }, guarantee: { list: [], count: 0, pity: null, every: null },
  skill: null, catalogOnly: null, ...o,
});
const sizes = new Set([1, 3, 10]);
const t0 = U(2026, 10, 16, 15);
const next = clock.dayEnd(t0) + 1;

// prezzi dinamici
const first = mk({ prices: [0, 3000] });
const pl = { gacha: {} };
check(g.priceFor(first, pl) === 1, 'FIRST_FREE: 1 alla prima');
pl.gacha.count = { [first.drawMedalTypeId]: 1 };
check(g.priceFor(first, pl) === 3000, 'FIRST_FREE: prezzo pieno dopo');
const fall = mk({ prices: [3000, 2500, 2200, 1900] });
const seq = [0, 1, 2, 3, 4].map((n) => g.priceFor(fall, { gacha: { count: { [fall.drawMedalTypeId]: n } } }));
check(JSON.stringify(seq) === '[3000,2500,2200,1900,1900]', `FALLING: ${seq}`);
const free = mk({ prices: [0] });
check(g.priceFor(free, {}) === 1 && g.priceFor(free, { gacha: { count: { [free.drawMedalTypeId]: 5 } } }) === 1, 'prices [0]: sempre 1');

// lista provvisoria
const opt = { storyQuest: 525, storyDay: '2016-12-08', sizes, show: new Set() };
const inside = mk({ unlockQuest: 525 });
const locked = mk({ unlockQuest: 540 });
const past = mk({ start: '2016-11-20', end: '2016-11-30' });
const perm = mk({ flags: ['PERMANENT'], start: '2016-04-07', end: '2018-01-31', name: 'DAILY DEAL!' });
const onlyCat = mk({ catalogOnly: 'VIP_TWIN' });
const five = mk({ lotCount: 5 });
let s = g.shopBanners([inside, locked, past, perm, onlyCat, five], opt);
check(s.includes(inside), 'banner attivo e sbloccato: entra');
check(!s.includes(locked), 'unlockQuest 540: non entra');
check(!s.includes(past), 'finito il 30/11: non entra');
check(s.includes(perm), 'PERMANENT nella sua epoca: entra');
check(!s.includes(onlyCat) && !s.includes(five), 'catalogOnly e lotCount 5: non entrano');
check(s[0] === inside && s[1] === perm, 'ordine per start decrescente');
s = g.shopBanners([inside, locked, past, onlyCat, five], { ...opt, show: new Set([locked.rowId, past.rowId, onlyCat.rowId, five.rowId]) });
check(s.includes(locked) && s.includes(past) && !s.includes(onlyCat) && !s.includes(five), 'show: solo se drawable');
const many = Array.from({ length: 12 }, (_, i) => mk({ start: `2016-12-0${(i % 7) + 1}` }));
s = g.shopBanners(many, opt);
check(s.length === g.SHOP_MAX && g.SHOP_MAX === 8, 'al massimo SHOP_MAX');
check(s.every((b, i) => i === 0 || s[i - 1].start >= b.start), 'ordine decrescente con molti banner');
const tDraw = mk({ payType: 8, currency: 'draw', prices: [1], start: '2016-12-05' });
const tSpooky = mk({ payType: 8, currency: 'spooky', prices: [1], start: '2016-12-03' });
s = g.shopBanners([tSpooky, tDraw], opt);
check(s.includes(tDraw) && !s.includes(tSpooky), 'payType 8: una sola valuta, la prima in ordine');
check(g.drawable(inside, sizes) && !g.drawable(mk({ payType: 9 }), sizes) && !g.drawable(mk({ payType: 4 }), sizes), 'drawable');

// valute
const old = { limitedDrawTicket2: 7 };
const tk = g.ticketsOf(old);
check(JSON.stringify(tk) === '{"draw":7,"holiday":0,"spooky":0,"moogle":0}' && !('limitedDrawTicket2' in old), 'migrazione di limitedDrawTicket2');
old.limitedDrawTicket2 = 3;
check(g.ticketsOf(old).draw === 7, 'migrazione una volta sola');
const pw = { drawTickets: { draw: 1, holiday: 0, spooky: 4, moogle: 0 }, freeStone: 50 };
check(g.balance(pw, tSpooky) === 4 && g.balance(pw, inside) === 50, 'balance');
check(g.walletName(tSpooky) === 'drawTickets.spooky' && g.walletName(inside) === 'freeStone' && g.walletName(mk({ payType: 7 })) === 'limitedDrawTicket1', 'walletName');

// lista dello Shop
const pList = { freeStone: 0 };
let l = g.gachaListData([tSpooky, inside, first], pList, { realMs: t0, webBase: 'http://h', ...opt });
check(l.petGachaList.length === 0 && l.gachaList[0].drawMedalTypeId === 9001, 'Catalog in cima');
check(pList.gacha.listedCurrency === 'spooky', 'listedCurrency della valuta elencata');
check(pList.drawTickets && pList.drawTickets.draw === 0, 'ticketsOf nella lista');
const e = l.gachaList.find((x) => x.drawMedalTypeId === first.drawMedalTypeId);
check(e.price === 1 && e.userLimitedCount === 0 && e.isDayLimited === 0, 'piastra: price da priceFor');
check(['validAdd', 'drawMedalTypeId', 'drawType', 'sortId', 'payType', 'price', 'lotCount', 'isDayLimited', 'userLimitedCount',
  'userWarrantDisplayOfTime', 'name', 'description', 'bannerUrl', 'warrantMedalIds', 'drawTicketlimitDate'].every((k) => k in e), 'campi obbligatori');
check(e.bannerUrl === `http://h/web/gacha/img/${first.drawMedalTypeId}.png`, 'bannerUrl');
const cat = l.gachaList[0];
check(cat.payType === 6 && cat.price === 1 && cat.drawType === 1, 'Catalog innocuo');
check(l.gachaList.every((x) => x.price >= 1 && x.payType !== 3 && x.payType !== 9), 'mai prezzo 0, payType 3 o 9');
l = g.gachaListData([inside], {}, { realMs: t0, webBase: 'http://h', ...opt });
check(l.gachaList.length === 2, 'senza payType 8');
const pNone = {};
g.gachaListData([inside], pNone, { realMs: t0, webBase: 'http://h', ...opt });
check(pNone.gacha.listedCurrency === 'draw', 'listedCurrency predefinita draw');

// limiti giornalieri
const lim3 = mk({ dayLimit: 3, prices: [100] });
const pd = { freeStone: 10000 };
const dopt = { realMs: t0, freeSlots: 100, sizes, storyQuest: 525, show: new Set() };
for (let i = 0; i < 3; i++) {
  check(g.checkDraw(lim3, pd, { count: 10 }, dopt) === null, `dayLimit 3: estrazione ${i + 1}`);
  g.payDraw(lim3, pd, t0, false);
}
check(g.checkDraw(lim3, pd, { count: 10 }, dopt) === 'limite giornaliero raggiunto', 'dayLimit 3: la quarta rifiutata');
check(g.checkDraw(lim3, pd, { count: 10 }, { ...dopt, realMs: next }) === null, 'dayLimit 3: il giorno dopo');
const vip1 = mk({ vipFree: true, prices: [0] });
const vip2 = mk({ vipFree: true, prices: [0] });
const pv = { freeStone: 10 };
const plate = (pp, b, ms) => g.gachaListData([b], pp, { realMs: ms, webBase: 'http://h', ...opt }).gachaList[1];
check(plate(pv, vip1, t0).userLimitedCount === 1 && plate(pv, vip1, t0).isDayLimited === 1, 'VIP: disponibile');
check(g.checkDraw(vip1, pv, { count: 10 }, dopt) === null, 'VIP: prima estrazione');
g.payDraw(vip1, pv, t0, false);
check(pv.freeStone === 9, 'VIP: 1 Jewel scalato');
check(g.checkDraw(vip2, pv, { count: 10 }, dopt) === 'estrazione gratuita VIP gia\' usata oggi', 'VIP: seconda Free Deal rifiutata');
check(plate(pv, vip1, t0).userLimitedCount === 0 && plate(pv, vip2, t0).userLimitedCount === 0, 'VIP: userLimitedCount 0 per entrambi');
check(plate(pv, vip2, next).userLimitedCount === 1 && g.checkDraw(vip2, pv, { count: 10 }, { ...dopt, realMs: next }) === null, 'VIP: il giorno dopo di nuovo 1');

// controlli dell'estrazione
const pc = { freeStone: 1000, limitedDrawTicket1: 0 };
const cheap = mk({ prices: [600], lotCount: 3 });
check(g.checkDraw(cheap, pc, { count: 3 }, dopt) === null, 'estrazione ok');
check(g.checkDraw(undefined, pc, { drawMedalTypeId: 1 }, dopt) !== null, 'banner sconosciuto');
check(g.checkDraw({ ...cheap, catalogOnly: 'VIP_TWIN' }, pc, { count: 3 }, dopt) === 'banner solo nel catalogo', 'catalogOnly');
check(g.checkDraw({ ...cheap, unlockQuest: 540 }, pc, { count: 3 }, dopt) === 'banner bloccato', 'banner bloccato');
check(g.checkDraw({ ...cheap, unlockQuest: 540 }, pc, { count: 3 }, { ...dopt, show: new Set([cheap.rowId]) }) === null, 'show sblocca');
for (const pt of [4, 5, 6, 9]) check(g.checkDraw({ ...cheap, payType: pt }, pc, { count: 3 }, dopt) === `payType ${pt} non estraibile`, `payType ${pt}`);
check(g.checkDraw(mk({ prices: [3000] }), pc, { count: 10 }, dopt) !== null, 'jewel insufficienti');
check(g.checkDraw(first, { freeStone: 1 }, { count: 10 }, dopt) === null, 'FIRST_FREE: basta 1 Jewel');
check(g.checkDraw(cheap, pc, { count: 3 }, { ...dopt, freeSlots: 2 }) !== null, 'box senza posti per 3');
check(g.checkDraw(mk({ prices: [10] }), pc, { count: 10 }, { ...dopt, sizes: new Set([1, 3]) }) !== null, 'dimensione senza animazione');
check(g.checkDraw(tSpooky, { drawTickets: { draw: 5, spooky: 0 } }, { count: 10 }, dopt) !== null, 'spooky: senza cookie');
check(g.checkDraw(tSpooky, { drawTickets: { draw: 0, spooky: 1 } }, { count: 10 }, dopt) === null, 'spooky: con cookie');

// pagamento
const pp = { freeStone: 5000, drawTickets: { draw: 2, holiday: 0, spooky: 3, moogle: 0 } };
check(g.payDraw(fall, pp, t0, false) === 3000 && pp.freeStone === 2000, 'FALLING: prima 3000');
check(g.payDraw(fall, pp, t0, true) === 2500 && pp.freeStone === -500, 'FALLING: poi 2500');
check(pp.gacha.count[fall.drawMedalTypeId] === 2, 'count incrementato');
check(pp.gacha.sinceFeatured[fall.drawMedalTypeId] === 0, 'sinceFeatured azzerato con la vetrina');
g.payDraw(fall, pp, t0, false);
check(JSON.stringify(g.drawState(pp, fall)) === '{"draws":3,"sinceFeatured":1}', 'drawState');
check(g.payDraw(tSpooky, pp, t0, false) === 1 && pp.drawTickets.spooky === 2 && pp.drawTickets.draw === 2, 'spooky: scala la valuta giusta');
check(JSON.stringify(g.drawState({}, fall)) === '{"draws":0,"sinceFeatured":0}', 'drawState vuoto');
const q = { limitedDrawTicket1: 3 };
g.payDraw(mk({ payType: 7, prices: [1], lotCount: 5 }), q, t0, false);
check(q.limitedDrawTicket1 === 2, 'biglietto Platinum scalato');

// campi del risultato
const r = g.drawResultFields([501, 502], [501]);
check(JSON.stringify(r) === JSON.stringify({ gachaBonus: { addType: 1, number: 0, userMedalIds: [] }, firstGetUserMedalIds: [501], userMedalIds: [501, 502], effectNumbers: [0, 0] }), 'campi del risultato');
check(g.catalogRow().drawMedalTypeId === 9001 && g.catalogRow().payType === 6 && g.catalogPlate('http://h').price === 1, 'piastra Catalog');

// piccole correzioni del Task 6
check((() => { try { return g.shopBanners([inside], { storyQuest: 525, storyDay: '2016-12-08', sizes }).length === 1; } catch { return false; } })(), 'shopBanners senza show');
const pNan = { drawTickets: {} };
g.payDraw(tSpooky, pNan, t0, false);
check(pNan.drawTickets.spooky === -1, 'spend su valuta assente: -1, non NaN');

// stato di un banner (spec 4.4)
check(g.RESTORED_QUEST === 525, 'RESTORED_QUEST 525');
const sctx = { storyQuest: 300, storyDay: '2016-05-12', sizes, show: new Set(), shown: new Set() };
const sb = (o) => mk({ endSource: 'original', unlockQuest: 200, start: '2016-05-01', end: '2016-05-30', ...o });
const inShop = sb({});
const st = (b, c = {}) => g.stateOf(b, { ...sctx, shown: new Set([inShop.drawMedalTypeId]), ...c });
check(JSON.stringify(st(inShop)) === '{"key":"now","text":"In the Shop now"}', `stato now: ${JSON.stringify(st(inShop))}`);
check(JSON.stringify(st(sb({ unlockQuest: 450 }))) === '{"key":"locked","text":"Unlocks after Story Quest 450"}', 'stato locked 450');
check(JSON.stringify(st(sb({ unlockQuest: 600 }))) === '{"key":"locked","text":"Unlocks after Story Quest 600 — coming with a future update"}', 'stato locked 600');
check(st(sb({ catalogOnly: 'PVP_TICKETS' })).text === 'Requires PvP tickets — coming with a future update', 'stato PvP');
check(st(sb({ catalogOnly: 'DRAW_POINTS' })).text === 'Draw Points — coming with a future update', 'stato Draw Points');
check(st(sb({ catalogOnly: 'VIP_TWIN' })).text === 'VIP variant, not reproduced', 'stato VIP_TWIN');
check(st(sb({ catalogOnly: 'INCOMPLETE' })).text === 'Original details missing — not available', 'stato INCOMPLETE');
check(st(sb({ lotCount: 5 })).text === 'This draw size is not available yet', 'stato dimensione');
const notNow = sb({});
check(JSON.stringify(g.stateOf(notNow, sctx)) === '{"key":"later","text":"Not in the Shop now"}', 'stato fuori periodo');

// pagine
const medalNames = new Map([[1, 'Alpha'], [2, 'Beta'], [3, 'Gamma'], [301495, 'Fairy LV1'], [301496, 'Fairy LV2'], [301497, 'Fairy LV3']]);
const cb = [sb({ name: 'A <b>bold</b>' }), sb({ name: 'Second', catalogOnly: 'VIP_TWIN', start: '2016-06-01', endSource: 'estimated' }), inShop];
const cp = g.catalogPage(cb, { ...sctx, shown: new Set([inShop.drawMedalTypeId]) });
check((cp.match(/loading="lazy"/g) || []).length === 3, 'catalogo: 3 immagini lazy');
check(cp.includes('A &lt;b&gt;bold&lt;/b&gt;') && !cp.includes('<b>bold'), 'catalogo: escape del nome');
check(cp.includes('In the Shop now') && cp.includes('VIP variant, not reproduced'), 'catalogo: stati');
check(cp.includes(`/web/gacha/detail/${cb[0].drawMedalTypeId}`), 'catalogo: link ai dettagli');
check(cp.includes('3 original banners. Banners unlock with the Story, as in the original game.'), 'catalogo: intestazione');
check(cp.includes('(end date reconstructed)') && (cp.match(/end date reconstructed/g) || []).length === 1, 'catalogo: data fine ricostruita solo dove serve');

const exA = { pool: { 5: [1], 4: [2, 3] }, featuredIds: [1], listIds: [1], listNames: [['Alpha', 2, { 5: [1] }]], featuredNames: [['Alpha', 1, { 5: [1] }]], weighted: [] };
const bA = sb({ rarityMix: [[5, 1], [4, 2]], lotCount: 3, guarantee: { list: ['Alpha'], count: 1, pity: 7, every: 3 } });
const dp = g.detailPage(bA, exA, medalNames, sctx);
check(dp.includes('Draw rates') && /reconstructed/.test(dp), 'dettagli: Draw rates e reconstructed');
check(dp.includes('Medal rarities of each draw: original'), 'dettagli: composizione original');
check(dp.includes('Featured Medal guaranteed within 7 draws (original)'), 'dettagli: pity');
check(dp.includes('every 3rd draw') && dp.includes('one of the listed Medals, featured Medals twice as likely'), 'dettagli: slot a lista con every');
check(dp.includes('Beta') && dp.includes('Gamma') && dp.includes('Alpha'), 'dettagli: medaglie');
check(dp.includes('4★ 94%') && dp.includes('5★ 6%'), 'dettagli: percentuali dello slot');
const bS = sb({ skill: { table: '50106', slots: 'first' } });
const dS = g.detailPage(bS, exA, medalNames, sctx);
check(dS.includes('(original rates, notice)') && dS.includes('Attack Boost II') && dS.includes('No Cost'), 'dettagli skill: tabella');
const dS2 = g.detailPage(bS, exA, medalNames, { ...sctx, skillNames: new Set(['Lux Plus']) });
check(dS2.includes('Lux Plus') && !dS2.includes('Attack Boost II'), 'dettagli skill: solo le presenti');
const bE = sb({ type: 'T_EVOLVE', payType: 4, currency: 'bronze', pool: { mode: 'evolve', evolve: [[301495, 1], [301496, 2], [301497, 3]] } });
const exE = gd.expandPool(bE, {}, bE.start);
const dE = g.detailPage(bE, exE, medalNames, sctx);
check(dE.includes('Fairy LV3') && dE.includes('10%') && dE.includes('45%'), 'dettagli evolve: livelli con percentuali');
const op = g.oddsPage([{ banner: bA, ex: exA }, { banner: bE, ex: exE, medalNames }]);
check(op.includes('Draw Odds') && op.includes('Second') === false && op.includes(bA.name), 'odds: sezione per banner');
check((op.match(/class="b"/g) || []).length === 2, 'odds: una sezione per banner');
check(op.includes('Medal 1') && op.includes('Medal 3') && op.includes('every 3rd draw') && op.includes('Fairy LV3'), 'odds: righe degli slot');

// fix round 1
const d3 = g.detailPage(sb({ dayLimit: 3 }), exA, medalNames, sctx);
check(d3.includes('3 times per day') && !d3.includes('once per day'), 'dettagli: dayLimit 3');
check(g.detailPage(sb({ dayLimit: 1 }), exA, medalNames, sctx).includes('once per day'), 'dettagli: dayLimit 1');
const dF = g.detailPage(sb({ prices: [3000, 2500, 2200, 2000, 1900] }), exA, medalNames, sctx);
check(dF.includes('Price falls with each draw: 3,000 → 2,500 → 2,200 → 2,000 → 1,900 Jewels'), 'dettagli: prezzo in calo');
check(g.detailPage(sb({ prices: [0, 3000] }), exA, medalNames, sctx).includes('First draw: 1 Jewel, then 3,000 Jewels'), 'dettagli: FIRST_FREE');
check(!g.detailPage(sb({}), exA, medalNames, sctx).includes('Price falls'), 'dettagli: prezzo unico senza riga');
const inc = sb({ catalogOnly: 'INCOMPLETE', lotCount: null, prices: [], rarityMix: undefined, name: 'Mancante', guaranteesText: 'Nota X' });
const dI = g.detailPage(inc, undefined, medalNames, sctx);
check(dI.includes('Mancante') && dI.includes('Original details missing') && dI.includes('Nota X') && !dI.includes('Draw rates') && !dI.includes('? Medals'), 'dettagli INCOMPLETE');
check(!g.catalogPage([inc], sctx).includes('? Medals'), 'catalogo INCOMPLETE: niente riga prezzo');
check(!g.oddsPage([{ banner: inc, ex: undefined }]).includes('Mancante'), 'odds: INCOMPLETE saltato');
check(gd.limitText({ dayLimit: 5 }) === '5 times per day' && gd.limitText({ vipFree: true }) === 'once per day' && gd.limitText({}) === '', 'limitText');

if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: gacha');
