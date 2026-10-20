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
- Lista STORY: `/stage/160310` (108) `stories[]` (`[fn]`: `stageId`, `useAp`, `score`,
  `playStatus`, `clearMissionIds` <= 3), `newStageId`, `luxRank`, `openRankingId`. Tornando alla
  lista `[fn]` apre l'intestazione STG della **missione successiva** e cerca il suo
  bersaglio nella tabella `enemy`: un'intestazione mancante = crash.
- Miniature dell'elenco Story (ISSUES I-003, I-064): il riquadro «Panel» di ogni missione
  (`[fn]`/`[fn]`) carica `img/adventure/stage/stage_select_ico_%d_%d.png` con
  `worldId` (+0x118) e `thumbId` (+0x11c) della riga master `stage`; le missioni non sbloccate
  (`[fn]`) `stage_select_ico_Blank` («?») o, con il flag 1, `stage_select_ico_Soon`.
  `thumbId` = stanza*10000 + variante*100 + sottovariante della mappa `<XX>_<stanza>_<var>_<sub>`
  (1_40000 = DB_0004_00_00 1st District): i valori sono quelli veri (thethiny), non serve toccare
  il master. Le risorse avevano solo 1_0, 1_40000, 2_0, 2_10000 (+ Blank) delle 99 coppie delle
  missioni 1-525. Con il file assente `ImageView::loadTexture` (`[fn]`, initWithFile)
  fallisce e il riquadro **tiene la texture di prima**: il carosello ricicla i riquadri, quindi
  scorrendo con le frecce le missioni mostrano la miniatura di un'altra missione (Agrabah con
  Daybreak Town) o il «?» rimasto da una missione non sbloccata. Nessun campo del server c'entra.
- `recon/tools/make_quest_thumbs.py` (nel build delle risorse, dopo `make_textures.py`) genera le
  95 assenti in `stage_gen\files\img\adventure\stage` (BTF a palette, ~630 KB in tutto) dalle
  anteprime delle stanze di Roboloid (`images/map`, cache in `external\roboloid\cache\map`):
  ritaglio di 1200 px della stanza scelto dove e' piena, 145x132 con alpha e bordo delle
  originali; `CROP` nello script per correggere a mano. 87 stanze esatte, 8 dalla stessa stanza
  in un'altra variante (Corridor of Darkness 0100 per le 5 varianti, Waterfront Park 0008_01,
  Dwarf's Cottage 1F 0006_01, Frozen Forest 0012_01). `stage_select_ico_Soon` = copia di Blank.
  Fogli di controllo e `report.json` in `stage_gen\quest_thumbs`, nota in
  `reference\story_thumbs`.

<a id="formato"></a>
## Formato STG e MAP

Parser esatto: `recon/tools/mapfile.py` (`parse_stg`, `parse_map`, `load_stage`, `check_stage`; da riga
di comando `mapfile.py <cartella|file> [--json out] [--quiet]` controlla ogni stage contro l'STG). Lo
usano `import_orig_stages.py` e `stage_poi.py`. Nomi dei campi dal decompilato 1.0.1 con simboli
(`reference\world_schema\decompile_101.md`), letture confermate sul 4.3.1 (`[fn]`, `[fn]`).

**Versioni** (`STG +0x04` = `MAP +0x04`, l'anno dell'ultima modifica del file, non del client: il client
**non legge** la versione). 13, 14, 15, 16, 17 hanno **lo stesso formato** (quello qui sotto). Verifica:
tutte le 9.173 parti JP 4.3.1 (ogni revisione) e le 1.300 del 2016 hanno le cinque sezioni contigue,
senza buchi e senza coda, e squadre/nemici = totali STG su tutti gli stage completi (4.510 JP); il
vecchio parser euristico sbagliava sulle 13 per la forma dei record, non per il formato. I file 4, 6, 7, 8
(solo eventi del 2016 e revisioni JP superate, nessuno tra le 525) sono diversi e il client 4.3.1 li
leggerebbe male: STG v4 da 28 byte (7 int), v6/v7 da 40 (10 int); MAP 6/7 squadre da 0x24 (9 int, senza
poligono); MAP 4 anche uscite da 0x1c (7 int) e npc da 0x1c; 8 solo file vuoti.

`stage/mappoi_stg<id>.bin`, **STG** (64 byte letti sempre, poi le partenze alternative):

| int | byte | campo |
|---|---|---|
| [0] | +0x00 | `STG\0` |
| [1] | +0x04 | versione |
| [2] | +0x08 | short basso = parti, alto = parte di partenza |
| [3],[4] | +0x0c,+0x10 | partenza x, y |
| [5] | +0x14 | short basso = verso (1/3 -> +1, 2/4 -> -1; 3/4 fisso), alto = n partenze alternative (solo 4.3.1: n x 4 short a +0x40: parte, verso, x, y) |
| [6] | +0x18 | enemyId del bersaglio (`getStageBossEnemyID`) |
| [7] | +0x1c | ? (WW 1, JP 40/41/43...) |
| [8] | +0x20 | squadre, **senza** quelle col bit 0x20 di [4] (91 stage JP su 91); il server puo' toglierne (squadre «random») |
| [9] | +0x24 | nemici delle squadre contate; «sconfiggi tutti» conta [9] - [13] |
| [10] | +0x28 | enemyId della scheda del bersaglio (0 = [6]) |
| [11] | +0x2c | bonus di livello della scheda |
| [12] | +0x30 | ? |
| [13] | +0x34 | nemici da non contare |
| [14] | +0x38 | forzieri, [15] +0x3c materiali: **non mantenuti** (89 delle 518 importate e 125 dei 4.793 JP hanno somme delle parti maggiori, anche nel 2016); usati solo dagli obiettivi 17 «Open all treasure chests» / 18 «Collect all materials» (nessuno dei 5 stage con quegli obiettivi e' sfasato) |

`stage/mappoi_stg<id>_NN.bin`, **MAP** (parte = stanza): intestazione da 0x34 byte, poi cinque sezioni
agli offset scritti nell'intestazione (+ 0x34), in quest'ordine e contigue:

| byte | campo |
|---|---|
| +0x00 | `MAP\0` |
| +0x04 | versione |
| +0x08 | 40 (non letto) |
| +0x0c | nome della stanza, 16 byte (`DB_0000_00_00`: `map/<stanza>/..._info/_cls/_chp/_jmp.bin`) |
| +0x1c | short meteo (1 pioggia, 2/3 neve; solo se lo short +8 di `_info` e' 0) |
| +0x20 | uscite - 0x34 (sempre 0: blocco a +0x34) |
| +0x24 | squadre/nemici - 0x34 (`[fn]`: `X = [+0x24]`, `X+0x34` n squadre, `X+0x38` n nemici) |
| +0x28 | forzieri - 0x34 (`[fn]`) |
| +0x2c | materiali - 0x34 |
| +0x30 | npc - 0x34 |

| sezione | contenuto |
|---|---|
| uscite | u32 n, n x 36: `x, y, angolo freccia, distanza residua al bersaglio, [4] (mai letto: 1 + passaggi fino alla parte del bersaglio), arrivo x, arrivo y, parte di destinazione, verso`; scattano entro 96 unita' |
| squadre/nemici | u32 n_squadre, u32 n_nemici, n_squadre x 0x44, n_nemici x 0x20 |
| squadra (17 int) | `[0]` primo nemico (indice nella parte), `[1]` quanti, `[2]` 128, `[3]` ?, `[4]` flag (bit 0 capo/bersaglio, bit 2-3 comportamento, bit 5 = 0x20 seconda lista: non contata nell'STG, bit 6), `[5]` uid della squadra, `[6]`,`[7]` parametri del simbolo, `[8]` verso, `[9..16]` 4 punti del poligono d'incontro |
| nemico (8 int) | `x, y, enemyId, f3 (0; 1 nelle missioni JP ridisegnate), f4 (1), livello, rewardId, uid` |
| forzieri | u32 n, n x 0x14: `x, y, rewardId, aspetto (look: pari = specchiato, (look % 6) >> 1 e look / 6 = grafica; 0..19 negli originali), uid` |
| materiali | u32 n, n x 0x10: `x, y, materialId, quantita'`; uid calcolato `(32*parte + 32) | ((i+1) << 10) | 6` |
| npc | u32 n, n x 0x20: `x, y, id, short tipo (3, 4; 5 = dentro un livello grafico), short ?, short verso, short livello, int talk, int talk2, int ordine`; grafica `lwf/character/npc/<id>/wait/wait.lwf`; talk/talk2 = testi di dialogo (vedi [Filmati e dialoghi](#filmati)) |

- `uid` di squadre, nemici e forzieri **globali fra le parti**; e' lo spazio di id di `userTreasures`/
  `userEnemyDropItems` e di `getTreasures`/`getEnemyDropItems`. Gli uid delle squadre non hanno record
  di nemico (es. 1 nel Prologue).
- Collisione: `map/<stanza>/<stanza>_cls.bin` ('CLS', larghezza, altezza, byte per riga, 1 bit per
  pixel, bit alto a sinistra, 0 = percorribile).
- Le mappe originali dopo il tutorial arrivavano dal CDN: nelle risorse WW solo 1010-1040 (1040_00
  si apre con la chiave 5.0.1 in `BGAD_KEY`); le altre vengono dai dati JP 4.3.1 e dal pacchetto 2016
  (`recon/tools/import_orig_stages.py`, I-116). Il JP ha ridisegnato 17 missioni (capo unico, enemyId
  solo JP 1027/10240/10242/10261/11025/11028/11029/11033/11530, obiettivi della master non piu'
  soddisfatti): per quelle l'importatore prende il 2016, che corrisponde alla master WW.

<a id="generatore"></a>
## Generatore

- `recon/tools/gen_story_maps.py <stage_gen\story_cfg.json>` (~75 s; con `world_links` uscite sulle
  porte e missioni Tour, vedi [collegamenti](#collegamenti)): per ogni missione stanza da
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
  unita'). 0 errori all'11 ottobre. 46 stage con giro >= 1,25 (`detour125.json`); 0 avvisi «giro
  lungo» dopo la regola `short_exit` ([collegamenti](#collegamenti)).
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

<a id="incomplete"></a>
### Stanze incomplete (ISSUES I-074)

- `map/<S>/<S>_info.bin` («BMI»): `0x0a` u16 livelli a tessere, `0x0c` u16 immagini intere, `0x0e`
  u16 oggetti, `0x10` nome, `0x20` W, H di `base1`; poi record da 60 byte (stanza[16], livello[16],
  W, H, x, y, W2, H2, flag), da 52 (stanza[16], livello[16], w, h, x, y, flag) e da 52 (nome[32], x,
  y, ...). Percorsi (caricatore `[fn]`): `map/%s/%s_base1/%s_base1_%03d.png`,
  `map/%s/%s_%s/%s_%s_%03d.png` (tessere da 256, da 001, ceil(W2/256) x ceil(H2/256)),
  `map/%s/%s_%s.png`, `lwf/map/%s/%s.lwf`. La «stanza» dei record puo' essere un'altra cartella.
- Tessera assente = crash (`[fn]`: texture nulla -> sprite nullo, nessun controllo).
  Immagini intere e lwf assenti sono tollerati (`[fn]` controlla il nodo nullo): 43 stanze
  ne hanno, fra cui DW_0001/DW_0003 giocate sul banco.
- `recon/tools/check_rooms.py` (~25 s, cache in `stage_gen\rooms_info`) controlla ogni stanza contro
  l'indice installato (`names_v4.tsv` + `ipa431\names_addnl.tsv` + `medal_gen\files` +
  `stage_gen\files`; `rooms_gen\files` solo se l'ultima versione di `resource_data` lo contiene, cioe'
  `packs.txt`, o con `--rooms-gen`; base1 dal nome nel BMI a +0x10) e dice quali stage la usano ->
  `stage_gen\rooms_check.json`. Con `rooms_gen` ([#stanze-jp](#stanze-jp)) le due incomplete qui
  sotto diventano complete. Incomplete fino alla 34:
  **DB_0018_01_00** (Underground Waterway: sky2, spover, over di `DB_0018_00_00`, 172 tessere) e
  **ED_0011_01_00** (over, sky di `ED_0011_00_00`, 171 tessere); nessuna missione originale le usa.
- `gen_story_maps.py` con `"rooms_check"` (o `"exclude_rooms"`) nella config le tratta come assenti
  (I-036; la scelta delle altre missioni non cambia). Rigenerati 991001 (11 parti: la porta
  «Underground Waterway Entrance» porta a Waterfront Park: Dock), 991008 (17), 12210-12250,
  14230-14250 (Fountain Square/Warehouse); tolte le parti in piu' 991001_11, 991008_17.

<a id="stanze-jp"></a>
### Stanze recuperate nelle risorse (`rooms_gen`, versione 35)

- `recon/tools/make_jp_rooms.py` (Pillow: senza `-I`; ~10 min la prima volta, poi incrementale)
  scrive in `D:\Progetto_Restauro_KH_UX\rooms_gen\files\` tutti i file che il client apre per le
  stanze di `tmp\thethiny_x\rooms_merged\` non ancora servite (cartella per cartella; cio' che li'
  manca dai dati JP 4.3.1, revisione piu' alta). Obbligatori: i 4 `.bin`, le tessere di base1 della
  stanza scritta nel BMI a +0x10 (97 stanze sono alias grafici di un'altra) e quelle dei livelli a
  tessere, da 001 a ceil(W/256)*ceil(H/256); una stanza entra **solo se nessuno manca**. Facoltativi:
  immagini intere e oggetti `lwf/map/<O>/` (lwf + tutti i png citati; il `.res` non serve). I file
  gia' serviti non si riscrivono mai. Rapporto in `rooms_gen\report.md/.json`.
- Texture: PNG JP (alpha non premoltiplicata) -> BTF tipo 8 con `btf.encode` (verificato: decodifica
  identica al PNG sui pixel opachi); tessere del tutto trasparenti -> il segnaposto BTF tipo 1 da 45
  byte delle originali (le tessere vuote servite sono cosi': 588 su 592 hanno il PNG JP trasparente,
  le altre 4 alpha <= 3); BTF del 2016 copiati. Texture di lwf scartate come stub da thethiny: si
  prende lo stesso nome originale (`<oggetto>_<esadecimale>.png`) da un altro oggetto JP solo se
  tutti i candidati hanno contenuto identico (79 texture).
- **Esito** (14-10): 413 stanze; **319 nuove complete**, 34 servite completate (immagini intere, lwf
  e i livelli mancanti: DB_0018_01_00 e ED_0011_01_00 ora complete), 52 servite gia' complete, 8
  scartate: 7 senza `_info.bin` (DB_0000_00_01, DW_0100_00/01_00, ED_0020_00_00, SR_0009_01_00,
  WL_0004_00_01, WL_0100_00_00: la INFO si apre dalla cartella, usarle = crash) e DB_0000_01_00 (4
  tessere di base1 assenti ovunque). 39.816 file, **1.035 MB** (map 994, lwf 41). Oggetti lwf: 203
  aggiunti, 22 gia' serviti, 116 non copiati (texture assenti: l'oggetto manca, tollerato come in
  DW_0001).
- <a id="segnaposto-46"></a>**Crash nelle stanze generate (I-182, 20-10)**: il segnaposto di `make_jp_rooms.py` aveva un
  `00` in piu' all'offset 16 (46 byte invece dei 45 dell'originale `DB_0000_00_00_base1_001.png`): campi del BTF
  slittati, il decodificatore (`[fn]`, `memcpy` della dimensione a +0x22) leggeva 0x05000100 byte da un file di
  46 e usciva dalla memoria (SIGSEGV a fine mappatura) entrando in una delle **86 stanze** generate con tessere
  trasparenti (3.208 tessere; quest 13 DW_0004_00_00, 524 BC_0012_01_00). Dal 14-10 (risorse 35): non visto prima
  perche' dal 18-10 `save/smoke.json` lasciava solo la quest 132 (stanze WW). Trovato con `armtrace\stackcap.ps1`
  (catena `[fn]` <- lettore dei pacchetti <- caricamento della stanza, nome della tessera nello stack).
  Costante corretta (`assert len == 45`), le tessere col segnaposto sbagliato si riscrivono; risorse 51.
- **Stanze di storia** (porte `scope` storia di `schema_v2\schema_mondi.json`, stanza e destinazione):
  231; con `rooms_gen` **230 complete** (`check_rooms.py --rooms-gen --out rooms_gen\rooms_check.json`:
  405 stanze, 0 incomplete; senza, come prima: 86 stanze, 2 incomplete). Manca solo **SR_0009_01_00** (porta SR_0008_00_00 <-> SR_0009_01_00, solo
  `storia_oltre`, fuori dalla master): nessuna INFO in nessuna fonte.
- `--story-only`: solo le stanze delle porte di storia (24.406 file, 615 MB). Default: tutte le
  complete. `build-resources.ps1` ne fa il pacchetto statico `rooms_gen\gen.*`
  ([risorse_layout.md#pacchetti](risorse_layout.md#pacchetti)). Finche' la 35 non e' costruita
  `check_rooms.py` (e quindi `"rooms_check"` di `gen_story_maps.py`) non vede queste stanze: le mappe
  che le usano vanno generate solo dopo la 35. Da provare sul banco: una stanza alias (es.
  DB_0020_00_01), una con lwf aggiunti, DB_0018_01_00.

<a id="collegamenti"></a>
## Collegamenti fra le aree e missioni «Tour»

ISSUES I-072. Prove e immagini in `D:\Progetto_Restauro_KH_UX\reference\world_links\` (`NOTE.md`,
`wiki_worlds.txt` = pagine dei mondi della wiki, `doors\` = punte dei sentieri sulla grafica,
`tour\` = uscite e arrivi di ogni parte delle missioni Tour, `previews\` = anteprime Roboloid).

- **Causa del flusso sbagliato**: le sequenze di stanze della wiki sono coerenti (102 coppie su 104
  vicine nel grafo, 2 saltano un piano), ma il generatore metteva l'uscita «avanti» nel punto piu'
  lontano dalla partenza e quella «indietro» nel punto piu' a sinistra, senza guardare le porte: es.
  missione 93 (Fountain Square -> 1st District) usciva dalla scala a destra (che porta al 2nd
  District) e arrivava nel 1st District dalla parte sbagliata. In piu' 95 coppie su 104 hanno almeno
  una stanza sostituita (I-036).
- **Grafo** `recon/tools/world_links.json`: per mondo le aree (nome, codice `XX_NNNN_VV_00` dal
  `thumbId` delle missioni, `res` = nelle risorse, `variant_of` per le varianti giorno/notte, alias dei
  nomi della wiki), le porte delle stanze nelle risorse (`{area vicina: [x, y]}` sulla bitmap CLS) e i
  collegamenti con `conf` (high = uscite originali 1010-1016 o wiki esplicita, medium = wiki + porta
  scelta sulla grafica, low = dedotto, none = `tour: true`, solo per collegare i gruppi isolati nel giro)
  e la fonte. Fonte principale: pagine dei mondi della KHUX wiki («The northeast exit of the Flower
  Glade leads to...»), nel dump `wiki\wiki_all.json`. Le uscite vere confermano la convenzione: la
  scala in basso a sinistra della Fountain Square porta in alto a destra del 1st District, quella a
  destra in basso a sinistra del 2nd District.
- **Porte**: le uscite stanno in fondo ai sentieri della zona percorribile (punte), non sul bordo
  dell'immagine. L'anteprima Roboloid ha la stessa larghezza della CLS ed e' allineata in basso
  (`y_grafica = y_cls - (H_cls - H_anteprima)`). Le punte candidate (rilievo geodetico + estremi nelle
  8 direzioni) sono in `doors\*.png`; la porta di ogni collegamento e' scelta a mano con la direzione
  della wiki.
- **Generatore** (`gen_story_maps.py`, config `"world_links"`): nelle missioni a piu' stanze l'uscita
  della stanza k va sulla porta verso la stanza k+1 (o verso il primo passo del percorso nel grafo) e
  l'uscita indietro sulla porta verso k-1; nelle stanze sostitute una porta qualsiasi (la piu' lontana
  dall'altra uscita). Porte agganciate al pixel percorribile (la griglia di 40 non entra nei corridoi
  stretti), arrivi a ~240 unita' a piedi dalla porta e a piu' di 160 dalle altre uscite, freccia con
  l'angolo verso l'esterno della zona percorribile (media dei pixel bloccati entro 160). Banco
  991001: l'uscita «Moogle Shop» sul bordo della fontana non scattava: la freccia (creduta ~100
  unita' oltre l'uscita; in realta' 40-80 prima, verso l'interno: [schema-mondi](#schema-mondi), controllo
  corretto il 14-10) cadeva sulla fontana, toccandola il giocatore saltava sulla cima della fontana
  (isola libera della CLS staccata dalla piazza) e restava fuori dal raggio di 96. Ora le uscite stanno
  a >= 240 dalle isole libere da >= 1000 pixel e la punta della freccia a > 200 (angolo ruotato fino a
  90 gradi); la porta del negozio e' sul bordo alto della piazza a sinistra della fontana (la porta vera
  sta dietro la fontana, fuori dalla CLS). Senza `world_links` l'uscita e' identica byte per byte a prima. Rapporto
  delle coppie in `stage_gen\world_links_story.json` (relazione nel grafo, note delle porte); 205
  uscite spostate, 55 sulla porta giusta (37 di piu' di 300 unita').
- **Giro lungo** (banco 991001, parte 2 «2nd District»): l'uscita «Underground Waterway Entrance» in
  (2020,2068), sul camminamento basso fra i canali, dall'arrivo da Fountain Square (820,2100) si
  raggiungeva solo con ~4500 unita' a piedi contro 1200 in linea d'aria (su per la scala, porta a
  destra, giu' dietro un edificio coperto dagli occlusori): il giocatore non la trova, il bot resta
  contro la ringhiera. Regola (`short_exit`): con la stessa misura del giro lungo di
  `validate_maps.detour` (celle da 8, Dijkstra), se dall'ingresso principale della parte (partenza o
  primo arrivo, nell'ordine del validatore) il percorso verso un'uscita e' > 1,5 volte la linea d'aria
  e > 800, l'uscita va sul punto della componente con percorso <= 1,5 volte la linea d'aria piu'
  vicino alla porta, a >= 300 dall'ingresso e dalle altre uscite, a >= 240 dagli altri arrivi e a >
  240 dalle isole libere (freccia ricalcolata). Si ricalcola solo l'arrivo di ritorno accanto a
  quella porta; le distanze residue [3] delle uscite della missione cambiano di conseguenza. Se non
  c'e' un punto buono la porta resta e la nota va nel rapporto (`doubts` / `notes`). Spostamenti in
  `worldtour_report.json` (`moved_exits`) e `story_report.json` (`doubts`). Esito: 991001 parte 2
  (2020,2068) -> (1616,1640), in cima alla ringhiera sopra il camminamento (percorso 988, linea
  d'aria 919); 991008 parti 6, 12, 15 (4 uscite); 13 missioni di storia (stanze WL_0004, DB_0001,
  DW_0001). Validatore: avvisi «giro lungo» da 15 stage a 0, errori 0.
- **Missioni Tour** (config `"worldtour": true`): una per mondo, tutte le stanze del mondo nelle
  risorse (varianti escluse), una parte per stanza; ogni porta porta alla stanza delle risorse piu'
  vicina nel grafo attraversando le aree assenti (es. Fountain Square, grande porta a sinistra ->
  Warehouse via Market). Un solo Shadow (bersaglio) nella stanza piu' lontana dalla partenza; niente
  forzieri. Rapporto `stage_gen\worldtour_report.json` (uscite, arrivi, `via`).

| stageId | Tour | parti | bersaglio |
|---|---|---|---|
| 991001 | Daybreak Town | 11 (con Corridor of Darkness) | Beach D |
| 991002 | Dwarf Woodlands | 3 | Path to the Mine |
| 991003 | Wonderland | 2 | White Rabbit's House |
| 991004 | Agrabah | 17 | Cave of Wonders: Monkey Statue |
| 991005 | Olympus Coliseum | 2 | Coliseum |
| 991006 | Beast's Castle | 2 | Fireplace |
| 991007 | Castle of Dreams | 2 | Castle: Ballroom |
| 991008 | Enchanted Dominion | 17 | Tower Room |

- Master: `KHUX_WORLDTOUR=1` in `make-game-tables.js` aggiunge le righe 991001-991008 (copie della
  1050 come le zoo, `id` 9101-9108, nome «Tour <mondo>», mondo/miniatura/musica dalla prima missione
  del mondo, AP 0). Si avviano come le zoo: `server/save/smoke.json` `{"stageId": 991001}` -> l'elenco
  Story mostra solo quella missione; `{"stageIds": [991001, ..., 991008]}` mostra tutti i tour
  insieme (banco 13-10: 9101-9108 nell'elenco, tutti NEW). Mappe da `stage_gen\story` in `stage_gen\files\stage`.
- Mancano dalle risorse quasi tutte le aree dei mondi 2-7 (Dwarf's Cottage, Market, West Wing...):
  i giri di DW, WL, OC, BC, CD hanno 2-3 stanze.

<a id="schema-mondi"></a>
## Schema esatto dei mondi (ISSUES I-116)

Esito delle prove dell'utente sui tour 991001-991008 (13-10): **posizione degli indicatori di
spostamento fra le aree molto imprecisa**; nei mondi a cui mancano aree le porte portano a stanze
sostitute e il giocatore non capisce dove si trova. Lo stesso difetto passa alle missioni di storia
generate. Il grafo attuale (`world_links.json`) mescola collegamenti certi (`high`) con collegamenti
dedotti (`medium`/`low`/`none`) e porte scelte a mano sulla grafica: non basta.

**Regola dell'utente**: prima uno schema esatto e verificato della struttura di ogni mondo, poi le
missioni. Nessuna missione standard (storia) si rigenera finche' lo schema non e' confermato.

Ordine del lavoro:
1. **Inventario delle aree** per mondo: tutte le aree del gioco originale (nome, codice
   `XX_NNNN_VV_00`, varianti giorno/notte), con la fonte di ciascuna; segnare quali sono nelle
   risorse (OBB 5.0.1, `addnl` dell'IPA 4.3.1, pacchetto nostro) e quali mancano.
2. **Collegamenti certi**: un collegamento entra nello schema solo con una prova diretta: uscita di
   una missione originale (`.stg` 1010-1016 e altre recuperabili), video/screenshot del gioco originale
   che mostra il passaggio, oppure testo esplicito della wiki confermato da un'immagine. Ogni arco porta
   la fonte; gli archi senza prova restano fuori, non si deducono.
3. **Posizione esatta degli indicatori**: per ogni porta la coordinata dell'uscita e l'angolo della
   freccia presi da una missione originale quando esiste; altrimenti dalla porta visibile nella grafica
   della stanza, confrontata con video/screenshot dell'originale (salvati in
   `D:\Progetto_Restauro_KH_UX\reference\world_links\`). Da verificare sul banco porta per porta
   (screenshot dell'indicatore e dell'arrivo), non solo con il validatore.
4. **Aree mancanti**: cercarle prima (altre versioni del client: JP, OBB/patch precedenti, IPA,
   archivi della comunita', Dark Road; registrare in [ricerca_esterna](ricerca_esterna.md)); solo se
   introvabili, rigenerarle con la massima precisione dall'originale (grafica, zona percorribile CLS,
   livelli a tessere, porte) e documentare come.
5. **Schema finale** in un file unico (aree, collegamenti, porte, fonti) da far **confermare
   all'utente**; poi si rigenerano i tour, l'utente li prova, e solo dopo si rigenerano le missioni di
   storia.

Risultati (13-10, in `D:\Progetto_Restauro_KH_UX\reference\world_schema\`):
- **Dati locali** (`dati_locali.md`, `exits_original.json`): le uniche uscite originali sono le 6 di
  1010/1013/1016 (FS basso-sinistra <-> 1st District alto-destra, FS destra <-> 2nd District
  basso-sinistra); 1019/1020/1030 una parte sola, 1040 solo intestazione. Nessun file della stanza
  (`_chp` griglia 0/1/2 a celle da 60, `_jmp` salti interni, `_info` solo grafica), tabella o testo
  codifica porte o destinazioni; al passaggio solo tendina `wipe_<mondo>` e freccia `next_map.png`, mai
  il nome dell'area. Le uscite sono per missione (1013 e 1016: stessa porta, coordinate diverse). Le
  punte della zona percorribile sono condizione necessaria (6/6 uscite vere a 12-86 da una punta) ma
  non sufficiente (~5 punte per stanza, 1-2 usate): da qui l'imprecisione dei tour.
- **Archivi** (`fonti_risorse.md`): nessun pacchetto pubblico (IPA WW/JP 1.0.1-5.0.1, APK JP/TW, web
  Arena7664, api.sp, Wayback) ha missioni o stanze in piu': arrivavano dal CDN in `files/r/misc.mp4`.
  Unica fonte nota: **thethiny** (misc.mp4 dal CDN, ~898 STG, ~124 stanze contro 86, stessa chiave
  KEY_DOWNLOAD); pubblico solo `stage_maps.json` (nemici/forzieri per stage, senza uscite). Contatto da
  fare (utente, I-029).
- **Video** (`video\`): 186 video catalogati (gothwood9 1-760 completo); la freccia azzurra si vede e,
  registrata sull'anteprima, ritrova le 4 uscite vere di Daybreak Town (arrivi a 9-46 unita'). Le
  coppie della wiki non sono sempre parti diverse (DW missioni 8 e 11: mappe larghe senza tendina).
  Nel video la freccia sta 52-124 unita' verso l'interno rispetto all'uscita.
- **Freccia d'uscita nel codice** (`freccia_uscita.md`): `[fn]` mette il marker sul punto
  dell'uscita senza offset, `setRotation(angolo)`; le due sprite `map/next_map.png` stanno in un nodo
  a y = -80 (`[data]`) e oscillano fra -80 e -40 (`[fn]`, 40.0/80.0), la scia va da -40
  a 0. Da mappa a schermo y invertita (`[fn]`); 0 gradi = su, orario. In CLS: **freccia =
  (x - d·sin a, y + d·cos a), d in [40,80], punta verso (sin a, -cos a)**, cioe' 40-80 unita' PRIMA
  dell'uscita verso l'interno; quindi uscita ~ freccia + 60·(sin a, -cos a). Verificato sui video
  (3 uscite di 1010/1013). Il generatore ha la convenzione dell'angolo giusta (scarti 1-21 gradi
  sulle uscite originali) ma **controlla la freccia 100 unita' oltre l'uscita** (`gen_story_maps.py`
  righe 602-623, `tx = p + 100·sin`): va corretto in d = 40..80 verso l'interno prima di rigenerare.
  **Applicata il 14-10** in `exit_angle` (punti d = 40/60/80 prima dell'uscita lontani > 200 dalle isole;
  mappe non ancora rigenerate, I-116).
- **Daybreak Town dai video** (`video\daybreak_town.md/.json`): 27 passaggi con 3 fotogrammi ciascuno
  (FS-2nd, FS-1st, FS-Corridor of Darkness, Market-Warehouse, Market-Avenue, Avenue-Boardwalk,
  Boardwalk-Waterfront Park (due collegamenti: passeggiata alta e parco in basso a sinistra),
  WP-Office, Office-Dock, Attic-Moogle Shop, Rooftop-Attic, Underground Waterway-Clock Tower Level).
  Uscita derivata = freccia + 60·(sin a, -cos a): 26-31 unita' dalle uscite vere. Coordinate CLS
  solo per le stanze nelle risorse; per Market/Avenue/Boardwalk/WP pixel dell'immagine wiki. La
  tendina cambia dopo la ~230 («artigli», non nera). Non coperti: Q351-375 e Q401-425 (YouTube chiede
  login), Q846-869 (nessun video), interni della Clock Tower (Q541-555, 20 tendine non attribuite).
- **thethiny** (`thethiny_repos.md`): i suoi strumenti leggono nemici e forzieri, non le uscite; chiavi
  uguali alle nostre; il tutorial 1.x e' diverso dalla 4.3.1 (1010: bersaglio 89001 e 7 nemici contro
  81020 e 14) -> uscite da prendere dai dati 4.4.0 WW / JP finale. Repo senza licenza: solo fatti
  tecnici finche' non da' un permesso. Piano per i suoi ~4 GB nel §5: `[local reference data]\<versione>\` +
  manifest, estrazione con `bgad.py`, verifiche, tutte le uscite -> `schema_mondi.json/.md`.
- **Dati di thethiny arrivati** (13-10, `D:\Progetto_Restauro_KH_UX\[local reference data]\`): build, decompilati
  IDA 1.0.1 con simboli, dati 1.0.1/1.1.3/1.2.3/4.4.0, **pacchetto globale 2016** (`misc.mp4`, 1,27 GB),
  JOURNAL. Manca `data/jp_final_4.3.1` (4.793 stage, 394 stanze): chiesto di nuovo dall'utente.
- **Formato confermato dai simboli 1.0.1** (`decompile_101.md`): `StageManager::createMapTransferInfo`
  = uscite (9 int: x, y, angolo, distanza residua, [4], arrivo x, arrivo y, parte di destinazione,
  verso), raggio 96, `MapGateMarker`, sezione B = materiali, C = NPC. Correzioni a
  `stage_gen\exits\NOTE.md`: uscita [4] non letta (= 1 + passaggi dalla parte di destinazione a quella
  del bersaglio, 635/681), verso [8] 0 = libero; STG [13] = nemici esclusi da «sconfiggi tutti», [1] =
  versione del formato (13/14 nel 2016, 16 nella 4.3.1), MAP +0x1c = meteo; NPC con uno short in piu'.
  Nessuna tabella dei nomi delle stanze nel codice.
- **Estrattore** `reference\world_schema\scripts\extract_all_exits.py` (CHECK OK sulle 6 uscite di
  1010-1016, cartelle sciolte con revisioni, pacchetti BGAD). **Pacchetto 2016**: 923 stage, 1.300
  parti, 236 a piu' parti (fino a 23), **697 uscite, 241 collegamenti fra 119 stanze** con coordinate
  originali -> `stages_2016.json` (superato, vedi sotto).
- **Pacchetto 2016 inventariato** (`bundle2016.md`, `[local reference data]\MANIFEST.md`): `misc.mp4` = 27
  pacchetti BGAD in fila (base rev. 8 + aggiornamenti 9-34), 161.651 record modo 2; a nome ripetuto
  vale l'ultimo. **Stub**: int32 contato dal primo record vero del *proprio* blocco di aggiornamento
  (negativo = blocco precedente), non indice assoluto come nel JOURNAL di thethiny (82.736/82.736
  coerenti). `misc.png` si apre con KEY_DOWNLOAD ed e' di una revisione successiva. OBB 4.4.0 di
  thethiny identici ai nostri. **150 stanze (144 complete)**: recuperate 93 stanze che mancavano (DW 20,
  WL 17, BC 15, DB 14, AG 13, OC 9, DG 5) + 38 codici nuovi; le 19 in comune con le nostre hanno CLS/CHP/JMP
  identici; DB_0018_01_00 completa nel 2016 (chiude il buco di I-074); OC_0001_00_00 nostra piu' nuova.
  `base1` si carica dal nome stanza nel BMI a +0x10 (28 stanze usano la grafica di un'altra):
  `check_rooms.py` va adeguato. Mancano ancora 139 stanze (CD, ED, mondi di Ralph, DB_0020-0031,
  AG_0005-0023): dati JP 4.3.1. **Missioni**: tutte le 525 di storia della master sono nel 2016;
  uscite in `stage_exits_2016.json` (744 uscite, versioni piu' recenti). Tutorial 1010-1030 diversi
  dalla 4.3.1 (stesse stanze, contenuto diverso): per i contenuti vale la versione piu' vicina.
- **Schema dei mondi v1** (`reference\world_schema\schema\`: `schema_mondi.json/.md`, `index.html` locale,
  `img\<mondo>\` = stanza con porte, freccia e arrivi + `_grafo.png`; script `schema_mondi.py`,
  `schema_report.py`, `room_render.py`): dalle uscite 2016, 695 uscite valide, **277 porte in 90
  stanze, 118 collegamenti**, 5 sensi unici, 42 coppie con piu' porte. Scartate 45 uscite di «parti
  residue» (file di parte oltre il numero dichiarato nello STG: destinazione sbagliata, es. 72020) e 4
  di STG vecchi. Controlli: 6/6 uscite 4.3.1 concordano; video di Daybreak Town 17 concordi, 7
  discordanze tutte su arrivi poco affidabili nel video o angoli (porte sempre coincidenti). BC senza
  porte (missioni 2016 tutte a una parte); CD, ED e mondi di Ralph attendono i dati JP 4.3.1.
  Sfondo delle immagini = base1 ricomposta dalle tessere BTF, allineata alla CLS. Non pubblicare:
  grafica Square Enix. Da confermare con l'utente dopo l'unione con i dati JP 4.3.1 (decisione
  dell'utente 13-10: rivedere solo lo schema unito). **Collegamenti fra mondi diversi** (solo stage
  evento 91000 e 16160: Boardwalk <-> Mine: Corridor <-> Dreadful Dunes, Path to the Mine <-> Scarab
  Sands, FS -> Corridor of Darkness): tenuti a parte, non usati per le missioni di storia (utente
  13-10).
- **Dati JP 4.3.1** (`jp431.md`, `stage_exits_jp431.json`, `[local reference data]\MANIFEST_jp.md`): 272.673 file,
  4.793 stage, 7.701 parti, 5.763 uscite, 392 stanze. L'estrazione di thethiny ha **scartato gli stub**:
  mancano `_jmp` di 265 stanze, CLS/CHP di ~70 varianti, 8 STG e parti di 272 stage, 3 stanze
  DG_0100_*; ricostruibili (jmp vuoto da 16 byte o della stanza-geometria: 133/133; CLS/CHP da stanza
  con stesse dimensioni scelta coi punti delle missioni: 15/15, 38 stanze ancora ambigue). Le nostre 86
  stanze sono in JP identiche; uscite del tutorial identiche alle nostre WW: **i dati di mappa JP 4.3.1
  sono quelli WW**. Recuperate 132 delle 139 stanze mancanti; restano assenti solo DB_0001_01_00,
  DW_0026_00_00, SA_0000/SA_0004_00..03 (nessuno stage le usa). Tutte le 525 missioni della master
  presenti con lo stesso stageId; nelle comuni col 2016 porte identiche; 5 missioni con stanze diverse
  (2060, 3310, 5300, 7170, 11220): per il WW vale il 2016 (concorda con mapName e miniatura della
  master). 507 coppie di stanze collegate (113 nel 2016).
- **Schema dei mondi v2** (`reference\world_schema\schema_v2\`, `index.html` locale; script
  `rooms_merge_v2.py`, `exits_merge_v2.py`, `schema_mondi_v2.py`, `schema_report_v2.py`): stanze unite
  in `tmp\thethiny_x\rooms_merged\` (413: nostre 86 + JP + 2016; 633 file ricostruiti con la regola in
  `_manifest.md`; 38 a geometria incerta lasciate senza CLS/CHP). Uscite unite: 5.849 stage, 8.516
  uscite (2016 per 2060/3310/5300/7170/11220, JP per il resto, + multi_stage); tipi storia_master 525,
  storia_oltre 459, storia_variante 28, evento 3.808, raid/prova 47, multi 982. 1.747 porte: **P =
  storia 497** (geografia certa), E = solo eventi/raid/multi 694, X = fra mondi 556 (a parte).
  Controlli: 6/6 uscite 4.3.1, video DB 19 concordi / 8 discordi (arrivi e angoli). Grafi per mondo
  (`_grafo_storia`, `_grafo_completo`, sottografi per zona, PNG+SVG) leggibili. 15 dubbi per l'utente
  nel rapporto (Underground Waterway DB_0020-0023 e DB_0010 a geometria incerta, nomi mancanti,
  classificazione degli stage, angoli diversi fra missioni, mediana storia/tutte).
  **Decisioni dell'utente (13-10)**: varianti 9060-10390 = storia; 3xxxxx = eventi, 80000-99999 e
  9000xxxx = raid/prove; ogni missione usa il proprio angolo originale (lo schema mostra il piu'
  frequente); posizione della porta = mediana sulle sole missioni di storia; AG_0000_00_00 con la
  nostra INFO (client WW). Le 38 stanze a geometria incerta si risolvono solo con prove dai dati
  (`reference\world_schema\stanze_incerte.md`).
- **38 stanze incerte risolte** (`stanze_incerte.md/.json`, `scripts\stanze_incerte.py`, regole R3/R4 in
  `rooms_merge_v2.py`): prova decisiva = indice `misc.png` del 2016 (revisione globale successiva):
  stesso offset di un nome deduplicato = stesso file (verificato CLS 58/58, CHP 54/54, JMP 9.595/9.595,
  0 contraddizioni). 26 certe (es. DB_0020_* -> DB_0020_01_03, DB_0021_* -> DB_0021_01_03, CD_0012_04/06/07
  -> CD_0012_05_00, dove la regola dei punti avrebbe sbagliato), 12 molto probabili (DB_0010_0x_0y ->
  propria _00 col BMI identico; DB_0026_01_00 -> DB_0026_06_00; NL_*). Tarature: con la geometria vera
  bloccati 0% forzieri, 0,24% nemici, 0,23% arrivi; uscite 45% (non discriminano). Corretti 18 jmp
  vuoti smentiti dall'indice; restano da rivedere HD_0002_00_00 e SR_0009_01_00 (jmp vuoto senza
  prove). Schema v2 rigenerato: 0 stanze incerte, porte invariate. Storia oltre la master 18010-39xxx; `text\`
  solo giapponese, nessuna tabella dei nomi delle aree. Rilancio con due fonti: `schema_mondi.py --exits stage_exits_jp431.json
  stage_exits_2016.json --rooms jp431=... 2016=... nostre=...`, poi `schema_report.py`.
- **Inventario** (`areas.md`/`areas.json`): gallerie della wiki (343 immagini) confrontate con le 379
  anteprime Roboloid `images/map` (nome file = codice stanza) + thumbId/mapName di thethiny + stage
  originali. Mondi 1-8: ~166 aree con nome, ~247 stanze (codici), **solo 59 stanze complete nelle
  risorse** (84 su 86 in totale; incomplete DB_0018_01_00, ED_0011_01_00). Mancano quasi tutte le
  aree di DW, WL, OC (Underworld), BC, CD, il deserto e il Bazaar di AG, mezza Daybreak Town.
  Roboloid ha l'anteprima grafica intera di molte stanze assenti: base per un'eventuale
  rigenerazione. Dubbi: AG_0003_01_00 con tre nomi, thumbId diverso dalla stanza nominata in alcune
  righe (OC_0001_00, WL_0001/0002, DW_0004, DB_0007), prefisso del Corridor of Darkness dedotto.

<a id="oltre525"></a>
## Missioni 526-979: stage originali JP e decisioni dell'utente (20-10)

Rapporto: `D:\Progetto_Restauro_KH_UXeference\world_schema\oltre525\RAPPORTO.md` (tabelle in `_tables.md`,
abbinamenti in `oltre525.json`, script `match_oltre525.py`). Tutte le 453 missioni di battaglia 526-979 hanno lo
stage originale nei dati JP 4.3.1 (330 esatte, 39 buone, 83 probabili nei mondi di Ralph, 979 <-> 39159 a mano;
978 solo filmato); le 526-555 identiche nel 2016. 253 stanze (203 nuove, 225 servite, 27 da aggiungere al
pacchetto: `make_jp_rooms.py --story-only` le esclude), 386 uscite tutte porte P dello schema v2.
Decisioni dell'utente (20-10):
1. dove ci sono gli originali valgono gli originali: si importano gli stage JP, niente tour prima;
2. Q617 (20320) e Q661 (23010), parte 1 assente: si ricostruisce solo quella parte nella stanza della porta originale;
3. Q555 (18300-18304): si affronta il maestro della **propria Unione** (utente; confermato 20-10, eccezione Vulpes -> Ira):
   stageId = 18300 + unionId - 1 (Ursus 1 Aced, Anguis 2 Invi, Unicornis 3 Ira, Vulpes 4 Ira, Leopardus 5 Gula). Lo sceglie
   il client: riga master 18300 con `branchType: 1` (carica mappoi_stg stageId + v - 1) + i 5 stage JP. Prove: decompilato
   1.2.3, master 1.1.3 (una riga 18300, 5 mappe in stage_maps.json), wiki Q555, testi JP del dramma. Nessun'altra
   missione 526-979 cambia per Unione;
4. SR_0009_01_00: grafica di SR_0009_00_00 con la geometria propria;
5. nomi delle stanze (mapName): solo **originali**, con ricerca approfondita dove mancano o divergono.
   Ricerca 20-10 (`oltre525\RICERCA_Q555_NOMI.md`): 37 stanze, 9 certe dal mapName WW (AG_0003_04/05_00 Tortuous/Parched
   Sands, DB_0010_* Clock Tower: Level, DB_0013_00_00 Clock Tower: Elevator), 27 probabili (room1 della wiki, che coincide col
   mapName WW in 537/555), 1 introvabile (DB_0011_01_00). mapName delle righe 526-979: room1 della wiki per missione
   (526-555: mapName della master 1.1.3).
Lavoro tecnico: 312 enemyId mancanti nel master (`enemies_oltre525.json`), righe master 526-979 dalla wiki (Lv dalla
wiki, 87 STG con Lv 1), worldId e tendina dei mondi di Ralph (I-027).

<a id="tour-v2"></a>
## Tour v2: un giro per zona sulle porte originali (I-116)

Sostituiscono i tour 991001-991008 (porte indovinate). `recon/tools/gen_tours_v2.py [config.json]
[--available stanze.json] [--worlds DB,AG] [--out DIR]` (~4 min, numpy/scipy) legge lo schema v2 approvato
(`reference\world_schema\schema_v2\schema_mondi.json` + `_graphs.json`), le stanze di
`tmp\thethiny_x\rooms_merged\` e le intestazioni STG JP (partenze originali). Uscita in
`D:\Progetto_Restauro_KH_UX\stage_gen\tours_v2\` (NON in `stage_gen\files`): `mappoi_stg99xxxx*.bin`,
`reports\<id>.json/.md` (stanze, porte usate con id della porta, coordinate originali e usate, porte omesse
con il motivo, note), `tours.json` (indice e righe del master), `stage_poi_tours_v2.json` (lo Shadow di ogni
tour, da unire a mano in `server/game_data/stage_poi.json`), `available_rooms.json`, `validate.json`.

- **Zone**: `zone_storia` di `_graphs.json` (DB 6, AG 4); negli altri mondi le componenti connesse del grafo
  delle porte di storia (etichette `c1`, `c2`...). Solo porte `scope = storia` fra stanze dello stesso mondo e
  della zona; omesse (nel rapporto) le porte verso stanze fuori zona o non disponibili, quelle verso la stessa
  stanza (anelli: il tour ha una parte per stanza) e, fra porte della stessa stanza a <= 96 verso stanze
  diverse (varianti, es. il labirinto DB_0010), tutte meno quella con piu' missioni di storia.
- **Porta** (decisioni 13-10): uscita = `story_median`; angolo = il piu' frequente fra le missioni di storia
  (a parita' quello della missione piu' vicina alla mediana); arrivo = mediana del gruppo di arrivi (a catena
  entro 96) piu' numeroso delle missioni di storia, verso = il piu' frequente nel gruppo (quasi sempre 0 =
  libero: il validatore lo segnala come avviso, e' il valore originale). [3] = distanza residua al bersaglio,
  [4] = 1 + passi dalla parte di destinazione a quella del bersaglio (come gli originali).
- **Aggancio**: le uscite originali stanno spesso su un pixel bloccato (bordo). Si tiene il punto originale se
  e' percorribile e aggancia una componente raggiunta entro 48 (regole di `validate_maps.py`), altrimenti il
  pixel con spazio libero > 16 piu' vicino di una componente raggiunta, al massimo 96 (raggio di scatto del
  client; oltre, porta omessa): 14-10, 206 uscite su 346 spostate, al massimo 85, mediana 35. Arrivi a <= 120
  da un'uscita della parte di destinazione spostati nella stessa componente a >= 140 da tutte (10 arrivi,
  24-167 dall'originale). Porte omesse: 55 «stessa porta», 24 irraggiungibili, 19 anelli, 16 verso stanze non
  disponibili (piu' quelle fuori zona). Componenti raggiunte a punto fisso dalla partenza seguendo le uscite attive, **con i salti
  interni** (`_jmp.bin`: record {cella CHP, k, k x (x1, y1, x2, y2, h)} di interi, gradini fra livelli,
  presi nei due versi): `validate_maps.py --jmp` fa lo stesso (senza `--jmp` invariato).
- **Partenza**: stanza con piu' partenze di missioni di storia fra quelle che raggiungono almeno 3/4 delle
  stanze del pezzo (es. DB z2 = Fountain Square); punto = medoide delle partenze originali in quella stanza
  (spostato a >= 300 dalle uscite se a < 200). Le stanze non raggiunte (sensi unici, uscite irraggiungibili)
  fanno un tour a parte (zona `z1.2`...). Ordine delle parti = BFS sulle uscite attive.
- **Bersaglio**: uno Shadow (10001) nella stanza piu' lontana (passi), nel punto piu' lontano a piedi
  dall'ingresso a >= 240 dalle uscite, preferendo i punti senza giro lungo; niente altri nemici, niente
  forzieri.
- **stageId** = 992000 + indice del mondo x 100 + numero progressivo del tour nel mondo (DB 1 ... ED 8, DG 9,
  CS 11, HD 12, NL 13, SR 14): 992101-993406; `id` del master = stageId - 900000. Nome «Tour <XX><n> <stanza
  di partenza>».
- **Stanze disponibili**: servite oggi (`names_v4.tsv`, `ipa431\names_addnl.tsv`, `stage_gen\files`, meno le
  incomplete di `rooms_check.json`) + complete in `rooms_merged` (`_manifest.json` status `completa`): 399.
  Quando `rooms_gen` (risorse 35) e' pronto rilanciare con `--available <lista finale>` (JSON lista o
  `{"available": [...]}`). Oggi solo 992112, 992802, 993102 usano solo stanze gia' servite.

Esito 14-10: **57 tour, 207 parti** (2: 23, 3: 13, 4: 8, 5: 5, 6: 4, 7-9: 3, 17: 1); 19 stanze disponibili
senza porte utilizzabili (in `tours.json` `single_rooms`). `validate_maps.py <tours_v2> <cartella con map\ ->
rooms_merged> --jmp`: **0 errori**; avvisi: verso d'arrivo 0 (originale), «giro lungo» in 8 tour (9 verso porte
originali, lasciate dove sono: es. 992101 labirinto DB_0010, 992502 Underworld; 1 verso il bersaglio, 993402),
un bersaglio a 163 da un'uscita (992201, stanza piccola). Senza `--jmp` 14 tour hanno porte raggiungibili solo con
i salti. Per il validatore: giunzione `D:\Progetto_Restauro_KH_UX\tmp\tours_v2_cls\map` -> `rooms_merged`.

Master: `KHUX_TOURS_V2=1` (o il percorso di `tours.json`) in `make-game-tables.js` aggiunge le righe dei tour
(copie della 1050 come i 99100N; worldId del tour, mondi di Ralph -> 1; musica e miniatura dalla prima
missione del mondo, miniatura della stanza di partenza se una missione ha lo stesso thumbId). Provato su una
copia: +57 righe, nessuna riga esistente cambiata. Comando (poi alzare la revisione del master):
`$env:KHUX_MEDALS_ALL='1'; $env:KHUX_WORLDTOUR='1'; $env:KHUX_TOURS_V2='1'; node server\make-game-tables.js
D:\Progetto_Restauro_KH_UX\wiki\medals.json`. Avvio: `server/save/smoke.json` `{"stageIds": [992101, ...]}`
(server.js accetta gia' gli stageId del master); mappe da copiare in `stage_gen\files\stage` e POI da unire.

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

<a id="npc-talk"></a>
**Testi degli NPC** (I-154, 18-10). Sintomo al banco: missione 132 (stage 5020, Agrabah), la guardia ha la
nuvoletta gialla ma il tocco non fa nulla (niente testo, nessuna richiesta). Client: l'init dell'NPC
(4.3.1 `[fn]`; 1.0.1 `MapNonPlayableCharacter::init`) copia i due int a +0x14/+0x18 del record
npc; `get_talk` usa il primo col tipo 3, il primo o il secondo col tipo 1 (flag a +0x3ac), 0 con gli altri;
nuvoletta `img/stage_npc/NPCTalkIcon.png` per `(tipo|2) == 3`. La finestra (`[fn]`,
`SceneActionMap::makeTalkWindow`) legge `TextData::get(1, id % 200000000 + 200000000)` =
`text/drama/<n>.txt` (tipi `ui`, `drama`, `misc` a file 0x1663e2c; pagine separate da 0x0C) e senza il
file esce restituendo 8, in silenzio. I testi `2040xxxxx` (= 4 + stage a 4 cifre + npc a 2) arrivavano
dal CDN: nelle risorse WW c'e' solo `204010301`. 5020: un npc (730, 690, id 2005, tipo 3, talk 4050201)
-> `204050201.txt`, assente. Mappe servite: 178 testi citati, 1 servito, 177 nel pacchetto 2016 in
inglese (176 anche nel JP). Correzione: `recon/tools/import_npc_talk.py` in `build-resources.ps1` (dopo
i testi ui, prima di `resource_pack`) copia nel pacchetto generato la revisione corrente del 2016, in
mancanza quella JP (segnalata), rapporto `stage_gen
pc_talk.json`. Gli npc di tipo 4 hanno 1/2 in quei
campi: non parlano.

<a id="prove"></a>
## Prove sul banco

- Missioni 1-8 giocate; 1060 (Dark Forest, 2 parti) intera due volte (`route_1060.ps1`); 1240
  (Agrabah, 3 parti, wipe_4) con partenze spostate; 1050 corretta (forziere uid 4 spostato, totali
  STG 1,1,2,4) fino a `/stage/clear`.
- Crash del passaggio di parte: erano le tendine `wipe_N` mancanti (vedi
  [risorse_layout.md](risorse_layout.md#wipe)).
- `-Seek` non funziona sulle mappe scure (ISSUES I-008): la 1070 va giocata a mano.
