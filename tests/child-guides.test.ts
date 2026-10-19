import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseRoute } from "../src/routes";
import { playGuideAudio, playWordAudio, type GuideId } from "../src/wordAudio";
import { isSpeechActive } from "../src/speechActivity";
import guides from "../public/content/child-guides.v1.json";
import source from "../content/child-guides.v1.json";
class Doc extends EventTarget {
  hidden = false;
}
class Player {
  static all: Player[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  play = vi.fn(() => Promise.resolve());
  constructor(public url: string) {
    Player.all.push(this);
  }
}
let doc: Doc;
const calls = () => ({ ended: vi.fn(), stopped: vi.fn(), failed: vi.fn() });
beforeEach(() => {
  doc = new Doc();
  Player.all = [];
  vi.stubGlobal("document", doc);
  vi.stubGlobal("Audio", Player);
  vi.stubGlobal("fetch", vi.fn());
  vi.useFakeTimers();
});
afterEach(() => {
  doc.dispatchEvent(new Event("eq-stop-speech"));
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("picture-led child entry and local navigation audio", () => {
  it("opens a child home while preserving explicit course and training deep links", () => {
    expect(parseRoute("").view).toBe("home");
    expect(parseRoute("#home").view).toBe("home");
    expect(parseRoute("#map").view).toBe("map");
    expect(parseRoute("#training=grammar.be").trainingTopic).toBe("grammar.be");
    expect(parseRoute("#lesson=P1A-U01-L1").lessonId).toBe("P1A-U01-L1");
  });
  it("ships every original Chinese instruction as a small content-addressed local MP3", () => {
    expect(guides.items).toHaveLength(22);
    expect(new Set(guides.items.map((i) => i.id)).size).toBe(22);
    for (const row of source.items) {
      const clip = guides.items.find((i) => i.id === row.id)!;
      expect(clip.text).toBe(row.text);
      expect(clip.url).toMatch(/^\/audio\/guides\/[a-f0-9]{24}\.mp3$/);
      const bytes = readFileSync(
        new URL("../public" + clip.url, import.meta.url),
      );
      expect(bytes.length).toBe(clip.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        clip.sha256,
      );
      expect(clip.duration).toBeGreaterThan(0);
      expect(clip.duration).toBeLessThan(20);
    }
    expect(guides.items.reduce((n, i) => n + i.bytes, 0)).toBeLessThan(1500000);
  });
  it("plays only a manifest instruction and cannot turn a supplied path into a media URL", () => {
    expect(() => playGuideAudio("../../secrets" as GuideId, calls())).toThrow();
    const c = calls();
    playGuideAudio("home", c);
    expect(Player.all[0].url).toBe(
      guides.items.find((i) => i.id === "home")!.url,
    );
    expect(c.ended).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("a real lesson or word voice cancels guidance without a stale callback releasing that voice", () => {
    const c = calls();
    playGuideAudio("home", c);
    const late = Player.all[0].onended!;
    const other = calls();
    playWordAudio("/audio/phonics/" + "b".repeat(24) + ".wav", other);
    late();
    expect(c.stopped).toHaveBeenCalledOnce();
    expect(c.ended).not.toHaveBeenCalled();
    expect(isSpeechActive()).toBe(true);
    Player.all[1].onended!();
    expect(isSpeechActive()).toBe(false);
  });
  it("hiding the page or navigation stops the prompt without claiming completion", () => {
    const c = calls();
    playGuideAudio("choice", c);
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(c.stopped).toHaveBeenCalledOnce();
    expect(c.ended).not.toHaveBeenCalled();
    expect(isSpeechActive()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("times out failed guidance and retains the stricter phonics URL boundary", () => {
    expect(() => playWordAudio(guides.items[0].url, calls())).toThrow();
    const c = calls();
    playGuideAudio("start", c);
    vi.advanceTimersByTime(25000);
    expect(c.failed).toHaveBeenCalledOnce();
    expect(c.ended).not.toHaveBeenCalled();
    expect(isSpeechActive()).toBe(false);
  });
});
