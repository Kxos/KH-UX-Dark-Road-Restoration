// Prova della curva skillExp (I-146): formula del client 4.3.1 ([fn], docs/notes/medaglie.md#skill)
//   EXP totale per il livello L = trunc(value[1] * powf((L - 1) / (value[0] - 1), value[2] / 10000))
// Usa le righe vere di skillExp (dati Square Enix, fuori dal repo):
//
//   node server/test-skill-exp.js [skillExp.json]
//
// Senza il file stampa SKIP ed esce con 0.
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { expToReach, levelForExp, addSkillExp } = require('./medal-skill');

const DATA = 'D:\\Progetto_Restauro_KH_UX\\external\\thethiny_2026-10-13\\KHUx-Server\\data';
const FILE = process.argv[2] || path.join(DATA, 'skillExp.json');
if (!fs.existsSync(FILE)) {
  console.log(`SKIP: ${FILE} assente`);
  process.exit(0);
}
const rows = new Map(JSON.parse(fs.readFileSync(FILE, 'utf8')).map((r) => [r.expId, r.value]));
const row = rows.get(1);
assert.deepStrictEqual(row, [30, 12132, 13500], 'riga expType 1 inattesa');

// 1. livello 1 = 0, curva strettamente crescente
assert.strictEqual(expToReach(row, 1), 0);
for (let lv = 2; lv <= 20; lv++) assert.ok(expToReach(row, lv) > expToReach(row, lv - 1), `non crescente a LV ${lv}`);

// 2. valori a mano: 12132 * (1/29)^1.35 = 128.7, (2/29)^1.35 -> 328.2, (3/29)^1.35 -> 567.2; LV 30 = 12132
assert.strictEqual(expToReach(row, 2), 128);
assert.strictEqual(expToReach(row, 3), 328);
assert.strictEqual(expToReach(row, 4), 567);
assert.strictEqual(expToReach(row, 30), 12132);

// 3. livello dall'EXP
assert.strictEqual(levelForExp(row, 10, 0), 1);
assert.strictEqual(levelForExp(row, 10, 1e9), 10);
assert.strictEqual(levelForExp(row, 10, expToReach(row, 5)), 5);
assert.strictEqual(levelForExp(row, 10, expToReach(row, 5) - 1), 4);

// 4. aggiunta di EXP: limite al massimo, salita di livello, valori non validi
const cap = expToReach(row, 10);
assert.deepStrictEqual(addSkillExp({ skillId: 1, level: 10, exp: cap }, { maxLv: 10 }, row, 500), { level: 10, exp: cap });
assert.deepStrictEqual(addSkillExp({ skillId: 1, level: 1, exp: 0 }, { maxLv: 10 }, row, expToReach(row, 3)),
  { level: 3, exp: 328 });
assert.deepStrictEqual(addSkillExp({ skillId: 1, level: 1, exp: 0 }, { maxLv: 10 }, row, 1e9), { level: 10, exp: cap });
assert.deepStrictEqual(addSkillExp({ skillId: 1, level: 2, exp: 200 }, { maxLv: 10 }, row, 0), { level: 2, exp: 200 });

// 5. controllo col wiki «Skill EXP» (solo stampato): «generally enough to level a skill with a max-level of 10
//    from LV 1 to LV 8 (two runs), 15 -> LV 7 (four runs), 20 -> LV 6 (four runs)»
try {
  const enemies = new Map(JSON.parse(fs.readFileSync(path.join(DATA, 'enemy.json'), 'utf8')).map((e) => [e.enemyId, e]));
  const top = (id) => { const e = enemies.get(id); return e ? e.exp[e.exp.length - 1] : 0; };
  const maps = JSON.parse(fs.readFileSync(path.join(DATA, 'stage_maps.json'), 'utf8'));
  const wave = (maps['77710']?.enemies || []).slice(0, 4).map((e) => e.enemyId);   // la mappa elenca 2 volte gli stessi 4
  const runs = {
    'stage 82003 (601001 x3 + 611001)': wave.reduce((s, id) => s + top(id), 0),
    '11001 x3 + 11002 (Pretender, vecchia versione)': 3 * top(11001) + top(11002),
    '11004 x3 (Growth Egg, versione attuale)': 3 * top(11004),
  };
  for (const [name, e] of Object.entries(runs)) {
    const lv = (t, maxLv, n) => levelForExp(rows.get(t), maxLv, n * e);
    console.log(`wiki: ${name}: ${e} EXP/giro; 2 giri maxLv10 -> LV ${[1, 2, 3, 4].map((t) => lv(t, 10, 2)).join('/')}` +
      `, 4 giri maxLv15 -> LV ${[1, 2, 3, 4].map((t) => lv(t, 15, 4)).join('/')}` +
      `, 4 giri maxLv20 -> LV ${[1, 2, 3, 4].map((t) => lv(t, 20, 4)).join('/')} (expType 1/2/3/4)`);
  }
} catch (e) {
  console.log(`wiki: controllo saltato (${e.message})`);
}

console.log('OK test-skill-exp');
