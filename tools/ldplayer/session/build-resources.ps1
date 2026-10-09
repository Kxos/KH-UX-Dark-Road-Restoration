# Costruisce resource_data\<N>: pezzi OBB 5.0.1 + addnl della versione 7 (hard link) +
# il pacchetto generato (stage_gen\files: mappe, LWF sostitutivi, layout di
# make_layouts.py) come ultimo pezzo, e l'indice unito. Poi si installa con
# update-resources.ps1 (il server annuncia solo l'ultima versione).
#   .\build-resources.ps1 -Version N
param([Parameter(Mandatory)][int]$Version)
$ErrorActionPreference = 'Stop'
$repo = Split-Path (Split-Path (Split-Path $PSScriptRoot))
Set-Location $repo
$D = 'D:\Progetto_Restauro_KH_UX'
$sg = "$D\stage_gen"
$key = python -I -c "import sys; d=open(sys.argv[1],'rb').read(); print(d[0xe6ee54:0xe6ee54+32].hex())" "$D\apk501\ext\lib\arm64-v8a\libcocos2dcpp.so"
python -I recon\tools\make_layouts.py "$D\layouts\orig" "$sg\files"
python -I recon\tools\resource_pack.py "$sg\files" $key "$sg\gen.mp4" "$sg\gen.png"
$v = "$D\resource_data\$Version"
if (Test-Path $v) { throw "$v esiste gia'" }
New-Item -ItemType Directory -Force "$v\data", "$v\index" | Out-Null
Get-ChildItem "$D\resource_data\7\data" | Where-Object Name -ne 'd0035' |
  ForEach-Object { New-Item -ItemType HardLink -Path "$v\data\$($_.Name)" -Target $_.FullName | Out-Null }
Copy-Item "$sg\gen.mp4" "$v\data\d0035"
$o = "$D\obb76"
python -I recon\tools\resource_merge.py recon\tools recon\ext\ww431\libcocos2dcpp.so $key "$v\index\misc.png" `
  "$D\apk501\ext\assets\aliud.png" "$o\main.76.com.square_enix.android_googleplay.khuxww.obb,$o\patch.87.com.square_enix.android_googleplay.khuxww.obb" `
  "$D\ipa431\addnl.png" "$D\ipa431\addnl.mp4" "$sg\gen.png" "$sg\gen.mp4"
