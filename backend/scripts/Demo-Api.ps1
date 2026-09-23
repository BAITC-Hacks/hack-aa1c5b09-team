param([string]$BaseUrl = 'http://localhost:8080')

$ErrorActionPreference = 'Stop'
$runId = [Guid]::NewGuid().ToString('N').Substring(0, 10)
$demoPassword = [Guid]::NewGuid().ToString('N') + 'Aa1!'

function Get-Csrf($client) {
    $csrf = Invoke-RestMethod -Uri "$BaseUrl/api/auth/csrf" -WebSession $client.Session
    $client.Headers = @{ $csrf.headerName = $csrf.token }
}

function Send-Json($client, [string]$path, $body) {
    $parameters = @{
        Uri = "$BaseUrl$path"
        Method = 'Post'
        WebSession = $client.Session
        Headers = $client.Headers
        ContentType = 'application/json; charset=utf-8'
    }
    if ($null -ne $body) {
        $parameters.Body = [Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 10))
    }
    Invoke-RestMethod @parameters
}

function New-DemoClient([string]$name) {
    $client = @{
        Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        Headers = @{}
    }
    Get-Csrf $client
    $email = "$name-$runId@example.test"
    $account = Send-Json $client '/api/auth/register' @{
        email = $email
        password = $demoPassword
        displayName = $name
    }
    $null = Send-Json $client '/api/auth/login' @{ email = $email; password = $demoPassword }
    Get-Csrf $client
    $client.Account = $account
    return $client
}

$owner = New-DemoClient 'consumer'
$first = New-DemoClient 'provider-one'
$second = New-DemoClient 'provider-two'
$need = Send-Json $owner '/api/needs' @{
    originalDescription = 'Customers need to book appointments online.'
    card = @{
        title = 'Online appointment booking'
        problem = 'Bookings are lost in messenger conversations.'
        expectedResult = 'Customers select a free time without calling.'
        acceptanceCriteria = @('Choose an available time', 'Receive a booking confirmation')
        budgetAmount = 150000
        currency = 'KZT'
    }
}
$need = Send-Json $owner "/api/needs/$($need.id)/publish" $null
$proposalOne = Send-Json $first "/api/needs/$($need.id)/proposals" @{
    solutionDescription = 'Configure an existing booking service.'
    implementationPlan = 'Configure schedule, form and notifications.'
    expectedResult = 'A working appointment booking page.'
    priceAmount = 80000
    currency = 'KZT'
    durationDays = 5
}
$proposalTwo = Send-Json $second "/api/needs/$($need.id)/proposals" @{
    solutionDescription = 'Build a dedicated booking website.'
    implementationPlan = 'Design, implement and deploy a website.'
    expectedResult = 'A website with a booking form and administrator access.'
    priceAmount = 140000
    currency = 'KZT'
    durationDays = 12
}
$received = Invoke-RestMethod -Uri "$BaseUrl/api/needs/$($need.id)/proposals" -WebSession $owner.Session
if ($received.totalElements -ne 2) { throw 'Expected two proposals.' }
$accepted = Send-Json $owner "/api/proposals/$($proposalOne.id)/accept" $null
$updated = Invoke-RestMethod -Uri "$BaseUrl/api/needs/$($need.id)" -WebSession $owner.Session
$loser = Invoke-RestMethod -Uri "$BaseUrl/api/me/proposals" -WebSession $second.Session
if ($updated.status -ne 'SOLUTION_SELECTED' -or $updated.selectedProposalId -ne $accepted.id) {
    throw 'Selection was not persisted.'
}
if ($loser.items[0].status -ne 'REJECTED') { throw 'The remaining proposal must be rejected.' }
[PSCustomObject]@{
    NeedId = $need.id
    Status = $updated.status
    AcceptedProposalId = $accepted.id
    RejectedProposalId = $proposalTwo.id
    ConsumerEmail = $owner.Account.email
    Result = 'PASS: registration -> login -> draft -> publication -> two proposals -> one selected solution'
}
