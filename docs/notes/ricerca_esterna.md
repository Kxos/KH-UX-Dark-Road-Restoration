# External sources and contacts

All the Square Enix material lives outside the repository, on `D:\Progetto_Restauro_KH_UX\`.

<a id="file"></a>
## Downloaded files

| File | Where | Notes |
|---|---|---|
| Original APK 4.3.1 | `apk\khux-4.3.1-original.apk` | SHA-256 `3be176ab…985b` ([store]), Square Enix v3 signature |
| `main.76…obb` | `obb76\` | 1,652,397,828 bytes, MD5 `[md5]` (Internet Archive `main.76.com.square_enix…`, `[archive item]`) |
| `patch.87…obb` | `obb76\` | 533,504,978 bytes, MD5 `[md5]` |
| APK 5.0.1 `base.apk` | `apk501\` | MD5 `[md5]`; `ext\` = extraction; `extra_files\` = 55 master tables |
| `addnl.mp4/png` iOS IPA 4.3.1 | `ipa431\` | 10,145 records; KHUX layouts of 4.3.1 |
| `misc.mp4` IPA 4.4.0 | `ipa440\` | 2,403 `text/ui` texts, 21 layouts |
| assets of the APK 4.3.1 | `assets431\` | `json/server_api.json`, `info/` |
| khuxwiki | `wiki\` | `wiki_dump.py` (6,544 pages by template or ~27,000 with `--all`), `medals.json`, `quests.json` |
| thethiny | `external\thethiny` | binary rows `*_raw.json` and decodings `*_dec.json` |
| Roboloid | `external\roboloid\medal_db.json` | 2,100 medals with evolutions |
| Spriters Resource | `reference\spriters\` | 112 sheets (Edge with [browser automation] for [web protection], then `[http client]`) |

- The 4.3.1 client looks for OBBs `main.60`/`patch.69` (MD5 `[md5]`,
  `[md5]`): not found; the 5.0.1 ones are used as KHUX resources
  ([risorse_layout.md](risorse_layout.md#pacchetti)). [store] has no OBBs. Avoid 4.4.0 (transition
  build). `tools/segdl.ps1` downloads in segments and verifies the MD5.

<a id="fonti"></a>
## Data sources

- **thethiny/KHUxTools** and **thethiny/KHUx-Server** (GitHub): `data/*_raw.json` with binary rows
  of the masters of an earlier version (stage 1,140, enemy 665, medal 522, reward 1,457, player
  301). `raw_master.py` (reward, player with the 4.3.1 schema) and `raw_master_old.py` (stage, enemy, medal:
  `char[N+1]` strings, enemies with 5 levels, uncertain fields `unk_<offset>`). The author states he has
  `misc.mp4` v1.0.1/v1.2.3 and `r/` files from the CDN (2016-17).
- **Roboloid/khux** (GitHub, ~2.5 GB of PNGs: medals, avatar and pet parts, enemy frames, backgrounds,
  `images/assets/board/sphere_incentive-<id>.png`, `images/map`), `src/search.js` = `medalDatabase`.
- **luxenvulpies/KHUX_Medal_Website** (1,881 medals); wiki dump on the Internet Archive
  (`[archive item]`, images 9.8 GB).
- WW IPAs 1.0.1-4.4.0 and JP 1.0.2-4.4.1 (`[archive item]`, `[archive item]`), JP OBB 5.0.1
  (`[archive item]`): probably without `mappoi`.
- `xlash123/khux-re-api` (4.3.1 protocol, event enemy ids = 5 + album + rank);
  **wikiwiki.jp/khux** (quests 1-750).
- No public dump of `mappoi`, of the complete masters, of the `sphere*`, `mission`,
  `moogleshop`, `shuffleskill` tables; Wayback has no CDN content (known hosts `api`, `api-s`, `help`,
  `cache.sp.kingdomhearts.com`; `cache.sqex-bridge.jp` has only the notices).
- User's guide (PDF) in `reference\guida_basi`: daily/weekly quests, login bonus,
  keyblade unlocks, tiers, traits.

<a id="contatti"></a>
## Contacts to make (user's task, ISSUES I-029)

- thethiny (CDN `r/` files, complete masters), Roboloid.
  **13-10: thethiny replied** (user's message with the English README): willing to
  send ~4 GB of KHUx 1.0.1, 1.1.3, 4.4.0 and final JP data (only the gacha graphics from the CDN and
  some `m` files 1.1.3-1.3.0 are missing, covered by 5.0.1) to a shared Google Drive folder created by
  us; he also offers his work journal with Claude. He updated the repos on 13-10 (KHUx-Recomp:
  recompilation of 1.0.1). Study of the repos: `reference\world_schema\thethiny_repos.md`.
- Appeal on r/KHUx for anyone who still has `files/r/` of a 4.x.
- **Arena7664** («Cross Road», 5.0.1 client in the browser via Rellume/WASM; knows how to repack
  `extra_mp4`; github.com/Arena7664, IA `[archive item]`).
- Discord **«Traverse Town»** ([invite removed]): active preservation community.
- Restoration Union and other preservation communities.
