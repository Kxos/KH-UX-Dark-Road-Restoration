// Prova del Level Up (POST /user/medal/enhance, azione 55) con medaglie speciali, senza client:
// chiama respondMedalEnhance di server.js su un salvataggio temporaneo. Serve un master
// rigenerato con make-game-tables.js (guiltProb piena, burst con pallini, 300948/300913):
//
//   node server/test-medal-enhance.js [cartella master]   (default server/master_data)
//
// Non tocca server/save: KHUX_SAVE punta a un file temporaneo.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const MASTER = path.resolve(process.argv[2] || path.join(__dirname, 'master_data'));
const SAVE = path.join(os.tmpdir(), `khux-test-enhance-${process.pid}.json`);
process.env.KHUX_MASTER_DIR = MASTER;
process.env.KHUX_SAVE = SAVE;
delete process.env.KHUX_GUILT_BURST_LV;
delete process.env.KHUX_GUILT_BURST_POPUP;
const log = console.log;
console.log = () => {};   // il server stampa molto al caricamento e a ogni Level Up
const { _test: t } = require('./server');
console.log = log;
const g = require('./medal-guilt');

const medal = JSON.parse(fs.readFileSync(path.join(MASTER, 'medal.json'), 'utf8'));
const burst = JSON.parse(fs.readFileSync(path.join(MASTER, 'burst.json'), 'utf8'));
const stage = JSON.parse(fs.readFileSync(path.join(MASTER, 'stage.json'), 'utf8'));
const gp = JSON.parse(fs.readFileSync(path.join(MASTER, 'guiltProb.json'), 'utf8'));
assert.ok(gp.length > 0, 'guiltProb vuota: rigenerare il master con make-game-tables.js');
const byId = new Map(medal.map((r) => [r.medalId, r]));
const bById = new Map(burst.map((r) => [r.burstId, r]));

// una 6★ con tier e attacco speciale (come test-medal-guilt.js)
const base = medal.find((r) => r.type === 1 && r.rare === 6 && r.guiltValue >= 3 && r.medalId < 300000 && r.validBurst);
const maxDots = bById.get(base.burstId).maxEnhanceCount;
const range = g.guiltRange(gp, base.guiltValue);
log('base', base.medalId, base.name, 'tier', base.guiltValue, 'pallini max', maxDots, 'guilt', range,
  'addMaxAttack', base.addMaxAttack, 'addMaxDefense', base.addMaxDefense, 'cost', base.cost, base.minCost);
assert.equal(maxDots, 5, 'la burst di una 6★ deve avere 5 pallini');
assert.equal(base.cost - base.minCost, 20, 'Cid: 6★ con 20 riduzioni');

const p = t.player;
Object.assign(p, { created: true, money: 10000000, medals: [], medalState: {}, lastClearStageId: 0, guiltBurst: undefined });
let nextId = 101;
const give = (medalId, n = 1) => Array.from({ length: n }, () => {
  const m = { userMedalId: nextId++, medalId, level: 1, exp: 0 };
  p.medals.push(m);
  return m.userMedalId;
});
function enhance(baseId, cells, numbers = []) {
  let out;
  const res = { writeHead: () => {}, end: (b) => { out = JSON.parse(b.toString('utf8')); } };
  console.log = () => {};
  try { t.respondMedalEnhance(res, { baseUserMedalId: baseId, componentUserMedalIds: cells, numbers, isOverwriteSkill: 0, isGreatSuccess: 0 }); }
  finally { console.log = log; }
  return out;
}
const state = (id) => t.userMedalList().find((m) => m.userMedalId === id);

const b = give(base.medalId)[0];
// 1. cinque copie: 5 pallini, EXP e livello come prima, materiali consumati
let r = enhance(b, give(base.medalId, 5));
assert.equal(r.afterEnhanceUserMedal.burstUpperNumber, 5);
assert.equal(r.afterEnhanceUserMedal.guiltFactor, 0);
assert.ok(r.afterEnhanceUserMedal.level > 1 && r.afterEnhanceUserMedal.exp > 0, 'EXP del Level Up normale');
assert.equal(r.beforeEnhanceUserMedal.burstUpperNumber, 0);
assert.equal(r.componentUserMedalIds.length, 5);
assert.equal(r.userMedals.find((m) => m.userMedalId === b).burstUpperNumber, 5);
log('1. 5 copie: pallini', r.afterEnhanceUserMedal.burstUpperNumber, 'LV', r.afterEnhanceUserMedal.level, 'exp', r.afterEnhanceUserMedal.exp);

// 2. senza Power Bangle (Quest 34) una copia in piu' non sblocca la guilt
assert.equal(t.isGuiltUnlocked(), 0);
r = enhance(b, give(base.medalId));
assert.equal(r.afterEnhanceUserMedal.guiltFactor, 0);
log('2. senza Quest 34: guilt', r.afterEnhanceUserMedal.guiltFactor);

// 3. Quest 34 superata: la copia sblocca la guilt nell'intervallo del tier; Burst +1
p.lastClearStageId = stage.find((s) => s.id === 34).stageId;
assert.equal(t.isGuiltUnlocked(), 1);
const lv0 = t.userPointData('2026-10-12 00:00:00').guiltBurstLv;
r = enhance(b, give(base.medalId));
const gf = r.afterEnhanceUserMedal.guiltFactor;
assert.ok(gf >= range.min && gf <= range.max, `guilt ${gf} fuori da ${range.min}-${range.max}`);
assert.equal(state(b).guiltFactor, gf, 'guilt salvata in medalState');
const lv1 = r.userData.userPoint.guiltBurstLv;
assert.equal(lv1, lv0 + 1, 'prima guilt: Burst +1');
log('3. Quest 34: guilt', gf, 'Burst', lv0, '->', lv1);

// 4. Magic Mirror x2 (pila: una cella, numbers [2]): +1% ciascuno, fino al massimo
const mirrors = give(90156, 2);
r = enhance(b, [mirrors[0]], [2]);
assert.equal(r.afterEnhanceUserMedal.guiltFactor, Math.min(range.max, gf + 200));
assert.equal(t.userMedalList().filter((m) => m.medalId === 90156).length, 0, 'specchi consumati');
log('4. Mirror x2: guilt', r.afterEnhanceUserMedal.guiltFactor);

// 5. Chip 6★ x10, Dale 6★, Cid 10 x3: STR/DEF e costo con i limiti della base
const chips = give(90056, 10), dale = give(90066), cids = give(90078, 3);
r = enhance(b, [chips[0], dale[0], cids[0]], [10, 1, 3]);
const a = r.afterEnhanceUserMedal;
assert.equal(a.attackUpperNumber, Math.min(base.addMaxAttack, 1500));
assert.equal(a.defenseUpperNumber, Math.min(base.addMaxDefense, 150));
assert.equal(a.upperCost, -20, 'upperCost al client: negativo ([fn])');
assert.equal(state(b).upperCost, 20, 'medalState: riduzione positiva');
assert.equal(a.burstUpperNumber, 5, 'pallini conservati');
log('5. Chip x10, Dale, Cid 10 x3: STR +', a.attackUpperNumber, 'DEF +', a.defenseUpperNumber, 'upperCost', a.upperCost);

// 6. guilt al massimo (rilanci + specchi): Burst +5 (prima guilt massima)
for (let i = 0; i < 200 && state(b).guiltFactor < range.max; i++) enhance(b, [give(90156)[0]]);
assert.equal(state(b).guiltFactor, range.max);
r = enhance(b, give(90056));   // una fusione qualsiasi per rileggere il Burst
assert.equal(r.userData.userPoint.guiltBurstLv, lv1 + 5, 'guilt massima: Burst +5');
log('6. guilt massima', state(b).guiltFactor, 'Burst', r.userData.userPoint.guiltBurstLv);

// 7. Fantasia Mickey B (type 8) su un'altra 6★ con 2 pallini: +1
if (byId.has(g.MICKEY_B_ID)) {
  const other = medal.find((x) => x.type === 1 && x.rare === 6 && x.validBurst && x.medalId !== base.medalId && x.medalId < 300000
    && bById.get(x.burstId)?.maxEnhanceCount === 5);
  const o = give(other.medalId)[0];
  enhance(o, give(other.medalId, 2));
  assert.equal(state(o).burstUpperNumber, 2);
  r = enhance(o, give(g.MICKEY_B_ID));
  assert.equal(r.afterEnhanceUserMedal.burstUpperNumber, 3);
  log('7. Mickey & Brooms:', other.name, 'pallini 2 -> 3');
  // Fantasia Mickey A evolvibile con 5 Magic Broom
  const ma = byId.get(90085);
  assert.deepEqual([ma.validEvolve, ma.evolveId, ma.validEvolveNeed, ma.evolveNeedId[0]], [1, g.MICKEY_B_ID, 5, g.BROOM_ID]);
} else log('7. saltato: master senza 300913 (KHUX_MEDALS_ALL=1)');

// 8. medaglia senza attacco speciale (Dewey) + copia: niente pallini, EXP normale
const dewey = give(90041)[0];
r = enhance(dewey, give(90041));
assert.equal(r.afterEnhanceUserMedal.burstUpperNumber, 0);
assert.equal(r.afterEnhanceUserMedal.guiltFactor, 0);
log('8. Dewey: pallini 0, LV', r.afterEnhanceUserMedal.level);

// medaglia 1 (Stock Medal) intatta
assert.equal(byId.get(1).imageId, 90000);
try { fs.unlinkSync(SAVE); } catch {}
log('OK');
