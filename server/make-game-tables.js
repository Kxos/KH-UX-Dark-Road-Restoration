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
// player: livelli 1..99 con HP, AP e costo segnaposto (KHUX_PLAYER_HP, default 3000):
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

// 3000: oltre, l'HUD allunga l'arco dell'HP e carica texture (Avatar_Circle_01/06,
// Avatar_Side_0N) che non sono in nessun pacchetto: crash (FUN_00b157c8).
const hp = Number(process.env.KHUX_PLAYER_HP || 3000);
const players = [];
// anche il livello 0: la barra dell'EXP dopo /stage/clear (FUN_006ea1b4) legge le righe
// lv e lv+1 della tabella e va in crash se una manca.
for (let lv = 0; lv <= 99; lv++) {
  players.push(Object.assign(blank('player'), {
    lv, needExp: Math.max(lv - 1, 0) * 100, luxMedal: 0, ap: 10 + lv, cost: 5 + lv, hp: hp + Math.max(lv - 1, 0) * 20, rewardId: 0,
  }));
}

// reward: premi dei forzieri (e di altro). Tipi ricavati da FUN_00b07090: 4 monete,
// 8 CP (Attack Prize: barra degli speciali), 9 HP; 5 = materiale (id della tabella
// material, es. 13 Spring Water: nel forziere non funziona, resta vuoto). La riga 81
// e' il forziere arancione del Prologue (stage/mappoi_stg01010_01.bin); contenuto e
// quantita' sono nostri.
// KHUX_CHEST_ITEM = id dell'oggetto (0 per CP/HP/monete), KHUX_CHEST_CP = quantita'.
const rewardIds = (process.env.KHUX_CHEST_REWARDS || '81').split(',').map(Number);
const chestType = Number(process.env.KHUX_CHEST_TYPE || 8);
const rewardRow = (rewardId, type, id, num) => Object.assign(blank('reward'), {
  rewardId, validReward: 1, display: [1], type: [type], id: [id],
  assignSkillType: [0], assignSkillId: [0], assignSkillLv: [0], num: [num], odds: [10000],
});
const rewards = rewardIds.map((rewardId) => rewardRow(rewardId, chestType,
  Number(process.env.KHUX_CHEST_ITEM || 0), Number(process.env.KHUX_CHEST_CP || 10000)));
// Drop dei nemici: il client cerca in reward una riga per nemico (FUN_00e7e6e8, la
// stessa tabella dei forzieri; senza la riga va in crash). Provato sul banco con le
// righe 1 e = enemyId (80001, 88001, 81020): tipo 5 (materiale) fa salire il
// contatore argento dell'HUD. Quale delle due sia letta non e' ancora accertato.
const enemyRewardIds = (process.env.KHUX_ENEMY_REWARDS || '1,80001,88001,81020').split(',').filter(Boolean).map(Number);
for (const rewardId of enemyRewardIds.filter((r) => !rewardIds.includes(r))) {
  rewards.push(rewardRow(rewardId, Number(process.env.KHUX_ENEMY_DROP_TYPE || 5),
    Number(process.env.KHUX_ENEMY_DROP_ITEM || 13), Number(process.env.KHUX_ENEMY_DROP_NUM || 1)));
}

// mypageBackground: sfondo della schermata principale (FUN_00bb400c). Il client cerca
// la riga del backgroundId di /mypage, o 150911 (0x24d7f) di default, e senza riga va
// in crash. La tabella non c'e' nella 5.0.1: una riga per ogni sfondo che ha grafica
// nelle risorse (lwf/home/<id>/<id>.lwf), senza parti aggiuntive (validParts 0).
const backgrounds = [150911, 2, 3, 4, 5, 6, 99].map((id, i) => Object.assign(blank('mypageBackground'), {
  id, backgroundId: id, sortId: i + 1,
  startTime: '2015-01-01 00:00:00', endTime: '2099-12-31 23:59:59',
  partsId: [], dataType: [], xPostion: [], yPostion: [], zSort: [],
}));

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'mypageBackground.json'), JSON.stringify(backgrounds));
fs.writeFileSync(path.join(OUT, 'reward.json'), JSON.stringify(rewards));
fs.writeFileSync(path.join(OUT, 'medal.json'), JSON.stringify(medals));
fs.writeFileSync(path.join(OUT, 'player.json'), JSON.stringify(players));
console.log(`medal: ${medals.length} righe; player: ${players.length} livelli (HP lv1 = ${hp})`);
