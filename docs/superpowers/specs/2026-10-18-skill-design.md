# Skill delle medaglie (I-146) — design

Stato: bozza del 18-10-2026, da approvare. Viene **prima** del sotto-progetto 2c «Promesse dei notice» (decisione
dell'utente del 18-10: le skill al massimo promesse dai banner, G1/G2 dell'audit, si danno solo dopo questo
lavoro). Fonti: ricerca del 18-10 (sotto), [medaglie.md#skill](../../notes/medaglie.md#skill) (Overwrite I-088),
[shop.md#garanzie](../../notes/shop.md#garanzie).

## 1. Obiettivo

Le skill delle medaglie (abilita' passive: Attack Boost, Defense Boost, Second Chance, Lux+, ...) funzionano
**come nell'originale**, in tutte e tre le parti chieste dall'utente:

1. **Dettagli della medaglia**: ogni medaglia mostra la skill che ha davvero, con livello ed EXP.
2. **Crescita**: la skill sale di livello usando la medaglia in battaglia e con il Level Up (Overwrite Skill).
3. **Effetto in battaglia**: la skill si attiva con la sua probabilita' e fa il suo effetto (danno x1.2, colpo
   sopravvissuto, veleno, ...).

Serve anche al 2c: i banner che promettono «a powerful skill at max skill level» devono poter dare la skill vera.

## 2. Vincoli

- Client originale non modificato: si cambiano master, risposte del server, risorse scaricabili.
- Repo: solo codice e documentazione nostri; le tabelle derivate restano in `server/master_data/` come le altre.
- Le righe di `skill.json` devono avere **esattamente** i 35 campi della 4.3.1
  (`recon/out/master_types_ww431.json`), altrimenti `masterTables()` non serve la tabella.
- Ogni dato ricostruito (non originale) va **dichiarato nelle Notices** in inglese (regola dell'utente).
- Dopo la modifica dei master: revisione alzata nei 4 script di sessione + `relogin.ps1`.

## 3. Decisioni dell'utente (18-10)

1. Le skill si fanno **tutte e tre le parti**, come nell'originale.
2. Le **138 skill mancanti si ricostruiscono dal wiki** (non ci si limita alle 25 vere).
3. Le **medaglie gia' nel salvataggio restano senza skill**.
4. Ogni differenza o ricostruzione si dichiara nelle Notices.

## 4. Cosa c'e' oggi (ricerca del 18-10)

- `server/master_data/skill.json`: 12 righe (1100-1111), dal file `skill` dell'APK 5.0.1 (`import-master.js`).
- Progetto server di thethiny (`D:\Progetto_Restauro_KH_UX\external\thethiny_2026-10-13\KHUx-Server\data\`):
  `skill.json` con **25 righe vere** (1100-1126; le 13 nuove: ATK Boost II & Lux Plus, Attack Boost III, Second
  Chance, ATK Prize+ & ATK Boost II, Attack Boost II Max, Defense Boost III, Poison+, Paralysis+, Sleep+, ATK Boost
  III & Lux Plus, SP Attack Gauge I/II, Attack Boost III Max), layout vecchio senza `value1`, `burstLock`,
  `pvpConditionTurn`, `pvpConditionCount`; `skillExp.json` **vero** con 4 righe
  (`{1:[30,12132,13500], 2:[30,15184,14000], 3:[30,13000,11500], 4:[30,25000,18000]}`). Il nostro `skillExp` (3
  righe) e' inventato.
- Wiki locale `D:\Progetto_Restauro_KH_UX\wiki\wiki_all.json`, pagina «Medal», sezione `===List of Skills===`:
  **163 skill** con nome EN, nome JP/kana, LV massimo, probabilita' massima di attivazione (%) e descrizione.
  Niente ID ne' campi numerici. Pagine collegate: «Skill EXP», «Skill Quests», «Template:SkillIcon».
- Icone delle skill: `D:\Progetto_Restauro_KH_UX\tmp\thethiny_x\bundle2016\files\img\skill`.
- Nessun'altra tabella in dump, IPA 4.3.1/4.4.0, OBB, asset 4.3.1, dati JP (cercato il 18-10).
- Il client scarica `skill` e `skillExp` dal server (`/system/master` -> `/master/<nome>`): aggiungere righe al
  master basta perche' il client le conosca.
- Salvataggio: `player.medalSkills[userMedalId] = {userSkillId, skillId, level, exp, getDatetime}`;
  `userMedal.userSkills` ha solo gli id (al massimo 2); la lista completa `userSkills` va sempre mandata (un id
  senza oggetto fa crashare il client).
- Fonti di skill gia' nei master: `stage.clearGetAssignSkill*`, `reward.assignSkill*`, `drawMedalType.addSkill*`,
  `colosseum.stageRewardSkill*`, `loginBonus`, `mission`, `moogleshop`, `serialcodeReward`, `raidReward`,
  `evScoreReward`, `multiStage` (campi `*SkillType/Id/Lv`). Gacha: `gacha-data.SKILL_TABLES` (notice 50106 e 72415,
  skill al livello 1), `maxSkill` dei banner (oggi solo sulle 12 skill presenti).
- `server/medal-skill.js`: medaglie Scrooge con skill **indovinata** per rarita'; Overwrite del Level Up (20% ->
  100% da medalMisc 121/122, stessa `categoryEvolve`), da provare al banco (I-088).
- Battaglia: gli effetti li calcola il **client** dal master (`AvatarActor::invokeSkillFromDeck`,
  `invokeDamageSkill`). L'EXP delle skill dopo la battaglia **non e' fatta**: `/stage/clear` non porta dati di skill,
  quindi la deve dare il server; il client ha `BattleResultDialog::popUpSkillLevelUp`.

## 5. Cosa si fa

### 5.1 Tabella `skill` completa (163 righe)

- Le 25 righe vere restano con i loro numeri; alle 13 di thethiny si aggiungono i 4 campi mancanti con i valori
  delle sorelle 4.3.1 (es. `value1` 10000, `burstLock` 0, `pvp*` come `condition*`).
- Le **138 ricostruite** dal wiki:
  - `name`, `description`, `maxLv` dal wiki;
  - potenza dalla descrizione (es. «Deals 2.6 times more damage» -> `attackUp` 26000; «Reduces damage by 70%» ->
    `damageCut` 3000; Lux/Prize/Money -> `luxUp`, `prizeHpUp`, ...);
  - `invokeProb`/`invokeProbPerLv` dalla probabilita' massima del wiki e dal `maxLv`, con lo stesso passo delle
    sorelle vere (le «Max» come Attack Boost II Max: alta probabilita' fissa);
  - gli altri campi (`invokeType`, `invokeShowTiming`, `expType`, `categoryEvolve`, `rank`, `thumbId`, ...) copiati
    dalla **sorella vera piu' vicina** (stessa famiglia: Attack Boost, Attack Boost All, Defense Boost, Second
    Chance, stato alterato, SP Gauge, combo «& Lux», «& GA», ...);
  - `skillId` assegnati da noi dopo il 1126, a blocchi per famiglia, in ordine di `sortId`.
- Le famiglie senza una sorella vera (se ce ne sono, es. Triple Threat, Nightmare Stun) si ricostruiscono dalla
  descrizione con il tipo di attivazione piu' simile; l'elenco va nel report di generazione.
- Generatore ripetibile (`server/make-skill-table.js` o simile) che legge wiki + righe vere e scrive
  `master_data/skill.json`, con test.

### 5.2 Curva di EXP vera

`skillExp` = le 4 righe vere di thethiny (`expType` 1-4). Le righe ricostruite usano l'`expType` della sorella.

### 5.3 Icone

`thumbId` puntano alle icone originali di `img/skill`; se un'icona manca nelle nostre risorse, si aggiunge al
pacchetto generato (risorse nuove: versione completa a banco fermo).

### 5.4 Skill nei dettagli della medaglia e fonti

- La medaglia mostra la skill dal salvataggio (`player.medalSkills`), sempre con la lista `userSkills` completa.
- Le fonti dell'originale danno la skill come scritto nei master (`*SkillType/Id/Lv`): ricompense di fine
  missione, missioni, login bonus, Moogle Shop, codici, banner con skill (`SKILL_TABLES`, `maxSkill`), Scrooge.
- Scrooge: la skill indovinata si rivede con la tabella completa (fonte: wiki «Scrooge» e pagine delle medaglie)
  **solo per le Scrooge nuove**. Le Scrooge gia' possedute tengono la skill di oggi: alla migrazione il risultato
  attuale di `medal-skill.js` si scrive in `player.medalSkills` (scelta di Claude, nello spirito della decisione 3).
- Le medaglie gia' salvate restano senza skill (decisione 3).
- Skill gia' salvate (Overwrite, `SKILL_TABLES`) calcolate sulla curva inventata: alla migrazione si **tiene il
  livello mostrato** e l'`exp` si riporta alla soglia di quel livello sulla curva vera, limitata al massimo (scelta
  di Claude).

### 5.5 Crescita in battaglia

- A fine missione (`/stage/clear`) il server da' EXP di skill alle medaglie del deck che hanno una skill e rimanda
  le skill aggiornate (`userSkills`) nella risposta, perche' il client mostri «Skill Level Up».
- Quantita' di EXP: **dati originali**. Ogni nemico del master ha `exp` per livello (array parallelo a `baseLv`,
  come `lux`): Shadow/Soldier 1-5, Great/King Pretender 4-20 (i nemici della missione delle skill «danno tanta EXP»,
  fonti online: ogni nemico da' una quantita' nascosta di EXP di skill, i Pretender molto di piu'). L'EXP della
  missione = somma degli `exp` dei nemici sconfitti al loro livello nello stage (la richiesta di `/stage/clear` porta
  `getEnemyDropItems`/`enemyDeadNumber`; chi costruisce verifica come ricavare i nemici sconfitti).
- A chi va: a **ogni medaglia del deck con una skill** (il client non manda quali medaglie sono state usate, quindi
  il server originale non poteva saperlo). Questa e' una deduzione: si dichiara nelle Notices.
- Controllo: con la curva vera, due giri della missione delle skill devono portare una skill con massimo 10 circa da
  LV 1 a LV 8 (pagina wiki «Skill EXP»); se non torna, si rilegge la formula di `skillExp`
  (`[30,12132,13500]` sembra base 30 e crescita x1.2132, da confermare nel client).

### 5.6 Level Up / Overwrite Skill

L'Overwrite di I-088 si completa sulla tabella intera (stessa `categoryEvolve`, probabilita' dal livello, Scrooge
100%, livello che passa con la skill) e si prova al banco.

### 5.7 Effetti in battaglia

Li calcola il client. Si prova al banco almeno una skill per tipo di attivazione (danno, danno a tutti, difesa,
Second Chance, stato alterato, SP Gauge, Lux/Prize), con una medaglia che ha la skill al massimo.

### 5.8 Notices

Una notice in inglese che spiega: tabella delle skill in parte ricostruita dal wiki (quali valori sono stimati),
EXP di skill data a tutte le medaglie del deck con skill. Importante se cambia l'esperienza di gioco.

## 6. Fuori da questo lavoro

- Le promesse dei banner (skill al massimo nelle garanzie, G1/G2): sotto-progetto 2c, che usera' questa tabella.
- Le Skill Quests / eventi «Get NEW SKILL!»: missioni speciali, non questo lavoro (le loro ricompense useranno la
  tabella quando ci saranno).
- Trait (shuffleskill): sono un'altra cosa (Moogle Shop, sotto-progetto Trait Medal I-084).

## 7. Cosa decide chi costruisce

- Come leggere la tabella del wiki e quali regole di somiglianza usare per le sorelle (documentate nel report).
- I blocchi di `skillId` e i `sortId`.
- Come ricavare dalla richiesta di `/stage/clear` e dallo stage i nemici sconfitti e il loro livello.
- Quali medaglie usare per le prove al banco.

## 8. Fatto quando

- `skill.json` con 163 righe valide servito al client, `skillExp` vero; nessun crash nelle schermate delle medaglie.
- Al banco: dettagli di una medaglia con skill, «Skill Level Up» dopo una missione, Overwrite al Level Up, almeno un
  effetto per tipo visto in battaglia.
- Notice pubblicata; I-146 chiuso; note d'area aggiornate.
