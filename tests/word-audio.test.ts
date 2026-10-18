import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playWordAudio } from "../src/wordAudio";
import { isSpeechActive } from "../src/speechActivity";
class DocumentStub extends EventTarget {
  hidden = false;
}
class AudioStub {
  static instances: AudioStub[] = [];
  static reject = false;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  constructor(public url: string) {
    AudioStub.instances.push(this);
  }
  play() {
    return AudioStub.reject
      ? Promise.reject(Error("network"))
      : Promise.resolve();
  }
}
let doc: DocumentStub;
const url = "/audio/phonics/" + "a".repeat(24) + ".wav";
const callbacks = () => ({ ended: vi.fn(), failed: vi.fn(), stopped: vi.fn() });
beforeEach(() => {
  doc = new DocumentStub();
  AudioStub.instances = [];
  AudioStub.reject = false;
  vi.stubGlobal("document", doc);
  vi.stubGlobal("Audio", AudioStub);
  vi.useFakeTimers();
});
afterEach(() => {
  doc.dispatchEvent(new Event("eq-stop-speech"));
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("whole-word asset playback lifecycle", () => {
  it("only marks completion after ended and releases the shared animation pause", () => {
    const c = callbacks();
    playWordAudio(url, c);
    expect(c.ended).not.toHaveBeenCalled();
    expect(isSpeechActive()).toBe(true);
    AudioStub.instances[0].onended!();
    expect(c.ended).toHaveBeenCalledTimes(1);
    expect(isSpeechActive()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("stops on hidden without claiming it was heard", () => {
    const c = callbacks();
    playWordAudio(url, c);
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(c.stopped).toHaveBeenCalledTimes(1);
    expect(c.ended).not.toHaveBeenCalled();
    expect(AudioStub.instances[0].pause).toHaveBeenCalledTimes(1);
    expect(isSpeechActive()).toBe(false);
  });
  it("a second voice stops the first and a late first callback cannot release the new owner", () => {
    const first = callbacks(),
      second = callbacks();
    playWordAudio(url, first);
    const late = AudioStub.instances[0].onended!;
    playWordAudio(url, second);
    late();
    expect(first.stopped).toHaveBeenCalledTimes(1);
    expect(first.ended).not.toHaveBeenCalled();
    expect(isSpeechActive()).toBe(true);
    AudioStub.instances[1].onended!();
    expect(second.ended).toHaveBeenCalledTimes(1);
    expect(isSpeechActive()).toBe(false);
  });
  it("retains an honest failure on a rejected media request", async () => {
    AudioStub.reject = true;
    const c = callbacks();
    playWordAudio(url, c);
    await Promise.resolve();
    expect(c.failed).toHaveBeenCalledTimes(1);
    expect(c.ended).not.toHaveBeenCalled();
    expect(isSpeechActive()).toBe(false);
  });
  it("cleans up a stuck clip after fifteen seconds and makes repeated stop harmless", () => {
    const c = callbacks(),
      p = playWordAudio(url, c);
    vi.advanceTimersByTime(15000);
    p.stop();
    p.stop();
    expect(c.failed).toHaveBeenCalledTimes(1);
    expect(c.stopped).not.toHaveBeenCalled();
    expect(isSpeechActive()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects remote and unexpected assets before creating media", () => {
    for (const bad of [
      "https://example.com/a.wav",
      "/audio/phonics/../a.wav",
      "/audio/phonics/" + "a".repeat(24) + ".wav?x=1",
    ])
      expect(() => playWordAudio(bad, callbacks())).toThrow();
    doc.hidden = true;
    expect(() => playWordAudio(url, callbacks())).toThrow();
    expect(AudioStub.instances).toHaveLength(0);
  });
});
