# Server privato KHUX — fase B

Node, **zero dipendenze**: `crypto` e `zlib` sono nativi, quindi AES-256-CBC e gzip
senza installare nulla.

## Cosa fa

Risponde ai due scambi iniziali ricavati dal binario (vedi `../PHASE-A.md`) e
**registra tutto il resto**.

| Scambio | Risposta | Letta da |
|---|---|---|
| bootstrap | `{maintenance: 0, url, nativeToken}` | `FUN_007be0d0` |
| sessione | `{nativeSessionId, sharedSecurityKey}` | `FUN_007bd5b8` |

Il punto chiave: **la `sharedSecurityKey` la scegliamo noi**, quindi da quel momento
controlliamo la chiave AES dell'intero canale. E la `url` che consegniamo diventa la
base di tutte le chiamate successive — per questo non serve patchare il binario.

### Il logger è il vero strumento

Gli endpoint di gioco non sono enumerabili dalle stringhe del binario. Ma ogni
richiesta che il client ci manda viene registrata in `logs/requests.ndjson` con
metodo, path, header e corpo **decifrato**, e riceve una risposta vuota ma valida
perché il client prosegua e ci mostri la chiamata successiva.

Scoprire la sequenza vale più che rispondere bene a una singola chiamata.

## Nota sullo schema dell'IV

Il formato del payload è documentato (`JSON → base64 → AES-256-CBC → base64`), ma
**non sappiamo come viene derivato l'IV**. Invece di indovinare, `khux-codec.js` prova
quattro strategie — IV a zero, IV anteposto, primi 16 byte della chiave, ultimi 16 — e
riporta quale ha funzionato. La prima richiesta reale del client ce lo dirà da sola.

Round-trip verificato su tutte e quattro.

## Avvio

```bash
KHUX_PUBLIC_URL="https://192.168.1.198" node server/server.js
```

| Variabile | Default | Note |
|---|---|---|
| `KHUX_PUBLIC_URL` | `https://127.0.0.1` | **L'IP della macchina sulla LAN**, non localhost: è ciò che il telefono deve poter raggiungere |
| `KHUX_HTTP_PORT` | `80` | |
| `KHUX_HTTPS_PORT` | `443` | attivo solo se esistono i certificati |

Le porte 80 e 443 su Windows possono richiedere privilegi elevati: per le prove locali
usa `KHUX_HTTP_PORT=8080`.

## Procedura completa con telefono fisico

### 1. Certificato

```bash
./server/make-cert.sh 192.168.1.198
```

Genera una CA e un certificato valido per `*.sqex-bridge.jp`, `*.kingdomhearts.com` e
l'IP indicato.

### 2. Patch dell'APK

```bash
./tools/patch-apk.sh "recon/dl/<apk>" 192.168.1.198
```

Da Android 7 le app ignorano le CA installate dall'utente. La patch aggiunge un
`network_security_config.xml` che le dichiara fidate — nessuna modifica al codice.

Servono due jar in `tools/bin/`: `apktool.jar` e `uber-apk-signer.jar`.

### 3. Sul telefono

1. Disinstalla l'app originale: la firma è diversa, non si installa sopra
2. Installa l'APK ripacchettizzato
3. Installa `server/certs/ca.crt` come **certificato CA utente**
4. Fai risolvere `psg.sqex-bridge.jp` verso `192.168.1.198` — DNS locale, oppure un
   resolver che accetti override

### 4. Avvia il server e apri il gioco

Ogni richiesta comparirà in console. Quelle marcate `[?]` sono endpoint che non
gestiamo ancora: sono esattamente ciò che vogliamo scoprire.

## Attenzione: VPN

Su questa macchina risultano attive Appgate SDP e Connect Tunnel. Una VPN può
dirottare il routing e impedire al telefono di raggiungere il PC sulla rete locale:
quasi certamente vanno disattivate durante i test.

## File

| File | |
|---|---|
| `server.js` | server HTTP/HTTPS, rotte, logger |
| `khux-codec.js` | codec dei payload, con rilevamento della strategia di IV |
| `make-cert.sh` | generazione di CA e certificato |
| `logs/requests.ndjson` | ogni richiesta ricevuta — non versionato |
