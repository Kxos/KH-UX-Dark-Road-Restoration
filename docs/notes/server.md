# Server: protocollo, master, salvataggio

Il server e' `server/server.js` (Node, nessuna dipendenza), con `server/README.md`. Indirizzi =
Ghidra (file + 0x100000). Storia: [../journal/fino-al-2026-10-11.md](../journal/fino-al-2026-10-11.md).

<a id="avvio"></a>
## Avvio e variabili

Di solito si usa `tools\ldplayer\session\run-server.ps1` / `relogin.ps1` ([banco.md](banco.md)). A mano:

```powershell
$env:KHUX_PUBLIC_URL    = "https://192.168.1.185"
$env:KHUX_REVISION      = "81"                     # revisione dei master: alzarla a ogni modifica
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
  `sphereNotified`, `sphereBonus` {hp, ap, cost}, `keybladeBurst`, fase e `popupFlag` del tutorial.
- «Nuovo» finche' non ha fatto `/user/create`. Per ricominciare: cancellare il file (o `cycle.ps1`).
- **Stato provvisorio all'11 ottobre**: `sphereBonus.hp = -2950` (HP 50) per provocare la sconfitta
  (ISSUES I-028): rimettere **40** a prova finita. `deck` [1,0,3] di prova.
- `userDetail.lastClearStageId` = numero di missione (campo `id` di `stage`), non lo stageId;
  `maxMedal` 300 (segnaposto: con 0 popup mancante), `maxDeckCost` dal campo `cost` di `player`.
- `sentDeckMedalIds()` toglie gli zeri da `userDecks`/`userKeyblades` (vedi
  [battaglia.md](battaglia.md#slot-vuoto)).

<a id="api-funzioni"></a>
## API di funzione (oltre l'avvio)

Le schermate hanno le loro API, descritte nei file d'area: medaglie
([medaglie.md](medaglie.md)), Moogle Shop ([moogle_shop.md](moogle_shop.md)), bacheche
([bacheche.md](bacheche.md)), profilo e missioni ([home_profilo.md](home_profilo.md)), stage
([battaglia.md](battaglia.md)).
