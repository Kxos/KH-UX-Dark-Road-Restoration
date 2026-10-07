# memdump — catturare il protector decifrato

Strumenti per copiare la memoria del client KHUX nell'istante tra il rapporto del
protector (`ErrorCode = 90`) e l'`abort`, e cercarci le sue stringhe in chiaro. Pensati
per un emulatore Android **con root** dove il protector gira davvero — provati su **MuMu
Player 6.8**, istanza Android 12. Vedi la sezione «Dump della memoria del protector» in
[HANDOFF.md](../../../HANDOFF.md) per il contesto e i risultati.

I dump e i file di master data non stanno nel repo: vanno in una cartella fuori, per
esempio `D:\Progetto_Restauro_KH_UX\dumps`.

## Uso

Con l'istanza avviata e `adb` collegato (il seriale lo dà `MuMuManager info -v all`,
porta 16416 per l'istanza 1):

```powershell
# cattura: congela dopo il rapporto e copia le regioni di memoria
./capture.ps1 -Serial 127.0.0.1:16416 -Name cap1

# cerca stringhe nei file del dump
python pick_regions.py <out>\cap1\maps.txt          # regioni "nome start size"
python grep_dump.py   <out>\cap1\mem ErrorCode SM-A156E
python strings_at.py  <out>\cap1\mem\<file>.bin <va_hex> <raggio> [min]
```

## I pezzi

| File | Ruolo |
|---|---|
| `capture.ps1` | orchestratore lato PC: spinge gli script, congela, scarica, dumpa |
| `freeze.sh` | avvia il gioco, `SIGSTOP`, poi scatti `CONT`/`STOP` finché compare `ErrorCode`; salva `maps`, `status`, `pid` |
| `pick_regions.py` | sceglie dal `maps` le regioni leggibili anonime e `lib__57d5__`, in byte |
| `dump.sh` | copia le regioni da `/proc/<pid>/mem` con `dd iflag=skip_bytes,count_bytes` |
| `grep_dump.py` | cerca stringhe nei `.bin` e stampa l'indirizzo virtuale |
| `strings_at.py` | elenca le stringhe ASCII intorno a un indirizzo |

## Due trappole, già risolte negli script

- **Finestra brevissima.** Congelare a tempo fisso manca il bersaglio: il processo muore
  presto e in modo variabile. `freeze.sh` congela subito e avanza a scatti finché il
  rapporto non è nel log.
- **Overflow a 32 bit.** `dd` di toybox e la shell `mksh` tengono gli offset a 32 bit:
  con `bs=4096` gli indirizzi `0x77…` vanno in overflow (`dd: -NNN < 0`). Gli offset si
  calcolano in Python e si passano in byte con `iflag=skip_bytes,count_bytes`.
