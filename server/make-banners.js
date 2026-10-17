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
  if (!b.lotCount) return 'Banner Catalog only'; // banner INCOMPLETE senza dettagli originali
  const mix = (b.rarityMix || []).map(([r, n]) => `${n}x ${r}★+`).join(', ');
  const lim = gd.limitText(b);
  const extra = b.guarantee?.pity ? ` - featured Medal guaranteed within ${b.guarantee.pity} draws`
    : b.vipFree ? ' - one free VIP draw per day' : lim ? ` - ${lim}` : '';
  return `${b.lotCount} Medal${b.lotCount === 1 ? '' : 's'}${mix ? `: ${mix}` : ''}${extra}`;
}

// Striscia della garanzia. Con pity: conto alla rovescia (display = number = pity) e validComment 0, il client
// scrive «<nome> guaranteed in N tries!» dai nomi di warrantMedalIds (Task 6). Senza pity: la striscia di oggi.
// Con WARRANT_XML_SAFE un nome con «&» (o «<») romperebbe il parser XML del client: validComment 1 e
// comment XML scritto da noi, con i nomi escapati e il solo %d (ricerca §2, U3: da provare al banco).
const WARRANT_XML_SAFE = false;
const xmlEsc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function warrantOf(b, xmlSafe = WARRANT_XML_SAFE) {
  const pity = b.guarantee?.pity;
  if (!pity) return { display: 1, number: 0, validComment: 1 };
  const names = b.guarantee.pityNames || [];
  if (xmlSafe && names.some((n) => /[&<>]/.test(n))) {
    return { display: pity, number: pity, validComment: 1,
      comment: `<important>${names.map(xmlEsc).join(' &amp; ')}</important> guaranteed in <important>%d tries</important>!` };
  }
  return { display: pity, number: pity, validComment: 0 };
}

function masterRows(catalog, xmlSafe = WARRANT_XML_SAFE) {
  return [require('./gacha').catalogRow(), ...catalog.banners.map((b, i) => gd.drawMedalTypeRow({
    drawMedalTypeId: b.drawMedalTypeId, name: b.name, payType: [1, 4, 5, 6, 7, 8].includes(b.payType) ? b.payType : 1,
    price: Math.max(1, (b.prices || [])[0] || 1), sortId: 10 + i,
    bannerUrl: `/web/gacha/img/${b.drawMedalTypeId}.png`, detailUrl: `/web/gacha/detail/${b.drawMedalTypeId}`, comment: warrantOf(b, xmlSafe).comment || commentOf(b), warrant: warrantOf(b, xmlSafe),
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
module.exports = { commentOf, masterRows, warrantOf, WARRANT_XML_SAFE };
