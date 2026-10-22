# Battle, stage, defeat

History: [../journal/fino-al-2026-10-11.md](../journal/fino-al-2026-10-11.md) («La prima
battaglia», «Il Prologue giocato», «Il Prologue completato», «Missione 2»).

<a id="api"></a>
## Stage API

- `GET /stage/support/list` (111): `supportUsers[]` (`[fn]` with `userMedal`, `userSkills`,
  `userAvatar`). Before «Begin»: `userDetail.maxMedal` > 0 (otherwise `PopupNormal_MedalOver`,
  missing) and `maxDeckCost` > 0 (`PopupNormal_Cost_Over`).
- `POST /stage/start` (113): `userData.userPoint`, `startStageData` (`[fn]`),
  `userRandomEnemies[]`, `userEnemyDropItems[]` (`[fn]`: `uniqueEnemyId`, `dropItemTypeIds`
  int[] <= 4/5, `stealType`), `userTreasures[]` (`[fn]`), `campaigns[]`,
  `luxMagnifications`, `supportUsers[]`. `GET /user/keyblade` (11) gives `userKeybladeId`,
  `GET /user/deck` (12) the deck.
- `POST /stage/clear` (116, parser `[fn]`): `userData.{userPoint,userDetail,
  stageResumption}`, `stageRewardUserMedalIds[]`, `highScoreReward[]`, `firstClearFlag`,
  `stageOpenNum`, `clearMissionIds[]`, `userPvpRanking`, `status`, `pet.userPetParts[]`, `emblemIds[]`,
  updated inventory (`userMaterials`, `userMedals`, `userSkills`, `userTitles`, `userKeyblades`,
  `userDecks`, `userAvatarParts`, `subslotMaxNum`/`userKeybladeSubslots`), `getLux`. The body **does not
  contain stageId** (the one from `/stage/start` applies): `getPoint {exp, money, lux}`, `getMaterials`,
  `getEnemyDropItems`, `getTreasures`, `clearMissionIds`, `enemyDeadNumber`, `maximumDamage`,
  `burst`, `conditions`.
- Objectives: the client ticks only the ids the server sends back in `clearMissionIds`; those on Lux
  (`submissionRequire` 29, threshold `submissionNum`) are evaluated by the server on `getPoint.lux`.
- `POST /stage/continue` (115), `POST /stage/retire` (Give Up): `userKeyblades` and
  `userData.stageResumption`.

<a id="hp"></a>
## HP, CP, chests, bags

- HP: `userPoint` `baseHp`/`hp`/`maxHp` (the client shows `maxHp`). `[fn]` sizes
  the HP arc: above 3000 it loads `Avatar_Circle_01/06.png` and `Avatar_Side_01..04.png`, missing from
  every package (crash). Base HP 3000 (placeholder `KHUX_PLAYER_HP`; the real value at level 1 cannot
  be found), +20 per node of the boards (`player.sphereBonus.hp`).
- Prize types (`[fn]`): 4 coins, 8 CP (special gauge), 9 HP, 2/3/5/6/7/10 items
  (3 medal, 5 material, 14 Avatar Coin). Images `img/prizes/Prize_{Money,Hp,Cp,Treasure,Lux}NN`.
- Chests: `StageUtil::getTreasurePrizes` (`[fn]`) at creation (`[fn]`) looks up
  the `uniqueTreasureId` in `userTreasures`, reads the map's `reward` row and keeps the prizes whose
  type appears in the same position of `dropItemTypeIds`. Real rows: 1 empty barrel, 80 CP 15.000
  (small Attack Prize), 81 CP 30.000 (medium), 90 HP 1.400 (barrel with HP); 10100 = random medal
  (first enemy of every map). Our quantities in use: CP 10.000/5.000, HP 500 (ISSUES I-032).
- Bags (silver counter): enemy drops, `[fn](.., uid, reward)` looks up the `reward` row
  (`[fn]`, internal table 7) and **crashes if it is missing**. They open in
  CONGRATULATIONS.
- Orange (CP) and green (HP) orbs from enemies: `enemy` table (Shadow `attackCp` 50, `suppressCp`
  100, `attackHp` 30, `suppressHp` 144).

<a id="livello"></a>
## Level and RESULTS

The level is the Lux rank: `[fn]` -> `[fn]` uses `userDetail.luxRank` and
`userPoint.lux` against the cumulative `needExp` thresholds of the `lv` and `lv+1` rows of `player` (index
0x5b; the level 0 row is needed). The server starts from rank 1 and adds the Lux of every `/stage/clear`.
`firstClearFlag` 1 changes the path after the stage (`/user/sphere/reset`, `/user/sphere/check`).

<a id="slot-vuoto"></a>
## Empty Keyblade slot

The client takes one turn for each entry of `userDecks[].deckMedals`: a 0 becomes master medal 1
(«空き», `[fn]`/`[fn]`; analysis in `stage_gen\deck_empty_slot\REPORT.md`). It is the
original's **Stock Medal** (album no. 0, STR/DEF 50, «Placeholder when Medal is not equipped»):
an empty slot, even in the middle, played its turn with an almost null neutral attack
(`reference\empty_slot`: khuxwiki and ~30 r/KHUx comments). Since 12 October the server sends full
decks, with a 0 per empty slot up to the unlocked slots (`sentKeybladeDeck`), like the original;
5.0.1 gave medal 1 the image 90041 (Qui): `make-game-tables.js` assigns it 90000,
drawn by `recon/tools/make_stock_medal.py` (grey medal with the heart). Bench 12-10 sm_3:
counter 6/6 with 3 medals + 2 empty slots + friend, Stock Medal on the second turn. Failed attempts:
compact decks in `/stage/start` (branch 113 does not re-read `userDecks`), medal table without
row 1 (crash in Equipment).
<a id="gauge"></a>
## Special gauge

The user remembers that the gauge stays saved in the keyblade. `server.js` saves in
`player.keybladeBurst` the first numeric field of `/stage/clear` that names burst/gauge and sends it back
in `userKeyblades[].burst`: the real field name is to be verified on the «[gauge]» log (ISSUES I-030).

<a id="sconfitta"></a>
## Defeat in solo

- It works (bench 11-10): KO -> «Spend 100 Jewels to continue?» (`PopupNormal_Continue`, Held =
  jewels owned). OK -> `POST /stage/continue`: the server deducts `CONTINUE_STONE` (100) from
  `freeStone`, full HP and special gauge MAX (3660 -> 3560 on server and HUD). Cancel -> «Give up
  anyway?» -> OK -> `POST /stage/retire` and return to the quest list.
- Reproduction: `player.sphereBonus.hp = -2950` in the save (HP 50) and relogin; Quest 130
  (Armored Knight) is enough. Put `hp = 40` back once the test is over.
- The old «crash in PartyTopScene» was a distorted capture (stackcap's startup taps
  opened Party: use `-NoStart`); the real causes were missing layouts and the 9-slice on Plate21.
- Balance: Bandit + Red Nocturne (1240 part 2) wipe out 3040 HP at LV3 (ISSUES I-013).
- In the tutorial, death shows a notice, never captured (ISSUES I-031).

<a id="burst"></a>
## Burst (GuiltBurst)

Red button at the top right, once per quest (also raids and Coliseum), attack on all
enemies with power from the Burst level (introduced in 1.40; khux-guides.tumblr.com/post/152649620061).
Code: `CarouselGuiltBurst`, setup `[fn]` (battle) -> `[fn]` (UI).

- **Button conditions** (encrypted battle object, `[fn]`):
  - `+0x1c` = 1 from init (`[fn]`), cleared after the first setup: it is the «only the first time»;
  - `+0x18` = `[fn]` = **`userData.userDetail.isGuilt`** (userDetail row +0x44,
    singleton `[fn]` +0x128; in multi/raid, `+0x2c` = 2, the leader's one at +0x8b0 -> +0x60).
    The server sent 0: **cause of the missing button**;
  - level `[fn]` = **`userPoint.guiltBurstLv`** (userPoint row +100, singleton +0x118;
    in multi +0x8b0 +4) != 0;
  - not PvP (`[fn]`: CarouselDeck +0x300 = 1 outside PvP).
- **Attack** (`[fn]`, battle slot +0x358): **medal 2** row (table 0x55 = medal,
  `[fn]`): STR +0x4e0, DEF +0x4ec, +0x4d4; power = `Lv / 100 x battleMisc 134 / 10000 x
  10000` = **Lv x 400** (battleMisc 134 = 40000; `[data]` = 100, `[data]` = 10000).
  Without a medal 2 row the attack is not prepared. Then `[fn]` reads **shuffleskill 901 and 902**
  (enemyKind/enemyKindRate, +0xac/+0xb0) **without a null check**: without the rows, crash
  at battle start. The button: `Guiltburst_UI`, `Guiltburst_but`, `Guilt_Lv_Num` of
  `ActionMap_Guiltburst.json` (served); usable if the flags +0x19/!+0x1a/!+0x1b (`[fn]`).
- **Master rows** (`server/make-guilt-burst.js`, idempotent, also called by
  `make-game-tables.js` and `make-moogleshop.js`): medal 2 «Burst» (copy of 1, STR/DEF 5000
  placeholder `KHUX_GUILT_BURST_STR`, burstId 11); burst 11 = «11:ギルトボム» (Guilt Bomb, all
  enemies) from 5.0.1, with animations `abl_00011`/`eff_00011` missing -> those of Thundaga
  (10145/110145); shuffleskill 901/902 (enemyKind 1/2, bonus 0, icons 60/61). Master rev. +1.
- **Level** (`server/guilt-burst.js`): +`addGuiltBurstLv` (medal row +0x4c4; in the tables 0 ->
  1) at the first guilt of each medal, +`addGuiltBurstLvMax` (+0x4c8; 0 -> 5) at the first maximum
  guilt. Here guilt is the tier (`guiltValue`, fixed, no `guiltFactor`): first guilt = first
  medal (medalId) owned with tier > 0; maximum guilt = first copy at `maxLv` (our choice).
  A record that never goes down in `player.guiltBurst {first, max}` (the old `player.guiltBurstLv` is no
  longer used). `isGuilt` = 1 if the level > 0. `KHUX_GUILT_BURST_LV=<n>` fixes the level for
  tests (the save with all medals gives Lv 1908 = power 763.200).
- **Level popup**: `guiltBurstFirstUserMedalIds`/`guiltBurstMaxUserMedalIds` (`[fn]`:
  `/stage/clear`, draw, Moogle Shop, raid reward) and `guiltBurstFirstLv`/`MaxLv` of the Level Up
  (`[fn]`) open `lwf/medal/guilt_bonus/GuiltBonus_BurstLvup` (`[fn]`, clips
  `FromLv`/`ToLv`, `enterFrame` event on `_root`) and `GuiltBonus_BurstLvup_num` (`[fn]`),
  imported from the JP 4.3.1 data (`import_jp_raisedraw.py`, with `GuiltBonus_Wfix0..9` and the layout
  `MedalInfo_Burst_Info.json` of `[fn]`) with the «NOVA» logo instead of «BURST» (`make_nova_logo.py`,
  `--replace`), resources 41. Popup on by default (`KHUX_GUILT_BURST_POPUP=0` turns it off): tested on the bench from
  the Level Up on 17-10 (+1 «Unlocked X's Special Attack Bonus!», +5 «Maxed out X's Special Attack Bonus!», TAP SCREEN;
  [shop.md#sp2b](shop.md#sp2b)). The Level Up sends the arrival level ([guilt.md](guilt.md)); for the lists
  `guiltBurst*UserMedalIds` (draw, /stage/clear) the client computes the levels from the medal row
  (`addGuiltBurstLv/Max` +0x4c4/+0x4c8, `[fn]`): 1/5 on the rows that a «guilt: max» preset can deliver (`make-nova-rows.js`, I-149 closed, [shop.md#sp2b](shop.md#sp2b)). Record per `groupId || medalId`.
- **Super Burst** (`setupSuperGuiltBurst` `[fn]`, always called): for each medal of the
  deck with `validSuperBurst` (+0x500) and `superBurstId` (+0x504) != 0 (`[fn]`) it adds a
  panel to `ActionMap_SuperBurst_SelectWindow/SelectPanel` (served). No medal in
  our tables has it: off. To turn it on you need `superBurstId` on the medals, dedicated burst rows
  (`superburstTiming`; animations `abl_50xx1`/`eff_50xx1` served),
  `lwf/battle/Sburst/Sburst.lwf`, `SBurst_Revival.lwf` and `img/ui/SBurst_Icon1..3[R].png` (missing).
- To verify: `abl_15031` (avatar move table, next to `fburst_1/2`) missing; other
  readers of `isGuilt` (e.g. `PopupNormal_Guilt_ver130`, missing layout) not searched thoroughly.

<a id="animazioni-speciali"></a>
## Special attack animations (I-180, 20-10)

- A special's damage comes only from the `knockback_N` events of the motion's LWF (`lwf/burst/motion/abl_N`): one EnemyDamage per event, hit = attack x power / hitCount (BattleMisc::normalizeAttack, 1.0.1 with symbols). hitCount = knockbacks of the motion in 750/750 original rows: motion and hitCount must be changed together (the total stays the same).
- Rule of the originals: motion = family x 10 + {1,1,3,3,5,6}[level-1], effectId = 100000 + motion (14 exceptions), support 15001/15011/15021. WW 5.0.1 serves only 9 non-Supernova motions; the 2016 one has 339 complete, JP 671 (660 with missing textures).
- `server/burst-anim-fix.js` reads `reference\burst_anim\mapping_final.json` (made by `finalize.js` from the `RESEARCH.md` research): originals where known, otherwise an original motion with the same hits as the text; Lesser Attack of the Trait Medals 10061 (1 hit). Resources: `originals.tsv` #36 (version 50). Resources first, then the master: a motion referenced and not served almost certainly crashes.
- Supernova: the 51 served abl_500N1 motions have from 0 to 13 knockbacks (`supernova.js SN_KNOCKBACK`); bench 20-10 (user): 0 hits = no damage, 4 and 11 hits = 4 and 11 full hits. Roboloid: 1 hit (4 for the three «Reversed Strike All M»): `assignSnMotions` picks in rotation among the motions with those hits (revision 160).

<a id="hud"></a>
## HUD: comparison with the original (I-124)

Reference: `reference\battle_hud\hud_khux_utente.jpeg` (original) versus `screenshots\d14_*.png`.
Three elements are missing on our side.

- **«530% BONUS» with the red arrow** (bottom right, during the special's cut-in) = the medal's
  guilt. `CarouselDeck`: `[fn]` prepares the `GuiltBonus`/`GuiltBonus_Plus` movements
  of the `ActMapCarouselAnim` armature (`[fn]`, table 0x1f1e820; `[fn]` returns NULL
  if the movement is missing). On the special, `[fn]` reads the medal's `darklight` (medal row
  +0x498: 1 normal cut-in, 2 «Dark», 3 none) and the slot's guilt (`CarouselDeck` +0x4fc +
  4·slot): if != 0 it uses the `_Guilt` cut-in and calls `[fn]`, which writes `guilt/100 + plus`
  (+0x488, max 999) into the `GuiltBonusNum1..3` bones and sets `GuiltBIcon`/`_eff` to image
  `guiltValue - 1` (row +0x4c0, the tier). The slot's guilt comes from `[fn]` = field +0x10
  of the battle medal, which `[fn]` copies from `userMedal.guiltFactor` (structure
  +0x2c, parser `[fn]`) **only if the battle has `isGuilt`** (record +0x18 =
  `userDetail.isGuilt`) or if it is the friend's medal (category 2). Server: already correct
  (`guiltFactor` in `userMedalElement`, `isGuilt` from Quest 34). On our side it is missing because the
  deck's medals have guilt 0: in the save only 2216 (Black Coat King Mickey, tier 3, guilt 10000)
  has it, and it is not in the deck of keyblade 2. Resource: the `GuiltBonus` movement exists in the served one,
  but it is an old revision (8 movements, 52 frames): `GuiltBIcon` has 8 images and
  `[fn]` (changeDisplayWithIndex) does not check the bound, so a tier 9/10 medal
  (307 rows in the master) with guilt would read past the vector = crash at the cut-in; also missing are
  `GuiltBonus_Plus`, PvP and `MedalAttack_SBurst`. `recon/tools/make_carousel_anim.py` writes
  the current JP armature (18 movements, icons 1-10) with a single atlas with the served name (WW on the
  left, the 42 JP-only frames on the right, 2048x1024 canvas; a new plist would not be loaded).
- **Status icons above the avatar** («↑↑↑ moon+sword ×15», «Re» in the attribute's colour):
  `BattleStateIcon`. `[fn]` cycles the 16 types (tier at +0x300; >0 buff `BIconNN`, <0 debuff
  `DIconNN`, tables 0x1f1be08/0x1f1be88) and loads `lwf/battle/ActMapBuffDeBuffAnim/<nome>/<nome>.lwf`
  plus the tier `BuffNum_Up/DownNN` (0x1f1bf28, index tier + 20: «×15» = `BuffNum_Up15`);
  `[fn]` the Reflect icons `lwf/battle/ActMapReflectionAnim/RIcon_*` (only if the file
  exists). Neither folder is served (names_v4, addnl, stage_gen): no icons, no
  crash. JP 4.3.1 has them (69 + 6 folders; textures shared only once, e.g. «素材画像_Buff01»
  in DIcon02): added to `JP_LWF` of `import_jp_coco.py` with the same folders as filler
  (101 textures referenced, 0 missing; test on a copy: 176 files, new names in the index).
- **Blue icon below the Burst** = place of the **Super Burst (Supernova)** button: `SuperBurst_UI` of
  `ActionMap_SuperBurst_SelectWindow` (served; `createSuperBurstUI` `[fn]`). It is shown if
  `setupSuperGuiltBurst` (`[fn]` -> `[fn]`) finds a deck medal with
  `validSuperBurst` (+0x500) and `superBurstId` (+0x504) != 0, and the battle has `isGuilt`
  (`[fn]`, record +0x18) or it is the friend's medal. «SB» = Supernova in WW (wiki:
  «"SB" Sephiroth» -> «Supernova - Sephiroth»; `SBurst_Icon1/2/3` = SN, SN+, SN++). On our side it is missing
  because no medal in the master has `superBurstId`. Note: the 4.3.1 button uses
  `SBurst_but01.png` (light blue compass; `ActionMap_SuperBurst_SelectWindow.json` identical in WW and in
  JP), while the photo shows the «bubble» of `SBurst_Icon` without text (= `Supernova icon KHUX.png`
  of the khuxwiki): it is in no local version (4.3.1, 4.4.0, 5.0.1), so it comes from a
  later NA update. Since 15-10 (user's decision) the button uses the SN icon of the Medal List filters:
  `SBurst_SN_but01/02` (JP SBurst_Icon1 reduced to 80x80, pressed state darkened, `make_textures.py`) in a copy of
  `ActionMap_SuperBurst_SelectWindow` (`make_layouts.py`, WW source in `layouts\orig`); tested on the bench. To turn it on: Supernova
  medal/burst rows (`superburstTiming`), `lwf/battle/Sburst` and `SBurst_Revival` (in JP,
  to be added to `JP_LWF` together with the data), `img/ui/SBurst_Icon1..3R.png` (JP `img/ui`).

Bench: (1) without new resources: put 2216 in the deck, a stage, its special -> «100% BONUS»
with the tier 3 icon and the arrow (needs `isGuilt` 1: Burst visible = already 1). (2) After
`python recon\tools\make_carousel_anim.py` (writes to `stage_gen\files`) and a build: a tier
9/10 medal with guilt (Level Up) -> purple 9/10 icon as in the photo, no crash. (3) After a full
build (new names: not with `-Quick` if the reserve is not enough): a special with a buff (STR/DEF
up, effect of the burst row) or an enemy debuff -> icon and «×N» above the avatar.


<a id="supernova"></a>
## Supernova and new `burst` fields (client 4.3.1, 14-10)

`burst` row in memory (reader `[fn]`, getter by id `[fn]`): 4-byte fields in
schema order from `addTurn` +0x388 up to `unmatchMagnification` +0x52c (`target` +0x2a8,
`critical` +0x2b8, `criticalPower` +0x2bc, `recovery` +0x4d0, `oprUrgencyId/Value` +0x4d4/+0x4d8,
`addGuiltBonusId/Count/Value` +0x4dc..+0x4e4, `superburstTiming` +0x4e8, `recurringAttribute` +0x4ec,
`reflection*` +0x4f0..+0x4fc, `addBase*` +0x500..+0x51c, `matchCount*` +0x520..+0x52c). Medal:
`validBurst` +0x4f8, `burstId` +0x4fc, `validSuperBurst` +0x500, `superBurstId` +0x504.

**Supernova** (high certainty):
- `superBurstId` is a `burstId` of the `burst` table: the Supernova is a `burst` row like the
  specials. `[fn]` picks the attack's row: with the attack's Supernova flag (+0x6a)
  `superBurstId` (if `validSuperBurst` != 0), otherwise `burstId` (if `validBurst` != 0). So buffs,
  debuffs, `addTurn`/`addCount`, `recovery`, guilt bonus etc. of the row also apply to the Supernova.
- Button (`[fn]`, from `setupSuperGuiltBurst` `[fn]`): for each deck slot with
  `validSuperBurst` and `superBurstId` != 0, if the battle has `isGuilt` (`[fn]`) or it is the
  friend's medal (category 2), it adds the panel (`[fn]`) and sets the slot's bit
  (one Supernova per medal per quest). Panel: name +0x14 and description +0x95 of the
  `burst` row, target icon from `target` (1-3), `MultiplyNum_Label`, plate `SBurst_Plate01.png` or,
  with `recurringAttribute` != 0, `SBurst_Plate01re.png` (JP only).
- `superburstTiming` (`[fn]`, AI only in PvP when defending): if > 0 the Supernova fires before
  slot `min(timing, n slot)` (1 = before slot 1), like the wiki's «Triggers before slot N is activated
  when defending in PVP» (Roboloid: field `Supernova.Timing`).
- `recurringAttribute` (`[fn]`): mask; after the Supernova it re-enables the already used Supernova
  of the other deck medals whose Supernova row has `recurringAttribute` 0 and whose type matches:
  bit 0/1/2 = attribute Power/Speed/Magic (medal +0x494 = 1/2/3), bit 3/4 = Upright/Reversed
  (+0x498 = 1/2) (`[fn](mask, bit)`). Animation `lwf/battle/SBurst_Revival` (`[fn]`).
- Bench 14-10 evening, deck of Supernovas only (keyblade 2: Supernova - SP Roxas, Supernova+ - SP Axel,
  Supernova+ - SP Xion, SN+ - Illustrated Sora, SN+ - HD Xion [EX]; cost 230, needs player level
  ~95 with the sphere: below that, «Exceeds equipment cost» as in the original): the button opens the
  panel with all 5, the chosen Supernova starts and works (tested by the user). No SN badge
  on the deck's medals (see below).
- SN/SN+/SN++ badge (`[fn]`): from field +0x18 of the medal row (`displayId` in schema
  order): 100/101 and 1100/1101 -> `img/ui/SBurst_Icon1`, 200/201 and 1200/1201 -> `Icon2`, 300/301 and
  1300/1301 -> `Icon3`; from 1100 up the `...R.png` variant. On our side `displayId` = image id:
  no badge. To verify whether the client also uses the medals' `displayId` for the graphics.
- Animations: `lwf/burst/motion/abl_50011..50521` (51) and `lwf/burst/effect/eff_500x1` (40) are
  served (WW) and absent from the JP: in all likelihood the `motionId`/`effectId` of the Supernova rows
  (5xxx1, one per Supernova); no original data links id and medal.
- No local original data has Supernova rows or `superBurstId` (thethiny: old format without
  these fields; 5.0.1: no `medal` table). Source to reconstruct them: Roboloid
  `medal_db.json` field `Supernova` (`Name`, `Text`, `Multi` = multiplier, `Timing`, `Target`,
  `SelfBuffs`/`EnemyBuffs`), khuxwiki «Supernova».
- Resources **missing** from the served ones (names_v4, addnl): `lwf/battle/Sburst/` (`[fn]`),
  `lwf/battle/SBurst_Revival/`, `lwf/battle/BurstGauge_Recovery/`, `img/ui/SBurst_Icon1..3.png` and
  `..1R..3R.png` (in the JP only the R ones are in `img/ui`; the non-R ones are in `cocostudio`),
  `cocostudio/publish/SBurst_Icon1/3.png` and `SBurst_Plate01re.png` (only `SBurst_Icon2` is served).
  All in the JP 4.3.1 (`lwf\battle\Sburst`, `SBurst_Revival`, `BurstGauge_Recovery`, `img\ui`,
  `cocostudio`): to be added to `JP_LWF`/`JP_IMG` of `import_jp_coco.py`. Served: `ActionMap_SuperBurst_*`,
  `MedalInfo_SuperBurstWindow_ver*`, `SBurst_but01/02`, `SBurst_eff02..05`, `SBurst_Plate01..03`.

**New fields** (old thethiny format without these fields):
- `critical` = critical chance in ten-thousandths (5000 = 50%), `criticalPower` = multiplier
  x10000 of the critical hit (10000 = x1), `[fn]` (divisor 10000.0 `[data]`; the
  chance is scaled by 1 + bonus/10000 of the traits). High certainty.
- `recovery` = gauges recovered by the player («Gauge +N»): `[fn]` -> `[fn]` adds N
  to the gauge (+0xbc0) and, if > 0, animates the recovery (`BurstGauge_Recovery`). High certainty.
- `oprUrgencyId`/`oprUrgencyValue` = enemy countdown (`[fn]` ->
  `[fn]`): id 1 = resets the counters to their initial value («Resets count»), id 2 = adds
  `oprUrgencyValue` (signed, maximum 999: «Enemy countdown +3» = 3, «±0» = 0) to the counters of
  type 2/3 enemy attacks. Other ids: nothing. High certainty.
- `addGuiltBonusId`/`Count`/`Value` = «SP ATK B +N%» (`[fn]`/`[fn]` ->
  `[fn]`): entry active only with id != 0, count > 0, value != 0; the bonus shown is the
  **maximum** of the active entries (`[fn]`), in percent (230 = +230%), written into the
  `CarouselDeck` +0x488 (added to guilt/100 in the cut-in, max 999). Id/count = type and duration
  (presumably 1 = turns, 2 = attacks, like `addTurn`/`addCount`): to be verified on the bench.
- `matchCountType`/`matchCountValue`/`matchMagnification`/`unmatchMagnification` (`[fn]`):
  same list scheme (+0x590 with `matchMagnification`, +0x5e0 with `unmatchMagnification`, entry
  active with type != 0 and value > 0); multipliers probably x10000. Meaning not verified.
- `reflection*` (`[fn]` -> `[fn]` for each target): active with `reflectionTurn` > 0
  (turns), with `reflectionMagnification` and `reflectionAttribute`; `reflectionResetAttribute` read
  elsewhere. Icons `ActMapReflectionAnim/RIcon_*`. Units not verified.
- `addBase*` («Medal STR/DEF ±N»): semantics verified in the code, see [Base buff](#basebuff).
- <a id="buff-degli-speciali"></a>Buffs/debuffs (from the 154 thethiny rows compared with Roboloid): `buf*` = positive levels,
  `debuf*` = **negative** levels (-N); `...All` = on all targets (specials with `target` 2),
  without `All` = on the target; `addTurn` = duration in turns, `addCount` = duration in attacks;
  `heal`/`healShake` (healing, e.g. 2500/500), `cure*` 1 (Esuna), `resetDebuf*` 1 (Dispel), `copyBuf*` 1 +
  `addTurn` (Mirror); neutral attribute = `attribute` 5.
<a id="basebuff"></a>
## Base buff «Medal STR/DEF ±N» (I-155, 18-10)

`burst` fields +0x500..+0x51c in schema order: `addBaseCountType`, `addBaseCountValue`, `addBaseAtkSelf`,
`addBaseDefSelf`, `addBaseAtkOpponent`, `addBaseDefOpponent`, `resetBase` (+0x518), `addBaseAttribute` (+0x51c).
Decompiled and disassembled in `D:\Progetto_Restauro_KH_UX\tmp\namine\` (`d1..d8.c`, `g2\lin_86f.txt`).

- **Reading** (`[fn]`, after a special or a Supernova: row of `[fn]` and, if present, that of
  `[fn]`): first `resetBase` (bit 0/1 = reset own STR/DEF `[fn]`/`[fn]`, bit 2/3 = those of the
  targets), then `[fn]` on self (Self) and `[fn]` on **each target** (Opponent) ->
  `[fn](object, type, duration, atk, def, attribute)` -> `[fn]` twice: STR list (+0) and DEF list
  (+0x58). An entry is added only with **type != 0, duration >= 1, value != 0** (16-byte entry {type|8, duration,
  value, attribute}; bit 8 = «added after the last reset», cleared by `[fn]`).
- **Type** (`[fn]`: decrements by 1 the duration of the entries of that type, removes those at 0): **1 = turns**
  (`[fn]`/`[fn]` at end of turn: `[fn](.,1)` next to `[fn]`, the decrement of the
  turn-based buffs), **2 = attacks** (`[fn]` after the attack: `[fn](.,2)` next to `[fn]`, the
  count-based buffs). DEF side the same with `[fn]`. «1 turn: Medal STR +2000» = type 1, duration 1, value 2000;
  «3 attacks: ...» = type 2, duration 3. No other type in the code.
- **Absolute value** added to the medal's STR: `[fn]` = STR of the row + `[fn](list,
  mask)`, minimum 0, then the multipliers; enemy DEF/enemy STR with the total sum (`[fn]`,
  `[fn]`, `[fn]`). Equal entries **stack** (Naminé 2000 + 2000, then Supernova +5000 = 9000).
- **Attribute** (`[fn]`, static masks 0x7 and 0x18; medal mask from `[fn]`): bit 0/1/2
  = Power/Speed/Magic (medal +0x494 = 1/2/3, or the changed attribute `[fn]`), bit 3/4 = Upright/Reversed
  (+0x498 = 1/2), like `recurringAttribute`. If the entry has PSM bits the medal must have one of them; if it has U/R bits,
  likewise; **0 = all medals**. «P- & S-Medal STR» = 3, «U-Medal» = 8, «Medal STR» = 0. «PSM-STR» in the
  descriptions is the notation of the level buffs (`buf*`), not of the base buffs.
- **HUD**: `[fn]` (player: sum of STR filtered by the medal, sum of DEF, flag `[fn]`) and
  `[fn]` (enemy) -> `[fn]` -> plate. Layouts `ActionMap_BaseBuff_Avt/_Enm` (+ `_eff`) loaded
  by `[fn]` only if they exist, attached by `[fn]` to the nodes `BaseBuff_Avt_Null1/2`
  (player) or `BaseBuff_Enm1/2` (enemy, in the bar `RaidBattle_EnemyStatusField_*`; client strings:
  `BaseBuff_Avt_Null1/2`, `BaseBuff_Enm1/2`, `BaseBuff_Enm_Null1/2`); everything checks for null. PvP:
  `ActionMapPvP_BaseBuff_*` (not imported).
- **Data**: no original source has values != 0 (thethiny 11 and 751 rows, JP 4.3.1 without master). Reconstructed
  from the descriptions with `server/make-base-buff.js` (called by `make-game-tables.js`, idempotent; test
  `test-base-buff.js`): **397 rows** (378 turn-based, 19 attack-based, 314 with attribute, 4 with DEF, 3
  on the opponent), 0 not interpreted. Comparison with Roboloid's `STRPlus`/`DEFPlus`/`STRMinus` fields: 393 equal,
  4 different where Roboloid contradicts its own text (4002029, 4001991-3: the description wins). Report in
  `D:\Progetto_Restauro_KH_UX\tmp\namine\report.md`. Declared in the notice «Differences from the original game».
  The «Base STR/DEF» filter of the Medal List (`addBaseAtk*`/`addBaseDef*`, [medaglie](medaglie.md)) now finds these medals.
- **Resources** (`jp_coco_layouts.txt`, I-155): `ActionMap_BaseBuff_Avt/_Enm/_eff.json` with the `BaseBuff_*` textures from the JP;
  in `ActionMap_PlayerStatusField_new.json` (served WW) the new option `graft=` grafts only the two Null nodes of the
  JP revision 00360289 (Panel 24x24 at 122,20 and 96,-6 under `Panel_8`), the rest stays WW.
  Enemy: the WW has `BaseBuff_Enm1/2` only in `RaidBattle_EnemyStatusField_S` and `_S_Raid`; grafted from the JP also into
  `_L` (rev. 00438800), `_L_Multi` (00376985) and `_S_Boss` (00376981).
- To test on the bench: plate under the HP after Naminé's special (2000 -> 4000 -> 9000 with the Supernova),
  disappearance at end of turn, higher damage, an «N attacks» row, a row with attribute and a medal of another
  attribute (the player's plate follows the medal), «targets [Medal STR -N]» on the enemy (plate on the enemy's bar, bosses too).

<a id="attacchi-nemici"></a>
## Original enemy attacks (I-181, 20-10)

The WW 5.0.1 master has only 13 `enemyAttack` rows (1, 100, 101, 300, 301, 600, 601, 700, 701, 800, 801, 1700,
15100); the enemies reference 289 (`skillId`). `make-game-tables.js` copied the missing ones from 1/101/601: no
poison, sleep or paralysis, generic power and effects. thethiny's data (`enemyAttack.json`, 294 rows, 41
fields) has all 289, and the 13 WW ones match field by field: they are the source. `server/enemy-attack-fix.js`
copies them (253 rows changed) except two fields that load resources:
- `hitEffect` -> `lwf/character/enemy/hit_effect_fla/eff_N/`: 55 rows reference effects that are not served (1010,
  1011, 1014, 1018-1021, 1026, 1028, 1032, 1035, 1038-1049, 2001-2007 except 2003/2005): today's effect
  stays (Notice «Enemy attacks»). To look for in the 2016/JP data to serve them.
- `attackMotion`: 1 = `atk1_o`, 2 = `atkSp` (falls back to `wait` if missing); from the original only 1 and 2.
The fields absent from thethiny's data (reflections, upright/reverse, spEffect) stay those of the master.
39 attacks with a status (e.g. 9301 «High Chance of Poison» of the Poison Apple, poison 10000), used by
Flower Rider, Possessor, Loudmouth, Neoshadow, Creeper/Fire/Ice Plant, White Rose, Bad Dog, Stinging Bee...

<a id="cornice-avatar"></a>
## Avatar frame in the HUD (I-125, 14-10)

`[fn](?, angle, ?)` (called by `[fn]`, `ActionMap_PlayerStatusField_new`) loads
`img/ui/PlayerStatusIndicator/Avatar_Circle_0N.png` for the angle of lost health
`(1 - HP/HPmax) * [data]` against the thresholds `[data]` = 90 and `[data]` = 180:
< 90 Circle_01, 90-180 Circle_05, >= 180 Circle_06 (then Side_01/02). The null texture is not
checked: SIGSEGV at 0x24, pc `0xb17adc` (logcat -b crash: `rbx` = ARM address). The WW resources
served only Circle_03/04/05 and Msk: Circle_06 and Side_02-04 from the JP data, Circle_01/02 and Side_01 from the
2016 package (`import_jp_coco.py`, `JP_IMG`). How to recognize it: crash right after `/stage/start`.

<a id="nemici-jp"></a>
## Original enemy graphics (enemy_gen, 14-10)

Problem: the WW resources serve `lwf/character/enemy/<displayId>/` only for 1, 6, 8, 17, 37, 1020 and
the Dark Road series: `make-game-tables.js` gave all the others a substitute (Shadow, Armored
Knight, Dark Road table), e.g. Munny Egg with the Shadow.

What the 4.3.1 client loads (Ghidra): `[fn](enemy, state, n)` formats the LWF from the table
`0x1f1cc88` = {0 `wait`, 1 `bwait`, 2 `move`, 3 `atk%d_o`, 4 `atkSp`, 5 `knockback`, 6 `dead`} and
opens it with `[fn]`, which returns NULL if the file is missing; right after, `+0x4a0` is read: crash.
`[fn]` (creation) only checks that `bwait` and `atkSp` exist (`[fn]`, flags
`+0x892`/`+0x893`): if absent -> states 1 and 4 fall back to `wait`. `atk%d_o`: n = `attackMotion` of the
`enemyAttack` row (`[fn]`/`[fn]`, field `+0x2d8`; 2 = `atkSp`); in our master
all rows have `attackMotion` 1. `[fn]` preloads the 7 entries (tolerates absent ones).
Therefore **mandatory: `wait`, `move`, `atk1_o`, `knockback`, `dead`**; optional `bwait`,
`atkSp`, `atkN_o`. `move` is needed only when the enemy walks on the field (`[fn]` state 3):
142 of the 360 JP enemies do not have it (plants, stationary bosses, like the served 37), but our maps
can make them move (Yellow Opera crash on Dark Road 5075): it is reconstructed from `wait` like
`make_enemy_moves.py`. Appearance effect: `lwf/character/enemy/show_effect_fla/show_effect<showSwf>/`.

`recon/tools/make_jp_enemies.py` (Pillow: without `-I`; ~40 s) writes `D:\Progetto_Restauro_KH_UX\enemy_gen\files`
for the original displayIds (`enemy_display_orig.json`) of the master rows not served by the indexes
(names_v4 + addnl): per animation (1) JP 4.3.1 LWF with all the JP textures (those absent taken from the 2016 one only
if the 2016 LWF is byte-for-byte identical), (2) LWF and textures of the 2016 package, (3) JP LWF with the
textures discarded as duplicates taken back from another animation of the same enemy (identical copies);
PNG -> premultiplied BTF. An enemy is included only with all the mandatory ones complete. Plus the
original appearance effects that are not served (5, 7, 8, 9, 12, 13, 15, 16, 19, 101, 103). Report in
`enemy_gen\report.md`. LWF format the same in the three sources (headers `12101000`/`13121100`).
In (3), without copies from the same enemy, the texture comes from the **duplicates table**
`recon/tools/jp_dedup_donors.tsv` (`jp_dedup_donors.py`, 21-10): the identical file left in another JP folder
(often `lwf/drama/<id>/`, different bitmap numbering), rules measured on the 2016 package (stub_of known,
776/777 by eye); the NPC import of `import_jp_coco.py` uses it too. Additional enemies: 1545, 1591; NPC 2021.

**Reconstructed textures** (I-194, 21-10, user's decision: reconstruct as in the original from the data we have,
declared in the Notices): `recon/tools/jp_reconstructed.tsv` (`jp_reconstructed.py`), separate from the duplicates, used in
(3) after copies and duplicates and by the NPC import. For the families with <= 4 textures still missing in the mandatory
animations, always with a real JP file (never an invented shape) and only if the family thereby becomes complete:
`shadow-family` (shadow of the same family, same declared sizes, the closest to the others), `shadow-common`
(the most common variant of those sizes, e.g. 97x24), `family` (same part from another animation of the same
family: candidates all close, at least 3 or with the same bitmap number). Tests on the 2016 package (known
target, true file excluded; `tmp\jp_table\recon\shadow16.py`, `family16.py`): shadows 458 cases, mean difference
**1,98/255** at the declared sizes (median 1,09, max 8,2); family 772 cases, 11 (1,4%) above 8/255 (a single
candidate with a different bitmap number: 20% above 8, excluded). 14 rows (6 shadow-family, 5 shadow-common, 3 family):
enemies 227 Wily Bandit, 1512 Ferocious Fins, 1514 and 1515 Burrfish, 1519, 1637 Swaying Cactus; NPC 5009, 9002 (shadow
144x35). Still incomplete: 1552, 1587, 1614 (no candidate in the family) and the NPCs with a missing part
of the wait only (e.g. eyes: the sisters in the same LWF are different frames). Sheets:
`tmp\jp_table\sheets\recon_<id>.png` (reconstructed ones with a red border).
Fix of the same-name rule (21-10): now it applies only if the candidate texture has the declared sizes
(+-2 px; `tex_dims`, `fits`). Before, the wait of 1577 (Green Gearbit) took the 146x148 smoke clouds of dead
instead of the 95x65 gears (in Flash the bitmap numbering is per FLA) and 1512 a 244x61 piece instead
of the 97x24 shadow (now reconstructed).

Result (14-10): 121 displayIds to cover, **116 complete** (605 enemy rows out of 670, 12.267 files,
51,8 MB; package 53,2 MB), move from wait for 16 (36, 38, 39, 73, 75, 76, 154, 184, 198, 199, 211,
228, 230, 231, 232, 1023). Incomplete (they keep the substitute): 251 Cannoned Camel, 1501 Gold
Tricholoma (wait/knockback textures absent, no dead), 2001-2003 sEnm (no knockback nor
dead in any source). Story stages: 173 enemyIds, 18 served WW, 152 with the original graphics,
3 with the substitute (1501 -> Dark Road 5038, 2001/2002 -> 17).

Quests 526-979 (21-10, I-009 Task 7): `--oltre` (enemies_oltre525.json) adds the folders of the
families of the new enemies (displayId = family: in the master every story row from 1000 up has
displayId = family; visual proof: 1517 = Diver's diving helmet). Rule (3) extended: texture
with the exact name in another animation of the same enemy. Of 124 new families **5 complete** (20,
139, 1512, 1517, 1559; +531 files, +2,69 MB); 119 not: the JP extraction discarded the duplicate textures
(1532, 1533, 1540, 1576... 0 PNG; Jafar 1550 2 out of ~140) and no file with the same name and sizes (LWF:
texture section) replaces them elsewhere in the `lwf` tree; 56 do not even have `dead`. The new
rows (`make-enemy-oltre.js`) use the family if served, plus size/speed/appearance from
`json/enemy/detail<famiglia>.json` (only 56 among the new ones), otherwise the graphics of the base.

**Dark Road look of the same species** (I-194, 21-10, step approved by the user: substitute, not original, declared in the Notice «Story Quests 526-979»). For the families without complete original graphics `make-enemy-oltre.js` uses the `DR_LOOK` table (family -> DR displayId, confidence, note) before the graphics of the base; with the DR one, size and appearance from the family's JP detail if present (today for none). The DR LWFs have no names (bitmaps «ビットマップ N», obfuscated symbols): species recognized by eye from the wait textures (`btf.decode`) next to khwiki `<Nome>_KHUX.png` (`tmp\dr_map\sheets\cmp_*.png`, script `tmp\dr_map\compare.py`). Findings: 5039 Emerald Sonata, 5041/5042/5043 Poison/Paralysis/Sleep Archer (5043 is not «Storming Sheep» of `enemy_display_map.json`), 5044-5046 Blitz Spear/Chill Ripper/Heat Saber, 5047 Barrier Master, 5048-5050 Pot Spider/Centipede/Scorpion, 5055 Ferry Reaper (8018 dark variant), 5057 Fluttering, 5058 Wight Knight, 5066 Margoyle, 5074 Trickmaster, 5075 Apricot Opera (not Yellow Opera), 5083/5084 Volcanic/Blizzard Lord, 8015 dark Gargoyle Wizard, 5040 Shadow Witch, 5065 Eliminator. 29 families (23 high, 6 medium), 58 rows. The DR ones have no `move`: `make_enemy_moves.py` makes it from wait for every displayId >= 5000 of the master, so a master with new DR displayIds must be served only after a build-resources that has read it.

`make-game-tables.js`: the folders `enemy_gen\files\lwf\character\enemy\<id>\wait\wait.lwf` and
`show_effect_fla\show_effect<N>` count as served (`KHUX_ENEMY_GEN` for another folder,
`KHUX_NO_ENEMY_GEN=1` to ignore them); the real rows to which a previous run had given the Shadow's
effect get their own back (show, showSwf, showFrame, hideFrame) if it is now served (55 rows).
Build: static package `d0037` before the generated one (`build-resources.ps1`, `-NoEnemies`).
Master and package go together: a master with the original displayIds on a version without
`enemy_gen` crashes when quests start.

**Source priority and 5.0.1 integration / recolouring** (I-194, 21-10 evening; binding user rule: the original
files always win). For texture/animation, in order (`make_jp_enemies.py fill_tex`, category of the family =
the worst of the animations, in `report.json complete_by_category`): (1) direct files at the same path (JP 4.3.1,
2016, JP OBB 5.0.1 `exact501`); (2) original copies: same enemy, `jp_dedup_donors.tsv`, `recon/tools/extra_donors.tsv`
(`extra_donors.py`: containers `jp501` = `tmp\jp501\x`, `ww501` = `tmp\enemy_src2\ww`+`wwtex`, `b2016`, `jp431`; rules
`lwfmatch+anchors` (texture table identical to a DR LWF and survivors equal by eye), `unique`/`align&donor`/
`donor&order` on the 4.3.1+5.0.1 set, `twinfam` (WW/2016 family twin, excluding 14 with different sizes and the 45
conflicts of the atkSp of 2011), `whole-dr-twin` = whole animation of a DR twin verified by eye: only 1543 Pot
Spider wait and dead from 5048, sheet `tmp\integr\v1543.png`); (3) reconstructed `jp_reconstructed.tsv` (+26 shadows of the
recoloured families, same methods); (4) **recoloured** `recon/tools/jp_recoloured.tsv` (PNGs generated outside the repo in
`D:\Progetto_Restauro_KH_UX\enemy_gen_src\recolour`, container `recolour`); (5) `DR_LOOK` of make-enemy-oltre.js for the
families still incomplete. Copies and recoloured ones with the declared sizes (+-2 px); the reconstructed ones not (scaled shadows).
Recolouring (`tmp\integr\recolour.py`): families with an LWF with the same table as a DR twin but different survivors
(`tmp\jp501\lwfmatch_rejected.json` «anchors differ»); affine RGB 3x4 colour transform (better than the 3D table
with bins of 8 in all of them) estimated on the pairs JP surviving texture / same texture of the twin (pixels with alpha >= 200),
validated by leaving one out (LOO, mean absolute error per texture /255); threshold: mean <= 2, maximum <= 5.
Accepted (LOO mean/max): 249 Eliminator from 5065 0,15/0,57; 1501 Gold Tricholoma from 5038 0,33/1,12; 1503 Emerald
Sonata from 5039 0,48/0,73; 1508 Poison Archer from 5041 0,57/3,37; 1509 Paralysis Archer from 5042 0,66/4,51; 1523 Blitz
Spear from 5044 0,55/2,92; 2505 Wight Knight from 5058 0,27/0,96 (without transform 0,1-0,6 mean: the twins are almost
the same colour). Twin slots removed as duplicates in the DR folders too: same suffix or name in another
animation of the twin. dead without LWF: the twin's **generic** dead (smoke only; table shared by >= 3 DR enemies,
64 the same one; the JP 4.3.1 deads with the same table have the same textures: 340 comparisons, difference <= 1,6/255),
rule `recolour-whole`. Excluded: 1510 (534x112 effect of atk1_o absent in the twin), 1524/1525 (22x25 and 14x32 parts
of atk1_o absent in 5045/5046), 1539 (wait/knockback not twins), 2006 (no knockback/dead). Sheets
`tmp\integr\sheets\rc_<id>.png` (recoloured ones with a magenta border next to the twin). Result: 140 displayIds complete
out of 245 (+12: category 2 1534, 1543, 1562, 1587, 1602; category 4 249, 1501, 1503, 1508, 1509, 1523, 2505; 15.163
files, 66,5 MB). 1501 has real rows in the master (today 5038): it switches to 1501 at the next full make-game-tables.

**Original copies found by content** (I-194, 22-10; category 2, original files, no new declaration). Many textures
dropped by the JP extraction still exist, identical, in other LWFs of the same creature under another name and bitmap
number: `lwf/character/raid` and `lwf/raid/demo` (raid version of the boss), `lwf/drama` films, another enemy,
`burst`. `recon/tools/deep_donors.py` (deterministic redo of the scan in `tmp\deep_scan`, engine2 + mk_tsv; caches in
`tmp\deep_donors_cache`, first run ~60 min for the LWF index of all local containers, then ~3 min) writes
`recon/tools/extra_donors_deep.tsv`, read by `make_jp_enemies.py` after `extra_donors.tsv` (`--deep ''` excludes it).
Method: for each incomplete family, survivors (original files only) and missing textures with their declared sizes;
candidate donors = the 60 LWFs declaring most missing sizes; **anchors** = survivors equal by content to a donor
texture (32x32 premultiplied signature, mean difference < 6/255, size +-1 px); donor accepted with >= 2 anchors, or 1
anchor if its table covers >= 80% of the family's >= 8 declared sizes; a donor that picks wrong images on the family's
own survivors (>= 2 and > 5%) is rejected (incoherent donor). Rules: **content-anchor** = every texture of the accepted
donors with that size is the same image; **bracket** = the two table neighbours are known and the same two images
enclose a texture of that size in the donors (all agree). Table alignment alone (`align`) is not used. Validation
(`--validate`, 105 families): content-anchor self 1841/1856 (99.2%), hide 3871/3882 (99.7%); bracket 34/35 + 53/53
(87/88); align 88/117 self (excluded). Visual check of every sheet (`tmp\deep_scan\sheets\v2_<family>.png`, new
families `tmp\integr2\sheets\v3_<family>.png`): 84 rows rejected (`VISUAL_REJECT`): 285 (only survivor a 9x6 speck),
1635 (clouds of a player ability), 2011 and 2021 (anchors only generic smoke; parts of another character), 1541 orange
shell 74x41, 1645 knockback from film 2552701 (Turbo/Cy-Bug pieces), 1650 orange flame 36x56. Result: 1853 rows in 49
families (identical to the scan's 1854 minus the 84 rejects, plus 83 rows of 1521, 1524, 1540, which the scan's
hand-made family list did not include). Complete families 140 -> **141** (category 2: + **1028 Guard Armor Ω**,
from raid 0006 and demo escape_0006); enemy.json 526-979: 181111028 (Quest 850) 22 -> 1028; family-clone rows by
graphic: family 45, Dark Road 29, base 148 (before 44/29/149).
Still incomplete after the copies, with the approved reconstruction rules of `jp_reconstructed.py` (<= 4 missing
textures; shadow-family/shadow-common; family = same declared size in another animation, >= 3 candidates or the same
bitmap number, all close) not enough (`tmp\integr2\recon_eval.py`, no new rule invented): 1561 Dragon Maleficent (8
missing eye frames 103x65/104x65, bitmaps 2-8; the only candidates are bitmap 1, two of them for wait/atk1_o: rule
fails, and they are different frames of the blink); 1548 Gear Golem (5: 170x149 and 645x336 have no candidate, the
289x279 gears are ambiguous, difference 25/255); 1600 Crabby Cake (16 slots = 4 eye frames 20/23/24/25 x 4
animations; the family rule would pick bitmaps 21/22, but 16 > 4 missing textures); 1610 Flappy Bug (5: 4 shadows
97x24 + 65x53); 1520, 1615, 240, 1636 (6-13 missing); 255 Dual Blade (10 missing and no `dead` LWF at all: stays
incomplete). 1524 Chill Ripper: wait/atk1_o/knockback are now complete with original copies (film 2290101); only
`dead` has no LWF: the approved category-4 rule `recolour-whole` (generic smoke dead of the DR twin 5045) would
complete it, but it is outside the reconstruction rules of this step and needs a Notice line: not done.
