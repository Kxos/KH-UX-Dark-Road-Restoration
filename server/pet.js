// Pet («Spirit»): 6° slot del deck (petBaseSlotMedal), Gear del pet (petSubslot), profilo e
// coordinato. Note in docs/notes/home_profilo.md#pet; tabelle in make-pet-tables.js.
//
// Si accende con KHUX_PET=1 (default spento: userDetail.isPet 0 e nessuna rotta, come prima).
// Il client accende tutto da userData.userDetail.isPet ([fn], byte +0x45 della riga
// userDetail, singleton +0x128 / scena +0x440):
// - catena di avvio ([fn], dopo GET /user/option = azione 149): con isPet chiede
//   GET /pet/profile (170, [fn] senza userId), poi GET /pet/coordinate/parts (171) e
//   GET /pet/coordinate/all (172), e solo dopo prosegue ([fn]);
// - Equipment / scelta del deck ([fn], DeckRevolverView [fn]): carica
//   DeckEdit_PetMedal_ver230 (cornice a testa di gatto DeckEdit_Pet1, pulsante Button_PowerUp
//   «スピリット強化» = Spirit Strengthen -> PetInfoDialog) in Area_PetMedal/Area_RevolverPet, e
//   legge SENZA controllo del null pet(+0x7c0)->petSubslot(+0x38)->magnification(+0x74):
//   [fn] la somma al partnerRate del keyblade (riga +0x50) per la cella del 6° slot
//   ([fn] -> [fn], campo +0x498). Il revolver crea 6 celle «Medal1..6»
//   ([fn]): la sesta e' lo slot del pet.
// Quindi il pet della sessione (+0x7c0) DEVE esistere prima di Equipment: lo crea solo
// l'azione 170, il cui parser ([fn]) pretende tutto:
//   pet.petSubslot ([fn] modo 0 -> [fn]: subslotUserMedalIds uint64 <= 6,
//   openSkillIds uint <= 15, rank, pt, magnification uint), pet.userPetCoordinate ([fn],
//   12 int), pet.petName (stringa, 32), pet.userSkills ([fn]) e pet.userMedals
//   ([fn]) sul nodo pet, pet.initCoordinate (byte +0x68: 0 = la scena PetEdit,
//   [fn], carica Tutorial_Pet01.json, assente -> crash; si manda 1), poi sulla radice
//   ([fn]) recoverDatetime (data), recoverStoneNum, expeditionTotalNum,
//   expeditionMonthlyNum (uint). Se il parser fallisce il pet resta nullo.
// Il crash 0x7c8d40 di I-005: il ramo 237 (POST /user/medal/remove) copia petSubslots[0] in
// pet(+0x7c0)+0x38 senza controllare il pet; lo stesso fanno 175 (POST /pet/subslot, 0x7c66dc) e
// 174 (POST /pet/name, 0x7cd630). I rami 55/56 (Level Up / Evolve) invece controllano (0x7ce17c,
// 0x7ceeac). Con KHUX_PET=1 il pet esiste dall'avvio, quindi petSubslots puo' avere l'elemento.
//
// Il 6° slot (petBaseSlotMedal): elemento di userDecks ([fn]: 5 deckMedals a +0x18,
// petBaseSlotMedal uint64 a +0x40, obbligatorio) e corpo di POST /user/keyblade/update/170516
// ([fn]: userDecks[].petBaseSlotMedal). Qui player.petBaseSlots[userKeybladeId].
//
// In battaglia (solo da isPet, nessun campo del server lo spegne: [fn]/[fn] ->
// [fn]) il PetActor aspetta la fine dei LWF lwf/pet/motion/* (evento «end»): li genera
// recon/tools/make_pet_motions.py (da make_layouts.py). Con i LWF vuoti la battaglia si bloccava
// dopo il primo attacco (I-005). I trick restano spenti: SKILLS_ENABLED qui sotto.
// La medaglia di petBaseSlotMedal non chiede altro al server: il client la mette dopo quelle del
// deck ([fn] -> [fn], x pet.petSubslot.magnification) e al suo turno attacca il
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
// battaglia [fn] -> [fn] mette ogni id aperto (riga petSkill, [fn]) in
// uno dei 16 posti del PetActor (+0x388 + 0x48*i) scelto da invokeType (riga +0x2dc; 4 = per
// skillValue3 0..5 -> posti 0/11..15, tabella 0x188a950). Posti visti: 1 = alla morte di un
// nemico ([fn], recovery_skill), 3 = Blast ([fn]/[fn]: battle_skill al
// posto del colpo dell'avatar), 6 = HP Recovery ([fn]), 7-9 = potenziamenti di stato
// ([fn]), 10 = Combo ([fn]: probabilita' skillValue2/10000 -> rolling1-3),
// 11-15 = Steal per tipo di drop ([fn]). La nostra petSkill (make-pet-tables.js) ha
// invokeType 1 per tutti e valori stimati: finche' la corrispondenza trick -> posto non e'
// verificata, il pet in battaglia segue solo l'avatar (niente trick).
const SKILLS_ENABLED = process.env.KHUX_PET_SKILLS === '1';
// Parti della serie 001 per il pet visibile (default). KHUX_PET_PARTS=0 = ripiego: id 0, pet
// invisibile come prima (i movimenti mandano comunque gli eventi e i pet_eff restano visibili).
const DEFAULT_PART = process.env.KHUX_PET_PARTS === '0' ? 0 : 1;
// Parti dello Spirit (master petParts, make-pet-parts.js). petPartsId = 3TTNNN (specie/colore NNN,
// grafica lwf/pet/part/NNN) o 4TTNNN (accessorio, cartella lwf/pet/part/<id>); TT = partsType,
// cioe' la scheda dell'editor ([fn]): 4 Head, 3 Ears, 8 Body, 6 Legs, 9 Tail, accessori
// 1 mask, 2 hat, 5 necklace, 7 backpack, 10 special, 11 mouth.
// campo del coordinato -> partsType ([fn])
const COORD_TYPE = {
  accessoryMask: 1, accessoryHat: 2, earPartsId: 3, facePartsId: 4, accessoryNecklace: 5, legPartsId: 6,
  accessoryBackpack: 7, bodyPartsId: 8, tailPartsId: 9, accessorySpecial: 10, accessoryMouth: 11,
};
// la serie 001 (Pink Kitstar, l'unica servita dal WW) la possiede chiunque
const STARTER_PARTS = [303001, 304001, 306001, 308001, 309001];
// KHUX_PET_ALL_PARTS=1: tutte le parti della tabella (prove al banco)
const ALL_PARTS = process.env.KHUX_PET_ALL_PARTS === '1';
// Spirit Training (I-082). Valori NOSTRI: nessun dump delle risposte originali.
// - attesa tra due allenamenti (khwiki: un trait ogni 20 ore), in ore
const TRAIN_HOURS = Number(process.env.KHUX_PET_TRAIN_HOURS || 20);
// - slot aperti oltre al primo (sempre aperto, [fn]): 2-4 si sbloccavano con acquisti
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

  // coordinato: 12 int ([fn]). Il pet si disegna attaccando lwf/pet/part/%03d/<parte>
  // (id % 1000, [fn]/[fn]) ai movie omonimi dei nostri lwf/pet/motion
  // (make_pet_motions.py): le risorse hanno solo la serie 001 (orecchie, muso, zampe, corpo,
  // coda), quindi quelle parti valgono 1 se il giocatore non ne ha scelte altre; accessori 0
  // (nessun movie per loro, nessun file cercato). Con 0 ovunque il pet restava invisibile.
  // Gli id sono quelli veri del master (303001...): i salvataggi di prima avevano 1 (= serie 001,
  // id % 1000), che diventa 300000 + tipo*1000 + 1 perche' l'editor riconosca la parte in uso.
  function coordinate(no) {
    const c = state().coordinates[no] || {};
    const part = (k) => {
      let v = c[k] === undefined ? DEFAULT_PART : Number(c[k]) || 0;
      if (v > 0 && v < 1000) v = 300000 + COORD_TYPE[k] * 1000 + v;
      return v;
    };
    return {
      myCoordinateNo: no, accessoryMask: c.accessoryMask || 0, accessoryHat: c.accessoryHat || 0,
      earPartsId: part('earPartsId'), facePartsId: part('facePartsId'),
      accessoryNecklace: c.accessoryNecklace || 0, legPartsId: part('legPartsId'),
      accessoryBackpack: c.accessoryBackpack || 0, bodyPartsId: part('bodyPartsId'),
      tailPartsId: part('tailPartsId'), accessorySpecial: c.accessorySpecial || 0,
      accessoryMouth: c.accessoryMouth || 0,
    };
  }

  // Parti possedute: player.pet.parts {petPartsId: getDatetime}, sempre con la serie 001; solo
  // quelle della tabella petParts (senza riga l'editor dereferenzia NULL, [fn]).
  function ownedParts() {
    const rows = new Map(ctx.masterRows('petParts').map((r) => [r.petPartsId, r]));
    const st = state();
    if (!st.parts) st.parts = {};
    const have = new Map(Object.entries(st.parts).map(([k, v]) => [Number(k), v]));
    for (const id of STARTER_PARTS) if (!have.has(id)) have.set(id, '2017-09-21 00:00:00');
    if (ALL_PARTS) for (const id of rows.keys()) if (!have.has(id)) have.set(id, '2017-09-21 00:00:00');
    return [...have].filter(([id]) => rows.has(id)).sort((a, b) => a[0] - b[0])
      .map(([id, t]) => ({ petPartsId: id, partsType: rows.get(id).partsType, getDatetime: t }));
  }

  // premio (missioni, presents): aggiunge la parte; false se gia' posseduta o senza riga
  function grantPart(id) {
    id = Number(id);
    if (!ctx.masterRows('petParts').some((r) => r.petPartsId === id)) return false;
    const st = state();
    if (!st.parts) st.parts = {};
    if (st.parts[id] || STARTER_PARTS.includes(id)) return false;
    st.parts[id] = ctx.serverTime();
    return true;
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
      // recoverDatetime = quando il prossimo allenamento e' pronto ([fn]: passato =
      // «Train», futuro = «Train Now» + «Training Ready in»), contatori del dialog SPIRIT
      recoverDatetime: t.readyAt > serverMs() ? fmt(t.readyAt) : now, recoverStoneNum: TRAIN_STONES,
      expeditionTotalNum: t.total, expeditionMonthlyNum: t.monthly,
    });
  }

  // Spirit Training (I-082), stesso percorso per tre azioni:
  // - 243 GET /pet/expedition (corpo vuoto, [fn]; parser [fn] -> sessione +0xa80,
  //   tutto obbligatorio): openMedalSlotDatas[] {openMedalSlotNumber uint 1-4 (fuori = abort in
  //   [fn]), openMedalSlotLimitDatetime data}, limitDateimeWeekEnd e limitDateimeMonthEnd
  //   (date, scritte cosi' nel binario; scadenze degli slot 2 e 4 bloccati), remainingDrawCount
  //   (uint, draw da 10 che mancano per lo slot 3). Prima la rotta generica mandava lo schema di
  //   244 e il parser falliva: «Train»/«Training Slots» non si aprivano;
  // - 244 POST /pet/expedition (corpo {userMedalIds}, [fn] da «Train» [fn]): il
  //   ramo legge userMedals ([fn], obbligatorio) e medalResumption {userShuffleSkills[]
  //   (elemento [fn]), resumptionStatus uint} ([fn]); poi il client richiede
  //   GET /pet/profile e aggiorna il dialog ([fn] -> [fn]), poi chiude il pannello
  //   e per ogni medaglia allenata gioca l'animazione ([fn]: PetInfo_TrainingProduction e
  //   lwf/pet/demo/training_SE, make_layouts.py; mancavano -> crash in GUIReader, I-082) e mostra
  //   il trait ottenuto (Kakusei_Get1/2). Ogni medaglia riceve quindi un trait (spiritTrait) in
  //   userMedals; medalResumption resta {[] , 0}: con resumptionStatus 1 e la medaglia fra i
  //   userShuffleSkills (sessione +0x148) il client aprirebbe la scelta del trait da tenere
  //   ([fn], MedalInfo_SkillChangeWindow.json assente);
  // - 245 PUT /pet/expedition/recover (corpo {stoneNum}, [fn], «Train Now»): il ramo non
  //   legge nulla oltre a ret; qui l'attesa si azzera (jewel non scalati).
  // Quali medaglie entrano negli slot lo decide solo il client (nessun campo di queste risposte):
  // la lista (MiniMedalScrollView, +0xb29 = 1 in [fn]) vela con [fn] le medaglie
  // di type 9/10 o con spShuffleskillSlot 0 (riga medal +0x490 / +0x4b8: Moogle, Chip, Dale, Huey...
  // nei nostri master), e una medaglia velata non si trascina ([fn]). Il tocco apre solo il
  // dettaglio ([fn], callback vuota [fn]); il rilascio sullo slot ([fn] ->
  // [fn] -> [fn] sulla cella DeckEdit_RevolverMedal_ver330 175x175) la mette
  // ([fn] -> [fn]) solo se lo slot e' aperto (bit di [fn]: slot 1 sempre).
  // Trait dell'allenamento (Spirit Trait) sulla medaglia userMedalId, in player.medalTraits come
  // quelli del Moogle Shop (server.js medalTraits -> userMedals[].userShuffleSkills). Dopo
  // l'animazione il client mostra il trait ottenuto ([fn], ramo con +0x598 = 0): legge
  // dalla medaglia ricostruita ([fn]) il trait all'indice +0x148 = primo trait la cui riga
  // shuffleskill ha type 2, altrimenti 0, e ne cerca la riga ([fn]) SENZA controllo del
  // null: una medaglia senza trait = crash.
  // Il trait: uno Special Trait (righe shuffleskill type 2, make-pet-tables.js: le 36 della tabella
  // ufficiale v3.2.0 / khwiki «Special Traits») estratto col peso rate (= «Unlock Rate» in
  // centesimi di punto, somma 10000), come l'originale (reference\pet\NOTE.md §10). Uno solo per
  // medaglia («one Special Trait slot», separato dai 5 trait normali): un nuovo allenamento
  // sostituisce quello vecchio. Nell'originale, se la medaglia ne aveva gia' uno, si sceglieva
  // quale tenere (popup «Choose a trait to replace.», Skip/OK: medalResumption.resumptionStatus 1
  // -> [fn], MedalInfo_SkillChangeWindow.json assente): qui sostituzione diretta.
  // Senza righe type 2 (master non rigenerati) ripiego di prima: un trait normale a caso.
  // Restituisce lo shuffleSkillId.
  function pickWeighted(rows) {
    const total = rows.reduce((s, r) => s + Math.max(0, r.rate || 0), 0);
    if (total <= 0) return rows[Math.floor(Math.random() * rows.length)];
    let x = Math.random() * total;
    for (const r of rows) { x -= Math.max(0, r.rate || 0); if (x < 0) return r; }
    return rows[rows.length - 1];
  }
  function spiritTrait(t, userMedalId) {
    const all = ctx.masterRows('shuffleskill');
    const special = all.filter((r) => r.type === 2);
    const pool = special.length ? special : all.filter((r) => r.type === 1 && r.shuffleSkillId < 900);
    if (!pool.length) return 0;
    const row = pickWeighted(pool);
    const isSpecial = new Set(special.map((r) => r.shuffleSkillId));
    player.medalTraits = player.medalTraits || {};
    t.spirit = t.spirit || {};
    // via il vecchio trait dello Spirit (quello registrato o qualunque riga type 2)
    const list = (player.medalTraits[userMedalId] || []).filter((x) =>
      x.userShuffleSkillId !== t.spirit[userMedalId] && !isSpecial.has(x.shuffleSkillId));
    if (list.length >= 6) list.length = 5;          // al massimo 6 trait per medaglia ([fn])
    player.nextShuffleSkillId = (player.nextShuffleSkillId || 1000) + 1;
    list.unshift({ userShuffleSkillId: player.nextShuffleSkillId, shuffleSkillId: row.shuffleSkillId, type: 0,
      getDatetime: ctx.serverTime() });
    player.medalTraits[userMedalId] = list;
    t.spirit[userMedalId] = player.nextShuffleSkillId;
    return row.shuffleSkillId;
  }

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
      const got = ids.map((id) => spiritTrait(t, id));
      t.medals = ids;
      t.total += 1;
      t.monthly += 1;
      t.readyAt = nowMs + TRAIN_HOURS * HOUR;
      ctx.savePlayer();
      console.log(`  [pet] training ${ids.join(',')}: totale ${t.total}, mese ${t.monthly}, trait ${got.join(',')}`);
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

  // GET /pet/coordinate/parts (171, [fn]): pet.userPetParts[], elemento [fn]
  // (24 byte: petPartsId, partsType, getDatetime). L'editor degli outfit mette nelle schede le
  // parti con combinationFlag != 1 della riga master.
  function respondParts(res) {
    ctx.send(res, 200, { ret: ctx.ret(), pet: { userPetParts: ownedParts() } });
  }

  // GET /pet/coordinate/all (172, [fn]): pet.userPetCoordinates[] (12 int ciascuno),
  // copiati nella mappa della sessione (+0x7b0). Sempre i 6 outfit: la scena Outfits
  // (ScenePetPartsEdit, [fn]) mette in una lista quelli con myCoordinateNo 1..6 e
  // «Button_Switch» passa al successivo fino al sesto ([fn] -> [fn]): un indice
  // oltre la lista = out_of_range, crash (I-082)
  function coordinatesList() {
    const nos = new Set([1, 2, 3, 4, 5, 6, ...Object.keys(state().coordinates).map(Number)]);
    return [...nos].filter((n) => n >= 1 && n <= 6).sort((a, b) => a - b).map(coordinate);
  }
  function respondCoordinateAll(res) {
    ctx.send(res, 200, { ret: ctx.ret(), pet: { userPetCoordinates: coordinatesList() } });
  }

  // POST /pet/coordinate/update (173, corpo [fn]: myCoordinateNo, defaultFlag, parti):
  // il ramo legge pet.equipCoordinateNo (uint) e pet.userPetCoordinates ([fn])
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

  // POST /pet/subslot (175, corpo [fn]: {subslotUserMedalIds}): Gear del pet; il ramo
  // copia pet.petSubslot nel pet della sessione (+0x38)
  function respondSubslot(res, body) {
    const ids = (body?.subslotUserMedalIds || []).map(Number).filter((id) => id > 0).slice(0, 6);
    state().subslot = ids;
    ctx.savePlayer();
    const sub = petSubslotData();
    console.log(`  [pet] gear ${sub.subslotUserMedalIds.join(',')}: ${sub.pt} pt, rango ${sub.rank}, x${sub.magnification / 10000}`);
    ctx.send(res, 200, { ret: ctx.ret(), pet: { petSubslot: sub } });
  }

  // GET /user/medal/preremove (236, [fn]): removeDecks/removeSubslots/removePvpDecks
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
    ownedParts, grantPart,
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
