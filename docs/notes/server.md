# Server: protocol, master, save

The server is `server/server.js` (Node, no dependencies), with `server/README.md`. Addresses =
Ghidra (file + 0x100000). History: [../journal/fino-al-2026-10-11.md](../journal/fino-al-2026-10-11.md).

<a id="avvio"></a>
## Startup and variables

Usually `tools\ldplayer\session\run-server.ps1` / `relogin.ps1` are used ([banco.md](banco.md)). By hand:

```powershell
$env:KHUX_PUBLIC_URL    = "https://192.168.1.185"
$env:KHUX_REVISION      = "122"                    # BASE of the master revision: raise it at every change
# KHUX_GACHA_SIZES = "1,2,...,10" (medals per draw with animation), KHUX_GACHA_SHOW = "B0306,B0456" rowIds of the
# catalog added to the Shop list even if locked or out of date (tests; shop.md#sp2)
# KHUX_GUILT_BURST_POPUP=0 turns off the «NOVA LEVEL UP!» popup (on by default since 2b, JP LWF in resources 41;
# guilt.md, battaglia.md#burst)
# KHUX_REAL_NOW = ISO instant (tests): the server's real time starts from there (fake clock, #orologio)
$env:KHUX_RESOURCE_DIR  = "D:\Progetto_Restauro_KH_UX\resource_data"
$env:KHUX_RESOURCE_KEY  = "<chiave 5.0.1>"          # see below
# KHUX_NEWCOMER=0/1 forces existing/new player; KHUX_SAVE = save file (run-server/relogin -Save <nome> = server\save\<nome>.json;
# server/make-test-save.js creates prove.json for Level Up/Evolve/keyblade)
node server\server.js
```

- 5.0.1 key (not versioned): `python -I -c "import sys; d=open(sys.argv[1],'rb').read();
  print(d[[offset]:[offset]+32].hex())" D:\Progetto_Restauro_KH_UX\apk501\ext\lib\arm64-v8a\libcocos2dcpp.so`.
- Other variables: `KHUX_HIJACK` (hijacked DNS suffixes, includes `kingdomhearts.com`),
  `KHUX_PLAYER_HP` (placeholder), `KHUX_TUTORIAL_LAST_PHASE`, `KHUX_MASTER_SERVE_INVALID=1` (serves
  also the tables that do not pass the schema).
- Ports 80/443/53 without administrator privileges. Certificates: `server/make-cert.sh <ip>`
  (backdated: notBefore 1/1/2020, because the guest is in 2021); the CA must be installed as a
  **system** CA in the guest (`phaseb-guest.sh` does it).
- Console: `[dns:dirottata]`, `[dns]`, `[tls:sni]`, `[ok]`, `[?]` (unknown endpoint, decrypted
  body).

<a id="bootstrap"></a>
## Bootstrap and encrypted channel

Host: **`api-s.sp.kingdomhearts.com`** (`json/server_config.json` of the APK). `[fn]` runs the
chain before action 251 or without a session; the errors stay `:251` for the whole chain.

| # | Request | Accepted response |
|---|---|---|
| 1 | `PUT /system/status` `{appSignature}` in clear (`[fn]`) | `{"appStatus":{"mode":"","current":"","server":""}}` |
| 2 | `GET /login/token?m=0` (`[fn]`) | `{url (complete), nativeToken}` |
| 3 | `POST <url>?m=0` `{UUID, deviceType:2, nativeToken}` (`[fn]`) | `{nativeSessionId, sharedSecurityKey}`: **the AES key is chosen by the server** |
| 4 | `POST /system/login` encrypted, action 251 | `ret` + `systemLogin {newcomerKhux, newcomerDark}` + `data` (>= 4 Base64 strings of 8/32/32/32 bytes; **`data[3]` = key of the resource indexes**) + 21 links (empty strings are fine) |
| 5 | `GET /system/coppa` (26) | `ret` + `misc` {"116","804","900".."907": uint}; **116 = 1** (with 0 crash after the master update, `[fn]`) |

- Request body from step 4: form `v=<base64>` = AES-256-CBC of the JSON, zero IV, without
  inner Base64; GETs carry it in the query. `/system/login` sends `length`/`digest` of the
  library (server-side integrity check: accepting it is enough).
- Responses in clear: `RESTClient::onRespond` (`[fn]`) with `application/json` parses
  directly; `encoded-json`/`octet-stream` decrypts (`[fn]`).
- **`maintenance` must be omitted** in all responses (even 0 = maintenance).
- `ret` envelope (`[fn]`), order and types: `isMaintenance`, `isPhotonMaintenance`,
  `isKhuxMaintenance`, `isDarkMaintenance`, `sessionTO` bool; `isNewDayPeriod` int; `isRetry` bool;
  `versionApp` string; `versionRes`, `versionResLow`, `versionDat`, `commonVersionDat`,
  `darkVersionRes`, `darkVersionDat`, `functionFlags` int; `serverTime` "YYYY-MM-DD HH:MM:SS". A wrong
  type = error 2 = «200 ERROR :<azione>». «N ERROR :x» = curl code N (6 host, 28 timeout).
- `json/server_api.json` (in the APK's `misc.mp4`): the **321 actions** (index = id, `path`,
  `method` 0 GET/1 POST/2 PUT).

<a id="dispatcher"></a>
## Response dispatcher and schemas

- `[fn]`: switch on 320 actions (jump table at `0x177e414`, index id-1). A parser that
  returns null = error 2. Linear disassembly: `khux_linear.py <out> 007c3204 007d1080` (copy in
  `logs\dispatcher_linear.txt`).
- Method for a new action: `recon/tools/action_case.py` -> decompile the parsers ->
  `recon/tools/response_schema.py` -> schema in `recon/out/api_responses_ww431.json` -> response in
  `server.js` -> test on the bench. `batch_schema.py` (plan/merge) generated
  `api_responses_auto_ww431.json` (168 routes): the server uses it where a verified schema is missing.
- **Ids at 0 in the generated responses = crash** (the client looks for a nonexistent master row, e.g.
  `medalId: 0` in `/user/support`): those routes must be done by hand.

<a id="catena"></a>
## Startup chain of the existing player

```
/khux/login (252: gameLogin.acquirableLoginBonus) -> /tutorial/status -> PUT /user/awakening
-> GET /user (1) -> /user/start -> /user/chat (6) -> /party (83) -> /user/stone -> /user/shop
-> /user/option (149) -> /tutorial/status -> /user/mission (187) -> DELETE /pvp/lock
-> PUT /passive/list (249) -> PUT /emblem/list (188) -> /user/sphere -> /user/medal -> /user/skill
-> /user/material -> /user/keyblade -> /user/deck -> /keyblade/subslot (191) -> /user/avatar/all
-> /user/avatar/parts -> /user/title -> /user/link (152) -> /user/support -> PUT /playtime/bp (311)
-> /pvp/keyblade -> /stage/160310 (108) -> ...
```

- `GET /user`: mandatory parsers `userData.user` (`[fn]`), `userPoint` (`[fn]`),
  `userDetail` (`[fn]`), `stageResumption` (`[fn]`; `resumptionStatus` 0 = nothing),
  `medalResumption` (`[fn]`), then `userPopUp.isPopBenefitStone`.
- `/user/create` (253): `systemLogin.newcomerKhux` false + `gameLogin.acquirableLoginBonus`.
- `/tutorial/status` (69/70): `phase`, `popupFlag` (uint64: the server saves the bits and once the tutorial
  is finished reports them all as seen, 2^53-1), `isFinished` (1 from phase 995: with 0 the drop-down menu
  stays inert; with 1 the home creates pet and NPCs, whose missing LWFs are empty LWFs in the pack),
  `acquireTutorialJewel`.
- `GET /keyblade/subslot` (191, `[fn]`): `subslotMaxNum`, `userKeybladeSubslots[]`
  (`keybladeSubslotId`, `subslotRate`, `subslots[]`): without it, Equipment crashes
  (`std::out_of_range` in `[fn]`).
- After the Prologue: 86 `/party/member/list`, 62 `/user/sphere/reset`, 61 `/user/sphere/check`,
  120 `/raid/reward`, 241 `/user/notice`, 105 `/party/lux_up_time`, 169 `/stage/achievements`, 250
  `/stage/pickup` (`pisckupStages`, sic), 185 `/user/theater/available`, 81 `PUT /party/notice`, 59
  `/mypage` (`backgroundId` 150911), 177 `/pet/coordinate/members`, 143 `/campaign`, 240
  `/raid/list` (`selfRaid`, `raids[]`), 2 `/user/point`.
- `/stage/achievements` replies with numerators/denominators at 0: the Quests screen shows
  «COMPLETE» on all categories (ISSUES I-037).

<a id="master"></a>
## Master tables

- Download: action 27 `GET /system/master/20200423` -> `master {revision, commonRevision, count}` +
  per table `{revision, url, key (32 characters), md5}`. File: body -> `curl_easy_unescape` ->
  Base64 -> AES-256-CBC (key = the 32 bytes of the string, zero IV, PKCS#7) -> JSON; `md5` = hexadecimal
  MD5 of the HTTP body. The client saves them as `m/m%03d.jpg` (BGAD).
- **Per-table revision ignored** (test of 16-10): with the global revision from 115 to 116, only
  `mission` at 116 and the other 105 at 115 (md5 unchanged), the client downloaded all 106 tables again
  (18 MB). The download weighs little: login of 18.7 s with the master downloaded again (rev 117), 25-77 s in
  other tests depending on the emulator.
- **Interrupted download** (test of 16-10, app closed after 30, 96 and 52 tables out of 106): the client saves
  the tables one at a time, but resets its revision before downloading (on relaunch it sends
  `masterRevision` 0) and rewrites it only after the last table. At the next login it downloads all 106
  tables again and reaches the home: a half-done set is never taken as good. This holds even if in the
  meantime the server has moved to the following week. The served master depends only on the revision
  of the session, so bodies and md5 stay the same for the whole week. Tests in
  `D:\Progetto_Restauro_KH_UX\tmp\interrupt\`. Notice «About game data updates» updated.
- **Device clock and server time** (test of 16-10): with the guest at 10/1/2021 17:30 CET and
  the server at 15/5/2021 12:00 UTC the login works and the Daily show «19 hours left», that is the time until
  08:00 UTC of the **server time** (with the device it would have been ~15 hours). The device
  matters only for the «End of Service» popup (it must stay before 29/6/2021, protector.md); the
  countdowns follow the time the server sends, which can therefore be a different fake date.
<a id="orologio"></a>
- **Fake clock (16-10, `server/clock.js`, spec `docs/superpowers/specs/2026-10-16-orologio-finto-design.md`)**:
  server time = real date in the twin month 2016-2021 (same weekday and length),
  offset fixed at `/khux/login` (`player.clockOffset`); periods, deadlines and deliveries in the Presents
  on real time (day 08:00 UTC, Monday 08:00, day 1 08:00). Computed master revision:
  `KHUX_REVISION*100000 + scadenze (lunedi'/inizio mese 08:00) passate dal 1/1/2026` (deadlines (Monday/start of month 08:00) passed since 1/1/2026; with BASE 118, 16-10: 11800051; BASE 119 from 17-10, banner catalog: 11900051; BASE 120 from 17-10, limits of the free ones and totalLimit in the comment: 12000051)
  only in the master fields; `darkVersionRes` stays `KHUX_REVISION`. The master is served as compact
  JSON, cached per revision and file date (`mission` with `endDate` of Weekly A/B and Limited
  rewritten on the fly). `KHUX_REAL_NOW` (`-RealNow` of `run-server.ps1`/`relogin.ps1`) shifts the real time
  for tests; `KHUX_SERVER_TIME` remains (fixed fake date). Save migration: `clockVersion` 1
  (fake strings -> real ms) and 2 (numbers before 2022 = ms of the old fake time, shifted as a block
  with the most recent = now; `server/test-clock-migration.js`).
- **Bench 16-10**: compact master accepted (106 tables, no errors); Daily «22 hours left» at 09:58
  UTC, Weekly «2 days», monthly Limited «15 days»; restart -> same values, 0 tables; `-RealNow
  2026-10-19T09:00:00Z` -> 106 tables, **0 `GET /resource/`**, Daily reset, 3 unclaimed Daily rewards
  in the Presents, new short campaign, Weekly «6 days»; back to the real time -> 106 tables
  (revision again 11800051).
- **Master revision fixed per session (final review 16-10)**: the client compares `versionDat` of the
  `ret` of every response with its revision. Test on the bench with the revision of the moment (`-RealNow
  2026-10-19T07:55:00Z`, home at 07:56): after 08:00 quest list, claiming, `/user/point`,
  `/user/stone` normal (new Limited «6 days», Weekly «6 days», Daily «23 hours»), then going back to the home
  `PUT /playtime/bp` and popup «Game data has been updated. You will be returned to the title screen.»
  (`screenshots\mid_post_presents.png`), OK -> title. Fix: `player.sessionRevision`/`sessionRealMs`
  fixed at `POST /system/login` (first response with `ret` of every login; the master is downloaded after
  `/khux/login`); `ret()`, `/system/resourcesize`, `respondMaster` and the served content use those, so
  the master changes only at the next login and md5/body stay consistent even if the download straddles a
  deadline. Test (`-RealNow 2026-10-26T07:55:00Z`, master downloaded again at login): 10 minutes past 08:00,
  quests, claiming, Presents, no `PUT /playtime/bp` and no return to the title
  (`screenshots\mid2_*`). Rewritten rows: also `rewardEndTime` = `endDate` (the COMPLETE ones counted until
  2099: «28920 days left», `mid2_post_limited.png`; after: «6 days left», `rw_limited.png`).
- Open issues of the clock: I-129 (May 2021 twin, `clock.fake` stuck at 28/6/2021), I-130 (Co-op with
  twin before 2020), I-131 (`term()` of the rankings on the fake Monday 00:00), I-132 (`endDate` with
  `KHUX_SERVER_TIME`). An unreadable `KHUX_REAL_NOW` stops the server startup with an error.
- **Login measurement** (`tools\ldplayer\session\login-time.ps1 -N 5`, times from the app launch):

  | | /khux/login | total (home settled) | tables |
  |---|---|---|---|
  | before (values already noted, 16-10) | 14-26 s without new master; 18.7-77 s with master | - | 0 / 106 |
  | after (16-10 12:53-13:00, without new master) | 52.5 / 86.6 / 83.4 / 60.7 / 55.6 (average 67.8 s) | 64 / 99 / 114 / 92 / 87 (average 91.2 s) | 0 |

  The time from the launch is dominated by the app startup in the emulator (the first request arrives 45-80 s
  after the launch). From the log `server/logs/requests.ndjson`, from the first request (`PUT /system/status`)
  to `/khux/login`: 4.5-5.2 s before and after (unchanged); the server replies in ~50 ms per request; with the
  new master the home arrives in 31-33 s from the first request (21-56 s before). Server work for the
  master with the cache < 50 ms (`server/test-master-clock.js`).
- **Criterion «login no slower than today, +1 s at most»: NOT verified.** The measurement from the app
  launch is dominated by the emulator. The 14-26 s reference came from the same lines of
  `relogin.ps1`/`bench_start.ps1` (time from the launch), but with the emulator that day starting the app
  much faster: the two numbers are not comparable. Only the server part is comparable
  (first request -> `/khux/login`, unchanged).
- **Client wait of ~10 s before the home (open)**: since 16-10 09:57 UTC the client waits 8-12 s between
  `/ranking/parade` and `/web/notices` (before usually 1.5-2 s, sometimes 7-42 s). A/B test of 16-10: with
  the server at the old fake date (`KHUX_SERVER_TIME=2021-05-15T12:00:00Z`, Daily «19 hours left») 10.0 /
  9.8 / 11.6 s; with the fake clock 11.0 / 10.0 s. **It does not depend on the fake date**: it is client time
  (state of the emulator or of the save), to be understood.
- `KHUX_REAL_NOW` together with `KHUX_SERVER_TIME`: the fixed fake date also runs from the shifted instant
  (the offset is computed on `STARTED_AT`, `realNow` includes `REAL_SHIFT`), so the fake date
  turns out shifted by `KHUX_REAL_NOW - avvio` (startup). Use only one at a time.
- 106 tables (names in the loader at `0x20a0b80`, stride 0x80). Every table = **array of rows**; every
  schema field is mandatory, extra keys ignored; null row = «Master data error».
  Schema: `recon/out/master_types_ww431.json` (1,739 fields, `recon/tools/master_types.py`); the
  server does not serve the tables that do not pass.
- Getters by id without a null check: a missing row = crash (e.g. `misc` 804 name
  length; `player` level 0; `mypageBackground`; `reward` of the enemies). `misc` ids read by the code:
  `recon/out/misc_ids_ww431.txt` (98).
- Regenerate `server/master_data/` (outside the repo):

```powershell
node server\make-master-stub.js --force          # 106 minimal tables + misc
node server\import-master.js D:\Progetto_Restauro_KH_UX\apk501\extra_files `
  avatarParts initItem misc stage world stageDrama enemy enemyAttack keyblade skill buff `
  burst battleMisc badstatus tutorialMisc medalMisc material title theater raidEnemy raidEnemyAttack
node server\make-game-tables.js D:\Progetto_Restauro_KH_UX\wiki\medals.json
node server\make-moogleshop.js
node server\make-multi-tables.js                # Union Cross: multi, multiStage
node server\make-keyblade-levels.js             # keyblade +0..+35 and keybladeSubslot (after import-master)
node server\make-passives.js                    # passive and passiveSetting (after make-keyblade-levels)
```

Stage POIs (chests and enemies, `server/game_data/stage_poi.json`, read by the server and by `check-stage-data.js`):
`make-game-tables.js` uses the files of `KHUX_STAGE_POI_EXTRA` only for the reward rows; the server reads **only**
`game_data/stage_poi.json`. If it is regenerated (`recon/tools/stage_poi.py`), merge the imported stages back into it, otherwise
the original quests 1-525 and 526-979 (457 stages, Task 6 of 21-10) are left without drops or chests:

```powershell
node -e "const fs=require('fs'),f='server/game_data/stage_poi.json',p=JSON.parse(fs.readFileSync(f,'utf8'));for(const x of ['D:/Progetto_Restauro_KH_UX/stage_gen/orig_stages/stage_poi_orig.json','D:/Progetto_Restauro_KH_UX/stage_gen/orig_stages_oltre/stage_poi_oltre.json'])Object.assign(p,JSON.parse(fs.readFileSync(x,'utf8')));fs.writeFileSync(f,JSON.stringify(p))"
$env:KHUX_MEDALS_ALL='1'; $env:KHUX_WORLDTOUR='1'
$env:KHUX_STAGE_POI_EXTRA='D:\Progetto_Restauro_KH_UX\stage_gen\orig_stages\stage_poi_orig.json;D:\Progetto_Restauro_KH_UX\stage_gen\orig_stages_oltre\stage_poi_oltre.json'
node server\make-game-tables.js D:\Progetto_Restauro_KH_UX\wiki\medals.json   # then check-stage-data.js: 0 errors
```

- `make-game-tables.js`: medal, player (lv 0-99), reward, mypageBackground, stage 1-525 (from
  thethiny), generated bursts, enemyAttack generated for all skillIds (the enemies with `validSkill` 3
  crashed), mission (`server/tables/mission.json`), sphere/sphereArray/sphereMasu
  (`server/tables/`). Options: `KHUX_MEDALS_ALL=1` (2,094 medals), `KHUX_ZOO=1`
  (`KHUX_ZOO_COUNT`) for the zoo quests 990001...
- `import-master.js` links every keyblade to the next one present (5.0.1 removed levels that
  `evolveId` points to).
- Sources: 55 tables from the `extra.mp4` of the APK 5.0.1 (5.0.1 key), thethiny's decoded binary rows
  (`raw_master.py`, `raw_master_old.py`), khuxwiki. See
  [ricerca_esterna.md](ricerca_esterna.md).
- `initItem`: category 100 = avatar parts; 3 = starting deck (13021 Donald A, 11021 Goofy A, 13031
  Yuna); 13 = keyblade 1000 Starlight. Meaning of the other categories not worked out.

<a id="risorse"></a>
## Resource protocol

- `[fn]`: master (27) if the revision differs; resources (28 `GET /system/resource`) only
  if the player is not new and has finished the tutorial.
- Response: `{resource: {mode (0/1 completo/2 incrementale), minVersion, versions: [{data: [{url,
  md5, size}], index: [...]}]}}` (mode 0/1 complete, 2 incremental). The server announces **only the latest version** (`ret.versionRes`
  = latest in `resource_data`).
- Download accepted if length = `size`, MD5 = `md5` and Content-Type contains
  `application/octet-stream`. Installation: `files/r/misc.mp4` (+ `.1` beyond 2 GB) and `r/misc.png`;
  the index must have the records `/`, `md5` (32 characters, encrypted with `data[3]`) and `size`
  (= sum of the data), otherwise «Save error». `recon/tools/resource_index.py` builds it.
- One-off crash right after an installation (`0x12c1ee0`): on restart it goes through.

<a id="salvataggio"></a>
## Player save (`server/save/player.json`)

- It is saved at every change: name, avatar, Union, Lux (`luxRank` = level, thresholds `needExp` of
  `player`), `money`, `freeStone`, `materials`, `medals` (`userMedalId` from 101), `medalLocks`,
  `medalTraits`, `deck` (keeps the position zeros), `stageScores`, `missions`, `titles`,
  `sphereNotified`, `sphereBonus` {hp, ap, cost}, `ap`/`apTime` ([AP](#ap)), `keybladeBurst`, `keyblades`, `keybladeDecks`, `favoriteKeybladeId`, `starlightKeybladeId`, `keybladeSubslots`, `keybladeEnhanceCount` ([keyblade](#keyblade)), tutorial phase and `popupFlag`.
- «New» until it has done `/user/create`. To start over: delete the file (or `cycle.ps1`).
- **Temporary state at 11 October**: `sphereBonus.hp = -2950` (HP 50) to provoke the defeat
  (ISSUES I-028): put back **40** when the test is over. Test `deck` [1,0,3].
- `userDetail.lastClearStageId` = quest number (field `id` of `stage`), not the stageId;
  `maxMedal` 300 (placeholder: with 0 missing popup), `maxDeckCost` from the `cost` field of `player`.
- `sentDeckMedalIds()` removes the zeros from `userDecks`/`userKeyblades` (see
  [battaglia.md](battaglia.md#slot-vuoto)).

<a id="ap"></a>
## AP (consumption and recharge)

- `userData.userPoint` (`[fn]`): `ap` -> +0x34, `maxAp` -> +0x3c, `lastApDatetime` -> +0x40
  of the encrypted object (reader `[fn]`), singleton at +0x118 of the manager (`[fn]`).
- **Displayed AP** `[fn]` (seconds to the next point in `*param_2`): if `ap < maxAp` and
  `lastApDatetime` is past (`[fn]` <= 0), AP = `ap + trascorsi / (misc 101 x 60)` (elapsed), at
  most `maxAp`; with `ap >= maxAp` it shows `ap` (even beyond the maximum) and does not recharge.
  `[fn]` = seconds to full; `[fn]` = AP full (`maxAp <= AP`).
  **misc 101 = 3: 1 AP every 3 minutes** (from the code, not from online sources).
- `maxAp` = column `ap` of the `player` table at the Lux rank (16 at level 1, 160 from 200), like
  `maxDeckCost` from `cost`, + `sphereBonus.ap` (before: fixed 10 + bonus).
- Server: `player.ap` + `player.apTime` (real ms from which the recharge counts; `lastApDatetime` =
  `serverTimeAt(apTime)`, consistent even after a restart). `apState()` does the same computation as the client,
  `changeAp()` spends (if it was full the recharge starts from now, otherwise it keeps the partial point).
  Saves without `ap`: AP full.
- `POST /stage/start` (body `stageId`, ...): deducts `useAp` of the `stage` row (Quest 130 = 10).
  `/stage/retire` and `/stage/continue` do not refund.
- Level up (Lux rank going up in `/stage/clear`): AP = previous AP + new `maxAp` (beyond the maximum).
- `POST /shop/ap/recover` (action 72, constructor `[fn]`, empty body; popup
  `PopupNormal_AP_Recovery` in `[fn]`, price in the text = **misc 112 = 100 jewels**): -100
  `freeStone`, AP + `maxAp`; response `userData.userPoint` + `userKeyblades`.
- To be verified on the bench: HUD after the start (e.g. 18 -> 8), the timer of the balloon
  `BalloonNomal_AP_Recovery` (`[fn]`), the recovery with jewels (full amount added or brought to the
  maximum? hypothesis: added) and the AP of the level up (hypothesis, not confirmed by sources).

<a id="api-funzioni"></a>
## Feature APIs (beyond startup)

The screens have their own APIs, described in the area files: medals
([medaglie.md](medaglie.md)), Moogle Shop ([moogle_shop.md](moogle_shop.md)), boards
([bacheche.md](bacheche.md)), profile and missions ([home_profilo.md](home_profilo.md)), stages
([battaglia.md](battaglia.md)), Union Cross ([union_cross.md](union_cross.md)).

<a id="eventi"></a>
## Events (`GET /stage/event`, action 109)

- «Events» button of the Story list (unlocked after Quest 14). Dispatcher branch at `0x7c5e98`:
  parser `[fn]` (result at +0x278 of the manager, read by `[fn]`), then
  `eventCategory` (int, **optional**, at the root -> +0x71).
- Root: `events[]` (array, mandatory) and `highScoreRank` (uint, mandatory). Without events:
  `{"events": [], "highScoreRank": 0}` -> the client shows «No available events.» (Txt_NoEvent).
- Element (`[fn]` -> `[fn]`), all mandatory:
  `stages[]` (like `stories[]` of `/stage/160310`: `stageId` int, `useAp` int, `score` uint64,
  `playStatus` int, `clearMissionIds` int[]), `eventStageId` int, `showIcon` int, `bannerUrl` string,
  `eventType` int, `status` int (2 = shows Txt_Description instead of the time), `endTime`
  "YYYY-MM-DD HH:MM:SS", then `newStageId` int, `isLock` uint (1 = padlock and mask),
  `complete` int (completion icon).
- Example of an event (in `server/save/event.json`, read by `respondStageEvent`):
  `[{"stages":[{"stageId":<id>,"useAp":0,"score":0,"playStatus":0,"clearMissionIds":[]}],
  "eventStageId":<id evento>,"showIcon":1,"bannerUrl":"","eventType":1,"status":1,
  "endTime":"2026-12-31 23:59:59","newStageId":<id>,"isLock":0,"complete":0}]`.
  `eventStageId` and the stages must exist in the master tables (id at 0 = crash): to be verified.

<a id="keyblade"></a>
## Owned keyblades (I-050)

- Starlight (initItem category 13) = `userKeybladeId` 1, deck `player.deck`. The others: reward of
  type 13 (`grantItem` -> `grantKeyblade`, one per series = `category` of the keyblade table), in
  `player.keyblades` [{userKeybladeId 2.., keybladeId, getDatetime, burst}], deck in
  `player.keybladeDecks[id]` (0 = empty slot). `userDeckId` = `userKeybladeSubslotId` =
  `userKeybladeId`. Favorite: `player.favoriteKeybladeId` (default 1; the Profile sends that one).
- Type 13 rewards in the tables: first clear (`clearGetItemType`: stage 1110 Quest 14 ->
  Treasure Trove 2000, then 1210, 1310, ...) and objectives (`submissionRewardType`). Earlier saves
  receive them once at server startup (block at the end of `server.js`).
- Complete lists in every response: `userKeyblades` (`[fn]`/`[fn]`; `category`
  from the table: Starlight 1, Treasure Trove 201), `userDecks` (one per keyblade),
  `userKeybladeSubslots` (one per keyblade: without it, Equipment crashes).
- `POST /user/keyblade/update/170516` (action 45, body from `[fn]`): `userKeyblades`
  [{userKeybladeId, userDeckId, isFavorite}] + `userDecks` [{userDeckId, medals[], petBaseSlotMedal}]:
  the server saves the decks and the favorite and replies `userKeyblades` + `userDecks`. Before, it ended up in the
  automatic schema (empty lists). To see on the bench the real body (log `[keyblade] deck`).
- **3 decks per keyblade** (20-10; update 1.1.2 of 01/09/2016 «Save 3 decks per Keyblade», unlocked by a keyblade at
  +20; user's image and sources in `reference\keyblade_decks\`, research in `D:\Progetto_Restauro_KH_UX	mp\deckset\RESEARCH.md`):
  the client counts the decks of a keyblade from the `userDecks` with its `userKeybladeId` (array order, [fn]) and
  shows the buttons 1/2/3 only with more than one deck; active deck = `userKeyblades[].userDeckId`, changed and saved with
  action 45. Server: deck 1 = `userKeybladeId` (player.deck / keybladeDecks as before), deck 2/3 = n x 1,000,000 + id in
  `player.keybladeDeckSets[kb] = {active, 2, 3}`; 6th pet slot per userDeckId; Unequip also from 2/3. Test
  `test-deck-sets.js`. Bench 20-10: buttons in Equipment, deck 2 empty, return to deck 1 intact. To be tried: fill
  deck 2 and fight with it; `userPoint` (STR/DEF of the home) stays that of Starlight's deck 1 as before.
  Optimize popup in «Select a Keyblade» ([fn] -> [fn]): the deck number is the texture
  `img/ui/Deck_But%02d_On.png`, missing from all resources (WW, JP, 2016): the layout's `Deck_But01_On` remained, always
  «1» (bench 20-10, deck 2). Served as copies of the buttons (`originals.tsv` section 35); Optimize itself already used the
  active deck (deck 3 filled on the bench).
- `/stage/start` saves `userKeybladeId` (`player.currentUserKeybladeId`): the gauge of `/stage/clear`
  goes into that keyblade. Unequip (`/user/medal/remove`) removes the medal from all decks.
- Images: the popup of the obtained keyblade (`BattleResult_KB`, `[fn]`) and the reward icons
  (`[fn]`, type 13) load `img/keyBlade/KeyBlade_%06d.png` with the `displayId` of the
  keyblade table (field +0xcc): missing from all resources (`Deck_KeyBlade_0701_05` =
  Olympia remained). `recon/tools/make_keyblade_images.py` generates them (64) from the bitmap of the LWF
  `lwf/avatar/keyblade/keyblade_%04d_%02d` (displayId/100, displayId%100), in the pose of
  Deck_KeyBlade_0701_05, palette BTF; `build-resources.ps1` (also `-Quick`). Equipment and the
  keyblade choice use the LWFs, which are all there. References: `reference\keyblades\`.
- Optimize (I-051, bench 11 October): `POST /user/keyblade/update/170516` with empty `userDecks` and
  `isFavorite` 1 on the chosen keyblade. The body is built by `[fn]`: it sends all the keyblades
  (`isFavorite` = the selected keyblade, `+0x8cc`) and only the changed decks (mask `+0x4d8`):
  empty because Optimize had not saved anything yet. The crash afterwards (pc `0x8cb92c`, ARM `kbopt`) is
  in the medal cell `[fn]` (DeckEdit_RevolverMedal_ver330, via `[fn]`): if
  the medal attribute (medal row `+0x494`) is that of the slot (`attribute[]` of the keyblade,
  4 = any) it creates `lwf/medal/medaltype/MedalType%d` (in cell modes 2/4/5/6/7
  `MedalType01`); only MedalType3 (Magic) served, hence null LWF node. Starlight has slots 3/4/4
  (never seen), Treasure Trove 4/4/1 (Power). `recon/tools/make_medaltype_lwf.py` writes MedalType1
  (red), MedalType2 (green), MedalType01 as recolored copies of MedalType3, with the textures both
  under the original name and as `<nome LWF>_<hex>.png`.
- Optimize, second part (I-051): no crash but empty deck. The client uses the length of
  `deckMedals` as the number of slots: Optimize (`[fn]` -> `[fn]`) fills only those
  and `[fn]` marks the deck as changed (mask `+0x4d8`, hence sent in `userDecks`)
  comparing only those entries. With `[]` nothing changed. An all-empty deck is now sent as
  `[0, 0, 0]` (`validConsist` of the keyblade row); the 0s of a partly full deck stay removed
  (battle, [battaglia.md](battaglia.md#slot-vuoto)): on those decks Optimize considers only the
  full slots.
- Optimize like the original (I-075, bench 12 October): the button is in the «Select a
  Keyblade.» screen before the quest (`Button_Auto` of `StartDeckEdit2_Button_ToDeck_ver260`, popup
  «Optimize Medals for <keyblade>?»). The algorithm is the client's: `[fn]` gives a value to every
  medal (strength + trait, slot multiplier according to the attribute accord +0x114 / dlaccord
  +0x128, guilt, quest bonus), `[fn]` fills the slots from the highest multiplier,
  within the cost; the pet slot only with the pet. The number of slots = length of `deckMedals`: with the
  compact decks it filled only the slots already full (2/5). Now `sentKeybladeDeck` sends a 0 per
  empty slot up to the unlocked slots (Stock Medal, [battaglia.md](battaglia.md#slot-vuoto)); the
  client itself sends 0 in the slots that stay empty (`[318,0,317,0,456]`, cost 62/62).
  Player sources in `reference\optimize`.
- Optimize, third part (I-051): with the slots `[0,0,0]` Optimize evaluates every owned medal
  (`[fn]` -> `[fn]`): it reads the burst row of the medal's `burstId` (medal row
  `+0x4fc`, burst table = id 0x26 of `[fn]`) without looking at `validBurst`. The 42
  support medals (Dewey, Fairy Godmother, ...) have `burstId` 0 and no row: crash at 0x10.
  `make-game-tables.js` adds an empty burst row 0 (all fields at 0; also added by hand to
  `master_data/burst.json`, master revision +1). Side effect to keep an eye on: with
  the deck `[0,0,0]` the box shows STR/DEF 150/150 (the 0s count as the fake medal) and a
  quest started with that empty deck would have three fake medals.- Graphics per keyblade and per attribute (I-057): «Select a Keyblade» loads
  `lwf/medal/medaldeck/MedalDeck_Type%d` (and `_Type%d1`, `_Type01`) for the attribute of the medal
  in the slot and `img/carouselDeck/Deck%03d.png`, `DeckButton_%03d.png`, `DeckMedalNumUI_%03d.png`
  (`_pvp_`) with displayId/100 of the keyblade. Only Type3 and 001 served: with the Optimize medals
  (Power) in the Treasure Trove deck crash at 0x8d00e0 (fault 0x0). `make_keyblade_decks.py`
  writes the copies (decks recolored on the hue of the keyblade art, palette; Power glows
  red, Speed green). Generated pack at ~15.6 MB out of 16 MiB of reserve: the next big
  addition requires a complete version with a higher reserve.- Pose of the keyblade in the menu boxes (I-052): `[fn]` (called by `[fn]`,
  «Select a Keyblade», mode 3, and by `[fn]`) loads the LWF `keyblade_%04d_%02d` (if missing,
  `img/keyBlade/KeyBlade_%06d.png`) and takes rotation, scale and position from
  `rule/keyblade_rule.bin` (`[fn]`: records of 0x44 bytes, keybladeId + 4 modes x (rot x10000,
  scale x10000, x, y); first the keybladeId, then the series id/1000*1000, then 1000). ofsX/ofsY of the
  keyblade table have nothing to do with it (tried on the bench, rev. 83/84). The served file has only 1000..11000
  and with the 5.0.1 LWFs Treasure Trove falls 17 units to the right. `recon/tools/keyblade_rule.py`
  computes the center of the art of every LWF (fragment -> translation -> matrices) and writes one row per
  keyblade (64) with the position that brings it onto Starlight's center, original rotation and scale
  of the series. The model matches Square Enix's values for almost all series (Lady Luck,
  Three Wishes, Divine Rose, Olympia within 2 units). The avatar is not touched (same LWFs).
- Levels (I-067): the level is the row of the keyblade table (one keybladeId per level:
  series*1000 + lv*10 up to +20, then series*1000 + 200 + lv-20; Bad Guy Breaker lv*10). The row gives
  the materials for the next level (`validNeedMaterial`, `needMaterialId/Num`: the KEYBLADE window
  shows them as Needed/Held) and `evolveId` = next row (0 = maximum). 5.0.1 has only the levels with
  a design change (64 rows): `server/make-keyblade-levels.js` regenerates +0..+35 of every series (576
  rows, the new ones with `"generated": true`) from the khuxwiki (`reference\keyblades\keyblade_levels.json`,
  reduced copy in `server/tables/keyblade_levels.json`): slots, attributes, Upright/Reversed
  (`darklight` 1/2, 3 = none), `accord`/`dlaccord`, gauge, `partnerRate`, materials post 2.6.0;
  design, passive and pose from the previous 5.0.1 row. Comparison with the 64 rows of 5.0.1: all equal
  except 3 fields (accord of Stroke of Midnight +0, dlaccord of Missing Ache, partnerRate of Bad Guy
  Breaker +35: the 5.0.1 ones kept). Removed the Trophy NI/CS/CK of Bad Guy Breaker (missing from
  `material`). Beyond +35 (+35.1..+60 of the last version, with the passives) no: `lv` is an integer, 5.0.1
  ends at +35.
- `POST /keyblade/enhance` (action 54, «Strengthen»; body `[fn]` = `{userKeybladeId}`;
  called by `[fn]`/`[fn]`): `server/keyblade-evo.js` removes the materials of the row,
  moves to `evolveId` (Starlight in `player.starlightKeybladeId`, the others in `player.keyblades`),
  no munny. Response (branch 54): `userKeyblades`, `userDecks`, `userMaterials`, `userTitles`.
  Missing materials or maximum level: no change (log `[keyblade] enhance`);
  `KHUX_KB_FREE=1` = without materials. Afterwards, the client sends `PUT /passive/list` (249, `isList` 0 ->
  `newPassiveSettingIds`).
- After the response `[fn]` compares the `displayId` (+0xcc) before and after: equal ->
  result `[fn]` (`DeckEdit_KBStrength_Result_ver210`, `lwf/result/KeyEvo_LevelUp`, arrows
  slot by slot on accord +0x114 / dlaccord +0x128); different -> `lwf/memudemo/KeyBlade_Evolution`
  (`[fn]`: movies `keyblade_previous`/`keyblade` load the keyblade's LWFs, it advances when
  `_root` reaches the last frame) and then the result. New slot: `KeyEvo_Medal_01B`,
  `KeyEvo_eff`, `medal_blank_slot1-3` (attribute 3/1/2) in `lwf/keyblade/KeyEvo/`. None of these
  LWFs exists in the resources (null = crash): `make_layouts.py` puts empty LWFs (the animation is skipped).
- Sub-slots: `GET /keyblade/subslot` (191) and `POST /keyblade/subslot` (192, body `[fn]`:
  `{updateKeybladeSubslots: [{keybladeSubslotId, subslotMedals: {"<n>": userMedalId}}]}`; response
  `subslotMaxNum`, `userKeybladeSubslots`, `userKeyblades`). Master `keybladeSubslot` (empty in
  5.0.1) regenerated: 120 sub-slots per series `{subslotId, category, slotNumber, attribute,
  darklight}` from the khuxwiki tree; `subslots[]` of every keyblade = 120 entries (0 = empty),
  Equipment (`[fn]`) writes «Subslot n/120» (like the Japanese screenshot).
  `subslotRate` = sum of the per-tier bonuses (`guiltValue`) of the medals: 1..10 = 1, 2, 5, 8, 12, 16,
  20, 25, 30, 35 thousandths (user's guide p. 11, khuxwiki for 9-10); `userKeyblades[].subslotRate`
  = `subslotRate` of the row (16000/12000/10000 = x1.6/1.2/1.0 for 1/2/3 attributes). Texts:
  `Txt_SubSlot_Rate` «+%01.3f» = (k * subslotRate / 100) / 1000 (`[fn]`, k to be verified),
  `Txt_KeyBlade_Lv_Rate_Label` = subslotRate of the row /10000. `KHUX_SUBSLOT_MAX=0` turns off the
  sub-slots, `KHUX_SUBSLOT_SCALE` changes the unit.
- Sub-slot screen (I-066, crash on tapping «Subslot»): `[fn]` -> `[fn]`
  (SceneDeckEdit::openSubslotPanel) loads `DeckEditSubSlotScene_ver340` (missing; only
  `_ver260`/`_ver310` served). It searches from the root (recursive): `DeckEdit_SubSlot_Select_Medal` (node) >
  `Win_under` > `Scroll_Area` (creates MiniMedalScrollView there), `DeckEdit_SubSlot_Set_Medal` (node) >
  `Win_under` > `Scroll_Area` (creates KeybladeSubslotMedalView there), `SubSlot_UpArrowEff` (armature
  node), `BestButton` > `Txt_Best` (106180100 «Optimize»), `Txt_NotExist` (106140376),
  `Close_Button`, `Panel_34` > `Txt_Subslot_Caution_Label` (106140377); in the Set_Medal
  `Txt_KeyBlade_Label`, `Txt_SubSlot_Rate` (106140371), `Txt_SubSlot_Num` (106140374),
  `Txt_KeyBlade_Lv_Rate_Label` («x%01.1f»). At every change `[fn]` writes
  `Txt_SubSlot_Rate_Label` («+%01.3f») and `Txt_SubSlot_Num_Label` (106140352) in the Set_Medal, creates
  the armature `EFFECT` in Win_under > `panel` when the multiplier goes up, makes
  `Panel_34` blink if the slots are not in order. Cell `DeckEdit_SubSlotMedal_ver260` 164x154
  (`[fn]`/`[fn]`/`[fn]`): `Medale`, `SubSlot_Route_LR/LR1/LR2/UD/UD1/UD2`,
  `MedalBase` (ImageView, `img/ui/Subslot_MedalSlot%03d.png` with the keyblade's category = 1,
  201 ... 1901, offset 0xd0 of the master), `Slot`, `SlotNum` (TextAtlas), `InfoPanel`, `TYpe`
  (`img/ui/Deck_Medal%d`), `Icon_Type`, `Icon_Type_1` (`img/ui/Deck_Mark_*`), `Medal_S`,
  `Txt_Mag_Label`, `Guilt_Icon`, `Cursor` (creates the armature `Z_SpCursor` there); `MatchSlotLWF`
  optional. The revolver in sub-slot mode (DeckRevolverView, 0x8c9f0c) clones
  `DeckEdit_SubSlot_MedalInfo_ver260` into `Area_MedalInfo` with the name `SubslotInfoPanel` (`Icon_Type`,
  `Txt_Mag_Label`). Layouts generated in `make_layouts.py` (11 October, look from
  `reference\subslot`): scene ver340 = original ver310 with a new `DeckEdit_SubSlot_Set_Medal_ver340`,
  `DeckEdit_SubSlot_Select_Medal_ver310` (the served ver260 has a 9-slice on Panel20,
  missing), `DeckEdit_Subslot_Caution_ver260`, `DeckEdit_SubSlotMedal_ver260`,
  `DeckEdit_SubSlot_MedalInfo_ver260`; textures in `make_textures.py`: `Subslot_MedalSlot%03d` (16
  categories), `Subslot_Route`, copies in img/ui of `Deck_Mark_Uplight/Reverse`, `Deck_Medal1` and
  `Deck_Medal2` (green, from 1). To be tried on the bench.
- Sub-slots, look and dragging (bench sb_2..sb_5, 11 October). «SUBSLOT MEDALS» list:
  MiniMedalScrollView = MedalScrollView (`[fn]`, vtable like Swap Medals) with fixed cells
  120x164 (`[fn]`), columns = width of `Scroll_Area` / 120 (400 -> 3, like the 380 of
  ver260); `+0xb26` = 1 (sub-slot) and mode 10 (`[fn]`). Every cell = small DeckRevolverView
  (`[fn](1)` -> `[fn]`: original `DeckEdit_SmallMedal_ver330`, `Medal` = Medal_S
  190x190 natural, plus `DeckEdit_Deck_MedalInfo_ver260` in `Area_MedalInfo`); mode 10 of
  `[fn]` puts `img/ui/Minfo_Pet01.png` (missing) in `Icon_1` and «×%01.3f» (106140350) in
  `Txt_1`, then adds `SubslotInfoPanel` («+%01.3f», 106140372, tier in `Guilt_Icon`, attribute in
  `Icon_Type`): the panel must cover all of `Area_MedalInfo`, hence the opaque plate
  `Subslot_InfoPlate` (sb_2 «×+0.030», tier cut at x -8). Size of the medals and
  overlap of the wings as in subslot_JP_1 (same cell, cannot be changed without code). Slots:
  `[fn]` loads the Medal_S (`[fn]`) into `Medal_S` without touching its size (layout:
  190x190 ignoreSize, before 89x109 stretched). Dragging slot -> list (`[fn]`): copy
  of the cell with `[fn](0)` (hides Route, MedalBase, Slot, SlotNum, InfoPanel, TYpe),
  medal in `Medal_S`, scale 1.5, added to the layer of `[fn]`, but `Medal_S` is not
  made visible: it was hidden in the layout (sb_4). List -> slot (`[fn]`): copy
  `[fn](0)` = original `DeckEdit_RevolverMedal_ver330`, opacity 200; it starts only with a
  first horizontal movement (>= 30) on a non-veiled medal, a vertical one (>= 20) scrolls
  the list. `Panel_34` (warning): `[fn]` only makes it appear/fade, position
  from the layout, now on the «Equipped Slots» bar. Client rules (`[fn]`,
  `[fn]`): «Equipped Slots» = consecutive full slots from the first, the multiplier adds the
  bonuses only up to the first empty slot: with slot 1 empty 0/120 and +0.000 are correct.
<a id="passive"></a>
- Passive Effects of **Equipment** (I-065, bench 12 October): it is not the PassiveDialog but the web popup `Information2_Base` (`[fn]`/`[fn]`, title 106220508) on the `passiveSettingList` URL of the login (`[fn]` -> singleton +0x390 +0x228; `[fn]` adds a query). The server now sends `http://api-s.sp.kingdomhearts.com/web/passive` (HTML page of `respondPassivePage`): over https the WebView (Chromium) rejects the certificate that the native client accepts (`tls:errore CERTIFICATE_UNKNOWN`), with the transparent background nothing is visible. The PassiveDialog (original `Passive_Base_ver341`, `Txt_None` 106220507 visible if `passiveSettingIds` is empty) is opened by `[fn]`, callback of the `Button_Passive` button of the **Profile** (lambda `[fn]`, created by `[fn]`; I-086, [home_profilo](home_profilo.md#profilo)); the part below on `PUT /passive/list` concerns that one (where it says Equipment read Profile).
- Passive Effects (I-065). The Equipment button sends `PUT /passive/list` (249, body
  `[fn]`, on the bench only `{isList}`), and the callback `[fn]` opens
  `PassiveDialog::open` (`[fn]`) only if the response is valid. Branch 249 (0x7c670c) reads
  `isList` and then `[fn]`: with `isList` 1 it reads `passiveSettingIds`, with 0 it reads
  `newPassiveSettingIds` (uint[]). If the array is missing the parser returns null, the branch fails and
  nothing opens: that was the defect (before, the server replied only `ret`). With `isList` 1 it
  also reads `userId`: if missing the list is one's own (singleton +0xab8), if present it belongs to another
  player (+0xad8). `isList` 0 puts the new ones in +0xac8 and adds them to +0xab8 (`[fn]`).
  The `PassiveResult` popup (`[fn]`) shows name and `description`.
  - Screen: `Passive_Base_ver341` with `Scroll_Area`, `Txt_None`, `Total_Area`, `Total_Score_01..15`,
    `Panel_TotalSwitch`, `Button_PassiveInfo` (opens the `passiveSettingList` URL of /system/url);
    cells `Passive_Panel` (`Txt_Passive_Label` = `name` of the passive row, `Icon_New`), sorted by
    `sortId`. With the empty list «There are no passive effects.» (106220507) appears, as
    in the original. The Total box (`[fn]`) shows HP, SP ATK Gauge, STR and DEF
    (`[fn]`) and the STR per medal type (categories of `[fn]`: U, R, P/S/M,
    Upright P/S/M, Reversed P/S/M; texts 106230203..217). All the layouts are already in the
    served resources: nothing to add to `make_layouts.py`.
  - Masters (empty in 5.0.1), generated by `server/make-passives.js` (after
    `make-keyblade-levels.js`; reduced copy in `server/tables/passives.json`).
    - `passive` (`[fn]`): `passiveId, name, validPassive, type[], value[], hp,
      abilitygauge, attack, defense, attribute`. type 3 = medal filter, value = mask
      1 P, 2 S, 4 M, 8 Upright, 16 Reversed. Without type the passive applies to everything.
    - `passiveSetting` (`[fn]`): `passiveSettingId, sortId, passiveConditions,
      passiveValue1/2, description, passiveId`.
    - Data from the khuxwiki «Passives» (`reference\passives\`): Lux LV 350..999 (520 rows) and
      keyblade +35..+60 (791 rows, 23 distinct passives).
    - The client does not evaluate the conditions. Ours: 1 = Lux level >= value1; 2 = series value1
      with level*10 >= value2.
    - Ids: Lux 10000+LV; keyblade 100000 + category*1000 + lv*10.
  - Server (`keyblade-evo.js`, `respondPassiveList`): computes the passives from the Lux level
    (`luxRankFor`) and from the highest level of every owned series. With `isList` 1 it replies with all of them,
    with 0 only those not yet communicated (`player.passiveSettingIds`), so the client does not
    add them twice. Only the +35 passives can be reached (one per keyblade, for example
    Starlight +35 «Upright S Medal STR +50») and the Lux ones from LV 350: beyond +35 the keyblade table
    does not go. The passives apply in battle on the client side (`[fn]` per medal). To be tried
    on the bench.
<a id="colosseo"></a>
## Colosseum

- The Quests menu (`[fn]`) after Quest 130 writes the ui text 102850008 into `Txt_Title4`:
  it was missing everywhere, crash at 0x8 (now in `make_layouts.py` TEXTS).
- The tap on a tile calls `[fn](scena, 0x10)` -> `GET /multi/status` (action 158,
  `[fn]`, parser `[fn]`; endpoint of another agent) -> `[fn](scena, 10)`.
  To be verified which tile (Union Cross or Colosseum) opens which mode.
- `GET /colosseum` (action 124, parser `[fn]`): `colosseumInfo {colosseumStageId int,
  status int}`, `colosseumStages[]` (element `[fn]`: `stageId`, `useAp`, `rank`,
  `stageCount`, all int), `colosseumRank` uint, `userColosseum {userRank, userStageCount,
  userStageTotalCount}` int. Other actions: 125 `/colosseum/reward/list`, 126 start, 127 retire,
  128 clear, 139/140/180 rankings.
- Missing layouts: `AdventureTop2_Colosseum_Button` (`[fn]`: ColosseumInfo, Button_Start/
  Txt_Start, ImageButton_QuestStart, Button_Ranking/Txt, Button_Reward, Button_Colosseum_Board/
  Txt_Description; texts 0x6222151-153, 0x6283bb5-7), `AdventureTop2_Colosseum_Panel`
  (`[fn]`), `_Target` (`[fn]`), `Colosseum_MainPanel` (`[fn]`),
  `BattleResultColosseumScene`, `RankingColosseumScene_ver1301`.
- Path verified in the code: tile of the Quests menu (`[fn]`) -> popup
  `PvP_SelectWindow` (`[fn]`) -> «Coliseum» (+0x440 = 6) -> `[fn](0x11)` ->
  `GET /user/notice` (241, `raidNotice {isSelfRaid, isOthersRaid}` uint mandatory) -> mode 6 ->
  `GET /colosseum` (124, builder `[fn]`) -> `[fn]` -> `[fn](6)` (map,
  `[fn]`: stages only with status 1) + `[fn]` (`AdventureTop2_Colosseum_Button`;
  status 2 = «This event is unavailable.»). The «PVP» (+0x440 = 0xb) goes to `[fn](0x17)`.
- **Master tables `colosseum` and `colosseumStage` empty** (offline 5.0.1): the client has no rows for
  the Colosseum stages, so the server replies status 2 and no stages (`respondColosseum`).
  To play it the master rows are needed (to be rebuilt) and `stage/cl_stg%05d_%02d.bin` (none
  served) for the map `AdventureTop2_Colosseum_Target`, then 126 start / 128 clear.

<a id="pvp"></a>
## Coliseum PvP (actions 194-205)

«Empty» but valid state in `respondPvp` (server.js, route `pvp`). Branches of `[fn]` (Ghidra),
a parser that returns null = «200 ERROR :<id>». Types: +0x11 bit 2 int, 3 uint, 5 uint64; +0x12
bit 4 string (`recon/tools/response_schema.py`).

| Action | Request | Branch / parser | Mandatory keys | Server response |
|---|---|---|---|---|
| 195 | GET `/pvp` | 0x7ca204 / `[fn]` | `pvp {pvpId, playNumber, pvpPoint, pvpClass, pvpRank` uint, `openRankingId` uint64, `numParticipant` uint`}` | pvpId `KHUX_PVP_ID` (1), pvpClass 1, rest 0 |
| 196/197 | GET/POST `/pvp/keyblade` | 0x7c3b9c / `[fn]` | `pvp.keybladeIds` [uint64], `pvp.userDecks` (`[fn]`, element `[fn]`) | saved keybladeIds (`player.pvpKeybladeIds`, empty), userDecks = `/user/deck` |
| 198 | GET `/pvp/vs_list` | 0x7c559c / `[fn]` | `vsUsers` [] (element `[fn]`, 0x278 bytes) | `[]` |
| 199 | GET `/ranking/pvpParade` | 0x7c9a24 / `[fn]` | `pvpParade {pvpClass uint, rankingPvpTopRanker []}` (element `[fn]`) | class 1, nobody |
| 200/201/202 | GET `/ranking/pvp`, `/own`, `/border` | 0x7c6ec8 / 0x7c5d20 / 0x7c6db0, `[fn](chiave)` | `pvpRanking` / `pvpRankingOwn` / `pvpRankingBorder` = `{rankingDatas [], rankingStatus int, rankingTermStart, rankingTermEnd}` (dates "YYYY-MM-DD HH:MM:SS") | status 2, no data, season = current month |
| 203 | GET `/pvp/rewardlist` | 0x7ca344 / `[fn]` | `pvpPoint` uint64, `scoreRewardId` [uint] | 0, `[]` |
| 204/205 | POST `/pvp/entry`, DELETE `/pvp/lock` | 0x7d0f0c (no parser, outcome 1) | — | only `ret` |

- Element of `rankingDatas` (`[fn]`): a complete player (`userData` `[fn]`,
  `userDetail`, `userKeyblades`, `userDecks`, medals, skills, avatar, `pvp/keyblade`,
  `userPvpRanking` `[fn]`). `rankingStatus` (`[fn]`): 2 = list, 1 and 3 = texts
  (0x652f715 / 0x63163a2 / 0x6316388). `[fn]` shows `rankingTermEnd` (+0xc).
- Sequence of the PvP tab of AdventureTop (lambdas): DELETE `/pvp/lock` (`[fn]`) ->
  `/pvp` (`[fn]`; skipped if session +0x790 -> +0x14 == 5) -> `/pvp/keyblade` (`[fn]`)
  -> `/pvp/vs_list` (`[fn]`, if scene +0x43b) -> `[fn]` -> `[fn](modo)` +
  `[fn]` (`cocostudio/publish/AdventureTop2_PvP_Button.json`: Button_PvPStart/Txt_PvPStart,
  Button_Ranking, Button_Reward, PvP_DetailButton(_Panel/_Draw), PvP_Point_DetailBut, Txt_PvP_Detail).
  The rankings (200-202) are requested by the Ranking scene (lambdas `[fn]`/`d63060`/`d634c0`),
  `/ranking/reward/check` (142) also starts from `[fn]`.
- **Blocking: master row `pvp`** (table 0x47, getter `[fn]`, null if missing).
  `[fn]` (detailUrl at +0x94), `[fn]` (rankingId +0x90), `[fn]`,
  `[fn]` (+0x29e), `[fn]` (scoreStartReward/EndReward +0x88/+0x8c) dereference it
  without a check: with an empty `master_data/pvp.json` the PvP tab crashes as soon as it is built.
  Schema (`master_types_ww431.json`): pvpId, stageId, stageBinId, dayCount, benefitDayCount,
  battleTimeout, validHoldKeyblade, holdKeyblade int[9], validRank, rankUpPer int[8], rankDownPer
  int[8], groupId, scoreStartReward, scoreEndReward, rankingId, detailUrl string(512), startTime,
  endTime. A placeholder row (pvpId 1, rankingId 0 = no `rankingPvp` row, so
  `[fn]` hides the widget; scoreStartReward 1 > scoreEndReward 0 = no reward) requires
  a new `KHUX_REVISION`. `pvpScoreReward` and `rankingPvp` are empty too.
- Missing layouts (catalog `missing_layouts.txt`): `AdventureTop2_PvP_Button`, `PvP_PlayerInfo`,
  `PvP_KeyBladeButton`, `PvP_KeyBladeBut_Base`, `DeckEdit_KeyBladeButton_PvP`, `StartDeckPvPScene`,
  `RankingPvPScene`, `Ranking_Result_PvP`, `BattleResultPvPWinScene`/`LoseScene`, Ranking_* .
- Remaining: real battle (`/pvp/entry` 204 with an opponent from `vsUsers`, `/pvp/clear` 194 not
  analyzed), rankings with players, rewards (`pvpScoreReward`, `rankingPvp`).

<a id="party-ranking"></a>
## Party and rankings (home Rankings)

Bench 14-10 (I-106, I-113, I-114). Module `server/routes-party-ranking.js`.

- **Party / Party Search** (Other > Party, home banner): `GET /payment/info` (24), `GET /party` (83),
  `GET /party/member/list` (86), `PUT /party/notice` (81), `POST /party/login` (82), then SIGSEGV at
  0x170. The responses are not the cause: with `userParty.partyId` 0 the 82 reads only `userParty`
  (`[fn]`, jump to 0x7c4ab0 before `party`/`partyLeader`). The scene `[fn]` loads
  `cocostudio/publish/PartyTopScene_ver131.json`, missing from every WW resource, like all the 31 Party
  layouts the client cites (`PartyTop_*`, `PopupNormal_Party*`, `PopupNormal_PartySearch_*`; only
  `PartyTop_JoinManagement_Scene_ver150` and `PartyTop_MultiMemberList_Scene_ver150` served): GUIReader
  returns null. JP 4.3.1 originals in `recon/tools/jp_coco_layouts.txt` (all ok at `--check`).
  Without a party `PartyTop_Initial.json` opens (`[fn]`: Txt_PREdit/Button_PREdit,
  Txt/Button_InitialRequest = search, Txt/Button_InitialManagement = create).
- `POST /party/login` (82): `userParty` + `isAbsenceLeader`. `GET /party/search/active` (87):
  `partyList[]` (`[fn]`), empty.
- **Single-player party** (15-10, tried): schemas worked out offline (agent, `D:\Progetto_Restauro_KH_UX\tmp\party_re\`
  REPORT.md and decompiled code). Create Party = `POST /party/create` (79, branch 0x7c494c) `{name, message, playStyle,
  agreeType}` -> `{userParty, party, firstReward int}`; `player.party` in the save. With `partyId` != 0 the chain
  becomes 83 -> 86 -> 81 -> **84 `GET /party/detail`** (`{rank uint}`) -> 82, and these are needed: `party` (`[fn]`:
  ... `chatId` uint, `chatEndpointUrl`), in 82 `partyLeader` = player element `[fn]` **with `userMedal` and
  `userSkills`** (like `/stage/support/list`, `selfPlayerElement` in server.js), in 86 `partyUserList` with the same
  element plus the details `[fn]` (`userKeyblade`, `userRanking`, `lastStageId`, `comment`, `linkPlatformId`,
  `userColosseumRanking`/`userPvpRanking` int, `raidHelpNumber`). The right panel (`[fn]`) looks for the leader
  (`supportUserId` == `party.leaderUserId`) in `partyUserList`: without it, index -1. Leader not absent -> PartyTop_right1.
  Chat: separate HTTP service (not Photon), with `chatId` 0 and empty urls it does not start; ChatScene has no layout (crash
  likely when tapping Chat). Bench 15-10: «Kxos's Party» with Leader, Members 1/30, Play Style, Approval, message and
  buttons Edit/Recruit/Manage/Rankings/Search.
- Party buttons (15-10, all tried on the bench, no crash):
  - Edit = `POST /party/update` (80) with the body of create; Leave (in Manage) = `POST /party/leave` (85); same branch
    0x7c3f88, only `userParty`. Leave -> «You have left the party.» and return to «Create or join a party».
  - Recruit = `GET /party/invite/search` (98): `[fn]` with the key **`partyUserList`** (string 0x1775281),
    not `supportUsers`: with the wrong key «200 ERROR :98».
  - Manage = served scene `PartyTop_JoinManagement_Scene_ver150`, which cites `PartyTop_JoinManagement_Right.json` missing
    in WW (SIGSEGV in strlen from GUIReader): imported from JP (`jp_coco_layouts.txt`). Tabs: 91 `/party/applicant/list`
    {partyApplicants, partyUserList}, 100 `/party/invite/list` {partyOffers, partyUserList}, 102 `/party/offer/list`
    {partyOffers, partyList}; 89 `/party/application/list` {partyApplicants, partyList}: all empty.
  - Rankings = party rankings 137/138/184 (empty); Search = 87 `/party/search/active` (empty).
  - «Receive 100 Jewels for joining your first party!» (text of PartyTop_Initial): at the first create `firstReward` 1,
    `flagFirstReward` 1 from then on (`player.partyFirstRewardDone`) and gift «First Party Bonus» Jewel x100 in the Presents
    (`addPresent`): the client shows nothing after the 79 and does not re-read the jewels. Bench 15-10: Collect -> «Received
    Jewel x 100!». Real effect of firstReward in the client not verified.
  - To do: medal
    of the member's card (today the first of the list), Chat (ChatScene without layout).
  - Icons `img/partyRank/Party_RankIcon1-5` (rainbow/sparkling silver/gold/silver/bronze crowns) imported from JP
    4.3.1 (`import_jp_coco.py`). Test with `party.rank` 5 (15-10): the crown stays the rainbow one of the layout; to be
    verified which field chooses the icon (maybe the `rank` of 84 or the ranking).
- «7 ERROR :249» on restart after the Party crash = `PUT /passive/list` (249) with curl code 7
  (connection refused): the guest network had dropped, it is not a server error.
- **Rankings** (`[fn]` draws the list; Lux tab = type 4, `+0x360` 1 = own
  position / 2 = top / other = border; `rankingStatus` 2 = list, 1/3 = message):
  - Lux, parser `[fn]` with a key per action: 129 `/ranking/weekly/user`
    (`luxRankingWeekly`), 130 monthly (`luxRankingMonthly`), 131/132 `.../own`
    (`luxRankingWeeklyOwn`/`MonthlyOwn`), 133 `/ranking/lux` and 134 `/ranking/lux/own` (`luxRanking`),
    178 `/ranking/lux/border` (`luxRankingBorder`). Fields `rankingDatas[]`, `rankingStatus` int,
    `rankingTermStart`/`rankingTermEnd` date, `lastRank` int. Element `[fn]`: **`userData.user`** and **`userData.userDetail` nested** as in `GET /user` (`[fn]` mode 0 looks for `user` inside `userData`, `[fn]` looks for `userData` -> `userDetail`; flat = «200 ERROR :133», bench 14-10): `userData`
    (fields of `userData.user`, `[fn]`), `userDetail` (`[fn]`), `userAvatar`
    (`[fn]`), `lux` uint64, `rank` int. Without 133: «200 ERROR :133».
  - High score `[fn]` (135/136/179) and Colosseum `[fn]` (139/140/180): same fields;
    Party `[fn]` (137/138/184): `rankingDatas`, `rankingStatus`, `lastRank`, `updateTime`,
    `nextUpdateTime`. Server: the player 1st in the Lux ones, the others empty.
  - Layouts: `Ranking_MainPanel_ver230` (`[fn]`), `RankingPartyScene_ver1301` (`[fn]`)
    and the other 17 `Ranking*` cited, all missing from the WW resources: JP originals in the list; 4
    (`Ranking_Result*`, `Ranking_Reward_ver1301`, `RankingRewardScene_ver1301`) to be decided because of
    `Rank_Title_3.png`/`Rank_Result_Deco.png` missing everywhere.
  - Crash after `/ranking/lux/border` (SIGSEGV at 0x8, bench 14-10): `[fn]` fills the Lux list
    (reads +0x5f0/+0x600/+0x7f0) and on the player's row creates the armature `Cursor_Anim_Ranking2`
    (`[fn]`, then `getAnimation()->playWithIndex(0)`), registered by `[fn]` with
    `Cursor_Anim_Ranking2.ExportJson`: missing from the WW resources (like `Cursor_Anim_Ranking`). Import in
    `import_jp_coco.py` (`JP_ARM`): JP ExportJson with plist and texture on the free name `MyPageAnime0`
    (new plists are not loaded, [risorse_layout](risorse_layout.md#regole)); the two armatures have the
    same frame `Rank_Panel_User_Eff.png` (`Cursor_Anim_Ranking20.png` is missing in JP too).
    Same row: position number `img/colosseum/Colosseum_Rank_Num1..10.png` and the balloons
    `img/ranking/Rank_Balloon*` (`Ranking_IconPanel_ver131`, `[fn]`), missing from the WW resources:
    from JP (`Rank_Balloon1_01` = copy of `1_02`, missing in JP too).
