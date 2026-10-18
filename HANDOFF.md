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

Stato del banco: **risorse 41**, **revisione master: BASE 126** (default dei 4 script di sessione dalle skill allo
stato 4.3.1 del 18-10; il server manda `BASE*100000 + scadenze passate`, [server.md](docs/notes/server.md#orologio)). Orologio finto
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

- **Shop**: sotto-progetto 1 (16-10), 2 «Elenco dei banner originali» (17-10, [shop.md#sp2](docs/notes/shop.md#sp2),
  correzione finale [shop.md#correzione-finale](docs/notes/shop.md#correzione-finale)) e **2b «Garanzie»**
  (17-10, [shop.md#sp2b](docs/notes/shop.md#sp2b), I-144/I-148/I-149 chiusi, commit cf1030b..fe280d8): **fatti e
  revisionati** (revisione finale + correzioni approvate). Slot/Tier/pity/striscia gialla, boosted come righe del
  master, preset (B0306-B0308 con guilt al massimo, notice 40734, confermato dall'utente), popup del Nova acceso
  (LWF JP + logo NOVA, risorse 41; `KHUX_GUILT_BURST_POPUP=0` lo spegne), livelli del Nova nelle righe medal
  (`make-nova-rows.js`); **regola originale 13-bis**: ogni 7★ di Tier 9 estratta da banner dal 2019-01-01 (notice
  48236) e di Tier 10 dal 2019-09-01 (notice 56838) arriva con pallini e guilt al massimo (`gacha-data.MAX_GUILT_FROM`).
  Prova 7 dell'utente fatta (popup del Nova da B0306). Comandi di generazione in [shop.md#sp2b](docs/notes/shop.md#sp2b).
- **Sessione al banco finale del 2b fatta** (17-10 sera, [shop.md#banco-finale-2b](docs/notes/shop.md#banco-finale-2b)):
  suoni JP (I-152 chiuso: x10, Evolve, Nova), 7★ Tier 10 a +320% con i due popup del Nova (B0619, B0637), Evolve con
  guilt senza popup fuori posto. **I-153 chiuso** (striscia della pity con liste lunghe: buffer di 0x400 byte del
  client; commit 086ab8e, master BASE 123, [shop.md#i153](docs/notes/shop.md#i153)): oltre 900 byte di nomi testo di
  categoria con `validComment` 1 (16 banner), provato al banco il 17-10 (B0637 «Draws left» 2 -> 1 -> 3 dopo la pity,
  B0771 categoria, B0619 ancora col nome). **Il sotto-progetto 2b e' chiuso.**
- **Audit dei banner contro i notice ufficiali** (17-10, `D:\Progetto_Restauro_KH_UX\tmp\sp2b\notice_audit\`,
  report.md + findings.tsv + overrides_proposed.tsv): 155 differenze su 122 banner (regole G1-G10: deal 7★/Prime
  2018 con SA + SAB max + skill, «If you receive the following Medals ... N dots», «0 dots», Daily/Small Deal,
  limiti, Power Gems, Tier massimi persi). **Sotto-progetto 2c «Promesse dei notice»: brainstorming iniziato il 18-10,
  IN PAUSA** perche' l'utente vuole prima le skill (sotto). Decisioni gia' prese: (a) ogni promessa che il client non
  mostra o che non possiamo dare si dichiara nelle Notices (come lo slot Trait); (b) G1: SA sbloccato + pallini e
  guilt al massimo + skill al massimo solo sulla 7★ garantita (e copie dove il notice lo dice); notice 43549 = solo
  la garantita della 5ª estrazione, le copie uscite prima no; (c) G2: skill al massimo come promessa dal notice
  (dopo le skill); (d) G3: potenziamento a 3 pallini su Daily/Small Deal legato alle date dei deal sull'orologio
  finto. Restano da discutere G4-G10, casi singoli, dubbi D1-D9.
- **Sotto-progetto «Skill» (I-146) fatto il 18-10** (commit 6f9e3c3..75d00ab, rev 124): 163 skill (25 vere + 138 dal
  wiki), curva vera, EXP a fine missione, migrazione dei salvataggi, notice; provato al banco
  ([medaglie.md#skill-banco](docs/notes/medaglie.md#skill-banco)). **Seguito del 18-10 sera** (rev 125, risorse 41
  con -Quick): Second Chance e Attack Boost provati in battaglia (danno max 43.962 -> 152.323 con
  `-SkillProb 0/100`); unita' dei campi verificate nel client e 98 righe ricostruite corrette (2be5bd0); crash del
  Level Up dopo il risultato (I-156: `userSkills` del ramo 55 = da cancellare), pulsante Overwrite (I-157), icona
  Lux Plus (I-158), icone numerate (I-159), NPC muti (I-154, `text/drama`), base buff «Medal STR +N» della Naminé
  (I-155, provato dall'utente). Opzioni del banco `-EnemyAtk N` e `-SkillProb P` ([banco.md](docs/notes/banco.md)).
  Combo GA provata dall'utente (AB VIII Max & Lux++ & GA 1 su Roxas: speciale a 1 gauge invece di 3; GA N =
  costo fisso N). Righe sospette risolte (94ca26a, rev 126): Lux Plus x1,5 e icone 6-9 della 4.3.1
  ([medaglie.md](docs/notes/medaglie.md), `ERA_431`); 163 Scrooge 5★ con una skill ciascuna nel salvataggio
  (userMedalId 2701-2863, backup `tmp\skill\player-before-scrooges.json`), icone confermate dall'utente.
  Resta: tutorial JP di I-159 (nessuno visto finora).
  **2c ripreso da G4 (18-10 sera)**: i Tier 2016-18 non sono mai cambiati, min..max sul Tier di oggi = liste
  storiche (`tmp\sp2b
otice_audit\g4_historical_tiers.md`), B0154 lista di 17 nomi, XIII Deal 10 nomi.
  MA i 13 id Org XIII originali (31176...) sono Tier 8 per un NOSTRO errore di mapping (medal_gen -> righe
  Roboloid «X [+]»; i 3004xx «X A» sono nostri doppioni; alias SN++ di 32236/33236 sbagliati):
  `tmp\sp2b\g4\orgxiii_migration.md`. Audit globale del mapping in corso (`tmp\sp2b\g4\medal_mapping_audit.md`),
  poi piano di correzione da mostrare all'utente, poi G4 e G5-G10.
- **In coda dopo I-153 e il 2c (deciso dall'utente il 17-10): sotto-progetto «Trait Medal» (I-084)**. Oggi lo slot
  Trait dei banner (89 promesse, es. B0619/B0637 slot 2, icona grigia «x1») da' una 6★ qualsiasi (ripiego dichiarato in
  Details e Notices). Da fare: righe delle Trait Medal nel master (6★ in grigio legate a una medaglia, Album), fusione
  con +1 trait e +1 pallino dal server, uscita nei banner al posto del ripiego
  ([medaglie.md#trait-medal](docs/notes/medaglie.md#trait-medal)).
- Aperti dello Shop: I-139 (24 INCOMPLETE), I-140 (filtro Epic), I-141 (immagine di B0612), I-142 (Blue Fairy Deal),
  I-143 (tocco perso dopo le Notices), I-145, I-146 (abilita' mancanti), I-150 (nomi guasti del catalogo), I-151
  (liste che salgono di stella). Dopo: **sotto-progetto 3** (catalogo con filtri, sblocchi, rotazione, stagionali; la
  chiusura dei Details non ricarica la lista).
- **Banco (18-10 sera)**: salvataggio COMPLETO rimesso (copia intatta in
  `D:\Progetto_Restauro_KH_UX\tmp\save-backup-before-nova-test\player.json`; il ridotto del 17-10 in
  `tmp\save-before-skill`), migrato alle skill (`skillVersion` 1), rev 124. Modifiche di prova: skill date a SP Roxas
  (762, ora Attack Boost VII 20/20 dopo l'Overwrite, LV 49), SP Axel (766, Second Chance 15/15), 2141 (Attack Boost VI),
  2204 (Second Chance); Donald Ver. A (120) consumato nel Level Up. Poi: Leon (2459) Lux Plus 15/15 LV 35 (consumati
  Scrooge 452/453, Wakka, Auron); deck di Lady Luck = Roxas + 4 Wakka (prove del danno). L'utente ricomincera' da zero
  sul telefono a lavoro finito: consumare medaglie per le prove va bene.
- Altri lavori in attesa (Limited I-118, Blue Fairy e PvP I-126, NPC JP, crash intermittenti, decisioni dell'utente
  del 16-10): [fino-al-2026-10-16.md](docs/journal/fino-al-2026-10-16.md) e [ISSUES](docs/ISSUES.md).

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
