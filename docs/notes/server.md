# Server: protocollo, master, salvataggio

Il server e' `server/server.js` (Node, nessuna dipendenza), con `server/README.md`. Indirizzi =
Ghidra (file + 0x100000). Storia: [../journal/fino-al-2026-10-11.md](../journal/fino-al-2026-10-11.md).

<a id="avvio"></a>
## Avvio e variabili

Di solito si usa `tools\ldplayer\session\run-server.ps1` / `relogin.ps1` ([banco.md](banco.md)). A mano:

```powershell
$env:KHUX_PUBLIC_URL    = "https://192.168.1.185"
$env:KHUX_REVISION      = "82"                     # revisione dei master: alzarla a ogni modifica
$env:KHUX_RESOURCE_DIR  = "D:\Progetto_Restauro_KH_UX\resource_data"
$env:KHUX_RESOURCE_KEY  = "<chiave 5.0.1>"          # vedi sotto
# KHUX_NEWCOMER=0/1 forza giocatore esistente/nuovo; KHUX_SAVE = file del salvataggio
node server\server.js
```

- Chiave 5.0.1 (non versionata): `python -I -c "import sys; d=open(sys.argv[1],'rb').read();
  print(d[0xe6ee54:0xe6ee54+32].hex())" D:\Progetto_Restauro_KH_UX\apk501\ext\lib\arm64-v8a\libcocos2dcpp.so`.
- Altre variabili: `KHUX_HIJACK` (suffissi DNS dirottati, include `kingdomhearts.com`),
  `KHUX_PLAYER_HP` (segnaposto), `KHUX_TUTORIAL_LAST_PHASE`, `KHUX_MASTER_SERVE_INVALID=1` (serve
  anche le tabelle che non passano lo schema).
- Porte 80/443/53 senza privilegi di amministratore. Certificati: `server/make-cert.sh <ip>`
  (retrodatati: notBefore 1/1/2020, perche' il guest e' nel 2021); la CA va installata come CA di
  **sistema** nel guest (lo fa `phaseb-guest.sh`).
- Console: `[dns:dirottata]`, `[dns]`, `[tls:sni]`, `[ok]`, `[?]` (endpoint sconosciuto, corpo
  decifrato).

<a id="bootstrap"></a>
## Bootstrap e canale cifrato

Host: **`api-s.sp.kingdomhearts.com`** (`json/server_config.json` dell'APK). `FUN_007bbe20` fa la
catena prima dell'azione 251 o senza sessione; gli errori restano `:251` per tutta la catena.

| # | Richiesta | Risposta accettata |
|---|---|---|
| 1 | `PUT /system/status` `{appSignature}` in chiaro (`FUN_007bd720`) | `{"appStatus":{"mode":"","current":"","server":""}}` |
| 2 | `GET /login/token?m=0` (`FUN_007be0d0`) | `{url (completo), nativeToken}` |
| 3 | `POST <url>?m=0` `{UUID, deviceType:2, nativeToken}` (`FUN_007bd5b8`) | `{nativeSessionId, sharedSecurityKey}`: **la chiave AES la sceglie il server** |
| 4 | `POST /system/login` cifrata, azione 251 | `ret` + `systemLogin {newcomerKhux, newcomerDark}` + `data` (>= 4 stringhe Base64 da 8/32/32/32 byte; **`data[3]` = chiave degli indici delle risorse**) + 21 link (stringhe vuote vanno bene) |
| 5 | `GET /system/coppa` (26) | `ret` + `misc` {"116","804","900".."907": uint}; **116 = 1** (con 0 crash dopo l'aggiornamento dei master, `FUN_00cfb268`) |

- Corpo delle richieste dal passo 4: form `v=<base64>` = AES-256-CBC del JSON, IV zero, senza
  Base64 interno; le GET lo portano nella query. `/system/login` manda `length`/`digest` della
  libreria (controllo d'integrita' lato server: basta accettarlo).
- Risposte in chiaro: `RESTClient::onRespond` (`FUN_00774fa0`) con `application/json` fa parse
  diretto; `encoded-json`/`octet-stream` decifra (`FUN_00771b3c`).
- **`maintenance` va omesso** in tutte le risposte (anche 0 = manutenzione).
- Involucro `ret` (`FUN_0077eb98`), ordine e tipi: `isMaintenance`, `isPhotonMaintenance`,
  `isKhuxMaintenance`, `isDarkMaintenance`, `sessionTO` bool; `isNewDayPeriod` int; `isRetry` bool;
  `versionApp` stringa; `versionRes`, `versionResLow`, `versionDat`, `commonVersionDat`,
  `darkVersionRes`, `darkVersionDat`, `functionFlags` int; `serverTime` "YYYY-MM-DD HH:MM:SS". Un tipo
  sbagliato = errore 2 = «200 ERROR :<azione>». «N ERROR :x» = codice curl N (6 host, 28 timeout).
- `json/server_api.json` (nel `misc.mp4` dell'APK): le **321 azioni** (indice = id, `path`,
  `method` 0 GET/1 POST/2 PUT).

<a id="dispatcher"></a>
## Dispatcher delle risposte e schemi

- `FUN_007c3204`: switch su 320 azioni (tabella di salto a `0x177e414`, indice id-1). Un parser che
  torna null = errore 2. Disassemblato lineare: `khux_linear.py <out> 007c3204 007d1080` (copia in
  `logs\dispatcher_linear.txt`).
- Metodo per una nuova azione: `recon/tools/action_case.py` -> decompilare i parser ->
  `recon/tools/response_schema.py` -> schema in `recon/out/api_responses_ww431.json` -> risposta in
  `server.js` -> prova sul banco. `batch_schema.py` (plan/merge) ha generato
  `api_responses_auto_ww431.json` (168 rotte): il server lo usa dove manca uno schema verificato.
- **Id a 0 nelle risposte generate = crash** (il client cerca una riga master inesistente, es.
  `medalId: 0` in `/user/support`): quelle rotte vanno a mano.

<a id="catena"></a>
## Catena di avvio del giocatore esistente

```
/khux/login (252: gameLogin.acquirableLoginBonus) -> /tutorial/status -> PUT /user/awakening
-> GET /user (1) -> /user/start -> /user/chat (6) -> /party (83) -> /user/stone -> /user/shop
-> /user/option (149) -> /tutorial/status -> /user/mission (187) -> DELETE /pvp/lock
-> PUT /passive/list (249) -> PUT /emblem/list (188) -> /user/sphere -> /user/medal -> /user/skill
-> /user/material -> /user/keyblade -> /user/deck -> /keyblade/subslot (191) -> /user/avatar/all
-> /user/avatar/parts -> /user/title -> /user/link (152) -> /user/support -> PUT /playtime/bp (311)
-> /pvp/keyblade -> /stage/160310 (108) -> ...
```

- `GET /user`: parser obbligatori `userData.user` (`FUN_0078ade0`), `userPoint` (`FUN_0078b230`),
  `userDetail` (`FUN_0078babc`), `stageResumption` (`FUN_0078c138`; `resumptionStatus` 0 = niente),
  `medalResumption` (`FUN_0078e30c`), poi `userPopUp.isPopBenefitStone`.
- `/user/create` (253): `systemLogin.newcomerKhux` false + `gameLogin.acquirableLoginBonus`.
- `/tutorial/status` (69/70): `phase`, `popupFlag` (uint64: il server salva i bit e a tutorial
  finito li da' tutti per visti, 2^53-1), `isFinished` (1 dalla fase 995: con 0 il menu a tendina
  resta inerte; con 1 la home crea pet e NPC, i cui LWF mancanti sono LWF vuoti nel pacchetto),
  `acquireTutorialJewel`.
- `GET /keyblade/subslot` (191, `FUN_00798a64`): `subslotMaxNum`, `userKeybladeSubslots[]`
  (`keybladeSubslotId`, `subslotRate`, `subslots[]`): senza, Equipment va in crash
  (`std::out_of_range` in `FUN_00c16d14`).
- Dopo il Prologue: 86 `/party/member/list`, 62 `/user/sphere/reset`, 61 `/user/sphere/check`,
  120 `/raid/reward`, 241 `/user/notice`, 105 `/party/lux_up_time`, 169 `/stage/achievements`, 250
  `/stage/pickup` (`pisckupStages`, sic), 185 `/user/theater/available`, 81 `PUT /party/notice`, 59
  `/mypage` (`backgroundId` 150911), 177 `/pet/coordinate/members`, 143 `/campaign`, 240
  `/raid/list` (`selfRaid`, `raids[]`), 2 `/user/point`.
- `/stage/achievements` risponde con numeratori/denominatori a 0: la schermata Quests mostra
  «COMPLETE» su tutte le categorie (ISSUES I-037).

<a id="master"></a>
## Tabelle master

- Download: azione 27 `GET /system/master/20200423` -> `master {revision, commonRevision, count}` +
  per tabella `{revision, url, key (32 caratteri), md5}`. File: corpo -> `curl_easy_unescape` ->
  Base64 -> AES-256-CBC (key = i 32 byte della stringa, IV zero, PKCS#7) -> JSON; `md5` = MD5
  esadecimale del corpo HTTP. Il client le salva come `m/m%03d.jpg` (BGAD).
- 106 tabelle (nomi nel loader a `0x20a0b80`, passo 0x80). Ogni tabella = **array di righe**; ogni
  campo dello schema e' obbligatorio, chiavi in piu' ignorate; riga nulla = «Master data error».
  Schema: `recon/out/master_types_ww431.json` (1.739 campi, `recon/tools/master_types.py`); il
  server non serve le tabelle che non passano.
- Getter per id senza controllo del null: una riga mancante = crash (es. `misc` 804 lunghezza del
  nome; `player` livello 0; `mypageBackground`; `reward` dei nemici). Id di `misc` letti dal codice:
  `recon/out/misc_ids_ww431.txt` (98).
- Rigenerare `server/master_data/` (fuori dal repo):

```powershell
node server\make-master-stub.js --force          # 106 tabelle minime + misc
node server\import-master.js D:\Progetto_Restauro_KH_UX\apk501\extra_files `
  avatarParts initItem misc stage world stageDrama enemy enemyAttack keyblade skill buff `
  burst battleMisc badstatus tutorialMisc medalMisc material title theater raidEnemy raidEnemyAttack
node server\make-game-tables.js D:\Progetto_Restauro_KH_UX\wiki\medals.json
node server\make-moogleshop.js
node server\make-multi-tables.js                # Union Cross: multi, multiStage
node server\make-keyblade-levels.js             # keyblade +0..+35 e keybladeSubslot (dopo import-master)
node server\make-passives.js                    # passive e passiveSetting (dopo make-keyblade-levels)
```

- `make-game-tables.js`: medal, player (lv 0-99), reward, mypageBackground, stage 1-525 (da
  thethiny), burst generati, enemyAttack generati per tutti gli skillId (i nemici con `validSkill` 3
  andavano in crash), mission (`server/tables/mission.json`), sphere/sphereArray/sphereMasu
  (`server/tables/`). Opzioni: `KHUX_MEDALS_ALL=1` (2.094 medaglie), `KHUX_ZOO=1`
  (`KHUX_ZOO_COUNT`) per le missioni zoo 990001...
- `import-master.js` collega ogni keyblade alla successiva presente (la 5.0.1 ha tolto livelli a cui
  `evolveId` punta).
- Fonti: 55 tabelle dall'`extra.mp4` dell'APK 5.0.1 (chiave 5.0.1), righe binarie di thethiny
  decodificate (`raw_master.py`, `raw_master_old.py`), khuxwiki. Vedi
  [ricerca_esterna.md](ricerca_esterna.md).
- `initItem`: categoria 100 = parti avatar; 3 = deck iniziale (13021 Donald A, 11021 Goofy A, 13031
  Yuna); 13 = keyblade 1000 Starlight. Significato delle altre categorie non ricavato.

<a id="risorse"></a>
## Protocollo delle risorse

- `FUN_00ecd988`: master (27) se la revisione differisce; risorse (28 `GET /system/resource`) solo
  se il giocatore non e' nuovo e ha finito il tutorial.
- Risposta: `{resource: {mode (0/1 completo/2 incrementale), minVersion, versions: [{data: [{url,
  md5, size}], index: [...]}]}}`. Il server annuncia **solo l'ultima versione** (`ret.versionRes`
  = ultima in `resource_data`).
- Download accettato se lunghezza = `size`, MD5 = `md5` e Content-Type contiene
  `application/octet-stream`. Installazione: `files/r/misc.mp4` (+ `.1` oltre 2 GB) e `r/misc.png`;
  l'indice deve avere i record `/`, `md5` (32 caratteri, cifrato con `data[3]`) e `size`
  (= somma dei data), altrimenti «Save error». `recon/tools/resource_index.py` lo costruisce.
- Crash una tantum subito dopo un'installazione (`0x12c1ee0`): al riavvio passa.

<a id="salvataggio"></a>
## Salvataggio del giocatore (`server/save/player.json`)

- Si salva a ogni modifica: nome, avatar, Union, Lux (`luxRank` = livello, soglie `needExp` di
  `player`), `money`, `freeStone`, `materials`, `medals` (`userMedalId` da 101), `medalLocks`,
  `medalTraits`, `deck` (tiene gli zeri di posizione), `stageScores`, `missions`, `titles`,
  `sphereNotified`, `sphereBonus` {hp, ap, cost}, `ap`/`apTime` ([AP](#ap)), `keybladeBurst`, `keyblades`, `keybladeDecks`, `favoriteKeybladeId`, `starlightKeybladeId`, `keybladeSubslots`, `keybladeEnhanceCount` ([keyblade](#keyblade)), fase e `popupFlag` del tutorial.
- «Nuovo» finche' non ha fatto `/user/create`. Per ricominciare: cancellare il file (o `cycle.ps1`).
- **Stato provvisorio all'11 ottobre**: `sphereBonus.hp = -2950` (HP 50) per provocare la sconfitta
  (ISSUES I-028): rimettere **40** a prova finita. `deck` [1,0,3] di prova.
- `userDetail.lastClearStageId` = numero di missione (campo `id` di `stage`), non lo stageId;
  `maxMedal` 300 (segnaposto: con 0 popup mancante), `maxDeckCost` dal campo `cost` di `player`.
- `sentDeckMedalIds()` toglie gli zeri da `userDecks`/`userKeyblades` (vedi
  [battaglia.md](battaglia.md#slot-vuoto)).

<a id="ap"></a>
## AP (consumo e ricarica)

- `userData.userPoint` (`FUN_0078b230`): `ap` -> +0x34, `maxAp` -> +0x3c, `lastApDatetime` -> +0x40
  dell'oggetto cifrato (lettore `FUN_006e02d4`), singleton a +0x118 del gestore (`FUN_007c1dfc`).
- **AP mostrato** `FUN_0085bcac` (secondi al prossimo punto in `*param_2`): se `ap < maxAp` e
  `lastApDatetime` e' passato (`FUN_00719400` <= 0), AP = `ap + trascorsi / (misc 101 x 60)`, al
  massimo `maxAp`; con `ap >= maxAp` mostra `ap` (anche oltre il massimo) e non ricarica.
  `FUN_0085be28` = secondi al pieno; `FUN_006e7e4c` = AP pieno (`maxAp <= AP`).
  **misc 101 = 3: 1 AP ogni 3 minuti** (dal codice, non da fonti online).
- `maxAp` = colonna `ap` della tabella `player` al rango Lux (16 al livello 1, 160 dal 200), come
  `maxDeckCost` da `cost`, + `sphereBonus.ap` (prima: 10 fisso + bonus).
- Server: `player.ap` + `player.apTime` (ms reali da cui conta la ricarica; `lastApDatetime` =
  `serverTimeAt(apTime)`, coerente anche dopo un riavvio). `apState()` fa lo stesso conto del client,
  `changeAp()` spende (se era pieno la ricarica parte da adesso, altrimenti tiene il punto parziale).
  Salvataggi senza `ap`: AP pieno.
- `POST /stage/start` (corpo `stageId`, ...): scala `useAp` della riga di `stage` (Quest 130 = 10).
  `/stage/retire` e `/stage/continue` non rimborsano.
- Level up (rango Lux che sale in `/stage/clear`): AP = AP di prima + nuovo `maxAp` (oltre il massimo).
- `POST /shop/ap/recover` (azione 72, costruttore `FUN_008ef66c`, corpo vuoto; popup
  `PopupNormal_AP_Recovery` in `FUN_006e5d10`, prezzo nel testo = **misc 112 = 100 jewel**): -100
  `freeStone`, AP + `maxAp`; risposta `userData.userPoint` + `userKeyblades`.
- Da verificare sul banco: HUD dopo lo start (es. 18 -> 8), il timer del fumetto
  `BalloonNomal_AP_Recovery` (`FUN_00b8ee90`), il recupero con jewel (pieno aggiunto o portato al
  massimo? ipotesi: aggiunto) e l'AP del level up (ipotesi, non confermata da fonti).

<a id="api-funzioni"></a>
## API di funzione (oltre l'avvio)

Le schermate hanno le loro API, descritte nei file d'area: medaglie
([medaglie.md](medaglie.md)), Moogle Shop ([moogle_shop.md](moogle_shop.md)), bacheche
([bacheche.md](bacheche.md)), profilo e missioni ([home_profilo.md](home_profilo.md)), stage
([battaglia.md](battaglia.md)), Union Cross ([union_cross.md](union_cross.md)).

<a id="eventi"></a>
## Eventi (`GET /stage/event`, azione 109)

- Tasto «Events» dell'elenco Story (sbloccato dopo la Quest 14). Ramo del dispatcher a `0x7c5e98`:
  parser `FUN_0079f62c` (risultato a +0x278 del gestore, letto da `FUN_009c1374`), poi
  `eventCategory` (int, **facoltativo**, alla radice -> +0x71).
- Radice: `events[]` (array, obbligatorio) e `highScoreRank` (uint, obbligatorio). Senza eventi:
  `{"events": [], "highScoreRank": 0}` -> il client mostra «No available events.» (Txt_NoEvent).
- Elemento (`FUN_0079f578` -> `FUN_0079e924`), tutti obbligatori:
  `stages[]` (come `stories[]` di `/stage/160310`: `stageId` int, `useAp` int, `score` uint64,
  `playStatus` int, `clearMissionIds` int[]), `eventStageId` int, `showIcon` int, `bannerUrl` string,
  `eventType` int, `status` int (2 = mostra Txt_Description invece del tempo), `endTime`
  "YYYY-MM-DD HH:MM:SS", poi `newStageId` int, `isLock` uint (1 = lucchetto e maschera),
  `complete` int (icona di completamento).
- Esempio di un evento (in `server/save/event.json`, letto da `respondStageEvent`):
  `[{"stages":[{"stageId":<id>,"useAp":0,"score":0,"playStatus":0,"clearMissionIds":[]}],
  "eventStageId":<id evento>,"showIcon":1,"bannerUrl":"","eventType":1,"status":1,
  "endTime":"2026-12-31 23:59:59","newStageId":<id>,"isLock":0,"complete":0}]`.
  `eventStageId` e gli stage devono esistere nelle tabelle master (id a 0 = crash): da verificare.

<a id="keyblade"></a>
## Keyblade posseduti (I-050)

- Starlight (initItem categoria 13) = `userKeybladeId` 1, deck `player.deck`. Gli altri: premio di
  tipo 13 (`grantItem` -> `grantKeyblade`, uno per serie = `category` della tabella keyblade), in
  `player.keyblades` [{userKeybladeId 2.., keybladeId, getDatetime, burst}], deck in
  `player.keybladeDecks[id]` (0 = slot vuoto). `userDeckId` = `userKeybladeSubslotId` =
  `userKeybladeId`. Preferito: `player.favoriteKeybladeId` (default 1; il Profilo manda quello).
- Premi di tipo 13 nelle tabelle: primo completamento (`clearGetItemType`: stage 1110 Quest 14 ->
  Treasure Trove 2000, poi 1210, 1310, ...) e obiettivi (`submissionRewardType`). I salvataggi di
  prima li ricevono una volta all'avvio del server (blocco in fondo a `server.js`).
- Elenchi completi a ogni risposta: `userKeyblades` (`FUN_0078cca8`/`FUN_0078c904`; `category`
  dalla tabella: Starlight 1, Treasure Trove 201), `userDecks` (uno per keyblade),
  `userKeybladeSubslots` (uno per keyblade: senza, Equipment va in crash).
- `POST /user/keyblade/update/170516` (azione 45, corpo da `FUN_007e1320`): `userKeyblades`
  [{userKeybladeId, userDeckId, isFavorite}] + `userDecks` [{userDeckId, medals[], petBaseSlotMedal}]:
  il server salva i deck e il preferito e risponde `userKeyblades` + `userDecks`. Prima finiva nello
  schema automatico (elenchi vuoti). Da vedere sul banco il corpo vero (log `[keyblade] deck`).
- `/stage/start` salva `userKeybladeId` (`player.currentUserKeybladeId`): la gauge di `/stage/clear`
  va in quel keyblade. Unequip (`/user/medal/remove`) toglie la medaglia da tutti i deck.
- Immagini: il popup del keyblade ottenuto (`BattleResult_KB`, `FUN_00c5261c`) e le icone dei premi
  (`FUN_0074bee0`, tipo 13) caricano `img/keyBlade/KeyBlade_%06d.png` con il `displayId` della
  tabella keyblade (campo +0xcc): assenti da tutte le risorse (restava `Deck_KeyBlade_0701_05` =
  Olympia). `recon/tools/make_keyblade_images.py` le genera (64) dalla bitmap del LWF
  `lwf/avatar/keyblade/keyblade_%04d_%02d` (displayId/100, displayId%100), nella posa di
  Deck_KeyBlade_0701_05, BTF a palette; `build-resources.ps1` (anche `-Quick`). Equipment e la
  scelta del keyblade usano i LWF, che ci sono tutti. Riferimenti: `reference\keyblades\`.
- Optimize (I-051, banco 11 ottobre): `POST /user/keyblade/update/170516` con `userDecks` vuoto e
  `isFavorite` 1 sul keyblade scelto. Il corpo lo costruisce `FUN_0098b6d8`: manda tutti i keyblade
  (`isFavorite` = il keyblade selezionato, `+0x8cc`) e solo i deck cambiati (maschera `+0x4d8`):
  vuoto perche' Optimize non aveva ancora salvato nulla. Il crash dopo (pc `0x8cb92c`, ARM `kbopt`) e'
  nella cella della medaglia `FUN_008c8904` (DeckEdit_RevolverMedal_ver330, via `FUN_008cf048`): se
  l'attributo della medaglia (riga medal `+0x494`) e' quello dello slot (`attribute[]` del keyblade,
  4 = qualsiasi) crea `lwf/medal/medaltype/MedalType%d` (nei modi di cella 2/4/5/6/7
  `MedalType01`); servito solo MedalType3 (Magic), quindi nodo LWF nullo. Starlight ha slot 3/4/4
  (mai visto), Treasure Trove 4/4/1 (Power). `recon/tools/make_medaltype_lwf.py` scrive MedalType1
  (rosso), MedalType2 (verde), MedalType01 come copie ricolorate di MedalType3, con le texture sia
  col nome originale sia `<nome LWF>_<hex>.png`.
- Optimize, seconda parte (I-051): niente crash ma deck vuoto. Il client usa la lunghezza di
  `deckMedals` come numero di slot: Optimize (`FUN_00996808` -> `FUN_0097add0`) riempie solo quelli
  e `FUN_00991c5c` segna il deck cambiato (maschera `+0x4d8`, quindi mandato in `userDecks`)
  confrontando solo quelle voci. Con `[]` nulla cambiava. Un deck tutto vuoto ora si manda come
  `[0, 0, 0]` (`validConsist` della riga keyblade); gli 0 di un deck in parte pieno restano tolti
  (battaglia, [battaglia.md](battaglia.md#slot-vuoto)): su quei deck Optimize considera solo gli
  slot pieni.
- Optimize come l'originale (I-075, banco 12 ottobre): il pulsante e' nella schermata «Select a
  Keyblade.» prima della quest (`Button_Auto` di `StartDeckEdit2_Button_ToDeck_ver260`, popup
  «Optimize Medals for <keyblade>?»). L'algoritmo e' del client: `FUN_0075de5c` da' un valore a ogni
  medaglia (forza + trait, moltiplicatore dello slot secondo l'attributo accord +0x114 / dlaccord
  +0x128, guilt, bonus della quest), `FUN_0097add0` riempie gli slot dal moltiplicatore piu' alto,
  entro il costo; lo slot del pet solo col pet. Il numero di slot = lunghezza di `deckMedals`: con i
  deck compatti riempiva solo gli slot gia' pieni (2/5). Ora `sentKeybladeDeck` manda uno 0 per
  slot vuoto fino agli slot sbloccati (Stock Medal, [battaglia.md](battaglia.md#slot-vuoto)); il
  client stesso manda 0 negli slot che restano vuoti (`[318,0,317,0,456]`, costo 62/62).
  Fonti dei giocatori in `reference\optimize`.
- Optimize, terza parte (I-051): con gli slot `[0,0,0]` Optimize valuta ogni medaglia posseduta
  (`FUN_0097add0` -> `FUN_0075de5c`): legge la riga burst del `burstId` della medaglia (riga medal
  `+0x4fc`, tabella burst = id 0x26 di `FUN_00ef0310`) senza guardare `validBurst`. Le 42 medaglie di
  supporto (Dewey, Fata Smemorina, ...) hanno `burstId` 0 e nessuna riga: crash a 0x10.
  `make-game-tables.js` aggiunge una riga burst 0 vuota (tutti i campi a 0; aggiunta anche a mano a
  `master_data/burst.json`, revisione dei master +1). Effetto collaterale da tenere d'occhio: con
  il deck `[0,0,0]` il riquadro mostra STR/DEF 150/150 (gli 0 contano come la medaglia finta) e una
  quest avviata con quel deck vuoto avrebbe tre medaglie finte.- Grafica per keyblade e per attributo (I-057): «Select a Keyblade» carica
  `lwf/medal/medaldeck/MedalDeck_Type%d` (e `_Type%d1`, `_Type01`) per l'attributo della medaglia
  nello slot e `img/carouselDeck/Deck%03d.png`, `DeckButton_%03d.png`, `DeckMedalNumUI_%03d.png`
  (`_pvp_`) con displayId/100 del keyblade. Servite solo Type3 e 001: con le medaglie di Optimize
  (Power) nel deck di Treasure Trove crash a 0x8d00e0 (fault 0x0). `make_keyblade_decks.py`
  scrive le copie (deck ricolorati sulla tinta dell'arte del keyblade, palette; bagliori Power
  rosso, Speed verde). Pacchetto generato a ~15,6 MB su 16 MiB di riserva: la prossima aggiunta
  grande richiede una versione completa con riserva piu' alta.- Posa del keyblade nei riquadri dei menu (I-052): `FUN_00eb6f38` (chiamato da `FUN_00990130`,
  «Select a Keyblade», modo 3, e da `FUN_00c04188`) carica il LWF `keyblade_%04d_%02d` (se manca,
  `img/keyBlade/KeyBlade_%06d.png`) e prende rotazione, scala e posizione da
  `rule/keyblade_rule.bin` (`FUN_00eb72e4`: record di 0x44 byte, keybladeId + 4 modi x (rot x10000,
  scala x10000, x, y); prima il keybladeId, poi la serie id/1000*1000, poi 1000). ofsX/ofsY della
  tabella keyblade non c'entrano (provato sul banco, rev. 83/84). Il file servito ha solo 1000..11000
  e con i LWF della 5.0.1 Treasure Trove cade 17 unita' a destra. `recon/tools/keyblade_rule.py`
  calcola il centro dell'arte di ogni LWF (frammento -> traslazione -> matrici) e scrive una riga per
  keyblade (64) con la posizione che lo porta sul centro di Starlight, rotazione e scala originali
  della serie. Il modello torna con i valori di Square Enix per quasi tutte le serie (Lady Luck,
  Three Wishes, Divine Rose, Olympia entro 2 unita'). L'avatar non e' toccato (stesse LWF).
- Livelli (I-067): il livello e' la riga della tabella keyblade (un keybladeId per livello:
  serie*1000 + lv*10 fino a +20, poi serie*1000 + 200 + lv-20; Bad Guy Breaker lv*10). La riga dice
  i materiali per il livello dopo (`validNeedMaterial`, `needMaterialId/Num`: la finestra KEYBLADE
  li mostra come Needed/Held) e `evolveId` = riga dopo (0 = massimo). La 5.0.1 ha solo i livelli col
  cambio di design (64 righe): `server/make-keyblade-levels.js` rigenera +0..+35 di ogni serie (576
  righe, quelle nuove con `"generated": true`) dalla khuxwiki (`reference\keyblades\keyblade_levels.json`,
  copia ridotta in `server/tables/keyblade_levels.json`): slot, attributi, Upright/Reversed
  (`darklight` 1/2, 3 = nessuno), `accord`/`dlaccord`, gauge, `partnerRate`, materiali post 2.6.0;
  design, passiva e posa dalla riga 5.0.1 precedente. Confronto con le 64 righe 5.0.1: tutto uguale
  tranne 3 campi (accord di Stroke of Midnight +0, dlaccord di Missing Ache, partnerRate di Bad Guy
  Breaker +35: tenute quelle 5.0.1). Tolti i Trophy NI/CS/CK di Bad Guy Breaker (assenti da
  `material`). Oltre +35 (+35.1..+60 dell'ultima versione, con le passive) no: `lv` intero, la 5.0.1
  chiude a +35.
- `POST /keyblade/enhance` (azione 54, «Strengthen»; corpo `FUN_007e38ac` = `{userKeybladeId}`;
  chiamato da `FUN_00c19c04`/`FUN_00c19f5c`): `server/keyblade-evo.js` toglie i materiali della riga,
  passa a `evolveId` (Starlight in `player.starlightKeybladeId`, gli altri in `player.keyblades`),
  niente munny. Risposta (ramo 54): `userKeyblades`, `userDecks`, `userMaterials`, `userTitles`.
  Materiali mancanti o livello massimo: nessuna modifica (log `[keyblade] enhance`);
  `KHUX_KB_FREE=1` = senza materiali. Dopo, il client manda `PUT /passive/list` (249, `isList` 0 ->
  `newPassiveSettingIds`).
- Dopo la risposta `FUN_00c1abd0` confronta il `displayId` (+0xcc) di prima e dopo: uguale ->
  risultato `FUN_00c05ef0` (`DeckEdit_KBStrength_Result_ver210`, `lwf/result/KeyEvo_LevelUp`, frecce
  slot per slot su accord +0x114 / dlaccord +0x128); diverso -> `lwf/memudemo/KeyBlade_Evolution`
  (`FUN_00c0eebc`: movie `keyblade_previous`/`keyblade` caricano i LWF del keyblade, va avanti quando
  `_root` arriva all'ultimo fotogramma) e poi il risultato. Slot nuovo: `KeyEvo_Medal_01B`,
  `KeyEvo_eff`, `medal_blank_slot1-3` (attributo 3/1/2) in `lwf/keyblade/KeyEvo/`. Nessuno di questi
  LWF esiste nelle risorse (nullo = crash): `make_layouts.py` mette LWF vuoti (si salta l'animazione).
- Sub-slot: `GET /keyblade/subslot` (191) e `POST /keyblade/subslot` (192, corpo `FUN_00804a94`:
  `{updateKeybladeSubslots: [{keybladeSubslotId, subslotMedals: {"<n>": userMedalId}}]}`; risposta
  `subslotMaxNum`, `userKeybladeSubslots`, `userKeyblades`). Master `keybladeSubslot` (vuota nella
  5.0.1) rigenerata: 120 sub-slot per serie `{subslotId, category, slotNumber, attribute,
  darklight}` dall'albero della khuxwiki; `subslots[]` di ogni keyblade = 120 voci (0 = vuoto),
  Equipment (`FUN_00c16d14`) scrive «Subslot n/120» (come lo screenshot giapponese).
  `subslotRate` = somma dei bonus per tier (`guiltValue`) delle medaglie: 1..10 = 1, 2, 5, 8, 12, 16,
  20, 25, 30, 35 millesimi (guida dell'utente pag. 11, khuxwiki per 9-10); `userKeyblades[].subslotRate`
  = `subslotRate` della riga (16000/12000/10000 = x1.6/1.2/1.0 per 1/2/3 attributi). Testi:
  `Txt_SubSlot_Rate` «+%01.3f» = (k * subslotRate / 100) / 1000 (`FUN_00c27228`, k da verificare),
  `Txt_KeyBlade_Lv_Rate_Label` = subslotRate della riga /10000. `KHUX_SUBSLOT_MAX=0` spegne i
  sub-slot, `KHUX_SUBSLOT_SCALE` cambia l'unita'.
- Schermata dei sub-slot (I-066, crash al tocco di «Subslot»): `FUN_00c17394` -> `FUN_00c12a98`
  (SceneDeckEdit::openSubslotPanel) carica `DeckEditSubSlotScene_ver340` (assente; servite solo
  `_ver260`/`_ver310`). Cerca dalla radice (ricorsivo): `DeckEdit_SubSlot_Select_Medal` (nodo) >
  `Win_under` > `Scroll_Area` (vi crea MiniMedalScrollView), `DeckEdit_SubSlot_Set_Medal` (nodo) >
  `Win_under` > `Scroll_Area` (vi crea KeybladeSubslotMedalView), `SubSlot_UpArrowEff` (nodo
  armatura), `BestButton` > `Txt_Best` (106180100 «Optimize»), `Txt_NotExist` (106140376),
  `Close_Button`, `Panel_34` > `Txt_Subslot_Caution_Label` (106140377); nel Set_Medal
  `Txt_KeyBlade_Label`, `Txt_SubSlot_Rate` (106140371), `Txt_SubSlot_Num` (106140374),
  `Txt_KeyBlade_Lv_Rate_Label` («x%01.1f»). Ad ogni cambio `FUN_00c27228` scrive
  `Txt_SubSlot_Rate_Label` («+%01.3f») e `Txt_SubSlot_Num_Label` (106140352) nel Set_Medal, crea
  l'armatura `EFFECT` in Win_under > `panel` quando il moltiplicatore sale, fa lampeggiare
  `Panel_34` se gli slot non sono in ordine. Cella `DeckEdit_SubSlotMedal_ver260` 164x154
  (`FUN_00aa19d4`/`FUN_00aa1b3c`/`FUN_00aa2190`): `Medale`, `SubSlot_Route_LR/LR1/LR2/UD/UD1/UD2`,
  `MedalBase` (ImageView, `img/ui/Subslot_MedalSlot%03d.png` con la category del keyblade = 1,
  201 ... 1901, offset 0xd0 del master), `Slot`, `SlotNum` (TextAtlas), `InfoPanel`, `TYpe`
  (`img/ui/Deck_Medal%d`), `Icon_Type`, `Icon_Type_1` (`img/ui/Deck_Mark_*`), `Medal_S`,
  `Txt_Mag_Label`, `Guilt_Icon`, `Cursor` (vi crea l'armatura `Z_SpCursor`); `MatchSlotLWF`
  facoltativo. Il revolver in modalita' sub-slot (DeckRevolverView, 0x8c9f0c) clona
  `DeckEdit_SubSlot_MedalInfo_ver260` in `Area_MedalInfo` col nome `SubslotInfoPanel` (`Icon_Type`,
  `Txt_Mag_Label`). Layout generati in `make_layouts.py` (11 ottobre, aspetto da
  `reference\subslot`): scena ver340 = ver310 originale con `DeckEdit_SubSlot_Set_Medal_ver340`
  nuovo, `DeckEdit_SubSlot_Select_Medal_ver310` (la ver260 servita ha un 9-slice su Panel20,
  assente), `DeckEdit_Subslot_Caution_ver260`, `DeckEdit_SubSlotMedal_ver260`,
  `DeckEdit_SubSlot_MedalInfo_ver260`; texture in `make_textures.py`: `Subslot_MedalSlot%03d` (16
  category), `Subslot_Route`, copie in img/ui di `Deck_Mark_Uplight/Reverse`, `Deck_Medal1` e
  `Deck_Medal2` (verde, dalla 1). Da provare sul banco.
- Sub-slot, aspetto e trascinamento (banco sb_2..sb_5, 11 ottobre). Lista «SUBSLOT MEDALS»:
  MiniMedalScrollView = MedalScrollView (`FUN_0091d10c`, vtable come Swap Medals) con celle fisse
  120x164 (`FUN_0087fa88`), colonne = larghezza di `Scroll_Area` / 120 (400 -> 3, come la 380 della
  ver260); `+0xb26` = 1 (sub-slot) e modo 10 (`FUN_00880c9c`). Ogni cella = DeckRevolverView piccolo
  (`FUN_0087fb7c(1)` -> `FUN_008cec04`: `DeckEdit_SmallMedal_ver330` originale, `Medal` = Medal_S
  190x190 naturale, piu' `DeckEdit_Deck_MedalInfo_ver260` in `Area_MedalInfo`); il modo 10 di
  `FUN_008c8904` mette `img/ui/Minfo_Pet01.png` (assente) in `Icon_1` e «×%01.3f» (106140350) in
  `Txt_1`, poi aggiunge `SubslotInfoPanel` («+%01.3f», 106140372, tier in `Guilt_Icon`, attributo in
  `Icon_Type`): il pannello deve coprire tutto `Area_MedalInfo`, da qui la targhetta opaca
  `Subslot_InfoPlate` (sb_2 «×+0.030», tier tagliato a x -8). Grandezza delle medaglie e
  sovrapposizione delle ali come in subslot_JP_1 (stessa cella, non si cambia senza codice). Slot:
  `FUN_00aa2190` carica in `Medal_S` la Medal_S (`FUN_00eb5dec`) senza toccarne la misura (layout:
  190x190 ignoreSize, prima 89x109 stirata). Trascinamento slot -> lista (`FUN_00aa4f30`): copia
  della cella con `FUN_00aa1b3c(0)` (nasconde Route, MedalBase, Slot, SlotNum, InfoPanel, TYpe),
  medaglia in `Medal_S`, scala 1.5, aggiunta al livello di `FUN_00b99b60`, ma `Medal_S` non viene
  reso visibile: era nascosto nel layout (sb_4). Lista -> slot (`FUN_00881654`): copia
  `FUN_0087fb7c(0)` = `DeckEdit_RevolverMedal_ver330` originale, opacita' 200; parte solo con un
  primo spostamento orizzontale (>= 30) su una medaglia non velata, uno verticale (>= 20) fa
  scorrere la lista. `Panel_34` (avviso): `FUN_00c27228` lo fa solo comparire/svanire, posizione
  dal layout, ora sulla barra «Equipped Slots». Regole del client (`FUN_00c27228`,
  `FUN_00aa46dc`): «Equipped Slots» = slot pieni consecutivi dal primo, il moltiplicatore somma i
  bonus solo fino al primo slot vuoto: con lo slot 1 vuoto 0/120 e +0.000 sono corretti.
<a id="passive"></a>
- Passive Effects di **Equipment** (I-065, banco 12 ottobre): non e' il PassiveDialog ma il popup web `Information2_Base` (`FUN_006f1f6c`/`FUN_006f20a4`, titolo 106220508) sull'URL `passiveSettingList` del login (`FUN_00791070` -> singleton +0x390 +0x228; `FUN_006ec8d4` aggiunge una query). Il server ora manda `http://api-s.sp.kingdomhearts.com/web/passive` (pagina HTML di `respondPassivePage`): in https la WebView (Chromium) rifiuta il certificato che il client nativo accetta (`tls:errore CERTIFICATE_UNKNOWN`), con lo sfondo trasparente non si vede nulla. Il PassiveDialog (`Passive_Base_ver341` originale, `Txt_None` 106220507 visibile se `passiveSettingIds` e' vuoto) lo apre `FUN_008f86a4`, callback del pulsante `Button_Passive` del **Profilo** (lambda `FUN_008f8454`, creata da `FUN_008f3f40`; I-086, [home_profilo](home_profilo.md#profilo)); la parte qui sotto su `PUT /passive/list` riguarda quello (dove dice Equipment leggere Profilo).
- Passive Effects (I-065). Il pulsante di Equipment manda `PUT /passive/list` (249, corpo
  `FUN_007dc8a0`, sul banco solo `{isList}`), e la callback `FUN_008f86a4` apre
  `PassiveDialog::open` (`FUN_00a862ec`) solo se la risposta è valida. Il ramo 249 (0x7c670c) legge
  `isList` e poi `FUN_007accd4`: con `isList` 1 legge `passiveSettingIds`, con 0 legge
  `newPassiveSettingIds` (uint[]). Se l'array manca il parser rende nullo, il ramo fallisce e
  non si apre niente: era il difetto (prima il server rispondeva solo `ret`). Con `isList` 1 si
  legge anche `userId`: se manca la lista è la propria (singleton +0xab8), se c'è è di un altro
  giocatore (+0xad8). `isList` 0 mette le nuove in +0xac8 e le aggiunge a +0xab8 (`FUN_007acf08`).
  Il popup `PassiveResult` (`FUN_00c54f84`) mostra nome e `description`.
  - Schermata: `Passive_Base_ver341` con `Scroll_Area`, `Txt_None`, `Total_Area`, `Total_Score_01..15`,
    `Panel_TotalSwitch`, `Button_PassiveInfo` (apre l'URL `passiveSettingList` di /system/url);
    celle `Passive_Panel` (`Txt_Passive_Label` = `name` della riga passive, `Icon_New`), ordinate per
    `sortId`. Con la lista vuota compare «There are no passive effects.» (106220507), come
    nell'originale. Il riquadro Total (`FUN_00a87334`) mostra HP, SP ATK Gauge, STR e DEF
    (`FUN_0076a2f0`) e la STR per tipo di medaglia (categorie di `FUN_0076b5c8`: U, R, P/S/M,
    Upright P/S/M, Reversed P/S/M; testi 106230203..217). Tutti i layout ci sono già nelle
    risorse servite: niente da aggiungere a `make_layouts.py`.
  - Master (vuote nella 5.0.1), generate da `server/make-passives.js` (dopo
    `make-keyblade-levels.js`; copia ridotta in `server/tables/passives.json`).
    - `passive` (`FUN_00f1f070`): `passiveId, name, validPassive, type[], value[], hp,
      abilitygauge, attack, defense, attribute`. type 3 = filtro medaglie, value = maschera
      1 P, 2 S, 4 M, 8 Upright, 16 Reversed. Senza type la passiva vale per tutto.
    - `passiveSetting` (`FUN_00f1f880`): `passiveSettingId, sortId, passiveConditions,
      passiveValue1/2, description, passiveId`.
    - Dati della khuxwiki «Passives» (`reference\passives\`): Lux LV 350..999 (520 righe) e
      keyblade +35..+60 (791 righe, 23 passive distinte).
    - Il client non valuta le condizioni. Le nostre: 1 = livello Lux >= value1; 2 = serie value1
      con livello*10 >= value2.
    - Id: Lux 10000+LV; keyblade 100000 + category*1000 + lv*10.
  - Server (`keyblade-evo.js`, `respondPassiveList`): calcola le passive dal livello Lux
    (`luxRankFor`) e dal livello più alto di ogni serie posseduta. Con `isList` 1 risponde con tutte,
    con 0 solo quelle non ancora comunicate (`player.passiveSettingIds`), così il client non le
    aggiunge due volte. Si raggiungono solo le passive di +35 (una per keyblade, per esempio
    Starlight +35 «Upright S Medal STR +50») e quelle Lux da LV 350: oltre +35 la tabella keyblade
    non va. Le passive valgono in battaglia lato client (`FUN_0076a2f0` per medaglia). Da provare
    sul banco.
<a id="colosseo"></a>
## Colosseo

- Il menu Quests (`FUN_00d97410`) dopo la Quest 130 scrive il testo ui 102850008 in `Txt_Title4`:
  mancava ovunque, crash a 0x8 (ora in `make_layouts.py` TEXTS).
- Il tocco su una tessera chiama `FUN_00d9b3ac(scena, 0x10)` -> `GET /multi/status` (azione 158,
  `FUN_007fe614`, parser `FUN_0077ff44`; endpoint di un altro agente) -> `FUN_00d95508(scena, 10)`.
  Da verificare quale tessera (Union Cross o Colosseo) apre quale modo.
- `GET /colosseum` (azione 124, parser `FUN_0079b184`): `colosseumInfo {colosseumStageId int,
  status int}`, `colosseumStages[]` (elemento `FUN_0079affc`: `stageId`, `useAp`, `rank`,
  `stageCount`, tutti int), `colosseumRank` uint, `userColosseum {userRank, userStageCount,
  userStageTotalCount}` int. Altre azioni: 125 `/colosseum/reward/list`, 126 start, 127 retire,
  128 clear, 139/140/180 classifiche.
- Layout mancanti: `AdventureTop2_Colosseum_Button` (`FUN_00da13b0`: ColosseumInfo, Button_Start/
  Txt_Start, ImageButton_QuestStart, Button_Ranking/Txt, Button_Reward, Button_Colosseum_Board/
  Txt_Description; testi 0x6222151-153, 0x6283bb5-7), `AdventureTop2_Colosseum_Panel`
  (`FUN_00973538`), `_Target` (`FUN_00975afc`), `Colosseum_MainPanel` (`FUN_0092fc18`),
  `BattleResultColosseumScene`, `RankingColosseumScene_ver1301`.
- Percorso verificato nel codice: tessera del menu Quests (`FUN_00dc96ec`) -> popup
  `PvP_SelectWindow` (`FUN_00db133c`) -> «Coliseum» (+0x440 = 6) -> `FUN_00d9b3ac(0x11)` ->
  `GET /user/notice` (241, `raidNotice {isSelfRaid, isOthersRaid}` uint obbligatori) -> modo 6 ->
  `GET /colosseum` (124, builder `FUN_007f68f0`) -> `FUN_00dc3a6c` -> `FUN_00d958f8(6)` (mappa,
  `FUN_00da47bc`: stage solo con status 1) + `FUN_00da13b0` (`AdventureTop2_Colosseum_Button`;
  status 2 = «This event is unavailable.»). Il «PVP» (+0x440 = 0xb) va a `FUN_00d9b3ac(0x17)`.
- **Tabelle master `colosseum` e `colosseumStage` vuote** (5.0.1 offline): il client non ha righe per
  gli stage del Colosseo, quindi il server risponde status 2 e nessuno stage (`respondColosseum`).
  Per giocarlo servono le righe master (da ricostruire) e `stage/cl_stg%05d_%02d.bin` (nessuno
  servito) per la mappa `AdventureTop2_Colosseum_Target`, poi 126 start / 128 clear.

<a id="pvp"></a>
## Coliseum PvP (azioni 194-205)

Stato «vuoto» ma valido in `respondPvp` (server.js, rotta `pvp`). Rami di `FUN_007c3204` (Ghidra),
un parser che restituisce null = «200 ERROR :<id>». Tipi: +0x11 bit 2 int, 3 uint, 5 uint64; +0x12
bit 4 stringa (`recon/tools/response_schema.py`).

| Azione | Richiesta | Ramo / parser | Chiavi obbligatorie | Risposta del server |
|---|---|---|---|---|
| 195 | GET `/pvp` | 0x7ca204 / `FUN_0079989c` | `pvp {pvpId, playNumber, pvpPoint, pvpClass, pvpRank` uint, `openRankingId` uint64, `numParticipant` uint`}` | pvpId `KHUX_PVP_ID` (1), pvpClass 1, resto 0 |
| 196/197 | GET/POST `/pvp/keyblade` | 0x7c3b9c / `FUN_0079a240` | `pvp.keybladeIds` [uint64], `pvp.userDecks` (`FUN_00792bf4`, elemento `FUN_00792a8c`) | keybladeIds salvati (`player.pvpKeybladeIds`, vuoto), userDecks = `/user/deck` |
| 198 | GET `/pvp/vs_list` | 0x7c559c / `FUN_0079aa04` | `vsUsers` [] (elemento `FUN_0079a888`, 0x278 byte) | `[]` |
| 199 | GET `/ranking/pvpParade` | 0x7c9a24 / `FUN_007a4568` | `pvpParade {pvpClass uint, rankingPvpTopRanker []}` (elemento `FUN_007a43e4`) | classe 1, nessuno |
| 200/201/202 | GET `/ranking/pvp`, `/own`, `/border` | 0x7c6ec8 / 0x7c5d20 / 0x7c6db0, `FUN_0078806c(chiave)` | `pvpRanking` / `pvpRankingOwn` / `pvpRankingBorder` = `{rankingDatas [], rankingStatus int, rankingTermStart, rankingTermEnd}` (date "YYYY-MM-DD HH:MM:SS") | status 2, nessun dato, stagione = mese corrente |
| 203 | GET `/pvp/rewardlist` | 0x7ca344 / `FUN_007a53dc` | `pvpPoint` uint64, `scoreRewardId` [uint] | 0, `[]` |
| 204/205 | POST `/pvp/entry`, DELETE `/pvp/lock` | 0x7d0f0c (nessun parser, esito 1) | — | solo `ret` |

- Elemento di `rankingDatas` (`FUN_00787d54`): un giocatore completo (`userData` `FUN_0078ade0`,
  `userDetail`, `userKeyblades`, `userDecks`, medaglie, skill, avatar, `pvp/keyblade`,
  `userPvpRanking` `FUN_0079a134`). `rankingStatus` (`FUN_00d55964`): 2 = elenco, 1 e 3 = testi
  (0x652f715 / 0x63163a2 / 0x6316388). `FUN_00d52ce4` mostra `rankingTermEnd` (+0xc).
- Sequenza della scheda PvP di AdventureTop (lambda): DELETE `/pvp/lock` (`FUN_00dc3c58`) ->
  `/pvp` (`FUN_00dc3ff0`; salta se sessione +0x790 -> +0x14 == 5) -> `/pvp/keyblade` (`FUN_00dc4208`)
  -> `/pvp/vs_list` (`FUN_00dc43d4`, se scena +0x43b) -> `FUN_00dc47f0` -> `FUN_00d958f8(modo)` +
  `FUN_00da22a0` (`cocostudio/publish/AdventureTop2_PvP_Button.json`: Button_PvPStart/Txt_PvPStart,
  Button_Ranking, Button_Reward, PvP_DetailButton(_Panel/_Draw), PvP_Point_DetailBut, Txt_PvP_Detail).
  Le classifiche (200-202) le chiede la scena Ranking (lambda `FUN_00d62c00`/`d63060`/`d634c0`),
  `/ranking/reward/check` (142) parte anche da `FUN_00d7f758`.
- **Bloccante: riga master `pvp`** (tabella 0x47, getter `FUN_00f18ff0`, null se manca).
  `FUN_00da22a0` (detailUrl a +0x94), `FUN_00da75c4` (rankingId +0x90), `FUN_00daa71c`,
  `FUN_00d7b3c8` (+0x29e), `FUN_00d7d358` (scoreStartReward/EndReward +0x88/+0x8c) la dereferenziano
  senza controllo: con `master_data/pvp.json` vuoto la scheda PvP va in crash appena costruita.
  Schema (`master_types_ww431.json`): pvpId, stageId, stageBinId, dayCount, benefitDayCount,
  battleTimeout, validHoldKeyblade, holdKeyblade int[9], validRank, rankUpPer int[8], rankDownPer
  int[8], groupId, scoreStartReward, scoreEndReward, rankingId, detailUrl string(512), startTime,
  endTime. Una riga segnaposto (pvpId 1, rankingId 0 = nessuna riga `rankingPvp`, cosi'
  `FUN_00da75c4` nasconde il widget; scoreStartReward 1 > scoreEndReward 0 = nessun premio) richiede
  un nuovo `KHUX_REVISION`. Anche `pvpScoreReward` e `rankingPvp` sono vuote.
- Layout mancanti (catalogo `missing_layouts.txt`): `AdventureTop2_PvP_Button`, `PvP_PlayerInfo`,
  `PvP_KeyBladeButton`, `PvP_KeyBladeBut_Base`, `DeckEdit_KeyBladeButton_PvP`, `StartDeckPvPScene`,
  `RankingPvPScene`, `Ranking_Result_PvP`, `BattleResultPvPWinScene`/`LoseScene`, Ranking_* .
- Resta: battaglia vera (`/pvp/entry` 204 con avversario da `vsUsers`, `/pvp/clear` 194 non
  analizzata), classifiche con giocatori, premi (`pvpScoreReward`, `rankingPvp`).

<a id="party-ranking"></a>
## Party e classifiche (Rankings della home)

Banco 14-10 (I-106, I-113, I-114). Modulo `server/routes-party-ranking.js`.

- **Party / Party Search** (Other > Party, banner della home): `GET /payment/info` (24), `GET /party` (83),
  `GET /party/member/list` (86), `PUT /party/notice` (81), `POST /party/login` (82), poi SIGSEGV a
  0x170. Le risposte non c'entrano: con `userParty.partyId` 0 la 82 legge solo `userParty`
  (`FUN_00779574`, salto a 0x7c4ab0 prima di `party`/`partyLeader`). La scena `FUN_00be1b74` carica
  `cocostudio/publish/PartyTopScene_ver131.json`, assente da ogni risorsa WW, come tutti i 31 layout
  Party che il client cita (`PartyTop_*`, `PopupNormal_Party*`, `PopupNormal_PartySearch_*`; servite
  solo `PartyTop_JoinManagement_Scene_ver150` e `PartyTop_MultiMemberList_Scene_ver150`): GUIReader
  torna null. Originali JP 4.3.1 in `recon/tools/jp_coco_layouts.txt` (tutti ok a `--check`).
  Senza party si apre `PartyTop_Initial.json` (`FUN_00be5280`: Txt_PREdit/Button_PREdit,
  Txt/Button_InitialRequest = cerca, Txt/Button_InitialManagement = crea).
- `POST /party/login` (82): `userParty` + `isAbsenceLeader`. `GET /party/search/active` (87):
  `partyList[]` (`FUN_00783794`), vuoto. Creare un party (79) e il resto (84-106) restano agli
  schemi automatici: da provare.
- «7 ERROR :249» al riavvio dopo il crash del Party = `PUT /passive/list` (249) con codice curl 7
  (connessione rifiutata): la rete del guest era caduta, non e' un errore del server.
- **Classifiche** (`FUN_00d55964` disegna l'elenco; scheda Lux = tipo 4, `+0x360` 1 = propria
  posizione / 2 = prime / altro = confine; `rankingStatus` 2 = elenco, 1/3 = messaggio):
  - Lux, parser `FUN_00786b74` con chiave per azione: 129 `/ranking/weekly/user`
    (`luxRankingWeekly`), 130 monthly (`luxRankingMonthly`), 131/132 `.../own`
    (`luxRankingWeeklyOwn`/`MonthlyOwn`), 133 `/ranking/lux` e 134 `/ranking/lux/own` (`luxRanking`),
    178 `/ranking/lux/border` (`luxRankingBorder`). Campi `rankingDatas[]`, `rankingStatus` int,
    `rankingTermStart`/`rankingTermEnd` data, `lastRank` int. Elemento `FUN_007869f0`: `userData`
    (campi di `userData.user`, `FUN_0078ade0`), `userDetail` (`FUN_0078babc`), `userAvatar`
    (`FUN_0078c740`), `lux` uint64, `rank` int. Senza 133: «200 ERROR :133».
  - High score `FUN_00787214` (135/136/179) e Colosseo `FUN_00787a38` (139/140/180): stessi campi;
    Party `FUN_00787610` (137/138/184): `rankingDatas`, `rankingStatus`, `lastRank`, `updateTime`,
    `nextUpdateTime`. Server: il giocatore 1° nelle Lux, le altre vuote.
  - Layout: `Ranking_MainPanel_ver230` (`FUN_00932570`), `RankingPartyScene_ver1301` (`FUN_00c5c714`)
    e gli altri 17 `Ranking*` citati, tutti assenti dalle risorse WW: originali JP nell'elenco; 4
    (`Ranking_Result*`, `Ranking_Reward_ver1301`, `RankingRewardScene_ver1301`) da decidere per
    `Rank_Title_3.png`/`Rank_Result_Deco.png` assenti ovunque.
