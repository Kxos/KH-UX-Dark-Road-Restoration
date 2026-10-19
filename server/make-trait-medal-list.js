#!/usr/bin/env node
// Elenco delle Trait Medal (I-084 parte B): numero EN «Trait Medal #N» -> medaglia associata, dalla tabella della
// khuxwiki (reference\trait_medals\khuxwiki_Trait_Medal_raw.txt, 189 righe: #1-#188 e #274). La prima colonna e' il
// numero di Album EN della medaglia (= sortId del master, la Trait Medal condivide la cella: notice 38128).
// affected = riga type 1 (< 1.000.000, non boosted) con quel sortId e il nome dell'etichetta della wiki; se l'Album
// ha piu' nomi (evoluzioni SN -> SN+) e l'etichetta non corrisponde, la riga piu' bassa. Scrive server/trait_medals.json
// (versionato: la sorgente sta fuori dal repo).
//
//   node server/make-trait-medal-list.js [wikitesto] [cartella master]
'use strict';

const fs = require('fs');
const path = require('path');

const RAW = path.join(__dirname, '..', '..', '..', 'reference', 'trait_medals', 'khuxwiki_Trait_Medal_raw.txt');
const OUT = path.join(__dirname, 'trait_medals.json');

// etichetta della wiki -> nome del master
function label(cell) {
  const s = cell.trim();
  let m;
  if ((m = s.match(/^\{\{EX\|([^}]+)\}\}$/))) return `${m[1]} [EX]`;
  if ((m = s.match(/^\{\{b\|([^|}]+)\|([^}]+)\}\}$/))) return `${m[1]} [${m[2]}]`;
  if ((m = s.match(/^\{\{KA\|(\d+)\}\}$/))) return `Key Art #${m[1]}`;
  if ((m = s.match(/^\{\{SG\|(\d+)\}\}$/))) return `Stained Glass #${m[1]}`;
  if ((m = s.match(/^\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/))) return m[1].replace(/Key Art (\d+)/, 'Key Art #$1');
  return s;
}

function build(raw, medals) {
  const out = [];
  for (const line of raw.split('\n')) {
    if (!/^\|\d+\|\|/.test(line)) continue;
    const c = line.split('||');
    const album = Number(c[0].slice(1));
    const n = Number((c[2].match(/\{\{n\|Trait Medal\|(\d+)\}\}/) || [])[1]);
    const jp = Number(c[1]);
    const name = label(c[4]);
    const rows = medals.filter((r) => r.sortId === album && r.type === 1 && r.medalId < 1e6 && !r.groupId)
      .sort((a, b) => a.medalId - b.medalId);
    if (!n || !rows.length) throw new Error(`riga senza numero o medaglia: ${line.slice(0, 80)}`);
    const hit = rows.find((r) => r.name === name) || rows.find((r) => r.name.startsWith(name)) || rows[0];
    out.push({ n, album, jp, label: name, affected: hit.medalId, name: hit.name });
  }
  return out.sort((a, b) => a.n - b.n);
}

module.exports = { label, build };

if (require.main === module) {
  const raw = fs.readFileSync(process.argv[2] || RAW, 'utf8');
  const medals = JSON.parse(fs.readFileSync(path.join(process.argv[3] || path.join(__dirname, 'master_data'), 'medal.json'), 'utf8'));
  const list = build(raw, medals);
  fs.writeFileSync(OUT, JSON.stringify(list, null, 1) + '\n');
  console.log(`trait_medals.json: ${list.length} Trait Medal (#${list[0].n}-#${list[list.length - 1].n})`);
}
