// Prova delle righe enemy delle missioni 526-979 (make-enemy-oltre.js, I-009, decisione D-A dell'utente 21-10):
//   node server/test-enemy-oltre.js
// Prima parte con dati finti; poi (se ci sono) su una COPIA del master in D:\Progetto_Restauro_KH_UX\tmp con
// enemies_oltre525.json vero, e gli obiettivi «Defeat X» di make-story-oltre.js sulla copia (Review Focus 4).
'use strict';
const fs = require('fs'), path = require('path');
const { enemyRowsFor, addRows, patch, isClone, MAX_ID } = require('./make-enemy-oltre');
const TMP = process.env.KHUX_TMP || 'D:\\Progetto_Restauro_KH_UX\\tmp';
fs.mkdirSync(TMP, { recursive: true });
const tmpDirs = [];
const mkTmp = () => { const d = fs.mkdtempSync(path.join(TMP, 'enemy-oltre-')); tmpDirs.push(d); return d; };
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };

// --- dati finti ----------------------------------------------------------------------------------------------
const row = (id, name, extra = {}) => ({ enemyId: id, name, flavor: `f${id}`, displayId: 17, show: 2, showSwf: 2,
  hp: [100, 200, 300, 400, 500], attack: [1, 2, 3, 4, 5], skillId: [100, 101], ...extra });
const shadow = row(80001, 'Shadow', { displayId: 1 });
const base = row(1501, 'Soldier Base', { displayId: 1 });
const named = row(1516, 'Diver', { displayId: 1 });
const enemies = [shadow, base, named, row(1, 'Shadow', { displayId: 1 })];
const missing = {
  160911501: { missions: [600], base: 1501, base_name: 'Soldier Base' }, // 9 cifre, base nel master -> clone
  1602111501: { missions: [601], base: 1501, base_name: 'Soldier Base' }, // 10 cifre, base nel master -> clone
  160910999: { missions: [602], base: 999, base_name: null },            // base assente, senza fonte -> fuori
  11516: { missions: [603], base: null, base_name: null },               // solo JP con fonte (stats) -> riga
  1500: { missions: [604], base: null, base_name: null },                // solo JP senza fonte -> fuori
  17111501: { missions: [605], base: null, base_name: null },            // 8 cifre: non e' un clone (D-A: 9-10 cifre)
};
const stats = { 11516: { name: 'Diver', hp: [11, 22, 33, 44, 55], attack: [6, 7, 8, 9, 10], source: 'https://www.khuxwiki.com/wiki/X' } };

check(isClone(160911501) && isClone(1602111501) && !isClone(17111501) && !isClone(1501), 'isClone: solo id di 9-10 cifre');
const orig = { 1501: 6 }; // displayId originale della base (enemy_display_orig.json): il clone parte da quello
const res = enemyRowsFor(missing, enemies, stats, orig);
const byId = new Map(res.rows.map((r) => [r.enemyId, r]));
const c = byId.get(160911501);
check(c && c.name === base.name && JSON.stringify(c.hp) === JSON.stringify(base.hp) && c.flavor === base.flavor
  && JSON.stringify(c.skillId) === JSON.stringify(base.skillId), 'clone esatto della base (nome, HP, abilita\')');
check(c && c.displayId === 6, `clone: displayId originale della base (${c && c.displayId})`);
check(c && c !== base && c.hp !== base.hp, 'clone: copia profonda, la base non cambia');
check(byId.has(1602111501), 'clone anche per 10 cifre');
const j = byId.get(11516);
check(j && j.name === 'Diver' && j.hp.join() === '11,22,33,44,55' && j.attack.join() === '6,7,8,9,10',
  'solo JP con fonte: nome, HP e attacco della fonte');
check(j && JSON.stringify(j.skillId) === JSON.stringify(named.skillId), 'solo JP: resto dalla riga omonima del master');
check(!byId.has(160910999) && !byId.has(1500) && !byId.has(17111501), 'senza fonte: nessuna riga inventata');
const unc = res.uncovered.map((u) => u.enemyId).sort((a, b) => a - b);
check(JSON.stringify(unc) === JSON.stringify([1500, 17111501, 160910999]), `scoperti elencati: ${unc}`);
check(res.cloned === 2 && res.fromStats === 1, `conteggi ${res.cloned}/${res.fromStats}`);
// gia' presenti: niente doppioni (idempotente)
const again = enemyRowsFor(missing, enemies.concat(res.rows), stats, orig);
check(again.rows.length === 0, `seconda corsa: +${again.rows.length}`);
// id oltre 2^31-1: il client li legge come int a 32 bit
let threw = false;
try { enemyRowsFor({ 2147483648: { missions: [1], base: 1501 } }, enemies, {}, {}); } catch { threw = true; }
check(threw && MAX_ID === 2 ** 31 - 1, 'id >= 2^31 rifiutato');

// addRows: in memoria, come lo chiama make-game-tables.js prima di grafica/abilita'/comparsa
const mem = enemies.map((r) => ({ ...r }));
const rep = addRows(mem, null, { missing, stats, orig });
check(rep.added === 3 && mem.length === enemies.length + 3, `addRows: +${rep.added}`);

// --- dati veri su una copia del master ---------------------------------------------------------------------
const MASTER = path.join(__dirname, 'master_data');
const MISSING = process.env.KHUX_ENEMIES_OLTRE525 || 'D:\\Progetto_Restauro_KH_UX\\reference\\world_schema\\oltre525\\enemies_oltre525.json';
if (fs.existsSync(path.join(MASTER, 'enemy.json')) && fs.existsSync(MISSING)) {
  const dir = mkTmp();
  for (const f of ['enemy', 'enemy_display_orig', 'stage', 'theater', 'title', 'medal', 'keyblade', 'skill']) {
    const p = path.join(MASTER, f + '.json');
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(dir, f + '.json'));
  }
  const all = JSON.parse(fs.readFileSync(MISSING, 'utf8')).missing;
  const before = JSON.parse(fs.readFileSync(path.join(dir, 'enemy.json'), 'utf8'));
  const beforeIds = new Set(before.map((r) => r.enemyId));
  const r1 = patch(dir);
  const after = JSON.parse(fs.readFileSync(path.join(dir, 'enemy.json'), 'utf8'));
  const afterIds = new Set(after.map((r) => r.enemyId));
  const ids = Object.keys(all).map(Number);
  const uncIds = new Set(r1.uncovered.map((u) => u.enemyId));
  check(ids.every((id) => afterIds.has(id) || uncIds.has(id)), 'ogni id dei 312 nel master o fra gli scoperti');
  check(r1.added + r1.uncovered.length === ids.filter((id) => !beforeIds.has(id)).length,
    `aggiunti ${r1.added} + scoperti ${r1.uncovered.length} = mancanti`);
  check(after.every((r) => r.enemyId > 0 && r.enemyId <= MAX_ID), 'nessun id oltre 2^31-1');
  const byIdA = new Map(after.map((r) => [r.enemyId, r]));
  const clones = ids.filter((id) => isClone(id) && beforeIds.has(id % 10000));
  check(clones.length > 0 && clones.every((id) => {
    const x = byIdA.get(id), b = byIdA.get(id % 10000);
    return x && x.name === b.name && JSON.stringify(x.hp) === JSON.stringify(b.hp) && x.displayId === b.displayId;
  }), `${clones.length} cloni = base (nome, HP, displayId)`);
  check(r1.uncovered.every((u) => Array.isArray(u.missions) && u.missions.length), 'scoperti con le missioni');
  const r2 = patch(dir);
  check(r2.added === 0 && JSON.parse(fs.readFileSync(path.join(dir, 'enemy.json'), 'utf8')).length === after.length, 'patch idempotente');

  // Review Focus 4: obiettivi «Defeat X» delle righe del Task 1 sulla copia, prima e dopo
  let story = null;
  try { story = require('./make-story-oltre'); story.defaultSources(); } catch (e) { console.log('SKIP Defeat X:', e.message); story = null; }
  if (story && fs.existsSync(path.join(dir, 'stage.json'))) {
    const src = story.defaultSources();
    const t = (n) => JSON.parse(fs.readFileSync(path.join(dir, n + '.json'), 'utf8'));
    const tt = (n) => (fs.existsSync(path.join(dir, n + '.json')) ? t(n) : []);
    const isOltre = (r) => r.stageKind === 1 && r.stageId < 100000 && r.id >= 526 && r.id <= 979;
    const stages = t('stage').filter((r) => !isOltre(r));
    const run = (en) => story.buildRows(stages, { ...src, theater: tt('theater'), enemies: en, titles: tt('title'),
      medals: tt('medal'), keyblades: tt('keyblade'), skills: tt('skill') });
    const rb = run(before), ra = run(after);
    const known = new Set(after.map((r) => r.enemyId));
    const bad = [];
    for (const r of ra) {
      for (let i = 0; i < r.validSubmission; i++) if (r.submissionIdType[i] === 1 && !known.has(r.submissionId[i])) bad.push([r.id, r.submissionId[i]]);
    }
    check(bad.length === 0, `obiettivi Defeat X su nemici assenti: ${JSON.stringify(bad.slice(0, 5))}`);
    check(ra.report.enemiesToShadow <= rb.report.enemiesToShadow, 'Defeat X: mai piu\' obiettivi sullo Shadow di prima');
    // un id aggiunto da questo patch non deve finire sullo Shadow: ogni nome che lo indica lo trova
    const added = new Set(after.filter((r) => !beforeIds.has(r.enemyId)).map((r) => r.enemyId));
    const pointing = ra.flatMap((r) => r.submissionId.filter((id, i) => r.submissionIdType[i] === 1 && added.has(id)));
    console.log(`Defeat X: sullo Shadow ${rb.report.enemiesToShadow} prima, ${ra.report.enemiesToShadow} dopo; `
      + `${pointing.length} obiettivi su righe nuove`);
  }
  console.log(`dati veri: +${r1.added} (${r1.cloned} cloni, ${r1.fromStats} da fonte), ${r1.uncovered.length} scoperti`);
} else console.log('SKIP dati veri: master o enemies_oltre525.json assenti');

for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
if (errors.length) { console.log('FAIL\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('OK test-enemy-oltre');
