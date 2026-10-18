// Opzione del banco KHUX_BENCH_ENEMY_ATK (nemici piu' forti): node server/test-bench-enemy.js
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path'); const assert = require('assert');
const { execFileSync } = require('child_process');

// ogni caso in un processo suo: l'opzione si legge al caricamento di server.js
function run(atk) {
  const SAVE = path.join(os.tmpdir(), `khux-test-bench-enemy-${process.pid}-${atk}.json`);
  const env = { ...process.env, KHUX_SAVE: SAVE, KHUX_REVISION: '124' };
  delete env.KHUX_REAL_NOW; delete env.KHUX_SERVER_TIME;
  if (atk) env.KHUX_BENCH_ENEMY_ATK = String(atk); else delete env.KHUX_BENCH_ENEMY_ATK;
  const code = `const log = console.log; console.log = () => {};
    const { _test: t } = require(${JSON.stringify(path.join(__dirname, 'server'))});
    console.log = log;
    const e = t.servedMasterRows('enemy', Date.now()).find((r) => r.enemyId === 80001);
    log(JSON.stringify({ rev: t.masterRevisionNow(), attack: e.attack, hp: e.hp,
      other: t.servedMasterRows('stage', Date.now()).length === t.masterRows('stage').length }));`;
  try { return JSON.parse(execFileSync(process.execPath, ['-e', code], { env, encoding: 'utf8' }).trim().split('\n').pop()); }
  finally { try { fs.unlinkSync(SAVE); } catch { /* assente */ } }
}

const off = run(0), on = run(10);
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'enemy.json'), 'utf8')).find((r) => r.enemyId === 80001);
assert.deepEqual(off.attack, raw.attack, 'spenta: attacco del master');
assert.deepEqual(on.attack, raw.attack.map((v) => v * 10), 'accesa: attacco x 10');
assert.deepEqual(on.hp, raw.hp, 'gli HP non cambiano');
assert.ok(on.other, 'le altre tabelle non cambiano');
assert.equal(on.rev, off.rev + 90010, 'revisione diversa: il client riscarica il master');
console.log('ok: Shadow', off.attack[0], '->', on.attack[0], ', revisione', off.rev, '->', on.rev);
