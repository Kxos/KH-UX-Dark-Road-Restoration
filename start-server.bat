@echo off
rem ===========================================================================
rem  Avvia il server privato KHUX.
rem
rem  Doppio clic su questo file. Rileva da solo l'IP della macchina sulla rete
rem  locale e lo usa come indirizzo da consegnare al client.
rem
rem  Serve eseguirlo COME AMMINISTRATORE: usa le porte 53, 80 e 443.
rem ===========================================================================

setlocal
cd /d "%~dp0"

rem --- Node presente? --------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
  echo ERRORE: Node.js non trovato.
  echo Installalo da https://nodejs.org  e riprova.
  pause & exit /b 1
)

rem --- IP sulla rete locale --------------------------------------------------
rem Prende il primo IPv4 privato non virtuale: e' l'indirizzo che il telefono
rem deve poter raggiungere.
for /f "delims=" %%I in ('powershell -NoProfile -Command ^
  "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notlike 'vEthernet*' -and $_.InterfaceAlias -notlike '*Tunnel*' -and $_.InterfaceAlias -notlike '*VPN*' -and $_.PrefixOrigin -eq 'Dhcp' } ^| Select-Object -First 1 -ExpandProperty IPAddress)"') do set "LAN_IP=%%I"

if "%LAN_IP%"=="" (
  echo Non sono riuscito a determinare l'IP locale.
  set /p LAN_IP=Inseriscilo a mano (es. 192.168.1.198):
)

echo ===========================================================
echo  IP locale rilevato : %LAN_IP%
echo.
echo  Sul telefono imposta questo indirizzo come DNS della Wi-Fi.
echo ===========================================================
echo.

rem --- Certificati presenti? -------------------------------------------------
if not exist "server\certs\server.crt" (
  echo ATTENZIONE: certificati assenti, HTTPS sara' disattivato.
  echo Generali con:   bash server/make-cert.sh %LAN_IP%
  echo.
)

rem --- Avvio -----------------------------------------------------------------
set "KHUX_PUBLIC_URL=https://%LAN_IP%"
node server\server.js

echo.
echo Il server si e' fermato.
pause
endlocal
