# Problemi aperti e chiusi

Una riga per problema. I dettagli tecnici stanno in `docs/notes/<area>.md` (colonna Dettaglio),
la cronologia in `docs/journal/`. Gli ID (I-001, I-002, ...) sono stabili e **non si riusano**:
un problema nuovo prende il numero successivo all'ultimo usato (ultimo: **I-070**).

Stati: **IN CORSO** (un agente o la sessione ci sta lavorando) · **APERTO** · **DA VERIFICARE**
(correzione nel codice, mai vista sul banco) · **CHIUSO** (corretto e provato sul banco) ·
**OBSOLETO** (non piu' pertinente). Prova = commit (hash) o data.

Ultima revisione: 11 ottobre 2026.

## Aperti

### Battaglia

| ID | Stato | Titolo | Dettaglio | Prova |
|---|---|---|---|---|
| I-013 | APERTO | Bilanciamento: Bandit + Red Nocturne (1240 parte 2, missione da 27) azzerano 3040 HP a LV3 | [battaglia](notes/battaglia.md#sconfitta) | 11-10 (testo tolto in f10ea90) |
| I-062 | CHIUSO | «Max Out Gauge» prima della battaglia: `POST /keyblade/burst/max` (azione 53) gestito in `keyblade-evo.js`: -30 jewel (misc 120), gauge = maxBurstGauge, risposta `{userKeyblade}`; banco: 7/12 -> 12/12, «Gauge filled.», pulsante spento | [battaglia](notes/battaglia.md) | banco mg_g3 |
| I-063 | DA VERIFICARE | Tocco sull'AP in alto: popup con le informazioni sull'AP (`BalloonNomal_AP_Recovery`, `[fn]`: tempo al prossimo AP / al pieno). Verificare che si aggiorni da solo col nuovo AP (ricarica 1 ogni 3 min, I-060) o se va sistemato | [server](notes/server.md#ap) | - |
| I-031 | APERTO | Avviso della morte nel tutorial mai catturato | [battaglia](notes/battaglia.md#sconfitta) | 10-08 |
| I-032 | APERTO | Valori segnaposto: HP iniziale 3000, CP/HP dei forzieri (10.000/5.000/500) | [battaglia](notes/battaglia.md#hp) | 10-08/09 |
| I-033 | APERTO | Attacchi speciali generati: 63 righe «Special Attack», animazioni del modello | [medaglie](notes/medaglie.md#burst) | 7da38e3 |

### Risorse e layout

| ID | Stato | Titolo | Dettaglio | Prova |
|---|---|---|---|---|
| I-002 | IN CORSO | 254 layout citati dal binario e assenti (`catalog\missing_layouts.txt`): triage | [risorse_layout](notes/risorse_layout.md#mancanti) | 10-11 |
| I-048 | CHIUSO | Scheda Events (dopo la Quest 14): `AdventureTop2_EV_Banner_ver220`/`_EV_Button`/`_Raid_Button` generati, `GET /stage/event` con `events: []` | [server](notes/server.md#eventi) | stage_gen\layout_triage |
| I-049 | CHIUSO | Crash 0x2c in GUIReader: 9-slice su texture assente (Plate21 in Continue/AP_Recovery/Ability_MAX, Panel07 in ReleaseWindow) | [risorse_layout](notes/risorse_layout.md#regole) | 0603a9c |
| I-057 | APERTO | Risorse per keyblade/attributo: crash di «Select a Keyblade» risolto (MedalDeck_Type1/2/11/21/31/01 e deck 201..1901 generati, tinta dall'arte, verificato). Mancano ancora per intero `lwf/keyblade/KeyEvo/*`, `lwf/memudemo/KeyBlade_StepUp`/`_Evolution`, `lwf/medal/guilt_bonus/*` (evoluzione keyblade, subslot, guilt: non ancora raggiungibili) | [server](notes/server.md#keyblade) | make_keyblade_decks.py |
| I-067 | DA VERIFICARE | Keyblade +0..+35 (576 righe, `make-keyblade-levels.js`, `keyblade-evo.js`), `POST /keyblade/enhance`: banco Treasure Trove +0 -> +6 ok, gauge conservata (3/12; prima si azzerava: limite in tacche invece che in unita' da 10000) (materiali scalati, moltiplicatori, evoluzione a +5 con nuovo design e 4 slot). Da vedere: +6..+35, Starlight, altri keyblade; animazioni KeyEvo/KeyBlade_Evolution vuote (saltate) | [server](notes/server.md#keyblade) | banco kv_res, kv_evo0, kv_equip5b |
| I-068 | APERTO | Keyblade: lo slot sbloccato all'evoluzione mostra «SLOT 1» invece di «SLOT 4» | [server](notes/server.md#keyblade) | banco kv_evo0, kv_lv4 |
| I-070 | APERTO | Burst: livello calcolato 1908 col salvataggio di prova (tutte le medaglie del gioco): ok per le regole (+1 prima guilt, +5 guilt massima), ma la «guilt massima» = copia al livello massimo e' una scelta nostra; popup di salita del livello (`GuiltBonus_BurstLvup`) e Super Burst assenti | [battaglia](notes/battaglia.md#burst) | `guilt-burst.js` |
| I-065 | APERTO | Equipment, «Passive Effects» vuoto: `passiveSetting`/`passive` vuote nella 5.0.1; le passive dei keyblade iniziano oltre +35 (35.5..60), livelli decimali non rappresentati | [server](notes/server.md#keyblade) | rapporto agente keyblade |
| I-066 | IN CORSO | Equipment, «Subslot»: ora n/120 (`keybladeSubslot` rigenerata, `POST /keyblade/subslot`); crash al tocco = `DeckEditSubSlotScene_ver340` e 4 layout assenti (elenco widget in server.md) | [server](notes/server.md#keyblade) | banco kv_equip2 |
| I-006 | APERTO | Party: tutti i layout `PartyTop_*` mancanti (legato a I-001) | [risorse_layout](notes/risorse_layout.md#mancanti) | ab62db9 |
| I-034 | APERTO | Testi ui assenti anche nella 4.4.0 con segnaposto (102850008 ora «Available quests!», 3b6bbb3; 106260102, 1062402xx, 106240301) | [risorse_layout](notes/risorse_layout.md#regole) | 915c683 |
| I-035 | APERTO | Presents: cornici viola di Dark Road da sostituire con le texture blu | [home_profilo](notes/home_profilo.md#presents) | 081b0cb |

### Mappe e missioni di storia

| ID | Stato | Titolo | Dettaglio | Prova |
|---|---|---|---|---|
| I-003 | IN CORSO | Miniature dell'elenco Story sfalsate | [mappe_storia](notes/mappe_storia.md#dati) | `stage_gen\quest_thumbs` |
| I-064 | APERTO | Elenco Story: tornando indietro con le frecce, missioni gia' completate/disponibili mostrano «?» al posto della miniatura (devono restare); verificare anche che ogni miniatura corrisponda al mondo/mappa della missione (legato a I-003 e alle 95 miniature mancanti) | [mappe_storia](notes/mappe_storia.md#dati) | segnalazione utente 11-10 |
| I-008 | APERTO | `-Seek`/`FindSpotlight` fermi sulle mappe scure (1070 bloccata sull'albero; 1030 `/stage/clear` non visto) | [banco](notes/banco.md#script) | befacc0 |
| I-009 | APERTO | Missioni di storia oltre la 525 senza dati | [mappe_storia](notes/mappe_storia.md#dati) | fc0aefa |
| I-014 | APERTO | Filmati mancanti (5, id 2999951), 175 dialoghi quasi assenti, Cutin, contatori Raid/PVP/Union Cross delle missioni, zoo 990018 (tocco perso) | [mappe_storia](notes/mappe_storia.md#filmati) | 6a116c6 |
| I-027 | APERTO | Tendina dei cambi di parte uguale per tutti i mondi (copie di `wipe_1`) | [risorse_layout](notes/risorse_layout.md#wipe) | fdcfa7e |
| I-036 | APERTO | Stanze assenti dalle risorse (Dwarf's Cottage, West Wing, Market...): sostituite con stanze dello stesso mondo | [mappe_storia](notes/mappe_storia.md#stanze) | 2c57c06 |
| I-037 | APERTO | Quests: tutte le categorie «COMPLETE» (`/stage/achievements` con contatori a 0) | [server](notes/server.md#catena) | 10-08; nessun commit dopo |

### Home, profilo, pet

| ID | Stato | Titolo | Dettaglio | Prova |
|---|---|---|---|---|
| I-005 | APERTO | Pet: risposte con `petSubslot` in crash; mancano `PetInfoScene`, `PetInfoAnim`, `lwf/pet` | [home_profilo](notes/home_profilo.md#pet) | 640d345 |
| I-015 | APERTO | Messaggio del Profilo vuoto con `adb input text`; fumetto della home vuoto | [home_profilo](notes/home_profilo.md#profilo) | 63e716e |
| I-016 | APERTO | Chirithy invisibile (LWF dell'NPC 999 vuota) | [home_profilo](notes/home_profilo.md#home) | f10ea90 |
| I-017 | APERTO | Profilo: Outfits, Boosters/Passive, pagina 2, frecce ‹ › | [home_profilo](notes/home_profilo.md#profilo) | 2ed41df |
| I-018 | APERTO | Pulsanti mai provati: Beginner's Guide (vuota), Shop jewel, frecce della home, menu Other, Share medaglia, titolo (Restore Resources, Save User Data, x3, KHDR START) | [home_profilo](notes/home_profilo.md#home) | 640d345 |

### Medaglie

| ID | Stato | Titolo | Dettaglio | Prova |
|---|---|---|---|---|
| I-022 | APERTO | Vendita: la targhetta delle medaglie di supporto alterna il prezzo con un testo vuoto (orig. «FOR SYNTHESIS») | [medaglie](notes/medaglie.md#medal-list) | 9b83a55 |
| I-023 | APERTO | Popup Sort/Filter da confrontare con l'originale (Favorite, SP Attack Bonus/No Bonus grigi, Imitation, Special Traits); riga tier ora 1-10 con le icone 9-10 (da vedere sul banco) | [medaglie](notes/medaglie.md#sort) | dbcf6c6, b19a74c |
| I-046 | DA VERIFICARE | Tier (SP Attack Bonus) delle medaglie: 480 a 0 presi da Roboloid/khuxwiki, icone 9-10 (prima mostravano l'1), slot dei trait dal tier (1.126 cambiati); rev. 82 | [medaglie](notes/medaglie.md#tier) | 2030f79, b19a74c; banco rev. 82 ok (dati, filtro 1-10); icone 9-10 v2 56e96e9 da vedere |
| I-047 | DA VERIFICARE | Medal List: la targhetta non cicla STR/DEF/costo nemmeno nell'originale; alterna (2 s + 1 s di dissolvenza) valore e «Equipped» solo sulle medaglie nel deck. Codice e dati gia' corretti: da vedere sul banco sulle medaglie 1 e 3 | [medaglie](notes/medaglie.md#medal-list) | reference\medal_list_plate |
| I-024 | APERTO | Evolve: animazione del risultato originale (ora quella del Level Up) | [medaglie](notes/medaglie.md#level-evolve) | dd25fb8 |
| I-038 | APERTO | Unequip: `GET /user/medal/preremove` ha una risposta generica, da studiare | [medaglie](notes/medaglie.md#level-evolve) | 8cfac80 |
| I-039 | APERTO | Grafica medaglie, limiti della fonte: 185 Cutin assenti, 419 Medal_L condivise, Cutin senza bagliore | [medaglie](notes/medaglie.md#grafica) | `stage_gen\medal_check\REPORT.md` |

### Moogle Shop

| ID | Stato | Titolo | Dettaglio | Prova |
|---|---|---|---|---|
| I-021 | APERTO | Moogle invisibile, nomi lunghi dei trait, targa `LB_Munnies` assente, «N days left» = 1980 giorni | [moogle_shop](notes/moogle_shop.md#aperti) | c8afb88 |
| I-043 | APERTO | Cursore rosso dello slot da sostituire troppo largo; trait speciali (Spirit Training) non gestiti | [moogle_shop](notes/moogle_shop.md#aperti) | a35aab2 |

### Avatar Boards

| ID | Stato | Titolo | Dettaglio | Prova |
|---|---|---|---|---|
| I-025 | APERTO | Fiocco COMPLETE della carta piu' semplice dell'originale dipinto | [bacheche](notes/bacheche.md#layout) | 51f60c4 |
| I-026 | APERTO | Popup «Unlocked an Avatar Board!»: originale non trovato (stile ricavato) | [bacheche](notes/bacheche.md#popup-lb) | befacc0 |

### Union Cross

| ID | Stato | Titolo | Dettaglio | Prova |
|---|---|---|---|---|
| I-056 | APERTO | Union Cross: stanza e partita richiedono un server Photon (UDP, master + game server); ora solo log `[photon]` sulla porta 5055 | [union_cross](notes/union_cross.md#offline) | - |
| I-059 | APERTO | Colosseo non giocabile: master `colosseum`/`colosseumStage` della 5.0.1 vuoti e mappe `cl_stg` assenti; ora popup e schermata «This event is unavailable.» | [server](notes/server.md#colosseo) | e8ec1bc |

### Esterno

| ID | Stato | Titolo | Dettaglio | Prova |
|---|---|---|---|---|
| I-029 | APERTO | Contatti esterni (thethiny, Roboloid, r/KHUx, Arena7664, Traverse Town): compito dell'utente | [ricerca_esterna](notes/ricerca_esterna.md#contatti) | 10-09 |

## Chiusi

| ID | Area | Titolo | Prova |
|---|---|---|---|
| I-069 | Battaglia | Burst: pulsante in alto a destra come l'originale 1.40 (texture ricostruite da video), `isGuilt` + `guiltBurstLv`; premuto: attacco su tutti i nemici (danno 71023), Quest complete, risultati senza crash | banco gb10, gb11a, gb11b, gb12 |
| I-030 | Battaglia | Gauge degli speciali conservata fra le missioni (come l'originale): campo `burst` di `/stage/clear` (23968 -> missione dopo con SPECIAL 2) | de87766, banco ap_battle |
| I-060 | Server | AP: ricarica 1 ogni 3 min (misc 101), `stage.useAp` scalato a `/stage/start` (19 -> 9/19), `maxAp` dalla tabella player, level up oltre il massimo («20+/20»), `POST /shop/ap/recover` 100 jewel (da provare) | banco ap_home, ap_battle, ap_after |
| I-053 | Quests | Crash del menu Quests dopo la Quest 130: testo ui 102850008 assente | 3b6bbb3 |
| I-054 | Quests | Colosseo: tessera, popup «Select a mode.» (senza fasce sopra i pulsanti), `GET /user/notice` e `/colosseum`, schermata «unavailable» senza crash (gioco: I-059) | e8ec1bc, banco c3_pop |
| I-055 | Union Cross | Pannello Union Cross: `server/multi.js` + master `multi`/`multiStage`, Begin -> «A connection error has occurred.» senza crash (partita: I-056) | banco 11-10 |
| I-050 | Medaglie | Keyblade posseduti: premio di tipo 13 (Treasure Trove Q14, Lady Luck Q24) con l'immagine giusta, `/user/keyblade/update/170516` | 30549ba, banco 11-10 |
| I-051 | Medaglie | Optimize su Treasure Trove: deck riempito (Yuffie/Sora/Riku), Quest 130 completata con Treasure Trove | 0503105, 9d670ca, banco 11-10 |
| I-052 | Medaglie | «Select a Keyblade»: Treasure Trove centrato (`rule/keyblade_rule.bin` riscritto, ofsX/ofsY ininfluenti) | keyblade_rule.py, banco 11-10 |
| I-001 | Battaglia | Crash alla sconfitta in solo: non era `PartyTopScene` (cattura falsata dai tocchi di stackcap) ma layout mancanti/9-slice su Plate21; ora animazione KO, popup Continue/Give up | banco 11-10, ko_b2..ko_b5 |
| I-004 | Battaglia | Popup Continue in solo: «Spend 100 Jewels to continue?», OK -> `/stage/continue` scala 100 jewel (3660 -> 3560 su server e client, HP e gauge MAX), Cancel -> Give up -> `/stage/retire` e lista | banco ko_cont, ko_b5 |
| I-028 | Server | Salvataggio di prova della sconfitta: `sphereBonus.hp` rimesso a 40 | `server/save/player.json` |
| I-007 | Bacheche | Avatar Boards: layout, popup, immagini, master `sphere*`; elenco, sblocco, Unlock All, bacheca completata provati | ae832fe, 0d82e57, 6b10bab, 30974b0, b37597b (banco 11-10, ris. 32 rev. 81) |
| I-010 | Mappe | Uscite fra stanze ricavate, missioni multi-parte (1060 e 1240 percorse) | 05cfba5, fdcfa7e, 2d13a5c, 98b31d1 |
| I-011 | Mappe | Nemici senza grafica: grafica Dark Road per nome (312 nemici, 51 grafiche), zoo 50/51 | 2c57c06, 6a116c6 |
| I-012 | Battaglia | Slot vuoto del Keyblade: nessuna medaglia finta (limite: il moltiplicatore segue la posizione) | b159b62 (banco 11-10) |
| I-019 | Home | Missioni (rotolo): elenco Daily/Weekly, `MyPageMission_Panel`, Collect All | 2c57c06, c8577c5, 76d2796 |
| I-058 | Home | Missioni: schede come l'originale (`MyMission_Category_On/_Off`, `GroupIcon1/2`, sopra la finestra) e Daily di nuovo toccabile dopo Weekly (`Mask_Area` copriva le schede) | banco m3_weekly/m3_daily |
| I-020 | Medaglie | Grafica medaglie da Roboloid (2.117 medaglie), Medal List con le medaglie vere | 631ab31, 6543aff, 0d82e57 |
| I-040 | Medaglie | Frecce «medaglia successiva» del dettaglio inerti | 839cf5e |
| I-041 | Medaglie | Cursore di selezione della vendita invisibile | 8de54eb, 0fd2333 |
| I-042 | Medaglie | Pulsante Unequip in giapponese | 0191005 |
| I-044 | Medaglie | Evolve: un'evoluzione vera confermata (Donald 1★ + Cheshire Cat -> 2★) | dd25fb8 |
| I-045 | Home | Crash toccando la piazza: nuvoletta di Chirithy `MyPage_ChirishiBaloon` | f10ea90 |
