# Shop, sotto-progetto 3: stagionali, Limited coi biglietti, filtri del Catalog, banner fissato — design

Stato: bozza del 20-10-2026, da approvare. Segue i sotto-progetti 1, 2, 2b, 2c e la rotazione settimanale (I-165,
[shop.md#rotazione](../../notes/shop.md#rotazione)). Sostituisce le sezioni 4.2, 4.3, 4.5, 4.6, 4.7 e 4.9 della
[spec del 16-10](2026-10-16-shop-banner-design.md), rese in parte superate dalla rotazione. Fonti: audit del 20-10
(`D:\Progetto_Restauro_KH_UX\tmp\sp3_audit\report.md`), decisioni dell'utente del 20-10 (questa conversazione),
bozze approvate del Catalog (`D:\Progetto_Restauro_KH_UX\.superpowers\brainstorm\469-1792477598\content\`:
`catalog-filters-v3.html` per il flusso, `catalog-years-v4.html` opzione A per le schede).

## 1. Perche'

La rotazione per periodo di storia (I-165) porta nello Shop ogni banner nella sua epoca, ma:
- le feste del calendario vero non si sentono (Halloween a ottobre non succede niente);
- un banner il cui periodo e' passato non torna piu' nello Shop: resta solo nel Catalog;
- con 807 banner il Catalog senza filtri non si consulta;
- le missioni Limited danno Platinum Ticket e Draw Ticket centinaia di quest prima che esista un banner dove
  spenderli.

## 2. Obiettivi

1. **Stagionali sul calendario vero**: nella finestra di una stagione, in cima allo Shop, l'edizione piu' recente
   sbloccata dei banner di quella stagione.
2. **Limited coi biglietti** nascoste finche' non e' sbloccato un banner che spende quel biglietto.
3. **Catalog con schede per anno di gioco e pannello Filters** (medaglia, moneta, stato).
4. **Un banner vecchio fissato nello Shop**, scelto dal giocatore, cambiabile quando vuole.
5. Notices aggiornate per ogni differenza dall'originale.

Non obiettivi (decisioni dell'utente del 20-10):
- B0079-B0085 (sbloccati alla 525 ma fuori dalla finestra della tranche 501-525): **restano cosi'**; si risolvono
  quando la storia arriva alla 979 (obiettivo del progetto). Nessun cambio della regola di sblocco ne' del testo.
- Valute stagionali distinte (Spooky Cookie, Holiday Draw Ticket, Moogle Point): **piu' avanti**, con le campagne che
  le danno (Union Cross, Proud). Oggi tutto il tipo 41 resta Draw Ticket.
- `SHOP_MAX` resta 20.
- Debutto di 7 giorni, posti «2 recenti + 1 archivio», scelta del gruppo dal Catalog e «Novita'» della spec del 16-10:
  **tolti** (la rotazione fa gia' da debutto; il banner fissato sostituisce l'archivio; il Catalog non cambia lo Shop).

Anti-obiettivi: crash del client (piastre con lucchetto I-134, due valute payType 8 insieme); medaglie prima della loro
data (9.3); banner gratuiti o quasi gratuiti disponibili per sempre.

## 3. Vincoli

- Client originale non modificato: si cambiano risposte del server, master servito, pagine WebView.
- La chiusura della WebView del Catalog **non ricarica** `/gacha/list` (provato al banco, shop.md#prove): ogni azione
  del Catalog che cambia lo Shop deve dire «esci e rientra nello Shop».
- Il master resta fisso per la sessione (revisione fissata al login): i campi serviti in `drawMedalType` (conto alla
  rovescia) cambiano solo al login successivo.
- Repo: solo codice e documentazione nostri; dati derivati in `server/game_data/`.
- Testi del gioco in inglese, come le pagine attuali.

## 4. Stagionali sul calendario vero

### 4.1 Tabella delle stagioni (nuova, nel catalogo generato)

Ogni banner stagionale riceve un campo `season`. Le finestre sono **fisse per stagione** (decisione dell'utente):
dalla prima data di inizio all'ultima di fine fra tutte le edizioni, riportate a mese/giorno. Ricavate dai dati il
20-10:

| season | banner | finestra (mese/giorno) |
|---|---|---|
| `newyear` | B0072-B0076 (2017), B0219 (2017-18), B0774 (2021) | 22/12 - 17/01 |
| `lunar` | B0084 (2017) | 28/01 - 03/02 |
| `valentine` | B0085, B0086 (2017) | 03/02 - 17/02 |
| `anniversary` | B0106 (2017), B0272 (2018), B0493 (2019, INCOMPLETE), B0651 (2020) | 06/04 - 30/04 |
| `summer` | B0042 (2016) | 22/08 - 01/09 |
| `halloween` | B0731, B0732 (Spooky Cookies, payType 8), B0740 (2020) | 12/10 - 02/11 |
| `blackfriday` | B0066, B0067 (2016), B0621 (2019), B0752, B0754 (2020) | 22/11 - 09/12 |
| `holiday` | B0068 (2016), B0758, B0759 (2020, payType 8) | 07/12 - 06/01 |

- Le finestre che attraversano il capodanno valgono a cavallo dell'anno.
- Gli altri banner col flag `SEASONAL` nel catalogo (Thank You Draw, Prime 7★ Deal, Free Jewels Draw, EX+ di novembre
  2018, Free Celebratory Draw, Ticket Draw, SN Falling Price Deal, Daily Free Deal 2020, SN+ Falling Price Deal, Epic
  Medal Carnival B0089) **non hanno stagione**: restano banner normali della rotazione.
- La tabella sta nel generatore del catalogo (`recon/tools/make_banner_catalog.py` o un file di regole accanto), non
  scritta a mano nel JSON generato.

### 4.2 Regola

- Data di riferimento: l'**ora reale** del server (`realNow()`, la stessa su cui avanzano rotazione e settimane;
  `-RealNow <ISO>` per le prove), non la data finta del gemello.
- Se la data reale cade nella finestra di una stagione: si prende l'**edizione piu' recente sbloccata** di quella
  stagione fra i banner con `unlockQuest` <= ultima quest superata, estraibili (`drawable`). Si mostrano **tutti** i
  banner di quell'edizione (es. i cinque New Year's Deal 2017).
- **Edizione** (scelta di Claude, revisione del 20-10) = l'occorrenza della finestra in cui cade la data di inizio del
  banner, non l'anno solare: per `newyear` B0072-B0076 (inizio 01/01/2017) sono l'edizione 2016-17, B0219 (inizio
  22/12/2017) l'edizione 2017-18, B0774 la 2020-21. Lo stesso per `holiday` (B0068 2016-17, B0758/B0759 2020-21).
- Nessuna edizione sbloccata: nessun banner di quella stagione.
- Piu' stagioni insieme (dicembre: Black Friday, holiday, newyear): tutte, nell'ordine della tabella 4.1.
- Posizione nello Shop: dopo la piastra Catalog e il banner fissato (6), prima della rotazione. **Decisione dell'utente
  (20-10, dal banco):** ordine di visualizzazione Catalog, fissato, stagionali, rotazione (prima: Catalog, stagionali,
  fissato, rotazione). La precedenza sotto resta quella di prima: si decide quali banner sopravvivono (stagione >
  fissato > rotazione) e poi si ordinano i superstiti col fissato in cima.
- Un banner stagionale gia' presente nella settimana della rotazione non si duplica (resta al posto della stagione).
- payType 8 (Spooky Cookies, Holiday Draw Tickets): mai due valute payType 8 insieme. In caso di conflitto (dalla
  quest 940: banner a Draw Ticket fissato o in rotazione durante Halloween o le feste) **vince la stagione**, poi il
  banner fissato, poi la rotazione: il banner a payType 8 che perde resta fuori dallo Shop per la durata della
  finestra e torna dopo (scelta di Claude, revisione del 20-10; da dire nelle Notices, sezione «Keep one banner in
  the Shop»).
- Conto alla rovescia (`displayTimeLeft`/`endDate` di `drawMedalType`, come la rotazione): fine della finestra della
  stagione, in ora finta come le missioni (`clock.fakeString` con lo scostamento della revisione).
- I limiti del banner (`dayLimit`, `totalLimit`, Free Deal VIP) restano quelli del banner: un banner «once» gia' usato
  resta esaurito anche nelle stagioni successive.

## 5. Limited coi biglietti nascoste fino allo sblocco

- Una campagna Limited che **da'** Platinum Ticket (premio 40) o Draw Ticket (premio 41) e' attiva solo se e'
  sbloccato (`unlockQuest` <= ultima quest superata) almeno un banner estraibile che **spende** quella valuta
  (payType 7 per il Platinum, payType 8 con `currency` draw per il Draw Ticket).
- Oggi: W01 (righe 4059/4060, Platinum) dalla quest 815 (B0456), W02 (riga 4091, Draw Ticket x100) dalla 840 (B0478).
  Le soglie si calcolano dal catalogo, non si scrivono a mano.
- Meccanismo: lo stesso di `weeklyMedalFrom` (`server.js limitedUnlocked`), esteso ai gruppi che danno biglietti;
  vale anche per le mensili se una di loro da' biglietti. Prima dello sblocco la settimana resta senza quella campagna.
- I biglietti gia' accumulati nei salvataggi restano.

## 6. Banner fissato nello Shop

### 6.1 Cosa si puo' fissare

Un banner e' **fissabile** se:
- e' sbloccato e estraibile (`drawable`, dimensioni in `KHUX_GACHA_SIZES`, non `catalogOnly`);
- il suo periodo e' **passato**: finisce prima dell'inizio del periodo della tranche attuale (non tornera' mai nella
  rotazione);
- **non** e' un Free Deal, **non** costa 1 Jewel, **non** ha stagione (4.1) (decisione dell'utente: le stagionali
  tornano col calendario; Free Deal e 1 Jewel per l'equilibrio delle risorse, I-164).
- Precisazione (scelta di Claude, revisione del 20-10): «Free Deal / 1 Jewel» = banner con **tutti** i prezzi <= 1
  (`prices` [0], [1], ...) oppure `vipFree`, oppure nome che comincia con «Free» (Free Deal, Free Jewels Draw, Free
  10-Medal Draw, Free Celebratory Draw). I banner con la **sola prima estrazione gratuita** e poi a pagamento
  (FIRST_FREE, Falling Price: `[0,3000]`, `[0,2500,2200,...]`) **si possono fissare**: la gratuita vale una volta per
  giocatore (contatore `player.gacha.count`), quindi non da' estrazioni gratis per sempre.

### 6.2 Comportamento

- Al massimo **un** banner fissato per giocatore (`player.gacha.pinned` = rowId o assente).
- Nei Details di un banner fissabile, aperti dal Catalog: pulsante **«📌 Keep in the Shop»**. Se un altro e' gia'
  fissato, il testo dice quale verra' sostituito. Nei Details del banner fissato: **«Remove from the Shop»**.
- Dopo il tocco la pagina conferma con un riquadro ben visibile (bordo e testo grande, verde per «Pinned!», arancio per
  «Removed.») al posto del pulsante, portato in vista: **«Pinned! Leave and re-enter the Shop to see it.»** (vincolo 3).
  **Decisione dell'utente (20-10):** lo stesso pulsante («📌 Keep in the Shop» / «Remove from the Shop») sta anche su
  ogni riga fissabile del Catalog, senza lasciare la lista: la riga del banner fissato prima perde lo stato, quella
  nuova diventa «📌 Kept in the Shop», con lo stesso riquadro di conferma. Il codice della richiesta e' condiviso con i
  Details.
- Nello Shop: **subito dopo la piastra Catalog, sopra le stagionali** (decisione dell'utente, 20-10; vedi 4.2), prima
  della rotazione; nessun conto alla rovescia. La piastra mostra solo l'immagine del banner, quindi per il fissato il
  `bannerUrl` e' `/web/gacha/img/<id>-kept.png`: lo stesso banner (stessa dimensione) con il bollino «📌 KEPT IN SHOP»
  in alto a destra (puntina disegnata come forma), generato una volta da `recon/tools/kept_banner_badge.py` (Pillow)
  e tenuto in `game_data/gacha_img_kept/`; se la generazione fallisce si serve l'immagine normale.
- Se il banner fissato smette di essere fissabile (non dovrebbe succedere: i periodi passati restano passati), sparisce
  dallo Shop e il Catalog lo mostra di nuovo come fissabile o no.
- Conta nel tetto `SHOP_MAX`.

### 6.3 Comunicazione WebView -> server

La WebView del Catalog e' servita dal nostro server su http (vedi note su WebView e TLS). Il pulsante fa una richiesta
al server (es. `POST /web/gacha/pin` con il rowId, o un link GET con risposta che ridisegna la pagina) che aggiorna
`player.gacha.pinned` e salva. Il dettaglio tecnico e' lasciato al builder; requisito: funzionare nella WebView del
client senza JavaScript esterno.

## 7. Catalog: schede per anno di gioco e pannello Filters

Riferimento visivo: `catalog-filters-v3.html` (flusso in tre passi) e `catalog-years-v4.html` opzione A.

### 7.1 Schede per anno di gioco

- Titolo sopra le schede: **«GAME YEAR — each year runs from one anniversary (April 7) to the next»**.
- Schede: **All years** (2016-2021), **Launch year** (Apr 7, 2016 → 1st 🎂), **Year 2** (1st 🎂 → 2nd 🎂),
  **Year 3**, **Year 4**, **Year 5**, **Final months** (5th 🎂 → end). Anno di un banner = data di inizio.
  **Decisione dell'utente (20-10):** una scheda anno senza alcun banner nell'intero catalogo (indipendente dai filtri) non
  si mostra (oggi «Final months»: l'ultimo inizio e' 2021-02-25); ricompare da sola se arrivano dati.
- Ogni scheda mostra quanti banner corrispondono ai filtri attivi.
- La frase sopra la lista ripete le date esatte: «12 banners from the launch year (Apr 7, 2016 – Apr 6, 2017) match
  your filters».

### 7.2 Pannello Filters

- Pulsante **«⚙ Filters»** in alto a destra, con il numero dei filtri accesi.
- Si apre **sopra** la lista oscurata; si chiude con la X o con il pulsante in fondo.
- Tre sezioni:
  - **FIND A MEDAL**: campo di ricerca per nome di medaglia, con la riga «Shows the banners where this Medal can be
    drawn.» Corrisponde se la medaglia e' nel pool o nelle garanzie del banner (nomi del catalogo, senza
    maiuscole/minuscole, ricerca per parte del nome).
  - **PAID WITH**: All, 💎 Jewels, 🎫 Platinum Ticket, 🎟 Draw Ticket, 🎃 Seasonal tickets, 👑 VIP, Other.
    Definizioni (scelta di Claude, revisione del 20-10): Jewels = payType 1; Platinum = payType 7; Draw Ticket =
    payType 8 con `currency` draw; Seasonal tickets = payType 8 con spooky, holiday o moogle; VIP = banner col flag
    `VIP` (qualunque moneta: e' un filtro sul tipo di banner, quindi un banner VIP a Jewel compare sia in Jewels sia in
    VIP); Other = payType 4/5/6/9 (Bronze/Silver/Gold Ticket, Draw Points, solo catalogo).
  - **SHOW**: All banners, ▶ In the Shop now, Unlocked, not in the Shop now, 🔒 Still locked (stessi colori degli
    stati della lista).
- In fondo: «Reset filters» e il pulsante **«Show N banners»** con il numero gia' calcolato.
- Lista filtrata: frase con il conteggio e i filtri accesi come etichette con la × per toglierli, piu' «Clear all».
- Ogni banner: immagine a sinistra; a destra nome, date, prezzo e stato.
- Il filtro vive **solo** nel Catalog: non cambia lo Shop. Puo' essere tutto lato pagina (JavaScript inline nella
  pagina servita); ricordare i filtri fra un'apertura e l'altra e' facoltativo.
- Stato in lista: aggiungere lo stato «📌 Pinned» e, per i fissabili, un'indicazione che si possono fissare.

### 7.3 Nomi guasti del catalogo (I-150)

Da correggere nel generatore prima della ricerca per medaglia: 5 nomi boosted senza medaglia («launchpad mcquakc»,
«webby vanderquakc», «axel [ex]», «kairi [ex+]», nome SN++ fuso), note con U+FFFD («SN+ - KH III Namin<U+FFFD>»),
`pool.featured` di B0637/B0646 con «of the following». Chiude I-150.

## 8. Notices

- Notizia «Shop» (INFORMATION): sezioni nuove «Seasonal banners» (finestre della 4.1), «Keep one banner in the Shop»
  (regole 6.1-6.2, esci e rientra), «Catalog filters».
- «Differences from the original game»: stagionali a finestre fisse sul calendario reale con l'edizione piu' recente
  sbloccata; banner fissato (non esisteva); Limited coi biglietti solo dopo lo sblocco di un banner che li spende.

## 9. Prove

- Test offline (`server/test-gacha.js` o nuovi): stagione attiva/non attiva sulle finestre a cavallo d'anno, edizione
  piu' recente sbloccata, nessuna sbloccata, piu' stagioni insieme, niente doppioni con la rotazione; Limited coi
  biglietti prima/dopo la soglia; fissabile/non fissabile per ogni esclusione; un solo fissato, sostituzione,
  rimozione; filtri del Catalog (conteggi per anno, medaglia, moneta, stato).
- Banco (salvataggio di prova o `player.json`, quest 525): `-RealNow` in una finestra (es. dicembre: Black Friday 2016
  + Winter Holiday + New Year's Deal) e fuori; fissare un banner dal Catalog, uscire e rientrare, estrarre; Catalog con
  schede e filtri; Notices. Screenshot a ogni passo, stile confrontato con le bozze.

## 10. Lasciato al builder

- Forma esatta del campo `season` e dove vive la tabella 4.1 (generatore o file di regole).
- Meccanismo della richiesta di 6.3.
- Ordine interno fra banner della stessa edizione stagionale (es. per `drawMedalTypeId`).
- Se la ricerca per medaglia usa un indice precalcolato o filtra al volo.
