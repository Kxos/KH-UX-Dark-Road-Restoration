# External sources and contacts

No Square Enix material is in the repository, and this project does not provide, host or link it. The
files the scripts expect are dumped by each user from their own device or installation
([SETUP.md](../SETUP.md#files-you-must-dump-yourself)); on the author's PC they live under
`D:\Progetto_Restauro_KH_UX\`.

<a id="file"></a>
## Local inputs

| File | Where | Notes |
|---|---|---|
| Original APK 4.3.1 | `apk\khux-4.3.1-original.apk` | Square Enix v3 signature |
| `main.76…obb`, `patch.87…obb` | `obb76\` | 5.0.1 WW |
| APK 5.0.1 `base.apk` | `apk501\` | `ext\` = extraction; `extra_files\` = 55 master tables |
| `addnl.mp4/png` iOS IPA 4.3.1 | `ipa431\` | 10,145 records; KHUX layouts of 4.3.1 |
| `misc.mp4` IPA 4.4.0 | `ipa440\` | 2,403 `text/ui` texts, 21 layouts |
| assets of the APK 4.3.1 | `assets431\` | `json/server_api.json`, `info/` |
| khuxwiki | `wiki\` | `wiki_dump.py` (6,544 pages by template or ~27,000 with `--all`), `medals.json`, `quests.json` |
| thethiny | `external\thethiny` | binary rows `*_raw.json` and decodings `*_dec.json` |
| Roboloid | `external\roboloid\medal_db.json` | 2,100 medals with evolutions |
| reference sheets | `reference\spriters\` | 112 community sprite sheets, local only, for visual comparison |

- The 4.3.1 client looks for OBBs `main.60`/`patch.69`: not available; the 5.0.1 ones are used as KHUX
  resources ([risorse_layout.md](risorse_layout.md#pacchetti)). Avoid 4.4.0 (transition build).

<a id="fonti"></a>
## Data sources

Credits and licences are in [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).

- **thethiny/KHUxTools** and **thethiny/KHUx-Server** (GitHub): `data/*_raw.json` with binary rows
  of the masters of an earlier version (stage 1,140, enemy 665, medal 522, reward 1,457, player
  301). `raw_master.py` (reward, player with the 4.3.1 schema) and `raw_master_old.py` (stage, enemy, medal:
  `char[N+1]` strings, enemies with 5 levels, uncertain fields `unk_<offset>`).
- **Roboloid/khux** (GitHub: medals, avatar and pet parts, enemy frames, backgrounds), `src/search.js` =
  `medalDatabase`.
- **luxenvulpies/KHUX_Medal_Website** (1,881 medals).
- `xlash123/khux-re-api` (4.3.1 protocol, event enemy ids = 5 + album + rank);
  **wikiwiki.jp/khux** (quests 1-750).
- No public source is known for `mappoi`, the complete masters, the `sphere*`, `mission`,
  `moogleshop`, `shuffleskill` tables.
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
  `extra_mp4`; github.com/Arena7664).
- Restoration Union and other preservation communities.
- **22-10** (I-194, enemy graphics of quests 526-979): user's post on Reddit
  https://www.reddit.com/r/KingdomHearts/comments/1xcbwjg/ ; emails to Roboloid (more complete dump of the JP
  data) and to thethiny. Appeal also in the README («What we are looking for»).
