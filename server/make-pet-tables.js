#!/usr/bin/env node
// Tabelle master del pet («Spirit»), ricostruite: vedi server/pet.js e docs/notes/home_profilo.md#pet.
// Nessun dump delle tabelle originali (petRank e petSkill sono state tolte nella 5.0.1, le
// cartelle master_data_bak_r53 e apk501\extra_files le hanno vuote): valori NOSTRI, ricavati
// dagli screenshot e dalla khwiki (D:\Progetto_Restauro_KH_UX\reference\pet\NOTE.md).
//
// - petRank (rank, needPt, magnification, rankUpSkill, validOpenSkill, openSkillIds int[15]):
//   17 ranghi (khwiki: massimo 17). needPt = punti cumulativi per arrivare al rango, scelti in
//   modo che pet_ref_14 torni (Rank 11 con 4 x 250 = 1000 punti, «To next rank: 100» -> rango 12
//   a 1100) e che 6 medaglie di punta (~400) diano il rango 17. magnification in decimillesimi
//   come accord/partnerRate dei keyblade (10000 = x1.0): 22000 + 1000 x rango, cioe' Rank 5 =
//   x2.700, Rank 15 = x3.700, Rank 16 = x3.800 (dialog SPIRIT della build finale,
//   pet_spirit_yt_03 / pet_spirit_training_02 / pet_spirit_edit_01). Il client la legge dal
//   petSubslot che manda il server (FUN_007949f0, +0x74) e la somma al partnerRate del keyblade
//   per la cella del 6° slot (FUN_008c47b4 -> FUN_008d02d8): l'unita' va confermata sul banco.
// - petSkill (skillId, thumbId, name, description, invokeDescription, invokeType, skillValue1-5):
//   i «Tricks» della khwiki con il rango che li apre. openSkillIds di un rango = i trick attivi
//   (ogni livello sostituisce il precedente: Steal II prende il posto di Steal I), al massimo 11.
//   thumbId/invokeType ignoti (1); Blast II-IV interpolati tra 10.000 e 750.000.
// - medal.addPetPt (punti pet della medaglia, riga medal +addPetPt, 0 in tutte le nostre righe):
//   stima per rarita' + tier (guiltValue). Fonti: 15/20 punti nelle promo 2017 (medaglie basse),
//   250-432 nelle build successive (medaglie 7 stelle con SA+ e trait; la khwiki dice che i punti
//   dipendono da SA Bonus Level e trait, cosa che qui non si modella).
//
// - shuffleskill type 2 = Special Trait («特別覚醒能力», trait dello Spirit Training, I-082): le 36
//   righe della tabella «Special Traits» della khwiki (pagina Medal, D:\Progetto_Restauro_KH_UX\
//   wiki\wiki_all.json; reference\pet\NOTE.md §10) con la «Unlock Rate» in centesimi di punto in
//   rate (somma 10000). Il client: FUN_00eb577c mette in medaglia +0x148 l'indice del primo trait
//   la cui riga ha type (+8) 2 (e +0x144 = 1): e' il trait che mostrano il risultato del
//   training (FUN_0091d384 / FUN_00919390, Kakusei_Get1/2 e SpecialKakuseiSkill_Window) e la
//   finestra Special Trait del dettaglio; FUN_00c97568 fa la «roulette» di Kakusei_Get1 con le
//   righe dello stesso type e rate (+0xc4) diverso da 0 (lista vuota = std::out_of_range).
//   name e' un formato printf (FUN_00c97298/FUN_00919390: sprintf(name, FUN_0073de5c(riga))):
//   «%» raddoppiato. category = icona img/kakusei/Kakusei_Icon%04d.png e LWF
//   lwf/medal/Kakusei/Kakusei_Icon%04d (make_kakusei_lwf.py), come i trait del Moogle Shop.
//   Id 1001-1036 (1-13 Moogle Shop, 901/902 Burst). make-moogleshop.js riscrive shuffleskill.json:
//   rilanciare poi questo script (patch() le rimette, idempotente).
//
// Si applica da sola (idempotente) a server/master_data e scrive anche server/tables/petRank.json e
// petSkill.json (make-game-tables.js copia server/tables e chiama patch() in fondo, cosi' l'addPetPt
// sopravvive alla rigenerazione di medal.json). Dopo: alzare KHUX_REVISION.
//
//   node server/make-pet-tables.js [cartella master]
'use strict';

const fs = require('fs');
const path = require('path');

// [skillId, nome, descrizione, rango, invokeType, valori]
const SKILLS = [
  [1, 'Steal I', 'Increases item drops x2.', 2, 1, [2]],
  [2, 'Steal II', 'Increases item drops x3.', 6, 1, [3]],
  [3, 'Steal III', 'Increases item drops x4.', 10, 1, [4]],
  [11, 'Blast I', 'Deals 10,000 fixed damage.', 3, 1, [10000]],
  [12, 'Blast II', 'Deals 50,000 fixed damage.', 8, 1, [50000]],
  [13, 'Blast III', 'Deals 150,000 fixed damage.', 12, 1, [150000]],
  [14, 'Blast IV', 'Deals 400,000 fixed damage.', 14, 1, [400000]],
  [15, 'Blast V', 'Deals 750,000 fixed damage.', 16, 1, [750000]],
  [21, 'Esuna I', 'Cures status ailments.', 4, 1, []],
  [31, 'HP Recovery I', 'Revives with 1 HP once.', 5, 1, [1]],
  [41, 'Poison Boost I', 'Boosts Poison.', 7, 1, []],
  [42, 'Paralysis Boost I', 'Boosts Paralysis.', 7, 1, []],
  [43, 'Sleep Boost I', 'Boosts Sleep.', 7, 1, []],
  [51, 'Power Attack Boost I', 'Raises Power STR for a turn.', 9, 1, []],
  [52, 'Speed Attack Boost I', 'Raises Speed STR for a turn.', 9, 1, []],
  [53, 'Magic Attack Boost I', 'Raises Magic STR for a turn.', 9, 1, []],
  [54, 'Power Attack Boost II', 'Raises Power STR for a turn.', 13, 1, []],
  [55, 'Speed Attack Boost II', 'Raises Speed STR for a turn.', 13, 1, []],
  [56, 'Magic Attack Boost II', 'Raises Magic STR for a turn.', 13, 1, []],
  [61, 'Combo I', '25% chance: extra hit at 40% ATK.', 11, 1, [40, 25]],
  [62, 'Combo II', '33% chance: extra hit at 40% ATK.', 15, 1, [40, 33]],
  [63, 'Combo III', '50% chance: extra hit at 40% ATK.', 17, 1, [40, 50]],
];
// linea del trick = nome senza il numero romano (il livello piu' alto aperto sostituisce gli altri)
const lineOf = (name) => name.replace(/ [IV]+$/, '');

const NEED_PT = [0, 50, 100, 150, 200, 300, 400, 500, 650, 800, 1000, 1100, 1300, 1500, 1750, 2000, 2300];
const MAX_RANK = NEED_PT.length; // 17
const magnification = (rank) => 22000 + 1000 * rank;

function openSkillsAt(rank) {
  const best = new Map();
  for (const [id, name, , r] of SKILLS) {
    if (r > rank) continue;
    const line = lineOf(name);
    const cur = best.get(line);
    if (!cur || cur[1] < r) best.set(line, [id, r]);
  }
  return [...best.values()].map(([id]) => id).sort((a, b) => a - b).slice(0, 15);
}

function petRankRows() {
  return NEED_PT.map((needPt, i) => {
    const rank = i + 1;
    const opened = SKILLS.filter((s) => s[3] === rank).map((s) => s[0]);
    const open = openSkillsAt(rank);
    return { rank, needPt, magnification: magnification(rank), rankUpSkill: opened[0] || 0,
      validOpenSkill: open.length ? 1 : 0, openSkillIds: open };
  });
}

function petSkillRows() {
  return SKILLS.map(([skillId, name, description, rank, invokeType, v]) => ({
    skillId, thumbId: 1, name, description, invokeDescription: `Rank ${rank}`, invokeType,
    skillValue1: v[0] || 0, skillValue2: v[1] || 0, skillValue3: v[2] || 0, skillValue4: v[3] || 0, skillValue5: v[4] || 0,
  }));
}

// Special Traits (khwiki, pagina Medal, «Special Traits»): [nome, icona, campi del valore, % «Unlock Rate»]
const SPECIAL_TRAITS = [
  ['Extra Attack: 120% Power', 80, { addDamage: 120 }, 0.2],
  ['Damage in Raids +100%', 70, { raidKindRate: 100 }, 0.8],
  ['Damage in Raids +30%', 70, { raidKindRate: 30 }, 2.4],
  ['Damage in Raids +20%', 70, { raidKindRate: 20 }, 3.5],
  ['Damage in Raids +10%', 70, { raidKindRate: 10 }, 3.5],
  ['STR +2000', 90, { attack: 2000 }, 1.4],
  ['STR +500', 90, { attack: 500 }, 2.0],
  ['STR +400', 90, { attack: 400 }, 3.5],
  ['STR +200', 90, { attack: 200 }, 3.5],
  ['STR +100', 90, { attack: 100 }, 3.5],
  ['STR +50', 90, { attack: 50 }, 3.5],
  ['DEF +1000', 100, { defense: 1000 }, 2.0],
  ['DEF +800', 100, { defense: 800 }, 3.5],
  ['DEF +600', 100, { defense: 600 }, 3.5],
  ['DEF +400', 100, { defense: 400 }, 3.5],
  ['DEF +200', 100, { defense: 200 }, 3.5],
  ['Ground Enemy DEF -20%', 60, { enemyKind: 1, enemyKindRate: 20 }, 1.4],
  ['Aerial Enemy DEF -20%', 61, { enemyKind: 2, enemyKindRate: 20 }, 1.4],
  ['Max Gauges +3', 10, { ability: 3 }, 3.5],
  ['Max Gauges +2', 10, { ability: 2 }, 3.5],
  ['Max Gauges +1', 10, { ability: 1 }, 3.5],
  ['Max HP +1000', 20, { hp: 1000 }, 3.5],
  ['Max HP +900', 20, { hp: 900 }, 3.5],
  ['Max HP +800', 20, { hp: 800 }, 3.5],
  ['Max HP +700', 20, { hp: 700 }, 3.5],
  ['Max HP +600', 20, { hp: 600 }, 3.5],
  ['Max HP +500', 20, { hp: 500 }, 3.5],
  ['Poison Resist 100%', 30, { poison: 100 }, 1.0],
  ['Poison Resist 20%', 30, { poison: 20 }, 2.8],
  ['Poison Resist 10%', 30, { poison: 10 }, 3.5],
  ['Sleep Resist 100%', 50, { sleep: 100 }, 1.0],
  ['Sleep Resist 20%', 50, { sleep: 20 }, 2.8],
  ['Sleep Resist 10%', 50, { sleep: 10 }, 3.5],
  ['Paralysis Resist 100%', 40, { paralyze: 100 }, 1.0],
  ['Paralysis Resist 20%', 40, { paralyze: 20 }, 2.8],
  ['Paralysis Resist 10%', 40, { paralyze: 10 }, 3.5],
];
const SPECIAL_TYPE = 2;
const SPECIAL_FIRST_ID = 1001;
const SHUFFLE_FIELDS = ['shuffleSkillId', 'category', 'type', 'name', 'sortId', 'duplicate', 'ability', 'hp',
  'poison', 'paralyze', 'sleep', 'enemyKind', 'enemyKindRate', 'raidKindRate', 'addDamage', 'attack', 'defense',
  'rate', 'campaignRate'];

function specialTraitRows() {
  return SPECIAL_TRAITS.map(([name, category, fields, pct], i) => {
    const row = {};
    for (const f of SHUFFLE_FIELDS) row[f] = 0;
    return Object.assign(row, {
      shuffleSkillId: SPECIAL_FIRST_ID + i, category, type: SPECIAL_TYPE, name: name.replace(/%/g, '%%'),
      sortId: SPECIAL_FIRST_ID + i, rate: Math.round(pct * 100),
    }, fields);
  });
}

// punti pet per rarita' (1-7 stelle) piu' 25 per livello di tier
const RARE_PT = [0, 10, 15, 20, 40, 60, 120, 200];
function addPetPtFor(m) {
  return (RARE_PT[m.rare] || 10) + 25 * Math.max(0, m.guiltValue || 0);
}

function patch(dir) {
  const out = [];
  const write = (n, rows) => fs.writeFileSync(path.join(dir, n + '.json'), JSON.stringify(rows));
  write('petRank', petRankRows());
  write('petSkill', petSkillRows());
  out.push(`petRank ${MAX_RANK}`, `petSkill ${SKILLS.length}`);
  // misc 137 = rango massimo del pet: il dialog SPIRIT ricalcola il rango dai punti delle medaglie
  // fermandosi li' (FUN_0091ce90, punti da FUN_0091cd4c). Nel master 5.0.1 vale 15: con 17 ranghi
  // il client mostrava Rank 15 x3.700 mentre il server (e la cella del 6° slot) usava 17 x3.9
  const miscFile = path.join(dir, 'misc.json');
  if (fs.existsSync(miscFile)) {
    const misc = JSON.parse(fs.readFileSync(miscFile, 'utf8'));
    const row = misc.find((r) => r.miscId === 137);
    if (row && row.value !== MAX_RANK) { row.value = MAX_RANK; write('misc', misc); out.push(`misc 137 = ${MAX_RANK}`); }
    else if (!row) { misc.push({ miscId: 137, value: MAX_RANK }); write('misc', misc); out.push(`misc 137 = ${MAX_RANK}`); }
  }
  // Special Trait (type 2): sostituisce le righe 1001-1036 con quelle di SPECIAL_TRAITS
  const shuffleFile = path.join(dir, 'shuffleskill.json');
  if (fs.existsSync(shuffleFile)) {
    const rows = JSON.parse(fs.readFileSync(shuffleFile, 'utf8'));
    const special = specialTraitRows();
    const ids = new Set(special.map((r) => r.shuffleSkillId));
    const kept = rows.filter((r) => !ids.has(r.shuffleSkillId));
    // anche l'acquisto di un trait nel Moogle Shop (SceneMoogleShop::openKakuseiResultPopup,
    // FUN_00caccbc / FUN_00caf20c) gioca Kakusei_Get1 con la roulette FUN_00c97568 sulle righe
    // type 1: con rate 0 ovunque la lista e' vuota e il primo «dispString» del nostro LWF
    // (make_kakusei_lwf.py) farebbe std::out_of_range. rate 100 ai trait normali (non ai Burst
    // 901/902), usato solo come «candidato della roulette».
    let rated = 0;
    for (const r of kept) if (r.type === 1 && r.shuffleSkillId < 900 && !r.rate) { r.rate = 100; rated++; }
    if (rated) out.push(`shuffleskill type 1 rate ${rated}`);
    const before = JSON.stringify(rows.filter((r) => ids.has(r.shuffleSkillId)));
    if (rated || before !== JSON.stringify(special)) {
      write('shuffleskill', [...kept, ...special].sort((a, b) => a.shuffleSkillId - b.shuffleSkillId));
      out.push(`shuffleskill type 2 ${special.length}`);
    }
  }
  const medalFile = path.join(dir, 'medal.json');
  if (fs.existsSync(medalFile)) {
    const medals = JSON.parse(fs.readFileSync(medalFile, 'utf8'));
    let n = 0;
    for (const m of medals) {
      if (m.medalId <= 2) continue; // 1 = slot vuoto, 2 = Burst (make-guilt-burst.js)
      const pt = addPetPtFor(m);
      if (m.addPetPt !== pt) { m.addPetPt = pt; n++; }
    }
    if (n) { write('medal', medals); out.push(`medal.addPetPt ${n}`); }
  }
  return out;
}

if (require.main === module) {
  const tables = path.join(__dirname, 'tables');
  fs.mkdirSync(tables, { recursive: true });
  fs.writeFileSync(path.join(tables, 'petRank.json'), JSON.stringify(petRankRows(), null, 1));
  fs.writeFileSync(path.join(tables, 'petSkill.json'), JSON.stringify(petSkillRows(), null, 1));
  const dir = process.argv[2] || process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data');
  const done = patch(dir);
  console.log(`pet: ${done.join(', ')} (alzare KHUX_REVISION)`);
}

module.exports = { patch, petRankRows, petSkillRows, addPetPtFor, MAX_RANK, specialTraitRows, SPECIAL_TYPE };
