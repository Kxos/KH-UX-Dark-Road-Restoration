#!/usr/bin/env bash
# Esegue l'analisi headless di Ghidra su una libreria nativa KHUX.
#
#   ./recon/ghidra/run.sh tw252     # build Taiwan 2.5.2  (era ONLINE, ARM32)
#   ./recon/ghidra/run.sh ww501     # build Worldwide 5.0.1 (era OFFLINE, ARM64)
#   ./recon/ghidra/run.sh <percorso-di-un-.so>
#
# Variabili d'ambiente:
#   GHIDRA_HOME   cartella di installazione di Ghidra (altrimenti viene cercata)
#   JAVA_HOME     JDK 17+ (altrimenti viene cercato jdk-21)

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_DIR="$REPO/recon/ghidra"

# ---------------------------------------------------------------------------
# Bersaglio
# ---------------------------------------------------------------------------
case "${1:-tw252}" in
  tw252) TARGET="$REPO/recon/ext/tw252/lib/armeabi-v7a/libcocos2dcpp.so"; LABEL=tw252 ;;
  ww501) TARGET="$REPO/recon/web/blobs/libcocos2dcpp-image.bin";          LABEL=ww501 ;;
  *)     TARGET="$1"; LABEL="$(basename "$TARGET" | tr -c 'A-Za-z0-9_.-' '_')" ;;
esac

if [[ ! -f "$TARGET" ]]; then
  echo "ERRORE: binario non trovato: $TARGET" >&2
  echo "Procurati il client e rimettilo al suo posto: i binari non sono versionati." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Java: Ghidra 11.x richiede JDK 17 o superiore
# ---------------------------------------------------------------------------
if [[ -z "${JAVA_HOME:-}" ]] || ! "$JAVA_HOME/bin/java" -version 2>&1 | grep -qE '"(1[7-9]|2[0-9])'; then
  for candidate in "/c/Program Files/Java/jdk-21" "/c/Program Files/Java/jdk-17" \
                   "$HOME/.jdks/corretto-21"* "$HOME/.jdks/temurin-21"*; do
    if [[ -x "$candidate/bin/java" ]]; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi

if [[ -z "${JAVA_HOME:-}" ]]; then
  echo "ERRORE: serve un JDK 17+. Imposta JAVA_HOME." >&2
  exit 1
fi
echo "JAVA_HOME = $JAVA_HOME"

# ---------------------------------------------------------------------------
# Ghidra
# ---------------------------------------------------------------------------
if [[ -z "${GHIDRA_HOME:-}" ]]; then
  for candidate in "/c/ghidra"/ghidra_* "/c/Program Files/ghidra"* "$HOME/ghidra"*; do
    if [[ -f "$candidate/support/analyzeHeadless.bat" ]]; then
      GHIDRA_HOME="$candidate"
      break
    fi
  done
fi

if [[ -z "${GHIDRA_HOME:-}" || ! -d "$GHIDRA_HOME" ]]; then
  cat >&2 <<'EOF'
ERRORE: Ghidra non trovato.

Installazione (nessun privilegio di amministratore richiesto):
  1. Scarica l'ultima release da
       https://github.com/NationalSecurityAgency/ghidra/releases
  2. Estrai in C:\ghidra\  (percorso senza spazi: evita problemi con gli script)
  3. Riesegui, oppure imposta GHIDRA_HOME esplicitamente.
EOF
  exit 1
fi
echo "GHIDRA_HOME = $GHIDRA_HOME"

HEADLESS="$GHIDRA_HOME/support/analyzeHeadless.bat"
[[ -f "$HEADLESS" ]] || HEADLESS="$GHIDRA_HOME/support/analyzeHeadless"

# ---------------------------------------------------------------------------
# Esecuzione
# ---------------------------------------------------------------------------
PROJ_DIR="$REPO/recon/ghidra/project"
OUT_DIR="$REPO/recon/ghidra/out/$LABEL"
mkdir -p "$PROJ_DIR" "$OUT_DIR"

echo
echo "bersaglio : $TARGET"
echo "output    : $OUT_DIR"
echo "L'analisi iniziale di un .so da 14-20 MB richiede tipicamente 10-40 minuti."
echo

"$HEADLESS" \
  "$(cygpath -w "$PROJ_DIR" 2>/dev/null || echo "$PROJ_DIR")" "khux-$LABEL" \
  -import "$(cygpath -w "$TARGET" 2>/dev/null || echo "$TARGET")" \
  -overwrite \
  -scriptPath "$(cygpath -w "$SCRIPT_DIR" 2>/dev/null || echo "$SCRIPT_DIR")" \
  -postScript khux_recon.py "$(cygpath -w "$OUT_DIR" 2>/dev/null || echo "$OUT_DIR")"

echo
echo "=== risultati in $OUT_DIR ==="
ls -la "$OUT_DIR" 2>/dev/null || true
