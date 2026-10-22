# Resuming the work

This file exists **only to restart**: current state and next step. Problems are in
[docs/ISSUES.md](docs/ISSUES.md), technical knowledge in [docs/notes/](docs/notes/), history in
[docs/journal/](docs/journal/) (the old full HANDOFF is in
[docs/journal/fino-al-2026-10-11.md](docs/journal/fino-al-2026-10-11.md), the states from 14 to 16 October in
[docs/journal/fino-al-2026-10-16.md](docs/journal/fino-al-2026-10-16.md)).

## The project

Restoration of **Kingdom Hearts Union χ** (Android WW 4.3.1 client, service shut down in 2021): a
Node server (`server/server.js`) answers the **original**, unmodified client, which runs on
**LDPlayer 9 (Android 9)**, the only bench where the LIAPP protector lets it start
([protector](docs/notes/protector.md)). The resources are the 5.0.1 OBBs + `addnl` from the iOS 4.3.1 IPA +
a package we generate (maps, rebuilt CocoStudio layouts, textures, medals). You can play
from the new player to the home screen, story quests 1-525 (generated maps), Medal List, selling,
Level Up, Evolve, Moogle Shop, Profile, Missions, Avatar Boards.

## Restarting

Bench state: **resources 56 installed** (21-10 evening, 4.22 GiB on misc.mp4.2; before: 49 (20-10: compacted, 3.90 GiB; above 4 GiB tested with 48, I-171 closed), **master revision: BASE 174** (default of the 4 session scripts; the server sends `BASE*100000 + past deadlines`, [server.md](docs/notes/server.md#orologio)). Fake clock
(twin months 2016-2021), `-RealNow <ISO>` to test a week change: [server.md](docs/notes/server.md#orologio);
full history in [fino-al-2026-10-16.md](docs/journal/fino-al-2026-10-16.md).

```powershell
# emulator (if off)
D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9\ldconsole.exe launch --index 0
# server + re-entry of the saved player up to the home screen
.\tools\ldplayer\session\relogin.ps1 -Tag x
# MANDATORY after every emulator start, otherwise the «End of Service» popup
D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9\ld.exe -s 0 "sh /mnt/shared/Misc/phaseb-guest.sh 192.168.1.185"
```

- After an emulator restart the client may re-download version 32 (~3 GB, minutes).
- Windows IPv4 DNS on **192.168.1.185** during tests, **automatic** at the end of the session. Guest network broken
  («7 ERROR», `ip route` with no default): `ldconsole reboot --index 0`, `sys.boot_completed`, `phaseb-guest.sh`, relogin.
- Layout tests: `.\tools\ldplayer\session\build-resources.ps1 -Quick` (~40 s, no
  download if the sizes stay within the reserve). **Never `-Quick` if there is a version newer
  than the installed one.** A full version (`-Version N`) is downloaded right away by the
  client: only with the bench stopped, then `update-resources.ps1`.
- After every change to `server/master_data`: raise the revision in the 4 session scripts and
  `relogin.ps1` (twice if the first one crashes). Do not restart only the server with a session open.
- Crashes: `tombstone.ps1`, then `armtrace\stackcap.ps1` (the library base differs at every start:
  pass it with `KHUX_BASE`; always `capture.ps1 -Release` after `-Arm`). Full recipe in
  [banco.md](docs/notes/banco.md#crash); `D:\Progetto_Restauro_KH_UX\tmp\repro.ps1 <name> <x> <y>` taps, saves
  requests, logcat and screenshots. Taps only while the game is alive (`bench_lib` refuses taps with the game closed).

## State as of 17 October 2026 and next step

- **Shop**: sub-project 1 (16-10), 2 «List of the original banners» (17-10, [shop.md#sp2](docs/notes/shop.md#sp2),
  final correction [shop.md#correzione-finale](docs/notes/shop.md#correzione-finale)) and **2b «Guarantees»**
  (17-10, [shop.md#sp2b](docs/notes/shop.md#sp2b), I-144/I-148/I-149 closed, commits cf1030b..fe280d8): **done and
  reviewed** (final review + approved corrections). Slot/Tier/pity/yellow strip, boosted as master
  rows, presets (B0306-B0308 with guilt at max, notice 40734, confirmed by the user), Nova popup turned on
  (JP LWF + NOVA logo, resources 41; `KHUX_GUILT_BURST_POPUP=0` turns it off), Nova levels in the medal rows
  (`make-nova-rows.js`); **original rule 13-bis**: every Tier 9 7★ drawn from a banner from 2019-01-01 on (notice
  48236) and every Tier 10 one from 2019-09-01 on (notice 56838) arrives with dots and guilt at max (`gacha-data.MAX_GUILT_FROM`).
  User's test 7 done (Nova popup from B0306). Generation commands in [shop.md#sp2b](docs/notes/shop.md#sp2b).
- **Final bench session of 2b done** (17-10 evening, [shop.md#banco-finale-2b](docs/notes/shop.md#banco-finale-2b)):
  JP sounds (I-152 closed: x10, Evolve, Nova), Tier 10 7★ at +320% with both Nova popups (B0619, B0637), Evolve with
  guilt without out-of-place popups. **I-153 closed** (pity strip with long lists: the client's 0x400-byte
  buffer; commit 086ab8e, master BASE 123, [shop.md#i153](docs/notes/shop.md#i153)): over 900 bytes of names, category
  text with `validComment` 1 (16 banners), tested on the bench on 17-10 (B0637 «Draws left» 2 -> 1 -> 3 after the pity,
  B0771 category, B0619 still with the name). **Sub-project 2b is closed.**
- **Audit of the banners against the official notices** (17-10, `D:\Progetto_Restauro_KH_UX\tmp\sp2b\notice_audit\`,
  report.md + findings.tsv + overrides_proposed.tsv): 155 differences across 122 banners (rules G1-G10: 7★/Prime deals
  2018 with SA + SAB max + skill, «If you receive the following Medals ... N dots», «0 dots», Daily/Small Deal,
  limits, Power Gems, lost max Tiers). **Sub-project 2c «Promises of the notices»: brainstorming started on 18-10,
  ON HOLD** because the user wants the skills first (below). Decisions already taken: (a) every promise that the client does not
  show or that we cannot deliver is declared in the Notices (like the Trait slot); (b) G1: SA unlocked + dots and
  guilt at max + skill at max only on the guaranteed 7★ (and copies where the notice says so); notice 43549 = only
  the guaranteed one of the 5th draw, the copies drawn earlier do not; (c) G2: skill at max as promised by the notice
  (after the skills); (d) G3: 3-dot boost on Daily/Small Deal tied to the dates of the deals on the fake
  clock. Still to discuss: G4-G10, single cases, doubts D1-D9.
- **Sub-project «Skill» (I-146) done on 18-10** (commits 6f9e3c3..75d00ab, rev 124): 163 skills (25 real + 138 from the
  wiki), real curve, EXP at the end of a quest, migration of the saves, notice; tested on the bench
  ([medaglie.md#skill-banco](docs/notes/medaglie.md#skill-banco)). **Follow-up of the 18-10 evening** (rev 125, resources 41
  with -Quick): Second Chance and Attack Boost tested in battle (max damage 43,962 -> 152,323 with
  `-SkillProb 0/100`); field units verified in the client and 98 rebuilt rows corrected (2be5bd0); crash of
  the Level Up after the result (I-156: `userSkills` of branch 55 = to be deleted), Overwrite button (I-157), Lux Plus
  icon (I-158), numbered icons (I-159), mute NPCs (I-154, `text/drama`), base buff «Medal STR +N» of Naminé
  (I-155, tested by the user). Bench options `-EnemyAtk N` and `-SkillProb P` ([banco.md](docs/notes/banco.md)).
  GA combo tested by the user (AB VIII Max & Lux++ & GA 1 on Roxas: special at 1 gauge instead of 3; GA N =
  fixed cost N). Suspicious rows resolved (94ca26a, rev 126): Lux Plus x1.5 and icons 6-9 of 4.3.1
  ([medaglie.md](docs/notes/medaglie.md), `ERA_431`); 163 Scrooge 5★ with one skill each in the save
  (userMedalId 2701-2863, backup `tmp\skill\player-before-scrooges.json`), icons confirmed by the user.
  Remaining: JP tutorial of I-159 (none seen so far).
  **2c resumed from G4 (18-10 evening)**: the 2016-18 Tiers never changed, min..max over today's Tier = historical
  lists (`tmp\sp2b\notice_audit\g4_historical_tiers.md`), B0154 list of 17 names, XIII Deal 10 names.
  BUT the 13 original Org XIII ids (31176...) are Tier 8 because of OUR mapping error (medal_gen -> Roboloid rows
  «X [+]»; the 3004xx «X A» are our duplicates; SN++ aliases of 32236/33236 wrong):
  `tmp\sp2b\g4\orgxiii_migration.md`. Global audit of the mapping in progress (`tmp\sp2b\g4\medal_mapping_audit.md`),
  then a correction plan to show the user, then G4 and G5-G10.
  **Org XIII corrected (18-10 night, rev 127, I-160)**: `MEDAL_MAP_FIX`/`EVOLVE_FIX` in the generator, 13 new 6★ [+] with
  images (resources 42), catalogue and migration of the save (96a7515, ba2922d, 4f1c8a7, 247fbed; test d3105e4)
  ([medaglie.md#mapping-orgxiii](docs/notes/medaglie.md#mapping-orgxiii)). Open: I-161 (SN++ adjusted), I-162 (167 6★
  without evolution). Bench 18-10: migration on the real save, 6★ Tier 3, Evolve with 5 Blue Fairy [3], Vexen [+] from
  a gift seen; rev 128 names «X A» on the SE 5★/6★ (e53b3d4); resources 43 «X A» graphics on the 23 SE 6★, which had the
  [+] one (989d5de); images and filters confirmed. Final review of the plan: medalMapVersion 2 (Nova record), tests,
  catalogue and docs (0e77901). Guilt: the excess of dots unlocks the guilt like the client's preview (6f74ac2, Vexen
  [+] 2865 of the bench corrected by hand: guilt 20100). **Bench 19-10 done**: +201% visible, reroll (popup «Bonus
  range», does not go down) and unlock by excess (3 + 1 + 2 > 5 -> 171%) tested
  ([guilt.md#banco-1910](docs/notes/guilt.md#banco-1910), [journal](docs/journal/2026-10-19.md)).
  Original guilt animations (I-163, resources 44, [guilt.md#lwf-originali](docs/notes/guilt.md#lwf-originali)).
  **G4 of 2c done (19-10, rev 130, [shop.md#sp2c-g4](docs/notes/shop.md#sp2c-g4))**: Tier from the notice, B0154 and
  B0046/B0047 as lists, original SE rares only with the «small» roll. **G5 done (rev 131, [shop.md#sp2c-g5](docs/notes/shop.md#sp2c-g5)).** B0079 with the mix from the art (rev 132). Rule: the banner art rules over the wiki.
  **G6 done (rev 133, [shop.md#sp2c-g6](docs/notes/shop.md#sp2c-g6)).** **G7 done (rev 134, [shop.md#sp2c-g7](docs/notes/shop.md#sp2c-g7)).** **G8 done (rev 135, [shop.md#sp2c-g8](docs/notes/shop.md#sp2c-g8)).** **G9 done (shop.md#sp2c-g9).** Scrooge with skills of the 70 Skills to Thrill corrected and tested (rev 136, [shop.md#scrooge-bonus](docs/notes/shop.md#scrooge-bonus)). G9 tested on the bench. **G10 done (rev 137, shop.md#sp2c-g10): groups G1-G10 closed.** **Single cases of 2c and G2 (abilities at max from the notice, rev 139) done (rev 138, [shop.md#sp2c-singoli](docs/notes/shop.md#sp2c-singoli))**: fields `pity`/`max_skill`/`exclude`, pity «every», B0418 deferred to I-142. Doubts D1-D9 closed (rev 140, [shop.md#sp2c-dubbi](docs/notes/shop.md#sp2c-dubbi)); D8 done (rev 141, 72 notices recovered in `reference\banners\notices_recovered_d8.json`). **Sub-project 2c closed.** Countdown of the rotation under the Shop buttons done. **Trait Medal (I-084): part A done on 19-10** (traits from fusion, Replace/Skip choice, JP resources and sounds; spec and plan in docs/superpowers); **part B done on 19-10** (rev 150, resources 45: 313 type 9 Trait Medals in grey, trait + dot on their medal, banners with the promised Trait Medals, same medal = Album line; [medaglie.md#trait-medal-b](docs/notes/medaglie.md#trait-medal-b)); tested on the bench by the user (fusion, filter, banner). **Resources 46** (19-10 evening): originals instead of the reconstructions (I-170, `recon/tools/originals.tsv`), reserve of the generated package 176 MB (I-171: above 4 GiB misc.mp4.2 would be needed). Sub-slots, Missions and Profile seen by the user. **To verify together**: Level Up with 2-5 materials (uncertainty reported by the user), Evolve (materials needed), keyblade upgrade/evolution: **test save** `server/save/prove.json` (19-10, `node server/make-test-save.js`, bench with `relogin.ps1 -Save prove`; `player.json` untouched, you go back with a relogin without `-Save`): keyblades 4/5/8 one step before the design change (Olympia +2, Three Wishes +14, Counterpoint +19), 6/9 at +0; Evolve ready 3088/3091 (Goofy/Donald 1★), 3094 (Wakka 3★), 3101 (Wakka 5★), 3112 (Lexaeus A 6★ -> 7★ with Blue Fairy), materials x2; Level Up 3123/3124 (Wakka 5★), 3125 (Marluxia A 6★) + Fairy Godmother/Dewey/Cheshire Cat; munny 9,999,999. Evolves tested without the client (ok). **User's tests (19-10 evening) and corrections, rev 151 + resources 47** (installed and sizes verified on the evening of 19-10; afterwards, «System UI isn't responding» and empty Notices: tomorrow first restart LDPlayer + phaseb-guest.sh; the Lexaeus A 6★ of the test save is already evolved to 7★): Evolve 1★-5★ (Tier only from 6★, I-172; grey Godmothers = padlock), damage from thethiny/khuxwiki (I-173), medals in the Level Up/Evolve animations (aliases, I-174), keyblade evolution sound (I-175). **Tests of 20-10 done** (Evolve, Level Up, keyblade sounds ok; Lexaeus A 7★ x11.10 after the correction of the discarded burst table, I-173; shared medal in the friend list and in the FRIEND slot in battle, I-177; warning at server start if a master table is discarded). Old plan: `relogin.ps1 -Save prove` (if the installation of 47 has finished) and redo with the user Evolve (Goofy, Donald, Wakka 3★ and 5★), Level Up 1-5 materials (medals visible in the animation), damage of Lexaeus A 7★ (x10.65-11.10), keyblade sound (Olympia, Three Wishes, Counterpoint). Noted: daily login bonus (I-176). `update-resources.ps1` does not touch KHUX START nor the full-download popup (by hand: (200,1020) then Download (1220,715)). Also done: original HP (I-032), Lux levels up to 999 (I-167, master BASE 145), Limited with unique rewards only once (I-168). Noted: Boosters with the events (I-166), missing Avatar Board «Reached LV 350..999!». Graphics of Details/Draw Odds/Notices done; **weekly Shop rotation** (I-165, [shop.md#rotazione](docs/notes/shop.md#rotazione)). Waiting long term: I-164 (resource balance after all the game modes).
- **Shop, sub-project 3 done on 20-10** (seasonals, pinned banner, Limited with tickets, Catalog with years and filters, original icons; [shop.md#sp3](docs/notes/shop.md#sp3), [journal](docs/journal/2026-10-20.md)). Bench: `relogin.ps1 -Save prove525 -RealNow 2026-12-08T10:00:00Z`. Next: story beyond 525 (goal 979) or login bonus (I-176), at the user's choice.
- **20-10 afternoon/evening** ([journal](docs/journal/2026-10-20.md)): **login bonus** done and tested (I-176 closed); pet
  training with the choice of the Special Trait like the original; **Spirit Tricks**, all 22 (I-137 closed: all tested in
  battle, Blast with `target 2`), Spirit points/ranks from the khuxwiki (`server/pet_points.json`),
  effects pet_eff_0004-0006 from the JP (crash of Naminé's special solved); **3 decks per keyblade** (I-179, buttons
  1/2/3 seen; quests 13 and 524 finished with deck 2); noted I-178 (evolution of the Blue Fairies with 5 copies) and the Trait
  Medals in the Moogle Shop inside I-164. **Original special animations** (I-180, evening: hits = text, Terra 13 hits
  seen by the user). Supernova at 1 hit like the original (rev 160). **Original enemy attacks** (I-181 closed: status ailments again, Esuna seen). **Crash in the 86 generated rooms** (I-182 closed: 45-byte BTF placeholder, resources 51). Bench: revision **166**, **resources 51** (4.09 GiB, three pieces), save `provetm`
  (prove525 + Trait Medal), `relogin.ps1 -Save provetm -RealNow 2026-12-08T10:00:00Z`. After a change to the server
  always use `relogin.ps1`: restarting only the server makes the client lose the session («6 ERROR :185»).
- **STATE AS OF 22-10 — RESTART FROM HERE.** Bench: **resources 56** (updated with two `-Quick`), **master rev 175** (Warlock Step 2508 without DR 5061), save `provefine`, `-RealNow 2026-12-08T10:00:00Z` (login bonus of that day already collected: to see it use 12-09). Done today: bench run of the I-194 round ok (DR medium visible but wrong creatures); **crash 699-704 solved** (JP layout `ActMapTimeAttack_TimePanel.json`, 9234af2); README as of 22-10. I-194 searches: web (no textures; KHInsider renders in `tmp\web_hunt`, Roboloid has a more complete dump: email [e-mail removed]), inverse rendering (not recommended, `tmp\inverse_render`), content search (`tmp\deep_scan`: 1,854 original textures from raid/drama, 1028 complete) -> **integration in progress** (agent: content-anchor/bracket rules, enemy_gen, make-enemy-oltre), then rev 176 + resources 57 + update-resources. User's Reddit post: https://www.reddit.com/r/KingdomHearts/comments/1xcbwjg/ ; emails to Roboloid and thethiny. Families 2001-2024 = characters (Hercules, Aladdin, Phillip, Ralph, Lauriam...), many without knockback/dead.
- **STATE AS OF 21-10 EVENING.** Bench: **resources 56** installed, **master rev 174**, test save
  **`provefine`** (provetm with all 979 quests finished): `relogin.ps1 -Save provefine -RealNow 2026-12-08T10:00:00Z`.
  After `update-resources.ps1` tap KHUX START (200,1020) and Download (1220,715) by hand; if «Launcher3/System UI isn't
  responding» appears: «Wait» (640,649) or reboot + `phaseb-guest.sh` + relogin. Work ledger (not in git):
  `.superpowers/sdd/2026-10-21-missioni-526-979/progress.md` (rulings, deferred minors, outcomes per task).
- **Quests 526-979 (I-009): DONE and tested on the bench** (plan `docs/superpowers/plans/2026-10-21-missioni-526-979.md`, Tasks 1-6
  complete and reviewed, Task 7 = bench in progress): master rows (`make-story-oltre.js`: Q555 for Union, Q978 onlyDrama, Ralph
  worlds 11-14, music per quest from khwiki I-198, 81 original objectives + Trophy 61-63 of Bad Guy Breaker), enemies
  (`make-enemy-oltre.js`: 62 exact clones base 5-then-4 digits, 250 family clones from the proposal in
  `reference\world_schema\oltre525\enemy_clone_proposal.json`, D-A), 457 JP stages imported (`import_orig_stages.py --oltre`,
  Lv from the wiki I-195), 28 rooms (`make_jp_rooms.py`), dropdowns 11-14 (glob I-196), placeholder NPCs (`npc_placeholders.py`, I-197).
  Tested: 526/527/555 (Unions)/600/690/880 (Trophy)/911/951-955/979 (music «The Key»). Closed I-183..I-193, I-195..I-198.
- **Variable damage (I-189/I-193): done and tested** (`server/variable-power.js`, 707 rows type>2, Critical with criticalPower).
- **OPEN, priority: enemy/NPC graphics (I-194).** User's rule: originals always first; order = direct originals >
  original copies (`recon/tools/jp_dedup_donors.tsv`, `extra_donors.tsv`, rules >=99% on 2016) > rebuilt
  (`jp_reconstructed.tsv`) > recoloured (`jp_recoloured.tsv`) > Dark Road substitute of the same species (`DR_LOOK` in
  make-enemy-oltre.js). Today 312 rows 526-979: 44 with their own graphics, 31 Dark Road, 147 base; 117 incomplete families (bosses: Jafar
  Cobra/Genie, Dragon Maleficent, Darkness, Ephemer&Skuld (boss of 979, video https://www.youtube.com/watch?v=vgIlsu_W7Ns 12:22),
  King Candy, Cy-Bug...; 52 invisible NPCs). Automatic sources EXHAUSTED (JP 4.3.1 dump, JP 5.0.1 OBB in
  `external\[archive item]`, JP 4.4.1 IPA, WW 5.0.1, 2016, Wayback: nothing). Next steps: (1) 20 effect textures
  `show_effect2`/`eff_1004`: use the UX originals from the 4.4.1 IPA (`tmp\jp441\resolved_441.tsv` rows exact441-over-501) instead
  of the DR images; 18 Shadow aliases; bug `tools/segdl.ps1` ($args); (2) bosses: visual matching of the pieces in the
  `lwf/drama` movies (candidates in `tmp\enemy_src2`); (3) user's contacts: thethiny (who made the JP 4.3.1 zip?),
  Roboloid/Ultimadei (Reddit [handle removed], [handle removed]), ShardofTruth (KH Wiki), community appeal (texts ready in the chat of
  21-10); credits already in the README (0cb3827).
- **Other open items noted by the user**: I-191 (active banners on the home screen), I-192 (Beginner's Guide WebView), checks with the
  Roboloid data (Supernova, buffs) and with the wiki's Special Attack page (16 hits, Rapid Storm, 2 conditions; tmp\sa_wiki), final
  web page «Kingdom Hearts Re-Union X» only as the LAST task (memory).
- **Trait Medal (I-084)**: parts A and B done, **bench 20-10 ok** ([medaglie.md#trait-medal-b](docs/notes/medaglie.md#trait-medal-b)).
  Trait Medal Moogle Shop deferred to the balancing (I-164); what remains is the reachability of the Trait deals (story beyond 2018).
- Open Shop items: I-139 (24 INCOMPLETE), I-140 (Epic filter), I-141 (image of B0612), I-142 (Blue Fairy Deal),
  I-143 (tap lost after the Notices), I-145, I-146 (missing abilities), I-150 (broken catalogue names), I-151
  (lists that go up a star). Afterwards: **sub-project 3** (catalogue with filters, unlocks, rotation, seasonals; closing
  the Details does not reload the list).
- **Bench (18-10 evening)**: FULL save put back (intact copy in
  `D:\Progetto_Restauro_KH_UX\tmp\save-backup-before-nova-test\player.json`; the reduced one of 17-10 in
  `tmp\save-before-skill`), migrated to the skills (`skillVersion` 1), rev 124. Test changes: skills given to SP Roxas
  (762, now Attack Boost VII 20/20 after the Overwrite, LV 49), SP Axel (766, Second Chance 15/15), 2141 (Attack Boost VI),
  2204 (Second Chance); Donald Ver. A (120) consumed in the Level Up. Then: Leon (2459) Lux Plus 15/15 LV 35 (consumed
  Scrooge 452/453, Wakka, Auron); Lady Luck deck = Roxas + 4 Wakka (damage tests). The user will start again from zero
  on the phone once the work is finished: consuming medals for the tests is fine.
- Other pending work (Limited I-118, Blue Fairy and PvP I-126, JP NPCs, intermittent crashes, user decisions
  of 16-10): [fino-al-2026-10-16.md](docs/journal/fino-al-2026-10-16.md) and [ISSUES](docs/ISSUES.md).

## Work rules (from the user)

- **Commit + push at every verified step**, without asking; `git pull --rebase` before the push
  (other agents commit in parallel). Messages in Italian, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `git -c safe.directory=*`,
  `git commit -F <file>`; UTF-8 without BOM.
- **Style from the originals**: before building a screen, look for screenshots/videos/data
  of the original, save them in `D:\Progetto_Restauro_KH_UX\reference\<screen>\` and
  match them; style check at every step.
- **Parallel agents** for independent work off the bench; the bench stays serial
  (one script at a time). The user watches the bench live: every report of theirs is true,
  verify with screenshots.
- **Dialogues and cutscenes: always press SKIP** when it appears.
- At ~40% of the context: no new tasks, let the running ones finish, commit+push,
  update this file, ask the user for `/compact`.
- Only original code and documentation in the repository: never APKs, assets, Square
  Enix master data or decompiled code (`.gitignore`).

## Where to look

| File | Content |
|---|---|
| [docs/ISSUES.md](docs/ISSUES.md) | all problems, open and closed, with status and proof |
| [docs/notes/banco.md](docs/notes/banco.md) | LDPlayer bench, scripts, `-Quick`, taps, crash capture, pitfalls |
| [docs/notes/server.md](docs/notes/server.md) | protocol, startup chain, master, resources, save |
| [docs/notes/risorse_layout.md](docs/notes/risorse_layout.md) | BGAD, BTF, resource rules, `make_layouts.py`, missing layouts |
| [docs/notes/battaglia.md](docs/notes/battaglia.md) | stage API, HP/CP/chests, empty slot, defeat |
| [docs/notes/mappe_storia.md](docs/notes/mappe_storia.md) | STG/MAP format, exits, generator, rooms, enemies |
| [docs/notes/medaglie.md](docs/notes/medaglie.md) | Medal List, selling, Sort/Filter, Level Up, Evolve, graphics |
| [docs/notes/moogle_shop.md](docs/notes/moogle_shop.md) | Moogle Shop and traits |
| [docs/notes/shop.md](docs/notes/shop.md) | Shop > Draw: /gacha/list, /gacha/draw, plates, raisedraw, tests |
| [docs/notes/bacheche.md](docs/notes/bacheche.md) | Avatar Boards |
| [docs/notes/home_profilo.md](docs/notes/home_profilo.md) | home, Other, Profile, Missions, pet, Presents |
| [docs/notes/analisi.md](docs/notes/analisi.md) | Ghidra headless and `recon/tools` tools |
| [docs/notes/ricerca_esterna.md](docs/notes/ricerca_esterna.md) | downloaded files, sources, contacts |
| [docs/notes/protector.md](docs/notes/protector.md) | LIAPP and choice of the bench |
| [docs/journal/](docs/journal/) | journal by day (archive up to 11 October, text removed in f10ea90, states 14-16 October) |

Setting up a new machine (prerequisites, clone, certificates, Windows network): §3-§4 of
[docs/journal/fino-al-2026-10-11.md](docs/journal/fino-al-2026-10-11.md).

## How to update these files

- **New problem**: a row in [docs/ISSUES.md](docs/ISSUES.md) with the next free ID (never
  reuse an ID) and the technical detail in the right file of `docs/notes/` (with an
  `<a id="...">` anchor to link). When it is closed: status CLOSED, row moved to «Chiusi», proof =
  commit.
- **Session journal**: `docs/journal/YYYY-MM-DD.md` of the day (what was tried, outcomes,
  screenshots). The facts that stay true also go into the area notes.
- **HANDOFF.md**: only the state needed to restart (bench, revision, resources, work in progress, next
  step, provisional values in the save). Keep it under ~120 lines.
