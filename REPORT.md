# KHUX / Dark Road — Ricognizione tecnica per il ripristino offline

**Data:** 2026-10-06 · **Fase:** 2 (recon) — completata
**Obiettivo finale:** Union χ + Dark Road giocabili integralmente in locale.

---

## 1. Verdetto

Il ripristino completo è **fattibile**, ma il profilo del lavoro è diverso da quanto ipotizzato all'inizio. Due correzioni sostanziali emerse dalla ricognizione:

1. **Non è Unity/IL2CPP/C#.** È **Cocos2d-x con logica di gioco in C++ nativo**. `libjs.so` è solo JavaScriptCore, usato dall'SDK Square Enix, non dal gioco. Niente DLL da decompilare: serve disassemblare ARM.
2. **Ci sono due stack di rete, non uno.** Oltre alla REST API c'è **Photon (Exit Games)** per il multiplayer realtime (Union Cross, party, raid).

Il fattore che rende il progetto realistico è che **i simboli C++ non sono strippati**: 3.555 nomi mangled recuperati, da cui si ricostruisce l'intera architettura — nomi di classi, metodi e, soprattutto, lo **schema completo del master data**.

---

## 2. Materiale acquisito

| Artefatto | Origine | Stato | Valore |
|---|---|---|---|
| `recon/ext/tw252/` — APK Taiwan 2.5.2 | archive.org `KHUx-TW-APKs` | ✅ ELF32 ARM, **non cifrato, con simboli** | **Target primario.** Era *online*: contiene tutto il codice server-dipendente |
| `recon/web/blobs/libcocos2dcpp-image.bin` | Web Edition 5.0.1 WW | ✅ ELF64 AARCH64, **non cifrato, con simboli** | Build *offline*. Serve come termine di paragone |
| `recon/web/blobs/libcocos2dcpp-aot.wasm` | Web Edition 5.0.1 WW | ✅ 61 MB wasm | L'ELF ARM64 ricompilato AOT in WebAssembly |
| IPA Worldwide (1.0.1 → 4.4.0) | archive.org `khux-ww-IPAs` | ❌ **FairPlay, `cryptid=1` su entrambe le slice** | Inutilizzabili senza device jailbroken. Scaricati e scartati |

**Due accertamenti che hanno risparmiato download inutili:**

- Né gli APK né gli IPA contengono il *content package*: il gioco scaricava codice e asset dalla CDN al primo avvio. La 4.4.0 pesa 1,7 GB solo per `aliud.mp4` (1,5 GB di video) — verificato leggendo l'indice ZIP remoto via range request, senza scaricarla.
- Il content package sopravvive **solo nelle build 5.0.1**: `Content.zip` della Web Edition (2,1 GB) e l'OBB Android.

---

## 3. Architettura ricostruita

### 3.1 Stack REST

Confermate nel binario le stringhe che documentano il protocollo già descritto da `xlash123/khux-re-api`:

```
sharedSecurityKey · X-HTTP-USER-TOKEN · accessToken · session_id · Authorization
```

Flusso: handshake su `psg.sqex-bridge.jp/native/session` → ottenimento della `sharedSecurityKey` → payload `JSON → base64 → AES-256-CBC → base64`, con gzip.

> **Punto chiave strategico:** la chiave AES è *negoziata col server*, non hardcoded nel client. Un server privato sceglie la propria chiave e da quel momento controlla l'intero canale. Non serve estrarre alcun segreto dal binario.

L'host dell'API non è una stringa nel nativo: è costruito a runtime. Va individuato disassemblando `APIManager`.

### 3.2 Stack Photon (realtime)

Namespace presenti: `ExitGames::Photon`, `ExitGames::LoadBalancing`, `ExitGames::Photon::Internal::{EnetPeer, EnetCommand, EnetChannel, Encryption}`.

Protocollo **eNet/UDP** con `OperationRequest`/`OperationResponse`, CRC, frammentazione, e cifratura Diffie-Hellman (`opExchangeKeysForEncryption`, `establishEncryption`). È un protocollo Photon standard e documentato — riproducibile con un Photon Server self-hosted o una reimplementazione open source. **Non va reverse-engineerizzato da zero.**

### 3.3 Mappa delle scene (estratto)

`SceneMyPage`, `SceneAdventureSelect`, `SceneDeckEdit`, `SceneMixedMedal`, `SceneUnionRegister`, `ScenePartyRequest`, `SceneActionMap`, `SceneMultiActionMap`, `SceneRanking`, `SceneDrawRaise` (gacha), `SceneEvolveMedal`, `SceneSphereBoardSelect`, `SceneRaidList`, `SceneShopTop`, `ScenePresentBox`, `SceneLoginBonus`, `SceneBattleResult`, `ChatManager`, `PartyMatchingRoom`, `APIManager`.

Elenco completo: `recon/out/strings_tw252.txt`.

---

## 4. Il risultato più importante: lo schema del master data

Nel binario esiste un namespace `master::` in cui **ogni tabella di gioco è una classe C++ con il proprio deserializzatore rapidjson**. Questo è esattamente il collo di bottiglia che avevo indicato come problema principale — e ora è quantificato con precisione.

| Build | Tabelle `master::` |
|---|---|
| TW 2.5.2 (**online**) | **63** |
| WW 5.0.1 (**offline**) | 56 |
| Mantenute | 23 |
| **Rimosse nel passaggio a offline** | **40** |
| Aggiunte (`Dark*`, Dark Road) | 33 |

### Le 40 tabelle da ricostruire — la misura esatta del lavoro

```
Achievement      Advertisement    BenefitResource  CoinLimit        Colosseum
ColosseumStage   Comeback         DrawMedalType    DrawPetType      Emblem
EvCampaign       EvMedalList      EvResource       EvScoreReward    EvStage
GuiltProb        LoginBonus       Medal            Mission          Multi
MultiStage       MultiTalk        MultiTimemission MypageBackground PetRank
PetSkill         Player           RaidReward       RaidSetting      Ranking
RankingReward    Reward           SerialcodeReward Shop             Shuffleskill
SkillExp         Sphere           SphereArray      SphereMasu       Stamp
```

Si legge come l'autopsia della rimozione: `Medal` (le medaglie), `DrawMedalType`/`DrawPetType` (il gacha), `Shop`, `Mission`, `Multi*` (Union Cross), `Raid*`, `Sphere*` (sphere board), `Ranking*`, `LoginBonus`, `Colosseum` (PvP), `Ev*` (eventi). È precisamente ciò che è sparito dall'app lasciando il theater.

Le 23 tabelle **sopravvissute** (`Enemy`, `EnemyAttack`, `Stage`, `Skill`, `Buff`, `Burst`, `BattleMisc`, `Keyblade`, `AvatarParts`, `Material`, `RaidEnemy`…) sono un vantaggio concreto: il **motore di combattimento è ancora integro nel client offline**. Non va riscritto — va solo rialimentato con i dati.

File: `recon/out/master_classes_*.txt`, `master_removed_in_offline.txt`, `master_added_in_offline.txt`, `master_kept.txt`

---

## 5. Cosa manca ancora

1. **APK Worldwide 4.x** (era online, inglese). È il target ideale: stessa epoca degli IPA ma su Android, quindi non cifrato. Non è su archive.org; sta su APKMirror e mirror simili. Il TW 2.5.2 copre il ruolo, ma è più vecchio di ~2 anni e localizzato in cinese.
2. **I nomi dei campi di ogni tabella.** Le classi `master::` sono note, i campi no: non compaiono come stringhe isolate. Richiedono il disassemblaggio dei costruttori `fromJson` in Ghidra — meccanico ma lungo (~40 funzioni).
3. **Il content package pre-5.0.** Esiste solo nelle build 5.0.1. Da valutare quanto degli asset Union χ sia sopravvissuto in `Content.zip` (2,1 GB, non ancora scaricato).
4. **Valori reali del master data.** Lo schema si ricava dal binario; i *contenuti* (statistiche delle medaglie, drop table, costi) vanno ricostruiti da khuxwiki.com.

---

## 6. Piano rivisto e stima

| Fase | Contenuto | Stima |
|---|---|---|
| **A** | Procurare l'APK WW 4.x; Ghidra su `libcocos2dcpp.so`; isolare `APIManager` e ricavare host, elenco endpoint e formato richiesta | 1–2 settimane |
| **B** | Server REST minimo: crypto AES/gzip + handshake sessione. **Milestone: il client raggiunge la home screen** | 1–2 settimane |
| **C** | Estrarre i campi delle 40 tabelle da Ghidra; definire lo schema DB | 2–4 settimane |
| **D** | Popolare il master data da khuxwiki; quest e combattimento single-player | 1–2 mesi |
| **E** | Photon self-hosted per Union Cross / raid / PvP | 3–6 settimane |

**Totale realistico: 4–7 mesi** per una persona che ci lavora con continuità. La fase B è quella che va fatta per prima perché è il punto in cui il progetto smette di essere teorico.

Due fattori abbassano il rischio più di quanto mi aspettassi: i simboli non strippati, e il motore di combattimento ancora intatto nel client. Il lavoro vero è **ricostruire i dati**, non riscrivere il gioco.

---

## 7. Strumenti prodotti (riutilizzabili)

| File | Funzione |
|---|---|
| `recon/tools/remote_zip_ls.py` | Elenca l'indice di uno ZIP remoto via HTTP range — ispeziona archivi da GB senza scaricarli |
| `recon/tools/strings.py` | Estrattore di stringhe (sostituto di `strings`, assente su Windows) |
| `recon/tools/demangle.py` | Recupera e classifica i simboli C++ Itanium, con frequenza per scope |
| `recon/tools/scope_methods.py` | Elenca i membri delle classi che corrispondono a un pattern |
| `recon/tools/elfinfo.py` | Classe/endianness/architettura di un ELF |

---

## 8. Nota legale

Reverse engineering per interoperabilità e preservazione di un servizio dismesso è generalmente difendibile. Si distribuisce **solo il codice del server**: mai APK, asset, audio o master data di Square Enix. Progetto non commerciale.

---

## 9. Prossimo passo consigliato

**Fase A**, in quest'ordine: procurare l'APK Worldwide 4.x, installare Ghidra, e puntare dritto su `APIManager` per ricavare host ed endpoint. È ciò che sblocca la fase B, e la fase B è la prima in cui si vede qualcosa sullo schermo.

In parallelo, vale la pena contattare **Restoration Union** — se hanno già catture di traffico del 2021, saltiamo settimane di lavoro.
