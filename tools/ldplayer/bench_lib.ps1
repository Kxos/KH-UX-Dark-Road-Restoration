# Funzioni comuni del banco (da includere con: . "$PSScriptRoot\bench_lib.ps1").
#
# Niente attese fisse: prima di ogni tocco si aspetta che il pulsante sia sullo
# schermo. Lo schermo si legge dentro il guest: screencap in formato grezzo (16
# byte di intestazione: larghezza, altezza, formato, spazio colore; poi RGBA) e
# dd dei soli pixel che servono, ~0,2 s a lettura contro ~0,8 s di un PNG.
$LD = 'D:\Progetto_Restauro_KH_UX\LDPlayer\LDPlayer9'
$PKG = 'com.square_enix.android_googleplay.khuxww'
$SCREEN_W = 1920
# /sdcard/Pictures del guest e' la cartella condivisa di LDPlayer sotto Documenti:
# gli screenshot passano di li' e vengono subito spostati su D: ($SHOTS).
$SHARED = "$env:USERPROFILE\Documents\XuanZhi9\Pictures"
$SHOTS = 'D:\Progetto_Restauro_KH_UX\screenshots'
New-Item -ItemType Directory -Force $SHOTS | Out-Null

function Sh([string]$cmd) { & "$LD\ld.exe" -s 0 $cmd }

function Tap([int]$x, [int]$y) { Sh "input tap $x $y" | Out-Null }

# Swipe da (x1,y1) a (x2,y2) in $ms millisecondi: lo swipe in diagonale su una
# medaglia ne usa l'attacco speciale, se la barra SPECIAL basta per il suo costo.
function Swipe([int]$x1, [int]$y1, [int]$x2, [int]$y2, [int]$ms = 250) {
    Sh "input swipe $x1 $y1 $x2 $y2 $ms" | Out-Null
}

# Colori dei punti dati, come array di @(r, g, b), con una sola cattura.
function Px([int[][]]$pts) {
    $dd = ($pts | ForEach-Object {
        $o = 16 + ($_[1] * $SCREEN_W + $_[0]) * 4
        "dd if=/data/local/tmp/s.raw bs=1 skip=$o count=3 2>/dev/null | od -An -tu1"
    }) -join '; '
    $out = Sh "screencap /data/local/tmp/s.raw; $dd"
    @($out | Where-Object { $_.Trim() } | ForEach-Object { , [int[]]($_.Trim() -split '\s+') })
}

function IsRed($c) { $c[0] -gt 150 -and $c[1] -lt 80 -and $c[2] -lt 110 }
function IsNear($c, [int[]]$ref, [int]$tol = 24) {
    [Math]::Abs($c[0] - $ref[0]) -le $tol -and [Math]::Abs($c[1] - $ref[1]) -le $tol -and [Math]::Abs($c[2] - $ref[2]) -le $tol
}

# Attende che $cond (riceve i colori dei punti) sia vero; $false allo scadere,
# con uno screenshot "<what>_timeout.png" per capire dove si e' fermato.
function WaitFor([int[][]]$pts, [scriptblock]$cond, [double]$timeout = 60, [string]$what = 'attesa') {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $timeout) {
        $c = Px $pts
        if (& $cond $c) { Write-Host ("  {0,-28} {1,5:N1} s" -f $what, $sw.Elapsed.TotalSeconds); return $true }
        Start-Sleep -Milliseconds 250
    }
    Shot "${what}_timeout" | Out-Null
    Write-Host "  $what : SCADUTO dopo $timeout s (screenshot $SHOTS\${what}_timeout.png)"
    $false
}

function IsOrange($c) { $c[0] -gt 200 -and $c[1] -gt 60 -and $c[1] -lt 150 -and $c[2] -lt 40 }
function IsBright($c) { $c[0] -gt 150 -and $c[1] -gt 150 -and $c[2] -gt 150 }
function IsDark($c) { $c[0] + $c[1] + $c[2] -lt 90 }

# Un passo: tocca (x, y) e attende che $cond riconosca la schermata successiva;
# se dopo $retap secondi non e' cambiata, ritocca (es. il titolo che non accetta
# ancora tocchi). $false allo scadere di $timeout, con screenshot.
function Step([int]$x, [int]$y, [string]$what, [int[][]]$pts, [scriptblock]$cond,
              [double]$timeout = 60, [double]$retap = 4) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $timeout) {
        Tap $x $y
        $t = [Diagnostics.Stopwatch]::StartNew()
        while ($t.Elapsed.TotalSeconds -lt $retap) {
            if (& $cond (Px $pts)) {
                Write-Host ("  {0,-28} {1,5:N1} s" -f $what, $sw.Elapsed.TotalSeconds); return $true
            }
            Start-Sleep -Milliseconds 200
        }
    }
    Shot "${what}_timeout" | Out-Null
    Write-Host "  $what : SCADUTO dopo $timeout s (screenshot $SHOTS\${what}_timeout.png)"
    $false
}

# Attende un pulsante rosso nel punto (x, y) e lo tocca.
function TapRed([int]$x, [int]$y, [string]$what, [double]$timeout = 60) {
    if (WaitFor @(, @($x, $y)) { param($c) IsRed $c[0] } $timeout $what) { Tap $x $y; return $true }
    $false
}

# Attende una riga del log del server che corrisponda a $pattern, scritta dopo $from righe.
function LogLines([string]$file) { @(Get-Content $file -ErrorAction SilentlyContinue).Count }
function WaitLog([string]$file, [string]$pattern, [int]$from, [double]$timeout = 60, [string]$what = $pattern) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $timeout) {
        $new = @(Get-Content $file -ErrorAction SilentlyContinue | Select-Object -Skip $from)
        if ($new | Where-Object { $_ -match $pattern }) {
            Write-Host ("  {0,-28} {1,5:N1} s" -f $what, $sw.Elapsed.TotalSeconds); return $true
        }
        Start-Sleep -Milliseconds 300
    }
    Write-Host "  $what : SCADUTO dopo $timeout s"
    $false
}

# Screenshot in $SHOTS\<name>.png (passa dalla cartella condivisa e viene spostato).
function Shot([string]$name) {
    Sh "screencap -p /sdcard/Pictures/$name.png" | Out-Null
    $src = Join-Path $SHARED "$name.png"
    $dst = Join-Path $SHOTS "$name.png"
    for ($i = 0; $i -lt 20 -and -not (Test-Path -LiteralPath $src); $i++) { Start-Sleep -Milliseconds 100 }
    Move-Item -LiteralPath $src -Destination $dst -Force
    $dst
}

# Ultime richieste al server (senza DNS e master), una per riga.
function LastRequests([string]$file, [int]$n = 8) {
    Get-Content $file | Where-Object { $_ -notmatch '\[dns\]|dns:dirottata|tls:sni|content-type|GET /master/' } |
        Select-String -Pattern '^\S*\[(ok|\?|!)\S*\s+#\d+|body\(decifrato' | Select-Object -Last $n |
        ForEach-Object { $_.Line.Substring(0, [Math]::Min(300, $_.Line.Length)) }
}

function Status {
    "pid: " + (Sh "pidof $PKG")
    $t = Sh "ls /data/tombstones/ 2>/dev/null"
    if ($t) { "tombstone: $t" }
}
