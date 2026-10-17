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
// I-138: [fn] rifiuta la lista se un campo manca o ha il tipo sbagliato (JSON.stringify toglie gli undefined).
// Tipi della piastra Catalog e di quelle del sotto-progetto 1 che funzionavano al banco.
const PLATE_TYPES = {
  validAdd: 'int', drawMedalTypeId: 'int', drawType: 'int', sortId: 'int', payType: 'int', price: 'int', lotCount: 'int',
  isDayLimited: 'int', userLimitedCount: 'int', userWarrantDisplayOfTime: 'int', name: 'string', description: 'string',
  bannerUrl: 'string', warrantMedalIds: 'array', drawTicketlimitDate: 'string',
};
const typeOf = (v) => (Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'int' : typeof v);
const ord = [mk({ start: '2016-12-02' }), mk({ start: '2016-12-07' }), perm, mk({ start: '2016-12-05' }), mk({ start: '2016-12-07' })];
const lo = JSON.parse(JSON.stringify(g.gachaListData(ord, { freeStone: 0 }, { realMs: t0, webBase: 'http://h', ...opt })));
const badPlates = lo.gachaList.flatMap((x) => Object.entries(PLATE_TYPES).filter(([k, t]) => typeOf(x[k]) !== t)
  .map(([k, t]) => `${x.drawMedalTypeId}.${k}=${JSON.stringify(x[k])} (atteso ${t})`));
check(badPlates.length === 0, `campi e tipi delle piastre: ${badPlates.join(', ')}`);
// Il client ordina le piastre per sortId crescente (mappa di [fn]): Catalog prima, poi l'ordine di shopBanners.
const wantIds = [9001, ...g.shopBanners(ord, opt).map((b) => b.drawMedalTypeId)];
const bySort = [...lo.gachaList].sort((a, b) => a.sortId - b.sortId);
check(JSON.stringify(bySort.map((x) => x.drawMedalTypeId)) === JSON.stringify(wantIds), `ordine per sortId: ${bySort.map((x) => x.drawMedalTypeId)}`);
check(new Set(lo.gachaList.map((x) => x.sortId)).size === lo.gachaList.length, 'sortId distinti');
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
// banner del lancio (unlockQuest 0, Task 8b): mai «Unlocks after Story Quest 0», anche a inizio storia
check(JSON.stringify(g.stateOf(sb({ unlockQuest: 0 }), { ...sctx, storyQuest: 0 })) === '{"key":"later","text":"Not in the Shop now"}', 'stato unlockQuest 0');
check(g.shopBanners([sb({ unlockQuest: 0, start: '2016-04-07', end: '2016-04-30' })], { ...sctx, storyQuest: 0, storyDay: '2016-04-07' }).length === 1, 'unlockQuest 0: in lista dalla quest 0');

// pagine
const medalNames = new Map([[1, 'Alpha'], [2, 'Beta'], [3, 'Gamma'], [301495, 'Fairy LV1'], [301496, 'Fairy LV2'], [301497, 'Fairy LV3']]);
const cb = [sb({ name: 'A <b>bold</b>' }), sb({ name: 'Second', catalogOnly: 'VIP_TWIN', start: '2016-06-01', endSource: 'estimated' }), inShop];
const cp = g.catalogPage(cb, { ...sctx, shown: new Set([inShop.drawMedalTypeId]) });
check((cp.match(/loading="lazy"/g) || []).length === 3, 'catalogo: 3 immagini lazy');
check(cp.includes('A &lt;b&gt;bold&lt;/b&gt;') && !cp.includes('<b>bold'), 'catalogo: escape del nome');
check(cp.includes('In the Shop now') && cp.includes('VIP variant, not reproduced'), 'catalogo: stati');
check(cp.includes(`/web/gacha/detail/${cb[0].drawMedalTypeId}`), 'catalogo: link ai dettagli');
check(cp.includes('3 original banners. Banners unlock as you progress through the Story; in the original game they followed the calendar.'), 'catalogo: intestazione');
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

// correzione finale B: totalLimit («Available once», Ruling 28), contato su player.gacha.count
const once = mk({ prices: [0], totalLimit: 1 });
const po = { freeStone: 10 };
check(plate(po, once, t0).isDayLimited === 1 && plate(po, once, t0).userLimitedCount === 1, 'totalLimit: disponibile, isDayLimited 1');
check(g.checkDraw(once, po, { count: 10 }, dopt) === null, 'totalLimit: prima estrazione');
g.payDraw(once, po, t0, false);
check(g.checkDraw(once, po, { count: 10 }, dopt) === 'limite totale raggiunto', 'totalLimit: seconda rifiutata');
check(g.checkDraw(once, po, { count: 10 }, { ...dopt, realMs: next }) === 'limite totale raggiunto', 'totalLimit: rifiutata anche il giorno dopo');
check(po.freeStone === 9 && plate(po, once, next).userLimitedCount === 0, 'totalLimit: 1 Jewel scalato una volta, 0 rimanenti');
const three = mk({ prices: [100], totalLimit: 3 });
const p3 = { freeStone: 1000 };
g.payDraw(three, p3, t0, false);
check(plate(p3, three, t0).userLimitedCount === 2, 'totalLimit 3: 2 rimanenti');
const both = mk({ prices: [100], totalLimit: 5, dayLimit: 1 });
const pb = { freeStone: 1000, gacha: { count: { [both.drawMedalTypeId]: 4 } } };
check(plate(pb, both, t0).userLimitedCount === 1, 'dayLimit e totalLimit: il minore');
g.payDraw(both, pb, t0, false);
check(g.checkDraw(both, pb, { count: 10 }, { ...dopt, realMs: next }) === 'limite totale raggiunto', 'dayLimit e totalLimit: il totale vince il giorno dopo');
check(gd.limitText({ totalLimit: 1 }) === 'once' && gd.limitText({ totalLimit: 3 }) === '3 times in total' && gd.limitText({ dayLimit: 1, totalLimit: 0 }) === 'once per day', 'limitText totalLimit');
check(g.detailPage(sb({ totalLimit: 1 }), exA, medalNames, sctx).includes('for 10 Medals, once.'), 'dettagli: once');

// correzione finale D: garanzia non riprodotta (lista o vetrina vuote alla data del banner)
const NR = 'This guarantee is not reproduced yet.';
const exNo = { ...exA, listNames: [], featuredNames: [] };
const dNL = g.detailPage(sb({ guarantee: { list: ['Alpha'], count: 1, pity: null, every: null }, guaranteesText: 'Guarantees one of the following Medals: Alpha.' }), exNo, medalNames, sctx);
check(dNL.includes(NR), 'dettagli: lista vuota alla data -> non riprodotta');
const dNP = g.detailPage(sb({ guarantee: { list: [], count: 0, pity: 10, every: null } }), exNo, medalNames, sctx);
check(dNP.includes(`Featured Medal guaranteed within 10 draws (original). ${NR}`), 'dettagli: pity senza vetrina -> non riprodotta');
check(!g.detailPage(bA, exA, medalNames, sctx).includes(NR), 'dettagli: garanzie risolte, nessun avviso');
check(!g.detailPage(sb({}), exNo, medalNames, sctx).includes(NR), 'dettagli: nessuna garanzia, nessun avviso');
check(g.oddsPage([{ banner: sb({ guarantee: { list: [], count: 0, pity: 10, every: null } }), ex: exNo }]).includes(NR), 'odds: pity non riprodotta');

// --- sotto-progetto 2b, Task 6: striscia della garanzia sulla piastra (warrantFields) ---
// con validComment 0 (ogni banner con pity, make-banners.warrantOf) il client legge i nomi di warrantMedalIds:
// una lista vuota lo manda in crash (Review Focus 4)
try {
  const WCAT = { firstRarity: { 5: '2016-04-07', 6: '2016-07-15', 7: '2018-05-25' }, story: [], subsets: {}, medals: {
    'hd axel': { date: '2016-04-07', std: true, ids: [[51, 5, '2016-04-07', 4], [71, 7, '2018-05-25', 4]] },
    wakka: { date: '2016-04-07', std: true, ids: [[15, 5, '2016-04-07', 1]] },
  } };
  const WG = (o) => ({ list: [], count: 0, pity: 5, every: null, slots: [], pityNames: ['hd axel'], pityStar: 7, pitySlot: 0, pityGift: null, ...o });
  const wb = (o) => mk({ start: '2018-06-01', end: '2018-06-30', rarityMix: [[7, 1], [5, 9]], pool: { mode: 'released', sets: [], names: [], featured: [], filter: [] }, guarantee: WG({}), ...o });
  const bw = wb({});
  const exW = gd.expandPool(bw, WCAT, '2018-06-01');
  const wf = (b, ex, s) => JSON.stringify(g.warrantFields(b, ex, { draws: s, sinceFeatured: s }));
  check(wf(bw, exW, 0) === '{"userWarrantDisplayOfTime":5,"warrantMedalIds":[71]}', `warrantFields pity 5, 0 di fila: ${wf(bw, exW, 0)}`);
  check(wf(bw, exW, 1) === '{"userWarrantDisplayOfTime":4,"warrantMedalIds":[71]}', `warrantFields 1 di fila: ${wf(bw, exW, 1)}`);
  check(wf(bw, exW, 4) === '{"userWarrantDisplayOfTime":1,"warrantMedalIds":[71]}', `warrantFields 4 di fila: ${wf(bw, exW, 4)}`);
  // pity senza bersagli alla data: striscia nascosta (0), lista mai vuota (primo id del pool)
  const bNo = wb({ guarantee: WG({ pityNames: ['nessuno'] }) });
  const exNoW = gd.expandPool(bNo, WCAT, '2018-06-01');
  const firstPool = Object.values(exNoW.pool).flat()[0];
  check(exNoW.pityIds.length === 0 && wf(bNo, exNoW, 2) === `{"userWarrantDisplayOfTime":0,"warrantMedalIds":[${firstPool}]}`, `warrantFields senza bersagli: ${wf(bNo, exNoW, 2)}`);
  // senza pity: la striscia di oggi
  const bFree = wb({ guarantee: WG({ pity: null, pityNames: [] }) });
  check(wf(bFree, gd.expandPool(bFree, WCAT, '2018-06-01'), 0) === '{"userWarrantDisplayOfTime":1,"warrantMedalIds":[]}', 'warrantFields senza pity: {1, []}');
  // pityGift (medaglia di supporto nel Present Box): conto alla rovescia sul regalo
  const bGift = wb({ guarantee: WG({ pity: 10, pityNames: [], pityStar: null, pitySlot: null, pityGift: [3, 301684, 1] }) });
  check(wf(bGift, gd.expandPool(bGift, WCAT, '2018-06-01'), 3) === '{"userWarrantDisplayOfTime":7,"warrantMedalIds":[301684]}', `warrantFields pityGift: ${wf(bGift, gd.expandPool(bGift, WCAT, '2018-06-01'), 3)}`);
  // catalogo vecchio (senza slots): la vetrina
  const bOld = wb({ guarantee: { list: [], count: 0, pity: 5, every: null }, pool: { mode: 'released', sets: [], names: [], featured: ['hd axel'], filter: [] } });
  check(wf(bOld, gd.expandPool(bOld, WCAT, '2018-06-01'), 0) === '{"userWarrantDisplayOfTime":5,"warrantMedalIds":[51,71]}', `warrantFields catalogo vecchio: ${wf(bOld, gd.expandPool(bOld, WCAT, '2018-06-01'), 0)}`);
  // nella lista: exFor da' il pool; la piastra Catalog resta {1, []}
  const wopt = { ...opt, storyDay: '2018-06-10' };
  const pw6 = { freeStone: 0, gacha: { sinceFeatured: { [bw.drawMedalTypeId]: 3 } } };
  const lw = g.gachaListData([bw, bFree], pw6, { realMs: t0, webBase: 'http://h', ...wopt, exFor: (b) => gd.expandPool(b, WCAT, '2018-06-01') });
  const pwB = lw.gachaList.find((x) => x.drawMedalTypeId === bw.drawMedalTypeId), pwF = lw.gachaList.find((x) => x.drawMedalTypeId === bFree.drawMedalTypeId);
  check(pwB && pwB.userWarrantDisplayOfTime === 2 && JSON.stringify(pwB.warrantMedalIds) === '[71]', `lista: piastra con pity ${JSON.stringify(pwB)}`);
  check(pwF && pwF.userWarrantDisplayOfTime === 1 && pwF.warrantMedalIds.length === 0, 'lista: piastra senza pity {1, []}');
  check(lw.gachaList[0].userWarrantDisplayOfTime === 1 && lw.gachaList[0].warrantMedalIds.length === 0, 'lista: piastra Catalog {1, []}');
  // fix 1: senza pool (expandFor lancia: ex undefined) o con il pool vuoto la lista resta non vuota (ids del
  // catalogo dei pityNames, poi una medaglia qualsiasi del banner) e lo slot vuoto si scrive nel log
  const wlog = [], olog = console.log;
  console.log = (...a) => wlog.push(a.join(' '));
  let fU, fE, fN;
  try {
    fU = g.warrantFields(bw, undefined, { sinceFeatured: 1 }, WCAT);
    fE = g.warrantFields(bNo, { ...exNoW, pool: {} }, { sinceFeatured: 0 }, WCAT);
    const bNames = wb({ guarantee: WG({ pityNames: ['nessuno'] }), pool: { mode: 'sets', sets: [], names: ['wakka'], featured: [], filter: [] } });
    fN = g.warrantFields(bNames, { pool: {}, pityIds: [] }, { sinceFeatured: 0 }, WCAT);
  } finally { console.log = olog; }
  check(fU.userWarrantDisplayOfTime === 0 && JSON.stringify(fU.warrantMedalIds) === '[51,71]', `warrantFields senza pool: ids del catalogo dei pityNames (${JSON.stringify(fU)})`);
  check(fN.userWarrantDisplayOfTime === 0 && JSON.stringify(fN.warrantMedalIds) === '[15]', `warrantFields senza pool ne' bersagli: una medaglia del banner (${JSON.stringify(fN)})`);
  check(fE.warrantMedalIds.length > 0 && wlog.some((x) => new RegExp(bNo.rowId).test(x)), `warrantFields pool vuoto: lista non vuota e log (${JSON.stringify(fE)} | ${wlog.join(' | ')})`);
} catch (err) { errors.push(`warrantFields: eccezione ${err.message}`); }

// Task 7: pagine dei Details e Draw Odds con garanzie v3 e potenziamenti
try {
  const g6 = (o = {}) => sb({
    name: 'B0306 sintetico', rarityMix: [[7, 1], [6, 1], [4, 8]], lotCount: 10,
    guarantee: {
      list: ['alpha'], count: 1, slot: 1, pity: 5, every: null,
      slots: [{ kind: 'tier', slot: 0, count: 1, star: 7, names: [], tierMin: null, tierMax: 4 }, { kind: 'list', slot: 1, count: 1, star: 6, names: ['alpha'], tierMin: null, tierMax: null }],
      pityNames: ['hd axel'], pityStar: 7, pitySlot: 0, pityGift: null, erratum: null, source: null, ...(o.guarantee || {}),
    },
    enhance: { preset: [], boosted: [], maxSkill: [], notReproduced: [], ...(o.enhance || {}) },
  });
  const ex6 = { pool: { 7: [1], 6: [2], 4: [3] }, featuredIds: [], listIds: [], listNames: [], featuredNames: [], weighted: [], slotNames: [[], [['alpha', 1, { 6: [2] }]]],
    pityNames: [['hd axel', 1, { 7: [1] }]], pityIds: [1], tiers: new Map(), medalInfo: new Map() };
  const d6 = g.detailPage(g6(), ex6, medalNames, sctx);
  check(d6.includes('1x 7★ Tier 4 or lower'), 'T7: riga slot Tier');
  check(d6.includes('1x one of the listed Medals (6★)'), 'T7: riga slot lista');
  check(d6.includes('Alpha (7★) guaranteed within 5 draws (original)'), `T7: riga pity v3 (${d6.replace(/<[^>]+>/g, ' ').slice(0, 600)})`);
  check(!d6.includes('not reproduced yet'), 'T7: pity v3 con bersagli non e NOT_REPRODUCED (ex.pityNames)');
  const dNo = g.detailPage(g6(), { ...ex6, pityNames: [], pityIds: [] }, medalNames, sctx);
  check(dNo.includes('This guarantee is not reproduced yet.'), 'T7: pity v3 senza bersagli alla data: non riprodotta');
  const dOld = g.detailPage(bA, { ...exA, featuredNames: [] }, medalNames, sctx);
  check(dOld.includes('This guarantee is not reproduced yet.'), 'T7: percorso vecchio senza slots invariato');
  const dBs = g.detailPage(g6({ enhance: { boosted: [{ on: { names: ['alpha'] }, str: 1000, def: 1000, chance: 'small' }] } }), ex6, medalNames, sctx);
  check(dBs.includes('Small chance of a boosted version (+1000 STR, +1000 DEF): 5% per eligible Medal (reconstructed)'), 'T7: boosted small con nomi');
  const dBt = g.detailPage(g6({ enhance: { boosted: [{ on: { star: 7, tierMin: 1, tierMax: 4 }, str: 1000, def: 1000, chance: 'small' }] } }), ex6, medalNames, sctx);
  check(dBt.includes('Small chance of a boosted version (+1000 STR, +1000 DEF, reconstructed): 5% per eligible Medal (reconstructed)'), 'T7: boosted a Tier con valori ricostruiti');
  const dBg = g.detailPage(g6({ enhance: { boosted: [{ on: { slots: [0] }, str: 2000, def: 0, chance: 'guaranteed' }] } }), ex6, medalNames, sctx);
  check(dBg.includes('boosted version guaranteed (+2000 STR)'), 'T7: boosted garantita');
  const dPs = g.detailPage(g6({ enhance: { preset: [{ on: { slots: [0] }, dots: 'max', guilt: 'max' }] } }), ex6, medalNames, sctx);
  check(dPs.includes('comes with its Special Attack Bonus maxed (original)'), 'T7: preset');
  // decisione 13-bis: con i preset elencati e slot 7★, la riga della regola generale alle date dei notice (Tier 9 dal
  // 2019-01-01, Tier 10 dal 2019-09-01); prima del 2019 e senza preset nessuna riga
  const dPsAt = (start) => g.detailPage({ ...g6({ enhance: { preset: [{ on: { slots: [0] }, dots: 'max', guilt: 'max' }] } }), start, end: '2021-06-30' }, ex6, medalNames, sctx);
  check(!/Tier 9/.test(dPs), 'T7: niente riga 13-bis su un banner del 2016');
  check(!/Tier 9/.test(dPsAt('2018-12-31')), 'T7: niente riga 13-bis il 2018-12-31');
  check(dPsAt('2019-01-01').includes('Any 7★ Tier 9 Medal: comes with its Special Attack Bonus maxed (original)'), 'T7: riga 13-bis Tier 9 dal 2019-01-01');
  check(!dPsAt('2019-08-31').includes('Tier 9-10'), 'T7: riga 13-bis senza Tier 10 il 2019-08-31');
  check(dPsAt('2019-09-01').includes('Any 7★ Tier 9-10 Medal: comes with its Special Attack Bonus maxed (original)'), 'T7: riga 13-bis Tier 9-10 dal 2019-09-01');
  check(!/Tier 9/.test(g.detailPage({ ...g6(), start: '2019-09-01', end: '2021-06-30' }, ex6, medalNames, sctx)), 'T7: niente riga 13-bis senza preset');
  const dMs = g.detailPage(g6({ enhance: { maxSkill: [{ on: { names: ['zexion [+]'] }, skills: ['paralysis+ ii max'] }] } }), ex6, medalNames, sctx);
  check(/Max-level Skill/.test(dMs) && dMs.includes('Zexion [+]'), 'T7: maxSkill');
  const dEr = g.detailPage(g6({ guarantee: { erratum: 'Original text: <b>5 draws</b>' } }), ex6, medalNames, sctx);
  check(/<div class="box">[^]*Original text: &lt;b&gt;5 draws&lt;\/b&gt;/.test(dEr), 'T7: erratum in un riquadro (escape)');
  for (const [k, t] of [['trait', 'Trait Medal: not reproduced, a regular Medal of the same rarity instead'], ['skill', 'max-level Skill'], ['epic', 'Epic'], ['pity', 'Pity Medal'], ['traitSlots', 'Trait'], ['imitation', 'Imitation Medal']]) {
    const dn = g.detailPage(g6({ enhance: { notReproduced: [k] } }), ex6, medalNames, sctx);
    check(dn.includes(t), `T7: notReproduced ${k}`);
  }
  const dGift = g.detailPage(g6({ guarantee: { pityNames: ['dual meow wow'], pityStar: 4, pityGift: [3, 301684, 1] } }), { ...ex6, pityNames: [], pityIds: [] }, medalNames, sctx);
  check(dGift.includes('Dual Meow Wow') && dGift.includes('sent to your Present Box (original: included in the draw)') && !dGift.includes('not reproduced yet'), 'T7: pityGift nel Present Box');
  const op6 = g.oddsPage([{ banner: g6(), ex: ex6, medalNames }]);
  check(op6.includes('Tier 4 or lower') && op6.includes('one of the listed Medals'), `T7: odds con kind (${op6.replace(/<[^>]+>/g, ' ').slice(0, 400)})`);
  // fix 1: escape, nomi del master, boosted garantita a Tier
  const mn = new Map([[1, 'Tifa & <Aerith>']]);
  const exAmp = { ...ex6, pityNames: [['tifa & aerith', 1, { 7: [1] }]], pityIds: [1], medalInfo: new Map([[1, { name: 'tifa & aerith', rare: 7 }]]) };
  const gAmp = g6({ guarantee: { pityNames: ['tifa & aerith'] }, enhance: { boosted: [{ on: { names: ['tifa & aerith'] }, str: 1000, def: 1000, chance: 'small' }] } });
  const dAmp = g.detailPage(gAmp, exAmp, mn, sctx);
  check(dAmp.includes('Tifa &amp; &lt;Aerith&gt; (7★) guaranteed within 5 draws') && !dAmp.includes('<Aerith>'), 'T7 fix1: pity con & e < escapata, nome dal master');
  check(dAmp.includes('Tifa &amp; &lt;Aerith&gt;: Small chance'), 'T7 fix1: nome del master anche nei potenziamenti');
  const oAmp = g.oddsPage([{ banner: gAmp, ex: exAmp, medalNames: mn }]);
  check(oAmp.includes('Tifa &amp; &lt;Aerith&gt; (7★) guaranteed') && !oAmp.includes('<Aerith>'), 'T7 fix1: odds escapata');
  const dFb = g.detailPage(gAmp, exAmp, new Map(), sctx);
  check(dFb.includes('Tifa &amp; Aerith (7★) guaranteed'), 'T7 fix1: senza id risolto niceName');
  const dBtg = g.detailPage(g6({ enhance: { boosted: [{ on: { star: 7, tierMin: 1, tierMax: 4 }, str: 1000, def: 1000, chance: 'guaranteed' }] } }), ex6, medalNames, sctx);
  check(dBtg.includes('boosted version guaranteed (+1000 STR, +1000 DEF, reconstructed)') && dBtg.includes('7★ Tier 1-4 Medals'), 'T7 fix1: boosted garantita a Tier');
} catch (err) { errors.push(`T7: eccezione ${err.stack}`); }

if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: gacha');
