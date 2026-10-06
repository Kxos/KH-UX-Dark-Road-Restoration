# Fase A — risultati dell'analisi statica

Target: `libcocos2dcpp.so` arm64 della build **WW 4.3.1-72**, l'ultima pienamente online.
Progetto Ghidra: 829 MB, salvato — i rilanci dello script usano `-process` e costano
minuti, non ore.

---

## 1. Il binario è strippato

**Correzione a una conclusione precedente di questo progetto.** Il report iniziale
affermava che i simboli C++ non erano strippati, e ne faceva il principale fattore di
fattibilità. È sbagliato, e la verifica sul binario reale lo smentisce:

| | |
|---|---|
| Funzioni totali | 97.879 |
| Funzioni con nome | **4.882 (5%)** |
| Funzioni `APIManager` | **0** |
| Funzioni `master::` | 39 righe su 97.879 |

L'errore è stato contare i simboli mangled trovati con `strings` e dedurne che le
funzioni fossero nominate. In realtà quei nomi affioravano quasi tutti come **tipi di
parametro** dentro firme template — per esempio
`ScenePartyRequest::callUserSearchAPI(APIManager::LevelRange, …)` — oppure dentro
istanziazioni di `std::function`. Le classi esistono; i loro metodi non sono esportati.
I 4.882 nomi effettivi sono quasi tutti librerie: Photon, SQEX audio, OpenSSL.

Conseguenza pratica: **l'approccio per nome non funziona.** Serve partire dalle stringhe.

## 2. Metodo: xref dalle stringhe

Le stringhe di protocollo non si possono strippare, perché servono a runtime. Lo script
`recon/ghidra/khux_apixref.py` le usa come ancore, risale ai riferimenti e decompila le
funzioni che le toccano.

| Ancora | Occorrenze | Funzioni che la referenziano |
|---|---|---|
| `sharedSecurityKey` | 1 | 1 |
| `X-HTTP-USER-TOKEN` | 1 | 1 |
| `accessToken` | 1 | 5 |
| `Content-Type` | 14 | 18 |
| `https://` | 7 | 4 |
| `kingdomhearts` | **0** | — |

→ **20 funzioni candidate** del livello API, tutte decompilate.

## 3. Le funzioni che contano

| Indirizzo | Stringhe referenziate | Ruolo |
|---|---|---|
| `FUN_007bd5b8` | `nativeSessionId`, `sharedSecurityKey` | **Parser della risposta di handshake** |
| `FUN_0082f454` | `X-HTTP-USER-TOKEN: %s` | Costruzione dell'header di autenticazione |
| `FUN_007fce28`, `FUN_007fd2cc`, `FUN_007fd770`, `FUN_0081969c`, `FUN_00819a70` | `accessToken`, `platformId`, `platformType` | Payload di login / autenticazione |

### Il contratto dell'handshake

`FUN_007bd5b8` è lunga 63 righe e leggibile:

```c
puVar1 = FUN_0071f8ec(piVar4 + 2, "nativeSessionId");
plVar2 = FUN_0071f8ec(piVar4 + 2, "sharedSecurityKey");
```

`FUN_0071f8ec` è un getter di campo JSON. Il client quindi si aspetta dall'endpoint di
sessione una risposta JSON contenente **`nativeSessionId`** e **`sharedSecurityKey`**, e
da lì in avanti invia l'header **`X-HTTP-USER-TOKEN`**.

Questo conferma dal binario quanto documentato da `xlash123/khux-re-api`, e soprattutto
**è abbastanza per scrivere il primo endpoint del server**: la chiave AES la sceglie il
server, quindi chi risponde a questo handshake controlla l'intero canale cifrato.

## 4. L'host dell'API non è nel client

Scansione binaria di **tutti i file dell'APK**, non solo delle librerie native:

```
cache.sqex-bridge.jp   -> lib/arm64-v8a/libcocos2dcpp.so, lib/armeabi-v7a/libcocos2dcpp.so
```

Nient'altro. Nessun `api-s`, nessun `kingdomhearts.com`, in nessun file. Le uniche URL
hardcoded servono alle news dentro l'app.

L'host arriva quindi a runtime: dall'SDK SQEX Bridge, oppure dal config scaricato al
primo avvio insieme al content package.

**Perché conta più di quanto sembri.** Se l'host non è compilato nel client, per
redirigerlo non serve patchare il binario: basta controllare la sorgente da cui lo
legge. Potrebbe risultare più semplice del previsto — o più complicato, se la catena
passa dall'SDK Square Enix. È la prima cosa da chiarire.

## 5. Prossimi passi

1. **Trovare da dove viene l'host.** Seguire i chiamanti di `FUN_007bd5b8` a ritroso
   fino al punto in cui l'URL viene composto, e capire se la sorgente è l'SDK Bridge o
   un file di configurazione.
2. **Estrarre i campi delle tabelle `master::`.** Senza nomi di funzione serve un'altra
   euristica: raggruppare le funzioni che referenziano molte stringhe snake_case brevi —
   i deserializzatori rapidjson confrontano ogni chiave con una stringa letterale.
3. **Scrivere il primo endpoint** (fase B): rispondere all'handshake con
   `nativeSessionId` e `sharedSecurityKey` scelti da noi.
