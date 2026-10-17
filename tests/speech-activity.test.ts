import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acquireSpeech,
  isSpeechActive,
  releaseSpeech,
} from "../src/speechActivity";

describe("voice ownership and scene pause", () => {
  const current = Symbol("current"),
    other = Symbol("other");
  beforeEach(() => vi.stubGlobal("document", new EventTarget()));
  afterEach(() => {
    releaseSpeech(current);
    releaseSpeech(other);
    vi.unstubAllGlobals();
  });
  it("announces the active voice and resumes scenes when it ends", () => {
    const states: boolean[] = [];
    document.addEventListener("eq-speech-active", (e) =>
      states.push((e as CustomEvent<boolean>).detail),
    );
    expect(isSpeechActive()).toBe(false);
    acquireSpeech(current);
    expect(isSpeechActive()).toBe(true);
    expect(releaseSpeech(current)).toBe(true);
    expect(isSpeechActive()).toBe(false);
    expect(states).toEqual([true, false]);
  });
  it("ignores a stale voice callback after another card takes ownership", () => {
    acquireSpeech(current);
    acquireSpeech(other);
    expect(releaseSpeech(current)).toBe(false);
    expect(isSpeechActive()).toBe(true);
    expect(releaseSpeech(other)).toBe(true);
  });
  it("does not resume scenes or cancel voice when an unrelated card unmounts", () => {
    const listener = vi.fn();
    acquireSpeech(current);
    document.addEventListener("eq-speech-active", listener);
    expect(releaseSpeech(other)).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(isSpeechActive()).toBe(true);
    releaseSpeech(current);
    expect(releaseSpeech(current)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
