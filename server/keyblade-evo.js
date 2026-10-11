// Potenziamento ed evoluzione dei keyblade, sub-slot. Note in docs/notes/server.md#keyblade.
//
// Livello del keyblade = la riga della tabella master keyblade: ogni livello ha il suo
// keybladeId (serie*1000 + livello*10, oltre +20 serie*1000 + 200 + livello-20) e la riga dice
// i materiali per passare al livello dopo (validNeedMaterial, needMaterialId/Num) e il keybladeId
// del livello dopo (evolveId, 0 = massimo). La 5.0.1 ha tenuto solo i livelli col cambio di slot
// o di design: le righe in mezzo le rigenera make-keyblade-levels.js.
//
// POST /keyblade/enhance (azione 54, corpo FUN_007e38ac: {userKeybladeId}), dal pulsante
// «Strengthen» della finestra KEYBLADE (FUN_00c19c04 / FUN_00c19f5c). Ramo 54 del dispatcher:
// userKeyblades (FUN_0078cca8), userDecks (FUN_00792bf4), userMaterials (FUN_007a25e8),
// userTitles (FUN_007a2ed0). Niente munny (nessun userPoint nella risposta). Dopo la risposta
// FUN_00c1abd0 confronta il displayId (riga keyblade +0xcc) del keyblade di prima e di quello
// nuovo: uguali -> risultato (FUN_00c05ef0, DeckEdit_KBStrength_Result_ver210 +
// lwf/result/KeyEvo_LevelUp); diversi -> animazione lwf/memudemo/KeyBlade_Evolution (FUN_00c0eebc,
// movie «keyblade_previous» e «keyblade») e poi il risultato. Il risultato confronta slot per
// slot accord/dlaccord vecchi e nuovi (frecce) e per uno slot nuovo carica
// lwf/keyblade/KeyEvo/KeyEvo_Medal_01B, KeyEvo_eff e medal_blank_slot%d.
//
// GET /keyblade/subslot (191) e POST /keyblade/subslot (192, corpo FUN_00804a94:
// {updateKeybladeSubslots: [{keybladeSubslotId, subslotMedals: {"<slotNumber>": userMedalId}}]}).
// Risposta 192: subslotMaxNum + userKeybladeSubslots (FUN_00798a64), userKeyblades.
// Equipment (FUN_00c16d14) scrive «Subslot n/m»: m = lunghezza di subslots[] del keyblade,
// n = voci con userMedalId != 0; il pulsante si abilita se misc 780 (= 7, stelle minime) >= 7.
'use strict';

// Bonus dei sub-slot per tier della medaglia (guiltValue), in millesimi di moltiplicatore:
// guida dell'utente (pag. 11) tier 1-8 = +0.001 .. +0.025; 9-10 non documentati (stima).
const TIER_SUBSLOT = [0, 1, 2, 5, 8, 12, 16, 20, 25, 30, 35];
// unita' di subslotRate: millesimi * SUBSLOT_SCALE. Txt_SubSlot_Rate (FUN_00c27228) scrive
// «+%01.3f» con (k * subslotRate / 100) / 1000: con k = subslotRate della riga keyblade / 100
// (160 per Treasure Trove) una tier 8 da' +0.040 = 0.025 x 1.6. k non e' ancora verificato:
// se il numero sul banco e' 100 volte troppo grande o piccolo, cambiare KHUX_SUBSLOT_SCALE.
const SUBSLOT_SCALE = Number(process.env.KHUX_SUBSLOT_SCALE || 1);

function routeKeybladeEvo(p) {
  if (p === '/keyblade/enhance') return 'kbenhance';
  return null;
}

// ctx: { ret, send, serverTime, masterRows, player, savePlayer, ownedKeyblades, userMedalList,
//        userKeybladesData, userDecksData, userMaterialsData, userTitlesData, USER_KEYBLADE_ID }
function makeKeybladeEvo(ctx) {
  const { player } = ctx;
  const rowOf = (id) => ctx.masterRows('keyblade').find((r) => r.keybladeId === id);

  // keybladeId attuale di Starlight (userKeybladeId 1): player.starlightKeybladeId, se potenziato
  function starlightKeybladeId(defaultId) {
    return player.starlightKeybladeId || defaultId;
  }

  function setKeybladeId(userKeybladeId, keybladeId) {
    if (userKeybladeId === ctx.USER_KEYBLADE_ID) player.starlightKeybladeId = keybladeId;
    else {
      const k = (player.keyblades || []).find((x) => x.userKeybladeId === userKeybladeId);
      if (k) k.keybladeId = keybladeId;
    }
  }

  function needMaterials(row) {
    const n = Math.min(row.validNeedMaterial || 0, (row.needMaterialId || []).length);
    const out = [];
    for (let i = 0; i < n; i++) {
      if (row.needMaterialId[i] > 0 && row.needMaterialNum[i] > 0) out.push([row.needMaterialId[i], row.needMaterialNum[i]]);
    }
    return out;
  }

  // POST /keyblade/enhance {userKeybladeId}: un livello. KHUX_KB_FREE=1 = senza materiali (prove).
  function respondEnhance(res, body) {
    const id = Number(body?.userKeybladeId);
    const k = ctx.ownedKeyblades().find((x) => x.userKeybladeId === id);
    const row = k && rowOf(k.keybladeId);
    const next = row && row.evolveId && rowOf(row.evolveId);
    const free = process.env.KHUX_KB_FREE === '1';
    player.materials = player.materials || {};
    const need = row ? needMaterials(row) : [];
    const missing = need.filter(([m, n]) => (player.materials[m] || 0) < n);
    if (!next) {
      console.log(`  [keyblade] enhance ${id}: ${row ? `${row.name} al massimo` : 'keyblade sconosciuto'}`);
    } else if (missing.length && !free) {
      console.log(`  [keyblade] enhance ${row.name}: materiali mancanti ${missing.map(([m, n]) => `${m}x${n}(${player.materials[m] || 0})`).join(' ')}`);
    } else {
      if (!free) for (const [m, n] of need) player.materials[m] -= n;
      setKeybladeId(id, next.keybladeId);
      player.keybladeEnhanceCount = (player.keybladeEnhanceCount || 0) + 1;
      // gauge degli attacchi speciali: non oltre il massimo della riga nuova
      const kk = (player.keyblades || []).find((x) => x.userKeybladeId === id);
      if (kk && kk.burst > next.maxBurstGauge) kk.burst = next.maxBurstGauge;
      if (id === ctx.USER_KEYBLADE_ID && player.keybladeBurst > next.maxBurstGauge) player.keybladeBurst = next.maxBurstGauge;
      ctx.savePlayer();
      console.log(`  [keyblade] enhance ${row.name} (${row.keybladeId}) -> ${next.name} (${next.keybladeId})`
        + `${next.displayId !== row.displayId ? ', evoluzione (design ' + next.displayId + ')' : ''}`
        + `${(next.validConsist || 0) > (row.validConsist || 0) ? ', slot ' + next.validConsist : ''}`
        + `${free ? ' [KHUX_KB_FREE]' : ', materiali ' + need.map(([m, n]) => `${m}x${n}`).join(' ')}`);
    }
    ctx.send(res, 200, {
      ret: ctx.ret(),
      userKeyblades: ctx.userKeybladesData(),
      userDecks: ctx.userDecksData(),
      userMaterials: ctx.userMaterialsData(),
      // solo i titoli guadagnati ORA (il client mostra «You earned a title!» per ognuno: con
      // l'elenco completo comparivano tutti, banco 11-10), come /stage/clear
      userTitles: [],
    });
  }

  // ---- sub-slot ---------------------------------------------------------------------------
  // Righe keybladeSubslot della serie: {subslotId, category, slotNumber, attribute, darklight}
  // (+ campo in piu' «lv»: livello del keyblade che apre lo slot, ignorato dal client).
  function subslotRows(keybladeId) {
    const row = rowOf(keybladeId);
    if (!row) return [];
    const max = subslotMaxNum();
    return ctx.masterRows('keybladeSubslot')
      .filter((r) => r.category === row.category && r.slotNumber <= max && (r.lv ?? 0) <= (row.lv || 0))
      .sort((a, b) => a.slotNumber - b.slotNumber);
  }

  // 120 nell'originale (schermata giapponese «サブスロット 0/120»); KHUX_SUBSLOT_MAX=0 li spegne
  // (Equipment torna a «Subslot 0/0»)
  function subslotMaxNum() {
    const n = ctx.masterRows('keybladeSubslot').reduce((m, r) => Math.max(m, r.slotNumber || 0), 0);
    return process.env.KHUX_SUBSLOT_MAX != null ? Number(process.env.KHUX_SUBSLOT_MAX) : n;
  }

  // medaglie nei sub-slot: player.keybladeSubslots[userKeybladeId] = {slotNumber: userMedalId}
  function subslotMedals(k) {
    const saved = (player.keybladeSubslots || {})[k.userKeybladeId] || {};
    const owned = new Set(ctx.userMedalList().map((m) => m.userMedalId));
    return subslotRows(k.keybladeId).map((r) => {
      const id = Number(saved[r.slotNumber]) || 0;
      return { slotNumber: r.slotNumber, userMedalId: owned.has(id) ? id : 0 };
    });
  }

  // somma dei bonus per tier (guiltValue della riga medal) delle medaglie nei sub-slot
  function subslotRate(k) {
    const medals = ctx.masterRows('medal');
    const byUser = new Map(ctx.userMedalList().map((m) => [m.userMedalId, m]));
    let sum = 0;
    for (const s of subslotMedals(k)) {
      if (!s.userMedalId) continue;
      const row = medals.find((r) => r.medalId === byUser.get(s.userMedalId)?.medalId);
      sum += TIER_SUBSLOT[row?.guiltValue || 0] || 0;
    }
    return sum * SUBSLOT_SCALE;
  }

  function userKeybladeSubslotsData() {
    return ctx.ownedKeyblades().map((k) => ({
      keybladeSubslotId: k.userKeybladeId, // = userKeybladeSubslotId del keyblade
      subslotRate: subslotRate(k), // uint
      subslots: subslotMedals(k), // {slotNumber, userMedalId uint64}, 0 = vuoto
    }));
  }

  // subslotRate di userKeyblades[]: il moltiplicatore dei sub-slot della riga keyblade
  function keybladeSubslotRate(keybladeId) {
    return rowOf(keybladeId)?.subslotRate ?? 10000;
  }

  // GET (191) / POST (192) /keyblade/subslot
  function respondSubslot(res, method, body) {
    if (method === 'POST') {
      const owned = new Map(ctx.ownedKeyblades().map((k) => [k.userKeybladeId, k]));
      player.keybladeSubslots = player.keybladeSubslots || {};
      for (const u of body?.updateKeybladeSubslots || []) {
        const id = Number(u.keybladeSubslotId);
        const k = owned.get(id);
        if (!k) continue;
        const valid = new Set(subslotRows(k.keybladeId).map((r) => r.slotNumber));
        const cur = { ...(player.keybladeSubslots[id] || {}) };
        for (const [slot, medal] of Object.entries(u.subslotMedals || {})) {
          if (valid.has(Number(slot))) cur[Number(slot)] = Number(medal) || 0;
        }
        // una medaglia sta in un solo sub-slot di questo keyblade: l'ultima scritta vince
        player.keybladeSubslots[id] = cur;
        console.log(`  [keyblade] subslot ${id}: ${JSON.stringify(cur)}`);
      }
      ctx.savePlayer();
      return ctx.send(res, 200, {
        ret: ctx.ret(), subslotMaxNum: subslotMaxNum(), userKeybladeSubslots: userKeybladeSubslotsData(),
        userKeyblades: ctx.userKeybladesData(),
      });
    }
    return ctx.send(res, 200, { ret: ctx.ret(), subslotMaxNum: subslotMaxNum(), userKeybladeSubslots: userKeybladeSubslotsData() });
  }

  // medaglia tolta (venduta, usata come materiale, Unequip): via anche dai sub-slot
  function removeMedal(userMedalId) {
    for (const s of Object.values(player.keybladeSubslots || {})) {
      for (const n of Object.keys(s)) if (Number(s[n]) === userMedalId) s[n] = 0;
    }
  }

  return {
    respondEnhance, respondSubslot, userKeybladeSubslotsData, subslotMaxNum, keybladeSubslotRate,
    starlightKeybladeId, removeMedal,
  };
}

module.exports = { makeKeybladeEvo, routeKeybladeEvo, TIER_SUBSLOT };
