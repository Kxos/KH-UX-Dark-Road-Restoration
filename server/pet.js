// Pet («Spirit»): 6° slot del deck (petBaseSlotMedal), Gear del pet (petSubslot), profilo e
// coordinato. Note in docs/notes/home_profilo.md#pet; tabelle in make-pet-tables.js.
//
// Si accende con KHUX_PET=1 (default spento: userDetail.isPet 0 e nessuna rotta, come prima).
// Il client accende tutto da userData.userDetail.isPet (FUN_0078babc, byte +0x45 della riga
// userDetail, singleton +0x128 / scena +0x440):
// - catena di avvio (FUN_007c2adc, dopo GET /user/option = azione 149): con isPet chiede
//   GET /pet/profile (170, FUN_007db83c senza userId), poi GET /pet/coordinate/parts (171) e
//   GET /pet/coordinate/all (172), e solo dopo prosegue (FUN_007dbb58);
// - Equipment / scelta del deck (FUN_00c0b5ec, DeckRevolverView FUN_008e8ab4): carica
//   DeckEdit_PetMedal_ver230 (cornice a testa di gatto DeckEdit_Pet1, pulsante Button_PowerUp
//   «スピリット強化» = Spirit Strengthen -> PetInfoDialog) in Area_PetMedal/Area_RevolverPet, e
//   legge SENZA controllo del null pet(+0x7c0)->petSubslot(+0x38)->magnification(+0x74):
//   FUN_008c47b4 la somma al partnerRate del keyblade (riga +0x50) per la cella del 6° slot
//   (FUN_008d02d8 -> FUN_008c8904, campo +0x498). Il revolver crea 6 celle «Medal1..6»
//   (FUN_008d1314): la sesta e' lo slot del pet.
// Quindi il pet della sessione (+0x7c0) DEVE esistere prima di Equipment: lo crea solo
// l'azione 170, il cui parser (FUN_0079371c) pretende tutto:
//   pet.petSubslot (FUN_007948d0 modo 0 -> FUN_007949f0: subslotUserMedalIds uint64 <= 6,
//   openSkillIds uint <= 15, rank, pt, magnification uint), pet.userPetCoordinate (FUN_00793418,
//   12 int), pet.petName (stringa, 32), pet.userSkills (FUN_0078e934) e pet.userMedals
//   (FUN_0078da18) sul nodo pet, pet.initCoordinate (byte +0x68: 0 = la scena PetEdit,
//   FUN_00e01c44, carica Tutorial_Pet01.json, assente -> crash; si manda 1), poi sulla radice
//   (FUN_00793630) recoverDatetime (data), recoverStoneNum, expeditionTotalNum,
//   expeditionMonthlyNum (uint). Se il parser fallisce il pet resta nullo.
// Il crash 0x7c8d40 di I-005: il ramo 237 (POST /user/medal/remove) copia petSubslots[0] in
// pet(+0x7c0)+0x38 senza controllare il pet; lo stesso fanno 175 (POST /pet/subslot, 0x7c66dc) e
// 174 (POST /pet/name, 0x7cd630). I rami 55/56 (Level Up / Evolve) invece controllano (0x7ce17c,
// 0x7ceeac). Con KHUX_PET=1 il pet esiste dall'avvio, quindi petSubslots puo' avere l'elemento.
//
// Il 6° slot (petBaseSlotMedal): elemento di userDecks (FUN_00792a8c: 5 deckMedals a +0x18,
// petBaseSlotMedal uint64 a +0x40, obbligatorio) e corpo di POST /user/keyblade/update/170516
// (FUN_007e1320: userDecks[].petBaseSlotMedal). Qui player.petBaseSlots[userKeybladeId].
//
// In battaglia (solo da isPet, nessun campo del server lo spegne: FUN_00b6cba4/FUN_00b7f890 ->
// FUN_00e26540) il PetActor aspetta la fine dei LWF lwf/pet/motion/* (evento «end»): li genera
// recon/tools/make_pet_motions.py (da make_layouts.py). Con i LWF vuoti la battaglia si bloccava
// dopo il primo attacco (I-005). I trick restano spenti: SKILLS_ENABLED qui sotto.
// La medaglia di petBaseSlotMedal non chiede altro al server: il client la mette dopo quelle del
// deck (FUN_00b0b398 -> FUN_00b0ba14, x pet.petSubslot.magnification) e al suo turno attacca il
// pet; il colpo parte dagli eventi «knockback_2»/«effectStart_1» di battle_normal/all/skill e
// dagli effetti lwf/ability/hit_effect/pet_eff_000N, generati anch'essi da make_pet_motions.py.
//
// Il dialog del pet (PetInfoDialog, PetInfoScene_ver320.json) e le sue sotto-schermate mancano da
// ogni risorsa (catalog\missing_layouts.txt): Button_PowerUp e l'icona pet della home lo aprono
// -> crash in GUIReader finche' non ci sono (ISSUES I-005).
'use strict';

const ENABLED = process.env.KHUX_PET === '1';
const PET_NAME = process.env.KHUX_PET_NAME || 'Spirit';
// Tricks in battaglia (petSubslot.openSkillIds), spenti salvo KHUX_PET_SKILLS=1. A inizio
// battaglia FUN_00e2790c -> FUN_00e461bc mette ogni id aperto (riga petSkill, FUN_00f146f4) in
// uno dei 16 posti del PetActor (+0x388 + 0x48*i) scelto da invokeType (riga +0x2dc; 4 = per
// skillValue3 0..5 -> posti 0/11..15, tabella 0x188a950). Posti visti: 1 = alla morte di un
// nemico (FUN_00e26764, recovery_skill), 3 = Blast (FUN_00e47914/FUN_00e47b2c: battle_skill al
// posto del colpo dell'avatar), 6 = HP Recovery (FUN_00e47720), 7-9 = potenziamenti di stato
// (FUN_00e46e7c), 10 = Combo (FUN_00e47d7c: probabilita' skillValue2/10000 -> rolling1-3),
// 11-15 = Steal per tipo di drop (FUN_00e46a64). La nostra petSkill (make-pet-tables.js) ha
// invokeType 1 per tutti e valori stimati: finche' la corrispondenza trick -> posto non e'
// verificata, il pet in battaglia segue solo l'avatar (niente trick).
const SKILLS_ENABLED = process.env.KHUX_PET_SKILLS === '1';
// Parti della serie 001 per il pet visibile (default). KHUX_PET_PARTS=0 = ripiego: id 0, pet
// invisibile come prima (i movimenti mandano comunque gli eventi e i pet_eff restano visibili).
const DEFAULT_PART = process.env.KHUX_PET_PARTS === '0' ? 0 : 1;
// Spirit Training (I-082). Valori NOSTRI: nessun dump delle risposte originali.
// - attesa tra due allenamenti (khwiki: un trait ogni 20 ore), in ore
const TRAIN_HOURS = Number(process.env.KHUX_PET_TRAIN_HOURS || 20);
// - slot aperti oltre al primo (sempre aperto, FUN_00aa9db4): 2-4 si sbloccavano con acquisti
//   (Weekly Jewels, 10 draw, Jewel Box E) che il nostro server non vende; 1 = solo il primo
const TRAIN_SLOTS = Math.min(4, Math.max(1, Number(process.env.KHUX_PET_TRAIN_SLOTS || 1)));
// - jewel chiesti da «Train Now» per riavviare subito (recoverStoneNum, testo 106200405); non
//   vengono scalati
const TRAIN_STONES = Number(process.env.KHUX_PET_TRAIN_STONES || 0);

function routePet(p) {
  if (!ENABLED) return null; // spento: risposte generiche dagli schemi, come prima
  if (p === '/pet/profile') return 'petprofile';
  if (p === '/pet/coordinate/parts') return 'petparts';
  if (p === '/pet/coordinate/all') return 'petcoordall';
  if (p === '/pet/coordinate/update') return 'petcoordupdate';
  if (p === '/pet/name') return 'petname';
  if (p === '/pet/subslot') return 'petsubslot';
  if (p === '/user/medal/preremove') return 'medalpreremove';
  // 243 GET /pet/expedition, 244 POST /pet/expedition, 245 PUT /pet/expedition/recover:
  // respondExpedition (server.js deve smistare questo kind; senza, risposta generica come prima)
  if (p === '/pet/expedition' || p === '/pet/expedition/recover') return 'petexpedition';
  return null;
}

// ctx: { ret, send, serverTime, masterRows, player, savePlayer, userMedalList, userMedalElement,
//        schemaResponse }
function makePet(ctx) {
  const { player } = ctx;

  function state() {
    if (!player.pet) {
      player.pet = { name: PET_NAME, subslot: [], coordinateNo: 1, coordinates: {} };
    }
    return player.pet;
  }

  // coordinato: 12 int (FUN_00793418). Il pet si disegna attaccando lwf/pet/part/%03d/<parte>
  // (id % 1000, FUN_00b397cc/FUN_00b3a248) ai movie omonimi dei nostri lwf/pet/motion
  // (make_pet_motions.py): le risorse hanno solo la serie 001 (orecchie, muso, zampe, corpo,
  // coda), quindi quelle parti valgono 1 se il giocatore non ne ha scelte altre; accessori 0
  // (nessun movie per loro, nessun file cercato). Con 0 ovunque il pet restava invisibile.
  function coordinate(no) {
    const c = state().coordinates[no] || {};
    const part = (v) => (v === undefined ? DEFAULT_PART : Number(v) || 0);
    return {
      myCoordinateNo: no, accessoryMask: c.accessoryMask || 0, accessoryHat: c.accessoryHat || 0,
      earPartsId: part(c.earPartsId), facePartsId: part(c.facePartsId),
      accessoryNecklace: c.accessoryNecklace || 0, legPartsId: part(c.legPartsId),
      accessoryBackpack: c.accessoryBackpack || 0, bodyPartsId: part(c.bodyPartsId),
      tailPartsId: part(c.tailPartsId), accessorySpecial: c.accessorySpecial || 0,
      accessoryMouth: c.accessoryMouth || 0,
    };
  }

  // Gear del pet: al massimo 6 medaglie possedute (vendute/fuse spariscono da sole)
  function gearIds() {
    const owned = new Set(ctx.userMedalList().map((m) => m.userMedalId));
    return (state().subslot || []).map(Number).filter((id) => id > 0 && owned.has(id)).slice(0, 6);
  }

  function pointsOf(ids) {
    const rows = new Map(ctx.masterRows('medal').map((r) => [r.medalId, r]));
    const list = new Map(ctx.userMedalList().map((m) => [m.userMedalId, m]));
    return ids.reduce((s, id) => s + (rows.get(list.get(id)?.medalId)?.addPetPt || 0), 0);
  }

  // rango dai punti (petRank: needPt cumulativo); senza tabella rango 1, x1.0
  function rankFor(pt) {
    const rows = ctx.masterRows('petRank').sort((a, b) => a.rank - b.rank);
    let row = rows[0] || { rank: 1, magnification: 10000, openSkillIds: [] };
    for (const r of rows) if (pt >= r.needPt) row = r;
    return row;
  }

  function petSubslotData(ids = gearIds()) {
    const pt = pointsOf(ids);
    const r = rankFor(pt);
    return {
      subslotUserMedalIds: ids, // uint64, <= 6
      // uint, <= 15; vuoto = nessun trick in battaglia (vedi SKILLS_ENABLED)
      openSkillIds: SKILLS_ENABLED ? (r.openSkillIds || []).filter((x) => x > 0).slice(0, 15) : [],
      rank: r.rank, pt, magnification: r.magnification, // uint
    };
  }

  // Spirit Training: stato in player.pet.training {total, monthly, month 'AAAA-MM', readyAt
  // (ms dell'ora del server), medals [userMedalId]}
  const HOUR = 3600 * 1000;
  // ora del server (ctx.serverTime, «AAAA-MM-GG hh:mm:ss» UTC) <-> ms
  const serverMs = () => Date.parse(ctx.serverTime().replace(' ', 'T') + 'Z');
  const fmt = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
  function training() {
    const t = (state().training ||= { total: 0, monthly: 0, month: '', readyAt: 0, medals: [] });
    const month = ctx.serverTime().slice(0, 7);
    if (t.month !== month) { t.month = month; t.monthly = 0; }   // conteggio del mese
    return t;
  }

  // GET /pet/profile (170)
  function respondProfile(res) {
    const now = ctx.serverTime();
    const ids = gearIds();
    const medals = ctx.userMedalList().filter((m) => ids.includes(m.userMedalId));
    const t = training();
    ctx.send(res, 200, {
      ret: ctx.ret(),
      pet: {
        petSubslot: petSubslotData(ids),
        userPetCoordinate: coordinate(state().coordinateNo || 1),
        petName: state().name || PET_NAME,
        userSkills: [],
        userMedals: medals.map((m) => ctx.userMedalElement(m, now)),
        initCoordinate: 1, // 0 = Tutorial_Pet01 (assente) nella scena PetEdit
      },
      // recoverDatetime = quando il prossimo allenamento e' pronto (FUN_0090e540: passato =
      // «Train», futuro = «Train Now» + «Training Ready in»), contatori del dialog SPIRIT
      recoverDatetime: t.readyAt > serverMs() ? fmt(t.readyAt) : now, recoverStoneNum: TRAIN_STONES,
      expeditionTotalNum: t.total, expeditionMonthlyNum: t.monthly,
    });
  }

  // Spirit Training (I-082), stesso percorso per tre azioni:
  // - 243 GET /pet/expedition (corpo vuoto, FUN_0090e980; parser FUN_007abd68 -> sessione +0xa80,
  //   tutto obbligatorio): openMedalSlotDatas[] {openMedalSlotNumber uint 1-4 (fuori = abort in
  //   FUN_00aa9db4), openMedalSlotLimitDatetime data}, limitDateimeWeekEnd e limitDateimeMonthEnd
  //   (date, scritte cosi' nel binario; scadenze degli slot 2 e 4 bloccati), remainingDrawCount
  //   (uint, draw da 10 che mancano per lo slot 3). Prima la rotta generica mandava lo schema di
  //   244 e il parser falliva: «Train»/«Training Slots» non si aprivano;
  // - 244 POST /pet/expedition (corpo {userMedalIds}, FUN_0090ec20 da «Train» FUN_00928968): il
  //   ramo legge userMedals (FUN_0078da18, obbligatorio) e medalResumption {userShuffleSkills[]
  //   (elemento FUN_0078d4b4), resumptionStatus uint} (FUN_0078e30c); poi il client richiede
  //   GET /pet/profile e aggiorna il dialog (FUN_009299d0 -> FUN_0090e540). Nessun trait nuovo:
  //   userShuffleSkills [] (gli Spirit Trait non sono ricostruiti);
  // - 245 PUT /pet/expedition/recover (corpo {stoneNum}, FUN_0090f00c, «Train Now»): il ramo non
  //   legge nulla oltre a ret; qui l'attesa si azzera (jewel non scalati).
  function respondExpedition(res, method, body, path) {
    const t = training();
    const nowMs = serverMs();
    if (String(path || '').toLowerCase().startsWith('/pet/expedition/recover')) {
      t.readyAt = 0;
      ctx.savePlayer();
      console.log('  [pet] training: attesa azzerata');
      return ctx.send(res, 200, { ret: ctx.ret() });
    }
    if (String(method).toUpperCase() === 'POST') {
      const owned = new Map(ctx.userMedalList().map((m) => [m.userMedalId, m]));
      const ids = (body?.userMedalIds || []).map(Number).filter((id) => owned.has(id)).slice(0, 4);
      t.medals = ids;
      t.total += 1;
      t.monthly += 1;
      t.readyAt = nowMs + TRAIN_HOURS * HOUR;
      ctx.savePlayer();
      console.log(`  [pet] training ${ids.join(',')}: totale ${t.total}, mese ${t.monthly}`);
      const now = ctx.serverTime();
      return ctx.send(res, 200, {
        ret: ctx.ret(),
        userMedals: ids.map((id) => ctx.userMedalElement(owned.get(id), now)),
        medalResumption: { userShuffleSkills: [], resumptionStatus: 0 },
      });
    }
    // GET: slot 2..TRAIN_SLOTS aperti fino a fine mese; scadenze settimana/mese
    const d = new Date(nowMs);
    const day = d.getUTCDay();                                   // 0 = domenica
    const weekEnd = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + ((7 - day) % 7), 23, 59, 59);
    const monthEnd = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59);
    const slots = [];
    for (let n = 2; n <= TRAIN_SLOTS; n++) slots.push({ openMedalSlotNumber: n, openMedalSlotLimitDatetime: fmt(monthEnd) });
    return ctx.send(res, 200, {
      ret: ctx.ret(),
      openMedalSlotDatas: slots,
      limitDateimeWeekEnd: fmt(weekEnd),
      limitDateimeMonthEnd: fmt(monthEnd),
      remainingDrawCount: 10,
    });
  }

  // GET /pet/coordinate/parts (171, FUN_00794094): pet.userPetParts[], elemento FUN_00793f68
  // (24 byte, chiave petPartsId). Nessuna parte: la tabella petParts e' vuota.
  function respondParts(res) {
    ctx.send(res, 200, { ret: ctx.ret(), pet: { userPetParts: [] } });
  }

  // GET /pet/coordinate/all (172, FUN_00793b00): pet.userPetCoordinates[] (12 int ciascuno),
  // copiati nella mappa della sessione (+0x7b0). Sempre i 6 outfit: la scena Outfits
  // (ScenePetPartsEdit, FUN_00e03b74) mette in una lista quelli con myCoordinateNo 1..6 e
  // «Button_Switch» passa al successivo fino al sesto (FUN_00e08908 -> FUN_00e03f70): un indice
  // oltre la lista = out_of_range, crash (I-082)
  function coordinatesList() {
    const nos = new Set([1, 2, 3, 4, 5, 6, ...Object.keys(state().coordinates).map(Number)]);
    return [...nos].filter((n) => n >= 1 && n <= 6).sort((a, b) => a - b).map(coordinate);
  }
  function respondCoordinateAll(res) {
    ctx.send(res, 200, { ret: ctx.ret(), pet: { userPetCoordinates: coordinatesList() } });
  }

  // POST /pet/coordinate/update (173, corpo FUN_008017f0: myCoordinateNo, defaultFlag, parti):
  // il ramo legge pet.equipCoordinateNo (uint) e pet.userPetCoordinates (FUN_00793b00)
  function respondCoordinateUpdate(res, body) {
    const no = Number(body?.myCoordinateNo) || 1;
    const c = {};
    for (const k of Object.keys(coordinate(no))) if (k !== 'myCoordinateNo' && k in (body || {})) c[k] = Number(body[k]) || 0;
    state().coordinates[no] = { ...(state().coordinates[no] || {}), ...c };
    state().coordinateNo = no;
    ctx.savePlayer();
    ctx.send(res, 200, { ret: ctx.ret(), pet: { equipCoordinateNo: no, userPetCoordinates: coordinatesList() } });
  }

  // POST /pet/name (174, corpo {petName}): il ramo copia pet.petName (32 caratteri) nel pet
  function respondName(res, body) {
    if (typeof body?.petName === 'string' && body.petName) state().name = body.petName.slice(0, 32);
    ctx.savePlayer();
    ctx.send(res, 200, { ret: ctx.ret(), pet: { petName: state().name } });
  }

  // POST /pet/subslot (175, corpo FUN_0080220c: {subslotUserMedalIds}): Gear del pet; il ramo
  // copia pet.petSubslot nel pet della sessione (+0x38)
  function respondSubslot(res, body) {
    const ids = (body?.subslotUserMedalIds || []).map(Number).filter((id) => id > 0).slice(0, 6);
    state().subslot = ids;
    ctx.savePlayer();
    const sub = petSubslotData();
    console.log(`  [pet] gear ${sub.subslotUserMedalIds.join(',')}: ${sub.pt} pt, rango ${sub.rank}, x${sub.magnification / 10000}`);
    ctx.send(res, 200, { ret: ctx.ret(), pet: { petSubslot: sub } });
  }

  // GET /user/medal/preremove (236, FUN_007a9b88): removeDecks/removeSubslots/removePvpDecks
  // (vuoti: la risposta generica di prima) + isPetSlot, petRank, updatePetRank = la medaglia e'
  // nella Gear del pet e il rango prima/dopo averla tolta
  function respondPreremove(res, apiPath, query) {
    const body = ctx.schemaResponse(apiPath) || { ret: ctx.ret(), removeDecks: [], removeSubslots: [], removePvpDecks: [] };
    const id = Number(query?.removeUserMedalId || query?.userMedalId || 0);
    const ids = gearIds();
    body.isPetSlot = ids.includes(id) ? 1 : 0;
    body.petRank = petSubslotData(ids).rank;
    body.updatePetRank = petSubslotData(ids.filter((x) => x !== id)).rank;
    ctx.send(res, 200, body);
  }

  // per POST /user/medal/remove (237): toglie la medaglia dalla Gear e dagli slot pet dei deck
  function onMedalRemoved(id) {
    state().subslot = (state().subslot || []).filter((x) => Number(x) !== id);
    for (const [k, v] of Object.entries(player.petBaseSlots || {})) if (Number(v) === id) player.petBaseSlots[k] = 0;
  }

  return {
    respondProfile, respondParts, respondCoordinateAll, respondCoordinateUpdate, respondName,
    respondSubslot, respondPreremove, onMedalRemoved, petSubslotData, respondExpedition,
  };
}

// 6° slot del deck (spento: 0 come prima). Medaglia non piu' posseduta -> 0.
function petBaseSlotMedal(player, userKeybladeId, ownedIds) {
  if (!ENABLED) return 0;
  const id = Number((player.petBaseSlots || {})[userKeybladeId] || 0);
  return id > 0 && ownedIds.has(id) ? id : 0;
}

function setPetBaseSlotMedal(player, userKeybladeId, value) {
  if (!ENABLED || value === undefined) return;
  (player.petBaseSlots = player.petBaseSlots || {})[userKeybladeId] = Number(value) || 0;
}

module.exports = { ENABLED, routePet, makePet, petBaseSlotMedal, setPetBaseSlotMedal };
