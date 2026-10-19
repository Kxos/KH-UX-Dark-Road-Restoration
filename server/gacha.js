// Shop > Draw: lista, estrazione e pagine WebView (docs/notes/shop.md; spec 2026-10-16-shop-banner-design.md 9.4-9.7).
// GET /gacha/list (azione 75): gachaList[] ([fn], campi tutti obbligatori) e petGachaList[]
// (obbligatorio anche vuoto: senza, «200 ERROR :75»). Il client la richiede a ogni apertura dello Shop
// e dopo ogni estrazione; la chiusura della WebView di Details NON la richiede ([fn]).
// POST /gacha/draw (azione 76): corpo {drawMedalTypeId, count = lotCount}; il client controlla prima
// jewel/biglietti e 1 posto nel box, poi apre la scena e rilegge GET /user/stone: i jewel li scala il
// server qui. Risposta in server.js (respondGachaDraw).
// Lista PROVVISORIA (fino al sotto-progetto 3): i banner del catalogo estraibili, sbloccati dalla storia
// (unlockQuest) e attivi alla data del punto della storia (i PERMANENT con le loro date originali), piu'
// quelli di `show` (rowId); al massimo SHOP_MAX, i piu' recenti prima. Prezzi dinamici (9.4: mai 0,
// FIRST_FREE/FALLING dal contatore del giocatore); Free Deal VIP: una sola gratuita al giorno fra tutte
// (9.5); payType 4/5/6/9 solo nel catalogo (9.6); payType 8 = valute stagionali separate in
// player.drawTickets, mai due valute insieme nella lista (9.7).
'use strict';
const clock = require('./clock');
const gd = require('./gacha-data');
const BOOST_PCT = gd.BOOST_SMALL_CHANCE * 100;
const { SKILL_TABLES } = gd;

const SHOP_MAX = 8;
const WALLET = { 1: 'freeStone', 7: 'limitedDrawTicket1' }; // payType 8: player.drawTickets[currency]
const TICKET_CURRENCIES = ['draw', 'holiday', 'spooky', 'moogle'];
const VIP_FREE = 'vipFree'; // chiave del limite condiviso delle Free Deal VIP (spec 9.5)

// Contatori delle valute payType 8: crea player.drawTickets e migra limitedDrawTicket2 una volta.
function ticketsOf(player) {
  if (!player.drawTickets) {
    player.drawTickets = Object.fromEntries(TICKET_CURRENCIES.map((c) => [c, 0]));
    player.drawTickets.draw = player.limitedDrawTicket2 || 0; // salvataggi del sotto-progetto 1
    delete player.limitedDrawTicket2;
  }
  return player.drawTickets;
}
const walletName = (b) => (b.payType === 8 ? `drawTickets.${b.currency}` : WALLET[b.payType]);
function balance(player, b) {
  if (b.payType === 8) return ticketsOf(player)[b.currency] || 0;
  return player[WALLET[b.payType]] || 0;
}
function spend(player, b, n) {
  if (b.payType === 8) { const t = ticketsOf(player); t[b.currency] = (t[b.currency] || 0) - n; }
  else player[WALLET[b.payType]] = (player[WALLET[b.payType]] || 0) - n;
}
// player.gacha = {day, used: {id: n, vipFree: n}, count: {id: n}, sinceFeatured: {id: n}, listedCurrency}
const gstate = (player) => (player.gacha ||= {});
const drawCount = (player, b) => gstate(player).count?.[b.drawMedalTypeId] || 0;
// Prezzo della prossima estrazione: lo scalino di prices per le estrazioni gia' fatte, mai sotto 1.
function priceFor(b, player) {
  const p = b.prices || [];
  return Math.max(1, p.length ? p[Math.min(drawCount(player, b), p.length - 1)] : 1);
}
const drawable = (b, sizes) => !b.catalogOnly && [1, 7, 8].includes(b.payType) && sizes.has(b.lotCount);
const activeOn = (b, day) => b.start <= day && day <= (b.end || '2099-12-31');

function shopBanners(banners, { storyQuest, storyDay, sizes, show = new Set() }) {
  const pick = banners.filter((b) => drawable(b, sizes)
    && ((b.unlockQuest <= storyQuest && activeOn(b, storyDay)) || show.has(b.rowId)))
    .sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : a.drawMedalTypeId - b.drawMedalTypeId));
  let currency = null;
  const out = [];
  for (const b of pick) {
    if (b.payType === 8) { if (currency && currency !== b.currency) continue; currency = b.currency; }
    out.push(b);
    if (out.length === SHOP_MAX) break;
  }
  return out;
}

// Piastra «Banner Catalog» (spec 4.1): Gold Ticket (payType 6, drawTicket3 sempre 0) prezzo 1: pulsante
// grigio, il tocco non manda richieste ([fn]); Details apre il catalogo (detailUrl del master).
function catalogRow() {
  return gd.drawMedalTypeRow({ drawMedalTypeId: gd.CATALOG_ID, name: 'Banner Catalog', payType: 6, price: 1, sortId: 1,
    bannerUrl: `/web/gacha/img/${gd.CATALOG_ID}.png`, detailUrl: '/web/gacha/catalog', comment: 'Open Details to browse all banners' });
}

// sortId: il client ([fn]) raggruppa le piastre in una mappa per sortId della lista (non quello del master,
// che non legge) e le mostra per sortId crescente, poi drawMedalTypeId: un numero intero diverso per ogni piastra
// (senza, JSON.stringify lo toglie e [fn] rifiuta la lista: «200 ERROR :75», I-138).
function plate(b, webBase, userLimitedCount, price, sortId, warrant = warrantFields({})) {
  return {
    validAdd: 0, drawMedalTypeId: b.drawMedalTypeId, drawType: 1, sortId, payType: b.payType, price,
    lotCount: b.lotCount, isDayLimited: b.dayLimit || b.vipFree || b.totalLimit ? 1 : 0, userLimitedCount,
    userWarrantDisplayOfTime: warrant.userWarrantDisplayOfTime,
    name: b.name, description: b.name, bannerUrl: `${webBase}/web/gacha/img/${b.drawMedalTypeId}.png`,
    warrantMedalIds: warrant.warrantMedalIds, drawTicketlimitDate: '2030-12-31 23:59:59',
  };
}

// Striscia della garanzia sulla piastra (sotto-progetto 2b, ricerca §2). Senza pity: la striscia di oggi
// (userWarrantDisplayOfTime 1 con warrantDisplayOfTime 1 del master: compare il comment). Con pity il master ha
// warrantDisplayOfTime = pity e validComment 0 (make-banners.warrantOf): il client scrive «<nome> guaranteed in N
// tries!» con N = userWarrantDisplayOfTime e i nomi di warrantMedalIds, che con validComment 0 NON puo' essere
// vuota (crash, Review Focus 4). N = estrazioni che mancano alla pity (pity - sinceFeatured, mai sotto 1);
// warrantMedalIds = i bersagli alla stella promessa (ex.pityIds; catalogo vecchio senza slots: la vetrina), la
// medaglia del pityGift (Present Box), oppure, se la pity non ha bersagli alla data, 0 (striscia nascosta) e il
// primo id del pool, solo perche' la lista non sia vuota. Senza pool (ex undefined: expandFor ha lanciato, log in
// server.js) o con il pool vuoto (log qui, una riga per banner) gli id vengono dal catalogo: prima le varianti dei
// pityNames, poi una medaglia qualsiasi del banner (vetrina, nomi, liste, sotto-set), infine la prima del catalogo.
// I-153 (analisi in docs/notes/shop.md#i153): con piu' nomi il client unisce «<important>nome</important>» con «, »
// e «, or » prima dell'ultimo (testi 106180302/305/306) e formatta tutto in buffer da 0x400 byte ([fn],
// [fn] con «<xml>%s</xml>»): oltre J = 963 byte la striscia esce «A  guaranteed in !». Un id per nome
// (nameOf = nome della riga medal del master servito; il client toglie gia' i doppioni, si tiene il primo, come lui);
// J <= WARRANT_LIST_MAX: lista dei nomi (validComment 0); oltre, make-banners.warrantOf scrive validComment 1 e un
// testo di categoria; guardWarrant nasconde la striscia se un master vecchio ha ancora validComment 0 oltre il limite.
const WARRANT_LIST_MAX = 900; // margine sotto il limite duro (un «&» escapato costerebbe 4 byte in piu')
const WARRANT_HARD_MAX = 963; // limite del client per N fino a 99: J <= 965 - cifre di N
const utf8Bytes = (s) => Buffer.byteLength(String(s), 'utf8');
const nameGetter = (nameOf) => (typeof nameOf === 'function' ? nameOf : nameOf instanceof Map ? (id) => nameOf.get(id) : null);
// un id per nome, il primo nell'ordine dato (senza nameOf: gli id come sono); un id senza riga medal resta
function warrantDedupe(ids, nameOf) {
  const get = nameGetter(nameOf);
  if (!get) return [...ids];
  const seen = new Set();
  return ids.filter((id) => {
    const n = get(id), k = n === undefined ? `#${id}` : `=${n}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
// J = byte UTF-8 della lista unita dal client: 1 nome = il nome; k >= 2 nomi distinti = somma(23 + byte(nome))
// + 2·(k-2) + 5 (23 = «<important></important>», «, » fra i nomi, «, or » prima dell'ultimo); 0 senza nameOf
function warrantStripBytes(ids, nameOf) {
  const get = nameGetter(nameOf);
  if (!get) return 0;
  const names = [...new Set((ids || []).map(get).filter((n) => n !== undefined))];
  if (names.length < 2) return names.length ? utf8Bytes(names[0]) : 0;
  return names.reduce((sum, n) => sum + 23 + utf8Bytes(n), 0) + 2 * (names.length - 2) + 5;
}

const NO_WARRANT = { userWarrantDisplayOfTime: 1, warrantMedalIds: [] };
const warrantWarned = new Set();
function bannerMedalIds(b, catalog) {
  const medals = catalog?.medals || {}, g = b.guarantee || {}, p = b.pool || {};
  const ids = (names) => names.flatMap((n) => (medals[n]?.ids || []).map(([id]) => id));
  const pity = ids(g.pityNames || []);
  if (pity.length) return [...new Set(pity)].sort((x, y) => x - y);
  const names = [...(p.featured || []), ...(p.names || []), ...(g.list || []), ...(g.slots || []).flatMap((x) => x.names || []),
    ...(p.sets || []).flatMap((k) => catalog?.subsets?.[k]?.names || []), ...Object.keys(medals)];
  const any = ids(names)[0];
  return any ? [any] : [];
}
function warrantFields(b, ex, state = {}, catalog = null, nameOf = null) {
  const g = b.guarantee || {};
  if (!g.pity) return { ...NO_WARRANT, warrantMedalIds: [] };
  const left = Math.max(1, g.pity - (state.sinceFeatured || 0));
  if (g.pityGift) return { userWarrantDisplayOfTime: left, warrantMedalIds: [g.pityGift[1]] };
  const targets = (ex?.pityIds || []).length ? ex.pityIds : Array.isArray(g.slots) ? [] : ex?.featuredIds || [];
  if (targets.length) return { userWarrantDisplayOfTime: left, warrantMedalIds: warrantDedupe(targets, nameOf) };
  const any = Object.values(ex?.pool || {}).flat()[0];
  if (any) return { userWarrantDisplayOfTime: 0, warrantMedalIds: [any] };
  const ids = bannerMedalIds(b, catalog);
  if ((ex || !ids.length) && !warrantWarned.has(b.drawMedalTypeId)) {
    warrantWarned.add(b.drawMedalTypeId);
    console.log(`  [gacha] ${b.rowId} ${b.name}: striscia della pity senza pool${ids.length ? `, warrantMedalIds dal catalogo (${ids.slice(0, 3).join(',')})` : ' e nessuna medaglia nel catalogo: warrantMedalIds vuota'}`);
  }
  return { userWarrantDisplayOfTime: 0, warrantMedalIds: ids };
}

// Difesa (final review 2b, M2): validComment viene dal master servito (drawMedalType.json, make-banners.js), la
// pity dal catalogo vivo. Se i due non sono allineati (catalogo rigenerato senza make-banners, o il contrario) una riga
// con validComment 0 puo' incontrare NO_WARRANT: lista vuota = crash del client. Allora striscia nascosta
// (userWarrantDisplayOfTime 0) e una medaglia per la lista: la vetrina alla data (ex.featuredIds), poi gli id del
// catalogo (bannerMedalIds), il primo id del pool, infine safeMedalId del master; una riga di log per banner.
// I-153: con validComment 0 e J > WARRANT_HARD_MAX (master non rigenerato dopo I-153) striscia nascosta e un solo id,
// una riga di log per banner; con validComment 1 e pity il client non legge warrantMedalIds ([fn]: sprintf del
// comment con userWarrantDisplayOfTime): basta il primo id.
const commentWarned = new Set();
const stripWarned = new Set();
function guardWarrant(w, b, ex, catalog, validComment, safeMedalId, nameOf = null) {
  const list = w.warrantMedalIds || [];
  if (validComment === 0 && list.length && warrantStripBytes(list, nameOf) > WARRANT_HARD_MAX) {
    if (!stripWarned.has(b.drawMedalTypeId)) {
      stripWarned.add(b.drawMedalTypeId);
      console.log(`  [gacha] ${b.rowId} ${b.name}: striscia della pity di ${warrantStripBytes(list, nameOf)} byte con validComment 0 `
        + `(oltre ${WARRANT_HARD_MAX}, I-153: master da rigenerare con make-banners.js): striscia nascosta, warrantMedalIds [${list[0]}]`);
    }
    return { userWarrantDisplayOfTime: 0, warrantMedalIds: [list[0]] };
  }
  if (validComment === 1 && b.guarantee?.pity && list.length > 1) return { ...w, warrantMedalIds: [list[0]] };
  if (validComment !== 0 || list.length) return w;
  const pick = (ex?.featuredIds || [])[0] ?? bannerMedalIds(b, catalog)[0] ?? Object.values(ex?.pool || {}).flat()[0] ?? safeMedalId;
  const ids = pick != null ? [pick] : [];
  if (!commentWarned.has(b.drawMedalTypeId)) {
    commentWarned.add(b.drawMedalTypeId);
    console.log(`  [gacha] ${b.rowId} ${b.name}: validComment 0 nel master ma nessun bersaglio della pity nel catalogo `
      + `(master e catalogo da rigenerare insieme): striscia nascosta, warrantMedalIds [${ids.join(',')}]`);
  }
  return { userWarrantDisplayOfTime: 0, warrantMedalIds: ids };
}

function catalogPlate(webBase) {
  return plate({ drawMedalTypeId: gd.CATALOG_ID, payType: 6, lotCount: 1, name: 'Banner Catalog' }, webBase, 0, 1, 1);
}

// Limiti giornalieri: al cambio di giorno (clock.dayIndex) si azzera solo «used».
function usedToday(player, key, realMs) {
  const g = gstate(player);
  return g.day === clock.dayIndex(realMs) ? g.used?.[key] || 0 : 0;
}
function dayLeft(player, b, realMs) {
  if (b.vipFree) return Math.max(0, 1 - usedToday(player, VIP_FREE, realMs));
  if (!b.dayLimit) return 0;
  return Math.max(0, b.dayLimit - usedToday(player, b.drawMedalTypeId, realMs));
}
// Estrazioni rimaste per la piastra (userLimitedCount): il minore fra limite del giorno e limite totale
// (totalLimit su player.gacha.count, Ruling 28); 0 se il banner non ha limiti (isDayLimited 0).
function drawsLeft(player, b, realMs) {
  const left = [];
  if (b.vipFree || b.dayLimit) left.push(dayLeft(player, b, realMs));
  if (b.totalLimit) left.push(Math.max(0, b.totalLimit - drawCount(player, b)));
  return left.length ? Math.min(...left) : 0;
}

// exFor(banner) -> expandPool del banner alla data del giocatore (server.js expandFor) e catalog (ripiego senza pool):
// per la striscia della garanzia; validCommentOf(banner) = validComment della riga drawMedalType servita, safeMedalId =
// ultimo ripiego per warrantMedalIds (guardWarrant), nameOf(medalId) = nome della riga medal servita (I-153: un id per
// nome e lunghezza della striscia)
function gachaListData(banners, player, { realMs, webBase, sizes, storyQuest, storyDay, show, exFor, catalog, validCommentOf, safeMedalId, nameOf }) {
  ticketsOf(player);
  const list = shopBanners(banners, { storyQuest, storyDay, sizes, show });
  gstate(player).listedCurrency = list.find((b) => b.payType === 8)?.currency || 'draw';
  const warrantOfList = (b) => {
    const ex = exFor?.(b);
    return guardWarrant(warrantFields(b, ex, drawState(player, b), catalog, nameOf), b, ex, catalog, validCommentOf?.(b), safeMedalId, nameOf);
  };
  // Catalog sortId 1, poi 10, 20, ... nell'ordine di shopBanners (i piu' recenti prima, spec 4.3).
  return {
    gachaList: [catalogPlate(webBase), ...list.map((b, i) => plate(b, webBase, drawsLeft(player, b, realMs), priceFor(b, player), 10 * (i + 1),
      warrantOfList(b)))],
    petGachaList: [],
  };
}

function checkDraw(banner, player, body, { realMs, freeSlots, sizes, storyQuest, show }) {
  if (!banner) return `banner ${body?.drawMedalTypeId} sconosciuto`;
  if (banner.catalogOnly) return 'banner solo nel catalogo';
  if (![1, 7, 8].includes(banner.payType)) return `payType ${banner.payType} non estraibile`;
  if (banner.unlockQuest > storyQuest && !show?.has(banner.rowId)) return 'banner bloccato';
  if (!sizes.has(banner.lotCount)) return `animazione per ${banner.lotCount} medaglie assente`;
  if (Number(body?.count) !== banner.lotCount) console.log(`  [gacha] count ${body?.count} diverso da lotCount ${banner.lotCount}: vale lotCount`);
  if (banner.totalLimit && drawCount(player, banner) >= banner.totalLimit) return 'limite totale raggiunto';
  if (banner.vipFree && dayLeft(player, banner, realMs) < 1) return 'estrazione gratuita VIP gia\' usata oggi';
  if (!banner.vipFree && banner.dayLimit && dayLeft(player, banner, realMs) < 1) return 'limite giornaliero raggiunto';
  const price = priceFor(banner, player);
  if (balance(player, banner) < price) return `${walletName(banner)} ${balance(player, banner)} < ${price}`;
  if (freeSlots < banner.lotCount) return `box: ${freeSlots} posti per ${banner.lotCount} medaglie`;
  return null;
}

// Paga l'estrazione e aggiorna i contatori; gotFeatured = uscita una medaglia in vetrina (pity).
function payDraw(banner, player, realMs, gotFeatured) {
  const price = priceFor(banner, player);
  spend(player, banner, price);
  const g = gstate(player), id = banner.drawMedalTypeId;
  (g.count ||= {})[id] = (g.count[id] || 0) + 1;
  (g.sinceFeatured ||= {})[id] = gotFeatured ? 0 : (g.sinceFeatured[id] || 0) + 1;
  if (banner.vipFree || banner.dayLimit) {
    const day = clock.dayIndex(realMs);
    if (g.day !== day) { g.day = day; g.used = {}; }
    const key = banner.vipFree ? VIP_FREE : id;
    (g.used ||= {})[key] = (g.used[key] || 0) + 1;
  }
  return price;
}

const drawState = (player, b) => ({ draws: drawCount(player, b), sinceFeatured: gstate(player).sinceFeatured?.[b.drawMedalTypeId] || 0 });

// gachaBonus addType 1 = nessun bonus (con altri valori la scena apre MedalInfo_DrowBonus, assente);
// effectNumbers 0 = nessun effetto (1/2 aprono Draw_RareMedal/Draw_LimitRareMedal: findings.md §3)
function drawResultFields(userMedalIds, firstIds) {
  return { gachaBonus: { addType: 1, number: 0, userMedalIds: [] }, firstGetUserMedalIds: firstIds, userMedalIds, effectNumbers: userMedalIds.map(() => 0) };
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PAY = { 1: 'Jewels', 4: 'Bronze Tickets', 5: 'Silver Tickets', 6: 'Gold Tickets', 7: 'Platinum Tickets', 8: 'Draw Tickets' };
const CURRENCY_NAME = { spooky: 'Spooky Cookies', moogle: 'Moogle Points', holiday: 'Holiday Draw Tickets', draw: 'Draw Tickets' };
// payType sconosciuto: ripiega su Jewels (1) o Tickets, senza lanciare; payType 8: valuta del banner
const unitOf = (b) => (b.payType === 8 ? CURRENCY_NAME[b.currency] || PAY[8] : PAY[b.payType] || (b.payType === 1 ? 'Jewels' : 'Tickets'));
const priceText = (b, price) => `${price} ${price === 1 ? unitOf(b).replace(/s$/, '') : unitOf(b)}`;
const num = (n) => n.toLocaleString('en-US');
// Riga sui gradini di prezzo (FIRST_FREE o in calo a ogni estrazione); '' se il prezzo e' unico.
function priceSteps(b) {
  const p = b.prices || [];
  if (p.length < 2) return '';
  if (p[0] === 0) return `<p class="n">First draw: 1 ${unitOf(b).replace(/s$/, '')}, then ${num(p[1])} ${unitOf(b)}.</p>`;
  return `<p class="n">Price falls with each draw: ${p.map(num).join(' → ')} ${unitOf(b)}.</p>`;
}
const priceLine = (b) => (b.catalogOnly === 'INCOMPLETE' ? ''
  : `${esc(priceText(b, firstPrice(b)))}, ${b.lotCount ?? '?'} Medal${b.lotCount === 1 ? '' : 's'}`);
const firstPrice = (b) => Math.max(1, (b.prices || [])[0] || 1);
// Stile delle pagine originali (reference\shop_odds_details\NOTE.md: notice 46003 da Wayback e screenshot di Draw
// Odds): fondo #043654, testo bianco spaziato, titoli «■» azzurri #00d4ed, frasi chiave arancio/giallo, tabelle con
// bordi bianchi e intestazione #365e76, sezioni gialle «6★Medals» con «↑PAGE TOP», nomi colorati per attributo.
function page(title, body) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<style>body{margin:0;background:#043654;color:#fff;font:17px/1.8 sans-serif;letter-spacing:.4px;padding:6px 18px 40px}'
    + 'h1{font-size:22px;margin:8px 0 4px;color:#fff}h2{color:#00d4ed;font-size:18px;margin:20px 0 6px}h2:before{content:"\\25A0  "}'
    + 'h3{color:#ffcd4a;font-size:19px;margin:16px 0 4px}a{color:#00d4ed}p{margin:4px 0 8px}'
    + 'img{width:100%;max-width:640px;height:auto;display:block;margin:8px 0}'
    + '.b{border-bottom:2px solid #9fb7c6;padding:10px 0 16px}hr{border:0;border-top:2px solid #9fb7c6;margin:20px 0}'
    + '.n{color:#b9cfdc;font-size:15px}.s{display:inline-block;background:#1a6fa8;border-radius:12px;padding:0 12px;font-size:14px;margin:4px 0}'
    + '.k{color:#ffa500;font-weight:bold}.y{color:#ffcd4a;font-weight:bold}'
    + 'table{width:97%;margin:6px auto 10px;border-collapse:collapse;table-layout:fixed;font-size:85%}'
    + 'th,td{border:1px solid #fff;padding:4px 8px;text-align:center;vertical-align:middle}th{background:#365e76;font-weight:normal}'
    + 'td.l{text-align:left}ul{margin:4px 0 8px;padding-left:22px}li{margin:3px 0}'
    + '.ml{columns:3;column-gap:18px;list-style:none;padding:0;font-size:15px;line-height:1.6}.ml li{break-inside:avoid}'
    + '.p{color:#ff4a74}.g{color:#5cd94a}.m{color:#62a7ff}.f{font-weight:bold;text-decoration:underline}'
    + '.top{text-align:right;font-size:15px}.box{border:2px solid #ffcd4a;padding:6px 10px;margin:8px 0}</style></head><body>'
    + `<h1>${esc(title)}</h1>${body}</body></html>`;
}

// Ultima quest della storia restaurata (spec 4.4): oltre, i banner restano bloccati «in attesa dell'aggiornamento».
const RESTORED_QUEST = 525;
const FUTURE = ' — coming with a future update';
const CATALOG_ONLY_TEXT = {
  PVP_TICKETS: `Requires PvP tickets${FUTURE}`, DRAW_POINTS: `Draw Points${FUTURE}`,
  VIP_TWIN: 'VIP variant, not reproduced', INCOMPLETE: 'Original details missing — not available',
  // messo da server.js (sanitizeBanners): uno slot senza medaglie, es. le Blue Fairy che arrivano col PvP
  NO_MEDALS: `Medals not available yet${FUTURE}`,
};
// Stato di un banner per catalogo e dettagli. ctx = {storyQuest, sizes, show, shown}: shown = drawMedalTypeId nella lista dello Shop.
function stateOf(b, ctx) {
  if (b.catalogOnly) return { key: 'catalog', text: CATALOG_ONLY_TEXT[b.catalogOnly] || 'Not available' };
  if (b.unlockQuest > ctx.storyQuest && !ctx.show?.has(b.rowId)) {
    return { key: 'locked', text: `Unlocks after Story Quest ${b.unlockQuest}${b.unlockQuest > RESTORED_QUEST ? FUTURE : ''}` };
  }
  if (!ctx.sizes.has(b.lotCount)) return { key: 'size', text: 'This draw size is not available yet' };
  if (ctx.shown?.has(b.drawMedalTypeId)) return { key: 'now', text: 'In the Shop now' };
  return { key: 'later', text: 'Not in the Shop now' };
}

const dates = (b) => `${esc(b.start)} to ${esc(b.end || 'open end')}${b.end && b.endSource !== 'original' ? ' (end date reconstructed)' : ''}`;
const r2 = (x) => Math.round(x * 10000) / 100;
const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
const rar = (o) => `${o.rare}★ ${o.pct}%`;

// «<=4» -> «4 or lower», «>=5» -> «5 or higher» (etichette di slotOdds)
const tierWords = (t) => String(t).replace(/^<=(\d+)$/, '$1 or lower').replace(/^>=(\d+)$/, '$1 or higher');
// Tabella «Medal | Rarity | Probability» (o i livelli di un banner evolve), condivisa da dettagli e Draw Odds; le
// posizioni consecutive con le stesse probabilita' diventano una riga sola («Medal 2-10»).
function oddsTable(banner, ex, medalNames) {
  if (banner.pool?.mode === 'evolve') {
    return '<table><tr><th>Medal</th><th>Probability</th></tr>'
      + (ex.weighted || []).map(([id, w]) => `<tr><td class="l">${esc(medalNames?.get(id) || `#${id}`)}</td><td>${r2(w)}%</td></tr>`).join('') + '</table>';
  }
  const every = banner.guarantee?.every;
  const rows = gd.slotOdds(banner, ex).map((s) => {
    const lead = s[0]?.list ? `${every ? `every ${ordinal(every)} draw: ` : ''}one of the listed Medals (featured Medals twice as likely)` : '';
    const kind = s[0]?.kind === 'tier' ? `Tier ${tierWords(s[0].tier)}` : s[0]?.kind === 'trait' ? 'Trait Medal slot' : s[0]?.kind === 'pity' ? 'guaranteed Medal slot' : '';
    return { what: [kind, lead].filter(Boolean).join(', '), odds: s };
  });
  const groups = [];
  rows.forEach((r, i) => {
    const last = groups[groups.length - 1];
    if (last && last.what === r.what && JSON.stringify(last.odds) === JSON.stringify(r.odds)) last.to = i + 1;
    else groups.push({ ...r, from: i + 1, to: i + 1 });
  });
  return '<table><tr><th style="width:26%">Medal</th><th>Rarity</th><th style="width:22%">Probability</th></tr>' + groups.map((g) => {
    const label = `Medal ${g.from}${g.to > g.from ? `-${g.to}` : ''}`;
    const span = g.odds.length > 1 ? ` rowspan="${g.odds.length}"` : '';
    return g.odds.map((o, k) => `<tr>${k ? '' : `<td${span}>${label}${g.what ? `<div class="n">${esc(g.what)}</div>` : ''}</td>`}`
      + `<td><span class="y">${o.rare}★</span></td><td>${o.pct}%</td></tr>`).join('');
  }).join('') + '</table>';
}

function skillSection(banner, skillNames) {
  const spec = banner.skill;
  const rows = (SKILL_TABLES[spec?.table] || []).filter(([n]) => !skillNames || skillNames.has(n));
  if (!rows.length) return '';
  const who = spec.slots === 'first' ? 'the first Medal of the draw' : 'every Medal of the draw';
  return `<h2>Skills</h2><p class="n">Original rates (notice). Chance of each skill on ${who}; other Medals have no skill.</p>`
    + `<table><tr><th>Skill</th><th style="width:30%">Probability</th></tr>${rows.map(([n, pct]) => `<tr><td class="l">${esc(n)}</td><td>${pct}%</td></tr>`).join('')}</table>`;
}

// Garanzia scritta ma senza medaglie estraibili alla data del banner (lista o vetrina vuote in expandPool):
// i dettagli lo dicono invece di promettere una garanzia che non scatta (correzione finale D).
const NOT_REPRODUCED = 'This guarantee is not reproduced yet.';
// v3 (slots): i bersagli sono ex.pityNames (o il regalo pityGift, che non dipende dal pool); percorso vecchio: ex.featuredNames.
const hasSlotsOf = (banner) => Array.isArray(banner.guarantee?.slots);
const pityHasTargets = (banner, ex) => !ex || (hasSlotsOf(banner)
  ? !!banner.guarantee.pityGift || (ex.pityNames || []).length > 0 : (ex.featuredNames || []).length > 0);
// nomi del catalogo in minuscolo -> «HD Axel», «Illustrated Kairi [EX]»
const UPPER_WORDS = new Set(['hd', 'ex', 'sp', 'sn', 'dx', 'ii', 'iii', 'iv']);
const niceName = (n) => String(n).replace(/[A-Za-z0-9+]+/g, (w) => (UPPER_WORDS.has(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)));
// nome del catalogo -> nome del master (medal.json) via gli id di ex (medalInfo, pityNames, slotNames); senza id, niceName
function namer(ex, medalNames) {
  const ids = new Map();
  for (const [id, info] of ex?.medalInfo || []) if (!ids.has(info.name)) ids.set(info.name, id);
  for (const [n, , v] of [...(ex?.pityNames || []), ...(ex?.slotNames || []).flat()]) {
    const id = Object.values(v || {}).flat()[0];
    if (id != null && !ids.has(n)) ids.set(n, id);
  }
  return (n) => (ids.has(n) && medalNames?.get(ids.get(n))) || niceName(n);
}
const niceList = (a, nm = niceName) => (a || []).map(nm).join(', ');
const pityText = (banner, ex, medalNames) => {
  const g = banner.guarantee;
  const who = hasSlotsOf(banner) && (g.pityNames || []).length ? `${niceList(g.pityNames, namer(ex, medalNames))}${g.pityStar ? ` (${g.pityStar}★)` : ''}` : 'Featured Medal';
  if (hasSlotsOf(banner) && g.pityGift) return esc(`${who} is sent to your Present Box (original: included in the draw) within ${g.pity} draws.`);
  return esc(`${who} guaranteed within ${g.pity} draws (original).${pityHasTargets(banner, ex) ? '' : ` ${NOT_REPRODUCED}`}`);
};
// v3: una riserva a lista con nomi scritti ma nessuna medaglia estraibile alla data (ex.slotNames[j] vuoto)
const listLost = (banner, ex) => !!ex && (hasSlotsOf(banner)
  ? banner.guarantee.slots.some((s, j) => s.kind === 'list' && (s.names || []).length && !(ex.slotNames?.[j] || []).length)
  : (banner.guarantee?.list || []).length && !(ex.listNames || []).length);

// Righe dei Details per le garanzie v3 e i potenziamenti (catalogo version 3); vuoto senza guarantee.slots/enhance.
const tierRange = (s) => (s.tierMin == null && s.tierMax == null ? '' : s.tierMin == null ? ` Tier ${s.tierMax} or lower`
  : s.tierMax == null ? ` Tier ${s.tierMin} or higher` : s.tierMin === s.tierMax ? ` Tier ${s.tierMin}` : ` Tier ${s.tierMin}-${s.tierMax}`);
function onText(on, nm) {
  if (on?.slots) return `Medal ${on.slots.map((i) => i + 1).join(', ')}`;
  if (on?.names) return niceList(on.names, nm);
  if (on && ('star' in on || 'tierMin' in on)) {
    return `${on.star ? `${on.star}★` : 'Any'}${tierRange(on)} Medals${on.excludePrime ? ' (not Prime)' : ''}`;
  }
  return 'Eligible Medals';
}
const NOT_REPRODUCED_KINDS = {
  trait: 'Trait Medal: not reproduced, a regular Medal of the same rarity instead.',
  traitSlots: 'Trait Medal slots: not reproduced, regular Medals of the same rarity instead.',
  skill: 'Guaranteed max-level Skill: not reproduced for Skills that do not exist in this restoration.',
  epic: 'Epic-only draw: not reproduced, the full set of Medals is drawn.',
  pity: 'Pity Medal: not reproduced, the target Medal is not available in this restoration.',
  imitation: 'Imitation Medal bonus: not reproduced.',
};
// riga della regola 13-bis alla data del banner (gacha-data.MAX_GUILT_FROM); '' prima del 2019-01-01
function ruleLine(at) {
  const tiers = Object.keys(gd.MAX_GUILT_FROM).filter((k) => gd.maxGuiltRule(7, Number(k), at));
  return tiers.length ? `Any 7★ Tier ${tiers.length > 1 ? `${tiers[0]}-${tiers[tiers.length - 1]}` : tiers[0]} Medal: comes with its Special Attack Bonus maxed (original)` : '';
}
function guaranteeSection(banner, ex, medalNames, at) {
  const nm = namer(ex, medalNames);
  const g = banner.guarantee || {}, e = banner.enhance || {}, out = [];
  for (const s of g.slots || []) {
    const n = s.count || 1;
    if (s.kind === 'tier') out.push(`${n}x ${s.star}★${tierRange(s)}${(s.names || []).length ? ` (or ${niceList(s.names, nm)})` : ''}`);
    else if (s.kind === 'trait') out.push(`${n}x Trait Medal (${s.star}★)`);
    else out.push(`${n}x one of the listed Medals (${s.star}★)`);
  }
  // testo per voce (2c/G10): prima ogni preset diceva «Special Attack Bonus maxed», anche con 1-3 o 0 pallini
  const presetText = (p) => (p.guilt === 'max' ? 'comes with its Special Attack Bonus maxed'
    : p.dots === 'max' ? 'comes with all Special Attack dots filled'
      : Array.isArray(p.dots) ? `comes with ${p.dots[0]} to ${p.dots[1]} Special Attack dots`
        : `comes with ${p.dots} Special Attack dot${p.dots === 1 ? '' : 's'}`);
  for (const p of e.preset || []) out.push(`${onText(p.on, nm)}: ${presetText(p)} (original)`);
  // decisione 13-bis: con i preset elencati, la regola generale delle 7★ di Tier 9-10 alla data del banner (server.js
  // respondGachaDraw), perche' i preset su altri slot non facciano pensare il contrario
  if ((e.preset || []).length && (banner.rarityMix || []).some(([r]) => r >= 7) && ruleLine(at)) out.push(ruleLine(at));
  for (const b of e.boosted || []) {
    const stats = [b.str ? `+${b.str} STR` : '', b.def ? `+${b.def} DEF` : ''].filter(Boolean).join(', ');
    const rec = b.on && ('star' in b.on || 'tierMin' in b.on) ? ', reconstructed' : ''; // valori nostri: la frase non li dava
    out.push(b.chance === 'guaranteed' ? `${onText(b.on, nm)}: boosted version guaranteed (${stats}${rec})`
      : `${onText(b.on, nm)}: Small chance of a boosted version (${stats}${rec}): ${BOOST_PCT}% per eligible Medal (reconstructed)`);
  }
  for (const m of e.maxSkill || []) out.push(`${onText(m.on, nm)}: Max-level Skill (${m.skills.map(niceName).join(', ')})`);
  for (const k of e.notReproduced || []) if (NOT_REPRODUCED_KINDS[k]) out.push(NOT_REPRODUCED_KINDS[k]);
  const box = g.erratum ? `<div class="box">${esc(g.erratum)}</div>` : '';
  return `${out.length ? `<h2>Guarantees and bonuses</h2><ul>${out.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${box}`;
}

// classe di colore dell'attributo (medal.attribute: 1 Power, 2 Speed, 3 Magic), come i nomi nei notice originali
const ATTR_CLASS = { 1: 'p', 2: 'g', 3: 'm' };
function detailPage(banner, ex, medalNames, ctx) {
  const evolve = banner.pool?.mode === 'evolve';
  const st = stateOf(banner, ctx);
  const pity = banner.guarantee?.pity ? `<p class="k">★ ${pityText(banner, ex, medalNames)}</p>` : '';
  const garanzie = !evolve && ex && banner.rarityMix?.length ? guaranteeSection(banner, ex, medalNames, gd.asOf(banner, ctx?.storyDay || banner.start)) : '';
  const gtext = [banner.guaranteesText, listLost(banner, ex) ? NOT_REPRODUCED : ''].filter(Boolean).map(esc).join(' ');
  const rated = !!(ex && banner.rarityMix?.length) && banner.catalogOnly !== 'INCOMPLETE';
  const featured = new Set(ex?.pityIds || []);
  const attr = ctx?.medalAttr;
  const pool = evolve || !rated ? '' : Object.entries(ex.pool).sort((a, b) => b[0] - a[0]).map(([r, ids]) => {
    const byName = new Map();
    for (const id of ids) {
      const n = medalNames.get(id) || `#${id}`;
      if (!byName.has(n)) byName.set(n, { cls: ATTR_CLASS[attr?.get(id)] || '', f: false });
      if (featured.has(id)) byName.get(n).f = true;
    }
    const names = [...byName.keys()].sort();
    return `<h3>${r}★Medals (${names.length})</h3><ul class="ml">${names.map((n) => {
      const v = byName.get(n);
      const cls = [v.cls, v.f ? 'f' : ''].filter(Boolean).join(' ');
      return `<li${cls ? ` class="${cls}"` : ''}>${esc(n)}</li>`;
    }).join('')}</ul>`;
  }).join('');
  const lim = gd.limitText(banner);
  const head = priceLine(banner) ? `<p class="k">★ ${priceLine(banner).replace(', ', ' for ')}${lim ? `, ${lim}` : ''}.</p>${priceSteps(banner)}` : '';
  const legend = attr ? '<p class="n">Names: <span class="p">Power</span>, <span class="g">Speed</span>, <span class="m">Magic</span>'
    + `${featured.size ? ', <span class="f">guaranteed Medal</span>' : ''}.</p>` : '';
  const rates = rated ? '<h2>Draw rates</h2><p class="n">Medal rarities of each draw: original. Chances of one more star: reconstructed for this restoration.</p>'
    + `${oddsTable(banner, ex, medalNames)}${pity}${garanzie}${skillSection(banner, ctx.skillNames)}${evolve ? '' : `<hr><h2>Medals in this draw</h2>${legend}`}${pool}` : '';
  return page(banner.name, `<img src="/web/gacha/img/${banner.drawMedalTypeId}.png" alt="">${head}`
    + `<span class="s">${esc(st.text)}</span><h2>Campaign Period</h2><p>Original banner: ${dates(banner)}.</p>`
    + `${gtext ? `<h2>Deal Details</h2><p>${gtext}</p>` : ''}${rates}`);
}

function oddsPage(entries) {
  const list = entries.filter(({ banner, ex }) => ex && banner.rarityMix?.length);
  const toc = list.length > 1 ? `<p>${list.map(({ banner }, i) => `<a href="#b${i}">${esc(banner.name)}</a>`).join(' / ')}</p>` : '';
  return page('Probabilities', '<a id="top"></a>' + toc
    + '<p class="n">Medal rarities of each draw are original; the chances of one more star are reconstructed for this restoration. Percentages are rounded.</p>'
    + list.map(({ banner, ex, medalNames }, i) => `<div class="b" id="b${i}"><h3>[${esc(banner.name)}]</h3>`
      + `${banner.guarantee?.pity ? `<p class="k">★ ${pityText(banner, ex, medalNames)}</p>` : ''}`
      + `${oddsTable(banner, ex, medalNames)}${list.length > 1 ? '<div class="top"><a href="#top">↑PAGE TOP</a></div>' : ''}</div>`).join(''));
}

function catalogPage(banners, ctx) {
  const sorted = [...banners].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.drawMedalTypeId - b.drawMedalTypeId));
  return page('Banner Catalog', `<p class="n">${sorted.length} original banners. Banners unlock as you progress through the Story; in the original game they followed the calendar.</p>`
    + sorted.map((b) => `<div class="b"><a href="/web/gacha/detail/${b.drawMedalTypeId}"><img loading="lazy" width="640" height="140" src="/web/gacha/img/${b.drawMedalTypeId}.png" alt="">${esc(b.name)}</a>`
      + `<div class="n">${dates(b)}</div>${priceLine(b) ? `<div class="n">${priceLine(b)}</div>` : ''}`
      + `<span class="s">${esc(stateOf(b, ctx).text)}</span></div>`).join(''));
}

module.exports = {
  SHOP_MAX, WALLET, TICKET_CURRENCIES, ticketsOf, walletName, balance, priceFor, drawable, shopBanners, catalogRow, catalogPlate,
  dayLeft, drawsLeft, gachaListData, warrantFields, guardWarrant, warrantDedupe, warrantStripBytes, WARRANT_LIST_MAX, WARRANT_HARD_MAX, checkDraw, payDraw, drawState, drawResultFields, detailPage, oddsPage, catalogPage, stateOf, RESTORED_QUEST,
};
