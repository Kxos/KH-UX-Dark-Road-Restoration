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

Stato del banco: **risorse 35** (stage originali delle 525 missioni, stanze JP recuperate), **revisione master 101** (default degli script di sessione).

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

## Stato al 14 ottobre 2026 e prossimo passo

- Fatto il 14 ([diario](docs/journal/2026-10-14.md)): **Presents** completo (`/user/present`, Collect,
  Collect All; prove con `relogin.ps1 -TestPresents`); **Beginner's Guide** = WebView, pagina nostra
  `/web/beginner`; `GET /user/mission` risposto; fumetti del Level Up con l'inglese nel fumetto (font 16);
  trascinamento del Subslot ok (serve `sendevent`, `tmp\drag.ps1`); OPTIONS/Give Up in battaglia ok;
  `Shot` di bench_lib non perde piu' gli screenshot (bloccava `story.ps1`). Poi: bacheche veloci (0,5 s,
  solo le voci cambiate dell'inventario) e con le LWF originali JP; Challenge PvP: niente piu' errori 200 ma
  crash (I-120, master `pvp` e layout).
- Il 13: dati di thethiny (`[local reference data]\`), schema dei mondi v2
  (`reference\world_schema\schema_v2\index.html`), layout originali JP (I-117, risorse 34).
- **Prossimi passi**, in ordine:
  1. **I-116**: schema v2 **approvato dall'utente il 14-10**; poi correzione del generatore (freccia 40-80 unita'
     *prima* dell'uscita, `freccia_uscita.md`), rigenerazione dei tour e prova dell'utente; solo dopo le
     missioni di storia (oggi il TARGET della 133 cambia stanza e la missione non si chiude).
  2. I-117: popup di Evolve e risultati di battaglia (dopo I-116); poi i passi 1, 2, 4 della proposta.
  3. I-118 (missioni Beginner/Limited nel master, reset 07:00 UTC, countdown Weekly) e I-119 (EXP del
     Level Up a 0).
  4. Documento per thethiny `reference\world_schema\for_thethiny.md`: l'utente lo rilegge e lo manda.
  5. Restano: Outfits del pet senza parti (I-094); primo Begin che non risponde dopo una missione; I-088;
     I-086; I-087; I-089/I-084; lista I-092..I-115.
  Attenzione: modificare `server\save\player.json` solo subito prima di `relogin.ps1`. Con la versione 34
  `-Quick` e' possibile se l'indice non cresce: prima `-DryRun` (14-10: 72% della riserva).
- Banco: **risorse 35** (+ -Quick del 14-10 pomeriggio), **revisione master 101**, server con `-Pet`.
  **Stage di storia = originali** (JP 4.3.1 / 2016 / WW, `import_orig_stages.py`), stanze recuperate in
  `rooms_gen`; tour v2 in `stage_gen\tours_v2` tenuti da parte (solo prove). `smoke.json` spostato in
  `D:\Progetto_Restauro_KH_UX\tmp\smoke.json.bak` (elenco Story normale). Copie di sicurezza:
  `stage_gen\stage_generated_bak_20261014`, `stage_poi_bak_20261014.json`, `master_bak_20261014`.
  Da provare sul banco: Boosters (I-123), icona Jewels degli Items (I-122), HUD guilt/buff (I-124),
  missioni nelle stanze recuperate.
## Regole del lavoro (dell'utente)

- **Commit + push a ogni passo verificato**, senza chiedere; `git pull --rebase` prima del push
  (altri agenti committano in parallelo). Messaggi in italiano, terminati da
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `git -c safe.directory=*`,
  `git commit -F <file>`; PowerShell (Git Bash si blocca su D:); UTF-8 senza BOM.
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
