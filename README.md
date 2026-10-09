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
| B | Server REST minimo → il client raggiunge la home screen | ✅ APK 4.3.1 **originale** su LDPlayer 9 (Android 9): nuovo giocatore, Prologue, home |
| C | Schema dei campi delle 54 tabelle master | ✅ completata — 106 tabelle, 1.739 campi |
| D | Popolamento master data, quest e combattimento single-player | 🔄 missioni 1–7 giocabili; menu, Equipment, Presents, Medal List con dettaglio, ordinamento e vendita funzionanti; altre schermate in corso |
| E | Photon self-hosted per Union Cross / raid / PvP | ⬜ |

Stato aggiornato al 9 ottobre 2026. Le schermate che il client 4.3.1 non trova più nelle
risorse (layout CocoStudio, testi, animazioni) vengono **ricostruite**: dagli originali
vicini, dai nomi dei widget letti nel codice e da immagini di riferimento dell'epoca.

**[HANDOFF.md](HANDOFF.md)** — il diario del lavoro: come riprendere, lo stato del banco, i
controlli da fare per primi e ogni problema risolto con la sua causa.
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
REPORT.md, PHASE-*.md   Ricognizione e analisi
HANDOFF.md              Come riprendere il lavoro, stato e cronologia dei problemi risolti
server/                 Server Node.js: API REST, DNS, tabelle master e di gioco generate
                        (server/README.md)
tools/ldplayer/         Banco su LDPlayer: avvio, sessioni (session/), cattura dei crash
                        ARM sotto houdini (armtrace/, con README)
recon/tools/            Strumenti di analisi e di costruzione delle risorse (Python)
recon/ghidra/           Script per Ghidra headless (decompilazione, disassemblato)
recon/out/              Output distillati: classi master::, schemi delle risposte
recon/dl/ ext/ web/     Materiale proprietario — NON versionato
```

### Ciclo di lavoro sul banco

| Comando | A cosa serve |
|---|---|
| `tools/ldplayer/session/relogin.ps1` | riavvia server e app con il giocatore salvato, fino alla home |
| `tools/ldplayer/session/build-resources.ps1 -Quick` | rigenera layout e testi e li scrive nel guest (~40 s, nessun download) |
| `tools/ldplayer/session/build-resources.ps1 -Version N` + `update-resources.ps1` | nuova versione completa delle risorse, scaricata dal client (~5 min) |
| `tools/ldplayer/armtrace/stackcap.ps1 -MenuY y -Taps 'x,y'` | riproduce un crash e cattura registri e stack ARM |
| `node server/check-stage-data.js` | controllo offline dei dati delle missioni |

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
| `make_layouts.py` | Layout CocoStudio sostitutivi: copie di originali, scene, layout costruiti, cloni di widget, armature, testi |
| `resource_pack.py`, `resource_merge.py` | Pacchetto BGAD delle risorse generate e indice unito (con riserva di spazio per il ciclo rapido) |
| `import_ui_texts.py`, `ui_text_ids.py` | Testi `text/ui` originali dall'IPA 4.4.0; id dei testi usati dal binario |
| `widget_lookup.py`, `layout_tree.py`, `scene_tree.py` | Nomi dei widget cercati dal codice; struttura di layout e scene |
| `action_case.py`, `batch_schema.py` | Ramo di un'azione nel dispatcher delle risposte e schemi dei parser |
| `who_refs.py` | Chi usa un indirizzo (BL, ADRP/ADD, rilocazioni) |

## Regole del repository

Questo repository contiene **esclusivamente codice e documentazione originali**.

Non vengono mai versionati APK, IPA, OBB, librerie native, asset, audio, né master data
di Square Enix — `.gitignore` li esclude. Chi vuole riprodurre il lavoro si procura il
client per conto proprio.

Progetto **non commerciale**, a scopo di preservazione e interoperabilità con un servizio
dismesso.
