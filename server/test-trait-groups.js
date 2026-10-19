// Prova dei gruppi dei trait e delle righe della ruota (I-084 parte A, make-trait-groups.js):
//   node server/test-trait-groups.js [cartella master]   (default server/master_data)
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const MASTER = path.resolve(process.argv[2] || path.join(__dirname, 'master_data'));
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const read = (dir, n) => JSON.parse(fs.readFileSync(path.join(dir, n + '.json'), 'utf8'));

const tg = require('./make-trait-groups');
check(JSON.stringify(tg.FUSION_TRAIT_IDS) === JSON.stringify([10, 8, 9, 11, 12, 13, 1, 14, 15, 16, 17]), 'FUSION_TRAIT_IDS');

const medal = read(MASTER, 'medal');
const shuffle = read(MASTER, 'shuffleskill');
const bad = medal.filter((r) => (r.shuffleskillSlot || 0) > 0 && !r.shuffleSkillGroupId);
check(!bad.length, `righe con slot e senza shuffleSkillGroupId: ${bad.length} (es. ${bad.slice(0, 3).map((r) => r.medalId)})`);
// stesso nome = stesso gruppo (tutte le rarita', boosted e varianti >= 1.000.000), valore = medalId piu' basso
const byName = new Map();
for (const r of medal) if ((r.shuffleskillSlot || 0) > 0) (byName.get(r.name) || byName.set(r.name, []).get(r.name)).push(r);
const split = [...byName].filter(([, rs]) => new Set(rs.map((r) => r.shuffleSkillGroupId)).size > 1);
check(!split.length, `nomi con piu' gruppi: ${split.slice(0, 3).map(([n]) => n)}`);
const wrong = [...byName].filter(([, rs]) => rs[0].shuffleSkillGroupId !== Math.min(...rs.map((r) => r.medalId)));
check(!wrong.length, `gruppo diverso dal medalId piu' basso: ${wrong.slice(0, 3).map(([n]) => n)}`);
const seph = byName.get('Supernova - Sephiroth') || [];
check(seph.length >= 2, `Supernova - Sephiroth con varianti (${seph.length})`);
const gid = (n) => (byName.get(n) || [])[0]?.shuffleSkillGroupId;
const sn = [...byName.keys()].find((n) => n.startsWith('SN - ') && byName.has('SN+ - ' + n.slice(5)));
check(sn && gid(sn) !== gid('SN+ - ' + sn.slice(5)), `SN e SN+ in gruppi diversi (${sn})`);
// righe della ruota
const row = (id) => shuffle.find((r) => r.shuffleSkillId === id);
for (const [id, name, cat] of [[14, 'Max HP +800', 20], [15, 'Poison Resist 20%%', 30], [16, 'Sleep Resist 20%%', 50],
  [17, 'Paralysis Resist 20%%', 40]]) {
  const r = row(id);
  check(r && r.type === 1 && r.name === name && r.category === cat, `riga ${id} ${name}`);
}
check(row(14)?.hp === 800 && row(15)?.poison === 20 && row(16)?.sleep === 20 && row(17)?.paralyze === 20, 'effetti delle righe 14-17');
const rated = shuffle.filter((r) => r.type === 1 && r.rate > 0).map((r) => r.shuffleSkillId).sort((a, b) => a - b);
check(JSON.stringify(rated) === JSON.stringify([...tg.FUSION_TRAIT_IDS].sort((a, b) => a - b)), `rate > 0 solo sugli 11 della ruota: ${rated}`);

// idempotente: una seconda esecuzione su una copia non cambia i file
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-trait-'));
for (const n of ['medal', 'shuffleskill']) fs.copyFileSync(path.join(MASTER, n + '.json'), path.join(tmp, n + '.json'));
const log = console.log; console.log = () => {};
tg.patch(tmp);
console.log = log;
for (const n of ['medal', 'shuffleskill']) {
  check(fs.readFileSync(path.join(tmp, n + '.json'), 'utf8') === fs.readFileSync(path.join(MASTER, n + '.json'), 'utf8'), `${n} cambia alla seconda esecuzione`);
}
fs.rmSync(tmp, { recursive: true, force: true });

if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: trait-groups');
