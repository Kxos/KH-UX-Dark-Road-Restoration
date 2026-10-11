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
  `shuffleskillUserMedals`, `userMedals` (ogni elemento con `userShuffleSkills`, `[fn]`:
  userShuffleSkillId, shuffleSkillId, userMedalId, getDatetime, type 0), `userSkills`,
  `userMaterials`, `emblemIds`, `guiltBurstFirst/MaxUserMedalIds`, `userData.userPoint`. Il server
  salva in `player.medalTraits[userMedalId]`; costo e conteggio scalati solo se riesce, altrimenti
  solo `ret` («200 ERROR :248»).

<a id="schermata"></a>
## Schermata

- Scena `MoogleShopScene_ver410` generata; moogle a destra = `Moogle_Fla`, `lwf/mogshop/mog_wait`
  (LWF vuoto: il moogle non si vede). Targa `LB_Munnies` (con `Txt_MunniesPossessed_Label`/
  `Txt_Munnies`) nel layout ma non compare sul banco.
- Righe: `changeRowItem` `[fn]`, `changeRowKakusei` `[fn]`, icona generica
  `[fn]` (LuxBoard, AVT, Incentive, Medal, KB, Stamp, Icon_Skill nel `Panel_Item`). Texture
  generate `Mogshop_plate1`, `But29`/`But31` (righe dei trait), copie `But30` (= But01).
- Niente Label `Txt_Count_Cus` nei layout: il codice la crea da `Txt_Count` (`[fn]`). Nei nomi
  dei trait «%» va raddoppiato (passano da printf).
- Conferma `MoogleShop_Traits_AddCheck.json` (`openItemBuyPopup` `[fn]`, anche con
  `LB_Jewel`), esito «Received ...».

<a id="trait"></a>
## Scambio dei trait

- Tocco della riga (controlla gia' il prezzo: «You don't have enough Jewels»), «Select Medal» (grigio
  senza riga scelta) apre `MoogleShop_Traits_MedalSelect_Pop_ver410` (`[fn]`, generato da
  `trait_medal_select_popup` in `make_layouts.py`).
- Griglia `MiniMedalScrollView` (`[fn]`): il **tocco** apre il dettaglio (callback +0x930,
  `[fn]`); la **scelta si fa trascinando** la medaglia sullo slot a sinistra (+0x990
  `[fn]` controlla il rilascio dentro `MedalArea` > `Medal1`, misura 176x176; +0x960
  `[fn]` la imposta e riempie `KakuseiSkill_Window` con `[fn]`).
- Medaglie velate (grigio 100,100,100): `[fn]` con flag +0xb29 = tipo 9/10 (supporto) oppure
  `spShuffleskillSlot` 0.
- Slot pieni: `MoogleShop_Traits_OverwriteCheck_ver410` (OK = `Button_Draw`/`Txt_Draw`,
  `Txt_Wording2` «Replace X with Y?»; lo slot si sceglie toccando la riga del trait).

<a id="aperti"></a>
## Aperti

Nomi lunghi dei trait che toccano l'icona; moogle invisibile; targa `LB_Munnies` assente; «N days
left» mostra 1980 giorni (orologio del guest al 2021, `endDate` sul 2026) (ISSUES I-021). Cursore rosso
dello slot da sostituire (armatura `MedalInfo_Anim`, `animeCursor`) piu' largo della finestra; trait
speciali (Spirit Training) non gestiti (ISSUES I-043).
