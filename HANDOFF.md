# Ripresa del lavoro

Questo file serve **solo a ripartire**: stato attuale e prossimo passo. Problemi in
[docs/ISSUES.md](docs/ISSUES.md), conoscenza tecnica in [docs/notes/](docs/notes/), cronologia in
[docs/journal/](docs/journal/) (il vecchio HANDOFF integrale e' in
[docs/journal/fino-al-2026-10-11.md](docs/journal/fino-al-2026-10-11.md)).

## Il progetto

Restauro di **Kingdom Hearts Union χ** (client Android WW 4.3.1, servizio chiuso nel 2021): un
server Node (`server/server.js`) risponde al client **originale** e non modificato, che gira su
**LDPlayer 9 (Android 9)**, l'unico banco dove il protector LIAPP lo lascia partire
([protector](docs/notes/protector.md)). Le risorse sono gli OBB 5.0.1 + `addnl` dell'IPA iOS 4.3.1 +
un pacchetto generato da noi (mappe, layout CocoStudio ricostruiti, texture, medaglie). Si gioca
dal nuovo giocatore alla home, missioni di storia 1-525 (mappe generate), Medal List, vendita,
Level Up, Evolve, Moogle Shop, Profilo, Missioni, Avatar Boards.

## Ripartire

Stato del banco: **risorse 38**, **revisione master: BASE 117** (default degli script di sessione; il server manda
`117*100000 + scadenze passate`, orologio finto qui sotto); dettagli sotto.

```powershell
# emulatore (se spento)
D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9\ldconsole.exe launch --index 0
# server + rientro del giocatore salvato fino alla home
.\tools\ldplayer\session\relogin.ps1 -Tag x
# OBBLIGATORIO dopo ogni avvio dell'emulatore, altrimenti popup «End of Service»
D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9\ld.exe -s 0 "sh /mnt/shared/Misc/phaseb-guest.sh 192.168.1.185"
```

- Dopo un riavvio dell'emulatore il client puo' riscaricare la versione 32 (~3 GB, minuti).
- DNS IPv4 di Windows su **192.168.1.185** durante le prove, **automatico** a fine sessione.
- Prove sui layout: `.\tools\ldplayer\session\build-resources.ps1 -Quick` (~40 s, niente
  download se le dimensioni restano nella riserva). **Mai `-Quick` se esiste una versione piu'
  nuova di quella installata.** Una versione completa (`-Version N`) viene scaricata subito dal
  client: solo a banco fermo, poi `update-resources.ps1`.
- Dopo ogni modifica di `server/master_data`: alzare la revisione nei 4 script di sessione e
  `relogin.ps1` (due volte se il primo va in crash). Non riavviare il solo server a sessione aperta.
- Crash: `tombstone.ps1`, poi `armtrace\stackcap.ps1` (base della libreria diversa a ogni avvio:
  passarla con `KHUX_BASE`; sempre `capture.ps1 -Release` dopo `-Arm`). Ricetta completa in
  [banco.md](docs/notes/banco.md#crash).

## Stato al 14 ottobre 2026 (fine giornata) e prossimo passo

- **Banco**: risorse **36** (pacchetti statici medal_gen, rooms_gen, enemy_gen), master **revisione 108** (buff degli speciali, Supernova con badge SN/SN+/SN++, speciali a danno fisso, Evolve con Dual Meow Wow; default
  degli script, grafiche originali dei nemici: 605/670 displayId), server `-Pet`. Missioni di storia con gli
  **stage originali** (JP 4.3.1 / 2016 / WW, `import_orig_stages.py`, `stage_gen\orig_stages`), stanze JP
  recuperate in `rooms_gen`. Missione 123 provata sulla 36: Yellow Opera, Munny Egg e Ice Plant con le grafiche
  originali, battaglie e risultati senza crash. `smoke.json` spostato in `D:\Progetto_Restauro_KH_UX\tmp\smoke.json.bak`.
  Tour v2 in `stage_gen\tours_v2`: da parte, solo per provare componenti originali (decisione dell'utente).
- **Build delle risorse veloce**: ChaCha8 con numpy (`bgad.chacha_xor`) e `resource_pack.py --cache` sui pacchetti
  statici: versione completa in ~8 minuti (prima ~1 ora), poca memoria; i pacchetti invariati si saltano.
- **Prossimo**: blocco 1 (pulsanti in crash) finito il 14-10 sera, tutti provati sul banco: Notices (anche al login,
  `/web/notices`), Album, Party / Party Search (schermata «Create or join a party»), Rankings («Solo Ranking: Me»),
  Legal Information (pagine `/web/agreement`, `/web/license`), Increase Storage (acquisto `POST /shop/medal/max`,
  +5 posti / -100 jewel, max 3000; `player.medalMaxExtra`), Transfer Unions (popup originale). Moduli nuovi:
  `server/routes-info-album.js`, `server/routes-party-ranking.js`, `server/legal-pages.js`; layout JP aggiunti in
  `recon/tools/jp_coco_layouts.txt` (anche armature Cursor_Anim_Ranking su `MyPageAnime0`, `set=` e `clone=` di
  `import_jp_coco.py`). Risorse 36 aggiornate con -Quick (non serve una versione completa).
  Da fare dopo il blocco 1 (cambio di Union fatto il 15-10: `POST /union/change`, Leopardus nel salvataggio; sfide
  dell'Album: pulsante sempre nascosto dal client WW, niente da fare), creare/cercare un party (azioni 79, 84-106; senza Photon, I-056), missioni nelle stanze
  recuperate. Da verificare sul banco (annotazione dell'utente; Evolve 6★ fatto il 15-10): (BGM Medals fatte il 15-10). Fatto il 14-10 sera: Supernova provata in battaglia con un deck di 5 SN (utente), badge SN sulle
  medaglie, danno fisso (Yuffie x3600 = 3600 di danno), testi e prove dei filtri Supernova (medaglie.md#filtri). Poi blocco 2 (I-119 chiuso il 15-10: non era un bug; I-118 Beginner fatte il 15-10 (Limited da decidere),
  I-087/I-093 keyblade: Lady Luck e Olympia +35 provati, script tmp\kb_all.ps1), blocco 3 (stile: Presents I-035/I-096, Moogle Shop
  I-102/I-103, Subslot I-101, Home I-097, Chirithy I-016), blocco 4 (I-009, I-116, I-120/I-059, I-099, I-056).
  Salvataggio di prova: livello 100 (lux 320000), keyblade 2 con 5 Supernova (762, 766, 769, 777, 1284); copie in
  `tmp\player_before_sndeck.json`, `tmp\player_before_guilt.json`, `tmp\player_before_meow.json`. Sul popup
  Sort/Filter scorrere solo sul bordo destro (x 1722): uno swipe su un pulsante lo attiva.
- Pet acceso di default in `run-server.ps1` dal 15-10 (`-NoPet` per spegnerlo): senza `-Pet` il pet spariva dalla home.
- 15-10 sera: **risorse 37**, **master 110**: BGM Medals (medaglie.md#bgm-medals, provate), Share della
  medaglia (`player.supportUserMedalId`; salvataggio di prova: HD Roxas condivisa, copia prima in
  `tmp\player_before_bgm.json`). Riserva del pacchetto generato 128 MiB nelle versioni complete.
- 15-10: **master revisione 109** (Blue Fairy ed Evolve 6★ -> 7★, medaglie.md#blue-fairy, provato). Salvataggio di prova
  modificato per la prova (munny, Lexaeus A 7★): copia prima in `tmp\player_before_evo6.json`. Party: creazione e schermata del party servite e provate (server.md#party-ranking,
  `player.party`; copia prima in `tmp\player_before_party.json`); Edit/Recruit/Manage/Rankings/Search/Leave provati il 15-10 (risorse 36 -Quick con
  PartyTop_JoinManagement_Right JP); bonus del primo party nei Presents provato; icone partyRank importate (scelta dell'icona da verificare); resta la Chat. Come ottenere le Blue Fairy: decisione rimandata (I-126).
- 15-10: pulsante Supernova in battaglia con l'icona SN dei filtri (`SBurst_SN_but01/02`, battaglia.md#supernova).
  Git Bash su D: di nuovo utilizzabile (sistemato dall'utente).
- Strumenti del banco: `D:\Progetto_Restauro_KH_UX\tmp\repro.ps1 <nome> <x> <y> [-Pre "x,y;..."] [-Wait s]`
  (tocca, salva richieste del server, logcat crash e foto in `tmp\repro\<nome>`, riavvia l'app se cade; -Pre di
  default = MENU > Other). Stack ARM di un crash: avviare `tools\ldplayer\armtrace\stackcap.ps1 -NoStart -WaitSec 25`
  come job e poi toccare; registri con indirizzi Ghidra (G...), `dumps\armtrace\<tag>\stack.bin`. Dispatcher:
  `python -I tmp\jt.py recon\ext\ww431\libcocos2dcpp.so 167e414 <azioni>`, rami in `tmp\dispatcher_linear.txt`.
  Se il gioco da' «connection error» e il guest non raggiunge 192.168.1.185 (`ip route` senza default): rete del
  guest guasta -> `ldconsole reboot --index 0`, attendere `sys.boot_completed`, `phaseb-guest.sh`, relogin.
- Copie di sicurezza: `stage_gen\stage_generated_bak_20261014`, `stage_poi_bak_20261014.json`,
  `master_bak_20261014`, `master_bak_rev101`.
- Regole del banco nuove: `bench_lib` Tap/Swipe rifiutano i tocchi a gioco chiuso (dopo un crash i tocchi
  aprivano i banner pubblicitari di LDPlayer nel browser); dopo un crash fermare subito lo script. Diagnosi dei
  crash: `ld.exe -s 0 "logcat -d -b crash"` da' `rbx` = indirizzo ARM (Ghidra = rbx - base + 0x100000).
## Fine giornata 15 ottobre 2026 (sera) e prossimo passo

- Banco: risorse **37**, master **111**, pet acceso di default. Fatti oggi (tutti provati): Supernova con icona SN,
  Transfer Unions, party (create/edit/recruit/manage/leave/bonus), Blue Fairy ed Evolve 6★->7★, BGM Medals,
  missioni Beginner, crash di Filter nella storia (I-127), 13 keyblade a +35 + Bad Guy Breaker a +35 (utente).
- **Prossimo**: keyblade oltre +35 fino a +60 (home_profilo.md#keyblade-oltre-35: codice pronto, da rigenerare,
  confrontare e provare); poi «Quest 0» nella bolla della home (la storia e' alla 133), Limited (I-118, da
  decidere), Blue Fairy (I-126, da decidere), monete degli slot vuoti piu' scure nel popup Strengthen (I-093,
  serve un riferimento originale), crash intermittenti dopo sessioni lunghe (home/pet, Olympia +9: non riprodotti).
- La rete del guest e' caduta due volte oggi: «7 ERROR» -> `ldconsole reboot`, `phaseb-guest.sh`, relogin.
- Salvataggio di prova: 999 di ogni materiale, tutti i keyblade a +35, party creato, HD Roxas condivisa; copie in
  `tmp\player_before_*.json`.

## 16 ottobre 2026

- **Master 112**: keyblade oltre +35 fino a +60 (passi da 0,1, Bad Guy Breaker a interi), provati sul banco: BGB a +60
  («Keyblade level max.»), Starlight a +35.5 (home_profilo.md#keyblade-oltre-35). Salvataggio di prova: materiali a 9999.
- Fatto anche: Chirithy visibile (I-016, NPC originali JP), I-097 chiuso (sovrapposizione originale), BGM Medals
  sulle Supernova (master 113, tutte provate dall'utente), bolla della home «Quest 132» e Weekly Lux settimanale.
  Salvataggio: party rimesso, materiali a 9999.
- **Prossimo**: i punti rimasti dalla lista del 15-10 qui sopra (Limited I-118 e Blue Fairy I-126 da decidere,
  crash intermittenti; monete degli slot I-093: comportamento del client, chiuso il 16-10), NPC JP con parti mancanti (52, home_profilo.md).

### Orologio finto (16-10: in funzione sul banco, due punti aperti sotto)

- Ora del server = data reale nel **mese gemello** 2016-2021 (`server/clock.js`), scostamento fissato a ogni
  `/khux/login`; periodi e scadenze sull'ora reale (giorno 08:00 UTC, lunedi' 08:00, giorno 1 08:00).
  Daily/Weekly/Limited mostrano il tempo vero (banco: 22 hours / 2 days / 15 days il venerdi' 16-10).
- **Revisione del master = BASE*100000 + scadenze settimanali/mensili passate dal 1/1/2026** (oggi 11700051):
  `-Revision` degli script e' la BASE (117, da alzare come prima dopo ogni modifica dei master). Il client
  riscarica il master una volta a settimana/mese, mai le risorse (`darkVersionRes` resta 117).
- Nuovo `-RealNow <ISO>` in `run-server.ps1`/`relogin.ps1` (`KHUX_REAL_NOW`): sposta l'ora reale del server per
  provare un cambio di settimana (`relogin.ps1 -Tag x -RealNow 2026-10-19T09:00:00Z`), poi `relogin.ps1` senza per
  tornare all'ora vera. Attenzione: dopo un salto in avanti `player.clockSettled` resta nel futuro finche' l'ora
  vera non lo raggiunge (le consegne nei Presents di quei giorni saltano).
- Premi completati e non riscossi -> Presents al cambio di periodo (provato: 3 Daily). Misura del login:
  `tools\ldplayer\session\login-time.ps1 -N 5` ([server.md](docs/notes/server.md#orologio)).
- Copia del salvataggio all'inizio delle prove: `D:\Progetto_Restauro_KH_UX\tmp\save-backup-before-clock\` (era gia'
  migrato, clockVersion 1: il server con il codice nuovo era gia' stato avviato alle 11:46 del 16-10).
- `KHUX_REAL_NOW` + `KHUX_SERVER_TIME` insieme spostano anche la data finta fissa: usarne uno solo.
- **Chiuso**: date delle medaglie/keyblade del 2016 (numeri in ms dell'ora finta vecchia, saltati dalla v1):
  migrazione `clockVersion` 2 (numeri prima del 2022 spostati in blocco, il piu' recente = adesso). Salvataggio vero
  migrato il 16-10 (medaglie dal 13-10 al 16-10 2026); copia prima: `D:\Progetto_Restauro_KH_UX\tmp\save-backup-before-clock-v2\`.
- **Aperto**: criterio «login +1 s al massimo» NON verificato (la misura dal lancio dell'app, 52-87 s, e' dominata
  dall'emulatore; i 14-26 s di riferimento avevano la stessa misura ma un emulatore piu' rapido; la parte del server,
  prima richiesta -> `/khux/login`, e' invariata a 4,5-5 s).
- **Aperto**: attesa del client di ~10 s fra `/ranking/parade` e `/web/notices` (prima ~2 s). A/B del 16-10: uguale
  con la data finta vecchia (`KHUX_SERVER_TIME`) e con l'orologio finto, quindi **non dipende dalla data**; da capire.
- Effetti delle prove sul salvataggio: 300 jewel spesi dai «continue» automatici di `story.ps1` (Lady Luck e altri
  keyblade hanno il deck di medaglie vuoto: il giocatore perde); keyblade scelto passato a Treasure Trove; 3 premi
  Daily nei Presents (da riscuotere).

### Decisioni dell'utente (16-10 sera) per i prossimi lavori

- **Limited (I-118), design in corso (brainstorming, percorso «bounded»)**: come l'originale, due livelli nella scheda
  Limited: (a) la campagna **mensile dei Lux** (35 originali, 5-6 missioni «Obtain a total of N Lux», 04/2018-02/2021)
  ruota **ogni mese**; (b) le campagne brevi a tema ruotano **ogni settimana**, una campagna originale intera per volta,
  solo quelle completabili oggi (Story Quest fino alla 525; Proud/Raid/Union Cross quando ci saranno). Fonte
  `reference\missions\limited_all_khuxwiki.tsv` (320 righe, 64 campagne). Premi: 170 sono **parti dello Spirit**
  (Lambstar, Foxstar, ...), che vanno **recuperate** (decisione dell'utente): nel JP 4.3.1 ci sono 348
  `lwf/pet/part/NNN` e `img/petParts`, ma `master_data/petParts.json` e' vuoto (serve la tabella nome -> id). Ordine:
  1) recupero parti Spirit (fatto 16-10: 668 parti, home_profilo.md; 38 accessori premio senza grafica), 2) design Limited approvato e implementato 16-10 (home_profilo.md#limited; premi tutti mappati, reference/missions/limited_rewards_map.md; i biglietti si accumulano finche' non ci sono i banner /gacha/*).
- **Orologio finto (mesi gemelli)**: implementato il 16-10 (sezione sopra, punti aperti). Design approvato (`docs/superpowers/specs/2026-10-16-orologio-finto-design.md`),
  piano in 7 task (`docs/superpowers/plans/2026-10-16-orologio-finto.md`) da far rivedere all'utente e scegliere il
  modo di esecuzione (subagent-driven o nativo). Fatti verificati il 16-10: conti alla rovescia sull'ora del server,
  master riscaricato per intero a ogni cambio di revisione (login 19-77 s), I-128 data del dispositivo aperto.
- **PvP (I-126 Blue Fairy), percorso «architectural» (spec scritto + piano prima del codice)**: avversari generati
  (copie del giocatore) con build di medaglie **sensate** (anche la posizione negli slot conta), difficolta' che sale
  poco a poco a ogni vittoria e resta uguale se perde; evento **settimanale**, **5 tentativi al giorno** (35 a
  settimana); premi = **ticket PvP** per pescare nei banner PvP (da cui le Blue Fairy) in base al **numero di
  vittorie** (soglie da bilanciare: oneste e divertenti), non piu' sul ranking. Ancora da fare: domande una alla volta,
  approcci, spec in `docs/superpowers/specs/`, piano.

## Regole del lavoro (dell'utente)

- **Commit + push a ogni passo verificato**, senza chiedere; `git pull --rebase` prima del push
  (altri agenti committano in parallelo). Messaggi in italiano, terminati da
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `git -c safe.directory=*`,
  `git commit -F <file>`; UTF-8 senza BOM.
- **Stile dagli originali**: prima di fare una schermata si cercano screenshot/video/dati
  dell'originale, si salvano in `D:\Progetto_Restauro_KH_UX\reference\<schermata>\` e ci si
  adegua; controllo dello stile a ogni passo.
- **Agenti in parallelo** per il lavoro indipendente fuori dal banco; il banco resta seriale
  (un solo script alla volta). L'utente guarda il banco dal vivo: ogni sua segnalazione e' vera,
  verificare con gli screenshot.
- **Dialoghi e filmati: premere sempre SKIP** quando compare.
- Al ~40% del contesto: niente compiti nuovi, lasciar finire quelli in corso, commit+push,
  aggiornare questo file, chiedere all'utente il `/compact`.
- Solo codice e documentazione originali nel repository: mai APK, asset, master data di Square
  Enix o decompilato (`.gitignore`).

## Dove guardare

| File | Contenuto |
|---|---|
| [docs/ISSUES.md](docs/ISSUES.md) | tutti i problemi, aperti e chiusi, con stato e prova |
| [docs/notes/banco.md](docs/notes/banco.md) | banco LDPlayer, script, `-Quick`, tocchi, cattura dei crash, inciampi |
| [docs/notes/server.md](docs/notes/server.md) | protocollo, catena di avvio, master, risorse, salvataggio |
| [docs/notes/risorse_layout.md](docs/notes/risorse_layout.md) | BGAD, BTF, regole delle risorse, `make_layouts.py`, layout mancanti |
| [docs/notes/battaglia.md](docs/notes/battaglia.md) | API dello stage, HP/CP/forzieri, slot vuoto, sconfitta |
| [docs/notes/mappe_storia.md](docs/notes/mappe_storia.md) | formato STG/MAP, uscite, generatore, stanze, nemici |
| [docs/notes/medaglie.md](docs/notes/medaglie.md) | Medal List, vendita, Sort/Filter, Level Up, Evolve, grafica |
| [docs/notes/moogle_shop.md](docs/notes/moogle_shop.md) | Moogle Shop e trait |
| [docs/notes/bacheche.md](docs/notes/bacheche.md) | Avatar Boards |
| [docs/notes/home_profilo.md](docs/notes/home_profilo.md) | home, Other, Profilo, Missioni, pet, Presents |
| [docs/notes/analisi.md](docs/notes/analisi.md) | Ghidra headless e strumenti `recon/tools` |
| [docs/notes/ricerca_esterna.md](docs/notes/ricerca_esterna.md) | file scaricati, fonti, contatti |
| [docs/notes/protector.md](docs/notes/protector.md) | LIAPP e scelta del banco |
| [docs/journal/](docs/journal/) | diario per giorno (archivio fino all'11 ottobre e testo tolto in f10ea90) |

Preparare una macchina nuova (prerequisiti, clone, certificati, rete Windows): §3-§4 di
[docs/journal/fino-al-2026-10-11.md](docs/journal/fino-al-2026-10-11.md).

## Come aggiornare questi file

- **Problema nuovo**: una riga in [docs/ISSUES.md](docs/ISSUES.md) con il prossimo ID libero (mai
  riusare un ID) e il dettaglio tecnico nel file giusto di `docs/notes/` (con un'ancora
  `<a id="...">` da linkare). Quando si chiude: stato CHIUSO, riga spostata in «Chiusi», prova =
  commit.
- **Diario della sessione**: `docs/journal/AAAA-MM-GG.md` del giorno (cosa si e' provato, esiti,
  screenshot). I fatti che restano veri vanno anche nelle note d'area.
- **HANDOFF.md**: solo lo stato per ripartire (banco, revisione, risorse, lavori in corso, prossimo
  passo, valori provvisori nel salvataggio). Tenerlo sotto le ~120 righe.
