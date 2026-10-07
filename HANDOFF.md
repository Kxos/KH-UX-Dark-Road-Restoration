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
| **Test sul dispositivo** | 🔴 **bloccato** — il protector rifiuta su Android 9, 12, 15 e 16: la versione non c'entra |
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
| Rotto dal nostro ripacchettamento | ❌ si chiude anche l'APK originale intatto |
| Librerie non allineate a pagine da 16 KB | ❌ i segmenti `LOAD` sono allineati a 64 KB |
| **Scadenza o licenza datata del protector** | ⚠️ **test non conclusivo**. L'orologio del telefono era stato riportato al **7 marzo 2021** e il risultato era stato lo stesso `ErrorCode = 90`. Ma quella data è *precedente* alla build 4.3.1 (aprile 2021): una licenza con finestra di validità rifiuterebbe anche lì. La data da provare è **metà maggio 2021**, dopo la build e prima della chiusura del 30 maggio. Il protector *legge* la data: la stampa nel rapporto |

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

### Dump della memoria del protector: tecnica valida, banco mancante

Il protector si decifra e salta nel proprio codice: catturarlo in memoria darebbe le sue
stringhe vere, e probabilmente la tabella che spiega il codice 90. Verificato quel che si
poteva verificare:

- l'emulatore è una build `userdebug`: `adb root` funziona e `ro.debuggable=1`, quindi
  **non serve rendere l'APK debuggable** — e questo evita di accendere la spia che
  l'anti-debug cerca, che è l'obiezione principale a tutto l'approccio;
- `dd` su `/proc/<pid>/mem` da root funziona (provato su `system_server`), e il
  congelamento con `SIGSTOP` permette di dumpare con calma.

Non è andato in porto per due ragioni, entrambe del banco e non del metodo: la finestra
utile è **sotto il secondo e variabile** (un avvio è morto prima di 1,2 s), e la regione
anonima `rwx` da 4 MB che sembrava il payload è in realtà **il JIT del traduttore** —
compare già all'avvio ed è vuota. Sotto traduzione il codice ARM del protector non arriva
mai a eseguire davvero, quindi qui non c'è niente di rappresentativo da catturare.

Su un telefono fisico non rootato servirebbe invece l'APK debuggable, e tornerebbe
l'ambiguità. **Diventa facile e pulito su un Android 10–13 fisico e rootabile** — dove
però probabilmente non servirebbe affatto, perché il gioco partirebbe.

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
la causa**, e quindi cercare un banco più vecchio non serve. Il controllo che fallisce va
cercato altrove. Il primo candidato è la **data**, con il test corretto: vedi la tabella
delle ipotesi escluse.

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
start-server.bat        (tasto destro -> Esegui come amministratore)
```

Rileva l'IP da solo e avvia HTTP, HTTPS e DNS. Servono i privilegi perché usa le porte
53, 80 e 443. Devi vedere tre righe di ascolto.

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
2. **Un banco Android 9–13 su cui il protector non rifiuti.** È l'unica cosa che ancora
   blocca il test sul device. Gli emulatori ufficiali sono esauriti, sia x86 che arm64.
   Il banco c'è: MuMu Player esegue il protector. Ma rifiutano Android 9, 12, 15 e 16,
   quindi **la versione non c'entra**. Il prossimo test è la **data a metà maggio
   2021**, vedi §2.
3. **Appena il client parla**, raccogliere `logs/requests.ndjson`: è la superficie REST
   del gioco, che staticamente non è enumerabile.
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
