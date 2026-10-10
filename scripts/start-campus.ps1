param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$campusRoot = Split-Path -Parent $PSScriptRoot
$campusUrl = 'http://127.0.0.1:4173/'
$runtimeDirectory = Join-Path $campusRoot 'artifacts\runtime'
New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
$launcherLog = Join-Path $runtimeDirectory 'launcher.log'

function Test-CampusReady {
    try {
        $response = Invoke-WebRequest -Uri $campusUrl -UseBasicParsing -TimeoutSec 2
        return ($response.StatusCode -eq 200 -and $response.Content -match 'GEOGRAPHIC CAMPUS|/assets/index-')
    } catch { return $false }
}

$launcherMutex = New-Object System.Threading.Mutex($false, 'Local\AKS3DCampusLauncher')
$ownsMutex = $false
try {
    $ownsMutex = $launcherMutex.WaitOne(30000)
    if (-not $ownsMutex) { throw 'Another campus launch is still in progress. Please try again.' }
    if (-not (Test-CampusReady)) {
        $nodeCommand = Get-Command node -ErrorAction Stop
        $viteEntry = Join-Path $campusRoot 'node_modules\vite\bin\vite.js'
        $builtPage = Join-Path $campusRoot 'dist\index.html'
        if (-not (Test-Path -LiteralPath $viteEntry) -or -not (Test-Path -LiteralPath $builtPage)) {
            throw 'Campus dependencies or build are missing. Run npm install and npm run build in the project folder.'
        }
        $serverArguments = @('"' + $viteEntry + '"', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort')
        $server = Start-Process -FilePath $nodeCommand.Source -ArgumentList $serverArguments -WorkingDirectory $campusRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDirectory 'server.log') -RedirectStandardError (Join-Path $runtimeDirectory 'server-error.log') -PassThru
        $server.Id | Set-Content -LiteralPath (Join-Path $runtimeDirectory 'server.pid') -Encoding ASCII
        $readyDeadline = [DateTime]::UtcNow.AddSeconds(30)
        do {
            if (Test-CampusReady) { break }
            $server.Refresh()
            if ($server.HasExited) { throw 'Campus server stopped. See artifacts\runtime\server-error.log.' }
            Start-Sleep -Milliseconds 250
        } while ([DateTime]::UtcNow -lt $readyDeadline)
        if (-not (Test-CampusReady)) { throw 'Campus server did not become ready within 30 seconds.' }
    }
    Add-Content -LiteralPath $launcherLog -Value ((Get-Date -Format o) + ' ready ' + $campusUrl)
    if (-not $NoBrowser) { Start-Process -FilePath $campusUrl }
} catch {
    Add-Content -LiteralPath $launcherLog -Value ((Get-Date -Format o) + ' ERROR ' + $_.Exception.Message)
    if (-not $NoBrowser) {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'AKS 3D campus launch failed', 'OK', 'Error') | Out-Null
    }
    throw
} finally {
    if ($ownsMutex) { $launcherMutex.ReleaseMutex() }
    $launcherMutex.Dispose()
}
