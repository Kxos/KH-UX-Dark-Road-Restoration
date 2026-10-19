<a id="guilt"></a>
# Guilt e Level Up con medaglie speciali (I-079, I-080)

Analisi del 12 ottobre 2026 (agente): fonti in `reference\guilt` (guida dell'utente p.16/20/21, khuxwiki). Regole, campi del client (`attackUpperNumber`, `defenseUpperNumber`, `burstUpperNumber`, `upperCost`, `guiltFactor` di userMedal, `[fn]`; `POST /user/medal/enhance` azione 55, `[fn]`; tabella `guiltProb`, `[fn]`) e regole in `server/medal-guilt.js`. Brooms = Magic Broom (5*, materiale di Evolve), Mickey & Brooms = Fantasia Mickey B (6*, type 8): prima assenti dal master (make-game-tables.js scartava le righe di Roboloid senza attributo).

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
- `guiltBurstFirstLv/MaxLv` = livello d'ARRIVO del popup «NOVA LEVEL UP!» (`guiltBurst().gained()`): il client
  (`[fn]` -> `[fn](scena, da, a)`) mostra «LV <suo livello> » LV <campo>», quindi prima guilt =
  livello dopo i +1, guilt massima = livello dopo anche i +5, 0 = nessun popup (commit bad55f1: con l'aumento il
  banco mostrava «LV 6 » LV 1»). Popup acceso per default dal sotto-progetto 2b (LWF JP
  `GuiltBonus_BurstLvup(_num)`, `GuiltBonus_Wfix0..9`, layout `MedalInfo_Burst_Info.json`, logo «NOVA» di
  `make_nova_logo.py`, risorse 41); `KHUX_GUILT_BURST_POPUP=0` lo spegne. Chiave del registro: `groupId ||
  medalId` (una boosted e la sua normale contano una volta, U7 provato al banco).
- Estrazioni (`respondGachaDraw`, sotto-progetto 2b): guilt e pallini solo da un preset del banner, piu' la regola
  originale delle 7★ di Tier 9-10 (decisione 13-bis, `gacha-data.MAX_GUILT_FROM`): pallini e guilt al massimo del
  Tier, boosted comprese, per le Tier 9 da banner con data dal 2019-01-01 (notice 48236) e le Tier 10 dal 2019-09-01
  (notice 56838); prima solo col preset ([shop.md#sp2b](shop.md#sp2b)).
- `userDetail.isGuilt = isGuiltUnlocked()`: missione numero >= 34 (Power Bangle; `stageNumber` di
  `lastClearStageId`), oppure sempre 1 con `KHUX_GUILT_BURST_LV` > 0 (prove del Burst). Il client
  ([fn], [fn]) permette sblocco/rilancio e Magic Mirror solo con `isGuilt`; il
  pulsante Burst resta nascosto finche' `guiltBurstLv` e' 0 ([fn]). La riga del supporto
  (`supportUsers`, isGuilt 0) non cambia.
- `module.exports._test`: funzioni per `test-medal-enhance.js`.

- Eccedenza dei pallini (banco 18-10, Vexen [+] 2 pallini + due copie da 1: il client ha mostrato lo sblocco
  con «00%», il server aveva perso l'eccedenza): l'anteprima del client ([fn], [fn]) somma
  1 + pallini di ogni copia; se pallini della base + somma > massimo (stretto) alza il flag di sblocco
  (scena +0x524, ~0x00c826a8) e la copia che sfora e' l'ultima selezionabile. Con guilt > 0 una sola copia
  (rilancio, +0x523, popup «Bonus range»); guilt al massimo: la copia tira un trait (+0x525). La guilt
  della copia non si legge mai; un solo tiro per fusione. Il risultato ([fn]) mostra solo il
  guiltFactor della risposta. `applyEnhance` segue questa regola; caso del banco in `test-medal-guilt.js`.
- <a id="banco-1910"></a>**Provato al banco il 19-10** (rev 128, risorse 43, server con `-GachaShow B0280`):
  Vexen [+] 2865 mostra «+201%» giallo in Medal List e dettaglio. Rilancio: 2865 (5 pallini, 20100) + copia da
  2 pallini -> popup «Attempt to raise special attack bonus from +201%? Bonus range +150 - 230%. Outcome won't
  lower current bonus %.», tiro 19300 < 20100, guilt resta 201% (giusto). Sblocco per eccedenza: copia da 3
  pallini + copia da 2 (3 + 1 + 2 = 6 > 5) -> nessun popup, risultato ●●●○○ -> ●●●●● e riga «Special Attack
  +171%», server 17100: anteprima e risultato coincidono. Entrambe le fusioni con `isGreatSuccess` 1 dal
  client (EXP x1,5: 34.222 -> 51.333, l'anteprima mostra l'EXP senza il Great Success).
- <a id="lwf-originali"></a>**Animazioni originali (19-10, risorse 44)**: `lwf/medal/guilt_bonus/GuiltBonus` (sblocco/rilancio),
  `GuiltBonus_result`, `GuiltBonus_max` (guilt al massimo, logo «MAX») e le cifre `GuiltBonus_Yfix0-9`/`Rfix0-9`
  erano NOSTRE (`make_guilt_bonus_lwf.py`, ora solo ripiego); gli originali ci sono nei dati JP 4.3.1 (thethiny)
  e li importa `import_jp_raisedraw.py` nel pacchetto raisedraw_gen. L'esportazione JP salva una texture
  condivisa solo nella prima cartella che la usa: fonte per NOME originale esatto + dimensioni dichiarate
  (`name_index`/`by_name`, solo cartelle della guilt, mai «ビットマップ N»): cifre gialle di Yfix e _result da
  `GuiltBonus`, KeyBlade_ef1/ef2 da altre LWF JP, KeyBlade_ef6/ef8/star01 dalla LWF WW
  `lwf/battleresult/Result_LuxLevelUp`. Unico sostituto: `png_logo_guilt_bonus2.png` (336x35, in _result e _max,
  assente da ogni fonte e da ogni revisione) = `png_logo_guilt_bonus.png` (stesso logo «GUILT BONUS», stesse
  dimensioni); rapporto in `raisedraw_gen\raisedraw_report.json` (classi name-jp, name-ww, substitute). Copia
  delle LWF nostre tolte: `D:\Progetto_Restauro_KH_UX\tmp\guilt_ours_backup`.

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
  [fn] (animazioni `[fn](…,7/8)`: controllare che i LWF esistano).
- STR nel dettaglio = STR del livello + attackUpperNumber.
- Costo (banco rev. 95: Cid 90076 = -1 come la khuxwiki, ma «Cost 46» invariato): `upperCost` e'
  un int con segno, la variazione del costo, negativa per Cid. `[fn]` (costruzione
  dell'oggetto medaglia dal `userMedal` di `[fn]`, struttura +0x28) scrive oggetto +0x2c =
  **-upperCost**, e tutti i lettori usano `cost - (+0x2c)`: somma del costo del deck
  (`[fn]`), confronto per l'ordinamento (`[fn]`), Optimize (`[fn]`),
  limite dell'anteprima (`[fn]`: `minCost < cost - (+0x2c) - accumulato`), effetto 6 del
  risultato (`[fn]`: se +0x2c sale). Il server mandava +1 (costo effettivo 47): ora
  `userMedalElement` manda `-medalState.upperCost` (fix del 12-10, dopo rev. 95). Il dettaglio
  della medaglia (`[fn]`, 0x7308b4) stampa invece il `cost` del master senza sottrarre
  nulla: li' 46 resta 46 anche nell'originale 4.3.1.
- Il risultato del server coincide con l'anteprima del client (pallini, sblocco della guilt): se il
  client calcola diversamente (es. guilt con `isGuilt` 0) il dettaglio dopo la fusione lo mostra.
