# Decompila funzioni del libcocos2dcpp.so 4.3.1 con Ghidra headless (progetto gia' analizzato).
#   .\recon\ghidra\decomp.ps1 -Out <file.c> [-Timeout 300] <indirizzo Ghidra> [...]
# Indirizzi Ghidra = indirizzo nel file + 0x100000.
[CmdletBinding(PositionalBinding = $false)]
param([Parameter(Mandatory)][string]$Out, [int]$Timeout = 120,
      [Parameter(ValueFromRemainingArguments)][string[]]$Addr)
$repo = Split-Path (Split-Path $PSScriptRoot)
if (-not $env:JAVA_HOME) { $env:JAVA_HOME = 'D:\Programmi\Android\Android Studio\jbr' }
$ghidra = if ($env:GHIDRA_HOME) { $env:GHIDRA_HOME } else { 'C:\work\Android\ghidra_12.1.4_PUBLIC_20260921\ghidra_12.1.4_PUBLIC' }
& "$ghidra\support\analyzeHeadless.bat" "$repo\recon\ghidra\project" khux-ww431 `
    -process libcocos2dcpp.so -noanalysis -readOnly -scriptPath "$repo\recon\ghidra" `
    -postScript khux_decomp.py $Out t $Timeout @Addr 2>&1 | Select-String -Pattern 'ERROR|Exception' | Select-Object -First 5
