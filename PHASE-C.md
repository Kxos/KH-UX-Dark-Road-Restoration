# Fase C — i campi delle tabelle `master::`

Target: `libcocos2dcpp.so` arm64 della build **WW 4.3.1-72**, lo stesso della fase A.

| | |
|---|---|
| Classi `master::` con RTTI | **107** |
| Tabelle con campi estratti | **106** (la 107ª è `Base`, la classe base astratta) |
| Campi totali | **1.739** |
| **Delle 54 tabelle rimosse nel passaggio a offline** | **54 su 54, 759 campi** |
| Tempo di esecuzione | ~3 secondi |

Risultati: `recon/out/master_fields_ww431.json` (con indirizzi e ordine) e
`master_fields_ww431.txt` (elenco leggibile).

---

## 1. Ghidra non serviva

Il piano era estrarre i campi dal decompilato, con un'euristica: raggruppare le
funzioni che referenziano molte stringhe snake_case brevi. Due problemi, scoperti
provando.

**I campi non sono in snake_case, sono in camelCase** — `medalId`, `maxAttack`,
`shuffleSkillGroupId`. Un filtro tarato su snake_case li avrebbe persi quasi tutti.

**E soprattutto l'euristica non serve**, perché esiste un'attribuzione esatta. Il
lavoro si fa sull'ELF, in Python puro, senza disassemblatore e senza il progetto
Ghidra da 829 MB.

## 2. La catena

Quattro passaggi, ognuno dei quali è un fatto dell'ABI, non una congettura.

**1 · L'RTTI non si può strippare.** Ogni classe con metodi virtuali lascia in
`.rodata` il proprio typeinfo-name — `N6master5MedalE` — perché serve a runtime a
`typeid` e `dynamic_cast`. Tutte e 107 le classi `master::` ce l'hanno.

**2 · Dal nome alla vtable.** Secondo l'ABI Itanium la stringa è puntata dal campo
`name` del typeinfo (offset +8), e l'oggetto typeinfo è puntato dallo slot +8
della vtable. In una libreria condivisa quegli slot sono a zero nel file: il
valore vero sta nell'addend di una rilocazione `R_AARCH64_RELATIVE`. Quindi non si
leggono i byte, si legge `.rela.dyn` — 194.145 rilocazioni, indicizzate una volta.

Risultato: tutte e 106 le vtable concrete, ciascuna con **3 metodi virtuali**. Lo
slot 0 è lo stesso indirizzo per tutte e 106 — il distruttore di `master::Base` —
mentre gli slot 1 e 2 sono unici per classe. È la conferma strutturale che le
tabelle derivano tutte da una base comune.

**3 · Chi installa la vtable è un metodo di quella classe.** Un costruttore
comincia scrivendo il puntatore alla vtable nell'oggetto. Le funzioni che
costruiscono quell'indirizzo sono quindi i costruttori e i distruttori di quella
classe **e nessun'altra**: non è un'euristica con falsi positivi, è
un'attribuzione. Per ciascuna delle 106 classi risulta esattamente una funzione.

**4 · Il deserializzatore confronta ogni chiave con un letterale.** Le stringhe che
quella funzione tocca *sono* i campi della tabella.

### Due dettagli che rendono il passaggio 4 praticabile

**I confini delle funzioni arrivano da `.eh_frame`.** Il binario è strippato, ma il
C++ con eccezioni descrive ogni funzione in una FDE con indirizzo iniziale e
lunghezza: **87.437 funzioni con confini esatti**, gratis, senza analisi.

**I riferimenti alle stringhe si decodificano a mano.** Su AArch64 un indirizzo non
sta nell'istruzione: si costruisce con `ADRP` (pagina da 4 KB) più `ADD` (offset),
o `ADRP` più `LDR` via GOT. Seguire quelle tre forme tenendo lo stato dei registri
basta a ricostruire ogni costante indirizzata. Non è un'emulazione: lo stato di un
registro si dimentica appena un'altra istruzione lo scrive, e funziona perché la
coppia ADRP/ADD è quasi sempre adiacente.

## 3. L'ordine dei campi è l'ordine delle colonne

Gli indirizzi vengono raccolti **in ordine di apparizione nel codice**, non in un
insieme. Quell'ordine è l'ordine in cui il parser legge i campi, cioè l'ordine
delle colonne della tabella — e la chiave primaria viene per prima in **93 tabelle
su 106**:

```
Medal        medalId, imageId, thumbId, cutinId, imageCategory, artId, displayId, sortId, …
Shop         shopId, productId, sortId, type, os, price, coin, addCoin, …
LoginBonus   loginBonusId, bonusType, title, description, comment, day, startDate, endDate, …
Stage        stageId, stageBinId, id, name, mapName, useAp, chapterId, worldId, …
```

Buttare via quell'ordine avrebbe significato ricostruirlo a mano per 106 tabelle.

## 4. Le tabelle `*Misc` sono coppie chiave/valore

Otto tabelle hanno **due soli campi**: `Misc`, `DarkMisc`, `XtresMisc`,
`MedalMisc`, `BattleMisc`, `DarkBattleMisc` (`{miscId, value}` e simili),
`SkillExp` (`{expId, value}`), `DarkMapList` (`{mapId, mapListId}`).

Non è un'estrazione fallita: sono genuinamente tabelle a due colonne, dove la
configurazione sta nelle righe. Una soglia minima di 3 campi — la prima che avevo
messo — le scartava tutte e otto, e sembravano un buco del metodo.

## 5. Riscontro con la fase A

Ogni campo è letto da una sola chiamata, sempre alla stessa funzione: `0x61f8ec`.
Sommata alla base immagine con cui Ghidra carica l'ELF (`0x100000`) è
**`FUN_0071f8ec`**, cioè esattamente il getter di campo JSON già identificato in
fase A come quello usato da `FUN_007bd5b8` per leggere `nativeSessionId` e
`sharedSecurityKey`.

Due analisi indipendenti — una in Ghidra, una in Python sull'ELF — arrivano alla
stessa funzione. È il riscontro che serviva.

## 6. Cosa manca ancora: i tipi

Si hanno i **nomi** dei campi e il loro **ordine**, non i tipi. Il parser chiama il
getter generico e poi converte *inline*, quindi il bersaglio della chiamata non
dice se un campo è intero, stringa o booleano.

Tre vie, in ordine di costo:

1. **Le convenzioni di nome coprono molto**: `*Id`/`sortId`/`num`/`price` interi,
   `valid*`/`display`/`show` booleani, `name`/`flavor`/`explanation`/`comment`
   stringhe, `startDate`/`endDate` timestamp.
2. **Il decompilato di Ghidra** sulle 106 funzioni di parsing — ora che si sa
   esattamente quali sono, costa minuti, non ore.
3. **I dati veri**, quando il client parlerà col nostro server: i tipi si leggono
   dai valori.

Per definire lo schema del DB il punto 1 basta a partire, e il punto 3 lo corregge.

## 7. Strumenti prodotti

| File | |
|---|---|
| `recon/tools/vtables.py` | vtable e metodi virtuali di una classe, via RTTI e rilocazioni |
| `recon/tools/codeindex.py` | confini di funzione da `.eh_frame`, costanti indirizzate da ADRP/ADD |
| `recon/tools/master_fields.py` | la pipeline completa della fase C |

Nessuna dipendenza, come il resto di `recon/tools/`. `vtables.py` e `codeindex.py`
non sanno nulla di `master::`: servono per qualunque classe C++ di questo binario,
e `codeindex.py` rifà in 3 secondi, per tutte le 87.437 funzioni, l'xref sulle
stringhe che in fase A era costato un progetto Ghidra.

```bash
python recon/tools/master_fields.py recon/ext/ww431/libcocos2dcpp.so \
    --out recon/out/master_fields_ww431.json \
    --text recon/out/master_fields_ww431.txt
```
