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
| **Test sul dispositivo** | 🔴 **bloccato** — il client non parte su Android 16 |
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

## 2. Il problema aperto

**Il gioco si chiude dopo circa un secondo, su Android 16.**

```
libc  F  Fatal signal 6 (SIGABRT), code -1 (SI_QUEUE) in tid 6466, pid 6466
```

`SI_QUEUE` significa che il segnale è stato inviato di proposito via `sigqueue()`, dal
processo a sé stesso. Non è un segfault né un `abort()` ordinario: è
un'**autoterminazione deliberata**.

### Ipotesi già escluse, con il dato che le ha smentite

| Ipotesi | Esito |
|---|---|
| Rotto dal nostro ripacchettamento | ❌ **si chiude anche l'APK originale intatto** |
| Librerie non allineate a pagine da 16 KB | ❌ i segmenti `LOAD` sono allineati a 64 KB |
| Enforcement W^X da `targetSdk 29` | ❓ ricostruito con `targetSdk 28`, **esito non ancora verificato** |

### Ipotesi corrente

`lib__57d5__.so` è un protector impacchettato (1 MB, entropia 7,94 bit/byte). Il suo
caricatore è travestito da classe Kotlin
(`kotlin.coroutines.experimental.intrinsics.IntrinsicsKt__…$10`), fa
`System.loadLibrary("__57d5__")` in un `<clinit>` e poi centinaia di chiamate a un
decrittatore nativo, anch'esso camuffato. È referenziato da decine di classi in tutto il
dex: **non è rimovibile**, è uno strato di decifratura intrecciato nell'app.

Un protector del 2021 i cui controlli d'ambiente falliscono su Android 16 spiegherebbe
tutto, compresa l'autoterminazione silenziosa.

### Il dato che manca

Il **backtrace del tombstone**. In Logcat di Android Studio il filtro predefinito
`package:mine` lo nasconde, perché il tombstone lo scrive `crash_dump64`, non l'app.

```bash
adb logcat -b crash -d
```

Oppure in Logcat sostituisci il filtro con `tag:DEBUG | tag:libc`, riproduci il crash e
leggi le righe `#00`–`#15` sotto `backtrace:`.

**Se tra i frame compare `lib__57d5__.so`** → è il protector, e la risposta è un
dispositivo Android 10–13.
**Se compare altro** → potrebbe esserci una via d'uscita.

### Alternative se è il protector

1. **Dispositivo Android 10–13.** Il gioco è del 2021 con `targetSdk 29`: su hardware
   dell'epoca è probabile che parta. La strada più diretta.
2. **Emulatore con immagine Android 10/11.** Il blocco emulatori di Square Enix era
   *lato server*, e i server non esistono più. Rischio: il protector può avere controlli
   anti-emulatore propri — ma non si perde nulla a provare.

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

1. **Il backtrace del tombstone.** Decide se il blocco è il protector o altro. Tutto il
   resto dipende da questo.
2. **Se è il protector**, un dispositivo Android 10–13, o un emulatore con immagine
   dell'epoca.
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
