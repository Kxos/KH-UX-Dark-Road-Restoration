# Orologio finto del server: mesi gemelli e scadenze vere

Data: 16 ottobre 2026. Stato: **bozza da rivedere** (idea dell'utente, raffinata in chat; 3.6 deciso il 16-10; revisioni 16-10: calcoli in ora reale, scadenze precalcolate, confine mensile alle 08:00, date salvate in ora reale).

## 1. Obiettivo

Far scorrere il tempo del gioco come quello reale (giorni, settimane, mesi) restando in un intervallo
di date «sicure» per il client, così che:

- i conti alla rovescia di Daily, Weekly e Limited mostrino il tempo vero che manca all'azzeramento
  (oggi Weekly e Limited dicono «28719 days left»);
- gli azzeramenti di Daily e Weekly avvengano davvero anche se il server viene riavviato (oggi l'ora
  riparte dal 15/5/2021 12:00 a ogni avvio: riavviando il giorno dopo il server crede di essere
  ancora nello stesso giorno);
- la rotazione delle Limited (mese/settimana) segua lo stesso calendario.

Criterio di successo: al banco, in qualunque giorno reale, la Daily mostra le ore fino alle 08:00
UTC reali, la Weekly i giorni fino al prossimo lunedi' 08:00 UTC, la Limited mensile i giorni fino a
fine mese reale; dopo un riavvio del server i valori restano coerenti.

## 2. Fatti verificati

- I conti alla rovescia seguono l'**ora del server** (`serverTime` del login), non quella del
  dispositivo (banco 16-10: guest al 10/1/2021, server al 15/5/2021, Daily «19 hours left»;
  `docs/notes/server.md#master`).
- Daily: il client conta fino a `startDate + k*86400` della riga master ([fn]). Weekly e
  Limited: mostra `endDate` della riga. Le scadenze di Weekly e Limited vengono quindi **solo dal
  master**.
- Il client riscarica **tutte** le 106 tabelle quando cambia la revisione globale (la revisione per
  tabella e' ignorata); costo misurato: login di 19-77 s secondo lo stato dell'emulatore (14-26 s
  senza master nuovo).
- Il dispositivo deve restare prima del 29/6/2021 (popup «End of Service» locale): problema
  separato, **fuori da questo design** (ISSUES I-128).

## 3. Design

### 3.1 Data finta: mesi gemelli

Per ogni mese reale si sceglie un **mese gemello** fra maggio 2016 (uscita WW) e maggio 2021: stesso
giorno della settimana del giorno 1 e stessa lunghezza. La data finta e' la data reale con anno e
mese sostituiti da quelli del gemello, **stessa ora UTC**. Esempio: venerdi' 16/10/2026 15:00 ->
venerdi' 16/10/2020 15:00.

- Coincidono con quelli reali: giorno della settimana, giorno del mese, ora, fine settimana, fine mese.
- Tutti i mesi di 30 e 31 giorni hanno un gemello (verificato per i 7 giorni d'inizio). Fra piu'
  gemelli si prende il piu' recente.
- **Ripiego per febbraio** (28 giorni con inizio martedi'/sabato/domenica, 29 giorni con inizio
  diverso da sabato; primo caso reale: febbraio 2028): si usa un febbraio di 28 giorni qualunque
  (il piu' recente). Per quel mese il giorno della settimana mostrato e' sfasato; azzeramenti e conti
  alla rovescia restano esatti (3.2). Per un febbraio bisestile reale il 29 cade nel 1° marzo finto.
- **Gemello fissato al login.** Il client prende l'ora del server al login e poi la fa scorrere da
  solo. Il server sceglie quindi il gemello a ogni login (`/khux/login`) e tiene quello scostamento
  (data finta = data reale + scostamento) fino al login successivo. Se la sessione attraversa la fine
  del mese, la data finta prosegue nel mese successivo del calendario finto (31/10/2020 ->
  1/11/2020) invece di saltare al gemello del nuovo mese reale (che puo' essere, ad esempio, giugno
  2019): client e server vedono sempre la stessa data, AP, training e regali restano coerenti. Le
  scadenze si calcolano nello stesso riferimento. Lo scostamento si salva (`player.clockOffset`)
  solo per sopravvivere a un riavvio del server a gioco aperto; a ogni login si ricalcola.
- Lo scostamento dipende **solo dal mese reale del login**, contato con lo stesso confine della
  scadenza mensile (dal giorno 1 alle 08:00 UTC, cioe' il mese di «adesso - 8 ore»): due login nello
  stesso mese danno lo stesso scostamento e il master in cache nel client resta valido; cambia
  esattamente insieme alla revisione mensile (3.3). Con il confine a mezzanotte, chi entrava fra le
  00:00 e le 08:00 del giorno 1 avrebbe avuto ora nuova e master vecchio (scadenze sbagliate per 8 ore).
- Limite di sicurezza: se una sessione lunghissima portasse la data finta oltre il 28/6/2021, il
  server la ferma al 28/6/2021 23:59 fino al login successivo.

### 3.2 Due regole: calcoli in ora reale, ora finta solo verso il client

- **Ogni periodo e ogni scadenza si calcolano sull'ora reale**: giorno = da 08:00 UTC reali, settimana
  = da lunedi' 08:00 UTC reali, mese = dal giorno 1 08:00 UTC reale. Contatori delle missioni,
  rotazione Limited, consegna nei Presents, `weeklyLux` usano solo questi indici.
- **L'ora finta serve solo a cio' che si manda al client**: `serverTime`, orari delle risposte
  (`lastApDatetime`, `recoverDatetime`, `limitDatetime`, `getDatetime`, `beginnerLimitTime`) ed
  `endDate` del master = istante reale + scostamento della sessione (3.1). Il server salva solo
  istanti reali (3.7).
- Cosi' il ripiego di febbraio (3.1) non sposta mai un azzeramento: sfasa solo il giorno della
  settimana mostrato, mentre i conti alla rovescia restano esatti perche' scadenza e «adesso» sono
  traslati dello stesso scostamento.
- Niente `data_weekly`/`data_monthly` salvate: si ricalcolano (la «data_locale» dell'idea originale
  e' la data finta del 3.1).

### 3.3 Revisione del master calcolata e scadenze scritte al volo

- `revisione = BASE + numero di scadenze (lunedi' 08:00 e inizi mese 08:00) passate dal 1/1/2026`.
  `BASE` resta il numero che alziamo noi quando cambiamo i master (oggi 117), moltiplicato per un
  passo grande (es. `BASE * 100000`) perche' le due parti non si scavalchino. Gli script di sessione
  smettono di imporre la revisione: la passano solo come `BASE`.
- Quando il client chiede le tabelle, il server riscrive **in memoria** `endDate` delle righe
  Weekly (missionType 3) e Limited (4). I file di `server/master_data` e `server/tables` non
  cambiano.
- **Scadenze precalcolate per il cambio a gioco aperto**: la rotazione e' nota in anticipo, quindi
  ogni gruppo Limited riceve la scadenza della sua **prossima** occorrenza (quello attivo la propria,
  quello della settimana/mese dopo la fine della settimana/mese dopo). Le Weekly (stesse righe ogni
  settimana) diventano due serie alternate A/B (3001-3010 settimane pari, 3011-3020 dispari), ognuna
  con la scadenza della sua prossima settimana. Risultato: quando una scadenza passa a gioco aperto,
  le missioni nuove hanno gia' nel master in cache il conto alla rovescia giusto, senza relogin.
- La revisione conta anche le scadenze dentro la sessione, ma il client la vede solo al login: al
  login successivo riscarica il master (una volta per settimana al massimo).
- Ovunque il server confronta la revisione (`/system/resourcesize`, `respondMaster`, `versionDat`...)
  usa la revisione calcolata al momento, non una costante.
- Il client scarica il master una volta a settimana e una al mese in piu' (~20 s), non a ogni login.

### 3.4 Daily

Nessuna modifica: con un'ora del server che non riparte e ha l'ora UTC reale, il conto alla rovescia
del client (`startDate + k giorni`) diventa corretto da solo (lo scostamento e' di giorni interi,
l'ora del giorno coincide); il periodo lato server si calcola sull'ora reale (3.2).

### 3.5 Limited

La rotazione usa gia' mese e settimana reali (`limitedPeriod`): resta cosi' (3.2). Le righe
ricevono `endDate` come al 3.3 (prossima occorrenza del gruppo).

### 3.6 Cambio di settimana o mese a gioco aperto (deciso con l'utente)

Il client riscarica il master solo al login. Alla scadenza vera il server **cambia subito**:

- l'avanzamento della campagna vecchia si ferma esattamente alla scadenza (Lux, quest e nemici da li'
  contano solo per la nuova): niente premi doppi tenendo il gioco aperto per giorni;
- `/user/mission/list` manda subito le righe della campagna nuova, che nel master in cache hanno
  gia' la scadenza giusta (precalcolo del 3.3);
- la riscossione di una missione della campagna vecchia viene rifiutata (risposta normale, senza
  premio; la missione sparisce dall'elenco);
- **i premi delle missioni completate e non riscosse prima della scadenza vanno nei Presents**
  (comment «Limited Mission reward» / «Weekly Mission reward», scadenza dei regali come gli altri):
  nessuno perde un premio guadagnato, niente da sfruttare. Vale anche per le Daily (stessa regola,
  una sola). **Un solo punto di controllo**: a ogni richiesta il server confronta gli indici di
  giorno/settimana/mese reali con quelli dell'ultima chiusura salvata (`player.clockSettled`);
  se uno e' avanzato, chiude i periodi passati (premi completati e non riscossi -> Presents, una
  volta per missione e periodo, `player.missions[id].received`) e aggiorna `clockSettled`.
  Costo a regime: tre confronti di interi per richiesta.
- Febbraio senza gemello: il ripiego del 3.1 va bene all'utente (16-10).

### 3.6b Velocita' del login (richiesta dell'utente)

Misure di oggi (banco LDPlayer, 16-10): login senza master nuovo 14-26 s; con il master riscaricato
(106 tabelle, 18 MB) 19-77 s secondo lo stato dell'emulatore. Lavoro del server per servire il
master: ~0,35 s (lettura, JSON, doppia cifratura di 18 MB) piu' la convalida dello schema, ripetuto
a ogni richiesta.

Regole del design:

- il master si riscarica solo quando cambia la revisione, cioe' a una scadenza settimanale o mensile
  passata (o a un nostro cambio dei master): al massimo ~5 volte al mese, mai a ogni login;
- il gemello e le scadenze al login sono calcoli di pochi microsecondi;
- **cache per revisione e data dei file**: tabelle lette, convalidate, cifrate e con md5 calcolati una
  volta, `mission` con le scadenze applicate compresa, poi servite dalla memoria (ricalcolo solo se
  cambia la revisione o un file di `master_data`); oggi le si rifa' a ogni richiesta;
- la consegna dei premi non riscossi nei Presents avviene una volta per periodo, non a ogni login.

Prova: script di misura (`tools/ldplayer/session/login-time.ps1`, da scrivere) che fa N relogin e
riporta il tempo fino a `/khux/login` e fino alla home (prima richiesta `/mypage`). Criteri: login
senza master nuovo non piu' lento di oggi (+1 s al massimo, media di 5); login con il master nuovo
non piu' lento di oggi a parita' di emulatore; lavoro del server per `/system/master` < 50 ms con la
cache.

### 3.7 Orari salvati

Il server tiene gia' alcuni tempi in ms reali (AP: `apTime`). Regola: **tutto cio' che si salva e
conta per una scadenza va in ms reali**, convertito in data finta solo quando si risponde al client.
Da convertire una volta (migrazione al primo avvio con la nuova versione):

| Campo salvato | Oggi | Dopo | Migrazione |
|---|---|---|---|
| `player.presents[].limitDatetime` | stringa finta | ms reali | +29 giorni da adesso per quelli non scaduti |
| `player.beginnerSince` | stringa finta | ms reali | adesso (riparte la finestra Beginner di 30 giorni) |
| pet training `readyAt` | ms dell'ora finta | ms reali | pronto subito |
| `getDatetime` di medaglie, keyblade, parti dello Spirit, sfere | stringa finta | ms reali | spostate in blocco in modo che la piu' recente sia l'istante della migrazione (l'ordine resta) |
| `player.pet.expedition` mese del training («This Month's Training») | mese finto | indice del mese reale | si tiene il conteggio del mese corrente |

Con i `getDatetime` in ms reali, cambiare gemello fra due login non mescola l'ordine «piu'
recenti» della Medal List: tutto si converte con lo scostamento della sessione corrente.

`player.missions[].period` e `player.weeklyLux.period` diventano indici sull'ora reale (3.2):
cambiano scala una volta (al primo avvio si azzerano i contatori del periodo corrente, senza
consegne nei Presents per quel passaggio).

### 3.8 Componenti

- `server/clock.js` (nuovo, senza dipendenze, ora reale iniettabile per le prove):
  `twinOffset(realMs)`, `fake(realMs, offset)`, `dayIndex/weekIndex/monthIndex(realMs)`,
  `weekEnd(realMs)`, `monthEnd(realMs)`, `masterRevision(base, realMs)`, tabella dei gemelli.
- `server/tables/mission.json`: Weekly in due serie A/B (3.3).
- `server/server.js`: `serverTime()`/`serverTimeAt()` usano `clock`; `respondMaster`/`masterBody`
  applicano le scadenze al volo e la revisione calcolata; migrazione del 3.7.
- `server/pet.js`: training e `getDatetime` delle parti in ms reali, mese del training reale.
- Script di sessione: `-Revision` diventa la `BASE`.
- `KHUX_SERVER_TIME` resta per le prove (data finta fissa, come oggi).

### 3.9 Prove

- `server/test-clock.js` (offline): gemelli per tutti i mesi 2026-2035 (giorno della settimana,
  giorno del mese, lunghezza, ripiego di febbraio), funzione monotona dentro un mese, fine
  settimana/mese, revisione che cambia solo alle scadenze, data sempre fra 5/2016 e 28/6/2021,
  confine del mese alle 08:00 del giorno 1 (scostamento e revisione cambiano insieme), chiusura dei
  periodi una sola volta (nessun premio doppio nei Presents, anche dopo un riavvio).
- Prova delle scadenze al volo: tabelle `mission` servite con `endDate` = fine settimana/mese.
- Banco: Daily/Weekly/Limited con i giorni veri; riavvio del server -> stessi valori; un cambio di
  settimana simulato (`KHUX_REAL_NOW` per spostare l'ora reale nelle prove) -> master riscaricato,
  nuova campagna.

## 4. Fuori da questo design

- La data del dispositivo (I-128) e la scelta di dove girera' il server.
- Banner dello Shop (`/gacha/*`) per spendere i biglietti delle Limited.
