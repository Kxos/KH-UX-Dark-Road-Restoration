#!/system/bin/sh
# Tiene fermo il gioco nell'istante del crash, per leggerne la memoria.
#
# Il gestore dei segnali di libc avvia crash_dump64 e attende che finisca; crash_dump
# chiede a tombstoned il file del tombstone. Se tombstoned e' sospeso (SIGSTOP),
# crash_dump resta in attesa e il thread in crash resta fermo: per 30 secondi, poi
# crash_dump rinuncia e il processo muore. Ne' debug.debuggerd.wait_for_gdb ne' un
# SIGSTOP al gioco funzionano: LIAPP traccia gia' il thread principale.
#
# Appena fermo, copia subito le regioni rw di houdini ([anon:Mem_0x10002002], dove
# sta lo stato della CPU ARM emulata) in /data/local/tmp/armtrace/houdini/, poi scrive
# pid e maps. Il processo del gioco e' il piu' vecchio dei due che portano il suo nome
# (l'altro e' il tracciatore di LIAPP).
PKG=com.square_enix.android_googleplay.khuxww
OUT=/data/local/tmp/armtrace
mkdir -p $OUT
rm -rf $OUT/pid $OUT/maps $OUT/houdini
kill -STOP $(pidof tombstoned)
while :; do
  c=$(pidof crash_dump64)
  if [ -n "$c" ]; then
    p=$(for x in $(pidof $PKG); do echo $x; done | sort -n | head -1)
    cat /proc/$p/maps > $OUT/maps.tmp
    mkdir -p $OUT/houdini
    grep 'Mem_0x10002002' $OUT/maps.tmp | grep ' rw' | while read range perm rest; do
      sh $OUT/dumprange.sh $p ${range%-*} ${range#*-} $OUT/houdini/${range%-*}.bin
    done
    mv $OUT/maps.tmp $OUT/maps
    echo $p > $OUT/pid
    echo "fermo $p (crash_dump $c), regioni: $(ls $OUT/houdini | wc -l)"
    exit 0
  fi
done
