# Analisi headless con Ghidra

Estrazione automatica del livello API e dello schema del master data dalle librerie
native di KHUX. Gira in batch, senza interfaccia grafica.

## Prerequisiti

| | |
|---|---|
| **JDK 17+** | già presente: `C:\Program Files\Java\jdk-21` |
| **Ghidra 11.x** | da installare — vedi sotto |
| **Binario target** | non versionato, va procurato a parte |

### Installare Ghidra

Nessun privilegio di amministratore richiesto.

1. Scarica l'ultima release da
   <https://github.com/NationalSecurityAgency/ghidra/releases>
2. Estrai in `C:\ghidra\` — **percorso senza spazi**, altrimenti gli script di
   supporto di Ghidra danno problemi su Windows.
3. Nessun'altra configurazione: `run.sh` trova da sé Ghidra e il JDK.

Se lo installi altrove, imposta `GHIDRA_HOME`.

## Esecuzione

```bash
./recon/ghidra/run.sh tw252     # build Taiwan 2.5.2  — era ONLINE, ARM32
./recon/ghidra/run.sh ww501     # build Worldwide 5.0.1 — era OFFLINE, ARM64
```

La prima analisi di un `.so` da 14–20 MB richiede tipicamente **10–40 minuti**: Ghidra
deve disassemblare e analizzare l'intero binario. Le esecuzioni successive sullo stesso
progetto sono molto più rapide.

## Output

Tutto in `recon/ghidra/out/<label>/` (non versionato):

| File | Contenuto |
|---|---|
| `functions.txt` | Indice completo delle funzioni: indirizzo + nome demangolato |
| `api_strings.txt` | Stringhe raggiunte da ogni funzione del livello di rete |
| `api_candidates.txt` | Filtrate: host, percorsi, chiavi di protocollo — **qui si cerca l'host dell'API** |
| `decomp/<nome>.c` | Decompilato C delle funzioni bersaglio |
| `master_fields.json` | **Campi JSON per ogni classe `master::`** |
| `summary.json` | Riepilogo macchina-leggibile |

## Cosa fa lo script

`khux_recon.py` esegue due analisi indipendenti.

**Fase A — livello API.** Seleziona le funzioni il cui nome corrisponde ai pattern di
rete (`APIManager`, `Http*`, `Request`, `Session`, `Encrypt`, `Base64`…), scartando il
rumore delle librerie linkate staticamente (OpenSSL, curl, FreeType, libpng…). Le
decompila e raccoglie le stringhe che referenziano. L'host dell'API non è una costante
nel binario — viene costruito a runtime — quindi va cercato nel decompilato di
`APIManager`, usando `api_candidates.txt` come punto di partenza.

**Fase C in anticipo — schema del master data.** I deserializzatori rapidjson
confrontano ogni chiave JSON con una stringa letterale. Quindi le stringhe referenziate
dalla funzione di parsing di una tabella *sono* i suoi nomi di campo. Lo script le
raccoglie per ogni classe `master::` e le scrive in `master_fields.json`.

Questo è il pezzo che manca per completare lo schema: le 63 classi `master::` sono già
note dai simboli, i loro campi no. Le due analisi girano insieme perché usano la stessa
macchina di estrazione, quindi la fase C arriva gratis con la fase A.

## Note

- Lo script è **Jython (Python 2.7)**, l'interprete integrato in Ghidra. Non usa
  f-string né altra sintassi Python 3.
- Il progetto Ghidra e tutto l'output sono esclusi da git: il progetto contiene una copia
  del binario importato, e il decompilato è opera derivata da codice Square Enix.
