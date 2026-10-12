<a id="guilt"></a>
# Guilt e Level Up con medaglie speciali (I-079, I-080)

Analisi del 12 ottobre 2026 (agente): fonti in `reference\guilt` (guida dell'utente p.16/20/21, khuxwiki). Regole, campi del client (`attackUpperNumber`, `defenseUpperNumber`, `burstUpperNumber`, `upperCost`, `guiltFactor` di userMedal, `FUN_0078d608`; `POST /user/medal/enhance` azione 55, `FUN_007e3bbc`; tabella `guiltProb`, `FUN_00c80b50`) e regole in `server/medal-guilt.js`. Brooms = Magic Broom (5*, materiale di Evolve), Mickey & Brooms = Fantasia Mickey B (6*, type 8): prima assenti dal master (make-game-tables.js scartava le righe di Roboloid senza attributo).

<a id="stato"></a>
## Stato (12 ottobre 2026): collegato, DA VERIFICARE al banco

Il piano sotto e' applicato. Test senza client:
- `node server/test-medal-guilt.js <repo>\server`: regole del modulo.
- `node server/test-medal-enhance.js [cartella master]`: `respondMedalEnhance` di server.js su un
  salvataggio temporaneo (`KHUX_SAVE` nel temp, il salvataggio vero non si tocca). Serve un master
  rigenerato (con `guiltProb` vuota si ferma con «rigenerare il master»). Esito su una copia
  rigenerata nello scratchpad: OK (Black Coat King Mickey 6★ tier 3: 5 copie -> 5 pallini; senza
  Quest 34 niente guilt; con Quest 34 guilt 9200 e Burst +1; Mirror x2 +200; Chip x10 / Dale / Cid
  10 x3 -> STR +1000, DEF +150, costo -20; guilt 10000 -> Burst +5; Mickey & Brooms 2 -> 3 pallini).

Serve rigenerare il master (`$env:KHUX_MEDALS_ALL='1'; $env:KHUX_WORLDTOUR='1'; node
server\make-game-tables.js D:\Progetto_Restauro_KH_UX\wiki\medals.json`) e alzare la revisione.
Differenze rispetto al master di prima (provato su una copia): `medal` +300948, +300913, 1.517
`minCost` (6★/7★), la 90085 evolvibile; `burst` 1.677 righe con `maxEnhanceCount` e potenze per
pallino; `guiltProb` 655 righe. Effetto collaterale gia' esistente della pipeline: la medaglia 2
(Burst, `make-guilt-burst.js`) viene ricopiata dalla 1 e prende l'immagine 90000 (prima 90041).

## 1. make-game-tables.js (tabelle) - fatto

- Con `KHUX_MEDALS_ALL=1`: `extraMedalRows` aggiunge 300948 Magic Broom (copia di Fantasia Mickey A,
  type 6, 5★) e 300913 Fantasia Mickey B (copia di Magic Mirror, type 8, 6★); la 90085 diventa
  evolvibile: 5 Magic Broom -> 300913 (`validEvolveNeed` 5).
- Cid (khuxwiki «max 20 riduzioni dalla 2.0.0»): medaglie d'attacco 6★/7★ con `cost - minCost` = 10
  -> `minCost = cost - 20` (es. 46/26). Medaglia 1 (Stock Medal, immagini 90000) intatta.
- `burstDotFixes`: `maxEnhanceCount` per rarita' (3★ 1, 4★ 2, 5★ 3, 6★/7★ 5) sulle burst che ne
  avevano meno (Roboloid 0, 6★ di thethiny 4). Le potenze per pallino (`basePowerPerEnforce`,
  `displayPowerPerEnforce`, valori assoluti) si ricalcolano dalla potenza della riga con la regola
  di `tierPower` (+300, +900, +1800, +3000, +4500): quelle copiate dal modello erano di un'altra
  medaglia (Roboloid: 68300 di base, 15000 per pallino) o 1 oltre il vecchio massimo. Il +300 per
  pallino e' un'ipotesi (righe vere 10363/10364).
- `guiltProb.json`: `guiltProbRows()` (intervalli della khuxwiki per tier, un valore ogni 1%, peso
  100, `isCampaign` 0).

Le righe di Roboloid ripartono dalla riga modello; `burstEnhanceCategory`/`groupId` sono 0 ovunque:
pallini solo con copie identiche (medalId) o Mickey & Brooms, come la wiki.

## 2. server.js - fatto

- `userMedalElement`: `attackUpperNumber`, `defenseUpperNumber`, `burstUpperNumber`, `upperCost`
  (= -riduzione di Cid, vedi sotto), `guiltFactor` (centesimi di %, 10000 = +100%) da `medalState` (fuso in `userMedalList()`; l'Evolve
  con `setMedalState({medalId, level, exp})` li conserva).
- `respondMedalEnhance`: dopo l'EXP, `medalGuilt.applyEnhance(row, base, materiali, {burstRow,
  guiltProb, isGuilt: isGuiltUnlocked()})`; lo stato va in `medalState` e in
  `afterEnhanceUserMedal`. Log: `pallini a->b, guilt a->b (tiri ...), STR +, DEF +, costo -`.
- `guiltBurstFirstLv/MaxLv` = livelli del Burst appena dati (`guiltBurst().gained()`), solo con
  `KHUX_GUILT_BURST_POPUP=1` (manca `lwf/medal/guilt_bonus/GuiltBonus_BurstLvup`); altrimenti 0.
- `userDetail.isGuilt = isGuiltUnlocked()`: missione numero >= 34 (Power Bangle; `stageNumber` di
  `lastClearStageId`), oppure sempre 1 con `KHUX_GUILT_BURST_LV` > 0 (prove del Burst). Il client
  (FUN_00c81f30, FUN_00c7e498) permette sblocco/rilancio e Magic Mirror solo con `isGuilt`; il
  pulsante Burst resta nascosto finche' `guiltBurstLv` e' 0 (FUN_00b10044). La riga del supporto
  (`supportUsers`, isGuilt 0) non cambia.
- `module.exports._test`: funzioni per `test-medal-enhance.js`.

## 3. guilt-burst.js - fatto

Prima guilt = una copia con `guiltFactor > 0`; guilt massima = `guiltFactor >= guiltRange(guiltProb,
guiltValue).max`. Il registro `player.guiltBurst` non scende: i medalId registrati con le regole di
prima (possesso, livello massimo) restano, quindi un salvataggio esistente non perde livelli (il
salvataggio del banco ha 1.908 medaglie registrate: Burst 1.908, l'aumento +1/+5 non si vede dal
pulsante, solo da `guiltBurstLv` nei log).

## 4. Da verificare al banco
- Medal List: le righe nuove 300948/300913 compaiono (grant-all-medals le prende: `sell` > 0) e la
  type 8 non rompe l'ordinamento/filtri.
- Anteprima Level Up: Chip/Dale/Cid/Mirror selezionabili, «+STR/+DEF/COST» e «Bonus range +40 - 100%»
  (testi 101300036/101300043-45), risultato con effetti 7 (pallino/sblocco) e 8 (guilt su) di
  FUN_00c873f0 (animazioni `FUN_00c97818(…,7/8)`: controllare che i LWF esistano).
- STR nel dettaglio = STR del livello + attackUpperNumber.
- Costo (banco rev. 95: Cid 90076 = -1 come la khuxwiki, ma «Cost 46» invariato): `upperCost` e'
  un int con segno, la variazione del costo, negativa per Cid. `FUN_00eb577c` (costruzione
  dell'oggetto medaglia dal `userMedal` di `FUN_0078d608`, struttura +0x28) scrive oggetto +0x2c =
  **-upperCost**, e tutti i lettori usano `cost - (+0x2c)`: somma del costo del deck
  (`FUN_0075f484`), confronto per l'ordinamento (`FUN_0075f2f8`), Optimize (`FUN_00756d40`),
  limite dell'anteprima (`FUN_00c81f30`: `minCost < cost - (+0x2c) - accumulato`), effetto 6 del
  risultato (`FUN_00c873f0`: se +0x2c sale). Il server mandava +1 (costo effettivo 47): ora
  `userMedalElement` manda `-medalState.upperCost` (fix del 12-10, dopo rev. 95). Il dettaglio
  della medaglia (`FUN_0072f1e0`, 0x7308b4) stampa invece il `cost` del master senza sottrarre
  nulla: li' 46 resta 46 anche nell'originale 4.3.1.
- Il risultato del server coincide con l'anteprima del client (pallini, sblocco della guilt): se il
  client calcola diversamente (es. guilt con `isGuilt` 0) il dettaglio dopo la fusione lo mostra.
