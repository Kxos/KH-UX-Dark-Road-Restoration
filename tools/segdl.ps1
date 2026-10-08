param([string]$Url, [string]$Out, [long]$Size, [int]$Parts = 8)
# Scarica $Url in $Parts segmenti paralleli (intervalli di byte), poi li concatena in $Out.
$dir = Join-Path (Split-Path $Out) ((Split-Path $Out -Leaf) + '.parts')
New-Item -ItemType Directory -Force $dir | Out-Null
$chunk = [math]::Ceiling($Size / $Parts)
$procs = @()
for ($i = 0; $i -lt $Parts; $i++) {
    $a = $i * $chunk
    $b = [math]::Min($Size - 1, $a + $chunk - 1)
    $part = Join-Path $dir ("part{0:D2}" -f $i)
    $have = 0
    if (Test-Path $part) { $have = (New-Object IO.FileInfo $part).Length }
    $want = $b - $a + 1
    if ($have -ge $want) { continue }
    # riprende il segmento dal punto in cui era arrivato
    $start = $a + $have
    $args = @('-sS', '-L', '--retry', '10', '--retry-delay', '5', '-r', "$start-$b", '-o', "$part.tmp", $Url)
    $p = Start-Process -FilePath curl.exe -ArgumentList $args -NoNewWindow -PassThru
    $procs += [pscustomobject]@{ P = $p; Part = $part; Tmp = "$part.tmp"; Have = $have }
}
$procs | ForEach-Object { $_.P.WaitForExit() }
foreach ($x in $procs) {
    if ($x.Have -gt 0) {
        $fs = [IO.File]::Open($x.Part, 'Append'); $src = [IO.File]::OpenRead($x.Tmp); $src.CopyTo($fs); $src.Close(); $fs.Close()
        Remove-Item $x.Tmp
    } else { Move-Item -Force $x.Tmp $x.Part }
}
$ok = $true
for ($i = 0; $i -lt $Parts; $i++) {
    $a = $i * $chunk; $b = [math]::Min($Size - 1, $a + $chunk - 1)
    $len = (New-Object IO.FileInfo (Join-Path $dir ("part{0:D2}" -f $i))).Length
    if ($len -ne ($b - $a + 1)) { "segmento $i incompleto: $len su $($b - $a + 1)"; $ok = $false }
}
if (-not $ok) { exit 1 }
$fs = [IO.File]::Create($Out)
for ($i = 0; $i -lt $Parts; $i++) { $src = [IO.File]::OpenRead((Join-Path $dir ("part{0:D2}" -f $i))); $src.CopyTo($fs); $src.Close() }
$fs.Close()
"completato: $Out $((New-Object IO.FileInfo $Out).Length) byte"
"md5: " + (Get-FileHash $Out -Algorithm MD5).Hash.ToLower()
