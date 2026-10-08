#!/usr/bin/env node
// Controllo offline dei dati di ogni stage, senza giocarli: per ogni riga della
// tabella stage verifica quello che il client cerchera' in /stage/start e /stage/clear.
//  - mappa: forzieri e nemici in server/game_data/stage_poi.json (stage_poi.py);
//  - forzieri: riga di reward presente e almeno un premio che il server manda
//    (dropItemTypeIds, come chestDropTypes di server.js) di un tipo che nel forziere
//    funziona (4 munny, 8 CP, 9 HP); senza riga il client va in crash all'apertura;
//  - nemici: la riga di reward del record della mappa (FUN_00e7e6e8: senza, crash
//    appena parte lo stage) e premio materiale esistente;
//  - premi di fine stage e degli obiettivi: tipo gestito da grantItem di server.js
//    (2 jewel, 4 munny, 5 materiale) e materiale presente nella tabella material.
// Esce con codice 1 se trova errori (gli avvisi non contano).
//
//   node server/check-stage-data.js [--verbose]

const fs = require('fs');
const path = require('path');

const MASTER_DIR = process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data');
const verbose = process.argv.includes('--verbose');
const table = (name) => {
  try { return JSON.parse(fs.readFileSync(path.join(MASTER_DIR, name + '.json'), 'utf8')); } catch { return []; }
};
let poi = {};
try {
  poi = JSON.parse(fs.readFileSync(path.join(__dirname, 'game_data', 'stage_poi.json'), 'utf8'));
} catch {
  console.error('manca server/game_data/stage_poi.json (recon/tools/stage_poi.py)');
  process.exit(1);
}

const ENEMY_TYPE = 5;
const CHEST_OK = new Set([4, 8, 9]);
const GRANT_OK = new Set([2, 4, 5]);
const rewards = new Map(table('reward').map((r) => [r.rewardId, r]));
const materials = new Set(table('material').map((m) => m.materialId));
const stages = table('stage');

let errors = 0;
let warnings = 0;
const err = (s, msg) => { errors++; console.log(`  ERRORE  ${s}: ${msg}`); };
const warn = (s, msg) => { warnings++; console.log(`  avviso  ${s}: ${msg}`); };

function checkMaterial(where, id) {
  if (materials.size && !materials.has(id)) return `materiale ${id} assente dalla tabella material (${where})`;
  return null;
}

let withMap = 0;
for (const st of stages) {
  const s = `${st.stageId} ${st.name}`;
  const p = poi[st.stageId];
  if (!p) {
    if (!st.onlyDrama) warn(s, 'nessuna mappa (mappoi): niente forzieri ne\' drop');
  } else {
    withMap++;
    for (const c of p.chests) {
      const row = rewards.get(c.reward);
      if (!row) { err(s, `forziere ${c.uid}: riga reward ${c.reward} assente (crash all'apertura)`); continue; }
      const sent = row.type.map((t, i) => ({ t, i })).filter(({ t }) => t !== ENEMY_TYPE);
      if (!sent.length) err(s, `forziere ${c.uid}: la riga ${c.reward} ha solo materiali, il forziere resta vuoto`);
      for (const { t } of sent) if (!CHEST_OK.has(t)) warn(s, `forziere ${c.uid}: tipo ${t} non provato nel forziere`);
      if (verbose) console.log(`  ok      ${s}: forziere ${c.uid} -> reward ${c.reward} ${JSON.stringify(sent.map(({ t, i }) => [t, row.num[i]]))}`);
    }
    for (const e of p.enemies) {
      if (e.reward === undefined) { err(s, `nemico ${e.uid}: stage_poi.json senza reward, rigenerarlo`); continue; }
      const row = rewards.get(e.reward);
      if (!row) { err(s, `nemico ${e.uid} (${e.enemyId}): riga reward ${e.reward} assente (crash dopo /stage/start)`); continue; }
      row.type.forEach((t, i) => {
        if (t === ENEMY_TYPE) { const m = checkMaterial(`nemico ${e.uid}`, row.id[i]); if (m) err(s, m); }
      });
    }
  }
  if (st.validClearGetItem) {
    st.clearGetItemType.forEach((t, i) => {
      if (!GRANT_OK.has(t)) warn(s, `premio di fine stage di tipo ${t} non gestito dal server`);
      if (t === 5) { const m = checkMaterial('premio di fine stage', st.clearGetItemId[i]); if (m) err(s, m); }
    });
  }
  (st.submissionRewardType || []).slice(0, st.validSubmission).forEach((t, i) => {
    if (!GRANT_OK.has(t)) warn(s, `obiettivo ${i + 1}: premio di tipo ${t} non gestito dal server`);
    if (t === 5) { const m = checkMaterial(`obiettivo ${i + 1}`, st.submissionItemId[i]); if (m) err(s, m); }
  });
}
console.log(`${stages.length} stage, ${withMap} con mappa; ${rewards.size} righe reward; ${errors} errori, ${warnings} avvisi`);
process.exit(errors ? 1 : 0);
