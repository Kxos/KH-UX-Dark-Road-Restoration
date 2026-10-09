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

// Tabelle vere di una versione precedente, se disponibili: righe binarie di
// thethiny/KHUx-Server (data/<tabella>_raw.json), decodificate con
// recon/tools/raw_master.py (player, reward) o raw_master_old.py (stage, enemy, medal) in
// <tabella>_dec.json. Fuori dal repository.
const REAL_DIR = process.env.KHUX_REAL_MASTER_DIR || 'D:\\Progetto_Restauro_KH_UX\\external\\thethiny';
const realTable = (name) => {
  try { return JSON.parse(fs.readFileSync(path.join(REAL_DIR, name + '_dec.json'), 'utf8')); } catch { return null; }
};
// solo i campi dello schema 4.3.1 (le righe decodificate hanno anche unk_<offset>)
const fromReal = (table, r) => {
  const row = blank(table);
  for (const k of Object.keys(row)) if (r[k] !== undefined) row[k] = r[k];
  return row;
};

const medals = values.medals.map((m, i) => Object.assign(blank('medal'), {
  medalId: m.medalId,
  // imageId nel file dei valori: grafica sostitutiva per le medaglie senza immagine nelle
  // risorse (img/medal/Medal_L_<id>.png c'e' solo per 22 medaglie)
  imageId: m.imageId || m.medalId, thumbId: m.imageId || m.medalId, cutinId: m.imageId || m.medalId,
  artId: m.imageId || m.medalId, displayId: m.imageId || m.medalId,
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
  // medaglie EXP ed evoluzione (es. Dewey ★): nessun attacco speciale
  validBurst: m.burstId ? 1 : 0, burstId: m.burstId || 0,
  burstEnhanceCategory: [0, 0],
  groupId: 0, // nessun gruppo (con medalId: riga cercata e assente)
  sell: 10, materialExp: 10,
}));

// Medaglie vere (522, compresa la 1), al posto dei valori della wiki; le medaglie del file
// dei valori che mancano restano. Solo 21 medaglie hanno grafica nelle risorse servite
// (img/medal/Medal_L_<id>.png, indice delle risorse versione 4): le altre prendono quella
// di una medaglia dello stesso attributo (1 Power, 2 Speed, 3 Magic), o di Dewey ★.
const MEDAL_IMAGES = new Set([11012, 11021, 11031, 11041, 11052, 12011, 12022, 12031, 12041, 12051,
  13011, 13021, 13031, 13032, 13041, 13051, 33023, 33043, 90011, 90031, 90041]);
const IMAGE_BY_ATTRIBUTE = { 1: 11021, 2: 12011, 3: 13021 };
const realMedals = realTable('medal');
if (realMedals) {
  const byId = new Map(medals.map((m) => [m.medalId, m]));
  for (const r of realMedals) {
    const img = MEDAL_IMAGES.has(r.imageId) ? r.imageId : IMAGE_BY_ATTRIBUTE[r.attribute] || 90041;
    byId.set(r.medalId, Object.assign(fromReal('medal', r), {
      imageId: img, thumbId: img, cutinId: img, artId: img, displayId: img,
      listSortId: r.sortId, burstEnhanceCategory: [0, 0], groupId: 0,
    }));
  }
  medals.splice(0, medals.length, ...byId.values());
}

// Medaglia 1: il client, se non trova una medaglia, ripiega sulla medaglia 1
// (FUN_00eb577c); senza riga va in crash (es. «Begin» su una missione). Segnaposto:
// copia della prima medaglia del file dei valori, con medalId 1.
if (medals.length && !medals.some((m) => m.medalId === 1)) {
  medals.push(Object.assign({}, medals[0], { medalId: 1 }));
}

// 3000: oltre, l'HUD allunga l'arco dell'HP e carica texture (Avatar_Circle_01/06,
// Avatar_Side_0N) che non sono in nessun pacchetto: crash (FUN_00b157c8).
const hp = Number(process.env.KHUX_PLAYER_HP || 3000);

// enemy: alle righe della 5.0.1 (import-master.js, 12 nemici) si aggiungono i nemici veri
// che mancano (665; cinque livelli invece di sei, come gran parte delle righe 5.0.1).
// Molti non hanno grafica nelle risorse (HANDOFF, «Mappe generate»): conta solo per le
// mappe che li usano.
let enemies = null;
const realEnemies = realTable('enemy');
if (realEnemies) {
  enemies = JSON.parse(fs.readFileSync(path.join(OUT, 'enemy.json'), 'utf8'));
  const have = new Set(enemies.map((e) => e.enemyId));
  for (const r of realEnemies) if (!have.has(r.enemyId)) enemies.push(fromReal('enemy', r));
}

const players = [];
const realPlayers = realTable('player');
if (realPlayers) {
  // livelli veri (soglie di Lux cumulative, AP, costo del deck, Lux medal); l'HP resta
  // al massimo a KHUX_PLAYER_HP (sopra 3000 l'HUD va in crash, vedi sopra).
  // rewardId a 0: le righe di premio dei livelli non sono nella nostra tabella reward.
  for (const r of realPlayers) players.push(Object.assign(blank('player'), r, { hp: Math.min(r.hp, hp), rewardId: 0 }));
  // anche il livello 0 (vedi sotto)
  players.unshift(Object.assign(blank('player'), players[0], { lv: 0, needExp: 0 }));
} else {
  // anche il livello 0: la barra dell'EXP dopo /stage/clear (FUN_006ea1b4) legge le righe
  // lv e lv+1 della tabella e va in crash se una manca.
  for (let lv = 0; lv <= 99; lv++) {
    players.push(Object.assign(blank('player'), {
      lv, needExp: Math.max(lv - 1, 0) * 100, luxMedal: 0, ap: 10 + lv, cost: 5 + lv, hp: hp + Math.max(lv - 1, 0) * 20, rewardId: 0,
    }));
  }
}

// reward: premi dei forzieri e dei nemici. Una riga ha fino a 4 premi (type/id/num/
// odds); il client tiene quelli il cui tipo compare, nella stessa posizione, in
// dropItemTypeIds di /stage/start (server.js). Tipi ricavati da FUN_00b07090: 4 monete,
// 8 CP (Attack Prize: barra degli speciali), 9 HP; 5 = materiale (id della tabella
// material: nel forziere non funziona, resta vuoto; dal nemico e' il sacchetto argento).
// Le righe usate vengono dalle mappe (server/game_data/stage_poi.json, generato da
// recon/tools/stage_poi.py): per i forzieri la terza colonna del record, per i nemici
// la settima (di solito 1; il primo nemico di ogni mappa ne ha una sua, es. 80002, e
// senza riga il client va in crash in FUN_00e7e6e8). Contenuti e quantita' sono nostri, per riga del forziere:
// CHEST_PRIZES (KHUX_CHEST_TYPE/KHUX_CHEST_CP cambiano il premio predefinito).
const rewardRow = (rewardId, prizes) => Object.assign(blank('reward'), {
  rewardId, validReward: 1,
  display: prizes.map(() => 1), type: prizes.map((p) => p.type), id: prizes.map((p) => p.id || 0),
  assignSkillType: prizes.map(() => 0), assignSkillId: prizes.map(() => 0), assignSkillLv: prizes.map(() => 0),
  num: prizes.map((p) => p.num), odds: prizes.map(() => 10000),
});
const CHEST_DEFAULT = { type: Number(process.env.KHUX_CHEST_TYPE || 8), num: Number(process.env.KHUX_CHEST_CP || 10000) };
// Righe dei forzieri riconosciute confrontando le mappe con i tesori di khuxwiki
// (InfoQuestKHUX, {{TC|codice}}) nelle missioni 1-6: 81 = Attack Prize medio (a2), 80 =
// Attack Prize piccolo (a1, o barile «ba»), 90 = barile con HP (bh), 1 = barile vuoto (b;
// la 1 e' anche la riga predefinita dei nemici). Le quantita' sono nostre.
const CHEST_PRIZES = {
  81: CHEST_DEFAULT,              // a2
  80: { type: 8, num: Math.round(CHEST_DEFAULT.num / 2) }, // a1
  90: { type: 9, num: 500 },      // bh
  1: null,                        // b: vuoto
};
const ENEMY_PRIZE = {
  type: Number(process.env.KHUX_ENEMY_DROP_TYPE || 5),
  id: Number(process.env.KHUX_ENEMY_DROP_ITEM || 13), num: Number(process.env.KHUX_ENEMY_DROP_NUM || 1),
};
let poi = {};
try {
  poi = JSON.parse(fs.readFileSync(path.join(__dirname, 'game_data', 'stage_poi.json'), 'utf8'));
} catch {
  console.warn('stage_poi.json assente: solo le righe del Prologue');
  poi = { 1010: { chests: [{ uid: 18, reward: 81 }], enemies: [{ reward: 80001 }] } };
}
const chestRewards = new Set(Object.values(poi).flatMap((s) => s.chests.map((c) => c.reward)));
const enemyRewards = new Set([1, ...Object.values(poi).flatMap((s) => s.enemies.map((e) => e.reward))]);
const realRewards = new Map((realTable('reward') || []).map((r) => [r.rewardId, r]));
const rewards = [];
for (const id of [...new Set([...chestRewards, ...enemyRewards])].sort((a, b) => a - b)) {
  // posizione 0 il premio del nemico, posizione 1 quello del forziere (se la riga e'
  // di entrambi, come la 1): server.js manda a ciascuno il tipo nella sua posizione
  const prizes = [];
  if (enemyRewards.has(id)) prizes.push(ENEMY_PRIZE);
  // forzieri: la riga vera se c'e' ed e' valida (es. 80 = CP 15.000, 81 = CP 30.000,
  // 90 = HP 1.400; la 1 non e' valida: barile vuoto), con premi di tipo 4/8/9 soltanto
  const real = realRewards.get(id);
  const realChest = real && real.validReward > 0 && !enemyRewards.has(id)
    ? real.type.slice(0, real.validReward).map((t, i) => ({ type: t, id: real.id[i], num: real.num[i] }))
      .filter((p) => [4, 8, 9].includes(p.type))
    : null;
  if (chestRewards.has(id) && realChest && realChest.length) prizes.push(...realChest);
  else if (chestRewards.has(id) && CHEST_PRIZES[id] !== null) prizes.push(CHEST_PRIZES[id] || CHEST_DEFAULT);
  rewards.push(rewardRow(id, prizes));
}

// mypageBackground: sfondo della schermata principale (FUN_00bb400c). Il client cerca
// la riga del backgroundId di /mypage, o 150911 (0x24d7f) di default, e senza riga va
// in crash. La tabella non c'e' nella 5.0.1: una riga per ogni sfondo che ha grafica
// nelle risorse. La grafica si disegna SOLO dalle parti (validParts = quante, poi
// partsId/dataType/xPostion/yPostion/zSort): dataType 1 = lwf/home/<id>/<id>.png,
// 2 = lwf/home/<id>/<id>.lwf, 3 = img/home/<id>/<id>.plist. Con validParts 0 la home
// resta nera. Qui due parti: l'immagine di fondo (png, sotto) e l'animazione lwf
// (sopra: per 150911 l'acqua della fontana). Posizioni nostre (KHUX_BG_X/Y).
const bgX = Number(process.env.KHUX_BG_X || 0);
const bgY = Number(process.env.KHUX_BG_Y || 0);
const backgrounds = [150911, 2, 3, 4, 5, 6, 99].map((id, i) => Object.assign(blank('mypageBackground'), {
  id, backgroundId: id, sortId: i + 1,
  startTime: '2015-01-01 00:00:00', endTime: '2099-12-31 23:59:59',
  validParts: 2, partsId: [id, id], dataType: [1, 2],
  xPostion: [bgX, bgX], yPostion: [bgY, bgY], zSort: [0, 1],
}));

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'mypageBackground.json'), JSON.stringify(backgrounds));
fs.writeFileSync(path.join(OUT, 'reward.json'), JSON.stringify(rewards));
fs.writeFileSync(path.join(OUT, 'medal.json'), JSON.stringify(medals));
fs.writeFileSync(path.join(OUT, 'player.json'), JSON.stringify(players));
if (enemies) fs.writeFileSync(path.join(OUT, 'enemy.json'), JSON.stringify(enemies));
console.log(`medal: ${medals.length} righe; player: ${players.length} livelli (HP lv1 = ${hp})` +
  (enemies ? `; enemy: ${enemies.length} righe` : ''));
