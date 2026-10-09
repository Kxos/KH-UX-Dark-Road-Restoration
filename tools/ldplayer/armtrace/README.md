# armtrace — registri ARM al momento di un crash, sotto houdini

Su LDPlayer 9 il gioco (ARM64) gira tradotto da houdini su x86_64: il tombstone mostra
i registri x86 e un backtrace di `libhoudini.so`, inutili. Questi strumenti fermano il
processo nell'istante del crash e leggono lo **stato della CPU ARM emulata**: `x0..x30`,
`sp`, `pc`. Con `x30` (indirizzo di ritorno) si arriva al chiamante.

Usato l'8 ottobre 2026 per il crash dopo l'aggiornamento dei master (vedi HANDOFF,
«Il crash dopo l'aggiornamento dei master»): `pc` = `0x12c1ee4`, `x30` = `0xcfb310`
(`SceneDownload`), causa la voce 116 di `misc` in `/system/coppa`.

## Uso

```powershell
.\capture.ps1 -Arm                     # carica gli script nel guest e attende il crash
# provocare il crash (es. il rientro dopo un aggiornamento dei master)
.\capture.ps1 -Collect -Tag <nome>     # entro 30 s: registri ARM, stack
.\capture.ps1 -Release                 # riattiva tombstoned (il gioco muore)
```

`-X0 <hex>` indica il valore di `x0` da cercare per trovare la struttura dei registri
(lo si legge nel tombstone, nella memoria vicino a `r13`). I dump vanno in
`D:\Progetto_Restauro_KH_UX\dumps\armtrace\<nome>`.

## Come funziona, e le trappole

- **Fermare il processo.** `debug.debuggerd.wait_for_gdb` e un `SIGSTOP` non bastano:
  LIAPP traccia già il thread principale e il processo muore lo stesso. Il gestore dei
  segnali di libc avvia `crash_dump64` e lo attende; `crash_dump` chiede un file a
  `tombstoned`. Con `tombstoned` sospeso (`SIGSTOP`) il thread in crash resta fermo
  **30 secondi** (il timeout di `crash_dump`). `freeze_on_crash.sh` sospende
  `tombstoned`, attende `crash_dump64` e copia subito le regioni di houdini.
- **Leggere la memoria.** LIAPP chiude il gioco appena qualcuno apre `/proc/<pid>/mem`
  (anche da root). `vmread` usa `process_vm_readv`, che non apre file: il gioco non se ne
  accorge. Leggere `/proc/<pid>/maps` è innocuo.
- **Compilare `vmread`.** Nel guest non c'è un compilatore e sul PC c'è solo MinGW:
  `vmread.c` non usa libc né dati globali, `build_vmread.py` lo compila con MinGW e
  avvolge il codice macchina in un ELF statico Linux x86_64. Attenzione: sotto MinGW
  `long` è a 32 bit (si usa `long long`).
- **Lo stato ARM.** Sta nelle regioni `[anon:Mem_0x10002002]`; nel tombstone lo punta
  `r13`. Layout: `x0..x30` a 8 byte, poi `sp`, `pc`. houdini carica
  `libcocos2dcpp.so` sempre a `0x3308000`: indirizzo Ghidra = valore − `0x3308000` +
  `0x100000`. Gli oggetti globali si leggono allo stesso modo (es. l'oggetto di sessione
  di `FUN_007c1dfc`, Ghidra `0x209e290`, è a `0x52a6290`).
- **Shell del guest.** I conti a 64 bit li fa `printf '%d' 0x…` (la shell è a 32 bit);
  `pkill -f` non deve stare nella stessa riga che nomina lo script, o uccide sé stesso.

## I pezzi

| File | Ruolo |
|---|---|
| `capture.ps1` | orchestratore sul PC |
| `freeze_on_crash.sh` | nel guest: sospende `tombstoned`, attende il crash, copia le regioni di houdini |
| `dumprange.sh` | nel guest: copia una regione con `vmread` |
| `vmread.c`, `build_vmread.py` | lettore di memoria con `process_vm_readv`, e come costruirlo |
| `analyze.py` | registri e backtrace euristico da uno stack copiato |

## Aggiunte del 9 ottobre 2026

- **Base della libreria.** Sotto houdini oggi `libcocos2dcpp.so` sta a `0x31c0000` (si
  vede in `/proc/<pid>/maps` e nel tombstone), non a `0x3308000` come presumono
  `capture.ps1` e `analyze.py`: i loro valori «Ghidra» vanno ridotti di `0x148000`.
- `findregs.py <cartella houdini>`: cerca le strutture dei registri ARM senza conoscere
  `x0` (blocco con `pc` e `x30` dentro la libreria, `sp` plausibile). Se il crash avviene
  in libc (`pc` fuori dalla libreria) non trova nulla: allentare il vincolo su `pc`.
- `stackcap.ps1 -Tag <nome> [-MenuY <y>]`: arma la cattura, rientra con
  `bench_start.ps1`, apre una voce del menu (MENU poi il tocco a `1745,<y>`), copia le
  regioni di houdini, trova `sp` con `findregs.py` e copia con `dumprange.sh` la regione
  dello stack che lo contiene (`stack.bin`, `stackinfo.txt`).
- `backtrace.py <libcocos2dcpp.so> <stack.bin> <inizio_hex> <sp_hex> [n]`: indirizzi di
  ritorno plausibili (preceduti da BL/BLR) con la base corretta. Usato per Equipment
  (`0xc17240` → `FUN_00c16d14`).
