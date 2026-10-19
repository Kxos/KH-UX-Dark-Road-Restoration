# Trait dalla fusione e Trait Medal (I-084): design

Stato: bozza del 19-10-2026, da approvare. Due sotto-progetti, nell'ordine deciso dall'utente:
**A. trait dalla fusione di copie identiche**, poi **B. Trait Medal**. B si appoggia ad A.

## Perche'

Nell'originale le Trait Medal stavano in molti banner e i giocatori le cercavano: potenziano la medaglia (un pallino,
oppure sblocco o rilancio della guilt) e insieme le danno un trait. Oggi il nostro server non da' mai un trait dalla
fusione, nemmeno con due copie identiche: i trait si possono solo comprare nel Moogle Shop. Lo slot «Trait Medal»
dei banner (89 promesse) da' una 6★ qualsiasi come ripiego dichiarato.

Obiettivo (utente): reinserirle come nell'originale. Se manca il codice originale, ricostruirne almeno il
funzionamento originale dalle fonti. Quello che ricostruiamo va dichiarato nelle Notices (regola del progetto).

## Fonti

- Regole: ricerca del 12-10 (`D:\Progetto_Restauro_KH_UX\reference\trait_medals\NOTE.md`) e del 19-10
  (`D:\Progetto_Restauro_KH_UX\tmp\trait\sources\`, `INDEX.txt`: notice EN 27491, 38128, 46740, 52659, 60076, 70201;
  JP 37748, 69947, 67015; guida dell'utente p. 21-23; khuxwiki «Trait Medal», «Medal#Traits»).
- Schermate originali: `D:\Progetto_Restauro_KH_UX\reference\trait_medals\video_Z_JRaJF7GbQ\` (NOTE.md: fusione con
  Trait Medal, ruota, «Tap Screen», popup di sostituzione con slot pieni).
- Client 4.3.1 (Ghidra): decompilati in `D:\Progetto_Restauro_KH_UX\tmp\trait\re\`; contratto riassunto sotto.

## Regole originali (confermate dalle fonti)

1. Ogni fusione con almeno una copia della **stessa medaglia** (stesso nome; dalla 2.6.0 anche rarita' diverse) da'
   **sempre un trait** casuale, se la medaglia ha slot dei trait (`shuffleskillSlot` > 0). Tier, rarita' e pallini
   non contano. Mickey & Brooms non da' mai trait.
2. **Un solo trait per fusione**, anche con piu' copie o piu' Trait Medal fra i materiali. Pallini e guilt invece
   contano ogni copia (come oggi).
3. Il trait estratto puo' essere **un doppione** di uno gia' presente (video: due «Extra Attack: 40% Power»). I trait
   si sommano tutti, tranne Extra Attack e Ground/Aerial Enemy DEF: dal secondo in poi non hanno effetto (JP 37748,
   2.0.2 notice 27960; ricordo dell'utente). Il server non deve impedirli.
4. **Slot pieni**: il giocatore sceglie quale trait sostituire (il nuovo prende la sua posizione) oppure «Skip» (il
   nuovo si perde). Se esce dal gioco prima di scegliere, al login successivo il gioco ripropone la scelta («There are
   traits that have not been set.»).
5. I trait della copia usata come materiale si perdono (probabile; confermato solo per l'Evolve, 52659).
6. **Trait Medal** (B): ognuna e' legata a una medaglia. Fusa su quella medaglia da' un trait (regola 1) piu' un pallino,
   oppure sblocco o rilancio della guilt con i pallini pieni. Fusa su un'altra medaglia da' solo EXP.

## Decisioni dell'utente (19-10)

- Ordine: prima A, poi B.
- La ruota della fusione estrae solo fra gli **11 trait originali**: Extra Attack 40% Power, Ground Enemy DEF -60%,
  Aerial Enemy DEF -60%, STR +1000, Damage in Raids +40%, DEF +2000, Max Gauges +2, Max HP +800 (vedi «Da
  verificare»), Poison Resist 20%, Sleep Resist 20%, Paralysis Resist 20%. I 5 trait della 4.1.0 (50%, -70%,
  +1500, Raids +50%) restano solo nel Moogle Shop: le fonti non dicono se uscissero dalla fusione (verdetto «ignoto»,
  indizi verso «solo shop»).
- Probabilita': **uniforme**, 1 su 11 per ogni trait (le percentuali originali non sono mai state pubblicate).
  Dichiarata nelle Notices come ricostruita, con i valori.
- Fuori da questo lavoro: Trait Medal del Moogle Shop («Trait Medal #N x10», 2021) e quelle premio degli eventi:
  arriveranno con le rispettive modalita'. Booster (I-166): con gli eventi.

## Contratto del client (Ghidra, confidenza alta salvo dove indicato)

- **Fusione, `POST /user/medal/enhance` (azione 55)**, scena risultato `[fn]`:
  - slot liberi: il trait nuovo va IN FONDO a `afterEnhanceUserMedal.userShuffleSkills`, e
    `medalResumption = {userShuffleSkills: [], resumptionStatus: 0}`. Il client mostra la ruota sull'ULTIMO elemento;
  - slot pieni: `afterEnhanceUserMedal.userShuffleSkills` invariato e
    `medalResumption = {userShuffleSkills: [pending], resumptionStatus: 1}`. Con status 1 la lista NON deve essere
    vuota (il client legge `[0]` senza controllo);
  - `overwriteSkills`/`successOverwrite`/`isOverwriteSkill` sono le skill (I-088), non i trait.
  - elemento trait (`[fn]`): `{userShuffleSkillId (uint64), shuffleSkillId, userMedalId, getDatetime, type}`;
    per i trait della fusione `type` != 2 (2 = Special Trait del pet); 1 proposto (confidenza media).
- **Scelta, `POST /user/medal/shuffleskill` (azione 57)**:
  - Replace: `{userMedalId, userShuffleSkillId: trait esistente da togliere, enableUserShuffleSkillId: pending}`;
  - Skip: `{userMedalId, userShuffleSkillId: pending, enableUserShuffleSkillId: 0}`;
  - risposta: `userMedal` (formato di `userMedals`) e `medalResumption` alla radice, entrambi obbligatori; dopo la
    scelta `{[], 0}`. Nessuna animazione dopo la 57.
- **Login**: `userData.medalResumption` con status 1 -> popup «There are traits that have not been set.», poi
  (`[fn]`) se `pending[0].type == 2` Spirit, altrimenti la finestra di scelta sulla medaglia
  `pending[0].userMedalId`. Anche `POST /pet/expedition` (244) aggiorna lo stesso valore: va tenuto coerente.
- **Copia identica / Trait Medal** (`[fn]`, anteprima `[fn]`): materiale «da trait» se
  `base.shuffleSkillGroupId` (+0x53c) != 0, uguale a quello del materiale, e `base.shuffleskillSlot` > 0. Nessun
  controllo sul `type`. Oggi `shuffleSkillGroupId` e' 0 in tutte le 3.241 righe di `medal`: va valorizzato.
  Il «pallino» e' un controllo separato (groupId / `burstEnhanceCategory` / type 8).
- **Trait Medal nelle liste**: `type` 9 = filtro «Trait Medals» (10 = Subslot). Grigio, costo 999, vendita ed EXP
  vengono dalle colonne del master (`cost`, `sellPerLv`, `materialExp`), nessun codice dedicato.

## Risorse

| Risorsa | Oggi | Da fare |
|---|---|---|
| `Kakusei_Get1.lwf`, `Kakusei_Get2.lwf` (ruota), `Kakusei_Icon%04d.lwf` | ricostruite da noi (stage_gen) | sostituire con le originali JP (come I-163) |
| `MedalInfo_SkillChangeWindow.json` (popup «Choose a trait to replace») | assente | importare dal JP |
| texture `Kakusei_New.png` | assente | importare dal JP |
| `MedalInfo_KakuseiInfo_ver150`, `MedalInfo_Anim.ExportJson`, `MedalMixResultScene_ver320`, `img/kakusei` | presenti | - |

Testi giapponesi nei layout JP: tradurli coi testi WW del client dove esistono («Choose a trait to replace.»,
«Skip», «Replace %s with %s?») e controllare l'aspetto contro i fotogrammi del video (regola: stile dagli originali).

## A. Trait dalla fusione

1. Master:
   - `shuffleskill`: aggiungere come trait normali (`type` 1, `rate` > 0) Poison/Sleep/Paralysis Resist 20% e
     Max HP +800, che oggi esistono solo come Special Trait del pet (type 2) o con il valore +300. La ruota della
     fusione pesca solo gli 11 id originali (lista nel server, non il campo `rate`, perche' i 5 della 4.1.0 hanno
     anch'essi type 1).
   - `medal`: `shuffleSkillGroupId` = stesso valore per tutte le righe della stessa medaglia (stesso nome, tutte
     le rarita', boosted compresi). Regola del valore: a scelta del builder (per esempio il medalId piu' basso
     della famiglia), stabile fra le rigenerazioni.
2. Server, fusione (`respondMedalEnhance`): se fra i materiali c'e' almeno una medaglia con lo stesso
   `shuffleSkillGroupId` della base e la base ha `shuffleskillSlot` > 0, estrarre un trait (uniforme fra gli 11) e:
   slot liberi -> aggiungerlo in fondo; slot pieni -> salvarlo in sospeso nel salvataggio e mandare status 1.
   Gli slot contano solo i trait normali (lo Special Trait del pet ha uno slot a parte, come nel Moogle Shop oggi).
3. Server, azione 57: Replace (il pending prende la posizione del trait tolto) e Skip; risposta come sopra.
4. Server, login e `userData`: `medalResumption` dal salvataggio; status 1 finche' c'e' un pending.
5. Pallini e guilt: invariati (gia' fatti, `medal-guilt.js`).
6. Notices: sezione nella notizia delle medaglie: la fusione di copie identiche da' un trait; probabilita' 1/11
   per trait (ricostruita); i 5 trait della 4.1.0 solo dal Moogle Shop.

## B. Trait Medal

1. Elenco: numero EN «Trait Medal #N» -> medaglia associata, dalla tabella della khuxwiki (193 righe in
   `khuxwiki_Trait_Medal_raw.txt`) e dai notice dei deal (#123 SN+ - KH III Aqua, #130 SN+ - KH III Xemnas...;
   fino a circa #313). Solo quelle la cui medaglia esiste nel nostro catalogo.
2. Master `medal`: una riga per Trait Medal, `type` 9, 6★, STR/DEF 1, costo 999, «Lesser Attack» (1 nemico, 1 gauge,
   x1,00), 15 Pet Point, stesso numero di Album della medaglia, `shuffleSkillGroupId` della medaglia, nome «Trait
   Medal #N»; niente pallini sulla base dalla Trait Medal tramite i campi del «pallino» se non quelli che il client
   richiede (vedi «Da verificare»).
3. Immagini: versione in bianco e nero della medaglia associata (le tre originali in `reference\trait_medals\` fanno
   da modello per tono e contrasto), generate nel pacchetto risorse.
4. Server, fusione: Trait Medal sulla sua medaglia -> trait (A, max uno per fusione) + un pallino oppure sblocco o
   rilancio della guilt (come una copia identica); su altre medaglie solo EXP.
5. Banner: lo slot Trait da' la Trait Medal promessa dal notice del banner (es. B0353 «Trait Medal #23») invece della
   6★ di ripiego; dove il numero non e' ricavabile resta il ripiego dichiarato. Le pity «Trait Medal #N entro 5»
   (B0267) diventano riproducibili. Aggiornare Details, Notices («Trait Medals no longer exist...») e i test del
   catalogo.

## Da verificare (dal builder, prima di scrivere codice)

- Max HP del trait: la guida dice +800, il master locale +300 (Moogle Shop). Scegliere con le fonti.
- Se il «pallino» della Trait Medal richiede anche `groupId`/`burstEnhanceCategory` sulla riga (anteprima del
  client) o basta il server.
- Cosa succede con piu' copie identiche se la base ha gia' pallini e guilt al massimo (fix JP 67015: il client
  permette una sola copia «solo per il trait»): verificare sul banco che il client non mandi il caso.

## Non obiettivi

- Nessuna modifica alle regole di pallini e guilt.
- Niente trait della 4.1.0 dalla fusione, niente pesi «di bilanciamento».
- Niente Trait Medal nel Moogle Shop o come premi (vedi sopra).

## Scelte fatte in revisione (decise da Claude, da controllare)

1. **Trait in sospeso multipli.** Nel salvataggio una CODA di pending; `medalResumption` manda il primo
   (`[pending[0]]`, status 1) finche' la coda non e' vuota. Nell'originale il popup compare subito dopo la fusione,
   quindi di solito c'e' al massimo un pending. Lo Special Trait del pet resta com'e' oggi (sostituzione immediata,
   fuori da questo lavoro); la risposta della 244 deve pero' rimandare il `medalResumption` salvato, non `{[],0}`
   fisso, per non cancellare un pending della fusione.
2. **«Stessa medaglia» = stesso nome** (tutte le rarita', boosted, righe varianti >= 1.000.000 del nostro master).
   SN, SN+, SN++, Supernova/Supernova+ sono medaglie diverse (nomi diversi; l'Evolve le distingue). Regola dalla
   2.6.0 «Medals of different rarities ... same Medal» (notice 40729).
3. **Trait Medal sulle versioni boosted**: trait + pallino come sulla normale (stessa medaglia, regola 2). Per
   l'anteprima del client il legame del pallino si mette sulla BASE: `burstEnhanceCategory` delle righe della
   famiglia contiene il `groupId` della Trait Medal (vale per normale e boosted); il server applica la stessa regola
   in `medal-guilt.js` (unica modifica alle regole dei pallini: la Trait Medal conta come copia).
4. **Impilamento**: Trait Medal impilabili fino a 99 come dalla 3.3.0 (`validPack`), anche nella stessa fusione;
   un solo trait per fusione comunque, pallini per copia.

## Lasciato al builder

Struttura del codice, nomi dei campi nel salvataggio, migrazione dei salvataggi, test, ordine dei passi dentro A e B,
strumenti di import delle risorse JP (gia' usati per I-163).

## Prove al banco (successo)

- A: due copie identiche -> ruota originale, trait nella lista; slot pieni -> popup originale, Replace e Skip; uscita
  dal gioco prima di scegliere -> popup al login.
- B: deal con Trait Medal -> medaglia grigia nel box, filtro «Trait Medals»; fusa sulla sua medaglia -> trait +
  pallino; su un'altra -> solo EXP.
