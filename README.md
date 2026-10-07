# KH-UX-Dark-Road-Restoration

Progetto di preservazione: ripristinare **Kingdom Hearts Union χ[Cross] · Dark Road**
come esperienza giocabile in locale, dopo la chiusura dei server (maggio 2021) e la
rimozione dall'app di quasi tutte le funzionalità di Union χ, ridotta a theater mode.

## Stato

| Fase | Descrizione | Stato |
|---|---|---|
| 1 | Reperimento client e valutazione fattibilità | ✅ completata |
| 2 | Ricognizione tecnica — architettura, protocollo, schema dati | ✅ completata |
| A | Ghidra su `libcocos2dcpp.so`, estrazione host ed endpoint | ✅ completata |
| B | Server REST minimo → il client raggiunge la home screen | 🔄 server pronto, test sul device bloccato |
| C | Schema dei campi delle 54 tabelle master | ✅ completata — 106 tabelle, 1.739 campi |
| D | Popolamento master data, quest e combattimento single-player | ⬜ |
| E | Photon self-hosted per Union Cross / raid / PvP | ⬜ |

**[HANDOFF.md](HANDOFF.md)** — come riprendere il lavoro su un'altra macchina, e il problema aperto.
**[REPORT.md](REPORT.md)** — risultati della ricognizione. **[PHASE-A.md](PHASE-A.md)** — analisi statica.
**[PHASE-C.md](PHASE-C.md)** — i campi delle tabelle `master::`, ricavati senza Ghidra.

## Sintesi tecnica

- Il gioco è **Cocos2d-x con logica in C++ nativo** (non Unity/IL2CPP).
- **Il binario è strippato al 95%**: 4.882 funzioni con nome su 97.879, quasi tutte
  librerie. Il livello API si trova per xref sulle stringhe di protocollo, non per nome.
- Il client è protetto da `lib__57d5__.so`, impacchettata e non rimovibile.
- Due stack di rete: **REST** (AES-256-CBC + gzip, chiave negoziata col server) e
  **Photon/eNet UDP** per il realtime.
- Il namespace `master::` espone lo schema dei dati: **107 tabelle** nella build online
  WW 4.3.1, **54 rimosse** nel passaggio alla 5.0.1 offline. Quelle 54 sono la misura
  esatta del lavoro — e i loro **759 campi** sono stati ricavati dal binario, con nome
  e ordine delle colonne.
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
| `vtables.py` | Vtable e metodi virtuali di una classe C++, via RTTI e rilocazioni |
| `codeindex.py` | Confini di funzione da `.eh_frame`; costanti indirizzate da ADRP/ADD |
| `master_fields.py` | La pipeline della fase C: dalle classi `master::` ai loro campi |
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
