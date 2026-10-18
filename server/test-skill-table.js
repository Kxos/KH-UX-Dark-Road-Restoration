// Prova del generatore della tabella skill (I-146, server/make-skill-table.js): 25 righe vere di thethiny +
// le skill del wiki («Medal», ===List of Skills===) ricostruite dalla sorella vera, skillExp vera.
// Legge le sorgenti vere (dati Square Enix e testi del wiki, fuori dal repo):
//
//   node server/test-skill-table.js
//
// KHUX_THETHINY_DATA / KHUX_WIKI come in make-skill-table.js; senza i file stampa SKIP ed esce con 0.
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DATA = process.env.KHUX_THETHINY_DATA || 'D:\\Progetto_Restauro_KH_UX\\external\\thethiny_2026-10-13\\KHUx-Server\\data';
const WIKI = process.env.KHUX_WIKI || 'D:\\Progetto_Restauro_KH_UX\\wiki\\wiki_all.json';
for (const f of [path.join(DATA, 'skill.json'), path.join(DATA, 'skillExp.json'), WIKI]) {
  if (!fs.existsSync(f)) {
    console.log(`SKIP: ${f} assente`);
    process.exit(0);
  }
}
const mk = require('./make-skill-table');
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'recon', 'out', 'master_types_ww431.json'), 'utf8'));
const fields = schema.skill.map(([f]) => f);
const thethiny = JSON.parse(fs.readFileSync(path.join(DATA, 'skill.json'), 'utf8'));
const realExp = JSON.parse(fs.readFileSync(path.join(DATA, 'skillExp.json'), 'utf8'));

// 1. wiki: 163 righe con nome, LV massimo, probabilita' e descrizione
const wikiSkills = mk.parseWikiSkills(mk.readWikiMedalPage(WIKI));
assert.ok(wikiSkills.length >= 160, `skill del wiki: ${wikiSkills.length}`);
const ab1w = wikiSkills.find((w) => w.name === 'Attack Boost I');
assert.deepStrictEqual([ab1w.maxLv, ab1w.triggerPct, ab1w.nameJp], [10, 47, 'アタックアップＳ']);
assert.strictEqual(ab1w.description, 'Deals 1.2 times more damage.');
const uniqueWiki = new Set(wikiSkills.map((w) => mk.normName(w.name))).size;

// 2. righe: tante quante i nomi unici del wiki, 25 vere con i numeri invariati
const real = mk.realSkillRows(thethiny, []);
const { rows, report } = mk.skillRows(real, wikiSkills, schema);
assert.strictEqual(rows.length, uniqueWiki, `righe ${rows.length}, nomi unici del wiki ${uniqueWiki}`);
const byId = new Map(rows.map((r) => [r.skillId, r]));
for (const t of thethiny) {
  const r = byId.get(t.skillId);
  assert.ok(r, `riga vera ${t.skillId} assente`);
  for (const k of Object.keys(t)) {
    if (k === 'name' || k === 'description') continue;
    assert.strictEqual(r[k], t[k], `${t.skillId}.${k}: ${r[k]} invece di ${t[k]}`);
  }
}
assert.strictEqual(thethiny.length, 25);
assert.deepStrictEqual([byId.get(1100).attackUp, byId.get(1100).invokeProb, byId.get(1100).invokeProbPerLv], [12000, 4000, 80]);
assert.strictEqual(byId.get(1118).invokeProb, 9810);
// i 4 campi della 4.3.1 che thethiny non ha (righe senza riga del master: regola del piano)
assert.deepStrictEqual([byId.get(1120).value1, byId.get(1120).burstLock, byId.get(1120).pvpConditionTurn,
  byId.get(1120).pvpConditionCount], [10000, 0, 1, 0]);
// con la riga del master 4.3.1/5.0.1 i 4 campi vengono da li'
const withMaster = mk.realSkillRows(thethiny, [{ skillId: 1104, value1: 1000, burstLock: 0, pvpConditionTurn: 0, pvpConditionCount: 3, thumbId: 9 }]);
const poison = withMaster.find((r) => r.skillId === 1104);
assert.deepStrictEqual([poison.value1, poison.pvpConditionCount, poison.thumbId], [1000, 3, 4]);

// 3. schema: esattamente i 35 campi nell'ordine, testi <= 71 byte senza markup
for (const r of rows) {
  assert.deepStrictEqual(Object.keys(r), fields, `campi di ${r.skillId}`);
  for (const k of ['name', 'description']) {
    assert.ok(r[k].length > 0, `${r.skillId}.${k} vuoto`);
    assert.ok(Buffer.byteLength(r[k], 'utf8') <= 71, `${r.skillId}.${k} troppo lungo: ${r[k]}`);
    assert.ok(!/<|\{\{|''|\[\[/.test(r[k]), `${r.skillId}.${k} con markup: ${r[k]}`);
  }
  for (const [f, t] of schema.skill) if (t === 'int') assert.ok(Number.isInteger(r[f]), `${r.skillId}.${f} non intero`);
}

// 4. id, icone, categoryEvolve
assert.strictEqual(new Set(rows.map((r) => r.skillId)).size, rows.length, 'skillId doppi');
const rebuilt = rows.filter((r) => !thethiny.some((t) => t.skillId === r.skillId));
assert.strictEqual(rebuilt.length, rows.length - 25);
for (const r of rebuilt) {
  assert.ok(r.skillId >= 1127, `id nuovo ${r.skillId} < 1127`);
  assert.strictEqual(r.sortId, r.skillId);
  assert.ok(r.categoryEvolve >= 31, `categoryEvolve ${r.categoryEvolve}`);
  assert.ok(r.invokeProb >= 0 && r.invokeProb <= 10000, `${r.name} invokeProb ${r.invokeProb}`);
  assert.ok([1, 2, 3, 4].includes(r.expType), `${r.name} expType ${r.expType}`);
}
assert.strictEqual(new Set(rebuilt.map((r) => r.categoryEvolve)).size, rebuilt.length, 'categoryEvolve ricostruite doppie');
for (const r of rows) assert.ok(r.thumbId >= 1 && r.thumbId <= 5, `${r.skillId} thumbId ${r.thumbId}`);

// 5. probabilita': invokeProb + perLv * (maxLv - 1) = trigger% * 100 (vere: tolleranza 100, il wiki arrotonda)
for (const r of rows) {
  const info = report.rows.find((x) => x.skillId === r.skillId);
  assert.ok(info, `riga ${r.skillId} senza voce nel report`);
  const top = r.invokeProb + r.invokeProbPerLv * (r.maxLv - 1);
  const want = Math.round(info.triggerPct * 100);
  if (info.real) assert.ok(Math.abs(top - want) <= 100, `${r.name}: ${top} contro ${want}`);
  else assert.strictEqual(top, want, `${r.name}: ${top} contro ${want}`);
}

// 6. potenza dalla descrizione
const byName = new Map(rows.map((r) => [r.name, r]));
const ab6 = byName.get('Attack Boost VI');
assert.deepStrictEqual([ab6.attackUp, ab6.maxLv, ab6.rank, ab6.expType, ab6.thumbId], [22000, 20, 3, 3, 1]);
assert.strictEqual(byName.get('Defense Boost IV').damageCut, 1250);
assert.strictEqual(byName.get('Defense Boost IV').invokeType, 2);
const sleepMax = byName.get('Sleep+ II Max');
assert.deepStrictEqual([sleepMax.addSleep, sleepMax.conditionTurn, sleepMax.thumbId], [10000, 1, 4]);
const tt = byName.get('Triple Threat');
assert.deepStrictEqual([tt.addPoison, tt.addParalysis, tt.addSleep], [10000, 10000, 10000]);
assert.ok(byName.get('ATK B V & Lux+').luxUp > 10000);
assert.ok(byName.get('ATK B IX & AP+').prizeBurstUp > 10000);
assert.strictEqual(byName.get('Second Chance II').dokonjo, 1);
assert.ok(report.noSister.length > 0, 'famiglie senza sorella nel report');

// 7. skillExp vera: 4 righe, expId 1-4, value int[3]
const exp = mk.skillExpRows(realExp);
assert.deepStrictEqual(exp.map((e) => e.expId), [1, 2, 3, 4]);
for (const e of exp) {
  assert.deepStrictEqual(Object.keys(e), ['expId', 'value']);
  assert.ok(e.value.length === 3 && e.value.every(Number.isInteger));
}
assert.deepStrictEqual(exp[0].value, [30, 12132, 13500]);

console.log(`OK: ${rows.length} skill (25 vere + ${rebuilt.length} dal wiki, ${wikiSkills.length - uniqueWiki} doppioni del wiki), ` +
  `${report.noSister.length} senza sorella, skillExp ${exp.length} righe`);
