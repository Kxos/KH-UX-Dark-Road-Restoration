# Problemi aperti e chiusi

Una riga per problema. I dettagli tecnici stanno in `docs/notes/<area>.md` (colonna Dettaglio),
la cronologia in `docs/journal/`. Gli ID (I-001, I-002, ...) sono stabili e **non si riusano**:
un problema nuovo prende il numero successivo all'ultimo usato (ultimo: **I-081**).

Stati: **IN CORSO** (un agente o la sessione ci sta lavorando) · **APERTO** · **DA VERIFICARE**
(correzione nel codice, mai vista sul banco) · **CHIUSO** (corretto e provato sul banco) ·
**OBSOLETO** (non piu' pertinente). Prova = commit (hash) o data.

Ultima revisione: 11 ottobre 2026.

## Aperti

### Battaglia

| ID | Stato | Titolo | Dettaglio | Prova |
|---|---|---|---|---|
| I-081 | APERTO | Velocita' del field: aumentandola non accelera solo la camminata ma tutto (anche il luccichio degli oggetti, ecc.) (segnalazione utente 12-10); verificare il comportamento dell'originale (video, fonti) prima di toccare qualcosa | [mappe_storia](notes/mappe_storia.md) | - |
| I-080 | APERTO | Level Up di una medaglia con le medaglie speciali come nell'originale: Chip / Dale / Chip & Dale (aumento di STR e DEF), Cid (riduzione del costo); verificare regole, limiti e risposta del server (segnalazione utente 12-10). Analisi in corso con I-079 | [medaglie](notes/medaglie.md) | - |
| I-079 | APERTO | Guilting delle medaglie non implementato come nell'originale; Brooms e Mickey & Brooms assenti dalla Medal List (segnalazione utente 12-10). Da guida dell'utente (`reference\guida_basi`) e fonti online: come sale il guilt, massimo per tier, effetto sul danno | [medaglie](notes/medaglie.md) | - |
| I-078 | APERTO | Ultima evoluzione del keyblade: salendo di livello deve comparire l'aura animata attorno al keyblade (segnalazione utente 12-10); da verificare sul banco col Keyblade LV UP fino all'ultimo livello e confrontare con l'originale | [server](notes/server.md#keyblade) | - |
| I-077 | APERTO | Home: toccare l'icona del pet (in alto a sinistra, sistema dei pet) e verificare cosa apre (segnalazione utente 12-10); collegato a I-005/I-076 (dialog del pet, layout assenti). Banco 12-10 pet_h1: crash al tocco, SIGSEGV null a 0x170, ritorno in ghidra 0x90db2c (base 0x32a0000); analisi dei layout in corso | [home_profilo](notes/home_profilo.md#pet) | - |
| I-076 | APERTO | Equipment > Spirit (slot del pet) > «Swap Gear»: il gioco va in crash al tocco (segnalazione utente 12-10). Probabile layout del dialog del pet assente (I-005: mancano `PetInfoScene_ver320`, `PetInfoAnim`); da catturare con `tombstone.ps1`/`stackcap.ps1` e confrontare con `catalog\missing_layouts.txt` | [home_profilo](notes/home_profilo.md#pet) | - |
| I-013 | APERTO | Bilanciamento: Bandit + Red Nocturne (1240 parte 2, missione da 27) azzerano 3040 HP a LV3 | [battaglia](notes/battaglia.md#sconfitta) | 11-10 (testo tolto in f10ea90) |
| I-062 | CHIUSO | «Max Out Gauge» prima della battaglia: `POST /keyblade/burst/max` (azione 53) gestito in `keyblade-evo.js`: -30 jewel (misc 120), gauge = maxBurstGauge, risposta `{userKeyblade}`; banco: 7/12 -> 12/12, «Gauge filled.», pulsante spento | [battaglia](notes/battaglia.md) | banco mg_g3 |
| I-063 | CHIUSO | Tocco sull'AP in alto: fumetto `BalloonNomal_AP_Recovery` (`FUN_00b8ee90`, si chiude da solo dopo ~2 s) con tempo al prossimo AP / al pieno; i valori seguono il tempo reale (banco: 19/20, 01:41 -> 01:16 dopo ~25 s, «Recover all» coerente con 1 AP mancante) | [server](notes/server.md#ap) | banco mg_ap3/mg_ap5 |
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
| I-067 | DA VERIFICARE | Keyblade +0..+35 (576 righe, `make-keyblade-levels.js`, `keyblade-evo.js`), `POST /keyblade/enhance`: banco Treasure Trove +0 -> +6 ok, gauge conservata (3/12; prima si azzerava: limite in tacche invece che in unita' da 10000) (materiali scalati, moltiplicatori, evoluzione a +5 con nuovo design e 4 slot). Da vedere: +6..+35, Starlight, altri keyblade; animazioni KeyEvo/KeyBlade_Evolution vuote (saltate) ; banco 11-10 sera: +6 -> +17 (KHUX_KB_FREE, `relogin.ps1 -KbFree`), a +17 evoluzione (design 20105), SLOT 5 x1.600, gauge 15 | [server](notes/server.md#keyblade) | banco kv_res, kv_evo0, kv_equip5b |
| I-068 | CHIUSO | Keyblade: lo slot sbloccato all'evoluzione mostrava «SLOT 1» invece di «SLOT 4»: «img/ui/Deck_Slot_Num_%d.png» esiste solo per 1-3, il 4/5 generati da make_textures.py (cifre di Mu_Num_Slot, colori di 1-3); banco: «SLOT 4» | [server](notes/server.md#keyblade) | banco sl_d1 |
| I-070 | APERTO | Burst: livello calcolato 1908 col salvataggio di prova (tutte le medaglie del gioco): ok per le regole (+1 prima guilt, +5 guilt massima), ma la «guilt massima» = copia al livello massimo e' una scelta nostra; popup di salita del livello (`GuiltBonus_BurstLvup`) e Super Burst assenti | [battaglia](notes/battaglia.md#burst) | `guilt-burst.js` |
| I-006 | APERTO | Party: tutti i layout `PartyTop_*` mancanti (legato a I-001) | [risorse_layout](notes/risorse_layout.md#mancanti) | ab62db9 |
| I-034 | APERTO | Testi ui assenti anche nella 4.4.0 con segnaposto (102850008 ora «Available quests!», 3b6bbb3; 106260102, 1062402xx, 106240301) | [risorse_layout](notes/risorse_layout.md#regole) | 915c683 |
| I-035 | APERTO | Presents: cornici viola di Dark Road da sostituire con le texture blu | [home_profilo](notes/home_profilo.md#presents) | 081b0cb |

### Mappe e missioni di storia

| ID | Stato | Titolo | Dettaglio | Prova |
|---|---|---|---|---|
| I-003 | CHIUSO | Miniature dell'elenco Story sfalsate: 95 `stage_select_ico` assenti, il riquadro teneva la texture di prima; generate da `make_quest_thumbs.py` (con I-064); banco: Agrabah, Coliseum, Daybreak Town giuste | [mappe_storia](notes/mappe_storia.md#dati) | `stage_gen\quest_thumbs` |
| I-064 | CHIUSO | Elenco Story: tornando indietro con le frecce, missioni gia' completate/disponibili mostrano «?» al posto della miniatura (devono restare); verificare anche che ogni miniatura corrisponda al mondo/mappa della missione (legato a I-003 e alle 95 miniature mancanti). Causa: `stage_select_ico_<mondo>_<thumbId>` assente -> loadTexture fallisce e il riquadro riciclato tiene il «?» o la miniatura di un'altra missione; 95 miniature generate (`make_quest_thumbs.py`, nel build); banco: indietro fino alla 91 senza «?», miniature del mondo giusto; ritagli automatici, stanze scure da rivedere | [mappe_storia](notes/mappe_storia.md#dati) | segnalazione utente 11-10 |
| I-008 | APERTO | `-Seek`/`FindSpotlight` fermi sulle mappe scure (1070 bloccata sull'albero; 1030 `/stage/clear` non visto) | [banco](notes/banco.md#script) | befacc0 |
| I-009 | APERTO | Missioni di storia oltre la 525 senza dati | [mappe_storia](notes/mappe_storia.md#dati) | fc0aefa |
| I-014 | APERTO | Filmati mancanti (5, id 2999951), 175 dialoghi quasi assenti, Cutin, contatori Raid/PVP/Union Cross delle missioni, zoo 990018 (tocco perso) | [mappe_storia](notes/mappe_storia.md#filmati) | 6a116c6 |
| I-027 | APERTO | Tendina dei cambi di parte uguale per tutti i mondi (copie di `wipe_1`) | [risorse_layout](notes/risorse_layout.md#wipe) | fdcfa7e |
| I-036 | APERTO | Stanze assenti dalle risorse (Dwarf's Cottage, West Wing, Market...): sostituite con stanze dello stesso mondo | [mappe_storia](notes/mappe_storia.md#stanze) | 2c57c06 |
| I-072 | IN CORSO | Flusso fra le aree delle missioni a piu' stanze non coerente (segnalazione utente): uscite nel punto piu' lontano / piu' a sinistra invece che sulle porte (es. Fountain Square -> 1st District usciva dalla scala del 2nd District). Grafo delle aree `recon/tools/world_links.json` (wiki + uscite originali 1010-1016), uscite delle 95 missioni sulle porte, missioni «Tour <mondo>» 991001-991008 (`KHUX_WORLDTOUR=1`). Banco 991001: uscita «Underground Waterway Entrance» del 2nd District introvabile (giro di ~4500 unita' dietro un edificio): regola `short_exit` (giro > 1,5x la linea d'aria -> uscita sul punto vicino alla porta con percorso breve), spostata da (2020,2068) a (1616,1640); spostate anche 4 uscite di 991008 e 13 missioni di storia, avvisi «giro lungo» 15 -> 0: da provare sul banco | [mappe_storia](notes/mappe_storia.md#collegamenti) | `stage_gen\worldtour_report.json` |
| I-037 | APERTO | Quests: tutte le categorie «COMPLETE» (`/stage/achievements` con contatori a 0) | [server](notes/server.md#catena) | 10-08; nessun commit dopo |

### Home, profilo, pet

| ID | Stato | Titolo | Dettaglio | Prova |
|---|---|---|---|---|
| I-073 | CHIUSO | Vendita medaglie: lenta (server: `masterRows` rileggeva medal.json per ogni medaglia; ora in cache, risposta ~1 s; resta ~2-3 s del client per rileggere `userMedals` con le 2090 medaglie del salvataggio di prova), icona dei Munny schiacciata nella conferma (ora targhe come «Sale complete!»), medaglie iniziali non vendute (+90 invece di 180), cella vuota = riga segnaposto 1 «空き» data da `grant-all-medals.js` (ora esclusa e tolta dal salvataggio) | [medaglie](notes/medaglie.md) | banco ms_7, ms_9 |
| I-005 | IN CORSO | Pet / 6° slot del deck (`petBaseSlotMedal`): crash 0x7c8d40 spiegato (pet della sessione creato solo da /pet/profile, chiesto con isPet 1); `server/pet.js` con `KHUX_PET=1` (default spento) + `make-pet-tables.js`, da provare sul banco; mancano `PetInfoScene_ver320`, `PetInfoAnim`, `lwf/pet/motion` (di `lwf/pet/part` solo `001`); banco v33 con `relogin.ps1 -Pet`: login con /pet/profile e coordinate ok, home ok (icona del pet vuota), Equipment «Spirit» mostra il 6o slot (gatto, x3.900), medaglia trascinata e salvata (`+ pet 2212`), resta dopo il rientro. Banco 11/10, 1010 con `-Pet`: battaglia bloccata dopo il primo attacco (avatar fermo, nemico immobile, niente crash); causa: il PetActor (solo da isPet) cambia movimento solo sull'evento LWF «end» e la sequenza d'attacco FUN_00b5a338 (stato 0x14, FUN_00e26f20 -> FUN_00e4875c) aspetta il pet in bwait, ma i `lwf/pet/motion` erano LWF vuoti. Correzione: `recon/tools/make_pet_motions.py` (da make_layouts.py) = 30 LWF nostri invisibili con «end»; trick spenti (`openSkillIds` [] salvo `KHUX_PET_SKILLS=1`). Banco 11/10 dopo `-Quick`: 1010 con `-Pet` completata (scontri, AUTO, RESULTS 3/3, pet1->pet2_end). RESTA (segnalazione utente): la medaglia dello slot pet (2212) non compare/non agisce in battaglia; dialog del pet (Swap Gear/icona: layout assenti, non toccare). Esito (analisi 11/10): il 6° slot c'e' gia' (FUN_00b0ba14 lo aggiunge dopo il deck se c'e' il PetActor: contatore 4/4 con 3 medaglie) e al suo turno attacca il pet, ma il danno parte solo dagli eventi «knockback_2»/«effectStart_1» del suo LWF (i nostri avevano solo «end»): `make_pet_motions.py` li aggiunge a battle_normal/all/skill e crea `lwf/ability/hit_effect/pet_eff_0001-0003` (assenti = crash in FUN_00afe8f0); server e master invariati, da provare al banco dopo build-resources ; banco 11-10 sera: la medaglia del pet colpisce al 4o turno (Shadow eliminato, pet3_q3), senza grafica ; grafica: il pet si disegna attaccando lwf/pet/part/%03d/<parte> ai movie omonimi del LWF del movimento (FUN_00b3c70c/FUN_00b3ed40, id = userPetCoordinate % 1000): make_pet_motions.py ora scrive 30 scheletri NOSTRI che animano le 9 parti di 001 (balzo/testata in battle_normal, giro in battle_all, scatto lungo in battle_skill, stessi eventi) e pet_eff_0001-0003 visibili con texture nostre; server/pet.js manda ear/face/leg/body/tailPartsId = 1; la speciale nello slot del pet resta all'avatar (tipo 3 -> 0x3e, come nell'originale), da provare al banco dopo build-resources ; banco 11-10 notte: crash della home (SIGSEGV 0xf0, Movie::getX FUN_01232c34 su NULL) nel ritratto del pet: FUN_00b3e2c4 legge head_sp (+0x898) appena il muso ha caricato pet_center, e lo scheletro non aveva un movie head_sp; aggiunto (profondita' 0, matrice del muso), ripiego senza rebuild KHUX_PET_PARTS=0 (id 0, pet invisibile) ; banco 11-10 notte: pet visibile (parti 001) in home e in battaglia, attacco del pet visibile (balzo + pet_eff, screenshots\petatk) | [home_profilo](notes/home_profilo.md#pet) | 640d345 |
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
| I-065 | Equipment | «Passive Effects» vuoto: il pulsante (`DeckEdit_PassiveBut_ver340`, `FUN_00c15fa8`) apre il popup web `Information2_Base` sull'URL `passiveSettingList` del login, che era ''. Ora `http://api-s.sp.kingdomhearts.com/web/passive` (`keyblade-evo.js` `respondPassivePage`): elenco delle passive o «There are no passive effects.»; in https la WebView rifiuta il nostro certificato, con sfondo trasparente non si disegna | banco 12-10 pe_6 |
| I-075 | Medaglie | Optimize come l'originale: e' l'algoritmo del client (`FUN_0097add0`/`FUN_0075de5c`, slot in ordine di moltiplicatore, costo, attributo della quest), ma riempiva solo gli slot gia' pieni perche' il server mandava i deck compatti. Ora deck completi con 0 = Stock Medal (medaglia 1, gioca il turno come nell'originale, `reference\empty_slot`), immagine 90000 (`make_stock_medal.py`); Optimize dei Subslot verificato (120/120) | banco 12-10 op2_opt ([318,0,317,0,456], STR 40589 -> 56619), sm_3 |
| I-066 | Medaglie | Equipment, «Subslot»: n/120, schermata `DeckEditSubSlotScene_ver340` e layout generati, Optimize 120/120, lista SUBSLOT MEDALS leggibile, medaglie grandi; trascinamento da uno slot (la medaglia segue il dito, slot svuotato, 18/120) e avviso «Medals must be / set in order.» su due righe con targhetta opaca (`DeckEdit_Subslot_Caution_ver260`) | banco 12-10 sd_drag, sd_4, sd_c4, sd_c5 |
| I-071 | Home | Fumetto bianco vuoto sopra l'avatar (messaggio del Profilo vuoto, `MyPage_MpBaloon`, `FUN_00bbbb3c`): il server manda «Nice to meet you!» se il messaggio e' vuoto (`GET /mypage` con rotta propria) | banco 12-10 op_menu: fumetto «Nice to meet you!» |
| I-074 | Mappe | Crash entrando in una stanza incompleta (banco 991001, uscita «Underground Waterway Entrance» -> parte 7 `DB_0018_01_00`, `FUN_00ade5cc` -> `FUN_012d8464`: tessera assente = sprite nullo). Il suo `info.bin` usa i livelli a tessere di `DB_0018_00_00` (sky2, spover, over: 172 png), assente dalle risorse; idem `ED_0011_01_00` (171 tessere di `ED_0011_00_00`). `recon/tools/check_rooms.py` -> `stage_gen\rooms_check.json`; il generatore (`rooms_check` nella config) le tratta come assenti (I-036): rigenerati 991001 (11 parti, la porta va a Waterfront Park: Dock), 991008 (17 parti), 12210-12250, 14230-14250; validatore 0 errori | `check_rooms.py`, banco 11-10 tour3_b..d: passaggio e ritorno senza crash |
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
