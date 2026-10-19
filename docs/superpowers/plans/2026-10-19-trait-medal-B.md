# Trait Medal (I-084 parte B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trait Medal come nell'originale: righe del master (6★ grigie legate a una medaglia), fusione sulla medaglia
associata = trait + pallino, uscita nei banner al posto della 6★ di ripiego.

**Architecture:** tutto passa dal master. Il client riconosce il trait da `shuffleSkillGroupId` uguale e il pallino
da `burstEnhanceCategory` della base che contiene il gruppo della Trait Medal ([fn]): il server applica gia'
le stesse regole (`medal-trait.js`, `medal-guilt.js`), quindi la fusione non richiede codice nuovo, solo righe giuste.
Immagini grigie generate nel pacchetto `stage_gen` (come la Stock Medal). Banner: il catalogo ricava il numero #N e il
server estrae la riga della Trait Medal.

**Tech Stack:** Node (server, generatori del master), Python (catalogo dei banner, immagini BTF).

**Spec:** `docs/superpowers/specs/2026-10-19-trait-design.md` (sezione B e «Scelte fatte in revisione»).

## Global Constraints

- Mai `make-game-tables.js` da solo senza i passi successivi; ogni generatore nuovo e' idempotente e chiamato in fondo
  a make-game-tables (dopo make-trait-groups). Dopo ogni cambio del master: revisione +1 nei 4 script di sessione.
- Ogni differenza dall'originale va nelle Notices.
- Statistiche Trait Medal (khuxwiki, notice 38128): 6★, STR 1, DEF 1, costo 999, «Lesser Attack» 1 nemico 1 gauge
  x1,00, 15 Pet Point, stesso numero di Album della medaglia, nome «Trait Medal #N».
- Commit e push a ogni passo.

## Ruling di partenza (dalle fonti, 19-10)

- **«Stessa medaglia» = linea dell'Album**, non solo stesso nome. Prova: il deal «SN+ - KH III Xemnas Trait Medal
  Deal» da' la Trait Medal #130, che la khuxwiki lega a «SN - KH III Xemnas»; «Trait Medals and their corresponding
  Medals share a slot in the Album» (38128); le evoluzioni rinominate (SN -> SN+ -> SN++, X -> Supernova - X)
  condividono il numero di Album. Il client ha un solo `shuffleSkillGroupId` per riga, quindi lo stesso gruppo vale
  anche per le copie della parte A: SN fusa su SN+ da' un trait. Gruppo = componente connessa di (stesso nome) U
  (stesso sortId > 0); nel master tutte le 138 linee multi-nome sono catene di Evolve (verificato). Costa, se
  sbagliato: qualche trait in piu' fondendo evoluzioni diverse.
- Numeri senza medaglia nota (#189-#313 assenti dalla khuxwiki tranne #274): restano col ripiego dichiarato.

## Review Focus

- Trait Medal fusa su una medaglia diversa: solo EXP, niente trait ne' pallino.
- Trait Medal fusa sulla versione boosted o sull'evoluzione (SN+) della sua medaglia: trait + pallino.
- Piu' Trait Medal impilate nella stessa fusione: un solo trait, un pallino per copia.
- Album: la Trait Medal non aggiunge celle e non cambia il conteggio.
- Banner con numero sconosciuto: ripiego invariato e dichiarato.

---

### Task 1: gruppi per linea dell'Album

**Files:** Modify `server/make-trait-groups.js` (`groups`), `server/test-trait-groups.js`.

- [ ] Test: Supernova - Sephiroth e Supernova+ - Sephiroth stesso gruppo; Sora & Peter Pan e Supernova - Sora &
      Peter Pan stesso gruppo; gruppo = medalId piu' basso della componente; linee diverse (KH III Kairi A / B) diverse.
- [ ] `groups(medals)` -> Map medalId -> gruppo (union-find su nome e sortId > 0, righe con slot > 0).
- [ ] Rigenerare il master (patch idempotente), test verdi, revisione +1, commit.

### Task 2: elenco delle Trait Medal

**Files:** Create `server/make-trait-medal-list.js` (genera `server/trait_medals.json` dal wikitesto
`reference/trait_medals/khuxwiki_Trait_Medal_raw.txt`), `server/trait_medals.json`, test in `server/test-trait-medals.js`.

- [ ] `[{n, album, jp, affected}]` con `affected` = medalId della riga type 1 < 1.000.000 col sortId = album e nome
      uguale all'etichetta della wiki normalizzata, altrimenti la piu' bassa della linea. 189 righe, #1 -> 301426.

### Task 3: righe del master

**Files:** Create `server/make-trait-medals.js` (patch idempotente, chiamato da make-game-tables dopo make-trait-groups),
test in `server/test-trait-medals.js`.

- [ ] Riga `medalId = 9000000 + n`, type 9, rare 6, attack/defense 1 (max uguali, addMax 0), cost/minCost 999,
      addPetPt 15, sortId/listSortId = album, groupId 0, shuffleskillSlot 0, shuffleSkillGroupId = gruppo della
      medaglia, validPack 1, validEvolve 0, guiltValue della medaglia (sblocco possibile), burstId = riga burst nuova
      9000000 «Lesser Attack» (target 1 nemico, gauge 1, potenze x1,00, maxEnhanceCount 5), immagini = medalId,
      materialExp/sell/sellPerLv della medaglia 6★.
- [ ] Righe della linea: `burstEnhanceCategory[0]` = medalId della Trait Medal (normali, boosted, varianti).
- [ ] Album (`routes-info-album.albumData`): type 9 non e' una voce e non conta.

### Task 4: immagini grigie

**Files:** Create `recon/tools/make_trait_medal_images.py`, hook in `tools/ldplayer/session/build-resources.ps1`.

- [ ] Da `medal_gen/files/img/medal/Medal_L|S_<affected>.png` e `img/Cutin/Cutin_<affected>.png` (BTF) a
      `Medal_L|S_<9000000+n>` e `Cutin_<...>` in `$sg/files`, scala di grigi con alfa, tono confrontato con
      `reference/trait_medals/Trait_Medal_1/8/20_6star_KHUX.png`.

### Task 5: fusione

**Files:** `server/test-medal-enhance.js` (sezione 12).

- [ ] Trait Medal sulla sua medaglia: trait + 1 pallino; sulla boosted e sull'evoluzione: idem; su un'altra: nessun
      trait ne' pallino; tre impilate: un trait, tre pallini (guilt con pallini pieni). Correggere il server solo se
      un test fallisce.

### Task 6: banner

**Files:** `recon/tools/banner_guarantees.py` (numero #N nello slot trait e nelle pity), `recon/tools/make_banner_catalog.py`,
`server/gacha-data.js`, `server/gacha.js`, test Python e Node.

- [ ] Slot trait con `traitNo`; il server estrae la riga 9000000+N se esiste (altrimenti ripiego) e
      `notReproduced: 'trait'` resta solo per i numeri sconosciuti. Pity «Trait Medal #N entro 5» riproducibili.
      Details: «Trait Medal #N (for <medaglia>)».

### Task 7: Notices, documentazione, banco

- [ ] Notices: «Trait Medals» riscritta (ripristinate; numeri senza medaglia nota col ripiego; linea dell'Album).
      medaglie.md, ISSUES I-084, journal, HANDOFF. Risorse `-Version N+1` e prova al banco (filtro «Trait Medals»,
      fusione, deal).
