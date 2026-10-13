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

- `stage/mappoi_stg<id>.bin` = intestazione `STG`: [2] parti | (parte di partenza << 16), [3,4]
  partenza, [5] verso iniziale, [6] bersaglio, [8] aree, [9] nemici, [10] enemyId della scheda
  bersaglio, [11] bonus di livello, [14] forzieri, [15] oggetti.
- Ogni parte `mappoi_stg<id>_NN.bin` = file `MAP` della stanza (parser `[fn]`): `+0x24` X
  (inizio dati), `+0x28/+0x2c/+0x30` posizioni delle sezioni dopo i nemici meno 0x34; `X+0x34`
  aree, `X+0x38` nemici; aree da 0x44 (`[0]` primo nemico, `[1]` quanti), nemici da 0x20 (`x, y,
  enemyId, 1, 1, 1, reward, uid`), forzieri da 0x14 (`x, y, reward, tipo, uid`; sezione `+0x28` letta
  da `[fn]`), oggetti da 0x10. Il nome della stanza (`DB_0000_00_00`...) e' dentro la parte.
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
  l'indice installato (`names_v4.tsv` + `ipa431\names_addnl.tsv` + `stage_gen\files` +
  `medal_gen\files`) e dice quali stage la usano -> `stage_gen\rooms_check.json`. Incomplete:
  **DB_0018_01_00** (Underground Waterway: sky2, spover, over di `DB_0018_00_00`, 172 tessere) e
  **ED_0011_01_00** (over, sky di `ED_0011_00_00`, 171 tessere); nessuna missione originale le usa.
- `gen_story_maps.py` con `"rooms_check"` (o `"exclude_rooms"`) nella config le tratta come assenti
  (I-036; la scelta delle altre missioni non cambia). Rigenerati 991001 (11 parti: la porta
  «Underground Waterway Entrance» porta a Waterfront Park: Dock), 991008 (17), 12210-12250,
  14230-14250 (Fountain Square/Warehouse); tolte le parti in piu' 991001_11, 991008_17.

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
  991001: l'uscita «Moogle Shop» sul bordo della fontana non scattava: la freccia (disegnata ~100
  unita' oltre l'uscita) cadeva sulla fontana, toccandola il giocatore saltava sulla cima della fontana
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
  righe 602-623, `tx = p + 100·sin`): va corretto in d = 40..80 verso l'interno prima di rigenerare
  (correzione proposta in `freccia_uscita.md`, non ancora applicata: le mappe sono ferme per I-116).
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
- **Inventario** (`areas.md`/`areas.json`): gallerie della wiki (343 immagini) confrontate con le 379
  anteprime Roboloid `images/map` (nome file = codice stanza) + thumbId/mapName di thethiny + stage
  originali. Mondi 1-8: ~166 aree con nome, ~247 stanze (codici), **solo 59 stanze complete nelle
  risorse** (84 su 86 in totale; incomplete DB_0018_01_00, ED_0011_01_00). Mancano quasi tutte le
  aree di DW, WL, OC (Underworld), BC, CD, il deserto e il Bazaar di AG, mezza Daybreak Town.
  Roboloid ha l'anteprima grafica intera di molte stanze assenti: base per un'eventuale
  rigenerazione. Dubbi: AG_0003_01_00 con tre nomi, thumbId diverso dalla stanza nominata in alcune
  righe (OC_0001_00, WL_0001/0002, DW_0004, DB_0007), prefisso del Corridor of Darkness dedotto.

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
