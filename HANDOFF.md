# Ripartire su un'altra macchina

Tutto ciò che serve per continuare il progetto altrove. Il repository contiene solo
codice e documentazione: binari, certificati e progetti di analisi vanno rigenerati, e
qui c'è come.

---

## 1. Dove siamo

| Fase | Stato |
|---|---|
| 1–2 · Ricognizione | ✅ completata — vedi [REPORT.md](REPORT.md) |
| A · Analisi statica | ✅ completata — vedi [PHASE-A.md](PHASE-A.md) |
| B · Server | ✅ scritto e testato in locale |
| **Test sul dispositivo** | 🟢 **il client parte** — APK **originale** su **LDPlayer 9 (Android 9)**: LIAPP dà verdetto `0` e il gioco arriva alla **schermata del titolo**. Su Android 12 e 16 rifiuta con `13380225`: **la causa è la versione di Android**. Il `90` dei test precedenti era l'anti-repackaging del nostro APK patchato. Rete del guest risolta. Prossimo: server + CA di sistema + DNS, poi KHUX START |
| C · Campi `master::` | ✅ completata — vedi [PHASE-C.md](PHASE-C.md) |

### Quello che sappiamo, tutto ricavato dal binario

- Il client prende la base URL dalla **risposta** di bootstrap, non da una costante
- Contratto: bootstrap → `{maintenance, url, nativeToken}`; sessione →
  `{nativeSessionId, sharedSecurityKey}`
- La richiesta invia `UUID`, `deviceType`, `nativeToken`
- Header di autenticazione: `X-HTTP-USER-TOKEN: %s`
- Payload di login: `accessToken`, `platformId`, `platformType`
- Sette endpoint REST della chat (`%s/user`, `%s/chat/message/%d`, …)
- **La chiave AES la sceglie il server** → chi risponde all'handshake controlla il canale
- Per dirottare il client basta un redirect DNS: nessuna patch del binario

---

## 2. Il problema aperto — causa accertata il 7 ottobre 2026

**Il gioco si chiude dopo circa un secondo, su Android 16.** È il **protector che si
autotermina dopo un controllo d'ambiente fallito**, e lo dichiara lui stesso.

A ~170 ms dall'avvio del processo, subito prima dell'abort (Galaxy A54, Android 16):

```
E error : ErrorCode = 90
E error : 2026/10/07 11:43:51
E error : com.square_enix.android_googleplay.khuxww
E error : samsung
E error : SM-A546B
E error : 16                              <- la versione di Android, che quindi legge
E error : 004c4ba4-013462e6-07fbaf1b      <- 7 triplette; solo la prima e' stabile
  ... (altre 6)
F libc  : Fatal signal 6 (SIGABRT), code -1 (SI_QUEUE) in tid 23947, pid 23947
I Zygote: Process 23947 exited due to signal 6 (Aborted)
```

Non è un crash: è un rifiuto, con tanto di rapporto diagnostico. Il protector legge
modello, produttore, **versione del sistema** e orologio, e aborta.

> **Aggiornamento del 7 ottobre 2026 (sera): il protector è LIAPP di Lockin Company, e il
> `90` era colpa nostra.** Ogni `ErrorCode = 90` mai visto veniva dall'APK **patchato**:
> è l'**anti-repackaging** di LIAPP che vede la firma di debug. L'APK **originale** dà un
> altro codice, **`13380225`**, identico su telefono e su MuMu. Vedi «Mappa dei codici
> LIAPP», più sotto. Il rapporto qui sopra resta valido come forma.

**Le sette triplette non sono tutte impronte** — correzione a una prima lettura.
Confrontando due avvii diversi, **solo la prima è identica**; le altre sei cambiano ogni
volta. La prima è quindi un'impronta vera; le altre sei sono valori per-sessione, nonce
o roba derivata dall'ASLR. C'è molto meno da dedurre guardandole di quanto sembrasse.
La prima, `004c4ba4-013462e6-07fbaf1b`, è **identica anche su MuMu Player**, cioè su un
altro «dispositivo»: è un'impronta dell'**applicazione**, non del telefono.

Il literal `ErrorCode = ` **non esiste in chiaro da nessuna parte** — né in
`classes.dex`, né in `libcocos2dcpp.so`, né in `lib__57d5__.so`. È costruito a runtime
dal protector dopo essersi decifrato, il che conferma che il rapporto viene da lui. Cosa
significhi il codice 90 non è documentato pubblicamente.

### Due conclusioni precedenti da correggere

**Il criterio del backtrace non era applicabile.** Diceva: «se tra i frame compare
`lib__57d5__.so` → è il protector». Non comparirà mai. Tutti e quattro i tombstone
raccolti dicono **`2 total frames`**, entrambi dentro `libc` (`abort+156` e
`__libc_current_sigrtmin+4`, che è solo il simbolo esportato più vicino), **senza
`Abort message`**. Lo stack unwinder si ferma dentro libc, quindi nessuna libreria
dell'app può apparire nel backtrace, qualunque sia la causa. Il tombstone non era il
posto giusto dove guardare: **la risposta era nel buffer principale di logcat**.

**`SI_QUEUE` non dimostrava nulla.** Era stato letto come prova di un `sigqueue()`
deliberato, contrapposto a un `abort()` ordinario. Ma `raise()` di bionic usa
`rt_tgsigqueueinfo`, quindi quel `si_code` è anche quello di un `abort()` normale. La
conclusione era giusta per un'altra ragione — il rapporto del protector — non per questa.

### Ipotesi escluse, con il dato che le ha smentite

| Ipotesi | Esito |
|---|---|
| Rotto dal nostro ripacchettamento | ⚠️ **in parte vero**: l'originale si chiude anch'esso, ma con un altro codice (`13380225`). Il `90` è proprio l'anti-repackaging scatenato dalla nostra firma — vedi «Mappa dei codici LIAPP» |
| Librerie non allineate a pagine da 16 KB | ❌ i segmenti `LOAD` sono allineati a 64 KB |
| **Scadenza o licenza datata del protector** | ❌ Primo test: orologio del telefono al **7 marzo 2021**, stesso `ErrorCode = 90`. Non bastava, perché quella data è *precedente* alla build 4.3.1 (aprile 2021). Rifatto su MuMu Android 12 con root (`date 051512002021.00`, `auto_time 0`): orologio al **15 maggio 2021**, dopo la build e prima della chiusura del 30 maggio. Il rapporto stampa `2021/05/15 12:00:19` e dà **lo stesso `ErrorCode = 90`**. L'orologio di sistema non è la causa |

### Che cos'è `lib__57d5__.so`

Protector impacchettato (1 MB, entropia 7,94 bit/byte). Il caricatore è travestito da
classe Kotlin (`kotlin.coroutines.experimental.intrinsics.IntrinsicsKt__…$10`), fa
`System.loadLibrary("__57d5__")` in un `<clinit>` e poi centinaia di chiamate a un
decrittatore nativo, anch'esso camuffato. È referenziato da decine di classi in tutto il
dex: **non è rimovibile**, è uno strato di decifratura intrecciato nell'app.

### Come si riproduce la cattura

Il filtro predefinito `package:mine` di Android Studio nasconde queste righe. Da riga di
comando:

```bash
adb logcat -c && adb shell monkey -p com.square_enix.android_googleplay.khuxww \
    -c android.intent.category.LAUNCHER 1
# attendi ~10 s, poi:
adb logcat -d -b main,system,crash > run.txt
```

e filtra sul pid del processo del gioco — le righe che contano hanno tag `error`.

### Riscontro su Android 11: nessun rifiuto, ma il dato non regge

> ⚠️ **Ridimensionato il 7 ottobre 2026.** Su questo emulatore il codice ARM del
> protector non arriva mai a eseguire davvero: vedi il dump più sotto, e
> `HandleNoExec`. L'assenza del rifiuto quindi **non prova** che Android 11 passi il
> controllo: il controllo forse non è mai partito. Su MuMu Player, dove il protector
> gira davvero, rifiutano **anche Android 12 e 15**. Vedi «MuMu Player».

Provato su emulatore API 30 (Android 11), entrambe le ABI dell'APK.
**Nessuna riga `E error`, nessun `ErrorCode`.** Su Android 16 il rifiuto arriva a 0,18 s;
su Android 11 non arriva mai. Era stato letto come il primo riscontro diretto che il
controllo fosse legato alla versione del sistema.

Nessuna delle due varianti completa però l'avvio, per **limiti della traduzione ARM**,
non del gioco:

| ABI | Esito su API 30 x86_64 |
|---|---|
| `arm64-v8a` | muore a ~1,5 s, `SIGSEGV` / `SEGV_ACCERR`. Backtrace: `#01 libndk_translation.so (ndk_translation_HandleNoExec)`, `#04 <anonymous:…>` |
| `armeabi-v7a` | arriva più lontano — carica il nostro `network_security_config` — poi muore in silenzio, processo zombie, nessun tombstone |

`HandleNoExec` vuol dire che il traduttore non riesce a eseguire codice che l'ospite ha
prodotto a runtime: cioè precisamente quello che fa un packer che si decifra. Di
passaggio è confermato che **la patch dell'APK funziona**, perché la configurazione di
rete viene caricata.

### L'emulatore x86: quadro completo, e chiuso

La traduzione ARM esiste solo in una finestra stretta di immagini, e quella finestra è
già stata usata. Verificato, non dedotto:

| Immagine | `ro.product.cpu.abilist` | Esito |
|---|---|---|
| API 29 x86_64 | `x86_64,x86` | non installa — `INSTALL_FAILED_NO_MATCHING_ABIS` |
| **API 30 x86_64** | `x86_64,x86,arm64-v8a,armeabi-v7a,armeabi` | installa, nessun `ErrorCode`, muore nel traduttore |
| API 33 x86_64 | `x86_64` | non installa — `INSTALL_FAILED_NO_MATCHING_ABIS` |

Google ha aggiunto la traduzione ARM con API 30 e l'ha tolta dalle immagini più recenti.
**Nessuna altra immagine x86 può dire di più**: o non installa, o inciampa nel traduttore.
Controlla sempre `ro.product.cpu.abilist` dopo il boot, prima di perdere tempo.

> **Le immagini arm64 non compaiono in SDK Manager su un host x86.** Non è che non
> esistano: sono filtrate per architettura dell'host. Per averle serve `sdkmanager` da
> riga di comando — cioè installare *Android SDK Command-line Tools* dalla scheda
> *SDK Tools* — e poi chiedere il pacchetto per nome:
> ```bash
> sdkmanager "system-images;android-30;google_apis;arm64-v8a"
> ```
> L'emulatore include `qemu-system-aarch64`, ma **su host x86 non boota** — verificato,
> vedi il riquadro successivo.

### L'immagine arm64 su host x86: provata, chiusa

Provato il 7 ottobre 2026: `system-images;android-30;google_apis;arm64-v8a` (r16),
emulatore 37.2.12, Windows 11 su i5-9600K. **Il guest non arriva nemmeno al kernel.**
Non c'entra il gioco: è l'emulatore.

| Passo | Esito |
|---|---|
| `emulator.exe -avd …` | rifiuto immediato: `Avd's CPU Architecture 'arm64' is not supported by the QEMU2 emulator on x86_64 host` |
| `qemu-system-aarch64.exe -avd …` direttamente | il controllo sta solo nel launcher e si salta. Serve `emulator\lib64` (e `lib64\qt\lib`) nel `PATH`, altrimenti esce con `0xC0000135`, cioè DLL mancante |
| idem, con `-accel off` | supera i controlli e avvia il main loop, poi esce con codice 1 **senza messaggio** |
| `qemu-system-aarch64-headless.exe` | è l'unico binario che stampa l'errore vero: **`PCI bus not available for hda`** |

Il frontend inietta sempre `-soundhw hda`, e dispositivi `*_pci` per multi-touch e
Wi-Fi, anche con `-no-audio` e `hw.audioOutput=no`. La macchina ARM `ranchu` della build
Windows non ha un bus PCI. Senza `-avd` il binario non accetta le opzioni QEMU grezze
(`unknown option: -serial`), e `-qemu` può solo aggiungerne, non toglierle. Google non
mantiene più questo scenario su host x86. Restano solo un QEMU upstream senza i
dispositivi goldfish, molto lavoro con esito incerto, o un'altra strada.

> Se ci riprovi: con poco spazio su `C:` l'AVD si può spostare su un altro disco
> cambiando `path=` nel `.ini`. Il controllo di spazio guarda la cartella dell'AVD, e la
> partizione dati di default chiede 9,6 GB.

### Dump della memoria del protector: fatto su MuMu con root

Riuscito il 7 ottobre 2026, su MuMu Android 12 con root. La tecnica di base — congelare
il processo e copiare `/proc/<pid>/mem` — funziona, con due correzioni rispetto al primo
tentativo sull'emulatore Google:

- **la finestra è brevissima e il processo muore presto**: congelare a tempo fisso
  mancava sempre il bersaglio. Soluzione: `SIGSTOP` subito, poi far avanzare a scatti
  (`CONT` / `STOP` ogni 20 ms) finché in logcat non compare `ErrorCode`, e fermarsi lì.
  Così il processo resta congelato **dopo** aver scritto il rapporto ma **prima**
  dell'`abort`;
- **`dd` di toybox tiene `skip` a 32 bit**: con `bs=4096` gli indirizzi alti (`0x77…`)
  vanno in overflow e `dd` esce con `-NNN < 0`. La shell `mksh` fa anch'essa i conti a
  32 bit. Soluzione: calcolare gli offset in Python e passarli a `dd` in byte con
  `iflag=skip_bytes,count_bytes`, che li legge a 64 bit.

Gli script sono in `recon/tools/memdump/`, con un README. I dump non sono versionati:
stanno in `D:\Progetto_Restauro_KH_UX\dumps` (~200 MB).

**Cosa si è trovato:**

- **Il rapporto è assemblato a runtime.** La stringa `ErrorCode = 90\n…\nSM-A156E\n12\n`
  con le sette triplette compare **in chiaro sullo stack del thread principale**, non in
  nessuna libreria su disco. Conferma: il rapporto lo costruisce il protector dopo
  essersi decifrato, come già si sospettava.
- **Il protector scrive il verdetto su disco.** Il file privato
  `app_57d5/l5Xzi1ZFinmQC.txt` (nome a caso, costante tra gli avvii) contiene
  `90`, un timestamp Unix, `0`, e il `pid`. Cioè **codice d'errore, ora e processo**. Da
  verificare se a un avvio successivo lo rilegge: se sì, cancellarlo potrebbe cambiare il
  comportamento, ed è un esperimento a costo zero.
- **Vicino al rapporto, sullo stack, c'è una lunga lista di package di altre app**
  (`com.netease.*`, `jp.co.mixi.monsterstrike`, `kr.txwy.and.blhx`, …), la stringa
  `_ZN3art7Runtime15DisableVerifierE` e `/proc/sys/vm/pagecache_limit_switch`. Sono
  impronte tipiche di un controllo d'ambiente: cerca emulatori, strumenti e app note. Ma
  da solo non spiega il codice 90, perché **rifiuta anche sul Galaxy fisico**, dove quelle
  app non ci sono.

**Quello che manca ancora:** il dump cattura il codice ARM *tradotto da houdini*, non
l'originale, e non abbiamo ancora isolato *quale* controllo porta al 90. Il payload
decifrato vive nelle regioni `rwx` basse (`[anon:Mem_0x20000000]`, ~62 MB a `0x0d3ec000`)
e nelle librerie `nb/` tradotte. Il passo successivo è disassemblare quella regione, o
mettere un breakpoint prima della scrittura del file di verdetto.

### Il protector è LIAPP (Lockin Company) — identificato il 7 ottobre 2026

Le impronte del dump combaciano con **LIAPP**, il protector mobile della coreana
**Lockin Company**: il nome `lib__57d5__.so`, la lista di package di altre app sullo
stack, `DisableVerifier`, lo schema «rapporto `ErrorCode = N` + righe diagnostiche →
`abort`». La pagina ufficiale *LIAPP – learn more* elenca esattamente i controlli che
vediamo, e fa chiarezza sul codice 90.

**Cosa blocca LIAPP, per sua stessa documentazione:**

- **root** — «blocks execution on rooted devices»;
- **macchine virtuali** — «blocks execution on virtual devices», e **nomina NOX,
  BlueStacks e MuMuPlayer**;
- **anti-debugging** e **USB Debugging detection**;
- **memory protection** — «prevents unauthorized memory access and dumps»;
- anti-tampering / anti-repackaging, hooking, VPN, Fake GPS, macro, overlay;
- **licenza**: «apps LIAPP-applied within the license period can be used *permanently*».
  Cioè la protezione **non scade a runtime** e non valida nulla online: coerente con
  «nessuna rete prima del rifiuto». L'ipotesi «licenza scaduta» è quindi chiusa due
  volte — dall'orologio e dalla documentazione.

### Mappa dei codici LIAPP — misurata il 7 ottobre 2026

Il codice **cambia con la condizione**, e ogni condizione dà sempre lo stesso codice.
Misure dirette, `logcat` letto a ogni avvio:

| APK | Banco | Condizione | `ErrorCode` |
|---|---|---|---|
| **patchato** (firma di debug) | Galaxy A54 (16), MuMu (12, 15), LDPlayer (9) | qualunque | **90** |
| patchato | Galaxy A54 | opzioni sviluppatore **spente** | **90** |
| **originale** 4.3.1 | Galaxy A54, Android 16, **senza root** | opzioni sviluppatore spente | **13380225** |
| originale | Galaxy A54 | debug USB **acceso** | **13380225** |
| originale | MuMu Android 12, root | orologio di oggi | **13380225** |
| originale | MuMu Android 12, root | orologio al **15 maggio 2021** | **13380225** |
| originale | MuMu Android 12, root | **strace** agganciato | **40** |
| **originale** | **LDPlayer 9, Android 9, senza root** | nessuna | **nessun rifiuto** — verdetto `0`, il gioco arriva al titolo |
| originale | LDPlayer 9, Android 9 | lettura di `/proc/<pid>/mem` da root, a gioco vivo | **17471875** (memory protection) |

Letture:

- **`90` = anti-repackaging.** Compare solo con l'APK ri-firmato, su qualunque banco e
  qualunque stato del debug. **Tutta l'analisi precedente si basava su `90`** e quindi
  misurava la nostra patch, non il problema vero. In particolare, i test «esclusa la
  versione» (Android 9/12/15/16) e «esclusa la data» erano stati fatti col patchato: non
  dicevano nulla sul controllo che ferma l'originale. Quelli sono stati **rifatti con
  l'originale** (righe sopra).
- **`40` = anti-debug.** Compare quando un tracer (`ptrace`) è agganciato. Lo strace va
  usato sapendo che cambia la risposta.
- **`13380225` (`0xCC2A81`) è il codice dell'originale, ed è lo stesso ovunque**: telefono
  vero senza root e MuMu con root, Android 16 e 12, debug acceso e spento, data di oggi e
  di maggio 2021. Quindi **non** è VM-detection, root, versione di Android, debug USB o
  orologio. Lo strace dell'originale mostra anche **nessuna connessione di rete** prima
  del rifiuto, solo i socket locali di `logdw`/`statsdw`. È un controllo **locale, comune
  a tutti i banchi**, e non ancora identificato. Indiziati rimasti: integrità/installazione
  dell'APK (es. LIAPP che si aspetta lo split di Play invece dell'APK unico), un
  identificativo o una chiave di attivazione che non c'è, o un controllo legato al
  servizio Square Enix spento.
- **L'ipotesi «debug USB» è smentita.** Il telefono pulito col debug spento rifiuta lo
  stesso, con lo stesso codice di quando è acceso.
- **`13380225` = versione di Android non supportata — verificato.** Tutti i banchi su cui
  l'originale rifiutava sono **più recenti della build** (4.3.1 = aprile 2021, Android 11
  corrente): 12 e 16. Su **LDPlayer 9 (Android 9)**, senza root, l'originale **passa**.
  Vedi «Android 9: il client parte».

### Android 9: il client parte — 7 ottobre 2026

**Primo avvio riuscito del client in tutto il progetto.** APK originale 4.3.1 (hash
verificato nel guest) su LDPlayer 9.5.37, Android 9, ABI `arm64-v8a` via houdini, root
spento.

- **LIAPP lascia passare**: nessuna riga `E error`, nessun `abort`. Il file di verdetto ha
  un **nome diverso** da quello dei rifiuti — `app_57d5/SEgF3I_JinmQC0.txt` invece di
  `l5Xzi1ZFinmQC.txt` — e contiene `0\n<ts>\n0\n0`: codice **0**, tutto in regola. Accanto
  c'è un `data3.db` (71 byte, inizia con il path di `app_57d5`).
- **Il gioco gira**: motore Cocos, audio Square Enix (`sqexsdlib` 18.05.18.C), billing,
  Firebase, Facebook/Twitter SDK. Chiede l'accesso a **Google Play Games**
  (`AchievementManager: start login`): la schermata di Google fallisce per mancanza di
  rete, si chiude con «Indietro» e il gioco va avanti.
- **Arriva alla schermata del titolo**: «Version 4.3.1», pulsanti **KHUX START**, **KHDR
  START** e **x3 [ex tres]**, e un popup **«End of Service Notification»** («ended service
  as of Tuesday 6/29/2021… an offline version… is now available»).
- **Il guest non ha rete** (`ping`: *Network is unreachable*; DNS fallisce per tutti). Il
  popup di fine servizio quindi è **generato in locale** dal client, non scaricato. Il
  testo non è in chiaro nell'APK: sta negli asset cifrati. Va capito *quando* il client lo
  mostra (data? fallimento del bootstrap?): è la prima cosa da guardare con il nostro
  server in ascolto.
- Le preferenze del gioco (`Cocos2dxPrefsFile.xml`, chiave `data`) sono cifrate, formato
  con magic `BGAD`.

**Come si usa LDPlayer 9 qui:**

- **adb non si apre** con questa versione (9.5.37), nemmeno con
  `"basicSettings.adbDebug": 1` in `vms\config\leidian0.config`: nessuna porta in ascolto.
  Non serve: **`<ld>\ld.exe -s 0 "<comando>"`** esegue comandi shell nel guest, da
  root (`context=u:r:ldinit`), e **`ldconsole installapp --index 0 --filename <apk>`**
  installa. `logcat`, `pm`, `am`, `input`, `cat` di `/data/data` funzionano tutti così;
- per spegnerlo: `ldconsole quit --index 0` può non bastare, `ldconsole quitall` sì. La
  config si modifica **solo a istanza spenta**;
- con Hyper-V attivo (lo vuole MuMu) il boot richiede qualche minuto, poi l'uso è fluido;
- **screenshot dall'interno del guest**, non dallo schermo del PC (la finestra può non
  essere in primo piano e si cattura il desktop): `ld.exe -s 0 "screencap -p
  /sdcard/Pictures/x.png"` e il file compare in `C:\Users\<utente>\Documents\XuanZhi9\
  Pictures\` — cartella condivisa `vboxsf`, come `Misc` e `Applications`.

**La rete del guest — risolto.** Il guest sta su una *NAT Network* di VirtualBox,
`LdNatNetwork0` (`172.16.1.0/24`): DHCP su `.3` (`VBoxNetDHCP`), gateway su `.1`
(`VBoxNetNAT`), il guest prende `.4`. Il primo giorno **non c'era rete** perché un
riavvio rapido dell'istanza aveva lasciato **orfano** il vecchio `VBoxNetDHCP`: al
secondo avvio VirtualBox non riesce a ripartire la rete («Cannot start DHCP server
because it is already running», in `%USERPROFILE%\.Ld9VirtualBox\VBoxSVC.log`) e **non
lancia `VBoxNetNAT`**. Il DHCP risponde lo stesso, ma il gateway non esiste: ARP
`NUD_FAILED`, Android stacca e riattacca il Wi-Fi in ciclo, *Network is unreachable*.
Rimedio: `ldconsole quitall`, attendere che `Ld9BoxHeadless` sparisca, terminare
`VBoxNetDHCP`/`VBoxNetNAT` rimasti, rilanciare. Controllo: con l'istanza accesa devono
esserci **entrambi** i processi. Dopo: ping al gateway, a `8.8.8.8` e DNS funzionano.

**Con la rete, stesso popup di fine servizio**, e in 60 s nessuna connessione TCP
duratura del gioco verso Square Enix (solo chiamate brevi degli SDK: la Graph API di
Facebook risponde). Il bootstrap verso il server di gioco parte, con ogni probabilità,
solo premendo **KHUX START**: è il momento da catturare col nostro server.

**Per la fase B serve un'accortezza sul certificato.** L'APK patchato aggiungeva un
`network_security_config` che fa accettare le CA utente; l'originale non lo ha, e su
Android 7+ un'app con `targetSdk 29` **non si fida delle CA installate dall'utente**. Non
si può ripatchare (LIAPP → `90`). La strada è installare `server/certs/ca.crt` come **CA
di sistema** nel guest (in `/system/etc/security/cacerts/<hash>.0`), cosa possibile
perché `ld.exe` dà root.

### Fase B sul banco LDPlayer 9 — primi passi, 7 ottobre 2026 (sera)

**Il popup di fine servizio è una scadenza a data, dentro il client.** Con l'orologio del
guest al **15 maggio 2021** il popup sparisce e, premuto nulla, il client **tenta il
bootstrap** da solo all'avvio. Il testo («ended service as of Tuesday 6/29/2021», con la
versione offline) è negli asset cifrati della 4.3.1: il client lo mostra quando la data
supera la chiusura, **senza consultare alcun server**. Per tutta la fase B il guest va
tenuto con l'orologio prima del 29/6/2021.

**Il bootstrap fallisce con `A connection error has occurred (6 ERROR :251)`.** Il `6`
coincide con `CURLE_COULDNT_RESOLVE_HOST` di libcurl, e torna con i fatti: dopo l'errore
il client **non apre alcuna connessione TCP** (il contatore delle regole di dirottamento
resta fermo, lo SNI non arriva al server). Cioè **il nome dell'host di bootstrap non si
risolve più nel DNS pubblico** — mentre `psg.sqex-bridge.jp`, l'host ipotizzato in fase A
da `xlash123/khux-re-api`, risolve ancora (`34.54.148.120`, Google Cloud). Quindi
**l'host del bootstrap della 4.3.1 non è `psg.sqex-bridge.jp`**, o non solo.

**Il nome non si vede perché LDPlayer risolve fuori dal guest.** Verificato:
- regole `iptables` DNAT sulla porta 53: contatori a zero;
- `ndc resolver setnetdns` e `setprop net.dns1` verso il nostro DNS: le risposte non
  cambiano e il server non riceve query;
- un nome inventato risolto dal guest **non compare** nella cache DNS di Windows
  (`Get-DnsClientCache`): non passa neanche dal resolver del PC.
- `networkSettings.networkDNS: "192.168.1.185"` in `leidian0.config` (chiave trovata nei
  binari di `dnplayer.exe`, con `networkStatic`, `networkAddress`, `networkGateway`,
  `networkSwitching`): **nessun effetto**, il guest riceve ancora il DNS del router.

Perché: la rete è una NAT Network di VirtualBox, e `VBoxSVC.log` mostra
`HostDnsMonitor` che legge i **server DNS di Windows** e li passa al guest via DHCP; il
motore NAT inoltra poi le query del guest dal lato host. Ne segue che **l'unica leva sul
DNS del client è il server DNS configurato su Windows**: puntandolo a `127.0.0.1` (il
nostro server, che inoltra a `1.1.1.1` tutto ciò che non dirotta) le query del gioco
arriverebbero a noi, compreso il nome dell'host di bootstrap. Richiede privilegi e cambia
il DNS dell'intero PC finché è attivo, quindi va deciso da chi usa la macchina; il log
DNS del server (`server/logs/`, non versionato) in quel periodo conterrebbe anche le query
del PC.

**Leggere la memoria del client vivo lo uccide: `ErrorCode = 17471875`.** È la
*memory protection* di LIAPP che vede le letture di `/proc/<pid>/mem`, anche da root.
Sul processo vivo il dump non è praticabile; i dump fatti su MuMu non arrivano alla
fase del bootstrap (LIAPP li ferma prima), e contengono solo i domini del nostro
`network_security_config`.

**Strumenti sistemati stasera:**
- `start-server.bat` **si chiudeva subito**: il `^|` dentro le virgolette arrivava
  letterale a PowerShell (IP vuoto), e il ripiego `set /p … (es. …):` chiudeva in
  anticipo il blocco `if` con la sua `)`, facendo abortire `cmd` prima del `pause`. Ora
  il rilevamento dell'IP sta in `server/lan-ip.ps1`. **Non servono privilegi di
  amministratore**: su Windows le porte 53/80/443 si aprono anche senza;
- `server/make-cert.sh` ora **retrodata** CA e certificato (default `notBefore` 1/1/2020,
  `notAfter` 2035) con `openssl ca -startdate`: con l'orologio del guest nel 2021 un
  certificato emesso «oggi» non sarebbe ancora valido;
- `server.js` registra lo **SNI** di ogni connessione TLS (`[tls:sni]`) e gli errori di
  handshake (`[tls:errore]`): serve a vedere quale host il client voleva anche quando il
  DNS non passa da noi;
- `tools/ldplayer/phaseb-guest.sh` rifà in un colpo la preparazione del guest (CA di
  sistema in tmpfs, dirottamento TCP 80/443 dell'uid del gioco, orologio a maggio 2021).
  Va rieseguito a ogni riavvio dell'istanza.

**Dump dell'originale (`orig1`, MuMu Android 12, 196 MB in
`D:\Progetto_Restauro_KH_UX\dumps\orig1`).** Il congelamento con `SIGSTOP` non scatena
l'anti-debug: il rapporto catturato è `13380225`. A differenza del dump del patchato, **il
testo del rapporto non resta in chiaro** (niente `ErrorCode`, niente data). Resta invece
la **struttura del verdetto**, una sola copia in memoria anonima:

```
+0x00  ... 3891 (pid)
+0x10  00 00 00 01 | 81 2a cc 00 (= 13380225) | 2a 71 c6 6a (= timestamp del rapporto)
+0x20  "004c4ba4-013462e6-07fbaf1b" "10e43769-37d456dc-68c25102" ...  (le triplette)
       ... "Samsung" ... "SM-A156E" ... "12"
```

Nessuna stringa di motivazione accanto al codice. `13380225` = `0x00CC2A81` **non ha
riscontri pubblici** (cercato in decimale ed esadecimale).

L'APK originale verificato (SHA-256 `3be176ab…985b`, uguale a quello pubblicato da
APKMirror, firma Square Enix v3 `f7b60074`) è in `D:\Progetto_Restauro_KH_UX\apk\
khux-4.3.1-original.apk`.

- **La memory protection** spiega perché, provando a fotografare a raffica il segmento di
  codice del protector (`snap.sh`), la regione risultava **azzerata**: LIAPP ripulisce il
  codice decifrato appena fiuta un accesso. Il dump a processo congelato (`capture.ps1`)
  riesce lo stesso perché fotografa prima che la pulizia parta.

Strumenti nuovi per l'indagine, in `recon/tools/memdump/`: `snap.sh` (fotografa a raffica
una regione dal processo vivo) e `trace.sh` (strace statico x86_64 agganciato a
`zygote64`; sotto houdini ogni `svc` del codice ARM diventa una syscall vera, quindi
strace vede anche le chiamate diffuse del protector). Con `trace.sh` abbiamo visto la
scrittura del verdetto: `openat(... l5Xzi1ZFinmQC.txt, O_RDWR|O_CREAT)` →
`write("90\n<ts>\n0\n<pid>\n")` → `fchmod 0644`, subito prima dell'`abort`. Il file viene
prima **letto** più volte in sola lettura e poi **riscritto**: non è una cache del
verdetto (cancellarlo e rilanciare dà di nuovo 90, verificato).

### MuMu Player: il protector gira davvero, e su Android 15 rifiuta

Provato il 7 ottobre 2026: MuMu Player 6.8, istanza Android 15. Si presenta come un
Samsung SM-A156E, con `abilist` `x86_64,arm64-v8a,x86`. Il traduttore ARM è
**`libhoudini.so`** v7, caricato da `libnb.so`: è quello di Intel, non
`libndk_translation` di Google.

**Houdini esegue il protector fino in fondo**: si decifra, gira e produce il suo
rapporto. È esattamente ciò che `libndk_translation` non riusciva a fare
(`HandleNoExec`). A 1 s dall'avvio:

```
E error : ErrorCode = 90
E error : Samsung / SM-A156E / 15
E error : 004c4ba4-013462e6-07fbaf1b      <- identica al Galaxy A54
F libc  : Fatal signal 6 (SIGABRT) ... abort+0
```

**Rifiutano anche Android 12 e 15.** L'istanza Android 12 ha lo stesso
`ErrorCode = 90` e la stessa prima tripletta, a circa 0,7 s dall'avvio. Prima del
rifiuto **non c'è nessuna attività di rete**: il controllo è locale.

Rifiutano quindi **Android 12, 15 e 16**, su due dispositivi diversi (Galaxy A54
fisico, MuMu che si spaccia per SM-A156E), con l'APK patchato e, sul telefono, anche
con quello originale.

| Ipotesi | Esito |
|---|---|
| L'installazione via `adb`, senza Play Store come installer | ❌ reinstallato con `adb install -i com.android.vending`: `installerPackageName=com.android.vending`, stesso `ErrorCode = 90` |
| Emulatore riconosciuto come tale | improbabile: stesso codice del telefono vero |
| Versione di Android | ❌ **esclusa**: rifiuta anche **Android 9**, su LDPlayer 9 (sotto) |

Conclusione: **MuMu è un banco valido**. Il protector ci gira e non lo tratta
diversamente da un telefono vero. Resta da capire *che cosa* controlla.

### LDPlayer 9: rifiuta anche Android 9, e la versione è esclusa

Provato il 7 ottobre 2026: LDPlayer 9.1.67 (Android 9, si presenta come ASUS
ASUS_AI2401_A), con `libhoudini` 9.0.7a. **Stesso `ErrorCode = 90`, stessa prima
tripletta.** Il rifiuto arriva dopo circa 30 s invece che dopo 1 s, perché LDPlayer 9 usa
VirtualBox, che con Hyper-V attivo (lo pretende MuMu) è lentissimo. Houdini segnala anche
che alla CPU virtuale mancano `AES`, `POPCNT` e `PCLMULQDQ`.

Rifiutano quindi **Android 9, 12, 15 e 16**, su tre dispositivi. Note pratiche, se si
torna su LDPlayer:

- il debug ADB è spento di default: va aggiunto `"basicSettings.adbDebug": 1` in
  `vms\config\leidian0.config` **a istanza spenta**, perché LDPlayer riscrive il file
  quando la chiude. Poi `adb connect 127.0.0.1:5555`;
- più server `adb` di versioni diverse (SDK, MuMu, LDPlayer) si chiudono a vicenda: tenerne
  attivo uno solo;
- il link «LDPlayer 9» del sito installa **LDPlayer 14**. Il pacchetto vero sta su
  `https://res.ldrescdn.com/download/package/LDPlayer9.0.exe`.

Come si usa, da riga di comando: `<mumu>\nx_main\MuMuManager.exe` crea e avvia le
istanze, per esempio `info -v all` e `control -v 0 launch`. `adb` è in
`<mumu>\nx_main\adb.exe`, sulla porta 16384 per l'istanza 0 (la dà `info`). Il motore
Android 12 non è preinstallato: `create --version 12` risponde
`android engine not installed`, e `upgrade` non può scendere da 15 a 12. Va scaricato
dall'interfaccia grafica: gestore multi-istanza → nuova istanza → Android 12.

### Le vie d'uscita

Il fatto solido: **il protector rifiuta con il codice 90 su Android 9, 12, 15 e 16**,
su tre dispositivi, in modo locale e prima della rete. **La versione di Android non è
la causa**, e quindi cercare un banco più vecchio non serve. Esclusi anche l'orologio,
con la data di maggio 2021, l'installer, e emulatore contro telefono.

Il banco ora c'è: **MuMu Player con root**. Il blocco non è più trovare dove far girare
il client, ma **capire che cosa controlla il protector**. La strada è il dump della
memoria del protector decifrato, vedi «Dump della memoria del protector». Su MuMu le
condizioni che mancavano ci sono tutte: root, `/proc/<pid>/mem`, e soprattutto un
traduttore che esegue davvero il codice ARM, per circa 1 s prima dell'abort.

> **✅ Risolto il 7 ottobre 2026: su Android 9 il client parte** (LDPlayer 9, APK
> originale) — vedi «Android 9: il client parte». Il prossimo passo è dare rete al guest e
> puntarlo al nostro server (DNS), per catturare la superficie REST e il bootstrap. Le note
> sotto restano come storia del percorso.
>
> **Provato e smentito: il telefono pulito col debug USB spento.** L'APK originale rifiuta
> lo stesso con `13380225` (vedi «Mappa dei codici LIAPP»). Da qui in poi **i test vanno
> fatti solo con l'APK originale**: il patchato si ferma all'anti-repackaging (`90`) e
> nasconde tutto il resto. Siccome `13380225` è identico su telefono e su MuMu, **MuMu
> resta un banco fedele** per studiarlo, con root e senza bisogno del telefono. Evitare
> lo strace per misurare il codice: l'anti-debug lo trasforma in `40`.

1. ~~**Immagine arm64 vera sull'emulatore.**~~ — ❌ su host x86 non boota, vedi
   «L'immagine arm64 su host x86».
2. **Emulatore per giocare** — ✅ **fatto**. MuMu Player esegue il protector ed è il
   banco da usare: è veloce e ha il root. Rifiutano Android 9 (LDPlayer), 12 e 15
   (MuMu). Vedi sopra.
3. **Dispositivo fisico Android 10–13, arm64.** Il banco pulito: nessuna ambiguità di
   emulazione. Un usato costa poco, e se è **rootabile** il dump del protector arriva in
   omaggio — vedi la sezione sul dump.
4. **Device farm in cloud** (Firebase Test Lab, BrowserStack): hardware reale con Android
   vecchio, senza comprare nulla. **Comporta però caricare l'APK su un servizio di
   terzi**, che è una scelta da fare consapevolmente.
5. **Chiedere a Restoration Union e alle community di preservazione KHUX.** Costo tecnico
   zero, e con ogni probabilità qualcuno *sa già* su quali versioni di Android parte: è
   esattamente l'informazione che stiamo cercando di comprare con ore di lavoro. Era già
   suggerito nel REPORT fin dalla fase 2 e non è mai stato fatto. Va fatto comunque, in
   parallelo a qualunque altra strada.

~~Emulatore con immagine x86~~ — esaurito, vedi la tabella sopra.
~~Emulatore con immagine arm64~~ — esaurito su host x86, vedi sopra.

Nota per la device farm: il test completo richiede anche che il client raggiunga il
nostro server. In cloud non si può cambiare il DNS del dispositivo, quindi lì si
risponde solo alla domanda «il protector rifiuta su questa versione?», non si cattura
la superficie REST.

Il test, su qualunque banco, è di un minuto: se il gioco parte, le righe `E error` non
compaiono.

---

## 3. Preparare la nuova macchina

### Prerequisiti

| | Perché |
|---|---|
| **Node.js** | il server; nessuna dipendenza da installare |
| **Python 3** | gli strumenti in `recon/tools/`; nessuna dipendenza |
| **Git Bash** o WSL | gli script `.sh` |
| **JDK 17+** | apktool |
| **JDK 21+** | Ghidra 12 lo pretende, e rifiuta di partire con meno. Se non c'è, il JBR di Android Studio (`<studio>/jbr`) è un JDK completo e recente: basta puntarci `JAVA_HOME` |
| **Android Studio** | per `adb` |
| OpenSSL | di solito incluso in Git Bash |

### Clonare

```bash
git clone https://github.com/Kxos/KH-UX-Dark-Road-Restoration.git
cd KH-UX-Dark-Road-Restoration
```

### Riscaricare il materiale (non versionato, di proposito)

**Client WW 4.3.1** — l'ultima build pienamente online, aprile 2021, da APKMirror:
<https://www.apkmirror.com/apk/square-enix-inc/kingdom-hearts-unchained/kingdom-hearts-unchained-4-3-1-release/>

Scegli la variante con `arm64-v8a`. Mettilo in `recon/dl/`.

> Il materiale pesante (APK, immagini di sistema, dump) può anche stare fuori dal
> repository, su un disco con spazio. Gli script prendono i percorsi come argomenti.
> Sulla postazione di sviluppo attuale sta in `D:\Progetto_Restauro_KH_UX\`: l'APK
> patchato è in `apk\`, MuMu Player in `MuMuPlayer\` (spostato dopo l'installazione, con
> una junction al vecchio percorso `D:\Program Files\Netease\MuMuPlayer`). L'SDK
> Android è in `D:\Programmi\Android\SDK`.
**Evita la 4.4.0**: è di giugno 2021, dopo la chiusura del 30 maggio, quindi già una
build di transizione.

Estrai la libreria nativa:

```bash
mkdir -p recon/ext/ww431
unzip -o -j "recon/dl/<apk>" "lib/arm64-v8a/libcocos2dcpp.so" -d recon/ext/ww431/
```

**I due jar** in `tools/bin/`, rinominati così:

- `apktool.jar` — <https://github.com/iBotPeaches/Apktool/releases>
- `uber-apk-signer.jar` — <https://github.com/patrickfav/uber-apk-signer/releases>

### Un AVD senza `avdmanager`

Se l'SDK non ha i *cmdline-tools*, `avdmanager` e `sdkmanager` non ci sono — ma un AVD è
solo due file di testo, e l'emulatore basta che li trovi. Scegli l'immagine guardando
prima la tabella delle ABI in §2 — **API 30 Google APIs x86_64** è l'unica x86 che
installi l'APK — poi in `~/.android/avd/`:

`khux30.ini`

```ini
avd.ini.encoding=UTF-8
path=<home>/.android/avd/khux30.avd
path.rel=avd/khux30.avd
target=android-30
```

`khux30.avd/config.ini`

```ini
AvdId=khux30
abi.type=x86_64
hw.cpu.arch=x86_64
image.sysdir.1=system-images/android-30/google_apis/x86_64/
image.androidVersion.api=30
tag.id=google_apis
hw.device.name=pixel_3
hw.ramSize=4096
hw.gpu.enabled=yes
hw.gpu.mode=auto
disk.dataPartition.size=8589934592
PlayStore.enabled=false
```

```bash
ANDROID_SDK_ROOT=<sdk> "$SDK/emulator/emulator" -avd khux30 -no-snapshot -no-boot-anim
```

Con due dispositivi collegati, **ogni comando `adb` vuole `-s`** (`-s emulator-5554`
oppure il seriale del telefono), altrimenti rifiuta.

**Ghidra** (solo se riprendi l'analisi statica) — estrai in un percorso **senza spazi**,
tipo `C:\ghidra\`: <https://github.com/NationalSecurityAgency/ghidra/releases>

> Ghidra 12 non include più Jython, e i nostri script lo usano. Installa l'estensione,
> che è già dentro lo zip scaricato:
> ```bash
> unzip -o "$GHIDRA_HOME/Extensions/Ghidra/"*Jython.zip -d "$GHIDRA_HOME/Ghidra/Extensions/"
> ```

### Rigenerare

```bash
bash server/make-cert.sh <ip-locale>
```

I certificati **vanno rigenerati**: contengono l'IP della macchina, che sarà diverso.
Trovalo con `ipconfig`, oppure avvia `start-server.bat`, che lo rileva e lo stampa.

```bash
bash tools/patch-apk.sh "recon/dl/<apk>" <ip-locale>
```

Produce `recon/ext/patched/khux-patched-aligned-debugSigned.apk`.

---

## 4. Eseguire

### Server

```
start-server.bat        (doppio clic)
```

Rileva l'IP da solo (`server/lan-ip.ps1`) e avvia HTTP, HTTPS e DNS sulle porte 80, 443 e
53. Su Windows non servono privilegi di amministratore. Devi vedere tre righe di ascolto.

### Rete — i tre inciampi incontrati su Windows

1. **VPN attive** dirottano il routing: il telefono non raggiunge il PC. Spegnerle.
2. **La porta 53 può essere occupata** dalla Condivisione connessione Internet, che
   Hyper-V e WSL avviano da soli. `Stop-Service SharedAccess` da amministratore;
   riattivala dopo con `Start-Service SharedAccess`.
3. **Profilo di rete "Pubblica"**: il firewall blocca gli ingressi. Servono regole:
   ```powershell
   New-NetFirewallRule -DisplayName "KHUX server" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80,443 -Profile Any
   New-NetFirewallRule -DisplayName "KHUX DNS" -Direction Inbound -Action Allow -Protocol UDP -LocalPort 53 -Profile Any
   ```

Su una rete domestica il punto 1 sparisce e il 3 è probabile che non si presenti.

### Telefono

1. Disinstalla l'app esistente — la firma è diversa, non si sovrascrive
2. Installa l'APK ripacchettizzato
3. Installa `server/certs/ca.crt` come **certificato CA utente**
   (Impostazioni → Sicurezza → Credenziali → Installa certificato → Certificato CA)
4. DNS della Wi-Fi → l'IP del PC
5. Apri il gioco e guarda la console

### Cosa leggere nella console

| | |
|---|---|
| `[dns:dirottata]` | il client sta risolvendo i nostri host |
| `[dns]` | query inoltrate a monte — **qui compare l'host vero del bootstrap** |
| `[ok]` | il client ha accettato le nostre risposte |
| `[?]` | endpoint sconosciuto, corpo già decifrato — **è il materiale da raccogliere** |

Se vedi query DNS ma nessuna richiesta HTTP: il client contatta un host che non
dirottiamo (aggiungilo a `KHUX_HIJACK`), oppure rifiuta il certificato.

---

## 5. Ghidra: non rifare l'analisi a vuoto

> **Prima di aprirlo, controlla se serve davvero.** Gli strumenti in `recon/tools/`
> (`vtables.py`, `codeindex.py`) fanno sull'ELF, in Python puro e in pochi secondi,
> buona parte di ciò per cui era nato questo progetto Ghidra: confini di tutte le
> 87.437 funzioni, xref sulle stringhe, vtable per RTTI. La fase C è stata fatta
> interamente così. Ghidra resta utile per ciò che richiede il **decompilato** —
> per esempio la tipizzazione dei campi, che da sole le stringhe non danno.

Il progetto Ghidra (829 MB) non è versionato. La prima analisi del binario da 33 MB
richiede 45–120 minuti:

```
recon\ghidra\run-ww.bat
```

**Dopo di che, ogni nuova idea di estrazione costa minuti, non ore**, perché il progetto
resta salvato e si rilancia con `-process`:

```bash
"$GHIDRA_HOME/support/analyzeHeadless.bat" \
  "<repo>\recon\ghidra\project" khux-ww431 \
  -process libcocos2dcpp.so -noanalysis \
  -scriptPath "<repo>\recon\ghidra" \
  -postScript <script>.py "<repo>\recon\ghidra\out\<nome>"
```

| Script | |
|---|---|
| `khux_apixref.py` | livello API per xref sulle stringhe — **l'approccio che funziona** |
| `khux_callers.py` | risale il grafo delle chiamate da una funzione |
| `khux_recon.py` | ricerca per nome — **inefficace su questo binario, è strippato al 95%** |

Comprimi i risultati prima di leggerli:

```bash
python recon/tools/digest.py recon/ghidra/out/<nome>
```

---

## 6. Prossimi passi, in ordine

1. ~~**Il backtrace del tombstone.**~~ — ✅ **risolto**, ma non dal tombstone: è il
   protector, e lo dice lui stesso nel buffer principale di logcat. Vedi §2.
2. ~~**Capire che cosa fa rifiutare il protector.**~~ — ✅ **risolto il 7 ottobre 2026.**
   È LIAPP; il `90` era l'anti-repackaging del nostro APK patchato, e l'originale rifiuta
   (`13380225`) solo su Android ≥ 12. **Su LDPlayer 9 (Android 9) con l'APK originale il
   client arriva al titolo**, e la rete del guest funziona. Vedi §2, «Android 9: il
   client parte».
3. **Fase B sul banco LDPlayer 9** — in corso, vedi §2 «Fase B sul banco LDPlayer 9»:
   a) ✅ server avviato (`start-server.bat`, non servono privilegi), certificati
   retrodatati, SNI registrato;
   b) ✅ CA di sistema nel guest, TCP 80/443 del gioco dirottato al PC, orologio a maggio
   2021 — tutto con `tools/ldplayer/phaseb-guest.sh`;
   c) ✅ il client **tenta il bootstrap**, ma fallisce con `6 ERROR :251` (host non
   risolvibile: il nome non esiste più nel DNS pubblico);
   d) **prossimo:** far arrivare il DNS del client al nostro server, puntando il DNS di
   Windows a `127.0.0.1` (unica leva, vedi §2), per leggere il nome dell'host di
   bootstrap; aggiungerlo al SAN del certificato e a `KHUX_HIJACK` se serve, e
   raccogliere `logs/requests.ndjson`.
4. ~~**Fase C**, i campi delle 54 tabelle `master::`~~ — ✅ **fatta**, e senza Ghidra:
   107 classi per RTTI, 1.739 campi, ~3 secondi. Vedi [PHASE-C.md](PHASE-C.md).
   Resta aperta solo la **tipizzazione** dei campi: i nomi e l'ordine ci sono, i tipi no.
5. **Fase D**, ora sbloccata: definire lo schema del DB dai campi estratti e popolarlo
   da khuxwiki.com.

---

## 7. Regola del repository

Solo codice e documentazione originali. Mai APK, asset, audio, master data di Square
Enix, né decompilato: `.gitignore` li esclude. Progetto non commerciale, a scopo di
preservazione.
