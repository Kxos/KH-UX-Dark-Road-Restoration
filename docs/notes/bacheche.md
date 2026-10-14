# Avatar Boards (bacheche, «sphere» nel client)

Riferimenti: `reference\avatar_boards\` (avatar_boards_list_01.jpg, ab_29-33.png dal video
7-R0jhyzlso 556-686 s, ab_ref_*, ab_sheet). Documenti dell'agente in
`D:\Progetto_Restauro_KH_UX\stage_gen\boards\` (`NOTE.md` significato dei campi, `SERVER.md`
protocollo, `ARMATURES.md`, `LAYOUT.md`, `ASSETS.md`, `tools\gen_boards.py`).
Stato all'11 ottobre: **elenco, bacheca, sblocco dei nodi, Unlock All, bacheca completata e
popup del titolo provati sul banco** (risorse 32, revisione 81).

<a id="dati"></a>
## Dati

- Master `sphere`, `sphereArray`, `sphereMasu` in `server/tables/` (118 bacheche standard, 874 nodi,
  dalla khuxwiki; nessun dump pubblico). `sphereMasu` indice 22 = premio di completamento: titolo
  2000+N (`rewardSelect` 7); con 0 il client cercava l'id 0 e crashava.
- Avatar Coin = `userPoint.spherePoint` (premio di tipo 14).
- Immagini (agente, `stage_gen\boards\files\`, 442 PNG): 381 `img/sphere_incentive/<id>.png` da
  Roboloid (`images/assets/board/sphere_incentive-<id>.png`), 15 `sphere_board/Board_%04d`, 42
  `sphere_masu_icon`, `Kind_0002` (figura rosa) ricostruito. Le incentive (37 MB) stanno nel pacchetto
  statico `medal_gen` (servono versioni complete).

<a id="server"></a>
## Server

- `GET /user/sphere`, `POST /user/sphere/update` (nodi, monete, premi HP/AP/costo/medaglie/parti,
  titolo a bacheca completa), `/user/sphere/check` (61, `userSphere` `[fn]` modo 1; con
  `checkTypes` contenente 3, `closeEventSphereBoardIds[]`), `/user/sphere/reset` (62). Risposte 44/190
  con l'inventario (`inventoryBlocks`, `userTitlesData`).
- **Risposta di `/user/sphere/update` (44), ramo `0x7c33bc` di `[fn]`** (condiviso con
  190 `/user/mission/receive`, che distingue con `cmp w8,#0xbe`/`#0x2c`). Ogni parser torna null
  se la chiave manca o non e' un array/oggetto (`[fn]` + controllo del tipo), e un null
  controllato porta a `w19 = 0` (errore 2). Per la 44 sono **tutte obbligatorie**:
  `userData.userPoint` (`[fn]`, `0x7c33cc`), `userData.userDetail` (`[fn]`,
  `0x7c33ec`; facoltativa solo per la 190), `userSphere` (`[fn]`, `0x7c3430`, solo 44),
  `userMaterials` (`[fn]`), `userMedals` (`[fn]`, chiave di default se x1 = 0),
  `userSkills` (`[fn]`), `userKeyblades` (`[fn]`), `userDecks` (`[fn]`),
  `userAvatarParts` (`[fn]`), `userTitles` (`[fn]`), `pet.userPetParts`
  (`[fn]`, `0x7c34ec`, solo 44), `emblemIds` (`[fn]`, `0x7c350c`, solo 44),
  `subslotMaxNum`+`userKeybladeSubslots` (`[fn]`), `guiltBurstFirst/MaxUserMedalIds`
  (`[fn]`, 44 e 190). `missions` (`[fn]`) e' controllato solo per la 190.
  Azione 49 (`/user/present/receive`, ramo `0x7cad14`): stesse liste tutte obbligatorie piu'
  `lastUserPresentIds`; `userData` e' facoltativo (se c'e' ed e' un oggetto, `userPoint` e'
  obbligatorio, `0x7cad38`). Le azioni 60/61/62 hanno rami propri (`0x7c44e8`, `0x7cbde0`,
  `0x7c4f08`) senza inventario.
- **L'array vuoto e' valido e il client non sostituisce le liste**: dopo il parse (`0x7ce7ac` per
  44/190; `0x7d03d4`/`0x7d0b2c`/`0x7d0c9c` per la 49) ogni voce passa per un upsert per id:
  `[fn]` materiali (voce con `number` 0 = tolta), `[fn]` medaglie (voce nuova ->
  `[fn]`), `[fn]` skill. Ogni upsert ricopia tutto l'elenco (0x148 byte a
  medaglia) e ne ricostruisce l'indice (`[fn]`): con ~2076 medaglie e' O(n^2) ed era la
  causa dei ~6,5 s di attesa dopo ogni nodo (banco 14 ottobre; stesso problema del Level Up, I-083).
  Sub-slot e liste del Burst invece si sostituiscono (`+0x890`, `+0x930` dello stato), `emblemIds`
  passa a `[fn]`; keyblade/deck/parti/titoli/pet usano `[fn]`/`[fn]`/
  `[fn]`/`[fn]`/`[fn]` (non verificati: restano complete).
- Server: `inventorySnapshot(now)` prima dei premi e `inventoryBlocks(now, snap)` mandano per
  `userMaterials`/`userMedals`/`userSkills` solo le voci nuove o cambiate (array vuoto se il nodo
  da' HP/AP/costo); se una voce e' sparita si manda la lista intera. Vale per 44, 49 e 190;
  `KHUX_FULL_INVENTORY=1` torna alle liste complete.
- **Ogni voce di `userSphereDatas` di `/user/sphere/check` e' per il client «bacheca appena
  sbloccata»** (elenco `[fn]()+0x6a8`, letto dalla home `[fn]`, dai risultati
  `[fn]` e dall'elenco bacheche): il server manda solo le bacheche non ancora annunciate
  (`player.sphereNotified`; array vuoto, non chiave mancante, che lascerebbe l'elenco com'e').
- Premi dei nodi: HP +20 ciascuno (`player.sphereBonus`).

<a id="layout"></a>
## Layout e codice

- Elenco: `SphereBoardScene_ver310` (CenterUI = `SphereBoard_Gen`, LeftUI = `MedalSell_Back`) e la
  carta `SphereBoard_Select_Icon_ver130` (`Select_Base`/`Select_Board`/`Select_Kind`; widget di
  `[fn]`, costume sopra lo sfondo). Nomi da `[fn]`, `[fn]`, `[fn]`,
  `[fn]`, `[fn]`: `Img_Win_L/S` (targa del costo, `Txt_Coin`/`Txt_Coin_Title`; con
  opacity 0, il codice le rimostra), `Coin` (`SpherePointIcon`, `Txt_Coin_Name_Label`,
  `Txt_Coin_Label`), `TitleBar`/`Txt_SphereBoard_Label`, `Txt_Open` con `Txt_Num_Label`/
  `Txt_Total_Label`, `Bar_Filter`, `Button_Filter`/`Txt_Filter`, `Txt_Caution`,
  `BoardDetail`/`DetailButton`/`Txt_Detail`, `SelectArea` con `LeftUI`/`RightUI`/`CenterUI`,
  `LeftUI_Arrow`/`RightUI_Arrow`. «No. N» sopra la carta (`No_Panel` y 300, linguetta `Sphere_No_Tab`).
- Bacheca: `SphereScene_ver310` (Grid G11..G59 = 45 celle, `Grid`/`Grid_R`/`Info`/`LeftUI`
  obbligatori, sfondo `img/ui/Equip_DeckBG_01.png`, overlay `Sphere_Incentive.json`). Armature da
  `recon/tools/gen_sphere_armatures.py`: `Z_SpRoute_*`, `SphereAnimation`, `Z_SpCursor` (movimenti
  scelti per indice 0/1/2 = Lock/Release/Target; rotazione rigida a fotogrammi, kX/kY deformavano).
- Popup: `PopupNormal_SphereCoinCheck_ver310`, `Sphere_Popup_Get_ver240`, `Sphere_Popup_Comp_ver310`
  dai popup OK/OK-Annulla originali. `Sphere_Incentive_ver240` **non e' un popup**: e' l'icona del
  premio che `[fn]` aggiunge nel `Panel` di `Sphere_Popup_Get` (build 100x100 con
  `reward_icons`). Servono `Area_Point` e le icone per tipo.
- `Sphere_Popup_Comp_ver310` (`[fn]`) passa anch'esso da `[fn]`: servono
  `Txt_Get_Label`, `Panel`, `Button_Ok`/`Txt_Ok` oltre a `Txt_All` («You completed the board!», solo
  con il flag +0x7b3). `[fn](.., 0x16, ..)` mostra il premio all'indice 22 di `sphereMasu`.
  Aperto con `param_4` 0: il banner non parte, quindi CONGRATULATIONS e' fisso sull'arco
  (`Sphere_Congrats` di `make_textures`, lettere della LWF Result_Reward).
- LWF `lwf/sphere/SpIcon_Open` e `SphereMap_Complete`: copie rinominate di Result_Reward (una LWF
  vuota non ha l'etichetta: crash).
- Stile (dagli originali): carta completata con fiocco rosso e fascia «COMPLETE»
  (`Sphere_Board_Clear` nel widget `Clear`; disegno piu' semplice dell'originale dipinto, ISSUES
  I-025), spunta gialla `Sphere_Node_Check` nel widget `Get` (+1/+24 dal centro del nodo), targa del
  titolo `RankTitle_Board` come `AvatarTitle_PanelButton_Big` (610x82, scala 0,8), popup del titolo
  arancione come `Result_Reward_Win`, riquadri in basso `Win09` 9-slice, pastiglia `Plate18`, Unlock
  `But06` (grigio `_Disable`), Unlock All `But16` (non esiste negli originali del 2017).

<a id="popup-lb"></a>
## Popup «Unlocked an Avatar Board!»

Dopo un Level Up e a ogni login (se il server annuncia bacheche) il client apre
`BattleResult_LB_ver120.json` (`[fn]`), ricavato da `PopupNormal_Text_34_4Line_Ok` (`Txt`,
`Select_Base/Board/Kind`, `Txt_Title_Label`, `Button_Ok`/`Txt_OK`, `Area_Point`). Provato sul banco
(home e Level Up 3 -> 4 nella missione 11). Analisi in `stage_gen\lb_popup`. Originale non trovato
online (`reference\lb_popup`: stile da «Purchased Avatar Board!») (ISSUES I-026).

<a id="prove"></a>
## Prove sul salvataggio

Per riprovare i popup: fermare il server, `unlock` della 2100001 a [1..5], `spherePoint` 470,
`sphereBonus.cost` 3, togliere 2001 da `titles`, riavviare (con `relogin.ps1`).
