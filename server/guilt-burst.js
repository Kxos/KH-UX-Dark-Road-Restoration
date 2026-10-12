// Burst (JP ギルトバースト, nel codice GuiltBurst): pulsante rosso in battaglia, una volta per
// missione, attacco a tutti i nemici con potenza dal livello Burst. Note in
// docs/notes/battaglia.md#burst.
//
// Il client crea il pulsante (FUN_00b0fbd0 -> FUN_00aee878) solo se:
// - userData.userDetail.isGuilt != 0 (FUN_00b12e84: riga userDetail +0x44, singleton +0x128);
// - userData.userPoint.guiltBurstLv != 0 (FUN_00b10044: riga userPoint +100, singleton +0x118);
// - la battaglia non e' PvP (CarouselDeck +0x300).
// Poi FUN_00b1019c costruisce l'attacco dalla riga medal 2 (STR +0x4e0, DEF +0x4ec) con potenza
// guiltBurstLv / 100 x battleMisc 134 / 10000 x 10000 (= Lv x 400 con battleMisc 134 = 40000), e
// FUN_00b10790 legge le righe shuffleskill 901 e 902 (enemyKind/enemyKindRate) SENZA controllo
// del null: senza quelle righe il client va in crash all'avvio della battaglia. Righe: vedi
// make-guilt-burst.js.
//
// Livello (khux-guides.tumblr.com/post/152649620061): +1 alla prima guilt di ogni medaglia,
// +5 alla prima guilt massima; i valori stanno nella riga medal (addGuiltBurstLv,
// addGuiltBurstLvMax, +0x4c4/+0x4c8: nelle nostre tabelle 0, si usano 1 e 5). La guilt di una
// copia e' userMedal.guiltFactor (Level Up, server/medal-guilt.js, docs/notes/guilt.md):
// - prima guilt = la prima volta che una copia di una medaglia (medalId) con guiltValue > 0 ha
//   guiltFactor > 0;
// - guilt massima = la prima volta che una copia arriva al massimo del suo tier (guiltProb).
// Il conto e' un registro che non scende (player.guiltBurst = {first: [medalId], max: [medalId]}):
// vendere o fondere la medaglia non toglie il livello, come nell'originale. I medalId registrati
// con le regole di prima (possesso, livello massimo) restano: il livello non scende.
//
// guiltBurstFirstUserMedalIds / guiltBurstMaxUserMedalIds (FUN_007a5dec: /stage/clear, draw,
// moogle shop, raid reward) = le copie che hanno appena dato la prima guilt / guilt massima: il
// client mostra il popup lwf/medal/guilt_bonus/GuiltBonus_BurstLvup(_num), ASSENTE dalle
// risorse (LWF nullo = crash). Si mandano solo con KHUX_GUILT_BURST_POPUP=1, quando i LWF ci
// saranno; altrimenti [] (il livello sale lo stesso, letto da userPoint).
// KHUX_GUILT_BURST_LV=<n>: livello fisso per le prove sul banco.
'use strict';

const { guiltRange } = require('./medal-guilt');

const FIRST_DEFAULT = 1;
const MAX_DEFAULT = 5;

function makeGuiltBurst({ getPlayer, userMedalList, masterRows }) {
  // copie che hanno appena dato un aumento, in attesa della prossima risposta con le liste
  const pending = { first: [], max: [] };

  function refresh() {
    const player = getPlayer();
    const rows = new Map(masterRows('medal').map((r) => [r.medalId, r]));
    const seed = !player.guiltBurst;   // primo giro su un salvataggio esistente: niente popup
    const rec = player.guiltBurst || (player.guiltBurst = { first: [], max: [] });
    const first = new Set(rec.first), max = new Set(rec.max);
    const guiltProb = masterRows('guiltProb');
    for (const m of userMedalList()) {
      const row = rows.get(m.medalId);
      if (!row || !(row.guiltValue > 0) || !(m.guiltFactor > 0)) continue;
      if (!first.has(m.medalId)) {
        first.add(m.medalId);
        rec.first.push(m.medalId);
        if (!seed) pending.first.push(m.userMedalId);
      }
      const top = guiltRange(guiltProb, row.guiltValue).max;
      if (top > 0 && m.guiltFactor >= top && !max.has(m.medalId)) {
        max.add(m.medalId);
        rec.max.push(m.medalId);
        if (!seed) pending.max.push(m.userMedalId);
      }
    }
    return { rec, rows };
  }

  function level() {
    const fixed = process.env.KHUX_GUILT_BURST_LV;
    if (fixed !== undefined && fixed !== '') return Math.max(0, Number(fixed) || 0);
    const { rec, rows } = refresh();
    let lv = 0;
    for (const id of rec.first) lv += rows.get(id)?.addGuiltBurstLv || FIRST_DEFAULT;
    for (const id of rec.max) lv += rows.get(id)?.addGuiltBurstLvMax || MAX_DEFAULT;
    return lv;
  }

  // campi per le risposte di FUN_007a5dec
  function lists() {
    refresh();
    const out = { guiltBurstFirstUserMedalIds: [], guiltBurstMaxUserMedalIds: [] };
    if (process.env.KHUX_GUILT_BURST_POPUP === '1') {
      out.guiltBurstFirstUserMedalIds = pending.first.slice();
      out.guiltBurstMaxUserMedalIds = pending.max.slice();
    }
    pending.first.length = 0;
    pending.max.length = 0;
    return out;
  }

  // guiltBurstFirstLv/MaxLv della risposta del Level Up (ramo 55): livelli appena dati. Con il
  // popup spento 0 (le copie in attesa si scartano alla prossima lists()).
  function gained() {
    const { rows } = refresh();
    const out = { first: 0, max: 0 };
    if (process.env.KHUX_GUILT_BURST_POPUP !== '1') return out;
    const medalOf = new Map(userMedalList().map((m) => [m.userMedalId, m.medalId]));
    for (const id of pending.first) out.first += rows.get(medalOf.get(id))?.addGuiltBurstLv || FIRST_DEFAULT;
    for (const id of pending.max) out.max += rows.get(medalOf.get(id))?.addGuiltBurstLvMax || MAX_DEFAULT;
    pending.first.length = 0;
    pending.max.length = 0;
    return out;
  }

  return { level, isGuilt: () => (level() > 0 ? 1 : 0), lists, gained };
}

module.exports = { makeGuiltBurst };
