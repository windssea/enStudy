param([switch]$UploadGitHub)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$taskRoot = Split-Path -Parent $PSScriptRoot
$backupPath = Join-Path $taskRoot '.cloudflare/ai-keystores.dpapi.local.json'
$repo = 'windssea/enStudy'
$secretName = 'CLOUDFLARE_AI_KEYSTORES'
$secretNames = (& gh secret list --repo $repo --json name | ConvertFrom-Json).name
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect repository secret names.' }
if ($UploadGitHub -and ($secretNames -contains $secretName)) { throw 'Repository key stores already exist; deployment reuses them. This initializer never replaces an existing GitHub secret.' }
if ((Test-Path -LiteralPath $backupPath)) {
  $saved = Get-Content -LiteralPath $backupPath -Raw | ConvertFrom-Json
  $rawBytes = [Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($saved.protected),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $bundleJson = [Text.Encoding]::UTF8.GetString($rawBytes)
} else {
  if ($secretNames -contains $secretName) { throw 'Repository key stores already exist without this local backup; refusing to replace them.' }
  $random = [Security.Cryptography.RandomNumberGenerator]::Create()
  function New-KeyMaterial { $data = New-Object byte[] 32; $random.GetBytes($data); return [Convert]::ToBase64String($data) }
  $bundle = [ordered]@{schema=1;accountId='4430e72dda309478d832370e6f8f9d81';projectName='english-quest-dev';preview=@{activeKeyId='preview-v1';keys=@{'preview-v1'=(New-KeyMaterial)}};production=@{activeKeyId='production-v1';keys=@{'production-v1'=(New-KeyMaterial)}}}
  $random.Dispose()
  $bundleJson = $bundle | ConvertTo-Json -Depth 6 -Compress
  $rawBytes = [Text.Encoding]::UTF8.GetBytes($bundleJson)
  $protected = [Security.Cryptography.ProtectedData]::Protect($rawBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  [IO.Directory]::CreateDirectory((Split-Path -Parent $backupPath)) | Out-Null
  $record = @{schema=1;createdAt=[DateTime]::UtcNow.ToString('o');protection='Windows DPAPI CurrentUser';protected=[Convert]::ToBase64String($protected)} | ConvertTo-Json -Compress
  $stream = New-Object IO.FileStream($backupPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try { $encoded = [Text.Encoding]::UTF8.GetBytes($record); $stream.Write($encoded,0,$encoded.Length) } finally { $stream.Dispose() }
}
if ($UploadGitHub) {
  $bundleJson | & gh secret set $secretName --repo $repo
  if ($LASTEXITCODE -ne 0) { throw 'GitHub secret upload failed; protected local backup retained.' }
  & gh variable set CLOUDFLARE_AI_KEYSTORES_REQUIRED --body true --repo $repo
  if ($LASTEXITCODE -ne 0) { throw 'Secret stored; required deployment variable was not updated.' }
  Write-Output 'Independent AI key stores stored in GitHub Secret; required deployment guard enabled.'
} else { Write-Output 'Protected local key-store backup prepared; no cloud secret changed.' }
[Array]::Clear($rawBytes,0,$rawBytes.Length)
$bundleJson = $null
