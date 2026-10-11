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
  senza controllo: nel pacchetto ci sono LWF vuoti per le 30 animazioni e i 74 id NPC di
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
  `PetInfoAnim.ExportJson` e tutte le `lwf/pet/part`. Widget cercati da createLayout: Pet_LvUp,
  Panel_img, Button_A/B (Txt_A/B), PowerUp_Button, PetSkill_Button, PetTraing, PetTraing_But,
  PetTraing_ChargButton, PetTraing_Slot, Txt_TotalTitle, TotalNum_Label, Txt_MonthTitle,
  MonthNum_Label, Txt_PetSkill, Txt_Training, Txt_TrainingCharg, Icon_New, Txt_PowerUP, Txt_Time,
  Pet_Info (Txt_Pet_Name, Txt_Pet_Rank, Txt_Pet_Rank_Num, Txt_5), Pop_MedalForm,
  Pop_PetSkill_Info, PetInfo_Medal, Area_Arrow1/2, AtlasLabel_EXP, Close_Button, Dummy, MedalArea,
  Win_under. Non ancora generato: i figli di PetInfo_Medal/Pet_LvUp vanno ricavati dalle lambda.
  Finche' manca, `Button_PowerUp` di Equipment e l'icona pet della home vanno in crash.
- Con `isFinished` 1 a fase 995 la home creava il pet (`lwf/pet/motion/...`) e andava in crash in
  `FUN_011fa128`: risolto con i LWF vuoti.

<a id="presents"></a>
## Presents ed Equipment

- Presents: `PresentBOXScene.json` con `CenterUI`/`LeftUI` vuoti, `PresentBOX_Base_ver400`/
  `_Panel_ver131`/`_IconPanel_ver131` copie dei `dark_PresentBOX_*`, testi 103500002/3/13 e
  106250103/4 (`reference\presents`). Cornici viola di Dark Road da sostituire con le texture blu
  (ISSUES I-035).
- Equipment (`DeckEditScene`, init `FUN_00bfd960`): serve `GET /keyblade/subslot` (vedi
  [server.md](server.md#catena)).
