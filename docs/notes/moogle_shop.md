# Moogle Shop (Items e Traits)

Riferimenti: `reference\moogle_shop\` (moogle_shop_01.png, jp410_136.png). Tocchi in
[banco.md](banco.md#tocchi).

<a id="dati"></a>
## Dati e API

- `server/make-moogleshop.js` genera `moogleshop` e `shuffleskill` (dalla khuxwiki; nessun dump
  pubblico). Campi: `type` 1 Traits / 2 Items; `payType` 1 jewel (2 munny: ipotesi); `itemType` come i
  premi (5 materiale, 3 medaglia); `frameType` 1 = riga blu (Panel), altrimenti dorata
  (Panel_Rare/SkillPanel_Rare/Count_Rare); `display` 1 = mostra «N days left» fino a `endDate`;
  `count` = scambi possibili. `shuffleskill.category` = icona `img/kakusei/Kakusei_Icon%04d` (10
  gauge, 20 HP, 30-50 resistenze, 60/61 terra/aria, 70 raid, 80 attacco extra, 90 STR, 100 DEF);
  `shuffleskill.type` deve essere 1, altrimenti la riga non compare.
- `GET /moogleshop/list` -> righe attive `{moogleshopId, limitCount}` (vuoto = «No items available.»).
- `POST /moogleshop/buy` (248) `{moogleshopId, userMedalId, userShuffleSkillId (0 = slot libero)}` ->
  `shuffleskillUserMedals`, `userMedals` (ogni elemento con `userShuffleSkills`, `FUN_0078d4b4`:
  userShuffleSkillId, shuffleSkillId, userMedalId, getDatetime, type 0), `userSkills`,
  `userMaterials`, `emblemIds`, `guiltBurstFirst/MaxUserMedalIds`, `userData.userPoint`. Il server
  salva in `player.medalTraits[userMedalId]`; costo e conteggio scalati solo se riesce, altrimenti
  solo `ret` («200 ERROR :248»).

<a id="schermata"></a>
## Schermata

- Scena `MoogleShopScene_ver410` generata; moogle a destra = `Moogle_Fla`, `lwf/mogshop/mog_wait`
  (LWF vuoto: il moogle non si vede). Targa `LB_Munnies` (con `Txt_MunniesPossessed_Label`/
  `Txt_Munnies`) nel layout ma non compare sul banco.
- Righe: `changeRowItem` `FUN_00ab175c`, `changeRowKakusei` `FUN_00aaf8e4`, icona generica
  `FUN_0074d540` (LuxBoard, AVT, Incentive, Medal, KB, Stamp, Icon_Skill nel `Panel_Item`). Texture
  generate `Mogshop_plate1`, `But29`/`But31` (righe dei trait), copie `But30` (= But01).
- Niente Label `Txt_Count_Cus` nei layout: il codice la crea da `Txt_Count` (`FUN_006e436c`). Nei nomi
  dei trait «%» va raddoppiato (passano da printf).
- Conferma `MoogleShop_Traits_AddCheck.json` (`openItemBuyPopup` `FUN_00e16a84`, anche con
  `LB_Jewel`), esito «Received ...».
- Valuta degli Items (I-122): **sempre jewel**, senza guardare `payType`. `changeRowItem` scrive solo
  il prezzo (`+0x238`) in `Jewel` > `Txt_Jewel` e non carica icone: l'icona e' quella del layout.
  `openItemBuyPopup` usa il testo 106220414 «Spend N Jewels in exchange for X?», mette in
  `Txt_CrownPossessed_Label` i jewel posseduti (gratis + acquistati) e nasconde sempre `LB_Munnies`,
  `Txt_MunniesPossessed_Label`, `Txt_Munnies`. Originale: WW `moogle_shop_01.png` (Rainbow Gem x10 =
  100 jewel, «Exchange Jewels for materials and traits!»); riga JP `MoogleShop_Item_Panel` con
  `Ico_jewel.png`. Il munny nelle righe veniva dalle texture: in `cocostudio/publish` la numerazione
  non e' quella di `img/incentive` (publish `IncentiveIcon_01` = jewel, servito WW; JP publish
  `IncentiveIcon_02` = munny, `img/incentive/IncentiveIcon_02` = jewel). Il nostro `Jewel_Icon`
  puntava a `IncentiveIcon_02.png` (copia del jewel di `img/incentive` in `COPIES`), ma
  `import_jp_coco.py` la sovrascrive con la `IncentiveIcon_02` JP (munny) per i layout JP che la
  usano. Ora i layout generati usano `IncentiveIcon_01.png` e la copia 02 non c'e' piu'.

<a id="trait"></a>
## Scambio dei trait

- Tocco della riga (controlla gia' il prezzo: «You don't have enough Jewels»), «Select Medal» (grigio
  senza riga scelta) apre `MoogleShop_Traits_MedalSelect_Pop_ver410` (`FUN_00e103f4`, generato da
  `trait_medal_select_popup` in `make_layouts.py`).
- Griglia `MiniMedalScrollView` (`FUN_0091d10c`): il **tocco** apre il dettaglio (callback +0x930,
  `FUN_00739350`); la **scelta si fa trascinando** la medaglia sullo slot a sinistra (+0x990
  `FUN_00e1ba9c` controlla il rilascio dentro `MedalArea` > `Medal1`, misura 176x176; +0x960
  `FUN_00e1bc5c` la imposta e riempie `KakuseiSkill_Window` con `FUN_00e12838`).
- Medaglie velate (grigio 100,100,100): `FUN_0088020c` con flag +0xb29 = tipo 9/10 (supporto) oppure
  `spShuffleskillSlot` 0.
- **Crash su «Select Medal» con l'originale JP (I-121, utente 14-10, risorse 34)**: il generato
  funzionava (banco 10-10, ts9-ts11); il 13-10 (I-117) il popup e' passato all'originale JP
  `MoogleShop_Traits_MedalSelect_Pop_ver410` (radice `Traits_pop`). Nessuna richiesta al server
  (log 14-10: `#89 /moogleshop/list`, poi riavvio). Controllo statico: l'originale ha **tutti** i nomi
  cercati senza controllo da `FUN_00e103f4` (Button_OK>Txt_OK, Jewel>Txt_Jewel, Munnies>Txt_Munnies,
  Win_Base>Txt_Traits_Text, SkillPanel>kakusei_Icon/Txt_KakuseiSkill, Win_under>Scroll_Area/
  Txt_Possession/Txt_Cost_Label/Txt_Slash_Label/Txt_CostMax_Label/Button_Sort, MedalArea>Medal1
  (`FUN_00ab567c`), Arrow01, KakuseiSkill_Window, Close_Button), da `FUN_00760c64` (Txt_Sort,
  Txt_Sort_Label, Txt_Filter_On) e da `FUN_00e12838`; texture tutte presenti, 9-slice dentro le
  texture. Causa non trovata (differenze: Win_under/Jewel/Munnies ImageView invece di Panel,
  `Medal1` touchAble, `Effect1` in MedalArea, Mask1/2). Rimesso il generato (`?` in
  `jp_coco_layouts.txt`); per riprovare l'originale serve lo stack del crash ([banco](banco.md#crash)).
- Slot pieni: `MoogleShop_Traits_OverwriteCheck_ver410` (OK = `Button_Draw`/`Txt_Draw`,
  `Txt_Wording2` «Replace X with Y?»; lo slot si sceglie toccando la riga del trait).

<a id="aperti"></a>
## Aperti

Nomi lunghi dei trait che toccano l'icona; moogle invisibile; targa `LB_Munnies` assente; «N days
left» mostra 1980 giorni (orologio del guest al 2021, `endDate` sul 2026) (ISSUES I-021). Cursore rosso
dello slot da sostituire (armatura `MedalInfo_Anim`, `animeCursor`) piu' largo della finestra; trait
speciali (Spirit Training) non gestiti (ISSUES I-043).
