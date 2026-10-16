# Orologio finto del server: mesi gemelli e scadenze vere

Data: 16 ottobre 2026. Stato: **bozza da rivedere** (idea dell'utente, raffinata in chat; 3.6 deciso il 16-10).

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
  tabella e' ignorata); costo misurato: login di ~19-50 s secondo l'emulatore.
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
  (il piu' recente). Per quel mese giorno della settimana e scadenza settimanale finti sono sfasati;
  la Weekly usa comunque la scadenza calcolata sul calendario finto, quindi resta coerente con il
  conto alla rovescia mostrato. Per un febbraio bisestile reale il 29 cade nel 1° marzo finto.
- La data finta e' una **funzione pura** dell'ora reale: niente da salvare, uguale dopo ogni riavvio.

### 3.2 Scadenze calcolate, non salvate

- `fineSettimana(reale)` = prossimo lunedi' 08:00 UTC; `fineMese(reale)` = primo giorno del mese
  successivo 08:00 UTC. Entrambe si traducono in data finta con la funzione del 3.1 (per la fine
  mese: il giorno 1 del gemello del mese successivo, che puo' non essere il mese dopo nel
  calendario finto).
- Nessuna `data_weekly`/`data_monthly` salvata: si ricalcolano dall'ora reale (niente stato da
  riparare dopo un crash). La «data_locale» dell'idea originale e' la data finta del 3.1.

### 3.3 Revisione del master calcolata e scadenze scritte al volo

- `revisione = BASE + numero di scadenze (lunedi' 08:00 e inizi mese 08:00) passate dal 1/1/2026`.
  `BASE` resta il numero che alziamo noi quando cambiamo i master (oggi 117), moltiplicato per un
  passo grande (es. `BASE * 100000`) perche' le due parti non si scavalchino. Gli script di sessione
  smettono di imporre la revisione: la passano solo come `BASE`.
- Quando il client chiede le tabelle, il server riscrive **in memoria** `endDate` delle righe
  Weekly (missionType 3) e Limited (4) attive con la fine settimana/mese finta corrente. I file di
  `server/master_data` e `server/tables` non cambiano.
- Il client scarica il master una volta a settimana e una al mese in piu' (~20 s), non a ogni login.

### 3.4 Daily

Nessuna modifica: con un'ora del server che non riparte e ha l'ora UTC reale, il conto alla rovescia
del client (`startDate + k giorni`) diventa corretto da solo; il periodo lato server si calcola
sull'ora finta come oggi.

### 3.5 Limited

La rotazione oggi usa mese e settimana reali (`limitedPeriod`): resta cosi', e con i gemelli coincide
con il calendario finto. Le righe attive ricevono `endDate` = fine mese (mensile) o fine settimana
(breve), come al 3.3.

### 3.6 Cambio di settimana o mese a gioco aperto (deciso con l'utente)

Il client riscarica il master solo al login. Alla scadenza vera il server **cambia subito**:

- l'avanzamento della campagna vecchia si ferma esattamente alla scadenza (Lux, quest e nemici da li'
  contano solo per la nuova): niente premi doppi tenendo il gioco aperto per giorni;
- `/user/mission/list` manda subito le righe della campagna nuova; fino al prossimo login il client
  le mostra con la scadenza del master che ha in cache (difetto solo di visualizzazione);
- la riscossione di una missione della campagna vecchia viene rifiutata;
- **i premi delle missioni completate e non riscosse prima della scadenza vanno nei Presents**
  (comment «Limited Mission reward» / «Weekly Mission reward», scadenza dei regali come gli altri):
  nessuno perde un premio guadagnato, niente da sfruttare. La consegna avviene alla prima richiesta
  dopo la scadenza (elenco missioni, /mypage, Presents), una sola volta per missione e periodo
  (`player.missions[id].received`).
- Febbraio senza gemello: il ripiego del 3.1 va bene all'utente (16-10).

### 3.7 Orari salvati

Il server tiene gia' alcuni tempi in ms reali (AP: `apTime`). Regola: **tutto cio' che si salva e
conta per una scadenza va in ms reali**, convertito in data finta solo quando si risponde al client.
Da convertire una volta (migrazione al primo avvio con la nuova versione):

| Campo salvato | Oggi | Dopo | Migrazione |
|---|---|---|---|
| `player.presents[].limitDatetime` | stringa finta | ms reali | +29 giorni da adesso per quelli non scaduti |
| `player.beginnerSince` | stringa finta | ms reali | adesso (riparte la finestra Beginner di 30 giorni) |
| pet training `readyAt` | ms dell'ora finta | ms reali | pronto subito |
| `getDatetime` di medaglie, keyblade, parti, sfere | stringa finta | invariato | nessuna (solo visualizzazione) |

`player.missions[].period` e `player.weeklyLux.period` sono indici di periodo: cambiano scala una
volta (al primo avvio si azzerano i contatori del periodo corrente).

### 3.8 Componenti

- `server/clock.js` (nuovo, senza dipendenze): `fakeMs(realMs)`, `fakeString(realMs)`,
  `weekEnd(realMs)`, `monthEnd(realMs)`, `masterRevision(base, realMs)`, tabella dei gemelli.
- `server/server.js`: `serverTime()`/`serverTimeAt()` usano `clock`; `respondMaster`/`masterBody`
  applicano le scadenze al volo e la revisione calcolata; migrazione del 3.7.
- `server/pet.js`: training in ms reali.
- Script di sessione: `-Revision` diventa la `BASE`.
- `KHUX_SERVER_TIME` resta per le prove (data finta fissa, come oggi).

### 3.9 Prove

- `server/test-clock.js` (offline): gemelli per tutti i mesi 2026-2035 (giorno della settimana,
  giorno del mese, lunghezza, ripiego di febbraio), funzione monotona dentro un mese, fine
  settimana/mese, revisione che cambia solo alle scadenze, data sempre fra 5/2016 e 5/2021.
- Prova delle scadenze al volo: tabelle `mission` servite con `endDate` = fine settimana/mese.
- Banco: Daily/Weekly/Limited con i giorni veri; riavvio del server -> stessi valori; un cambio di
  settimana simulato (`KHUX_REAL_NOW` per spostare l'ora reale nelle prove) -> master riscaricato,
  nuova campagna.

## 4. Fuori da questo design

- La data del dispositivo (I-128) e la scelta di dove girera' il server.
- Banner dello Shop (`/gacha/*`) per spendere i biglietti delle Limited.
