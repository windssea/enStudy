$ErrorActionPreference = 'Stop'
$learningRoot = Split-Path -Parent $PSScriptRoot
$learningTarget = Join-Path $learningRoot 'public/content/child-guides.v3.json'
if (Test-Path -LiteralPath $learningTarget) { throw 'Immutable guide v3 already exists.' }
Add-Type -AssemblyName System.Speech
Get-Command ffmpeg -ErrorAction Stop | Out-Null
Get-Command ffprobe -ErrorAction Stop | Out-Null
$learningSource = Get-Content -LiteralPath (Join-Path $learningRoot 'content/child-guides.v3.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$learningGuide = $learningSource.items | Where-Object { $_.id -eq 'home' }
$learningArtifacts = Join-Path $learningRoot 'artifacts'
[IO.Directory]::CreateDirectory($learningArtifacts) | Out-Null
$learningWave = Join-Path $learningArtifacts 'home-v3.rendering.wav'
$learningPacked = Join-Path $learningArtifacts 'home-v3.rendering.mp3'
$learningSynth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $learningSynth.SelectVoice('Microsoft Huihui Desktop')
  $learningSynth.Rate = -1
  $learningSynth.SetOutputToWaveFile($learningWave)
  $learningSynth.Speak($learningGuide.text)
  $learningSynth.SetOutputToNull()
} finally { $learningSynth.Dispose() }
& ffmpeg -nostdin -hide_banner -loglevel error -y -i $learningWave -codec:a libmp3lame -b:a 48k -ac 1 -ar 22050 -map_metadata -1 $learningPacked
if ($LASTEXITCODE -ne 0) { throw 'Learning guide encoding failed.' }
$learningHash = (Get-FileHash -LiteralPath $learningPacked -Algorithm SHA256).Hash.ToLowerInvariant()
$learningName = $learningHash.Substring(0,24) + '.mp3'
$learningDestination = Join-Path $learningRoot ('public/audio/guides/' + $learningName)
if (Test-Path -LiteralPath $learningDestination) { throw 'Unexpected existing audio destination.' }
Copy-Item -LiteralPath $learningPacked -Destination $learningDestination
$learningDuration = [double]::Parse((& ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $learningDestination).Trim(),[Globalization.CultureInfo]::InvariantCulture)
if ($LASTEXITCODE -ne 0 -or $learningDuration -le 0 -or $learningDuration -ge 20) { throw 'Invalid learning guide duration.' }
$learningManifest = Get-Content -LiteralPath (Join-Path $learningRoot 'public/content/child-guides.v2.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$learningManifest.version = 3
$learningManifest.items = @($learningManifest.items | ForEach-Object {
  if ($_.id -eq 'home') { @{id='home';text=$learningGuide.text;url=('/audio/guides/'+$learningName);sha256=$learningHash;bytes=(Get-Item -LiteralPath $learningDestination).Length;duration=$learningDuration} } else { $_ }
})
[IO.File]::WriteAllText($learningTarget,($learningManifest | ConvertTo-Json -Depth 7),(New-Object Text.UTF8Encoding($false)))
Write-Output ('Rendered one new Chinese learning instruction; preserved 22 previous clips. Duration: ' + $learningDuration)
