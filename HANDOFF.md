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

Stato del banco: **risorse 33**, **revisione master 93** (default degli script di sessione).

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

## Stato al 12 ottobre 2026 e prossimo passo

- Fatto e verificato il 12: Optimize come l'originale (I-075: deck completi, slot vuoti = Stock Medal
  che gioca il turno, immagine 90000), Subslot (I-066: trascinamento e avviso), Passive Effects
  (I-065: pagina web `/web/passive` in http), fumetto del Profilo (I-071), Field Speed = originale
  (I-081). Aura del +35 ok (I-078).
- **Prossimi passi**, in ordine:
  1. I-078: crash all'animazione di evoluzione (`KeyBlade_Evolution`): rapporto dell'agente e LWF
     nuovo; per riprovare rimettere Treasure Trove a +34 nel salvataggio (ora +35; copia del +17 in
     `%TEMP%\player_before_i078.json`).
  2. I-076/I-077: crash del dialog del pet (Swap Gear, icona in home): layout in preparazione
     (`make_layouts.py`), poi `-Quick` e banco.
  3. I-079/I-080: collegare `server/medal-guilt.js` secondo [guilt.md](docs/notes/guilt.md)
     (guiltProb, Magic Broom e Fantasia Mickey B, campi di userMedal, `respondMedalEnhance`).
- Banco: risorse 33, **revisione master 93**, server con `-Pet` (`-KbFree` solo per le prove dei
  keyblade); `server\save\smoke.json` = {"stageId": 1010}; salvataggio con 2090 medaglie, sub-slot
  120/120, deck Treasure Trove [318,0,317,0,456] + pet 358.
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
