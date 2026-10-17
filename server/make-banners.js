#!/usr/bin/env node
// Generatore del master drawMedalType (spec 2026-10-16-shop-banner-design.md, sotto-progetto 2).
//   node server/make-banners.js        poi alzare KHUX_REVISION (master drawMedalType)
// Fonte (fuori da git): server/game_data/gacha_catalog.json, scritto da recon/tools/make_banner_catalog.py.
// Uscita (fuori da git): server/master_data/drawMedalType.json = piastra Catalog (9001) + una riga per
// ogni banner del catalogo. Il master serve per Details (detailUrl) e la striscia scorrevole (comment);
// la lista dello Shop la decide il server a ogni /gacha/list (gacha.js). Mai price 0, mai benefitId != 0;
// payType fuori da [1, 4, 5, 6, 7, 8] (3, 9) diventa 1: quei banner restano solo nel catalogo.
'use strict';
const fs = require('fs');
const path = require('path');
const gd = require('./gacha-data');

const MASTER = process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data');
const GAME = process.env.KHUX_GAME_DATA || path.join(__dirname, 'game_data');

// Striscia scorrevole: composizione e limite o garanzia (stringa printf: drawMedalTypeRow raddoppia i %).
function commentOf(b) {
  const mix = (b.rarityMix || []).map(([r, n]) => `${n}x ${r}★+`).join(', ');
  const extra = b.guarantee?.pity ? ` - featured Medal guaranteed within ${b.guarantee.pity} draws`
    : b.vipFree ? ' - one free VIP draw per day' : b.dayLimit ? ` - ${b.dayLimit === 1 ? 'once' : `${b.dayLimit} times`} per day` : '';
  return `${b.lotCount} Medal${b.lotCount === 1 ? '' : 's'}${mix ? `: ${mix}` : ''}${extra}`;
}

function masterRows(catalog) {
  return [require('./gacha').catalogRow(), ...catalog.banners.map((b, i) => gd.drawMedalTypeRow({
    drawMedalTypeId: b.drawMedalTypeId, name: b.name, payType: [1, 4, 5, 6, 7, 8].includes(b.payType) ? b.payType : 1,
    price: Math.max(1, (b.prices || [])[0] || 1), sortId: 10 + i,
    bannerUrl: `/web/gacha/img/${b.drawMedalTypeId}.png`, detailUrl: `/web/gacha/detail/${b.drawMedalTypeId}`, comment: commentOf(b),
  }))];
}

function main() {
  const file = path.join(GAME, 'gacha_catalog.json');
  const catalog = gd.loadCatalog(file);
  if (!catalog.banners.length) {
    console.error(`${file}: nessun banner, lanciare prima recon/tools/make_banner_catalog.py`);
    process.exit(1);
  }
  const rows = masterRows(catalog);
  fs.writeFileSync(path.join(MASTER, 'drawMedalType.json'), JSON.stringify(rows));
  console.log(`drawMedalType.json: ${rows.length} righe (piastra Catalog + ${catalog.banners.length} banner)`);
  console.log('poi alzare KHUX_REVISION (drawMedalType)');
}

if (require.main === module) main();
module.exports = { commentOf, masterRows };
