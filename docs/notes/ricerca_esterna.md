# Fonti esterne e contatti

Tutto il materiale di Square Enix sta fuori dal repository, su `D:\Progetto_Restauro_KH_UX\`.

<a id="file"></a>
## File scaricati

| File | Dove | Note |
|---|---|---|
| APK 4.3.1 originale | `apk\khux-4.3.1-original.apk` | SHA-256 `3be176ab…985b` ([store]), firma Square Enix v3 |
| `main.76…obb` | `obb76\` | 1.652.397.828 byte, MD5 `[md5]` (Internet Archive `main.76.com.square_enix…`, `[archive item]`) |
| `patch.87…obb` | `obb76\` | 533.504.978 byte, MD5 `[md5]` |
| APK 5.0.1 `base.apk` | `apk501\` | MD5 `[md5]`; `ext\` = estrazione; `extra_files\` = 55 tabelle master |
| `addnl.mp4/png` IPA iOS 4.3.1 | `ipa431\` | 10.145 record; layout KHUX della 4.3.1 |
| `misc.mp4` IPA 4.4.0 | `ipa440\` | 2.403 testi `text/ui`, 21 layout |
| asset dell'APK 4.3.1 | `assets431\` | `json/server_api.json`, `info/` |
| khuxwiki | `wiki\` | `wiki_dump.py` (6.544 pagine per template o ~27.000 con `--all`), `medals.json`, `quests.json` |
| thethiny | `external\thethiny` | righe binarie `*_raw.json` e decodifiche `*_dec.json` |
| Roboloid | `external\roboloid\medal_db.json` | 2.100 medaglie con evoluzioni |
| Spriters Resource | `reference\spriters\` | 112 fogli (Edge con [browser automation] per [web protection], poi `[http client]`) |

- Il client 4.3.1 cerca OBB `main.60`/`patch.69` (MD5 `[md5]`,
  `[md5]`): non trovati; si usano i 5.0.1 come risorse KHUX
  ([risorse_layout.md](risorse_layout.md#pacchetti)). [store] non ha OBB. Evitare la 4.4.0 (build di
  transizione). `tools/segdl.ps1` scarica a segmenti e verifica l'MD5.

<a id="fonti"></a>
## Fonti di dati

- **thethiny/KHUxTools** e **thethiny/KHUx-Server** (GitHub): `data/*_raw.json` con righe binarie
  delle master di una versione precedente (stage 1.140, enemy 665, medal 522, reward 1.457, player
  301). `raw_master.py` (reward, player con lo schema 4.3.1) e `raw_master_old.py` (stage, enemy, medal:
  stringhe `char[N+1]`, nemici con 5 livelli, campi incerti `unk_<offset>`). L'autore dichiara di avere
  `misc.mp4` v1.0.1/v1.2.3 e file `r/` del CDN (2016-17).
- **Roboloid/khux** (GitHub, ~2,5 GB di PNG: medaglie, parti avatar e pet, frame di nemici, sfondi,
  `images/assets/board/sphere_incentive-<id>.png`, `images/map`), `src/search.js` = `medalDatabase`.
- **luxenvulpies/KHUX_Medal_Website** (1.881 medaglie); dump della wiki su Internet Archive
  (`[archive item]`, immagini 9,8 GB).
- IPA WW 1.0.1-4.4.0 e JP 1.0.2-4.4.1 (`[archive item]`, `[archive item]`), OBB JP 5.0.1
  (`[archive item]`): probabilmente senza `mappoi`.
- `xlash123/khux-re-api` (protocollo 4.3.1, id dei nemici evento = 5 + album + rango);
  **wikiwiki.jp/khux** (missioni 1-750).
- Nessun dump pubblico di `mappoi`, delle master complete, delle tabelle `sphere*`, `mission`,
  `moogleshop`, `shuffleskill`; Wayback senza contenuto del CDN (host noti `api`, `api-s`, `help`,
  `cache.sp.kingdomhearts.com`; `cache.sqex-bridge.jp` ha solo gli avvisi).
- Guida dell'utente (PDF) in `reference\guida_basi`: missioni giornaliere/settimanali, login bonus,
  sblocco dei keyblade, tier, trait.

<a id="contatti"></a>
## Contatti da fare (compito dell'utente, ISSUES I-029)

- thethiny (file `r/` del CDN, master complete), Roboloid.
  **13-10: thethiny ha risposto** (messaggio dell'utente con il README inglese): disponibile a
  mandare ~4 GB di dati KHUx 1.0.1, 1.1.3, 4.4.0 e JP finale (manca solo la grafica del gacha dal CDN e
  alcuni file `m` 1.1.3-1.3.0, coperti dalla 5.0.1) su una cartella Google Drive condivisa creata da
  noi; offre anche il suo diario di lavoro con Claude. Ha aggiornato i repo il 13-10 (KHUx-Recomp:
  ricompilazione della 1.0.1). Studio dei repo: `reference\world_schema\thethiny_repos.md`.
- Appello su r/KHUx per chi ha ancora `files/r/` di una 4.x.
- **Arena7664** («Cross Road», client 5.0.1 nel browser via Rellume/WASM; sa reimpacchettare
  `extra_mp4`; github.com/Arena7664, IA `[archive item]`).
- Discord **«Traverse Town»** ([invite removed]): comunita' di conservazione attiva.
- Restoration Union e altre comunita' di preservazione.
