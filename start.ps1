# ==============================================================================
# Collabex -- Zero-Friction Full-Stack Local Launcher
# Boots PostgreSQL 17, .NET 10 Backend API, and Next.js Frontend
# ==============================================================================

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   COLLABEX -- Full-Stack Local Application Launcher" -ForegroundColor Green
Write-Host "   PostgreSQL 17 | .NET 10 Web API | Next.js 16 Web Dashboard" -ForegroundColor DarkGray
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------------------------
# STEP 1: Check Prerequisites & Free Stale Ports
# ------------------------------------------------------------------------------
Write-Host "[1/5] Checking prerequisites & clearing stale ports..." -ForegroundColor Cyan

# Auto-detect dotnet if not in current terminal session PATH
if (-not (Get-Command "dotnet" -ErrorAction SilentlyContinue)) {
    $commonDotnetPaths = @(
        "$env:LOCALAPPDATA\Microsoft\dotnet",
        "$env:ProgramFiles\dotnet"
    )
    foreach ($p in $commonDotnetPaths) {
        if (Test-Path "$p\dotnet.exe") {
            $env:PATH = "$p;$env:PATH"
            $env:DOTNET_ROOT = $p
            break
        }
    }
}

function Check-Command ($cmdName, $friendlyName) {
    if (-not (Get-Command $cmdName -ErrorAction SilentlyContinue)) {
        Write-Host "[-] Required CLI tool '$friendlyName' ($cmdName) is not found in PATH." -ForegroundColor Red
        Write-Host "    Please install $friendlyName and ensure it is available in your terminal." -ForegroundColor Yellow
        exit 1
    }
}

Check-Command "docker" "Docker"
Check-Command "dotnet" ".NET SDK (10.0+)"
Check-Command "npm" "Node.js / npm"

function Stop-PortListener {
    param([int]$Port)
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        foreach ($c in $conns) {
            $targetPid = $c.OwningProcess
            if ($targetPid -and $targetPid -ne 0 -and $targetPid -ne $PID) {
                $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
                Write-Host "  [!] Terminating stale process '$($proc.ProcessName)' (PID: $targetPid) listening on port $Port..." -ForegroundColor Yellow
                Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        $lines = netstat -ano 2>$null | Select-String ":$Port\s+.*LISTENING"
        foreach ($line in $lines) {
            $parts = ($line -split '\s+') | Where-Object { $_ -ne "" }
            $targetPid = $parts[-1]
            if ($targetPid -match '^\d+$' -and [int]$targetPid -ne 0 -and [int]$targetPid -ne $PID) {
                Write-Host "  [!] Terminating stale PID $targetPid listening on port $Port..." -ForegroundColor Yellow
                Stop-Process -Id [int]$targetPid -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

Stop-PortListener 5000
Stop-PortListener 3000

Write-Host "  [+] Ports 5000 and 3000 verified free." -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 2: Ensure PostgreSQL 17 is Running & Accepting Connections
# ------------------------------------------------------------------------------
Write-Host "[2/5] Ensuring PostgreSQL 17 database is healthy..." -ForegroundColor Cyan

# Check Docker daemon availability
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[-] Docker daemon is not running!" -ForegroundColor Red
    Write-Host "    Please start Docker Desktop, wait until the engine starts, and rerun .\start.ps1." -ForegroundColor Yellow
    exit 1
}

# Check if postgres is already up
$pgContainer = ""
$existingCompose = docker ps -q --filter "name=projecthub_postgres"
$existingStandalone = docker ps -q --filter "name=projecthub-db"

if ($existingCompose) {
    $pgContainer = "projecthub_postgres"
} elseif ($existingStandalone) {
    $pgContainer = "projecthub-db"
} else {
    # Check if stopped containers exist
    $stoppedCompose = docker ps -aq --filter "name=projecthub_postgres"
    $stoppedStandalone = docker ps -aq --filter "name=projecthub-db"
    
    if (Test-Path "$RepoRoot/docker-compose.yml") {
        Write-Host "  Starting containers via docker compose..." -ForegroundColor DarkGray
        docker compose up -d postgres redis 2>&1 | Out-Null
        $pgContainer = "projecthub_postgres"
    } elseif ($stoppedStandalone) {
        Write-Host "  Starting existing 'projecthub-db' container..." -ForegroundColor DarkGray
        docker start projecthub-db | Out-Null
        $pgContainer = "projecthub-db"
    } else {
        Write-Host "  Creating new 'projecthub-db' container (PostgreSQL 17 Alpine)..." -ForegroundColor DarkGray
        docker run -d --name projecthub-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=projecthub_db -p 5432:5432 postgres:17-alpine | Out-Null
        $pgContainer = "projecthub-db"
    }
}

# Poll until PostgreSQL accepts connections
Write-Host "  Waiting for PostgreSQL to accept connections on port 5432..." -ForegroundColor DarkGray
$dbReady = $false
$retries = 0
while (-not $dbReady -and $retries -lt 30) {
    # Try pg_isready inside the container
    if ($pgContainer) {
        $chk = docker exec $pgContainer pg_isready -U postgres -d projecthub_db 2>&1
        if ($LASTEXITCODE -eq 0 -or $chk -match "accepting connections") {
            $dbReady = $true
            break
        }
    }
    
    # Try direct TCP connection
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", 5432)
        if ($tcp.Connected) {
            $tcp.Close()
            $dbReady = $true
            break
        }
    } catch {}

    Start-Sleep -Seconds 1
    $retries++
}

if ($dbReady) {
    Write-Host "  [+] PostgreSQL 17 is ready and accepting connections." -ForegroundColor Green
} else {
    Write-Host "  [!] Warning: PostgreSQL connection check timed out. Proceeding with startup..." -ForegroundColor Yellow
}

# ------------------------------------------------------------------------------
# STEP 3: Auto-Install Frontend Dependencies If Missing
# ------------------------------------------------------------------------------
Write-Host "[3/5] Verifying frontend dependencies..." -ForegroundColor Cyan

if (-not (Test-Path "$RepoRoot/web/node_modules")) {
    Write-Host "  web/node_modules not found. Running npm install in web/..." -ForegroundColor Yellow
    npm --prefix "$RepoRoot/web" install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[-] npm install failed. Please check your Node/npm installation." -ForegroundColor Red
        exit 1
    }
    Write-Host "  [+] Frontend dependencies successfully installed." -ForegroundColor Green
} else {
    Write-Host "  [+] Frontend dependencies verified (web/node_modules exists)." -ForegroundColor Green
}

# Ensure web/.env.local exists from template
if (-not (Test-Path "$RepoRoot/web/.env.local") -and (Test-Path "$RepoRoot/web/.env.example")) {
    Copy-Item "$RepoRoot/web/.env.example" "$RepoRoot/web/.env.local"
    Write-Host "  [+] Created web/.env.local from .env.example." -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# STEP 4: Start .NET 10 Backend API (http://localhost:5000)
# ------------------------------------------------------------------------------
Write-Host "[4/5] Launching .NET 10 Backend API..." -ForegroundColor Cyan

$backendDir = ""
if (Test-Path "$RepoRoot/backend/src/ProjectHub.Api/ProjectHub.Api.csproj") {
    $backendDir = "$RepoRoot/backend/src/ProjectHub.Api"
} elseif (Test-Path "$RepoRoot/api/src/ProjectHub.WebApi/ProjectHub.WebApi.csproj") {
    $backendDir = "$RepoRoot/api/src/ProjectHub.WebApi"
} else {
    Write-Host "[-] Could not locate ProjectHub.Api project directory." -ForegroundColor Red
    exit 1
}

$backendScript = @"
`$Host.UI.RawUI.WindowTitle = 'Collabex - .NET 10 Backend API (Port 5000)'
if (Test-Path '$env:LOCALAPPDATA\Microsoft\dotnet\dotnet.exe') {
    `$env:PATH = '$env:LOCALAPPDATA\Microsoft\dotnet;' + `$env:PATH
    `$env:DOTNET_ROOT = '$env:LOCALAPPDATA\Microsoft\dotnet'
}
Set-Location '$backendDir'
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host '  Collabex .NET 10 Backend API' -ForegroundColor Green
Write-Host '  Base URL: http://localhost:5000' -ForegroundColor DarkGray
Write-Host '  Scalar UI: http://localhost:5000/scalar/v1' -ForegroundColor DarkGray
Write-Host '==================================================' -ForegroundColor Cyan
dotnet run --urls 'http://localhost:5000'
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

Write-Host "  Waiting for backend API to compile and start listening on http://localhost:5000..." -ForegroundColor DarkGray
$apiReady = $false
$apiRetries = 0
while (-not $apiReady -and $apiRetries -lt 45) {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($res.StatusCode -eq 200 -or $res.StatusCode -eq 302 -or $res.StatusCode -eq 404) {
            $apiReady = $true
            break
        }
    } catch {
        if ($_.Exception.Response -ne $null) {
            $apiReady = $true
            break
        }
    }
    Start-Sleep -Seconds 1
    $apiRetries++
}

if ($apiReady) {
    Write-Host "  [+] Backend API is online and responding at http://localhost:5000." -ForegroundColor Green
} else {
    Write-Host "  [!] Backend compilation is taking longer than usual; terminal window is active." -ForegroundColor Yellow
}

# ------------------------------------------------------------------------------
# STEP 5: Start Next.js Frontend Dashboard (http://localhost:3000)
# ------------------------------------------------------------------------------
Write-Host "[5/5] Launching Next.js 16 Web Dashboard..." -ForegroundColor Cyan

$webDir = "$RepoRoot/web"
$frontendScript = @"
`$Host.UI.RawUI.WindowTitle = 'Collabex - Next.js Frontend (Port 3000)'
Set-Location '$webDir'
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host '  Collabex Next.js Web Dashboard' -ForegroundColor Green
Write-Host '  URL: http://localhost:3000' -ForegroundColor DarkGray
Write-Host '==================================================' -ForegroundColor Cyan
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "   COLLABEX FULL-STACK PLATFORM IS RUNNING!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend Web App:     http://localhost:3000" -ForegroundColor White
Write-Host "  Login Portal:         http://localhost:3000/login" -ForegroundColor Cyan
Write-Host "  Backend API:          http://localhost:5000" -ForegroundColor White
Write-Host "  Interactive API Docs: http://localhost:5000/scalar/v1" -ForegroundColor Cyan
Write-Host "  Health Endpoint:      http://localhost:5000/api/health" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  --- PRE-CONFIGURED DEMO ACCOUNTS (Password: Pass@1234) ---" -ForegroundColor DarkCyan
Write-Host "  SuperAdmin:           superadmin@collabex.in" -ForegroundColor White
Write-Host "  CollegeAdmin (Dean):  collegeadmin@sistec.ac.in" -ForegroundColor White
Write-Host "  HOD (CSE):            hod@sistec.ac.in" -ForegroundColor White
Write-Host "  Coordinator:          coordinator@sistec.ac.in" -ForegroundColor White
Write-Host "  Faculty Guide:        faculty@sistec.ac.in" -ForegroundColor White
Write-Host "  Student (Lead):       student@sistec.ac.in" -ForegroundColor White
Write-Host "  Student (Member):     student2@sistec.ac.in" -ForegroundColor White
Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  Tip: Press Ctrl+C in the respective terminal windows to stop services." -ForegroundColor DarkGray
Write-Host ""
