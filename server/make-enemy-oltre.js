#!/usr/bin/env node
// Righe enemy dei nemici che gli stage JP 4.3.1 delle missioni 526-979 usano e il nostro master non ha (I-009, Task 2).
// Elenco: reference\world_schema\oltre525\enemies_oltre525.json (enemies_oltre525.py: 454 id usati, 312 mancanti,
// `missing{"<id>": {missions[], base, base_name}}`). Regola dell'utente (D-A, 21-10):
// - id di 9-10 cifre con il nemico base (id % 10000) nel master -> clone esatto della base col nuovo enemyId (nome, HP,
//   abilita', grafica), come le 98 righe a 9-10 cifre gia' nel master (es. 151210160 = 160 Storming Sheep);
// - gli altri (id solo JP di 2-8 cifre, id lunghi con base assente) -> HP e attacco dalla pagina wiki del nemico, il
//   resto dalla riga omonima del master (o dallo Shadow 80001). La wiki (khuxwiki, dump D:\Progetto_Restauro_KH_UX\wiki\
//   wiki_all.json dell'8-10) NON ha statistiche dei nemici: la pagina «Enemies» da' solo nome, descrizione, attributo,
//   tipo. Le fonti vanno in D:\Progetto_Restauro_KH_UX\wiki\enemy_stats_oltre.json ({"<id>": {name, hp[5], attack[5],
//   displayId?, source}}, oggi assente); senza fonte nessuna riga inventata: l'id resta fra gli scoperti (decide l'utente).
// Nel master l'id e' un int a 32 bit (enemyId nelle righe stage): oltre 2^31-1 errore.
// make-game-tables.js chiama addRows() subito dopo la tabella enemy, prima di grafica sostitutiva, abilita'
// (enemy-attack-fix.js) ed effetto di comparsa, e prima di make-story-oltre.js (obiettivi «Defeat X»). Qui il clone
// parte dal displayId originale della base (enemy_display_orig.json) e la sostituzione si ricalcola come per la base.
// Da riga di comando (master gia' costruito, nessuna sostituzione dopo): il clone prende il displayId attuale della base.
//
//   node server/make-enemy-oltre.js [cartella master]
'use strict';

const fs = require('fs');
const path = require('path');

const MAX_ID = 2 ** 31 - 1;
const MISSING_PATH = process.env.KHUX_ENEMIES_OLTRE525 || 'D:\\Progetto_Restauro_KH_UX\\reference\\world_schema\\oltre525\\enemies_oltre525.json';
const STATS_PATH = process.env.KHUX_ENEMY_STATS_OLTRE || 'D:\\Progetto_Restauro_KH_UX\\wiki\\enemy_stats_oltre.json';
const SHADOW = 80001;

// D-A: solo gli id di 9-10 cifre sono varianti di un nemico base (ultime 4 cifre)
const isClone = (id) => id >= 1e8 && id < 1e10;
const copy = (r) => JSON.parse(JSON.stringify(r));

// missing: {"<id>": {missions[]}}; enemyRows: tabella enemy; stats: {"<id>": {name, hp, attack, displayId?, source}};
// orig: {"<id>": displayId originale}. -> { rows, uncovered[{enemyId, name, missions, base}], cloned, fromStats }
function enemyRowsFor(missing, enemyRows, stats = {}, orig = {}) {
  const byId = new Map(enemyRows.map((r) => [r.enemyId, r]));
  const byName = new Map();
  for (const r of [...enemyRows].sort((a, b) => a.enemyId - b.enemyId)) {
    const n = String(r.name || '').toLowerCase();
    if (!byName.has(n)) byName.set(n, r);
  }
  const out = { rows: [], uncovered: [], cloned: 0, fromStats: 0 };
  for (const [key, info] of Object.entries(missing).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const id = Number(key);
    if (!Number.isInteger(id) || id <= 0 || id > MAX_ID) throw new Error(`enemy-oltre: enemyId ${key} fuori dall'int a 32 bit`);
    if (byId.has(id)) continue;
    const b = isClone(id) ? byId.get(id % 10000) : null;
    let row = null;
    if (b) {
      row = Object.assign(copy(b), { enemyId: id });
      if (orig[b.enemyId] !== undefined) row.displayId = orig[b.enemyId];
      out.cloned++;
    } else if (stats[key] && stats[key].name && Array.isArray(stats[key].hp) && Array.isArray(stats[key].attack)) {
      const s = stats[key];
      const tpl = byName.get(s.name.toLowerCase()) || byId.get(SHADOW) || enemyRows[0];
      row = Object.assign(copy(tpl), { enemyId: id, name: s.name, hp: [...s.hp], attack: [...s.attack] });
      if (s.displayId) row.displayId = s.displayId;
      out.fromStats++;
    }
    if (row) { out.rows.push(row); byId.set(id, row); continue; }
    out.uncovered.push({ enemyId: id, name: (stats[key] && stats[key].name) || info.name || null,
      missions: info.missions || [], base: info.base == null ? null : info.base });
  }
  return out;
}

const readJson = (p, dflt) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return dflt; } };

// fonti: l'elenco dei mancanti e' obbligatorio (errore col percorso); le statistiche dalla wiki facoltative.
// I nomi degli id solo JP (oltre525.json learned_enemy_names) servono solo all'elenco degli scoperti
function defaultSources() {
  let missing;
  try { missing = JSON.parse(fs.readFileSync(MISSING_PATH, 'utf8')).missing; } catch (e) {
    throw new Error(`enemy-oltre: fonte obbligatoria ${MISSING_PATH}: ${e.message}`);
  }
  if (!missing) throw new Error(`enemy-oltre: ${MISSING_PATH} senza «missing»`);
  const names = readJson(path.join(path.dirname(MISSING_PATH), 'oltre525.json'), {}).learned_enemy_names || {};
  for (const [k, v] of Object.entries(missing)) if (!v.name && names[k]) v.name = names[k];
  return { missing, stats: readJson(STATS_PATH, {}) };
}

// in memoria (make-game-tables.js): aggiunge le righe a `enemies`; src = {missing, stats, orig} oppure dalle fonti
function addRows(enemies, masterDir, src) {
  const s = src || { ...defaultSources(), orig: masterDir ? readJson(path.join(masterDir, 'enemy_display_orig.json'), {}) : {} };
  const res = enemyRowsFor(s.missing, enemies, s.stats || {}, s.orig || {});
  enemies.push(...res.rows);
  if (!src || process.env.KHUX_ENEMY_OLTRE_LOG) {
    console.log(`enemy-oltre: +${res.rows.length} righe (${res.cloned} cloni della base, ${res.fromStats} dalla wiki); `
      + `${res.uncovered.length} senza fonte, fuori (${res.uncovered.slice(0, 8).map((u) => u.enemyId).join(' ')}...)`);
  }
  return { added: res.rows.length, cloned: res.cloned, fromStats: res.fromStats, uncovered: res.uncovered };
}

// master gia' costruito: idempotente, il clone tiene il displayId attuale della base (gia' sostituito se serve)
function patch(masterDir, src) {
  const file = path.join(masterDir, 'enemy.json');
  const enemies = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rep = addRows(enemies, null, src || { ...defaultSources(), orig: {} });
  if (rep.added) fs.writeFileSync(file, JSON.stringify(enemies));
  return rep;
}

if (require.main === module) {
  const rep = patch(process.argv[2] || path.join(__dirname, 'master_data'));
  console.log(`enemy-oltre: +${rep.added} (${rep.cloned} cloni, ${rep.fromStats} dalla wiki), ${rep.uncovered.length} senza fonte`);
}

module.exports = { MAX_ID, isClone, enemyRowsFor, defaultSources, addRows, patch };
