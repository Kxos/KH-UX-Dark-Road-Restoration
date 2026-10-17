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
  if (b.payType === 8) ticketsOf(player)[b.currency] -= n;
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

function shopBanners(banners, { storyQuest, storyDay, sizes, show }) {
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

function plate(b, webBase, userLimitedCount, price) {
  return {
    validAdd: 0, drawMedalTypeId: b.drawMedalTypeId, drawType: 1, sortId: b.sortId, payType: b.payType, price,
    lotCount: b.lotCount, isDayLimited: b.dayLimit || b.vipFree ? 1 : 0, userLimitedCount, userWarrantDisplayOfTime: 1,
    name: b.name, description: b.name, bannerUrl: `${webBase}/web/gacha/img/${b.drawMedalTypeId}.png`,
    warrantMedalIds: [], drawTicketlimitDate: '2030-12-31 23:59:59',
  };
}

function catalogPlate(webBase) {
  return plate({ drawMedalTypeId: gd.CATALOG_ID, sortId: 1, payType: 6, lotCount: 1, name: 'Banner Catalog' }, webBase, 0, 1);
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

function gachaListData(banners, player, { realMs, webBase, sizes, storyQuest, storyDay, show }) {
  ticketsOf(player);
  const list = shopBanners(banners, { storyQuest, storyDay, sizes, show });
  gstate(player).listedCurrency = list.find((b) => b.payType === 8)?.currency || 'draw';
  return {
    gachaList: [catalogPlate(webBase), ...list.map((b) => plate(b, webBase, dayLeft(player, b, realMs), priceFor(b, player)))],
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
const PAY = { 1: 'Jewels', 7: 'Platinum Tickets', 8: 'Draw Tickets' };
// payType sconosciuto: ripiega su Jewels (1) o Tickets, senza lanciare
const priceText = (b) => {
  const unit = PAY[b.payType] || (b.payType === 1 ? 'Jewels' : 'Tickets');
  return `${b.price} ${b.price === 1 ? unit.replace(/s$/, '') : unit}`;
};
function page(title, body) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<style>body{margin:0;background:#174a5c;color:#e8f2f6;font:17px sans-serif;padding:10px 14px 40px}'
    + 'h1{color:#5fe0f0;font-size:21px;margin:8px 0}h2{color:#5fe0f0;font-size:18px;margin:14px 0 6px}'
    + 'a{color:#fff}img{width:100%;max-width:640px;display:block;margin:6px 0}.b{border-bottom:2px dotted #8fb3c0;padding:8px 0}'
    + 'table{border-collapse:collapse}td{padding:2px 10px 2px 0}.n{color:#bcd}</style></head><body>'
    + `<h1>${esc(title)}</h1>${body}</body></html>`;
}

function detailPage(banner, medalNames) {
  const odds = gd.slotOdds(banner).map((s, i) => `<tr><td>Medal ${i + 1}</td><td>${s.map((o) => `${o.rare}★ ${o.pct}%`).join(', ')}</td></tr>`).join('');
  const pool = Object.entries(banner.pool).sort((a, b) => b[0] - a[0]).map(([r, ids]) => {
    const names = [...new Set(ids.map((id) => medalNames.get(id) || `#${id}`))].sort();
    return `<h2>${r}★ (${names.length})</h2><p>${names.map(esc).join(', ')}</p>`;
  }).join('');
  return page(banner.name, `<img src="/web/gacha/img/${banner.drawMedalTypeId}.png" alt="">`
    + `<p>${esc(priceText(banner))} for ${banner.lotCount} Medal${banner.lotCount === 1 ? '' : 's'}${banner.isDayLimited ? ', once per day' : ''}.</p>`
    + `<p class="n">Original banner: ${esc(banner.startDate)} to ${esc(banner.endDate)}.${banner.guarantees ? ' ' + esc(banner.guarantees) : ''}</p>`
    + `<h2>Draw rates (reconstructed)</h2><p class="n">The original game listed only the Medal rarities of each draw: these rates are reconstructed for this restoration.</p><table>${odds}</table>`
    + `<h2>Medals in this draw</h2>${pool}`);
}

function oddsPage(banners) {
  return page('Draw Odds', '<p class="n">The original rates were not published: the rates below are reconstructed for this restoration. Each Medal of a draw has the listed rarity, with a small chance of one star more.</p>'
    + banners.map((b) => `<div class="b"><b>${esc(b.name)}</b><table>${gd.slotOdds(b).map((s, i) => `<tr><td>Medal ${i + 1}</td><td>${s.map((o) => `${o.rare}★ ${o.pct}%`).join(', ')}</td></tr>`).join('')}</table></div>`).join(''));
}

// pagine provvisorie (le riscrive il Task 7 del sotto-progetto 2): campi del sotto-progetto 1
const visibleBanners = (banners, { test }) => banners.filter((b) => test || !b.test);
function catalogPage(banners, { test }) {
  return page('Banner Catalog', '<p class="n">Banners available in the Shop. Tap a banner for its Medals and rates.</p>'
    + visibleBanners(banners, { test }).map((b) => `<div class="b"><a href="/web/gacha/detail/${b.drawMedalTypeId}"><img src="/web/gacha/img/${b.drawMedalTypeId}.png" alt="">${esc(b.name)}</a>`
      + `<div class="n">${esc(priceText(b))}, ${b.lotCount} Medal${b.lotCount === 1 ? '' : 's'} - original: ${esc(b.startDate)} to ${esc(b.endDate)}</div></div>`).join(''));
}

module.exports = {
  SHOP_MAX, WALLET, TICKET_CURRENCIES, ticketsOf, walletName, balance, priceFor, drawable, shopBanners, catalogRow, catalogPlate,
  dayLeft, gachaListData, checkDraw, payDraw, drawState, drawResultFields, detailPage, oddsPage, catalogPage,
};
