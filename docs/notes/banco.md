# Banco LDPlayer: avvio, script, cattura dei crash

Note tecniche del banco di prova. Storia completa in
[../journal/fino-al-2026-10-11.md](../journal/fino-al-2026-10-11.md).

<a id="posizioni"></a>
## Dove sta tutto

- Repository: `D:\Progetto_Restauro_KH_UX\Android\KH-UX-Dark-Road-Restoration` (Claude Code va
  aperto da qui). Tutto il lavoro sta su D: per lo spazio su C:.
- LDPlayer 9.5.37: `D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9` (istanza 0, Android 9, ABI
  arm64-v8a tradotta da houdini, root via `ld.exe`). APK 4.3.1 **originale** (il patchato si ferma
  all'anti-repackaging di LIAPP, vedi [protector.md](protector.md)):
  `D:\Progetto_Restauro_KH_UX\apk\khux-4.3.1-original.apk`.
- Ghidra 12.1.4: `D:\Progetto_Restauro_KH_UX\Android\ghidra_12.1.4_PUBLIC_20260921` (junction dal
  vecchio `C:\work\Android\ghidra_…`), progetto in `recon/ghidra/project` (non versionato).
- Screenshot e tombstone: `D:\Progetto_Restauro_KH_UX\screenshots` (passano dalla cartella
  condivisa `Documents\XuanZhi9\Pictures` e vengono spostati). Log del server:
  `D:\Progetto_Restauro_KH_UX\logs\server.log`.
- Salvataggio del giocatore: `server/save/player.json` (escluso da git; `KHUX_SAVE` lo cambia).
- Risorse servite: `D:\Progetto_Restauro_KH_UX\resource_data\<N>\{data,index}`; pacchetto generato
  in `D:\Progetto_Restauro_KH_UX\stage_gen\files\` (vedi [risorse_layout.md](risorse_layout.md)).
- Catalogo delle risorse: `D:\Progetto_Restauro_KH_UX\catalog\` (`index.html`, `textures.tsv`,
  `layouts.tsv`, `missing_layouts.txt`).
- Riferimenti visivi degli originali: `D:\Progetto_Restauro_KH_UX\reference\<schermata>\` (fonti in
  `SOURCES.md`); yt-dlp in `D:\Progetto_Restauro_KH_UX\tools\yt` (con `PYTHONPATH` e
  `--js-runtimes node:<node.exe>`).

<a id="avvio"></a>
## Avvio da spento e ripresa

```powershell
# 1. emulatore (se spento)
D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9\ldconsole.exe launch --index 0
# 2. server + rientro del giocatore salvato fino alla home
.\tools\ldplayer\session\relogin.ps1 -Tag x            # default -Revision 81
# 3. OBBLIGATORIO dopo ogni avvio dell'emulatore (CA di sistema, orologio 15/5/2021,
#    DNS verso il PC, DNS privato spento, dirottamento TCP 80/443 del gioco)
D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9\ld.exe -s 0 "sh /mnt/shared/Misc/phaseb-guest.sh 192.168.1.185"
```

- Senza `phaseb-guest.sh` il client non raggiunge il server e resta sul popup «End of Service»
  (scadenza a data dentro il client: l'orologio del guest va tenuto prima del 29/6/2021).
- Lo script sta in `tools/ldplayer/phaseb-guest.sh` e va copiato in `Documents\XuanZhi9\Misc`.
- Dopo un riavvio dell'emulatore il client puo' riscaricare tutta l'ultima versione (~3 GB, minuti).
- Altri script di sessione (`tools/ldplayer/session/`):
  - `cycle.ps1 -Tag x`: da NUOVO giocatore (cancella il salvataggio);
  - `run-server.ps1 -Revision 81 [-TutorialFinished]`: solo il server (parte staccato con
    `Win32_Process.Create`: con `Start-Process` moriva con lo script); `-GachaShow B0306,B0456` (anche in `relogin.ps1`):
    banner del catalogo aggiunti alla lista dello Shop (`KHUX_GACHA_SHOW`, [shop.md](shop.md#sp2));
  - `update-resources.ps1`: fa scaricare l'ultima versione completa (~5 min) e attende la fine
    dell'installazione (interromperla lascia `files/r` a meta': crash su `MyPageScene_ver340`);
  - `build-resources.ps1 -Version N` / `-Quick`: vedi [-Quick](#quick);
  - `story.ps1`, `sweep.ps1` (mappatura dei pulsanti, rapporto in `logs\sweep.txt`).
- **Revisione master**: alzarla di 1 nei 4 script (`cycle`, `relogin`, `run-server`,
  `update-resources`) dopo ogni modifica di `server/master_data`, poi `relogin.ps1` (due volte se
  il primo va in crash dopo il download dei master).
- **Non riavviare il SOLO server a sessione aperta**: senza rifare il login non decifra piu' i
  corpi (stageId perso). Usare sempre `relogin.ps1`.
- Il DNS IPv4 della scheda Ethernet di Windows deve essere **192.168.1.185** (il PC) durante le
  prove e tornare **automatico** a fine sessione.

<a id="quick"></a>
## Ciclo rapido `-Quick` e versioni delle risorse

- `tools\ldplayer\session\build-resources.ps1 -Quick` (~40 s): rigenera il pacchetto generato
  dentro l'ultima versione e lo scrive direttamente nei file del guest (coda di
  `files/r/misc.mp4.1` + `misc.png`), poi riavvia solo l'app. Niente download **a patto che le
  dimensioni non cambino**: se cambiano il client butta le risorse (`resourceRevision 0`) e
  riscarica tutto. Le versioni complete (dalla 26) riservano 4 MiB al pacchetto generato (16 MiB
  dalla 29) e un nome di riempimento nell'indice (riserva indice 64 KB); `-Quick` torna alle
  dimensioni installate (`resource_merge.py --index-size`). Se il pacchetto supera la riserva serve
  una versione completa.
- `-Quick` riscrive solo l'ultimo pezzo: le immagini delle medaglie (`medal_gen`, penultimo pezzo)
  entrano solo con una versione completa.
- **Mai `-Quick` se esiste una cartella di versione piu' nuova di quella installata**: scrive la
  piu' nuova nel guest (dati corrotti).
- Una versione completa (`build-resources.ps1 -Version N`) viene annunciata subito dal server e
  scaricata dal client: farla solo a banco fermo, poi `update-resources.ps1`.
- `resource_merge` tiene in cache indici decifrati e keystream in `%TEMP%\khux_bgi_cache` (1 s
  invece di 60).
- Stato all'11 ottobre: **risorse 32, revisione master 81**.

<a id="script"></a>
## Script del banco (`tools/ldplayer/`)

- `bench_lib.ps1`: funzioni comuni senza attese fisse. Lo schermo si legge nel guest
  (`screencap` grezzo, 16 byte di intestazione, `dd` dei soli pixel utili, ~0,2 s). `Step` tocca e
  attende la schermata successiva riconosciuta dai pixel; `WaitLog` attende una richiesta nel log;
  `Swipe`; `SkipDialog` (SKIP chiaro a (155,50), riquadro (247,190,99) a (500,1000));
  `DismissTutorial`, `GameWait`, `FindTarget` (indicatore rosa TARGET), `FindSpotlight`.
- `bench_flow.ps1 -Out <log> [-Until name|editor|union|battle]`: nuovo giocatore fino alla prima
  battaglia (~42 s). `bench_prologue.ps1 -Out <log> [-Seek] [-Shot x]`: Prologue e risultati;
  `-Seek` segue lo schermo (vale per ogni stage). `bench_start.ps1`: giocatore esistente.
- `smoke_quests.ps1 -Stages ...` + `server\save\smoke.json` {stageId}: il server propone solo
  quella missione, lo script la avvia e controlla l'app (~75 s a missione).
  `recon/tools/smoke_pick.py` sceglie le 76 missioni che coprono stanze e nemici.
- `route_1060.ps1`: tocchi della 1060 (scala ~1,7 px per unita' di mappa, personaggio a
  ~(770,600)).
- **Limite noto di `-Seek`/`FindSpotlight`**: sulle mappe scure (nebbia) scambia lo sfondo per il
  cerchio del tutorial e non fa passi; la 1070 (bosco) si blocca sull'albero; nella 1030 non ha
  visto un `/stage/clear` arrivato (vedi ISSUES I-008).
- Regola dell'utente: **i dialoghi con SKIP si saltano sempre**; i risultati si scorrono con OK
  (960,965).
- Prove delle uscite multi-parte: spostare temporaneamente la partenza STG vicino all'uscita,
  poi ripristinare e rifare `-Quick`.

<a id="tocchi"></a>
## Tocchi noti (schermo 1920x1080)

- Home: MENU `1790,45` (menu a tendina), Moogle Shop `288,1000`, Profilo (avatar) `260,95`,
  rotolo Missioni `425,130`, Other `1740,963`; frecce ‹ › delle pagine della home: non toccarle (la
  seconda pagina e' Dark Road).
- Medal List: MENU `1790,45` poi `1745,697`; Sell Medals `335,262`, medaglia `637,600`, Sell
  `350,1005`, conferma `1220,715`, OK `960,712`.
- Profilo: Titles `330,1030`, Name/Message `808,1030`, Play Style `1155,1030`, Outfits `1590,1030`.
- Moogle Shop: Traits `340,250`, Items `700,250`, Exchange prima riga `1213,512`, OK `1220,712`;
  trait: riga STR +1000 `600,400`, «Select Medal» `788,1012`, poi trascinare la medaglia sullo slot
  (`Swipe 1640 290 630 330 900`), «Set Trait» `840,1010`. Sell Materials `1205,250`, materiale
  `1200,430`, Sell `1183,930`, conferma `1220,715`.
- Battaglia: speciale = swipe **rapido** in diagonale sulla medaglia, `Swipe 130 790 400 520 150`
  (gesti da 300-400 ms o verticali non funzionano).

<a id="crash"></a>
## Ricetta per un crash del client

1. `tools/ldplayer/tombstone.ps1`: dall'ultimo tombstone gli indirizzi ARM (Ghidra) sospetti. Sotto
   houdini il backtrace e' tutto in `libhoudini`, ma: i registri x86 contengono l'istruzione ARM
   corrente (es. `rbx = 0xf9400808` = `ldr x8,[x0,#0x10]`), e lo stack di houdini conserva PC e
   ritorni del codice tradotto (valori nella mappatura `r--` di `libcocos2dcpp.so`; Ghidra = valore
   - base + `0x100000`). Le coppie fp/lr sotto rsp sono la catena ARM vera.
2. Se non basta, **armtrace** (`tools/ldplayer/armtrace/`, vedi il suo README): `capture.ps1 -Arm`,
   provocare il crash, `capture.ps1 -Collect`, **sempre `-Release`** (altrimenti i tombstone
   restano spenti). Ferma il processo sospendendo `tombstoned`, legge la memoria con
   `process_vm_readv` (LIAPP uccide il gioco se si apre `/proc/<pid>/mem`: codice 17471875) e i
   registri ARM emulati dallo stato di houdini. `vmread` si ricostruisce con `build_vmread.py`.
3. `armtrace\stackcap.ps1 -Tag x [-MenuY 697] [-NoMenu] -Taps 'x,y'` cattura lo stack ARM al crash;
   `-NoStart -WaitSec N` arma la cattura mentre un altro script provoca il crash. **Non troncare
   l'output con `Select-Object -First`**: interrompe lo script prima del `-Release`.
4. `findregs.py` (cerca nelle sottocartelle, accetta pc fuori dalla libreria; `--lib-pc` per il
   vincolo vecchio), `backtrace.py`, e le stringhe corte di libc++ rimaste nello stack (byte =
   lunghezza*2, poi il nome).
5. **Base della libreria**: cambia a ogni avvio dell'emulatore (0x31c0000 il 9 ottobre, 0x31d4000 il
   10, 0x320c000 e 0x3314000 l'11). stackcap la stampa: passarla con `$env:KHUX_BASE` a
   `findregs.py`/`backtrace.py`. Con una base sbagliata si ottengono piste false (la «PetInfoDialog»
   dell'11 ottobre). `capture.ps1` presume 0x3308000: sottrarre la differenza.
6. **pc/lr fra 0x11ad000 e 0x11b2000 = GUIReader = layout cocostudio mancante**: il percorso del
   layout e' in un registro (x24 o simili). Elenco in `catalog\missing_layouts.txt`.
7. Poi `recon/ghidra/decomp.ps1 -Out <file.c> [-Timeout s] <indirizzi>` e
   `recon/tools/widget_lookup.py` per i nomi dei widget che il codice cerca. Vedi
   [analisi.md](analisi.md).

<a id="ldplayer"></a>
## LDPlayer: inciampi
- **Errore «g_pPipeMemHead->arBufHead[i].usingPipeId != nPipeId» e crash di LDPlayer** (11 ottobre, due volte): piu' ld.exe insieme (missione in background + cattura o screenshot ogni secondo) o un ld.exe ucciso a meta' corrompono la memoria condivisa delle pipe. Ora Sh di bench_lib.ps1 (e tombstone.ps1) passa da un mutex di sistema Global\khux_ld_exe: un ld.exe alla volta anche fra script diversi. Mai Stop-Process su ld.exe: se resta appeso, ldconsole quit e launch.

- adb non si apre su questa versione: si usa `ld.exe -s 0 "<comando>"` (shell root nel guest) e
  `ldconsole installapp --index 0 --filename <apk>`. `ldconsole quit` puo' non bastare:
  `quitall`. La config (`vms\config\leidian0.config`) si modifica solo a istanza spenta.
- Screenshot dall'interno del guest: `ld.exe -s 0 "screencap -p /sdcard/Pictures/x.png"`.
- Rete: NAT Network VirtualBox `LdNatNetwork0` (172.16.1.0/24). Se un riavvio rapido lascia orfano
  `VBoxNetDHCP`, `VBoxNetNAT` non parte e il guest non ha rete: `ldconsole quitall`, attendere che
  `Ld9BoxHeadless` sparisca, terminare `VBoxNetDHCP`/`VBoxNetNAT`, rilanciare. Con l'istanza accesa
  devono esserci entrambi.
- DNS: VirtualBox scarta i DNS di loopback (mettere l'IP LAN del PC) e passa il DNS al guest solo
  all'avvio dell'istanza; nel guest il DNS privato opportunistico va spento (fatto da
  `phaseb-guest.sh`: `private_dns_mode off`, REJECT sulla 853, DNAT della 53 verso il PC).
- LDPlayer si e' bloccato (ld.exe appesi): `ldconsole quit/launch` + `phaseb-guest.sh`.
- Memoria: dopo vari download da 2,3 GB `Ld9BoxHeadless` arriva a 30 GB impegnati e Windows rifiuta
  `ld.exe` («file di paging troppo piccolo»): `ldconsole quit --index 0`, `launch`,
  `phaseb-guest.sh`. Non proporre all'utente di pulire C:.
- Il link «LDPlayer 9» del sito installa LDPlayer 14; il pacchetto vero:
  `https://res.ldrescdn.com/download/package/LDPlayer9.0.exe`.

<a id="git"></a>
## Regole pratiche dell'ambiente

- PowerShell (Git Bash si blocca su D:); file UTF-8 senza BOM; `git -c safe.directory=*`,
  `git commit -F <file>`, `git pull --rebase` prima del push (altri agenti committano insieme).
- Non chiamare `R` una funzione PowerShell (alias di Invoke-History).
- Python degli strumenti sempre con `-I`.
