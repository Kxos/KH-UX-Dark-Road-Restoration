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

Stato del banco: **risorse 56 installate** (21-10 sera, 4,22 GiB su misc.mp4.2; prima: 49 (20-10: compattate, 3,90 GiB; oltre 4 GiB provato con la 48, I-171 chiuso), **revisione master: BASE 174** (default dei 4 script di sessione; il server manda `BASE*100000 + scadenze passate`, [server.md](docs/notes/server.md#orologio)). Orologio finto
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
  **Org XIII corretta (18-10 notte, rev 127, I-160)**: `MEDAL_MAP_FIX`/`EVOLVE_FIX` nel generatore, 13 6★ [+] nuove con
  immagini (risorse 42), catalogo e migrazione del salvataggio (96a7515, ba2922d, 4f1c8a7, 247fbed; test d3105e4)
  ([medaglie.md#mapping-orgxiii](docs/notes/medaglie.md#mapping-orgxiii)). Aperti: I-161 (SN++ adjusted), I-162 (167 6★
  senza evoluzione). Banco 18-10: migrazione sul salvataggio vero, 6★ Tier 3, Evolve con 5 Blue Fairy [3], Vexen [+] da
  regalo visti; rev 128 nomi «X A» sulle 5★/6★ SE (e53b3d4); risorse 43 grafica «X A» sulle 23 6★ SE, che avevano quella
  della [+] (989d5de); immagini e filtri confermati. Revisione finale del piano: medalMapVersion 2 (record Nova), test,
  catalogo e docs (0e77901). Guilt: l'eccedenza dei pallini sblocca la guilt come l'anteprima del client (6f74ac2, Vexen
  [+] 2865 del banco corretta a mano: guilt 20100). **Banco 19-10 fatto**: +201% visibile, rilancio (popup «Bonus
  range», non scende) e sblocco per eccedenza (3 + 1 + 2 > 5 -> 171%) provati
  ([guilt.md#banco-1910](docs/notes/guilt.md#banco-1910), [diario](docs/journal/2026-10-19.md)).
  Animazioni della guilt originali (I-163, risorse 44, [guilt.md#lwf-originali](docs/notes/guilt.md#lwf-originali)).
  **G4 del 2c fatto (19-10, rev 130, [shop.md#sp2c-g4](docs/notes/shop.md#sp2c-g4))**: Tier dal notice, B0154 e
  B0046/B0047 a lista, rare originali SE solo col tiro «small». **G5 fatto (rev 131, [shop.md#sp2c-g5](docs/notes/shop.md#sp2c-g5)).** B0079 col mix della grafica (rev 132). Regola: la grafica del banner fa fede sulla wiki.
  **G6 fatto (rev 133, [shop.md#sp2c-g6](docs/notes/shop.md#sp2c-g6)).** **G7 fatto (rev 134, [shop.md#sp2c-g7](docs/notes/shop.md#sp2c-g7)).** **G8 fatto (rev 135, [shop.md#sp2c-g8](docs/notes/shop.md#sp2c-g8)).** **G9 fatto (shop.md#sp2c-g9).** Scrooge con skill dei 70 Skills to Thrill corretto e provato (rev 136, [shop.md#scrooge-bonus](docs/notes/shop.md#scrooge-bonus)). G9 provato al banco. **G10 fatto (rev 137, shop.md#sp2c-g10): gruppi G1-G10 chiusi.** **Casi singoli del 2c e G2 (abilita' al massimo dal notice, rev 139) fatti (rev 138, [shop.md#sp2c-singoli](docs/notes/shop.md#sp2c-singoli))**: campi `pity`/`max_skill`/`exclude`, pity «every», B0418 rimandato a I-142. Dubbi D1-D9 chiusi (rev 140, [shop.md#sp2c-dubbi](docs/notes/shop.md#sp2c-dubbi)); D8 fatto (rev 141, 72 notice ritrovati in `referenceanners
otices_recovered_d8.json`). **Sotto-progetto 2c chiuso.** Conto alla rovescia della rotazione sotto i pulsanti dello Shop fatto. **Trait Medal (I-084): parte A fatta il 19-10** (trait dalla fusione, scelta Replace/Skip, risorse e suoni JP; spec e piano in docs/superpowers); **parte B fatta il 19-10** (rev 150, risorse 45: 313 Trait Medal type 9 in grigio, trait + pallino sulla loro medaglia, banner con le Trait Medal promesse, stessa medaglia = linea dell'Album; [medaglie.md#trait-medal-b](docs/notes/medaglie.md#trait-medal-b)); provata al banco dall'utente (fusione, filtro, banner). **Risorse 46** (19-10 sera): originali al posto delle ricostruzioni (I-170, `recon/tools/originals.tsv`), riserva del pacchetto generato 176 MB (I-171: sopra 4 GiB servirebbe misc.mp4.2). Sub-slot, Missioni e Profilo visti dall'utente. **Da verificare insieme**: Level Up con 2-5 materiali (incertezza segnalata dall'utente), Evolve (servono materiali), potenziamento/evoluzione del keyblade: **salvataggio di prova** `server/save/prove.json` (19-10, `node server/make-test-save.js`, banco con `relogin.ps1 -Save prove`; `player.json` intatto, si torna con un relogin senza `-Save`): keyblade 4/5/8 un passo prima del cambio di design (Olympia +2, Three Wishes +14, Counterpoint +19), 6/9 a +0; Evolve pronti 3088/3091 (Goofy/Donald 1★), 3094 (Wakka 3★), 3101 (Wakka 5★), 3112 (Lexaeus A 6★ -> 7★ con Blue Fairy), materiali x2; Level Up 3123/3124 (Wakka 5★), 3125 (Marluxia A 6★) + Fairy Godmother/Dewey/Cheshire Cat; munny 9.999.999. Evolve provati senza client (ok). **Prove dell'utente (19-10 sera) e correzioni, rev 151 + risorse 47** (installate e verificate le dimensioni la sera del 19-10; dopo, «UI sistema non risponde» e Notices vuote: domani prima riavviare LDPlayer + phaseb-guest.sh; il 6★ Lexaeus A del salvataggio di prova e' gia' evoluto in 7★): Evolve 1★-5★ (Tier solo da 6★, I-172; Godmother grigie = lucchetto), danno da thethiny/khuxwiki (I-173), medaglie nelle animazioni di Level Up/Evolve (alias, I-174), suono dell'evoluzione dei keyblade (I-175). **Prove del 20-10 fatte** (Evolve, Level Up, suoni dei keyblade ok; Lexaeus A 7★ x11.10 dopo la correzione della tabella burst scartata, I-173; medaglia condivisa nella lista amici e nello slot FRIEND in battaglia, I-177; avviso all'avvio del server se una tabella del master e' scartata). Vecchio piano: `relogin.ps1 -Save prove` (se l'installazione della 47 e' finita) e rifare con l'utente Evolve (Goofy, Donald, Wakka 3★ e 5★), Level Up 1-5 materiali (medaglie visibili nell'animazione), danno di Lexaeus A 7★ (x10.65-11.10), suono dei keyblade (Olympia, Three Wishes, Counterpoint). Annotato: login bonus giornaliero (I-176). `update-resources.ps1` non tocca KHUX START ne' il popup del download completo (a mano: (200,1020) poi Download (1220,715)). Fatti anche: HP originali (I-032), livelli Lux fino a 999 (I-167, master BASE 145), Limited con premi unici una volta sola (I-168). Annotati: Booster con gli eventi (I-166), Avatar Board «Reached LV 350..999!» mancanti. Grafica di Details/Draw Odds/Notices fatta; **rotazione settimanale dello Shop** (I-165, [shop.md#rotazione](docs/notes/shop.md#rotazione)). In attesa a lungo termine: I-164 (bilanciamento risorse dopo tutte le modalita').
- **Shop, sotto-progetto 3 fatto il 20-10** (stagionali, banner fissato, Limited coi biglietti, Catalog con anni e filtri, icone originali; [shop.md#sp3](docs/notes/shop.md#sp3), [diario](docs/journal/2026-10-20.md)). Banco: `relogin.ps1 -Save prove525 -RealNow 2026-12-08T10:00:00Z`. Prossimo: storia oltre la 525 (obiettivo 979) o login bonus (I-176), a scelta dell'utente.
- **20-10 pomeriggio/sera** ([diario](docs/journal/2026-10-20.md)): **login bonus** fatto e provato (I-176 chiuso); training
  del pet con la scelta dello Special Trait come l'originale; **Tricks dello Spirit** tutti e 22 (I-137 chiuso: tutti provati in
  battaglia, Blast con `target 2`), punti Spirit/ranghi dalla khuxwiki (`server/pet_points.json`),
  effetti pet_eff_0004-0006 dal JP (crash della speciale di Naminé risolto); **3 deck per keyblade** (I-179, pulsanti
  1/2/3 visti; quest 13 e 524 finite col deck 2); annotate I-178 (evoluzione delle Blue Fairy con 5 copie) e le Trait
  Medal nel Moogle Shop dentro I-164. **Animazioni originali degli speciali** (I-180, sera: colpi = testo, Terra 13 colpi
  visto dall'utente). Supernova a 1 colpo come l'originale (rev 160). **Attacchi originali dei nemici** (I-181 chiuso: stati alterati di nuovo, Esuna visto). **Crash nelle 86 stanze generate** (I-182 chiuso: segnaposto BTF da 45 byte, risorse 51). Banco: revisione **166**, **risorse 51** (4,09 GiB, tre pezzi), salvataggio `provetm`
  (prove525 + Trait Medal), `relogin.ps1 -Save provetm -RealNow 2026-12-08T10:00:00Z`. Dopo una modifica al server
  usare sempre `relogin.ps1`: riavviare solo il server fa perdere la sessione al client («6 ERROR :185»).
- **STATO AL 21-10 SERA — RIPARTIRE DA QUI.** Banco: **risorse 56** installate, **master rev 174**, salvataggio di prova
  **`provefine`** (provetm con tutte le 979 missioni finite): `relogin.ps1 -Save provefine -RealNow 2026-12-08T10:00:00Z`.
  Dopo `update-resources.ps1` toccare a mano KHUX START (200,1020) e Download (1220,715); se compare «Launcher3/UI sistema non
  risponde»: «Attendi» (640,649) o reboot + `phaseb-guest.sh` + relogin. Registro dei lavori (non in git):
  `.superpowers/sdd/2026-10-21-missioni-526-979/progress.md` (rulings, minor rimandati, esiti per task).
- **Missioni 526-979 (I-009): FATTE e provate al banco** (piano `docs/superpowers/plans/2026-10-21-missioni-526-979.md`, Task 1-6
  completi e revisionati, Task 7 = banco in corso): righe master (`make-story-oltre.js`: Q555 per Unione, Q978 onlyDrama, mondi di
  Ralph 11-14, musiche per missione da khwiki I-198, 81 obiettivi originali + Trophy 61-63 di Bad Guy Breaker), nemici
  (`make-enemy-oltre.js`: 62 cloni esatti base 5-poi-4 cifre, 250 cloni di famiglia dalla proposta in
  `reference\world_schema\oltre525\enemy_clone_proposal.json`, D-A), 457 stage JP importati (`import_orig_stages.py --oltre`,
  Lv dalla wiki I-195), 28 stanze (`make_jp_rooms.py`), tendine 11-14 (glob I-196), NPC segnaposto (`npc_placeholders.py`, I-197).
  Provati: 526/527/555 (Unioni)/600/690/880 (Trophy)/911/951-955/979 (musica «The Key»). Chiusi I-183..I-193, I-195..I-198.
- **Danni variabili (I-189/I-193): fatti e provati** (`server/variable-power.js`, 707 righe tipo>2, Critical con criticalPower).
- **APERTO, priorita': grafica dei nemici/NPC (I-194).** Regola dell'utente: originali sempre prima; ordine = originali diretti >
  copie originali (`recon/tools/jp_dedup_donors.tsv`, `extra_donors.tsv`, regole >=99% sul 2016) > ricostruiti
  (`jp_reconstructed.tsv`) > ricolorati (`jp_recoloured.tsv`) > sostituto Dark Road stessa specie (`DR_LOOK` in
  make-enemy-oltre.js). Oggi 312 righe 526-979: 44 grafica propria, 31 Dark Road, 147 base; 117 famiglie incomplete (boss: Jafar
  Cobra/Genie, Dragon Maleficent, Darkness, Ephemer&Skuld (boss della 979, video https://www.youtube.com/watch?v=vgIlsu_W7Ns 12:22),
  King Candy, Cy-Bug...; 52 NPC invisibili). Fonti automatiche ESAURITE (dump JP 4.3.1, OBB JP 5.0.1 in
  `external\[archive item]`, IPA JP 4.4.1, WW 5.0.1, 2016, Wayback: niente). Prossimi passi: (1) 20 texture di effetti
  `show_effect2`/`eff_1004`: usare gli originali UX dell'IPA 4.4.1 (`tmp\jp441esolved_441.tsv` righe exact441-over-501) al posto
  delle immagini DR; 18 alias Shadow; bug `tools/segdl.ps1` ($args); (2) boss: abbinamento visivo dei pezzi nei filmati
  `lwf/drama` (candidati in `tmp\enemy_src2`); (3) contatti dell'utente: thethiny (chi ha fatto lo zip JP 4.3.1?),
  Roboloid/Ultimadei (Reddit [handle removed], [handle removed]), ShardofTruth (KH Wiki), appello community (testi pronti nella chat del
  21-10); crediti gia' nel README (0cb3827).
- **Altri aperti annotati dall'utente**: I-191 (banner attivi nella home), I-192 (WebView Beginner's Guide), controlli con i dati
  Roboloid (Supernova, buff) e con la pagina Special Attack della wiki (16 colpi, Rapid Storm, 2 condizioni; tmp\sa_wiki), pagina
  web finale «Kingdom Hearts Re-Union X» solo come ULTIMO task (memoria).
- **Trait Medal (I-084)**: parti A e B fatte, **banco 20-10 ok** ([medaglie.md#trait-medal-b](docs/notes/medaglie.md#trait-medal-b)).
  Moogle Shop delle Trait Medal rimandato al bilanciamento (I-164); resta la raggiungibilita' dei deal Trait (storia oltre il 2018).
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
