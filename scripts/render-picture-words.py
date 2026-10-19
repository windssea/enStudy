"""Offline asset production with the existing pinned Piper environment/model.
Published v1 assets are immutable. The website ships recordings, not the model.
"""
import hashlib
import io
import json
import math
from pathlib import Path
import struct
import subprocess
import wave
from piper import PiperVoice, SynthesisConfig

root = Path(__file__).resolve().parent.parent
target = root / "public/content/picture-words.v1.json"
if target.exists():
    raise RuntimeError("Immutable v1 exists. Create another media version.")
source = json.loads((root / "content/picture-word-media.source.v1.json").read_text(encoding="utf-8"))
provenance = json.loads((root / "artifacts/piper-models/provenance.json").read_text(encoding="utf-8"))
for entry in provenance["files"]:
    data = (root / "artifacts/piper-models" / entry["name"]).read_bytes()
    if len(data) != entry["bytes"] or hashlib.sha256(data).hexdigest() != entry["sha256"]:
        raise RuntimeError("Pinned voice model differs")
voice = PiperVoice.load(str(root / "artifacts/piper-models/en_GB-cori-high.onnx"))
config = SynthesisConfig(length_scale=1.0, noise_scale=0.0, noise_w_scale=0.0)
output = root / "public/audio/words"
output.mkdir(parents=True, exist_ok=True)
prior = {row["word"]: row for row in json.loads((root / "public/content/phonics-audio.v1.json").read_text(encoding="utf-8"))["items"]}
rows = []
for word in source["words"]:
    text = word["word"]
    if not text.isascii() or not text.isalpha() or not text.islower():
        raise RuntimeError("Invalid source word")
    if text in prior:
        row = prior[text]
        data = (root / "public" / row["url"].lstrip("/")).read_bytes()
        if hashlib.sha256(data).hexdigest() != row["sha256"]:
            raise RuntimeError("Prior recording differs")
    else:
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            voice.synthesize_wav(text + ".", wav, syn_config=config)
        data = buffer.getvalue()
    with wave.open(io.BytesIO(data), "rb") as wav:
        rate, frames = wav.getframerate(), wav.getnframes()
        if wav.getnchannels() != 1 or wav.getsampwidth() != 2:
            raise RuntimeError("Unexpected source format")
        pcm = wav.readframes(frames)
    samples = struct.unpack("<" + "h" * (len(pcm)//2), pcm)
    rms = math.sqrt(sum(s*s for s in samples)/len(samples))/32768
    if not 0.1 < frames/rate < 6 or rms < .005 or max(abs(s) for s in samples) >= 32768:
        raise RuntimeError("Invalid/silent/clipped recording")
    packed = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-f", "wav", "-i", "pipe:0", "-codec:a", "libmp3lame", "-b:a", "48k", "-ac", "1", "-ar", "22050", "-map_metadata", "-1", "-f", "mp3", "pipe:1"], input=data, stdout=subprocess.PIPE, check=True).stdout
    digest = hashlib.sha256(packed).hexdigest()
    name = digest[:24] + ".mp3"
    (output / name).write_bytes(packed)
    rows.append({**word, "audioUrl": "/audio/words/"+name, "audioSha256": digest, "audioBytes": len(packed), "duration": round(frames/rate,6), "rms": round(rms,6)})
manifest = {"version": 1, "kind": "synthetic-whole-word", "voice": "en_GB-cori-high", "model": provenance, "sampleRate": 22050, "channels": 1, "format": "mp3", "atlases": source["atlases"], "words": rows}
target.write_text(json.dumps(manifest,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
for name in ["NOTICE.txt","MODEL_CARD.txt"]:
    (output / name).write_bytes((root / "public/audio/phonics" / name).read_bytes())
print(f"Rendered {len(rows)} picture words: {sum(r['audioBytes'] for r in rows)} bytes. Acoustic and teacher review pending.")
