# Testo tolto da HANDOFF.md nel commit f10ea90 (11 ottobre 2026)

Il commit f10ea90 («Layout mancanti: nuvoletta di Chirithy...») ha riscritto il blocco di
ripresa e ha tolto, insieme alle voci superate, ~240 righe di storia del 9-11 ottobre che non
comparivano altrove. Qui sono riportate cosi' com'erano (righe tolte dal diff, in ordine).
I fatti ancora utili sono stati ripresi in docs/notes/.

---

- **CRASH APERTO: sconfitta**. 1240 parte 2: Bandit + Red Nocturne (id 9 e 4, grafiche Dark Road
  5008/5004) azzerano 3040 HP (giocatore LV3 con 2 medaglie in una missione da 27:
  bilanciamento, non errore); alla sconfitta schermo nero e crash, pc G11fdc74 in [fn],
  stessa funzione del crash del pet ([fn] compone «<nome>.plist»). Registri in
  dumps\armtrace\bandit. Analisi in corso insieme a quella del pet (stage_gen\pet_crash).
- **Messaggio del Profilo**: anche con Invio o Indietro dopo `adb input text` il client manda
- **CRASH APERTO (gia' presente prima, non legato alla 1060)**: in home, toccando il personaggio
  nella piazza (es. (950,850)) il client va in crash subito, prima di ogni richiesta. Backtrace ARM
  (`armtrace\stackcap.ps1 -Tag avtap -NoMenu -Taps '950,850'`): `PetInfoDialog::createLayout`
  ($_11) -> caricamento LWF con particella `.plist` ([fn]) -> distruttore. Nello stack
  `lwf/character/npc/999/wait/wait.lwf` (il nostro LWF vuoto da 492 byte) e
  `lwf/avatar/body/30001/...`. Probabile: il pet invisibile (LWF vuoto) sta sul personaggio e il
  tocco apre la sua scheda. Il Profilo si apre invece dal ritratto in alto a sinistra e funziona.
  Anche il fumetto vuoto sopra il personaggio resta da fare.
- (storico) 1060 percorsa a mano sul banco (smoke.json con
  stageId 1060): il giro lungo dell'arco e la strettoia sulle ninfee si percorrono, il bersaglio
  e' raggiunto. Ma all'uscita verso la parte 1 (freccia blu, (2200,1760)) il client va in CRASH
  (SIGSEGV null, fault 0x8; stack ghidra b01690 -> [fn], 12d85d0 -> [fn],
  12d8e44, 12c1154, 1366cac; C decompilato in stage_gen\reach\crash_1060_decomp.c). E' il primo
  passaggio tra parti provato sul banco: riguarda tutte le missioni multi-parte (86 da 2 parti,
  9 da 3). Ipotesi da verificare: uid globali tra le parti (gen_story_maps riparte da 2 per
  parte, vedi sopra «da rinumerare per il multi-stanza") o il formato delle uscite. Ricetta:
  tombstone.ps1 -> decomp.ps1 -> widget_lookup.py; confrontare con un originale multi-parte.
- 1050 corretta (agente): forziere uid 4 spostato da (2700,1450) a (2290,690), totali STG
  (1,1,2,4); validate_maps: 0 errori su 569 stage. File fuori dal repo (stage_gen\files\stage,
  spec_1050.json, reach\REPORT.md); server\game_data\stage_poi.json non ha la 1050 (da rigenerare).
  Va fatto un -Quick per portarla nel guest (non ancora fatto).
- Salvataggio: bacheche 1 e 2 complete (titoli 2001, 2002), avatarCoin 405.
- Salvataggio di prova: bacheca 1 completa (7/7), titolo 2001, avatarCoin 450. Per riprovare
  i popup: fermare il server, `unlock` della 2100001 a [1..5], spherePoint 470,
  sphereBonus.cost 3, togliere 2001 da titles, riavviare.

**Sessione del 10 ottobre 2026 (sera)**:
- PROVATO SUL BANCO (risorse 32 rigenerate con -Quick, revisione 80): Missioni complete. Righe
  alte 144 (la cella del codice e' 148, la riga appare 44 a sinistra: contenuto spostato di +44),
  barra come quella LUX (Gage_LUX_Base + Gage_LUX_Tip stirata), timbro World_Stage_Clear
  («COMPLETE») sulle righe riscosse. Contatori quest/Lux giusti dopo la missione 1030; «Collect
  All» ok (Jewel 3000 -> 3060, «All rewards have been collected», righe scurite).
- Popup dello sblocco dei nodi CORRETTO: Sphere_Incentive_ver240 non e' un popup, ma l'icona del
  premio che [fn] aggiunge nel `Panel` di Sphere_Popup_Get_ver240 (ora 'build' 100x100
  con reward_icons). Provato: una sola finestra con l'icona (guanti), monete 475 -> 470.
  Il prezzo del nodo in alto a destra e' come l'originale (ab_31): non va spostato.
- MODIFICATO MA NON ANCORA PROVATO (serve `build-resources.ps1 -Quick`, la 32 e' ancora l'ultima):
  testo del popup Get alzato (y 78) e icona abbassata (Panel y 250), perche' l'icona copriva il
  testo; elenco bacheche: figli di Img_Win_L coordinate dal centro (la moneta e «45/25» erano
  spostati a destra), «No. N» sopra la carta (No_Panel y 300) come in ab_sheet; timbro scala 0.95.
- DA FARE:
  1. Spunta gialla sui nodi sbloccati (widget `Get` di Sphere_Incentive.json: ora Kind_0001
     segnaposto, invisibile). Nessuna texture trovata finora: cercare nei LWF (risultati?) o
     ricostruirla.
  2. «Unlock All» e bacheca completata (titolo 2000+N) ancora da provare.
  3. Mappe generate, controllo di raggiungibilita' FATTO e integrato (recon/tools/validate_maps.py
     con flood-fill, servono numpy/scipy; gen_story_maps.py collega solo punti della stessa area
     calpestabile, uscita identica a prima: niente da rigenerare). Esito in
     `D:\Progetto_Restauro_KH_UX\stage_gen\reach\REPORT.md`: 0 errori nelle generate (solo la
     1050 fatta a mano: forziere uid 4 irraggiungibile, totali STG). La 1060 NON e' bloccata: il
     bersaglio (2200,1760) si raggiunge con il giro lungo dell'arco (su per il braccio sinistro,
     in alto, giu' a destra, strettoia di ~180); il banco va dritto verso la freccia. DA FARE:
     percorrerla a mano sul banco per confermare la strettoia (stesso punto in 3200, 6220,
     10010, 10100, 10400); eventuale opzione del generatore per giri <= 1,2x; correggere la 1050.
  4. story.ps1 / bench_prologue -Seek: su mappe scure (nebbia) FindSpotlight scambia lo sfondo
     per il cerchio del tutorial e non fa passi (0 passi); e nella 1030 non ha visto il
     /stage/clear che c'era (#718). Da sistemare.
  5. Riprovare 990018; Raid/PVP/Union Cross nei contatori delle missioni; Cutin mancanti; stile.
- Salvataggio di prova: avatarCoin 470, missioni 2004/2008 riscosse.

**Aggiornamento dopo la compattazione** (precedente):
- Righe enemyAttack generate (revisione 78): i 17 nemici con validSkill 3 ora partono tutti
  (`stage_gen\zoo2_results.json`). Punto 1 chiuso.
- Missioni giornaliere/settimanali: `server/tables/mission.json` copiata nel master da
  make-game-tables; GET /user/mission/list e POST /user/mission/receive in server.js
  (contatori per periodo in `player.missions`; contano quest e Lux, non ancora Raid/PVP/Union
  Cross). Da provare sul banco (menu Missioni).
- Grafica di Dark Road: make-game-tables la assegna per nome da
  `recon/tools/enemy_display_map.json` (confidenza alta/media: 312 nemici, 51 grafiche);
  `recon/tools/make_enemy_moves.py` (in build-resources) crea `move` copiando `wait`.
  Missioni zoo 990001-990051 = una per grafica (`stage_gen\zoo_dr.json`, story_cfg.json
  punta li'). Da provare con smoke_quests.ps1.
- `recon/tools/story_rooms.json` = le 84 stanze verificate; mappe rigenerate (161 esatte) e
  copiate da `stage_gen\story` in `stage_gen\files\stage` (a mano, dopo gen_story_maps).
- Medaglie complete: KHUX_MEDALS_ALL=1 (2.094 medaglie) e versione risorse 31 completa con
  il pacchetto delle medaglie; revisione master 79.
- Agente Avatar Boards (seconda parte) FATTO: `stage_gen\boards\files\` (442 PNG: 381
  sphere_incentive, 15 sphere_board, 42 sphere_masu_icon, Kind_0002 ricostruito, sfondi),
  `ASSETS.md` (fonti e mancanti), `LAYOUT.md` (widget di SphereScene_ver310 letti dal codice:
  G11..G59 = 45 celle vuote, Grid/Grid_R/Info/LeftUI obbligatori, sfondo
  img/ui/Equip_DeckBG_01.png, overlay Sphere_Incentive.json; posizioni stimate su 960x640).
  Da integrare: copiare i file in stage_gen\files, costruire il layout in make_layouts.py,
  master sphere* in server/tables, server userSphere.
- Avatar Boards integrati (da provare sul banco, serve revisione master 80 e risorse 32):
  layout SphereScene_ver310 + Sphere_Incentive + 4 popup in make_layouts; armature
  (recon/tools/gen_sphere_armatures.py; i movimenti si scelgono per indice 0/1/2 = Lock/
  Release/Target, `stage_gen\boards\ARMATURES.md`); server GET /user/sphere,
  /user/sphere/update, /user/sphere/check (`stage_gen\boards\SERVER.md`); le immagini
  sphere_incentive (37 MB) stanno in medal_gen\files (pacchetto statico: versione completa).
- PROVATO SUL BANCO (risorse 32, revisione 80): menu Missioni (schede Daily/Weekly, righe con
  premio, tempo, barra, Challenge: layout MyPageMission_Panel e PresentBOX_IconPanel_ver131
  ricostruiti con i widget di KHUX; ChallengeButton/ReceiveButton li crea il codice: NON
  metterli nel layout); Avatar Boards: elenco con le carte (costume, figura blu/rosa), bacheca
  (griglia, START, percorsi, nodi, Unlock) e sblocco di 4 nodi con popup «Congratulations! Max
  HP increased by 20!», monete scalate (500 -> 480; il salvataggio di prova ha 500 monete date
  a mano). Popup: servono Area_Point e le icone per tipo (reward_icons in make_layouts);
  SpIcon_Open/SphereMap_Complete = copie rinominate di Result_Reward (una LWF vuota non ha
  l'etichetta: crash). DA FARE: secondo popup (Sphere_Incentive_ver240?) mostrato fuori posto
  in alto a destra (`screenshots\v32_unlock4a.png`), prezzo del nodo sopra a destra del nodo,
  righe delle Missioni molto distanziate, provare Collect delle missioni e «Unlock All», bacheca
  completata (titolo), riprovare 990018 (tocco perso).
- Mappe a piu' stanze (95 missioni) e forzieri/nemici delle missioni generate nel server
  (gen_story_maps scrive server/game_data/stage_poi.json con "poi" nella config): da provare.
- Texture: le originali hanno l'alpha PREMOLTIPLICATA; btf.encode ora premoltiplica, decode
  la toglie; `recon/tools/btf_fix.py` (nel build) converte PNG veri e BTF vecchi. Causa dei
  bordi bianchi sulle medaglie (Paperino). Agente di controllo visivo di tutte le medaglie:
  risultati in `stage_gen\medal_check\REPORT.md`.

**Banco:** risorse versione 30 (con le immagini delle 521 medaglie del master), master
revisione 77 (alzarla dopo ogni modifica di master_data, poi relogin.ps1 due volte).
**In corso / da riprendere, in ordine:**
1. Test singolo dei nemici (missioni zoo 990001-990040 = i 40 nemici dei gruppi falliti,
   elenco in `stage_gen\zoo_single.json`; risultati in `stage_gen\zoo1_results.json`).
   Causa trovata: i nemici con `validSkill` 3 vanno in crash all'avvio; correzione gia' nel
   codice (make-game-tables: righe enemyAttack generate per tutti gli skillId, +276;
   enemyAttack_base.json conserva l'originale) ma NON ancora applicata al master servito.
   Dopo: rigenerare (`$env:KHUX_ZOO='1'; $env:KHUX_ZOO_COUNT='40'; node server\make-game-tables.js
   D:\Progetto_Restauro_KH_UX\wiki\medals.json`), revisione 78, riprovare solo i falliti.
   ESITO del test singolo (finito): 17 nemici su 40 in crash, TUTTI con validSkill 3; nessun
   nemico con 3 abilita' funziona, quelli con 2 o 4 si (elenco degli indici falliti in
   `stage_gen\zoo_single_failed.txt`). Se le righe enemyAttack generate non bastano, seconda
   ipotesi: portare validSkill 3 a 4 duplicando l'ultima abilita' (skillId/Require/Arg/Odds).
   Agente nemici FATTO: `stage_gen\enemy_display_map.json` (61 nemici -> grafica Dark Road, 47
   alta confidenza; nessuna grafica Dark Road ha `move`; dettagli e provini in
   scratchpad\enemymap\). Da integrare in make-game-tables (DISPLAY_SUBSTITUTE per nome) e da
   provare con le missioni zoo.
   Agente uscite FATTO: `stage_gen\exits\NOTE.md`. Le uscite tra stanze sono il blocco a +0x34
   di ogni parte MAP (u32 n + n record da 9 interi: x, y, angolo freccia, distanza, avanti/
   indietro, x/y di arrivo, parte di destinazione, verso; X = 4 + 36n), scattano entro 96
   unita'; STG [2] = parti | (parte di partenza << 16), [5] verso iniziale, [10] enemyId della
   scheda bersaglio, [11] bonus di livello; uid di aree, nemici e forzieri GLOBALI tra le parti
   (gen_story_maps/mappoi_gen ripartono da 2 per parte: da rinumerare per il multi-stanza);
   la sezione C sono attori evento (tipo 0xb), non uscite. Ricetta in NOTE.md.
   Agente Avatar Boards FATTO: `stage_gen\boards\` (sphere/sphereArray/sphereMasu, 118
   bacheche standard e 874 nodi, conformi allo schema; NOTE.md con significato dei campi e
   dubbi; tools\gen_boards.py li rigenera). Da integrare: copiare in master_data (revisione
   nuova); il server deve elencare le bacheche sbloccate in userSphere.userSphereDatas
   (POST /user/sphere/check) e dare il titolo 2000+N al completamento; immagini da Roboloid
   (images/assets/board/sphere_incentive-<id>.png -> img/sphere_incentive/<id>.png,
   other/sphere_board-Board_0001.png, other/sphere_masu_icon-*); da creare Kind_0002 (figura
   rosa) e la scena SphereScene_ver310 della bacheca (layout mancante).
   Agente missioni FATTO: `stage_gen\missions\mission.json` (20 righe: 10 giornaliere 30 jewel,
   10 settimanali di party 100 jewel, conformi) + NOTE.md. Da integrare: master `mission`;
   GET /user/mission/list -> missions[] {id, status 0/1/2, numUpper progresso, numLower
   obiettivo} SOLO con id del master (altrimenti crash); POST /user/mission/receive
   {receiveMissionIds} -> userData + missions + inventario completo come /stage/clear; il
   server deve contare i progressi e azzerarli (giorno: ora di startDate, 08:00 UTC).
   Agente stanze FATTO: `stage_gen\story_rooms_full.json` (84 voci verificate confrontando gli
   sfondi ricostruiti con le immagini khwiki <Stanza>_KHX.png). CORREZIONE: DW_0003_00_00 e'
   «Path to the Mine», NON Dwarf's Cottage (la cartella del Cottage non e' nelle risorse):
   rifare la missione 8 (spec_1050) e rigenerare le mappe con questo file al posto di
   recon/tools/story_rooms.json. «2nd District» = DB_0004_01_00. Copertura: 18 delle 86 stanze
   delle missioni 1-525, 154 missioni su 525 con tutte le stanze esatte; mancano dalle risorse
   West Wing, Boardwalk, Market, Dwarf's Cottage, Waterfront Park, Avenue, Morning Dew Grove,
   Garden Maze... Prefissi: CS Game Central Station, HD Cy-Bug Sector, NL Niceland, SR Candy
   Kingdom, DG_0200 Corridor of Darkness. Schema: XX_NNNN_VV_00 = Roboloid <Mondo>_NNNN_VV
   (VV = variante giorno/notte).
2. Medaglie complete: `fetch_medal_images.py --all` FATTO (1.918 medaglie con immagini in
   `medal_gen\files`, 712 MB; 199 download falliti per i nomi con «#», es.
   «569_6Star_Key_Art_#2.png»: da riprovare con un'altra codifica). Poi: KHUX_MEDALS_ALL=1
   in make-game-tables (2.094 medaglie, 1.904 burst, tipi verificati), versione risorse 31
   completa (`build-resources.ps1 -Version 31`; ATTENZIONE: il server annuncia subito
   l'ultima versione e il client la scarica, quindi farlo a test finiti, poi
   `update-resources.ps1`). Per vederle in gioco servira' darle al giocatore (premi/gacha).
3. Due agenti lanciati (risultati attesi in file): `stage_gen\enemy_display_map.json`
   (nemico KHUX -> grafica Dark Road equivalente, con animazioni) e
   `stage_gen\story_rooms_full.json` (stanza -> cartella di mappa). Applicarli:
   DISPLAY_SUBSTITUTE in make-game-tables.js (togliendo il limite `d < 5000` se le grafiche
   Dark Road funzionano: il crash del gruppo 1 era Fat Bandit, non Yellow Opera/5075) e
   `recon/tools/story_rooms.json` per gen_story_maps.py; provare con le missioni zoo.
4. Prova delle missioni di storia: `smoke_pick.py` (76 missioni) + `smoke_quests.ps1`.
5. Poi: uscite tra stanze (missioni a piu' stanze), gauge del keyblade (nome del campo di
   /stage/clear dal log «[gauge]»), Avatar Boards (icone premi su Roboloid
   images/assets/board), barra rossa del trait, messaggio del Profilo.

### Come riprendere il lavoro (stato al 10 ottobre 2026)

**Banco ora:** risorse **versione 29** installate (riserva dati 16 MiB, indice 64 KB: i
cicli `build-resources.ps1 -Quick` funzionano senza download); master **revisione 70**
(default degli script: **alzarla di 1 dopo ogni modifica di `server/master_data`**, poi
`relogin.ps1` due volte: al primo il client scarica i master e va in crash, noto, al
secondo entra); `server/master_data` e' fuori dal repository (ignorato): la tabella
del Moogle Shop la rigenera `node server/make-moogleshop.js`; server e app si riavviano con `tools\ldplayer\session\relogin.ps1 -Tag x`.
Se LDPlayer e' spento: `ldconsole launch --index 0`, poi `ld.exe -s 0 "sh
/mnt/shared/Misc/phaseb-guest.sh 192.168.1.185"`. Salvataggio di prova in
`server\save\player.json`: Donald 2★ (evoluto, trait STR +1000), pila di 3 Huey & Dewey &
Louie, pila bloccata di 4 Dewey, Goofy tolto dal deck (`player.deck` 1,0,3), Donald Ver. A
6★ (userMedalId 120, per le prove dei trait), munny ~31.000, jewel 4.000, 10 Rainbow Gem.

**Fatto il 9–10 ottobre** (dettagli nelle «Annotazioni per dopo» sotto e nei commit):
Medal List, vendita (pile, popup quantita', icone valute, cornice di selezione
animata), Level Up, Evolve, lucchetto, Unequip, popup Sort/Filter, Sell Materials
(vendita e stile), popup «Complete!», fascia rossa e «1/N» del popup della quantita',
Moogle Shop (scheda Items con scambio funzionante, scheda Traits con tutte le righe).
**Fatto il 10 ottobre (sera):** scambio dei trait completo (popup «Select Medal», aggiunta
e sostituzione, costo scalato solo se lo scambio riesce; vedi «Moogle Shop — trait» nelle
annotazioni); attacchi speciali mancanti generati (`burst`: 11 righe vere + 321 generate da
`make-game-tables.js`, revisione 70; il dettaglio delle medaglie evolute non va piu' in
crash). **Fatto il 10 ottobre (notte):** Profilo (schermata, Titles, Name/Message, Play
Style; vedi «Profilo — fatto» nelle annotazioni). **Prossimo, in ordine:** 1) Outfits del
Profilo, Avatar Boards, Other, rotolo del menu; 2) missione 8. Profilo: avatar `260,95`;
Titles `330,1030`, Name/Message `808,1030`, Play Style `1155,1030`, Outfits `1590,1030`.

**Tocchi sul banco (schermo 1920x1080):** dalla home Moogle Shop `288,1000`; schede Traits
`340,250` / Items `700,250`; «Exchange» della prima riga `1213,512`, OK `1220,712`; trait:
riga STR +1000 `600,400`, «Select Medal» `788,1012`, poi **trascinare** la medaglia sullo
slot (`Swipe 1640 290 630 330 900`: il tocco apre il dettaglio), «Set Trait» `840,1010`; Sell
Materials `1205,250`, poi materiale `1200,430`, Sell `1183,930`, conferma `1220,715`.
Medal List: MENU `1790,45`, `1745,697`; Sell Medals `335,262`. Cattura dei crash:
`$env:KHUX_BASE='0x31d4000'; .\tools\ldplayer\armtrace\stackcap.ps1 -Tag x -NoMenu -Taps ...`
poi `backtrace.py` e le stringhe dello stack (vedi i commit del 10 ottobre).

**Metodo (regole dell'utente):** stile di ogni schermata dagli originali trovati online
(screenshot/video in `reference\<schermata>\`, yt-dlp in `D:\Progetto_Restauro_KH_UX\tools\yt`
con `PYTHONPATH` e `--js-runtimes node:<node.exe>`); risorse note nel catalogo
`D:\Progetto_Restauro_KH_UX\catalog\index.html`; annotare in questo file pulsanti,
schermate e azioni non ancora affrontati; commit + push dopo ogni passo verificato.
**Ciclo per una schermata mancante:** `func_strings.py` + `widget_lookup.py` (nomi
cercati dal codice), `text_ids.py` (testi mancanti), layout in `make_layouts.py`
(`build`/`copy`/`scene`/`func`), texture mancanti in `make_textures.py`, prova con
`build-resources.ps1 -Quick` e `scratchpad tap.ps1`-like (bench_lib Tap/Shot), crash con
`tools\ldplayer\tombstone.ps1` o `armtrace\stackcap.ps1 -NoMenu -Taps 'x,y'` +
`backtrace.py` (KHUX_BASE=0x31d4000) e stringhe nello stack.

### Come riprendere il lavoro (stato al 9 ottobre 2026, pomeriggio)

**Stato al 9 ottobre, in breve** (dettagli in §2, «Il menu a tendina bloccato»,
«Mappatura dei pulsanti», «Equipment — risolto», «Layout sostitutivi»):
- tutorial finito dalla fase 995: menu a tendina funzionante; Equipment funzionante
  (`GET /keyblade/subslot`); Presents funzionante (layout sostitutivi + testi);
- banco: **risorse versione 26** installate (= OBB 5.0.1 + addnl + pacchetto generato:
  mappe, LWF vuoti per pet/NPC, layout di `make_layouts.py`, animazioni Armature
  sostitutive, **2.332 testi `text/ui` originali** dell'IPA 4.4.0); master revisione 57;
