# KH-UX-Dark-Road-Restoration

[English](README.md) | **Italiano**

> La documentazione di lavoro (HANDOFF, ISSUES, note tecniche, diario) è in inglese dal 22 ottobre 2026;
> questa pagina riassume il progetto in italiano.

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
| D | Popolamento master data, quest e combattimento single-player | 🔄 dal nuovo giocatore alla home; missioni di storia **1–979** con le mappe e le stanze originali (dai dati JP 4.3.1), filmati, musica per missione, statistiche e livelli originali dei nemici, obiettivi, forzieri e Trophy; Special Attack con danno variabile e attacchi dei nemici; Medal List, vendita, Level Up (pallini e guilt, skill, trait, Trait Medal), Evolve, Moogle Shop, Shop con i banner originali (807 deal con garanzie, pity, rotazione settimanale, stagionali, banner fissato e catalogo con filtri), Profilo, Missioni e campagne Limited, Avatar Boards, pet, livelli Lux fino a 999, Notices in gioco che spiegano ogni differenza dall'originale. In corso: grafiche originali di circa 90 famiglie di nemici delle missioni 526–979 (oggi con l'aspetto di un nemico simile) |
| E | Photon self-hosted per Union Cross / raid / PvP | ⬜ |

Stato aggiornato al 22 ottobre 2026. Le schermate che il client 4.3.1 non trova più nelle
risorse (layout CocoStudio, testi, animazioni) vengono **ricostruite**: dagli originali
vicini, dai nomi dei widget letti nel codice e da immagini di riferimento dell'epoca.

**[HANDOFF.md](HANDOFF.md)** — come riprendere: stato del banco e prossimo passo.
**[Notices del gioco](https://kxos.github.io/KH-UX-Dark-Road-Restoration/notices/)** (pagina web nello stile del gioco, in inglese; anche come [docs/NOTICES.md](docs/NOTICES.md)) — come funziona il gioco restaurato e dove differisce dall'originale.
**[docs/ISSUES.md](docs/ISSUES.md)** — i problemi aperti e chiusi; note tecniche per area in
[docs/notes/](docs/notes/), diario completo del lavoro (ogni problema risolto con la sua causa) in
[docs/journal/](docs/journal/).
**[REPORT.md](REPORT.md)** — risultati della ricognizione. **[PHASE-A.md](PHASE-A.md)** — analisi statica.
**[PHASE-C.md](PHASE-C.md)** — i campi delle tabelle `master::`, ricavati senza Ghidra.

## Cosa cerchiamo

Gran parte dei contenuti del gioco veniva scaricata dal CDN in `files/r/misc.mp4` e non e' mai stata
nei pacchetti dell'app. Le mappe e le stanze della storia ora vengono dai dati JP 4.3.1 condivisi da
thethiny, ma le texture di circa **90 famiglie di nemici** delle missioni 526–979 (Gearbit, Flappy Bug,
Cy-Bug, King Candy, Jafar, Dragon Maleficent, Darkness, Ephemer & Skuld...) mancano in tutti gli
archivi pubblici (appello del 22 ottobre su [Reddit](https://www.reddit.com/r/KingdomHearts/comments/1xcbwjg/)). Cerchiamo anche tutto cio' che riguarda **eventi, raid, Coliseum, Union Cross e PvP**
(screenshot, video, regole, premi, catture del traffico). Chi ha ancora una cartella `files/r/` o un
backup del dispositivo con KHUx installato (Global o JP, qualsiasi versione), o uno di questi materiali,
puo' contattarci aprendo una issue.

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
HANDOFF.md              Come riprendere il lavoro (stato e prossimo passo)
docs/                   ISSUES.md (problemi), notes/ (note tecniche per area), journal/ (diario),
                        NOTICES.md e notices/ (Notices del gioco, pagina web su GitHub Pages)
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
| `tools/ldplayer/session/build-resources.ps1 -Version N` + `update-resources.ps1` | nuova versione completa delle risorse, scaricata dal client (~5 min); poi toccare a mano KHUX START (200,1020) e Download (1220,715) |
| `tools/ldplayer/armtrace/stackcap.ps1 -MenuY y -Taps 'x,y'` | riproduce un crash e cattura registri e stack ARM (`-NoStart`: aspetta un crash provocato da un altro script) |
| `node server/check-stage-data.js` | controllo offline dei dati delle missioni |
| `node server/export-notices.js [--check]` | esporta le Notices del gioco in `docs/NOTICES.md` e `docs/notices/index.html` |

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
| `import_orig_stages.py`, `make_jp_rooms.py` | Stage e stanze originali della storia dai dati JP 4.3.1 e 2016 (missioni 1-979) |
| `import_jp_coco.py` | Layout CocoStudio originali JP al posto di quelli generati (elenco `jp_coco_layouts.txt`) |
| `make_jp_enemies.py`, `deep_donors.py` | Grafiche originali dei nemici; texture mancanti ritrovate per contenuto in altri file della stessa creatura |

## Ringraziamenti

Questo restauro si regge sul lavoro di chi ha conservato e documentato il gioco molto prima di noi:

- **thethiny** — [KHUxTools](https://github.com/thethiny/KHUxTools) (strumenti per risorse e master data),
  [KHUx-Server](https://github.com/thethiny/KHUx-Server) (rifacimento del server e delle API, master data originali),
  [KHUx-Recomp](https://github.com/thethiny/KHUx-Recomp) (ricompilazione statica e decompilato del client 1.0.1),
  [Modding-Database](https://github.com/thethiny/Modding-Database) e l'archivio condiviso dei dati di KHUx (dati JP
  4.3.1, mappe degli stage, dump del master 1.1.3 e il diario di ricerca). Gran parte di cio' che questo progetto serve
  viene dai formati e dai dati che ha documentato e condiviso.
- **Roboloid** e **Ultimadei** — il [database KHUχ di Roboloid](https://roboloid.github.io/khux/) (dati delle medaglie,
  moltiplicatori, condizioni degli speciali, galleria degli asset).
- **KHUX Wiki** ([khuxwiki.com](https://www.khuxwiki.com/)) e **KH Wiki** ([khwiki.com](https://www.khwiki.com/)) —
  missioni, medaglie, speciali, eventi e immagini usati come riferimento.

## Regole del repository

Questo repository contiene **esclusivamente codice e documentazione originali**.

Non vengono mai versionati APK, IPA, OBB, librerie native, asset, audio, né master data
di Square Enix — `.gitignore` li esclude. Chi vuole riprodurre il lavoro si procura il
client per conto proprio.

Progetto **non commerciale**, a scopo di preservazione e interoperabilità con un servizio
dismesso.
