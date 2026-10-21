// Prova degli speciali a danno variabile (variable-power.js, I-189):
//   node server/test-variable-power.js
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { variablePower, patch, TYPE_OF_CONDITION } = require('./variable-power');
const { NOTICES } = require('./routes-info-album');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const clone = (x) => JSON.parse(JSON.stringify(x));

// Cloud II EX 7★ (Roboloid 999, burst 3000999): LowMulti 7.12, HighMulti 8.64, HigherHP; riga come la lascia burstPowerFix
// (passi della khuxwiki: x6.90 senza pallini, x7.12 a 5 pallini)
const cloudRobo = { ID: 999, LowMulti: 7.12, HighMulti: 8.64, Ability: { Condition: 'HigherHP' } };
const cloud = { burstId: 3000999, name: 'Omnislash +6', damageType: 1, maxEnhanceCount: 5,
  basePower: 69000, basePowerPerEnforce: [69440, 69880, 70320, 70760, 71200],
  displayPower: 69000, displayPowerPerEnforce: [69440, 69880, 70320, 70760, 71200],
  displayMaxPower: 0, displayMaxPowerPerEnforce: [0, 0, 0, 0, 0], specialPowerType: 1, sp1: 0, sp2: 0,
  sp1PerEnforce: [0, 0, 0, 0, 0], sp2PerEnforce: [0, 0, 0, 0, 0] };
// condizione senza tipo noto (OneEnemy): resta tipo 1
const oneRobo = { ID: 500, LowMulti: 5.0, HighMulti: 9.0, Ability: { Condition: 'OneEnemy' } };
const one = { ...clone(cloud), burstId: 3000500, maxEnhanceCount: 0, basePower: 50000, displayPower: 50000,
  basePowerPerEnforce: [1, 1, 1, 1, 1], displayPowerPerEnforce: [1, 1, 1, 1, 1] };
// Poison (tipo 20, verificato sulle 6 righe originali: displayMax = base + sp1, sp2 0)
const poiRobo = { ID: 501, LowMulti: 2.0, HighMulti: 3.5, Ability: { Condition: 'Poison' } };
const poi = { ...clone(cloud), burstId: 3000501, maxEnhanceCount: 2, basePower: 19000, displayPower: 19000,
  basePowerPerEnforce: [19500, 20000, 1, 1, 1], displayPowerPerEnforce: [19500, 20000, 1, 1, 1] };
// riga originale di thethiny tipo 4 (10183, 1 pallino) in una riga del master con 3 pallini
const orig = { burstId: 10183, damageType: 1, maxEnhanceCount: 1, basePower: 13400, basePowerPerEnforce: [13600, 1, 1, 1, 1],
  displayPower: 15461, displayPowerPerEnforce: [15692, 1, 1, 1, 1], specialPowerType: 4, sp1: 11538, sp2: 10000,
  sp1PerEnforce: [11538, 0, 0, 0, 0], sp2PerEnforce: [10000, 0, 0, 0, 0], displayMaxPower: 28861,
  displayMaxPowerPerEnforce: [29292, 0, 0, 0, 0] };
const mo = { ...clone(cloud), burstId: 10183, maxEnhanceCount: 3, basePower: 13400, displayPower: 15461,
  basePowerPerEnforce: [13600, 13800, 14000, 1, 1], displayPowerPerEnforce: [15692, 15923, 16154, 1, 1] };
// danno fisso: non si tocca
const fixed = { ...clone(cloud), burstId: 3000502, damageType: 2 };
const fixRobo = { ID: 502, LowMulti: 1, HighMulti: 2, Ability: { Condition: 'HigherHP' } };

check(TYPE_OF_CONDITION.HigherHP === 4 && TYPE_OF_CONDITION.LowerHP === 3 && !('OneEnemy' in TYPE_OF_CONDITION), 'mappa delle condizioni');

const bursts = [cloud, one, poi, mo, fixed].map(clone);
const robo = new Map([cloudRobo, oneRobo, poiRobo, fixRobo].map((d) => [d.ID, d]));
const st = variablePower(bursts, { origBursts: new Map([[10183, orig]]), robo, medals: [] });
const c = bursts[0];
check(c.specialPowerType === 4 && c.sp2 === 10000, `Cloud II EX tipo 4: ${c.specialPowerType}/${c.sp2}`);
check(c.displayPowerPerEnforce[4] === 71200 && c.displayMaxPowerPerEnforce[4] === 86400, `Cloud a 5 pallini x7.12 - 8.64: ${c.displayPowerPerEnforce[4]} - ${c.displayMaxPowerPerEnforce[4]}`);
check(c.displayPower === 69000 && Math.abs(c.displayMaxPower - 83730) <= 2, `Cloud a 0 pallini ~x6.90 - 8.37: ${c.displayPower} - ${c.displayMaxPower}`);
// formula degli originali tipo 3/4: display = base*sp1/1e4, max = base*(sp1+sp2)/1e4; base intera: scarto fino a sp1/2e4
// (2.3 con sp1 46842), il display resta il valore esatto del video
const tol = c.sp1 / 2e4 + 0.5;
check(Math.abs(c.basePower * c.sp1 / 1e4 - c.displayPower) <= tol && c.displayMaxPower === c.displayPower + c.basePower, 'Cloud: formula tipo 4 a 0 pallini');
check(c.basePowerPerEnforce.every((bp, i) => Math.abs(bp * c.sp1PerEnforce[i] / 1e4 - c.displayPowerPerEnforce[i]) <= tol), 'Cloud: formula tipo 4 per pallino');
check(JSON.stringify(c.sp1PerEnforce) === JSON.stringify(Array(5).fill(c.sp1)) && JSON.stringify(c.sp2PerEnforce) === JSON.stringify(Array(5).fill(10000)), 'Cloud: sp per pallino');

const o = bursts[3];
check(o.specialPowerType === 4 && o.sp1 === 11538 && o.sp2 === 10000 && o.displayMaxPower === 28861, 'thethiny: tipo, sp1, sp2, max verbatim');
check(JSON.stringify(o.displayMaxPowerPerEnforce) === JSON.stringify([29292, 29723, 30154, 0, 0]), `thethiny: max per pallino esteso: ${o.displayMaxPowerPerEnforce}`);
check(JSON.stringify(o.sp1PerEnforce) === JSON.stringify([11538, 11538, 11538, 0, 0]) && JSON.stringify(o.sp2PerEnforce) === JSON.stringify([10000, 10000, 10000, 0, 0]), `thethiny: sp per pallino estesi: ${o.sp1PerEnforce}`);

const p = bursts[2];
check(p.specialPowerType === 20 && p.sp1 === 15000 && p.sp2 === 0 && p.basePower === 19000 && p.displayMaxPower === 34000 &&
  JSON.stringify(p.displayMaxPowerPerEnforce) === JSON.stringify([34500, 35000, 0, 0, 0]), `Poison tipo 20: ${p.specialPowerType} ${p.sp1} ${p.displayMaxPowerPerEnforce}`);

check(bursts[1].specialPowerType === 1 && bursts[1].displayMaxPower === 0, 'OneEnemy resta tipo 1');
check(st.unmapped.OneEnemy === 1 && st.unmappedRows.some((r) => r.burstId === 3000500 && r.condition === 'OneEnemy'), `OneEnemy nel resoconto: ${JSON.stringify(st.unmapped)}`);
check(bursts[4].specialPowerType === 1 && bursts[4].displayMaxPower === 0, 'danno fisso invariato');
check(st.orig === 1 && st.ratio === 1 && st.additive === 1, `conteggi: ${JSON.stringify(st)}`);

// idempotenza in memoria
const again = clone(bursts);
variablePower(again, { origBursts: new Map([[10183, orig]]), robo, medals: [] });
check(JSON.stringify(again) === JSON.stringify(bursts), 'due volte = una volta');

// idempotenza sul master vero (copia), se c'e'
const MASTER = path.join(__dirname, 'master_data', 'burst.json');
const ROBO_DB = process.env.KHUX_ROBOLOID_DB || 'D:\\Progetto_Restauro_KH_UX\\external\\roboloid\\medal_db.json';
const ORIG = process.env.KHUX_ORIG_BURST || 'D:\\Progetto_Restauro_KH_UX\\external\\thethiny_2026-10-13\\KHUx-Server\\data\\burst.json';
if (fs.existsSync(MASTER) && fs.existsSync(ROBO_DB) && fs.existsSync(ORIG)) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'varpow-'));
  fs.copyFileSync(MASTER, path.join(dir, 'burst.json'));
  const s1 = patch(dir);
  const first = fs.readFileSync(path.join(dir, 'burst.json'), 'utf8');
  patch(dir);
  check(first === fs.readFileSync(path.join(dir, 'burst.json'), 'utf8'), 'patch sul master: idempotente');
  const rows = JSON.parse(first);
  const cl = rows.find((r) => r.burstId === 3000999);
  check(cl && cl.specialPowerType === 4 && cl.displayMaxPowerPerEnforce[4] === 86400, 'master: Cloud II EX tipo 4, max x8.64');
  check(rows.every((r) => !(r.specialPowerType > 2) || r.displayMaxPower > r.displayPower), 'master: ogni riga variabile ha il massimo sopra il minimo');
  check(s1.orig >= 60 && s1.ratio > 0, `master: conteggi ${JSON.stringify({ orig: s1.orig, ratio: s1.ratio, additive: s1.additive })}`);
  fs.rmSync(dir, { recursive: true, force: true });
}

// la ricostruzione e' dichiarata nelle Notices
check(NOTICES.some((n) => /variable/i.test(n.title) && /reconstructed/.test(n.body.join(' '))), 'notice degli speciali variabili');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('test-variable-power: ok');
