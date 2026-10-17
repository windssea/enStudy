export const VOICE_SECONDS = 20,
  VOICE_RATE = 16000,
  VOICE_MAX_BYTES = 44 + VOICE_RATE * VOICE_SECONDS * 2;
export function pcmWav(samples: Float32Array, sourceRate: number): Uint8Array {
  if (!Number.isFinite(sourceRate) || sourceRate < 8000 || sourceRate > 192000)
    throw new Error("录音采样率不支持。");
  const count = Math.min(
    VOICE_RATE * VOICE_SECONDS,
    Math.floor((samples.length * VOICE_RATE) / sourceRate),
  );
  const bytes = new Uint8Array(44 + count * 2),
    view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++)
      bytes[offset + i] = text.charCodeAt(i);
  };
  ascii(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, VOICE_RATE, true);
  view.setUint32(28, VOICE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, count * 2, true);
  const ratio = sourceRate / VOICE_RATE;
  for (let i = 0; i < count; i++) {
    const start = i * ratio,
      end = (i + 1) * ratio;
    let sum = 0,
      weight = 0;
    for (let j = Math.floor(start); j < Math.ceil(end); j++) {
      const part = Math.max(0, Math.min(end, j + 1) - Math.max(start, j));
      sum += (samples[j] ?? 0) * part;
      weight += part;
    }
    const value = Math.max(-1, Math.min(1, sum / (weight || 1)));
    view.setInt16(
      44 + i * 2,
      Math.round(value * (value < 0 ? 32768 : 32767)),
      true,
    );
  }
  return bytes;
}
export function wavDuration(bytes: Uint8Array): number {
  if (bytes.length < 44 || bytes.length > VOICE_MAX_BYTES)
    throw new Error("请录制不超过20秒的短音频。");
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    text = (at: number, len: number) =>
      String.fromCharCode(...bytes.subarray(at, at + len));
  if (
    text(0, 4) !== "RIFF" ||
    text(8, 8) !== "WAVEfmt " ||
    text(36, 4) !== "data" ||
    v.getUint32(4, true) !== bytes.length - 8 ||
    v.getUint32(16, true) !== 16 ||
    v.getUint16(20, true) !== 1 ||
    v.getUint16(22, true) !== 1 ||
    v.getUint32(24, true) !== VOICE_RATE ||
    v.getUint32(28, true) !== VOICE_RATE * 2 ||
    v.getUint16(32, true) !== 2 ||
    v.getUint16(34, true) !== 16 ||
    v.getUint32(40, true) !== bytes.length - 44 ||
    (bytes.length - 44) % 2 !== 0
  )
    throw new Error("请使用本页录制的单声道WAV音频。");
  const ms = ((bytes.length - 44) * 1000) / (VOICE_RATE * 2);
  if (ms < 250 || ms > VOICE_SECONDS * 1000)
    throw new Error("请录制0.25至20秒的短音频。");
  return Math.ceil(ms);
}
export function voiceBase64(bytes: Uint8Array): string {
  let out = "";
  for (let at = 0; at < bytes.length; at += 8192)
    out += String.fromCharCode(...bytes.subarray(at, at + 8192));
  return btoa(out);
}
export function voiceBytes(value: unknown): Uint8Array {
  if (
    typeof value !== "string" ||
    value.length > Math.ceil(VOICE_MAX_BYTES / 3) * 4 ||
    !value.length ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value) ||
    value.length % 4 !== 0
  )
    throw new Error("录音数据格式不正确。");
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
