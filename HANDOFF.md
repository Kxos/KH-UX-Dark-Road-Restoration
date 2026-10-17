# Ripresa del lavoro

Questo file serve **solo a ripartire**: stato attuale e prossimo passo. Problemi in
[docs/ISSUES.md](docs/ISSUES.md), conoscenza tecnica in [docs/notes/](docs/notes/), cronologia in
[docs/journal/](docs/journal/) (il vecchio HANDOFF integrale e' in
[docs/journal/fino-al-2026-10-11.md](docs/journal/fino-al-2026-10-11.md), gli stati dal 14 al 16 ottobre in
[docs/journal/fino-al-2026-10-16.md](docs/journal/fino-al-2026-10-16.md)).

## Il progetto

Restauro di **Kingdom Hearts Union χ** (client Android WW 4.3.1, servizio chiuso nel 2021): un
server Node (`server/server.js`) risponde al client **originale** e non modificato, che gira su
**LDPlayer 9 (Android 9)**, l'unico banco dove il protector LIAPP lo lascia partire
([protector](docs/notes/protector.md)). Le risorse sono gli OBB 5.0.1 + `addnl` dell'IPA iOS 4.3.1 +
un pacchetto generato da noi (mappe, layout CocoStudio ricostruiti, texture, medaglie). Si gioca
dal nuovo giocatore alla home, missioni di storia 1-525 (mappe generate), Medal List, vendita,
Level Up, Evolve, Moogle Shop, Profilo, Missioni, Avatar Boards.

## Ripartire

Stato del banco: **risorse 40**, **revisione master: BASE 120** (default dei 4 script di sessione dalla correzione finale
del 17-10; il server manda `120*100000 + scadenze passate`, [server.md](docs/notes/server.md#orologio)). Orologio finto
(mesi gemelli 2016-2021), `-RealNow <ISO>` per provare un cambio di settimana: [server.md](docs/notes/server.md#orologio);
storia completa in [fino-al-2026-10-16.md](docs/journal/fino-al-2026-10-16.md).

```powershell
# emulatore (se spento)
D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9\ldconsole.exe launch --index 0
# server + rientro del giocatore salvato fino alla home
.\tools\ldplayer\session\relogin.ps1 -Tag x
# OBBLIGATORIO dopo ogni avvio dell'emulatore, altrimenti popup «End of Service»
D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9\ld.exe -s 0 "sh /mnt/shared/Misc/phaseb-guest.sh 192.168.1.185"
```

- Dopo un riavvio dell'emulatore il client puo' riscaricare la versione 32 (~3 GB, minuti).
- DNS IPv4 di Windows su **192.168.1.185** durante le prove, **automatico** a fine sessione. Rete del guest guasta
  («7 ERROR», `ip route` senza default): `ldconsole reboot --index 0`, `sys.boot_completed`, `phaseb-guest.sh`, relogin.
- Prove sui layout: `.\tools\ldplayer\session\build-resources.ps1 -Quick` (~40 s, niente
  download se le dimensioni restano nella riserva). **Mai `-Quick` se esiste una versione piu'
  nuova di quella installata.** Una versione completa (`-Version N`) viene scaricata subito dal
  client: solo a banco fermo, poi `update-resources.ps1`.
- Dopo ogni modifica di `server/master_data`: alzare la revisione nei 4 script di sessione e
  `relogin.ps1` (due volte se il primo va in crash). Non riavviare il solo server a sessione aperta.
- Crash: `tombstone.ps1`, poi `armtrace\stackcap.ps1` (base della libreria diversa a ogni avvio:
  passarla con `KHUX_BASE`; sempre `capture.ps1 -Release` dopo `-Arm`). Ricetta completa in
  [banco.md](docs/notes/banco.md#crash); `D:\Progetto_Restauro_KH_UX\tmp\repro.ps1 <nome> <x> <y>` tocca, salva
  richieste, logcat e foto. Tocchi solo a gioco vivo (`bench_lib` rifiuta i tocchi a gioco chiuso).

## Stato al 17 ottobre 2026 e prossimo passo

- **Shop sotto-progetto 1** (16-10) e **sotto-progetto 2 «Elenco dei banner originali» (17-10): fatti**
  ([shop.md#sp2](docs/notes/shop.md#sp2), piano
  [2026-10-16-shop-banner-originali.md](docs/superpowers/plans/2026-10-16-shop-banner-originali.md)): catalogo di
  808 banner, sblocco con la storia, `relogin.ps1 -GachaShow B0306,B0456` per mostrare banner bloccati; prove 1-8
  al banco fatte con la revisione 119. **Correzione finale** (commit b9e23cc,
  [shop.md#correzione-finale](docs/notes/shop.md#correzione-finale)): vetrina e lista dei banner di debutto,
  `totalLimit` e una al giorno per le gratuite senza limite, `guarantee.slot` (B0306-B0308/B0355), «This guarantee is
  not reproduced yet.», tre righe nuove nelle Notices; master cambiato -> revisione 120, **provata al banco** il 17-10 (4 prove OK, dubbi minori in I-145).
- Generazione, nell'ordine:

```powershell
python recon/tools/make_banner_catalog.py; python recon/tools/make_banner_images.py --mode palette; node server/make-banners.js
```

- Aperti dello Shop: I-139 (24 INCOMPLETE), I-140 (filtro Epic), I-141 (immagine di B0612), I-142 (Blue Fairy Deal),
  I-143 (tocco perso dopo le Notices), **I-144 garanzie** (audit: 171 banner con discrepanze, 178 con Tier).
- **Prossimo: sotto-progetto 2b «Garanzie»**: spec breve con le 5 domande dell'utente
  ([shop.md#garanzie](docs/notes/shop.md#garanzie)), poi il piano. Dopo: **sotto-progetto 3** (catalogo con filtri,
  sblocchi, rotazione, stagionali; la chiusura dei Details non ricarica la lista).
- Altri lavori in attesa (Limited I-118, Blue Fairy e PvP I-126, NPC JP, crash intermittenti, decisioni dell'utente
  del 16-10): [fino-al-2026-10-16.md](docs/journal/fino-al-2026-10-16.md) e [ISSUES](docs/ISSUES.md).
- Salvataggio di prova: livello 100, materiali a 9999, keyblade a +35/+60, party creato, HD Roxas condivisa, 43
  medaglie estratte e `player.gacha` dalle prove del 17-10; copie in `D:\Progetto_Restauro_KH_UX\tmp\save-backup-*` e
  `tmp\player_before_*.json`.

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
| [docs/notes/shop.md](docs/notes/shop.md) | Shop > Draw: /gacha/list, /gacha/draw, piastre, raisedraw, prove |
| [docs/notes/bacheche.md](docs/notes/bacheche.md) | Avatar Boards |
| [docs/notes/home_profilo.md](docs/notes/home_profilo.md) | home, Other, Profilo, Missioni, pet, Presents |
| [docs/notes/analisi.md](docs/notes/analisi.md) | Ghidra headless e strumenti `recon/tools` |
| [docs/notes/ricerca_esterna.md](docs/notes/ricerca_esterna.md) | file scaricati, fonti, contatti |
| [docs/notes/protector.md](docs/notes/protector.md) | LIAPP e scelta del banco |
| [docs/journal/](docs/journal/) | diario per giorno (archivio fino all'11 ottobre, testo tolto in f10ea90, stati 14-16 ottobre) |

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
