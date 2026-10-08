#!/usr/bin/env node
// Genera in server/master_data/ le tabelle `medal` e `player`, che la 5.0.1 offline
// non ha piu' (vedi HANDOFF, «La prima battaglia»).
//
// medal: una riga per medaglia del file dei valori (es. D:\Progetto_Restauro_KH_UX\
//   wiki\medals.json, fuori dal repository: sono dati di gioco presi da khuxwiki).
//   Dal file vengono nome, attributo, verso, STR/DEF minimi e massimi del rango 1★,
//   attacco speciale (burstId della tabella burst). Gli altri campi dello schema
//   (recon/out/master_types_ww431.json) hanno valori nostri, scelti per il rango 1★:
//   costo 1, livello massimo 10 (khuxwiki, «Stats»), immagini = medalId
//   (img/medal/Medal_L_%d.png). Il significato di type, growthType ed expType non e'
//   ricavato: valgono 1.
// player: livelli 1..99 con HP, AP e costo segnaposto (KHUX_PLAYER_HP, default 1000):
//   la tabella vera non e' stata trovata.
//
//   node server/make-game-tables.js <valori medaglie.json>

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data');
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'recon', 'out', 'master_types_ww431.json'), 'utf8'));
const src = process.argv[2];
if (!src) {
  console.error('uso: node server/make-game-tables.js <valori medaglie.json>');
  process.exit(1);
}
const values = JSON.parse(fs.readFileSync(src, 'utf8').replace(/^\uFEFF/, ''));

function blank(table) {
  const row = {};
  for (const [f, t] of schema[table]) {
    const arr = /\[(\d+)\]$/.exec(t);
    row[f] = arr ? [] : t.startsWith('string') ? '' : 0;
  }
  return row;
}

const medals = values.medals.map((m, i) => Object.assign(blank('medal'), {
  medalId: m.medalId,
  imageId: m.medalId, thumbId: m.medalId, cutinId: m.medalId, artId: m.medalId, displayId: m.medalId,
  sortId: m.no, listSortId: m.no,
  name: m.name, flavor: m.flavor || '', advantage: m.advantage || '',
  type: 1,
  attribute: m.attribute,
  darklight: m.upright ? 1 : 2,
  rare: 1, skillSlot: 1,
  maxLv: 10, expType: 1, growthType: 1,
  cost: 1, minCost: 1,
  attack: m.attack, maxAttack: m.maxAttack,
  defense: m.defense, maxDefense: m.maxDefense,
  validBurst: 1, burstId: m.burstId,
  burstEnhanceCategory: [0, 0],
  groupId: m.medalId,
  sell: 10, materialExp: 10,
}));

const hp = Number(process.env.KHUX_PLAYER_HP || 1000);
const players = [];
for (let lv = 1; lv <= 99; lv++) {
  players.push(Object.assign(blank('player'), {
    lv, needExp: (lv - 1) * 100, luxMedal: 0, ap: 10 + lv, cost: 5 + lv, hp: hp + (lv - 1) * 20, rewardId: 0,
  }));
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'medal.json'), JSON.stringify(medals));
fs.writeFileSync(path.join(OUT, 'player.json'), JSON.stringify(players));
console.log(`medal: ${medals.length} righe; player: ${players.length} livelli (HP lv1 = ${hp})`);
