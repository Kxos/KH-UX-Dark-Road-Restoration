#!/system/bin/sh
# dumprange.sh <pid> <inizio_hex> <fine_hex> <file>
# Copia la regione [inizio, fine) della memoria del processo con vmread
# (process_vm_readv). NON si usa /proc/<pid>/mem: LIAPP chiude il gioco appena
# qualcuno lo apre. La shell fa i conti a 32 bit: printf converte (64 bit), awk sottrae.
P=$1; S=$2; E=$3; F=$4
s=$(printf '%d' 0x$S)
e=$(printf '%d' 0x$E)
n=$(awk "BEGIN{printf \"%x\", $e-$s}")
/data/local/tmp/armtrace/vmread $P $S $n > $F
