# KH-UX-Dark-Road-Restoration

**English** | [Italiano](README.it.md)

**How to play:** [docs/SETUP.md](docs/SETUP.md) · **Project site:** [Kingdom Hearts Re-Union X](https://kxos.github.io/KH-UX-Dark-Road-Restoration/) · **Help wanted:** [Reddit post](https://www.reddit.com/r/KingdomHearts/comments/1xcbwjg/) / [What we are looking for](#what-we-are-looking-for) · **Bugs:** [open a bug report](https://github.com/Kxos/KH-UX-Dark-Road-Restoration/issues/new?template=bug_report.yml)

> Setting the game up today is long and complex (it will become a single launcher when the work is finished),
> and the game is a work in progress: expect bugs and crashes, and please report them.

Preservation project: bringing **Kingdom Hearts Union χ[Cross] · Dark Road** back as a
locally playable experience, after the servers shut down (May 2021) and almost all of
Union χ was removed from the app, which was reduced to a theater mode.

> All the working documentation (HANDOFF, ISSUES, technical notes, journal) is in English since 22 October 2026;
> this README is also available [in Italian](README.it.md). Feel free to open an issue.

## Status

| Phase | Description | Status |
|---|---|---|
| 1 | Obtaining the client and assessing feasibility | ✅ done |
| 2 | Technical reconnaissance — architecture, protocol, data schema | ✅ done |
| A | Ghidra on `libcocos2dcpp.so`, extraction of hosts and endpoints | ✅ done |
| B | Minimal REST server → the client reaches the home screen | ✅ **unmodified original** APK 4.3.1 on LDPlayer 9 (Android 9): new player, Prologue, home |
| C | Field schema of the 54 master tables | ✅ done — 106 tables, 1,739 fields |
| D | Master data, quests and single-player combat | 🔄 from new player to home; story quests **1–979** with the original maps and rooms (from the JP 4.3.1 data), cutscenes, per-quest music, original enemy stats and levels, objectives, chests and Trophies; Special Attacks with variable damage and enemy attacks; Medal List, selling, Level Up (Special Attack dots and Bonus, Skills, traits, Trait Medals), Evolve, Moogle Shop, Shop with the original banners (807 deals with their guarantees, pity, weekly rotation, seasonal banners, a kept banner and a filterable catalog), Profile, Missions and Limited campaigns, Avatar Boards, pet, Lux levels up to 999, in-game Notices explaining every deviation from the original. In progress: original graphics for about 90 enemy families of quests 526–979 (today shown with the look of a similar enemy) |
| E | Self-hosted Photon for Union Cross / raids / PvP | ⬜ |

Status as of 22 October 2026. Screens that the 4.3.1 client can no longer find in its
resources (CocoStudio layouts, texts, animations) are **rebuilt**: from nearby originals,
from widget names read in the code, and from reference images of the time.

**[HANDOFF.md](HANDOFF.md)** — how to resume: bench status and next step.
**[In-game Notices](https://kxos.github.io/KH-UX-Dark-Road-Restoration/notices/)** (web page in the game's style; also as [docs/NOTICES.md](docs/NOTICES.md)) — how the restored game works and where it differs from the original.
**[docs/ISSUES.md](docs/ISSUES.md)** — open and closed issues; technical notes by area in
[docs/notes/](docs/notes/), full work journal (every solved issue with its cause) in
[docs/journal/](docs/journal/).
**[REPORT.md](REPORT.md)** — reconnaissance results. **[PHASE-A.md](PHASE-A.md)** — static analysis.
**[PHASE-C.md](PHASE-C.md)** — the fields of the `master::` tables, derived without Ghidra.

## What we are looking for

Most of the game content was downloaded from the CDN into `files/r/misc.mp4` and was never shipped
inside the app packages. The story maps and rooms now come from the JP 4.3.1 data shared by thethiny,
but the textures of about **90 enemy families** of quests 526–979 (Gearbits, Flappy Bugs, Cy-Bugs,
King Candy, Jafar, Dragon Maleficent, Darkness, Ephemer & Skuld...) are missing from every public
archive (appeal of 22 October on [Reddit](https://www.reddit.com/r/KingdomHearts/comments/1xcbwjg/)). We are also looking for anything about **events, raids, Coliseum, Union Cross and PvP**
(screenshots, videos, rules, rewards, network captures). If you still have a `files/r/` folder or a
device backup from a KHUx install (Global or JP, any version), or any of the above, please get in
touch by opening an issue.

## Technical summary

- The game is **Cocos2d-x with logic in native C++** (not Unity/IL2CPP).
- **The binary is 95% stripped**: 4,882 named functions out of 97,879, almost all of them
  libraries. The API layer is found via xrefs on protocol strings, not by name.
- The client is protected by `lib__57d5__.so`, packed and not removable.
- Two network stacks: **REST** (AES-256-CBC + gzip, key negotiated with the server) and
  **Photon/eNet UDP** for realtime.
- The `master::` namespace exposes the data schema: **107 tables** in the online WW 4.3.1
  build, **54 removed** in the move to the offline 5.0.1. Those 54 are the exact measure of
  the work — and their **759 fields** were recovered from the binary, with column names and
  order.
- The **combat engine is still intact** in the offline client: it needs to be fed with data,
  not rewritten.

## Layout

```
REPORT.md, PHASE-*.md   Reconnaissance and analysis
HANDOFF.md              How to resume the work (status and next step)
docs/                   ISSUES.md (issues), notes/ (technical notes by area), journal/ (journal),
                        NOTICES.md and notices/ (in-game Notices, web page on GitHub Pages)
server/                 Node.js server: REST API, DNS, generated master and game tables
                        (server/README.md)
tools/ldplayer/         LDPlayer bench: startup, sessions (session/), ARM crash capture
                        under houdini (armtrace/, with README)
recon/tools/            Analysis and resource-building tools (Python)
recon/ghidra/           Scripts for headless Ghidra (decompilation, disassembly)
recon/out/              Distilled outputs: master:: classes, response schemas
recon/dl/ ext/ web/     Proprietary material — NOT versioned
```

### Bench workflow

| Command | Purpose |
|---|---|
| `tools/ldplayer/session/relogin.ps1` | restarts server and app with the saved player, up to the home screen |
| `tools/ldplayer/session/build-resources.ps1 -Quick` | rebuilds layouts and texts and writes them into the guest (~40 s, no download) |
| `tools/ldplayer/session/build-resources.ps1 -Version N` + `update-resources.ps1` | new full resource version, downloaded by the client (~5 min); then tap KHUX START (200,1020) and Download (1220,715) by hand |
| `tools/ldplayer/armtrace/stackcap.ps1 -MenuY y -Taps 'x,y'` | reproduces a crash and captures ARM registers and stack (`-NoStart`: waits for a crash triggered by another script) |
| `node server/check-stage-data.js` | offline check of the quest data |
| `node server/export-notices.js [--check]` | exports the in-game Notices to `docs/NOTICES.md` and `docs/notices/index.html` |

### Tools

| Script | Function |
|---|---|
| `vtables.py` | Vtables and virtual methods of a C++ class, via RTTI and relocations |
| `codeindex.py` | Function boundaries from `.eh_frame`; constants addressed by ADRP/ADD |
| `master_fields.py` | The phase C pipeline: from `master::` classes to their fields |
| `remote_zip_ls.py` | Index of a remote ZIP via HTTP range — inspects multi-GB archives without downloading them |
| `strings.py` | String extractor for binaries |
| `demangle.py` | Recovers and classifies Itanium C++ symbols |
| `scope_methods.py` | Lists class members matching a pattern |
| `elfinfo.py` | Architecture and endianness of an ELF |
| `make_layouts.py` | Replacement CocoStudio layouts: copies of originals, scenes, built layouts, widget clones, armatures, texts |
| `resource_pack.py`, `resource_merge.py` | BGAD package of the generated resources and merged index (with space reserve for the quick cycle) |
| `import_ui_texts.py`, `ui_text_ids.py` | Original `text/ui` texts from the 4.4.0 IPA; ids of the texts used by the binary |
| `widget_lookup.py`, `layout_tree.py`, `scene_tree.py` | Widget names looked up by the code; layout and scene structure |
| `action_case.py`, `batch_schema.py` | Branch of an action in the response dispatcher and parser schemas |
| `who_refs.py` | Who uses an address (BL, ADRP/ADD, relocations) |
| `import_orig_stages.py`, `make_jp_rooms.py` | Original story stages and rooms from the JP 4.3.1 and 2016 data (quests 1-979) |
| `import_jp_coco.py` | Original JP CocoStudio layouts in place of the generated ones (list `jp_coco_layouts.txt`) |
| `make_jp_enemies.py`, `deep_donors.py` | Original enemy graphics; missing textures found by content in other files of the same creature |

## Credits

This restoration stands on the work of people who preserved and documented the game long before us:

- **thethiny** — [KHUxTools](https://github.com/thethiny/KHUxTools) (resource and master-data tools),
  [KHUx-Server](https://github.com/thethiny/KHUx-Server) (server and API remake, original master data),
  [KHUx-Recomp](https://github.com/thethiny/KHUx-Recomp) (static recompilation and decompile of the 1.0.1 client),
  [Modding-Database](https://github.com/thethiny/Modding-Database). Most of what this project does builds on the
  formats he documented.
- **Roboloid** and **Ultimadei** — the [Roboloid KHUχ database](https://roboloid.github.io/khux/) (medal data,
  multipliers, special attack conditions, asset gallery).
- **KHUX Wiki** ([khuxwiki.com](https://www.khuxwiki.com/)) and **KH Wiki** ([khwiki.com](https://www.khwiki.com/)) —
  quests, medals, special attacks, events and images used as references.

## Repository rules

This repository contains **only original code and documentation**.

APKs, IPAs, OBBs, native libraries, assets, audio and Square Enix master data are never
versioned — `.gitignore` excludes them. Anyone who wants to reproduce the work has to obtain
the client on their own.

**Non-commercial** project, for preservation and interoperability with a discontinued
service.
