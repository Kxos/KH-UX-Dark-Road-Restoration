# Home, menu, Profilo, Missioni, pet

Storia: [../journal/fino-al-2026-10-11.md](../journal/fino-al-2026-10-11.md). Tocchi in
[banco.md](banco.md#tocchi).

<a id="home"></a>
## Home

- Sfondo (`[fn]`): solo dalle parti di `mypageBackground` (`validParts`, `partsId`,
  `dataType` 1 = `lwf/home/<id>/<id>.png`, 2 = `.lwf`, 3 = `img/home/<id>/<id>.plist`, posizioni,
  `zSort`); senza la riga del `backgroundId` crash. `make-game-tables.js` genera una riga per ogni
  sfondo con grafica (`lwf/home/{2..6,99,150911}`).
- Con tutorial finito la home crea pet e NPC: `[fn]`/`[fn]` caricano
  `lwf/pet/motion/<30 nomi>` e `lwf/character/npc/<id>/wait/wait.lwf` (`[fn]`, NULL se manca)
  senza controllo: nel pacchetto ci sono LWF vuoti per le 30 animazioni (ora LWF nostri con
  «end», `make_pet_motions.py`, vedi [pet](#pet)) e i 74 id NPC di
  `img/stage_npc/npc_rule.bin` (tranne 4001). Quindi Chirithy (NPC 999) era invisibile (ISSUES I-016).
- 16-10: `import_jp_coco.py` importa le animazioni originali JP 4.3.1 degli NPC (`lwf/character/npc/<id>/wait`):
  37 su 93 (Chirithy compreso), quelli con tutte le parti o a cui manca solo l'ombra 97x24 (uguale a
  `4001/wait_7.png` servita dal WW, letta dalle risorse 7). Agli altri 52 la copia di thethiny toglie parti
  (forse i file uguali): restano vuoti. Nuvoletta `MyPage_ChirishiBaloon` JP con `fontName` WW
  (`DFPSoGei-W5.TTF`): col calligrafico JP il «!» usciva «/». Banco: Chirithy e nuvoletta ok (`chir_tap2`).
- Senza party, toccando la piazza (16-10): Rankings + Party Search; con il bonus del primo party non riscosso
  (`userParty.flagFirstReward` 0) anche il banner «Join a party and earn Jewels!» (`MyPage_JewelGet_Big_ver240`).
  Segnaposto originali in `MyPageScene_ver340` (dentro RightUI x 350): JewelGet_Big -189/430, Rank_Solo1 -345/450
  (col banner), Rank_Solo2 86/470 (senza), RightUI_Solo 302/470 (Party Search). Rankings copre il bordo sinistro del
  banner gia' nei dati originali: si lascia (decisione dell'utente, I-097).
- Bolla dei membri del party in home (16-10, banco): il pulsante con le due frecce cambia il valore mostrato
  (Quest Progress, Weekly Lux, Raid Support, PVE Ranking, PVP Ranking) da `partyUserList` di `/party/member/list`.
  Quest Progress = `lastStageId` mostrato com'e' (numero della quest, non lo stageId: con lo stageId «Quest 5020»):
  ora la storia (id 1-525) piu' avanzata superata (`lastStoryStageId`, «Quest 132»). Weekly Lux = `userRanking.lux`:
  prima i Lux totali, ora `player.weeklyLux` {period, lux} (settimana delle missioni settimanali, sommato a ogni
  /stage/clear). Raid Support `raidHelpNumber` 0, PVE/PVP «---» (`userColosseumRanking`/`userPvpRanking` 0): giusti
  finche' raid, Colosseum e PvP non ci sono.
- Tocco sulla piazza (`SceneMyPage::init` $_10 -> `[fn]` -> `[fn]`): chi non e' in
  party (`userParty.isJoin` 0) vede Chirithy con la nuvoletta `MyPage_ChirishiBaloon.json`
  (`Txt_Name`, testo 101000022, «Join a party and make new friends!»), generata da
  `MyPage_AvatarBaloon_ver240`.
- Fumetto bianco sopra l'avatar (ISSUES I-071): `MyPage_MpBaloon.json` (Panel_1 > Balloon >
  `Txt_Comment_Label`), due copie `avatarFukidashi_0/1` create da `[fn]`. L'azione casuale
  dell'avatar `[fn]` (10% dei casi) ci scrive il **messaggio del Profilo**: per il proprio
  avatar `userData.user.comment` (record utente della sessione +0xd8, campo +0x3c, 0x101 byte), per
  gli altri quello del loro record; nessun controllo sul vuoto. Con `comment` "" il fumetto
  compariva vuoto. Il server ora manda `DEFAULT_COMMENT` («Nice to meet you!», o
  `KHUX_DEFAULT_COMMENT`) quando il messaggio salvato e' vuoto. Negli originali li' c'era il
  messaggio dei giocatori (`reference\home_bubble\`). Non c'entra con la nuvoletta rossa di
  Chirithy qui sopra. Da provare sul banco.
- `GET /mypage` (azione 59, parser `[fn]`) ha ora la sua rotta (`respondMyPage`):
  stessi campi dello schema (`backgroundId` 150911). `adminMypageTexts[]` {type, priority, text}
  resta vuoto: forse e' la striscia scorrevole sotto la barra in alto (originale «Tap the face icon
  to customize your avatar. Tap the screen to view party members' progress.»), ma il lettore
  non e' trovato; da provare con `KHUX_MYPAGE_TICKER=1` (type da `KHUX_MYPAGE_TICKER_TYPE`, 1).
- Mappatura dei pulsanti (`sweep.ps1`, 9 ottobre): Quests, Shop, Chat («You need to be in a party»),
  Presents, Equipment ok; Beginner's Guide si apre vuota (e' una WebView sull'URL `beginnersGuide`
  del login, ora `/web/beginner`: [missioni-schede](#missioni-schede)); gli altri risolti dopo. Mai provati:
  Beginner's Guide (contenuto), Shop jewel, frecce ‹ ›, pulsanti di Other, Share della medaglia, titolo
  (Restore Resources, Save User Data, x3 [ex tres], KHDR START) (ISSUES I-018).
- Schermata Quests (`SceneAdventureSelect`, `[fn]`): `lastClearStageId` confrontato con
  `misc` 106 (130) per il Colosseum; pulsanti STORY, Special (missione 6), Events (14), Union Cross
  (24), Colosseum (130).

<a id="other"></a>
## Menu Other

`MenuDialog_ver300` da `MenuDialog_ver150` originale (`other_menu` in `make_layouts.py`): il codice
scrive i testi e nasconde Support/Transfer/Movie; `TwitterButton` nascosto (cercato da
`[fn]`). Pulsanti mai provati.

Crash senza richieste al server (banco 14-10, SIGSEGV a indirizzo 0 dentro libhoudini, stessa
firma per i tre casi): layout non serviti, caricati senza controllo (come Emblem_Base, I-123).
Nomi presi dalle stringhe citate dai caricatori (`func_strings.py`, `widget_lookup.py`); tutti
assenti da names_v4, addnl e stage_gen. Aggiunti gli originali JP 4.3.1 a `jp_coco_layouts.txt`
(gli originali hanno tutti i widget cercati):
- **Transfer Unions** (I-107), causa vera (banco 14-10, registri ARM di `armtrace\stackcap.ps1`,
  `dumps\armtrace\transfer`): «Transfer Unions» e' il **cambio di Union**, non il trasferimento
  dell'account. x24 = `cocostudio/publish/Union_Popup2.json`; catena dalla pila: Other
  `[fn]` -> `[fn]`/`[fn]` -> `[fn]` (carica Union_Popup2) ->
  GUIReader `[fn]` -> `[fn]` su nodo nullo (file assente; servite solo
  Union_Popup1/3). Importato l'originale JP 4.3.1 (Button_Close, Button_OK/Txt_OK, Txt_Cancel,
  Txt_Wording1/2, Txt_10Line_Label_0_1; testi 103700002 «You can transfer to a different Union.»,
  103700004 «Proceed?»). Dopo OK: schermata «Select a new Union.» (la Union attuale scurita), conferma
  «Spend 100 Jewels to transfer to <Union>?», poi `POST /union/change` {unionId} (azione 74, stesso ramo
  0x7c3a68 della 71: solo `userData.userDetail`) e `GET /user/stone`; «Transfer complete.» e ritorno alla home.
  Server: `respondUnionChange` (-100 jewel, `player.unionId`; senza risposta «200 ERROR :74»). Provato il 15-10:
  Unicornus -> Leopardus, stemma nuovo nel Profilo, jewel 2660 -> 2560.
  Le copie `MenuDialog_account_select*` qui sotto restano: servono al percorso del backup
  dell'account, che non e' questo pulsante.
- Transfer Unions, prima ipotesi (sbagliata per questo pulsante): il primo import (`Information2_TakeoverCheck.json`, di
  `SceneTakeOver::init` `[fn]`) non bastava, il crash restava identico. Il pulsante passa
  da `OtherMenuDialog::openBackupPopup`, la cui callback ($_91, `[fn]`, tipo risolto dalla
  vtable 0x1dfdbd0) con esito vero apre la scelta dell'account `[fn]`
  (`MenuDialog_account_select_ver401.json`; conferma `[fn]`,
  `MenuDialog_account_select_ok_cancel_ver401.json`; anche `SceneTakeOver::openBackupPopup`
  `[fn]`). Il codice prende la variante `dark_` solo col flag Dark Road (`[fn]`
  +0x1a9), altrimenti quella senza prefisso, assente da ogni risorsa e anche dal JP. Ora
  `make_layouts.py` le copia dalle `dark_` servite (estratte con `res_get.py` in
  `layouts\orig`) con le cornici KHUX; i pulsanti Apple / SQEX Bridge (texture assenti, non
  9-slice) restano senza immagine come nel dark.
- **Legal Information** (I-109): `OtherMenuDialog::openLegalPopup` `[fn]` (da
  `[fn]`) carica `Legal.json` (Close_Button, UserAgreementButton, Txt_Legal1,
  LicenseButton, Txt_Legal3); funziona (banco 14-10). I due pulsanti aprono la WebView
  `[fn]`: UserAgreementButton ($_23 `[fn]`, titolo testo 104040001) sull'URL a
  +0x78 dei link di `/system/login` (`agreement`, sesta stringa da 0x18 byte), LicenseButton ($_24
  `[fn]`, testo 104040003) su +0x90 (`license`). Vuoti = WebView bianca: pagine nostre in
  `server/legal-pages.js` (condizioni del server di restauro; licenze dei componenti open source
  le cui stringhe sono nella libreria: cocos2d-x, LWF, curl, OpenSSL, zlib, libpng, ogg/vorbis,
  Photon, RapidJSON, TinyXML-2, FreeType, Chipmunk2D).
- **Shop > Increase Storage** (I-100): popup del limite delle medaglie `[fn]`
  (`PopupNormal_MedalPossessed1_ver350.json`: Txt_UpperLimit1/2, Txt_CrownPossessed, barra
  MaterialStock_bar con Button_stock_down/up, Button_OK, Button_Close) e conferma `[fn]`
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

- Si apre toccando l'avatar della home: `AvatarInfoDialog::open` `[fn]` (scena nascosta +
  `GET /user/profile`, azione 5, parser `[fn]`), poi `createLayout` `[fn]`.
  Riferimenti `reference\profile\` (video 7-R0jhyzlso del 2017: profile_06, _11 Titles, _13
  Name/Message, _16 Play Style).
- Layout generati: scena `AvatarInfoScene_A_ver131` (UnderUI = Titles/Name/Message/Play
  Style/Outfits = `Button_A..D`; LeftUI/RightUI = frecce), `AvatarInfo_Oneself_ver131` (cornice),
  `AvatarInfo_User_ver260` (`[fn]`: `RankTitle_Board`/`RankTitle_Name`, `Base_User` con
  `Union_Symbol` e `My_Name`, `Txt_Party`/`Party_Name`, `MVP_Crown`/`MVP_Trophy`; `[fn]`:
  `FaceBook_PhotoPanel`/`FaceBook_Photo`), pagina 1 = `AvatarInfo_Txt_ver340` (originale, 6 texture
  disegnate in `make_textures.py`), pagina 2 = `AvatarInfo_Txt2` (`[fn]`),
  `TresCommu_CommunicationUser/Other` vuoti.
- Server: titolo di default Budding Newbie (con `titleLeft/Right/PlateId` 0 crash in `[fn]`),
  keyblade iniziale `isFavorite` 1 (senza, crash in `[fn]`), `img/union/Union_%02d` e
  `Union_L_*`.
- Titles (`Button_A`, `[fn]`): copia di `Offline_AvatarTitle_Base`; `GET /user/title` (18)
  elenca i titoli di categoria 1 + `player.titles`; `POST /user/title/update` {titleLeftId,
  titleRightId, titlePlateId} (41).
- Name/Message (`Button_B`, `[fn]`): da `Offline_AvatarInfo_Comment`; `POST /user/update`
  {name, comment} (38). **Il messaggio parte vuoto**: `[fn]` sostituisce il TextField
  `Txt_Comment_Label` con il campo vero e la callback `[fn]` copia il testo solo a fine
  modifica; con `adb input text` (anche con Invio o Indietro) il client manda `comment: ""` (l'EditBox
  nativo non riceve il testo): da riprovare con una tastiera vera (ISSUES I-015). Variante U13 se
  l'eta' (da `GET /user/birthday`, azione 9, AAAAMM, mai chiesta) e' <= 12.
- Play Style (`Button_C`, `[fn]`): CheckBox `But16` (con Button crash in `[fn]`);
  `POST /user/playstyle/update` {playTimezones, playFrequently} (40).
- **Passive Effects** (`Button_Passive`/`Txt_Passive` della pagina 1 `AvatarInfo_Txt_ver340`, a
  (372,88) di 960x640 = tocco `778,932`; testo 106220502; creato da `[fn]`, lambda
  `[fn]`, I-086). **Non e' una WebView**: al tocco (evento 2) spegne i pulsanti e manda
  `PUT /passive/list` (249, `[fn]`) con `isList` 1 e `userId` solo se il profilo non e' il
  proprio (byte +0x3a8, id in +0x3a0); la callback `[fn]` con la risposta valida apre
  `PassiveDialog::open` (`[fn]`) = layout originale `Passive_Base_ver341` (Close_Button,
  Panel_TotalSwitch/Txt_TotalSwitch Total/Individual, Button_Update, Scroll_Area, Txt_None,
  Txt_PassiveInfo, Total_Area/Total_Score_01..15) con celle `Passive_Panel` (Panel_Passive,
  Icon_New, Txt_Passive_Label -> `Xml_Maximum` creato dal codice, `[fn]`); profilo altrui:
  totali da +0xad8 (`[fn]`). Layout e immagini sono tutti nelle risorse servite, il server
  rispondeva gia' (`keyblade-evo.js` `respondPassiveList`, I-065): niente build-resources. Solo il
  pulsante «Passive Effects» DENTRO il dialog (`Button_PassiveInfo`) apre la pagina web
  `/web/passive` (gia' in http). Aggiunto: con `userId` nel corpo la risposta lo rimanda (lista
  propria se e' 1, altrimenti vuota), altrimenti il dialog di un altro profilo leggerebbe +0xad8
  vuota. Originale: `reference\passive_effects\` (screenshot iOS del 2019 dal Profilo, vista Total
  con 15 caselle; khuxwiki 3.4.3 «Active Passives can now be verified through the Profile
  screen»). Col salvataggio del banco (1 passiva, 301350) ci si aspetta la vista Total con una
  casella STR per tipo di medaglia diversa da +0 e, in Individual, una riga. Da provare al banco.
- **Boosters** (`Button_Emblem`/`Txt_Emblem` della pagina 1, `[fn]`; testo 106120211; I-123).
  Gli emblemi sono i Booster degli eventi (khuxwiki: premi delle bacheche, «+25%», scadenza). Al
  tocco `PUT /emblem/list` (188, parser `[fn]`: `emblemIds[]` in +0x860 della sessione,
  +0x870 per un profilo altrui); il server risponde dallo schema (`emblemIds: []`, «[?]» nel log),
  poi `[fn]` carica **`Emblem_Base.json`** e la lista `EmblemScrollView` (`[fn]`,
  init `[fn]`) carica sempre **`Emblem_Panel.json`** come cella: **entrambi assenti** da ogni
  risorsa WW (`catalog\missing_layouts.txt`) -> GUIReader null -> crash (log del 14-10: #148
  `/user/profile`, #149 `PUT /emblem/list`, poi riavvio #150). Correzione: originali JP in
  `jp_coco_layouts.txt` (titolo disegnato «BOOST» in inglese, `MyEmblem_Title`; `MyEmblem_Panel1-4`
  da JP, Win22/Panel04/But_Close serviti). Nomi cercati: Emblem_Base `Close_Button`, `Scroll_Area`,
  `Txt_None` (106120213 «No current boosters.», visibile con lista vuota); cella (`[fn]`)
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
  `[fn]`/`[fn]`), riga `MyPageMission_Panel` e `PresentBOX_IconPanel_ver131`
  ricostruiti con i widget KHUX; `ChallengeButton`/`ReceiveButton` li crea il codice (non metterli nel
  layout). Righe alte 144 (cella del codice 148, contenuto +44), barra come quella LUX
  (`Gage_LUX_Base` + `Gage_LUX_Tip`), timbro `World_Stage_Clear` («COMPLETE») sulle righe riscosse.
- Dati: `server/tables/mission.json` (20 missioni: 10 giornaliere 30 jewel, 10 settimanali di party
  100 jewel; agente in `stage_gen\missions\NOTE.md`). `GET /user/mission/list` (189, `[fn]`)
  -> `missions[]` {id, status 0/1/2, numUpper, numLower} **solo con id del master** (altrimenti crash),
  `beginnerLimitTime`; `POST /user/mission/receive` {receiveMissionIds} -> userData + missions +
  inventario. Contatori per periodo in `player.missions` (giorno: ora di startDate, 08:00 UTC);
  contano quest e Lux, non ancora Raid/PVP/Union Cross (ISSUES I-014). Provato sul banco (Collect
  All: Jewel 3000 -> 3060).
- Aspetto da `reference\other_menu\missions_list_01.jpg`: schede 176x50 sopra la finestra; il codice
  (`[fn]`) carica `img/ui/MyMission_Category_On/_Off/_Disable.png` sulle tab e
  `img/ui/MyMission_GroupIcon1/2.png` (1 = personali/Limited, 2 = party) in `GroupIcon`, tutte
  generate in `make_textures.py`. `Mask_Area` (avviso «Join a party» delle settimanali) deve coprire
  solo l'elenco: stesa sulla finestra mangiava i tocchi delle schede (Daily morta dopo Weekly, I-058).

<a id="missioni-schede"></a>
### Schede Daily / Weekly / Beginner / Limited (14 ottobre, offline)

- **La scheda la decide solo il client, dal master.** `[fn]` crea la mappa
  categoria -> id (chiavi fisse 1-4, oggetto +0x3b8), testi `Txt_Tab` (+0x3d0: 106120117 Beginner,
  118 Daily, 119 Weekly, 120 Limited) e l'ordine degli stati (+0x3f8). `[fn]` svuota le
  liste, scorre la mappa delle missioni della risposta (stato di gioco `[fn]()+0x880`,
  riempita dal parser `[fn]`), legge la riga del master (`[fn]`) e mette l'id nella
  lista di `missionType` (+4); altri valori ignorati. `[fn]` crea `tab1..tabN` solo per le
  categorie non vuote (lambda `PTR_[fn]` con indice scheda +0x10 e categoria +0x14).
- Tocco su una scheda (`[fn]`, operator() della lambda): se l'indice cambia, salva i «visti»
  della scheda vecchia (`[fn]`, solo categoria 2), scrive +0x3ec = indice e +0x3f0 =
  categoria e chiama `[fn](this, categoria)` (w1 = categoria, verificato nel disassemblato):
  copia la lista della categoria nella tabella (`+0x910`), `[fn]`/`[fn]`, contatore
  (`[fn]`), `[fn](list, 0)` ridisegna tutte le celle visibili (vfunc +0x688),
  `Mask_Area` visibile solo con categoria 3 e senza party (+0x3a1). All'apertura (`[fn]`)
  stessa copia per la scheda iniziale (`[fn]`).
- Quindi con il master attuale (2001-2010 missionType 2, 3001-3010 missionType 3) Daily e Weekly
  sono per forza liste diverse; il server manda tutte le righe in un solo `missions[]`. Sul banco del
  13-10 (`screenshots\r34_daily.png` / `r34_weekly.png`) infatti erano diverse. «Stessa lista» del
  14-10: non riprodotto offline; sospetto le linguette, che nelle schermate sembrano uguali accese e
  spente (`MyMission_Category_On/_Off` di `make_textures.py`), da guardare sul banco.
- Tempi: Daily = conto alla rovescia del client fino a `startDate + k*86400` (`[fn]`), quindi
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
- **Beginner (15-10, I-118, provato sul banco)**: le 34 della khuxwiki («Mission», 2019; fonti e Limited in
  `reference\missionseginner_limited.md` e `limited_all_khuxwiki.tsv`), `server/make-beginner-missions.js` (righe
  1001-1034 in `tables/mission.json` e `master_data/mission.json`, master revisione 111). Scheda valida 30 giorni
  (avviso ufficiale «Introducing Missions!», 9-11-2017). conditionId originali ignoti: 30-44 (nessun effetto nel
  client), avanzamento calcolato dallo stato (`MISSION_DERIVED`: 30 storia, 31 STR del keyblade preferito, 32 livello
  della serie di keyblade, 33 Lux, 34 Special Attack Bonus al massimo) o contatore 3 (Raid Boss); 35-44 (draw, quest
  speciali, eventi, Nova, Spirit, Proud, Coliseum, Union Cross) restano a 0. Premio «Skip Ticket+» = tipo 26 (il
  client scrive «Skip Ticket», icona del jewel: immagine da cercare), `player.stageSkipTicket`. Banco: 12/34 complete
  sul salvataggio di prova, Collect All -> +1000 jewel e «All rewards have been collected.». Limited non aggiunte
  (tutte legate a date 2017-2021: da decidere).
- `GET /user/mission` (azione 187, all'ingresso della home) **non e' la finestra Missioni**: parser
  `[fn]` (per la 187 solo `id`; `day`/`isFinish` solo per la 183 `/user/mission/update`),
  salvato in `[fn]()+0x830`; letto da `[fn]`, `[fn]` (riga di un'altra
  tabella via `[fn]`, campi +0x908..+0x914: stage e intervallo), `[fn]`. `id` 0 =
  nessuna; il server risponde `{id: 0, day: 0, isFinish: false}` (`respondUserMission`).
- **Beginner's Guide della home = WebView**, non missioni: `[fn]` (lambda della home) apre
  `[fn](titolo 106210101, url)` con l'URL `beginnersGuide` dei link di `/system/login`
  (`[fn]`, oggetto +0x210, salvato in `[fn]()+0x390` da `[fn]`). Con la
  stringa vuota la finestra restava vuota. Ora punta a `http://.../web/beginner`
  (`respondBeginnerPage`: missioni Daily/Weekly dal master con premi e orari, come `/web/passive`).
  `/user/mission/list` non parte da li': l'unico chiamante di `[fn]` e' `[fn]`
  (finestra Missioni, dalla lambda della pergamena `[fn]`). Da provare sul banco.

<a id="pet"></a>
## Pet («Spirit»)

- Riferimenti `D:\Progetto_Restauro_KH_UX\reference\pet\` (NOTE.md + 14 screenshot): sbloccato dopo
  la Story Quest 14, dialog con rango, 6 medaglie, Name/Outfits/Gear/Tricks.
- **6° slot = slot del pet** (verificato, `reference\pet\NOTE.md` §8): ogni deck ha 5 `deckMedals`
  ([fn], al massimo 5) + `petBaseSlotMedal` (uint64, deck +0x40); il revolver di Equipment
  crea 6 celle «Medal1..6» ([fn]). Il moltiplicatore della sesta cella = `partnerRate` del
  keyblade + `magnification` del pet ([fn] -> [fn] -> cella [fn] +0x498;
  in pet-mode la cella carica `img/ui/Minfo_Pet01.png`, assente come `Minfo_Def09`).
- Tutto si accende con `userData.userDetail.isPet` ([fn], byte +0x45). Con isPet 1:
  - avvio ([fn]): dopo `GET /user/option` (149) il client chiede `GET /pet/profile` (170),
    `GET /pet/coordinate/parts` (171), `GET /pet/coordinate/all` (172), poi prosegue;
  - Equipment ([fn] / DeckRevolverView [fn]): `DeckEdit_PetMedal_ver230` (c'e':
    cornice `DeckEdit_Pet1`, `Button_PowerUp` «スピリット強化» -> PetInfoDialog) in
    `Area_PetMedal`/`Area_RevolverPet`, e lettura SENZA controllo di pet(+0x7c0)->petSubslot(+0x38)
    ->magnification(+0x74): il pet della sessione deve esistere.
- L'oggetto pet della sessione (+0x7c0) nasce solo dall'azione 170, parser [fn], tutto
  obbligatorio: `pet.petSubslot` ([fn]: `subslotUserMedalIds` uint64 <= 6, `openSkillIds`
  <= 15, `rank`, `pt`, `magnification`), `pet.userPetCoordinate` (12 int, [fn]),
  `pet.petName`, `pet.userSkills`, `pet.userMedals`, `pet.initCoordinate` (0 = la scena PetEdit
  [fn] carica `Tutorial_Pet01.json`, assente: si manda 1) e sulla radice `recoverDatetime`,
  `recoverStoneNum`, `expeditionTotalNum`, `expeditionMonthlyNum` ([fn]).
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
- Dialog del pet (`PetInfoDialog`, open [fn], createLayout [fn]): mancano
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
  - **Name** (`Button_A` -> [fn] -> [fn]): `PetInfo_Rename_ver230` = popup Nome
    del Profilo offline (`Offline_AvatarInfo_Comment`): `Txt_Name`, TextField `Txt_Name_Label`
    (sostituito dal campo vero, [fn]), `Txt_Limit1`, `Txt_Caution`, `Button_Close`/
    `Txt_Cancel` (annulla, [fn]), `Button_Ok`/`Txt_OK` ([fn]: nome vuoto ->
    102300003, poi `POST /pet/name` [fn], gia' servito).
  - **Tricks** (`PetSkill_Button` -> [fn] -> [fn] su `Pop_PetSkill_Info`): il codice
    cerca `PetSkill_Info` (dettaglio, nascosto: mancava = crash) e `PetSkill_List > Area`/`Txt`. La
    lista ([fn], init [fn]) = `openSkillIds` della riga **petRank del rango**
    ([fn]), non quelli del server; celle `PetInfo_PetSkill_Panel_ver230` 304x68 messe a
    (152, 0): `PetSkill_Panel` (ImageView: il pulsante «But13» creato da [fn] vi carica
    `img/ui/But13_Off.png` con loadTexture, copia di But16 in COPIES), `Txt_PetSkill`, `Icon_New`;
    `SkillButton` NON va nel layout. Tocco su un trick ([fn]): `PetSkill_Info` con
    `Txt_PetSkill_Title`, `Txt_Efficacy_Title` (106110901), `Txt_Efficacy`, `Txt_Trigger_Title`
    (106110902), `Txt_Trigger`; ritoccarlo lo chiude.
  - **Spirit Training**: azioni 243 `GET /pet/expedition` (parser [fn]: `openMedalSlotDatas[]`
    {`openMedalSlotNumber` 1-4, `openMedalSlotLimitDatetime`}, `limitDateimeWeekEnd`,
    `limitDateimeMonthEnd`, `remainingDrawCount`, tutti obbligatori), 244 `POST /pet/expedition`
    {userMedalIds} (`userMedals` + `medalResumption {userShuffleSkills[], resumptionStatus}`, poi
    `GET /pet/profile`), 245 `PUT /pet/expedition/recover` {stoneNum} (solo ret). Prima la rotta
    generica rispondeva a 243 con lo schema di 244: parser fallito. `server/pet.js`
    `respondExpedition`: slot 1 sempre aperto ([fn]), 2..`KHUX_PET_TRAIN_SLOTS` aperti
    fino a fine mese, attesa `KHUX_PET_TRAIN_HOURS` (20) in `recoverDatetime`, contatori
    `expeditionTotalNum/MonthlyNum` in `player.pet.training`, `recoverStoneNum` =
    `KHUX_PET_TRAIN_STONES` (0, non scalati); nessuno Spirit Trait (userShuffleSkills []).
    **server.js deve smistare il kind `petexpedition`** (riga da aggiungere accanto alle altre
    del pet: `if (kind === 'petexpedition') return pet().respondExpedition(res, req.method,
    entry.bodyDecoded, req.url.split('?')[0]);`), finche' manca resta la risposta generica.
    «Train» -> 243 -> `PetInfo_TrainingEdit_ver320` ([fn]): `Win_under` (Button_Sort >
    Txt_Sort, Txt_Sort_Label, Txt_Filter_On, Scroll_Area, Txt_Possession, Txt_Cost/Slash/CostMax_Label),
    `Win2A`, `Close_Button`, `Button_Training > Txt_Training` (106200426), `Arrow01`, `MedalArea`
    con lo `PetTrainingSlotView` ([fn]): `Medal1..4`, `MedalLock_Panel1..4 > Txt_Caution`,
    `Period_NamePanel1..4 > Txt_Period`. «Training Slots» -> 243 ->
    `PetInfo_TrainingSlotCheck_ver320` ([fn]: `MedalArea`, `Win_under`, `Close_Button`).
    «Train Now» in attesa -> `PetInfo_TrainingRestartPop_ver320` ([fn]: `Txt_Wording`
    (CustomRichText `Xml_Txt_Wording` creato dal codice), `Txt_CrownPossessed(_Label)`, `Txt_Time`,
    `Button_Close/Txt_Cancel`, `Button_Ok/Txt_Ok`). Testi 106240102 e 106270102 assenti ovunque
    (slot bloccati): nostri in `TEXTS`. Lo slot view aggiunge `cocostudio/publish/PetInfoAnim.ExportJson`
    (assente) con addArmatureFileInfo: non trovata la creazione dell'armatura, da vedere al banco.
    Dopo 244 il client chiede /pet/profile e aggiorna il dialog ([fn] -> [fn]).
  - **Outfits** (`Button_B`): scena `PetEditScene_ver230` (ScenePetPartsEdit, init [fn]),
    gemella di `AvatarEditScene_ver131`: nodi `CenterUI_Left` (tab1..tab6 con `Txt_Tab` 106110401-406
    e pulsante «Av_Make_Win_But», `Area` = lista [fn] di `PetEdit_Panel_ver230` 298x122,
    `Txt_NoPet` 106110409), `CenterUI_Right` (`KB_On`, `Avatar2`, `Pet`, `Pet2`; `Set_ChangeBut_New`
    facoltativo e omesso: carica `PetChangeBut_*.png` assenti), `Decision` (`Button_PetSave`/
    `Txt_PetSave`, `Button_Remove`/`Txt_Remove`), `MyCoordinate` (`Box_Num` <- img/ui/Av_Box_Num%d,
    `Button_Switch`). Save -> 173 -> `PetEdit_Check2_ver230` (`Win_04` > `Txt_Wording` 106110410
    «Style saved!», `Pet`). `Button_Switch` scorre gli outfit 1..6 su una lista fatta dai
    coordinati di 172 con myCoordinateNo 1..6 ([fn]): oltre la lista = out_of_range, quindi
    `/pet/coordinate/all` manda sempre i 6. Parti: `userPetParts` [] -> lista vuota, «There are no
    Spirit parts.»; le icone `img/petParts/pi%d.png` non esistono.
- Con `isFinished` 1 a fase 995 la home creava il pet (`lwf/pet/motion/...`) e andava in crash in
  `[fn]`: risolto con i LWF vuoti.
- **Battaglia** (blocco del banco 11 ottobre, 1010 con `-Pet`: primo attacco, avatar fermo in
  posa, nemico immobile, AUTO e medaglie morti, nessun crash). Il PetActor nasce solo da
  `userDetail.isPet` ([fn] 0xb6d134, [fn] 0xb7fb78/0xb7fc44 -> avatar
  [fn] -> [fn], init [fn], update [fn]): nessun campo di
  `/stage/start` lo spegne. Il pet si muove con Pet::playMotion [fn] (tabella dei 30 nomi
  a 0x1f32138: 0 wait, 1 bwait, 7 battle_normal, 8 battle_all, 9 deathblow_normal, 0xb
  battle_skill, 0xc recovery_skill, 0xd jump2, 0x12-0x14 rolling1-3...; [fn] carica il
  LWF e gli aggancia il dispatcher [fn]) e cambia stato **solo sull'evento LWF «end»**
  ([fn] -> gestore +0x140 -> [fn] mette 4 nella coda +0x818; la consumano
  [fn] e [fn] -> [fn] -> [fn], che dopo 7/8/0xb/0xc/0xd/0x14-0x17
  torna a bwait e dopo 9/0xe lancia l'attacco del pet [fn]). La sequenza d'attacco
  [fn]: stato 0x14 aspetta [fn] = avatar fermo (0xb) **e** pet pronto
  ([fn]: bwait/recovery_skill/rolling1-3 o +0x851); 0x38/0x39 aspettano [fn] ->
  [fn] (wait/bwait/waitb/rolling). L'avatar mette il pet in jump2 (comando 2,
  [fn] -> [fn] -> [fn]) e a fine colpi in battle_normal/battle_all
  ([fn] -> [fn]): i nostri LWF vuoti non mandavano mai «end» = attesa infinita.
  Correzione: `recon/tools/make_pet_motions.py` (chiamato da make_layouts.py) scrive 30 LWF
  NOSTRI (formato 0x121010 ricostruito) con STOP + EVENT «end_1» all'ultimo fotogramma (come
  atk2) per i 19 movimenti di cui [fn] gestisce la fine; wait/bwait/walk/run/win/waitb/
  rolling1-2/training sono cicli senza evento. Prima erano invisibili, ora animano le parti
  (vedi «Come si disegna il pet» sotto). Servono le risorse rigenerate (build-resources).
- **Come si disegna il pet** (decompilato 11 ottobre sera). Il LWF del movimento non ha grafica:
  [fn] lo carica, poi [fn] (vtable +0x4d8) registra con [fn] i gestori
  «load»/«enterFrame» dei movie il cui NOME DI ISTANZA e' uno dei 23 della tabella 0x1f32080
  (ac_mask, ac_hat1-4, ear_front1_am, ear_front2_am, ear_back_am, face_sp, ac_necklace1-3,
  left_front_leg, left_back_leg, right_front_leg, right_back_leg, bag_front, bag_back,
  body_main, tail_front, tail_back, ac_special, ac_mouth). Al «load» [fn] carica e
  attacca nel movie (vtable +0x5c8 / attachLWF [fn]) `lwf/pet/part/%03d/<nome>/<nome>.lwf`
  con %03d = id % 1000 (se < 400000); «enterFrame» ([fn]) lo riattacca se l'outfit
  cambia. Gli id: coordinato della sessione (pet +0x7c0 +0x24 = `userPetCoordinate`,
  [fn] -> Pet [fn] -> [fn]; campo -> parti in [fn]):
  accessoryMask, accessoryHat (hat1-4), earPartsId (3 orecchie), facePartsId, accessoryNecklace
  (1-3), legPartsId (4 zampe), accessoryBackpack (bag_*), bodyPartsId, tailPartsId (2),
  accessorySpecial, accessoryMouth. Facoltativi: `body_sp` (+0x890, [fn]), `spt_shadow`
  (ombra che si rimpicciolisce col salto, [fn]/[fn]), `head_sp`, `pet_center`
  (dentro face_sp), `<parte>_top` ([fn]), `spirit`. Posizioni/altezze extra dalle tabelle
  master 0xb ([fn]/[fn]/[fn], NULL = valori di riposo). Il nodo lo muove
  il codice (jump2 [fn] salta accanto all'avatar) e lo gira con setScaleX +-1 come
  l'avatar; le parti 001 guardano a sinistra (avanti = -x). Nelle risorse c'e' solo la serie
  001 (9 parti, Kitstar rosa): niente `lwf/pet/motion`, niente accessori, niente ear_front2/
  tail_front/bag. `lwf/ability/hit_effect` ha solo eff_0001/eff_0002 (names_v4 e names_addnl).
- **Parti dello Spirit** (16 ottobre, banco OK): tabella `petParts` di 668 righe
  (`server/make-pet-parts.js` da `server/pet_parts.tsv`; nomi khuxwiki, metodo in
  `reference\pet\spirit_parts_names.md`). petPartsId 3TTNNN (serie NNN = specie+colore, cartella
  `lwf/pet/part/NNN`) o 4TTNNN (accessorio, cartella con l'id intero); TT = partsType = scheda
  dell'editor ([fn]: 4 Head, 3 Ears, 8 Body, 6 Legs, 9 Tail, 1/2/5/7/10/11 Accessories;
  combinationFlag 1 = esclusa). `userPetParts[]` = {petPartsId, partsType, getDatetime}
  ([fn]); possesso in `player.pet.parts`, serie 001 sempre, `-AllParts` per le prove;
  `grantPart` per i premi. Grafica e icone dal JP (`recon/tools/jp_pet_parts.py`, da
  import_jp_coco.py): 445 LWF che thethiny ha tenuto una volta sola si riprendono dalla serie
  gemella (stessa texture e dimensioni); 38 accessori senza texture nemmeno nel JP restano fuori
  (fra questi Starlight Bow/Glasses e quasi tutti i Balloon delle Limited). Anche **25 movimenti
  originali** `lwf/pet/motion` (wait, walk, battle_normal...: hanno i movie degli accessori; ombra
  97x24 = NPC_SHADOW) al posto dei nostri; restano generati battle_all, pvp_start/total_*,
  recovery_skill, rolling3 (texture di effetti assenti). `petPartsOffset` resta vuota (posizioni
  di riposo). `GET /pet/coordinate/members` (pet dei membri del party) non e' gestita.
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
  crash di fila dopo /system/push/regist, SIGSEGV a 0xf0 in [fn] durante nativeRender).
  [fn] / [fn] = Movie::getX / getY (movie +0xf0 = blocco delle proprieta': +0x44
  flag, +0x18/+0x1c x/y). La home costruisce il ritratto del pet ([fn]: Pet [fn]
  + wait, poi [fn] in una render texture) centrato sulla testa [fn] =
  getX/getY(head_sp, pet +0x898) + getX/getY(pet_center, +0x8a0), che controlla SOLO +0x8a0.
  +0x8a0 lo scrive il «load» di pet_center ([fn]/[fn]), registrato sul LWF della
  parte face_sp appena questa si carica ([fn], indice 8); +0x898 solo il «load» di un
  movie chiamato `head_sp` ([fn]), che il nostro scheletro non aveva -> NULL. Con id 0 il
  muso non si caricava e +0x8a0 restava 0. Nella classe Pet solo [fn] legge +0x898
  (scansione di ldr #0x890/#0x898/#0x8a0); +0x890 (body_sp) e' sempre controllato; [fn]
  azzera +0x890..+0x8a0 a ogni cambio di movimento. Correzione: `head_sp` vuoto a profondita' 0
  (si carica prima di face_sp) con la stessa matrice del muso in tutti i 30 movimenti. Ripiego
  senza ricostruire: `KHUX_PET_PARTS=0` sul server = id 0, pet invisibile come prima (movimenti
  con gli eventi e pet_eff visibili restano).
- **Medaglia del 6° slot in battaglia** (banco 11 ottobre: «non fa nulla»). Il turno c'e' gia':
  MedalDeck::setup [fn] riceve da AvatarActor::setupMedalDeck [fn] il flag
  «PetActor presente» (avatar +0x530) e chiama [fn]: trova il deck del keyblade della
  battaglia ([fn]: `startStageData.userKeybladeId`, sessione +0xd30+0x10 -> userDeckId;
  [fn] nella tabella userDecks, sessione +0x1f8), prende `petBaseSlotMedal` (deck +0x40)
  e lo aggiunge DOPO le medaglie del deck (indice +0x420 + +0x424, salvato in +0x42c; medaglia
  non trovata -> master 1 come gli slot vuoti). Nessun altro campo del server: niente rango,
  `petSubslot` o `openSkillIds`. Il moltiplicatore ([fn] modo 1 -> [fn]) e'
  `pet.petSubslot.magnification` (pet +0x7c0 -> +0x38 -> +0x74; x1 con medalId 1). Il contatore
  dei turni ([fn]: tutti gli slot meno quello di supporto) lo conta: 4/4 al banco con 3
  medaglie (screenshots\pet2_*.png); la ruota (CarouselDeck [fn] -> [fn], fino a
  7 celle, +0x4d4 = cella del pet) ne mostra due alla volta. ([fn] + [fn] sono
  invece lo slot del supporto, `supportUsers` di /stage/start: oggi [] quindi assente.)
- Al turno del pet ([fn]: turno +0x438 == +0x42c) l'avatar resta fermo e attacca il pet:
  [fn] -> [fn] battle_normal (7) o battle_all (8). Il danno viene SOLO dagli
  eventi del LWF del movimento, come per l'avatar (lwf/avatar/motion/atk2: «knockback_2» +
  «effectStart_1» nello stesso fotogramma, poi «end_1»): dispatcher [fn] (gestori dalla
  base +0x330, registrati da [fn]) -> «effectStart» [fn] = 1 nella coda +0x818,
  «knockback_N» [fn] = 2/3 nelle code +0x818 e +0x7e8. La sequenza [fn] (stato
  0x14) legge la coda del pet con [fn] -> [fn] e con 1 crea il colpo
  [fn], effetto [fn] -> [fn] = 0xb/0xc/0xd (pet in battle_normal/all/
  skill) -> `lwf/ability/hit_effect/pet_eff_0001..0003` (codice - 10). I nostri LWF avevano solo
  «end»: il turno passava senza colpo. Correzione (`make_pet_motions.py`): «knockback_2» +
  «effectStart_1» nel fotogramma d'impatto di battle_normal/battle_all/battle_skill e tre
  `pet_eff_000N` NOSTRI ([fn] restituisce NULL se il file manca e [fn] non
  controlla: crash; [fn] chiude l'effetto all'ultimo fotogramma di _root). Banco 11-10
  sera: il colpo arriva al 4° turno, senza grafica (poi resa visibile, vedi sopra). Se il colpo
  non arriva: l'aggiornamento del pet [fn] scarta dalla coda gli eventi diversi da
  «end» quando avatar +0x540 != 1 ([fn]), prima che la sequenza li legga.
- **Chi si muove nel turno del 6° slot** ([fn], tipo d'attacco avatar +0x668): 1
  (singolo) / 2 (tutti) con [fn] vero -> il PET gioca battle_normal / battle_all
  ([fn]) e l'avatar resta fermo; 3 (speciale) -> sempre l'avatar ([fn] 0x3e),
  anche nel turno del pet. Nell'originale (video 2017, `reference\pet\NOTE.md` §9) la speciale
  della medaglia nello slot Spirit la fa l'avatar con il suo cut-in e la sua animazione, con
  l'etichetta arancione «SPIRIT» a sinistra; il Blast (Trick) e' il pet che si rannicchia e
  scatta sul nemico con una scia dorata e una raffica di stelle. In [fn] i comandi 0/1
  nel turno del pet chiamano [fn] (deathblow_normal2 + movimento) / [fn]
  (deathblow_normal_after2, il pet torna accanto all'avatar).
- Trick in battaglia: [fn] -> [fn] mette ogni `petSubslot.openSkillIds` nel posto
  `invokeType` (riga petSkill +0x2dc; 4 = per skillValue3 0..5 -> posti 0/11..15, tabella
  0x188a950) dei 16 del PetActor (+0x388 + 0x48*i), +0x850 = 1. Posti: 1 alla morte di un nemico
  ([fn] -> recovery_skill), 3 Blast ([fn], [fn]: battle_skill al posto
  del segnale 0x3e dell'avatar, [fn]), 6 HP Recovery ([fn]), 7-9 potenziamenti
  ([fn]), 10 Combo ([fn]: skillValue2/10000, poi [fn] -> rolling1 e
  +0x8f8 = 2), 11-15 Steal per tipo di drop ([fn]). La nostra petSkill ha invokeType 1
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
    e' l'involucro di tutte le GET). Ramo `0x7c3848` di `[fn]` -> parser `[fn]`,
    tutto obbligatorio: `userPresent {userPresentDatas[], presentCount, presentCountMax,
    stonePresentCount, stonePresentCountMax}` (int). Elemento `[fn]`: `userPresentId`
    uint64, `resourceType`/`resourceId`/`number` int, `limitDatetime` data, `comment` stringa,
    `created` data. Uguale a `UserPresent::parse`/`Present::init` della 1.0.1 con simboli
    (thethiny, `0x4A61E4`/`0x4A6014`), che pero' non aveva i due contatori `stone*`.
    La lista sta nella sessione `+0x228` (righe da 0x48 byte, flag «riscosso» a +0x40).
  - Scena `[fn]` (`PresentBOX_Base_ver400`): mette tutte le righe nella scroll view;
    `presentCount`/`presentCountMax` (+0x40/+0x44) accanto a «Other» (106250104),
    `stonePresentCount`/`stonePresentCountMax` (+0x48/+0x4c) accanto a «Jewels» (106250103).
    Il server conta come «Jewels» i tipi 1/2, il resto come «Other», massimo 200 per entrambi
    (il massimo dei jewel e' una scelta nostra).
  - `resourceType`: tipi di `SceneUtil::setItemImageData` (1.0.1 `0x46C71C`): 1/2 Jewel, 3 medaglia,
    4 Munny, 5 materiale, 6 Friend Point, 10 Raid Points, 11 Lux, 13 keyblade, 14-17 premi,
    18-20/23 parti avatar, 25 sphere, 26 Skip Ticket. Il server riscuote 1/2, 3, 4, 5, 11, 13, 14
    (`grantItem`, ora anche 11 = `player.lux`).
  - `POST /user/present/receive` = azione 49, costruttore `[fn]`: `{receivePresentIds:
    [uint64]}` (Collect e Collect All; la 1.0.1: `executeUserPresentReceive` `0x4CD080`).
    Ramo `0x7cad14`, tutto obbligatorio: `userData.userPoint`, `userMaterials`, `userMedals`,
    `userSkills`, `userKeyblades`, `userDecks`, `userAvatarParts`, `userTitles`, `pet`, `emblemIds`,
    sub-slot, liste del Burst (come `/user/mission/receive`), poi `lastUserPresentIds` [uint64] =
    regali RIMASTI: il client segna riscossi (`[fn]`) quelli della sua lista assenti
    (`0x7d0fd0`). `userStone` non lo legge piu' (la 1.0.1 si'): il server lo manda lo stesso.
  - `/mypage` `userPresentCount` = regali validi (badge del pulsante). Scaduti (`limitDatetime`
    passato, ora del server) tolti a ogni lettura.
  - Prova: `KHUX_TEST_PRESENTS=1` aggiunge 6 regali (300 jewel «Daily Login Bonus Reward», 1000
    Lux, 5000 Munny, 6 Avatar Coin, Dewey 90041, 3 Mythril Shard; scadenza +29 giorni) quando
    nella scatola non ne resta nessuno di prova (`test: true`).
- Equipment (`DeckEditScene`, init `[fn]`): serve `GET /keyblade/subslot` (vedi
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
  `material`): riga con `validNeedMaterial` 0, il passo e' gratis (banco 15-10: lista dei materiali vuota,
  Strengthen funziona, BGB arriva a +35). **Da rifare come l'originale quando ci saranno le quest 880-915**
  (decisione dell'utente, 15-10): i Trophy si ottenevano uno alla volta col terzo obiettivo («Complete without
  having to continue») delle quest 880 e 885 (Trophy NI), 890, 895, 900, 905 (Trophy CS), 915 (Trophy CK);
  non vendibili, usati solo da BGB (khuxwiki «Keyblade#Trophy»). Servono le 3 righe in `material` e i premi
  del terzo obiettivo di quelle quest; BGB stesso si otteneva alla quest 880.

<a id="keyblade-oltre-35"></a>
### Oltre +35 (15 ottobre analisi, 16 ottobre provato sul banco)

- Nell'originale WW si andava oltre +35: passi da 0,1 fino a +60, Bad Guy Breaker a interi (screenshot
  `reference\equipment`: «Starlight +52.2», «Bad Guy Breaker +41»); dati in `reference\keyblades\keyblade_levels.json`.
- Client 4.3.1 (agente, decompilati in `D:\Progetto_Restauro_KH_UX	mp\kb35_re\`): lettore `[fn]` (25 campi,
  `lv` int a +0xc8, nessun campo decimale; chiavi in piu' ignorate). Titolo = `name` cosi' com'e' (`[fn]`,
  `[fn]`), nessun «+%d.%d». `lv` letto solo da `[fn]` («Unlock +%d» degli slot bloccati) e dal ramo
  dell'azione 54 (`lv == 30` -> evento 0x6008f73). Massimo = solo `evolveId 0` («Keyblade level max.», 101900006,
  Strengthen spento); i materiali della finestra si mostrano per `validNeedMaterial` anche con evolveId 0 (per
  questo a +35 si vedevano materiali). Il popup di conferma carica la riga `evolveId` senza controllo del null.
  Nessun tetto a 35/60 nel client. `passive`/`passivePower` della riga keyblade non letti: le passive passano da
  `passiveSetting` + `PUT /passive/list` (gia' generate fino a +60 da `make-passives.js`).
- Server (15-10, non ancora rigenerato ne' installato): `make-keyblade-levels.js` estrae tutti i livelli e aggiunge
  +35.1..+60 (id serie*1000+216..465, BGB serie*1000+lv*10; `lv` intero, `lv10` per il server; design della riga
  +35; +60 con evolveId 0 e senza materiali); `keyblade-evo.js` usa `lv10` per le passive. ~3775 righe nuove.
  Da fare: rigenerare (`node server\make-keyblade-levels.js <keyblade_levels.json>`, la tabella ridotta va rifatta
  dal riferimento), confrontare il master, alzare la revisione, provare sul banco (tempi di caricamento, titolo
  «+35.1», passive a +35.5, «Keyblade level max.» a +60).
- 16-10, **master 112**, provato sul banco: rigenerato (4351 righe keyblade); la khuxwiki ha un refuso in Darkgnaw
  (50.6..50.9 scritti «50.1», il moltiplicatore partner cresce sempre di 0.0024): `extract` lo corregge. Bad Guy
  Breaker +35 -> +60 a interi (confronto «+36», popup «You learned a passive effect!» a +37, «Not enough materials.»
  a +55 col salvataggio di prova, a +60 «Keyblade level max.» e Strengthen grigio); Starlight +35 -> +35.1 ... +35.5
  (titolo «Starlight +35.1», moltiplicatori +0.02, passiva 101355 a +35.5). `test-keyblades.js` ora va a +60 (OK,
  passive 791/791). Login piu' lento al primo avvio (77 s con master piu' grande, poi 18 s). Script del banco
  `D:\Progetto_Restauro_KH_UX	mp\kb_loop2.ps1 -N <passi>` (chiude anche il popup della passiva). Salvataggio di prova:
  materiali a 9999, copia prima in `tmp\player_before_kb60.json`.

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
- Client (Ghidra, `[fn]`, scena dei risultati di uno stage normale): la lista dei premi
  `+0x448` si riempie con le voci di tipo 13 da (a) le righe `reward` di nemici e forzieri
  (`[fn]`), (b) gli obiettivi nuovi, cioe' `clearMissionIds` della risposta non gia' compiuti
  (`[fn]`), con `submissionRewardType/ItemId/ItemNum` della riga di stage, (c) se
  `firstClearFlag` (byte +0 della risposta di `/stage/clear`, parser `[fn]`) e' 1, i
  `clearGetItemType/Id/Num` della riga (`validClearGetItem` voci). `[fn]` tiene solo il tipo
  13; per ogni voce `[fn]` -> `[fn]` apre il popup `BattleResult_KB` (`[fn]`:
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

- **Notices**: il pulsante ([fn], evento 2) manda POST /system/information/list/151203
  (azione 31, costruttore [fn]); parser [fn]: popUpViewUrl = array di stringhe,
  obbligatorio. Il ramo del dispatcher ( x7c3c78) mette il vettore nella sessione +0x3c0; la callback
  [fn] legge il primo elemento senza controlli e apre la WebView [fn] (titolo testo
  0x5ff08d2) sull'URL con i parametri di sessione aggiunti da [fn]. Con la risposta generica
  il vettore era nullo: SIGSEGV a  x9f9010 (banco 14-10, 	mp\repro\notices). Serve almeno un URL.
- **Notizie al login** (come l'originale): la stessa azione 31 parte dalla home ([fn] ->
  [fn], callback [fn]); [fn] mostra in sequenza una WebView per ogni
  elemento di popUpViewUrl (il primo con i parametri di sessione). Con un solo URL la pagina delle
  notizie si apre a ogni ingresso nella home (894 richieste 31 nel log: il client la chiede sempre).
- GET /system/information/list (azione 30, parser [fn]): iewUrl stringa; non vista
  sul banco, stessa pagina.
- Layout della WebView ([fn]): Information2_Base.json, o dark_Information2_Base.json se
  il flag +0x1a9 di [fn] e' acceso (la Beginner's Guide si apre: probabilmente oggi vale il dark, da verificare).
  Information2_Base non e' servito: l'originale JP (uguale a quello dell'IPA WW 4.4.0, stesse
  texture) e' in jp_coco_layouts.txt.
- Pagina nostra /web/notices (server/routes-info-album.js): elenco come
  
eference\other_menu\notices_list_yt_02.jpg (data, etichetta colorata EVENT/CAMPAIGN/UPDATE/
  IMPORTANT/INFORMATION, titolo, freccia rossa), dettaglio come 
otices_detail_yt_03.jpg (titoletti
  col quadratino, BACK). Notizie del restauro (server privato, Supernova e Dual Meow Wow, grafiche dei
  nemici, buff degli speciali, missioni), nessuna notizia originale inventata.
- **Album**: GET /user/album/161102 (azione 17, costruttore [fn], parser [fn]):
  userAlbum {lbumMedals[] {medalId uint, guiltStatus uint letto come byte}, llMedalCount
  int}, tutto obbligatorio (risposta generica = risultato nullo, SIGSEGV a 0x170, 	mp\repro\album).
  Scena AlbumScene_ver130 -> Album_Base_ver130 ([fn]: Win_Bottom, Txt_MedalGet*,
  Txt_MedalComp*, Scroll_Area, Txt_Challenge, Button_Challenge), cella Album_Medal_ver140
  ([fn]): medaglia posseduta = in lbumMedals, altrimenti Medal_S_0 e «?» in
  Txt_Medal_Label; icona AlbumGuilt_1/2/3 per guiltStatus 0/1/2, solo se userDetail.isGuilt e il
  tier della medaglia (+0x4c0) non e' 0. Sfide: Album_Challenge_ver112 ([fn]), pannello
  [fn] (crea Set_Reward da Album_Reward_Set_ver112 se manca), premi [fn],
  ricevuta [fn]; POST /user/album/challenge/update (azione 168). **Non raggiungibile nel WW 4.3.1**
  (15-10): [fn] nasconde e disattiva sempre Button_Challenge (vtable +0x160 setVisible(false),
  +0x520 setTouchEnabled(false), senza condizioni), come nei video dell'originale (`referencelbum`): niente da servire.
- Nessun layout dell'Album e' servito nel WW: gli originali JP sono in jp_coco_layouts.txt (prova
  --check: 7 radici ok). La cella JP non ha Txt_Medal_Label, che il codice WW usa senza controllo:
  nuova opzione clone=Txt_Medal_Num_Label>Txt_Medal_Label@Medal_S di import_jp_coco.py (copia del
  widget, tag nuovo, alla posizione di Medal_S).
- guiltStatus nostro (i valori originali non sono noti): 0 = nessuna copia con Special Attack Bonus,
  1 = almeno una, 2 = una copia al bonus massimo del tier (GUILT_RANGES di medal-guilt.js).
  llMedalCount = righe della tabella medal tranne la medaglia 1 (originale: «Medals 1837/1930»,
  
eference\album\album_yt_01.jpg).
