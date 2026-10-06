# KH-UX-Dark-Road-Restoration

Progetto di preservazione: ripristinare **Kingdom Hearts Union χ[Cross] · Dark Road**
come esperienza giocabile in locale, dopo la chiusura dei server (maggio 2021) e la
rimozione dall'app di quasi tutte le funzionalità di Union χ, ridotta a theater mode.

## Stato

| Fase | Descrizione | Stato |
|---|---|---|
| 1 | Reperimento client e valutazione fattibilità | ✅ completata |
| 2 | Ricognizione tecnica — architettura, protocollo, schema dati | ✅ completata |
| A | Ghidra su `libcocos2dcpp.so`, estrazione host ed endpoint da `APIManager` | ⬜ prossima |
| B | Server REST minimo → il client raggiunge la home screen | ⬜ |
| C | Schema dei campi delle 40 tabelle master | ⬜ |
| D | Popolamento master data, quest e combattimento single-player | ⬜ |
| E | Photon self-hosted per Union Cross / raid / PvP | ⬜ |

**[REPORT.md](REPORT.md)** contiene i risultati completi della ricognizione.

## Sintesi tecnica

- Il gioco è **Cocos2d-x con logica in C++ nativo** (non Unity/IL2CPP).
- **I simboli C++ non sono strippati**: l'architettura è ricostruibile dai binari.
- Due stack di rete: **REST** (AES-256-CBC + gzip, chiave negoziata col server) e
  **Photon/eNet UDP** per il realtime.
- Il namespace `master::` espone lo schema dei dati: **63 tabelle** nella build online,
  **40 rimosse** nel passaggio a offline. Quelle 40 sono la misura esatta del lavoro.
- Il **motore di combattimento è ancora intatto** nel client offline: va rialimentato
  con i dati, non riscritto.

## Struttura

```
REPORT.md          Report della ricognizione (fase 2)
recon/tools/       Strumenti di analisi riutilizzabili (Python, nessuna dipendenza)
recon/out/         Output distillati: elenchi delle classi master::
recon/dl/ ext/ web/   Materiale proprietario — NON versionato
```

### Strumenti

| Script | Funzione |
|---|---|
| `remote_zip_ls.py` | Indice di uno ZIP remoto via HTTP range — ispeziona archivi da GB senza scaricarli |
| `strings.py` | Estrattore di stringhe da binari |
| `demangle.py` | Recupera e classifica i simboli C++ Itanium |
| `scope_methods.py` | Elenca i membri delle classi che corrispondono a un pattern |
| `elfinfo.py` | Architettura ed endianness di un ELF |

## Regole del repository

Questo repository contiene **esclusivamente codice e documentazione originali**.

Non vengono mai versionati APK, IPA, OBB, librerie native, asset, audio, né master data
di Square Enix — `.gitignore` li esclude. Chi vuole riprodurre il lavoro si procura il
client per conto proprio.

Progetto **non commerciale**, a scopo di preservazione e interoperabilità con un servizio
dismesso.
