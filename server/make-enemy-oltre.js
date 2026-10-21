#!/usr/bin/env node
// Righe enemy dei nemici che gli stage JP 4.3.1 delle missioni 526-979 usano e il nostro master non ha (I-009, Task 2).
// Elenco: reference\world_schema\oltre525\enemies_oltre525.json (enemies_oltre525.py: 454 id usati, 312 mancanti,
// `missing{"<id>": {missions[], base, base_name}}`). Regole dell'utente (D-A e decisione del 21-10):
// - id di 9-10 cifre (AAMM + cifra + famiglia, es. 1510110017) con la base nel master -> clone esatto della base col
//   nuovo enemyId (nome, HP, abilita', grafica): base = ultime 5 cifre (cifra del livello + famiglia, 10017) se la riga
//   c'e', altrimenti ultime 4 (160921501: 21501 assente -> 1501). Ricerca successiva: 13 dei 62 cloni cambiano HP
//   rispetto alle sole 4 cifre (190110117: 117 hp [2700,4700,...], 10117 [5200,9000,...]).
// - gli altri 250 (id solo JP, id lunghi senza base): nessuna statistica esiste (wiki: la pagina «Enemies» da' solo nome,
//   descrizione, attributo, tipo; ricerca in rete 0/250) -> clone del nemico ORIGINALE piu' simile, dichiarato nelle
//   Notices (Task 5). Proposta: D:\Progetto_Restauro_KH_UX\tmp\enemy_src\clone_proposal.json ({"<id>": {base, reason,
//   confidence, name, attribute, max_quest_lvl}}, script in tmp\enemy_src\scripts\prop.py). Della base si copiano curve
//   (validGrowth, baseLv, hp, attack, defense, exp, money, raidPoint, lux, score) e campi di battaglia (abilita', taglia,
//   velocita', comparsa); nome e attributo della proposta se noti; grafica della famiglia dell'id (id % 10000 delle
//   ultime 5 cifre) se servita, altrimenti quella della base. Gli id lunghi di queste famiglie riusano il clone della
//   loro base a 5 (o 4) cifre. Ogni riga ha la sua fonte in enemy_oltre_sources.json (per la Notice).
// - le statistiche da una fonte vera (D:\Progetto_Restauro_KH_UX\wiki\enemy_stats_oltre.json, {"<id>": {name, hp[5],
//   attack[5], displayId?, source}}, oggi assente) vincono sulla proposta.
// Nel master l'id e' un int a 32 bit (enemyId nelle righe stage): oltre 2^31-1 errore.
// make-game-tables.js toglie le righe di un giro precedente subito dopo la tabella enemy (strip) e chiama addRows() dopo
// la scelta della grafica (le basi hanno gia' il displayId servito) e prima di abilita' (enemy-attack-fix.js), effetto di
// comparsa e make-story-oltre.js (obiettivi «Defeat X»). Rigenerate a ogni giro: idempotente.
//
//   node server/make-enemy-oltre.js [cartella master] [file delle fonti]
'use strict';

const fs = require('fs');
const path = require('path');

const MAX_ID = 2 ** 31 - 1;
const OLTRE_DIR = 'D:\\Progetto_Restauro_KH_UX\\reference\\world_schema\\oltre525';
const MISSING_PATH = process.env.KHUX_ENEMIES_OLTRE525 || path.join(OLTRE_DIR, 'enemies_oltre525.json');
const PROPOSAL_PATH = process.env.KHUX_ENEMY_CLONE_PROPOSAL || 'D:\\Progetto_Restauro_KH_UX\\tmp\\enemy_src\\clone_proposal.json';
const STATS_PATH = process.env.KHUX_ENEMY_STATS_OLTRE || 'D:\\Progetto_Restauro_KH_UX\\wiki\\enemy_stats_oltre.json';
const SOURCES_PATH = process.env.KHUX_ENEMY_OLTRE_SOURCES || path.join(OLTRE_DIR, 'enemy_oltre_sources.json');
const NAMES_PATH = process.env.KHUX_RESOURCE_NAMES || 'D:\\Progetto_Restauro_KH_UX\\resource_data\\names_v4.tsv';
const ENEMY_GEN = process.env.KHUX_NO_ENEMY_GEN ? null
  : path.join(process.env.KHUX_ENEMY_GEN || 'D:\\Progetto_Restauro_KH_UX\\enemy_gen\\files', 'lwf', 'character', 'enemy');
const SHADOW = 80001;

// D-A: solo gli id di 9-10 cifre sono varianti di un nemico base
const isClone = (id) => id >= 1e8 && id < 1e10;
// base di un id lungo: ultime 5 cifre se la riga c'e', altrimenti ultime 4 (regola del controller, 21-10)
const baseOf = (id, has) => (has(id % 100000) ? id % 100000 : has(id % 10000) ? id % 10000 : null);
// famiglia grafica: ultime 4 cifre (delle ultime 5 per gli id da 8 cifre in su), come prop.py split()
const familyOf = (id) => (id >= 1e7 ? id % 100000 : id) % 10000;
const copy = (r) => JSON.parse(JSON.stringify(r));

// grafiche servite di un nemico, come make-game-tables.js: lwf/character/enemy/<d>/wait/ nei nomi delle risorse
// (names_v4.tsv) piu' le cartelle di enemy_gen con wait/wait.lwf (drawnJp). Solo d < 5000 conta come grafica KHUX
function drawnDisplays(namesFile = NAMES_PATH, drawnJp = null) {
  const drawn = new Set();
  if (namesFile && fs.existsSync(namesFile)) {
    for (const line of fs.readFileSync(namesFile, 'utf8').split('\n')) {
      const m = /^lwf\/character\/enemy\/(\d+)\/wait\//.exec(line);
      if (m) drawn.add(Number(m[1]));
    }
  }
  const jp = drawnJp || (ENEMY_GEN && fs.existsSync(ENEMY_GEN) ? fs.readdirSync(ENEMY_GEN)
    .filter((n) => /^\d+$/.test(n) && fs.existsSync(path.join(ENEMY_GEN, n, 'wait', 'wait.lwf'))).map(Number) : []);
  for (const d of jp) drawn.add(d);
  return drawn;
}

// missing: {"<id>": {missions[]}}; enemyRows: tabella enemy (basi col displayId gia' servito);
// src: {stats, proposal, drawn:Set}. -> { rows, sources{"<id>": {kind, base, ...}}, uncovered[], cloned, fromStats, family }
function enemyRowsFor(missing, enemyRows, src = {}) {
  const { stats = {}, proposal = {}, drawn = new Set() } = src;
  const byId = new Map(enemyRows.map((r) => [r.enemyId, r]));
  const has = (id) => byId.has(id);
  const byName = new Map();
  for (const r of [...enemyRows].sort((a, b) => a.enemyId - b.enemyId)) {
    const n = String(r.name || '').toLowerCase();
    if (!byName.has(n)) byName.set(n, r);
  }
  const out = { rows: [], sources: {}, uncovered: [], cloned: 0, fromStats: 0, family: 0 };
  // byId cresce con le righe aggiunte: le basi delle proposte restano gli originali (out.sources li esclude)
  const add = (row, source) => { out.rows.push(row); out.sources[row.enemyId] = source; byId.set(row.enemyId, row); };
  const ids = Object.keys(missing).map((k) => {
    const id = Number(k);
    if (!Number.isInteger(id) || id <= 0 || id > MAX_ID) throw new Error(`enemy-oltre: enemyId ${k} fuori dall'int a 32 bit`);
    return id;
  }).filter((id) => !byId.has(id));
  // prima le righe originali come base, poi le corte nuove, poi gli id lunghi (che possono riusare le corte nuove)
  const long = ids.filter(isClone).sort((a, b) => a - b), short = ids.filter((id) => !isClone(id)).sort((a, b) => a - b);
  const pending = [];
  for (const id of long) {
    const b = baseOf(id, has);
    if (b === null) { pending.push(id); continue; }
    add(Object.assign(copy(byId.get(b)), { enemyId: id }), { kind: 'exact-clone', base: b });
    out.cloned++;
  }
  const family = (id) => {
    const key = String(id), s = stats[key], p = proposal[key];
    if (s && s.name && Array.isArray(s.hp) && Array.isArray(s.attack)) {
      const tpl = byName.get(s.name.toLowerCase()) || byId.get(SHADOW) || enemyRows[0];
      const row = Object.assign(copy(tpl), { enemyId: id, name: s.name, hp: [...s.hp], attack: [...s.attack] });
      if (s.displayId) row.displayId = s.displayId;
      out.fromStats++;
      return add(row, { kind: 'stats', base: tpl.enemyId, source: s.source || null });
    }
    // id lungo di una famiglia gia' clonata: riusa il clone della base a 5 (o 4) cifre
    const via = isClone(id) ? baseOf(id, (x) => out.sources[x] && out.sources[x].kind !== 'exact-clone') : null;
    if (via !== null) {
      const v = out.sources[via];
      out.family++;
      return add(Object.assign(copy(byId.get(via)), { enemyId: id }),
        { kind: 'family-clone', confidence: v.confidence, base: v.base, via });
    }
    // la base della proposta e' un nemico originale (mai una riga aggiunta qui)
    const b = p && !out.sources[p.base] ? byId.get(p.base) : null;
    if (!b) {
      return out.uncovered.push({ enemyId: id, name: (p && p.name) || missing[key].name || null, missions: missing[key].missions || [],
        base: p ? p.base : null });
    }
    const row = copy(b);
    row.enemyId = id;
    if (p.name) row.name = p.name;
    if (p.attribute) row.attribute = p.attribute;
    // grafica: quella della famiglia dell'id se servita (mai una grafica assente: il client va in crash), se no la base
    const fam = familyOf(id);
    if (fam < 5000 && drawn.has(fam)) row.displayId = fam;
    out.family++;
    return add(row, { kind: 'family-clone', confidence: p.confidence, base: p.base, name: row.name, displayId: row.displayId,
      reason: p.reason });
  };
  for (const id of short) family(id);
  for (const id of pending) family(id);
  return out;
}

const readJson = (p, dflt) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return dflt; } };
function readRequired(p, what) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { throw new Error(`enemy-oltre: fonte obbligatoria ${what} ${p}: ${e.message}`); }
}

// fonti: elenco dei mancanti e proposta di clone obbligatori (errore col percorso); statistiche vere facoltative.
// I nomi degli id solo JP (oltre525.json learned_enemy_names) servono solo all'elenco degli scoperti
function defaultSources() {
  const missing = readRequired(MISSING_PATH, 'elenco').missing;
  if (!missing) throw new Error(`enemy-oltre: ${MISSING_PATH} senza «missing»`);
  const names = readJson(path.join(path.dirname(MISSING_PATH), 'oltre525.json'), {}).learned_enemy_names || {};
  for (const [k, v] of Object.entries(missing)) if (!v.name && names[k]) v.name = names[k];
  return { missing, proposal: readRequired(PROPOSAL_PATH, 'proposta di clone'), stats: readJson(STATS_PATH, {}) };
}

// righe di un giro precedente (gli id dell'elenco non sono mai nel master originale): via, si rigenerano
function strip(enemies, missing) {
  const ids = new Set(Object.keys(missing).map(Number));
  const kept = enemies.filter((e) => !ids.has(e.enemyId));
  const n = enemies.length - kept.length;
  enemies.splice(0, enemies.length, ...kept);
  return n;
}

// in memoria (make-game-tables.js): src = {missing, proposal, stats, drawn, sourcesOut?} oppure dalle fonti
function addRows(enemies, src) {
  const s = src || { ...defaultSources(), drawn: drawnDisplays(), sourcesOut: SOURCES_PATH };
  strip(enemies, s.missing);
  const res = enemyRowsFor(s.missing, enemies, s);
  enemies.push(...res.rows);
  if (s.sourcesOut) {
    fs.writeFileSync(s.sourcesOut, JSON.stringify({ _doc: 'fonte di ogni riga enemy delle missioni 526-979 (make-enemy-oltre.js): '
      + 'exact-clone = base a 5/4 cifre; family-clone(confidence) = nemico originale piu\' simile (Notices); uncovered = fuori',
    sources: res.sources, uncovered: res.uncovered }, null, 1));
  }
  console.log(`enemy-oltre: +${res.rows.length} righe (${res.cloned} cloni esatti, ${res.family} cloni di famiglia, `
    + `${res.fromStats} da fonte); ${res.uncovered.length} senza base, fuori`);
  return { added: res.rows.length, cloned: res.cloned, family: res.family, fromStats: res.fromStats, sources: res.sources,
    uncovered: res.uncovered };
}

// master gia' costruito: le basi hanno gia' il displayId servito; idempotente
function patch(masterDir, src) {
  const file = path.join(masterDir, 'enemy.json');
  const enemies = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rep = addRows(enemies, src);
  fs.writeFileSync(file, JSON.stringify(enemies));
  return rep;
}

if (require.main === module) {
  const d = defaultSources();
  patch(process.argv[2] || path.join(__dirname, 'master_data'), { ...d, drawn: drawnDisplays(), sourcesOut: process.argv[3] || SOURCES_PATH });
}

module.exports = { MAX_ID, SOURCES_PATH, isClone, baseOf, familyOf, drawnDisplays, enemyRowsFor, defaultSources, strip, addRows, patch };
