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
  Presents, Equipment ok; Beginner's Guide si apre vuota (e' una WebView sull'URL `beginnersGuide`
  del login, ora `/web/beginner`: [missioni-schede](#missioni-schede)); gli altri risolti dopo. Mai provati:
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

Crash senza richieste al server (banco 14-10, SIGSEGV a indirizzo 0 dentro libhoudini, stessa
firma per i tre casi): layout non serviti, caricati senza controllo (come Emblem_Base, I-123).
Nomi presi dalle stringhe citate dai caricatori (`func_strings.py`, `widget_lookup.py`); tutti
assenti da names_v4, addnl e stage_gen. Aggiunti gli originali JP 4.3.1 a `jp_coco_layouts.txt`
(gli originali hanno tutti i widget cercati):
- **Transfer Unions** (I-107), causa vera (banco 14-10, registri ARM di `armtrace\stackcap.ps1`,
  `dumps\armtrace\transfer`): «Transfer Unions» e' il **cambio di Union**, non il trasferimento
  dell'account. x24 = `cocostudio/publish/Union_Popup2.json`; catena dalla pila: Other
  `FUN_009fa11c` -> `FUN_00ac5a1c`/`FUN_00ac6aec` -> `FUN_00d0131c` (carica Union_Popup2) ->
  GUIReader `FUN_011b0704` -> `FUN_011b1c6c` su nodo nullo (file assente; servite solo
  Union_Popup1/3). Importato l'originale JP 4.3.1 (Button_Close, Button_OK/Txt_OK, Txt_Cancel,
  Txt_Wording1/2, Txt_10Line_Label_0_1; testi 103700002 «You can transfer to a different Union.»,
  103700004 «Proceed?»). Dopo OK il client chiedera' il cambio al server (azione da vedere).
  Le copie `MenuDialog_account_select*` qui sotto restano: servono al percorso del backup
  dell'account, che non e' questo pulsante.
- Transfer Unions, prima ipotesi (sbagliata per questo pulsante): il primo import (`Information2_TakeoverCheck.json`, di
  `SceneTakeOver::init` `FUN_00d80be0`) non bastava, il crash restava identico. Il pulsante passa
  da `OtherMenuDialog::openBackupPopup`, la cui callback ($_91, `FUN_00a0d0bc`, tipo risolto dalla
  vtable 0x1dfdbd0) con esito vero apre la scelta dell'account `FUN_009f7014`
  (`MenuDialog_account_select_ver401.json`; conferma `FUN_009f7a6c`,
  `MenuDialog_account_select_ok_cancel_ver401.json`; anche `SceneTakeOver::openBackupPopup`
  `FUN_00d82788`). Il codice prende la variante `dark_` solo col flag Dark Road (`FUN_0084f290`
  +0x1a9), altrimenti quella senza prefisso, assente da ogni risorsa e anche dal JP. Ora
  `make_layouts.py` le copia dalle `dark_` servite (estratte con `res_get.py` in
  `layouts\orig`) con le cornici KHUX; i pulsanti Apple / SQEX Bridge (texture assenti, non
  9-slice) restano senza immagine come nel dark.
- **Legal Information** (I-109): `OtherMenuDialog::openLegalPopup` `FUN_009edf64` (da
  `FUN_009fa928`) carica `Legal.json` (Close_Button, UserAgreementButton, Txt_Legal1,
  LicenseButton, Txt_Legal3); funziona (banco 14-10). I due pulsanti aprono la WebView
  `FUN_006f1f6c`: UserAgreementButton ($_23 `FUN_009fca90`, titolo testo 104040001) sull'URL a
  +0x78 dei link di `/system/login` (`agreement`, sesta stringa da 0x18 byte), LicenseButton ($_24
  `FUN_009fce5c`, testo 104040003) su +0x90 (`license`). Vuoti = WebView bianca: pagine nostre in
  `server/legal-pages.js` (condizioni del server di restauro; licenze dei componenti open source
  le cui stringhe sono nella libreria: cocos2d-x, LWF, curl, OpenSSL, zlib, libpng, ogg/vorbis,
  Photon, RapidJSON, TinyXML-2, FreeType, Chipmunk2D).
- **Shop > Increase Storage** (I-100): popup del limite delle medaglie `FUN_00ac0618`
  (`PopupNormal_MedalPossessed1_ver350.json`: Txt_UpperLimit1/2, Txt_CrownPossessed, barra
  MaterialStock_bar con Button_stock_down/up, Button_OK, Button_Close) e conferma `FUN_00ac1bdc`
  (`PopupNormal_MedalPossessed2.json`: Txt_UpperLimit_before/after). La richiesta d'acquisto al
  server (dopo OK) non e' ancora gestita. Sul banco «Current capacity: 2248» copriva «(Max: 3000
  slots)»: nel JP le due etichette (aree 310 e 230, 240..550 e 489..719) si toccavano gia' e i
  testi WW sono piu' lunghi. Opzione nuova `set=Widget.opzione=valore` di `jp_coco_layouts.txt`
  (import_jp_coco.py): etichette ai lati (x -310 / 310, aree 330 / 280, 170..500 e 510..790),
  font 24.
Prova a secco (14-10): pacchetto 81,6% della riserva, indice = installato: basta un `-Quick`.
- Party (Other e banner «Party Search» della home) e Rankings: crash e «200 ERROR :133» spiegati in
  [server](server.md#party-ranking) (layout `PartyTopScene_ver131` e `Ranking*` assenti dalle risorse
  WW, `GET /ranking/lux` non gestita; 14-10).

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
- **Passive Effects** (`Button_Passive`/`Txt_Passive` della pagina 1 `AvatarInfo_Txt_ver340`, a
  (372,88) di 960x640 = tocco `778,932`; testo 106220502; creato da `FUN_008f3f40`, lambda
  `FUN_008f8454`, I-086). **Non e' una WebView**: al tocco (evento 2) spegne i pulsanti e manda
  `PUT /passive/list` (249, `FUN_007dc8a0`) con `isList` 1 e `userId` solo se il profilo non e' il
  proprio (byte +0x3a8, id in +0x3a0); la callback `FUN_008f86a4` con la risposta valida apre
  `PassiveDialog::open` (`FUN_00a862ec`) = layout originale `Passive_Base_ver341` (Close_Button,
  Panel_TotalSwitch/Txt_TotalSwitch Total/Individual, Button_Update, Scroll_Area, Txt_None,
  Txt_PassiveInfo, Total_Area/Total_Score_01..15) con celle `Passive_Panel` (Panel_Passive,
  Icon_New, Txt_Passive_Label -> `Xml_Maximum` creato dal codice, `FUN_00a85d84`); profilo altrui:
  totali da +0xad8 (`FUN_0076b5c8`). Layout e immagini sono tutti nelle risorse servite, il server
  rispondeva gia' (`keyblade-evo.js` `respondPassiveList`, I-065): niente build-resources. Solo il
  pulsante «Passive Effects» DENTRO il dialog (`Button_PassiveInfo`) apre la pagina web
  `/web/passive` (gia' in http). Aggiunto: con `userId` nel corpo la risposta lo rimanda (lista
  propria se e' 1, altrimenti vuota), altrimenti il dialog di un altro profilo leggerebbe +0xad8
  vuota. Originale: `reference\passive_effects\` (screenshot iOS del 2019 dal Profilo, vista Total
  con 15 caselle; khuxwiki 3.4.3 «Active Passives can now be verified through the Profile
  screen»). Col salvataggio del banco (1 passiva, 301350) ci si aspetta la vista Total con una
  casella STR per tipo di medaglia diversa da +0 e, in Individual, una riga. Da provare al banco.
- **Boosters** (`Button_Emblem`/`Txt_Emblem` della pagina 1, `FUN_008f3f40`; testo 106120211; I-123).
  Gli emblemi sono i Booster degli eventi (khuxwiki: premi delle bacheche, «+25%», scadenza). Al
  tocco `PUT /emblem/list` (188, parser `FUN_00797a84`: `emblemIds[]` in +0x860 della sessione,
  +0x870 per un profilo altrui); il server risponde dallo schema (`emblemIds: []`, «[?]» nel log),
  poi `FUN_00a84370` carica **`Emblem_Base.json`** e la lista `EmblemScrollView` (`FUN_00a83564`,
  init `FUN_00a836a4`) carica sempre **`Emblem_Panel.json`** come cella: **entrambi assenti** da ogni
  risorsa WW (`catalog\missing_layouts.txt`) -> GUIReader null -> crash (log del 14-10: #148
  `/user/profile`, #149 `PUT /emblem/list`, poi riavvio #150). Correzione: originali JP in
  `jp_coco_layouts.txt` (titolo disegnato «BOOST» in inglese, `MyEmblem_Title`; `MyEmblem_Panel1-4`
  da JP, Win22/Panel04/But_Close serviti). Nomi cercati: Emblem_Base `Close_Button`, `Scroll_Area`,
  `Txt_None` (106120213 «No current boosters.», visibile con lista vuota); cella (`FUN_00a838f0`)
  `Emblem_Base` (controllato), `Icon_New` (controllato), `Txt_Emblem_Name_Label`,
  `Area_Ticker_Emblem_Name`, `mask`, `Panel_Emblem` (+ `PresentBOX_IconPanel_ver131`, icona tipo
  0x22 `img/ui/emblem/Emblem_%d.png`, `Base` nascosto), `Txt_Emblem_Detail_Label`,
  `Txt_Storage_Date_Label`, `Txt_Storage_Date_Title` (106120212 «Expires»): tutti nell'originale.
  Con `emblemIds` vuoto non si crea nessuna cella. Da provare al banco dopo il prossimo build.
- Da fare: Outfits (`Button_D`), pagina 2 (`Button_Change`), frecce ‹ › (non
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

<a id="missioni-schede"></a>
### Schede Daily / Weekly / Beginner / Limited (14 ottobre, offline)

- **La scheda la decide solo il client, dal master.** `FUN_00a8bda8` crea la mappa
  categoria -> id (chiavi fisse 1-4, oggetto +0x3b8), testi `Txt_Tab` (+0x3d0: 106120117 Beginner,
  118 Daily, 119 Weekly, 120 Limited) e l'ordine degli stati (+0x3f8). `FUN_00a8d8b0` svuota le
  liste, scorre la mappa delle missioni della risposta (stato di gioco `FUN_007c1dfc()+0x880`,
  riempita dal parser `FUN_00797eb8`), legge la riga del master (`FUN_00f1734c`) e mette l'id nella
  lista di `missionType` (+4); altri valori ignorati. `FUN_00a8c100` crea `tab1..tabN` solo per le
  categorie non vuote (lambda `PTR_FUN_01f0e748` con indice scheda +0x10 e categoria +0x14).
- Tocco su una scheda (`FUN_00a93b30`, operator() della lambda): se l'indice cambia, salva i «visti»
  della scheda vecchia (`FUN_00a90ce4`, solo categoria 2), scrive +0x3ec = indice e +0x3f0 =
  categoria e chiama `FUN_00a8de54(this, categoria)` (w1 = categoria, verificato nel disassemblato):
  copia la lista della categoria nella tabella (`+0x910`), `FUN_00875e10`/`FUN_00876d10`, contatore
  (`FUN_00a8cf50`), `FUN_00875f2c(list, 0)` ridisegna tutte le celle visibili (vfunc +0x688),
  `Mask_Area` visibile solo con categoria 3 e senza party (+0x3a1). All'apertura (`FUN_00a8ad3c`)
  stessa copia per la scheda iniziale (`FUN_00a8cc18`).
- Quindi con il master attuale (2001-2010 missionType 2, 3001-3010 missionType 3) Daily e Weekly
  sono per forza liste diverse; il server manda tutte le righe in un solo `missions[]`. Sul banco del
  13-10 (`screenshots\r34_daily.png` / `r34_weekly.png`) infatti erano diverse. «Stessa lista» del
  14-10: non riprodotto offline; sospetto le linguette, che nelle schermate sembrano uguali accese e
  spente (`MyMission_Category_On/_Off` di `make_textures.py`), da guardare sul banco.
- Tempi: Daily = conto alla rovescia del client fino a `startDate + k*86400` (`FUN_00a90e28`), quindi
  il server azzera allo stesso istante (ora di `startDate`, 08:00 UTC); Weekly = il client mostra
  `endDate` (2099, «28719 days left»), il server azzera ogni `startDate + k*7 giorni` (lunedi' 08:00
  UTC). La guida dell'utente dice 9:00 ora italiana per entrambe: con l'ora del server (maggio 2021,
  CEST) sarebbe 07:00 UTC. **Modifica al master da coordinare (non fatta)**: ora di `startDate`
  07:00 se si vuole il 9:00 estivo; per un conto alla rovescia settimanale vero, `endDate` delle
  settimanali = prossimo azzeramento, rigenerato ogni settimana (nuova revisione).
- Beginner (missionType 1) e Limited (4): nessuna riga nel master, quindi le schede non compaiono.
  Il server ora le gestisce se arrivano: righe 1-4 attive (`startDate <= ora < endDate`), periodo
  senza azzeramento per 1 e 4, `beginnerLimitTime` = primo elenco (`player.beginnerSince`) +
  `KHUX_BEGINNER_DAYS` (30, ipotesi), null senza righe Beginner (il client lo usa solo per
  l'etichetta delle missionType 1). Aggiungerle = nuove righe del master (khuxwiki: 34 Beginner) e
  bump di revisione.
- `GET /user/mission` (azione 187, all'ingresso della home) **non e' la finestra Missioni**: parser
  `FUN_007976d8` (per la 187 solo `id`; `day`/`isFinish` solo per la 183 `/user/mission/update`),
  salvato in `FUN_007c1dfc()+0x830`; letto da `FUN_00749df4`, `FUN_0074b22c` (riga di un'altra
  tabella via `FUN_00f16978`, campi +0x908..+0x914: stage e intervallo), `FUN_0074be08`. `id` 0 =
  nessuna; il server risponde `{id: 0, day: 0, isFinish: false}` (`respondUserMission`).
- **Beginner's Guide della home = WebView**, non missioni: `FUN_00bd9f18` (lambda della home) apre
  `FUN_006f1f6c(titolo 106210101, url)` con l'URL `beginnersGuide` dei link di `/system/login`
  (`FUN_00791070`, oggetto +0x210, salvato in `FUN_007c1dfc()+0x390` da `FUN_007c2adc`). Con la
  stringa vuota la finestra restava vuota. Ora punta a `http://.../web/beginner`
  (`respondBeginnerPage`: missioni Daily/Weekly dal master con premi e orari, come `/web/passive`).
  `/user/mission/list` non parte da li': l'unico chiamante di `FUN_00804434` e' `FUN_00a8a8d8`
  (finestra Missioni, dalla lambda della pergamena `FUN_00ba3930`). Da provare sul banco.

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
- **Sotto-schermate del dialog SPIRIT** (I-082, 12 ottobre, da provare al banco). Generate in
  `make_layouts.py` (funzioni `pet_*`), nomi e tipi dal decompilato:
  - **Name** (`Button_A` -> FUN_00921df8 -> FUN_009144c4): `PetInfo_Rename_ver230` = popup Nome
    del Profilo offline (`Offline_AvatarInfo_Comment`): `Txt_Name`, TextField `Txt_Name_Label`
    (sostituito dal campo vero, FUN_006e467c), `Txt_Limit1`, `Txt_Caution`, `Button_Close`/
    `Txt_Cancel` (annulla, FUN_00925138), `Button_Ok`/`Txt_OK` (FUN_00924cb4: nome vuoto ->
    102300003, poi `POST /pet/name` FUN_00801e80, gia' servito).
  - **Tricks** (`PetSkill_Button` -> FUN_0092284c -> FUN_009158bc su `Pop_PetSkill_Info`): il codice
    cerca `PetSkill_Info` (dettaglio, nascosto: mancava = crash) e `PetSkill_List > Area`/`Txt`. La
    lista (FUN_00a7fa94, init FUN_00a7fbe4) = `openSkillIds` della riga **petRank del rango**
    (FUN_00915da4), non quelli del server; celle `PetInfo_PetSkill_Panel_ver230` 304x68 messe a
    (152, 0): `PetSkill_Panel` (ImageView: il pulsante «But13» creato da FUN_00a7fdbc vi carica
    `img/ui/But13_Off.png` con loadTexture, copia di But16 in COPIES), `Txt_PetSkill`, `Icon_New`;
    `SkillButton` NON va nel layout. Tocco su un trick (FUN_009257d4): `PetSkill_Info` con
    `Txt_PetSkill_Title`, `Txt_Efficacy_Title` (106110901), `Txt_Efficacy`, `Txt_Trigger_Title`
    (106110902), `Txt_Trigger`; ritoccarlo lo chiude.
  - **Spirit Training**: azioni 243 `GET /pet/expedition` (parser FUN_007abd68: `openMedalSlotDatas[]`
    {`openMedalSlotNumber` 1-4, `openMedalSlotLimitDatetime`}, `limitDateimeWeekEnd`,
    `limitDateimeMonthEnd`, `remainingDrawCount`, tutti obbligatori), 244 `POST /pet/expedition`
    {userMedalIds} (`userMedals` + `medalResumption {userShuffleSkills[], resumptionStatus}`, poi
    `GET /pet/profile`), 245 `PUT /pet/expedition/recover` {stoneNum} (solo ret). Prima la rotta
    generica rispondeva a 243 con lo schema di 244: parser fallito. `server/pet.js`
    `respondExpedition`: slot 1 sempre aperto (FUN_00aa9db4), 2..`KHUX_PET_TRAIN_SLOTS` aperti
    fino a fine mese, attesa `KHUX_PET_TRAIN_HOURS` (20) in `recoverDatetime`, contatori
    `expeditionTotalNum/MonthlyNum` in `player.pet.training`, `recoverStoneNum` =
    `KHUX_PET_TRAIN_STONES` (0, non scalati); nessuno Spirit Trait (userShuffleSkills []).
    **server.js deve smistare il kind `petexpedition`** (riga da aggiungere accanto alle altre
    del pet: `if (kind === 'petexpedition') return pet().respondExpedition(res, req.method,
    entry.bodyDecoded, req.url.split('?')[0]);`), finche' manca resta la risposta generica.
    «Train» -> 243 -> `PetInfo_TrainingEdit_ver320` (FUN_0091766c): `Win_under` (Button_Sort >
    Txt_Sort, Txt_Sort_Label, Txt_Filter_On, Scroll_Area, Txt_Possession, Txt_Cost/Slash/CostMax_Label),
    `Win2A`, `Close_Button`, `Button_Training > Txt_Training` (106200426), `Arrow01`, `MedalArea`
    con lo `PetTrainingSlotView` (FUN_00aa8798): `Medal1..4`, `MedalLock_Panel1..4 > Txt_Caution`,
    `Period_NamePanel1..4 > Txt_Period`. «Training Slots» -> 243 ->
    `PetInfo_TrainingSlotCheck_ver320` (FUN_0091c834: `MedalArea`, `Win_under`, `Close_Button`).
    «Train Now» in attesa -> `PetInfo_TrainingRestartPop_ver320` (FUN_0091b824: `Txt_Wording`
    (CustomRichText `Xml_Txt_Wording` creato dal codice), `Txt_CrownPossessed(_Label)`, `Txt_Time`,
    `Button_Close/Txt_Cancel`, `Button_Ok/Txt_Ok`). Testi 106240102 e 106270102 assenti ovunque
    (slot bloccati): nostri in `TEXTS`. Lo slot view aggiunge `cocostudio/publish/PetInfoAnim.ExportJson`
    (assente) con addArmatureFileInfo: non trovata la creazione dell'armatura, da vedere al banco.
    Dopo 244 il client chiede /pet/profile e aggiorna il dialog (FUN_009299d0 -> FUN_0090e540).
  - **Outfits** (`Button_B`): scena `PetEditScene_ver230` (ScenePetPartsEdit, init FUN_00e01c44),
    gemella di `AvatarEditScene_ver131`: nodi `CenterUI_Left` (tab1..tab6 con `Txt_Tab` 106110401-406
    e pulsante «Av_Make_Win_But», `Area` = lista FUN_00a7ddc4 di `PetEdit_Panel_ver230` 298x122,
    `Txt_NoPet` 106110409), `CenterUI_Right` (`KB_On`, `Avatar2`, `Pet`, `Pet2`; `Set_ChangeBut_New`
    facoltativo e omesso: carica `PetChangeBut_*.png` assenti), `Decision` (`Button_PetSave`/
    `Txt_PetSave`, `Button_Remove`/`Txt_Remove`), `MyCoordinate` (`Box_Num` <- img/ui/Av_Box_Num%d,
    `Button_Switch`). Save -> 173 -> `PetEdit_Check2_ver230` (`Win_04` > `Txt_Wording` 106110410
    «Style saved!», `Pet`). `Button_Switch` scorre gli outfit 1..6 su una lista fatta dai
    coordinati di 172 con myCoordinateNo 1..6 (FUN_00e03b74): oltre la lista = out_of_range, quindi
    `/pet/coordinate/all` manda sempre i 6. Parti: `userPetParts` [] -> lista vuota, «There are no
    Spirit parts.»; le icone `img/petParts/pi%d.png` non esistono.
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
- Protocollo dei Presents (14-10-2026, da provare sul banco; `server.js` `respondUserPresent`/
  `respondPresentReceive`, salvataggio `player.presents[]`):
  - `GET /user/present` = azione 20 (`assets431\json\server_api.json`), nessun parametro (`m=1&i=1`
    e' l'involucro di tutte le GET). Ramo `0x7c3848` di `FUN_007c3204` -> parser `FUN_007781bc`,
    tutto obbligatorio: `userPresent {userPresentDatas[], presentCount, presentCountMax,
    stonePresentCount, stonePresentCountMax}` (int). Elemento `FUN_00777f80`: `userPresentId`
    uint64, `resourceType`/`resourceId`/`number` int, `limitDatetime` data, `comment` stringa,
    `created` data. Uguale a `UserPresent::parse`/`Present::init` della 1.0.1 con simboli
    (thethiny, `0x4A61E4`/`0x4A6014`), che pero' non aveva i due contatori `stone*`.
    La lista sta nella sessione `+0x228` (righe da 0x48 byte, flag «riscosso» a +0x40).
  - Scena `FUN_00d0b350` (`PresentBOX_Base_ver400`): mette tutte le righe nella scroll view;
    `presentCount`/`presentCountMax` (+0x40/+0x44) accanto a «Other» (106250104),
    `stonePresentCount`/`stonePresentCountMax` (+0x48/+0x4c) accanto a «Jewels» (106250103).
    Il server conta come «Jewels» i tipi 1/2, il resto come «Other», massimo 200 per entrambi
    (il massimo dei jewel e' una scelta nostra).
  - `resourceType`: tipi di `SceneUtil::setItemImageData` (1.0.1 `0x46C71C`): 1/2 Jewel, 3 medaglia,
    4 Munny, 5 materiale, 6 Friend Point, 10 Raid Points, 11 Lux, 13 keyblade, 14-17 premi,
    18-20/23 parti avatar, 25 sphere, 26 Skip Ticket. Il server riscuote 1/2, 3, 4, 5, 11, 13, 14
    (`grantItem`, ora anche 11 = `player.lux`).
  - `POST /user/present/receive` = azione 49, costruttore `FUN_007eda9c`: `{receivePresentIds:
    [uint64]}` (Collect e Collect All; la 1.0.1: `executeUserPresentReceive` `0x4CD080`).
    Ramo `0x7cad14`, tutto obbligatorio: `userData.userPoint`, `userMaterials`, `userMedals`,
    `userSkills`, `userKeyblades`, `userDecks`, `userAvatarParts`, `userTitles`, `pet`, `emblemIds`,
    sub-slot, liste del Burst (come `/user/mission/receive`), poi `lastUserPresentIds` [uint64] =
    regali RIMASTI: il client segna riscossi (`FUN_00778858`) quelli della sua lista assenti
    (`0x7d0fd0`). `userStone` non lo legge piu' (la 1.0.1 si'): il server lo manda lo stesso.
  - `/mypage` `userPresentCount` = regali validi (badge del pulsante). Scaduti (`limitDatetime`
    passato, ora del server) tolti a ogni lettura.
  - Prova: `KHUX_TEST_PRESENTS=1` aggiunge 6 regali (300 jewel «Daily Login Bonus Reward», 1000
    Lux, 5000 Munny, 6 Avatar Coin, Dewey 90041, 3 Mythril Shard; scadenza +29 giorni) quando
    nella scatola non ne resta nessuno di prova (`test: true`).
- Equipment (`DeckEditScene`, init `FUN_00bfd960`): serve `GET /keyblade/subslot` (vedi
  [server.md](server.md#catena)).

<a id="keyblade-tutti"></a>
## Tutti i keyblade: possesso, Level Up, evoluzione (I-087)

- 16 serie nel master (rev. 95, 576 righe = 36 livelli +0..+35 ciascuna, `make-keyblade-levels.js`),
  come la khuxwiki (`reference\keyblades\keyblade_levels.json`). Fonti: Starlight iniziale; premio
  di prima vittoria nel master solo per Treasure Trove (Q14, stage 1110), Lady Luck (Q24, 1210),
  Three Wishes (Q34, 1310), Olympia (Q130, 4100), Divine Rose (Q433, 15080). Le altre 10 nel gioco
  originale venivano dalla Proud Mode (Sleeping Lion Q3, Counterpoint Q103, Fenrir Q203, Darkgnaw
  Q328, Missing Ache Q378, Diamond Dust Q428), dalle Moogle Quest (Moogle O' Glory) e da quest oltre
  la 525 (Stroke of Midnight Q595, Fairy Stars Q683, Bad Guy Breaker Q880): nessuna e' nel master.
- Salvataggio del 12-10: Starlight +0, Treasure Trove +35, Lady Luck +0, Olympia +0. Mancava Three
  Wishes con lo stage 1310 superato (il recupero dei premi girava solo con `player.keyblades`
  assente) e le 10 senza fonte.
- `server.js` `grantMissingKeyblades` (all'avvio con giocatore creato e a `/user/create`): premi
  gia' ricevuti (riparazione), serie senza premio nel master (`KHUX_KB_UNOBTAINABLE=0` le spegne),
  con `KHUX_KB_ALL=1` anche quelle della storia non ancora raggiunte (Divine Rose). Un keyblade per
  serie, mai doppioni; deck nuovi a zeri lunghi quanto gli slot (5 per i keyblade Proud e BGB).
  Sul salvataggio attuale: userKeybladeId 5 Three Wishes, 6..15 Moogle O' Glory .. Bad Guy Breaker.
- `node server\test-keyblades.js`: catene evolveId +0..+35 senza salti ne' cicli, slot e gauge mai
  in calo, materiali = khuxwiki post 2.6.0 e presenti in `material`, Strengthen di ogni serie fino a
  +35 (materiali tolti esatti, nessun munny: la khuxwiki non ne ha, 3 cambi di design = 3
  animazioni `KeyBlade_Evolution`, nessun passo oltre +35 ne' senza materiali), userKeyblades/
  userDecks coerenti, 120 sub-slot, 16 passive di +35, gauge tagliata al massimo della riga.
- Bad Guy Breaker +4/+9/+14/+19/+24/+29/+30: nell'originale solo Trophy NI/CS/CK (assenti da
  `material`): riga con `validNeedMaterial` 0, il passo e' gratis. Da vedere sul banco come la
  finestra KEYBLADE mostra un passo senza materiali.

### Sblocco alla missione (12 ottobre, offline)

- Fonti: khuxwiki (`D:\Progetto_Restauro_KH_UX\wiki\wiki_all.json`: pagina del keyblade «obtained
  by completing ...» e campo `nakeyblade`/`proudnakeyblade` della pagina della quest), guida
  dell'utente (`reference\guida_basi\Guida alle basi KHUX.pdf`, «Keyblade - Come ottenerli»: tutte
  tranne Bad Guy Breaker, venuto dopo). Concordano.

| Keyblade | Missione originale | Nel master (rev. 98) | Come lo da' il server |
|---|---|---|---|
| Starlight | iniziale | initItem | iniziale (userKeybladeId 1) |
| Treasure Trove | Quest 14 The Mine Pt. 2 | stage 1110, clearGetItem 13 = 2000 | primo `/stage/clear` |
| Lady Luck | Quest 24 Escorting Alice Pt. 2 | stage 1210, 3000 | primo `/stage/clear` |
| Three Wishes | Quest 34 The Search for the Red Bandit Pt. 5 | stage 1310, 4000 | primo `/stage/clear` |
| Olympia | Quest 130 Preliminary Final Round | stage 4100, 5000 | primo `/stage/clear` |
| Divine Rose | Quest 433 The West Wing Pt. 6 | stage 15080, 6000 | primo `/stage/clear` |
| Moogle O' Glory | Special Quest «A New Keyblade: Moogle O' Glory» | assente | `grantMissingKeyblades` |
| Sleeping Lion | Proud Quest 3 Combat 102 | stage 1016 solo normale, nessun premio | `grantMissingKeyblades` |
| Counterpoint | Proud Quest 103 | stage 3220 solo normale | `grantMissingKeyblades` |
| Fenrir | Proud Quest 203 | stage 7030 solo normale | `grantMissingKeyblades` |
| Darkgnaw | Proud Quest 328 | stage 11280 solo normale | `grantMissingKeyblades` |
| Missing Ache | Proud Quest 378 | stage 13030 solo normale | `grantMissingKeyblades` |
| Diamond Dust | Proud Quest 428 | stage 15030 solo normale | `grantMissingKeyblades` |
| Stroke of Midnight | Quest 595 | assente (storia fino alla 525) | `grantMissingKeyblades` |
| Fairy Stars | Quest 683 | assente | `grantMissingKeyblades` |
| Bad Guy Breaker | Quest 880 | assente | `grantMissingKeyblades` |

- Server: `respondStageClear` -> con il primo completamento (`stageId` assente da
  `player.stageScores`) e `validClearGetItem` > 0, `grantItem` di ogni `clearGetItemType`; il tipo 13
  va in `grantKeyblade` (una copia per serie). La risposta porta `firstClearFlag` 1 e gli elenchi
  completi `userKeyblades`/`userDecks`/`userKeybladeSubslots` con il keyblade nuovo (deck a zeri
  lunghi quanto gli slot). Nessun premio keyblade negli obiettivi (`submissionRewardType` 13: zero
  righe). `grantMissingKeyblades` all'avvio da' solo le serie che nessuno stage premia, piu' i premi
  gia' ricevuti mancanti (riparazione): le 5 della storia mai prima del completamento (salvo
  `KHUX_KB_ALL=1`, solo per prove; in quel caso al completamento il popup compare ma niente doppione).
- Client (Ghidra, `FUN_00c52f88`, scena dei risultati di uno stage normale): la lista dei premi
  `+0x448` si riempie con le voci di tipo 13 da (a) le righe `reward` di nemici e forzieri
  (`FUN_00c54494`), (b) gli obiettivi nuovi, cioe' `clearMissionIds` della risposta non gia' compiuti
  (`FUN_00e7fb80`), con `submissionRewardType/ItemId/ItemNum` della riga di stage, (c) se
  `firstClearFlag` (byte +0 della risposta di `/stage/clear`, parser `FUN_007817a0`) e' 1, i
  `clearGetItemType/Id/Num` della riga (`validClearGetItem` voci). `FUN_00c546f8` tiene solo il tipo
  13; per ogni voce `FUN_00c50910` -> `FUN_00c50e74` apre il popup `BattleResult_KB` (`FUN_00c5261c`:
  immagine `KeyBlade_%06d`, nome, «Set Medals in your new Keyblade!», etichetta «Quest Completion
  Reward» 103010011/12 per il completamento, 103010001/02 per gli obiettivi). Nessun filmato e nessun
  campo «nuovo keyblade»: il popup dipende solo da `firstClearFlag` e dalla tabella stage; il
  keyblade vero e' quello di `userKeyblades`.
- `node server\test-keyblade-unlock.js`: giocatore nuovo (`/user/create`), poi `/stage/clear` di
  ogni missione: keyblade giusto una volta sola, popup simulato x1, seconda volta e obiettivi senza
  niente, Proud in normale senza niente, riavvio senza doppioni, riparazione di Three Wishes.
- Banco (salvataggio 12-10: 1110/1210/1310/4100 gia' superati, 15080 no, Divine Rose assente):
  `server\save\smoke.json` = {"stageId": 15080}, relogin, giocare The West Wing Pt. 6 -> RESULTS ->
  popup Divine Rose -> Equipment con Divine Rose (3 slot vuoti).

<a id="notices-album"></a>
## Notices e Album (menu Other, I-104/I-105; 14-10, offline)

- **Notices**: il pulsante (FUN_009f8d84, evento 2) manda POST /system/information/list/151203
  (azione 31, costruttore FUN_007eedec); parser FUN_00778f88: popUpViewUrl = array di stringhe,
  obbligatorio. Il ramo del dispatcher ( x7c3c78) mette il vettore nella sessione +0x3c0; la callback
  FUN_009f8ed4 legge il primo elemento senza controlli e apre la WebView FUN_006f1f6c (titolo testo
  0x5ff08d2) sull'URL con i parametri di sessione aggiunti da FUN_006ec8d4. Con la risposta generica
  il vettore era nullo: SIGSEGV a  x9f9010 (banco 14-10, 	mp\repro\notices). Serve almeno un URL.
- **Notizie al login** (come l'originale): la stessa azione 31 parte dalla home (FUN_00c36108 ->
  FUN_00de63ac, callback FUN_00de7b30); FUN_00de6908 mostra in sequenza una WebView per ogni
  elemento di popUpViewUrl (il primo con i parametri di sessione). Con un solo URL la pagina delle
  notizie si apre a ogni ingresso nella home (894 richieste 31 nel log: il client la chiede sempre).
- GET /system/information/list (azione 30, parser FUN_00778eac): iewUrl stringa; non vista
  sul banco, stessa pagina.
- Layout della WebView (FUN_006f20a4): Information2_Base.json, o dark_Information2_Base.json se
  il flag +0x1a9 di FUN_0084f290 e' acceso (la Beginner's Guide si apre: probabilmente oggi vale il dark, da verificare).
  Information2_Base non e' servito: l'originale JP (uguale a quello dell'IPA WW 4.4.0, stesse
  texture) e' in jp_coco_layouts.txt.
- Pagina nostra /web/notices (server/routes-info-album.js): elenco come
  eference\other_menu\notices_list_yt_02.jpg (data, etichetta colorata EVENT/CAMPAIGN/UPDATE/
  IMPORTANT/INFORMATION, titolo, freccia rossa), dettaglio come 
otices_detail_yt_03.jpg (titoletti
  col quadratino, BACK). Notizie del restauro (server privato, Supernova e Dual Meow Wow, grafiche dei
  nemici, buff degli speciali, missioni), nessuna notizia originale inventata.
- **Album**: GET /user/album/161102 (azione 17, costruttore FUN_007def64, parser FUN_00777110):
  userAlbum {lbumMedals[] {medalId uint, guiltStatus uint letto come byte}, llMedalCount
  int}, tutto obbligatorio (risposta generica = risultato nullo, SIGSEGV a 0x170, 	mp\repro\album).
  Scena AlbumScene_ver130 -> Album_Base_ver130 (FUN_00d05cb8: Win_Bottom, Txt_MedalGet*,
  Txt_MedalComp*, Scroll_Area, Txt_Challenge, Button_Challenge), cella Album_Medal_ver140
  (FUN_00897d90): medaglia posseduta = in lbumMedals, altrimenti Medal_S_0 e «?» in
  Txt_Medal_Label; icona AlbumGuilt_1/2/3 per guiltStatus 0/1/2, solo se userDetail.isGuilt e il
  tier della medaglia (+0x4c0) non e' 0. Sfide: Album_Challenge_ver112 (FUN_00d07fa0), pannello
  FUN_00a2f61c (crea Set_Reward da Album_Reward_Set_ver112 se manca), premi FUN_00a30f90,
  ricevuta FUN_00a2ffe4; POST /user/album/challenge/update (azione 168) non ancora servito.
- Nessun layout dell'Album e' servito nel WW: gli originali JP sono in jp_coco_layouts.txt (prova
  --check: 7 radici ok). La cella JP non ha Txt_Medal_Label, che il codice WW usa senza controllo:
  nuova opzione clone=Txt_Medal_Num_Label>Txt_Medal_Label@Medal_S di import_jp_coco.py (copia del
  widget, tag nuovo, alla posizione di Medal_S).
- guiltStatus nostro (i valori originali non sono noti): 0 = nessuna copia con Special Attack Bonus,
  1 = almeno una, 2 = una copia al bonus massimo del tier (GUILT_RANGES di medal-guilt.js).
  llMedalCount = righe della tabella medal tranne la medaglia 1 (originale: «Medals 1837/1930»,
  eference\album\album_yt_01.jpg).
