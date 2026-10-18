"""Offline asset production only; Piper/model are not shipped to the website.
Create artifacts/phonics-audio-input.json from content/phonics-v1.mjs first.
Install the pinned Piper tool in an ignored environment, then run with its Python.
Never re-render an already published v1 manifest in place.
"""
import hashlib
import io
import json
import math
from pathlib import Path
import struct
import sys
import wave


def main():
    from piper import PiperVoice, SynthesisConfig
    sys.stdout.reconfigure(encoding="utf-8")
    root = Path(__file__).resolve().parent.parent
    target = root / "public/content/phonics-audio.v1.json"
    if target.exists():
        raise RuntimeError("Immutable v1 audio exists. Use a new version for new synthesis.")
    inventory = json.loads((root / "artifacts/phonics-audio-input.json").read_text(encoding="utf-8"))
    provenance = json.loads((root / "artifacts/piper-models/provenance.json").read_text(encoding="utf-8"))
    model = root / "artifacts/piper-models/en_GB-cori-high.onnx"
    for entry in provenance["files"]:
        data = (model.parent / entry["name"]).read_bytes()
        if len(data) != entry["bytes"] or hashlib.sha256(data).hexdigest() != entry["sha256"]:
            raise RuntimeError("Model/config/card differs from pinned provenance: " + entry["name"])
    if len(inventory) != 145 or len({r["word"] for r in inventory}) != 145:
        raise RuntimeError("Expected 145 distinct authored words.")
    output = root / "public/audio/phonics"
    output.mkdir(parents=True, exist_ok=True)
    voice = PiperVoice.load(str(model))
    config = SynthesisConfig(length_scale=1.0, noise_scale=0.0, noise_w_scale=0.0)
    items = []
    for index, row in enumerate(inventory):
        word = row["word"]
        if not word.isascii() or not word.isalpha() or not word.islower():
            raise RuntimeError("Invalid source word")
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            voice.synthesize_wav(word + ".", wav, syn_config=config)
        data = buffer.getvalue()
        with wave.open(io.BytesIO(data), "rb") as wav:
            frames, rate = wav.getnframes(), wav.getframerate()
            channels, width = wav.getnchannels(), wav.getsampwidth()
            pcm = wav.readframes(frames)
        samples = struct.unpack("<" + "h" * (len(pcm) // 2), pcm)
        duration = frames / rate
        rms = math.sqrt(sum(s*s for s in samples) / len(samples)) / 32768
        peak = max(abs(s) for s in samples) / 32768
        if channels != 1 or width != 2 or not 0.1 < duration < 6 or rms < 0.005 or peak >= 1:
            raise RuntimeError(f"Invalid/silent/clipped output: {word} {duration} {rms} {peak}")
        digest = hashlib.sha256(data).hexdigest()
        name = digest[:24] + ".wav"
        (output / name).write_bytes(data)
        phonemes = voice.phonemize(word + ".")
        items.append({"word": word, "url": "/audio/phonics/" + name, "sha256": digest,
                      "bytes": len(data), "duration": round(duration, 6), "sampleRate": rate,
                      "channels": channels, "rms": round(rms, 6), "peak": round(peak, 6),
                      "phonemizerOutput": phonemes})
        if index < 3 or (index + 1) % 20 == 0:
            print(f"Rendered {index+1}/145: {word}", flush=True)
    manifest = {"version": 1, "kind": "synthetic-whole-word", "voice": "en_GB-cori-high",
                "tool": "piper-tts 1.3.0", "model": provenance, "items": items}
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    notice = ("English Quest synthetic whole-word audio\n"
              "Generated locally with Piper 1.3.0 (GPL-3.0 tool; tool/model not distributed here).\n"
              "Voice: en_GB-cori-high, Bryce Beattie / rhasspy Piper voices.\n"
              "Voice model card describes a UK English female model trained from LibriVox public-domain recordings.\n"
              "Source: https://huggingface.co/rhasspy/piper-voices/tree/" + provenance["revision"] + "/en/en_GB/cori/high\n"
              "Dataset/training information: https://brycebeattie.com/files/tts/ and https://librivox.org\n"
              "These clips are whole words, not recordings of isolated pure phonemes or a child's own speech.\n"
              "No pronunciation-scoring or validated-phonics-programme claim is made.\n")
    (output / "NOTICE.txt").write_text(notice, encoding="utf-8")
    (output / "MODEL_CARD.txt").write_text((root / "artifacts/piper-models/MODEL_CARD").read_text(encoding="utf-8"), encoding="utf-8")
    print(f"145 whole-word WAVs: {sum(i['bytes'] for i in items)} bytes; no acoustic or teacher approval claimed.")


if __name__ == "__main__":
    main()
