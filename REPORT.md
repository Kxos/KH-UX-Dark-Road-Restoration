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
| `recon/ext/ww431/libcocos2dcpp.so` — **APK Worldwide 4.3.1-72** | APKMirror | ✅ ELF64 AARCH64, 33 MB, **non cifrato, con simboli** | **Target primario.** Ultima build pienamente online (apr 2021), inglese. 107 tabelle `master::`, 6.587 simboli C++, 17 simboli `APIManager` |
| `recon/ext/ww431/libcocos2dcpp-armv7.so` | stesso APK | ✅ ELF32 ARM, 20 MB | Variante a 32 bit della stessa build |
| `recon/ext/tw252/` — APK Taiwan 2.5.2 | archive.org `KHUx-TW-APKs` | ✅ ELF32 ARM, **non cifrato, con simboli** | Build online più vecchia (~2 anni). Utile come riscontro incrociato |
| `recon/web/blobs/libcocos2dcpp-image.bin` | Web Edition 5.0.1 WW | ✅ ELF64 AARCH64, **non cifrato, con simboli** | Build *offline*. Il termine di paragone che misura cosa è stato rimosso |
| `recon/web/blobs/libcocos2dcpp-aot.wasm` | Web Edition 5.0.1 WW | ✅ 61 MB wasm | L'ELF ARM64 ricompilato AOT in WebAssembly |
| IPA Worldwide (1.0.1 → 4.4.0) | archive.org `khux-ww-IPAs` | ❌ **FairPlay, `cryptid=1` su entrambe le slice** | Inutilizzabili senza device jailbroken. Scaricati e scartati |

> **Nota sulla 4.4.0:** da evitare come target. È di giugno 2021, *dopo* la chiusura del
> 30 maggio, quindi è già una build di transizione. La 4.3.1 (aprile 2021) è l'ultima
> pienamente online.

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
| TW 2.5.2 (online, 2019) | 63 |
| **WW 4.3.1 (online, apr 2021)** | **107** |
| WW 5.0.1 (offline, mag 2021) | 56 |

Il confronto che conta è **WW 4.3.1 → WW 5.0.1**: stessa regione, versioni consecutive,
a cavallo esatto della chiusura. Misura la rimozione e nient'altro.

| | |
|---|---|
| Mantenute | 53 |
| **Rimosse nel passaggio a offline** | **54** |

### Le 54 tabelle da ricostruire — la misura esatta del lavoro

```
Achievement      Advertisement    BenefitResource  Colosseum        ColosseumStage
Comeback         CommunicationBgm CommunicationCategory CommunicationRoom CommunicationTalk
CommunicationThumbnail DarkMainMission DarkPve     DarkPveReward    DrawMedalType
DrawPetType      Emblem           EvCampaign       EvMedalList      EvResource
EvScoreReward    EvStage          GuiltProb        KeybladeSubslot  LoginBonus
Medal            Mission          Moogleshop       Multi            MultiStage
MultiTalk        MultiTimemission MypageBackground Passive          PassiveSetting
PetRank          PetSkill         Player           Pvp              PvpScoreReward
RaidReward       RaidSetting      Ranking          RankingPvp       RankingReward
Reward           SerialcodeReward Shop             Shuffleskill     SkillExp
Sphere           SphereArray      SphereMasu       Stamp
```

Si legge come l'autopsia della rimozione: `Medal` (le medaglie), `DrawMedalType`/`DrawPetType`
(il gacha), `Shop`, `Moogleshop`, `Mission`, `Multi*` (Union Cross), `Raid*`, `Sphere*`
(sphere board), `Ranking*`, `Pvp*`, `Colosseum`, `LoginBonus`, `Ev*` (eventi),
`Communication*` (chat e stanze). È precisamente ciò che è sparito dall'app lasciando
il theater.

> **Correzione rispetto alla prima stesura.** Una versione precedente di questo report
> indicava 40 tabelle, calcolate confrontando la build Taiwan 2.5.2 con la WW 5.0.1 —
> due regioni e due anni di distanza, quindi il diff includeva anche la normale
> evoluzione del gioco e ne mancava una parte. Il numero corretto è **54**. Sistemi
> interi assenti nel conteggio precedente: `Pvp`, `PvpScoreReward`, `RankingPvp`,
> `Moogleshop`, `Passive`/`PassiveSetting`, `KeybladeSubslot` e i cinque
> `Communication*`.

Le 53 tabelle **sopravvissute** (`Enemy`, `EnemyAttack`, `Stage`, `Skill`, `Buff`,
`Burst`, `BattleMisc`, `Keyblade`, `AvatarParts`, `Material`, `RaidEnemy`…) restano un
vantaggio concreto: il **motore di combattimento è ancora integro nel client offline**.
Non va riscritto — va solo rialimentato con i dati.

File: `recon/out/master_classes_{tw252,ww431,ww501}.txt`,
`master_removed_ww431_to_ww501.txt`, `master_kept_ww431_to_ww501.txt`

---

## 5. Cosa manca ancora

1. ~~**APK Worldwide 4.x**~~ — ✅ **risolto.** Procurata la 4.3.1-72 da APKMirror, con
   entrambe le architetture e non cifrata.
2. **I nomi dei campi di ogni tabella.** Le classi `master::` sono note, i campi no: non compaiono come stringhe isolate. Richiedono il disassemblaggio dei deserializzatori rapidjson in Ghidra (~54 funzioni). La pipeline in `recon/ghidra/` lo fa automaticamente: i deserializzatori confrontano ogni chiave con una stringa letterale, quindi le stringhe referenziate dalla funzione di parsing di una tabella *sono* i suoi campi.
3. **Il content package pre-5.0.** Esiste solo nelle build 5.0.1. Da valutare quanto degli asset Union χ sia sopravvissuto in `Content.zip` (2,1 GB, non ancora scaricato).
4. **Valori reali del master data.** Lo schema si ricava dal binario; i *contenuti* (statistiche delle medaglie, drop table, costi) vanno ricostruiti da khuxwiki.com.

---

## 6. Piano rivisto e stima

| Fase | Contenuto | Stima |
|---|---|---|
| **A** | ✅ APK WW 4.3.1 procurato · ✅ pipeline Ghidra headless pronta · ⬜ isolare `APIManager` e ricavare host, elenco endpoint e formato richiesta | 1–2 settimane |
| **B** | Server REST minimo: crypto AES/gzip + handshake sessione. **Milestone: il client raggiunge la home screen** | 1–2 settimane |
| **C** | Estrarre i campi delle 54 tabelle da Ghidra; definire lo schema DB | 2–4 settimane |
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

Completare la **fase A**: far girare `recon/ghidra/run.sh` sul binario WW 4.3.1 arm64 e
leggere `api_candidates.txt` e il decompilato di `APIManager` per ricavare host ed
endpoint. È ciò che sblocca la fase B, e la fase B è la prima in cui si vede qualcosa
sullo schermo.

La stessa esecuzione produce anche `master_fields.json`, cioè i campi delle 54 tabelle:
la fase C arriva gratis con la fase A.

In parallelo, vale la pena contattare **Restoration Union** — se hanno già catture di traffico del 2021, saltiamo settimane di lavoro.
