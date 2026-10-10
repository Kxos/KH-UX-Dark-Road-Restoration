# Ripartire su un'altra macchina

Tutto ciò che serve per continuare il progetto altrove. Il repository contiene solo
codice e documentazione: binari, certificati e progetti di analisi vanno rigenerati, e
qui c'è come.

---

## 1. Dove siamo

| Fase | Stato |
|---|---|
| 1–2 · Ricognizione | ✅ completata — vedi [REPORT.md](REPORT.md) |
| A · Analisi statica | ✅ completata — vedi [PHASE-A.md](PHASE-A.md) |
| B · Server | ✅ scritto e testato in locale |
| **Test sul dispositivo** | 🟡 **il Prologue si gioca fino in fondo** — APK **originale** su **LDPlayer 9 (Android 9)**, host **`api-s.sp.kingdomhearts.com`**. Nuovo giocatore: titolo, contratto, data di nascita, master, filmato, nome, editor avatar, Union, `/user/create`, catena di avvio, **Prologue** (combattimento, forziere, speciale con swipe, boss), RESULTS (obiettivi spuntati) e CONGRATULATIONS (sacchetti aperti); dialogo con Chirithy e **schermata principale (home)**. Vedi «Dove siamo rimasti» qui sotto |
| C · Campi `master::` | ✅ completata — vedi [PHASE-C.md](PHASE-C.md) |
| **OBB** | ✅ 5.0.1 (`main.76`, `patch.87`) scaricati, verificati e **serviti come risorse KHUX**; il client 4.3.1 li monta. Con `addnl` dell'IPA iOS 4.3.1 unito agli OBB (risorse versione 3) **l'editor avatar funziona** e il nuovo giocatore arriva, dopo Union e `/user/create`, alla **prima battaglia** (Prologue), con `avatarParts` e `initItem` dalle tabelle master della 5.0.1 offline. Vedi §2, «Gli OBB 5.0.1 serviti al client 4.3.1» |

### STATO AL 11 OTTOBRE 2026 (notte) — RIPRENDERE DA QUI

**Aggiornamento dopo la compattazione** (vale sopra l'elenco piu' sotto):
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
- **prove sui layout: `tools\ldplayer\session\build-resources.ps1 -Quick`** (~40 s):
  rigenera il pacchetto dentro l'ultima versione e lo scrive direttamente nei file del
  guest (coda di `files/r/misc.mp4.1` + `misc.png`), poi riavvia solo l'app. Niente
  download, a patto che le dimensioni non cambino: se cambiano il client butta le risorse
  (`resourceRevision 0`) e riscarica tutto. Per questo le versioni complete (dalla 26)
  riservano 4 MiB al pacchetto generato e un nome di riempimento nell'indice, e `-Quick`
  torna alle dimensioni installate (`resource_merge.py --index-size`; se il pacchetto
  supera la riserva serve una versione completa). `resource_merge` tiene in cache gli
  indici decifrati e le keystream (nonce fisso) in `%TEMP%\khux_bgi_cache`: 1 s invece di 60.
  Una versione nuova vera (da far scaricare): `build-resources.ps1 -Version N` poi
  `update-resources.ps1` (~5 min). Il server prepara solo l'ultima versione;
- **Medal List funziona (9 ottobre)**: lista, dettaglio medaglia, popup Sort/Filter.
  Catene di crash risolte una alla volta con `armtrace\stackcap.ps1 -MenuY 697 -Taps 'x,y'`
  (vedi «Medal List — risolto»). **Sell Medals completo (9 ottobre)**: selezione, popup
  di conferma, `POST /user/medal/sell` (server: toglie le medaglie, accredita `sell`),
  popup «Sale complete!» e ritorno alla lista (vedi «Sell Medals — risolto»). Restano:
  freccia «medaglia successiva» inerte, cursore di selezione invisibile (armatura
  `Cursor_Anim_MedalSell` segnaposto), immagini e statistiche segnaposto (tabelle medaglie);
- altri pulsanti in crash per layout mancanti: Profilo (`AvatarInfoScene_A_ver131`),
  Moogle Shop (`MoogleShopScene_ver410` + `lwf/mogshop/mog_wait`), Avatar Boards
  (`SphereBoardScene_ver310`), Other e rotolo (`MenuDialog_ver300`?); vedi la tabella
  della mappatura. Poi la missione 8 (punto b).

**DA FARE PRIMA DI TUTTO IL RESTO — controlli su Medal List e vendita** (chiesti
dall'utente il 9 ottobre; ognuno va verificato sul banco con screenshot e spuntato qui):
- [x] **Frecce del dettaglio** (risolto il 9 ottobre, banco: Donald → Yuna → Dewey → Yuna).
  `FUN_00aba238` fa del primo figlio di `LeftUI`/`RightUI` il bersaglio di un pulsante
  (`FUN_008d601c`); le callback (`FUN_00abf974`/`FUN_00abfaa8`, operator() delle vtable
  `01f168e8`/`01f16968`) chiamano `FUN_008bf3a8`/`FUN_008bef44`, lo stesso scorrimento
  dello swipe, che funzionava gia'. Il problema era l'area toccabile: `FUN_008d6230`
  accetta il tocco in un rettangolo grande quanto il bersaglio ma **centrato sulla sua
  origine** (angolo in basso a sinistra, offset −0,5·w/−0,5·h). In `make_layouts.py` i
  pannelli `Panel_Left`/`Panel_Right` hanno ora l'origine al centro della freccia
  (30,320 e 930,320; 120×220) e la freccia in (0,0). Visto anche: nel dettaglio di una
  medaglia equipaggiata il pulsante «取りはずし» (Unequip) e' ancora in giapponese.
- [x] **Lucchetto (protezione)** (risolto il 9 ottobre). `POST /user/medal/lock`
  (azione 46), corpo `{"userMedalIds":[110],"isLocks":[1]}`; il client lo manda **solo
  uscendo da Medal List** (nel dettaglio cambia solo l'icona: spenta = libera, accesa =
  bloccata), e se la risposta e' sbagliata lo rimanda al rientro successivo («200 ERROR
  :46» prima della home). Risposta: `userMedals` (`FUN_0078da18`), `deleteUserMedalIds`
  e `isSubslotUpdate` (intero). Il server salva in `player.medalLocks` e restituisce
  `lock`. Banco: bloccata = grigia col lucchetto in lista e in vendita, il tocco non la
  seleziona; sbloccata = selezionabile (210 munny); di nuovo bloccata, salvata.
- [x] **Stile della selezione nella vendita** (risolto il 9 ottobre). `selectView` =
  armatura `Cursor_Anim_MedalSell` (movimento `Animation1`, `FUN_00882e10`), ora copia
  del cursore della fusione `Cursor_Anim_MdalMix_ver103.ExportJson` dell'addnl (estratto
  con `res_get.py` e `names_v4.tsv` in `layouts\orig`): bagliore giallo pulsante
  `Medal_Syn_Select_Eff02` (144×172) che segue la sagoma della medaglia, compreso il
  riquadro del trait in alto a destra (vuoto sulle nostre medaglie senza trait). Banco:
  tre medaglie selezionate, tre bagliori, 630 munny. Le texture `.png` delle risorse sono
  in formato BTF: 38 byte di intestazione (larghezza/altezza a 0x1e/0x20) poi zlib RGBA.
- [x] **Spazi della griglia** (risolto il 9 ottobre). Misure dal banco (la scena e'
  scalata di 1,6875 e centrata: x_schermo = 960 + (x − 480)·1,6875; celle 120×164 da
  `FUN_0087fa88`): la vendita ha 7 colonne fisse a passo 126 con la prima a 33 dal bordo
  di `Scroll_Area`, e con 820 px da x=70 la 7ª era tagliata; Medal List (passo 134,
  margine 8) ne mostrava 6. Come nei riferimenti, ora 7 colonne intere in entrambe,
  centrate: `MedalSell_Gen` `Scroll_Area` 942 px da x=9, `MedalList_Gen` 954 px da x=3.
  Banco: nessuna medaglia tagliata; la 7ª colonna si seleziona (vendita) e apre il
  dettaglio (lista).

**Fatto dopo (9 ottobre, sera):** Unequip in inglese; Level Up completo
(`POST /user/medal/enhance`, curva EXP del client, popup materiali rari); Evolve non va
piu' in crash (scena `MedalEvoScene_ver320` e layout generati, stile da
`reference\medal_evolve\`); vendita nello stile originale (barre curve, Sort arancione,
Sell rosso, icone delle valute, riquadro bianco di selezione); 46 pulsanti `img/ui/*_On`
copiati (crash di «Sell Medals» da Evolve). Poi Medal List nello stile originale
(pulsanti scalati 0,765, prima riga sotto la barra), medaglie di supporto impilate
(`validPack` da thethiny `unk_1116`, badge rosso, popup della quantita'
`EquipSell_Medal_Step1_ver131` generato; master revisione 58). La targhetta sotto la
medaglia segue l'ordinamento (codice originale); sulle medaglie di supporto alterna il
prezzo con i testi 101210001–003, che nelle risorse inglesi sono uno spazio (la
versione internazionale li aveva svuotati). Da fare: conferma di un'evoluzione vera,
poi i pulsanti in crash del menu.

**Annotazioni per dopo (cose viste sul banco, non ancora affrontate):**
- Titolo: pulsanti «Restore Resources» (2), «Save User Data», «x3 [ex tres]», «KHDR
  START»: mai provati.
- Dettaglio medaglia: «Unequip» funziona (`POST /user/medal/remove`, azione 237; prima il
  client chiede `GET /user/medal/preremove`, risposta generica: da studiare). Pulsante
  «Share» (condividi con gli amici) mai provato.
- Home: «Beginner's Guide», «Shop» (jewel), frecce ‹ › delle pagine: mai provati.
- Pet: l'oggetto pet della sessione (+0x7c0) nasce solo dall'azione 170 (`pet`,
  `pet.userPetCoordinate`, `petName`, `initCoordinate`), che il client non chiede mai
  (isPet 0); ogni risposta che porta un petSubslot va in crash (0x7c8d40).
- Popup Sort/Filter: «Favorite», «SP Attack Bonus / No Bonus» (grigi, forse disattivati
  dal codice), «Imitation», sezione «Special Traits» con 11 icone e «None» due volte:
  da confrontare con l'originale (guida 2017 non mostra i Trait, aggiunti dopo).
- Filtri Guilt 1–9 e SP Attack Bonus: il 9 usa l'icona dell'8 (MedalInfo_Guilt9 assente).
- Grafica di quasi tutte le medaglie (segnaposto Dewey/Donald/Goofy): Cheshire Cat,
  Merlin, Fairy Godmother, Huey/Dewey/Louie hanno tutte l'aspetto di Dewey.
- Medaglie di supporto nella vendita: la targhetta alterna il prezzo con un testo vuoto
  (101210001–003 sono uno spazio nelle risorse inglesi; nell'originale «FOR SYNTHESIS»).
- Evolve: barra nera sotto il materiale corretta; «Sell Medals» da Evolve ok; mancano le
  animazioni originali del risultato (ora quella del Level Up).
- Moogle Shop (10 ottobre): **scheda Items come l'originale e scambio funzionante**
  (reference\moogle_shop\moogle_shop_01.png). Dati: `server/make-moogleshop.js` genera
  `moogleshop` e `shuffleskill` (dalla khuxwiki; nessun dump pubblico delle due tabelle).
  Campi verificati: type 1 Traits / 2 Items; payType 1 jewel (2 munny, ipotesi); itemType
  come i premi (5 materiale, 3 medaglia); frameType 1 = riga blu (Panel), altrimenti
  dorata (Panel_Rare/SkillPanel_Rare/Count_Rare); display 1 = mostra «N days left» fino
  a endDate; count = scambi possibili. shuffleskill: category = numero dell'icona
  img/kakusei/Kakusei_Icon%04d (10 gauge, 20 HP, 30-50 resistenze, 60/61 terra/aria,
  70 raid, 80 attacco extra, 90 STR, 100 DEF). `GET /moogleshop/list` elenca le righe
  attive {moogleshopId, limitCount} (vuoto = «No items available.»). `POST
  /moogleshop/buy` {moogleshopId, userMedalId, userShuffleSkillId}: azione 248, risposta
  shuffleskillUserMedals, userMedals, userSkills, userMaterials, emblemIds,
  guiltBurstFirst/MaxUserMedalIds, userData.userPoint. Conferma
  `MoogleShop_Traits_AddCheck.json` (openItemBuyPopup FUN_00e16a84), esito «Received …».
  Righe: changeRowItem FUN_00ab175c, changeRowKakusei FUN_00aaf8e4, icona generica
  FUN_0074d540 (LuxBoard, AVT, Incentive, Medal, KB, Stamp, Icon_Skill nel Panel_Item);
  texture generate Mogshop_plate1, But29/But31 (righe dei trait), copie But30 (=But01).
  Traits: tutte le 13 righe come l'originale (shuffleskill.type deve essere 1, altrimenti la
  riga non compare; nei layout niente Label Txt_Count_Cus: il codice crea da Txt_Count un
  CustomRichText con quel nome, FUN_006e436c; nei nomi «%» raddoppiato, passano da un
  formato printf). **Da fare:** nomi lunghi dei trait che toccano l'icona; moogle
  (lwf/mogshop/mog_wait) LWF vuoto; targa LB_Munnies della scena non compare; «N days
  left» mostra 1980 giorni (orologio del guest al 2021, endDate generate sul 2026).
- **Moogle Shop — trait (10 ottobre, sera; banco ts9-ts11).** Flusso: tocco della riga
  (controlla gia' il prezzo: «You don't have enough Jewels»), «Select Medal» (grigio senza
  riga scelta) apre `MoogleShop_Traits_MedalSelect_Pop_ver410` (FUN_00e103f4, layout
  generato da `trait_medal_select_popup` in make_layouts.py, aspetto da
  reference\moogle_shop\jp410_136.png). Griglia MiniMedalScrollView (FUN_0091d10c): il
  **tocco** apre il dettaglio (callback +0x930, FUN_00739350); la **scelta si fa
  trascinando** la medaglia sullo slot a sinistra (swipe lento orizzontale; +0x990
  FUN_00e1ba9c controlla il rilascio dentro `MedalArea` > `Medal1`, che deve avere la misura
  della medaglia, 176x176; +0x960 FUN_00e1bc5c la imposta e riempie `KakuseiSkill_Window`
  con FUN_00e12838). **Medaglie velate** (grigio 100,100,100, non trascinabili):
  FUN_0088020c con il flag +0xb29 della griglia = tipo 9/10 (supporto) oppure
  `spShuffleskillSlot` 0 (master +0x4b8; +0x4b4 = `shuffleskillSlot`, slot normali: con 0
  la finestra dei trait resta nascosta). Il formato vecchio delle medaglie non ha questi
  campi: `make-game-tables.js` mette 1 slot speciale a tutte le medaglie d'attacco
  (khwiki «Trait»: ogni medaglia ne ha uno) e slot normali 1, 3 sulle 6★ (ipotesi: la
  khwiki dice solo «da 1 a 5», il numero esatto c'e' solo per le medaglie recenti).
  Conferma: `MoogleShop_Traits_AddCheck` (ora anche con `LB_Jewel`) o, se gli slot sono
  pieni, `MoogleShop_Traits_OverwriteCheck_ver410` (OK = `Button_Draw`/`Txt_Draw`,
  `Txt_Wording2` «Replace X with Y?»; lo slot da sostituire si sceglie toccando la riga del
  trait nel popup). `POST /moogleshop/buy` {moogleshopId, userMedalId, userShuffleSkillId
  (0 = slot libero)}: il server salva in `player.medalTraits[userMedalId]`, rimanda la
  medaglia in `shuffleskillUserMedals` e in ogni elemento di userMedals `userShuffleSkills`
  (FUN_0078d4b4: userShuffleSkillId, shuffleSkillId, userMedalId, getDatetime, type 0);
  costo e conteggio scalati solo se lo scambio riesce, altrimenti risposta con solo `ret`
  («200 ERROR :248»). Risultato: il client mostra il dettaglio con «Trait 1/1». Da
  sistemare: il cursore rosso dello slot da sostituire (armatura `MedalInfo_Anim`,
  `animeCursor`) e' piu' largo della finestra; trait speciali (Spirit Training) non gestiti.
- **Profilo — fatto (10 ottobre, notte).** Si apre toccando l'avatar della home
  (AvatarInfoDialog::open FUN_008d785c: scena nascosta + `GET /user/profile`, azione 5,
  parser FUN_00792148; poi createLayout FUN_008d7e8c). Riferimenti reference\profile\
  (video 7-R0jhyzlso del 2017, 640x360: profile_06 schermata, _11 Titles, _13 Name/Message,
  _16 Play Style). Layout generati in make_layouts.py: scena AvatarInfoScene_A_ver131
  (UnderUI = Titles/Name/Message/Play Style/Outfits = Button_A..D; LeftUI/RightUI = frecce
  ‹ ›, il loro primo figlio diventa un pulsante), AvatarInfo_Oneself_ver131 (cornice) +
  AvatarInfo_User_ver260 (FUN_008e68d0: RankTitle_Board/RankTitle_Name del titolo,
  Base_User con Union_Symbol e My_Name, Txt_Party/Party_Name, MVP_Crown/MVP_Trophy;
  FUN_008e7d58: FaceBook_PhotoPanel/FaceBook_Photo), pagina 1 = AvatarInfo_Txt_ver340
  (originale; le sue 6 texture mancanti disegnate in make_textures.py dai colori di
  profile_06), pagina 2 = AvatarInfo_Txt2 (record, FUN_008eb9a8: copia della pagina 1
  senza l'anello + Scroll_Area/Txt_Money/MoguPoint/LastLogin/Timezone/Style),
  TresCommu_CommunicationUser/Other vuoti. Server: titolo di default Budding Newbie (con
  titleLeft/Right/PlateId 0 crash in FUN_006e9bbc), keyblade iniziale `isFavorite` 1
  (createLayout mostra il preferito: senza, riga nulla e crash in FUN_008c19e4),
  img/union/Union_%02d e Union_L_* (stemma nell'anello). Popup: **Titles** (Button_A,
  FUN_008db068) = copia di Offline_AvatarTitle_Base (Ok e separatore nascosti), `GET
  /user/title` (azione 18) elenca i titoli di categoria 1 + `player.titles`, la scelta
  manda `POST /user/title/update` {titleLeftId, titleRightId, titlePlateId} (azione 41,
  risposta userData.userDetail) — banco: «Wielder Newbie» salvato. **Name/Message**
  (Button_B, FUN_008dcf1c) = funzione avatar_comment_popup da Offline_AvatarInfo_Comment
  (Cancel = Button_Close/Txt_Cancel), `POST /user/update` {name, comment} (azione 38,
  risposta userData.user): il nome si salva; **il messaggio parte vuoto** sul banco (testo
  scritto con `adb input text`; FUN_006e467c sostituisce il TextField Txt_Comment_Label con
  il campo vero e la callback FUN_008de654 copia il testo solo a fine modifica: da
  riprovare con una tastiera vera; la variante U13 si sceglie se l'eta' di sessione +1000,
  da `GET /user/birthday` azione 9 = AAAAMM, e' <= 12: il client non la chiede mai, oggetto
  nullo = adulto). **Play Style** (Button_C, FUN_008deb84): CheckBox But16 come i filtri del
  popup Sort (con Button crash in FUN_0125068c), `POST /user/playstyle/update`
  {playTimezones, playFrequently} (azione 40), salvato in userDetail. Da fare: Outfits
  (Button_D), Boosters/Passive, pagina 2 (Button_Change), frecce ‹ › (non compaiono con un
  solo profilo), fumetto vuoto finche' non si salva un messaggio.
- **Avatar Boards — elenco (10 ottobre, notte).** Si apre senza crash ma e' vuoto: i master
  `sphere`, `sphereArray`, `sphereMasu` sono vuoti (non esistono dump pubblici: nemmeno
  thethiny/KHUx-Server `data/` li ha) e mancano tutte le immagini `img/sphere_board/
  Board_%04d`, `img/sphere_kind/Kind_%04d`, `img/sphere_incentive/%d` (nelle risorse solo i
  segnaposto cocostudio/publish/Board_0001 e Kind_0001). Generati in make_layouts.py:
  SphereBoardScene_ver310 (CenterUI = SphereBoard_Gen, LeftUI = MedalSell_Back) e
  SphereBoard_Select_Icon_ver130 (carta: Select_Base/Select_Board/Select_Kind). Nomi dal
  codice (FUN_00cd1bb8, FUN_00cd3868, FUN_00cd468c, FUN_00cd78e8, FUN_00cd7f78): Img_Win_L/S
  (targa del costo con Txt_Coin/Txt_Coin_Title), Coin (Avatar Coins: SpherePointIcon,
  Txt_Coin_Name_Label, Txt_Coin_Label), TitleBar/Txt_SphereBoard_Label, Txt_Open con
  Txt_Num_Label/Txt_Total_Label (Nodes), Bar_Filter con gli stessi due nomi (conteggio),
  Button_Filter/Txt_Filter, Txt_Caution, BoardDetail/DetailButton/Txt_Detail, SelectArea con
  i posti LeftUI/RightUI/CenterUI, LeftUI_Arrow/RightUI_Arrow (Panel: il primo figlio diventa
  il pulsante). Aspetto da reference\avatar_boards\avatar_boards_list_01.jpg (2400x1080) e
  ab_29-33.png (video 7-R0jhyzlso, 556-686 s). Mancano ancora (da missing_layouts.txt):
  SphereScene_ver310 (la bacheca), SphereBoard_Filter_ver120, SphereBoard_Account_ver120,
  PopupNormal_SphereCoinCheck_ver310, Sphere_Incentive(_ver240), Sphere_Popup_Comp_ver310,
  Sphere_Popup_Get_ver240. Per renderli utili servono i dati delle bacheche (ricostruibili
  dalla khuxwiki, pagine «Avatar Board»: nodi, costi, premi) e le immagini delle carte.
- **Menu Other e Missioni (10 ottobre, notte).** «Other» (MENU, `1740,963`) =
  MenuDialog_ver300 da MenuDialog_ver150 originale (other_menu in make_layouts.py; il codice
  scrive i testi e nasconde Support/Transfer/Movie; TwitterButton nascosto cercato da
  FUN_009ed888). Pulsanti di Other mai provati. Il pulsante a pergamena sotto l'avatar della
  home (`425,130`) apre le **Missioni**: MyPageMission_Base_ver320 generato (nomi da
  FUN_00a8ad3c/FUN_00a8c100; nessun riferimento visivo trovato online: aspetto dei popup KHUX,
  da rivedere se si trova un video). L'elenco e' vuoto: master `mission`,
  `multiTimemission` vuoti e `GET /user/mission/list` (azione 189, FUN_00797eb8: missions[],
  beginnerLimitTime) risponde dallo schema; manca anche MyPageMission_Panel (riga) e le
  icone img/ui/MyMission_GroupIcon1/2.
- **Missione 8 giocabile (10 ottobre, notte).** `recon/tools/mappoi_room.py`: parte MAP per
  una stanza senza modello (struttura da un'altra mappa, posizioni controllate sulla
  bitmap `map/<stanza>/<stanza>_cls.bin`: 'CLS', larghezza, altezza, byte per riga, 1 bit
  per pixel, bit alto a sinistra, 0 = percorribile). Spec in `stage_gen\spec_1050.json`
  (Dwarf's Cottage DW_0003_00_00, Large Body bersaglio a 3750,950, due forzieri);
  intestazione STG 1050 con partenza 450,700 e bersaglio 10007. make-game-tables.js:
  nemici senza grafica (lwf/character/enemy/<displayId>/ esiste solo per 1, 6, 8, 17, 37,
  1020 e le serie Dark Road 5001-5086/7001-7005/8001-8022) -> sostituto (tabella
  DISPLAY_SUBSTITUTE, poi per taglia), displayId veri in enemy_display_orig.json; filmati
  prima/dopo senza `img/light/SEQ/<id>.l` ne' `lwf/drama/<id>/` disattivati (base in
  stage_base.json; 4 casi, tra cui 1010201/1010301 della missione 8). Revisione master 72.
  Banco: «Unexpected Visitors» fino a RESULTS (tre obiettivi), LEVEL UP. Da fare: 979
  missioni di storia -> processo automatico (vedi «Piano per le missioni»).
- **Missioni di storia in automatico (10-11 ottobre, notte).** thethiny stage_dec: 1.140
  stage, missioni di storia = stageBinId 1..525 (numero della missione, nessun buco; la
  versione finale arrivava a 979, i dati oltre la 525 non ci sono). make-game-tables.js le
  unisce al master stage (campi assenti derivati, revisione 73). `recon/tools/
  gen_story_maps.py` (config `stage_gen\story_cfg.json`, ~3 s): per ogni missione stanza da
  `recon/tools/story_rooms.json` (5 stanze note: DB_0000 Fountain Square, DB_0004 1st
  District, DW_0000 Flower Glade, DW_0001 Dark Forest: Entrance, DW_0003 Dwarf's Cottage) o
  una dello stesso mondo (le stanze vere arrivavano dal CDN: nelle risorse 86), nemici e
  tesori dalla wiki, posizioni sulla bitmap delle collisioni, intestazione STG come le vere
  ([2] parti, [3,4] partenza, [6] bersaglio, [8] aree, [9] nemici, [14] forzieri, [15]
  oggetti). Un'unica parte per missione: le uscite tra stanze (sezione C?) non sono
  ricavate. Uscita in `stage_gen\story`, copiata in `stage_gen\files\stage` (non sovrascrive
  1010-1050). Prova sul banco: `server\save\smoke.json` {stageId} fa proporre dal server solo
  quella missione; `tools\ldplayer\smoke_quests.ps1 -Stages ...` la avvia e controlla l'app
  (~75 s a missione), `recon/tools/smoke_pick.py` sceglie le 76 missioni che coprono tutte
  le stanze e i nemici. Filmati: dei 116 filmati lwf (2xxxxxx, le missioni con la pellicola)
  ne mancano 5 (tutti 2999951); i 175 dialoghi (script SEQ 1xxxxxx) quasi tutti assenti: si
  tolgono solo gli id assenti. Nemici: grafica solo per 6 KHUX + serie Dark Road senza nome
  (5001-5086, 7001-7005, 8001-8022): sostituzioni in DISPLAY_SUBSTITUTE, da completare
  identificando le serie Dark Road (nomi delle texture: TopOperaY, Ifrit, Yeti, ...).
- **Medaglie da Roboloid/khux (11 ottobre).** `src/search.js` ha `medalDatabase` (2.100
  medaglie con evoluzioni: nome, stelle, attributo, verso, guilt, STR/DEF, moltiplicatore,
  gauge, bersaglio, attacco speciale, immagini): estratto in `external\roboloid\
  medal_db.json`. Le immagini del sito sono i file del gioco (stessa tela e posizione).
  `recon/tools/fetch_medal_images.py` associa le medaglie del master per nome e stelle e
  scrive Medal_L/Medal_S/Cutin in `medal_gen\files`; build-resources.ps1 le impacchetta come
  penultimo pezzo nelle versioni complete (-Quick riscrive solo l'ultimo). make-game-tables
  usa `medal_gen\medal_map.json` per le immagini e, con KHUX_MEDALS_ALL=1, aggiunge le
  medaglie mancanti (medalId 300000 + id Roboloid). Roboloid ha anche
  `images/assets/board/sphere_incentive-<id>.png` (381 premi delle bacheche) e
  `images/map` (379 anteprime di stanze, solo riferimento).
- **Test dei nemici con le missioni «zoo» (11 ottobre, idea dell'utente).** Con
  KHUX_ZOO=1 (KHUX_ZOO_COUNT) make-game-tables aggiunge gli stage 990001.. (copie della
  1050, «Zoo N»); gen_story_maps.py con zoo_enemies (stage_gen\story_enemies.json: i 139
  nemici delle mappe di storia) e zoo_per_stage li riempie in aree da 5 nella Fountain
  Square: all'avvio il campo carica la grafica di tutti, quindi un avvio verifica decine di
  nemici. Trovati e corretti: effetto di comparsa `lwf/character/enemy/show_effect_fla/
  show_effect<showSwf>/` presente solo per 1-4, 100, 501-506, 1000 (55 nemici -> quello
  dello Shadow; era il crash della 2100); obiettivi «Defeat <nemico>» su enemyId assenti
  (99 nella 2170, 138 nella 2090) -> Shadow. Ancora in crash alcuni gruppi (FUN_00e37014,
  riga del nemico tramite FUN_00ef58e0): bisezione con zoo da 5 in corso. Provino dei
  nemici Dark Road: scratchpad enemies.png (5002 = Large Body ma senza animazione move;
  5075 TopOperaY = Yellow Opera; 5054 Ifrit, 5063 Yeti, 5070 Shiva, 8001 Flame Core).
- **Gauge degli attacchi speciali**: l'utente ricorda che resta salvata nel keyblade (non
  riparte da 0). server.js salva in player.keybladeBurst il primo campo numerico di
  /stage/clear che nomina burst/gauge e lo rimanda in userKeyblades[].burst: il nome vero
  del campo e' da verificare sul primo completamento (log «[gauge]»).
- **Attacchi speciali generati (10 ottobre, sera).** La tabella `burst` vera (5.0.1 e
  thethiny/KHUx-Server `data/burst.json`) ha solo 11 righe. `make-game-tables.js` tiene
  quelle in `master_data/burst_base.json` e genera le altre: clone della famiglia
  (burstId/10) con «+k» e +300 di potenza per livello, oppure modello per attributo con
  nome, gauge, bersaglio, descrizione e moltiplicatore dalla khuxwiki (85 famiglie su
  109). 63 righe restano «Special Attack» (medaglie senza pagina con lo stesso nome);
  animazioni ed effetti sono quelli del modello (in battaglia ogni speciale senza riga
  vera sembra Thunder Raid, Thundaga o Heaven's Sword). Banco: dettaglio della Donald 6★
  con «Thundaga +5», x1.69, 4 potenziamenti.
- **Strumenti nuovi** (10 ottobre): `recon/tools/vtable_users.py` (chi crea una lambda
  std::function: dalla funzione target() della vtable alle coppie ADRP+ADD/LDR che la
  usano; cosi' si trovano le funzioni come openItemBuyPopup); `recon/tools/
  fetch_material_icons.py` (icone dei materiali dalla khuxwiki, 44 su 45; manca
  Remembrance Gem); `D:\Progetto_Restauro_KH_UX\catalog\missing_layouts.txt`: i 250 layout
  che il binario cita ma che non esistono (ogni schermata che li usa va in crash finche'
  non si generano: Album, Chat, Party, Ranking, PvP, Pet, TresCommu, ShopBuyItem_*,
  Purchase_Pop, Information_Save...).
- Home: il fumetto del personaggio compare vuoto (testo da trovare).
- «Sell Materials» (EquipSellScene, FUN_00c5e584): **si apre** (10 ottobre) con i
  materiali del giocatore e il popup della quantita' (EquipSell_Dialog_Step1). Il codice
  cerca `Panel_1` e dentro `EquipSell_Scroll_Area` (radice del layout = Panel_1), nella
  riga `Panel_On`, nel popup `Txt_data4`. **Vendita funzionante** (10 ottobre): conferma EquipSell_Dialog_Step2 (FUN_00c611fc,
  serviva Txt_cancel minuscolo), POST /user/material/sell {userMaterialId, number}
  (azione 50, risposta userData.userPoint + oggetto userMaterial), popup «Complete!».
  **Stile** (10 ottobre): nessuno screenshot originale online della schermata (khuxwiki
  Shop: solo i prezzi, Mythril Stone 50, Gem 100, Crystal 150, altri 10; Mythril Shard e
  Orichalcum non vendibili, prezzo «---»); righe larghe 460 come le targhe della vendita
  medaglie (Owned, Price con icona, valore giallo), le colonne le mette il codice a meta'
  dell'area. Popup: icona a scala 1,1, «Price ◆ 10» (Txt_data1 = «Price», Txt_MoneyStock_Fix
  = prezzo unitario) nel riquadro dello slider.
- Popup della quantita' (medaglie e materiali): «1/N» = Txt_MaterialStock_Fix_2 (scelta),
  Txt_data3 «/» fisso, _Fix_3 (massimo). Fascia «Includes ★★★ Medals or higher.»: Panel
  rosso (233,18,38, bordi 255,2,0) con testo bianco e tre stelle fisse (rare_star.png),
  mostrata dal codice se la pila ha piu' di 2 stelle. Esito «Complete!» (FUN_006f4918,
  PopupNormal_MedalSell_Ok_ver350) come l'originale (reference\material_sell\
  complete_thumb.png). `Result_LU_Win_Star.png` come ImageView si vede a righe: non usarla.
- Avatar, Avatar Boards, Other, rotolo del menu: crash (vedi «Mappatura dei
  pulsanti»). Missione 8 senza mappa.

**Regole delle risorse scoperte (valgono per ogni schermata futura):**
- Stile: prima si cercano online schermate e dati dell'originale, si salvano in
  `reference\<schermata>\` e ci si adegua (guide tumblr khux-guides, khuxwiki, reddit...).
- **Catalogo delle risorse** in `D:\Progetto_Restauro_KH_UX\catalog\`: `index.html`
  (miniature con ricerca, per cartella; per ogni texture i layout che la usano e se il
  binario la cita), `textures.tsv`, `layouts.tsv` (widget e texture di ogni layout).
  Si rifa' con `recon/tools/res_bulk.py` (estrazione in blocco, 16 s per 4000 file) e
  `recon/tools/catalog.py` (2 min). Le texture sono BTF: `recon/tools/btf.py` le decodifica
  (tipo 8 RGBA, tipo 9 palette + indici, ritaglio dentro una tela).
- Il pacchetto generato puo' **sostituire** file originali (`resource_merge.py
  --last-wins`), ma i **plist nuovi non si caricano**: il client legge solo plist con nomi
  gia' presenti nelle risorse, e usa la texture col nome del plist (`X0.plist` →
  `X0.png`), non quella dell'ExportJson. Un'armatura nuova con frame propri sostituisce
  quindi il plist (e il png) di un'armatura che il binario non cita
  (`Cursor_Anim_MedalSell` usa `EquipmentBGAction0`; liberi anche MyPageAnime0,
  AdventureTopAnima0, GlobalNaviAnimation0, LuxUpPanelAnimation0, ActMapTreasureBox*0,
  Cursor_Anim_QuestPanel0/QuestArrow0). `make_layouts.py`: `('frame', ...)` costruisce una
  cornice a 9 fette con 8 ossa.
- I pulsanti di `FUN_008d56f8` caricano `img/ui/<nome>_On.png` al tocco; gli ImageView
  del modello hanno il 9-slice (bordo 50): per icone e immagini a dimensione naturale
  `s9=False`.

### Come riprendere il lavoro (stato all'8 ottobre 2026, notte)

**Posizione (dall'8 ottobre 2026).** Tutto il lavoro sta su D: per lo spazio su C::
repository in `D:\Progetto_Restauro_KH_UX\Android\KH-UX-Dark-Road-Restoration`, Ghidra in
`D:\Progetto_Restauro_KH_UX\Android\ghidra_12.1.4_PUBLIC_20260921` (con una junction
dal vecchio `C:\work\Android\ghidra_…`), gli AVD `khux30`/`khux33` in
`D:\Progetto_Restauro_KH_UX\avd` (i `.ini` in `%USERPROFILE%\.android\avd` puntano lì),
screenshot e tombstone in `D:\Progetto_Restauro_KH_UX\screenshots`. Claude Code va
aperto dalla cartella del repository su D:. La cartella vuota
`C:\work\Android\KH-UX-Dark-Road-Restoration` (era la directory di lavoro della
sessione che ha fatto lo spostamento) si può cancellare. Su C: lo spazio cala anche per
`C:\pagefile.sys`, che Windows ingrandisce quando LDPlayer, Ghidra e server girano
insieme (14,9 GB l'8 ottobre): non è un file del progetto.

**Banco.** LDPlayer 9 (`D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9`), istanza 0,
APK 4.3.1 originale. Dopo ogni riavvio di LDPlayer va rieseguito
`tools/ldplayer/phaseb-guest.sh`: CA di sistema, orologio al 15/5/2021, DNS verso il
PC e Private DNS spento. Il DNS IPv4 della scheda Ethernet di Windows deve essere
**192.168.1.185** (il PC) durante le prove e tornare **automatico** a fine sessione.
Nel guest restano installate le risorse (`files/r/misc.mp4` + `.1` + `misc.png`):
**versione 7** = OBB 5.0.1 + `addnl` + il pacchetto delle mappe generate
(`D:\Progetto_Restauro_KH_UX\stage_gen\files\stage\`: parte `_00` di 1040, intestazione
1050). Tabelle master: revisione 53 nel repository; il banco ha ancora la 52 e la 53
arriva da sola al prossimo `relogin.ps1`. Una nuova versione delle risorse si pubblica
con `resource_pack.py` + `resource_merge.py` in `resource_data\<N>` (§2, «Mappe generate
e risorse aggiuntive») e si installa con `update-resources.ps1` (~5 minuti, 2,3 GB).
Il server annuncia solo l'ultima versione presente.

**Ripartire in tre comandi** (script di sessione in `tools/ldplayer/session/`, log del
server in `D:\Progetto_Restauro_KH_UX\logs\server.log`):

```powershell
.\tools\ldplayer\session\relogin.ps1 -Tag x    # server + rientro del giocatore salvato: home
.\tools\ldplayer\session\cycle.ps1 -Tag x      # da NUOVO giocatore (cancella il salvataggio)
powershell -File .\tools\ldplayer\session\run-server.ps1 -Revision 57   # solo il server
```

Alzare `-Revision` (default 57 negli script) dopo ogni modifica di `server/master_data/`.
Il salvataggio del giocatore è `server/save/player.json` (escluso da git). Dopo una
`/compact` o su un'altra macchina basta leggere questa sezione e «Dove siamo rimasti».

**Server a mano**, da `D:\Progetto_Restauro_KH_UX\Android\KH-UX-Dark-Road-Restoration` (PowerShell):

```powershell
$env:KHUX_PUBLIC_URL    = "https://192.168.1.185"
$env:KHUX_REVISION      = "53"                   # revisione dati master
$env:KHUX_RESOURCE_SIZE = "2317958810"           # byte annunciati per il download
$env:KHUX_RESOURCE_DIR  = "D:\Progetto_Restauro_KH_UX\resource_data"   # versione 3 = OBB 5.0.1 + addnl iOS 4.3.1, indice unito
$env:KHUX_RESOURCE_KEY  = "<chiave 5.0.1, vedi sotto>"
# $env:KHUX_NEWCOMER    = "0"   # giocatore esistente: catena /user/* e download risorse
node server\server.js
```

`server/master_data/` (fuori dal repository) si rigenera così, nell'ordine:

```powershell
node server\make-master-stub.js --force          # 106 tabelle minime + misc
node server\import-master.js D:\Progetto_Restauro_KH_UX\apk501\extra_files `
  avatarParts initItem misc stage world stageDrama enemy enemyAttack keyblade skill buff `
  burst battleMisc badstatus tutorialMisc medalMisc material title theater raidEnemy raidEnemyAttack
node server\make-game-tables.js D:\Progetto_Restauro_KH_UX\wiki\medals.json   # medal, player (lv 0-99, HP 3000), reward (81 forziere CP; 1, 80001, 88001, 81020 drop dei nemici), mypageBackground
```

`extra_files` = le 55 tabelle della 5.0.1 (§2, «Le tabelle master della 5.0.1 offline»;
si riestraggono dall'`extra.mp4` dell'APK 5.0.1 con la chiave 5.0.1). `wiki\medals.json`
= valori khuxwiki delle tre medaglie iniziali (tabella in §2, «HP del giocatore e
medaglie iniziali»; se manca, si riscrive da lì). Dopo ogni modifica dei master si alza
`KHUX_REVISION`.

La chiave non sta nel repository. Si rilegge dal binario 5.0.1:

```powershell
python -I -c "import sys; d=open(sys.argv[1],'rb').read(); print(d[0xe6ee54:0xe6ee54+32].hex())" D:\Progetto_Restauro_KH_UX\apk501\ext\lib\arm64-v8a\libcocos2dcpp.so
```

(`apk501\ext` = estrazione di `base.apk` 5.0.1. `resource_data\3\data`: pezzi da 64 MB di
`main.76` + `patch.87` + `addnl.mp4`, fatti con `recon/tools/resource_split.py`;
`resource_data\3\index\misc.png` con `recon/tools/resource_merge.py` dall'`aliud.png` 5.0.1 e
dall'`addnl.png` dell'IPA 4.3.1, che si estraggono con `recon/tools/remote_zip.py`.)

**Crash del client**: `tools/ldplayer/tombstone.ps1` (indirizzi ARM sospetti dal
tombstone) e, quando non bastano, **`tools/ldplayer/armtrace/`** (registri ARM al momento
del crash: `capture.ps1 -Arm`, provocare il crash, `capture.ps1 -Collect`, `-Release`;
vedi il suo README). `vmread` si ricostruisce con `build_vmread.py`.

**Script del banco** (`tools/ldplayer/`, `-Out` = file di log del server):
- `bench_lib.ps1`: funzioni comuni, **senza attese fisse**. Lo schermo si legge dentro il
  guest (`screencap` grezzo, 16 byte di intestazione, poi `dd` dei soli pixel che
  servono: ~0,2 s a lettura); `Step` tocca un pulsante e attende che la schermata
  successiva sia riconosciuta dai suoi pixel, ritoccando se non cambia; `WaitLog`
  attende una richiesta nel log del server;
- `bench_flow.ps1 -Out <log> [-Until name|editor|union|battle]`: nuovo giocatore dal
  lancio alla prima battaglia (titolo, contratto, data di nascita, Download, SKIP, nome,
  editor, conferma, vetrata con SKIP, Union, `/user/create`, `/stage/start`) in
  **~42 s** (prima ~330 s con le attese fisse). Le firme delle schermate sono in testa
  allo script;
- `bench_start.ps1`: giocatore esistente, KHUX START ritoccato finché arriva
  `/khux/login`, poi attende che il log si fermi (riscritto con `bench_lib.ps1`, non
  ancora provato sul banco);
- `tombstone.ps1`: dall'ultimo tombstone gli indirizzi ARM (Ghidra) del crash sotto
  houdini;
- `bench_prologue.ps1 -Out <log>`: dopo `bench_flow.ps1`, gioca tutto il Prologue
  (Shadow, forziere arancione con confronto dell'HUD prima/dopo, swipe dello speciale
  di Donald sul boss, attacchi fino a `/stage/clear`) e tocca i risultati; ~1 minuto.
  Uso tipico: `bench_flow.ps1 -Out $log; bench_prologue.ps1 -Out $log -Shot x`;
- `Swipe` (in `bench_lib.ps1`): lo speciale si lancia con uno swipe **rapido** in
  diagonale sulla medaglia, `Swipe 130 790 400 520 150` (Donald);
- screenshot (e tombstone) in `D:\Progetto_Restauro_KH_UX\screenshots\`: passano dalla
  cartella condivisa di LDPlayer (`Documents\XuanZhi9\Pictures`) e vengono spostati.

**Analisi** (Ghidra headless: progetto `recon/ghidra/project`, JDK
`D:\Programmi\Android\Android Studio\jbr`, Ghidra in
`D:\Progetto_Restauro_KH_UX\Android\ghidra_12.1.4_PUBLIC_20260921\ghidra_12.1.4_PUBLIC`; si lancia con
`-process libcocos2dcpp.so -noanalysis -readOnly -scriptPath recon/ghidra`):
- `khux_decomp.py` (decompila; `t 300` = timeout), `khux_listing.py` (segue il flusso),
  `khux_linear.py` (lineare: serve nei rami del dispatcher);
- dispatcher delle risposte `FUN_007c3204`: per un'azione si parte da
  `recon/tools/action_case.py`, poi si decompilano i parser e si passa il C a
  `recon/tools/response_schema.py`. Lo schema va in `recon/out/api_responses_ww431.json`
  (il server genera da lì le risposte minime);
- `request_ids.py` (chi costruisce la richiesta di un'azione), `who_refs.py` (chi usa
  un indirizzo), `getter_ids.py` (id costanti passati a un getter master),
  `master_types.py` (tipi dei master), `bgad.py` / `bgad_names.py` / `bgi_check.py` /
  `bgi_keyhunt.py` / `resource_index.py` (pacchetti e indici), `bgad_extract.py` (un
  file dagli OBB), `asset_coverage.py` (asset citati dal binario contro un indice),
  `dex_consts.py`;
- indirizzi: Ghidra = file + `0x100000`. Il disassemblato lineare del dispatcher si
  rifà con `khux_linear.py <out> 007c3204 007d1080`.

**Dove siamo rimasti:**
1. Da **giocatore esistente** la catena di avvio passa tutta e il client avvia il primo
   stage (`POST /stage/start`, `StartDeckEditDialog::startStory`): mancano dati di gioco.
2. Da **nuovo giocatore**, con le risorse OBB installate: filmato → nome → editor avatar
   (`FUN_00d6a4f4`): **risolto** servendo come risorse la versione 3 = OBB 5.0.1 +
   `addnl` dell'IPA iOS 4.3.1 (§2, «Gli OBB 5.0.1 serviti al client 4.3.1»). L'editor
   si apre e, con `avatarParts` e le parti iniziali di `initItem` prese dalle tabelle
   master della 5.0.1 offline, funziona (§2, «Le tabelle master della 5.0.1 offline»).
   Con `initItem` completa il tutorial prosegue: conferma dell'avatar, scelta della Union,
   `POST /user/create`, la catena di avvio e **il Prologue completo** (stage 1010, HP
   3000, deck Donald A / Goofy A / Yuna, forziere, speciale con swipe, boss),
   `/stage/clear`, RESULTS, CONGRATULATIONS, `/user/point`, `/user/stone`,
   `PUT /tutorial/status {phase 995}`, `/system/push/regist`, `/campaign`, `/raid/list`,
   `/party`, `/party/member/list` e altre otto API (§2, «Dopo il Prologue»): obiettivi
   spuntati, sacchetti dei nemici, il dialogo di Chirithy (saltato con SKIP) e **la
   schermata principale** (§2, «La schermata principale»), con lo sfondo. Il giocatore si
   salva e al rientro va dritto alla home (§2, «Salvataggio del giocatore»), anche dopo
   un aggiornamento dei master (§2, «Il crash dopo l'aggiornamento dei master»). Quests e
   la missione 2 completa, con forzieri, drop e inventario (munny, jewel, materiali)
   generati dalle mappe e controllati offline da `server/check-stage-data.js` (§2,
   «Missione 2, forzieri, drop e inventario»). **Missioni 1–7 giocabili** (la 7 con
   la mappa generata, §2, «Mappe generate e risorse aggiuntive»); la lista mostra la 8,
   che non ha ancora la mappa. Stato del giocatore salvato: LV 15 (con la tabella vera
   dei livelli scenderà a ~LV 2–3), 1.600 jewel, medaglia Dewey ★.
   **Prossimo, in ordine** (9 ottobre 2026):
   a) ✅ `stage_raw`, `enemy_raw`, `medal_raw` di thethiny decodificati
      (`raw_master_old.py`, §2, «Ricerca online dei dati originali»). `make-game-tables.js`
      li usa: **522 medaglie vere** (grafica sostitutiva per attributo: 11021 Power, 12011
      Speed, 13021 Magic, altrimenti Dewey ★; solo 21 hanno immagine) e **670 nemici**
      (i 12 della 5.0.1 + quelli veri mancanti). La tabella stage resta quella della 5.0.1
      (le righe vere servono con le mappe: la lista apre la mappa della missione dopo).
      Revisione master 57. Banco (9 ottobre): rientro e home a posto con le nuove tabelle;
      **bloccato invece il menu a tendina** (MENU si apre, ma Quests/Medal List/MENU non
      rispondono e non partono richieste; anche Quests in basso a sinistra). Succede
      identico con le tabelle della 53 e con quelle segnaposto (LV 15): **non dipende dai
      master**. Da indagare (stato del tutorial della home? fumetto grigio vuoto comparso
      all'apertura del menu);
   b) missione 8 (1050, «Dwarf's Cottage», probabilmente `DW_0003_00_00`): manca una mappa
      modello di quella stanza; nemici e tesori dalla wiki (`quests.json`);
   c) `story.ps1`: controllare lo schermo a ogni passo (i tempi fissi perdono il passo
      dopo un aggiornamento o con un tutorial guidato);
   d) `wiki_quests.py`: il parser dei nemici (`{{EN|...}}` con template annidati) è da
      correggere;
   e) contatti (da fare l'utente): thethiny, Roboloid, r/KHUx (§2, «Ricerca online dei
      dati originali»).
   Si procede come sempre:
   `action_case.py` sul dispatcher, decompilazione dei parser, `response_schema.py`,
   risposta in `server.js`, prova con `bench_flow` + `bench_prologue`.
   Aperti: l'avviso che compare morendo nel tutorial (nel tutorial non si muore, dice
   l'utente) non è ancora stato catturato; quantità vere di HP iniziale e CP del
   forziere sconosciute (segnaposto 3000 e 10.000). Restano 285 layout citati dal
   binario e non trovati: da verificare man mano sul banco, cercando altre copie (IPA JP,
   comunità) se servono.
3. Fase D: popolare i master secondo `recon/out/master_types_ww431.json`. Fonte principale:
   le 55 tabelle dell'`extra.mp4` 5.0.1 (`server/import-master.js`); khuxwiki per le altre.

### Quello che sappiamo, tutto ricavato dal binario

- Il client prende la base URL dalla **risposta** di bootstrap, non da una costante
- Contratto: bootstrap → `{maintenance, url, nativeToken}`; sessione →
  `{nativeSessionId, sharedSecurityKey}`
- La richiesta invia `UUID`, `deviceType`, `nativeToken`
- Header di autenticazione: `X-HTTP-USER-TOKEN: %s`
- Payload di login: `accessToken`, `platformId`, `platformType`
- Sette endpoint REST della chat (`%s/user`, `%s/chat/message/%d`, …)
- **La chiave AES la sceglie il server** → chi risponde all'handshake controlla il canale
- Per dirottare il client basta un redirect DNS: nessuna patch del binario

---

## 2. Il problema aperto — causa accertata il 7 ottobre 2026

**Il gioco si chiude dopo circa un secondo, su Android 16.** È il **protector che si
autotermina dopo un controllo d'ambiente fallito**, e lo dichiara lui stesso.

A ~170 ms dall'avvio del processo, subito prima dell'abort (Galaxy A54, Android 16):

```
E error : ErrorCode = 90
E error : 2026/10/07 11:43:51
E error : com.square_enix.android_googleplay.khuxww
E error : samsung
E error : SM-A546B
E error : 16                              <- la versione di Android, che quindi legge
E error : 004c4ba4-013462e6-07fbaf1b      <- 7 triplette; solo la prima e' stabile
  ... (altre 6)
F libc  : Fatal signal 6 (SIGABRT), code -1 (SI_QUEUE) in tid 23947, pid 23947
I Zygote: Process 23947 exited due to signal 6 (Aborted)
```

Non è un crash: è un rifiuto, con tanto di rapporto diagnostico. Il protector legge
modello, produttore, **versione del sistema** e orologio, e aborta.

> **Aggiornamento del 7 ottobre 2026 (sera): il protector è LIAPP di Lockin Company, e il
> `90` era colpa nostra.** Ogni `ErrorCode = 90` mai visto veniva dall'APK **patchato**:
> è l'**anti-repackaging** di LIAPP che vede la firma di debug. L'APK **originale** dà un
> altro codice, **`13380225`**, identico su telefono e su MuMu. Vedi «Mappa dei codici
> LIAPP», più sotto. Il rapporto qui sopra resta valido come forma.

**Le sette triplette non sono tutte impronte** — correzione a una prima lettura.
Confrontando due avvii diversi, **solo la prima è identica**; le altre sei cambiano ogni
volta. La prima è quindi un'impronta vera; le altre sei sono valori per-sessione, nonce
o roba derivata dall'ASLR. C'è molto meno da dedurre guardandole di quanto sembrasse.
La prima, `004c4ba4-013462e6-07fbaf1b`, è **identica anche su MuMu Player**, cioè su un
altro «dispositivo»: è un'impronta dell'**applicazione**, non del telefono.

Il literal `ErrorCode = ` **non esiste in chiaro da nessuna parte** — né in
`classes.dex`, né in `libcocos2dcpp.so`, né in `lib__57d5__.so`. È costruito a runtime
dal protector dopo essersi decifrato, il che conferma che il rapporto viene da lui. Cosa
significhi il codice 90 non è documentato pubblicamente.

### Due conclusioni precedenti da correggere

**Il criterio del backtrace non era applicabile.** Diceva: «se tra i frame compare
`lib__57d5__.so` → è il protector». Non comparirà mai. Tutti e quattro i tombstone
raccolti dicono **`2 total frames`**, entrambi dentro `libc` (`abort+156` e
`__libc_current_sigrtmin+4`, che è solo il simbolo esportato più vicino), **senza
`Abort message`**. Lo stack unwinder si ferma dentro libc, quindi nessuna libreria
dell'app può apparire nel backtrace, qualunque sia la causa. Il tombstone non era il
posto giusto dove guardare: **la risposta era nel buffer principale di logcat**.

**`SI_QUEUE` non dimostrava nulla.** Era stato letto come prova di un `sigqueue()`
deliberato, contrapposto a un `abort()` ordinario. Ma `raise()` di bionic usa
`rt_tgsigqueueinfo`, quindi quel `si_code` è anche quello di un `abort()` normale. La
conclusione era giusta per un'altra ragione — il rapporto del protector — non per questa.

### Ipotesi escluse, con il dato che le ha smentite

| Ipotesi | Esito |
|---|---|
| Rotto dal nostro ripacchettamento | ⚠️ **in parte vero**: l'originale si chiude anch'esso, ma con un altro codice (`13380225`). Il `90` è proprio l'anti-repackaging scatenato dalla nostra firma — vedi «Mappa dei codici LIAPP» |
| Librerie non allineate a pagine da 16 KB | ❌ i segmenti `LOAD` sono allineati a 64 KB |
| **Scadenza o licenza datata del protector** | ❌ Primo test: orologio del telefono al **7 marzo 2021**, stesso `ErrorCode = 90`. Non bastava, perché quella data è *precedente* alla build 4.3.1 (aprile 2021). Rifatto su MuMu Android 12 con root (`date 051512002021.00`, `auto_time 0`): orologio al **15 maggio 2021**, dopo la build e prima della chiusura del 30 maggio. Il rapporto stampa `2021/05/15 12:00:19` e dà **lo stesso `ErrorCode = 90`**. L'orologio di sistema non è la causa |

### Che cos'è `lib__57d5__.so`

Protector impacchettato (1 MB, entropia 7,94 bit/byte). Il caricatore è travestito da
classe Kotlin (`kotlin.coroutines.experimental.intrinsics.IntrinsicsKt__…$10`), fa
`System.loadLibrary("__57d5__")` in un `<clinit>` e poi centinaia di chiamate a un
decrittatore nativo, anch'esso camuffato. È referenziato da decine di classi in tutto il
dex: **non è rimovibile**, è uno strato di decifratura intrecciato nell'app.

### Come si riproduce la cattura

Il filtro predefinito `package:mine` di Android Studio nasconde queste righe. Da riga di
comando:

```bash
adb logcat -c && adb shell monkey -p com.square_enix.android_googleplay.khuxww \
    -c android.intent.category.LAUNCHER 1
# attendi ~10 s, poi:
adb logcat -d -b main,system,crash > run.txt
```

e filtra sul pid del processo del gioco — le righe che contano hanno tag `error`.

### Riscontro su Android 11: nessun rifiuto, ma il dato non regge

> ⚠️ **Ridimensionato il 7 ottobre 2026.** Su questo emulatore il codice ARM del
> protector non arriva mai a eseguire davvero: vedi il dump più sotto, e
> `HandleNoExec`. L'assenza del rifiuto quindi **non prova** che Android 11 passi il
> controllo: il controllo forse non è mai partito. Su MuMu Player, dove il protector
> gira davvero, rifiutano **anche Android 12 e 15**. Vedi «MuMu Player».

Provato su emulatore API 30 (Android 11), entrambe le ABI dell'APK.
**Nessuna riga `E error`, nessun `ErrorCode`.** Su Android 16 il rifiuto arriva a 0,18 s;
su Android 11 non arriva mai. Era stato letto come il primo riscontro diretto che il
controllo fosse legato alla versione del sistema.

Nessuna delle due varianti completa però l'avvio, per **limiti della traduzione ARM**,
non del gioco:

| ABI | Esito su API 30 x86_64 |
|---|---|
| `arm64-v8a` | muore a ~1,5 s, `SIGSEGV` / `SEGV_ACCERR`. Backtrace: `#01 libndk_translation.so (ndk_translation_HandleNoExec)`, `#04 <anonymous:…>` |
| `armeabi-v7a` | arriva più lontano — carica il nostro `network_security_config` — poi muore in silenzio, processo zombie, nessun tombstone |

`HandleNoExec` vuol dire che il traduttore non riesce a eseguire codice che l'ospite ha
prodotto a runtime: cioè precisamente quello che fa un packer che si decifra. Di
passaggio è confermato che **la patch dell'APK funziona**, perché la configurazione di
rete viene caricata.

### L'emulatore x86: quadro completo, e chiuso

La traduzione ARM esiste solo in una finestra stretta di immagini, e quella finestra è
già stata usata. Verificato, non dedotto:

| Immagine | `ro.product.cpu.abilist` | Esito |
|---|---|---|
| API 29 x86_64 | `x86_64,x86` | non installa — `INSTALL_FAILED_NO_MATCHING_ABIS` |
| **API 30 x86_64** | `x86_64,x86,arm64-v8a,armeabi-v7a,armeabi` | installa, nessun `ErrorCode`, muore nel traduttore |
| API 33 x86_64 | `x86_64` | non installa — `INSTALL_FAILED_NO_MATCHING_ABIS` |

Google ha aggiunto la traduzione ARM con API 30 e l'ha tolta dalle immagini più recenti.
**Nessuna altra immagine x86 può dire di più**: o non installa, o inciampa nel traduttore.
Controlla sempre `ro.product.cpu.abilist` dopo il boot, prima di perdere tempo.

> **Le immagini arm64 non compaiono in SDK Manager su un host x86.** Non è che non
> esistano: sono filtrate per architettura dell'host. Per averle serve `sdkmanager` da
> riga di comando — cioè installare *Android SDK Command-line Tools* dalla scheda
> *SDK Tools* — e poi chiedere il pacchetto per nome:
> ```bash
> sdkmanager "system-images;android-30;google_apis;arm64-v8a"
> ```
> L'emulatore include `qemu-system-aarch64`, ma **su host x86 non boota** — verificato,
> vedi il riquadro successivo.

### L'immagine arm64 su host x86: provata, chiusa

Provato il 7 ottobre 2026: `system-images;android-30;google_apis;arm64-v8a` (r16),
emulatore 37.2.12, Windows 11 su i5-9600K. **Il guest non arriva nemmeno al kernel.**
Non c'entra il gioco: è l'emulatore.

| Passo | Esito |
|---|---|
| `emulator.exe -avd …` | rifiuto immediato: `Avd's CPU Architecture 'arm64' is not supported by the QEMU2 emulator on x86_64 host` |
| `qemu-system-aarch64.exe -avd …` direttamente | il controllo sta solo nel launcher e si salta. Serve `emulator\lib64` (e `lib64\qt\lib`) nel `PATH`, altrimenti esce con `0xC0000135`, cioè DLL mancante |
| idem, con `-accel off` | supera i controlli e avvia il main loop, poi esce con codice 1 **senza messaggio** |
| `qemu-system-aarch64-headless.exe` | è l'unico binario che stampa l'errore vero: **`PCI bus not available for hda`** |

Il frontend inietta sempre `-soundhw hda`, e dispositivi `*_pci` per multi-touch e
Wi-Fi, anche con `-no-audio` e `hw.audioOutput=no`. La macchina ARM `ranchu` della build
Windows non ha un bus PCI. Senza `-avd` il binario non accetta le opzioni QEMU grezze
(`unknown option: -serial`), e `-qemu` può solo aggiungerne, non toglierle. Google non
mantiene più questo scenario su host x86. Restano solo un QEMU upstream senza i
dispositivi goldfish, molto lavoro con esito incerto, o un'altra strada.

> Se ci riprovi: con poco spazio su `C:` l'AVD si può spostare su un altro disco
> cambiando `path=` nel `.ini`. Il controllo di spazio guarda la cartella dell'AVD, e la
> partizione dati di default chiede 9,6 GB.

### Dump della memoria del protector: fatto su MuMu con root

Riuscito il 7 ottobre 2026, su MuMu Android 12 con root. La tecnica di base — congelare
il processo e copiare `/proc/<pid>/mem` — funziona, con due correzioni rispetto al primo
tentativo sull'emulatore Google:

- **la finestra è brevissima e il processo muore presto**: congelare a tempo fisso
  mancava sempre il bersaglio. Soluzione: `SIGSTOP` subito, poi far avanzare a scatti
  (`CONT` / `STOP` ogni 20 ms) finché in logcat non compare `ErrorCode`, e fermarsi lì.
  Così il processo resta congelato **dopo** aver scritto il rapporto ma **prima**
  dell'`abort`;
- **`dd` di toybox tiene `skip` a 32 bit**: con `bs=4096` gli indirizzi alti (`0x77…`)
  vanno in overflow e `dd` esce con `-NNN < 0`. La shell `mksh` fa anch'essa i conti a
  32 bit. Soluzione: calcolare gli offset in Python e passarli a `dd` in byte con
  `iflag=skip_bytes,count_bytes`, che li legge a 64 bit.

Gli script sono in `recon/tools/memdump/`, con un README. I dump non sono versionati:
stanno in `D:\Progetto_Restauro_KH_UX\dumps` (~200 MB).

**Cosa si è trovato:**

- **Il rapporto è assemblato a runtime.** La stringa `ErrorCode = 90\n…\nSM-A156E\n12\n`
  con le sette triplette compare **in chiaro sullo stack del thread principale**, non in
  nessuna libreria su disco. Conferma: il rapporto lo costruisce il protector dopo
  essersi decifrato, come già si sospettava.
- **Il protector scrive il verdetto su disco.** Il file privato
  `app_57d5/l5Xzi1ZFinmQC.txt` (nome a caso, costante tra gli avvii) contiene
  `90`, un timestamp Unix, `0`, e il `pid`. Cioè **codice d'errore, ora e processo**. Da
  verificare se a un avvio successivo lo rilegge: se sì, cancellarlo potrebbe cambiare il
  comportamento, ed è un esperimento a costo zero.
- **Vicino al rapporto, sullo stack, c'è una lunga lista di package di altre app**
  (`com.netease.*`, `jp.co.mixi.monsterstrike`, `kr.txwy.and.blhx`, …), la stringa
  `_ZN3art7Runtime15DisableVerifierE` e `/proc/sys/vm/pagecache_limit_switch`. Sono
  impronte tipiche di un controllo d'ambiente: cerca emulatori, strumenti e app note. Ma
  da solo non spiega il codice 90, perché **rifiuta anche sul Galaxy fisico**, dove quelle
  app non ci sono.

**Quello che manca ancora:** il dump cattura il codice ARM *tradotto da houdini*, non
l'originale, e non abbiamo ancora isolato *quale* controllo porta al 90. Il payload
decifrato vive nelle regioni `rwx` basse (`[anon:Mem_0x20000000]`, ~62 MB a `0x0d3ec000`)
e nelle librerie `nb/` tradotte. Il passo successivo è disassemblare quella regione, o
mettere un breakpoint prima della scrittura del file di verdetto.

### Il protector è LIAPP (Lockin Company) — identificato il 7 ottobre 2026

Le impronte del dump combaciano con **LIAPP**, il protector mobile della coreana
**Lockin Company**: il nome `lib__57d5__.so`, la lista di package di altre app sullo
stack, `DisableVerifier`, lo schema «rapporto `ErrorCode = N` + righe diagnostiche →
`abort`». La pagina ufficiale *LIAPP – learn more* elenca esattamente i controlli che
vediamo, e fa chiarezza sul codice 90.

**Cosa blocca LIAPP, per sua stessa documentazione:**

- **root** — «blocks execution on rooted devices»;
- **macchine virtuali** — «blocks execution on virtual devices», e **nomina NOX,
  BlueStacks e MuMuPlayer**;
- **anti-debugging** e **USB Debugging detection**;
- **memory protection** — «prevents unauthorized memory access and dumps»;
- anti-tampering / anti-repackaging, hooking, VPN, Fake GPS, macro, overlay;
- **licenza**: «apps LIAPP-applied within the license period can be used *permanently*».
  Cioè la protezione **non scade a runtime** e non valida nulla online: coerente con
  «nessuna rete prima del rifiuto». L'ipotesi «licenza scaduta» è quindi chiusa due
  volte — dall'orologio e dalla documentazione.

### Mappa dei codici LIAPP — misurata il 7 ottobre 2026

Il codice **cambia con la condizione**, e ogni condizione dà sempre lo stesso codice.
Misure dirette, `logcat` letto a ogni avvio:

| APK | Banco | Condizione | `ErrorCode` |
|---|---|---|---|
| **patchato** (firma di debug) | Galaxy A54 (16), MuMu (12, 15), LDPlayer (9) | qualunque | **90** |
| patchato | Galaxy A54 | opzioni sviluppatore **spente** | **90** |
| **originale** 4.3.1 | Galaxy A54, Android 16, **senza root** | opzioni sviluppatore spente | **13380225** |
| originale | Galaxy A54 | debug USB **acceso** | **13380225** |
| originale | MuMu Android 12, root | orologio di oggi | **13380225** |
| originale | MuMu Android 12, root | orologio al **15 maggio 2021** | **13380225** |
| originale | MuMu Android 12, root | **strace** agganciato | **40** |
| **originale** | **LDPlayer 9, Android 9, senza root** | nessuna | **nessun rifiuto** — verdetto `0`, il gioco arriva al titolo |
| originale | LDPlayer 9, Android 9 | lettura di `/proc/<pid>/mem` da root, a gioco vivo | **17471875** (memory protection) |

Letture:

- **`90` = anti-repackaging.** Compare solo con l'APK ri-firmato, su qualunque banco e
  qualunque stato del debug. **Tutta l'analisi precedente si basava su `90`** e quindi
  misurava la nostra patch, non il problema vero. In particolare, i test «esclusa la
  versione» (Android 9/12/15/16) e «esclusa la data» erano stati fatti col patchato: non
  dicevano nulla sul controllo che ferma l'originale. Quelli sono stati **rifatti con
  l'originale** (righe sopra).
- **`40` = anti-debug.** Compare quando un tracer (`ptrace`) è agganciato. Lo strace va
  usato sapendo che cambia la risposta.
- **`13380225` (`0xCC2A81`) è il codice dell'originale, ed è lo stesso ovunque**: telefono
  vero senza root e MuMu con root, Android 16 e 12, debug acceso e spento, data di oggi e
  di maggio 2021. Quindi **non** è VM-detection, root, versione di Android, debug USB o
  orologio. Lo strace dell'originale mostra anche **nessuna connessione di rete** prima
  del rifiuto, solo i socket locali di `logdw`/`statsdw`. È un controllo **locale, comune
  a tutti i banchi**, e non ancora identificato. Indiziati rimasti: integrità/installazione
  dell'APK (es. LIAPP che si aspetta lo split di Play invece dell'APK unico), un
  identificativo o una chiave di attivazione che non c'è, o un controllo legato al
  servizio Square Enix spento.
- **L'ipotesi «debug USB» è smentita.** Il telefono pulito col debug spento rifiuta lo
  stesso, con lo stesso codice di quando è acceso.
- **`13380225` = versione di Android non supportata — verificato.** Tutti i banchi su cui
  l'originale rifiutava sono **più recenti della build** (4.3.1 = aprile 2021, Android 11
  corrente): 12 e 16. Su **LDPlayer 9 (Android 9)**, senza root, l'originale **passa**.
  Vedi «Android 9: il client parte».

### Android 9: il client parte — 7 ottobre 2026

**Primo avvio riuscito del client in tutto il progetto.** APK originale 4.3.1 (hash
verificato nel guest) su LDPlayer 9.5.37, Android 9, ABI `arm64-v8a` via houdini, root
spento.

- **LIAPP lascia passare**: nessuna riga `E error`, nessun `abort`. Il file di verdetto ha
  un **nome diverso** da quello dei rifiuti — `app_57d5/SEgF3I_JinmQC0.txt` invece di
  `l5Xzi1ZFinmQC.txt` — e contiene `0\n<ts>\n0\n0`: codice **0**, tutto in regola. Accanto
  c'è un `data3.db` (71 byte, inizia con il path di `app_57d5`).
- **Il gioco gira**: motore Cocos, audio Square Enix (`sqexsdlib` 18.05.18.C), billing,
  Firebase, Facebook/Twitter SDK. Chiede l'accesso a **Google Play Games**
  (`AchievementManager: start login`): la schermata di Google fallisce per mancanza di
  rete, si chiude con «Indietro» e il gioco va avanti.
- **Arriva alla schermata del titolo**: «Version 4.3.1», pulsanti **KHUX START**, **KHDR
  START** e **x3 [ex tres]**, e un popup **«End of Service Notification»** («ended service
  as of Tuesday 6/29/2021… an offline version… is now available»).
- **Il guest non ha rete** (`ping`: *Network is unreachable*; DNS fallisce per tutti). Il
  popup di fine servizio quindi è **generato in locale** dal client, non scaricato. Il
  testo non è in chiaro nell'APK: sta negli asset cifrati. Va capito *quando* il client lo
  mostra (data? fallimento del bootstrap?): è la prima cosa da guardare con il nostro
  server in ascolto.
- Le preferenze del gioco (`Cocos2dxPrefsFile.xml`, chiave `data`) sono cifrate, formato
  con magic `BGAD`.

**Come si usa LDPlayer 9 qui:**

- **adb non si apre** con questa versione (9.5.37), nemmeno con
  `"basicSettings.adbDebug": 1` in `vms\config\leidian0.config`: nessuna porta in ascolto.
  Non serve: **`<ld>\ld.exe -s 0 "<comando>"`** esegue comandi shell nel guest, da
  root (`context=u:r:ldinit`), e **`ldconsole installapp --index 0 --filename <apk>`**
  installa. `logcat`, `pm`, `am`, `input`, `cat` di `/data/data` funzionano tutti così;
- per spegnerlo: `ldconsole quit --index 0` può non bastare, `ldconsole quitall` sì. La
  config si modifica **solo a istanza spenta**;
- con Hyper-V attivo (lo vuole MuMu) il boot richiede qualche minuto, poi l'uso è fluido;
- **screenshot dall'interno del guest**, non dallo schermo del PC (la finestra può non
  essere in primo piano e si cattura il desktop): `ld.exe -s 0 "screencap -p
  /sdcard/Pictures/x.png"` e il file compare in `C:\Users\<utente>\Documents\XuanZhi9\
  Pictures\` — cartella condivisa `vboxsf`, come `Misc` e `Applications`.

**La rete del guest — risolto.** Il guest sta su una *NAT Network* di VirtualBox,
`LdNatNetwork0` (`172.16.1.0/24`): DHCP su `.3` (`VBoxNetDHCP`), gateway su `.1`
(`VBoxNetNAT`), il guest prende `.4`. Il primo giorno **non c'era rete** perché un
riavvio rapido dell'istanza aveva lasciato **orfano** il vecchio `VBoxNetDHCP`: al
secondo avvio VirtualBox non riesce a ripartire la rete («Cannot start DHCP server
because it is already running», in `%USERPROFILE%\.Ld9VirtualBox\VBoxSVC.log`) e **non
lancia `VBoxNetNAT`**. Il DHCP risponde lo stesso, ma il gateway non esiste: ARP
`NUD_FAILED`, Android stacca e riattacca il Wi-Fi in ciclo, *Network is unreachable*.
Rimedio: `ldconsole quitall`, attendere che `Ld9BoxHeadless` sparisca, terminare
`VBoxNetDHCP`/`VBoxNetNAT` rimasti, rilanciare. Controllo: con l'istanza accesa devono
esserci **entrambi** i processi. Dopo: ping al gateway, a `8.8.8.8` e DNS funzionano.

**Con la rete, stesso popup di fine servizio**, e in 60 s nessuna connessione TCP
duratura del gioco verso Square Enix (solo chiamate brevi degli SDK: la Graph API di
Facebook risponde). Il bootstrap verso il server di gioco parte, con ogni probabilità,
solo premendo **KHUX START**: è il momento da catturare col nostro server.

**Per la fase B serve un'accortezza sul certificato.** L'APK patchato aggiungeva un
`network_security_config` che fa accettare le CA utente; l'originale non lo ha, e su
Android 7+ un'app con `targetSdk 29` **non si fida delle CA installate dall'utente**. Non
si può ripatchare (LIAPP → `90`). La strada è installare `server/certs/ca.crt` come **CA
di sistema** nel guest (in `/system/etc/security/cacerts/<hash>.0`), cosa possibile
perché `ld.exe` dà root.

### Fase B sul banco LDPlayer 9 — primi passi, 7 ottobre 2026 (sera)

**Il popup di fine servizio è una scadenza a data, dentro il client.** Con l'orologio del
guest al **15 maggio 2021** il popup sparisce e, premuto nulla, il client **tenta il
bootstrap** da solo all'avvio. Il testo («ended service as of Tuesday 6/29/2021», con la
versione offline) è negli asset cifrati della 4.3.1: il client lo mostra quando la data
supera la chiusura, **senza consultare alcun server**. Per tutta la fase B il guest va
tenuto con l'orologio prima del 29/6/2021.

**Il bootstrap fallisce con `A connection error has occurred (6 ERROR :251)`.** Il `6`
coincide con `CURLE_COULDNT_RESOLVE_HOST` di libcurl, e torna con i fatti: dopo l'errore
il client **non apre alcuna connessione TCP** (il contatore delle regole di dirottamento
resta fermo, lo SNI non arriva al server). Cioè **il nome dell'host di bootstrap non si
risolve più nel DNS pubblico** — mentre `psg.sqex-bridge.jp`, l'host ipotizzato in fase A
da `xlash123/khux-re-api`, risolve ancora (`34.54.148.120`, Google Cloud). Quindi
**l'host del bootstrap della 4.3.1 non è `psg.sqex-bridge.jp`**, o non solo.

> **Corretto l'8 ottobre 2026: LDPlayer non risolve fuori dal guest.** Le prove qui sotto
> erano vere, la conclusione no. Era il **DNS privato** di Android in modalità
> opportunistica: `netd` parlava DNS-over-TLS (porta 853) con 8.8.8.8/8.8.4.4, quindi
> nessuna regola sulla porta 53 scattava. Vedi «Fase B — 8 ottobre».

**Il nome non si vede perché LDPlayer risolve fuori dal guest.** Verificato:
- regole `iptables` DNAT sulla porta 53: contatori a zero;
- `ndc resolver setnetdns` e `setprop net.dns1` verso il nostro DNS: le risposte non
  cambiano e il server non riceve query;
- un nome inventato risolto dal guest **non compare** nella cache DNS di Windows
  (`Get-DnsClientCache`): non passa neanche dal resolver del PC.
- `networkSettings.networkDNS: "192.168.1.185"` in `leidian0.config` (chiave trovata nei
  binari di `dnplayer.exe`, con `networkStatic`, `networkAddress`, `networkGateway`,
  `networkSwitching`): **nessun effetto**, il guest riceve ancora il DNS del router.

Perché: la rete è una NAT Network di VirtualBox, e `VBoxSVC.log` mostra
`HostDnsMonitor` che legge i **server DNS di Windows** e li passa al guest via DHCP; il
motore NAT inoltra poi le query del guest dal lato host. Ne segue che **l'unica leva sul
DNS del client è il server DNS configurato su Windows**: puntandolo a `127.0.0.1` (il
nostro server, che inoltra a `1.1.1.1` tutto ciò che non dirotta) le query del gioco
arriverebbero a noi, compreso il nome dell'host di bootstrap. Richiede privilegi e cambia
il DNS dell'intero PC finché è attivo, quindi va deciso da chi usa la macchina; il log
DNS del server (`server/logs/`, non versionato) in quel periodo conterrebbe anche le query
del PC.

### Fase B — 8 ottobre 2026: DNS risolto, il client parla con noi

**Perché il DNS del guest non arrivava mai al nostro server — due cause, in fila.**

1. **VirtualBox scarta i DNS di loopback.** Con il DNS di Windows a `127.0.0.1`,
   `VBoxSVC.log` mostra `HostDnsMonitorProxy::GetNameServers:` con lista **vuota**. Va
   messo l'**IP LAN del PC** (`192.168.1.185`): il server ascolta su `0.0.0.0:53` e
   VirtualBox lo accetta (`name server 1: 192.168.1.185`). Al guest arriva via DHCP
   **solo all'avvio dell'istanza**: dopo il cambio, `quitall` e rilancio.
2. **Il guest ha il DNS privato opportunistico acceso** (`dumpsys connectivity`:
   `UsePrivateDns: true`). La rete del guest elenca `192.168.1.185, 8.8.8.8, 8.8.4.4`;
   `netd` trova che i due server Google parlano **DNS-over-TLS** e manda tutto lì sulla
   porta 853. Per questo i contatori sulla porta 53 restavano a zero, le risposte
   portavano `RRSIG` e nessun nome arrivava al server. Rimedio, ora in
   `phaseb-guest.sh`: `settings put global private_dns_mode off`, REJECT sulla 853,
   DNAT della 53 verso il PC.

Con le due correzioni il guest risolve `psg.sqex-bridge.jp` e qualunque
`*.kingdomhearts.com` in `192.168.1.185`, e le query compaiono in `[dns:dirottata]`.

**L'host di bootstrap è `api-s.sp.kingdomhearts.com`.** Già coperto da `KHUX_HIJACK`
(suffisso `kingdomhearts.com`) e dal certificato: il client fa l'handshake TLS con la
nostra CA di sistema senza obiezioni. Ricevuto all'avvio, senza premere nulla:

```
[dns:dirottata] A api-s.sp.kingdomhearts.com -> 192.168.1.185
[tls:sni]       api-s.sp.kingdomhearts.com
[?] PUT /system/status
    content-type: application/x-www-form-urlencoded;charset=UTF8
    body(json): {"appSignature":"f048533ed4e1409a732831957a34a09f"}
```

Il corpo è JSON in chiaro, nonostante il `content-type` dichiari un form. Non è
`psg.sqex-bridge.jp`, come si supponeva in fase A.

**L'errore cambia: da `6 ERROR :251` a `200 ERROR :251`.** Il primo numero è lo stato del
trasporto: prima `CURLE_COULDNT_RESOLVE_HOST`, ora lo **stato HTTP** che gli abbiamo dato.
Il `251` resta e con ogni probabilità identifica la chiamata (`/system/status`). Il
server risponde `{}` agli endpoint sconosciuti, e il client lo rifiuta: serve il formato
giusto della risposta, da ricavare dal binario.

**La sequenza di avvio, ricavata dalla decompilazione e verificata sul banco.**
`FUN_007bbe20` (= `FUN_6bbe20` senza la base `0x100000` di Ghidra) è il punto d'ingresso:
per l'azione **251 (`0xfb`)**, o se non c'è ancora una sessione, prima di eseguire l'azione
fa la catena qui sotto. Ogni passo ha la sua callback; un passo che fallisce ricade nel
gestore generico `FUN_007bcf68` e l'errore mostrato porta il numero dell'azione che
l'ha avviata, quindi **resta `:251` per tutta la catena**.

| # | Richiesta | Callback | Risposta che il client accetta |
|---|---|---|---|
| 1 | `PUT /system/status`, `{"appSignature":…}` in chiaro | `FUN_007bd720` | `{"appStatus":{"mode":"","current":"","server":""}}` — tre **stringhe**; `server` vuoto = resta sul dominio predefinito. Pieno, è un URL cifrato (chiave da `systemStatusUpdateResult`+`current`+`mode`) che sostituisce il dominio |
| 2 | `GET /login/token?m=0` | `FUN_007be0d0` | `{"url":…, "nativeToken":…}` — `url` è l'URL **completo** della richiesta di sessione, non una base |
| 3 | `POST <url>?m=0`, `{"UUID","deviceType":2,"nativeToken"}` in chiaro | `FUN_007bd5b8` | `{"nativeSessionId":…, "sharedSecurityKey":…}` — **la chiave AES la scegliamo noi** |
| 4 | `POST /system/login?m=0`, **cifrata** — azione 251 | `FUN_007c2adc` → `FUN_007c3204` | `ret` + `systemLogin` + `data` + 21 stringhe di link — vedi sotto |
| 5 | `GET /system/coppa?m=0&v=…` — azione 26 | `FUN_007c3204` → `FUN_00778b64` | `ret` + `misc` — vedi sotto |

Dopo il passo 5 il client mostra la **schermata del titolo** e si ferma ad aspettare
KHUX START / KHDR START. Premendo **KHUX START** (nuovo utente):

| # | Schermata / richiesta | Esito |
|---|---|---|
| 6 | `POST /system/errorlog` — il client segnala che la fatturazione Google Play non è disponibile | basta `ret` |
| 7 | *User Agreement* — vuoto, perché il link `agreement` è vuoto. **Accept** | nessuna richiesta |
| 8 | *Birthdate Registration* (mese e anno) → conferma | nessuna richiesta: resta in locale |
| 9 | `PUT /system/resourcesize/20200423?m=1` — azione **242**, corpo `{resoMode, masterRevision, resourceRevision, commonMasterRevision, evResourceIds}`, tutti a 0 | `ret` + **`size`** (uint, `kUint64Flag 0x2000`): i byte da scaricare. Con `0` il client salta il download |
| 10 | «Complete» e **filmato introduttivo** di KHUX | il gioco è avviato |
| 11 | fine del filmato (o SKIP) | ❌ **crash**: `SIGSEGV` a `0x10` nel `GLThread`. Backtrace tutto dentro `libhoudini`, quindi la funzione ARM non si vede |

**Perché il crash: il client non ha dati.** Dopo il crash la cartella `files/` dell'app
contiene solo `AppEventsLogger.persistedevents` e un `s000.gif` da 80 KB (con ogni
probabilità un salvataggio camuffato). Nessun dato master, nessuna risorsa. Con
`size: 0` il client crede di essere aggiornato, salta il download e, finito il filmato,
legge strutture vuote.

**Il download non parte da `size`.** Con `KHUX_RESOURCE_SIZE=1048576` il client mostra
«Tap "Download" to download the game. (Approx. 1.00 MB)». Premuto **Download**, rimanda
`PUT /system/resourcesize` e poi dice subito «Complete», **senza chiedere alcun file**.
L'elenco di cosa scaricare (URL, nomi dei file, revisioni) deve arrivare da un altro
campo della risposta o da un'altra chiamata, che il client non fa perché manca qualcosa.
Da capire nel binario: indizi da seguire sono `resoMode`, `masterRevision`,
`resourceRevision`, `commonMasterRevision`, `evResourceIds` nella richiesta, e i
`versionRes`/`versionDat`/`commonVersionDat` di `ret`, che oggi mandiamo a 0.

### Il protocollo di download — 8 ottobre 2026

**A decidere se scaricare sono le revisioni dentro `ret`, non `size`.** Il client
confronta le sue revisioni locali (0 su un'installazione vergine) con `versionRes`,
`versionDat`, `commonVersionDat`… che il server dichiara in ogni `ret`. Con tutto a 0
crede di essere aggiornato. Con `KHUX_REVISION=1` (e `KHUX_RESOURCE_SIZE` > 0), premuto
**Download** parte «Downloading... 0.0%» e arriva:

```
GET /system/master/20200423?m=1&v=…   →  {"revision":0,"commonRevision":0, ruv…}
```

È l'**azione 27**, il download dei **dati master** (richiesta costruita da `FUN_711a98`).

**La risposta all'azione 27** (ramo 27 di `FUN_007c3204` → `FUN_00eba4bc`, con il
singleton di `FUN_00eb7d50`), oltre a `ret`:

```json
{
  "master": { "revision": 1, "commonRevision": 1, "count": 106 },
  "<tabella>": { "revision": 1, "url": "https://…", "key": "<32 caratteri>", "md5": "…" },
  …
}
```

- `master.revision`, `commonRevision`, `count`: interi;
- per ognuna delle **106 tabelle**, un oggetto letto da `FUN_00eb7ef4`: `revision`
  (int), `url`, `key`, `md5` (stringhe). Le tabelle assenti vengono saltate senza errore.
  `key` sono 32 byte copiati in un contesto AES (`FUN_0083b9dc`, lo stesso della
  sessione).

**Ogni tabella è un file a parte**: il client lo scarica da `url`, lo decifra con `key` e
lo verifica con `md5`. In locale lo salva come `m/m%03d.jpg` (finto JPG, magic `bPes`;
`FUN_dbaef8` scrive, `FUN_db8070` legge, `FUN_db9580` compone il percorso). Un errore
lascia `last_master_error.gif` e `last_masterdata_message`.

**Il contenuto è JSON.** Esiste un `info/tutorial_master` dentro il pacchetto di asset
dell'APK (`misc.mp4`, letto tramite `FUN_1222710`), e `FUN_dbbfb4` lo passa al parser
rapidjson (`FUN_61fb20`, quello di «Expect either an object or array at root»). È un
master di esempio **già nell'APK**: estrarlo darebbe il formato esatto senza indovinare.

**I nomi delle 106 tabelle** (le chiavi della risposta), scritti in `.bss`
dall'inizializzatore statico `FUN_5d823c`. Nel loader l'array sta a `0x20a0b80`, passo
`0x80` byte:

`achievement`, `advertisement`, `avatarParts`, `badstatus`, `battleMisc`,
`benefitResource`, `buff`, `burst`, `colosseum`, `colosseumStage`, `comeback`,
`communicationBgm`, `communicationCategory`, `communicationRoom`, `communicationTalk`,
`communicationThumbnail`, `darkAbility`, `darkBattleMisc`, `darkBook`, `darkBossStage`,
`darkBuff`, `darkCard`, `darkDrawCardType`, `darkEnemy`, `darkEnemyAbility`,
`darkEnemyDisplay`, `darkEvResource`, `darkEvStage`, `darkInitItem`, `darkItemshop`,
`darkMainMission`, `darkMap`, `darkMapList`, `darkMaterial`, `darkMaterialRecipe`,
`darkMisc`, `darkMissionBoard`, `darkMissionList`, `darkPlayer`, `darkPlayerParts`,
`darkPve`, `darkPveReward`, `darkRankingReward`, `darkStageDrama`, `darkStatus`,
`darkWorldStage`, `drawMedalType`, `drawPetType`, `emblem`, `enemy`, `enemyAttack`,
`evCampaign`, `evMedalList`, `evResource`, `evScoreReward`, `evStage`, `guiltProb`,
`initItem`, `keyblade`, `keybladeSubslot`, `loginBonus`, `lsiGame`, `material`, `medal`,
`medalMisc`, `misc`, `mission`, `moogleshop`, `multi`, `multiStage`, `multiTalk`,
`multiTimemission`, `mypageBackground`, `passive`, `passiveSetting`, `petParts`,
`petPartsOffset`, `petRank`, `petSkill`, `player`, `pvp`, `pvpScoreReward`, `raidEnemy`,
`raidEnemyAttack`, `raidReward`, `raidSetting`, `ranking`, `rankingPvp`, `rankingReward`,
`reward`, `serialcodeReward`, `shop`, `shuffleskill`, `skill`, `skillExp`, `sphere`,
`sphereArray`, `sphereMasu`, `stage`, `stageDrama`, `stamp`, `theater`, `title`,
`tutorialMisc`, `world`, `xtresMisc`.

### Il formato dei file master — verificato sul banco l'8 ottobre 2026

**Trasporto.** Un file master è una normale risposta HTTP con Content-Type
`application/octet-stream` (o `application/encoded-json`). `RESTClient::onRespond` la
passa a `FUN_00771b3c`:

```
corpo → curl_easy_unescape → base64Decode → AES-256-CBC (key, IV a zero, PKCS#7) → JSON
```

- `FUN_013ab1cc` è `curl_easy_unescape` (sta nel blocco di libcurl, stessa firma);
- la decifratura è `FUN_0083ba6c` → `FUN_0083b858`: OpenSSL `AES_set_decrypt_key(256)` +
  `AES_cbc_encrypt`, IV a zero, padding PKCS#7. **La chiave sono i 32 byte della stringa
  `key`** della risposta all'azione 27, così come sono (`FUN_0083b9dc` li copia);
- è lo stesso schema del canale di sessione, solo nella direzione opposta;
- `md5` = **MD5 esadecimale del corpo HTTP così come arriva** (cioè del Base64). Con
  questa regola il client accetta il file, quindi l'ipotesi regge.

`FUN_0083c024` è solo MD5 in esadecimale (serve anche alla chiave dell'URL cifrato di
`/system/status`). `FUN_00eccf04` è il downloader generico dei file (dimensione + MD5 del
corpo): probabilmente quello delle **risorse**.

**Prova riuscita.** Il server serve le tabelle che trova in `server/master_data/<nome>.json`
(cartella non versionata), con chiave stabile derivata dal nome. Con un solo `misc.json`
contenente `[]` e `KHUX_REVISION=1`: azione 27 → `GET /master/misc` → «Complete», nessun
errore, e nel guest compare **`files/m/m065.jpg`** (`misc` è la tabella 65 del loader).
Il file in cache è a sua volta un **record BGAD** (cifratura 3, compressione zlib): il
client ricifra le tabelle nel suo formato, leggibile con `bgad.py`.

### Il contenuto delle tabelle master — ricavato e verificato l'8 ottobre 2026

**La forma.** `FUN_00ebaef8` riceve il JSON decifrato di una tabella e lo scorre come
**array di righe** (passo `0x14`, la dimensione di un valore rapidjson in questa build).
Passa ogni riga al **lettore di riga** della tabella, registrato nell'array del loader
(`0x20a0b80`, passo `0x80`: nome a +0, lettore a +0x30, categoria khux/dark a +0x70).
Se una riga torna null, la tabella fallisce con **errore 3** e il download si ferma. Le
righe valide diventano record binari a dimensione fissa, mescolati (MT19937),
indicizzati per chiave (metodo virtuale 2) e scritti in `m/m%03d.jpg`.

**I tipi.** Ogni lettore chiama `FUN_0071f8ec(riga, "campo")` e controlla i flag del
valore (a +0x10): `+0x11 bit 2` = `kIntFlag` (int32), `+0x11 bit 4` = `kInt64Flag`,
`+0x12 bit 4` = `kStringFlag`, `== 4` = array con un limite `n < N`. **Ogni campo è
obbligatorio**: se manca, il getter restituisce un valore nullo statico e il controllo
fallisce. Le chiavi in più sono ignorate. Le stringhe sono copiate con `strncpy`, quindi
troncate e non rifiutate; gli array possono essere più corti del limite, anche vuoti.

`recon/tools/master_types.py` estrae i tipi dal decompilato dei 106 lettori. Lo schema
risultante è in **`recon/out/master_types_ww431.json`**, versionato perché descrive
l'interfaccia, non i dati. Contiene 106 tabelle e **1.739 campi, tutti risolti**: 1.300
`int`, 165 `string`, 6 `int64`, 268 array (`int[N]`, `int64[N]`, `string(128)[3]`…).
Nessun booleano né decimale: anche i flag `valid*` sono interi.

Esempi:

```
misc       miscId int, value int
badstatus  badstatusId int, name string(64), iconId int, effect int, target int, power int[2]
world      …, partsId string(128)[3], xPostion int[3], yPostion int[3]
```

Il server controlla ogni `master_data/<nome>.json` contro lo schema e **non serve** le
tabelle che non passano. Con `KHUX_MASTER_SERVE_INVALID=1` le serve lo stesso, per le
prove.

**Verifica sul banco.** Le prove sono due.
- *Positiva*: `misc`, `badstatus` e `world` con una riga valida ciascuna, revisione 2. Il
  client le scarica tutte e tre, mostra «Complete» e salva `m034`, `m065`, `m079`
  (l'indice del file **non** segue l'ordine alfabetico: `world` → `m034`).
- *Negativa*: `misc` con `"value":"0"` (stringa invece di int), revisione 3. Compare
  «**Master data error. (200 ERROR)**» al 33,3%, `badstatus` non viene più chiesto e
  `m065` resta quello vecchio.

Lo schema è quindi confermato in tutte e due le direzioni.

### Oltre il filmato con tabelle minime — 8 ottobre 2026

**Tutte le 106 tabelle vuote (`[]`) passano**: il client le scarica, dice «Complete» e
avvia il filmato. Ma alla fine del filmato va in crash come prima.

**Come trovare l'istruzione ARM di un crash sotto houdini.** Il backtrace del tombstone è
tutto dentro `libhoudini`, ma due cose lo aggirano:
- **i registri x86 contengono l'istruzione ARM in corso**. Qui `rbx = 0xf9400808` è
  `ldr x8, [x0, #0x10]`, quindi `x0` è nullo e il fault è a `0x10`;
- **nelle zone di memoria del tombstone ci sono gli indirizzi ARM**: lo stack di houdini
  conserva PC e indirizzi di ritorno del codice tradotto. Basta filtrare i valori che
  cadono nella mappatura `r--` di `libcocos2dcpp.so` (base letta dalla mappa del
  tombstone) e convertirli: Ghidra = valore − base + `0x100000`. Lo stato dei registri
  ARM (x0, x1, …) sta in una zona `[anon:Mem_0x10002002]` vicino a `rdi`/`r13`.

`tools/ldplayer/tombstone.ps1` fa tutto questo sull'ultimo tombstone del guest.

**Primo crash: `misc` 804.** L'indirizzo trovato era `0x9614dc`, in `FUN_00960ee8`, il
popup di registrazione del nome (`NameRegister_App_ver400.json`):

```
FUN_00efe8b4(&riga, 0x324, 0);      // getter di misc per id: 804
ldr x8, [riga, #0x10]               // dati della riga: riga nulla -> crash
```

Il valore è la **lunghezza massima del nome** (testo `Txt_Limit1`). Il getter riceve
l'id in `w0` e restituisce la riga tramite `x8`; i chiamanti non controllano il null.

**Gli id di `misc` usati dal codice.** `recon/tools/getter_ids.py` traccia le costanti
passate al getter: **98 id** distinti, più 20 chiamate con id calcolato. L'elenco, con i
chiamanti, è in `recon/out/misc_ids_ww431.txt`. È versionato perché è l'interfaccia, non
i valori.

**`server/make-master-stub.js`** genera in `master_data/` tutte le 106 tabelle vuote e
`misc` con i 98 id. Il valore è 0, salvo **804 = 10**, un nostro segnaposto. Sono valori
inventati da noi, non dati originali; lo 0 è un ripiego ragionevole perché su ARM una
divisione per zero dà 0 senza eccezione.

**Risultato sul banco.** Con `misc` popolata il filmato finisce e compare la
registrazione del nome: «Banisher of darkness, gatherer of light — what is your name?»,
«**Max 10 char.**». Il nome si inserisce. Premuto **OK**, nuovo crash, **prima di
qualunque chiamata al server**:
- fault a `0x8`; lo stato ARM contiene la stringa `AvatarEditAnim`;
- gli indirizzi portano a `FUN_011849d4`, che è `cocostudio::Armature::init(nome)`, e a
  `FUN_01197cc8`, la ricerca dei dati dell'armatura per nome. Restituisce null perché
  l'animazione **non è mai stata caricata**;
- dopo il nome si entra nell'**editor dell'avatar** (`SceneAvatarEdit`), che usa
  `cocostudio/publish/AvatarEditAnim.ExportJson`.

**Quel file non c'è nell'APK.** L'indice dei pacchetti (`misc.png`, 2.831 file) contiene
la grafica solo **fino alla registrazione del nome**:
- 152 file `cocostudio/publish/`, tra cui `NameRegister_App_ver400.json`;
- solo **3 animazioni** `.ExportJson`, quelle del titolo e del filmato.

L'editor avatar, e tutto ciò che viene dopo, arriva dalle **risorse scaricate o dagli
OBB**.

**Conclusione: il prossimo blocco non sono i dati master ma le risorse grafiche.** Le
tabelle minime bastano ad arrivare fin dove arriva la grafica dell'APK. Per andare oltre
servono gli OBB (`main.60…obb` e `patch.69…obb`, vedi sotto) o i file del CDN delle
risorse, e in parallelo il protocollo con cui il client li scarica
(`SceneDownload::callDownloadAPI`, `FUN_00eccf04`). I valori veri delle tabelle
(khuxwiki, fase D) torneranno utili quando la grafica ci sarà.

### Il protocollo di download delle risorse — ricavato e provato l'8 ottobre 2026

**Chi lo avvia e quando.** `FUN_00ecd988` decide all'avvio cosa scaricare:
- **dati master** (azione 27) se la revisione master locale differisce da quella del
  server;
- **risorse** (azione 28) se differisce la revisione delle risorse, **ma solo se il
  giocatore non è nuovo e ha finito il tutorial**. Il primo dato è
  `systemLogin.newcomerKhux` (singleton `FUN_007c1dfc` +0x88), il secondo `isFinished`
  dello stato del tutorial (+0xb8).

Un nuovo giocatore quindi non scarica risorse all'avvio: fa il tutorial con la grafica
già installata, cioè APK **e OBB**. È per questo che il primo crash dopo la
registrazione del nome (`AvatarEditAnim`) non si risolve dal server: per un nuovo
giocatore **gli OBB sono indispensabili**.

**Le richieste.** Si trovano cercando le funzioni che scrivono l'id dell'azione in
`[oggetto,#0x28]` prima di accodare con `FUN_007bba54` (script `reqids.py`, nel
blocco note):

| Funzione | Azione | Corpo |
|---|---|---|
| `FUN_007e4e2c` | 27 `GET /system/master/20200423` | `revision`, `commonRevision` |
| `FUN_007e518c` | **28 `GET /system/resource`** | `revision` (risorse locali), `resoMode` |
| `FUN_007e54e4` | 29 `GET /system/resourceEv` | `resourceIds` |
| `FUN_0080e3b4` | 242 `PUT /system/resourcesize/20200423` | `resoMode`, `masterRevision`, … |
| `FUN_00811a98` / `FUN_00811df8` / `FUN_00812100` | 256 / 257 / 258, le stesse per Dark Road | |

**Il giocatore esistente passa da altre due chiamate**, ora nel server:
- `POST /khux/login` (azione 252, `FUN_0077f764`): `{gameLogin: {acquirableLoginBonus: bool}}`;
- `GET /tutorial/status` (69/70, `FUN_0079004c`, letto dalla radice): `phase` (uint),
  `popupFlag` (uint64), `isFinished` (uint), `acquireTutorialJewel` (bool).

**La risposta a `/system/resource`** (ramo 28 → `FUN_00ec7ad0`):

```json
{ "resource": { "mode": 1, "minVersion": 1,
    "versions": [ { "data":  [ {"url": "…", "md5": "…", "size": 123} ],
                    "index": [ {"url": "…", "md5": "…", "size": 45} ] } ] } }
```

- `mode`: 0 = niente, 1 = completo (cancella e riscrive il pacchetto), 2 = incrementale
  (controlla la dimensione attuale e aggiunge in coda);
- la versione i-esima vale `minVersion + i`;
- ogni file (`FUN_00eca04c`) vuole `url` e `md5` stringhe non vuote e `size` > 0;
- `/system/resourceEv` (`FUN_00ec7f80`): array `resourceEv` di
  `{resourceId (uint), versions}`.

**Il download** (`FUN_00ec8304` → `FUN_00eccf04`, in un thread) accetta un file solo
se tre condizioni valgono insieme:
- il corpo è lungo `size`;
- l'MD5 esadecimale del corpo è `md5`;
- il Content-Type contiene `application/octet-stream`.

Lo mette in cache con un nome offuscato: url cifrato con XOR LCG (seme `0x79`, passo
`b*-3-0x3d`), poi Base64 con `-` e `_` e senza `=` (`FUN_01323294`). La cache
(`FUN_00824bfc`) rifà lo stesso controllo.

**L'installazione** (`FUN_00ec85bc`, a coda finita):
- i file `data` vengono concatenati in **`files/r/misc.mp4`** (Dark Road:
  `r/.misc.mp4`; risorse evento: nome proprio + `.mp4`), eventualmente spezzato in
  parti `%s.%d`;
- i file `index` dell'ultima versione vengono concatenati in un temporaneo `misc.wav`,
  poi rinominato **`r/misc.png`**;
- infine `FUN_00ec9b4c` riapre l'indice con il lettore BGAD e pretende, in ordine:
  1. un record di nome **`/`** (l'indice);
  2. un record **`md5`**, che decifrato con la chiave di `FUN_00ec75f4` è lungo 32;
  3. facoltativo, un record **`size`** con la dimensione del pacchetto in decimale,
     uguale alla somma dei `data`.

  Se qualcosa non torna, compare «**Save error. Please check the storage space on your
  device.**».

Le risorse scaricate sono quindi **pacchetti BGAD come quelli dell'APK**, che `files/r/`
sostituisce. L'indice del CDN però aveva in più i record `md5` e `size`.

**Prova sul banco** (`KHUX_NEWCOMER=0`, revisione 7). Il flusso registrato è:

```
/system/status, /login/token, /session, /system/login, /system/coppa,
/khux/login, /tutorial/status, resourcesize ×4, Download →
/system/master + 106 tabelle → GET /system/resource {"revision":0,"resoMode":0}
→ GET /resource/1/data/… → GET /resource/1/index/…
```

- I file arrivano intatti (MD5 confrontati nel guest) e diventano `r/misc.mp4` e
  `r/misc.png`.
- Con byte casuali, e anche con la coppia `misc.mp4`/`misc.png` dell'APK, finisce in
  «Save error», come previsto: all'indice dell'APK mancano i record `md5` e `size`.
- Il protocollo è dunque verificato fino al controllo dell'indice. Per superarlo
  servono gli indici originali del CDN, oppure ricavare la chiave dei record `md5`
  (`FUN_00ec75f4`) e costruirne uno. **Fatto: vedi sotto.**

**La chiave dei record `md5`/`size` la consegna il server.** `FUN_00ec75f4` legge 32
byte all'offset 0x48 del record che `FUN_0077f830` costruisce dal campo **`data`** di
`/system/login`. Il record è 8 + 32 + 32 + 32 byte, e all'offset 0x48 finisce il
**quarto elemento**, decodificato da Base64. Il ramo di login lo salva nel singleton
di sessione a `+0xa8`, a `0x7c6e64`.

Quindi il server originale distribuiva ai client la chiave degli indici delle risorse.
Il nostro la deriva in modo stabile (`sha256("khux-resource-index")`, oppure
`KHUX_RESOURCE_KEY` in esadecimale) e la mette in `data[3]`.

**I nomi dei record** (`FUN_01321888`) seguono l'header da 0x18 byte e sono offuscati
con l'LCG `seed*0x19660d + 0x3c6ef35f`, con seme la dimensione salvata del record:
byte per byte nella versione 1, a parole da 32 bit nella 2. Il record di `misc.png`
dell'APK si chiama proprio **`/`**. `bgad.py` ora ha `record_name()`.

**`recon/tools/resource_index.py`** costruisce l'indice scaricabile: l'indice di
partenza (il record `/`), seguito dai record `md5` (MD5 esadecimale del pacchetto) e
`size` (la sua dimensione). I due record sono cifrati come gli originali: versione 2,
ChaCha8 con la chiave di sessione, nonce in coda. Il contenuto di `md5` non viene
confrontato con nulla (basta che sia lungo 32); `size`, se c'è, deve uguagliare la
somma dei `data`.

**Verificato sul banco.** Ho servito come versione 1 la coppia `misc.mp4` dell'APK +
indice costruito così: **niente più «Save error»**, quindi l'indice è accettato e
l'installazione si completa. Subito dopo il gioco va in crash a `0x12c1ee0`
(`ldr x8, [x0, #0x1e8]`, un metodo di `cocos2d::Node` chiamato su un puntatore
spazzatura), senza altre richieste al server. È il passo successivo al download e non
riguarda più il protocollo: il pacchetto di prova è solo una copia di quello dell'APK,
e la scena che segue vuole risorse e dati utente veri.

**Il crash dopo l'installazione è legato solo a quell'avvio.** Il valore in `x0` era
`0x4268000043680000`, cioè due `float` (232.0, 58.0): una dimensione dove il codice
si aspettava un nodo, quindi con ogni probabilità un nodo già liberato dopo il
rimontaggio dei pacchetti. Al riavvio successivo il client dichiara
`resourceRevision: 1`, quindi l'installazione è stata registrata, e non va più in
crash. Chiedeva però di riscaricare, perché il server dichiarava `versionRes = 7`.

Ora `ret.versionRes`/`versionResLow` valgono **l'ultima versione presente in
`resource_data`** (0 se nessuna). Con le revisioni coerenti il giocatore esistente
prosegue oltre il download:

```
… /khux/login, /tutorial/status, PUT /user/awakening, GET /user  →  «200 ERROR :1»
```

`GET /user` (azione 1, `callUserGetAPI`) vuole i dati completi del giocatore: è il
prossimo capitolo.

**OBB su Internet Archive** (segnalazione dell'utente, verificata l'8 ottobre 2026):
- gli elementi `main.76.com.square_enix.android_googleplay.khuxww` e `khux-5.0.1-ww`
  contengono `main.76…obb` (1.652.397.828 byte, MD5 `2e77be60c0bb61456275f9e7d4768cad`) e
  `patch.87…obb` (533.504.978 byte, MD5 `6fd36c21ed70e60f57d466105a018980`), insieme al
  `base.apk` della 5.0.1;
- sono della **5.0.1**: il client 4.3.1 cerca invece **`main.60.<pacchetto>.obb`** e
  **`patch.69.<pacchetto>.obb`** (costanti `OBB_MAIN_VERSION_CODE = 60` e
  `OBB_PATCH_VERSION_CODE = 69` di `BGObbFileManager`, lette dal `classes.dex`; il
  «72» scritto qui prima era una supposizione sbagliata). Gli MD5 attesi sono quelli di
  `info/obb/main` e `patch` (`610e8ecd…`, `f4dd5699…`);
- `cache.sqex-bridge.jp` contiene solo gli avvisi del gioco, non le risorse.

**Gli OBB sono i dati di Dark Road, non di Union χ.** Verificato l'8 ottobre 2026:
- un OBB è un **pacchetto BGAD** (record concatenati, qui con cifratura 2), come
  `misc.mp4`;
- Java (`BGObbFileManager`) monta i file e passa i percorsi al nativo
  (`Java_…_onMount` → `FUN_0084d7bc` → callback di `SceneTitle::prepareInit` /
  `downloadObb`), che li salva nel singleton `FUN_0084dd74()` (+0x10 main, +0x28 patch);
- `FUN_00ec76ac` costruisce l'elenco dei dati del pacchetto **`aliud`** di Dark Road:
  [OBB main, oppure `aliud.mp4`; OBB patch, oppure `aliud.mp4.1`];
- il montaggio (`FUN_00ec66c8`): lato KHUX `r/misc.png`+`r/misc.mp4` (slot 1) e
  `addnl.png`+`addnl.mp4` (slot 2). Lato Dark l'indice è `aliud.png` dell'APK, oppure
  l'indice Dark scaricato `r/.misc.png`, con i dati [OBB main, OBB patch,
  `r/.misc.mp4`].

Quindi gli OBB **non** contengono la grafica dell'editor avatar di KHUX: quella arriva
dalle risorse scaricate (`r/misc`).

**L'indice degli OBB nell'APK.** `aliud.png` ha la forma degli indici scaricati: record
`/`, `md5` e `size`, cifratura 2, con `md5` = `3340d0fd0d088a470441972b933bbd74` e `size`
= 228.769.672. Lo strato interno del BGI però **non si apre con la chiave della
libreria**. Al montaggio il client passa la **chiave di sessione** (`data[3]` di
`/system/login`), sia per `r/misc.png` sia per `aliud.png`. Se quell'indice è cifrato
con la chiave del server originale, non possiamo leggerlo. Ne segue anche che gli
indici che serviamo noi devono avere lo strato interno cifrato con **la nostra** chiave
di sessione.

### Gli OBB 5.0.1 serviti al client 4.3.1 — 8 ottobre 2026

**File scaricati e verificati** (Internet Archive, MD5 identici a quelli dichiarati;
tutti fuori dal repository, su `D:\Progetto_Restauro_KH_UX\`):

| File | Byte | MD5 |
|---|---|---|
| `obb76\main.76.com.square_enix.android_googleplay.khuxww.obb` | 1.652.397.828 | `2e77be60c0bb61456275f9e7d4768cad` |
| `obb76\patch.87.com.square_enix.android_googleplay.khuxww.obb` | 533.504.978 | `6fd36c21ed70e60f57d466105a018980` |
| `apk501\base.apk` (5.0.1) | 89.615.133 | `eef1d80dc60af7aa7b3e3d1597259060` |

Il primo tentativo di download era corrotto: due `curl` aggiungevano dati allo stesso
file. `tools/segdl.ps1` ora scarica a segmenti paralleli (3 MB/s invece di 0,4) e
verifica l'MD5.

**La chiave dell'indice degli OBB.** L'`aliud.png` della 5.0.1 (28,9 MB) ha i record
`/`, `md5` e `size`; lo strato interno del BGI è cifrato. Essendo la 5.0.1 offline, la
chiave doveva stare nel binario: `recon/tools/bgi_keyhunt.py` prova ogni finestra di 32
byte delle sezioni dati e trova **una sola candidata**, nella `.rodata` del
`libcocos2dcpp.so` 5.0.1 all'offset `0xe6ee54`. Il valore non si versiona: è dato di
Square Enix, si rilegge da lì. Con quella chiave (`recon/tools/bgi_check.py`):
- **80.497 record e 321.987 nomi**;
- tutti gli 80.497 offset puntano a header BGAD nella concatenazione main 76 + patch 87;
- il record `size` vale 2.185.902.806, esattamente main + patch;
- cartelle `lwf` (289.358), `map`, `text`, `img`, `audio`, `cocostudio`, …, e c'è
  **`cocostudio/publish/AvatarEditAnim.ExportJson`**.

Gli OBB 5.0.1 contengono quindi la grafica completa, compresa quella di Union χ.

**Come li serviamo al client 4.3.1.** Il client monta le risorse scaricate
(`r/misc.png` + `r/misc.mp4`) aprendo l'indice con la **chiave di sessione**, che decide
il server. Quindi:
1. `KHUX_RESOURCE_KEY` = la chiave della 5.0.1, che il server mette in `data[3]` di
   `/system/login`;
2. la versione di risorse 2 contiene come `data` i due OBB concatenati e spezzati in 33
   pezzi da 64 MB (`recon/tools/resource_split.py`). I pezzi servono perché il
   downloader tiene in memoria ogni file intero;
3. come `index` c'è l'`aliud.png` della 5.0.1, così com'è;
4. il server ora calcola l'MD5 a blocchi, una volta sola (all'avvio), e serve i file in
   streaming. `KHUX_RESOURCE_DIR` punta alla cartella su `D:`.

**Sul banco**, da giocatore esistente:
- 33 pezzi + indice scaricati in **1,3 minuti**;
- installati come `r/misc.mp4` (2 GB) + `r/misc.mp4.1` (38 MB, il client spezza oltre
  i 2 GB) + `r/misc.png`;
- al riavvio l'indice si monta con la chiave 5.0.1 senza errori e il client ripercorre
  la catena di avvio fino a `/stage/start`.

**Nuovo giocatore** con le risorse installate:
- filmato → nome → OK → il client **entra nell'editor avatar** (`FUN_00d6a4f4`) e carica
  dal pacchetto `cocostudio/publish/AvatarEditScene_ver131.json`. Prima andava in crash
  per `AvatarEditAnim` mancante;
- nuovo crash più avanti, dentro la scena: puntatore nullo, con `0xd6a930`
  (`getChildByName("Book")` sul layout) sullo stack e lo zlib di `bg::FileManager`
  attivo.

**Causa accertata (8 ottobre 2026, notte): il layout non esiste negli OBB 5.0.1.**
- Il codice (`FUN_00d6a4f4`) carica `cocostudio/publish/AvatarEditScene_ver131.json` con
  `FUN_006e0eb8` e ne salva il nodo in `this[0x66]` (`+0x330`); poi chiama
  `getChildByName` (`FUN_006e0e2c`) su quel nodo per `Book`, `CenterUI`, `LeftUI`,
  `CenterUI_Left`, `CenterUI_Right`, `Switch`, `Decision` (e `Tab_Accessorie` dentro
  `CenterUI_Left`). Il tombstone ha come ritorno `0xd6a930`, subito dopo la prima di
  queste chiamate: il nodo radice è nullo.
- L'indice 5.0.1 (80.497 record) **non ha** `AvatarEditScene_ver131.json`; ha
  `Offline_AvatarEditScene.json`, una scena diversa (figli `CenterUI_Left`,
  `CenterUI_Right`, `KB_On`, `Switch`, `MyCoordinate`, `Decision`; niente `Book`,
  `CenterUI`, `LeftUI`). Le tabelle master non c'entrano.

**Il problema è generale, non dell'editor.** `recon/tools/asset_coverage.py` confronta i
percorsi citati dal binario 4.3.1 con i nomi dell'indice OBB 5.0.1 più quelli di
`misc.mp4` dell'APK 4.3.1:

| Cartella | Citati dal 4.3.1 | Mancanti |
|---|---|---|
| `cocostudio` | 601 | 441 |
| `img` | 449 | 165 |
| `lwf` | 229 | 156 |
| `json` | 24 | 0 |

Solo 13 dei 441 layout hanno un equivalente rinominato nella 5.0.1 (`Offline_…` o un
altro `_verNNN`, es. `MyPageScene_ver340` → `Offline_MyPageScene`). Mancano scene centrali
come `ChatScene`, `PresentBOXScene`, `MedalEvoScene_ver320`, `PartyTop_*`. La 5.0.1
offline ha tolto le funzioni online, e con esse i loro asset (il suo binario cita solo 212
layout). Gli asset online della 4.x arrivavano dal CDN come risorse scaricate (`r/misc`);
`main.60`/`patch.69` sono i dati di Dark Road. Una copia del CDN non risulta pubblica
(ricerca dell'8 ottobre 2026).

**Ritrovati: il pacchetto `addnl` dell'IPA iOS 4.3.1** (8 ottobre 2026, notte). Ricerca
tra le copie su Internet Archive (`khux-ww-IPAs`, `khux-jp-IPAs`, `khux-5.0.1*`,
`api.sp.kingdomhearts.com`) e nella Wayback (nessun file del CDN archiviato; gli host
noti sono `api`, `api-s`, `help` e `cache.sp.kingdomhearts.com`):
- le IPA iOS dalla 3.2.0 alla 4.3.x contengono **`addnl.mp4` + `addnl.png`**, che l'APK
  Android non ha; il client li monta come **secondo slot KHUX** con percorso relativo
  (`FUN_01322c08(2,"addnl.png","addnl.mp4",…)` in `FUN_00ec66c8`, se `FUN_0085dbdc()`);
- `KHUx 4.3.1.ipa` (WW): `addnl.mp4` 132.056.004 byte, `addnl.png` 1.660.489; l'indice si
  apre con **la stessa chiave 5.0.1**: 10.145 record, 19.806 nomi, 1.309 `cocostudio`, e
  c'è **`AvatarEditScene_ver131.json`** (con `Book`, `CenterUI`, …);
- con `addnl` i layout mancanti scendono da 441 a **285**; i 285 restanti sono forse codice
  morto, o stavano solo sul CDN;
- `KHUx 4.4.0.ipa` è già di transizione all'offline: `aliud.mp4` = `main.76` e niente
  `addnl`;
- gli OBB 5.0.1 non nascondono altro: 322.271 record, 80.497 indicizzati, gli altri sono
  record da 4 byte (più 7 LWF/BTF).

`recon/tools/remote_zip.py` legge l'elenco di uno zip remoto (IPA) ed estrae un file
con richieste Range, senza scaricare tutto. Su `D:\Progetto_Restauro_KH_UX\ipa431\`
stanno `addnl.mp4` e `addnl.png`.

**Risorse versione 3** = OBB 5.0.1 + `addnl` in un solo pacchetto:
`recon/tools/resource_merge.py` concatena i dati e ricostruisce l'indice (BGI v3,
strato interno con la chiave di sessione, record `/` con cifratura 2, poi `md5` e
`size`); a parità di nome vince il primo pacchetto (qui il 5.0.1). In
`resource_data\3\data` ci sono i 33 pezzi della versione 2 (hard link) più 2 pezzi di
`addnl`; la versione 2 è stata spostata in `resource_data\v2_obb_only`.
`KHUX_RESOURCE_SIZE` = 2.317.958.810.

**Provato sul banco** (8 ottobre 2026, notte):
- giocatore esistente: download della versione 3 (35 pezzi + indice, ~70 s), installata
  come `misc.mp4` (2 GiB) + `misc.mp4.1` (170.475.162) + `misc.png` (29.385.856). Subito
  dopo, il solito crash post-installazione a `0x12c1ee0`; al riavvio l'indice unito si
  monta e la catena arriva a `POST /stage/start`, come prima;
- **nuovo giocatore: l'editor avatar si apre** («How do you see yourself?»), con
  l'avatar disegnato, le schede (Sets, Clothes, Accessories, …), COST 1/5, Perks e OK.
  La lista dice «There are no avatar parts»: è la tabella master `avatarParts` vuota,
  cioè lavoro della fase D, non grafica mancante.

Strumenti: `recon/tools/bgad_extract.py` estrae un file dagli OBB dato l'offset
dell'elenco `IDX_DUMP` di `bgi_check.py` (con `IDX_KEY` = chiave 5.0.1).

Lato Dark Road gli OBB andrebbero invece montati come `main.60`/`patch.69` sotto
`/sdcard/Android/obb/<pacchetto>/`, ma l'indice `aliud.png` della 4.3.1 è cifrato con la
chiave del server originale. La via servita qui (risorse KHUX) aggira il problema.

### Le tabelle master della 5.0.1 offline e l'editor avatar — 8 ottobre 2026, notte

**Dove sono.** Né gli OBB né `misc` della 5.0.1 hanno tabelle master: stanno
nell'**`extra.mp4` dell'APK 5.0.1**. Il suo indice `extra.png` e i suoi record sono
cifrati con la **chiave 5.0.1** (la stessa dell'indice OBB, `.rodata` `0xe6ee54`),
non con quella dei pacchetti della 4.3.1. L'ha trovata `recon/tools/pack_keyhunt.py`,
che cerca nella libreria la chiave che fa decifrare record compressi in header zlib
validi. Contenuto: **55 tabelle in JSON** (array di righe), tra cui `avatarParts`
(2.824 righe), `initItem`, `misc`, `tutorialMisc`, `stage`, `keyblade`, `skill`,
`enemy`, `buff`, … più tutte le `dark*`. Estratte in
`D:\Progetto_Restauro_KH_UX\apk501\extra_files\` (dati di Square Enix, fuori dal repo).
`avatarParts` ha **esattamente i campi dello schema 4.3.1**.

**Come si importano.** `node server/import-master.js <cartella> <tabella> …` copia le
tabelle nominate in `server/master_data/` dopo aver controllato che ogni riga abbia i
campi dello schema; i tipi li verifica il server quando le serve. Dopo un'importazione
va alzata `KHUX_REVISION`, perché il client riscarichi i master.

**L'editor avatar.**
- Con `avatarParts` importata la lista resta vuota: l'editor mostra le parti
  **possedute**, non tutto il catalogo. Il nuovo giocatore non chiama API prima
  dell'editor: le parti iniziali vengono da **`initItem`**.
- In `initItem` (197 righe) la **categoria 100** ha 110 righe i cui `itemId` sono tutti
  `avatarPartsId`. Le altre categorie (3, 7, 13, 24, 25, 31, 101) rimandano a tabelle
  ancora vuote (medaglie, keyblade, …).
- Importate `avatarParts` intera e `initItem` **con le sole righe di categoria 100**
  (revisione master 9): **l'editor funziona**. Sets (Sporty Blue/Yellow, Cool
  Black/Red), Hairstyles (Short, Faux Hawk, Layered), le icone dagli OBB; scegliendo
  una parte l'avatar cambia e la parte risulta «In use».
**`initItem` completa** (197 righe, revisione master 10). Categorie e `itemId`:

| Categoria | Righe | `itemId` | Note |
|---|---|---|---|
| 3 | 3 | 11021, 13021, 13031 | `equipType` 3, `equipNo` 1-3: probabilmente le medaglie del deck iniziale |
| 7 | 8 | 1001-1008 | |
| 13 | 1 | 1000 | `equipType` 3: la keyblade iniziale (`keyblade` 1000 = Starlight) |
| 24 | 22 | 1-22 | |
| 25 | 11 | 2100001, 2500002, … | `param` 2 |
| 31 | 20 | 1-20 | |
| 100 | 110 | `avatarPartsId` | parti avatar iniziali (verificato) |
| 101 | 22 | 303001, 304001, … | |

Il significato delle categorie non è ancora ricavato dal codice: i campi della riga sono
in memoria offuscata (`FUN_006dfe9c` scrive, `FUN_006e02d4` legge, comuni a tutte le
tabelle), e non c'è uno `switch` evidente sui valori. Con la tabella completa, e le
tabelle a cui rimanda ancora vuote, il client **non va in crash**. Sul banco:
- editor avatar → OK → «Begin with this avatar?» → OK;
- scena della vetrata con le cinque Union, popup «Unions», «Select a Union to join» →
  Unicornis → «Join Unicornis?» → OK, poi scena animata;
- quindi **`POST /user/create`** (azione 253), che il server non gestisce ancora →
  «200 ERROR :253». Il corpo:

```json
{"birthday":"1995-01-01 00:00:00","name":"Kxos","unionId":3,
 "updateAvatarData":{"gender":1,"hairPartsId":40001,"hairColorPartsId":50001,
   "facePartsId":20001,"bodyPartsId":1,"skinPartsId":30001,"accessoriesPartsIds":[109001]}}
```

**`POST /user/create` risolta.** Ramo 253 di `FUN_007c3204`: `FUN_0077f650` con
argomento 1 (legge solo `systemLogin.newcomerKhux`, bool, e lo copia nel flag
«nuovo giocatore» della sessione, `+0x88`) e `FUN_0077f764`
(`gameLogin.acquirableLoginBonus`, bool), entrambi obbligatori. Il server
(`respondUserCreate`) risponde `newcomerKhux: false` e ricorda in memoria nome, Union e
avatar, che `GET /user` ora restituisce.

Sul banco (oggi `tools/ldplayer/bench_flow.ps1`) il nuovo
giocatore, dopo `/user/create`, percorre la stessa catena del giocatore esistente:

```
POST /user/create, GET /user, /user/start, /user/chat, /party, /user/stone, /user/shop,
/user/option, /tutorial/status, /user/mission, PUT /passive/list, PUT /emblem/list,
/user/sphere, /user/medal, /user/skill, /user/material, /user/keyblade, /user/deck,
/keyblade/subslot, /user/avatar/all, /user/avatar/parts, /user/title, /user/link,
/user/support, PUT /playtime/bp, PUT /tutorial/status {"phase":50}, GET /stage/160310,
POST /stage/start {"stageId":0,"supportUserId":0,"userKeybladeId":4703244876357301000}
```

e si fermava a `POST /stage/start` (azione 113): `stageId` 0 e un `userKeybladeId`
senza senso, perché storie, keyblade e deck erano vuoti.

### La prima battaglia — 8 ottobre 2026, notte

**Tabelle master importate** dalla 5.0.1 (`server/import-master.js`, revisione 11),
tutte con i campi dello schema 4.3.1: `misc` (178 righe, contiene tutti i 98 id letti dal
codice; 804 = 8), `stage` (10: gli stage del tutorial, Prologue 1010, Combat 101/102,
Dwarf Woodlands, The Dark Forest…), `world`, `stageDrama`, `enemy` (12), `enemyAttack`,
`keyblade` (64, Starlight = 1000), `skill`, `buff`, `burst`, `battleMisc`, `badstatus`,
`tutorialMisc`, `medalMisc`, `material`, `title`, `theater`, `raidEnemy`,
`raidEnemyAttack`, oltre ad `avatarParts` e `initItem`.

Delle 106 tabelle dello schema, 49 esistono nella 5.0.1 con gli stessi campi; tre
`dark*` hanno un campo in più; **54 mancano**, tra cui `medal`, `player`, `passive`,
`sphere`, `shop`, `mission`, `loginBonus`, `pvp`, `raidSetting`. Per queste servirà
khuxwiki.

**Risposte nuove nel server**:
- `GET /stage/160310` (azione 108, `FUN_0079f1fc`): `stories[]` (elemento
  `FUN_0079e794`: `stageId`, `useAp`, `score` uint64, `playStatus`, `clearMissionIds`
  int[] ≤ 3), `newStageId`, `luxRank`, `openRankingId`. Con la storia 1010 il client
  avvia lo stage 1010: **lo stage di `startStory` viene da qui**;
- `GET /user/keyblade` (azione 11, elemento `FUN_0078c904`): una Starlight,
  `userKeybladeId` 1, `userDeckId` 1, `deckMedals` vuoto (≤ 5 uint64). **Da qui viene
  `userKeybladeId`**;
- `GET /user/deck` (azione 12, elemento `FUN_00792a8c`): deck 1 con la keyblade 1;
- `POST /stage/start` (azione 113): `userData.userPoint` (`FUN_0078b230`, come in
  `GET /user`), `startStageData` (`FUN_007a1428`: `stageId`, `supportUserId` uint64,
  `userKeybladeId` uint64, `clearMissionIds`, `stageSkip`, `eventId`, `highScore`
  uint64), `userRandomEnemies[]` (`FUN_007a11c8`: `uniqueEnemyId`, `dropItemTypeIds`
  int[] ≤ 4, `stealType`), `userEnemyDropItems[]`, `userTreasures[]` (`FUN_007a1308`),
  `campaigns[]`, `luxMagnifications.{campaign,party}`, `supportUsers[]`
  (`FUN_0078aa3c`, elemento `FUN_0078a5c4`).

Altri elementi ricavati: medaglia dell'utente (`FUN_0078d608`: `userMedalId` uint64,
`medalId`, `number`, `level`, `exp`, `attackUpperNumber`, `defenseUpperNumber`,
`burstUpperNumber`, `lock`, `upperCost`, `guiltFactor`, `userSkills` ≤ 2,
`userShuffleSkills`, `getDatetime`).

**Sul banco** il nuovo giocatore, dopo `/user/create` e la catena di avvio, manda
`POST /stage/start {"stageId":1010,"userKeybladeId":1}` e **la battaglia del Prologue
parte**: l'avatar del giocatore contro uno Shadow LV 1 bersagliato, con HUD (SPECIAL,
HP, contatori in alto, OPTIONS) e il pulsante «ENEMY TURN». L'HP del giocatore è **0**
(`userPoint.hp`/`maxHp` a 0) e il deck è senza medaglie.

### HP del giocatore e medaglie iniziali — 8 ottobre 2026, notte

**HP.** Prova con `userPoint` `baseHp`/`hp`/`maxHp` = 111/222/333: la battaglia mostra
**333** in rosso, con la barra quasi vuota. Il client mostra `maxHp` e colora in rapporto
all'HP corrente: per un giocatore integro i tre valori coincidono. Il valore al livello
1 non si trova né nella 5.0.1 né su khuxwiki (l'HP cresce con i nodi delle Avatar
Board, +20 ciascuno): **1000 è un nostro segnaposto** (`KHUX_PLAYER_HP`), nella
tabella `player` generata da `server/make-game-tables.js` (99 livelli; anche AP, costo
ed EXP sono segnaposto). Riferimento di scala: lo Shadow LV 1 del Prologue ha attacco
200 e HP 1550 (`enemy` 5.0.1).

**Le medaglie del tutorial esistono nei pacchetti.** In `addnl` (IPA 4.3.1) ci sono le
immagini di **21 medaglie**, e solo quelle: `img/medal/Medal_L_<id>.png`, `Medal_S_…`,
`mixture/medal/compose/<id>/…`. Sono **texture BTF** dentro record con cifratura 3:
- i record con cifratura 3 dei pacchetti montati come risorse si aprono con la chiave
  di sessione (per noi la 5.0.1): `BGAD_KEY=<hex> recon/tools/bgad_extract.py …`;
- `recon/tools/btf.py` converte le BTF in PNG: `\x89BTF`, tela (`+0x16`, es.
  640×640), ritaglio (`+0x1a` x, y, `+0x1e` w, h), dimensione compressa (`+0x22`),
  poi zlib di w×h×4 byte RGBA.

L'id della medaglia è leggibile: prima cifra il rango (1 bronzo, 3 argento, 9
speciale), seconda l'attributo (1 Power, 2 Speed, 3 Magic). Riconosciute dalle
immagini, confrontate con il set 1 di khuxwiki:

| Id | Medaglia | Id | Medaglia | Id | Medaglia |
|---|---|---|---|---|---|
| 11012 | Wakka | 12011 | Tidus | 13011 | Olette A |
| 11021 | **Goofy A** | 12022 | KH Sora | 13021 | **Donald A** |
| 11031 | Paine | 12031 | Rikku | 13031 | **Yuna** |
| 11041 | Pence A | 12041 | Hayner A | 13032 | Yuna (variante) |
| 11052 | Hercules | 12051 | Stitch | 13041 | Selphie |
| 33023 | KH II Sora (argento) | 33043 | KH II King Mickey (argento) | 13051 | Jiminy Cricket |
| 90011 | Moogle | 90031 | Louie | 90041 | Dewey |

(più `Medal_S_42046`.) Le tre in grassetto sono il **deck iniziale** di `initItem`
(categoria 3: slot 1 Donald A 13021, slot 2 Goofy A 11021, slot 3 Yuna 13031, livello
1; categoria 13: keyblade 1000).

**La tabella `medal`** (63 campi) la genera `server/make-game-tables.js` da un file di
valori fuori dal repository (`D:\Progetto_Restauro_KH_UX\wiki\medals.json`, dati
khuxwiki del rango 1★):

| Medaglia | No. | STR min/max | DEF min/max | Attacco speciale |
|---|---|---|---|---|
| Goofy A | 7 | 1299 / 1901 | 1228 / 1797 | Thunder Raid, tutti, 2 colpi, 2 barre, ×1.54 |
| Donald A | 67 | 1268 / 1855 | 1279 / 1872 | Thundaga, tutti, 2 colpi, 2 barre, ×1.54 |
| Yuna | 73 | 1292 / 1890 | 1240 / 1814 | Firaga, tutti, 2 colpi, 3 barre, ×1.75 |

Gli attacchi speciali sono **righe della tabella `burst` della 5.0.1** (10091 Thunder
Raid, 10141 Thundaga, 10121 Firaga): la 5.0.1 ha conservato proprio quelli del tutorial,
e il nome coincide con la wiki. Valori nostri: `attribute` 1/2/3 come nell'id,
`darklight` 1 = Upright, `rare` 1, costo 1, livello massimo 10, `imageId` = `medalId`
(il client compone `img/medal/Medal_L_%d.png`); `type`, `growthType`, `expType` = 1, non
ricavati.

**Il server** ricava l'inventario da `initItem`: `GET /user/medal` (azione 15) con le tre
medaglie (`userMedalId` 1–3), keyblade e deck con `deckMedals` [1, 2, 3].

**Sul banco** (revisione master 12, `bench_flow.ps1` in 48 s): battaglia del Prologue
con **HP 1000** in verde, **Donald** (Magic) e **Goofy** (Power) in mano con il costo
dello speciale (2), contatore 3/3. Un tocco sulla medaglia sposta l'avatar ma non
completa il turno: il gesto di gioco va ancora capito. Nessun crash.

### Il Prologue giocato: combattimento, forzieri, HP — 8 ottobre 2026, notte

**Come si gioca** (verificato sul banco; `tools/ldplayer/bench_prologue.ps1` ripete la
sequenza fino al forziere):
- sulla mappa si tocca il terreno per muoversi e il nemico per attaccarlo; il contatto
  apre la battaglia a turni («PLAYER TURN» / «ENEMY TURN»);
- nel Prologue i nemici mostrano «TAP!»: l'attacco è il tocco sul nemico;
- lo **speciale** di una medaglia si usa con uno **swipe in diagonale** sulla medaglia,
  quando la barra SPECIAL basta per il suo costo (indicazione dell'utente; `Swipe` in
  `bench_lib.ps1`);
- colpendo e sconfiggendo i nemici cadono sfere arancioni (CP, barra speciale) e verdi
  (HP): le quantità sono nella tabella `enemy` 5.0.1 (Shadow: `attackCp` 50,
  `suppressCp` 100, `attackHp` 30, `suppressHp` 144). Sul banco l'HP risale (787 → 870
  dopo il gruppo di 3 Shadow);
- percorso del Prologue: Shadow sulla scalinata, gruppo di 3 Shadow nella piazza della
  fontana, forziere arancione sulla scalinata alta, poi il bersaglio: **Mega-Shadow** con
  9 Shadow.

**Morte e continuazione.** Con 1000 HP lo sciame del boss uccide il giocatore in un turno
(circa 110 di danno per Shadow); `userPoint.attack/defense` e `totalAttack/totalDefense`
della keyblade (ora la somma del deck) **non** cambiano il danno subito. Il client
chiede `POST /stage/continue` (azione 115). Nel tutorial non si poteva morire
(indicazione dell'utente).

**La barra HP.** `FUN_00b157c8` dimensiona l'arco dell'HP attorno al ritratto in base
all'HP massimo: oltre 3000 l'arco si allunga e carica `img/ui/PlayerStatusIndicator/
Avatar_Circle_01/06.png` e `Avatar_Side_01..04.png`, che **non sono in nessun
pacchetto** (OBB, addnl, misc): crash per puntatore nullo (provato con 4000 e 3330). Con
**3000** l'arco copre la metà inferiore del cerchio e appare pieno; con 1000 ne copriva
un quarto. L'HP di partenza è ora 3000 (segnaposto, `KHUX_PLAYER_HP`).

**I forzieri** (non ancora funzionanti):
- `StageUtil::getTreasurePrizes` (`FUN_00e7e980`), chiamata alla **creazione** del
  forziere (`FUN_00b09a38`, struttura: +8 tipo/grafica, +0xc id del reward, +0x10 id
  univoco, +0x14 già aperto), cerca in `userTreasures` (da `/stage/start`) l'elemento
  con lo stesso `uniqueTreasureId`, legge la riga di **`reward`** indicata dalla mappa
  (tabella non presente nella 5.0.1; campi `validReward`, `display[4]`, `type[4]`,
  `id[4]`, …, `num[4]`, `odds[4]`) e tiene i premi il cui tipo compare, nella stessa
  posizione, in `dropItemTypeIds` (tipi 2–34);
- tipi di premio (`FUN_00b07090`): **4 monete, 8 CP (Attack Prize, barra speciale),
  9 HP**, 2/3/5/6/7/10 oggetti; le immagini `img/prizes/Prize_{Money,Hp,Cp,Treasure,
  Lux}NN.png`;
- i punti della mappa sono in `stage/mappoi_stg<id>[_NN].bin` dell'addnl (formato `MAP`:
  aree da 0x44 byte, nemici da 0x20 byte, poi gli oggetti; parser `FUN_00e5f6e8`); nel
  Prologue il forziere è il record `1, 948, 1778, 81, 14, 18` dopo i 10 nemici del boss;
- provati come id univoco e come reward 1, 14, 17, 18 e 81 in tutte le combinazioni, con
  premio CP: il forziere resta vuoto. Da capire dove il parser della mappa mette quei
  numeri nella struttura del forziere.

**Risposte nuove nel server** (`server.js`): `/stage/continue` e `/stage/retire`
(`userKeyblades` e `userData.stageResumption`), `/stage/clear` (azione 116:
`userData.{userPoint,userDetail,stageResumption}`, `stageRewardUserMedalIds[]`,
`highScoreReward[]`, `firstClearFlag`, `stageOpenNum`, `clearMissionIds[]`,
`userPvpRanking {rank,class,point}`, `status`, `userMaterials[]`, `getLux`,
`guiltBurst*UserMedalIds[]`) — **non ancora provate sul banco**.

### Il Prologue completato — 8 ottobre 2026, notte

**Forziere: funziona.** L'id univoco è l'ultimo numero del record della mappa (**18**)
e la riga di `reward` è il terzo (**81**): `FUN_00e60f28` legge la sezione `+0x28` di
`mappoi_stg01010_01.bin` (record da 0x14 byte: x, y, reward, tipo, id). Le prove
precedenti fallivano perché la barra non si muoveva in modo visibile con 100–300 CP:
con il tipo 9 (HP, 500) l'HP passa da 2781 a 3000, con il tipo 8 e 10.000 CP lo SPECIAL
sale da 2 a 3. **10.000 CP è un nostro valore** (circa una tacca intera); quello vero non
è sulla wiki. Il client manda poi in `/stage/clear` `getTreasures: [18]`.

**Speciale: swipe rapido in diagonale** sulla medaglia, da (130,790) a (400,520) in
150 ms: il Thundaga di Donald colpisce tutto lo sciame del boss (SPECIAL 3 → 1). Gesti
più lenti (300–400 ms) o verticali non funzionano. Con lo swipe il boss cade in 7 s;
senza, a soli tocchi, il giocatore muore una volta e il client continua con
`POST /stage/continue` (gestita). Nel tutorial la morte mostra un avviso (indicazione
dell'utente), non ancora catturato.

**`POST /stage/clear` (azione 116) completa.** Oltre ai campi già elencati, per uno
stage normale il parser `FUN_007817a0` pretende, in quest'ordine: `pet.userPetParts[]`
(`FUN_00794094`), `emblemIds[]` (`FUN_00797a84`), poi l'inventario aggiornato:
`userMaterials[]`, `userMedals[]`, `userSkills[]`, `userTitles[]`, `userKeyblades[]`,
`userDecks[]`, `userAvatarParts[]`, `subslotMaxNum`/`userKeybladeSubslots[]`
(`FUN_00798a64` modo 1), infine `getLux`. Il corpo della richiesta riporta
l'esito: `getPoint {exp 17, money 55, lux 77}`, `getMaterials [{materialId 13,
number 2}]`, `getEnemyDropItems`, `getTreasures`, `clearMissionIds [1,2]`,
`enemyDeadNumber 14`, `maximumDamage`, `burst`, `conditions`.

**Dopo la fine stage**: «QUEST COMPLETE!», **RESULTS** (Prologue, i tre obiettivi),
**CONGRATULATIONS!** (50 Munny, Spring Water ×2), poi:
- `GET /user/point` (azione 2): solo `userData.userPoint` — gestita;
- `GET /user/stone`, `PUT /tutorial/status {"phase":995}`, `POST /system/push/regist`;
- la barra dell'EXP (`FUN_006ea1b4`) legge le righe `lv` e `lv+1` della tabella
  `player` (indice 0x5b): senza la riga del **livello 0** va in crash. Ora
  `make-game-tables.js` genera i livelli 0–99 (revisione master 22);
- `GET /campaign` (azione 143): `campaigns`, array di int — gestita;
- `GET /raid/list/181221` (azione 240, `FUN_007aadc0`): `selfRaid` (`FUN_0079c07c`:
  `raidStatus`, `raid` {`raidId` uint64, `level`, `useAp`, `timeLeft`, `feverFlag`,
  `feverTime`, `stageId`, `parts[]`}) e `raids[]` — gestita (nessun raid);
- `GET /party`, poi `GET /party/member/list` (azione 86): **non ancora gestita**.

`tools/ldplayer/bench_prologue.ps1 -Out <log>` gioca ora tutto il Prologue (forziere,
swipe, boss) e i risultati, in circa 1 minuto dopo `bench_flow.ps1`.

Prossimo: `/party/member/list` e le schermate che seguono il Prologue.

### Dopo il Prologue: obiettivi, sacchetti e la storia che riparte — 8 ottobre 2026, sera

**Obiettivi in RESULTS.** Il client spunta (medaglia Mickey gialla) gli id che il
server rimanda in `clearMissionIds` di `/stage/clear`: con `[]` nessuna spunta, anche
a missioni compiute. Il corpo della richiesta riporta le missioni compiute
(`clearMissionIds: [1,2]`), **tranne quelle sui Lux** (`submissionRequire` 29, «Collect
%d or more Lux», soglia in `submissionNum`): le valuta il server su `getPoint.lux` e
restituisce i Lux in `getLux` (la barra Lux di RESULTS, prima ferma a 0). Ora tutte e
tre si spuntano e CONGRATULATIONS mostra i premi «Objective Complete!» (Avatar Coin,
Mythril Shard: `submissionRewardType` 14 e 5). **Il corpo di `/stage/clear` non
contiene `stageId`**: lo stage è quello di `/stage/start` (prima `firstClearFlag` e
`lastClearStageId` non venivano mai impostati). Con `firstClearFlag` 1 il percorso dopo
lo stage cambia (Sphere Board: `/user/sphere/reset`, `/user/sphere/check`).

**I contatori in alto nell'HUD** (oro, argento, gemma, stella). L'**argento** conta i
**sacchetti** lasciati dai nemici: un sacchetto è un drop di un nemico, raccolto in
battaglia senza sapere cosa contiene; in CONGRATULATIONS i sacchetti si aprono da soli,
uno alla volta, e rivelano l'oggetto (indicazione dell'utente, confermata sul banco).
Servono `userEnemyDropItems[]` in `/stage/start` (`FUN_007a11c8`: `uniqueEnemyId`
= ultimo numero del record del nemico nella mappa, `dropItemTypeIds` [5], `stealType`)
e una riga di `reward` per il nemico: `FUN_00e7e6e8` la cerca con `FUN_00f04580`
(tabella interna 7 = `reward`, la stessa dei forzieri) e **va in crash** (fault 0x10)
se manca. Funziona con le righe 1 e 80001/88001/81020 (= `enemyId`); quale delle due
sia letta non è accertato. Tipo 5 = materiale (13 Spring Water). L'**oro** resta a 0:
il forziere del Prologue dà CP (tipo 8, nostro); con tipo 5 il forziere si apre vuoto,
quindi i forzieri vogliono un altro tipo di oggetto (2/3/6/7/10 da provare).

**API nuove** (schemi in `api_responses_ww431.json`, tutte provate sul banco):

| Azione | Percorso | Risposta |
|---|---|---|
| 86 | `GET /party/member/list` | `userParty` (`FUN_00779574`) + `partyUserList[]` (`FUN_00785400`; con `getDetail` letta due volte, deve essere un array) |
| 62 | `POST /user/sphere/reset` | `userData.userPoint` |
| 61 | `POST /user/sphere/check/170119` | `userSphere` (`FUN_00777978` modo 1); con `checkTypes` contenente 3, `closeEventSphereBoardIds[]` |
| 120 | `GET /raid/reward/151101` | `userData.userPoint`, `raidRewards[]`, `guiltBurst*UserMedalIds[]` |
| 241 | `GET /user/notice` | `raidNotice.{isSelfRaid,isOthersRaid}` |
| 105 | `GET /party/lux_up_time` | `luxUp.{magnification,available,restrictionKind}` |
| 169 | `GET /stage/achievements` | `stageAchievement` (numeratori/denominatori, `pvpRanking.userPvpRanking`) |
| 250 | `GET /stage/pickup` | `pisckupStages[]` (sic) |

Dopo `/stage/pickup` e `/stage/160310` **la storia riparte**: dialogo con Chirithy
(«Pretty scary stuff, huh?…»). `bench_prologue.ps1` salva ora una schermata per ogni
passo dei risultati (`<Shot>_r1..r6`).

### La schermata principale (home) — 8 ottobre 2026, sera

**Il livello è il rango Lux.** La barra di RESULTS (`FUN_009aaad0` → `FUN_006ea1b4`)
usa `userDetail.luxRank` come livello e `userPoint.lux` come valore, contro le soglie
cumulative `needExp` delle righe `lv` e `lv+1` della tabella `player`. Con `luxRank` 0
la soglia del livello 1 è 0: «LEVEL UP!» e barra piena a ogni stage, anche con 0 Lux.
Ora il server parte da rango 1, somma i Lux di ogni `/stage/clear` (`player.lux`) e
calcola rango e livello dalla tabella (99 Lux: «Lv 1, 1 to next level»).

**Regola del banco (dell'utente): i dialoghi con SKIP si saltano sempre.**
`SkipDialog` in `bench_lib.ps1` (firma: SKIP chiaro a (155,50), riquadro (247,190,99) a
(500,1000)). I risultati si scorrono subito con OK (960,965): dal lancio alla home in
circa 2 minuti e mezzo.

**Schemi in blocco.** `recon/tools/batch_schema.py` (passi `plan` e `merge`) ricava dal
dispatcher i parser di tutte le azioni senza schema, li decompila in una sola sessione
Ghidra (con i sotto-parser) e scrive `recon/out/api_responses_auto_ww431.json`: 168
rotte con campi. Il server le usa solo dove manca una voce verificata in
`api_responses_ww431.json`; le voci possono avere `values` (valori diversi dal default).
**Attenzione agli id a 0**: una risposta generata con `medalId: 0` (es. `/user/support`)
fa cercare al client una riga master inesistente e lo manda in crash; quelle rotte vanno
gestite a mano.

**Altre API e dati** (verificati sul banco): 185 `/user/theater/available`
(`availableTheaterIds[]`), 81 `PUT /party/notice`, 59 `/mypage` (`backgroundId` 150911),
177 `/pet/coordinate/members`, `/user/support` a mano (prima medaglia del deck). La tabella
**`mypageBackground`** (assente nella 5.0.1) la genera `make-game-tables.js`: una riga per
ogni sfondo con grafica (`lwf/home/{2..6,99,150911}`); senza la riga del `backgroundId`
crash in `FUN_00bb400c`.

**Si arriva alla home**: Lv 1, «LV Up in 1», AP 10/10, Quests, Moogle Shop, Avatar
Boards, Shop, Presents, MENU, Beginner's Guide.

### Salvataggio del giocatore, rientro diretto nella home, sfondo — 8 ottobre 2026, sera

**Il giocatore si salva su disco** (`KHUX_SAVE`, di default `server/save/player.json`,
escluso da git) a ogni modifica: nome, avatar, Union, Lux, missioni, fase del tutorial,
`created`. È «nuovo» finché non ha fatto `/user/create` (`isNewcomer()`;
`KHUX_NEWCOMER=0/1` lo forza). Per ricominciare si cancella il file. **Al rientro non
rifà il tutorial**: `/system/login` → `/khux/login` → catena di avvio → home, con i suoi
dati (provato sul banco: Lv 1, «LV Up in 1», avatar con la keyblade).

**`/tutorial/status`** restituisce la fase salvata (`PUT`: 50 prima del Prologue, 995
dopo). `isFinished` vale 1 solo da `KHUX_TUTORIAL_LAST_PHASE` (999) in su: con 1 a fase
995 la home crea il **pet** (`lwf/pet/motion/…`, assente dalle risorse) e va in crash in
`FUN_011fa128`. Restituendo la fase vera il client mostra anche **i tutorial originali**
che prima saltava: finestre «Movement», «Attacking Enemies», «Finding Your Target»,
«Special Attack Gauge», «Special Attacks», «Collecting Lux»; tutorial guidati (schermo
oscurato, cerchio di luce) sul forziere e sullo speciale di Donald; in home la freccia
«New!» su Quests.

**Avatar**: `/user/avatar`, `/user/avatar/all` (`userAvatars[]`, elemento `FUN_0078c55c`)
e `/user/avatar/parts` (`FUN_007a1be8`: `userAvatarPartsId`, `partsType`,
`avatarPartsId`, `getDatetime`) dal salvataggio; `userDetail.equipCoordinateNo` 1.

**Sfondo della home** (`FUN_00bb400c`): si disegna solo dalle parti di
`mypageBackground` (`validParts`, poi `partsId`/`dataType`/posizioni/`zSort`):
`dataType` 1 = `lwf/home/<id>/<id>.png`, 2 = `.lwf`, 3 = `img/home/<id>/<id>.plist`. Con
png (sotto) + lwf (sopra, l'acqua della fontana) la home mostra la piazza di Daybreak
Town; l'immagine è più larga dello schermo.

**Aggiornamento dei master per chi rientra**: il client chiede il download («2,16 GB»,
ma scarica solo i master). Il crash che seguiva (`0x12c1ee0`) è **risolto**: era la voce
116 di `misc` in `/system/coppa` (§2, «Il crash dopo l'aggiornamento dei master»).

### Quests, la lista delle missioni e la missione 2 — 8 ottobre 2026, notte

- **Schermata Quests** (`SceneAdventureSelect`, `FUN_00d97410`): `userDetail.lastClearStageId`
  è il **numero di missione** (campo `id` della tabella `stage`: Prologue = 1), non lo
  `stageId` (1010). Il client lo confronta con `misc` 106 (130) per sbloccare il quarto
  pulsante (Colosseum); con 1010 risultava sbloccato e cercava il testo `text/ui/102850008`,
  assente: crash. Ora: STORY, Special (missione 6), Events (14), Union Cross (24),
  Colosseum (130). Tutte mostrano «COMPLETE» perché `/stage/achievements` ha numeratori e
  denominatori a 0 (da sistemare).
- **Testi**: `FUN_00719f18` legge `text/<categoria>/<id>.txt` (categorie `ui`, `drama`,
  `audio`) dal `misc` dell'APK (2.398 testi `ui`) e dalle risorse scaricate (588): solo 2 id
  costanti mancano in entrambi (102850008, 106260102).
- **Lista STORY** (`/stage/160310`): gli stage completati (`player.stageScores`: record di
  Lux, missioni spuntate, `playStatus` 2) e il primo non completato (`newStageId`). La
  missione 2 «Combat 101» (1013) compare come NEW.
- **«Begin»**: tre crash risolti in fila. `userDetail.maxMedal` 0 → popup
  `PopupNormal_MedalOver` (layout assente): ora 300, segnaposto. `maxDeckCost` 0 →
  `PopupNormal_Cost_Over` (assente): ora dal campo `cost` di `player`. Medaglia mancante →
  ripiego sulla **medaglia 1** (`FUN_00eb577c`): `make-game-tables.js` aggiunge la riga 1.
  Catena di evoluzione delle **keyblade** (`FUN_008c28fc`, tabella interna 0x44): la 5.0.1
  ha solo alcuni livelli (1000, 1040, 1110, 1215) ma `evolveId` punta a quelli tolti
  (1010): `import-master.js` collega ogni riga alla successiva presente. Poi
  `GET /stage/support/list` (azione 111): `supportUsers[]` con il giocatore stesso
  (elemento `FUN_0078a5c4` con `userMedal`, `userSkills`, `userAvatar`).
- Si arriva a **«Select a Keyblade»** (deck, Starlight, Confirm). Prossimo: Confirm e
  `/stage/start` della missione 2.

### Il crash dopo l'aggiornamento dei master — risolto l'8 ottobre 2026, notte

**Causa**: la voce **116 della mappa `misc` di `/system/coppa`**, che mandavamo a 0. A
fine download `SceneDownload::update` (`FUN_00cfbef8`, slot 113 della vtable di
`SceneDownload`) chiama `FUN_00cfb268`, che confronta il campo `+0x3bc` della scena (0 dal
costruttore) con la voce 116 di quella mappa (oggetto di sessione `+0x3a0`, chiave 0x74):
se sono uguali chiama un metodo di `cocos2d::Node` sul nodo `+0x3a8`, che nella
`SceneDownload` dei soli master non viene mai creato (memoria non inizializzata: i due
float in `x0`). Con 116 = 1 il client prende l'altra strada (`FUN_00cfbd78`), scarica i
master e prosegue fino alla home. Verificato due volte (revisioni 45 e 46). Il nuovo
giocatore non passa da qui.

**Trovato con `tools/ldplayer/armtrace`** (vedi il suo README): processo fermato
nell'istante del crash sospendendo `tombstoned`, memoria letta con `process_vm_readv`
(LIAPP chiude il gioco se si apre `/proc/<pid>/mem`), registri ARM emulati letti dallo
stato di houdini: `pc` = `0x12c1ee4`, **`x30` = `0xcfb310`**. Le note che seguono sono
l'indagine statica precedente.

Indagine statica (prima dello strumento):

Per chi rientra, quando la revisione dei master cambia: `resourcesize` (5 richieste, due
con revisioni 0 e `resoMode` 0/1 per la scelta della risoluzione), dialogo «Download»,
download dei 106 master (5,7% → 100%), icona di caricamento, crash senza altre richieste.
Al riavvio si entra nella home. Ricostruito:
- il percorso dopo il download (lambda di `SceneTitle::khuxDownloadResolutionSelect`,
  trovate con le vtable delle `std::function`): `0xc3f418` → `FUN_00a9b018` (master) →
  `0xc3fcd4` → `FUN_00a9d198` → `0xc3fb74` → `FUN_00b9556c` (schermata di transizione) →
  `0xc3f770` → `FUN_00c3f88c(1,1)` (nuova `SceneTitle`) → `0xc3f994`;
- il crash è `Label::setString` (`FUN_012afc74`) su un'etichetta già liberata: dai
  registri ARM emulati (struttura puntata da `r13` nel tombstone) `x0` =
  `0x4268000043680000`, cioè due float (232.0, 58.0) al posto del puntatore.
- **Escluso** (provato sul banco): la dimensione annunciata (intera, solo master, 0 alle
  richieste con revisioni 0), il contenuto dei master (crash anche con master identici e
  solo la revisione cambiata), `darkVersionRes`, lo stato del tutorial (`isFinished` 1), i
  layout del titolo e del download (tutti presenti).
- Il percorso del nuovo giocatore usa lo stesso dialogo e lo stesso download senza crash.

**Banco**: `DismissTutorial` (finestre con OK, anche a più pagine), `GameWait` (attesa in
tempo di gioco: con una finestra aperta il gioco è fermo), `FindTarget` (indicatore rosa
TARGET), `FindSpotlight` (tutorial guidati), `bench_prologue.ps1 -Seek` (il Prologue
seguendo lo schermo invece dei tocchi fissi: ~2 minuti), `bench_start.ps1` tocca
«Download» se compare.

`recon/ghidra/decomp.ps1 -Out <file.c> [-Timeout s] <indirizzi Ghidra>` lancia la
decompilazione headless in una riga.

### Missione 2, forzieri, drop e inventario dai dati — 8 ottobre 2026, notte

**Missione 2 (Combat 101, stage 1013) completa**: Confirm, tutorial «Friends» (OK a
960,975, stile diverso da `DismissTutorial`), scelta della medaglia amica, Start,
`POST /stage/start`, tutorial «1 Turn Triumphs» (stesso stile), tutorial del flick,
`-Seek` fino a `/stage/clear`, RESULTS con gli obiettivi spuntati, LEVEL UP, missione 3
sbloccata. `bench_prologue.ps1 -Seek` funziona per qualunque stage.

**Forzieri e drop per ogni stage, dalle mappe.** `recon/tools/stage_poi.py` legge tutte le
`stage/mappoi_stg<id>_NN.bin` dell'addnl (`ipa431\names_addnl.tsv` + `addnl.mp4`, chiave
5.0.1 in `BGAD_KEY`) e scrive `server/game_data/stage_poi.json` (non versionato):
- nemici: record da 8 interi `x, y, enemyId, 1, 1, 1, reward, uid`. **reward** è la riga
  della tabella `reward` del drop: 1 per quasi tutti, una sua per il primo nemico di ogni
  mappa (80002, 80003, 10100–10130). `FUN_00e7e6e8(…, uid, reward)` la carica e **senza
  riga va in crash** appena parte lo stage (fault addr 0x10): è il crash del primo
  tentativo della missione 2;
- forzieri: dopo l'ultimo nemico un contatore e record da 5 interi `x, y, reward, tipo,
  uid` (righe usate: 1, 80, 81, 90; tipi 13/14/15/19, forse la grafica);
- `uid` è lo spazio di id comune a nemici e forzieri, quello di `userTreasures` /
  `userEnemyDropItems` e di `getTreasures` / `getEnemyDropItems` in `/stage/clear`.

Solo 7 stage hanno una mappa (1010–1040: 1040 solo l'intestazione), e **la tabella
`stage` della 5.0.1 offline ha 10 stage** contro le 979 missioni della storia
(khuxwiki, «Story Quests»): gli altri stage sono ancora da trovare (fase D).

`make-game-tables.js` genera le righe `reward` da `stage_poi.json`: per i nemici
materiale 13 in posizione 0, per i forzieri CP (81), HP (80) o munny (90) in posizione 1
quando la riga serve a entrambi (la 1). `server.js` manda a ogni forziere, posizione per
posizione, il tipo del premio (0 dove il premio è del nemico) e ai nemici gli uid da 1 al
massimo della mappa, tolti i forzieri.

**Controllo offline: `node server/check-stage-data.js [--verbose]`.** Per ogni stage
della tabella, senza aprire il gioco: righe `reward` di forzieri e nemici (assenti =
crash), forzieri che resterebbero vuoti, tipi di premio non gestiti, materiali assenti.
Sulla tabella che ha fatto crashare la missione 2 trova 12 errori in 5 stage (gli altri 10
avrebbero fatto crashare Dwarf Woodlands e Dark Forest 1–2); rigenerata, 0 errori. Va
eseguito dopo ogni modifica di master o mappe: sul banco basta poi un campione.

**Inventario salvato** (`server/save/player.json`): `money` (munny, da
`getPoint.money`), `freeStone` (jewel: premio del primo completamento, `clearGetItemType`
2, es. 300 in Combat 101), `materials` (da `getMaterials` e dai premi di tipo 5 degli
obiettivi compiuti per la prima volta). Risposte: `userPoint.money`, `GET /user/stone`
(azione 7: `userStone.freeStone/payStone`), `GET /user/material` (azione 16) e
`userMaterials` in `/stage/clear`. Sul banco l'HUD mostra 300 jewel dopo la missione 2.
`firstClearFlag` ora vale «stage mai completato» (`stageScores`), e
`lastClearStageId` avanza solo.

Tipo 14 = **Avatar Coin** = `userPoint.spherePoint` (gli Avatar Boards sono le «sphere»
del client).

Tipo 3 = **medaglia** (id della tabella `medal`): confrontando la tabella `stage` con la
wiki (`namedal`) 90041 = Dewey ★, 90146 = Huey & Dewey & Louie 6★, 90083 = Fairy Godmother
3★, 90025 = Huey 5★, 90084 = Yen Sid 4★, 90094 = Flora 4★. Le medaglie ricevute vanno in
`player.medals` (`userMedalId` da 101) e in `userMedals`. Solo 22 medaglie hanno grafica
nelle risorse servite (`img/medal/Medal_L_<id>.png`); per ora la tabella ha Dewey ★
(`medals.json`), e `check-stage-data.js` segnala come errore ogni medaglia premio assente.

**Missioni 3–6 giocate** con `tools/ldplayer/session/story.ps1` (MENU → Quests → STORY,
Begin, Confirm, amico, Start, `-Seek`, risultati): dopo la 3 la battaglia scriptata con
Darkside, dopo la 5 il tutorial della home che indica MENU. Il server ora parte staccato
(`Win32_Process.Create`): con `Start-Process` moriva insieme allo script che lo lanciava, e
il client restava sul caricamento fino a «6 ERROR :143».

**Missione 7 (1040): crash nel parser della mappa, prima di `/stage/start`.** Tombstone
in `FUN_00e5f6e8` (fault addr 0x24). `stage/mappoi_stg<id>.bin` è un'intestazione `STG`
(numero di parti, ecc.: 1040 ne dichiara 1) e ogni parte `mappoi_stg<id>_NN.bin` è il
file `MAP` della stanza (aree, nemici, forzieri, oggetti; contiene il nome della mappa,
es. `DB_0…`). Le risorse servite hanno le parti solo per 1010–1030: **ogni altra missione
va in crash all'avvio**. Le grafiche delle stanze ci sono (86 cartelle `map/`: DB, AG,
BC, CD, CS…), manca solo la disposizione di nemici e forzieri. Due strade, da scegliere:
- cercare i `mappoi` originali (archivi del CDN delle risorse, comunità di preservazione);
- generarli: formato in parte noto (aree 0x44, nemici 0x20, forzieri 0x14, oggetti 0x10),
  nemici e tesori per stanza da khuxwiki (`quests.json`), coordinate prese dalle mappe
  esistenti della stessa stanza o dalla collisione `map/<stanza>/*_cls.bin`.

Gli originali non si trovano: l'archivio web della comunità (`khux-5.0.1-ww-web` su
Internet Archive) usa gli stessi OBB 5.0.1, e l'indice dell'IPA 4.4.0 non ha `mappoi`.
Nel gioco originale le mappe dopo il tutorial arrivavano con gli aggiornamenti delle
risorse dal CDN.

### Mappe generate e risorse aggiuntive — 8 ottobre 2026, notte

**Formato `MAP`** (parser `FUN_00e5f6e8`, verificato sulle mappe 1010–1030):
`+0x24` X (inizio del blocco dati), `+0x28/+0x2c/+0x30` posizioni delle sezioni dopo i
nemici meno 0x34; `X+0x34` aree, `X+0x38` nemici; da `X+0x3c` aree da 0x44 byte
(`[0]` primo nemico, `[1]` quanti; l'area 0 del modello 1030 è l'arena del bersaglio),
poi nemici da 0x20 (`x, y, enemyId, 1, 1, 1, reward, uid`), poi forzieri, oggetti,
un'altra sezione. Ogni parte porta il nome della stanza (`DB_0000_00_00` = Fountain
Square, `DW_0001_00_00` = Dark Forest: Entrance, …): sono le 86 cartelle `map/`.
L'intestazione `STG` (`mappoi_stg<id>.bin`): parti, posizione di partenza, bersaglio
(enemyId), numero di aree e di nemici.

**Strumenti.** `recon/tools/mappoi_gen.py <modello> <spec.json> <uscita>`: una parte
nuova da un modello della stessa stanza (aree e oggetti del modello, nemici e forzieri
dalla spec; rigenera 1030 da se stessa con la stessa struttura).
`recon/tools/resource_pack.py <cartella> <chiave> <dati> <indice>`: pacchetto BGAD dei
file generati, da unire con `resource_merge.py` come quarto pacchetto (dopo OBB e addnl):
la versione delle risorse cresce (4, 5, 6: i pezzi della 3 come hard link + un pezzo).
`tools/ldplayer/session/update-resources.ps1`: il client scarica le risorse solo a
tutorial «finito», quindi il server parte una volta con `-TutorialFinished`; lo script
attende anche la fine dell'installazione (interromperla lascia `files/r` a metà e la
home va in crash cercando `MyPageScene_ver340.json`).

**Errori trovati e corretti.** `/system/resource` elencava tutte le versioni (3 e 4): in
modo 1 il client le scaricava e concatenava (misc.mp4 di 4,6 GB, «Save error»). Ora
annuncia solo l'ultima.

**Missione 7 (1040).** Con la mappa generata (stanza `DW_0001`, modello 1030; nemici
dalla wiki: Nosy Mole ×2 bersaglio, Shadow ×3, Shadow ×1, Yellow Opera ×1) il client
supera il parser e manda `/stage/start`, poi va in crash caricando la grafica dei nemici
(`FUN_00adcb84`, `lwf/character/enemy/<displayId>/wait`): **Yellow Opera (displayId 3)
non ha grafica** nelle risorse. Hanno grafica i displayId 1, 6, 7, 8, 17, 37, 1020
(Shadow, Soldier, Large Body, Nosy Mole, Armored Knight, Dire Plant, Mega-Shadow) e le
serie 5001–5086, 7001–7005, 8001–8022 (Dark Road?). Versione 6: Yellow Opera sostituito
da Soldier (l'obiettivo «Defeat Yellow Opera» non si può completare). Anche la tabella
`enemy` della 5.0.1 ha solo 12 nemici.

Con la versione 6 la **missione 7 si gioca fino in fondo**: campo «Dark Forest: Entrance»,
TARGET Nosy Mole ×2, `/stage/clear`, RESULTS, LEVEL UP. Poi:
- CONGRATULATIONS andava in crash sulle medaglie premio assenti dalla tabella (90146,
  90083): aggiunte a `medals.json` con nome e tipo dalla wiki e **grafica sostitutiva**
  di Dewey ★ (`imageId` 90041: solo 22 medaglie hanno immagine nelle risorse);
  `make-game-tables.js` usa `imageId` se c'è. Revisione master 52;
- tornando alla lista, `FUN_006e94ec` apre l'intestazione `mappoi_stg<id>.bin` della
  **missione successiva** (8 = 1050, assente) e cerca il suo bersaglio (`+0x28`, o
  `+0x18`) nella tabella `enemy`: crash. Versione 7: intestazione 1050 copiata da 1040
  con bersaglio Large Body (89007). Per giocarla serve la stanza «Dwarf's Cottage»
  (probabilmente `DW_0003_00_00`, senza mappa modello).

**Ricerca online dei dati originali (9 ottobre 2026).** Nessun dump pubblico dei
`mappoi` né delle tabelle master complete del periodo live. Fonti utili:
- **thethiny/KHUxTools** e **thethiny/KHUx-Server** (GitHub, attivi nel 2026): l'autore
  dichiara di avere `misc.mp4` v1.0.1/v1.2.3 e file `r/` scaricati dal CDN (2016–17).
  `KHUx-Server/data/*_raw.json` ha righe **binarie** delle master di una versione
  precedente: `stage` 1.140 righe (1.020 B), `enemy` 665 (1.100 B), `medal` 522 (1.300 B),
  `reward` 1.457 (136 B), `player` 301 (28 B). `recon/tools/raw_master.py` le decodifica
  con lo schema della 4.3.1: **reward** e **player** tornano (needExp a 32 bit);
  stage/enemy/medal hanno un'altra struttura (da ricavare). Scaricati in
  `D:\Progetto_Restauro_KH_UX\external\thethiny` (fuori dal repository).
- Righe vere che confermano le deduzioni: reward 1 non valida (barile vuoto), 80 = CP
  15.000, 81 = CP 30.000, 90 = HP 1.400; 10100 = una medaglia a caso tra 11012/12011/13011/
  11021 (il primo nemico di ogni mappa lascia una medaglia); player: soglie di Lux vere
  (LV 2 = 729), AP 16+, costo 42+, HP 3000+. `make-game-tables.js` usa ora righe dei
  forzieri e livelli veri (HP tenuto a 3000), revisione 53.
- **stage, enemy, medal decodificati (9 ottobre 2026)** con `recon/tools/raw_master_old.py
  <tabella> <righe.json> <uscita.json>` (uscita `external\thethiny\<tabella>_dec.json`).
  Struttura ricavata confrontando le righe con valori noti (`stage.json` di thethiny, 8
  stage comuni; `enemy` 5.0.1, 7 nemici; `wiki\medals.json`, 9 medaglie): le stringhe sono
  `char[N+1]` (129, 65, 513 byte), i nemici hanno **5** livelli invece di 6, mancano
  alcuni campi della 4.3.1 (hardmode, branchType, …); i campi incerti restano
  `unk_<offset>`. Gli elementi degli array oltre il contatore `valid*` contengono residui
  di memoria (pezzi di altre stringhe) e vengono azzerati. Risultato: **1.140 stage**
  (con `stageBinId` = numero della mappa, obiettivi, premi, musiche), **665 nemici**
  (HP/attacco/difesa/Lux/munny per livello, abilità, CP), **522 medaglie** (statistiche,
  rarità, costo, attacco speciale, evoluzioni). Confronto con la 5.0.1: valori quasi tutti
  uguali (qualche ritocco di HP, punteggi, un obiettivo). Conferme: missione 7 = «Defeat
  Yellow Opera x1», missione 8 (1050, «Unexpected Visitors», Dwarf's Cottage, mappa 8) =
  bersaglio Large Body (10007), la 9 (1060) = mappa 9, stessa stanza.
- Grafica: **Roboloid/khux** (GitHub, ~2,5 GB di PNG: 1.930 medaglie, parti avatar e pet,
  113 frame di nemici, sfondi), **luxenvulpies/KHUX_Medal_Website** (1.881 medaglie),
  dump della wiki su Internet Archive (`wiki-www.khuxwiki.com_w-20240119`, immagini 9,8
  GB). Sono PNG esportati, non LWF.
- IPA WW 1.0.1–4.4.0 e JP 1.0.2–4.4.1 (`khux-ww-IPAs`, `khux-jp-IPAs`), OBB JP 5.0.1
  (`khux-5.0.1-jp`): senza `mappoi` probabilmente (le storie arrivavano dal CDN).
- Da fare: contattare thethiny (r/ del CDN, master complete) e Roboloid; appello su
  r/KHUx per chi ha ancora `files/r/` di una 4.x.
- Seconda ricerca (9 ottobre 2026), niente dati nuovi ma contatti: **Arena7664**
  («Cross Road», il client 5.0.1 nel browser via Rellume/WASM; sa modificare e
  reimpacchettare `extra_mp4`; github.com/Arena7664, IA `khux-5.0.1-ww-web`); Discord
  **«Traverse Town»** (discord.gg/jHWEkRdjJb, comunità di conservazione attiva:
  chiedere `files/r/` vecchi); `xlash123/khux-re-api` (protocollo 4.3.1, id dei nemici
  evento = 5 + album + rango); **wikiwiki.jp/khux** (missioni 1–750: AP, bersaglio, Lv,
  obiettivi, premi; utile per controllare le righe stage). Wayback: nessun contenuto
  del CDN.

**Il menu a tendina bloccato — risolto il 9 ottobre 2026.** Sintomo: MENU si apre ma
le voci (Quests, Medal List, …) e la chiusura non rispondono, nessuna richiesta parte;
anche la testata della schermata Quests è inerte. Funzionava solo nei passi guidati.
Causa: `/tutorial/status` rispondeva sempre `isFinished: 0` (a fase 995) e il client
restava nella guida per principianti. Con `isFinished: 1` (`TUTORIAL_LAST_PHASE` ora
995) la home crea il pet e gli NPC, i cui LWF mancano: `FUN_00b3c350` /
`FUN_00add9a0` caricano `lwf/pet/motion/<30 nomi>` e `lwf/character/npc/<id>/wait/
wait.lwf` con `FUN_011f9fc4` (NULL se il file manca) e dereferenziano senza controllo.
Rimedio: **risorse versione 9** = la 7 + nel pacchetto generato
(`D:\Progetto_Restauro_KH_UX\stage_gen\files\`) un LWF vuoto (`waist_c.lwf` dei
costumi, 492 byte, nessuna texture) per le 30 animazioni del pet e per i 74 id NPC di
`img/stage_npc/npc_rule.bin` (tranne 4001, che c'e'). Poi il client mostrava in fila
tutte le finestre di spiegazione (`popupFlag` restituito sempre 0), fra cui una di Dark
Road che va in crash (`SceneDarkroadHome::darkroadPartySeclectPopup`): ora il server
salva i bit di `popupFlag` e a tutorial finito li dà tutti per visti (2^53−1).
Provato sul banco: home pulita (compaiono le frecce ‹ › delle pagine della home: non
toccarle, la seconda pagina e' Dark Road), MENU → Quests funziona.
`recon/ghidra/khux_field_readers.py`: chi legge un campo di un singleton (chiamata al
getter seguita da `[xN,#off]`).

**Mappatura dei pulsanti (9 ottobre 2026)** con `tools/ldplayer/session/sweep.ps1`
(app riavviata, un tocco, screenshot, tombstone; rapporto in `logs\sweep.txt`):

| Pulsante | Esito | Causa |
|---|---|---|
| Quests (home e menu), Home (menu) | ok | |
| Shop (home e menu) | ok | schermata con Increase Storage, Moogle Shop, Jewel pack |
| Chat | ok | «You need to be in a party» (corretto: nessun party) |
| Beginner's Guide | si apre vuota | contenuto da indagare |
| Profilo (avatar in alto) | crash | layout `AvatarInfoScene_A_ver131.json` mancante |
| Moogle Shop | crash | layout `MoogleShopScene_ver410.json` e `lwf/mogshop/mog_wait` mancanti |
| Avatar Boards (home e menu) | crash | layout `SphereBoardScene_ver310.json` mancante (probabile) |
| Presents | ok (dal 9 ottobre) | layout sostitutivi dai `dark_PresentBOX_*` + 5 testi ui |
| Medal List | crash | layout `MedalListScene_ver130.json` mancante |
| Other | crash | layout `MenuDialog_ver300.json` mancante (probabile) |
| Rotolo (icona sotto il livello) | crash | come Other (`0x11afb7c`), da verificare |
| Equipment | ok (dal 9 ottobre) | mancava la risposta a `GET /keyblade/subslot` |

**Equipment — risolto il 9 ottobre 2026.** Crash `std::out_of_range: vector` in
`FUN_00c16d14` (callback di cella del carosello delle keyblade di `DeckEditScene`,
init `FUN_00bfd960`): il campo +0x10 del record della keyblade
(`userKeybladeSubslotId`) si cerca nella mappa dei subslot della sessione (+0x890,
elementi da 0x20 byte); con id 0 e nessun subslot il risultato e' -1 e l'indice sfora
(`0xc16f7c` → `FUN_00708974`). I subslot li legge `FUN_00798a64` dalla risposta di
**`GET /keyblade/subslot`** (la risposta di login non usa quel parser): `subslotMaxNum`
(uint) e `userKeybladeSubslots[]`, elemento `FUN_00798980` = `keybladeSubslotId`
(uint64), `subslotRate` (uint), `subslots[]` (`FUN_00798750`: `slotNumber`
1..subslotMaxNum, `userMedalId` uint64; anche vuoto). Ora il server risponde con un
subslot vuoto per la keyblade (id 1, `userKeybladeSubslotId` 1). Provato sul banco:
Equipment si apre (Starlight, Donald/Goofy/Yuna, STR 5228, DEF 3747, costo 3/44,
Subslot 0/0). Piste sbagliate scartate: seconda keyblade, tabella di sessione +0x8c0.
Strumenti: cattura dello stack ARM al crash (regione di `sp` copiata con
`dumprange.sh`), backtrace euristico con base `0x31c0000`; `vmread` sulla sessione
(`FUN_007c1dfc` = oggetto statico a `0x515e290`; tabelle con il numero di record a
+0x34).

**Layout sostitutivi — Presents funziona (9 ottobre 2026).** Catena di strumenti:
- `recon/tools/res_get.py <nomi.tsv> <resource_data\N\data> <uscita> <nome>...`: estrae
  file delle risorse per nome (in `D:\Progetto_Restauro_KH_UX\layouts\orig\`);
- `layout_tree.py` (layout UI 1.6: albero dei widget, posizioni, immagini) e
  `scene_tree.py` (scene SceneEditor `*Scene*.json`: nodi `CCNode` con `GUIComponent`
  che caricano un layout);
- `widget_lookup.py <lib> <file.c>`: dal C decompilato ricostruisce i nomi dei widget
  cercati (stringhe corte libc++ composte a pezzi sullo stack) e la funzione che li usa
  (`FUN_006e0e2c` figlio per nome, `FUN_006e6e6c` testo di un figlio);
- `make_layouts.py`: tabella dei layout mancanti (`copy` da un layout esistente con
  eventuali nomi cambiati, `scene` con nodi vuoti) e dei testi `text/ui/<id>.txt`
  mancanti (letti da `FUN_00719f18`, categoria 0 = ui; senza file → crash); scrive in
  `stage_gen\files`;
- `tools/ldplayer/session/build-resources.ps1 -Version N`: pacchetto generato + unione
  con OBB/addnl → `resource_data\N`; poi `update-resources.ps1`.
Presents: `PresentBOXScene.json` = scena con `CenterUI`/`LeftUI` vuoti (la scena li
toglie), `PresentBOX_Base_ver400`/`_Panel_ver131`/`_IconPanel_ver131` = copie dei
`dark_PresentBOX_*` (stessi nomi di widget), testi 103500002/3/13 e 106250103/4 dalla
schermata originale (`reference\presents`). Risorse versione 11. Sul banco: la schermata
si apre, il codice riposiziona i widget come l'originale; cornici viola di Dark Road (da
sostituire con le texture blu). Grafica di riferimento: 112 fogli di Spriters Resource
in `D:\Progetto_Restauro_KH_UX\reference\spriters\` (scaricati con Edge pilotato da
Playwright per superare la verifica Cloudflare, poi `curl_cffi` con i suoi cookie),
67 schermate in `reference\<sezione>\` con le fonti in `SOURCES.md`.

**Layout, seguito (9 ottobre, pomeriggio).**
- `make_layouts.py` ora ha quattro tipi di voce: `copy` (con `retex`: texture `dark_*` →
  KHUX, togliendo il prefisso o con `DARK_TO_KHUX`), `scene` (nodi vuoti o con
  `GUIComponent` che carica un layout: `('CenterUI', 'publish/X.json')`), `build`
  (layout costruito da una descrizione: `P` pannello, `I` immagine, `B` pulsante con
  Label, `L` etichetta; modelli dei widget clonati da `dark_PresentBOX_base.json`) e
  `armature` (copia di `ArrowAnim.ExportJson` con armatura e movimenti rinominati);
- le texture delle risorse sono in formato **BTF** (`\x89BTF`, larghezza/altezza a +0x16,
  zlib): `recon/tools/btf_to_png.py` le converte (RGBA8888, RGBA4444, a tavolozza).
  Elenco delle texture `cocostudio/publish` in `D:\Progetto_Restauro_KH_UX\layouts\textures.txt`;
  equivalenti KHUX scelti: `Panel04` (riquadro blu scuro), `Plate12` (pillola scura),
  `Plate13` (barra scura), `But16` rosso, `But17` arancione, `Win01`/`Win11`;
- **testi `text/ui`**: il client ne cita 856 con id costante (`ui_text_ids.py`, elenco in
  `layouts\ui_text_ids.tsv`), le risorse servite ne avevano 128. Il pacchetto `misc` dell'IPA
  4.4.0 (`misc.mp4` 21 MB, scaricato con `remote_zip.py` in `ipa440\`, indice
  `names440misc.tsv`) ne ha 2.403: `import_ui_texts.py` copia i 2.332 assenti (originali)
  e `build-resources.ps1` li mette nel pacchetto. Lo stesso pacchetto ha anche 21 dei
  layout mancanti (titolo, registrazione, informazioni: non ancora usati);
- Medal List: nomi dei widget da `FUN_00df1c00` e vicine (`Win_Bottom` con `Txt` e
  `Txt_Button` Label, `Medal_Sell_Panel`, `Scroll_Area`, `Button_Back`, `Button_Sort`,
  `Button_Sell1`/`Txt_Sell1`); il cursore della griglia e' l'armatura
  `Cursor_Anim_MedalSell` (movimento `Animation1`, `FUN_00882e10`), la selezione
  `MedalSelectAnimation` (`Medal_Select01`, `FUN_009e7108`); `ArmatureAnimation::play`
  (`FUN_01188fac`) con un movimento assente → crash;
- «N ERROR :251» = curl N (28 = timeout): era il server che si metteva in ascolto dopo
  minuti; `bench_start.ps1` ora preme anche l'OK di quel popup.

Dei 601 layout cocostudio citati dal binario ne mancano 307 (`logs\layout_mancanti.txt`,
da `asset_coverage.py`), 49 sono schermate intere. Indirizzi da `armtrace`: la base di
`libcocos2dcpp.so` sotto houdini oggi e' `0x31c0000` (come in `tombstone.ps1`), non
`0x3308000` come presume `capture.ps1`: sottrarre `0x148000` ai valori «Ghidra» che stampa.

**Medal List — risolto (9 ottobre, sera).** Sei crash in fila, ognuno catturato con
`stackcap.ps1 -MenuY 697 [-Taps 'x,y']` e letto con `findregs.py` (ora cerca nelle
sottocartelle e accetta `pc` fuori dalla libreria; con `--lib-pc` il vincolo vecchio) e
con le stringhe corte di libc++ rimaste nello stack (byte = lunghezza*2, poi il nome):
1. `ArmatureAnimation::play` senza `Medal_Select01` (vecchia cattura `ml2`, gia' risolto);
2. `FUN_00df2be8` prende il primo figlio di `LeftUI` della scena: vuoto → crash. Ora
   `LeftUI` = `MedalSell_Back.json` (originale, pulsante Indietro);
3. `Button_Sort` e' cercato dentro `Medal_Sell_Panel` = la barra in alto (non nascosta);
4. `FUN_00760c64` (barra di ordinamento generica) vuole `Txt_Sort` (in `Button_Sort`),
   `Txt_Sort_Label`, `Txt_Filter_On` (testo 100100012);
5. `FUN_00df284c`: contatore `Txt_MedalGet` («Slots», 101200050), `Txt_MedalGet_Num_Label`
   (possedute) `/` `Txt_MedalGet_All_Label` (capienza), scritti da `FUN_00df34a4`;
6. dettaglio: `FUN_00aba238` carica `SlideMedalInfoScene_ver341` (assente) sopra
   `MedalInfoScene_ver320`, con `LeftUI`/`RightUI` (frecce, primo figlio con pulsante);
7. Sort: `FUN_00a458c4` carica `PopupNormal_SortButton_ver350` (assente; c'e' la ver320).
   `FUN_00a45fa0` (troppo grande per il decompilatore: nomi presi dallo stack e dal blocco
   di stringhe contiguo nel binario) cerca in piu' la sezione `Dummy_Sb` con ~30
   `Filter_Sb*`, `Txt_TitleSb`, `Txt_SubTitleSb01/02`, e `Filter_Subslot`, `Filter_Trait`,
   `Filter_Evo_Set`, `Filter_Ability_Guard/BaseAttack/BaseDefence` ecc.: cloni nascosti di
   CheckBox vicini (`make_layouts.py`, `('clone', sorgente, nome, genitore)`); `Filter_Sb`
   va dentro `Dummy_Sb` (genitore letto dal disassemblato, 00a482ac). Testi 1062402xx
   assenti anche nella 4.4.0 (li' i vicini sono «[id]»): stesso segnaposto.

Ciclo rapido delle prove: `build-resources.ps1 -Quick` (sopra, in «Stato»).

**Sell Medals — risolto (9 ottobre, sera).** Tocchi sul banco: MENU `1790,45`, Medal List
`1745,697`, Sell Medals `335,262`, una medaglia `637,600`, Sell `350,1005`, conferma
`1220,715`, OK `960,712`. Catena:
1. `FUN_00bf0a10` carica `MedalSellScene_ver350` (assente): scena con CenterUI
   (`MedalSell_Gen.json`), LeftUI (`MedalSell_Back.json`) e RightUI (pannello vuoto:
   `FUN_00bf302c` usa il primo figlio di tutti e tre);
2. nomi dal decompilato e dalle stringhe ADRP/ADD della funzione: contatore
   `Txt_MedalGet*` (come Medal List), `Txt_Money` + `Txt_Money_Label` (Munny posseduti,
   `FUN_00bf25fc`), `Txt_Money_Total` (titolo) / `Txt_Money_Total_Lavel` (valore del
   ricavo), `Txt_A_Coin(_Label)`, `Plate_A_Jewel`/`Plate_A_Ticket` (testo 106240301
   «Tickets», assente anche nella 4.4.0), `BoxNow`, `BoxMaxLabel`, `DeckBase2`;
3. **`Medal_Sell_Panel` non deve coprire la griglia**: il codice lo rende toccabile e, a
   schermo intero, assorbiva i tocchi (selezione impossibile). Ora e' la sola barra in alto,
   con i figli della barra in basso fuori dai bordi (y negativa);
4. conferma `PopupNormal_MedalSell_Check_ver350` (`FUN_00bf3804`) e esito
   `PopupNormal_MedalSell_Ok_ver350` (`FUN_006f4918`): copie dei popup generici originali
   `PopupNormal_Text_34_4Line_OkCancel/Ok` con nomi rinominati; entrambi vogliono le
   ricompense `Panel_1..4` con `Obtain_Plate_a..d` (`FUN_006f33f0`; ogni targhetta `Txt`,
   `Txt_Label`, `Icon` ImageView); per le medaglie rare `Alert_Area` riceve
   `PopupNormal_MedalMix_RareCaution_Panel.json` (assente, generato: `Txt_Wording1..3`,
   `Star1`); esito: testo 106240302 «Sale complete!» (nostro);
5. server: `POST /user/medal/sell` (azione 51), corpo `{"userMedalIds":[106],"numbers":[1]}`.
   Ramo 51 del dispatcher (`action_case.py` sul disassemblato lineare
   `logs\dispatcher_linear.txt`): `userData.userPoint`, poi in radice `userSkills`,
   `userMedals`, `sellUserMedalIds` (senza: «200 ERROR :51»).
`make_layouts.py` ha ora per il tipo copy anche `('text', nome, testo)`, e `scale` per i
widget costruiti.

**Memoria del PC.** Dopo diversi download da 2,3 GB `Ld9BoxHeadless` (la VM di LDPlayer)
arrivava a 30 GB di memoria impegnata: memoria virtuale libera 0,1 GB, il file di
paging non può crescere (C: quasi pieno) e Windows rifiuta di avviare `ld.exe` («file
di paging troppo piccolo»). Rimedio: `ldconsole quit --index 0`, `launch`, poi
`phaseb-guest.sh 192.168.1.185` (copiato in `Documents\XuanZhi9\Misc`).

**Contenuto dei forzieri, da khuxwiki.** Confrontando le mappe delle missioni 1–6 con i
tesori della wiki (`{{TC|codice|stanza}}`): riga 81 = Attack Prize medio (`a2`), 80 =
Attack Prize piccolo (`a1` o barile `ba`), 90 = barile con HP (`bh`), 1 = barile vuoto
(`b`; è anche la riga predefinita dei nemici). Le quantità sono nostre (CP 10.000 e
5.000, HP 500). `check-stage-data.js` confronta anche ogni stage con la wiki (jewel,
Avatar Coin degli obiettivi, numero di tesori).

**khuxwiki in locale.** `recon/tools/wiki_dump.py` scarica il wikitesto via API (per
template, es. `InfoQuestKHUX`: 6.544 pagine; o `--all 0,10,14`: tutta la wiki, circa
27.000 pagine) in `D:\Progetto_Restauro_KH_UX\wiki\` (fuori dal repository).
`recon/tools/wiki_quests.py` ne ricava `quests.json`: 978 missioni della storia (1–979)
con obiettivi e premi, jewel, premi di fine missione, tesori e nemici per stanza.


### I dati del giocatore — `GET /user` e la catena che segue, 8 ottobre 2026

**`GET /user`** (azione 1, ramo `0x7ca040`) chiama in sequenza cinque parser, tutti
obbligatori:

| Parser | Oggetto | Campi |
|---|---|---|
| `FUN_0078ade0` (chiave passata: `userData`, modo 1) | `userData.user` | `userId`, `nativeUserId` (uint64), `platformId`, `userName` (≤ 32 byte), `gender`, `comment` (≤ 256), `deviceType`, `continueLoginCount`, `isFleeze`, `fleezedDatetime` (data), `isAdult`, `nativeTagName` (≤ 14) |
| `FUN_0078b230` | `userData.userPoint` | `money`, `lux`/`totalLux` (uint64), punti vari, `hp`/`ap`/`max*`, `lastApDatetime` (data), biglietti e punti speciali (uint) |
| `FUN_0078babc` | `userData.userDetail` | `level`, `exp`, titoli, `maxDeckCost`, `playTimezones` (int[] ≤ 6), `partyId` (uint64), `unionId`, … |
| `FUN_0078c138` | `userData.stageResumption` | `resumptionStatus`, `stageId`, `raidId` (uint64), `colosseumStageId` |
| `FUN_0078e30c` | `userData.medalResumption` | `userShuffleSkills` (array), `resumptionStatus` (uint) |

Poi pretende anche `userPopUp.isPopBenefitStone` (int). Il server la costruisce in
`respondUser()`: un giocatore di livello 1, nome da `KHUX_PLAYER_NAME`.

**Strumenti nuovi**, per percorrere la catena delle API senza lavoro a mano:
- `recon/tools/action_case.py`: dato un id d'azione trova il ramo del dispatcher e
  ne elenca le chiamate (i parser) e le chiavi lette;
- `recon/tools/response_schema.py`: dal decompilato dei parser ricostruisce i
  percorsi annidati e i tipi (int, uint, int64, uint64, string, datetime, bool,
  object, array). Segnala come `@FUN_…` i sotto-parser chiamati su un valore noto,
  che vanno decompilati a parte (es. `FUN_0077a6cc` su `userData.userChat`);
- `recon/ghidra/khux_linear.py`: disassemblato lineare, che non salta i rami
  raggiunti solo dalla tabella di salto;
- `recon/out/api_responses_ww431.json`: gli schemi (l'interfaccia, versionata). Il
  server genera da qui la risposta minima per ogni rotta elencata che non gestisce a
  mano: 0, "", data corrente, false, {} e [].

**La catena sul banco**, da giocatore esistente:

```
/khux/login → /tutorial/status → PUT /user/awakening (basta ret) → GET /user ✅
→ GET /user/start (azione 3: ramo predefinito, basta ret) → GET /user/chat ✅
→ GET /party (azione 83)  ← «200 ERROR :83», prossimo
```

`/user/chat` (azione 6, `FUN_0077a868`) vuole `userData.userChat.{userId (uint64),
tagName, userEndpointUrl, stampIds (int[])}`, più `authToken` e `userToken` alla
radice.

**La catena di avvio completa**, percorsa sul banco l'8 ottobre 2026. Ogni schema è
in `api_responses_ww431.json`:

```
/khux/login → /tutorial/status → PUT /user/awakening → GET /user → /user/start
→ /user/chat → /party (83: senza partyId basta userParty) → /user/stone → /user/shop
→ /user/option (149) → /tutorial/status → /user/mission (187) → DELETE /pvp/lock
→ PUT /passive/list (249) → PUT /emblem/list (188) → /user/sphere → /user/medal
→ /user/skill → /user/material → /user/keyblade → /user/deck
→ /keyblade/subslot (191) → /user/avatar/all → /user/avatar/parts → /user/title
→ /user/link (152) → /user/support → PUT /playtime/bp (311) → /pvp/keyblade
→ /stage/160310 (108) → POST /stage/start (113)
```

L'ordine non segue gli id: va scoperto sul banco, e conviene ricavare in blocco
gli schemi delle azioni vicine. Molte sono già pronte anche se non ancora chieste:
birthday, item, album, present, avatar, payment/info, need/url, mission/list, pvp,
pvp/vs_list, multi/status, multi/talk, refund/info.

**Il confine: dalla catena di avvio al gioco.** L'ultima richiesta, `POST /stage/start`
con `{"stageId":0, "userKeybladeId":<spazzatura>}`, la costruisce `FUN_007e68c4`
(azione 113). La chiama un functor la cui classe, dall'RTTI della vtable a
`0x1eee8c0`, è una lambda di **`StartDeckEditDialog::startStory`**. Il client cioè
ha finito di caricare e **avvia da solo il primo stage della storia**, con stage 0 e
keyblade inesistente perché tabelle master e inventario sono vuoti.

`stageResumption.resumptionStatus = 0` è corretto: `FUN_006ea7b4` lo usa come switch
(0 = niente da riprendere, 1 = riprendi lo stage, 2 e 3 altri casi).

Da qui non servono altre forme di risposta, ma **dati di gioco**: stage, medaglie e
keyblade nelle tabelle master (fase D, khuxwiki), un inventario iniziale coerente, e
la grafica (OBB).

**Il protocollo delle risorse è completo**: richiesta, risposta, download, verifica,
installazione e indice. Il server sa servire qualunque coppia pacchetto + indice
nel formato originale, e costruirne l'indice.

Il server serve i pacchetti da `server/resource_data/<versione>/{data,index}/` (non
versionata).

### I pacchetti di asset dell'APK — decifrati l'8 ottobre 2026

Gli asset dell'APK (`misc.mp4`, `extra.mp4`, `aliud.png`, …) non sono video né immagini:
sono pacchetti **BGAD** del `bg::FileManager`. Formato, cifratura e indice sono descritti
in testa a **`recon/tools/bgad.py`**, che li estrae per nome:

```bash
python recon/tools/bgad.py <libcocos2dcpp.so> <pacchetto.mp4> <indice.png> <uscita> [prefisso]
```

In breve: ogni pacchetto è una sequenza di record BGAD (header di 24 byte); la
cifratura dei record è **ChaCha a 8 round** con una chiave di 32 byte nella libreria
(`0x1926890`) e un IV ricavato dal nonce in coda al record. I nomi dei file stanno
nell'**indice**, il `.png` omonimo (`misc.mp4` → `misc.png`), con un secondo strato di
ChaCha8. Contenuto di `misc.mp4`: 2.831 file — 2.442 testi (`text/`), 165 animazioni
`lwf/`, 152 layout `cocostudio/`, immagini d'interfaccia, shader, audio, e due cartelle
che contano:

- **`json/server_api.json`** — la **tabella completa delle 321 azioni** del client.
  L'ID d'azione è l'indice nell'array `actions`; ogni voce ha `path` e `method`
  (0 GET, 1 POST, 2 PUT). Verificato su tutte le azioni viste in rete: 0
  `/system/status`, 26 `/system/coppa`, 27 `/system/master/20200423`, 242
  `/system/resourcesize/20200423`, 251 `/system/login`. **È la superficie REST intera**,
  che finora ricostruivamo una chiamata alla volta;
- **`json/server_config.json`** — `serverURLDomain` (`https://api-s.sp.kingdomhearts.com`)
  e le tre stringhe di `systemStatusUpdate*` (la chiave per l'URL cifrato di
  `/system/status`);
- **`info/`** — `version` 4.3.1, `build`, `commit`, `lang`, `dark_resource` 10, e:
  - `info/tutorial_master` = **`85883`**: non un master, ma il **numero di revisione**
    dei dati del tutorial;
  - `info/obb/main` e `info/obb/patch`: gli **MD5 di due file OBB**, i pacchetti di
    espansione di Google Play, che **non sono nell'APK**. Con ogni probabilità i dati
    master del tutorial (e molte risorse) stanno lì.

I file estratti restano su `D:\Progetto_Restauro_KH_UX\assets431\` (dati di Square Enix:
non vanno nel repository).

**Le altre richieste di download**, vicine nel binario e non ancora viste in rete:
`FUN_711df8` (`revision`, probabilmente le risorse), `FUN_712100` (`resourceIds`),
`FUN_712770` (`notUpdate`), `FUN_715fb8` (le revisioni senza `resoMode`). L'ID d'azione
non è una costante: sta nell'oggetto richiesta (`+0x28`) e lo imposta il costruttore.
La scena è `SceneDownload::callDownloadAPI`, il dialogo `DownloadSelectDialog::callPrepareAPI`.

**In tutte le risposte `maintenance` va omesso.** Il client controlla che il suo tipo
JSON sia null; anche `0` vale come manutenzione attiva e porta al popup con `viewUrl`.
Il vecchio server mandava `maintenance: 0`: era sbagliato.

**Il canale cifrato funziona con la nostra chiave.** Dal passo 4 il corpo è un form con
un solo campo, `v=<base64>`, e `<base64>` è **AES-256-CBC del JSON, IV a zero, senza
Base64 interno** (strategia `zero+noInnerB64` di `khux-codec.js`). Il server ora toglie
l'involucro `v=` e registra il JSON decifrato. Il primo, da `/system/login`:

```json
{"length":33089376,"digest":"a8bcd7218e83fb9913d6d3f7da2f3866","ruv":713458956,
 "deviceType":2,"systemVersion":"28","appVersion":"4.3.1"}
```

`length` è esattamente la dimensione di `libcocos2dcpp.so`: `digest` è con ogni
probabilità il suo MD5, cioè un controllo d'integrità del client fatto **dal server**. A
noi basta accettarlo. `ruv` arriva da `FUN_007bc5c8`, che costruisce ogni richiesta
di gioco e aggiunge l'header `X-Sqex-Hole-Retry: %d` (e `X-Sqex-Hole-Nsid` da
`FUN_007bccec`).

**Le risposte di gioco vanno in chiaro.** `RESTClient::onRespond` (`FUN_00774fa0`)
sceglie in base al Content-Type, cercato come **sottostringa**: `application/json` o
`text/javascript` → parse diretto; `application/encoded-json` o `application/octet-stream`
→ decifratura (`FUN_00771b3c`); altro → errore di trasporto 2. Il nostro
`application/json; charset=utf-8` va bene: la cifratura serve solo alle richieste.

**L'involucro `ret`, comune a tutte le risposte di gioco** (`FUN_0077eb98`, chiamato dal
gestore generico `FUN_007bcf68`). Il client legge i campi in quest'ordine e al primo tipo
sbagliato scarta la risposta: errore 2, che a schermo diventa `200 ERROR :<azione>`.
I tipi seguono il rapidjson di cocos2d (`kBoolFlag 0x100`, `kIntFlag 0x400`,
`kUintFlag 0x800`, `kStringFlag 0x100000`).

| Campo | Tipo |
|---|---|
| `isMaintenance`, `isPhotonMaintenance`, `isKhuxMaintenance`, `isDarkMaintenance`, `sessionTO` | bool |
| `isNewDayPeriod` | int |
| `isRetry` | bool |
| `versionApp` | stringa — confrontata con la versione dell'app (`FUN_0085dca0`) |
| `versionRes`, `versionResLow`, `versionDat`, `commonVersionDat`, `darkVersionRes`, `darkVersionDat`, `functionFlags` | int |
| `serverTime` | stringa `YYYY-MM-DD HH:MM:SS` (`FUN_007197ec`: separatori `- - spazio : :`, anno ≥ 1000) |
| `error` (+ `viewUrl`), `isCommunicationMaintenance` | facoltativi |

**Il controllo per azione, `FUN_007c3204`.** È uno switch su 320 azioni, troppo grande
per il decompilatore: la tabella di salto sta a `0x177e414`, con indice `id-1` e valori
relativi alla tabella. I rami si leggono con `recon/ghidra/khux_listing.py`, che
disassembla anche il codice raggiunto solo da tabelle non ricostruite. Il ramo
dell'azione N chiama uno o più parser; se uno restituisce null → errore 2.

**Risposta a `/system/login` (azione 251).** Oltre a `ret`:
- `systemLogin`: `{"newcomerKhux": bool, "newcomerDark": bool}` (`FUN_0077f650`);
- `data`: array di **almeno 4 stringhe Base64** (`FUN_0077f830`, decodifica con
  `cocos2d::base64Decode` = `FUN_013553dc`), da **8, 32, 32 e 32 byte**. Sembrano un
  seme e tre chiavi da 256 bit; a cosa servano non è ancora noto. Il server le genera
  casuali, stabili per la vita del processo;
- 21 stringhe di link (`FUN_00791070`): `support`, `register`, `update`, `help`, `staff`,
  `agreement`, `license`, `shikin`, `tokutei`, `store`, `odds`, `petOdds`, `appUpdate`,
  `officialSite`, `officialTwitter`, `movie`, `beginnersGuide`, `passiveSettingList`,
  `darkHelp`, `darkOdds`, `officialTwitterCustom`. Vuote bastano.

**Risposta a `/system/coppa` (azione 26).** Oltre a `ret`, `misc`: un oggetto di **interi
senza segno** con chiavi `"116"`, `"804"`, `"900"`…`"907"` (`FUN_00778b64`). Significato
ignoto; 0 va bene. Le GET portano il payload cifrato nella query (`?m=0&v=…`), e il server
ora lo decifra come un corpo.

Strumenti usati, rifacibili in pochi minuti: le stringhe per funzione con
`recon/tools/codeindex.py` (intervallo `0x6b9000–0x6bf000`), poi la decompilazione
headless sul progetto Ghidra esistente (`-process … -noanalysis -readOnly`) con un
post-script che stampa il C delle funzioni richieste. JDK: il JBR di Android Studio.

Rumore da ignorare nel log DNS: con il DNS di Windows sul server compaiono anche le
query del PC (Microsoft, Discord, NVIDIA…) e quelle di LDPlayer (`ldmnq.com`,
`ldplayer.net`, `changzhi.top`). Le app di Google nel guest falliscono con
`ERR_CERT_DATE_INVALID` per l'orologio al 2021: atteso, non riguarda il gioco.

**Leggere la memoria del client vivo lo uccide: `ErrorCode = 17471875`.** È la
*memory protection* di LIAPP che vede le letture di `/proc/<pid>/mem`, anche da root.
Sul processo vivo il dump non è praticabile; i dump fatti su MuMu non arrivano alla
fase del bootstrap (LIAPP li ferma prima), e contengono solo i domini del nostro
`network_security_config`.

**Strumenti sistemati stasera:**
- `start-server.bat` **si chiudeva subito**: il `^|` dentro le virgolette arrivava
  letterale a PowerShell (IP vuoto), e il ripiego `set /p … (es. …):` chiudeva in
  anticipo il blocco `if` con la sua `)`, facendo abortire `cmd` prima del `pause`. Ora
  il rilevamento dell'IP sta in `server/lan-ip.ps1`. **Non servono privilegi di
  amministratore**: su Windows le porte 53/80/443 si aprono anche senza;
- `server/make-cert.sh` ora **retrodata** CA e certificato (default `notBefore` 1/1/2020,
  `notAfter` 2035) con `openssl ca -startdate`: con l'orologio del guest nel 2021 un
  certificato emesso «oggi» non sarebbe ancora valido;
- `server.js` registra lo **SNI** di ogni connessione TLS (`[tls:sni]`) e gli errori di
  handshake (`[tls:errore]`): serve a vedere quale host il client voleva anche quando il
  DNS non passa da noi;
- `tools/ldplayer/phaseb-guest.sh` rifà in un colpo la preparazione del guest (CA di
  sistema in tmpfs, dirottamento TCP 80/443 dell'uid del gioco, orologio a maggio 2021).
  Va rieseguito a ogni riavvio dell'istanza.

**Dump dell'originale (`orig1`, MuMu Android 12, 196 MB in
`D:\Progetto_Restauro_KH_UX\dumps\orig1`).** Il congelamento con `SIGSTOP` non scatena
l'anti-debug: il rapporto catturato è `13380225`. A differenza del dump del patchato, **il
testo del rapporto non resta in chiaro** (niente `ErrorCode`, niente data). Resta invece
la **struttura del verdetto**, una sola copia in memoria anonima:

```
+0x00  ... 3891 (pid)
+0x10  00 00 00 01 | 81 2a cc 00 (= 13380225) | 2a 71 c6 6a (= timestamp del rapporto)
+0x20  "004c4ba4-013462e6-07fbaf1b" "10e43769-37d456dc-68c25102" ...  (le triplette)
       ... "Samsung" ... "SM-A156E" ... "12"
```

Nessuna stringa di motivazione accanto al codice. `13380225` = `0x00CC2A81` **non ha
riscontri pubblici** (cercato in decimale ed esadecimale).

L'APK originale verificato (SHA-256 `3be176ab…985b`, uguale a quello pubblicato da
APKMirror, firma Square Enix v3 `f7b60074`) è in `D:\Progetto_Restauro_KH_UX\apk\
khux-4.3.1-original.apk`.

- **La memory protection** spiega perché, provando a fotografare a raffica il segmento di
  codice del protector (`snap.sh`), la regione risultava **azzerata**: LIAPP ripulisce il
  codice decifrato appena fiuta un accesso. Il dump a processo congelato (`capture.ps1`)
  riesce lo stesso perché fotografa prima che la pulizia parta.

Strumenti nuovi per l'indagine, in `recon/tools/memdump/`: `snap.sh` (fotografa a raffica
una regione dal processo vivo) e `trace.sh` (strace statico x86_64 agganciato a
`zygote64`; sotto houdini ogni `svc` del codice ARM diventa una syscall vera, quindi
strace vede anche le chiamate diffuse del protector). Con `trace.sh` abbiamo visto la
scrittura del verdetto: `openat(... l5Xzi1ZFinmQC.txt, O_RDWR|O_CREAT)` →
`write("90\n<ts>\n0\n<pid>\n")` → `fchmod 0644`, subito prima dell'`abort`. Il file viene
prima **letto** più volte in sola lettura e poi **riscritto**: non è una cache del
verdetto (cancellarlo e rilanciare dà di nuovo 90, verificato).

### MuMu Player: il protector gira davvero, e su Android 15 rifiuta

Provato il 7 ottobre 2026: MuMu Player 6.8, istanza Android 15. Si presenta come un
Samsung SM-A156E, con `abilist` `x86_64,arm64-v8a,x86`. Il traduttore ARM è
**`libhoudini.so`** v7, caricato da `libnb.so`: è quello di Intel, non
`libndk_translation` di Google.

**Houdini esegue il protector fino in fondo**: si decifra, gira e produce il suo
rapporto. È esattamente ciò che `libndk_translation` non riusciva a fare
(`HandleNoExec`). A 1 s dall'avvio:

```
E error : ErrorCode = 90
E error : Samsung / SM-A156E / 15
E error : 004c4ba4-013462e6-07fbaf1b      <- identica al Galaxy A54
F libc  : Fatal signal 6 (SIGABRT) ... abort+0
```

**Rifiutano anche Android 12 e 15.** L'istanza Android 12 ha lo stesso
`ErrorCode = 90` e la stessa prima tripletta, a circa 0,7 s dall'avvio. Prima del
rifiuto **non c'è nessuna attività di rete**: il controllo è locale.

Rifiutano quindi **Android 12, 15 e 16**, su due dispositivi diversi (Galaxy A54
fisico, MuMu che si spaccia per SM-A156E), con l'APK patchato e, sul telefono, anche
con quello originale.

| Ipotesi | Esito |
|---|---|
| L'installazione via `adb`, senza Play Store come installer | ❌ reinstallato con `adb install -i com.android.vending`: `installerPackageName=com.android.vending`, stesso `ErrorCode = 90` |
| Emulatore riconosciuto come tale | improbabile: stesso codice del telefono vero |
| Versione di Android | ❌ **esclusa**: rifiuta anche **Android 9**, su LDPlayer 9 (sotto) |

Conclusione: **MuMu è un banco valido**. Il protector ci gira e non lo tratta
diversamente da un telefono vero. Resta da capire *che cosa* controlla.

### LDPlayer 9: rifiuta anche Android 9, e la versione è esclusa

Provato il 7 ottobre 2026: LDPlayer 9.1.67 (Android 9, si presenta come ASUS
ASUS_AI2401_A), con `libhoudini` 9.0.7a. **Stesso `ErrorCode = 90`, stessa prima
tripletta.** Il rifiuto arriva dopo circa 30 s invece che dopo 1 s, perché LDPlayer 9 usa
VirtualBox, che con Hyper-V attivo (lo pretende MuMu) è lentissimo. Houdini segnala anche
che alla CPU virtuale mancano `AES`, `POPCNT` e `PCLMULQDQ`.

Rifiutano quindi **Android 9, 12, 15 e 16**, su tre dispositivi. Note pratiche, se si
torna su LDPlayer:

- il debug ADB è spento di default: va aggiunto `"basicSettings.adbDebug": 1` in
  `vms\config\leidian0.config` **a istanza spenta**, perché LDPlayer riscrive il file
  quando la chiude. Poi `adb connect 127.0.0.1:5555`;
- più server `adb` di versioni diverse (SDK, MuMu, LDPlayer) si chiudono a vicenda: tenerne
  attivo uno solo;
- il link «LDPlayer 9» del sito installa **LDPlayer 14**. Il pacchetto vero sta su
  `https://res.ldrescdn.com/download/package/LDPlayer9.0.exe`.

Come si usa, da riga di comando: `<mumu>\nx_main\MuMuManager.exe` crea e avvia le
istanze, per esempio `info -v all` e `control -v 0 launch`. `adb` è in
`<mumu>\nx_main\adb.exe`, sulla porta 16384 per l'istanza 0 (la dà `info`). Il motore
Android 12 non è preinstallato: `create --version 12` risponde
`android engine not installed`, e `upgrade` non può scendere da 15 a 12. Va scaricato
dall'interfaccia grafica: gestore multi-istanza → nuova istanza → Android 12.

### Le vie d'uscita

Il fatto solido: **il protector rifiuta con il codice 90 su Android 9, 12, 15 e 16**,
su tre dispositivi, in modo locale e prima della rete. **La versione di Android non è
la causa**, e quindi cercare un banco più vecchio non serve. Esclusi anche l'orologio,
con la data di maggio 2021, l'installer, e emulatore contro telefono.

Il banco ora c'è: **MuMu Player con root**. Il blocco non è più trovare dove far girare
il client, ma **capire che cosa controlla il protector**. La strada è il dump della
memoria del protector decifrato, vedi «Dump della memoria del protector». Su MuMu le
condizioni che mancavano ci sono tutte: root, `/proc/<pid>/mem`, e soprattutto un
traduttore che esegue davvero il codice ARM, per circa 1 s prima dell'abort.

> **✅ Risolto il 7 ottobre 2026: su Android 9 il client parte** (LDPlayer 9, APK
> originale) — vedi «Android 9: il client parte». Il prossimo passo è dare rete al guest e
> puntarlo al nostro server (DNS), per catturare la superficie REST e il bootstrap. Le note
> sotto restano come storia del percorso.
>
> **Provato e smentito: il telefono pulito col debug USB spento.** L'APK originale rifiuta
> lo stesso con `13380225` (vedi «Mappa dei codici LIAPP»). Da qui in poi **i test vanno
> fatti solo con l'APK originale**: il patchato si ferma all'anti-repackaging (`90`) e
> nasconde tutto il resto. Siccome `13380225` è identico su telefono e su MuMu, **MuMu
> resta un banco fedele** per studiarlo, con root e senza bisogno del telefono. Evitare
> lo strace per misurare il codice: l'anti-debug lo trasforma in `40`.

1. ~~**Immagine arm64 vera sull'emulatore.**~~ — ❌ su host x86 non boota, vedi
   «L'immagine arm64 su host x86».
2. **Emulatore per giocare** — ✅ **fatto**. MuMu Player esegue il protector ed è il
   banco da usare: è veloce e ha il root. Rifiutano Android 9 (LDPlayer), 12 e 15
   (MuMu). Vedi sopra.
3. **Dispositivo fisico Android 10–13, arm64.** Il banco pulito: nessuna ambiguità di
   emulazione. Un usato costa poco, e se è **rootabile** il dump del protector arriva in
   omaggio — vedi la sezione sul dump.
4. **Device farm in cloud** (Firebase Test Lab, BrowserStack): hardware reale con Android
   vecchio, senza comprare nulla. **Comporta però caricare l'APK su un servizio di
   terzi**, che è una scelta da fare consapevolmente.
5. **Chiedere a Restoration Union e alle community di preservazione KHUX.** Costo tecnico
   zero, e con ogni probabilità qualcuno *sa già* su quali versioni di Android parte: è
   esattamente l'informazione che stiamo cercando di comprare con ore di lavoro. Era già
   suggerito nel REPORT fin dalla fase 2 e non è mai stato fatto. Va fatto comunque, in
   parallelo a qualunque altra strada.

~~Emulatore con immagine x86~~ — esaurito, vedi la tabella sopra.
~~Emulatore con immagine arm64~~ — esaurito su host x86, vedi sopra.

Nota per la device farm: il test completo richiede anche che il client raggiunga il
nostro server. In cloud non si può cambiare il DNS del dispositivo, quindi lì si
risponde solo alla domanda «il protector rifiuta su questa versione?», non si cattura
la superficie REST.

Il test, su qualunque banco, è di un minuto: se il gioco parte, le righe `E error` non
compaiono.

---

## 3. Preparare la nuova macchina

### Prerequisiti

| | Perché |
|---|---|
| **Node.js** | il server; nessuna dipendenza da installare |
| **Python 3** | gli strumenti in `recon/tools/`; nessuna dipendenza |
| **Git Bash** o WSL | gli script `.sh` |
| **JDK 17+** | apktool |
| **JDK 21+** | Ghidra 12 lo pretende, e rifiuta di partire con meno. Se non c'è, il JBR di Android Studio (`<studio>/jbr`) è un JDK completo e recente: basta puntarci `JAVA_HOME` |
| **Android Studio** | per `adb` |
| OpenSSL | di solito incluso in Git Bash |

### Clonare

```bash
git clone https://github.com/Kxos/KH-UX-Dark-Road-Restoration.git
cd KH-UX-Dark-Road-Restoration
```

### Riscaricare il materiale (non versionato, di proposito)

**Client WW 4.3.1** — l'ultima build pienamente online, aprile 2021, da APKMirror:
<https://www.apkmirror.com/apk/square-enix-inc/kingdom-hearts-unchained/kingdom-hearts-unchained-4-3-1-release/>

Scegli la variante con `arm64-v8a`. Mettilo in `recon/dl/`.

> Il materiale pesante (APK, immagini di sistema, dump) può anche stare fuori dal
> repository, su un disco con spazio. Gli script prendono i percorsi come argomenti.
> Sulla postazione di sviluppo attuale sta in `D:\Progetto_Restauro_KH_UX\`: l'APK
> patchato è in `apk\`, MuMu Player in `MuMuPlayer\` (spostato dopo l'installazione, con
> una junction al vecchio percorso `D:\Program Files\Netease\MuMuPlayer`). L'SDK
> Android è in `D:\Programmi\Android\SDK`.
**Evita la 4.4.0**: è di giugno 2021, dopo la chiusura del 30 maggio, quindi già una
build di transizione.

Estrai la libreria nativa:

```bash
mkdir -p recon/ext/ww431
unzip -o -j "recon/dl/<apk>" "lib/arm64-v8a/libcocos2dcpp.so" -d recon/ext/ww431/
```

**I due jar** in `tools/bin/`, rinominati così:

- `apktool.jar` — <https://github.com/iBotPeaches/Apktool/releases>
- `uber-apk-signer.jar` — <https://github.com/patrickfav/uber-apk-signer/releases>

### Un AVD senza `avdmanager`

Se l'SDK non ha i *cmdline-tools*, `avdmanager` e `sdkmanager` non ci sono — ma un AVD è
solo due file di testo, e l'emulatore basta che li trovi. Scegli l'immagine guardando
prima la tabella delle ABI in §2 — **API 30 Google APIs x86_64** è l'unica x86 che
installi l'APK — poi in `~/.android/avd/`:

`khux30.ini`

```ini
avd.ini.encoding=UTF-8
path=<home>/.android/avd/khux30.avd
path.rel=avd/khux30.avd
target=android-30
```

`khux30.avd/config.ini`

```ini
AvdId=khux30
abi.type=x86_64
hw.cpu.arch=x86_64
image.sysdir.1=system-images/android-30/google_apis/x86_64/
image.androidVersion.api=30
tag.id=google_apis
hw.device.name=pixel_3
hw.ramSize=4096
hw.gpu.enabled=yes
hw.gpu.mode=auto
disk.dataPartition.size=8589934592
PlayStore.enabled=false
```

```bash
ANDROID_SDK_ROOT=<sdk> "$SDK/emulator/emulator" -avd khux30 -no-snapshot -no-boot-anim
```

Con due dispositivi collegati, **ogni comando `adb` vuole `-s`** (`-s emulator-5554`
oppure il seriale del telefono), altrimenti rifiuta.

**Ghidra** (solo se riprendi l'analisi statica) — estrai in un percorso **senza spazi**,
tipo `C:\ghidra\`: <https://github.com/NationalSecurityAgency/ghidra/releases>

> Ghidra 12 non include più Jython, e i nostri script lo usano. Installa l'estensione,
> che è già dentro lo zip scaricato:
> ```bash
> unzip -o "$GHIDRA_HOME/Extensions/Ghidra/"*Jython.zip -d "$GHIDRA_HOME/Ghidra/Extensions/"
> ```

### Rigenerare

```bash
bash server/make-cert.sh <ip-locale>
```

I certificati **vanno rigenerati**: contengono l'IP della macchina, che sarà diverso.
Trovalo con `ipconfig`, oppure avvia `start-server.bat`, che lo rileva e lo stampa.

```bash
bash tools/patch-apk.sh "recon/dl/<apk>" <ip-locale>
```

Produce `recon/ext/patched/khux-patched-aligned-debugSigned.apk`.

---

## 4. Eseguire

### Server

```
start-server.bat        (doppio clic)
```

Rileva l'IP da solo (`server/lan-ip.ps1`) e avvia HTTP, HTTPS e DNS sulle porte 80, 443 e
53. Su Windows non servono privilegi di amministratore. Devi vedere tre righe di ascolto.

### Rete — i tre inciampi incontrati su Windows

1. **VPN attive** dirottano il routing: il telefono non raggiunge il PC. Spegnerle.
2. **La porta 53 può essere occupata** dalla Condivisione connessione Internet, che
   Hyper-V e WSL avviano da soli. `Stop-Service SharedAccess` da amministratore;
   riattivala dopo con `Start-Service SharedAccess`.
3. **Profilo di rete "Pubblica"**: il firewall blocca gli ingressi. Servono regole:
   ```powershell
   New-NetFirewallRule -DisplayName "KHUX server" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80,443 -Profile Any
   New-NetFirewallRule -DisplayName "KHUX DNS" -Direction Inbound -Action Allow -Protocol UDP -LocalPort 53 -Profile Any
   ```

Su una rete domestica il punto 1 sparisce e il 3 è probabile che non si presenti.

### Telefono

1. Disinstalla l'app esistente — la firma è diversa, non si sovrascrive
2. Installa l'APK ripacchettizzato
3. Installa `server/certs/ca.crt` come **certificato CA utente**
   (Impostazioni → Sicurezza → Credenziali → Installa certificato → Certificato CA)
4. DNS della Wi-Fi → l'IP del PC
5. Apri il gioco e guarda la console

### Cosa leggere nella console

| | |
|---|---|
| `[dns:dirottata]` | il client sta risolvendo i nostri host |
| `[dns]` | query inoltrate a monte — **qui compare l'host vero del bootstrap** |
| `[ok]` | il client ha accettato le nostre risposte |
| `[?]` | endpoint sconosciuto, corpo già decifrato — **è il materiale da raccogliere** |

Se vedi query DNS ma nessuna richiesta HTTP: il client contatta un host che non
dirottiamo (aggiungilo a `KHUX_HIJACK`), oppure rifiuta il certificato.

---

## 5. Ghidra: non rifare l'analisi a vuoto

> **Prima di aprirlo, controlla se serve davvero.** Gli strumenti in `recon/tools/`
> (`vtables.py`, `codeindex.py`) fanno sull'ELF, in Python puro e in pochi secondi,
> buona parte di ciò per cui era nato questo progetto Ghidra: confini di tutte le
> 87.437 funzioni, xref sulle stringhe, vtable per RTTI. La fase C è stata fatta
> interamente così. Ghidra resta utile per ciò che richiede il **decompilato** —
> per esempio la tipizzazione dei campi, che da sole le stringhe non danno.

Il progetto Ghidra (829 MB) non è versionato. La prima analisi del binario da 33 MB
richiede 45–120 minuti:

```
recon\ghidra\run-ww.bat
```

**Dopo di che, ogni nuova idea di estrazione costa minuti, non ore**, perché il progetto
resta salvato e si rilancia con `-process`:

```bash
"$GHIDRA_HOME/support/analyzeHeadless.bat" \
  "<repo>\recon\ghidra\project" khux-ww431 \
  -process libcocos2dcpp.so -noanalysis \
  -scriptPath "<repo>\recon\ghidra" \
  -postScript <script>.py "<repo>\recon\ghidra\out\<nome>"
```

| Script | |
|---|---|
| `khux_apixref.py` | livello API per xref sulle stringhe — **l'approccio che funziona** |
| `khux_callers.py` | risale il grafo delle chiamate da una funzione |
| `khux_recon.py` | ricerca per nome — **inefficace su questo binario, è strippato al 95%** |

Comprimi i risultati prima di leggerli:

```bash
python recon/tools/digest.py recon/ghidra/out/<nome>
```

---

## 6. Prossimi passi, in ordine

1. ~~**Il backtrace del tombstone.**~~ — ✅ **risolto**, ma non dal tombstone: è il
   protector, e lo dice lui stesso nel buffer principale di logcat. Vedi §2.
2. ~~**Capire che cosa fa rifiutare il protector.**~~ — ✅ **risolto il 7 ottobre 2026.**
   È LIAPP; il `90` era l'anti-repackaging del nostro APK patchato, e l'originale rifiuta
   (`13380225`) solo su Android ≥ 12. **Su LDPlayer 9 (Android 9) con l'APK originale il
   client arriva al titolo**, e la rete del guest funziona. Vedi §2, «Android 9: il
   client parte».
3. **Fase B sul banco LDPlayer 9** — in corso, vedi §2 «Fase B sul banco LDPlayer 9»:
   a) ✅ server avviato (`start-server.bat`, non servono privilegi), certificati
   retrodatati, SNI registrato;
   b) ✅ CA di sistema nel guest, TCP 80/443 del gioco dirottato al PC, orologio a maggio
   2021 — tutto con `tools/ldplayer/phaseb-guest.sh`;
   c) ✅ il client **tenta il bootstrap**, ma fallisce con `6 ERROR :251` (host non
   risolvibile: il nome non esiste più nel DNS pubblico);
   d) ✅ DNS del guest al nostro server (DNS di Windows sull'IP LAN, DNS privato del
   guest spento): l'host di bootstrap è **`api-s.sp.kingdomhearts.com`**, prima chiamata
   `PUT /system/status` — vedi §2 «Fase B — 8 ottobre»;
   e) ✅ status, token e sessione implementati dal decompilato; il client accetta la
   nostra chiave e la sua prima richiesta cifrata (`/system/login`) si decifra;
   f) ✅ `/system/login` e `/system/coppa` implementati: **il client arriva alla schermata
   del titolo servito dal nostro server**;
   g) ✅ KHUX START → contratto → data di nascita → `resourcesize` (`size: 0`) → **il
   filmato introduttivo parte**;
   h) ❌ **dopo il filmato il client va in crash: non ha dati master né risorse** (vedi
   «Perché il crash» in §2);
   i) ✅ **protocollo dei dati master ricavato** (§2, «Il protocollo di download»): le
   revisioni in `ret` avviano il download, l'azione 27 (`/system/master`) restituisce
   per ognuna delle 106 tabelle `url` + `key` AES + `md5`, e ogni tabella è un file JSON
   cifrato;
   j) ✅ **pacchetti di asset decifrati** (`recon/tools/bgad.py`): in `misc.mp4` c'è
   **`json/server_api.json`, la tabella di tutte le 321 azioni**. `info/tutorial_master`
   è solo la revisione (`85883`); i dati veri stanno quasi certamente nei **file OBB**
   (`info/obb/main`, `info/obb/patch`: due MD5), che non sono nell'APK;
   k) **OBB: APKMirror non li ha** (verificato l'8 ottobre 2026). Per la 4.3.1 c'è una sola
   variante, l'APK che già usiamo (versionCode 72, arm64-v8a + armeabi-v7a, nodpi); in
   tutte le release, dalla 4.0.0 alla 5.0.1, nessun bundle né XAPK. Che il client li usi
   è certo: `BGObbFileManager` (`mount`, `onDownloaded`, `launchDownloader`),
   `SceneTitle::prepareInit` e `SceneTitle::downloadObb` nella libreria, e la libreria
   Google *APK Expansion* (`/Android/obb/`) nel dex. Sul banco `/sdcard/Android/obb/` non
   esiste e il client arriva lo stesso al filmato: gli OBB servono più avanti, forse
   proprio ai dati del tutorial (ipotesi da verificare: il crash dopo il filmato potrebbe
   dipendere anche da loro; *poi smentita: gli OBB sono i dati di Dark Road*). Nomi
   attesi, corretti dopo: `main.60.com.square_enix.android_googleplay.khuxww.obb`
   e `patch.69.….obb`, MD5 `610e8ecd0187b5e9eb93963c8cd9d6d3` e
   `f4dd5699e567e0af8de7846703bc2ce5`. **Restano da cercare presso le comunità di
   preservazione** (Restoration Union e simili);
   l) ✅ **formato di trasporto dei file master verificato sul banco**: il client scarica
   e salva una tabella servita da noi (§2, «Il formato dei file master»).
   m) ✅ **forma e tipi di tutte le 106 tabelle** (§2, «Il contenuto delle tabelle
   master»): array di righe con tutti i campi, tipi esatti; schema in
   `recon/out/master_types_ww431.json`, validato dal server, confermato sul banco con
   una prova positiva e una negativa.
   n) ✅ **oltre il filmato** (§2, «Oltre il filmato con tabelle minime»): 106 tabelle
   minime (`server/make-master-stub.js`) e 98 id di `misc`. Il gioco arriva alla
   **registrazione del nome**; il crash successivo, all'editor avatar, è per una
   **risorsa grafica assente** (`AvatarEditAnim.ExportJson`), che non sta nell'APK.
   o) ✅ **protocollo di download delle risorse** (§2, «Il protocollo di download
   delle risorse»): azione 28 e formato della risposta, controlli del downloader,
   installazione in `files/r/misc.mp4` + `misc.png`. Provato sul banco con un
   giocatore esistente: il client scarica i file che serviamo. Si ferma al controllo
   dell'indice, che vuole i record `md5` e `size` dei file originali del CDN.
   **Prossimo:** due strade, non alternative:
   - gli **OBB** (comunità di preservazione), indispensabili per un nuovo giocatore
     (tutorial ed editor avatar);
   - eventuali **archivi del CDN delle risorse** (`misc.mp4`/`misc.png` con indice
     completo), che il server sa già servire.

   p) ✅ **la chiave dei record `md5`/`size` è `data[3]` di `/system/login`**: il
   server la sceglie, `resource_index.py` costruisce l'indice, e sul banco l'indice
   viene accettato (niente «Save error»). Il crash successivo, a `0x12c1ee0`, è nella
   scena dopo il download.
   t) ✅ **OBB 5.0.1 scaricati, verificati e serviti** (§2, «Gli OBB 5.0.1 serviti al
   client 4.3.1»): chiave dell'indice trovata nella 5.0.1, OBB serviti come risorse
   KHUX, montati dal client 4.3.1. L'editor avatar ora carica la sua grafica e va in
   crash più avanti. **Prossimo:** quel crash (`avatarParts` vuota o layout 5.0.1) e i
   dati di gioco (fase D).
   s) ✅ **catena di avvio completa** (§2, «La catena di avvio completa»): oltre 30
   API accettate. Il client arriva a `StartDeckEditDialog::startStory`, cioè avvia il
   primo stage della storia. **Prossimo:** dati di gioco veri (fase D: stage, medaglie,
   keyblade, inventario iniziale) e OBB.
   r) ✅ **`GET /user` e `/user/chat` accettate** (§2, «I dati del giocatore»), con
   strumenti per ricavare gli schemi di risposta e un server che genera le risposte
   minime dagli schemi. **Prossimo:** `GET /party` (azione 83) e le chiamate che seguono.
   q) ✅ **oltre il download**: con `versionRes` uguale all'ultima versione servita il
   giocatore esistente arriva a `PUT /user/awakening` e `GET /user`. **Prossimo:** la
   risposta di `GET /user` (azione 1), oppure gli OBB 5.0.1 da Internet Archive
   (compatibilità con la 4.3.1 da verificare).
   **Prossimo:** la forma del JSON dentro le tabelle, partendo da una piccola. Intanto: usare
   `server_api.json` nel server per dare un nome a ogni azione nei log, e capire la
   cifratura dei file master scaricati (`key` di 32 byte: probabilmente lo stesso
   ChaCha8). In parallelo, il download delle **risorse** (`FUN_711df8`/`FUN_712100`).
   Per le chiamate successive vale lo
   stesso metodo: leggere `200 ERROR :<azione>`, trovare il ramo dell'azione nella
   tabella di `FUN_007c3204`, decompilare i suoi parser, implementare la risposta.
   A fine sessione: rimettere il DNS di Windows su automatico.
4. ~~**Fase C**, i campi delle 54 tabelle `master::`~~ — ✅ **fatta**, e senza Ghidra:
   107 classi per RTTI, 1.739 campi, ~3 secondi. Vedi [PHASE-C.md](PHASE-C.md).
   Resta aperta solo la **tipizzazione** dei campi: i nomi e l'ordine ci sono, i tipi no.
5. **Fase D**, ora sbloccata: definire lo schema del DB dai campi estratti e popolarlo
   da khuxwiki.com.

---

## 7. Regola del repository

Solo codice e documentazione originali. Mai APK, asset, audio, master data di Square
Enix, né decompilato: `.gitignore` li esclude. Progetto non commerciale, a scopo di
preservazione.
