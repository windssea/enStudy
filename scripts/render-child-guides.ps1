$ErrorActionPreference = 'Stop'
$guideRoot = Split-Path -Parent $PSScriptRoot
$guideManifest = Join-Path $guideRoot 'public/content/child-guides.v1.json'
if (Test-Path -LiteralPath $guideManifest) { throw 'Immutable navigation audio already exists. Publish a new version.' }
Add-Type -AssemblyName System.Speech
Get-Command ffmpeg -ErrorAction Stop | Out-Null
Get-Command ffprobe -ErrorAction Stop | Out-Null
$guideSource = Get-Content -LiteralPath (Join-Path $guideRoot 'content/child-guides.v1.json') -Raw | ConvertFrom-Json
$guideOutput = Join-Path $guideRoot 'public/audio/guides'
New-Item -ItemType Directory -Path $guideOutput -Force | Out-Null
$guideSynth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$guideSynth.SelectVoice($guideSource.voice)
$guideSynth.Rate = -1
$guideFormat = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo([System.Speech.AudioFormat.EncodingFormat]::Pcm,22050,16,1,44100,2,$null)
$guideRows = @()
try {
 foreach ($guide in $guideSource.items) {
  if ($guide.id -notmatch '^[a-z-]+$') { throw 'Invalid navigation clip identifier' }
  $guideTemporary = Join-Path $guideOutput ($guide.id + '.rendering.wav')
  $guideSynth.SetOutputToWaveFile($guideTemporary,$guideFormat)
  $guideSynth.Speak($guide.text)
  $guideSynth.SetOutputToNull()
  $guidePacked = Join-Path $guideOutput ($guide.id + '.rendering.mp3')
  & ffmpeg -nostdin -hide_banner -loglevel error -y -i $guideTemporary -codec:a libmp3lame -b:a 48k -ac 1 -ar 22050 -map_metadata -1 $guidePacked
  if ($LASTEXITCODE -ne 0) { throw 'Navigation encoding failed' }
  $guideHash = (Get-FileHash -LiteralPath $guidePacked -Algorithm SHA256).Hash.ToLowerInvariant()
  $guideName = $guideHash.Substring(0,24) + '.mp3'
  Move-Item -LiteralPath $guidePacked -Destination (Join-Path $guideOutput $guideName)
  Remove-Item -LiteralPath $guideTemporary
  $guideDuration = [double]::Parse((& ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 (Join-Path $guideOutput $guideName)).Trim(),[Globalization.CultureInfo]::InvariantCulture)
  if ($LASTEXITCODE -ne 0 -or $guideDuration -le 0 -or $guideDuration -ge 20) { throw 'Invalid navigation clip length' }
  $guideRows += @{id=$guide.id;text=$guide.text;url=('/audio/guides/'+$guideName);sha256=$guideHash;bytes=(Get-Item -LiteralPath (Join-Path $guideOutput $guideName)).Length;duration=$guideDuration}
 }
} finally { $guideSynth.Dispose() }
@{version=1;kind='synthetic-navigation-only';voice=$guideSource.voice;sampleRate=22050;channels=1;format='mp3';bitRate=48000;items=$guideRows} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $guideManifest -Encoding utf8NoBOM
Set-Content -LiteralPath (Join-Path $guideOutput 'NOTICE.txt') -Value 'Original Chinese navigation instructions, synthesized locally with the installed Microsoft Huihui Desktop voice. No learner data, cloud AI or microphone. These are interface instructions, not language assessment audio.' -Encoding utf8NoBOM
Write-Output ('Rendered '+$guideRows.Count+' original Chinese navigation clips locally.')
