# Home, menu, Profilo, Missioni, pet

Storia: [../journal/fino-al-2026-10-11.md](../journal/fino-al-2026-10-11.md). Tocchi in
[banco.md](banco.md#tocchi).

<a id="home"></a>
## Home

- Sfondo (`FUN_00bb400c`): solo dalle parti di `mypageBackground` (`validParts`, `partsId`,
  `dataType` 1 = `lwf/home/<id>/<id>.png`, 2 = `.lwf`, 3 = `img/home/<id>/<id>.plist`, posizioni,
  `zSort`); senza la riga del `backgroundId` crash. `make-game-tables.js` genera una riga per ogni
  sfondo con grafica (`lwf/home/{2..6,99,150911}`).
- Con tutorial finito la home crea pet e NPC: `FUN_00b3c350`/`FUN_00add9a0` caricano
  `lwf/pet/motion/<30 nomi>` e `lwf/character/npc/<id>/wait/wait.lwf` (`FUN_011f9fc4`, NULL se manca)
  senza controllo: nel pacchetto ci sono LWF vuoti per le 30 animazioni (ora LWF nostri con
  «end», `make_pet_motions.py`, vedi [pet](#pet)) e i 74 id NPC di
  `img/stage_npc/npc_rule.bin` (tranne 4001). Quindi Chirithy (NPC 999) e' invisibile (ISSUES I-016).
- Tocco sulla piazza (`SceneMyPage::init` $_10 -> `FUN_00bc0b08` -> `FUN_00bc1028`): chi non e' in
  party (`userParty.isJoin` 0) vede Chirithy con la nuvoletta `MyPage_ChirishiBaloon.json`
  (`Txt_Name`, testo 101000022, «Join a party and make new friends!»), generata da
  `MyPage_AvatarBaloon_ver240`.
- Fumetto bianco sopra l'avatar (ISSUES I-071): `MyPage_MpBaloon.json` (Panel_1 > Balloon >
  `Txt_Comment_Label`), due copie `avatarFukidashi_0/1` create da `FUN_00bb1610`. L'azione casuale
  dell'avatar `FUN_00bbbb3c` (10% dei casi) ci scrive il **messaggio del Profilo**: per il proprio
  avatar `userData.user.comment` (record utente della sessione +0xd8, campo +0x3c, 0x101 byte), per
  gli altri quello del loro record; nessun controllo sul vuoto. Con `comment` "" il fumetto
  compariva vuoto. Il server ora manda `DEFAULT_COMMENT` («Nice to meet you!», o
  `KHUX_DEFAULT_COMMENT`) quando il messaggio salvato e' vuoto. Negli originali li' c'era il
  messaggio dei giocatori (`reference\home_bubble\`). Non c'entra con la nuvoletta rossa di
  Chirithy qui sopra. Da provare sul banco.
- `GET /mypage` (azione 59, parser `FUN_0077ae10`) ha ora la sua rotta (`respondMyPage`):
  stessi campi dello schema (`backgroundId` 150911). `adminMypageTexts[]` {type, priority, text}
  resta vuoto: forse e' la striscia scorrevole sotto la barra in alto (originale «Tap the face icon
  to customize your avatar. Tap the screen to view party members' progress.»), ma il lettore
  non e' trovato; da provare con `KHUX_MYPAGE_TICKER=1` (type da `KHUX_MYPAGE_TICKER_TYPE`, 1).
- Mappatura dei pulsanti (`sweep.ps1`, 9 ottobre): Quests, Shop, Chat («You need to be in a party»),
  Presents, Equipment ok; Beginner's Guide si apre vuota; gli altri risolti dopo. Mai provati:
  Beginner's Guide (contenuto), Shop jewel, frecce ‹ ›, pulsanti di Other, Share della medaglia, titolo
  (Restore Resources, Save User Data, x3 [ex tres], KHDR START) (ISSUES I-018).
- Schermata Quests (`SceneAdventureSelect`, `FUN_00d97410`): `lastClearStageId` confrontato con
  `misc` 106 (130) per il Colosseum; pulsanti STORY, Special (missione 6), Events (14), Union Cross
  (24), Colosseum (130).

<a id="other"></a>
## Menu Other

`MenuDialog_ver300` da `MenuDialog_ver150` originale (`other_menu` in `make_layouts.py`): il codice
scrive i testi e nasconde Support/Transfer/Movie; `TwitterButton` nascosto (cercato da
`FUN_009ed888`). Pulsanti mai provati.

<a id="profilo"></a>
## Profilo

- Si apre toccando l'avatar della home: `AvatarInfoDialog::open` `FUN_008d785c` (scena nascosta +
  `GET /user/profile`, azione 5, parser `FUN_00792148`), poi `createLayout` `FUN_008d7e8c`.
  Riferimenti `reference\profile\` (video 7-R0jhyzlso del 2017: profile_06, _11 Titles, _13
  Name/Message, _16 Play Style).
- Layout generati: scena `AvatarInfoScene_A_ver131` (UnderUI = Titles/Name/Message/Play
  Style/Outfits = `Button_A..D`; LeftUI/RightUI = frecce), `AvatarInfo_Oneself_ver131` (cornice),
  `AvatarInfo_User_ver260` (`FUN_008e68d0`: `RankTitle_Board`/`RankTitle_Name`, `Base_User` con
  `Union_Symbol` e `My_Name`, `Txt_Party`/`Party_Name`, `MVP_Crown`/`MVP_Trophy`; `FUN_008e7d58`:
  `FaceBook_PhotoPanel`/`FaceBook_Photo`), pagina 1 = `AvatarInfo_Txt_ver340` (originale, 6 texture
  disegnate in `make_textures.py`), pagina 2 = `AvatarInfo_Txt2` (`FUN_008eb9a8`),
  `TresCommu_CommunicationUser/Other` vuoti.
- Server: titolo di default Budding Newbie (con `titleLeft/Right/PlateId` 0 crash in `FUN_006e9bbc`),
  keyblade iniziale `isFavorite` 1 (senza, crash in `FUN_008c19e4`), `img/union/Union_%02d` e
  `Union_L_*`.
- Titles (`Button_A`, `FUN_008db068`): copia di `Offline_AvatarTitle_Base`; `GET /user/title` (18)
  elenca i titoli di categoria 1 + `player.titles`; `POST /user/title/update` {titleLeftId,
  titleRightId, titlePlateId} (41).
- Name/Message (`Button_B`, `FUN_008dcf1c`): da `Offline_AvatarInfo_Comment`; `POST /user/update`
  {name, comment} (38). **Il messaggio parte vuoto**: `FUN_006e467c` sostituisce il TextField
  `Txt_Comment_Label` con il campo vero e la callback `FUN_008de654` copia il testo solo a fine
  modifica; con `adb input text` (anche con Invio o Indietro) il client manda `comment: ""` (l'EditBox
  nativo non riceve il testo): da riprovare con una tastiera vera (ISSUES I-015). Variante U13 se
  l'eta' (da `GET /user/birthday`, azione 9, AAAAMM, mai chiesta) e' <= 12.
- Play Style (`Button_C`, `FUN_008deb84`): CheckBox `But16` (con Button crash in `FUN_0125068c`);
  `POST /user/playstyle/update` {playTimezones, playFrequently} (40).
- Da fare: Outfits (`Button_D`), Boosters/Passive, pagina 2 (`Button_Change`), frecce ‹ › (non
  compaiono con un solo profilo) (ISSUES I-017).

<a id="missioni"></a>
## Missioni (rotolo)

- Pulsante a pergamena sotto l'avatar (`425,130`): `MyPageMission_Base_ver320` (nomi da
  `FUN_00a8ad3c`/`FUN_00a8c100`), riga `MyPageMission_Panel` e `PresentBOX_IconPanel_ver131`
  ricostruiti con i widget KHUX; `ChallengeButton`/`ReceiveButton` li crea il codice (non metterli nel
  layout). Righe alte 144 (cella del codice 148, contenuto +44), barra come quella LUX
  (`Gage_LUX_Base` + `Gage_LUX_Tip`), timbro `World_Stage_Clear` («COMPLETE») sulle righe riscosse.
- Dati: `server/tables/mission.json` (20 missioni: 10 giornaliere 30 jewel, 10 settimanali di party
  100 jewel; agente in `stage_gen\missions\NOTE.md`). `GET /user/mission/list` (189, `FUN_00797eb8`)
  -> `missions[]` {id, status 0/1/2, numUpper, numLower} **solo con id del master** (altrimenti crash),
  `beginnerLimitTime`; `POST /user/mission/receive` {receiveMissionIds} -> userData + missions +
  inventario. Contatori per periodo in `player.missions` (giorno: ora di startDate, 08:00 UTC);
  contano quest e Lux, non ancora Raid/PVP/Union Cross (ISSUES I-014). Provato sul banco (Collect
  All: Jewel 3000 -> 3060).
- Aspetto da `reference\other_menu\missions_list_01.jpg`: schede 176x50 sopra la finestra; il codice
  (`FUN_008d5c20`) carica `img/ui/MyMission_Category_On/_Off/_Disable.png` sulle tab e
  `img/ui/MyMission_GroupIcon1/2.png` (1 = personali/Limited, 2 = party) in `GroupIcon`, tutte
  generate in `make_textures.py`. `Mask_Area` (avviso «Join a party» delle settimanali) deve coprire
  solo l'elenco: stesa sulla finestra mangiava i tocchi delle schede (Daily morta dopo Weekly, I-058).

<a id="pet"></a>
## Pet («Spirit»)

- Riferimenti `D:\Progetto_Restauro_KH_UX\reference\pet\` (NOTE.md + 14 screenshot): sbloccato dopo
  la Story Quest 14, dialog con rango, 6 medaglie, Name/Outfits/Gear/Tricks.
- **6° slot = slot del pet** (verificato, `reference\pet\NOTE.md` §8): ogni deck ha 5 `deckMedals`
  (FUN_00792a8c, al massimo 5) + `petBaseSlotMedal` (uint64, deck +0x40); il revolver di Equipment
  crea 6 celle «Medal1..6» (FUN_008d1314). Il moltiplicatore della sesta cella = `partnerRate` del
  keyblade + `magnification` del pet (FUN_008c47b4 -> FUN_008d02d8 -> cella FUN_008c8904 +0x498;
  in pet-mode la cella carica `img/ui/Minfo_Pet01.png`, assente come `Minfo_Def09`).
- Tutto si accende con `userData.userDetail.isPet` (FUN_0078babc, byte +0x45). Con isPet 1:
  - avvio (FUN_007c2adc): dopo `GET /user/option` (149) il client chiede `GET /pet/profile` (170),
    `GET /pet/coordinate/parts` (171), `GET /pet/coordinate/all` (172), poi prosegue;
  - Equipment (FUN_00c0b5ec / DeckRevolverView FUN_008e8ab4): `DeckEdit_PetMedal_ver230` (c'e':
    cornice `DeckEdit_Pet1`, `Button_PowerUp` «スピリット強化» -> PetInfoDialog) in
    `Area_PetMedal`/`Area_RevolverPet`, e lettura SENZA controllo di pet(+0x7c0)->petSubslot(+0x38)
    ->magnification(+0x74): il pet della sessione deve esistere.
- L'oggetto pet della sessione (+0x7c0) nasce solo dall'azione 170, parser FUN_0079371c, tutto
  obbligatorio: `pet.petSubslot` (FUN_007949f0: `subslotUserMedalIds` uint64 <= 6, `openSkillIds`
  <= 15, `rank`, `pt`, `magnification`), `pet.userPetCoordinate` (12 int, FUN_00793418),
  `pet.petName`, `pet.userSkills`, `pet.userMedals`, `pet.initCoordinate` (0 = la scena PetEdit
  FUN_00e01c44 carica `Tutorial_Pet01.json`, assente: si manda 1) e sulla radice `recoverDatetime`,
  `recoverStoneNum`, `expeditionTotalNum`, `expeditionMonthlyNum` (FUN_00793630).
- Crash 0x7c8d40 spiegato: il ramo 237 (`/user/medal/remove`) copia `petSubslots[0]` in
  pet(+0x7c0)+0x38 senza controllare il pet; idem 175 (`/pet/subslot`, 0x7c66dc) e 174
  (`/pet/name`, 0x7cd630). I rami 55/56 controllano (0x7ce17c, 0x7ceeac). Con isPet 0 il pet non
  esiste mai, quindi `petSubslots` deve restare [].
- Azioni: 170 GET `/pet/profile`, 171 GET `/pet/coordinate/parts` (`pet.userPetParts[]`), 172 GET
  `/pet/coordinate/all` (`pet.userPetCoordinates[]`), 173 POST `/pet/coordinate/update` (risposta
  `pet.equipCoordinateNo` + `pet.userPetCoordinates`), 174 POST `/pet/name` (`pet.petName`), 175
  POST `/pet/subslot` (corpo `subslotUserMedalIds`, risposta `pet.petSubslot`), 176 POST
  `/gacha/petdraw`, 177 GET `/pet/coordinate/members`, 236 GET `/user/medal/preremove` (corpo
  `removeUserMedalId`; `isPetSlot`, `petRank`, `updatePetRank`).
- Server: `server/pet.js`, acceso con **`KHUX_PET=1`** (default spento = comportamento di prima).
  Stato in `player.pet` ({name, subslot, coordinateNo, coordinates}) e `player.petBaseSlots`
  [userKeybladeId]. Tabelle `server/make-pet-tables.js` (petRank 17 ranghi, magnification
  22000+1000·rango = Rank 5 ×2.7 / 15 ×3.7 / 16 ×3.8 come negli screenshot; petSkill = i Tricks
  della khwiki; `medal.addPetPt` stimato da rarita' + tier), chiamato anche da make-game-tables.js.
  Valori NOSTRI (nessun dump: petRank/petSkill tolte nella 5.0.1).
- Dialog del pet (`PetInfoDialog`, open FUN_0090d8e4, createLayout FUN_0090e964): mancano
  `PetInfoScene_ver320` e le sotto-schermate (`PetInfo_PetSkill_Panel_ver230`, `_Rename_ver230`,
  `_Training*`, `PetEditScene_ver230`, `PetEdit_Panel/Check2_ver230`, `Tutorial_Pet01`), l'armatura
  `PetInfoAnim.ExportJson`; di `lwf/pet/part` ci sono solo le 9 parti di `001` (names_v4 e
  names440), nessun `lwf/pet/motion` ne' `lwf/ability/hit_effect/pet_eff_*`. Widget cercati da createLayout: Pet_LvUp,
  Panel_img, Button_A/B (Txt_A/B), PowerUp_Button, PetSkill_Button, PetTraing, PetTraing_But,
  PetTraing_ChargButton, PetTraing_Slot, Txt_TotalTitle, TotalNum_Label, Txt_MonthTitle,
  MonthNum_Label, Txt_PetSkill, Txt_Training, Txt_TrainingCharg, Icon_New, Txt_PowerUP, Txt_Time,
  Pet_Info (Txt_Pet_Name, Txt_Pet_Rank, Txt_Pet_Rank_Num, Txt_5), Pop_MedalForm,
  Pop_PetSkill_Info, PetInfo_Medal, Area_Arrow1/2, AtlasLabel_EXP, Close_Button, Dummy, MedalArea,
  Win_under. Non ancora generato: i figli di PetInfo_Medal/Pet_LvUp vanno ricavati dalle lambda.
  Finche' manca, `Button_PowerUp` di Equipment e l'icona pet della home vanno in crash.
- Con `isFinished` 1 a fase 995 la home creava il pet (`lwf/pet/motion/...`) e andava in crash in
  `FUN_011fa128`: risolto con i LWF vuoti.
- **Battaglia** (blocco del banco 11 ottobre, 1010 con `-Pet`: primo attacco, avatar fermo in
  posa, nemico immobile, AUTO e medaglie morti, nessun crash). Il PetActor nasce solo da
  `userDetail.isPet` (FUN_00b6cba4 0xb6d134, FUN_00b7f890 0xb7fb78/0xb7fc44 -> avatar
  FUN_00e26540 -> FUN_00e44518, init FUN_00e4458c, update FUN_00e44728): nessun campo di
  `/stage/start` lo spegne. Il pet si muove con Pet::playMotion FUN_00b3a230 (tabella dei 30 nomi
  a 0x1f32138: 0 wait, 1 bwait, 7 battle_normal, 8 battle_all, 9 deathblow_normal, 0xb
  battle_skill, 0xc recovery_skill, 0xd jump2, 0x12-0x14 rolling1-3...; FUN_00b3c350 carica il
  LWF e gli aggancia il dispatcher FUN_00870a68) e cambia stato **solo sull'evento LWF «end»**
  (FUN_00870a68 -> gestore +0x140 -> FUN_00accd3c mette 4 nella coda +0x818; la consumano
  FUN_00e44c68 e FUN_00e26f7c -> FUN_00e48794 -> FUN_00e44e84, che dopo 7/8/0xb/0xc/0xd/0x14-0x17
  torna a bwait e dopo 9/0xe lancia l'attacco del pet FUN_00e45a70). La sequenza d'attacco
  FUN_00b5a338: stato 0x14 aspetta FUN_00e26f20 = avatar fermo (0xb) **e** pet pronto
  (FUN_00e4875c: bwait/recovery_skill/rolling1-3 o +0x851); 0x38/0x39 aspettano FUN_00e254d0 ->
  FUN_00e48924 (wait/bwait/waitb/rolling). L'avatar mette il pet in jump2 (comando 2,
  FUN_00e26a08 -> FUN_00e48910 -> FUN_00e45814) e a fine colpi in battle_normal/battle_all
  (FUN_00e26e80 -> FUN_00e48730): i nostri LWF vuoti non mandavano mai «end» = attesa infinita.
  Correzione: `recon/tools/make_pet_motions.py` (chiamato da make_layouts.py) scrive 30 LWF
  NOSTRI (formato 0x121010 ricostruito) con STOP + EVENT «end_1» all'ultimo fotogramma (come
  atk2) per i 19 movimenti di cui FUN_00e44e84 gestisce la fine; wait/bwait/walk/run/win/waitb/
  rolling1-2/training sono cicli senza evento. Prima erano invisibili, ora animano le parti
  (vedi «Come si disegna il pet» sotto). Servono le risorse rigenerate (build-resources).
- **Come si disegna il pet** (decompilato 11 ottobre sera). Il LWF del movimento non ha grafica:
  FUN_00b3c350 lo carica, poi FUN_00b3c70c (vtable +0x4d8) registra con FUN_01220490 i gestori
  «load»/«enterFrame» dei movie il cui NOME DI ISTANZA e' uno dei 23 della tabella 0x1f32080
  (ac_mask, ac_hat1-4, ear_front1_am, ear_front2_am, ear_back_am, face_sp, ac_necklace1-3,
  left_front_leg, left_back_leg, right_front_leg, right_back_leg, bag_front, bag_back,
  body_main, tail_front, tail_back, ac_special, ac_mouth). Al «load» FUN_00b3ed40 carica e
  attacca nel movie (vtable +0x5c8 / attachLWF FUN_01230c68) `lwf/pet/part/%03d/<nome>/<nome>.lwf`
  con %03d = id % 1000 (se < 400000); «enterFrame» (FUN_00b3f3fc) lo riattacca se l'outfit
  cambia. Gli id: coordinato della sessione (pet +0x7c0 +0x24 = `userPetCoordinate`,
  FUN_00749af0 -> Pet FUN_00b38f10 -> FUN_00b397cc; campo -> parti in FUN_00b3a248):
  accessoryMask, accessoryHat (hat1-4), earPartsId (3 orecchie), facePartsId, accessoryNecklace
  (1-3), legPartsId (4 zampe), accessoryBackpack (bag_*), bodyPartsId, tailPartsId (2),
  accessorySpecial, accessoryMouth. Facoltativi: `body_sp` (+0x890, FUN_00b3f98c), `spt_shadow`
  (ombra che si rimpicciolisce col salto, FUN_00b3fb14/FUN_00b3fc94), `head_sp`, `pet_center`
  (dentro face_sp), `<parte>_top` (FUN_00b3d270), `spirit`. Posizioni/altezze extra dalle tabelle
  master 0xb (FUN_00b3ae70/FUN_00b3b940/FUN_00b3d7ec, NULL = valori di riposo). Il nodo lo muove
  il codice (jump2 FUN_00e45814 salta accanto all'avatar) e lo gira con setScaleX +-1 come
  l'avatar; le parti 001 guardano a sinistra (avanti = -x). Nelle risorse c'e' solo la serie
  001 (9 parti, Kitstar rosa): niente `lwf/pet/motion`, niente accessori, niente ear_front2/
  tail_front/bag. `lwf/ability/hit_effect` ha solo eff_0001/eff_0002 (names_v4 e names_addnl).
- **Pet visibile** (11 ottobre sera, da provare al banco): `make_pet_motions.py` scrive ogni
  movimento come radice con 9 movie vuoti chiamati come le parti di 001 (solo quelle: nessun
  load verso file assenti) e una posa per fotogramma (PLACE al primo, MOVEM dopo; stringhe,
  istanze, eventi e linkage in ordine alfabetico come negli originali): respiro in wait/bwait,
  zampe in walk/run, saltello in jump*/win/recovery_skill, capriola in rolling*, balzo con
  testata in avanti di 80 in battle_normal (colpo al fotogramma 10 di 24), salto con giro e
  tonfo in battle_all (14 di 26), scatto lungo con capriola in battle_skill (12 di 28).
  `pet_eff_0001-0003` ora sono visibili: scintilla a 4 punte + scia (0001), anello + stella
  (0002), anello + scia + stella dorate (0003), texture disegnate nel codice (BTF tipo 8
  premoltiplicato, nome che comincia col nome del LWF), 11-15 fotogrammi. `server/pet.js` manda
  ear/face/leg/body/tailPartsId = 1 se non scelti (con 0 il percorso e' .../000/..., assente).
  Verificato con un lettore nostro (fuori dal repo): i LWF si rileggono, le parti si attaccano per
  nome di istanza e gli eventi cadono nei fotogrammi previsti.
- **Crash della home con il pet visibile** (banco 11-10 notte, -Quick + -Pet, id parti 1: due
  crash di fila dopo /system/push/regist, SIGSEGV a 0xf0 in FUN_01232c34 durante nativeRender).
  FUN_01232c34 / FUN_01232c94 = Movie::getX / getY (movie +0xf0 = blocco delle proprieta': +0x44
  flag, +0x18/+0x1c x/y). La home costruisce il ritratto del pet (FUN_00b40234: Pet FUN_00b38f10
  + wait, poi FUN_00b4030c in una render texture) centrato sulla testa FUN_00b3e2c4 =
  getX/getY(head_sp, pet +0x898) + getX/getY(pet_center, +0x8a0), che controlla SOLO +0x8a0.
  +0x8a0 lo scrive il «load» di pet_center (FUN_00b3f350/FUN_00b3f8f0), registrato sul LWF della
  parte face_sp appena questa si carica (FUN_00b3ed40, indice 8); +0x898 solo il «load» di un
  movie chiamato `head_sp` (FUN_00b3fdfc), che il nostro scheletro non aveva -> NULL. Con id 0 il
  muso non si caricava e +0x8a0 restava 0. Nella classe Pet solo FUN_00b3e2c4 legge +0x898
  (scansione di ldr #0x890/#0x898/#0x8a0); +0x890 (body_sp) e' sempre controllato; FUN_00b3c350
  azzera +0x890..+0x8a0 a ogni cambio di movimento. Correzione: `head_sp` vuoto a profondita' 0
  (si carica prima di face_sp) con la stessa matrice del muso in tutti i 30 movimenti. Ripiego
  senza ricostruire: `KHUX_PET_PARTS=0` sul server = id 0, pet invisibile come prima (movimenti
  con gli eventi e pet_eff visibili restano).
- **Medaglia del 6° slot in battaglia** (banco 11 ottobre: «non fa nulla»). Il turno c'e' gia':
  MedalDeck::setup FUN_00b0b398 riceve da AvatarActor::setupMedalDeck FUN_00e27de8 il flag
  «PetActor presente» (avatar +0x530) e chiama FUN_00b0ba14: trova il deck del keyblade della
  battaglia (FUN_00b13204: `startStageData.userKeybladeId`, sessione +0xd30+0x10 -> userDeckId;
  FUN_00b0beb0 nella tabella userDecks, sessione +0x1f8), prende `petBaseSlotMedal` (deck +0x40)
  e lo aggiunge DOPO le medaglie del deck (indice +0x420 + +0x424, salvato in +0x42c; medaglia
  non trovata -> master 1 come gli slot vuoti). Nessun altro campo del server: niente rango,
  `petSubslot` o `openSkillIds`. Il moltiplicatore (FUN_00b0d95c modo 1 -> FUN_00722320) e'
  `pet.petSubslot.magnification` (pet +0x7c0 -> +0x38 -> +0x74; x1 con medalId 1). Il contatore
  dei turni (FUN_00e64660: tutti gli slot meno quello di supporto) lo conta: 4/4 al banco con 3
  medaglie (screenshots\pet2_*.png); la ruota (CarouselDeck FUN_00ae2d30 -> FUN_00ae6dc4, fino a
  7 celle, +0x4d4 = cella del pet) ne mostra due alla volta. (FUN_00b0bb98 + FUN_007228e8 sono
  invece lo slot del supporto, `supportUsers` di /stage/start: oggi [] quindi assente.)
- Al turno del pet (FUN_00b0ef5c: turno +0x438 == +0x42c) l'avatar resta fermo e attacca il pet:
  FUN_00e26e80 -> FUN_00e48730 battle_normal (7) o battle_all (8). Il danno viene SOLO dagli
  eventi del LWF del movimento, come per l'avatar (lwf/avatar/motion/atk2: «knockback_2» +
  «effectStart_1» nello stesso fotogramma, poi «end_1»): dispatcher FUN_00870a68 (gestori dalla
  base +0x330, registrati da FUN_00ac9c1c) -> «effectStart» FUN_00accc2c = 1 nella coda +0x818,
  «knockback_N» FUN_00acb428 = 2/3 nelle code +0x818 e +0x7e8. La sequenza FUN_00b5a338 (stato
  0x14) legge la coda del pet con FUN_00e26f7c -> FUN_00e45334 e con 1 crea il colpo
  FUN_00afe8f0, effetto FUN_00e27224 -> FUN_00e489a4 = 0xb/0xc/0xd (pet in battle_normal/all/
  skill) -> `lwf/ability/hit_effect/pet_eff_0001..0003` (codice - 10). I nostri LWF avevano solo
  «end»: il turno passava senza colpo. Correzione (`make_pet_motions.py`): «knockback_2» +
  «effectStart_1» nel fotogramma d'impatto di battle_normal/battle_all/battle_skill e tre
  `pet_eff_000N` NOSTRI (FUN_00b26928 restituisce NULL se il file manca e FUN_00afe8f0 non
  controlla: crash; FUN_00aff1e4 chiude l'effetto all'ultimo fotogramma di _root). Banco 11-10
  sera: il colpo arriva al 4° turno, senza grafica (poi resa visibile, vedi sopra). Se il colpo
  non arriva: l'aggiornamento del pet FUN_00e44c68 scarta dalla coda gli eventi diversi da
  «end» quando avatar +0x540 != 1 (FUN_00e227f8), prima che la sequenza li legga.
- **Chi si muove nel turno del 6° slot** (FUN_00e26e80, tipo d'attacco avatar +0x668): 1
  (singolo) / 2 (tutti) con FUN_00b0ef5c vero -> il PET gioca battle_normal / battle_all
  (FUN_00e48730) e l'avatar resta fermo; 3 (speciale) -> sempre l'avatar (FUN_00aced60 0x3e),
  anche nel turno del pet. Nell'originale (video 2017, `reference\pet\NOTE.md` §9) la speciale
  della medaglia nello slot Spirit la fa l'avatar con il suo cut-in e la sua animazione, con
  l'etichetta arancione «SPIRIT» a sinistra; il Blast (Trick) e' il pet che si rannicchia e
  scatta sul nemico con una scia dorata e una raffica di stelle. In FUN_00e26a08 i comandi 0/1
  nel turno del pet chiamano FUN_00e48398 (deathblow_normal2 + movimento) / FUN_00e483ec
  (deathblow_normal_after2, il pet torna accanto all'avatar).
- Trick in battaglia: FUN_00e2790c -> FUN_00e461bc mette ogni `petSubslot.openSkillIds` nel posto
  `invokeType` (riga petSkill +0x2dc; 4 = per skillValue3 0..5 -> posti 0/11..15, tabella
  0x188a950) dei 16 del PetActor (+0x388 + 0x48*i), +0x850 = 1. Posti: 1 alla morte di un nemico
  (FUN_00e26764 -> recovery_skill), 3 Blast (FUN_00e47914, FUN_00e47b2c: battle_skill al posto
  del segnale 0x3e dell'avatar, FUN_00e270e0), 6 HP Recovery (FUN_00e47720), 7-9 potenziamenti
  (FUN_00e46e7c), 10 Combo (FUN_00e47d7c: skillValue2/10000, poi FUN_00e48144 -> rolling1 e
  +0x8f8 = 2), 11-15 Steal per tipo di drop (FUN_00e46a64). La nostra petSkill ha invokeType 1
  per tutti: `server/pet.js` manda `openSkillIds` [] salvo `KHUX_PET_SKILLS=1` (pet che segue e
  basta) finche' la mappa trick -> posto/valori non e' verificata.

<a id="presents"></a>
## Presents ed Equipment

- Presents: `PresentBOXScene.json` con `CenterUI`/`LeftUI` vuoti, `PresentBOX_Base_ver400`/
  `_Panel_ver131`/`_IconPanel_ver131` copie dei `dark_PresentBOX_*`, testi 103500002/3/13 e
  106250103/4 (`reference\presents`). Cornici viola di Dark Road da sostituire con le texture blu
  (ISSUES I-035).
- Equipment (`DeckEditScene`, init `FUN_00bfd960`): serve `GET /keyblade/subslot` (vedi
  [server.md](server.md#catena)).
