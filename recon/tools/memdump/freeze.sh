#!/system/bin/sh
# freeze.sh <ritardo_s> <cartella_out> [passo_s]
# Avvia il gioco e lo congela dopo <ritardo_s> secondi dalla nascita del pid.
# Con [passo_s], poi lo fa avanzare a scatti (CONT, passo, STOP) finche' il
# protector non ha scritto il rapporto "E error", e lo lascia fermo li'.
# Salva maps, status e righe di errore. Va eseguito da root.
PKG=com.square_enix.android_googleplay.khuxww
D=$1
OUT=$2
STEP=$3
mkdir -p "$OUT"
am force-stop $PKG
logcat -c
am start -n $PKG/org.cocos2dx.cpp.AppActivity >/dev/null 2>&1
P=""
while [ -z "$P" ]; do P=$(pidof $PKG); done
sleep "$D"
kill -STOP "$P" 2>/dev/null
steps=0
if [ -n "$STEP" ]; then
  while [ -d /proc/$P ] && [ $steps -lt 200 ]; do
    if logcat -d -b main 2>/dev/null | grep -q " $P .* E error .*ErrorCode"; then break; fi
    kill -CONT "$P"; sleep "$STEP"; kill -STOP "$P" 2>/dev/null
    steps=$((steps + 1))
  done
fi
if [ -d /proc/$P ]; then
  cat /proc/$P/maps > "$OUT/maps.txt"
  grep -E '^(State|VmRSS)' /proc/$P/status > "$OUT/status.txt"
  echo "$P" > "$OUT/pid"
  echo "FROZEN pid=$P delay=$D steps=$steps"
else
  echo "DEAD pid=$P delay=$D steps=$steps"
fi
logcat -d -b main 2>/dev/null | grep -E " $P .* E error " > "$OUT/error.txt"
echo "error_lines=$(wc -l < "$OUT/error.txt")"
