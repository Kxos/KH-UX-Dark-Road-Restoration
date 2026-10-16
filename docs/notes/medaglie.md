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
- Medaglia mancante -> ripiego sulla **medaglia 1** (`FUN_00eb577c`): `make-game-tables.js`
  aggiunge la riga 1 (master 1 = Paperino blu senza costo).
- Medaglie di supporto impilate: `validPack` (thethiny `unk_1116`), badge rosso.
- <a id="tier"></a>**Tier** (SP Attack Bonus, «SAB Tier» della khuxwiki, 1-10) = `guiltValue`
  (+0x4c0). Il dettaglio carica `img/ui/guilt/MedalInfo_Guilt<guiltValue>.png` (`FUN_0072ed74` ->
  `FUN_0072ef08`: 0 = icona nascosta; se 0 e `validEvolve` segue `evolveId`); un file assente lascia
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
  dell'utente sono le `Guilt<n>_On` delle schermate keyblade (`FUN_0072b80c`, che carica anche
  `_Off`, `_Err`, `_num`, `MD_Guilt<n>_*`): nelle risorse solo `Guilt4_On`, `Guilt5_On` e
  `Guilt1-8_Err`; `make_textures.py` genera le altre (On/Off dalla khuxwiki; `_num` e `MD_*` copie).
- Shuffleskill/trait: `shuffleskillSlot` (+0x4b4) e `spShuffleskillSlot` (+0x4b8) non esistono nel
  formato vecchio. `make-game-tables.js` (`traitSlots`, khuxwiki «Trait Slots»): tier 1-3 -> 1,
  4-5 -> 2, 6-10 -> 3, SN/Supernova e Prime 7★ -> 5, Prime 6★ -> 3, supporto 0; 1 slot speciale a
  tutte le medaglie d'attacco. Eccezioni della wiki (alcune 6★) non applicate. Le «7★» di Roboloid
  senza prefisso (561, es. Wakka) hanno una rarita' sospetta: non usata per gli slot.
- Elemento `userMedal` (`FUN_0078d608`): `userMedalId` uint64, `medalId`, `number`, `level`, `exp`,
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
  `FUN_00df1c00` e vicine: `Win_Bottom` (`Txt`, `Txt_Button`), `Medal_Sell_Panel` (solo la barra in
  alto), `Scroll_Area`, `Button_Back`, `Button_Sort`, `Button_Sell1`/`Txt_Sell1`; contatore
  `Txt_MedalGet` («Slots», 101200050), `Txt_MedalGet_Num_Label` / `Txt_MedalGet_All_Label`
  (`FUN_00df34a4`); barra di ordinamento generica `FUN_00760c64` (`Txt_Sort`, `Txt_Sort_Label`,
  `Txt_Filter_On`).
- Griglia: scena scalata 1,6875 e centrata (x_schermo = 960 + (x - 480)·1,6875), celle 120x164
  (`FUN_0087fa88`); 7 colonne intere: `MedalList_Gen` `Scroll_Area` 954 px da x=3, vendita 942 px da
  x=9 (passo 126, prima a 33 dal bordo). Pulsanti scalati 0,765, prima riga sotto la barra.
- Dettaglio: `FUN_00aba238` carica `SlideMedalInfoScene_ver341` sopra `MedalInfoScene_ver320`; il
  primo figlio di `LeftUI`/`RightUI` diventa pulsante (`FUN_008d601c`), callback
  `FUN_00abf974`/`FUN_00abfaa8` -> `FUN_008bf3a8`/`FUN_008bef44` (scorrimento come lo swipe).
  `Panel_Left`/`Panel_Right` con origine al centro della freccia (30,320 e 930,320; 120x220).
- Cursore della griglia: armatura `Cursor_Anim_MedalSell` (movimento `Animation1`, `FUN_00882e10`) =
  copia del cursore della fusione `Cursor_Anim_MdalMix_ver103` (bagliore `Medal_Syn_Select_Eff02`,
  144x172). Selezione: `MedalSelectAnimation` (`Medal_Select01`, `FUN_009e7108`).
- Targhetta sotto la medaglia: segue l'ordinamento; sulle medaglie di supporto alterna il prezzo con
  i testi 101210001-003, che nelle risorse inglesi sono uno spazio (originale «FOR SYNTHESIS»)
  (ISSUES I-022).
- Animazione della targhetta (ISSUES I-047): nessun ciclo STR -> DEF -> costo, ne' nell'originale
  ne' nel codice. Un solo valore per modalita' di ordinamento (`+0x470`, switch in `FUN_008c8904`);
  le medaglie con uno stato alternano valore ed etichetta: `FUN_008c8058` (ogni frame da
  `FUN_00b8d2e0`) tiene 2 s il valore, 1 s di dissolvenza, 2 s l'etichetta, 1 s di dissolvenza
  (periodo 6 s; `FUN_008c81a8` applica le opacita'). Etichetta da `FUN_00eb577c`: medaglia in un
  deck di `userDecks` (`FUN_007d8194`) -> «Equipped» (101210004); Spirit 106110305; Subslot
  101210010. Video originale (2019): stessi tempi misurati al decimo di secondo
  (`reference\medal_list_plate\`). Sul banco il deck e' [1, 0, 3] (medaglie iniziali, in fondo
  alla lista per Strength): le medaglie in vista non sono equipaggiate e restano ferme, come
  nell'originale.

<a id="sort"></a>
## Popup Sort/Filter

`FUN_00a458c4` carica `PopupNormal_SortButton_ver350` (generato dalla ver320). `FUN_00a45fa0`
(troppo grande per il decompilatore: nomi dallo stack e dal blocco di stringhe) cerca `Dummy_Sb` con
~30 `Filter_Sb*`, `Txt_TitleSb`, `Txt_SubTitleSb01/02`, `Filter_Subslot`, `Filter_Trait`,
`Filter_Evo_Set`, `Filter_Ability_*`: cloni nascosti di CheckBox (`Filter_Sb` dentro `Dummy_Sb`,
genitore letto a 00a482ac). Texture ricostruite in `make_textures.py` (riferimenti
`reference\medal_list\sort_filter\`). Da confrontare con l'originale: «Favorite», «SP Attack Bonus /
No Bonus» grigi, «Imitation», «Special Traits» con 11 icone e «None» due volte (ISSUES I-023).

Riga «SP Attack Bonus» (tier): il layout originale ver320 ha `Filter_Guilt1..9` (8 in alto, il 9
sotto a sinistra) con `Logo_01` = `MedalInfo_Guilt<n>.png`; il codice (`FUN_00a53ca8`) cerca
`Filter_Guilt%d` da 1 finche' li trova, e la ver350 ne vuole 10 (clone di `make_layouts.py`). Prima
il 10 era nascosto sotto il 9 e `MedalInfo_Guilt9` era una copia dell'8; ora 9 e 10 sono disegnate
(`make_textures.py`, stile delle 1-8 originali) e il 10 sta accanto al 9 (x 185). Le tier 9-10
esistono (khuxwiki: 307 medaglie): la riga non si ferma all'8 della guida. Icone e confronti:
`D:\Progetto_Restauro_KH_UX\reference\medal_tier\NOTE.md` ([tier](#tier)).

<a id="filtri"></a>
Sezione **Supernova** (visibile da quando le medaglie hanno `validSuperBurst`, master 108). Testi
106240205-227 assenti ovunque (IPA 4.4.0 e JP 4.3.1: segnaposto «[id]»): nostri, in
`make_layouts.py` (TEXTS). Filtro `FUN_00759f50` (unico chiamante `FUN_0075fab4`, 15 controlli in
AND); riga «SN» = `burst` di `superBurstId` (`FUN_00ef0310`, nessun limite agli id 4000000+).

| Pulsante (flag del filtro) | Testo | Condizione |
|---|---|---|
| Filter_Sb / SbPlus / SbPlusPlus (0x12-0x14) | icone SB | medaglia `displayId` 100/200/300 (+1, +1000, +1001), `validSuperBurst` 1 (`FUN_00eb60c0/61ac/6298`) |
| Filter_Sb_NotSet (0x3c) | None | nessuno dei tre |
| Filter_Sb_Single/All/Random (0x2c-0x2e) | Single/All/Random | riga SN `target` 1/2/3 (in OR) |
| Filter_Sb01-08, 09, 12 (0x2f-0x38) | icone (sotto «Types», 106240205) | buff/debuff della riga SN (`bufAttack*`, `debufDefense*`, ...) |
| Filter_Sb_Guard / BaseAttack / BaseDefence (0x39-0x3b) | Pierce DEF / Base STR / Base DEF | `penetrate` > 0 / `addBaseAtk*` / `addBaseDef*` != 0: da noi sempre 0 |
| Filter_Sb_Recovery (0x3d) | Heal | `heal`, `cure*`, `recovery` |
| Filter_Sb_Special (0x3f) | Special | copia/azzeramento buff, contatore, riflesso |
| Filter_Sb_Recovery2 (0x3e) | SN Renew | `recurringAttribute` > 0 |
| Filter_Sb_AttackOnly (0x40) | Attack Only | `specialPowerType` 1 e nessun effetto |
| Filter_Sb_Timing1-7 (0x41-0x47) | 1-7 sotto «PvP Timing» (106240220) | `superburstTiming` == n |

106240206-208 = Pierce DEF / Base STR / Base DEF della sezione Special Attacks (riga `burstId`).
Restano a `%d`/`%d+` solo 106240201-204 (Hits/Gauges). Banco 14-10 (un filtro alla volta): SN+,
None, Single, SN Renew (le 16 SN++ «R», icona verde) corretti. Attenzione: uno swipe che parte su un
pulsante lo attiva (Hits/Gauges fuori vista davano liste vuote o solo Moogle): scorrere sul bordo
destro (x 1722) e controllare che Undo sia grigio. Da fare: `target` 3 per le Supernova casuali
(Roboloid ha solo Single/All) e `penetrate`/`addBase*` (nessuna fonte con i valori originali).

<a id="vendita"></a>
## Vendita (Sell Medals) e lucchetto

- `FUN_00bf0a10` carica `MedalSellScene_ver350`: CenterUI `MedalSell_Gen.json`, LeftUI
  `MedalSell_Back.json`, RightUI pannello vuoto (`FUN_00bf302c` usa il primo figlio dei tre). Nomi:
  `Txt_Money`/`Txt_Money_Label` (`FUN_00bf25fc`), `Txt_Money_Total`/`Txt_Money_Total_Lavel` (sic),
  `Txt_A_Coin(_Label)`, `Plate_A_Jewel`/`Plate_A_Ticket`, `BoxNow`, `BoxMaxLabel`, `DeckBase2`.
- Conferma `PopupNormal_MedalSell_Check_ver350` (`FUN_00bf3804`), esito
  `PopupNormal_MedalSell_Ok_ver350` (`FUN_006f4918`): copie di `PopupNormal_Text_34_4Line_OkCancel/
  Ok`; ricompense `Panel_1..4` con `Obtain_Plate_a..d` (`FUN_006f33f0`: `Txt`, `Txt_Label`, `Icon`);
  medaglie rare: `Alert_Area` <- `PopupNormal_MedalMix_RareCaution_Panel.json` (generato).
- `POST /user/medal/sell` (51) `{"userMedalIds":[..],"numbers":[..]}` -> `userData.userPoint`,
  `userSkills`, `userMedals`, `sellUserMedalIds`.
- Popup della quantita' `EquipSell_Medal_Step1_ver131`: «1/N» = `Txt_MaterialStock_Fix_2`,
  `Txt_data3` «/», `_Fix_3` massimo; fascia rossa «Includes ★★★ Medals or higher.» (Panel
  233,18,38, bordi 255,2,0, `rare_star.png`) se la pila ha piu' di 2 stelle.
- Lucchetto: `POST /user/medal/lock` (46) `{"userMedalIds":[..],"isLocks":[..]}`, mandato **solo
  uscendo da Medal List**; risposta `userMedals` (`FUN_0078da18`), `deleteUserMedalIds`,
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
- Conferma del rilancio della guilt (`FUN_00c85350`): `PopupNormal_Guilt_ver130` mancava (crash al
  tocco di Level Up con una copia su una medaglia con guilt), generato da `PopupNormal_Text_34_4Line_
  OkCancel`: `Win` > `Txt_Wording1` (101300035), `Txt_Wording2` (101300036, intervalli uguali) o
  `Dummy` > `Txt_Wording4` «Bonus range:», `Txt_Wording5` -> `Syn_Arrow02` -> `Txt_Wording6`
  (101300055: intervallo +0x508 -> +0x510) con `Dummy_Announce` > `Txt_Announce` (101300056,
  lampeggia), `Txt_Wording3` (101300037). Testi tutti gia' serviti. Nessuno screenshot originale.
- Avviso dei materiali rari (`FUN_00c83540`): i `_Panel` stanno in `Alert_Area` con x = 0, quindi
  `Alert_Area` e' larga 600 e centrata; caso 1 = rarita' > 2 (`FUN_00c7e568`), «Includes ★★★
  Medals or higher.» con le stelle figlie di `Star1`.
- Evolve (azione 56): la medaglia diventa `evolveId` al livello 1, materiali consumati (anche dalle
  pile), costo `evolveMoney`; risposta `before/afterEvolveUserMedal`, `pet`, `attachmentMedalIds`.
  Scena `MedalEvoScene_ver320` generata (stile `reference\medal_evolve\`); `MedalInfo_Information_R1`
  con `Panel_MixResult_Area`/`Tap_Screen_Area` della R3. Le LWF
  `lwf/medal/compose/evolution/card_evolution_result_01..05` mancano: copie del Level Up (ISSUES
  I-024). Provata sul banco: Donald 1★ LV20 + Cheshire Cat -> Donald 2★.
- Evolve con medaglie richieste (client 4.3.1, 14-10; Supernova: 5 Dual Meow Wow [SAB LV 7/8/9]
  dello stesso tipo, khuxwiki): riga medaglia `validEvolve` +0x544, `evolveId` +0x548, `evolveMoney`
  +0x54c, `validEvolveNeed` +0x550 = **numero** di medaglie richieste (fino a 5), `evolveNeedId[5]`
  +0x554 = medalId richiesto per ogni posto (5 Dual Meow Wow uguali = `[X,X,X,X,X]`). La scena
  (`FUN_00cc174c`) raggruppa gli id consecutivi uguali e conta le copie possedute (elenco delle
  medaglie dell'utente, record da 0x148, medalId a +0). `FUN_00e9343c`: `validEvolve` non e' solo
  0/1 (3 = ramo diverso, 1 = suoni/tutorial), da verificare. La richiesta (`FUN_007e4194`, azione 56)
  ha solo `baseUserMedalId` e `attachmentMedalIds`: le medaglie richieste arrivano in
  `attachmentMedalIds` insieme ai materiali (da confermare sul banco, anche per le pile `validPack`:
  stesso userMedalId ripetuto?). Il server deve consumarle e rispondere come per l'Evolve normale.
<a id="blue-fairy"></a>
- **Evolve 6★ -> 7★ con le Blue Fairy** (15-10, fonte dell'utente e khuxwiki «Blue_Fairy»): 5 Blue Fairy [SA Bonus LV n]
  dello stesso tier della medaglia (`guiltValue`), Set 26 EN (maggio 2018), dalle draw dei ticket PvP. `server/blue-fairy.js`:
  8 righe (Roboloid 1495-1502 -> medalId 301495-301502, album 1447-1454, copiate da Magic Broom; grafica gia' in
  medal_gen) e `validEvolveNeed` 5 / `evolveNeedId` [fata del tier x5] sulle 397 righe 6★ evolvibili in 7★ che non
  avevano medaglie richieste (`evolveMoney` 99999 invariato). Master revisione 109.
  Il client (`FUN_00cc174c`) accende Evolve solo con: livello massimo (+0x4cc), tutte le medaglie richieste, munny >=
  `evolveMoney` (+0x54c) e, se la 7★ ha +0x4ac maggiore, guilt della medaglia utente (+0x15c) al **massimo**
  dell'intervallo del tier (`FUN_00c80b50`): il «Max Guilted» della fonte e' imposto dal client.
  Banco 15-10: Lexaeus A 6★ LV100, 5 pallini, guilt 10000 (max tier 3) + 5 Blue Fairy [3] -> Lexaeus A 7★ (No. 1111),
  richiesta `{baseUserMedalId:723, attachmentMedalIds:[2313 x5]}` (la pila ripete il primo id), il server consuma
  2313-2317 e 99999 munny. Come si ottengono senza PvP: I-126 (decisione rimandata).
<a id="bgm-medals"></a>
- **BGM Medals** (15-10, `referencegm_medals\`, khuxwiki «Category:BGM_Medals»): 37 medaglie con un brano che
  suona nel dettaglio della medaglia e in home quando e' condivisa (Share). Client: `medal.bgm` int (+0x56c,
  `FUN_00efce88`) = id del suono; `FUN_00737ff0` lo suona (`FUN_00ac7278`, dissolvenza 500 ms) e caricando
  `audio/%09d.akb` (`FUN_00ac4894`, banco SQEX AKB v2 con Ogg Vorbis; senza file non suona nulla, ma l'icona ♪
  `Support_Bgm` compare lo stesso). `text/audio/<nome>` e' solo testo (nome -> id).
  Server: `server/medal_bgm.json` (nome -> id, abbinamenti incerti in `_incerti`) applicato da `make-game-tables.js`
  (71 righe, master revisione 110); i 20 AKB non serviti dal JP 4.3.1 (`import_jp_coco.py`, `audio/` fuori da
  cocostudio/publish), riserva delle versioni complete portata a 128 MiB (risorse 37). Share = `POST
  /user/support/update` {supportMedalId} (azione 47, stesso ramo 0x7c4124 della 19): `player.supportUserMedalId`,
  servito da `GET /user/support`. Banco 15-10: HD Roxas -> Another Side nel dettaglio e, condivisa, in home;
  Sephiroth [EX] -> One-Winged Angel (sentiti dall'utente). Senza file: HD King Mickey [EX] (Vim and Vigor).
  Crash intermittente della home dopo il -Quick (pet `wait.lwf` non caricato, `FUN_00b3c350`): non riprodotto
  con le stesse risorse dopo un riavvio, da tenere d'occhio.
  16-10 (master 113): le Supernova (SN/SN+/SN++ - X) prendono il brano della medaglia base X (decisione
  dell'utente; nell'originale documentata solo Supernova - Sephiroth): +7 righe (SN++ - Final Boss Xion, SN++ - HD
  Roxas, SN++ - Illustrated Xion, SN/SN+ - Casual Roxas, SN/SN+ - HD Xion [EX]), 78 in tutto. Prova mirata:
  `D:\Progetto_Restauro_KH_UX	mpgm_save.js` (a server fermo) lascia nel salvataggio solo le 78 medaglie con
  musica; salvataggio vero in `tmp\player_before_bgmtest.json`, da rimettere dopo la prova.
  **Banco 16-10: tutte le 78 suonano** (sentite dall'utente), anche Dearly Beloved (501006001) e HD Ventus [EX]
  (501006019): i loro AKB sono gia' negli OBB serviti. Resta senza brano solo HD King Mickey [EX] (Vim and Vigor, bgm 0).
- Unequip: `POST /user/medal/remove` (237); prima il client chiede `GET /user/medal/preremove`, a cui
  il server da' una risposta generica (ISSUES I-038).

<a id="materiali"></a>
## Sell Materials

`EquipSellScene` (`FUN_00c5e584`): `Panel_1` > `EquipSell_Scroll_Area`, riga `Panel_On`, popup
`EquipSell_Dialog_Step1` (`Txt_data4`), conferma `EquipSell_Dialog_Step2` (`FUN_00c611fc`, serve
`Txt_cancel` minuscolo). `POST /user/material/sell` {userMaterialId, number} (50) ->
`userData.userPoint` + `userMaterial`. Prezzi khuxwiki: Mythril Stone 50, Gem 100, Crystal 150, altri
10; Mythril Shard e Orichalcum non vendibili. Icone dei materiali: `fetch_material_icons.py` (44 su 45,
manca Remembrance Gem).

<a id="trait-medal"></a>
## Trait Medal (I-084)

Fonti in `reference\trait_medals\NOTE.md` (avvisi Square Enix 38128, 46740, 54963; guida dell'utente
p. 21-23; khuxwiki). «Dedicated Awakening Medal»: ognuna e' legata a una medaglia (es. Trait Medal #1
-> Illustrated KH Riku [EX]), 6★ in bianco e nero con la stessa immagine, stessa voce dell'Album;
STR/DEF 1, costo 999, 15 Pet Point, «Lesser Attack» x1,00 a 1 gauge. Circa 313 (khuxwiki: 189).
- Fusa sulla sua medaglia: +1 trait casuale e +1 pallino; con i pallini pieni sblocca o rilancia
  la guilt (come una copia identica o Mickey & Brooms; il +1% e' il Magic Mirror). Su altre
  medaglie solo EXP. Slot dei trait pieni: il giocatore sceglie quale sostituire o scarta il nuovo.
- Dalla 3.3.0 si impilano fino a 99, niente spirit slot ne' condivisione. Ottenute da deal
  dedicati, eventi, Moogle Shop («Trait Medal #N x10», 1.000 jewel).
- Client 4.3.1: filtro della Medal List (`FUN_0075fab4`) con i tipi 1, 2, 4/8, 5, 6, 3, 9, 10 =
  Attack, EXP, Boost, Cost, Evolve, Sell, Trait, Subslot (Trait = type 9, da confermare);
  `FUN_0088020c` esclude 9 e 10 dagli Special Trait. Materiale «da pallino» (`FUN_00c83140`):
  stessa groupId, groupId in `burstEnhanceCategory` della base, o type 8: la Trait Medal va
  collegata cosi'. Il trait lo decide il server: `afterEnhanceUserMedal.userShuffleSkills`,
  `overwriteSkills`, `successOverwrite`, `medalResumption {userShuffleSkills, resumptionStatus}`;
  slot pieni -> `POST /user/medal/shuffleskill` (azione 57) `{userMedalId, userShuffleSkillId,
  enableUserShuffleSkillId}` (testi «Choose a trait to replace.», «There are traits that have not
  been set.»).
- Stato: nessuna riga nel master locale; `shuffleskill.json` ha `rate` 0 (pesi ignoti). Il server
  non da' trait da fusione (ne' dalle copie identiche) e `medalResumption` e' sempre vuoto.

<a id="skill"></a>
## Skill e Overwrite Skill del Level Up (I-088)

Fonti (`reference\medal_overwrite\NOTE.md`): khuxwiki «Medal» (sezione Skills) e «Scrooge»
(`reference\guilt\khuxwiki_raw.md`), kingdomhearts.fandom «Medals», khwiki «Skill», GameFAQs
(thread 74095652), Reddit r/KHUx (`reference\optimize\reddit_subslot_pet_levelup_optimize.md`),
testi del client 101300020-032 e 100620003.
- Skill = abilita' passiva della medaglia (tabella `skill`, 12 righe: Attack Boost I/II, Attack Boost
  All I/II, Poison, Paralysis, Sleep, Attack Prize Plus, Lux Plus, No Cost, Defense Boost I/II;
  maxLv 10/15/20). Una per medaglia (khwiki; il client ne legge 2). Sale di livello usando la
  medaglia in battaglia (EXP della skill, tabella `skillExp`). Rara sulle medaglie dei deal; le
  **Scrooge** (EXP medal 3/5/6★, Colosseo ed eventi) la portano sempre al livello massimo.
- Overwrite (wiki): la skill del materiale **piu' a sinistra** passa alla base; 20% al livello 1 della
  skill, fino al 100% al massimo (Scrooge sempre 100%); spesso la base tiene la sua. Con «Overwrite
  Skill» spento le skill dei materiali si perdono (101300031 «"Overwrite Skill" is OFF. Skills will
  be lost!», 101300032). Il livello passa con la skill (le Scrooge la danno al massimo); Evolve
  conserva il livello (101400007). Costo: nessuno in piu' (il munny del Level Up resta medalMisc 115).
- Client 4.3.1: richiesta `FUN_007e3bbc` = `{baseUserMedalId, componentUserMedalIds, isOverwriteSkill
  (0/1, scena +0x578, pulsante `Button_Overwrite`, `FUN_00c81150`), numbers, isGreatSuccess}`: nessuna
  skill scelta. Probabilita' (`FUN_00c8151c`, «Success Rate %d%%» 101300021): skill del primo materiale
  (`Txt_SkillName_Label`, `Icon_Skill`); per ogni skill dei materiali con la stessa `categoryEvolve`
  (+0x114) somma `121 + (122 - 121) * (lv - 1) / (maxLv - 1)` (medalMisc 121 = 2000, 122 = 10000) per
  il moltiplicatore delle campagne (+0x5e0, «Increased probability of skill overwrite» 104600016) /
  10000; limite 100%. Risposta (`FUN_0078f990`): `overwriteSkills` = elementi userSkill,
  `successOverwrite` (+0x2b0): il risultato (`FUN_00c97818`, `FUN_00c873f0`) mostra il nome della
  skill della base dopo la fusione.
- Elemento userSkill (`FUN_0078e7b8`): `userSkillId` uint64, `skillId`, `level`, `exp`, `userMedalId`,
  `getDatetime`; `userMedal.userSkills` = soli id (int). Il client cerca ogni id nella tabella della
  sessione (`FUN_00eb76f0`, +0x1c8, riempita dalle liste `userSkills`): id senza oggetto = riga skill
  0 = crash; con l'oggetto legge `skillExp` per `expType` (getter senza controllo del null).
- Server (`server/medal-skill.js`, 12-10): `player.medalSkills[userMedalId]` dopo un Overwrite
  riuscito (userSkillId da `player.nextUserSkillId`); le Scrooge hanno una skill calcolata (id
  1000000000 + userMedalId, livello massimo; quale skill avesse ogni Scrooge non si sa: ipotesi 3★
  rango 1, 5★ rango 2, 6★ No Cost, scelta con userMedalId). `userSkills` intera in login, inventario,
  Level Up, vendita, trait; il supporto manda la skill della sua medaglia. `skillExp` (vuota nel
  master) ricostruita in `server/tables/skillExp.json` (`[N, A, P]` = maxLv, 1000/3000/6000, 15000:
  valori inventati, l'EXP delle skill in battaglia non e' servita). Prova: `server/test-medal-enhance.js`
  (punto 9).
- Optimize del Level Up (`Button_MaxEnhanced`, `openMaxEnhancePopup` -> `runMaxEnhance`, `FUN_00ca3830`):
  tutto nel client, che sceglie i materiali e manda la stessa `/user/medal/enhance` (con `numbers`
  per le pile); nessun dato in piu' dal server. Dalla 3.3.0 usa Huey & Dewey & Louie e non le medaglie
  d'attacco, riempie la barra dell'EXP; le Scrooge messe a mano non le tocca (Reddit).

<a id="optimize"></a>
### Popup di Optimize (I-090)

- Il crash al tocco di Optimize (banco 12-10, pc in `FUN_011adbc4` -> `FUN_0071f8ec`, x2 = 0x191924c
  «widgetTree») e' GUIReader su un layout assente: `openMaxEnhancePopup` (`FUN_00c93f90`) carica
  `cocostudio/publish/MedalInfo_MaxEnhanced_ver340.json`, che non c'e' in nessuna risorsa. Server,
  master e risposte non c'entrano (`runMaxEnhance` `FUN_00ca3830` arriva solo dopo il popup).
- Widget cercati (tutti senza controlli tranne `Announce`): `Scroll_Area` (MaxEnhanceMedalScrollView
  con i materiali scelti), `Txt_Title` (106220300 «Choose a parameter to max out.»), `Txt_attention`
  (106220301), `Base_Money1`/`Base_Money2` > `Txt_Money` (100300002/3) e `Txt_Money_Label` (costo e
  posseduti), `Button_Mix` (vi aggiunge il pulsante But01) > `Txt_Mix` (106220314 «Level Up»),
  `Close_Button`; per MaxLv/MaxAtk/MaxDef/MaxCost/MaxGuilt un nodo con `CheckBox_<p>` (CheckBox vero),
  `Plate_Max` (lampeggia, la mostra `FUN_00c9beec`), `Txt_<p>` (106220304/306/308/310/312) e
  `Txt_<p>_Label` (valore «%d», «+%d», «Maxed Out»...). Le scelte si ricalcolano a ogni tocco
  (`FUN_00c96234` -> `FUN_00c8b954`, aggiornamento `FUN_00c9ab28`); Level Up chiama `runMaxEnhance`,
  che manda la normale `/user/medal/enhance`.
- Layout generato in `make_layouts.py` (12-10): finestra Win04, filtri But16 a sinistra, griglia a
  destra, targhe Munny e Level Up come `MedalInfo_Mix_ver340`. Nessuno screenshot originale trovato.
  Banco 12-10: il popup si apre, ma «No Medals» su ogni parametro.
- Candidati (`FUN_00c8b954` -> `FUN_00c8fcfc`, scorre la lista della scena +0x330, cioe' le medaglie
  della lista del Level Up, probabilmente gia' filtrate dal Sort/filtro): riga medal con
  `autoEnhance` (+0x488) != 0 e `type` (+0x490) 2, 4 o 5; medalId non nella mappa di esclusione
  (+0x680); medaglia non protetta (`FUN_00eb5ee4`, elenco locale degli userMedalId); `userMedal`
  +0x48 < 1. Per ogni parametro **non** spuntato si scartano le medaglie che lo darebbero:
  LV -> `materialExp` (+0x518), STR -> `enhanceAttack` (+0x52c), DEF -> `enhanceDefense` (+0x530),
  Cost -> `enhanceCost` (+0x534), SP Attack Bonus -> `enhanceGuilt` (+0x538). Poi ordina
  (`FUN_00c900f0`) e sceglie fino al massimo di ogni parametro.
- `autoEnhance` era 0 su tutto il master: il formato vecchio non ce l'ha. Regola in
  `make-game-tables.js`: 1 se `validPack` (unk_1116 del formato vecchio) e type 2/4/5, cioe' Huey/
  Dewey/Louie e HDL, Chip, Dale, Magic Mirror, Cid/Cid 5/Cid 10 (23 righe). Restano fuori le
  Scrooge (type 2, unk_1116 0), come nell'originale (Reddit: Optimize non usa le Scrooge). Valori
  originali non trovati: regola ricostruita.
