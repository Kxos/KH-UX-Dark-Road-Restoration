#!/system/bin/sh
# Fotografa a raffica, dal processo vivo, le regioni del protector: il segmento
# di codice (la regione anonima subito dopo il primo mapping di lib__57d5__.so)
# viene azzerato prima del rapporto, quindi va letto mentre e' ancora pieno.
# Uso: snap.sh <outdir> [n_scatti] [pausa_s]
# Da root. Lancia il gioco da se'.
OUT=$1; N=${2:-200}; P_S=${3:-0.005}
PKG=com.square_enix.android_googleplay.khuxww
mkdir -p "$OUT"
am force-stop $PKG
am start -n $PKG/org.cocos2dx.cpp.AppActivity >/dev/null 2>&1
P=""
while [ -z "$P" ]; do P=$(pidof $PKG); done
echo "pid=$P"
# attende il mapping del protector
R=""
while [ -z "$R" ]; do
  # la riga dopo il primo mapping del .so deve essere anonima r--p
  R=$(awk 'f { if ($2 == "r--p" && $5 == "0") print $1; exit }
           /__57d5__/ { f = 1 }' /proc/$P/maps 2>/dev/null)
  [ -d /proc/$P ] || { echo "morto prima del mapping"; exit 1; }
done
cp /proc/$P/maps "$OUT/maps.txt"
S=$(printf '%d' 0x${R%-*}); E=$(printf '%d' 0x${R#*-})
echo "regione=$R"
i=0
while [ $i -lt $N ] && [ -d /proc/$P ]; do
  dd if=/proc/$P/mem of="$OUT/s$i.bin" bs=65536 iflag=skip_bytes,count_bytes \
     skip=$S count=$((E - S)) 2>/dev/null
  i=$((i + 1))
  sleep $P_S
done
echo "scatti=$i"
