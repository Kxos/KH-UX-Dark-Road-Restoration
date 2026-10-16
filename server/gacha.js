// Shop > Draw: lista, estrazione e pagine WebView (docs/notes/shop.md; spec 2026-10-16-shop-banner-design.md).
// GET /gacha/list (azione 75): gachaList[] ([fn], campi tutti obbligatori) e petGachaList[]
// (obbligatorio anche vuoto: senza, «200 ERROR :75»). Il client la richiede a ogni apertura dello Shop
// e dopo ogni estrazione; la chiusura della WebView di Details NON la richiede ([fn]).
// POST /gacha/draw (azione 76): corpo {drawMedalTypeId, count = lotCount}; il client controlla prima
// jewel/biglietti e 1 posto nel box, poi apre la scena e rilegge GET /user/stone: i jewel li scala il
// server qui. Risposta in server.js (respondGachaDraw).
'use strict';
const clock = require('./clock');
const gd = require('./gacha-data');

const WALLET = { 1: 'freeStone', 7: 'limitedDrawTicket1', 8: 'limitedDrawTicket2' };

// Piastra «Banner Catalog» (spec 4.1): Gold Ticket (payType 6, drawTicket3 sempre 0) prezzo 1: pulsante
// grigio, il tocco non manda richieste ([fn]); Details apre il catalogo (detailUrl del master).
function catalogRow() {
  return gd.drawMedalTypeRow({ drawMedalTypeId: gd.CATALOG_ID, name: 'Banner Catalog', payType: 6, price: 1, sortId: 1,
    bannerUrl: `/web/gacha/img/${gd.CATALOG_ID}.png`, detailUrl: '/web/gacha/catalog', comment: 'Open Details to browse all banners' });
}

function plate(b, webBase, userLimitedCount) {
  return {
    validAdd: 0, drawMedalTypeId: b.drawMedalTypeId, drawType: 1, sortId: b.sortId, payType: b.payType, price: b.price,
    lotCount: b.lotCount, isDayLimited: b.isDayLimited || 0, userLimitedCount, userWarrantDisplayOfTime: 1,
    name: b.name, description: b.name, bannerUrl: `${webBase}/web/gacha/img/${b.drawMedalTypeId}.png`,
    warrantMedalIds: [], drawTicketlimitDate: '2030-12-31 23:59:59',
  };
}

function catalogPlate(webBase) {
  return plate({ drawMedalTypeId: gd.CATALOG_ID, sortId: 1, payType: 6, price: 1, lotCount: 1, name: 'Banner Catalog' }, webBase, 0);
}

const visibleBanners = (banners, { test }) => banners.filter((b) => test || !b.test);

function dayLeft(player, banner, realMs) {
  if (!banner.isDayLimited) return 0;
  const g = player.gacha || {};
  const used = g.day === clock.dayIndex(realMs) ? (g.used?.[banner.drawMedalTypeId] || 0) : 0;
  return Math.max(0, 1 - used);
}

function gachaListData(banners, player, { realMs, webBase, test, sizes }) {
  const list = visibleBanners(banners, { test }).filter((b) => sizes.has(b.lotCount));
  return { gachaList: [catalogPlate(webBase), ...list.map((b) => plate(b, webBase, dayLeft(player, b, realMs)))], petGachaList: [] };
}

function checkDraw(banner, player, body, { realMs, test, freeSlots, sizes }) {
  if (!banner) return `banner ${body?.drawMedalTypeId} sconosciuto`;
  const wallet = WALLET[banner.payType];
  if (!wallet) return `payType ${banner.payType} non estraibile`;
  if (banner.test && !test) return 'banner di prova senza KHUX_GACHA_TEST=1';
  if (!sizes.has(banner.lotCount)) return `animazione per ${banner.lotCount} medaglie assente`;
  if (Number(body?.count) !== banner.lotCount) console.log(`  [gacha] count ${body?.count} diverso da lotCount ${banner.lotCount}: vale lotCount`);
  if (banner.isDayLimited && dayLeft(player, banner, realMs) < 1) return 'gia\' estratto oggi';
  if ((player[wallet] || 0) < banner.price) return `${wallet} ${player[wallet] || 0} < ${banner.price}`;
  if (freeSlots < banner.lotCount) return `box: ${freeSlots} posti per ${banner.lotCount} medaglie`;
  return null;
}

function payDraw(banner, player, realMs) {
  const wallet = WALLET[banner.payType];
  player[wallet] = (player[wallet] || 0) - banner.price;
  if (!banner.isDayLimited) return;
  const day = clock.dayIndex(realMs);
  if (player.gacha?.day !== day) player.gacha = { ...(player.gacha || {}), day, used: {} };
  player.gacha.used[banner.drawMedalTypeId] = (player.gacha.used[banner.drawMedalTypeId] || 0) + 1;
}

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

function catalogPage(banners, { test }) {
  return page('Banner Catalog', '<p class="n">Banners available in the Shop. Tap a banner for its Medals and rates.</p>'
    + visibleBanners(banners, { test }).map((b) => `<div class="b"><a href="/web/gacha/detail/${b.drawMedalTypeId}"><img src="/web/gacha/img/${b.drawMedalTypeId}.png" alt="">${esc(b.name)}</a>`
      + `<div class="n">${esc(priceText(b))}, ${b.lotCount} Medal${b.lotCount === 1 ? '' : 's'} - original: ${esc(b.startDate)} to ${esc(b.endDate)}</div></div>`).join(''));
}

module.exports = { WALLET, catalogRow, catalogPlate, visibleBanners, dayLeft, gachaListData, checkDraw, payDraw, drawResultFields, detailPage, oddsPage, catalogPage };
