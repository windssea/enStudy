import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import {
  pcmWav,
  wavDuration,
  voiceBase64,
  voiceBytes,
  VOICE_MAX_BYTES,
} from "../packages/domain/voice";
import {
  conversationScenes,
  learnerText,
  parseDialogue,
} from "../packages/domain/conversations";
import { sealKey, unsealKey } from "../packages/server/aiCrypto";
describe("bounded PCM recording", () => {
  it.each([8000, 16000, 44100, 48000, 96000, 192000])(
    "resamples one second at %i Hz into measured canonical WAV",
    (rate) => {
      const samples = new Float32Array(rate).fill(0.5),
        bytes = pcmWav(samples, rate);
      expect(wavDuration(bytes)).toBe(1000);
      expect(bytes.length).toBe(32044);
      expect(new DataView(bytes.buffer).getInt16(44, true)).toBe(16384);
      expect(voiceBytes(voiceBase64(bytes))).toEqual(bytes);
    },
  );
  it("clips oversize capture to twenty seconds before encoding", () => {
    const bytes = pcmWav(new Float32Array(16000 * 21), 16000);
    expect(bytes.length).toBe(VOICE_MAX_BYTES);
    expect(wavDuration(bytes)).toBe(20000);
  });
  it("rejects fake duration, unsupported channels, truncation and short recordings", () => {
    const bytes = pcmWav(new Float32Array(16000), 16000);
    const changed = bytes.slice();
    new DataView(changed.buffer).setUint16(22, 2, true);
    expect(() => wavDuration(changed)).toThrow();
    expect(() => wavDuration(bytes.subarray(0, 400))).toThrow();
    expect(() => wavDuration(pcmWav(new Float32Array(100), 16000))).toThrow();
    expect(() => voiceBytes("data:audio/wav;base64,AA==")).toThrow();
    expect(() => voiceBytes("A".repeat(900000))).toThrow();
    expect(() => pcmWav(new Float32Array(10), 0)).toThrow();
  });
  it("worklet emits mono frames, silences output, and stops after its bound", () => {
    let Processor: any;
    const messages: any[] = [];
    runInNewContext(readFileSync("public/audio/capture-worklet.js", "utf8"), {
      AudioWorkletProcessor: class {
        port = { postMessage: (v: unknown) => messages.push(v) };
      },
      sampleRate: 16000,
      Float32Array,
      registerProcessor: (_: string, p: unknown) => {
        Processor = p;
      },
    });
    const instance = new Processor(),
      left = new Float32Array(16000).fill(0.5),
      right = new Float32Array(16000).fill(-0.5),
      output = new Float32Array(16000).fill(1);
    for (let i = 0; i < 20; i++) instance.process([[left, right]], [[output]]);
    expect(output.every((v) => v === 0)).toBe(true);
    expect(messages[0].samples.every((v: number) => v === 0)).toBe(true);
    expect(messages.filter((m) => m.done)).toHaveLength(1);
    expect(instance.process([], [[output]])).toBe(false);
  });
});
describe("dialogue response boundary", () => {
  const good = {
    replyEnglish: "I like fruit. Do you like a banana?",
    meaningChinese: "我喜欢水果。你喜欢香蕉吗？",
    hintChinese: "可以说喜欢什么水果。",
  };
  it("accepts exactly a short scene-bound English response and two Chinese strings", () =>
    expect(parseDialogue(JSON.stringify(good), conversationScenes[0])).toEqual(
      good,
    ));
  it.each([
    { ...good, link: "x" },
    { ...good, replyEnglish: "Here is unrelated content." },
    { ...good, replyEnglish: "My name is Real Person." },
    { ...good, meaningChinese: "Visit https://bad.invalid" },
    { ...good, hintChinese: "English only" },
  ])("blocks mismatched or unsolicited reply %#", (bad) =>
    expect(() =>
      parseDialogue(JSON.stringify(bad), conversationScenes[0]),
    ).toThrow(),
  );
  it.each([
    "My name is Real Kid.",
    "my address is private",
    "test@example.com",
    "12345678901",
    "<script>",
    "访问https://bad.invalid",
    "我叫某某",
  ])("rejects common private or unsafe text %s", (text) =>
    expect(learnerText(text)).toBe(false),
  );
  it("supports ordinary short role practice", () =>
    expect(learnerText("I like apples.")).toBe(true));
  it("encrypts large audio cache without argument-stack overflow and binds its scope", async () => {
    const key = btoa(
        String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
      ),
      env = { AI_KEYRING: JSON.stringify({ v1: key }), AI_ACTIVE_KEY_ID: "v1" },
      text = "a".repeat(350000),
      sealed = await sealKey(env, "family", "voice:request:1", text),
      record = {
        key_id: sealed.keyId,
        key_iv: sealed.iv,
        key_ciphertext: sealed.ciphertext,
      };
    expect(await unsealKey(env, "family", "voice:request:1", record)).toBe(
      text,
    );
    await expect(
      unsealKey(env, "other-family", "voice:request:1", record),
    ).rejects.toThrow();
  });
});
