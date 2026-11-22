param([string]$BaseUrl = 'http://127.0.0.1:3100')
$ErrorActionPreference = 'Stop'
$api = "$($BaseUrl.TrimEnd('/'))/api/v1"
$browserHeaders = @{ Origin = ([uri]$BaseUrl).GetLeftPart([UriPartial]::Authority) }
if ((Invoke-RestMethod "$api/health" -Headers $browserHeaders).status -ne 'ok') { throw 'Backend health check failed' }
$credentials = @{
    email = "demo-$([guid]::NewGuid().ToString('N'))@example.com"
    password = "Demo!$([guid]::NewGuid().ToString('N'))"
}
function Send-Json($path, $body, $headers = $browserHeaders) {
    Invoke-RestMethod "$api/$path" -Method Post -ContentType 'application/json' -Body ($body | ConvertTo-Json) -Headers $headers
}
if (-not (Send-Json 'auth/register' ($credentials + @{ fullName = 'MindVault Demo' })).success) { throw 'Registration failed' }
$login = Send-Json 'auth/login' $credentials
if (-not $login.accessToken) { throw 'Login failed' }
$headers = $browserHeaders + @{ Authorization = "Bearer $($login.accessToken)" }
$note = Send-Json 'notes' @{ title = 'MindVault demo'; contentText = 'Saved through the frontend' } $headers
if (-not $note.data.id) { throw 'Creating a note returned no ID' }
$saved = Invoke-RestMethod "$api/notes/$($note.data.id)" -Headers $headers
if ($saved.data.title -ne 'MindVault demo') { throw 'Saved note could not be retrieved' }
Write-Host 'PASS: health, registration, login, note creation and retrieval through the frontend.'
