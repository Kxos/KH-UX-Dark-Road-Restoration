// Shop > Draw: lista, estrazione e pagine WebView (docs/notes/shop.md; spec 2026-10-16-shop-banner-design.md 9.4-9.7).
// GET /gacha/list (azione 75): gachaList[] (FUN_0079541c, campi tutti obbligatori) e petGachaList[]
// (obbligatorio anche vuoto: senza, «200 ERROR :75»). Il client la richiede a ogni apertura dello Shop
// e dopo ogni estrazione; la chiusura della WebView di Details NON la richiede (FUN_00a20ffc).
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
// grigio, il tocco non manda richieste (FUN_00a1509c); Details apre il catalogo (detailUrl del master).
function catalogRow() {
  return gd.drawMedalTypeRow({ drawMedalTypeId: gd.CATALOG_ID, name: 'Banner Catalog', payType: 6, price: 1, sortId: 1,
    bannerUrl: `/web/gacha/img/${gd.CATALOG_ID}.png`, detailUrl: '/web/gacha/catalog', comment: 'Open Details to browse all banners' });
}

// sortId: il client (FUN_00a19c84) raggruppa le piastre in una mappa per sortId della lista (non quello del master,
// che non legge) e le mostra per sortId crescente, poi drawMedalTypeId: un numero intero diverso per ogni piastra
// (senza, JSON.stringify lo toglie e FUN_0079541c rifiuta la lista: «200 ERROR :75», I-138).
function plate(b, webBase, userLimitedCount, price, sortId) {
  return {
    validAdd: 0, drawMedalTypeId: b.drawMedalTypeId, drawType: 1, sortId, payType: b.payType, price,
    lotCount: b.lotCount, isDayLimited: b.dayLimit || b.vipFree || b.totalLimit ? 1 : 0, userLimitedCount, userWarrantDisplayOfTime: 1,
    name: b.name, description: b.name, bannerUrl: `${webBase}/web/gacha/img/${b.drawMedalTypeId}.png`,
    warrantMedalIds: [], drawTicketlimitDate: '2030-12-31 23:59:59',
  };
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

function gachaListData(banners, player, { realMs, webBase, sizes, storyQuest, storyDay, show }) {
  ticketsOf(player);
  const list = shopBanners(banners, { storyQuest, storyDay, sizes, show });
  gstate(player).listedCurrency = list.find((b) => b.payType === 8)?.currency || 'draw';
  // Catalog sortId 1, poi 10, 20, ... nell'ordine di shopBanners (i piu' recenti prima, spec 4.3).
  return {
    gachaList: [catalogPlate(webBase), ...list.map((b, i) => plate(b, webBase, drawsLeft(player, b, realMs), priceFor(b, player), 10 * (i + 1)))],
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
function page(title, body) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<style>body{margin:0;background:#174a5c;color:#e8f2f6;font:17px sans-serif;padding:10px 14px 40px}'
    + 'h1{color:#5fe0f0;font-size:21px;margin:8px 0}h2{color:#5fe0f0;font-size:18px;margin:14px 0 6px}'
    + 'a{color:#fff}img{width:100%;max-width:640px;height:auto;display:block;margin:6px 0}.b{border-bottom:2px dotted #8fb3c0;padding:8px 0}'
    + 'table{border-collapse:collapse}td{padding:2px 10px 2px 0;vertical-align:top}.n{color:#bcd}.s{color:#ffd86b}</style></head><body>'
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

// Righe «Medal i | probabilita'» (o i livelli di un banner evolve): condivise da dettagli e Draw Odds.
function oddsRows(banner, ex, medalNames) {
  if (banner.pool?.mode === 'evolve') {
    return (ex.weighted || []).map(([id, w]) => `<tr><td>${esc(medalNames?.get(id) || `#${id}`)}</td><td>${r2(w)}%</td></tr>`).join('');
  }
  const every = banner.guarantee?.every;
  return gd.slotOdds(banner, ex).map((s, i) => {
    const lead = s[0]?.list ? `${every ? `every ${ordinal(every)} draw: ` : ''}one of the listed Medals, featured Medals twice as likely: ` : '';
    return `<tr><td>Medal ${i + 1}</td><td>${lead}${s.map(rar).join(', ')}</td></tr>`;
  }).join('');
}

function skillSection(banner, skillNames) {
  const spec = banner.skill;
  const rows = (SKILL_TABLES[spec?.table] || []).filter(([n]) => !skillNames || skillNames.has(n));
  if (!rows.length) return '';
  const who = spec.slots === 'first' ? 'the first Medal of the draw' : 'every Medal of the draw';
  return `<h2>Skills (original rates, notice)</h2><p class="n">Chance of each skill on ${who}; other Medals have no skill.</p>`
    + `<table>${rows.map(([n, pct]) => `<tr><td>${esc(n)}</td><td>${pct}%</td></tr>`).join('')}</table>`;
}

// Garanzia scritta ma senza medaglie estraibili alla data del banner (lista o vetrina vuote in expandPool):
// i dettagli lo dicono invece di promettere una garanzia che non scatta (correzione finale D).
const NOT_REPRODUCED = 'This guarantee is not reproduced yet.';
const pityText = (banner, ex) => `Featured Medal guaranteed within ${banner.guarantee.pity} draws (original).`
  + `${ex && !(ex.featuredNames || []).length ? ` ${NOT_REPRODUCED}` : ''}`;
const listLost = (banner, ex) => !!(ex && (banner.guarantee?.list || []).length && !(ex.listNames || []).length);

function detailPage(banner, ex, medalNames, ctx) {
  const evolve = banner.pool?.mode === 'evolve';
  const st = stateOf(banner, ctx);
  const pity = banner.guarantee?.pity ? `<p>${pityText(banner, ex)}</p>` : '';
  const gtext = [banner.guaranteesText, listLost(banner, ex) ? NOT_REPRODUCED : ''].filter(Boolean).map(esc).join(' ');
  const rated = !!(ex && banner.rarityMix?.length) && banner.catalogOnly !== 'INCOMPLETE';
  const pool = evolve || !rated ? '' : Object.entries(ex.pool).sort((a, b) => b[0] - a[0]).map(([r, ids]) => {
    const names = [...new Set(ids.map((id) => medalNames.get(id) || `#${id}`))].sort();
    return `<h2>${r}★ (${names.length})</h2><p>${names.map(esc).join(', ')}</p>`;
  }).join('');
  const lim = gd.limitText(banner);
  const head = priceLine(banner) ? `<p>${priceLine(banner).replace(', ', ' for ')}${lim ? `, ${lim}` : ''}.</p>${priceSteps(banner)}` : '';
  const rates = rated ? '<h2>Draw rates</h2><p class="n">Medal rarities of each draw: original. Chances of one more star: reconstructed for this restoration.</p>'
    + `<table>${oddsRows(banner, ex, medalNames)}</table>${pity}${skillSection(banner, ctx.skillNames)}${evolve ? '' : '<h2>Medals in this draw</h2>'}${pool}` : '';
  return page(banner.name, `<img src="/web/gacha/img/${banner.drawMedalTypeId}.png" alt="">${head}`
    + `<p class="n">Original banner: ${dates(banner)}.</p><p class="s">${esc(st.text)}</p>`
    + `${gtext ? `<p class="n">${gtext}</p>` : ''}${rates}`);
}

function oddsPage(entries) {
  return page('Draw Odds', '<p class="n">Medal rarities of each draw are original; the chances of one more star are reconstructed for this restoration.</p>'
    + entries.filter(({ banner, ex }) => ex && banner.rarityMix?.length).map(({ banner, ex, medalNames }) => `<div class="b"><b>${esc(banner.name)}</b>${banner.guarantee?.pity ? `<div class="n">${pityText(banner, ex)}</div>` : ''}`
      + `<table>${oddsRows(banner, ex, medalNames)}</table></div>`).join(''));
}

function catalogPage(banners, ctx) {
  const sorted = [...banners].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.drawMedalTypeId - b.drawMedalTypeId));
  return page('Banner Catalog', `<p class="n">${sorted.length} original banners. Banners unlock as you progress through the Story; in the original game they followed the calendar.</p>`
    + sorted.map((b) => `<div class="b"><a href="/web/gacha/detail/${b.drawMedalTypeId}"><img loading="lazy" width="640" height="140" src="/web/gacha/img/${b.drawMedalTypeId}.png" alt="">${esc(b.name)}</a>`
      + `<div class="n">${dates(b)}</div>${priceLine(b) ? `<div class="n">${priceLine(b)}</div>` : ''}`
      + `<div class="s">${esc(stateOf(b, ctx).text)}</div></div>`).join(''));
}

module.exports = {
  SHOP_MAX, WALLET, TICKET_CURRENCIES, ticketsOf, walletName, balance, priceFor, drawable, shopBanners, catalogRow, catalogPlate,
  dayLeft, drawsLeft, gachaListData, checkDraw, payDraw, drawState, drawResultFields, detailPage, oddsPage, catalogPage, stateOf, RESTORED_QUEST,
};
