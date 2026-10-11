# Union Cross (multigiocatore)

Sezione «Union Cross» della schermata Quest, sbloccata dopo la Quest 24. Server:
`server/multi.js` (agganciato da `server.js`: rotte `/multi/*` -> `multi().respond`), tabelle
`server/make-multi-tables.js`. Indirizzi = Ghidra (file + 0x100000), libreria 4.3.1.

<a id="api"></a>
## Azioni `/multi/*` (dispatcher `FUN_007c3204`)

| Azione | Richiesta (costruttore, campi del corpo) | Risposta letta dal client |
|---|---|---|
| 158 GET `/multi/status` | `FUN_007fe614`, nessun campo | `FUN_0077ff44`: `serverAddress` stringa (obbl.), `multiEvents[]` (obbl.; elemento `FUN_0077fe54`: `multiId` int, `useAp` int, `endTime` "YYYY-MM-DD HH:MM:SS", `bannerUrl` stringa), `multiUsers[]` (facoltativo, elementi come `supportUsers`, `FUN_0078a5c4`). Salvato in APIManager+0x730 |
| 159 GET `/multi/talk` | `FUN_007fe8b4` | `FUN_0077b44c`: `multiTalkIds[]` |
| 160 POST `/multi/create` | `FUN_007feb54`: `multiId` | `FUN_007808f0`: `userRandomEnemies[]`, `userEnemyDropItems[]`, `userTreasures[]`, `userRandomEnemyLevel[]` ({`uniqueSymbolEnemyId`, `addLevel`}), `timeMissionIds[]`, `multiStageId` uint, `multiRoomId` uint64 |
| 161 POST `/multi/recreate` | `FUN_007fee44`: `multiId`, `prevMultiRoomId` | come 160 |
| 162 POST `/multi/start` | `FUN_007ff1b0`: `multiId`, `multiStageId`, `userKeybladeId`, `roomCreateUserId`, `multiRoomId`, `isSteal` | `userData.userPoint` (`FUN_0078b230`), `FUN_00780f0c` (`userKeybladeId` uint64, `campaigns[]`); poi il ramo (0x7c6be4) prende la stanza dal gestore Photon (`FUN_01176df4`/`FUN_011780c8`) e prepara la battaglia |
| 163 POST `/multi/clear` | `FUN_007ff72c`: `exp`, `money`, `lux`, `getPoint`, `materialId`, `number` | come `/stage/clear` (userPoint, userDetail, `FUN_007817a0`, stageResumption, `FUN_007a5dec`): schema automatico, mai visto |
| 164 POST `/multi/retire` | `FUN_00800ad0` | solo `ret` |
| 165 POST `/multi/continue` | `FUN_00800d70` | `userKeyblades[]` (`FUN_0078cca8`) |
| 166 GET `/multi/matching/member/list` | `FUN_00801010` | `FUN_0078aa3c` con la chiave **`matchingMemberList`** (stesso parser di `supportUsers` di `/stage/support/list`); vuoto accettato. In APIManager+0x770 |

- Prima del lavoro: `/multi/status` passava con lo schema (`serverAddress`, `multiEvents` vuoti) e
  166 riceveva solo `ret` -> parser null -> «200 ERROR :166».
- Server pubblici (thethiny/KHUx-Server ecc.): da controllare (ricerca in
  `reference\union_cross\NOTE.md`).

<a id="flusso"></a>
## Flusso nel client

1. Tocco su «Union Cross» (modo 7 della schermata Quest, `FUN_00dbcfcc` caso 7): `/multi/status`,
   poi (callback `FUN_00dbe5cc`) `/multi/matching/member/list`, poi `FUN_00dc34c4` ->
   `FUN_00d958f8` + **`FUN_00d9f500`** (pannello `AdventureTop2_Multi_Button`).
2. `FUN_00d9f500` copia `multiEvents` e legge **`multiEvents[0].multiId` senza controllo** (vettore
   vuoto = puntatore nullo = crash), poi la riga master `multi` di quel multiId (`FUN_00f0e3c8`,
   tabella 0x3e: riga nulla = crash) e ne usa `detailUrl` (+0x289; vuoto = tasto Detail nascosto).
   Tasti: `Button_MultiStart` (testo 0x6222151), `Mu_DetailButton`, `Button_Mu_Board` (testo
   0x6226f48, bacheca), `Button_Last_Member` (testo 0x6222153; visibile solo con
   `matchingMemberList` non vuoto: apre `SceneMultiJoinList`, `FUN_00df56a8` -> 166 ->
   `PartyTop_MultiMemberList_Scene_ver150`, elenco dei membri del Party che cercano compagni).
3. `Button_MultiStart` (`FUN_00dcf2c8` -> `FUN_00dac280`): parametri dello stage da
   `multiEvents[0]` (useAp, multiId) -> schermata del deck (`StartDeckMultiScene_ver260`,
   `FUN_00978558`).
4. Conferma del deck (`FUN_009a9a00`) -> pannello di matching (`FUN_00a37b1c`,
   `StartDeckMulti_PartyMatching_Base/HostPanel/GuestsPanel/AcceptPanel`) e `FUN_00a39120`:
   maxPlayers della stanza Photon, callback Photon, **`/multi/create`**.
5. Dopo `/multi/create` il gestore Photon (`FUN_0117658c`, singleton `FUN_01176df4`, 0x4e0 byte) si
   collega: `FUN_01176ec0` copia `serverAddress` di `/multi/status` (+0x308), nome della lobby
   `"50:<xxh32 esadecimale>:<n>"` (+0x320), proprieta' della stanza `"%d:%d:%d"`; `FUN_0117a3a0`:
   `Client::connect(auth CUSTOM con parametri key=value, "", serverAddress, serverType 1 =
   MASTER)`; protocollo UDP (Client costruito con connectionProtocol 0); poi `opJoinLobby`,
   `opJoinOrCreateRoom`/`opJoinRoom`/`opJoinRandomRoom` (`FUN_0117a1d0`).
6. Nella stanza l'ospite preme Start (`Button_Start`/`Button_LockStart`) -> `/multi/start`
   (`FUN_00a3c1f4`, con `roomCreateUserId`/`multiRoomId` presi dalla stanza Photon) -> battaglia
   sincronizzata con eventi Photon -> `/multi/clear` (`FUN_01033744`) o `/multi/retire`; risultato
   `BattleResultMultiScene_ver150` (`FUN_009af918`). Errore di collegamento:
   `StartDeckEdit2_MultiConnectionError` (`FUN_00e70774`).

<a id="offline"></a>
## Cosa funziona offline e cosa no

- `server/multi.js`: `/multi/status` con `serverAddress = <IP di KHUX_PUBLIC_URL>:5055` e un
  evento per ogni riga valida e aperta della master `multi`; 166 con `matchingMemberList: []`;
  `/multi/create` e `/recreate` con lo stage della riga e `multiRoomId` progressivo (salvati in
  `player.multiRoom`); `/multi/start`, `/retire`, `/continue`, `/talk` minimi; `/clear` dallo
  schema automatico.
- `server/make-multi-tables.js`: master `multi` (multiId 1, sempre aperto, `useAp` 5,
  multiStage 1) e `multiStage` (1, `stageBinId` 1010). Righe vere non trovate.
- Ascoltatore UDP sulla porta 5055 (`KHUX_PHOTON_PORT`, `KHUX_PHOTON=0` lo spegne): registra i
  datagrammi del client (`[photon]` in console) e non risponde, cosi' il collegamento scade.
- **Non possibile offline: la stanza e la partita.** `/multi/start` arriva solo dopo l'ingresso
  nella stanza Photon, e la battaglia si sincronizza con gli eventi Photon. Serve un emulatore di
  master/game server Photon (UDP «Photon reliable UDP» + serializzazione Protocol16, operazioni
  Authenticate/JoinLobby/JoinOrCreateRoom/RaiseEvent, forse cifratura) con un solo giocatore nella
  stanza: lavoro a parte. I log `[photon]` del banco sono il punto di partenza.
- Compagni NPC: nel client non c'e' traccia di riempimento con l'IA (i membri vengono dalla stanza).

<a id="banco"></a>
## Prova sul banco

1. `node server\make-multi-tables.js`, poi riavvio del server con revisione dei master + 1
   (`relogin.ps1 -Revision <n+1>`).
2. Quest -> Union Cross: niente piu' «200 ERROR :166»; il pannello mostra l'evento. Se va in crash,
   guardare il pannello (`FUN_00d9f500`) e le immagini di `Mu_Banner`/`Mu_Ground` (`bannerUrl`
   vuoto).
3. Start -> deck -> conferma: `/multi/create` nel log, poi righe `[photon]` (il client prova la
   porta 5055) e dopo il timeout il popup di errore di collegamento.
