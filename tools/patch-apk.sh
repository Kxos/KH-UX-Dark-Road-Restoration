#!/usr/bin/env bash
# Ripacchettizza l'APK KHUX perche' accetti il nostro certificato.
#
#   ./tools/patch-apk.sh recon/dl/<apk> 192.168.1.198
#
# Perche' serve: da Android 7 le app ignorano le CA installate dall'utente, a meno
# che non lo consentano esplicitamente. Senza questa patch il client rifiuterebbe
# il nostro certificato e non vedremmo mai una richiesta.
#
# La patch e' minima: un network_security_config.xml che dichiara fidate le CA
# utente, piu' il riferimento nel manifest. Nessuna modifica al codice.
#
# Strumenti richiesti (jar, nessuna installazione):
#   apktool.jar          https://github.com/iBotPeaches/Apktool/releases
#   uber-apk-signer.jar  https://github.com/patrickfav/uber-apk-signer/releases
# Mettili in tools/bin/ oppure indica APKTOOL_JAR / SIGNER_JAR.

set -euo pipefail

APK="${1:-}"
LAN_IP="${2:-}"
if [[ -z "$APK" || -z "$LAN_IP" ]]; then
  echo "Uso: $0 <percorso-apk> <ip-locale>"
  exit 1
fi
[[ -f "$APK" ]] || { echo "APK non trovato: $APK"; exit 1; }

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$REPO/tools/bin"
WORK="$REPO/recon/ext/patched"
APKTOOL_JAR="${APKTOOL_JAR:-$BIN/apktool.jar}"
SIGNER_JAR="${SIGNER_JAR:-$BIN/uber-apk-signer.jar}"

for j in "$APKTOOL_JAR" "$SIGNER_JAR"; do
  if [[ ! -f "$j" ]]; then
    echo "MANCANTE: $j"
    echo
    echo "Scarica i due jar in tools/bin/ :"
    echo "  apktool.jar          https://github.com/iBotPeaches/Apktool/releases"
    echo "  uber-apk-signer.jar  https://github.com/patrickfav/uber-apk-signer/releases"
    exit 1
  fi
done

# Ghidra ha portato un JDK 21: a apktool va benissimo.
if [[ -z "${JAVA_HOME:-}" ]] && [[ -x "/c/Program Files/Java/jdk-21/bin/java" ]]; then
  export JAVA_HOME="/c/Program Files/Java/jdk-21"
fi
JAVA="${JAVA_HOME:+$JAVA_HOME/bin/}java"

rm -rf "$WORK"
mkdir -p "$WORK"

echo "== 1/4 decodifica =="
"$JAVA" -jar "$APKTOOL_JAR" d -f -o "$WORK/src" "$APK"

echo "== 2/4 iniezione della configurazione di rete =="
mkdir -p "$WORK/src/res/xml"
cat > "$WORK/src/res/xml/network_security_config.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Fidarsi delle CA utente: necessario per il certificato del server locale.
         Limitato agli host dirottati e all'IP della macchina di sviluppo. -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">sqex-bridge.jp</domain>
        <domain includeSubdomains="true">kingdomhearts.com</domain>
        <domain includeSubdomains="true">$LAN_IP</domain>
        <trust-anchors>
            <certificates src="user" />
            <certificates src="system" />
        </trust-anchors>
    </domain-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="user" />
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
EOF

MAN="$WORK/src/AndroidManifest.xml"
if grep -q 'networkSecurityConfig' "$MAN"; then
  echo "  il manifest lo dichiara gia': lo lascio com'e'"
else
  # inserisce l'attributo nel tag <application>
  python - "$MAN" <<'PY'
import re, sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
s2 = re.sub(r'(<application\b)',
            r'\1 android:networkSecurityConfig="@xml/network_security_config"',
            s, count=1)
if s == s2:
    print('  ATTENZIONE: tag <application> non trovato, manifest non modificato')
    sys.exit(1)
open(p, 'w', encoding='utf-8').write(s2)
print('  attributo networkSecurityConfig aggiunto')
PY
fi

echo "== 3/4 ricostruzione =="
"$JAVA" -jar "$APKTOOL_JAR" b -o "$WORK/khux-patched.apk" "$WORK/src"

echo "== 4/4 firma =="
"$JAVA" -jar "$SIGNER_JAR" -a "$WORK/khux-patched.apk" --allowResign -o "$WORK"

echo
echo "fatto. APK pronto:"
ls -la "$WORK"/*.apk
echo
echo "Sul telefono:"
echo "  1. disinstalla l'app originale (la firma e' diversa, non si aggiorna sopra)"
echo "  2. installa l'APK firmato"
echo "  3. installa server/certs/ca.crt come certificato CA utente"
echo "  4. punta il DNS del telefono a $LAN_IP, oppure usa un DNS che risolva"
echo "     psg.sqex-bridge.jp -> $LAN_IP"
