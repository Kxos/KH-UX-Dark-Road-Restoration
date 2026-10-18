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
- <a id="boosted"></a>**Boosted** (sotto-progetto 2b, Task 3, 17-10): una riga a parte del master `medal`
  (`server/medal-boost.js`, `server/make-boosted-medals.js`, in fondo a `make-game-tables.js`), non un campo di
  `userMedal`. medalId = variante x 1.000.000 + normale (1 = +1000 STR, 2 = +1000 STR/DEF, 3 = +2000 STR/DEF);
  `displayId` = normale + 1 se la normale e' in {0, 100, 200, 300, 1100, 1200, 1300}, altrimenti 1; `groupId` =
  normale (la normale resta 0); STR/DEF base e massimi + str/def; `cost`/`minCost` - 10 (minimo 0; video LFJ5:
  SN++ - Master Eraqus 46 -> 36; `minCost` proposta); `validPack` 0; tutto il resto (immagini, nome, `sortId`,
  burst, `guiltValue`, `addMaxAttack/Defense`, Evolve) uguale. Righe dalle voci `enhance.boosted` del catalogo:
  **1125** (1000/1000: 1023, 1000/0: 95, 2000/2000: 7; per nome 442 coppie, per Tier 1003, per slot 140, gia'
  coperte dalle altre due); `medal.json` da 2108 a 3233 righe (2.435.784 -> 3.770.561 byte). Nomi del catalogo
  senza riga: «launchpad mcquakc», «webby vanderquakc», «axel [ex]», «kairi [ex+]», «sn++ - master eraqus
  supernova+ - ava» (refusi/frasi del catalogo, nessuna riga). `make_banner_catalog.py` ignora le boosted:
  rigenerato dopo la patch, catalogo identico (sha1 47861a1a).
  **Verifica nel decompilato (U5/U6, WW 4.3.1)**: lettori del campo +0x18 della riga medal (getter
  `[fn]` con offset 0x18 su `*(medaglia+0x168)`, scansione di tutte le 80 chiamate con offset 0x18 in
  `D:\Progetto_Restauro_KH_UX\tmp\sp2b\t3\ctx18.txt`): `[fn]` (boosted se 1/101/201/301/1101/1201/1301),
  `[fn]` (badge: confronta `displayId - 100/200/300/1100/1200/1300 < 2`, cioe' n e n+1 uguali),
  `[fn]`/`[fn]`/`[fn]` (SN/SN+/SN++, stesso schema `- n < 2`, dopo il campo +0x504).
  Nessuno usa `displayId` come indice di immagine o di tabella; 1 non cade in nessun intervallo del badge (come
  0). Le altre chiamate con offset 0x18 leggono altre tabelle (dimensione 1/8/0x21/0x505, oppure +0x24 intero
  dentro il nome della medaglia, `[fn]`) o un oggetto con +0x38 (barra a rapporto in `[fn]` a
  0x733500); `[fn]` copia +0x14/+0x18 in un'altra riga allo stesso offset. medalId nel parser
  `[fn]`: rapidjson `IsInt()` (bit 0x400 di flags, byte +0x11 bit 2) e copia di 4 byte: intero a 32
  bit, gli id fino a 3.301.993 stanno ben sotto 2^31. Esito: nessun blocco.
  Altre ricerche per nome che vedrebbero le boosted (da filtrare con `isBoosted` nei task che le toccano):
  `make-limited-missions.js` (mappa nome -> riga a rarita' massima: la boosted, a pari rarita' e dopo, non
  sostituisce la normale), `grant-all-medals.js` (darebbe anche le boosted), album/Medal List in `server.js`.
  `supernova.js` e `blue-fairy.js` cercano per id e girano prima della patch: nessun filtro.
  **Rigenerazione**: le boosted copiano la normale in fondo a `make-game-tables.js`; lanciare da soli
  `supernova.js`, `blue-fairy.js` o `make-pet-tables.js` lascia le copie boosted con i valori vecchi finche'
  `make-game-tables.js` non gira di nuovo (con `KHUX_MEDALS_ALL=1`: senza, il master scende a 522 medaglie).
  **Al banco (Task 10, 17-10, risorse 41, rev 121)**: fascia BOOSTED nel risultato, dettaglio con STR/DEF/Cost gialli,
  Cost 36 (46 - 10) e il No. della normale, targhetta LV rossa in Medal List e Level Up; Level Up normale ->
  boosted con il pallino (U2), Cid sulla boosted (U1), Medal List/dettaglio/Evolve senza crash (U6); esiti in
  [shop.md#sp2b](shop.md#sp2b).

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
  (2.130 medaglie dal 18-10, comprese le 13 6★ [+] 301446...301782 ottenute dal master rigenerato, stessa riga di
  Roboloid per nome+stelle: le copie potenziate 2301xxx riusano l'imageId della base; nomi con `%23` decodificati).
  Pacchetto penultimo delle versioni complete: `-Quick` NON lo ricostruisce, per nuove immagini serve `-Version N+1`
  (offline, non tocca il guest; poi `update-resources.ps1`).
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

<a id="filtri"></a>
Sezione **Supernova** (visibile da quando le medaglie hanno `validSuperBurst`, master 108). Testi
106240205-227 assenti ovunque (IPA 4.4.0 e JP 4.3.1: segnaposto «[id]»): nostri, in
`make_layouts.py` (TEXTS). Filtro `[fn]` (unico chiamante `[fn]`, 15 controlli in
AND); riga «SN» = `burst` di `superBurstId` (`[fn]`, nessun limite agli id 4000000+).

| Pulsante (flag del filtro) | Testo | Condizione |
|---|---|---|
| Filter_Sb / SbPlus / SbPlusPlus (0x12-0x14) | icone SB | medaglia `displayId` 100/200/300 (+1, +1000, +1001), `validSuperBurst` 1 (`[fn]/61ac/6298`) |
| Filter_Sb_NotSet (0x3c) | None | nessuno dei tre |
| Filter_Sb_Single/All/Random (0x2c-0x2e) | Single/All/Random | riga SN `target` 1/2/3 (in OR) |
| Filter_Sb01-08, 09, 12 (0x2f-0x38) | icone (sotto «Types», 106240205) | buff/debuff della riga SN (`bufAttack*`, `debufDefense*`, ...) |
| Filter_Sb_Guard / BaseAttack / BaseDefence (0x39-0x3b) | Pierce DEF / Base STR / Base DEF | `penetrate` > 0 / `addBaseAtk*` / `addBaseDef*` != 0: `penetrate` sempre 0; `addBase*` dalle descrizioni dal 18-10 ([battaglia](battaglia.md#basebuff), I-155) |
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
(Roboloid ha solo Single/All) e `penetrate` (nessuna fonte con i valori originali; `addBase*` ricostruiti dalle descrizioni, [battaglia](battaglia.md#basebuff)).

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
- Conferma del rilancio della guilt (`[fn]`): `PopupNormal_Guilt_ver130` mancava (crash al
  tocco di Level Up con una copia su una medaglia con guilt), generato da `PopupNormal_Text_34_4Line_
  OkCancel`: `Win` > `Txt_Wording1` (101300035), `Txt_Wording2` (101300036, intervalli uguali) o
  `Dummy` > `Txt_Wording4` «Bonus range:», `Txt_Wording5` -> `Syn_Arrow02` -> `Txt_Wording6`
  (101300055: intervallo +0x508 -> +0x510) con `Dummy_Announce` > `Txt_Announce` (101300056,
  lampeggia), `Txt_Wording3` (101300037). Testi tutti gia' serviti. Nessuno screenshot originale.
- Avviso dei materiali rari (`[fn]`): i `_Panel` stanno in `Alert_Area` con x = 0, quindi
  `Alert_Area` e' larga 600 e centrata; caso 1 = rarita' > 2 (`[fn]`), «Includes ★★★
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
  (`[fn]`) raggruppa gli id consecutivi uguali e conta le copie possedute (elenco delle
  medaglie dell'utente, record da 0x148, medalId a +0). `[fn]`: `validEvolve` non e' solo
  0/1 (3 = ramo diverso, 1 = suoni/tutorial), da verificare. La richiesta (`[fn]`, azione 56)
  ha solo `baseUserMedalId` e `attachmentMedalIds`: le medaglie richieste arrivano in
  `attachmentMedalIds` insieme ai materiali (da confermare sul banco, anche per le pile `validPack`:
  stesso userMedalId ripetuto?). Il server deve consumarle e rispondere come per l'Evolve normale.
<a id="blue-fairy"></a>
- **Evolve 6★ -> 7★ con le Blue Fairy** (15-10, fonte dell'utente e khuxwiki «Blue_Fairy»): 5 Blue Fairy [SA Bonus LV n]
  dello stesso tier della medaglia (`guiltValue`), Set 26 EN (maggio 2018), dalle draw dei ticket PvP. `server/blue-fairy.js`:
  8 righe (Roboloid 1495-1502 -> medalId 301495-301502, album 1447-1454, copiate da Magic Broom; grafica gia' in
  medal_gen) e `validEvolveNeed` 5 / `evolveNeedId` [fata del tier x5] sulle 397 righe 6★ evolvibili in 7★ che non
  avevano medaglie richieste (`evolveMoney` 99999 invariato). Master revisione 109.
  Il client (`[fn]`) accende Evolve solo con: livello massimo (+0x4cc), tutte le medaglie richieste, munny >=
  `evolveMoney` (+0x54c) e, se la 7★ ha +0x4ac maggiore, guilt della medaglia utente (+0x15c) al **massimo**
  dell'intervallo del tier (`[fn]`): il «Max Guilted» della fonte e' imposto dal client.
  Banco 15-10: Lexaeus A 6★ LV100, 5 pallini, guilt 10000 (max tier 3) + 5 Blue Fairy [3] -> Lexaeus A 7★ (No. 1111),
  richiesta `{baseUserMedalId:723, attachmentMedalIds:[2313 x5]}` (la pila ripete il primo id), il server consuma
  2313-2317 e 99999 munny. Come si ottengono senza PvP: I-126 (decisione rimandata).
<a id="bgm-medals"></a>
- **BGM Medals** (15-10, `reference\bgm_medals\`, khuxwiki «Category:BGM_Medals»): 37 medaglie con un brano che
  suona nel dettaglio della medaglia e in home quando e' condivisa (Share). Client: `medal.bgm` int (+0x56c,
  `[fn]`) = id del suono; `[fn]` lo suona (`[fn]`, dissolvenza 500 ms) e caricando
  `audio/%09d.akb` (`[fn]`, banco SQEX AKB v2 con Ogg Vorbis; senza file non suona nulla, ma l'icona ♪
  `Support_Bgm` compare lo stesso). `text/audio/<nome>` e' solo testo (nome -> id).
  Server: `server/medal_bgm.json` (nome -> id, abbinamenti incerti in `_incerti`) applicato da `make-game-tables.js`
  (71 righe, master revisione 110); i 20 AKB non serviti dal JP 4.3.1 (`import_jp_coco.py`, `audio/` fuori da
  cocostudio/publish), riserva delle versioni complete portata a 128 MiB (risorse 37). Share = `POST
  /user/support/update` {supportMedalId} (azione 47, stesso ramo 0x7c4124 della 19): `player.supportUserMedalId`,
  servito da `GET /user/support`. Banco 15-10: HD Roxas -> Another Side nel dettaglio e, condivisa, in home;
  Sephiroth [EX] -> One-Winged Angel (sentiti dall'utente). Senza file: HD King Mickey [EX] (Vim and Vigor).
  Crash intermittente della home dopo il -Quick (pet `wait.lwf` non caricato, `[fn]`): non riprodotto
  con le stesse risorse dopo un riavvio, da tenere d'occhio.
  16-10 (master 113): le Supernova (SN/SN+/SN++ - X) prendono il brano della medaglia base X (decisione
  dell'utente; nell'originale documentata solo Supernova - Sephiroth): +7 righe (SN++ - Final Boss Xion, SN++ - HD
  Roxas, SN++ - Illustrated Xion, SN/SN+ - Casual Roxas, SN/SN+ - HD Xion [EX]), 78 in tutto. Prova mirata:
  `D:\Progetto_Restauro_KH_UX\tmp\bgm_save.js` (a server fermo) lascia nel salvataggio solo le 78 medaglie con
  musica; salvataggio vero in `tmp\player_before_bgmtest.json`, da rimettere dopo la prova.
  **Banco 16-10: tutte le 78 suonano** (sentite dall'utente), anche Dearly Beloved (501006001) e HD Ventus [EX]
  (501006019): i loro AKB sono gia' negli OBB serviti. Resta senza brano solo HD King Mickey [EX] (Vim and Vigor, bgm 0).
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
- Client 4.3.1: filtro della Medal List (`[fn]`) con i tipi 1, 2, 4/8, 5, 6, 3, 9, 10 =
  Attack, EXP, Boost, Cost, Evolve, Sell, Trait, Subslot (Trait = type 9, da confermare);
  `[fn]` esclude 9 e 10 dagli Special Trait. Materiale «da pallino» (`[fn]`):
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
- Skill = abilita' passiva della medaglia (tabella `skill`, 163 righe dal 18-10: vedi «Tabella skill»
  sotto; maxLv 10/15/20). Una per medaglia (khwiki; il client ne legge 2). Sale di livello usando la
  medaglia in battaglia (EXP della skill, tabella `skillExp`). Rara sulle medaglie dei deal; le
  **Scrooge** (EXP medal 3/5/6★, Colosseo ed eventi) la portano sempre al livello massimo.
- Overwrite (wiki): la skill del materiale **piu' a sinistra** passa alla base; 20% al livello 1 della
  skill, fino al 100% al massimo (Scrooge sempre 100%); spesso la base tiene la sua. Con «Overwrite
  Skill» spento le skill dei materiali si perdono (101300031 «"Overwrite Skill" is OFF. Skills will
  be lost!», 101300032). Il livello passa con la skill (le Scrooge la danno al massimo); Evolve
  conserva il livello (101400007). Costo: nessuno in piu' (il munny del Level Up resta medalMisc 115).
- Client 4.3.1: richiesta `[fn]` = `{baseUserMedalId, componentUserMedalIds, isOverwriteSkill
  (0/1, scena +0x578, pulsante `Button_Overwrite`, `[fn]`), numbers, isGreatSuccess}`: nessuna
  skill scelta. Probabilita' (`[fn]`, «Success Rate %d%%» 101300021): skill del primo materiale
  (`Txt_SkillName_Label`, `Icon_Skill`); per ogni skill dei materiali con la stessa `categoryEvolve`
  (+0x114) somma `121 + (122 - 121) * (lv - 1) / (maxLv - 1)` (medalMisc 121 = 2000, 122 = 10000) per
  il moltiplicatore delle campagne (+0x5e0, «Increased probability of skill overwrite» 104600016) /
  10000; limite 100%. Risposta (`[fn]`): `overwriteSkills` = elementi userSkill,
  `successOverwrite` (+0x2b0): il risultato (`[fn]`, `[fn]`) mostra il nome della
  skill della base dopo la fusione.
- **Ramo 55 (Level Up): `userSkills` = skill da CANCELLARE** (banco 18-10, crash al tocco sul risultato):
  0x7ceed8 raccoglie gli `userSkillId` della lista, 0x7cf0c0 `[fn]` ricostruisce la tabella +0x1c8
  senza quegli id, poi upsert di `overwriteSkills` (0x7cf0c4) e delle medaglie; `componentUserMedalIds`
  toglie solo medaglie (`[fn]`). Mandando la lista intera il client svuotava la tabella e
  l'ordinamento «Skill» della Medal List (`[fn]` -> `[fn]`) crashava (riga skill 0). Il
  server manda solo le skill dei materiali consumati; la base con skill tiene il suo `userSkillId`. Altri
  rami: vendita (51) upsert, `GET /user/skill` (13) sostituisce tutto. Prova: Level Up di Leon con un
  materiale senza skill, lista per «Skill», nessun crash e skill delle altre medaglie intatte.
- Pulsante «Overwrite Skill» sempre grigio (I-157): interruttore `skill_mix_button` (`[fn]`:
  `img/ui/skill_mix_button_On.png` / `_Off` / `_Disable`); acceso cambia anche le cornici degli slot
  (`img/ui/Medal_Syn_Select_Panel02.png`). Serviamo solo `_Off`: mancano `_On` (azzurra nel pacchetto
  2016) e `Medal_Syn_Select_Panel02` in `img/ui/`.
- Elemento userSkill (`[fn]`): `userSkillId` uint64, `skillId`, `level`, `exp`, `userMedalId`,
  `getDatetime`; `userMedal.userSkills` = soli id (int). Il client cerca ogni id nella tabella della
  sessione (`[fn]`, +0x1c8, riempita dalle liste `userSkills`): id senza oggetto = riga skill
  0 = crash; con l'oggetto legge `skillExp` per `expType` (getter senza controllo del null).
- Curva `skillExp` (I-146, 18-10, disassemblato `0x00eb7960-0x00eb7ab8`): `[fn]` limita il livello a
  `maxLv` (riga skill +0x108), prende la riga `skillExp` di `expType` (+0x10c, `[fn]` = getter, tipo
  master 0x35; parser `[fn]`: `expId`, `value` int[3] a +4) e calcola in float
  `soglia(L) = trunc(value[1] * powf((L - 1) / (value[0] - 1), value[2] / 10000.0f))` (costante a `0x01763f00`)
  per il livello attuale (oggetto +0x18) e `L` al posto di `L - 1` per il successivo (+0x14); l'EXP della skill
  (+0x10) e' quindi **totale** (0 al LV 1). Righe vere: `[30,12132,13500]` = 12132 EXP al LV 30, esponente 1.35
  (LV 2-4: 128, 328, 567; LV 8: 1780; LV 10: 2499). `maxLv` non entra nella curva. Server: `expToReach`,
  `levelForExp`, `addSkillExp` in `server/medal-skill.js`, prova `server/test-skill-exp.js`.
- Controllo col wiki «Skill EXP» (maxLv 10 da LV 1 a LV 8 in due giri, 15 -> LV 7 e 20 -> LV 6 in quattro): non
  torna con l'`exp` dei nemici. La stage 82003 (601001 x3 + 611001, `exp` 200/1200) da' 1800 EXP a giro: un giro
  porta gia' una maxLv 10 a LV 8 (expType 1), due giri al massimo; 11001-11006 al livello piu' alto (5/20) danno
  15-35 EXP a giro, LV 1-2. Nessuna riga `skillExp` spiega insieme LV 8 (maxLv 10, 2 giri) e LV 7 (maxLv 15,
  4 giri): la quantita' di EXP data dall'originale resta da capire (Task 3), non la curva.
- Server (`server/medal-skill.js`, 12-10): `player.medalSkills[userMedalId]` dopo un Overwrite
  riuscito (userSkillId da `player.nextUserSkillId`); le Scrooge hanno una skill calcolata (id
  1000000000 + userMedalId, livello massimo; quale skill avesse ogni Scrooge non si sa: ipotesi 3★
  rango 1, 5★ rango 2, 6★ rango 3, scelta con userMedalId; vedi «Scrooge e wiki» e «Migrazione» sotto). `userSkills` intera in login, inventario,
  Level Up, vendita, trait; il supporto manda la skill della sua medaglia. `skillExp` = le 4 righe vere
  (vedi «Tabella skill»; la vecchia `server/tables/skillExp.json` inventata e' stata tolta). Prova: `server/test-medal-enhance.js`
  (punto 9).
- Scrooge e wiki (I-146, 18-10, ricerca in `wiki_all.json`): la pagina «Scrooge» dice solo «grants a skill»
  (3★/5★/6★, EXP 1400/5150/15150, dal Colosseo o dagli eventi) e il master ha una riga per rarita' (90123/
  90125/90126, nome sempre «Scrooge»): la skill **non dipende dalla medaglia ma dal premio**. Il wiki la scrive
  accanto al premio: tabelloni (`6★ Scrooge (Board)`: «Scrooge 5★ (Paralysis)», «Scrooge 6★ (Attack Boost II)»),
  Shop/2016-2017 («Scrooge Medal with the [[Attack Boost III]] Skill»), Moogle Shop (Scrooge 6★ con «ATK B XIV
  Max & Sleep», «Second Chance IV», ...), regali (Organization XIII A: «ATK B III Max & SP GA II»). Premi
  contati sui tabelloni: 3★ = Poison/Paralysis/Sleep/Attack Boost I/All I/Defense Boost I (tutte rango 1);
  5★ = Boost II, All II, Defense Boost II, stati e stati «+» (rango 1-2); 6★ = Attack Boost II, No Cost, Attack
  Prize Plus, «Max» e combinazioni (rango 2-3). Nessun abbinamento per nome possibile: resta la regola per
  rarita' (3★ rango 1, 5★ rango 2, 6★ rango 3, `pool[userMedalId % pool.length]` per skillId, livello massimo)
  sulla tabella completa: 3★ invariate (le 6 rango 1 erano gia' tutte nel master), 5★ da 5 a 14 skill, 6★ da
  1 (No Cost) a 143.
- Migrazione (I-146, `migrateSkills()` in `server.js`, `player.skillVersion` 1, all'avvio dopo le tabelle): le
  Scrooge gia' possedute senza voce salvano la skill di prima (`scroogeSkillV1` = stessa regola sulle 12 skill
  di allora 1100-1113, stesso `userSkillId` 1000000000 + userMedalId, `getDatetime` della medaglia); ogni
  skill salvata tiene il livello mostrato e prende `exp` = soglia vera di quel livello (`expToReach`, limitata a
  maxLv: la curva inventata dava altri numeri). Medaglie senza skill restano senza; Scrooge nuove = regola
  sulla tabella completa, calcolata (exp = soglia del livello massimo, come le migrate; guardia: con un master vecchio o ridotto la migrazione si rimanda con un avviso `[skill] migrazione rimandata`). Nuovo giocatore: `skillVersion` 1 subito. Prova:
  `server/test-skill-migration.js`.
- Tabella skill (I-146, 18-10, `server/make-skill-table.js`, chiamato da `make-game-tables.js` dopo
  `make-pet-tables`; prova `server/test-skill-table.js`; report `D:\Progetto_Restauro_KH_UX\tmp\skill\report.md`).
  Sorgenti lette a build-time, fuori dal repo: 25 righe vere di thethiny (1100-1126, `D:\Progetto_Restauro_KH_UX\external\thethiny_2026-10-13\KHUx-Server\data\skill.json`), le 4
  righe vere di `skillExp` (expId 1-4) e la lista «List of Skills» della pagina «Medal» del wiki (163 skill,
  nessun doppione). Regole:
  - righe vere: numeri di thethiny invariati (anche `thumbId` 1-5; il 5.0.1 usa 6-9 e Lux Plus `luxUp` 15000
    contro 30000); i 4 campi del layout 4.3.1 che thethiny non ha (`value1`, `burstLock`, `pvpConditionTurn`,
    `pvpConditionCount`) dalla riga 5.0.1 del master se c'e' (1100-1113: es. Poison `value1` 1000,
    `pvpConditionCount` 3), altrimenti dalla descrizione: `value1` 1000 per gli stati (1120-1122) e 10000 per le
    altre, `burstLock` 10000/20000 per SP Attack Gauge I/II (1124/1126), `pvp*` = `condition*`. Le righe del
    master oltre la 1113 sono generate e non valgono come fonte di questi campi;
  - abbinamento al wiki per nome normalizzato (maiuscole, «Plus»/«+», «ATK»/«Attack», numeri romani, ordine
    delle parti «&»: «ATK Prize+ & ATK Boost II» = «ATK Boost II & ATK Prize+»);
  - ricostruite (138, id 1127-1264 in ordine di wiki, `sortId` = `skillId`, `categoryEvolve` unico dal 31):
    copia della sorella = riga vera della stessa famiglia (dalla descrizione: Attack Boost, Attack Boost All,
    Defense Boost, Second Chance, stato, stato «+», SP Attack Gauge, ATK & Lux, ATK & Prize, No Cost) piu' vicina
    per maxLv, «Max», stato, probabilita' e potenza; `rank`/`expType` della sorella se ha lo stesso maxLv,
    altrimenti della riga vera piu' comune con quel maxLv (20 -> 3/3); potenza dalla descrizione (`attackUp`
    N*10000, `damageCut` 10000*(1-a/b), `luxUp` 30000 o 50000 per «vastly» (stima), `prizeBurstUp` 220000,
    `add*` 10000 e `conditionTurn` 1 con «1 turn», `value1` 1000 per gli stati (500 con «Effective on enemies
    up to LV 1999»), `burstCancel` 1 con «no special attack gauges», `burstLock` N*10000 con «uses only N»);
    `invokeProbPerLv` della sorella (le «Max» con sorella non «Max»: 10 come Attack Boost II Max),
    `invokeProb` dal trigger% del wiki, che e' **troncato** (vere: 47.2% -> 47, 44.5% -> 44, 54.25% -> 54): quello
    della sorella se da' lo stesso trigger%, altrimenti l'unico multiplo di 100 che lo da' (`baseProb`, ritrova
    tutte le 25 vere); i 100% esatti restano 10000 - perLv * (maxLv - 1) (9810, Defense Boost I Max 9860);
  - famiglie senza riga vera, sorella col tipo di attivazione piu' vicino: ATK & stato (13, Poison+/Paralysis+/
    Sleep+), Triple Threat (2, Poison+, tutti e tre gli stati), ATK & SP Gauge (42, Attack Boost III Max con
    l'icona 5 delle SP Attack Gauge, `invokeType` 1 e `invokeShowTiming` 6: vedi sotto);
  - testi <= 71 byte (`string(72)`): frasi intere del wiki, abbreviazioni fisse se non bastano (anche 6
    righe vere: 1114, 1117, 1120-1123).
- Unita' dei campi d'effetto (verifica del 18-10, client 4.3.1 con l'aiuto del decompilato con simboli 1.0.1 di
  thethiny; parser `[fn]`, riga offuscata di 0x17c byte, offset `rank` 0x104 ... `raidUp` 0x178 nell'ordine
  del master; decompilati in `D:Progetto_Restauro_KH_UX	mpskillcheck
e`). 10000 = 1,0:
  | campo | unita' / effetto | prova |
  |---|---|---|
  | `invokeProb`, `invokeProbPerLv` | probabilita' in 1/10000: `invokeProb + perLv * (min(lv, maxLv) - 1)` (Attack Boost I LV 10 = 47,2%), per (1 + bonus di battaglia +0xbe4) | `[fn]` |
  | `invokeShowTiming` | momento: 1 attacco di medaglia, 2 danno subito, 3/4 inizio turno (4 anche Second Chance), 5 attacco speciale, 6 = 1 o 5 (un tiro per battaglia, poi sempre o mai), 7 = 2 o 5 | `[fn]` (`stage::skill::invoke`) |
  | `invokeType` | filtro sul tipo d'attacco: 4 solo speciale, 5 solo medaglie «tutti», 7 tutto tranne «tutti» e speciale (stati base: solo bersaglio singolo), 3 solo timing 4, 0 mai, 1/2/6 nessun filtro | idem |
  | `attackUp` | moltiplicatore del danno /10000: 24000 = danno x2,4 (non +40%) | `[fn]` |
  | `damageCut` | danno subito * damageCut / 10000 (minimo 1; fra piu' skill vince il piu' basso): 10000 nessuna riduzione, 5000 = -1/2, 3333 = -2/3, 2000 = -80% | `[fn]`, `[fn]` |
  | `dokonjo` | flag: con HP a 0 resta a 1 HP, una volta | `[fn]` |
  | `burstCancel` | 1 = speciale gratis | `[fn]` |
  | `burstLock` | con `burstCancel` 0: costo fisso dello speciale in gauge*10000 (10000 = «only 1 gauge», 20000 = «only 2»); **0 = gratis** | idem |
  | `add*` | flag (10000 non e' una probabilita'): riuscita = attivazione * rate del nemico * `value1` | `[fn]`, `[fn]` |
  | `value1` | solo stati: fattore clamp(1 - X * value1 / 1e6, 0, 1); X = livello del nemico (deduzione: 1000 = fino al LV 999, 500 = «up to LV 1999»; 10000 = niente oltre il LV 99) | `[fn]` |
  | `conditionTurn` / `conditionCount` | durata in turni / in azioni; con turn > 0 count si azzera; riapplicazione = massimo | `[fn]` |
  | `prizeHpUp`, `prizeBurstUp` | moltiplicatori /10000 dei prize HP / gauge del nemico colpito (220000 = x22 sui punti gauge, non una probabilita') | `[fn]`, `[fn]` |
  | `luxUp` | moltiplicatore /10000 dei Lux (per colpo, colpo finale, raid): 30000 = x3, 15000 = x1,5 | `[fn]`, `[fn]` |
  | `pvpConditionTurn/Count`, `moneyUp`, `raidUp`, `counter`, `addAction` | **mai letti** nella 4.3.1 (neutri) | lettori degli offset |
  Lux e prize valgono solo se la skill e' scattata sull'attacco che colpisce il nemico (+0x740).
- Verifica riga per riga del 18-10 (descrizione della riga e wiki contro i numeri, 163 righe):
  - corrette nel generatore (master rigenerato, 98 righe cambiate): `invokeProb` di 30 ricostruite (Attack Boost
    IV-XII, ATK & Lux e ATK & AP & Lux non Max 3975 -> 4000, Defense Boost IV-VI 2950 -> 3000, ATK & AP+ 3950 ->
    4000, Second Chance II/III 5950/7950 -> 6000/8000: il vecchio calcolo prendeva il trigger% del wiki come
    esatto); `burstLock` di SP Attack Gauge I/II (0 -> 10000/20000: erano gratis come No Cost) e delle 29 combo
    «GA 1/2»; `invokeShowTiming` 1 -> 6 delle 42 combo ATK & GA (con 1 il costo dello speciale, letto al timing
    5, non cambiava mai; 6 e' una deduzione, nessuna riga vera la usa: da provare al banco); `value1` 10000 ->
    1000 delle 3 «+» vere (con 10000 lo stato non riusciva sui nemici dal LV 100) e 500 delle 21 ricostruite
    «up to LV 1999» (le altre di stato 1000).
  - **Stato 4.3.1 (18-10 sera, `ERA_431` in make-skill-table.js, ricerca in `tmp\skill\suspicious_rows.md`)**:
    thethiny e' il master di feb.-mar. 2017, la 5.0.1 (2021) la fonte piu' vicina alla 4.3.1 (primavera 2021).
    Lux Plus 1109 `luxUp` 30000 -> 15000 (x1,5 come 5.0.1); gradi Lux delle ricostruite: «increases» 15000,
    «greatly» 30000 (combo vere), «vastly» 50000 (stima). Icone: le risorse WW 4.3.1 hanno Skill_Icon1,2,4-9 e
    non la 3 (falso che la 4.3.1 non avesse 6-9): 6 attacco a tutti (1102/1103), 7 prize (1107/1117), 8 Lux
    (1109/1114/1123), 9 costo gauge (1110/1124/1126; le ultime 5 per deduzione). La Skill_Icon3 del 2016 servita
    da I-158 non la usa piu' nessuna riga. SP Attack Gauge II e Attack Prize Plus x22 restano (uguali nelle fonti).
  - (storico) righe vere sospette: Lux Plus 1109 `luxUp` 30000 (x3) nei dati di thethiny (era 1.1.3) contro
    15000 (x1,5) nel 5.0.1, stessa descrizione; le combo «greatly increases Lux» (1114, 1123) hanno 30000 e la
    4.3.1 potrebbe avere i valori del 5.0.1; SP Attack Gauge II 1126 ha `maxLv` 15 con `expType` 3 (le altre
    maxLv 15 hanno 2) e `categoryEvolve` 29 come la I; Attack Prize Plus `prizeBurstUp` 220000 (x22) e' molto
    piu' di «increases», ma e' il numero vero. Le altre 25 tornano con descrizione e wiki.
  - stime rimaste: Lux++ `luxUp` 50000 («vastly», nessuna riga vera), le combo «GA» (timing 6).
  Aperti: X di `value1` (livello del nemico) e il timing 6 delle combo ATK & GA, da provare al banco.
- Optimize del Level Up (`Button_MaxEnhanced`, `openMaxEnhancePopup` -> `runMaxEnhance`, `[fn]`):
  tutto nel client, che sceglie i materiali e manda la stessa `/user/medal/enhance` (con `numbers`
  per le pile); nessun dato in piu' dal server. Dalla 3.3.0 usa Huey & Dewey & Louie e non le medaglie
  d'attacco, riempie la barra dell'EXP; le Scrooge messe a mano non le tocca (Reddit).

<a id="optimize"></a>
### Popup di Optimize (I-090)

- Il crash al tocco di Optimize (banco 12-10, pc in `[fn]` -> `[fn]`, x2 = 0x191924c
  «widgetTree») e' GUIReader su un layout assente: `openMaxEnhancePopup` (`[fn]`) carica
  `cocostudio/publish/MedalInfo_MaxEnhanced_ver340.json`, che non c'e' in nessuna risorsa. Server,
  master e risposte non c'entrano (`runMaxEnhance` `[fn]` arriva solo dopo il popup).
- Widget cercati (tutti senza controlli tranne `Announce`): `Scroll_Area` (MaxEnhanceMedalScrollView
  con i materiali scelti), `Txt_Title` (106220300 «Choose a parameter to max out.»), `Txt_attention`
  (106220301), `Base_Money1`/`Base_Money2` > `Txt_Money` (100300002/3) e `Txt_Money_Label` (costo e
  posseduti), `Button_Mix` (vi aggiunge il pulsante But01) > `Txt_Mix` (106220314 «Level Up»),
  `Close_Button`; per MaxLv/MaxAtk/MaxDef/MaxCost/MaxGuilt un nodo con `CheckBox_<p>` (CheckBox vero),
  `Plate_Max` (lampeggia, la mostra `[fn]`), `Txt_<p>` (106220304/306/308/310/312) e
  `Txt_<p>_Label` (valore «%d», «+%d», «Maxed Out»...). Le scelte si ricalcolano a ogni tocco
  (`[fn]` -> `[fn]`, aggiornamento `[fn]`); Level Up chiama `runMaxEnhance`,
  che manda la normale `/user/medal/enhance`.
- Layout generato in `make_layouts.py` (12-10): finestra Win04, filtri But16 a sinistra, griglia a
  destra, targhe Munny e Level Up come `MedalInfo_Mix_ver340`. Nessuno screenshot originale trovato.
  Banco 12-10: il popup si apre, ma «No Medals» su ogni parametro.
- Candidati (`[fn]` -> `[fn]`, scorre la lista della scena +0x330, cioe' le medaglie
  della lista del Level Up, probabilmente gia' filtrate dal Sort/filtro): riga medal con
  `autoEnhance` (+0x488) != 0 e `type` (+0x490) 2, 4 o 5; medalId non nella mappa di esclusione
  (+0x680); medaglia non protetta (`[fn]`, elenco locale degli userMedalId); `userMedal`
  +0x48 < 1. Per ogni parametro **non** spuntato si scartano le medaglie che lo darebbero:
  LV -> `materialExp` (+0x518), STR -> `enhanceAttack` (+0x52c), DEF -> `enhanceDefense` (+0x530),
  Cost -> `enhanceCost` (+0x534), SP Attack Bonus -> `enhanceGuilt` (+0x538). Poi ordina
  (`[fn]`) e sceglie fino al massimo di ogni parametro.
- `autoEnhance` era 0 su tutto il master: il formato vecchio non ce l'ha. Regola in
  `make-game-tables.js`: 1 se `validPack` (unk_1116 del formato vecchio) e type 2/4/5, cioe' Huey/
  Dewey/Louie e HDL, Chip, Dale, Magic Mirror, Cid/Cid 5/Cid 10 (23 righe). Restano fuori le
  Scrooge (type 2, unk_1116 0), come nell'originale (Reddit: Optimize non usa le Scrooge). Valori
  originali non trovati: regola ricostruita.

<a id="skill-banco"></a>
### Prova al banco del 18-10 (rev 124, salvataggio completo)

- Migrazione al primo avvio: `skillVersion` 1, 15 skill (8 salvate + 4 di prova + 3 Scrooge fissate).
- Dettagli: Attack Boost VI (ricostruita) 1/20 al 39% (`invokeProb` 3975), Second Chance (vera) 15/15 al 32%; icone e descrizioni giuste.
- Crescita: Combat 101 da' `getPoint.exp` 14 con 17 nemici; con EXP a 595 la missione porta la skill a LV 3 e i RESULTS mostrano
  «Supernova+ - SP Roxas's Attack Boost VI leveled up!» (il client confronta il livello di `userSkills` prima e dopo la risposta di
  `/stage/clear`, `[fn]`/`[fn]`; nessun campo dedicato, `D:\Progetto_Restauro_KH_UX	mp\skill\popupnswer.md`).
- Overwrite: materiale Donald Ver. A con Attack Boost VII 20/20 a sinistra -> «Success Rate 100%», popup «Overwrite Attack Boost VI with
  Attack Boost VII?», base con Attack Boost VII 20/20. Ordinamento «Skill» della lista: medaglie con skill in cima.
- Combo «& GA N» (18-10, banco dell'utente): `burstLock` = costo fisso dello speciale in gauge x 10000; AB VIII Max &
  Lux++ & GA 1 su SP Roxas (speciale da 3 gauge) -> lo speciale costa 1 gauge. `invokeShowTiming` 6 funziona.
- Attivazione in battaglia (18-10, dal vivo, `relogin.ps1 -EnemyAtk 10`): Second Chance di SP Axel scatta, il
  giocatore resta in piedi a 1 HP (`screenshots\sc_live.png`, missione 132); il nome di Attack Boost di SP Roxas
  compare a schermo. Da misurare: l'aumento reale del danno di Attack Boost; le combo «& GA 1/2».
- Inciampi: `Select-Object -First N` su uno script node lo chiude prima della scrittura (skill di prova persa); il tombstone del
  servizio sensori dell'emulatore (`android.hardware.sensors`) non e' un crash del gioco.

<a id="mapping-orgxiii"></a>
## Mapping Organizzazione XIII e Roboloid (I-160, 18-10, rev 127)

- Problema: `make-game-tables.js` prende il Tier dalla riga Roboloid `MEDAL_MAP[id]` e con `KHUX_MEDALS_ALL` aggiunge come
  `300000+ID` ogni riga non usata. Per i 13 id SE dell'Organizzazione XIII `medal_map.json` puntava alle «X [+]» (Tier 8): le
  «X A» 3004xx/3006xx diventavano doppioni nostri e le 6★ [+] non avevano riga. Prove: `tmp\sp2b\g4\medal_mapping_audit.md`
  (gruppo 1), `orgxiii_migration.md`.
- Correzione in `server/make-game-tables.js`: `MEDAL_MAP_FIX` (23 chiavi: 13 id SE + 10 copie 1xxxxx -> «X A» 6★, Tier 3) applicata
  con `Object.assign` dopo il caricamento di `MEDAL_MAP`; `EVOLVE_FIX` (stesse 23 chiavi -> 7★ «X A», `validEvolve` 1, 5 Blue Fairy [3]
  da `blue-fairy.js`). Sta nel repo perche' `medal_map.json` e' esterno (`D:\Progetto_Restauro_KH_UX\medal_gen`) e non
  versionato: senza la tabella nel generatore una rigenerazione riporterebbe l'errore. Solo id Roboloid/SE, nessun dato SE.
- Tabella (SE -> «X A» giusta / 7★ «X A» / 6★ [+] nuova, data EN): 31176 Lexaeus 443/300444/301491 2018-05-13; 31196 Xaldin
  483/300484/301601 2018-09-24 (solo evento); 31206 Saix 486/300487/301531 2018-07-13; 31226 Xemnas 638/300639/301680 2019-01-13;
  32186 Marluxia 446/300447/301634 2018-11-13; 32196 Larxene 449/300450/301658 2018-12-13; 32216 Xigbar 489/300490/301745
  2019-02-13; 32236 Axel 641/300642/301563 2018-08-13; 33176 Vexen 452/300453/301446 2018-04-13; 33186 Zexion 455/300456/301511
  2018-06-13; 33206 Demyx 492/300493/301595 2018-09-13; 33216 Luxord 495/300496/301616 2018-10-13; 33236 Roxas 644/300645/301782
  2019-03-13. Le potenziate 20xxxxx/21xxxxx dell'Org XIII non si rigenerano (nascevano dai deal [+]): ora sono le 2301xxx.
- Test: `server/test-orgxiii-map.js` (tabella a mano contro il master), `server/test-orgxiii-migration.js`.
- Catalogo (`recon/tools/make_banner_catalog.py`, 4f1c8a7): alias di Axel/Roxas/Vexen non piu' su SN++, 6.2 su «axel a»/«roxas a»,
  `clamp_plus_dates` (le [+] non prima di `firstRarity`), `medal_date` in `banner_overrides.tsv` (302074/302075 al 2021-01-01);
  B0280/B0303 danno la 6★ [+]. Installato con le promesse skill dei 98 banner (`maxSkill`).
- Immagini (ba2922d): grafica e cutin delle 13 6★ [+] 301446...301782 (imageId = medalId), risorse 42 costruite, da installare al banco.
- Salvataggio (247fbed, `migrateMedalMap` in `server/server.js`, `medalMapVersion` 1): `ORGXIII_MEDAL_MAP` (36 voci) porta 3004xx/3006xx
  all'id SE e le potenziate 20xxxxx/21xxxxx alla 2301xxx; campi con `medalId`: `medals[]`, `medalState`, regali `resourceType` 3;
  il resto segue `userMedalId`. Salvataggio del banco: 14 copie, nessuna potenziata.
- Seguiti aperti dall'audit: I-161 (SN++ 302008-302012 «adjusted» del 07-09-2020, evoluzione con Fantasia Mickey B 300913) e I-162
  (167 6★ originali senza `validEvolve` verso la 7★).
