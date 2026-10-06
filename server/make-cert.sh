#!/usr/bin/env bash
# Genera una CA e un certificato server per il dirottamento del client.
#
#   ./server/make-cert.sh 192.168.1.50
#
# Produce in server/certs/:
#   ca.crt      -> da installare sul telefono come CA utente
#   server.key  -> chiave del server
#   server.crt  -> certificato, valido per gli host dirottati e per l'IP indicato
#
# Il SAN include psg.sqex-bridge.jp e cache.sqex-bridge.jp perche' sono gli host
# che il client contatta, piu' l'IP locale della macchina, che e' cio' che il
# telefono raggiunge davvero.

set -euo pipefail

# Git Bash converte gli argomenti che iniziano con "/" in percorsi Windows, quindi
# -subj "/CN=..." arriverebbe a OpenSSL come "C:/Program Files/Git/CN=...".
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

LAN_IP="${1:-}"
if [[ -z "$LAN_IP" ]]; then
  echo "Uso: $0 <ip-locale-della-macchina>"
  echo "Trovalo con: ipconfig | grep IPv4"
  exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/certs"
mkdir -p "$DIR"
cd "$DIR"

echo "== CA =="
openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
  -keyout ca.key -out ca.crt \
  -subj "/CN=KHUX Restoration Local CA/O=KHUX Restoration"

echo "== certificato server (IP $LAN_IP) =="
cat > san.cnf <<EOF
[req]
distinguished_name = dn
req_extensions = ext
prompt = no
[dn]
CN = psg.sqex-bridge.jp
[ext]
subjectAltName = @alt
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
[alt]
DNS.1 = psg.sqex-bridge.jp
DNS.2 = cache.sqex-bridge.jp
DNS.3 = *.sqex-bridge.jp
DNS.4 = *.kingdomhearts.com
DNS.5 = localhost
IP.1  = $LAN_IP
IP.2  = 127.0.0.1
EOF

openssl req -newkey rsa:2048 -nodes -keyout server.key -out server.csr \
  -config san.cnf
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 3650 -extfile san.cnf -extensions ext

rm -f server.csr ca.srl
echo
echo "fatto:"
ls -la "$DIR"
echo
echo "Prossimo passo: trasferisci ca.crt sul telefono e installalo come CA utente."
echo "Serve comunque ripacchettizzare l'APK perche' Android 7+ ignora le CA utente"
echo "a meno che l'app non lo consenta esplicitamente (networkSecurityConfig)."
