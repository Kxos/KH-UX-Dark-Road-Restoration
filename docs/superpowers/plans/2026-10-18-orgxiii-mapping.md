# Organizzazione XIII: correzione del mapping delle medaglie (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** i 13 id 6★ originali dell'Organizzazione XIII (e le 10 copie potenziate 1xxxxx) tornano Tier 3 come nel gioco; le 13 6★ «X [+]» (Tier 8) esistono come medaglie proprie dalla loro data; spariscono i doppioni «X A» 3004xx; catalogo e salvataggi coerenti.

**Architecture:** l'errore sta in `D:\Progetto_Restauro_KH_UX\medal_gen\medal_map.json` (fuori repo): 23 id SE puntano alle righe Roboloid «X [+]» invece che a «X A». Lo correggiamo con una tabella di correzione nel repo, applicata da `make-game-tables.js` sopra `medal_map.json` (riproducibile senza toccare il file esterno). Dal mapping giusto la pipeline crea da sola le 6★ [+] (300000 + id Roboloid) e non crea piu' i doppioni. Poi catalogo (`make_banner_catalog.py`), migrazione del salvataggio, banco.

**Tech Stack:** Node (server, generatori, test `node server/test-*.js`), Python (`recon/tools/make_banner_catalog.py`, test `python recon/tools/test_make_banner_catalog.py`).

**Spec:** nessuna spec separata: le prove e la tabella completa sono in `D:\Progetto_Restauro_KH_UX\tmp\sp2b\g4\medal_mapping_audit.md`, `medal_mapping_audit.tsv` e `orgxiii_migration.md` (letti dall'implementatore, fuori repo). Decisione dell'utente del 18-10: correggere i punti 1-6 prima di G4 del 2c.

## Global Constraints

- Il repo contiene solo codice e documenti nostri: mai dati Square Enix, APK, master o codice decompilato. Gli id Roboloid e gli id medaglia nelle tabelle di correzione sono ammessi (come in `medal_map.json`/generatori gia' nel repo).
- Mai lanciare `make-game-tables.js` senza le variabili: comando completo `$env:KHUX_MEDALS_ALL='1'; $env:KHUX_WORLDTOUR='1'; node server\make-game-tables.js D:\Progetto_Restauro_KH_UX\wiki\medals.json` (senza, il master scende a 522 medaglie). Prima su una copia del master (`KHUX_MASTER_OUT` o cartella di lavoro in `D:\Progetto_Restauro_KH_UX\tmp\orgxiii\`), diff, poi sul master vero.
- Ogni rigenerazione del master alza la revisione BASE (126 -> 127) nei 4 script di sessione (`run-server.ps1`, `relogin.ps1`, `cycle.ps1`, `update-resources.ps1`).
- Commit in italiano con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, `git -c safe.directory=*`, `-F file` UTF-8 senza BOM, `pull --rebase --autostash`, push a ogni passo verificato. Non committare `bash.exe.stackdump`.
- Commenti nel codice in italiano, densita' e stile dei file circostanti.
- File pesanti temporanei in `D:\Progetto_Restauro_KH_UX\tmp\orgxiii\`.

## Tabella di correzione (valori esatti)

SE 6★ -> Roboloid «X A» 6★ (ora -> giusto), 7★ «X A» per l'evoluzione, 6★ [+] che nasce, data EN della [+]:

| SE id (+ boosted) | membro | ora | giusto | 7★ «X A» | 6★ [+] nuova (evolve in) | data EN [+] |
|---|---|---|---|---|---|---|
| 31176 (131176) | Lexaeus | 1491 | 443 | 300444 | 301491 (301492) | 2018-05-13 |
| 31196 (131196) | Xaldin | 1601 | 483 | 300484 | 301601 (301602) | 2018-09-24 (solo evento) |
| 31206 (131206) | Saïx | 1531 | 486 | 300487 | 301531 (301532) | 2018-07-13 |
| 31226 | Xemnas | 1680 | 638 | 300639 | 301680 (301681) | 2019-01-13 |
| 32186 (132186) | Marluxia | 1634 | 446 | 300447 | 301634 (301635) | 2018-11-13 |
| 32196 (132196) | Larxene | 1658 | 449 | 300450 | 301658 (301659) | 2018-12-13 |
| 32216 (132216) | Xigbar | 1745 | 489 | 300490 | 301745 (301746) | 2019-02-13 |
| 32236 | Axel | 1563 | 641 | 300642 | 301563 (301564) | 2018-08-13 |
| 33176 (133176) | Vexen | 1446 | 452 | 300453 | 301446 (301447) | 2018-04-13 |
| 33186 (133186) | Zexion | 1511 | 455 | 300456 | 301511 (301512) | 2018-06-13 |
| 33206 (133206) | Demyx | 1595 | 492 | 300493 | 301595 (301596) | 2018-09-13 |
| 33216 (133216) | Luxord | 1616 | 495 | 300496 | 301616 (301617) | 2018-10-13 |
| 33236 | Roxas | 1782 | 644 | 300645 | 301782 (301783) | 2019-03-13 |

Doppioni che spariscono (6★ «X A» = 300000 + id giusto): 300443, 300483, 300486, 300638, 300446, 300449, 300489, 300641, 300452, 300455, 300492, 300495, 300644 -> stesso medalId SE della riga.

## Review Focus

1. Un salvataggio con copie dei doppioni 3004xx (banco: 33) deve riaprirsi senza medaglie «vuote» (riga assente nel master = crash o icona grigia): tutte migrate all'id SE, deck/blocchi/skill invariati.
2. Le 6★ [+] nuove devono avere immagine e cutin (imageId = medalId): senza risorsa il client mostra il ripiego o va in errore.
3. Le copie potenziate (2031176..., 2131176...) non devono restare Tier 8: vengono rigenerate dalla base.
4. Nessun banner 2016-2017 deve dare Tier 8 dell'Organizzazione; i deal [+] di aprile-novembre 2018 devono dare la 6★ [+].
5. L'evoluzione 6★ «X A» -> 7★ «X A» deve chiedere 5 Blue Fairy [3] e funzionare (Evolve al banco).

---

### Task 1: mapping corretto nel generatore del master

**Files:**
- Modify: `server/make-game-tables.js` (vicino a `MEDAL_MAP`, riga ~100; blocco `KHUX_MEDALS_ALL` riga ~148-180)
- Create: `server/test-orgxiii-map.js`

**Interfaces:**
- Produces: `MEDAL_MAP_FIX` (oggetto `{ [seId]: robolid }`, i 23 id della tabella) e `EVOLVE_FIX` (`{ [seId 6★]: medalId 7★ «X A» }`, i 13 id non potenziati e i 10 potenziati verso lo stesso 7★), esportati o leggibili dal test; master rigenerato.

- [ ] **Step 1: test che fallisce** `server/test-orgxiii-map.js`, sul master `server/master_data/medal.json` (o `KHUX_MASTER_DIR`):
  - per ogni id SE della tabella e le copie 1xxxxx: `guiltValue === 3`, `evolveId` = 7★ «X A» della tabella, `validEvolve === 1`, `validEvolveNeed === 5` (Blue Fairy, da `blue-fairy.js`);
  - le 13 righe 6★ [+] esistono, `rare === 6`, `guiltValue === 8`, `evolveId` = 7★ [+] della tabella;
  - nessuna delle 13 righe doppione 3004xx 6★ esiste; le 7★ «X A» (300444...) esistono;
  - le copie potenziate `2000000 + id` della tabella (se presenti nel master) hanno `guiltValue === 3`.
- [ ] **Step 2:** `node server/test-orgxiii-map.js` -> FAIL (31176 guiltValue 8).
- [ ] **Step 3:** in `make-game-tables.js` applicare `MEDAL_MAP_FIX` sopra `MEDAL_MAP` subito dopo il caricamento (commento: perche', fonte `tmp\sp2b\g4\medal_mapping_audit.md`), cosi' Tier e set `mapped` del blocco `KHUX_MEDALS_ALL` usano gli id giusti; dopo le righe vere impostare `validEvolve 1, evolveId` da `EVOLVE_FIX` sulle 6★ SE (prima di `blue-fairy.js`, che aggiunge il costo). Verificare dove nascono le copie potenziate 2xxxxxx (make-boosted-medals.js) e che copino il Tier dalla base rigenerata.
- [ ] **Step 4:** rigenerare su copia in `D:\Progetto_Restauro_KH_UX\tmp\orgxiii\` con il comando completo, diff con il master attuale: atteso solo +13 righe [+] 6★, -13 doppioni, 23 righe SE (Tier/evolve), copie potenziate, `burst` delle [+] nuove (3000000 + id). Qualsiasi altra differenza = fermarsi e capire.
- [ ] **Step 5:** rigenerare il master vero, `node server/test-orgxiii-map.js` -> PASS; anche `node server/test-skill-table.js`, `node server/test-base-buff.js`, `node server/test-medal-enhance.js` -> PASS. Revisione 126 -> 127 nei 4 script.
- [ ] **Step 6:** commit «Medaglie: Organizzazione XIII Tier 3 (mapping corretto), 6★ [+] proprie, master rev 127».

### Task 2: immagini delle 6★ [+]

**Files:**
- Modify (se servono): `tools/ldplayer/session/build-resources.ps1` o lo script di `fetch_medal_images.py --all` usato per le 300000+
- Test: controllo nel resource index servito

- [ ] **Step 1:** per i 13 id 301446...301782 controllare che `img/medal/<id>` (icona, cutin, art: come per le altre 300000+) siano nelle risorse servite (`resource_data`, indice dei nomi). Le 7★ [+] (301447...) le hanno: se l'immagine 6★ manca, usare la stessa grafica della 7★ [+] (stessa medaglia, stessa arte su khuxwiki) oppure scaricarla con il flusso esistente.
- [ ] **Step 2:** se servono file nuovi: `build-resources.ps1 -Quick` (risorse 41 -> 42), altrimenti niente. Verifica: le 13 voci compaiono nell'indice.
- [ ] **Step 3:** commit (solo script/codice nostro, mai le immagini nel repo).

### Task 3: catalogo dei banner

**Files:**
- Modify: `recon/tools/make_banner_catalog.py` (`extend_medals` riga ~655, `FAMILIES` riga ~599), eventuale `recon/tools/banner_overrides.tsv`
- Test: `recon/tools/test_make_banner_catalog.py`

- [ ] **Step 1: test che falliscono** in `test_make_banner_catalog.py`:
  - `axel` e `roxas` non sono alias di `sn++ - axel`/`sn++ - roxas`; il subset 6.2 risolve a `axel a`/`roxas a` (ids 32236/33236 con data 2016-09-16);
  - le voci `x [+]` dei 13 membri contengono l'id 6★ [+] con la data EN della tabella, e la 7★ [+] di Vexen/Lexaeus non prima del 2018-05-25 (`firstRarity[7]`);
  - nessun id 3004xx 6★ doppione nel catalogo; il Tier per id dei 23 id SE e' 3 (dal master);
  - SN++ Axel B e Roxas (302074, 302075) datate 2021-01-01.
  - Banner: B0280 e B0303 hanno la 6★ [+] nel pool; nessun id dell'Organizzazione con Tier 8 nei pool dei banner prima della data della sua [+] (`expandPool` di `server/gacha-data.js`).
- [ ] **Step 2:** run -> FAIL.
- [ ] **Step 3:** correggere `extend_medals` (nessun alias verso una famiglia diversa quando esiste la voce «x a»), date e id [+], date SN++; rigenerare `server/game_data/gacha_catalog.json`.
- [ ] **Step 4:** run -> PASS; `node server/test-gacha-data.js` e gli altri test del gacha -> PASS. Ricalcolare i pool dei banner G4 con lo script dell'agente (`tmp\sp2b\g4\analyze.js`) e annotare i nuovi conteggi.
- [ ] **Step 5:** commit «Catalogo: Organizzazione XIII A/[+] e alias SN++ corretti».

### Task 4: migrazione del salvataggio

**Files:**
- Modify: `server/server.js` (accanto a `migrateSkills`, riga ~2528; chiamata vicino alla riga ~3773)
- Create: `server/test-orgxiii-migration.js`

**Interfaces:**
- Consumes: la tabella doppione -> id SE (Task 1).
- Produces: `player.medalMapVersion = 1`.

- [ ] **Step 1: test che fallisce** (processo figlio come `test-bench-enemy.js`, salvataggio finto): un giocatore con medaglie 300443 e 300644 e una 300444 (7★, resta) -> dopo il login 300443 -> 31176, 300644 -> 33236, 300444 invariata; `userMedalId`, livello, skill (`medalSkills`), blocchi, deck e guilt invariati; `medalMapVersion === 1`; un secondo login non cambia nulla; nuovo giocatore: `medalMapVersion` 1 senza migrazione.
- [ ] **Step 2:** run -> FAIL.
- [ ] **Step 3:** `migrateMedalMap()`: sostituisce `medalId` nelle strutture che lo contengono (cercare in `server.js` tutti i campi del salvataggio con medalId: `medals`, album/medaglie viste, premi in sospeso, supporto, ecc.), log di quante copie.
- [ ] **Step 4:** run -> PASS; tutti i test del server -> PASS.
- [ ] **Step 5:** commit «Salvataggi: doppioni Organizzazione XIII sugli id originali (medalMapVersion 1)».

### Task 5: documenti

**Files:** `docs/notes/medaglie.md`, `docs/ISSUES.md`, `HANDOFF.md`

- [ ] **Step 1:** `medaglie.md`: sezione sul mapping (tabella, prove, perche' `MEDAL_MAP_FIX` sta nel repo). `ISSUES.md`: I-160 Organizzazione XIII (CHIUSO); I-161 SN++ «adjusted» 302008-302012 date al 2020-09-07 e solo con Fantasia Mickey B (aperto); I-162 167 6★ originali senza evoluzione verso la 7★ (aperto). HANDOFF: rev 127, stato, poi G4.
- [ ] **Step 2:** commit.

### Task 6: banco (seriale, l'utente guarda)

- [ ] **Step 1:** `relogin.ps1 -Tag ox` (rev 127). Login senza crash, log della migrazione (33 copie).
- [ ] **Step 2:** lista medaglie: una Lexaeus/Xemnas A 6★ migrata mostra Tier 3 (dettaglio medaglia), skill e livello invariati; Evolve mostra 5 Blue Fairy [3] verso la 7★ «X A».
- [ ] **Step 3:** Album: una 6★ [+] (es. Vexen [+]) con immagine.
- [ ] **Step 4:** Shop con `-GachaShow B0280` e orologio al 13-04-2018 se serve: dettagli del banner con la 6★ [+]. Screenshot in `D:\Progetto_Restauro_KH_UX\tmp\orgxiii\`.
- [ ] **Step 5:** HANDOFF aggiornato, commit e push.
