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
- Il fumetto sopra il personaggio e' vuoto finche' non si salva un messaggio del Profilo (ISSUES
  I-015).
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
- L'oggetto pet della sessione (+0x7c0) nasce solo dall'azione 170 (`pet`,
  `pet.userPetCoordinate`, `petName`, `initCoordinate`), che il client non chiede mai (isPet 0); ogni
  risposta che porta un `petSubslot` va in crash (0x7c8d40). Mancano `PetInfoScene_ver320`,
  `PetInfoAnim` e tutte le `lwf/pet` (ISSUES I-005).
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
