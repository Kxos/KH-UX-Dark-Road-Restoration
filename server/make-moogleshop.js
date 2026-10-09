#!/usr/bin/env node
// Genera server/master_data/moogleshop.json: gli articoli del Moogle Shop (scheda Items e
// scheda Traits), assenti dai master serviti. Righe dalla khuxwiki (pagina «Moogle Shop»,
// tabelle 2020-2021) e dagli screenshot in reference\moogle_shop\ (Rainbow Gem x10 = 100
// jewel, x100 = 1.000; Attack Boost XV Max x1 = 100).
//
// Campi (parser del client 0xf1e5d8, recon/out/master_types_ww431.json): moogleshopId,
// type, sortId, shuffleSkillId, itemType, itemId, skillType, skillId, skillLv,
// burstUpperNumber, itemNum, flavor, benefitId, payType, price, count, cpTitle, frameType,
// display, startDate, endDate. Ipotesi da verificare sul banco: type = scheda (1 Traits,
// 2 Items), itemType come i premi (3 medaglia, 5 materiale), payType 1 = jewel,
// count = scambi possibili (0 senza limite), display 1 = visibile, frameType 1 = riga blu
// (Panel; altrimenti Panel_Rare dorata, changeRowItem).
//
//   node server/make-moogleshop.js

const fs = require('fs');
const path = require('path');

const OUT = process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data');
const schema = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'recon', 'out', 'master_types_ww431.json'), 'utf8'));

function blank(table) {
  const row = {};
  for (const [f, t] of schema[table]) row[f] = t.startsWith('string') ? '' : 0;
  return row;
}

const TAB_TRAITS = 1;
const TAB_ITEMS = 2;
const JEWEL = 1;
const rows = [];
function add(fields) {
  rows.push(Object.assign(blank('moogleshop'), {
    moogleshopId: rows.length + 1, sortId: rows.length + 1, payType: JEWEL, display: 1, frameType: 1,
    startDate: '2015-01-01 00:00:00', endDate: '2099-12-31 23:59:59',
  }, fields));
}

// Items: gemme (tabella material) x10 a 100 jewel e x100 a 1.000
const GEMS = [[47, 'Rainbow Gem'], [48, 'Power Gem'], [49, 'Speed Gem'], [50, 'Magic Gem'],
  [51, 'Sun Gem'], [52, 'Moon Gem'], [53, 'Brilliant Gem']];
for (const [id] of GEMS) {
  add({ type: TAB_ITEMS, itemType: 5, itemId: id, itemNum: 10, price: 100 });
  add({ type: TAB_ITEMS, itemType: 5, itemId: id, itemNum: 100, price: 1000 });
}
// Items: medaglie a 10 jewel (khuxwiki: Cid, Huey & Dewey & Louie, Chip, Dale 6★; Yen Sid
// 4★; Fairy Godmother 3★; Merlin 2★; Cheshire Cat ★)
for (const id of [90078, 90146, 90056, 90066, 90084, 90083, 90082, 90081]) {
  add({ type: TAB_ITEMS, itemType: 3, itemId: id, itemNum: 1, price: 10 });
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'moogleshop.json'), JSON.stringify(rows));
console.log(`moogleshop: ${rows.length} righe (Traits ${rows.filter((r) => r.type === TAB_TRAITS).length})`);
