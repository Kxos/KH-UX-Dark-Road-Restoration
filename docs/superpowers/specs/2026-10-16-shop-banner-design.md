# Shop: banner delle estrazioni, catalogo, sblocchi e rotazione — design

Stato: approvata (16-10-2026). Decisioni prese con l'utente nella discussione del 16-10.

## 1. Obiettivo

Rendere disponibili nello Shop tutti i banner di estrazione originali della versione mondiale (813,
7/4/2016 - 29/6/2021) senza modificare l'APK, in modo che:

- la lista dello Shop resti corta e leggibile (catalogo con filtri invece di 800 piastre);
- le medaglie arrivino con il ritmo dell'epoca: un banner si sblocca con la storia, alla quest uscita
  nello stesso periodo del banner;
- ogni settimana succeda qualcosa (rotazione dei banner a tempo, stagionali nel loro periodo);
- i biglietti ottenuti (Platinum, Draw Ticket, Spooky Cookie, ...) si possano spendere.

Criteri di successo: con la storia attuale (quest 1-525) si estrae dai banner fino all'11/01/2017 (78);
lo Shop mostra al massimo una decina di piastre; dal catalogo si trova qualunque banner e il suo
stato; nessun pulsante dello Shop porta a un acquisto in-app o a un crash.

## 2. Vincoli

- APK originale non modificato: si cambiano solo risposte del server, tabelle master, risorse
  scaricabili e pagine WebView.
- Repo: solo codice e documentazione originali. Immagini dei banner, testi e icone derivate stanno
  fuori dal repo (reference\banners\img, risorse generate da script del repo).
- Obiettivo del progetto: storia fino alla quest finale 979 (oggi il server arriva alla 525). Tutto
  cio' che dipende dalla storia usa i numeri 1-979, senza tetti alla 525.
- Ogni differenza dall'originale va spiegata nelle Notices (regola dell'utente del 16-10).

## 3. Fatti verificati (prove del 16-10, D:\Progetto_Restauro_KH_UX\tmp\spike_catalog\notes.md)

Client (Shop, `ShopDraw_3Plate_ver340`, piastre `ShopDraw_3Plate_Plate_ver310`):

- La lista e' verticale, ordinata per `sortId`; nessuna scheda o filtro nativo. Il client usa una sola
  variante di piastra (ver310): i pulsanti di estrazione non si possono nascondere.
- `GET /gacha/list` (azione 75) viene richiesto **a ogni apertura dello Shop**. Risposta: `gachaList[]`
  e `petGachaList[]` (obbligatorio, anche vuoto; senza: «200 ERROR :75»). Campi obbligatori di
  `gachaList[]` (FUN_0079541c): validAdd, drawMedalTypeId, drawType, sortId, payType, price, lotCount,
  isDayLimited, userLimitedCount, userWarrantDisplayOfTime, name, description, bannerUrl,
  warrantMedalIds[]; letto anche drawTicketlimitDate.
- Ogni piastra richiede una riga del master `drawMedalType` con lo stesso id (letta senza controllo:
  senza riga, crash). Dalla riga: `detailUrl` (pulsante Details -> WebView nostra, verificato),
  `comment` (striscia scorrevole sotto il banner, visibile se validComment e
  1 <= userWarrantDisplayOfTime <= warrantDisplayOfTime; e' una stringa di formato printf: niente `%`
  sciolti), `benefitId`, `displayTimeLeft` (riquadro del tempo residuo), date.
- `bannerUrl`: immagine 640x140 scaricata dal client via http dal nostro server.
- Draw Odds apre il link globale `odds` del login (uno per tutti i banner).
- Lucchetto nativo (`benefitId` != 0 senza benefit attivo): mostra il pannello col lucchetto e
  disattiva l'estrazione, ma il tocco sul lucchetto apre l'acquisto in-app di un prodotto Shop
  (FUN_009c7020): **non usarlo** (crash, o acquisto in-app).
- Pulsante di estrazione con biglietti (payType 4-9) e biglietti < prezzo: grigio, il tocco non fa
  nulla e non arriva al server (FUN_00a1509c). Prezzo 0 = estrazione immediata senza conferma: mai 0.
  payType 1/3 (gemme) con fondi insufficienti propone l'acquisto di gemme. payType 9 manda in crash
  lo Shop (testo 106240303 mancante).
- «Buy discounted jewels» e' cablato all'acquisto in-app: non riutilizzabile.
- Texture mancanti aggiunte nelle risorse 39 (commit 77a1512, 35a8a3b): ShopBut_Lock,
  ShopBut_Lock_Disable, But07_Disable.

Dati (fuori dal repo):

- `reference\banners\banners_ww.tsv` (+ `.md`): 813 banner (680 sicuri, 132 probabili), date,
  stato permanent/time-limited, ricorrenza, stagione, evento, medaglie in vetrina, moneta, prezzo,
  dimensione dell'estrazione, garanzie, immagine (798 con immagine, 726 gia' 640x140). Probabilita'
  mai pubblicate (solo quelle delle abilita').
- `reference\story\story_release_ww.tsv`: data di uscita mondiale di ogni tranche della storia
  (1-979, 74 tranche).

## 4. Decisioni

### 4.1 Piastra «Banner Catalog»
Prima piastra, sempre in cima. Banner nostro 640x140, `comment` con la didascalia («Open Details to
browse all banners»), `detailUrl` = pagina del catalogo. Estrazione innocua: drawType 1, payType 6
(Gold Ticket, `drawTicket3`, che il server non assegna mai), price 1, benefitId 0. I testi e l'icona
del Gold Ticket (106140420-424, `Star7_Ticket_39` col segno «仮») vengono riscritti nelle risorse
cosi' che il riquadro grigio dica «Open Details to browse the Banner Catalog» con un'icona adatta. Se
un giorno il Gold Ticket servisse, la piastra passa a un altro biglietto inutilizzato.

### 4.2 Banner disponibili ora
Un banner e' **disponibile** se e' sbloccato (4.4) e in questo momento:
- e' un **fisso della sua epoca** (4.5), oppure
- e' **in debutto** (7 giorni dallo sblocco), oppure
- e' **stagionale** del periodo corrente (4.6), oppure
- e' tra i **3 in rotazione** della settimana (4.6).
Gli altri non compaiono nello Shop; si vedono solo nel catalogo.

### 4.3 Lista dello Shop (ordine)
1. Banner Catalog; 2. stagionali attivi (precedenza); 3. in debutto e in rotazione; 4. il **gruppo
scelto** nel catalogo, ristretto ai disponibili; senza scelta: **«Novita'»** = disponibili sbloccati
di recente + quelli pagabili con i biglietti posseduti. Un banner compare una volta sola.

### 4.4 Sblocchi con la storia
Condizione di ogni banner: «superata la quest della storia N», con N = la quest che precede la prima
della tranche WW in corso alla data di inizio del banner (l'ultima riga di story_release_ww.tsv con
data <= inizio: N = first_quest - 1; il lancio del 2016-04-07 da' 0, la tranche 201-250 da' 200)
(decisione dell'utente del 17-10: al lancio WW le quest 1-200 uscirono insieme e i banner del lancio
erano estraibili dal primo giorno). Oltre la storia restaurata (oggi 525) i banner
restano bloccati: nel catalogo «Unlocks after Story Quest N — coming with a future update». La
regola non cambia quando arrivano le quest 526-979. Il banner del tutorial resta solo nel tutorial.

### 4.5 Fissi della loro epoca
Un banner `permanent` e' sempre disponibile mentre la **data del punto nella storia** del giocatore
(data di uscita dell'ultima quest superata) cade nella sua epoca originale (inizio-fine). Dopo la fine
della sua epoca entra nel gruppo «archivio» della rotazione.

### 4.6 Rotazione e stagionali
- Ogni lunedi' 08:00 UTC (stessi confini dell'orologio finto) il server sceglie **3 banner** tra i
  banner a tempo sbloccati, non in debutto, non stagionali: **2 dal gruppo «recenti»** (inizio entro
  **6 mesi originali** prima della data del punto nella storia) e **1 dall'«archivio»** (tutti gli altri
  sbloccati, compresi i fissi a fine epoca). In ogni gruppo ha la precedenza il banner fermo da piu'
  tempo; scelta fissa per tutta la settimana e salvata (sopravvive ai riavvii). Se un gruppo non ha
  banner, il posto resta vuoto (inizio gioco). Finestra di 6 mesi e numero di posti regolabili.
- **Stagionali**: nel periodo della stagione (Halloween, Natale, Capodanno, San Valentino, Pasqua,
  anniversario, estate, ... date dell'originale riportate sul calendario reale) compare la **versione
  piu' recente sbloccata** di quel banner stagionale; nessuna se nessuna e' sbloccata.
- I biglietti stagionali (Spooky Cookie, Holiday Draw Ticket, ...) si spendono nei banner del loro
  periodo.

### 4.7 Missioni Limited e biglietti
Le campagne Limited che danno biglietti (Platinum, Draw Ticket, Holiday Draw Ticket, Moogle Point,
Spooky Cookie) entrano nella rotazione delle Limited **solo quando e' sbloccato un banner che spende
quel biglietto**. Prima non escono (modifica di `limitedActive`/rotazione in server.js).

### 4.8 Estrazione, probabilita', garanzie, prezzi
- Prezzi, moneta, dimensione (x1/x3/x5/x10/x11), limite giornaliero (`isDayLimited`) e medaglie in
  vetrina: **originali** (banners_ww.tsv).
- Probabilita' e garanzie: originali dove documentate, altrimenti **ricostruite per tipo di banner**
  (tabelle per tipo: deal normale, deal con vetrina, deal a biglietti, Supernova, 7★, ...). La pagina
  dei dettagli e Draw Odds dicono quali sono originali e quali ricostruite.
- Composizione delle medaglie oltre la vetrina («set 1.1» ecc.): ricostruita per epoca dalle medaglie
  uscite fino a quella data (piano 2).
- Entrate di gemme: dopo il piano 1 si misura quante gemme guadagna in una settimana un giocatore
  normale e si ritoccano i premi di missioni e quest (non i prezzi).

### 4.9 Catalogo (WebView)
Pagina servita dal nostro server, aperta solo da Details della piastra Catalog. Contenuto:
- elenco di tutti i banner con immagine, nome, date originali, stato (disponibile ora / in un'altra
  settimana o stagione / bloccato con la condizione);
- filtri: periodo di uscita, **anniversario** (Y1 7/4/2016-6/4/2017 ... Y5, Final dal 7/4/2021),
  serie/tema, medaglia contenuta (ricerca), moneta, Novita';
- scelta del gruppo: il server la salva; alla prossima apertura dello Shop vale quel gruppo; «Reset»
  torna a Novita'. Se il client non ricarica lo Shop alla chiusura della WebView, la pagina dice di
  uscire e rientrare;
- dettagli di ogni banner: medaglie, probabilita' (originali/ricostruite), date dell'originale.

### 4.10 Notices
Notice «Shop» (INFORMATION) e righe in «Differences from the original game»: catalogo dal Details
della piastra Banner Catalog; banner sbloccati con la storia; rotazione settimanale e stagionali con
precedenza; biglietti e missioni che arrivano col loro banner; probabilita' ricostruite dove
l'originale non le pubblicava.

## 5. Architettura

- `server/gacha-data.js` (nuovo): carica il catalogo dei banner generato (riga per banner: id, nome,
  date, tipo, moneta, prezzo, dimensione, vetrina, pool, quest di sblocco, stagione, immagine) e le
  tabelle delle probabilita' per tipo.
- `server/make-banners.js` (nuovo): da `reference\banners\banners_ww.tsv` e `story_release_ww.tsv`
  genera il catalogo (file dati fuori dal repo se contiene dati derivati, oppure TSV ridotto nostro) e
  le righe `drawMedalType` del master.
- `server/gacha.js` (nuovo): disponibilita' (4.2), rotazione settimanale salvata in `player.gacha`
  (4.6), lista dello Shop (4.3), estrazione (`POST /gacha/draw`: biglietti/gemme, medaglie, garanzie,
  risposta con userData/userMedals/firstGetUserMedalIds...), pagine `/web/gacha/catalog` e
  `/web/gacha/detail/<id>`, scelta del gruppo.
- `server/server.js`: rotte `/gacha/list`, `/gacha/draw`, `/web/gacha/*`, immagini `/web/gacha/img/<id>.png`
  (da reference\banners\img, ridimensionate a 640x140), link `odds`, filtro delle Limited (4.7).
- Risorse: testi e icona del Gold Ticket per la piastra Catalog (script nel repo, output fuori).

## 6. Sotto-progetti e ordine

1. **Estrazioni funzionanti**: `/gacha/list` + `/gacha/draw`, piastra Banner Catalog, biglietti e
   gemme, alcuni banner del primo anno con probabilita' per tipo; pagina di dettaglio. I biglietti
   diventano spendibili.
2. **Elenco dei banner originali**: generatore dal TSV, righe master, immagini, pool per epoca,
   tabelle di probabilita' per tipo, banner a tempo con date.
3. **Catalogo, filtri, sblocchi, rotazione, stagionali** e filtro delle Limited; Notices.

Ogni sotto-progetto ha il suo piano e le sue prove (offline + banco).

## 7. Prove

- Offline: disponibilita' e rotazione a date fisse (debutto, 2+1 posti, precedenza a chi e' fermo da
  piu' tempo, stagionali con la versione piu' recente sbloccata, scelta stabile dopo un riavvio);
  sblocchi (quest 525 -> solo i 78 banner fino all'11/01/2017; quest 1 -> solo i primi); estrazione
  (biglietti/gemme scalati una volta, garanzie, nessuna estrazione con fondi insufficienti); Limited
  con biglietti escluse finche' il banner non e' sbloccato.
- Banco: Shop con Catalog + banner veri, Details -> catalogo, scelta di un gruppo -> Shop aggiornato,
  estrazione x1/x10 con gemme e con biglietti, animazione e medaglie nuove nell'elenco, salvataggio
  coerente; nessun crash in 10 aperture dello Shop.

## 8. Punti risolti (16-10)

- **Ricarica dello Shop alla chiusura della WebView:** prova al banco anticipata al piano 1. Se lo
  Shop non si ricarica vale la riserva del 4.9 (la pagina dice di uscire e rientrare).
- **Pool per epoca e probabilita' per tipo:** tabelle proposte nel piano 2 e approvate dall'utente
  prima del codice.
- **Banner senza data di fine (60):** regola sostituita il 16-10 dalla decisione 9.8 (i notice
  smentiscono la regola «stessa serie / 7 giorni»: quei deal duravano un giorno).
- **Small Deal:** due righe. Deal a tempo 24/6/2016-8/7/2016 (notice 19084) e deal permanente dal
  4/7/2016 («07/04/16» della wiki in formato USA) fino al 14/3/2019.
- **«Common Medal Carnival»:** escluso (nessun dato, uscita WW non verificata).
- **Spirit Blind Box (`/gacha/petdraw`):** fuori da questa specifica, design proprio dopo il piano 3;
  fino ad allora le sue righe non compaiono nel catalogo.

## 9. Decisioni del sotto-progetto 2 (approvate dall'utente il 16-10)

Ricerca completa: `D:\Progetto_Restauro_KH_UX\tmp\sp2\research.md` (file di appoggio nella stessa cartella).
esearch.md` (file di appoggio nella stessa cartella).

### 9.1 Tipi
13 tipi: SN (Supernova/SN+/SN++) 213, FEATURED (vetrina o garanzia) 168, FALLING (prezzo calante) 129,
SKILL 69, DAILY 64, SEVEN (7★/Prime) 48, FREE 36, STANDARD 23, T_TICKET (Draw Ticket e valute
stagionali) 21, ITEM (medaglie oggetto) 20, T_POINTS (Draw Points) 7, BEGINNER 5, T_EVOLVE (biglietti
Bronze/Silver/Gold/Platinum) 5. Esclusi: 4 Spirit Blind Box e il banner del tutorial (B0813). Flag
indipendenti dal tipo: DAY_LIMITED, VIP, FIRST_FREE, SEASONAL, EVENT, PERMANENT, INCOMPLETE. Le 42
righe senza prezzo o dimensione si completano dal banner della stessa serie (11) o dal notice (31);
quelle che non si completano restano solo nel catalogo.

### 9.2 Probabilita' ricostruite
- Composizione degli slot (rarity_mix), pity «If bought N» e probabilita' delle abilita' sono
  originali; il resto e' ricostruito e Draw Odds/dettagli lo dicono («reconstructed»).
- Slot r★: da' r★, con probabilita' di salire di una stella solo se quella stella era estraibile alla
  data d'inizio del banner: 3->4 10%, 4->5 6%, 5->6 4%, 6->7 3%. Banner con «higher chance ... Epic»
  (Epic Medal Carnival 2016, DAILY/SMALL DEAL Epic): 3★/4★->5★ 15%.
- Slot a lista («one of the following»): uniforme, medaglia in vetrina peso ×2.
- Pity per giocatore e per banner: alla N-esima estrazione senza vetrina lo slot garantito da' la
  vetrina; «within N draws» uguale; «every 3rd draw» = ogni 3a estrazione lo slot a lista.
- Non riprodotti: medaglie «boosted», Trait Medal, Imitation Medal (non esistono nel master). Magic
  Mirror e gemme dei bonus vanno nel Present Box.
- SKILL: lo slot con abilita' usa la tabella del notice 50106; le altre medaglie senza abilita'.
- T_EVOLVE: Bronze LV1-3, Silver LV4-8 (LV3-8 prima del 14/09/2018), Gold LV5-8, Platinum Dual Meow
  Wow LV7-9; livello piu' alto della fascia 10%, gli altri in parti uguali.
- T_TICKET: pool d'attacco dell'epoca + medaglie di supporto 5★.

### 9.3 Pool
- Note «Draws from sets ...» (513 banner): unione esatta dei sotto-set citati, con i filtri citati.
- «Draws from the following medals» (6): lista esplicita.
- Note mancanti (288): lista dell'ultimo banner documentato dello stesso tipo (o di qualunque tipo)
  + medaglie standard uscite dopo ed entro l'inizio + liste delle garanzie.
- Vetrina e liste di garanzia entrano sempre.
- Rarita': solo quelle del rarity_mix, ogni variante solo se uscita entro l'inizio (6★ estraibili dal
  15/07/2016, 7★ dal 25/05/2018, SN dal 05/10/2018, SN+ dal 2019-09, SN++ dall'08/11/2019).
- Banner permanenti: pool alla data del punto nella storia del giocatore, limitata a [inizio, fine].
- Le medaglie con id >= 300000 sono incluse (senza, 448 banner avrebbero rarita' vuote); prova al
  banco della scena di risultato con questi id.
- Corregge gli anacronismi del sotto-progetto 1: B0011 senza 6★ e senza set 2.2; B0001/B0027 con pool
  che cresce con la storia; B0456 con Dual Meow Wow LV7-9.

### 9.4 Estrazioni gratuite
Mai prezzo 0: payType 1, price 1 (1 Jewel scalato davvero). isDayLimited dove l'originale aveva
«once per day». FIRST_FREE e FALLING: prezzo dinamico per giocatore in `/gacha/list` (contatore delle
estrazioni del banner in `player.gacha`): 1a estrazione 1 Jewel, poi prezzo pieno o lo scalino.

### 9.5 VIP
- 41 banner VIP con un gemello normale nella stessa data: nascosti (nel catalogo «VIP variant, not
  reproduced»).
- 27 senza gemello: banner normali per tutti.
- 17 Free Deal VIP 2020-21: tenute, ma **una sola estrazione gratuita al giorno fra tutte quelle
  attive**, e **bilanciate come tutti gli altri banner** (richiesta dell'utente): stesso sblocco con la
  storia (4.4), pool e rarita' della loro data (9.3), probabilita' delle tabelle 9.2, nessun aiuto in
  piu' rispetto all'originale. Cosi' non danno medaglie forti o di livello alto a inizio gioco.

### 9.6 Gold Ticket
Opzione A: Ticket Draw Bronze/Silver/Gold solo nel catalogo («Requires PvP tickets — coming with a
future update») finche' non c'e' il PvP; la piastra Catalog resta su payType 6. Con il PvP: opzione B
(verificare se i testi del pulsante dipendono dal drawType e separare Catalog e Gold Ticket Draw);
riserva C (niente Gold Ticket, Gold Ticket Draw pagato con 2 Silver Ticket, spiegato nelle Notices).

### 9.7 Valute stagionali e Draw Points
Spooky Cookie, Moogle Point, Holiday Draw Ticket e Draw Ticket usano payType 8 (limitedDrawTicket2):
contatori separati nel salvataggio; la lista non elenca mai insieme banner payType 8 di valute
diverse, e `limitedDrawTicket2` riporta il contatore della valuta elencata. Prezzi nelle unita'
originali. Draw Points (payType 9, oggi crash per il testo 106240303 mancante): rinviati, solo
catalogo.

### 9.8 Date di fine
Le 60 righe senza fine: 51 prendono il periodo dal notice in cache; le altre della stessa serie
(Supernova Deal settimanali 2019, Free Deal, FFBE Campaign Rewards Draw) durano 1 giorno; Beginner's
B0623 fino all'11/10/2020, B0735 fino al 24/02/2021; Draw Points B0794 fino al 29/06/2021. Il catalogo
segna le date ricostruite.

### 9.9 Immagini
Tutte 640x140 in PNG a 256 colori (~32 MB invece di ~129): ridimensionamento LANCZOS per le 80 di
altre misure. Le 14 mancanti: immagine del banner della stessa serie, oppure piastra generata (nome
su fondo neutro, script nel repo, output fuori). Prima prova al banco che il client legga un PNG a
palette; se no, PNG a colori pieni.

### 9.10 File dei pool
Per ogni banner una ricetta (sotto-set, liste di nomi, rarita', data di riferimento) piu' la tabella
dei sotto-set; il server la espande all'avvio (~0,3 MB invece di 2,7). Tutti i dati derivati restano
fuori dal repo (`server/game_data/`).
