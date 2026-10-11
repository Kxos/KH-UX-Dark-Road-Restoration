# Union Cross (multigiocatore)

Sezione «Union Cross» della schermata Quest, sbloccata dopo la Quest 24. Server:
`server/multi.js` (agganciato da `server.js`: rotte `/multi/*` -> `multi().respond`), tabelle
`server/make-multi-tables.js`. Indirizzi = Ghidra (file + 0x100000), libreria 4.3.1.

<a id="api"></a>
## Azioni `/multi/*` (dispatcher `[fn]`)

| Azione | Richiesta (costruttore, campi del corpo) | Risposta letta dal client |
|---|---|---|
| 158 GET `/multi/status` | `[fn]`, nessun campo | `[fn]`: `serverAddress` stringa (obbl.), `multiEvents[]` (obbl.; elemento `[fn]`: `multiId` int, `useAp` int, `endTime` "YYYY-MM-DD HH:MM:SS", `bannerUrl` stringa), `multiUsers[]` (facoltativo, elementi come `supportUsers`, `[fn]`). Salvato in APIManager+0x730 |
| 159 GET `/multi/talk` | `[fn]` | `[fn]`: `multiTalkIds[]` |
| 160 POST `/multi/create` | `[fn]`: `multiId` | `[fn]`: `userRandomEnemies[]`, `userEnemyDropItems[]`, `userTreasures[]`, `userRandomEnemyLevel[]` ({`uniqueSymbolEnemyId`, `addLevel`}), `timeMissionIds[]`, `multiStageId` uint, `multiRoomId` uint64 |
| 161 POST `/multi/recreate` | `[fn]`: `multiId`, `prevMultiRoomId` | come 160 |
| 162 POST `/multi/start` | `[fn]`: `multiId`, `multiStageId`, `userKeybladeId`, `roomCreateUserId`, `multiRoomId`, `isSteal` | `userData.userPoint` (`[fn]`), `[fn]` (`userKeybladeId` uint64, `campaigns[]`); poi il ramo (0x7c6be4) prende la stanza dal gestore Photon (`[fn]`/`[fn]`) e prepara la battaglia |
| 163 POST `/multi/clear` | `[fn]`: `exp`, `money`, `lux`, `getPoint`, `materialId`, `number` | come `/stage/clear` (userPoint, userDetail, `[fn]`, stageResumption, `[fn]`): schema automatico, mai visto |
| 164 POST `/multi/retire` | `[fn]` | solo `ret` |
| 165 POST `/multi/continue` | `[fn]` | `userKeyblades[]` (`[fn]`) |
| 166 GET `/multi/matching/member/list` | `[fn]` | `[fn]` con la chiave **`matchingMemberList`** (stesso parser di `supportUsers` di `/stage/support/list`); vuoto accettato. In APIManager+0x770 |

- Prima del lavoro: `/multi/status` passava con lo schema (`serverAddress`, `multiEvents` vuoti) e
  166 riceveva solo `ret` -> parser null -> «200 ERROR :166».
- Server pubblici (thethiny/KHUx-Server ecc.): da controllare (ricerca in
  `reference\union_cross\NOTE.md`).

<a id="flusso"></a>
## Flusso nel client

1. Tocco su «Union Cross» (modo 7 della schermata Quest, `[fn]` caso 7): `/multi/status`,
   poi (callback `[fn]`) `/multi/matching/member/list`, poi `[fn]` ->
   `[fn]` + **`[fn]`** (pannello `AdventureTop2_Multi_Button`).
2. `[fn]` copia `multiEvents` e legge **`multiEvents[0].multiId` senza controllo** (vettore
   vuoto = puntatore nullo = crash), poi la riga master `multi` di quel multiId (`[fn]`,
   tabella 0x3e: riga nulla = crash) e ne usa `detailUrl` (+0x289; vuoto = tasto Detail nascosto).
   Tasti: `Button_MultiStart` (testo 0x6222151), `Mu_DetailButton`, `Button_Mu_Board` (testo
   0x6226f48, bacheca), `Button_Last_Member` (testo 0x6222153; visibile solo con
   `matchingMemberList` non vuoto: apre `SceneMultiJoinList`, `[fn]` -> 166 ->
   `PartyTop_MultiMemberList_Scene_ver150`, elenco dei membri del Party che cercano compagni).
3. `Button_MultiStart` (`[fn]` -> `[fn]`): parametri dello stage da
   `multiEvents[0]` (useAp, multiId) -> schermata del deck (`StartDeckMultiScene_ver260`,
   `[fn]`).
4. Conferma del deck (`[fn]`) -> pannello di matching (`[fn]`,
   `StartDeckMulti_PartyMatching_Base/HostPanel/GuestsPanel/AcceptPanel`) e `[fn]`:
   maxPlayers della stanza Photon, callback Photon, **`/multi/create`**.
5. Dopo `/multi/create` il gestore Photon (`[fn]`, singleton `[fn]`, 0x4e0 byte) si
   collega: `[fn]` copia `serverAddress` di `/multi/status` (+0x308), nome della lobby
   `"50:<xxh32 esadecimale>:<n>"` (+0x320), proprieta' della stanza `"%d:%d:%d"`; `[fn]`:
   `Client::connect(auth CUSTOM con parametri key=value, "", serverAddress, serverType 1 =
   MASTER)`; protocollo UDP (Client costruito con connectionProtocol 0); poi `opJoinLobby`,
   `opJoinOrCreateRoom`/`opJoinRoom`/`opJoinRandomRoom` (`[fn]`).
6. Nella stanza l'ospite preme Start (`Button_Start`/`Button_LockStart`) -> `/multi/start`
   (`[fn]`, con `roomCreateUserId`/`multiRoomId` presi dalla stanza Photon) -> battaglia
   sincronizzata con eventi Photon -> `/multi/clear` (`[fn]`) o `/multi/retire`; risultato
   `BattleResultMultiScene_ver150` (`[fn]`). Errore di collegamento:
   `StartDeckEdit2_MultiConnectionError` (`[fn]`).

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
   guardare il pannello (`[fn]`) e le immagini di `Mu_Banner`/`Mu_Ground` (`bannerUrl`
   vuoto).
3. Start -> deck -> conferma: `/multi/create` nel log, poi righe `[photon]` (il client prova la
   porta 5055) e dopo il timeout il popup di errore di collegamento.
