// Speciali a danno variabile (I-189, docs/notes/medaglie.md#danno-variabile, analisi del 21-10):
//
// Il client mostra nel dettaglio della medaglia «x a - b» quando la riga burst ha specialPowerType diverso da 1 e 2
// ([fn]; [fn](dots, row, wantMax) chiede il massimo con la stessa regola): a = displayPower(PerEnforce)
// /1e4, b = displayMaxPower(PerEnforce) +0x2f0/+0x2f4 /1e4, entrambi per il fattore guilt. Le nostre 2276 righe erano tutte
// tipo 1/2 con displayMaxPower 0 (copie dei modelli di burst_base.json): Cloud II EX 7★ (burst 3000999) mostrava x7.12
// invece di «x7.12 - 8.64» (video https://www.youtube.com/watch?v=eLmkNDzwuPE 2:02). L'uso di specialPowerType/sp1/sp2
// nel danno ([fn]/[fn] leggono +0x324) e' dedotto, da verificare al banco.
//
// Tre casi (dopo medal-power-fix.js burstPowerFix, che ha gia' messo base/display di ogni riga):
// a. id presente in thethiny (burst.json originale) con tipo > 2: specialPowerType, sp1, sp2, displayMaxPower verbatim;
//    sp1/sp2PerEnforce e displayMaxPowerPerEnforce estesi ai pallini della riga come ext() di burstPowerFix (0 oltre).
// b. righe Roboloid (3000000 + id) con LowMulti/HighMulti e una condizione di TYPE_OF_CONDITION (abbinata per nome
//    d'attacco con le righe di thethiny):
//    - tipi 3/4 (meno/piu' HP), formula verificata sulle 38/38 righe originali: display = base*sp1/1e4,
//      max = base*(sp1+sp2)/1e4, sp2 = 10000. Al pallino massimo lo = LowMulti*1e4, hi = HighMulti*1e4: bp = hi - lo,
//      sp1 = lo*1e4/bp; per pallino bp_i = lo_i*1e4/sp1, hi_i = lo_i + bp_i (lo_i = display della riga);
//    - tipi 20/21/30 (Poison, Sleep, MoreLUX), verificati su tutte le righe originali (6/6/14, anche per pallino):
//      max = base + sp1 con sp2 costante (0, 0, 1e8): base = display = lo_i, sp1 = hi - lo, max_i = lo_i + sp1;
//    - gli altri tipi della mappa (5, 6, 7, 16, 22, 23, 25, 27, 28, 40): la relazione tra Low/High e sp1/sp2 non e'
//      verificabile sugli originali (22: Dark Blizzaga 10511 ha max - base 6000 con sp1 8500; 5: sp1 9000 o 9990 non
//      ricavabile): restano tipo 1 e finiscono nel resoconto (unverified).
// c. condizioni senza tipo noto (OneEnemy, LowerSlot, Critical, ...): tipo 1, contate nel resoconto (unmapped), niente
//    tipi inventati.
//
// make-game-tables.js lo chiama dopo burstPowerFix; da solo corregge il master sul posto (idempotente):
//   node server/variable-power.js [cartella master]
'use strict';
const fs = require('fs');
const path = require('path');

const ROBO_BURST = 3000000;
// condizione di Roboloid (Ability.Condition) -> specialPowerType degli originali (medaglie.md#danno-variabile).
// HigherSlot ha anche 5 e MoreEnemiesDefeated 28 tra i candidati: collisioni probabili, si tiene il piu' frequente
const TYPE_OF_CONDITION = { LowerHP: 3, HigherHP: 4, DrainsHP: 5, MoreTurns: 6, SPSuccession: 7, DrainsDEF: 16, Poison: 20,
  Sleep: 21, Paralysis: 22, GaugesFull: 23, GaugesUsed: 25, LessLUX: 27, MoreGaugesPrevMedal: 28, MoreLUX: 30, HigherSlot: 40 };
const RATIO = new Set([3, 4]);
const ADDITIVE_SP2 = { 20: 0, 21: 0, 30: 100000000 };

// valori per pallino della riga: i < want dall'originale, oltre con l'ultimo passo, fill dopo want
function ext(arr, p0, want, fill) {
  const v = (arr || []).filter((x) => x > 1).slice(0, want);
  const stepv = v.length ? (v[v.length - 1] - p0) / v.length : 0;
  while (v.length < want) v.push(Math.round(p0 + stepv * (v.length + 1)));
  return [0, 1, 2, 3, 4].map((i) => (i < want ? v[i] : fill));
}
const dots = (want, f, fill) => [0, 1, 2, 3, 4].map((i) => (i < want ? f(i) : fill));

// opts: {origBursts: Map burstId -> riga thethiny, robo: Map id Roboloid -> voce medal_db, medals (non usato: la riga
// Roboloid si riconosce dall'id 3000000 + id)}
function variablePower(bursts, opts) {
  const { origBursts = new Map(), robo = new Map() } = opts || {};
  const st = { orig: 0, ratio: 0, additive: 0, unverified: {}, unverifiedRows: [], unmapped: {}, unmappedRows: [], loMismatch: [] };
  for (const b of bursts) {
    if (b.damageType === 2) continue;   // danno fisso (fixed-damage.js): sp1 e' il danno per colpo
    const want = b.maxEnhanceCount || 0;
    const o = origBursts.get(b.burstId);
    if (o && o.specialPowerType > 2) {
      Object.assign(b, { specialPowerType: o.specialPowerType, sp1: o.sp1, sp2: o.sp2, displayMaxPower: o.displayMaxPower,
        sp1PerEnforce: ext(o.sp1PerEnforce, o.sp1, want, 0), sp2PerEnforce: ext(o.sp2PerEnforce, o.sp2, want, 0),
        displayMaxPowerPerEnforce: ext(o.displayMaxPowerPerEnforce, o.displayMaxPower, want, 0) });
      // ext() filtra i valori <= 1: sp2 0 (tipi 20-22) resta 0 a ogni pallino
      if (!o.sp2) b.sp2PerEnforce = [0, 0, 0, 0, 0];
      st.orig++;
      continue;
    }
    if (!(b.burstId > ROBO_BURST && b.burstId < ROBO_BURST + 1000000)) continue;
    const d = robo.get(b.burstId - ROBO_BURST);
    if (!d || !d.LowMulti || !d.HighMulti) continue;
    const cond = d.Ability?.Condition || '(none)';
    const type = TYPE_OF_CONDITION[cond];
    const lo = Math.round(d.LowMulti * 10000), hi = Math.round(d.HighMulti * 10000);
    const loAt = (i) => (i < 0 ? b.displayPower : b.displayPowerPerEnforce[i]);   // i = -1: senza pallini
    const row = { burstId: b.burstId, roboId: d.ID, condition: cond, low: d.LowMulti, high: d.HighMulti };
    if (!type) {
      st.unmapped[cond] = (st.unmapped[cond] || 0) + 1;
      st.unmappedRows.push(row);
      continue;
    }
    if (!RATIO.has(type) && !(type in ADDITIVE_SP2)) {
      st.unverified[type] = (st.unverified[type] || 0) + 1;
      st.unverifiedRows.push({ ...row, type });
      continue;
    }
    if (hi <= lo) { st.unverifiedRows.push({ ...row, type, why: 'HighMulti <= LowMulti' }); continue; }
    if (loAt(want - 1) !== lo) st.loMismatch.push({ ...row, display: loAt(want - 1) });
    if (RATIO.has(type)) {
      const sp1 = Math.round(lo * 10000 / (hi - lo));
      const bpOf = (i) => Math.round(loAt(i) * 10000 / sp1);
      Object.assign(b, { specialPowerType: type, sp1, sp2: 10000,
        basePower: bpOf(-1), displayMaxPower: loAt(-1) + bpOf(-1),
        basePowerPerEnforce: dots(want, bpOf, 1), displayMaxPowerPerEnforce: dots(want, (i) => loAt(i) + bpOf(i), 0),
        sp1PerEnforce: dots(want, () => sp1, 0), sp2PerEnforce: dots(want, () => 10000, 0) });
      st.ratio++;
    } else {
      const sp1 = hi - lo, sp2 = ADDITIVE_SP2[type];
      Object.assign(b, { specialPowerType: type, sp1, sp2,
        basePower: loAt(-1), displayMaxPower: loAt(-1) + sp1,
        basePowerPerEnforce: dots(want, loAt, 1), displayMaxPowerPerEnforce: dots(want, (i) => loAt(i) + sp1, 0),
        sp1PerEnforce: dots(want, () => sp1, 0), sp2PerEnforce: dots(want, () => sp2, 0) });
      st.additive++;
    }
  }
  return st;
}

const ROBO_DB = () => process.env.KHUX_ROBOLOID_DB || 'D:\\Progetto_Restauro_KH_UX\\external\\roboloid\\medal_db.json';
const ORIG = () => process.env.KHUX_ORIG_BURST || 'D:\\Progetto_Restauro_KH_UX\\external\\thethiny_2026-10-13\\KHUx-Server\\data\\burst.json';
const readSources = () => ({
  robo: new Map(JSON.parse(fs.readFileSync(ROBO_DB(), 'utf8')).map((d) => [d.ID, d])),
  origBursts: new Map(JSON.parse(fs.readFileSync(ORIG(), 'utf8')).map((b) => [b.burstId, b])),
});

// corregge burst.json della cartella master sul posto e restituisce il resoconto
function patch(masterDir) {
  const file = path.join(masterDir, 'burst.json');
  const bursts = JSON.parse(fs.readFileSync(file, 'utf8'));
  const st = variablePower(bursts, readSources());
  fs.writeFileSync(file, JSON.stringify(bursts));
  return st;
}

const summary = (st) => `${st.orig} da thethiny, ${st.ratio} Roboloid tipo 3/4, ${st.additive} Roboloid tipo 20/21/30; ` +
  `tipo 1 per tipo non verificabile ${JSON.stringify(st.unverified)}, per condizione senza tipo ${JSON.stringify(st.unmapped)}` +
  (st.loMismatch.length ? `; ${st.loMismatch.length} righe col valore a pallini pieni diverso da LowMulti` : '');

module.exports = { TYPE_OF_CONDITION, variablePower, patch, readSources, summary };

if (require.main === module) {
  const dir = path.resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) || path.join(__dirname, 'master_data'));
  const st = patch(dir);
  console.log(`${dir}: speciali variabili: ${summary(st)}`);
  if (process.argv.includes('--rows')) console.log(JSON.stringify({ unverified: st.unverifiedRows, unmapped: st.unmappedRows, loMismatch: st.loMismatch }, null, 1));
}
