#!/system/bin/sh
# Traccia le syscall del client KHUX dalla nascita all'abort.
# Sotto houdini ogni svc del codice ARM diventa una syscall vera del processo
# x86_64, quindi strace (statico x86_64) vede anche le chiamate dirette del
# protector. Ci si aggancia a zygote64 con -f perche' l'app nasce da un suo fork.
# Uso (root): trace.sh <out.txt> [secondi]
OUT=$1; T=${2:-8}
PKG=com.square_enix.android_googleplay.khuxww
ST=/data/local/tmp/strace
am force-stop $PKG
Z=$(pidof zygote64)
$ST -f -tt -s 256 -yy -o "$OUT" -p "$Z" &
SP=$!
sleep 1
am start -n $PKG/org.cocos2dx.cpp.AppActivity >/dev/null 2>&1
sleep "$T"
kill -INT $SP
sleep 1
echo "app_pid_ultimo=$(pidof $PKG)"
logcat -d | grep ' E error ' | tail -n 3
