# Protector LIAPP e scelta del banco (chiuso il 7 ottobre 2026)

Sintesi. Tutta l'indagine (dump, strace, emulatori provati) e' nel diario
[../journal/fino-al-2026-10-11.md](../journal/fino-al-2026-10-11.md), §2, e in
`recon/tools/memdump/README.md`.

- `lib__57d5__.so` e' **LIAPP** (Lockin Company): impacchettato, caricato da una finta classe Kotlin,
  intrecciato nel dex: non rimovibile. Scrive il verdetto in `app_57d5/<nome>.txt` (codice, ora, pid).
- Codici misurati: **90** = anti-repackaging (APK ri-firmato, qualunque banco); **40** = anti-debug
  (ptrace/strace agganciato); **13380225** (`0xCC2A81`) = APK originale su Android >= 12 (telefono e
  MuMu); **17471875** = memory protection (lettura di `/proc/<pid>/mem` del processo vivo).
- **APK originale su LDPlayer 9 (Android 9), senza root: nessun rifiuto** (verdetto 0). E' il banco
  in uso. Usare solo l'APK originale: il patchato nasconde tutto dietro il 90.
- Esclusi come causa: orologio (anche al 15/5/2021), installer, emulatore contro telefono, debug USB.
- Emulatori x86 Google: solo l'API 30 x86_64 ha la traduzione ARM, ma il protector muore nel
  traduttore (`HandleNoExec`); l'immagine arm64 non boota su host x86 (`PCI bus not available for
  hda`). MuMu (houdini) esegue il protector e rifiuta con 90/13380225.
- Il popup «End of Service» e' una scadenza a data dentro il client (29/6/2021): l'orologio del guest
  va tenuto al 15/5/2021 (`phaseb-guest.sh`).
- La CA del server va installata come CA di sistema (targetSdk 29 non si fida delle CA utente e
  l'APK non si puo' ripatchare).
