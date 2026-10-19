# KH-UX-Dark-Road-Restoration

**English** | [Italiano](README.it.md)

Preservation project: bringing **Kingdom Hearts Union χ[Cross] · Dark Road** back as a
locally playable experience, after the servers shut down (May 2021) and almost all of
Union χ was removed from the app, which was reduced to a theater mode.

> The working documentation (HANDOFF, ISSUES, technical notes, journal) is written in Italian.
> This page summarizes the project in English; feel free to open an issue in English.

## Status

| Phase | Description | Status |
|---|---|---|
| 1 | Obtaining the client and assessing feasibility | ✅ done |
| 2 | Technical reconnaissance — architecture, protocol, data schema | ✅ done |
| A | Ghidra on `libcocos2dcpp.so`, extraction of hosts and endpoints | ✅ done |
| B | Minimal REST server → the client reaches the home screen | ✅ **unmodified original** APK 4.3.1 on LDPlayer 9 (Android 9): new player, Prologue, home |
| C | Field schema of the 54 master tables | ✅ done — 106 tables, 1,739 fields |
| D | Master data, quests and single-player combat | 🔄 from new player to home; story quests 1–525 (generated maps); Medal List, selling, Level Up (Special Attack dots and Bonus, Skills, traits, Trait Medals), Evolve, Moogle Shop, Shop with the original banners (807 deals with their guarantees, pity and weekly rotation), Profile, Missions and Limited campaigns, Avatar Boards, pet, Lux levels up to 999. In progress: an exact schema of the game worlds (areas and links) before rebuilding the quest maps |
| E | Self-hosted Photon for Union Cross / raids / PvP | ⬜ |

Status as of 19 October 2026. Screens that the 4.3.1 client can no longer find in its
resources (CocoStudio layouts, texts, animations) are **rebuilt**: from nearby originals,
from widget names read in the code, and from reference images of the time.

**[HANDOFF.md](HANDOFF.md)** — how to resume: bench status and next step.
**[docs/ISSUES.md](docs/ISSUES.md)** — open and closed issues; technical notes by area in
[docs/notes/](docs/notes/), full work journal (every solved issue with its cause) in
[docs/journal/](docs/journal/).
**[REPORT.md](REPORT.md)** — reconnaissance results. **[PHASE-A.md](PHASE-A.md)** — static analysis.
**[PHASE-C.md](PHASE-C.md)** — the fields of the `master::` tables, derived without Ghidra.

## What we are looking for

Story-quest maps (`stage/mappoi_stg*.bin`) and many rooms of the worlds (e.g. Market,
Avenue, Dwarf's Cottage, West Wing, Underworld) were downloaded from the CDN into
`files/r/misc.mp4` and were never shipped inside the app packages: only the tutorial stages
(1010–1040) and 86 rooms survive in public archives. If you still have a `files/r/` folder
from a KHUx install (any version 1.x–4.x), please get in touch by opening an issue.

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
docs/                   ISSUES.md (issues), notes/ (technical notes by area), journal/ (journal)
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
| `tools/ldplayer/session/build-resources.ps1 -Version N` + `update-resources.ps1` | new full resource version, downloaded by the client (~5 min) |
| `tools/ldplayer/armtrace/stackcap.ps1 -MenuY y -Taps 'x,y'` | reproduces a crash and captures ARM registers and stack |
| `node server/check-stage-data.js` | offline check of the quest data |

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

## Repository rules

This repository contains **only original code and documentation**.

APKs, IPAs, OBBs, native libraries, assets, audio and Square Enix master data are never
versioned — `.gitignore` excludes them. Anyone who wants to reproduce the work has to obtain
the client on their own.

**Non-commercial** project, for preservation and interoperability with a discontinued
service.
