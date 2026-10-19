$ErrorActionPreference='Stop'
$pictureRoot=Split-Path -Parent $PSScriptRoot
$pictureTarget=Join-Path $pictureRoot 'public/content/child-guides.v2.json'
if(Test-Path -LiteralPath $pictureTarget){throw 'Immutable guide v2 exists'}
Add-Type -AssemblyName System.Speech
$pictureSynth=New-Object System.Speech.Synthesis.SpeechSynthesizer
$pictureSynth.SelectVoice('Microsoft Huihui Desktop'); $pictureSynth.Rate=-1
$pictureSource=Get-Content -LiteralPath (Join-Path $pictureRoot 'content/child-guides.v2.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$pictureGuide=$pictureSource.items | Where-Object {$_.id -eq 'picture'}
$pictureFolder=Join-Path $pictureRoot 'public/audio/guides'
$pictureWave=Join-Path $pictureFolder 'picture-v2.rendering.wav'
$picturePacked=Join-Path $pictureFolder 'picture-v2.rendering.mp3'
try {$pictureSynth.SetOutputToWaveFile($pictureWave);$pictureSynth.Speak($pictureGuide.text);$pictureSynth.SetOutputToNull()} finally {$pictureSynth.Dispose()}
& ffmpeg -nostdin -hide_banner -loglevel error -y -i $pictureWave -codec:a libmp3lame -b:a 48k -ac 1 -ar 22050 -map_metadata -1 $picturePacked
if($LASTEXITCODE -ne 0){throw 'Guide encoding failed'}
$pictureHash=(Get-FileHash -LiteralPath $picturePacked -Algorithm SHA256).Hash.ToLowerInvariant()
$pictureName=$pictureHash.Substring(0,24)+'.mp3'
Move-Item -LiteralPath $picturePacked -Destination (Join-Path $pictureFolder $pictureName)
Remove-Item -LiteralPath $pictureWave
$pictureDuration=[double]::Parse((& ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 (Join-Path $pictureFolder $pictureName)).Trim(),[Globalization.CultureInfo]::InvariantCulture)
if($LASTEXITCODE -ne 0 -or $pictureDuration -le 0 -or $pictureDuration -ge 20){throw 'Guide duration invalid'}
$picturePrior=Get-Content -LiteralPath (Join-Path $pictureRoot 'public/content/child-guides.v1.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$picturePrior.version=2
$picturePrior.items+=@{id='picture';text=$pictureGuide.text;url=('/audio/guides/'+$pictureName);sha256=$pictureHash;bytes=(Get-Item -LiteralPath (Join-Path $pictureFolder $pictureName)).Length;duration=$pictureDuration}
[IO.File]::WriteAllText($pictureTarget,($picturePrior | ConvertTo-Json -Depth 7),(New-Object Text.UTF8Encoding($false)))
