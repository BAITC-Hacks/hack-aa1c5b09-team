param(
    [string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin',
    [int]$Port = 55432
)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$testDirectory = Join-Path ([IO.Path]::GetTempPath()) ('needboard-test-' + [Guid]::NewGuid().ToString('N'))
$dataDirectory = Join-Path $testDirectory 'data'
$serverLog = Join-Path $testDirectory 'postgres.log'
$serverStarted = $false
$previousMavenHome = $env:MAVEN_USER_HOME
$previousTestUrl = $env:TEST_DB_URL
$previousTestUser = $env:TEST_DB_USERNAME
$previousTestPassword = $env:TEST_DB_PASSWORD

foreach ($binary in @('initdb.exe', 'pg_ctl.exe', 'createdb.exe')) {
    if (-not (Test-Path -LiteralPath (Join-Path $PostgresBin $binary))) {
        throw "PostgreSQL binary not found: $binary. Set -PostgresBin."
    }
}

New-Item -ItemType Directory -Path $testDirectory | Out-Null
Push-Location $projectDirectory
try {
    # A new disposable cluster, bound only to loopback. Existing PostgreSQL services are untouched.
    & (Join-Path $PostgresBin 'initdb.exe') -D $dataDirectory -U needboard --auth=trust --encoding=UTF8 --locale=C > (Join-Path $testDirectory 'initdb.log') 2>&1
    if ($LASTEXITCODE -ne 0) { throw "initdb failed. See $testDirectory" }
    & (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataDirectory -l $serverLog -o "-h 127.0.0.1 -p $Port" -w start
    if ($LASTEXITCODE -ne 0) { throw "Test database could not start. See $serverLog" }
    $serverStarted = $true
    & (Join-Path $PostgresBin 'createdb.exe') -h 127.0.0.1 -p $Port -U needboard needboard_test
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the test database.' }

    $env:MAVEN_USER_HOME = Join-Path $projectDirectory '.cache\maven'
    $env:TEST_DB_URL = "jdbc:postgresql://127.0.0.1:$Port/needboard_test"
    $env:TEST_DB_USERNAME = 'needboard'
    $env:TEST_DB_PASSWORD = ''
    & .\mvnw.cmd -B -ntp "-Dmaven.repo.local=$projectDirectory\.cache\repository" clean verify
    if ($LASTEXITCODE -ne 0) { throw 'Backend verification failed. See target/surefire-reports.' }
}
finally {
    if ($serverStarted) {
        & (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataDirectory -m fast -w stop
    }
    $env:MAVEN_USER_HOME = $previousMavenHome
    $env:TEST_DB_URL = $previousTestUrl
    $env:TEST_DB_USERNAME = $previousTestUser
    $env:TEST_DB_PASSWORD = $previousTestPassword
    Pop-Location
    Write-Host "Test database stopped. Diagnostic files: $testDirectory"
}
