#!/system/bin/sh
# dump.sh <pid> <file_regioni> <cartella_out>
# Copia da /proc/<pid>/mem le regioni elencate, una per riga:
#   <nome> <start_in_byte> <dimensione_in_byte>   (decimali, da pick_regions.py)
# Il processo deve essere fermo (SIGSTOP). Va eseguito da root.
#
# Niente aritmetica qui: mksh fa i conti a 32 bit e gli indirizzi utente
# (0x77..) vanno in overflow. dd invece legge i numeri a 64 bit.
P=$1
LIST=$2
OUT=$3
mkdir -p "$OUT"
n=0; fail=0
while read -r NAME START SIZE; do
  [ -z "$NAME" ] && continue
  dd if=/proc/$P/mem of="$OUT/$NAME.bin" bs=65536 iflag=skip_bytes,count_bytes \
     skip="$START" count="$SIZE" 2>/dev/null
  got=$(wc -c < "$OUT/$NAME.bin" 2>/dev/null)
  if [ "$got" = "$SIZE" ]; then
    n=$((n + 1))
  else
    fail=$((fail + 1)); echo "corta $NAME: ${got:-0} di $SIZE"
  fi
done < "$LIST"
echo "dumpate=$n incomplete=$fail"
du -sh "$OUT"
