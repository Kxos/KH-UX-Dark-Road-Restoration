// Prova delle righe boosted del master medal (medal-boost.js, make-boosted-medals.js):
//   node server/test-medal-boost.js
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const mb = require('./medal-boost');
const { patch } = require('./make-boosted-medals');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };

// riga normale (SN++ - Master Eraqus, video LFJ5: Cost 46 -> 36 sulla boosted)
const N = { medalId: 301993, name: 'SN++ - Master Eraqus', displayId: 300, attack: 44011, maxAttack: 44011, defense: 16591, maxDefense: 16591,
  cost: 46, minCost: 26, groupId: 0, validPack: 0, evolveId: 0, imageId: 301993, sortId: 1861 };
const r = mb.boostedRow(N, 1000, 1000);
check(r.medalId === 2301993 && r.displayId === 301 && r.groupId === 301993, 'id, badge, gruppo');
check(r.attack === 45011 && r.maxAttack === 45011 && r.defense === 17591 && r.maxDefense === 17591 && r.cost === 36 && r.minCost === 16, 'statistiche (video: Cost 36)');
check(r.imageId === N.imageId && r.name === N.name && r.validPack === 0 && r.evolveId === N.evolveId, 'stesse immagini, cella propria, stesso Evolve');
check(mb.boostedRow({ ...N, displayId: 31013 }, 1000, 0).displayId === 1 && mb.boostedRow({ ...N, displayId: 31013 }, 1000, 0).defense === 16591, 'senza badge, solo STR');
check(mb.boostedRow({ ...N, displayId: 1300 }, 1000, 1000).displayId === 1301, 'variante R');
check(mb.boostedIndex([N, r]).get('301993:1000:1000') === 2301993, 'indice');

// varianti e altri campi
check(mb.boostedId(301993, 1000, 0) === 1301993 && mb.boostedId(301993, 2000, 2000) === 3301993, 'id delle varianti');
check(mb.boostedRow({ ...N, cost: 5, minCost: 3 }, 1000, 1000).cost === 0 && mb.boostedRow({ ...N, cost: 5, minCost: 3 }, 1000, 1000).minCost === 0, 'costo minimo 0');
check(mb.boostedRow({ ...N, validPack: 1 }, 1000, 1000).validPack === 0, 'validPack 0 anche se la normale e\' impilabile');
const arr = { ...N, evolveNeedId: [1, 2, 0, 0, 0] };
const ra = mb.boostedRow(arr, 1000, 1000);
ra.evolveNeedId[0] = 9;
check(arr.evolveNeedId[0] === 1, 'copia profonda (gli array della normale restano)');
check(mb.isBoosted(r) && !mb.isBoosted(N), 'isBoosted');
let threw = false;
try { mb.boostedId(301993, 500, 500); } catch { threw = true; }
check(threw, 'variante sconosciuta = eccezione');

// patch(): cartella temporanea con medal.json = [N] e un catalogo con boosted per nome
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-boost-'));
const master = path.join(tmp, 'master'), catFile = path.join(tmp, 'gacha_catalog.json');
fs.mkdirSync(master);
fs.writeFileSync(path.join(master, 'medal.json'), JSON.stringify([{ ...N, type: 1, rare: 7, guiltValue: 10 }]));
const cat = { version: 3, medals: {}, subsets: {}, firstRarity: {}, banners: [{ rowId: 'B9999', start: '2019-01-01', end: null, flags: [], rarityMix: [[7, 1]], lotCount: 1,
  pool: { mode: 'sets', sets: [] }, guarantee: { slots: [] },
  enhance: { boosted: [{ on: { names: ['sn++ - master eraqus', 'medaglia assente'] }, str: 1000, def: 1000, chance: 'small' }] } }] };
fs.writeFileSync(catFile, JSON.stringify(cat));
const log = console.log;
console.log = () => {};
let p1, p2, p3;
try {
  p1 = patch(master, catFile);
  p2 = patch(master, catFile);
} finally { console.log = log; }
const rows = JSON.parse(fs.readFileSync(path.join(master, 'medal.json'), 'utf8'));
check(p1 && p1.added === 1, `prima chiamata: 1 aggiunta (${JSON.stringify(p1)})`);
check(p2 && p2.added === 0 && p2.kept === 1, `seconda chiamata: idempotente (${JSON.stringify(p2)})`);
check(p1 && p1.missing === 1, 'nome assente contato');
check(rows.length === 2 && rows[0].groupId === 0 && rows[1].medalId === 2301993 && rows[1].groupId === 301993, 'la normale resta groupId 0');

// famiglie per Tier e per slot
cat.banners[0].enhance.boosted = [
  { on: { star: 7, tierMin: 10, tierMax: null, excludePrime: true }, str: 2000, def: 2000, chance: 'small' },
  { on: { star: 7, tierMin: 11, tierMax: null }, str: 1000, def: 0, chance: 'small' },
];
fs.writeFileSync(catFile, JSON.stringify(cat));
console.log = () => {};
try { p3 = patch(master, catFile); } finally { console.log = log; }
const rows3 = JSON.parse(fs.readFileSync(path.join(master, 'medal.json'), 'utf8'));
check(p3 && p3.added === 1 && rows3.some((x) => x.medalId === 3301993) && !rows3.some((x) => x.medalId === 1301993), `per Tier (${JSON.stringify(p3)})`);
check(p3 && p3.families && p3.families.tier && p3.families.tier.added === 1, 'conteggio per famiglia');

// slot a lista: i nomi della riserva
check(mb.resolveNames({ on: { slots: [1] } }, { guarantee: { slots: [{ kind: 'list', slot: 1, count: 1, star: 7, names: ['a', 'b'] }] } }, {}).join() === 'a,b', 'slot a lista -> nomi della riserva');
// slot non a lista: il pool del banner alla stella dello slot (con il Tier)
const cat2 = { firstRarity: {}, subsets: { s: { date: '2019-01-01', names: ['x', 'y'] } },
  medals: { x: { ids: [[11, 7, '2019-01-01', 5]] }, y: { ids: [[12, 7, '2019-01-01', 3], [13, 6, '2019-01-01', 3]] } } };
const b2 = { start: '2019-02-01', flags: [], rarityMix: [[7, 1], [6, 1]], lotCount: 2, pool: { mode: 'sets', sets: ['s'] },
  guarantee: { slots: [{ kind: 'tier', slot: 0, count: 1, star: 7, names: [], tierMin: 4, tierMax: null }] } };
const ids2 = mb.resolveIds({ on: { slots: [0] } }, b2, cat2, new Map([[11, { guiltValue: 5 }], [12, { guiltValue: 3 }], [13, { guiltValue: 3 }]]));
check(ids2.join() === '11', `slot Tier -> pool della stella con il Tier (${ids2})`);
const ids3 = mb.resolveIds({ on: { star: 7 } }, b2, cat2, new Map());
check(ids3.join() === '11,12', `{star} -> pool della stella (${ids3})`);
fs.rmSync(tmp, { recursive: true, force: true });

if (errors.length) { console.log(`ERRORI (${errors.length})`); errors.forEach((e) => console.log(' -', e)); process.exit(1); }
console.log('OK: righe boosted (id, badge, statistiche, indice, patch idempotente, famiglie)');
