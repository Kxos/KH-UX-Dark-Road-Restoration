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

Stato del banco: **risorse 36**, **revisione master 109** (default degli script di sessione); dettagli sotto.

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
  recuperate. Da verificare sul banco (annotazione dell'utente; Evolve 6★ fatto il 15-10): medaglie con musica propria (BGM Medals): quali sono e quali OST, da https://www.khuxwiki.com/wiki/Category:BGM_Medals. Fatto il 14-10 sera: Supernova provata in battaglia con un deck di 5 SN (utente), badge SN sulle
  medaglie, danno fisso (Yuffie x3600 = 3600 di danno), testi e prove dei filtri Supernova (medaglie.md#filtri). Poi blocco 2 (I-119 EXP
  del Level Up, I-118 Beginner/Limited, I-087/I-093 keyblade), blocco 3 (stile: Presents I-035/I-096, Moogle Shop
  I-102/I-103, Subslot I-101, Home I-097, Chirithy I-016), blocco 4 (I-009, I-116, I-120/I-059, I-099, I-056).
  Salvataggio di prova: livello 100 (lux 320000), keyblade 2 con 5 Supernova (762, 766, 769, 777, 1284); copie in
  `tmp\player_before_sndeck.json`, `tmp\player_before_guilt.json`, `tmp\player_before_meow.json`. Sul popup
  Sort/Filter scorrere solo sul bordo destro (x 1722): uno swipe su un pulsante lo attiva.
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
