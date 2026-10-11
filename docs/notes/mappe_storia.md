# Missioni di storia e mappe generate

Storia: [../journal/fino-al-2026-10-11.md](../journal/fino-al-2026-10-11.md) («Mappe generate e
risorse aggiuntive», «Missioni di storia in automatico»). Documenti degli agenti in
`D:\Progetto_Restauro_KH_UX\stage_gen\` (`exits\NOTE.md`, `reach\REPORT.md`, `multiroom\`,
`story\`, `quest_thumbs\`).

<a id="dati"></a>
## Dati delle missioni

- Missioni di storia = `stageBinId` 1..525 delle righe di thethiny (`stage_dec`, 1.140 stage; nessun
  buco; la versione finale arrivava a 979, i dati oltre la 525 non ci sono: ISSUES I-009).
  `make-game-tables.js` le unisce al master `stage` (campi assenti derivati).
- `wiki_quests.py` -> `quests.json` (978 missioni 1-979 con obiettivi, premi, tesori e nemici per
  stanza; parser dei nemici `{{EN|...}}` annidati da correggere). wikiwiki.jp/khux ha le missioni
  1-750 (AP, bersaglio, Lv, obiettivi, premi): utile per controllare le righe.
- Lista STORY: `/stage/160310` (108) `stories[]` (`FUN_0079e794`: `stageId`, `useAp`, `score`,
  `playStatus`, `clearMissionIds` <= 3), `newStageId`, `luxRank`, `openRankingId`. Tornando alla
  lista `FUN_006e94ec` apre l'intestazione STG della **missione successiva** e cerca il suo
  bersaglio nella tabella `enemy`: un'intestazione mancante = crash.
- Miniature dell'elenco Story sfalsate: lavoro in corso (`stage_gen\quest_thumbs`, ISSUES I-003).

<a id="formato"></a>
## Formato STG e MAP

- `stage/mappoi_stg<id>.bin` = intestazione `STG`: [2] parti | (parte di partenza << 16), [3,4]
  partenza, [5] verso iniziale, [6] bersaglio, [8] aree, [9] nemici, [10] enemyId della scheda
  bersaglio, [11] bonus di livello, [14] forzieri, [15] oggetti.
- Ogni parte `mappoi_stg<id>_NN.bin` = file `MAP` della stanza (parser `FUN_00e5f6e8`): `+0x24` X
  (inizio dati), `+0x28/+0x2c/+0x30` posizioni delle sezioni dopo i nemici meno 0x34; `X+0x34`
  aree, `X+0x38` nemici; aree da 0x44 (`[0]` primo nemico, `[1]` quanti), nemici da 0x20 (`x, y,
  enemyId, 1, 1, 1, reward, uid`), forzieri da 0x14 (`x, y, reward, tipo, uid`; sezione `+0x28` letta
  da `FUN_00e60f28`), oggetti da 0x10. Il nome della stanza (`DB_0000_00_00`...) e' dentro la parte.
- **Uscite**: blocco a +0x34 di ogni parte (u32 n + n record da 9 interi: x, y, angolo della
  freccia, distanza, avanti/indietro, x/y di arrivo, parte di destinazione, verso; X = 4 + 36n),
  scattano entro 96 unita'. La sezione C sono attori evento (tipo 0xb), non uscite.
- `uid` di aree, nemici e forzieri **globali fra le parti**; e' lo spazio di id di `userTreasures`/
  `userEnemyDropItems` e di `getTreasures`/`getEnemyDropItems`.
- Collisione: `map/<stanza>/<stanza>_cls.bin` ('CLS', larghezza, altezza, byte per riga, 1 bit per
  pixel, bit alto a sinistra, 0 = percorribile).
- Le mappe originali dopo il tutorial arrivavano dal CDN: non si trovano (solo 1010-1040 nelle
  risorse).

<a id="generatore"></a>
## Generatore

- `recon/tools/gen_story_maps.py <stage_gen\story_cfg.json>` (~3 s): per ogni missione stanza da
  `recon/tools/story_rooms.json` (84 stanze verificate) o una dello stesso mondo, nemici e tesori
  dalla wiki, posizioni sulla collisione. Con `"multiroom": true` una parte per stanza della wiki,
  uscite avanti e indietro, uid globali, bersaglio nell'ultima stanza (95 missioni: 86 da 2 parti, 9
  da 3). Con `cfg['poi']` scrive nemici e forzieri in `server/game_data/stage_poi.json` (aggiunge al
  file esistente: copiarlo prima in `reach\stage_poi.json`). Uscita in `stage_gen\story`, da copiare
  a mano in `stage_gen\files\stage` (non sovrascrive 1010-1050).
- `walk_grid` teneva solo punti con 80x80 libere: i corridoi da 33-80 spezzavano la griglia e si
  prendeva la sacca d'ingresso. Ora, se il pezzo arriva a meno di 0,4 della componente, distanze a
  piedi sui pixel (`geodesic`). 132 file / 88 stage rigenerati.
- `recon/tools/validate_maps.py <cartella stage> D:\Progetto_Restauro_KH_UX\maps_x --json r.json`
  (numpy/scipy): flood-fill sulla collisione (gioco 16, aggancio 48, avviso giri oltre 1,5x e 800
  unita'). 0 errori all'11 ottobre. 46 stage con giro >= 1,25 (`detour125.json`).
- Altri: `mappoi_gen.py <modello> <spec.json> <uscita>`, `mappoi_room.py` (stanza senza modello,
  spec es. `stage_gen\spec_1050.json`), `stage_poi.py` (POI delle mappe vere ->
  `server/game_data/stage_poi.json`), `server/check-stage-data.js [--verbose]` (controllo offline di
  reward, forzieri, materiali, confronto con la wiki: da eseguire dopo ogni modifica).

<a id="stanze"></a>
## Stanze

- 86 cartelle `map/` nelle risorse. Schema `XX_NNNN_VV_00` = Roboloid `<Mondo>_NNNN_VV` (VV =
  variante giorno/notte). Note: DB_0000 Fountain Square, DB_0004 1st District, DB_0004_01_00 2nd
  District, DW_0000 Flower Glade, DW_0001 Dark Forest: Entrance, **DW_0003 = Path to the Mine** (non
  Dwarf's Cottage). Prefissi: CS Game Central Station, HD Cy-Bug Sector, NL Niceland, SR Candy
  Kingdom, DG_0200 Corridor of Darkness, AG Agrabah.
- Copertura: 18 delle 86 stanze delle missioni 1-525 esatte, 154 missioni su 525 con tutte le stanze
  esatte. Mancano dalle risorse West Wing, Boardwalk, Market, Dwarf's Cottage, Waterfront Park,
  Avenue, Morning Dew Grove, Garden Maze... (sostituite con una stanza dello stesso mondo: ISSUES
  I-036). La missione 8 (1050) usa DW_0003.
- Roboloid ha 379 anteprime di stanze (`images/map`, solo riferimento).

<a id="nemici"></a>
## Nemici nelle mappe

- Grafica `lwf/character/enemy/<displayId>/` solo per 1, 6, 7, 8, 17, 37, 1020 (Shadow, Soldier,
  Large Body, Nosy Mole, Armored Knight, Dire Plant, Mega-Shadow) e le serie Dark Road 5001-5086,
  7001-7005, 8001-8022. `make-game-tables.js` assegna per nome la grafica Dark Road
  (`recon/tools/enemy_display_map.json`: 312 nemici, 51 grafiche) o un sostituto
  (`DISPLAY_SUBSTITUTE`, poi per taglia); displayId veri in `enemy_display_orig.json`.
  `make_enemy_moves.py` (nel build) crea `move` copiando `wait` (le grafiche Dark Road non hanno
  `move`).
- Effetto di comparsa `show_effect<showSwf>` presente solo per 1-4, 100, 501-506, 1000: gli altri ->
  quello dello Shadow. Obiettivi «Defeat <nemico>» su enemyId assenti -> Shadow.
- Missioni «zoo» (`KHUX_ZOO=1`, stage 990001.., copie della 1050 nella Fountain Square, aree da 5):
  un avvio verifica decine di nemici. Esito: 50 missioni su 51 partono (990018: tocco perso, da
  riprovare).
- Esempi Dark Road: 5002 Large Body, 5075 TopOperaY = Yellow Opera, 5054 Ifrit, 5063 Yeti, 5070
  Shiva, 8001 Flame Core, 5008 Bandit, 5004 Red Nocturne.

<a id="filmati"></a>
## Filmati e dialoghi

Filmati prima/dopo senza `img/light/SEQ/<id>.l` ne' `lwf/drama/<id>/` disattivati (base in
`stage_base.json`). Dei 116 filmati lwf (2xxxxxx) ne mancano 5 (tutti 2999951); i 175 dialoghi
(script SEQ 1xxxxxx) quasi tutti assenti: si tolgono gli id assenti (ISSUES I-014).

<a id="prove"></a>
## Prove sul banco

- Missioni 1-8 giocate; 1060 (Dark Forest, 2 parti) intera due volte (`route_1060.ps1`); 1240
  (Agrabah, 3 parti, wipe_4) con partenze spostate; 1050 corretta (forziere uid 4 spostato, totali
  STG 1,1,2,4) fino a `/stage/clear`.
- Crash del passaggio di parte: erano le tendine `wipe_N` mancanti (vedi
  [risorse_layout.md](risorse_layout.md#wipe)).
- `-Seek` non funziona sulle mappe scure (ISSUES I-008): la 1070 va giocata a mano.
