<a id="guilt"></a>
# Guilt e Level Up con medaglie speciali (I-079, I-080): piano

Analisi del 12 ottobre 2026 (agente): fonti in `reference\guilt` (guida dell'utente p.16/20/21, khuxwiki). Regole, campi del client (`attackUpperNumber`, `defenseUpperNumber`, `burstUpperNumber`, `upperCost`, `guiltFactor` di userMedal, `[fn]`; `POST /user/medal/enhance` azione 55, `[fn]`; tabella `guiltProb`, `[fn]`) e regole implementate in `server/medal-guilt.js` (non ancora collegato; test `node server/test-medal-guilt.js server`). Brooms = Magic Broom (5*, materiale di Evolve), Mickey & Brooms = Fantasia Mickey B (6*, type 8): assenti dal master (make-game-tables.js scarta le righe di Roboloid senza attributo).

# Guilt / Level Up con medaglie speciali: patch proposte (NON applicate)

Modulo pronto: `server/medal-guilt.js` (nuovo, non collegato). Test: `node test-medal-guilt.js <repo>\server`
(in questa cartella) -> OK.

## 1. make-game-tables.js (tabelle)

```js
const guilt = require('./medal-guilt');
// dopo aver costruito `medals` e `bursts`:
const extra = guilt.extraMedalRows(medals);
medals.push(...extra.rows);                                   // 300948 Magic Broom, 300913 Fantasia Mickey B (type 8)
Object.assign(medals.find((m) => m.medalId === 90085), extra.mickeyAPatch); // Mickey A + 5 Broom -> Mickey B
const fix = guilt.burstDotFixes(medals, bursts);              // 1.677 burst: maxEnhanceCount per rarita' (6★/7★ = 5)
for (const b of bursts) if (fix[b.burstId] !== undefined) b.maxEnhanceCount = fix[b.burstId];
write('guiltProb', guilt.guiltProbRows());                    // ora master_data/guiltProb.json e' []
// Cid: khuxwiki "max 20 riduzioni dalla 2.0.0" -> per le 6★/7★ minCost = cost - 20 (ora 46/36 = 10)
for (const m of medals) if (m.type === 1 && m.rare >= 6 && m.cost - m.minCost === 10) m.minCost = m.cost - 20;
```

Attenzione: le righe di Roboloid ripartono dalla riga modello; `burstEnhanceCategory`/`groupId` sono 0
ovunque (2.054 medaglie): pallini solo con copie identiche (medalId) o Mickey & Brooms, come la wiki.

## 2. server.js

### userMedalElement (riga ~1621): leggere i campi salvati
```js
    attackUpperNumber: m.attackUpperNumber || 0, defenseUpperNumber: m.defenseUpperNumber || 0,
    burstUpperNumber: m.burstUpperNumber || 0,
    lock: player.medalLocks?.[m.userMedalId] ? 1 : 0,
    upperCost: m.upperCost || 0, guiltFactor: m.guiltFactor || 0, // guiltFactor: uint, centesimi di %
```
(`medalState` viene gia' fuso in `userMedalList()`; l'Evolve con `setMedalState({medalId, level, exp})`
li conserva: pallini e bonus restano dopo l'evoluzione, come dice la khuxwiki per i pallini.)

### respondMedalEnhance (riga ~1690): dopo il calcolo dell'EXP
```js
  const mg = require('./medal-guilt');
  const burstRow = row.validBurst ? masterRows('burst').find((b) => b.burstId === row.burstId) : null;
  const { state, events } = mg.applyEnhance(row, base,
    comps.map((m) => ({ row: rows.get(m.medalId), burstUpperNumber: m.burstUpperNumber || 0 })).filter((c) => c.row),
    { burstRow, guiltProb: masterRows('guiltProb'), isGuilt: isGuiltUnlocked() });
  setMedalState(base.userMedalId, { level, exp, ...state });
  ...
    afterEnhanceUserMedal: userMedalElement({ ...base, level, exp, ...state }, now),
```
Log: `pallini ${base.burstUpperNumber||0}->${state.burstUpperNumber}, guilt ${base.guiltFactor||0}->${state.guiltFactor} (tiri ${events.rolls})`.
`guiltBurstFirstLv/MaxLv` restano 0 finche' manca `lwf/medal/guilt_bonus/GuiltBonus_BurstLvup` (stesso
interruttore `KHUX_GUILT_BURST_POPUP` di guilt-burst.js): con il popup, = +1/+5 se `events.guiltUnlocked`/
`events.guiltMaxed` danno la prima guilt/guilt massima di quella medaglia.

### userDetail.isGuilt (riga ~1188 e ~2412)
Oggi `isGuilt = guiltBurst().isGuilt()` (livello Burst > 0). Con la guilt vera e' un circolo: il client
([fn], [fn]) permette sblocco/rilancio e Magic Mirror solo con `isGuilt` (= Power Bangle,
Quest 34) e il Burst sale solo dopo la prima guilt. Proposta:
```js
function isGuiltUnlocked() { return (player.lastClearStageId || 0) >= POWER_BANGLE_STAGE ? 1 : 0; } // stageId della Quest 34
    isGuilt: isGuiltUnlocked(),
```
Il pulsante Burst resta comunque nascosto finche' `guiltBurstLv` e' 0 ([fn]).

## 3. guilt-burst.js (refresh)
Prima guilt = `m.guiltFactor > 0` (non piu' "possiedo una medaglia con tier"); guilt massima =
`m.guiltFactor >= guiltRange(guiltProb, row.guiltValue).max` (non piu' "livello massimo"). Il registro
`player.guiltBurst` non scende (come ora). Per non togliere livelli al salvataggio attuale: migrazione
che tiene i medalId gia' registrati.

## 4. Da verificare al banco
- Medal List: le righe nuove 300948/300913 compaiono (grant-all-medals le prende: `sell` > 0) e la
  type 8 non rompe l'ordinamento/filtri.
- Anteprima Level Up: Chip/Dale/Cid/Mirror selezionabili, «+STR/+DEF/COST» e «Bonus range +40 - 100%»
  (testi 101300036/101300043-45), risultato con effetti 7 (pallino/sblocco) e 8 (guilt su) di
  [fn] (animazioni `[fn](…,7/8)`: controllare che i LWF esistano).
- STR nel dettaglio = STR del livello + attackUpperNumber; COST = cost - upperCost (ipotesi sul
  significato di upperCost: il client confronta `minCost < cost - upperCost - accumulato`).
