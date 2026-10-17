import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  storyRelease,
  courseCatalog,
  vocabularyRelease,
  gradeAnswer,
  publicExercise,
  structuredFeedback,
} from "../packages/server/exercises";
import { structuredCanonical, joinParts } from "../packages/domain/structured";
import { playLocalEnglish } from "../src/deviceSpeech";
import { isSpeechActive } from "../src/speechActivity";
import ListeningPrompt from "../src/ListeningPrompt";
import type { LearningSession } from "../packages/contracts/index";
describe("third-unit listening and evidence reading", () => {
  it("covers another four actual lessons per grade with nine distinct facts and separate demonstrations", () => {
    expect(courseCatalog.lessons).toHaveLength(72);
    expect(storyRelease.lessons).toHaveLength(24);
    expect(storyRelease.items).toHaveLength(216);
    expect(new Set(storyRelease.items.map((i) => i.family)).size).toBe(216);
    for (let g = 1; g <= 6; g++)
      expect(
        storyRelease.lessons.filter((l) => l.grade === g).map((l) => l.order),
      ).toEqual([9, 10, 11, 12]);
    for (const lesson of storyRelease.lessons) {
      const items = storyRelease.items.filter((i) => i.lessonId === lesson.id);
      expect(items.map((i) => i.type)).toEqual([
        "listen",
        "evidence",
        "choice",
        "listen",
        "evidence",
        "input",
        "listen",
        "evidence",
        "order",
      ]);
      for (const item of items) {
        expect(
          item.solutionSentences?.some((s) =>
            lesson.cards.some((c) => c.example === s),
          ),
        ).toBe(false);
        expect(JSON.stringify(publicExercise(item))).not.toContain(
          '"evidenceSolutions"',
        );
      }
    }
  });
  it("grades all 216 facts through their actual answer contracts", () => {
    for (const item of storyRelease.items) {
      const answer =
        item.type === "evidence"
          ? JSON.parse(item.answers[0])
          : item.type === "order"
            ? item.answers[0].replace(/([.!?,])/g, " $1").split(/\s+/)
            : item.answers[0];
      expect(gradeAnswer(item, answer), item.id).toBe(true);
      expect(structuredCanonical(item, answer), item.id).not.toBeNull();
      if (item.type === "listen")
        expect(item.choices?.filter((c) => gradeAnswer(item, c))).toHaveLength(
          1,
        );
      if (item.type === "evidence") {
        const wrong = item.passage!.find((s) => s.id !== answer[0])!;
        expect(gradeAnswer(item, [wrong.id, answer[1]])).toBe(false);
        expect(
          structuredFeedback(item, [wrong.id, answer[1]]).details!.filter(
            (d) => !d.correct,
          ).length,
        ).toBeGreaterThan(0);
        expect(structuredCanonical(item, ["made-up", answer[1]])).toBeNull();
        expect(structuredCanonical(item, [answer[0], "made-up"])).toBeNull();
      }
    }
  });
  it("keeps hearing scripts out of the reading passage and admits valid time phrase placement", () => {
    for (const lesson of storyRelease.lessons) {
      const items = storyRelease.items.filter((i) => i.lessonId === lesson.id),
        passage = items.find((i) => i.type === "evidence")!.passage!;
      expect(
        items
          .filter((i) => i.type === "listen")
          .every((i) => !passage.some((s) => s.text === i.audioText)),
      ).toBe(true);
    }
    const order = storyRelease.items.find(
      (i) => i.id === "P4A-U03-L1.p9.order",
    )!;
    expect(gradeAnswer(order, "Last night they watched the show.")).toBe(true);
    expect(
      gradeAnswer(order, [
        "last",
        "night",
        "They",
        "watched",
        "the",
        "show",
        ".",
      ]),
    ).toBe(true);
    expect(gradeAnswer(order, "They watch the show last night.")).toBe(false);
    expect(joinParts(["She", "has", "changed", "."])).toBe("She has changed.");
  });
  it("adds exactly one listening task per existing word sense, with no answer keys in public fields", () => {
    const words = vocabularyRelease.items.filter(
      (i) => i.wordMode === "listening",
    );
    expect(words).toHaveLength(360);
    expect(new Set(words.map((i) => i.wordId)).size).toBe(360);
    for (const item of words) {
      expect(item.modality).toBe("listening-choice");
      expect(gradeAnswer(item, item.answers[0])).toBe(true);
      expect(item.audioText).toBeTruthy();
      expect(Object.hasOwn(publicExercise(item), "answers")).toBe(false);
    }
  });
  it("does not put unrequested transcript text in the initial accessible page markup", () => {
    const exercise = publicExercise(storyRelease.items[0]),
      session = {
        id: "session",
        exercise,
        assignmentId: "a",
        leaseId: "l",
        listening: { heard: false, textSupport: false },
      } as LearningSession;
    const markup = renderToStaticMarkup(
      <ListeningPrompt
        session={session}
        disabled={false}
        answered={false}
        onState={() => {}}
      />,
    );
    expect(markup).not.toContain(exercise.audioText!);
    expect(
      renderToStaticMarkup(
        <ListeningPrompt
          session={{
            ...session,
            listening: { heard: false, textSupport: true },
          }}
          disabled={false}
          answered={false}
          onState={() => {}}
        />,
      ),
    ).toContain(exercise.audioText);
  });
});
describe("local device speech lifecycle", () => {
  let utterance: SpeechSynthesisUtterance | undefined,
    stops: { stop: () => void }[] = [],
    doc: EventTarget & { hidden: boolean };
  const setup = (voices = [{ lang: "en-GB", localService: true }]) => {
    doc = Object.assign(new EventTarget(), { hidden: false });
    vi.stubGlobal("document", doc);
    const synth = {
      getVoices: () => voices,
      speak: vi.fn((value: SpeechSynthesisUtterance) => {
        utterance = value;
      }),
      cancel: vi.fn(),
    };
    vi.stubGlobal("window", { speechSynthesis: synth });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        constructor(public text: string) {}
      },
    );
    return synth;
  };
  const callbacks = () => ({
    ended: vi.fn(),
    failed: vi.fn(),
    stopped: vi.fn(),
  });
  afterEach(() => {
    stops.forEach((s) => s.stop());
    stops = [];
    utterance = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("refuses remote-only or non-English voices instead of pretending playback succeeded", () => {
    setup([
      { lang: "en-US", localService: false },
      { lang: "zh-CN", localService: true },
    ]);
    const cb = callbacks();
    expect(() => playLocalEnglish("Hello.", cb)).toThrow("本机英语声音");
    expect(cb.ended).not.toHaveBeenCalled();
    expect(isSpeechActive()).toBe(false);
  });
  it("reports completion once and ignores late end callbacks", () => {
    setup();
    const cb = callbacks();
    stops.push(playLocalEnglish("Hello.", cb));
    expect(isSpeechActive()).toBe(true);
    const ended = utterance!.onend!;
    ended.call(utterance!, {} as SpeechSynthesisEvent);
    ended.call(utterance!, {} as SpeechSynthesisEvent);
    expect(cb.ended).toHaveBeenCalledTimes(1);
    expect(isSpeechActive()).toBe(false);
  });
  it("cancels on background without calling ended", () => {
    const synth = setup(),
      cb = callbacks();
    stops.push(playLocalEnglish("Hello.", cb));
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(cb.ended).not.toHaveBeenCalled();
    expect(cb.stopped).toHaveBeenCalledTimes(1);
    expect(isSpeechActive()).toBe(false);
  });
  it("stops a previous owner but a stale stop cannot cancel the new speaker", () => {
    const synth = setup(),
      first = callbacks(),
      second = callbacks(),
      a = playLocalEnglish("One.", first);
    stops.push(a);
    stops.push(playLocalEnglish("Two.", second));
    expect(first.stopped).toHaveBeenCalledTimes(1);
    const calls = synth.cancel.mock.calls.length;
    a.stop();
    expect(synth.cancel).toHaveBeenCalledTimes(calls);
    expect(isSpeechActive()).toBe(true);
  });
  it("times out safely without claiming hearing completion", () => {
    vi.useFakeTimers();
    setup();
    const cb = callbacks();
    stops.push(playLocalEnglish("Hello.", cb));
    vi.advanceTimersByTime(45001);
    expect(cb.failed).toHaveBeenCalledTimes(1);
    expect(cb.ended).not.toHaveBeenCalled();
    expect(isSpeechActive()).toBe(false);
  });
  it("does not interpret an engine error as completed hearing", () => {
    setup();
    const cb = callbacks();
    stops.push(playLocalEnglish("Hello.", cb));
    utterance!.onerror!.call(utterance!, {
      error: "private-engine-failure",
    } as unknown as SpeechSynthesisErrorEvent);
    expect(cb.failed).toHaveBeenCalledTimes(1);
    expect(cb.failed.mock.calls[0][0]).not.toContain("private-engine");
    expect(cb.ended).not.toHaveBeenCalled();
    expect(isSpeechActive()).toBe(false);
  });
  it("handles synchronous engine failure and hidden-page starts without leaving active speech", () => {
    const synth = setup(),
      cb = callbacks();
    synth.speak.mockImplementation(() => {
      throw new Error("private engine text");
    });
    expect(() => playLocalEnglish("Hello.", cb)).toThrow("没有开始");
    expect(isSpeechActive()).toBe(false);
    doc.hidden = true;
    expect(() => playLocalEnglish("Hello.", cb)).toThrow("本页面");
    expect(cb.ended).not.toHaveBeenCalled();
  });
});
