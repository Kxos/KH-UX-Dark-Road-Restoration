param([string]$Shot = 'prologue')
# Prologue (stage 1010), da subito dopo bench_flow.ps1 fino al forziere arancione.
# Sequenza di tocchi misurata sul banco (la mappa e la telecamera sono fisse):
# Shadow sulla scalinata, piazza della fontana, gruppo di 3 Shadow, scalinata alta,
# forziere (uniqueTreasureId/reward: vedi HANDOFF). Screenshot prima e dopo il forziere.
. "$PSScriptRoot\bench_lib.ps1"
Tap 1360 360; Start-Sleep 5          # verso il primo Shadow
Tap 990 560; Start-Sleep 4           # attacco
Tap 1500 360; Start-Sleep 5          # verso il bersaglio
Tap 1520 380; Start-Sleep 3
Tap 1520 380; Start-Sleep 4          # piazza della fontana
foreach ($i in 1..6) { Tap 1730 580; Start-Sleep -Milliseconds 1500 }   # gruppo di 3
Start-Sleep 2
Tap 1180 680; Start-Sleep 5          # ultimo Shadow del gruppo
Tap 1020 200; Start-Sleep 3
Tap 1020 200; Start-Sleep 4          # scalinata alta
Shot "${Shot}_prima" | Out-Null
Tap 970 220; Start-Sleep 5           # forziere arancione
Shot "${Shot}_forziere" | Out-Null
Status
