param(
    [string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin',
    [int]$DatabasePort = 5433,
    [int]$HttpPort = 8080
)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$databaseDirectory = Join-Path $projectDirectory '.local\postgres'
$dataDirectory = Join-Path $databaseDirectory 'data'
$passwordFile = Join-Path $databaseDirectory 'password'
$serverStarted = $false
$savedEnvironment = @{}
foreach ($name in @('DB_URL', 'DB_USERNAME', 'DB_PASSWORD', 'PGPASSWORD', 'MAVEN_USER_HOME')) {
    $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
foreach ($binary in @('initdb.exe', 'pg_ctl.exe', 'psql.exe', 'createdb.exe')) {
    if (-not (Test-Path -LiteralPath (Join-Path $PostgresBin $binary))) {
        throw "PostgreSQL binary not found: $binary. Set -PostgresBin."
    }
}

Push-Location $projectDirectory
try {
    New-Item -ItemType Directory -Path $databaseDirectory -Force | Out-Null
    if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory 'PG_VERSION'))) {
        if (Test-Path -LiteralPath $dataDirectory) {
            throw 'An incomplete local PostgreSQL directory exists. Inspect .local/postgres before retrying.'
        }
        $newPassword = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
        [IO.File]::WriteAllText($passwordFile, $newPassword, [Text.Encoding]::ASCII)
        & (Join-Path $PostgresBin 'initdb.exe') -D $dataDirectory -U needboard --auth=scram-sha-256 "--pwfile=$passwordFile" --encoding=UTF8 --locale=C
        if ($LASTEXITCODE -ne 0) { throw 'Local database initialization failed.' }
    }
    if (-not (Test-Path -LiteralPath $passwordFile)) {
        throw 'Missing local database password file: .local/postgres/password'
    }
    if (Test-Path -LiteralPath (Join-Path $dataDirectory 'postmaster.pid')) {
        throw 'Local database already has a PID file. Close its existing Start-Dev terminal or inspect its status first.'
    }
    $env:DB_PASSWORD = [IO.File]::ReadAllText($passwordFile).Trim()
    $env:PGPASSWORD = $env:DB_PASSWORD
    & (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataDirectory -l (Join-Path $databaseDirectory 'postgres.log') -o "-h 127.0.0.1 -p $DatabasePort" -w start
    if ($LASTEXITCODE -ne 0) { throw 'Cannot start local PostgreSQL. Check .local/postgres/postgres.log and the port.' }
    $serverStarted = $true
    $exists = & (Join-Path $PostgresBin 'psql.exe') -h 127.0.0.1 -p $DatabasePort -U needboard -d postgres -tAc "select 1 from pg_database where datname = 'needboard'"
    if ($LASTEXITCODE -ne 0) { throw 'Cannot connect to the local PostgreSQL cluster.' }
    if ($exists -ne '1') {
        & (Join-Path $PostgresBin 'createdb.exe') -h 127.0.0.1 -p $DatabasePort -U needboard needboard
        if ($LASTEXITCODE -ne 0) { throw 'Cannot create the application database.' }
    }
    $env:DB_URL = "jdbc:postgresql://127.0.0.1:$DatabasePort/needboard"
    $env:DB_USERNAME = 'needboard'
    $env:MAVEN_USER_HOME = Join-Path $projectDirectory '.cache\maven'
    & .\mvnw.cmd -B -ntp "-Dmaven.repo.local=$projectDirectory\.cache\repository" -DskipTests package
    if ($LASTEXITCODE -ne 0) { throw 'Application build failed.' }
    Write-Host "Backend: http://localhost:$HttpPort (Ctrl+C to stop). Data stays in .local/postgres."
    & java -jar target/needboard-0.0.1-SNAPSHOT.jar "--server.port=$HttpPort"
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 130) { throw "Application exited with code $LASTEXITCODE." }
}
finally {
    if ($serverStarted) {
        & (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataDirectory -m fast -w stop
    }
    foreach ($name in $savedEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
    }
    Pop-Location
}
