#!/usr/bin/env node
// Importa in server/master_data/ tabelle master vere al posto dei segnaposto.
//
// La sorgente e' una cartella con un file per tabella, senza estensione o in
// .json, ciascuno un array JSON di righe: per esempio le tabelle della 5.0.1
// offline estratte dal suo extra.mp4 (D:\Progetto_Restauro_KH_UX\apk501\extra_files,
// vedi HANDOFF). Si importano solo le tabelle nominate; prima di scriverle si
// controlla che ogni riga abbia esattamente i campi dello schema 4.3.1
// (recon/out/master_types_ww431.json). I tipi li verifica il server quando le serve.
//
// Sono dati di Square Enix: master_data/ resta fuori dal repository.
//
//   node server/import-master.js <cartella> <tabella> [tabella ...]

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data');
const [src, ...tables] = process.argv.slice(2);
if (!src || tables.length === 0) {
  console.error('uso: node server/import-master.js <cartella> <tabella> [tabella ...]');
  process.exit(1);
}

const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'recon', 'out', 'master_types_ww431.json'), 'utf8'));
let failed = 0;
for (const name of tables) {
  const fields = schema[name];
  const file = [path.join(src, name), path.join(src, name + '.json')].find((f) => fs.existsSync(f));
  if (!fields || !file) {
    console.error(`${name}: ${fields ? 'non trovata in ' + src : 'non e\' nello schema'}`);
    failed++;
    continue;
  }
  const rows = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  const want = fields.map(([f]) => f).sort().join(',');
  const bad = Array.isArray(rows) ? rows.findIndex((r) => Object.keys(r).sort().join(',') !== want) : 0;
  if (bad >= 0) {
    console.error(`${name}: la riga ${bad} non ha i campi dello schema (${want})`);
    failed++;
    continue;
  }
  fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(rows));
  console.log(`${name}: ${rows.length} righe importate`);
}
process.exit(failed ? 1 : 0);
