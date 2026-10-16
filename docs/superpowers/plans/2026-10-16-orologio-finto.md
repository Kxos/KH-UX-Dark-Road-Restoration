# Orologio finto (mesi gemelli) — piano di implementazione

> **Per chi esegue:** SUB-SKILL OBBLIGATORIA: superpowers:subagent-driven-development (consigliata) o
> superpowers:executing-plans, un task alla volta. I passi usano le caselle (`- [ ]`).

**Obiettivo:** l'ora del server scorre come quella reale dentro date sicure (mesi gemelli 5/2016-5/2021),
cosi' Daily, Weekly e Limited mostrano i tempi veri e si azzerano davvero anche dopo un riavvio.

**Architettura:** un modulo puro `server/clock.js` (gemelli, indici di periodo, scadenze, revisione).
Il server calcola periodi e scadenze sull'ora reale e converte in ora finta solo cio' che manda al
client (scostamento del gemello fissato al login). Il master servito riceve al volo le scadenze di
Weekly/Limited e una revisione calcolata; i premi non riscossi a fine periodo vanno nei Presents.

**Tecnologie:** Node 24 (nessuna dipendenza nuova), prove `node server/test-*.js`, banco LDPlayer
con gli script di `tools/ldplayer/session/`.

**Spec:** `docs/superpowers/specs/2026-10-16-orologio-finto-design.md` (approvato il 16-10).

## Vincoli globali

- Data finta sempre fra 1/5/2016 e 28/6/2021 23:59:59 UTC; mai oltre il 28/6/2021.
- Confini: giorno da 08:00 UTC reali, settimana da lunedi' 08:00 UTC reali, mese dal giorno 1 08:00 UTC reale.
- Lo scostamento del gemello dipende solo dal mese reale di «adesso - 8 ore»; si fissa a `/khux/login`.
- Revisione del master = `BASE * 100000 + settimane + mesi passati dal 1/1/2026` (BASE = `KHUX_REVISION`, oggi 117).
- La revisione calcolata solo nei campi del master; quelli delle risorse (`versionRes`, `versionResLow`, `darkVersionRes`) restano fissi.
- Il server salva solo istanti reali (ms); l'ora finta solo nelle risposte.
- Premi completati e non riscossi a fine periodo (Daily, Weekly, Limited) -> Presents, una sola volta.
- Login: senza master nuovo non piu' lento di oggi (+1 s, media di 5); lavoro del server per `/system/master` < 50 ms con la cache.
- Regole del progetto: commit + push a ogni passo verificato (`git -c safe.directory=*`, `git commit -F <file>`,
  `git pull --rebase` prima del push, messaggi in italiano con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`);
  file in UTF-8 senza BOM; mai tocchi al banco con il gioco chiuso (`AppAlive`); premere SKIP sui dialoghi.

## Punti da sorvegliare in revisione

1. Riavvio del server a gioco aperto: deve riprendere lo stesso scostamento (`player.clockOffset`) e non consegnare due volte nei Presents (Task 2, Task 3).
2. Login fra le 00:00 e le 08:00 del giorno 1: scostamento e revisione del mese precedente, insieme (Task 1, Task 5).
3. Febbraio reale senza gemello (es. 2028, bisestile da martedi'): conti alla rovescia esatti, nessun azzeramento spostato (Task 1).
4. Salvataggio vecchio (stringhe finte del 2021): la migrazione non deve perdere regali validi ne' mettere date «nel futuro» (Task 6).
5. Cambio di settimana a gioco aperto: la riscossione della campagna vecchia non paga, il premio arriva nei Presents (Task 3).

---

### Task 1: modulo `server/clock.js`

**File:**
- Crea: `server/clock.js`
- Crea: `server/test-clock.js`

**Interfacce prodotte** (tutte in ms UTC reali, nessuno stato):
- `twinOffset(realMs) -> number` (ms da sommare all'ora reale)
- `fake(realMs, offset) -> number`, `fakeString(realMs, offset) -> 'AAAA-MM-GG hh:mm:ss'`
- `dayIndex(realMs)`, `weekIndex(realMs)`, `monthIndex(realMs) -> intero`
- `dayEnd(realMs)`, `weekEnd(realMs)`, `monthEnd(realMs) -> ms reali della prossima scadenza`
- `weekStartOf(weekIndex)`, `monthEndOf(monthIndex) -> ms reali`
- `masterRevision(base, realMs) -> intero`
- costanti `SAFE_FROM`, `SAFE_TO`, `DAY`

- [ ] **Passo 1: scrivere la prova** `server/test-clock.js`

```js
// Prova di server/clock.js (orologio finto, mesi gemelli): node server/test-clock.js
'use strict';
const c = require('./clock');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const U = (y, m, d, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h, mi);
const len = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// gemelli: tutti i mesi 2026-2035, a meta' mese alle 15:00
for (let y = 2026; y <= 2035; y++) {
  for (let m = 1; m <= 12; m++) {
    const r = U(y, m, 15, 15);
    const f = new Date(c.fake(r, c.twinOffset(r)));
    check(f.getTime() >= c.SAFE_FROM && f.getTime() <= c.SAFE_TO, `${y}-${m}: fuori intervallo ${f.toISOString()}`);
    check(f.getUTCHours() === 15, `${y}-${m}: ora ${f.getUTCHours()}`);
    const exact = !(m === 2 && (len(y, 2) === 29 || [0, 2, 6].includes(new Date(Date.UTC(y, 1, 1)).getUTCDay())));
    if (exact) {
      check(f.getUTCDate() === 15, `${y}-${m}: giorno ${f.getUTCDate()}`);
      check(f.getUTCDay() === new Date(r).getUTCDay(), `${y}-${m}: giorno della settimana`);
    }
  }
}
// esempio della spec: venerdi' 16/10/2026 15:00 -> 16/10/2020 15:00
const ex = U(2026, 10, 16, 15);
check(c.fakeString(ex, c.twinOffset(ex)) === '2020-10-16 15:00:00', `esempio: ${c.fakeString(ex, c.twinOffset(ex))}`);
// confine del mese alle 08:00: fra 00:00 e 08:00 del giorno 1 vale ancora il mese prima
check(c.twinOffset(U(2026, 11, 1, 7, 59)) === c.twinOffset(U(2026, 10, 20)), 'giorno 1 07:59: scostamento del mese prima');
check(c.twinOffset(U(2026, 11, 1, 8, 0)) === c.twinOffset(U(2026, 11, 20)), 'giorno 1 08:00: scostamento nuovo');
check(c.monthIndex(U(2026, 11, 1, 7, 59)) === c.monthIndex(U(2026, 10, 31)), 'monthIndex al confine');
// scadenze
check(c.dayEnd(U(2026, 10, 16, 15)) === U(2026, 10, 17, 8), 'dayEnd');
check(c.dayEnd(U(2026, 10, 16, 7)) === U(2026, 10, 16, 8), 'dayEnd prima delle 8');
check(c.weekEnd(U(2026, 10, 16, 15)) === U(2026, 10, 19, 8), 'weekEnd (lunedi 19/10 08:00)');
check(c.weekEnd(U(2026, 10, 19, 8)) === U(2026, 10, 26, 8), 'weekEnd esattamente al confine');
check(c.monthEnd(U(2026, 10, 16, 15)) === U(2026, 11, 1, 8), 'monthEnd');
check(c.monthEnd(U(2026, 11, 1, 7)) === U(2026, 11, 1, 8), 'monthEnd prima delle 8 del giorno 1');
check(c.weekStartOf(c.weekIndex(U(2026, 10, 16))) === U(2026, 10, 12, 8), 'weekStartOf');
check(c.monthEndOf(c.monthIndex(U(2026, 10, 16))) === U(2026, 11, 1, 8), 'monthEndOf');
// conti alla rovescia esatti anche nel febbraio di ripiego (2028: bisestile, inizia di martedi')
for (const r of [U(2028, 2, 10, 12), U(2028, 2, 29, 12)]) {
  const o = c.twinOffset(r);
  check(c.fake(c.weekEnd(r), o) - c.fake(r, o) === c.weekEnd(r) - r, `febbraio 2028: conto settimanale ${new Date(r).toISOString()}`);
  check(c.fake(c.monthEnd(r), o) - c.fake(r, o) === c.monthEnd(r) - r, `febbraio 2028: conto mensile`);
}
// monotona dentro un mese
const o10 = c.twinOffset(U(2026, 10, 2));
check(c.fake(U(2026, 10, 31, 23), o10) > c.fake(U(2026, 10, 2), o10), 'monotona');
// limite di sicurezza
check(c.fake(U(2026, 10, 1), Date.UTC(2021, 5, 30) - U(2026, 10, 1)) === c.SAFE_TO, 'tetto al 28/6/2021');
// revisione: cambia solo alle scadenze, e insieme allo scostamento al confine mensile
const rv = (r) => c.masterRevision(117, r);
check(rv(U(2026, 10, 13, 9)) === rv(U(2026, 10, 19, 7, 59)), 'revisione stabile nella settimana');
check(rv(U(2026, 10, 19, 8)) === rv(U(2026, 10, 19, 7, 59)) + 1, 'revisione +1 al lunedi');
check(rv(U(2026, 11, 1, 8)) > rv(U(2026, 11, 1, 7, 59)), 'revisione al confine mensile');
check(rv(U(2026, 1, 1)) >= 117 * 100000 && rv(U(2035, 12, 31)) < 118 * 100000, 'revisione nel blocco della BASE');
check(rv(U(2035, 12, 31)) < 2 ** 31, 'revisione < 2^31');

if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: clock.js');
```

- [ ] **Passo 2: eseguirla e vederla fallire**

Run: `node server/test-clock.js`
Atteso: errore `Cannot find module './clock'`.

- [ ] **Passo 3: scrivere `server/clock.js`**

```js
// Orologio finto del server (docs/superpowers/specs/2026-10-16-orologio-finto-design.md).
// Funzioni pure sull'ora reale (ms UTC). La data finta e' la data reale nel suo «mese gemello»
// fra 5/2016 e 5/2021 (stesso giorno della settimana del giorno 1, stessa lunghezza; ripiego per
// i febbraio senza gemello: il febbraio di 28 giorni piu' recente). Lo scostamento si sceglie dal
// mese di «adesso - 8 ore», cioe' con lo stesso confine della scadenza mensile (giorno 1 08:00 UTC).
'use strict';
const DAY = 86400000;
const H8 = 8 * 3600000;
const SAFE_FROM = Date.UTC(2016, 4, 1);
const SAFE_TO = Date.UTC(2021, 5, 28, 23, 59, 59);
const DAY0 = Date.UTC(2018, 0, 1, 8); // lunedi' 1/1/2018 08:00 UTC: origine di giorni e settimane
const REV0 = Date.UTC(2026, 0, 1, 8);

const info = (y, m) => ({ y, m, first: Date.UTC(y, m, 1), len: new Date(Date.UTC(y, m + 1, 0)).getUTCDate(),
  wd: new Date(Date.UTC(y, m, 1)).getUTCDay() });
const CANDIDATES = [];
for (let y = 2016; y <= 2021; y++) {
  for (let m = 0; m < 12; m++) if (!(y === 2016 && m < 4) && !(y === 2021 && m > 4)) CANDIDATES.push(info(y, m));
}
const twinCache = new Map();
function twinOf(y, m) {
  const key = y * 12 + m;
  if (!twinCache.has(key)) {
    const r = info(y, m);
    let c = CANDIDATES.filter((x) => x.len === r.len && x.wd === r.wd);
    if (!c.length) c = CANDIDATES.filter((x) => x.len === 28);
    twinCache.set(key, c[c.length - 1]);
  }
  return twinCache.get(key);
}
function monthKey(realMs) {
  const d = new Date(realMs - H8);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
}
function twinOffset(realMs) {
  const { y, m } = monthKey(realMs);
  return twinOf(y, m).first - Date.UTC(y, m, 1);
}
const fake = (realMs, offset) => Math.min(Math.max(realMs + offset, SAFE_FROM), SAFE_TO);
const fakeString = (realMs, offset) => new Date(fake(realMs, offset)).toISOString().slice(0, 19).replace('T', ' ');
const dayIndex = (r) => Math.floor((r - DAY0) / DAY);
const weekIndex = (r) => Math.floor((r - DAY0) / (7 * DAY));
const monthIndex = (r) => { const { y, m } = monthKey(r); return y * 12 + m; };
const dayEnd = (r) => DAY0 + (dayIndex(r) + 1) * DAY;
const weekEnd = (r) => DAY0 + (weekIndex(r) + 1) * 7 * DAY;
const weekStartOf = (w) => DAY0 + w * 7 * DAY;
const monthEndOf = (mi) => Date.UTC(Math.floor(mi / 12), (mi % 12) + 1, 1) + H8;
const monthEnd = (r) => monthEndOf(monthIndex(r));
// revisione del master: BASE (la nostra, alzata a ogni cambio dei master) per un passo grande, piu'
// le scadenze settimanali e mensili passate dal 1/1/2026
function masterRevision(base, realMs) {
  return base * 100000 + (weekIndex(realMs) - weekIndex(REV0)) + (monthIndex(realMs) - monthIndex(REV0));
}

module.exports = { DAY, SAFE_FROM, SAFE_TO, twinOffset, fake, fakeString, dayIndex, weekIndex, monthIndex,
  dayEnd, weekEnd, monthEnd, weekStartOf, monthEndOf, masterRevision };
```

- [ ] **Passo 4: eseguire la prova**

Run: `node server/test-clock.js`
Atteso: `OK: clock.js`. Se un mese 2026-2035 non ha gemello esatto e non e' un febbraio, la prova lo nomina: va corretta la tabella (non la prova).

- [ ] **Passo 5: commit**

```bash
git -c safe.directory=* add server/clock.js server/test-clock.js
# messaggio in un file UTF-8: "Orologio finto: modulo clock.js (mesi gemelli) e prova" + Co-Authored-By
git -c safe.directory=* commit -F ../../tmp/msg_clock1.txt
git -c safe.directory=* pull --rebase && git -c safe.directory=* push
```

---

### Task 2: ora del server dal nuovo orologio, scostamento fissato al login

**File:**
- Modifica: `server/server.js` (righe ~240-256 `SERVER_TIME_START`/`serverTime`/`serverTimeAt`; `respondKhuxLogin` ~647; ogni `Date.now()` che misura il tempo di gioco: `apState` ~908, `player.apTime = Date.now()` ~1349 e ~1418)
- Crea: `server/test-clock-server.js`

**Interfacce:**
- Consuma: `clock.twinOffset`, `clock.fakeString`, `clock.fake`.
- Produce (in `server.js`, esportate in `module.exports._test`): `realNow() -> ms`, `clockOffset() -> ms`,
  `outTime(v, fallback) -> stringa` (numero = istante reale -> data finta; stringa = lasciata com'e'; assente = `fallback`).

- [ ] **Passo 1: prova** `server/test-clock-server.js`

```js
// Ora del server dall'orologio finto (server.js + clock.js): node server/test-clock-server.js
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path');
const SAVE = path.join(os.tmpdir(), `khux-test-clocksrv-${process.pid}.json`);
try { fs.unlinkSync(SAVE); } catch { /* nuovo */ }
process.env.KHUX_SAVE = SAVE;
delete process.env.KHUX_SERVER_TIME;
const realNow = Date.now;
const at = (iso) => { const ms = Date.parse(iso); Date.now = () => ms; };
at('2026-10-16T15:00:00Z');
const log = console.log; const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const errors = []; const check = (ok, msg) => { if (!ok) errors.push(msg); };
const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };

call(t.respondUserCreate, { name: 'Prova', unionId: 1 });
call(t.respondKhuxLogin);
check(t.serverTime() === '2020-10-16 15:00:00', `serverTime ${t.serverTime()}`);
// la sessione attraversa il mese: lo scostamento resta quello del login
at('2026-11-02T10:00:00Z');
check(t.serverTime() === '2020-11-02 10:00:00', `dopo il cambio mese senza login: ${t.serverTime()}`);
// riavvio a gioco aperto: lo scostamento salvato si riprende
check(JSON.parse(fs.readFileSync(SAVE, 'utf8')).clockOffset === t.clockOffset(), 'clockOffset salvato');
// nuovo login a novembre: gemello di novembre 2026 (inizia di domenica, 30 giorni -> novembre 2020)
call(t.respondKhuxLogin);
check(t.serverTime().startsWith('2020-11-02'), `login di novembre: ${t.serverTime()}`);
check(t.outTime(Date.parse('2026-11-02T10:00:00Z')) === '2020-11-02 10:00:00', 'outTime numero');
check(t.outTime('2021-05-15 12:00:00') === '2021-05-15 12:00:00', 'outTime stringa vecchia');
check(t.outTime(undefined, 'x') === 'x', 'outTime assente');

Date.now = realNow;
try { fs.unlinkSync(SAVE); } catch { /* tolto */ }
if (errors.length) { log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
log('OK: ora del server');
```

- [ ] **Passo 2: eseguirla**: `node server/test-clock-server.js` -> fallisce (`t.respondKhuxLogin` o `t.serverTime` non esportate, oppure serverTime `2021-05-15 ...`).

- [ ] **Passo 3: implementare in `server/server.js`**

Sostituire il blocco `SERVER_TIME_START` ... `serverTimeAt` con:

```js
// Ora del server (docs/superpowers/specs/2026-10-16-orologio-finto-design.md): data reale nel suo
// mese gemello (clock.js), con lo scostamento fissato a /khux/login (player.clockOffset) perche' il
// client fa scorrere da solo l'ora ricevuta al login. KHUX_SERVER_TIME (prove): data finta fissa
// all'avvio del server, come prima.
const clock = require('./clock');
const STARTED_AT = Date.now();
const REVISION = Number(process.env.KHUX_REVISION || 0); // BASE della revisione del master
const realNow = () => Date.now();
function clockOffset() {
  if (process.env.KHUX_SERVER_TIME) return Date.parse(process.env.KHUX_SERVER_TIME) - STARTED_AT;
  return Number.isFinite(player.clockOffset) ? player.clockOffset : clock.twinOffset(realNow());
}
function serverTime() {
  return serverTimeAt(realNow());
}
// L'ora del server corrispondente a un istante reale (ms). Formato letto da [fn].
function serverTimeAt(realMs) {
  return clock.fakeString(realMs, clockOffset());
}
// istante reale salvato (numero) -> data finta; stringhe dei salvataggi vecchi lasciate com'erano
const outTime = (v, fallback) => (typeof v === 'number' ? serverTimeAt(v) : v || fallback);
```

(`player` e' dichiarato piu' sotto con `const`: `clockOffset()` lo legge solo quando viene chiamata, dopo il caricamento.)

In `respondKhuxLogin`, prima di `send`:

```js
  // nuovo login: il client riprende l'ora da qui, il gemello del mese corrente vale fino al prossimo
  player.clockOffset = clock.twinOffset(realNow());
  savePlayer();
```

Sostituire in `server.js` i `Date.now()` che misurano il tempo di gioco con `realNow()`
(`grep -n "Date.now()" server/server.js`: tenere `Date.now()` solo in `STARTED_AT` e nei tempi di log).
Aggiungere a `module.exports._test`: `serverTime, serverTimeAt, realNow, clockOffset, outTime, respondKhuxLogin`.

- [ ] **Passo 4: prove**: `node server/test-clock-server.js` -> `OK: ora del server`; poi
`node server/test-limited.js`, `node server/test-keyblade-unlock.js`, `node server/test-keyblades.js`,
`node server/test-medal-enhance.js`, `node server/test-medal-guilt.js` -> tutte OK.

- [ ] **Passo 5: commit** («Orologio finto: ora del server dai mesi gemelli, scostamento al login»).

---

### Task 3: periodi delle missioni in ora reale e chiusura dei periodi nei Presents

**File:**
- Modifica: `server/server.js` (blocco missioni ~1650-1800: `missionPeriod`, `missionActive`, `missionState`,
  `weeklyLux`, `missionCount`, `missionsData`, `respondMissionReceive`, `limitedPeriod`, `limitedActive`,
  `beginnerLimitTime`; handler ~2860)
- Modifica: `server/test-limited.js` (usa `realNow` invece di `Date.now` se serve)
- Crea: `server/test-mission-settle.js`

**Interfacce:**
- Consuma: `clock.dayIndex/weekIndex/monthIndex`, `realNow()`, `addPresent(type, id, num, comment)` (esistente).
- Produce: `settleClock(realMs = realNow())` (esportata in `_test`), `missionPeriod(row, realMs)` con indici reali.

- [ ] **Passo 1: prova** `server/test-mission-settle.js`

```js
// Chiusura dei periodi delle missioni (server.js settleClock): node server/test-mission-settle.js
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path');
const SAVE = path.join(os.tmpdir(), `khux-test-settle-${process.pid}.json`);
try { fs.unlinkSync(SAVE); } catch { /* nuovo */ }
process.env.KHUX_SAVE = SAVE; process.env.KHUX_PET = '1';
delete process.env.KHUX_SERVER_TIME;
const realNowFn = Date.now; const at = (iso) => { const ms = Date.parse(iso); Date.now = () => ms; };
at('2026-10-16T15:00:00Z');
const log = console.log; const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const errors = []; const check = (ok, msg) => { if (!ok) errors.push(msg); };
const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };
call(t.respondUserCreate, { name: 'Prova', unionId: 1 });
t.player.medals = t.player.medals || [];
quiet(() => t.settleClock());

const daily = t.masterRows('mission').find((r) => r.missionType === 2 && t.MISSION_COUNTER[r.conditionId] === 'quest');
const list1 = quiet(() => t.missionsData());
check(list1.some((m) => m.id === daily.id), 'Daily attiva');
quiet(() => t.missionCount('quest', daily.targetNum[0]));
check(quiet(() => t.missionsData()).find((m) => m.id === daily.id).status === 1, 'Daily completata');
const presentsBefore = (t.player.presents || []).length;
// il giorno dopo alle 09:00: periodo chiuso, premio nei Presents una volta
at('2026-10-17T09:00:00Z');
quiet(() => t.settleClock());
quiet(() => t.settleClock());
const added = (t.player.presents || []).slice(presentsBefore);
check(added.length >= 1 && added.some((p) => p.comment === 'Daily Mission reward'), `Presents: ${JSON.stringify(added)}`);
check(quiet(() => t.missionsData()).find((m) => m.id === daily.id).status === 0, 'Daily ripartita');
// riscossione della campagna vecchia: niente premio
const stone = t.player.freeStone || 0;
call(t.respondMissionReceive, { receiveMissionIds: [daily.id] });
check((t.player.freeStone || 0) === stone, 'riscossione dopo la scadenza pagata');
// riavvio: nessuna seconda consegna
const n = (t.player.presents || []).length;
quiet(() => t.settleClock());
check((t.player.presents || []).length === n, 'consegna doppia');
// confine delle 08:00: alle 07:59 del 18 il giorno e' ancora il 17
at('2026-10-18T07:59:00Z');
quiet(() => t.missionCount('quest', 1));
at('2026-10-18T08:00:00Z');
check(quiet(() => t.missionsData()).find((m) => m.id === daily.id).numUpper === 0, 'azzeramento alle 08:00');

Date.now = realNowFn;
try { fs.unlinkSync(SAVE); } catch { /* tolto */ }
if (errors.length) { log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
log('OK: chiusura dei periodi');
```

- [ ] **Passo 2: eseguirla**: `node server/test-mission-settle.js` -> fallisce (`settleClock` non esiste).

- [ ] **Passo 3: implementare**

In `missionPeriod`, `missionActive`, `missionState`, `missionCount`, `missionsData`, `respondMissionReceive`,
`weeklyLux`: il parametro diventa l'ora reale (`const nowMs = realNow();` al posto di
`Date.parse(serverTime().replace(' ', 'T') + 'Z')`). Nuovo `missionPeriod`:

```js
// indici di periodo sull'ORA REALE (clock.js): giorno e settimana da 08:00 UTC, mese dal giorno 1 08:00
function missionPeriod(row, realMs) {
  if (row.missionType === 4 && LIMITED_GROUP.has(row.id)) {
    return LIMITED_GROUP.get(row.id).kind === 'monthly' ? clock.monthIndex(realMs) : clock.weekIndex(realMs);
  }
  if (row.missionType === 2) return clock.dayIndex(realMs);
  if (row.missionType === 3) return clock.weekIndex(realMs);
  return 0;
}
```

In `missionActive(row, realMs)`: le date del master sono finte, si confrontano con l'ora finta:
`const fakeMs = clock.fake(realMs, clockOffset());` al posto di `nowMs` nei confronti con `startDate`/`endDate`;
Beginner: `realMs < player.beginnerSince + BEGINNER_DAYS * 86400000` (vedi Task 6 per `beginnerSince` in ms).

`limitedPeriod(kind, realMs = realNow())` usa `clock.monthIndex`/`clock.weekIndex` (stessi confini delle
missioni; `LIMITED_WEEK0` si toglie). `weeklyLux(n)`: `period = clock.weekIndex(realNow())`.

Nuova funzione, dopo `respondMissionReceive`:

```js
// Chiusura dei periodi (spec 3.6): a ogni richiesta, se il giorno/settimana/mese reale e' avanzato
// dall'ultima chiusura, i premi delle missioni completate e non riscosse del periodo finito vanno nei
// Presents, una volta (s.received). Prima volta: si registra solo l'istante, nessuna consegna.
const SETTLE_COMMENT = { 2: 'Daily Mission reward', 3: 'Weekly Mission reward', 4: 'Limited Mission reward' };
function settleClock(realMs = realNow()) {
  const cur = { day: clock.dayIndex(realMs), week: clock.weekIndex(realMs), month: clock.monthIndex(realMs) };
  const st = player.clockSettled;
  if (st && st.day === cur.day && st.week === cur.week && st.month === cur.month) return;
  if (st) {
    for (const row of masterRows('mission')) {
      const s = (player.missions || {})[row.id];
      if (!s || s.received || !SETTLE_COMMENT[row.missionType] || s.period === missionPeriod(row, realMs)) continue;
      if (s.count >= (row.targetNum?.[0] || 1) || (MISSION_DERIVED[row.conditionId] && missionProgress(row, s) >= (row.targetNum?.[0] || 1))) {
        s.received = true;
        addPresent(row.rewardType, row.itemId, row.itemNum, SETTLE_COMMENT[row.missionType]);
        console.log(`[missioni] ${row.id} non riscossa a fine periodo: premio nei Presents`);
      }
    }
  }
  player.clockSettled = cur;
  savePlayer();
}
```

Nell'handler, subito dopo `logRequest(entry);`:

```js
      // chiusura dei periodi delle missioni prima di ogni altra elaborazione (spec 3.6)
      if (player.created) settleClock();
```

Esportare in `_test`: `settleClock, MISSION_COUNTER`.

- [ ] **Passo 4: prove**: `node server/test-mission-settle.js` -> OK; `node server/test-limited.js` -> OK
(la prova sposta `Date.now`, che ora e' anche l'ora reale del server: nessuna modifica attesa; se fallisce
sul «ritorno della campagna», controllare che `missionPeriod` usi `realMs`).

- [ ] **Passo 5: commit** («Missioni: periodi in ora reale e premi non riscossi nei Presents»).

---

### Task 4: Weekly in due serie alternate A/B

**File:**
- Crea: `server/make-weekly-series.js`
- Modifica: `server/tables/mission.json`, `server/master_data/mission.json` (generati)
- Modifica: `server/server.js` (`missionActive`)
- Modifica: `server/test-mission-settle.js` (caso Weekly)

**Interfacce:**
- Produce: righe 3011-3020 copie di 3001-3010; `weeklySeries(row) -> 0 | 1` (0 per 3001-3010, 1 per 3011-3020).

- [ ] **Passo 1: prova** — aggiungere in fondo a `server/test-mission-settle.js`, prima del riepilogo:

```js
// Weekly A/B: una sola serie attiva per settimana, alternata
at('2026-10-14T12:00:00Z');
const wk = quiet(() => t.missionsData()).map((m) => m.id).filter((id) => id >= 3001 && id <= 3020);
at('2026-10-21T12:00:00Z');
const wk2 = quiet(() => t.missionsData()).map((m) => m.id).filter((id) => id >= 3001 && id <= 3020);
check(wk.length === 10 && wk2.length === 10, `Weekly attive ${wk.length}/${wk2.length}`);
check(!wk.some((id) => wk2.includes(id)), 'serie A/B non alternate');
```

- [ ] **Passo 2: eseguire**: fallisce (20 Weekly attive o nessuna riga 3011).

- [ ] **Passo 3: generatore** `server/make-weekly-series.js`

```js
#!/usr/bin/env node
// Weekly in due serie alternate (spec orologio finto 3.3): 3001-3010 settimane pari, 3011-3020
// dispari. Ognuna riceve nel master servito la scadenza della SUA prossima settimana, cosi' al cambio
// di settimana a gioco aperto le missioni nuove hanno gia' il conto alla rovescia giusto.
//   node server/make-weekly-series.js   (poi alzare KHUX_REVISION)
'use strict';
const fs = require('fs');
const path = require('path');
for (const file of [path.join(__dirname, 'tables', 'mission.json'), path.join(__dirname, 'master_data', 'mission.json')]) {
  const rows = JSON.parse(fs.readFileSync(file, 'utf8')).filter((r) => !(r.id >= 3011 && r.id <= 3020));
  const a = rows.filter((r) => r.id >= 3001 && r.id <= 3010);
  const b = a.map((r) => ({ ...r, id: r.id + 10 }));
  fs.writeFileSync(file, JSON.stringify([...rows, ...b].sort((x, y) => x.id - y.id), null, 1) + '\n');
  console.log(`${file}: ${a.length} Weekly A + ${b.length} B`);
}
```

In `server.js`, `missionActive`, prima di `return true`:

```js
  // Weekly A/B (make-weekly-series.js): 3001-3010 settimane pari, 3011-3020 dispari (ora reale)
  if (row.missionType === 3) return clock.weekIndex(realMs) % 2 === (row.id >= 3011 ? 1 : 0);
```

- [ ] **Passo 4**: `node server/make-weekly-series.js`, poi `node server/test-mission-settle.js` e
`node server/test-limited.js` -> OK.

- [ ] **Passo 5: commit** («Weekly in due serie alternate A/B»).

---

### Task 5: master con revisione calcolata, scadenze al volo e cache

**File:**
- Modifica: `server/server.js` (`respondStatus` ~280: `versionDat`...; `respondResourceSize` ~372;
  `masterBody` ~397; `masterTables`/`respondMaster`/`respondMasterFile` ~455-500)
- Crea: `server/test-master-clock.js`

**Interfacce:**
- Consuma: `clock.masterRevision`, `clock.weekEnd`, `clock.weekStartOf`, `clock.monthEndOf`, `clock.weekIndex`,
  `clock.monthIndex`, `clock.twinOffset`, `clock.fakeString`, `LIMITED_ROTATION`, `LIMITED_GROUP`.
- Produce: `masterRevisionNow() -> intero`, `servedMasterRows(name, realMs) -> righe` (esportate in `_test` con
  `masterBody`, `respondMaster`, `respondResourceSize`).

- [ ] **Passo 1: prova** `server/test-master-clock.js`

```js
// Master servito con l'orologio finto: node server/test-master-clock.js
'use strict';
process.env.KHUX_REVISION = '117';
delete process.env.KHUX_SERVER_TIME;
const realNowFn = Date.now; const at = (iso) => { const ms = Date.parse(iso); Date.now = () => ms; };
at('2026-10-16T15:00:00Z');
const log = console.log; const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const errors = []; const check = (ok, msg) => { if (!ok) errors.push(msg); };
const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };

const rev = t.masterRevisionNow();
check(rev > 117 * 100000, `revisione ${rev}`);
const m = call(t.respondMaster);
check(m.master.revision === rev && m.mission.revision === rev, 'revisione nel master');
const rows = t.servedMasterRows('mission', Date.now());
const end = (id) => rows.find((r) => r.id === id).endDate;
// settimana del 12/10/2026 (indice pari o dispari): una serie Weekly scade lunedi' 19/10, l'altra il 26/10
const a = end(3001), b = end(3011);
check(new Set([a, b]).size === 2 && [a, b].includes('2020-10-19 08:00:00') && [a, b].includes('2020-10-26 08:00:00'), `Weekly ${a} / ${b}`);
// Limited: la mensile attiva scade il 1/11 08:00 finto
const activeMonthly = t.LIMITED_ROTATION.monthly.find((ids) => ids.every((id) => t.limitedActive(id)));
check(end(activeMonthly[0]) === '2020-11-01 08:00:00', `Limited mensile ${end(activeMonthly[0])}`);
// stesso contenuto per la stessa revisione, e servito in meno di 50 ms dalla cache
const b1 = t.masterBody('mission'); const t0 = process.hrtime.bigint();
call(t.respondMaster);
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
check(t.masterBody('mission').equals(b1), 'contenuto cambiato senza cambio di revisione');
check(ms < 50, `respondMaster ${ms.toFixed(1)} ms con la cache`);
// risorse: versionRes/darkVersionRes non seguono la revisione del master
const st = call(t.respondStatus);
check(st.darkVersionRes === 117 && st.versionDat === rev, `status ${st.versionDat} ${st.darkVersionRes}`);
// la settimana dopo: nuova revisione, nuove scadenze
at('2026-10-19T09:00:00Z');
check(t.masterRevisionNow() === rev + 1, 'revisione +1 al lunedi');

Date.now = realNowFn;
if (errors.length) { log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
log('OK: master con l\'orologio');
```

- [ ] **Passo 2: eseguire**: fallisce (`masterRevisionNow` non esiste).

- [ ] **Passo 3: implementare**

```js
// revisione del master calcolata (spec 3.3): BASE = KHUX_REVISION, piu' le scadenze passate
const masterRevisionNow = () => clock.masterRevision(REVISION, realNow());

// righe servite: per «mission» le scadenze delle Weekly A/B e dei gruppi Limited (prossima
// occorrenza), in ora finta con lo scostamento del mese della revisione
function servedMasterRows(name, realMs) {
  const rows = masterRows(name);
  if (name !== 'mission') return rows;
  const off = clock.twinOffset(realMs);
  const w = clock.weekIndex(realMs), mi = clock.monthIndex(realMs);
  const nextWeek = (i, n) => { let k = w; while (k % n !== i) k++; return clock.weekStartOf(k + 1); };
  const nextMonth = (i, n) => { let k = mi; while (k % n !== i) k++; return clock.monthEndOf(k); };
  return rows.map((r) => {
    let endMs = null;
    if (r.missionType === 3) endMs = nextWeek(r.id >= 3011 ? 1 : 0, 2);
    const g = LIMITED_GROUP.get(r.id);
    if (r.missionType === 4 && g) {
      endMs = g.kind === 'monthly' ? nextMonth(g.index, LIMITED_ROTATION.monthly.length) : nextWeek(g.index, LIMITED_ROTATION.weekly.length);
    }
    return endMs === null ? r : { ...r, endDate: clock.fakeString(endMs, off) };
  });
}
```

`masterBody(name)` con cache per revisione e data del file:

```js
const masterBodyCache = new Map(); // nome -> {key, body, md5}
function masterBody(name) {
  const file = path.join(MASTER_DIR, name + '.json');
  if (!/^[A-Za-z0-9]+$/.test(name) || !fs.existsSync(file)) return null;
  const st = fs.statSync(file);
  const key = `${masterRevisionNow()}:${st.mtimeMs}:${st.size}`;
  const hit = masterBodyCache.get(name);
  if (hit && hit.key === key) return hit.body;
  const json = Buffer.from(JSON.stringify(servedMasterRows(name, realNow())), 'utf8');
  const c = crypto.createCipheriv('aes-256-cbc', Buffer.from(masterKey(name), 'utf8'), Buffer.alloc(16));
  const body = Buffer.from(Buffer.concat([c.update(json), c.final()]).toString('base64'), 'utf8');
  masterBodyCache.set(name, { key, body, md5: crypto.createHash('md5').update(body).digest('hex') });
  return body;
}
```

(Nota: oggi `masterBody` cifra il file cosi' com'e'; `JSON.stringify(masterRows(name))` produce lo stesso
contenuto JSON senza spazi: prima di procedere verificare al banco che il client accetti tabelle compatte —
`server/tables/*.json` le scrive gia' indentate e il client legge JSON, quindi atteso OK.)

`masterTables()`: memorizzare l'esito della convalida per nome e `mtimeMs`/`size` (stessa idea, mappa
`masterValidCache`). `respondMaster`: `revision: masterRevisionNow()` in `master` e in ogni tabella; md5 da
`masterBodyCache.get(name).md5` dopo `masterBody(name)`. `respondResourceSize`:
`Number(req?.masterRevision) >= masterRevisionNow()`. `respondStatus`: `versionDat`, `commonVersionDat`,
`darkVersionDat` = `masterRevisionNow()`; `darkVersionRes` = `REVISION` (fisso).

Esportare in `_test`: `masterRevisionNow, servedMasterRows, masterBody, respondMaster, respondResourceSize, respondStatus, LIMITED_ROTATION, limitedActive`.

- [ ] **Passo 4: prove**: `node server/test-master-clock.js` -> OK; tutte le altre prove `server/test-*.js` -> OK.

- [ ] **Passo 5: commit** («Master: revisione calcolata, scadenze di Weekly e Limited al volo, cache»).

---

### Task 6: orari salvati in ms reali e migrazione dei salvataggi

**File:**
- Modifica: `server/server.js` (presents ~1880-1935: `seedTestPresents`, `addPresent`, `livePresents`,
  `userPresentData`; `beginnerLimitTime` ~1740; scritture di `getDatetime` ~1226, ~1522, ~2203, ~2360, ~2594;
  letture ~1532, ~2043, ~2078, ~2623; caricamento del salvataggio ~729)
- Modifica: `server/pet.js` (training ~196-330, parti ~139-160, trait ~293), `server/grant-all-medals.js` (~34)
- Crea: `server/test-clock-migration.js`

**Interfacce:**
- Consuma: `realNow()`, `outTime(v, fallback)`, `clock.monthIndex`.
- Produce: `migrateClock()` (in `_test`), `ctx.realNow`, `ctx.outTime`, `ctx.monthIndex` per `pet.js`.

- [ ] **Passo 1: prova** `server/test-clock-migration.js`

```js
// Migrazione dei salvataggi all'orologio finto: node server/test-clock-migration.js
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path');
const SAVE = path.join(os.tmpdir(), `khux-test-clockmig-${process.pid}.json`);
fs.writeFileSync(SAVE, JSON.stringify({
  created: true, name: 'Vecchio', medals: [
    { userMedalId: 101, medalId: 1, level: 1, getDatetime: '2021-05-15 12:00:00' },
    { userMedalId: 102, medalId: 1, level: 1, getDatetime: '2021-05-16 12:00:00' }],
  presents: [{ userPresentId: 1, resourceType: 2, resourceId: 0, number: 10, limitDatetime: '2021-06-10 00:00:00', comment: 'x', created: '2021-05-15 12:00:00' }],
  beginnerSince: '2021-05-15 12:00:00', missions: { 2001: { period: 5, count: 1, received: false } },
  pet: { training: { total: 3, monthly: 2, month: '2021-05', readyAt: Date.parse('2021-05-16T08:00:00Z'), medals: [] } },
}));
process.env.KHUX_SAVE = SAVE; process.env.KHUX_PET = '1';
delete process.env.KHUX_SERVER_TIME;
const realNowFn = Date.now; const now = Date.parse('2026-10-16T15:00:00Z'); Date.now = () => now;
const log = console.log; const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const errors = []; const check = (ok, msg) => { if (!ok) errors.push(msg); };
const p = t.player;
check(p.clockVersion === 1, 'migrazione non fatta');
check(p.medals[1].getDatetime === now && p.medals[0].getDatetime === now - 86400000, `getDatetime ${p.medals.map((m) => m.getDatetime)}`);
check(p.presents[0].limitDatetime === now + 29 * 86400000, 'regalo: +29 giorni');
check(p.beginnerSince === now, 'beginnerSince');
check(Object.keys(p.missions || {}).length === 0, 'contatori dei periodi non azzerati');
check(p.pet.training.readyAt === 0 && p.pet.training.month === t.clockMonthIndex(now), 'training');
check(t.outTime(p.medals[1].getDatetime) === t.serverTime(), 'uscita in ora finta');
// seconda volta: nessun cambiamento
const before = JSON.stringify(p); quiet(() => t.migrateClock());
check(JSON.stringify(p) === before, 'migrazione ripetuta');
Date.now = realNowFn;
try { fs.unlinkSync(SAVE); } catch { /* tolto */ }
if (errors.length) { log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
log('OK: migrazione');
```

- [ ] **Passo 2: eseguire**: fallisce (`clockVersion` assente).

- [ ] **Passo 3: implementare**

Migrazione (chiamata subito dopo il caricamento del salvataggio, prima di `grantMissingKeyblades`):

```js
// Migrazione all'orologio finto (spec 3.7): orari salvati in ms reali. Le stringhe finte vecchie
// (ora che ripartiva dal 15/5/2021) non hanno un istante reale: getDatetime spostati in blocco con la
// piu' recente = adesso (l'ordine resta), regali +29 giorni, Beginner da adesso, training pronto,
// contatori dei periodi azzerati (cambiano scala).
function migrateClock() {
  if (player.clockVersion === 1) return;
  const now = realNow();
  const holders = [
    ...(player.medals || []), ...(player.keyblades || []), ...Object.values(player.sphere || {}),
    ...Object.values(player.medalSkills || {}), ...Object.values(player.medalTraits || {}).flat(),
  ].filter((o) => o && typeof o.getDatetime === 'string');
  const ms = (s) => Date.parse(s.replace(' ', 'T') + 'Z');
  const max = Math.max(0, ...holders.map((o) => ms(o.getDatetime)).filter(Number.isFinite));
  for (const o of holders) { const v = ms(o.getDatetime); o.getDatetime = Number.isFinite(v) ? now - (max - v) : now; }
  if (player.pet?.parts) for (const k of Object.keys(player.pet.parts)) player.pet.parts[k] = now;
  for (const p of player.presents || []) { p.limitDatetime = now + 29 * 86400000; p.created = now; }
  if (player.beginnerSince) player.beginnerSince = now;
  player.missions = {};
  delete player.weeklyLux;
  delete player.clockSettled;
  if (player.pet?.training) { player.pet.training.readyAt = 0; player.pet.training.month = clock.monthIndex(now); }
  player.clockVersion = 1;
  savePlayer();
}
```

Scritture: ogni `getDatetime: serverTime()` / `getDatetime: now` che SALVA in `player` diventa
`getDatetime: realNow()` (righe ~1226, ~1522, ~2203, ~2360, ~2594; `pet.js` ~159 e ~293 con `ctx.realNow()`;
`grant-all-medals.js` ~34 con `Date.now()`). Letture verso il client: `getDatetime: outTime(m.getDatetime, now)`
(~2043), `outTime(s.getDatetime || m.getDatetime, now)` (~2078), `outTime(s.getDatetime, serverTime())` (~1532),
`outTime(k.getDatetime, serverTime())` (~2623), `pet.js` ~149 `getDatetime: ctx.outTime(t)`.
Controllo finale: `grep -n "getDatetime" server/*.js` — nessuna scrittura in `player` con una stringa.

Presents: `addPresent` e `seedTestPresents` salvano `limitDatetime: realNow() + 30 * 86400000` (29 per le
prove) e `created: realNow()`; `livePresents` filtra con `(typeof p.limitDatetime === 'number' ? p.limitDatetime : Infinity) > realNow()`;
`userPresentData` manda `limitDatetime: outTime(p.limitDatetime)`, `created: outTime(p.created)`.

Beginner: `player.beginnerSince = realNow()` alla prima lettura; `beginnerLimitTime()` restituisce
`serverTimeAt(player.beginnerSince + BEGINNER_DAYS * 86400000)`; in `missionActive` il controllo Beginner
diventa `realMs < player.beginnerSince + BEGINNER_DAYS * 86400000`.

`pet.js`: `ctx` riceve `realNow`, `outTime`, `monthIndex: clock.monthIndex` (aggiungerli dove `server.js`
costruisce il contesto di `makePet`); `serverMs()` -> `ctx.realNow()`; `fmt(t.readyAt)` -> `ctx.outTime(t.readyAt)`;
`training()`: `const month = ctx.monthIndex(ctx.realNow());`; le scadenze `weekEnd`/`monthEnd` del GET di
`respondExpedition` si calcolano con `clock`-equivalenti passati in `ctx` e si mandano con `ctx.outTime`.

Esportare in `_test`: `migrateClock`, `clockMonthIndex: clock.monthIndex`.

- [ ] **Passo 4: prove**: `node server/test-clock-migration.js` -> OK; tutte le `server/test-*.js` -> OK.

- [ ] **Passo 5: commit** («Orari salvati in ora reale e migrazione dei salvataggi»).

---

### Task 7: script di sessione, misura del login e prova al banco

**File:**
- Modifica: `tools/ldplayer/session/run-server.ps1`, `relogin.ps1`, `cycle.ps1`, `update-resources.ps1`
  (commento: `-Revision` = BASE della revisione del master; nuovo `-RealNow <ISO>` in `run-server`/`relogin`
  che imposta `KHUX_REAL_NOW`)
- Modifica: `server/server.js` (`realNow`: con `KHUX_REAL_NOW` = istante reale finto all'avvio + tempo trascorso)
- Crea: `tools/ldplayer/session/login-time.ps1`
- Modifica: `docs/notes/server.md`, `docs/notes/home_profilo.md#limited`, `HANDOFF.md`

- [ ] **Passo 1: `realNow` per le prove al banco**

```js
// KHUX_REAL_NOW (prove al banco): l'ora reale parte da quell'istante all'avvio del server
const REAL_SHIFT = process.env.KHUX_REAL_NOW ? Date.parse(process.env.KHUX_REAL_NOW) - STARTED_AT : 0;
const realNow = () => Date.now() + REAL_SHIFT;
```

`run-server.ps1`: `param(..., [string]$RealNow)` e `if ($RealNow) { $env:KHUX_REAL_NOW = $RealNow }`;
`relogin.ps1`: `[string]$RealNow` passato come `-RealNow $RealNow` nella riga di comando di `run-server`.

- [ ] **Passo 2: `login-time.ps1`**

```powershell
# Misura del login: N relogin, tempo fino a /khux/login e totale (righe di relogin.ps1).
#   .\login-time.ps1 -N 5 [-RealNow 2026-10-19T09:00:00Z]
param([int]$N = 5, [string]$RealNow)
$repo = Split-Path (Split-Path (Split-Path $PSScriptRoot))
Set-Location $repo
$rows = @()
for ($i = 1; $i -le $N; $i++) {
    $out = & "$PSScriptRoot\relogin.ps1" -Tag "lt$i" $(if ($RealNow) { @('-RealNow', $RealNow) }) 2>&1 | Out-String
    $login = [regex]::Match($out, 'POST /khux/login\s+([\d,]+) s').Groups[1].Value -replace ',', '.'
    $tot = [regex]::Match($out, 'totale ([\d,]+) s').Groups[1].Value -replace ',', '.'
    $master = @(Get-Content 'D:\Progetto_Restauro_KH_UX\logs\server.log' -Encoding Unicode | Select-String 'GET /master/').Count
    $rows += [pscustomobject]@{ giro = $i; login = [double]$login; totale = [double]$tot; tabelle = $master }
}
$rows | Format-Table | Out-String
"media login: {0:N1} s, media totale: {1:N1} s" -f ($rows | Measure-Object login -Average).Average, ($rows | Measure-Object totale -Average).Average
```

- [ ] **Passo 3: misura prima** (con il codice di `main` prima dei Task 1-6, oppure annotare i valori di oggi):
`.\tools\ldplayer\session\login-time.ps1 -N 5` -> salvare la tabella in `docs/notes/server.md#master`.

- [ ] **Passo 4: banco, settimana corrente.** `relogin.ps1 -Tag ck` (riscarica il master una volta: nuova
revisione). Screenshot delle schede Daily, Weekly e Limited: Daily «N hours left» = ore fino alle 08:00 UTC
reali; Weekly «N days left» = giorni fino a lunedi' 08:00 UTC; Limited mensile = giorni fino al 1° del mese
08:00. Confrontare con l'ora reale del PC (`Get-Date -AsUTC`).

- [ ] **Passo 5: banco, riavvio.** `relogin.ps1 -Tag ck2`: stessi valori, `tabelle` = 0 in `login-time` (nessun
download del master).

- [ ] **Passo 6: banco, cambio di settimana simulato.** `relogin.ps1 -Tag ck3 -RealNow <prossimo lunedi' 09:00Z>`:
master riscaricato (106 tabelle), **nessun** `GET /resource/` nel log, nuova campagna Limited breve e serie Weekly
opposta; un premio di una missione completata e non riscossa nella settimana prima compare nei Presents.
Poi `relogin.ps1 -Tag ck4` senza `-RealNow` per tornare all'ora vera.

- [ ] **Passo 7: misura dopo**: `login-time.ps1 -N 5` -> criteri dei Vincoli globali; risultati in `docs/notes/server.md`.

- [ ] **Passo 8: documentazione e commit.** `docs/notes/server.md` (orologio, revisione calcolata, misure),
`docs/notes/home_profilo.md#limited` (scadenze vere, Presents), `HANDOFF.md` (stato del banco: revisione =
BASE 117 + scadenze; nuovi parametri `-RealNow`). Commit «Orologio finto: script, misura del login, banco».
