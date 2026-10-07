@echo off
rem ===========================================================================
rem  Analisi headless Ghidra sulla build Worldwide 4.3.1 (arm64) - target primario
rem
rem  Doppio clic, oppure da prompt:  recon\ghidra\run-ww.bat
rem  Durata attesa: 45-120 minuti (binario da 33 MB).
rem  Log completo in:  recon\ghidra\out\ww431\analysis.log
rem ===========================================================================

setlocal

set "SCRIPTDIR=%~dp0"
for %%I in ("%SCRIPTDIR%..\..") do set "REPO=%%~fI"

set "TARGET=%REPO%\recon\ext\ww431\libcocos2dcpp.so"
set "OUTDIR=%REPO%\recon\ghidra\out\ww431"
set "PROJDIR=%REPO%\recon\ghidra\project"
set "LOG=%OUTDIR%\analysis.log"

rem --- JDK 17+ ---------------------------------------------------------------
if not defined JAVA_HOME set "JAVA_HOME=C:\Program Files\Java\jdk-21"
if not exist "%JAVA_HOME%\bin\java.exe" (
  echo ERRORE: JDK non trovato in "%JAVA_HOME%".
  echo Ghidra 12 pretende un JDK 21 o superiore e rifiuta di partire con meno.
  echo Se non ne hai uno installato, il JBR di Android Studio lo e':
  echo   set "JAVA_HOME=D:\Programmi\Android\Android Studio\jbr"
  pause & exit /b 1
)

rem --- Ghidra ----------------------------------------------------------------
if not defined GHIDRA_HOME set "GHIDRA_HOME=C:\ghidra\ghidra_12.1.4_PUBLIC"
set "HEADLESS=%GHIDRA_HOME%\support\analyzeHeadless.bat"
if not exist "%HEADLESS%" (
  echo ERRORE: Ghidra non trovato in "%GHIDRA_HOME%".
  echo Imposta GHIDRA_HOME sulla cartella di installazione.
  pause & exit /b 1
)

rem --- Binario ---------------------------------------------------------------
if not exist "%TARGET%" (
  echo ERRORE: binario non trovato:
  echo   %TARGET%
  echo Estrai lib\arm64-v8a\libcocos2dcpp.so dall'APK WW 4.3.1 in recon\ext\ww431\.
  pause & exit /b 1
)

if not exist "%OUTDIR%" mkdir "%OUTDIR%"
if not exist "%PROJDIR%" mkdir "%PROJDIR%"

echo ===========================================================
echo  JAVA_HOME  : %JAVA_HOME%
echo  GHIDRA_HOME: %GHIDRA_HOME%
echo  bersaglio  : %TARGET%
echo  output     : %OUTDIR%
echo  log        : %LOG%
echo ===========================================================
echo.
echo Avvio. Durata attesa 45-120 minuti: puoi lasciare la finestra aperta
echo e fare altro. Non chiuderla finche' non compare "ANALISI CONCLUSA".
echo.

call "%HEADLESS%" "%PROJDIR%" khux-ww431 ^
  -import "%TARGET%" ^
  -overwrite ^
  -scriptPath "%SCRIPTDIR:~0,-1%" ^
  -postScript khux_recon.py "%OUTDIR%" > "%LOG%" 2>&1

set "RC=%ERRORLEVEL%"
echo.
if exist "%OUTDIR%\summary.json" (
  echo ====================== ANALISI CONCLUSA ======================
  type "%OUTDIR%\summary.json"
  echo.
  echo Risultati in: %OUTDIR%
  echo.
  echo Ora esegui il digest per avere un riepilogo compatto:
  echo   python recon\tools\digest.py recon\ghidra\out\ww431
) else (
  echo ====================== ANALISI FALLITA =======================
  echo codice di uscita: %RC%
  echo Ultime righe del log:
  powershell -NoProfile -Command "Get-Content -Tail 25 '%LOG%'"
)
echo.
pause
endlocal
