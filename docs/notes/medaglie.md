# Medaglie: Medal List, dettaglio, vendita, Level Up, Evolve, grafica

Storia: [../journal/fino-al-2026-10-11.md](../journal/fino-al-2026-10-11.md) (sezioni del 9-10
ottobre). Tocchi in [banco.md](banco.md#tocchi).

<a id="dati"></a>
## Dati delle medaglie

- Id: prima cifra il rango (1 bronzo, 3 argento, 9 speciale), seconda l'attributo (1 Power, 2
  Speed, 3 Magic). Deck iniziale: 13021 Donald A, 11021 Goofy A, 13031 Yuna; 90041 Dewey.
- `medal` (63 campi): dalle righe binarie di thethiny (522 medaglie vere, `raw_master_old.py`) +
  Roboloid (`external\roboloid\medal_db.json`, 2.100 medaglie con evoluzioni) con
  `KHUX_MEDALS_ALL=1` (medalId 300000 + id Roboloid). `imageId` = medalId (il client compone
  `img/medal/Medal_L_%d.png`).
- Medaglia mancante -> ripiego sulla **medaglia 1** (`[fn]`): `make-game-tables.js`
  aggiunge la riga 1 (master 1 = Paperino blu senza costo).
- Medaglie di supporto impilate: `validPack` (thethiny `unk_1116`), badge rosso.
- <a id="tier"></a>**Tier** (SP Attack Bonus, «SAB Tier» della khuxwiki, 1-10) = `guiltValue`
  (+0x4c0). Il dettaglio carica `img/ui/guilt/MedalInfo_Guilt<guiltValue>.png` (`[fn]` ->
  `[fn]`: 0 = icona nascosta; se 0 e `validEvolve` segue `evolveId`); un file assente lascia
  la texture del layout, cioe' l'**1** (per questo tutte le tier 9-10 sembravano tier 1). Fonte:
  campo `Guilt` di Roboloid, identico alla khuxwiki (controllate SN++ - MoM Kairi 10, Illustrated
  Leon 6★ 5, KH CoM Naminé 6★ 3). Le righe di thethiny avevano 0: ora prese da Roboloid via
  `medal_map.json` (480 medaglie cambiate, rev. 82). Distribuzione: 0 (supporto) 186, 1:146,
  2:274, 3:461, 4:127, 5:163, 6:58, 7:131, 8:241, 9:125, 10:182. Il bonus per tier (khuxwiki):
  1 +25%, 2 +50%, 3 +100%, 4 +130%, 5 +150%, 6 +180%, 7 +200%, 8 +230%, 9 +280%, 10 +320% (la
  guida dell'utente si ferma alla 8, scritta prima delle tier 9-10). Il moltiplicatore dei
  subslot dipende dal tier (calcolato dal client; subslot non ancora serviti: `subslotMaxNum` 0).
  `userMedal.guiltFactor` (bonus sbloccato della copia, centesimi di %) dal Level Up; `guiltProb`
  = intervalli della khuxwiki per tier ([guilt.md](guilt.md), 12-10, da verificare al banco).
  Icone (`reference\medal_tier\NOTE.md`): dettaglio e filtro = `MedalInfo_Guilt1-8` originali
  (tondo blu con la cifra, non segnaposto) + 9-10 generate; le icone quadrate della guida
  dell'utente sono le `Guilt<n>_On` delle schermate keyblade (`[fn]`, che carica anche
  `_Off`, `_Err`, `_num`, `MD_Guilt<n>_*`): nelle risorse solo `Guilt4_On`, `Guilt5_On` e
  `Guilt1-8_Err`; `make_textures.py` genera le altre (On/Off dalla khuxwiki; `_num` e `MD_*` copie).
- Shuffleskill/trait: `shuffleskillSlot` (+0x4b4) e `spShuffleskillSlot` (+0x4b8) non esistono nel
  formato vecchio. `make-game-tables.js` (`traitSlots`, khuxwiki «Trait Slots»): tier 1-3 -> 1,
  4-5 -> 2, 6-10 -> 3, SN/Supernova e Prime 7★ -> 5, Prime 6★ -> 3, supporto 0; 1 slot speciale a
  tutte le medaglie d'attacco. Eccezioni della wiki (alcune 6★) non applicate. Le «7★» di Roboloid
  senza prefisso (561, es. Wakka) hanno una rarita' sospetta: non usata per gli slot.
- Elemento `userMedal` (`[fn]`): `userMedalId` uint64, `medalId`, `number`, `level`, `exp`,
  `attack/defense/burstUpperNumber`, `lock`, `upperCost`, `guiltFactor`, `userSkills` <= 2,
  `userShuffleSkills`, `getDatetime`.

<a id="burst"></a>
## Attacchi speciali (`burst`)

La tabella vera ha 11 righe (`master_data/burst_base.json`). `make-game-tables.js` genera le
altre: clone della famiglia (burstId/10) con «+k» e +300 di potenza per livello, oppure modello per
attributo con nome, gauge, bersaglio, descrizione e moltiplicatore dalla khuxwiki (85 famiglie su
109). 63 righe restano «Special Attack»; animazioni ed effetti sono quelli del modello (Thunder
Raid, Thundaga, Heaven's Sword) (ISSUES I-033).

<a id="grafica"></a>
## Grafica

- `recon/tools/fetch_medal_images.py` (`--all`): immagini di Roboloid/khux (file originali del gioco)
  associate per nome e stelle -> Medal_L/Medal_S/Cutin in `D:\Progetto_Restauro_KH_UX\medal_gen\files`
  (2.117 medaglie; nomi con `%23` decodificati). Pacchetto penultimo delle versioni complete.
- Controllo dell'agente (`stage_gen\medal_check\REPORT.md`): le 21 Medal_L e 5 Cutin che esistevano
  sono identiche agli originali; limiti della fonte: 185 Cutin assenti (41 nel master), 419 medaglie
  aggiunte condividono la Medal_L, 590 Cutin senza bagliore bianco, Medal_S leggermente piu' morbide
  (ISSUES I-039).

<a id="medal-list"></a>
## Medal List e dettaglio

- Scena `MedalListScene_ver130`; `LeftUI` = `MedalSell_Back.json` (originale). Nomi da
  `[fn]` e vicine: `Win_Bottom` (`Txt`, `Txt_Button`), `Medal_Sell_Panel` (solo la barra in
  alto), `Scroll_Area`, `Button_Back`, `Button_Sort`, `Button_Sell1`/`Txt_Sell1`; contatore
  `Txt_MedalGet` («Slots», 101200050), `Txt_MedalGet_Num_Label` / `Txt_MedalGet_All_Label`
  (`[fn]`); barra di ordinamento generica `[fn]` (`Txt_Sort`, `Txt_Sort_Label`,
  `Txt_Filter_On`).
- Griglia: scena scalata 1,6875 e centrata (x_schermo = 960 + (x - 480)·1,6875), celle 120x164
  (`[fn]`); 7 colonne intere: `MedalList_Gen` `Scroll_Area` 954 px da x=3, vendita 942 px da
  x=9 (passo 126, prima a 33 dal bordo). Pulsanti scalati 0,765, prima riga sotto la barra.
- Dettaglio: `[fn]` carica `SlideMedalInfoScene_ver341` sopra `MedalInfoScene_ver320`; il
  primo figlio di `LeftUI`/`RightUI` diventa pulsante (`[fn]`), callback
  `[fn]`/`[fn]` -> `[fn]`/`[fn]` (scorrimento come lo swipe).
  `Panel_Left`/`Panel_Right` con origine al centro della freccia (30,320 e 930,320; 120x220).
- Cursore della griglia: armatura `Cursor_Anim_MedalSell` (movimento `Animation1`, `[fn]`) =
  copia del cursore della fusione `Cursor_Anim_MdalMix_ver103` (bagliore `Medal_Syn_Select_Eff02`,
  144x172). Selezione: `MedalSelectAnimation` (`Medal_Select01`, `[fn]`).
- Targhetta sotto la medaglia: segue l'ordinamento; sulle medaglie di supporto alterna il prezzo con
  i testi 101210001-003, che nelle risorse inglesi sono uno spazio (originale «FOR SYNTHESIS»)
  (ISSUES I-022).
- Animazione della targhetta (ISSUES I-047): nessun ciclo STR -> DEF -> costo, ne' nell'originale
  ne' nel codice. Un solo valore per modalita' di ordinamento (`+0x470`, switch in `[fn]`);
  le medaglie con uno stato alternano valore ed etichetta: `[fn]` (ogni frame da
  `[fn]`) tiene 2 s il valore, 1 s di dissolvenza, 2 s l'etichetta, 1 s di dissolvenza
  (periodo 6 s; `[fn]` applica le opacita'). Etichetta da `[fn]`: medaglia in un
  deck di `userDecks` (`[fn]`) -> «Equipped» (101210004); Spirit 106110305; Subslot
  101210010. Video originale (2019): stessi tempi misurati al decimo di secondo
  (`reference\medal_list_plate\`). Sul banco il deck e' [1, 0, 3] (medaglie iniziali, in fondo
  alla lista per Strength): le medaglie in vista non sono equipaggiate e restano ferme, come
  nell'originale.

<a id="sort"></a>
## Popup Sort/Filter

`[fn]` carica `PopupNormal_SortButton_ver350` (generato dalla ver320). `[fn]`
(troppo grande per il decompilatore: nomi dallo stack e dal blocco di stringhe) cerca `Dummy_Sb` con
~30 `Filter_Sb*`, `Txt_TitleSb`, `Txt_SubTitleSb01/02`, `Filter_Subslot`, `Filter_Trait`,
`Filter_Evo_Set`, `Filter_Ability_*`: cloni nascosti di CheckBox (`Filter_Sb` dentro `Dummy_Sb`,
genitore letto a 00a482ac). Texture ricostruite in `make_textures.py` (riferimenti
`reference\medal_list\sort_filter\`). Da confrontare con l'originale: «Favorite», «SP Attack Bonus /
No Bonus» grigi, «Imitation», «Special Traits» con 11 icone e «None» due volte (ISSUES I-023).

Riga «SP Attack Bonus» (tier): il layout originale ver320 ha `Filter_Guilt1..9` (8 in alto, il 9
sotto a sinistra) con `Logo_01` = `MedalInfo_Guilt<n>.png`; il codice (`[fn]`) cerca
`Filter_Guilt%d` da 1 finche' li trova, e la ver350 ne vuole 10 (clone di `make_layouts.py`). Prima
il 10 era nascosto sotto il 9 e `MedalInfo_Guilt9` era una copia dell'8; ora 9 e 10 sono disegnate
(`make_textures.py`, stile delle 1-8 originali) e il 10 sta accanto al 9 (x 185). Le tier 9-10
esistono (khuxwiki: 307 medaglie): la riga non si ferma all'8 della guida. Icone e confronti:
`D:\Progetto_Restauro_KH_UX\reference\medal_tier\NOTE.md` ([tier](#tier)).

<a id="vendita"></a>
## Vendita (Sell Medals) e lucchetto

- `[fn]` carica `MedalSellScene_ver350`: CenterUI `MedalSell_Gen.json`, LeftUI
  `MedalSell_Back.json`, RightUI pannello vuoto (`[fn]` usa il primo figlio dei tre). Nomi:
  `Txt_Money`/`Txt_Money_Label` (`[fn]`), `Txt_Money_Total`/`Txt_Money_Total_Lavel` (sic),
  `Txt_A_Coin(_Label)`, `Plate_A_Jewel`/`Plate_A_Ticket`, `BoxNow`, `BoxMaxLabel`, `DeckBase2`.
- Conferma `PopupNormal_MedalSell_Check_ver350` (`[fn]`), esito
  `PopupNormal_MedalSell_Ok_ver350` (`[fn]`): copie di `PopupNormal_Text_34_4Line_OkCancel/
  Ok`; ricompense `Panel_1..4` con `Obtain_Plate_a..d` (`[fn]`: `Txt`, `Txt_Label`, `Icon`);
  medaglie rare: `Alert_Area` <- `PopupNormal_MedalMix_RareCaution_Panel.json` (generato).
- `POST /user/medal/sell` (51) `{"userMedalIds":[..],"numbers":[..]}` -> `userData.userPoint`,
  `userSkills`, `userMedals`, `sellUserMedalIds`.
- Popup della quantita' `EquipSell_Medal_Step1_ver131`: «1/N» = `Txt_MaterialStock_Fix_2`,
  `Txt_data3` «/», `_Fix_3` massimo; fascia rossa «Includes ★★★ Medals or higher.» (Panel
  233,18,38, bordi 255,2,0, `rare_star.png`) se la pila ha piu' di 2 stelle.
- Lucchetto: `POST /user/medal/lock` (46) `{"userMedalIds":[..],"isLocks":[..]}`, mandato **solo
  uscendo da Medal List**; risposta `userMedals` (`[fn]`), `deleteUserMedalIds`,
  `isSubslotUpdate`. Salvato in `player.medalLocks`.

<a id="level-evolve"></a>
## Level Up, Evolve, Unequip

- Level Up: `POST /user/medal/enhance`, curva EXP del client, popup dei materiali rari. Medaglie
  speciali e copie (`server/medal-guilt.js`, 12-10, DA VERIFICARE): pallini dell'attacco speciale
  (`burstUpperNumber`, fino a `burst.maxEnhanceCount`: 6★/7★ 5), sblocco/rilancio della guilt
  (`guiltFactor`, con `isGuilt` = Quest 34), Magic Mirror +1%, Chip/Dale STR/DEF (fino a
  `addMaxAttack/addMaxDefense`), Cid costo (fino a `cost - minCost`, 6★/7★ 20), Fantasia Mickey B
  (300913, type 8) +1 pallino; Magic Broom (300948) e Fantasia Mickey A -> B con 5 Broom. Salvati
  in `medalState`, serviti in `userMedal`. Dettagli e prove: [guilt.md](guilt.md#stato).
- Evolve (azione 56): la medaglia diventa `evolveId` al livello 1, materiali consumati (anche dalle
  pile), costo `evolveMoney`; risposta `before/afterEvolveUserMedal`, `pet`, `attachmentMedalIds`.
  Scena `MedalEvoScene_ver320` generata (stile `reference\medal_evolve\`); `MedalInfo_Information_R1`
  con `Panel_MixResult_Area`/`Tap_Screen_Area` della R3. Le LWF
  `lwf/medal/compose/evolution/card_evolution_result_01..05` mancano: copie del Level Up (ISSUES
  I-024). Provata sul banco: Donald 1★ LV20 + Cheshire Cat -> Donald 2★.
- Unequip: `POST /user/medal/remove` (237); prima il client chiede `GET /user/medal/preremove`, a cui
  il server da' una risposta generica (ISSUES I-038).

<a id="materiali"></a>
## Sell Materials

`EquipSellScene` (`[fn]`): `Panel_1` > `EquipSell_Scroll_Area`, riga `Panel_On`, popup
`EquipSell_Dialog_Step1` (`Txt_data4`), conferma `EquipSell_Dialog_Step2` (`[fn]`, serve
`Txt_cancel` minuscolo). `POST /user/material/sell` {userMaterialId, number} (50) ->
`userData.userPoint` + `userMaterial`. Prezzi khuxwiki: Mythril Stone 50, Gem 100, Crystal 150, altri
10; Mythril Shard e Orichalcum non vendibili. Icone dei materiali: `fetch_material_icons.py` (44 su 45,
manca Remembrance Gem).
