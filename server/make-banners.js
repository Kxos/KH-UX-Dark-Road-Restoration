#!/usr/bin/env node
// Generatore dei banner dello Shop (spec 2026-10-16-shop-banner-design.md, sotto-progetto 1).
//   node server/make-banners.js        poi alzare KHUX_REVISION (master drawMedalType)
// Fonti fuori dal repo (dati raccolti, sola lettura):
//   KHUX_BANNERS_TSV (default <repo>/../../reference/banners/banners_ww.tsv) e la cartella delle
//   immagini accanto (img/); KHUX_WIKI_JSON (default <repo>/../../wiki/wiki_all.json);
//   server/master_data/medal.json.
// Uscite (ignorate da git): server/master_data/drawMedalType.json (piastra Catalog + banner),
//   server/game_data/gacha_banners.json (catalogo con i pool), server/game_data/gacha_img/<id>.png
//   (solo immagini gia' 640x140; 9001.png lo scrive recon/tools/make_shop_art.py).
// Pool (ricostruito): medaglie d'attacco della wiki con naset <= set piu' alto citato nelle note
// («Draws from sets 1.1, 1.2 ...»), altrimenti <= MAX_SET_NOW (storia restaurata fino alla quest 525,
// 8/12/2016 = set 9); esclusi class1 Event/VIP/Bonus, medaglie impilabili, id >= 300000 e
// medaglie con darklight === 3 (la loro animazione di risultato Medal_D_None* manca nelle risorse:
// probabile crash alla scena).
'use strict';
const fs = require('fs');
const path = require('path');
const gd = require('./gacha-data');

const ROOT = path.resolve(__dirname, '..');
const TSV = process.env.KHUX_BANNERS_TSV || path.resolve(ROOT, '..', '..', 'reference', 'banners', 'banners_ww.tsv');
const WIKI = process.env.KHUX_WIKI_JSON || path.resolve(ROOT, '..', '..', 'wiki', 'wiki_all.json');
const MASTER = process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data');
const GAME = process.env.KHUX_GAME_DATA || path.join(__dirname, 'game_data');

const PLAN_ROWS = ['B0001', 'B0027', 'B0011']; // Daily Deal, Small Deal, Epic Medal Carnival
const TEST_ROWS = ['B0456'];                   // Platinum Ticket Draw (2019): solo con KHUX_GACHA_TEST=1
const MAX_SET_NOW = 9;
const CURRENCY = { Jewels: 1, 'Platinum Ticket': 7, 'Draw Ticket': 8 };
const NO_DRAW_CLASS = /^(Event|VIP|Bonus)/;

function parseTsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  const head = lines.shift().split('\t');
  return lines.map((l) => { const c = l.split('\t'); return Object.fromEntries(head.map((h, i) => [h, c[i] ?? ''])); });
}

function wikiMedals(wiki) {
  const out = [];
  for (const text of Object.values(wiki)) {
    for (const block of String(text).matchAll(/\{\{InfoMedal([\s\S]*?)\n\}\}/g)) {
      const f = {};
      for (const m of block[1].matchAll(/^\|(\w+)=(.*)$/gm)) f[m[1]] = m[2].trim();
      const naset = Number(f.naset);
      if (f.name && Number.isInteger(naset) && naset >= 1) out.push({ name: f.name, naset, class1: f.class1 || '', class2: f.class2 || '' });
    }
  }
  return out;
}

function maxSetOf(notes) {
  const m = /sets? ([\d., and]+)/.exec(notes || '');
  if (!m) return MAX_SET_NOW;
  const sets = [...m[1].matchAll(/(\d+)\.\d+/g)].map((x) => Number(x[1]));
  return sets.length ? Math.max(...sets) : MAX_SET_NOW;
}

function buildPool(names, medalRows, rarities) {
  const want = new Set(names);
  const pool = {};
  for (const r of medalRows) {
    if (!want.has(r.name) || r.type !== 1 || r.validPack === 1 || r.medalId >= 300000 || r.darklight === 3 || !rarities.includes(r.rare)) continue;
    (pool[r.rare] = pool[r.rare] || []).push(r.medalId);
  }
  for (const k of Object.keys(pool)) pool[k].sort((a, b) => a - b);
  return pool;
}

function bannerFromRow(row, { wikiList, medalRows, test, sortId }) {
  const payType = CURRENCY[row.currency];
  if (!payType) throw new Error(`${row.row_id}: moneta ${row.currency} non gestita`);
  const lotCount = Number(String(row.draw_size).replace(/^x/, ''));
  const rarityMix = gd.parseRarityMix(row.rarity_mix);
  const maxSet = maxSetOf(row.notes);
  const names = wikiList.filter((w) => w.naset <= maxSet && !NO_DRAW_CLASS.test(w.class1) && /Attack/.test(w.class2)).map((w) => w.name);
  const rarities = [...new Set(rarityMix.flatMap(([r]) => [r, r + 1]))];
  const isDayLimited = /once (per|a) day/i.test(row.notes) ? 1 : 0;
  const mix = rarityMix.map(([r, n]) => `${n}x ${r}★+`).join(', ');
  const comment = `${lotCount} Medal${lotCount === 1 ? '' : 's'}: ${mix}${isDayLimited ? ' - once per day' : ''}`;
  const b = {
    drawMedalTypeId: 10000 + Number(row.row_id.slice(1)), rowId: row.row_id, name: row.name,
    startDate: row.start_pt, endDate: row.end_pt, status: row.status, payType, price: parseInt(row.price, 10),
    lotCount, isDayLimited, rarityMix, pool: buildPool(names, medalRows, rarities), maxSet,
    image: row.image_file, guarantees: row.guarantees, notes: row.notes, test, sortId, comment,
  };
  for (const [r] of rarityMix) if (!(b.pool[r] || []).length) throw new Error(`${row.row_id}: nessuna medaglia ${r}★ nel pool`);
  return b;
}

function main() {
  const rows = parseTsv(fs.readFileSync(TSV, 'utf8'));
  const wikiList = wikiMedals(JSON.parse(fs.readFileSync(WIKI, 'utf8')));
  const medalRows = JSON.parse(fs.readFileSync(path.join(MASTER, 'medal.json'), 'utf8'));
  const pick = [...PLAN_ROWS.map((id) => [id, false]), ...TEST_ROWS.map((id) => [id, true])];
  const banners = pick.map(([id, test], i) => {
    const row = rows.find((r) => r.row_id === id);
    if (!row) throw new Error(`${id} assente da ${TSV}`);
    return bannerFromRow(row, { wikiList, medalRows, test, sortId: 10 * (i + 1) });
  });
  const master = [require('./gacha').catalogRow(), ...banners.map((b) => gd.drawMedalTypeRow({
    drawMedalTypeId: b.drawMedalTypeId, name: b.name, payType: b.payType, price: b.price, sortId: b.sortId,
    bannerUrl: `/web/gacha/img/${b.drawMedalTypeId}.png`, detailUrl: `/web/gacha/detail/${b.drawMedalTypeId}`, comment: b.comment,
  }))];
  fs.writeFileSync(path.join(MASTER, 'drawMedalType.json'), JSON.stringify(master));
  fs.mkdirSync(path.join(GAME, 'gacha_img'), { recursive: true });
  fs.writeFileSync(path.join(GAME, 'gacha_banners.json'), JSON.stringify({ banners }));
  const imgDir = path.join(path.dirname(TSV), 'img');
  for (const b of banners) {
    const row = rows.find((r) => r.row_id === b.rowId);
    const src = path.join(imgDir, b.image);
    if (row.image_size !== '640x140' || !fs.existsSync(src)) { console.log(`  ${b.rowId}: immagine ${b.image} (${row.image_size}) non copiata`); continue; }
    fs.copyFileSync(src, path.join(GAME, 'gacha_img', `${b.drawMedalTypeId}.png`));
  }
  for (const b of banners) console.log(`${b.rowId} ${b.name}: id ${b.drawMedalTypeId}, payType ${b.payType} x${b.price}, ${b.lotCount} medaglie, set <= ${b.maxSet}, pool ${Object.entries(b.pool).map(([r, l]) => `${r}★ ${l.length}`).join(' ')}${b.test ? ' (prova)' : ''}`);
  console.log('poi alzare KHUX_REVISION (drawMedalType)');
}

if (require.main === module) main();
module.exports = { parseTsv, wikiMedals, maxSetOf, buildPool, bannerFromRow, PLAN_ROWS, TEST_ROWS, MAX_SET_NOW };
