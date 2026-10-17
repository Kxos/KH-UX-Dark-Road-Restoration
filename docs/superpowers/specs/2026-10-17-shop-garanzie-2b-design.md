# Shop, sotto-progetto 2b: garanzie e medaglie come le dava il banner — design

Stato: approvata dall'utente il 17-10-2026 (con il numero dorato nella striscia, 4.4, e la verifica dei LWF del
popup del Nova, 4.6). Segue il sotto-progetto 2 (catalogo dei banner originali,
[shop-banner-design](2026-10-16-shop-banner-design.md) sezione 9) e chiude I-144. Fonti: audit delle garanzie del
17-10 (`D:\Progetto_Restauro_KH_UX\tmp\sp2\audit-guarantees.md`, riassunto in
[shop.md#garanzie](../../notes/shop.md#garanzie)), decisioni dell'utente
(`D:\Progetto_Restauro_KH_UX\tmp\sp2b\decisioni.md`), video del gioco originale
(`D:\Progetto_Restauro_KH_UX\tmp\sp2b\video-LFJ5.md`, fotogrammi in `reference\shop_boosted` e `reference\nova_lvup`).

## 1. Obiettivo

Ogni estrazione da' le medaglie **come le dava il banner originale**: lo slot giusto per ogni garanzia, il Tier
promesso, la pity sul bersaglio scritto, il contatore «within N draws» che scende nella striscia, e le medaglie
**gia' potenziate** quando il banner lo diceva (guilt al massimo, boosted, abilita' al livello massimo), con il
popup «NOVA LEVEL UP!» che ne segue.

## 2. Vincoli

- Client originale non modificato: si cambiano risposte del server, master, risorse scaricabili, pagine WebView.
- Repo: solo codice e documentazione nostri (i dati derivati restano in `server/game_data/`, `server/master_data/`).
- Nessuna medaglia prima della sua data (spec 9.3) ne' sopra il Tier promesso.
- Ogni differenza dall'originale nelle Notices, in inglese.
- Compatibilita': `guarantee.list/count/slot` del sotto-progetto 2 restano validi (prima riserva a lista).

## 3. Decisioni dell'utente (17-10)

1. Slot 6★ con liste che contengono Supernova solo 7★ (~100 banner 2019-20): lo slot 6★ sceglie **solo fra i nomi
   con variante 6★**; le Supernova 7★ restano negli slot 7★.
2. B0733: **due liste** come nell'immagine (3 SN+/SN++ e 7 KH III).
3. I 31 banner con «every Nth draw» nei notice: **restano pity** come nella wiki (si azzera quando la vetrina esce).
4. B0419/B0421 (scambio Gula/Aced dichiarato dal notice): **versione corretta**, l'errore citato nei Details.
5. B0319, B0402, B0403, B0412 (pity «one 6★ X» con lo slot 0 a 7★): la garantita 6★ sostituisce **il primo slot
   6★, altrimenti un 5★**; lo slot 7★ resta.
6. La pity si azzera quando la vetrina esce da sola (confermato: comportamento di oggi; ricordo dell'utente sulla
   striscia).
7. Contatore nella striscia come l'originale (punto 4.4).
8. Medaglie boosted, guilt preimpostata e abilita' al livello massimo: riprodotte (punto 4.5).
9. B0199-B0203 (deal delle HD [EX], novembre 2017): data d'inizio **24/11/2017** dal notice, al posto della regola
   allargata di `align_debut_dates`.

## 4. Componenti

### 4.1 Riserve degli slot (catalogo)

Nuovo campo `guarantee.slots[]`: le riserve nell'ordine delle frasi delle note, `{kind, slot, count, star, names,
tierMin, tierMax}`.

- `kind`: `list` (lista o medaglia nominata, `names`), `tier` (`tierMin`/`tierMax`, `names` alternativi
  facoltativi), `trait` (slot riservato a una Trait Medal: generico per il server, ma non va alla lista).
- Frasi riconosciute (tabella delle regex nell'audit, sezione 4): lista («Guarantees N of the following [N★]
  Medals [at N★]»), medaglia nominata («Guarantees one [N★] X»), Tier («one [N★] Tier N [or higher|or lower|,
  N...]»), Trait, «SN+ or SN++», pity («If bought N times ... one [N★] X», «X is guaranteed within N draws»).
- Assegnazione deterministica degli slot: le riserve con stella prendono i primi slot liberi di quella stella,
  poi le altre i primi liberi dall'alto. Decisione 1: in una riserva `list` su uno slot di stella S entrano solo
  i nomi con variante S. Override scritti a mano (tabella nel generatore, con la fonte) per i casi visti solo
  nelle immagini: B0678 (`count 1`), B0733 e B0740 (due liste), le liste non codificate (D5: B0049, B0055, B0372,
  B0695, B0721, B0725, B0726, B0734, B0739).
- Pity: `pityNames` (dalla frase; default `pool.featured`), `pityStar` (stella scritta), `pitySlot` (slot della
  riserva che contiene `pityNames`, altrimenti il primo slot di `pityStar`, altrimenti decisione 5, altrimenti 0).
  La pity da' la medaglia a stella **fissa** (`pityStar`, niente salita).
- Pity con bersaglio non d'attacco (Moogle, Blue Fairy, Dual Meow Wow SAB 9, Trait): se la medaglia esiste nel
  master (Dual Meow Wow) va nel Present Box come i bonus; altrimenti pity dichiarata «not reproduced».
- Decisione 4 (B0419/B0421) e 9 (B0199-B0203): override nel generatore con la fonte.
- Esiti attesi (dall'audit): B0306 slot 0 7★ Tier <= 4, slot 1 una delle 8 a 6★, pity HD Axel 7★ sullo slot 0;
  B0355 7★ Tier 3-4 + lista a 6★; B0629 1 New Enemy 7★ + 3 KH III 6★; B0397 Prime - KH Cloud 6★ (7★ alla pity) +
  slot Trait generico; B0321 7★ Tier 4 + Prime Axel 6★ (7★ alla 5a).

### 4.2 Tier

- `medals[n].ids` -> `[id, rarita', data, tier]`, tier = `medal.json.guiltValue` (verificato: le 24 medaglie
  «Tier 4 or lower» di B0306 hanno tutte 4).
- Gli slot `tier` filtrano il pool della loro stella per `tierMin <= tier <= tierMax`; pool vuoto -> senza filtro e
  log. 178 banner con un limite di Tier.

### 4.3 Estrazione (server)

- `rollDraw` riempie gli slot da `guarantee.slots[]` (fallback a `list/count/slot` per i cataloghi vecchi), poi
  la pity su `pitySlot`; uno slot a lista sostituito dalla pity resta garantito solo se la vetrina e' nella lista.
- `slotOdds`, Details e Draw Odds mostrano ogni riserva sul suo slot (lista, Tier, Trait), la pity con stella e
  bersaglio.

### 4.4 Contatore della garanzia nella striscia (originale)

Il client compone la striscia sotto il banner da `comment` del master come formato printf con
`userWarrantDisplayOfTime` della piastra; ci sono anche `warrantNumberOfTime`/`warrantDisplayOfTime` nel master e
`warrantMedalIds` nella piastra ([shop.md](../../notes/shop.md), GET /gacha/list).

- Banner con pity: `comment` con `%d` (es. «Featured Medal guaranteed within %d draws»; testo da allineare a quello
  dell'originale se trovato), `warrantNumberOfTime` = pity, `userWarrantDisplayOfTime` = `pity - sinceFeatured`
  (5, 4, ... e di nuovo 5 quando la vetrina esce), `warrantMedalIds` = id della vetrina.
- **Il numero delle estrazioni mancanti in colore dorato** (richiesta dell'utente del 17-10, approvazione della spec),
  per distinguerlo dal resto del testo. Ricerca nel decompilato: se la striscia accetta un markup di colore (tag di
  rich text, codici colore nel formato), il numero si scrive dorato col markup; se no, si valuta una risorsa (font o
  layout della striscia) che lo permetta senza toccare il client; se nessuna delle due e' possibile, lo si dice
  all'utente prima di scegliere un ripiego. Differenza dall'originale da dichiarare nelle Notices se il colore non era
  gia' dorato nell'originale.
- Da verificare al banco come il client usa `warrantDisplayOfTime`/`warrantMedalIds` (ricerca nel decompilato
  prima del codice). Nuova revisione del master.

### 4.5 Medaglie potenziate all'estrazione

- **Guilt preimpostata** («with ... Special Attack Bonus maxed», «SAB of N», «pre-strengthened», 104 banner): la
  medaglia nasce con `guiltFactor` al valore scritto (massimo del suo tier se «max»). Mappatura frase -> campo
  (`guiltFactor` per la guilt/SAB, `burstUpperNumber` per il livello del Special Attack «strengthened N times»)
  da confermare nella fase di ricerca con [guilt.md](../../notes/guilt.md) e [medaglie.md](../../notes/medaglie.md).
  Il Nova sale con la regola gia' in `server/guilt-burst.js` (+1 prima copia con guilt, +5 prima al massimo),
  come nel video (3306 -> 3307 -> 3312).
- **Boosted** (~40 banner, «boosted version ... with 1000 more base strength and defense»): STR +1000, DEF +1000,
  Cost -10 rispetto alla normale (video: SN++ Master Eraqus 43802/14474/36 contro 42802/13474/46), valori in
  giallo, fascia «BOOSTED» nel risultato, targhetta LV rossa nella lista; Chip/Dale restano liberi (utente). La
  fascia la disegna il client: **ricerca nel decompilato** del campo che la accende (medaglia del giocatore o
  medalId distinto del master) prima di scegliere come rappresentarla. Probabilita' «small chance»: ricostruita
  (proposta: 5% per slot idoneo, dichiarata «reconstructed»).
- **Abilita' al livello massimo** («with one of the following skills at max level», 62 banner): abilita' della
  lista a `level = maxLv` di `skill.json`, solo per le abilita' presenti (oggi 12; le altre I-146). Conteggio dei
  banner coperti del tutto nel report.

### 4.6 Popup «NOVA LEVEL UP!»

Oggi spento: nel nostro client mancano `lwf/medal/guilt_bonus/GuiltBonus_BurstLvup` e `GuiltBonus_BurstLvup_num`
(LWF nullo = crash; [battaglia.md](../../notes/battaglia.md)). **I due LWF originali esistono nei dati JP 4.3.1**
(verifica del 17-10): `thethiny_data\ KHUx data shared\khux_dev_data\data\khux_dev_jp_final_4.3.1\data\jp_final_4.3.1\
lwf\medal\guilt_bonus\GuiltBonus_BurstLvup\` (`.lwf` + Burst_Arrow, Burst_LV_Logo «LEVEL UP!», Burst_Logo, Burst_Plate,
ciascuna anche in versione `_B`) e `GuiltBonus_BurstLvup_num\` (Burst_LV_Mark); assenti negli OBB WW e nelle
versioni 1.0.1-4.4.0 della stessa raccolta. Differenza: il logo JP dice **«BURST»**, il WW **«NOVA»**
(`reference\nova_lvup`, titolo «NOVA LEVEL UP!», «LV a » LV b», messaggio «Maxed out X's Special Attack Bonus!»,
«TAP SCREEN»).

Piano: importare i due LWF JP nel pacchetto generato (come gli altri layout JP, `import_jp_coco.py`/pacchetti
statici), sostituire `Burst_Logo`/`Burst_Logo_B` con un logo «NOVA» rifatto sui fotogrammi del video (stesso formato e
misura, encode come gli originali con `btf.py`), verificare che le clip attese dal client (`FromLv`/`ToLv`, evento
`enterFrame` su `_root`) ci siano, poi accendere le liste `guiltBurstFirst/MaxUserMedalIds` (oggi solo con
`KHUX_GUILT_BURST_POPUP=1`). Il messaggio «Maxed out ...» viene dai testi del client (verificare che l'id esista in
WW). Nuova versione delle risorse.

## 5. Fuori dal 2b

- Filtri del catalogo, rotazione, stagionali: sotto-progetto 3.
- Abilita' mancanti nel master: I-146.
- Trait Medal, Imitation, Epic e set del 2016: restano dichiarati nelle Notices.

## 6. Ordine

1. Ricerca (sola lettura): campo delle boosted, uso di `warrantDisplayOfTime`/`warrantMedalIds`, mappatura delle
   frasi di guilt/SAB, formato dei LWF del popup.
2. Catalogo: `slots[]`, pity, Tier, override, potenziamenti per banner; test sui banner dell'audit.
3. Server: estrazione, medaglie potenziate, striscia con il contatore; test.
4. Pagine e Notices.
5. LWF del popup e risorse.
6. Banco: B0306 (Tier, lista, pity con il contatore che scende), B0629 (due liste), un banner con guilt al massimo
   (Nova +1/+5 e popup), un boosted (fascia e statistiche), un banner con abilita' al massimo; prova dell'utente
   con il salvataggio ridotto per il Nova.

## 7. Prove

Test offline per ogni regola (frasi dell'audit come casi), integrazione sul catalogo vero (i 171 banner delle
discrepanze tornano coerenti, 0 banner con slot riservati in conflitto), prove al banco del punto 6 con
screenshot confrontati con i fotogrammi del video.
