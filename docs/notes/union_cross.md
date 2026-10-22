# Union Cross (multiplayer)

«Union Cross» section of the Quest screen, unlocked after Quest 24. Server:
`server/multi.js` (hooked in by `server.js`: routes `/multi/*` -> `multi().respond`), tables
`server/make-multi-tables.js`. Addresses = Ghidra (file + 0x100000), library 4.3.1.

<a id="api"></a>
## `/multi/*` actions (dispatcher `[fn]`)

| Action | Request (constructor, body fields) | Response read by the client |
|---|---|---|
| 158 GET `/multi/status` | `[fn]`, no fields | `[fn]`: `serverAddress` string (req.), `multiEvents[]` (req.; element `[fn]`: `multiId` int, `useAp` int, `endTime` "YYYY-MM-DD HH:MM:SS", `bannerUrl` string), `multiUsers[]` (optional, elements like `supportUsers`, `[fn]`). Saved in APIManager+0x730 |
| 159 GET `/multi/talk` | `[fn]` | `[fn]`: `multiTalkIds[]` |
| 160 POST `/multi/create` | `[fn]`: `multiId` | `[fn]`: `userRandomEnemies[]`, `userEnemyDropItems[]`, `userTreasures[]`, `userRandomEnemyLevel[]` ({`uniqueSymbolEnemyId`, `addLevel`}), `timeMissionIds[]`, `multiStageId` uint, `multiRoomId` uint64 |
| 161 POST `/multi/recreate` | `[fn]`: `multiId`, `prevMultiRoomId` | as 160 |
| 162 POST `/multi/start` | `[fn]`: `multiId`, `multiStageId`, `userKeybladeId`, `roomCreateUserId`, `multiRoomId`, `isSteal` | `userData.userPoint` (`[fn]`), `[fn]` (`userKeybladeId` uint64, `campaigns[]`); then the branch (0x7c6be4) takes the room from the Photon manager (`[fn]`/`[fn]`) and prepares the battle |
| 163 POST `/multi/clear` | `[fn]`: `exp`, `money`, `lux`, `getPoint`, `materialId`, `number` | as `/stage/clear` (userPoint, userDetail, `[fn]`, stageResumption, `[fn]`): automatic schema, never seen |
| 164 POST `/multi/retire` | `[fn]` | only `ret` |
| 165 POST `/multi/continue` | `[fn]` | `userKeyblades[]` (`[fn]`) |
| 166 GET `/multi/matching/member/list` | `[fn]` | `[fn]` with the key **`matchingMemberList`** (same parser as `supportUsers` of `/stage/support/list`); empty accepted. In APIManager+0x770 |

- Before the work: `/multi/status` passed with the schema (`serverAddress`, `multiEvents` empty) and
  166 received only `ret` -> null parser -> «200 ERROR :166».
- Public servers (thethiny/KHUx-Server etc.): to be checked (research in
  `reference\union_cross\NOTE.md`).

<a id="flusso"></a>
## Flow in the client

1. Tap on «Union Cross» (mode 7 of the Quest screen, `[fn]` case 7): `/multi/status`,
   then (callback `[fn]`) `/multi/matching/member/list`, then `[fn]` ->
   `[fn]` + **`[fn]`** (panel `AdventureTop2_Multi_Button`).
2. `[fn]` copies `multiEvents` and reads **`multiEvents[0].multiId` without a check** (empty
   vector = null pointer = crash), then the master row `multi` of that multiId (`[fn]`,
   table 0x3e: null row = crash) and uses its `detailUrl` (+0x289; empty = Detail button hidden).
   Buttons: `Button_MultiStart` (text 0x6222151), `Mu_DetailButton`, `Button_Mu_Board` (text
   0x6226f48, board), `Button_Last_Member` (text 0x6222153; visible only with a non-empty
   `matchingMemberList`: opens `SceneMultiJoinList`, `[fn]` -> 166 ->
   `PartyTop_MultiMemberList_Scene_ver150`, list of the Party members looking for companions).
3. `Button_MultiStart` (`[fn]` -> `[fn]`): stage parameters from
   `multiEvents[0]` (useAp, multiId) -> deck screen (`StartDeckMultiScene_ver260`,
   `[fn]`).
4. Deck confirmation (`[fn]`) -> matching panel (`[fn]`,
   `StartDeckMulti_PartyMatching_Base/HostPanel/GuestsPanel/AcceptPanel`) and `[fn]`:
   maxPlayers of the Photon room, Photon callbacks, **`/multi/create`**.
5. After `/multi/create` the Photon manager (`[fn]`, singleton `[fn]`, 0x4e0 bytes)
   connects: `[fn]` copies `serverAddress` from `/multi/status` (+0x308), lobby name
   `"50:<xxh32 esadecimale>:<n>"` (+0x320), room properties `"%d:%d:%d"`; `[fn]`:
   `Client::connect(auth CUSTOM con parametri key=value, "", serverAddress, serverType 1 =
   MASTER)`; UDP protocol (Client built with connectionProtocol 0); then `opJoinLobby`,
   `opJoinOrCreateRoom`/`opJoinRoom`/`opJoinRandomRoom` (`[fn]`).
6. In the room the host presses Start (`Button_Start`/`Button_LockStart`) -> `/multi/start`
   (`[fn]`, with `roomCreateUserId`/`multiRoomId` taken from the Photon room) -> battle
   synchronized with Photon events -> `/multi/clear` (`[fn]`) or `/multi/retire`; result
   `BattleResultMultiScene_ver150` (`[fn]`). Connection error:
   `StartDeckEdit2_MultiConnectionError` (`[fn]`).

<a id="offline"></a>
## What works offline and what does not

- `server/multi.js`: `/multi/status` with `serverAddress = <IP di KHUX_PUBLIC_URL>:5055` and one
  event for each valid and open row of the `multi` master; 166 with `matchingMemberList: []`;
  `/multi/create` and `/recreate` with the row's stage and a progressive `multiRoomId` (saved in
  `player.multiRoom`); `/multi/start`, `/retire`, `/continue`, `/talk` minimal; `/clear` from the
  automatic schema.
- `server/make-multi-tables.js`: master `multi` (multiId 1, always open, `useAp` 5,
  multiStage 1) and `multiStage` (1, `stageBinId` 1010). Real rows not found.
- UDP listener on port 5055 (`KHUX_PHOTON_PORT`, `KHUX_PHOTON=0` turns it off): it logs the
  client's datagrams (`[photon]` in the console) and does not reply, so the connection times out.
- **Not possible offline: the room and the match.** `/multi/start` arrives only after entering
  the Photon room, and the battle is synchronized with Photon events. It needs an emulator of a
  Photon master/game server (UDP «Photon reliable UDP» + Protocol16 serialization, operations
  Authenticate/JoinLobby/JoinOrCreateRoom/RaiseEvent, maybe encryption) with a single player in the
  room: a separate piece of work. The bench `[photon]` logs are the starting point.
- NPC companions: in the client there is no trace of filling with AI (the members come from the room).

<a id="banco"></a>
## Test on the bench

1. `node server\make-multi-tables.js`, then server restart with master revision + 1
   (`relogin.ps1 -Revision <n+1>`).
2. Quest -> Union Cross: no more «200 ERROR :166»; the panel shows the event. If it crashes,
   look at the panel (`[fn]`) and the images of `Mu_Banner`/`Mu_Ground` (empty
   `bannerUrl`).
3. Start -> deck -> confirm: `/multi/create` in the log, then `[photon]` lines (the client tries
   port 5055) and after the timeout the connection error popup.

<a id="layout"></a>
## Layouts and textures of the Union Cross path

Check on `catalog\layouts.tsv`/`textures.tsv` (68 layouts, sub-layouts included, starting from
`AdventureTop2Scene_ver350`, `AdventureTop2_Multi_Button`, `PartyTop_MultiMemberList_Scene_ver150`,
`StartDeckMultiScene_ver260`, `StartDeckMulti_*`, `StartDeckEdit2_MultiConnectionError`,
`BattleResultMultiScene_ver150`, `ActionMap_*Multi*`): **all present** in the resources; no
layout to generate for panel, deck, matching and connection error.

- Missing textures (only after entering the room or in battle, so not reachable
  offline): `ActionMap_MultiBoss_EnemyCount` (MultiBoss_EnemyCount01, TimeAttack_num1),
  `ActionMap_MultiBoss_EntryGauge` (MultiBoss_EntryGauge01/02), `BattleResult_MultiBattle_Win_ver150`
  (Result_Clear_Raid), `StartDeckEdit2_FieldMenu_Multi_ver350` (But32_*, Multi_Info_title,
  Multi_Member_Panel0), `PartyTop_MultiMemberList_ver150` (Bg_Shade_Top, Conpane_Top3).
- **Certain crash if reached**: `PopupNormal_Continue_Multi` has `Countdown_panel` with 9-slice on
  Plate21, missing (crash 0x2c, I-049): to be replaced like `NO_PLATE21` of `make_layouts.py`
  (but keeping the countdown visible) when the multi battle becomes possible.
- In `catalog\missing_layouts.txt`: `PopupNormal_Party_General`/`_JoinRequest` (join
  request by tapping a member in `SceneMultiJoinList`, `[fn]`: with an empty list it does not
  open), `PopupNormal_Invitation_NotJoin`/`_Invitation_Jewel`/`PopupNormal_Party_Jewel`
  (`[fn]`/`d8b180`/`d8b908`, invitations), `BattleResultMultiRankUP(Lock)Scene_ver220`,
  `BattleResult_GetItemMulti_ver220`, `BattleResult_MultiMember_Panel_ver220` (multi result),
  all the `PartyTop_*` (I-006).

<a id="originale"></a>
## What the original was like (`D:\Progetto_Restauro_KH_UX\reference\union_cross\NOTE.md`)

- Union Cross panel of the Quest screen: event banner, AP pill, «Details», big red
  «Begin»; on the right «Cross Board» and «Previous Members» (= `Button_Mu_Board`,
  `Button_Last_Member`).
- Up to 6 players of the same Union; «Start with Party» with «Lock Party»; otherwise public
  matching. Lobby: host + 5 columns, countdown. If nobody joins the host can start
  alone (but always in a Photon room); no filling with NPCs.
- Cross Coins (rewards: completion 150, «No Support Needed» 100, MVP 150, mission 75) spent on the
  event Cross Boards: `coinId` of the `multi` master is probably the event currency.
- No public rows of the `multi*` masters and no JSON example of `/multi/*` (thethiny does not
  implement multiplayer); list of the 2017-2021 events in
  `reference\union_cross\data\khuxwiki_Union_Cross_Quests_wikitext.txt`. Official banners
  900x200 and 640x140 (`bannerUrl`) in the same folder.
