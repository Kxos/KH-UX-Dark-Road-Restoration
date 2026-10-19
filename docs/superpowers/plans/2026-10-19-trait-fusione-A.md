# Trait dalla fusione (parte A di I-084): piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** due copie della stessa medaglia fuse insieme danno un trait casuale fra gli 11 originali, con la ruota
originale, la scelta del trait da sostituire a slot pieni (Replace/Skip) e la ripresa al login.

**Architecture:** uno script del master (`make-trait-groups.js`) valorizza `medal.shuffleSkillGroupId` e completa
`shuffleskill`; un modulo puro (`server/medal-trait.js`) decide trait, slot e coda dei pending; `server.js` lo usa
nella fusione (azione 55), nella scelta (azione 57), nel login e nel training del pet (244). Le animazioni e la
finestra di scelta originali arrivano dai dati JP con `import_jp_coco.py`.

**Tech Stack:** Node.js (server e generatori del master, test con `assert`/`check`), Python 3 (import delle risorse
JP), PowerShell (pacchetto risorse e banco LDPlayer).

**Spec:** `docs/superpowers/specs/2026-10-19-trait-design.md` (leggerla prima: regole, contratto del client,
«Scelte fatte in revisione»).

## Global Constraints

- Trait della ruota della fusione = solo questi 11 (nome, `category` per l'icona `img/kakusei/Kakusei_Icon%04d`):
  Extra Attack: 40% Power (80), Ground Enemy DEF -60% (60), Aerial Enemy DEF -60% (61), STR +1000 (90),
  Damage in Raids +40% (70), DEF +2000 (100), Max Gauges +2 (10), Max HP +800 (20), Poison Resist 20% (30),
  Sleep Resist 20% (50), Paralysis Resist 20% (40). Probabilita' uniforme 1/11.
- I 5 trait della 4.1.0 (id 3, 4, 5, 6, 7) e Max HP +300 (id 2) restano solo nel Moogle Shop.
- Un solo trait per fusione; stessa medaglia = stesso `name` della riga `medal`; base con `shuffleskillSlot` > 0.
- Slot: contano solo i trait `type` 1 (lo Special Trait del pet, `type` 2, ha uno slot a parte).
- `medalResumption`: `{userShuffleSkills: [pending[0]], resumptionStatus: 1}` con coda non vuota, altrimenti
  `{userShuffleSkills: [], resumptionStatus: 0}`; con status 1 la lista non e' mai vuota.
- Mai lanciare `make-game-tables.js` da solo (rimpicciolisce il master): i passi del master sono script a valle,
  idempotenti, come `make-nova-rows.js`. Ogni cambio del master: revisione +1 nei 4 script di sessione
  (`tools/ldplayer/session/{cycle,relogin,run-server,update-resources}.ps1`).
- Ogni scostamento dall'originale va nelle Notices (`server/routes-info-album.js`, notizia «Medal skills» o
  «Differences from the original game»).
- Commit e push a ogni task valido; messaggi in italiano con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  git con `-c safe.directory=D:/Progetto_Restauro_KH_UX/Android/KH-UX-Dark-Road-Restoration`.

## Review Focus

- Fusione con PIU' copie identiche: un solo trait (non uno per copia), pallini per copia come oggi.
- Base senza slot (`shuffleskillSlot` 0, supporto/EXP/Boost): nessun trait, nessuna ruota, nessun errore.
- Copie identiche con rarita' diversa (6★ su 7★ della stessa medaglia) e boosted: trait dato.
- Pending in sospeso e nuova fusione prima della scelta (app chiusa): coda, login ripropone il primo.
- Training del pet con un pending della fusione in coda: la 244 non deve azzerarlo.

---

### Task 1: master, gruppi dei trait e righe della ruota

**Files:**
- Create: `server/make-trait-groups.js`
- Create: `server/test-trait-groups.js`
- Modify: `HANDOFF.md` (sequenza di generazione: dopo `make-nova-rows.js`)

**Interfaces:**
- Produces: `medal.json` con `shuffleSkillGroupId` != 0 per ogni riga d'attacco con `shuffleskillSlot` > 0, uguale
  fra righe dello stesso `name` (valore = `medalId` piu' basso della famiglia); `shuffleskill.json` con 4 righe
  nuove `type` 1 (id 14 Max HP +800 cat 20, 15 Poison Resist 20% cat 30, 16 Sleep Resist 20% cat 50,
  17 Paralysis Resist 20% cat 40; campi d'effetto copiati dalle righe del pet 1024, 1029, 1032, 1035);
  `rate` 100 sugli 11 della ruota, `rate` 0 su 2-7 (la ruota del client mostra le righe `type` 1 con `rate` != 0).
  Esporta `FUSION_TRAIT_IDS = [10, 8, 9, 11, 12, 13, 1, 14, 15, 16, 17]`.

- [ ] **Step 1: test** `server/test-trait-groups.js` sul master generato: nessuna riga con slot > 0 e
  `shuffleSkillGroupId` 0; «Supernova - Sephiroth» e la sua boosted/varianti stesso gruppo; «SN - X» e «SN+ - X»
  gruppi diversi; righe 14-17 presenti con `type` 1 e nomi esatti («Max HP +800», «Poison Resist 20%%», «Sleep
  Resist 20%%», «Paralysis Resist 20%%»: il master raddoppia i %); `rate` > 0 esattamente sugli 11 di
  `FUSION_TRAIT_IDS`; seconda esecuzione dello script = file identico (idempotente).
- [ ] **Step 2:** `node server/test-trait-groups.js` -> FAIL (script assente).
- [ ] **Step 3:** scrivere `make-trait-groups.js` (legge e riscrive `server/master_data/medal.json` e
  `shuffleskill.json`, stampa il riassunto come `make-nova-rows.js`).
- [ ] **Step 4:** `node server/make-trait-groups.js && node server/test-trait-groups.js` -> `OK`; poi
  `node server/test-medal-enhance.js` e `node server/test-gacha-server.js` -> OK. Verificare che
  `make-pet-tables.js` e `make-moogleshop.js` non annullino il passo (se riscrivono `shuffleskill.json`,
  `make-trait-groups.js` va dopo di loro: annotarlo in HANDOFF).
- [ ] **Step 5:** revisione del master +1 nei 4 script; commit «trait: gruppi dei trait e righe della ruota (A1)».

### Task 2: modulo `medal-trait.js`

**Files:**
- Create: `server/medal-trait.js`
- Create: `server/test-medal-trait.js`

**Interfaces:**
- Consumes: `FUSION_TRAIT_IDS` (Task 1, ricopiato come costante o letto dallo script).
- Produces:
  - `gainsTrait(baseRow, compRows) -> boolean`: base con `shuffleskillSlot` > 0 e almeno un materiale con
    `shuffleSkillGroupId` uguale e != 0.
  - `rollTrait(rng) -> shuffleSkillId` uniforme su `FUSION_TRAIT_IDS`.
  - `addTrait(list, slots, isSpecial, trait) -> {list, pending}`: `list` = trait della medaglia (`[{userShuffleSkillId,
    shuffleSkillId, type, getDatetime}]`), `isSpecial(id)` vero per i `type` 2; se i trait normali sono < `slots`
    aggiunge in fondo (`pending` null), altrimenti lista invariata e `pending` = il trait.
  - `resolvePending(list, pending, removeId) -> list`: `removeId` = `userShuffleSkillId` da togliere; il pending
    prende la sua posizione; `removeId` == `pending.userShuffleSkillId` (Skip) -> lista invariata.
  - `resumption(queue) -> {userShuffleSkills, resumptionStatus}` secondo i Global Constraints.

- [ ] **Step 1: test** `server/test-medal-trait.js`: `gainsTrait` vero con copia e con rarita' diversa dello stesso
  gruppo, falso con slot 0, con gruppo 0, con medaglia diversa; `rollTrait` su 11.000 tiri: ogni id fra 800 e 1.200,
  nessun id fuori lista; `addTrait` con 2/3 slot -> in fondo, con 3/3 -> pending e lista identica; lo Special Trait
  non occupa slot; `resolvePending` Replace sulla seconda riga -> nuovo in seconda posizione, ordine degli altri
  invariato; Skip -> invariata; `resumption([])` e `resumption([p, q])` -> `[p]` status 1.
- [ ] **Step 2:** `node server/test-medal-trait.js` -> FAIL.
- [ ] **Step 3:** implementare (funzioni pure, nessun accesso a `player`).
- [ ] **Step 4:** test -> `OK: medal-trait`.
- [ ] **Step 5:** commit «trait: modulo medal-trait (A2)».

### Task 3: fusione (azione 55)

**Files:**
- Modify: `server/server.js` (`respondMedalEnhance`, `medalTraits` / salvataggio dei trait)
- Modify: `server/test-medal-enhance.js` (nuovi casi)

**Interfaces:**
- Consumes: Task 2.
- Produces: salvataggio `player.traitPending = [{userShuffleSkillId, shuffleSkillId, type: 1, getDatetime,
  userMedalId}]` (coda); `player.medalTraits[userMedalId]` come oggi; `player.nextShuffleSkillId` come il Moogle Shop.

- [ ] **Step 1: test** in `test-medal-enhance.js`: base con 1 slot libero + una copia -> `afterEnhanceUserMedal.
  userShuffleSkills` ha un elemento in piu' in fondo con `shuffleSkillId` in `FUSION_TRAIT_IDS` e
  `medalResumption` `{[],0}`; con 3 copie -> un solo trait in piu'; base con slot pieni -> lista invariata,
  `medalResumption.resumptionStatus` 1 con un elemento, `player.traitPending` lungo 1; materiale di un'altra
  medaglia -> nessun trait; base `shuffleskillSlot` 0 -> nessun trait; Mickey & Brooms -> nessun trait.
- [ ] **Step 2:** `node server/test-medal-enhance.js` -> FAIL sui casi nuovi.
- [ ] **Step 3:** in `respondMedalEnhance`, dopo `applyEnhance`: `gainsTrait` -> `rollTrait` -> `addTrait`; nuovo
  id da `player.nextShuffleSkillId`; pending in coda; `medalResumption` = `resumption(player.traitPending)`;
  log «[level up] trait ...». I trait dei materiali consumati si cancellano da `player.medalTraits`.
- [ ] **Step 4:** test -> `OK`; tutti i `server/test-*.js` (tranne `test-medal-guilt.js`, che vuole un percorso) OK.
- [ ] **Step 5:** commit «trait: trait dalla fusione di copie identiche (A3)».

### Task 4: scelta (azione 57), login e training del pet

**Files:**
- Modify: `server/server.js` (instradamento `/user/medal/shuffleskill` -> `respondMedalShuffleSkill`, `respondUser`)
- Modify: `server/pet.js` (risposta del training POST)
- Create: `server/test-trait-choice.js`

**Interfaces:**
- Consumes: Task 2, Task 3 (`player.traitPending`).
- Produces: `respondMedalShuffleSkill(res, body)`; risposta `{ret, userMedal: userMedalElement(base), medalResumption}`.

- [ ] **Step 1: test** `server/test-trait-choice.js` (stesso schema di `test-medal-enhance.js`, salvataggio
  temporaneo): Replace `{userMedalId, userShuffleSkillId: <esistente>, enableUserShuffleSkillId: <pending>}` ->
  trait sostituito nella stessa posizione, coda vuota, status 0; Skip `{userShuffleSkillId: <pending>,
  enableUserShuffleSkillId: 0}` -> lista invariata, coda vuota; corpo con id sconosciuti -> nessuna modifica,
  risposta valida con la coda attuale; due pending -> dopo la prima scelta status 1 col secondo; `respondUser` con
  coda non vuota -> `userData.medalResumption.resumptionStatus` 1; training del pet con coda non vuota ->
  `medalResumption` uguale alla coda (non `{[],0}`).
- [ ] **Step 2:** test -> FAIL.
- [ ] **Step 3:** implementare; in `pet.js` usare `ctx.medalResumption()` (nuova funzione del contesto) al posto
  del valore fisso.
- [ ] **Step 4:** test -> `OK`; suite completa OK.
- [ ] **Step 5:** commit «trait: scelta del trait da sostituire, login e training (A4)».

### Task 5: risorse originali dai dati JP

**Files:**
- Modify: `recon/tools/import_jp_coco.py` (lista `JP_LWF` e layout/texture)
- Modify: `recon/tools/make_pet_training_fx.py` (Kakusei_Get1/Get2 nostri solo come ripiego, come I-163)
- Modify: `tools/ldplayer/session/build-resources.ps1` se serve
- Doc: `docs/notes/medaglie.md#trait-medal`

**Interfaces:**
- Produces: nel pacchetto risorse (nuova revisione, 45) `lwf/medal/Kakusei/Kakusei_Get1`, `Kakusei_Get2`
  originali JP, `cocostudio/publish/MedalInfo_SkillChangeWindow.json`, `Kakusei_New.png`, `Kakusei_Get_Eff.png`.

- [ ] **Step 1:** elencare le texture referenziate da `MedalInfo_SkillChangeWindow.json` e dalle due LWF JP e
  verificare che ciascuna esista nel pacchetto o nei dati JP (fonte per nome esatto, come I-163); testi giapponesi
  del layout -> testi WW del client (ricerca in `layouts/ui_texts` e `ui_text_ids.tsv`: «Choose a trait to
  replace.», «Skip», «Replace %s with %s?»).
- [ ] **Step 2:** import e `build-resources.ps1`, poi `update-resources.ps1`; nessun file mancante nel rapporto.
- [ ] **Step 3:** commit «trait: animazioni e finestra di scelta originali (A5)».

### Task 6: Notices, documentazione e banco

**Files:**
- Modify: `server/routes-info-album.js` (notizia «Medal skills» o «Differences»), `server/test-notices.js`
- Modify: `docs/notes/medaglie.md`, `docs/ISSUES.md` (I-084: parte A fatta), `docs/journal/2026-10-19.md`, `HANDOFF.md`

- [ ] **Step 1: test** in `test-notices.js`: la notizia contiene «Fusing two copies of the same Medal gives it a
  random trait», «each of the 11 traits has the same chance» e «only from the Moogle Shop» per i 5 trait nuovi.
- [ ] **Step 2:** testo, test OK, commit.
- [ ] **Step 3: banco** (con l'utente che guarda): due copie identiche -> ruota originale e trait in lista; slot
  pieni -> popup «Choose a trait to replace», Replace e Skip; chiudere il gioco prima di scegliere -> popup al
  login; fusione di tre copie -> un solo trait. Fotogrammi a confronto con
  `reference/trait_medals/video_Z_JRaJF7GbQ/`.
- [ ] **Step 4:** docs aggiornate, commit e push.
