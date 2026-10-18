// Prova del mapping corretto delle medaglie dell'Organizzazione XIII (make-game-tables.js, MEDAL_MAP_FIX ed
// EVOLVE_FIX), senza client, sul master generato (server/master_data o KHUX_MASTER_DIR): le 6★ SE sono le
// «X A» di Roboloid (Tier 3, Evolve verso la 7★ «X A» con 5 Blue Fairy [SA Bonus LV 3]), le 6★ [+] sono
// righe proprie (300000 + id Roboloid, Tier 8, Evolve verso la 7★ [+]) e i doppioni 3004xx 6★ non ci sono.
// Fonte: D:\Progetto_Restauro_KH_UX\tmp\sp2b\g4\medal_mapping_audit.md.
//
//   node server/test-orgxiii-map.js
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const MASTER = process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data');
const medals = JSON.parse(fs.readFileSync(path.join(MASTER, 'medal.json'), 'utf8'));
const byId = new Map(medals.map((m) => [m.medalId, m]));

// [id SE 6★, copia 1xxxxx (0 se assente), id Roboloid «X A» 6★, 7★ «X A», 6★ [+], 7★ [+]]
const TABLE = [
  [31176, 131176, 443, 300444, 301491, 301492], // Lexaeus
  [31196, 131196, 483, 300484, 301601, 301602], // Xaldin
  [31206, 131206, 486, 300487, 301531, 301532], // Saïx
  [31226, 0, 638, 300639, 301680, 301681], // Xemnas
  [32186, 132186, 446, 300447, 301634, 301635], // Marluxia
  [32196, 132196, 449, 300450, 301658, 301659], // Larxene
  [32216, 132216, 489, 300490, 301745, 301746], // Xigbar
  [32236, 0, 641, 300642, 301563, 301564], // Axel
  [33176, 133176, 452, 300453, 301446, 301447], // Vexen
  [33186, 133186, 455, 300456, 301511, 301512], // Zexion
  [33206, 133206, 492, 300493, 301595, 301596], // Demyx
  [33216, 133216, 495, 300496, 301616, 301617], // Luxord
  [33236, 0, 644, 300645, 301782, 301783], // Roxas
];
const FAIRY_LV3 = 301497; // Blue Fairy [SA Bonus LV 3] (blue-fairy.js)

const fails = [];
const check = (label, fn) => { try { fn(); } catch (e) { fails.push(`${label}: ${e.message.replace(/\s+/g, ' ')}`); } };

for (const [se, copy, robo, seven, plus6, plus7] of TABLE) {
  // 6★ SE e copia 1xxxxx: Tier 3, Evolve verso la 7★ «X A» con 5 Blue Fairy LV 3
  for (const id of copy ? [se, copy] : [se]) {
    check(`${id}`, () => {
      const r = byId.get(id);
      assert.ok(r, 'riga assente');
      assert.strictEqual(r.rare, 6, 'rare');
      assert.strictEqual(r.guiltValue, 3, 'guiltValue');
      assert.strictEqual(r.validEvolve, 1, 'validEvolve');
      assert.strictEqual(r.evolveId, seven, 'evolveId');
      assert.strictEqual(r.name, byId.get(seven)?.name, 'nome «X A»');
      assert.strictEqual(r.validEvolveNeed, 5, 'validEvolveNeed');
      assert.deepStrictEqual(r.evolveNeedId, [FAIRY_LV3, FAIRY_LV3, FAIRY_LV3, FAIRY_LV3, FAIRY_LV3], 'evolveNeedId');
    });
  }
  // 5★ SE: stesso nome «X A»
  check(`${se - 1}`, () => assert.strictEqual(byId.get(se - 1)?.name, byId.get(seven)?.name, 'nome «X A»'));
  // 7★ «X A» presente; il doppione 6★ «X A» (300000 + id Roboloid) no
  check(`${seven}`, () => {
    const r = byId.get(seven);
    assert.ok(r, 'riga assente');
    assert.strictEqual(r.rare, 7, 'rare');
  });
  check(`${300000 + robo}`, () => assert.ok(!byId.has(300000 + robo), 'doppione presente'));
  // 6★ [+] propria: Tier 8, Evolve verso la 7★ [+]
  check(`${plus6}`, () => {
    const r = byId.get(plus6);
    assert.ok(r, 'riga assente');
    assert.strictEqual(r.rare, 6, 'rare');
    assert.strictEqual(r.guiltValue, 8, 'guiltValue');
    assert.strictEqual(r.validEvolve, 1, 'validEvolve');
    assert.strictEqual(r.evolveId, plus7, 'evolveId');
  });
  // copie potenziate (righe boosted con groupId = medaglia normale, es. 2031176): Tier dalla base
  for (const b of medals.filter((m) => m.groupId && (m.groupId === se || m.groupId === copy))) {
    check(`${b.medalId} (boosted di ${b.groupId})`, () => assert.strictEqual(b.guiltValue, 3, 'guiltValue'));
  }
}

if (fails.length) {
  console.error(`FAIL ${fails.length}:\n  ` + fails.join('\n  '));
  process.exit(1);
}
console.log(`ok: ${TABLE.length} medaglie dell'Organizzazione XIII (${MASTER})`);
