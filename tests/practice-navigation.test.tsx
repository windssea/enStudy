import { describe, expect, it, vi, afterEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import catalog from "../public/content/catalog.json";
import { parseRoute } from "../src/routes";
import {
  topicGroups,
  topicItems,
  patternGroups,
  patternItems,
} from "../src/practiceCatalog";
import { patternRelease, topicRelease } from "../packages/server/exercises";
import { patternExampleKeys } from "../packages/server/exposure";
import { answerExposureKeys, sentenceKey } from "../packages/domain/exposure";
import PracticeLibrary from "../src/PracticeLibrary";
import PatternPractice from "../src/PatternPractice";
import TopicJourney from "../src/TopicJourney";
import PatternFrame from "../src/PatternFrame";
vi.mock("../src/SceneStage", () => ({ default: () => null }));
afterEach(() => vi.restoreAllMocks());
describe("practice navigation and demonstration boundaries", () => {
  it("explains every frame slot in Chinese while preserving its English sentence parts", () => {
    for (const row of catalog.patterns) {
      const html = renderToStaticMarkup(
        createElement(PatternFrame, { frame: row.frame }),
      );
      expect(html).not.toContain("[V-base phrase]");
      expect(html).not.toContain("[noun phrase]");
      expect(html).not.toMatch(/>[a-zA-Z -]*(?:phrase|clause|target)<\/span>/);
      if (row.frame.includes("[")) expect(html).toContain('lang="zh-CN"');
    }
  });
  it("keeps all seventy-two frame links addressable after reload and browser history", () => {
    for (const pattern of catalog.patterns)
      expect(
        parseRoute(`#pattern=${encodeURIComponent(pattern.pattern_id)}`),
      ).toEqual({
        view: "patterns",
        lessonId: null,
        patternId: pattern.pattern_id,
      });
    expect(parseRoute("#training=grammar.be")).toEqual({
      view: "topics",
      lessonId: null,
      trainingTopic: "grammar.be",
    });
    expect(parseRoute("#lesson=P6A-U03-L4")).toEqual({
      view: "lesson",
      lessonId: "P6A-U03-L4",
    });
    for (const view of [
      "topics",
      "patterns",
      "words",
      "review",
      "parent",
      "talk",
      "workshops",
      "exercise",
    ] as const)
      expect(parseRoute(`#${view}`).view).toBe(view);
  });
  it("recovers malformed and oversized deep links at the relevant library", () => {
    for (const value of ["", "%E0%A4%A", "%00", "a".repeat(181)]) {
      expect(parseRoute(`#pattern=${value}`)).toEqual({
        view: "patterns",
        lessonId: null,
      });
      expect(parseRoute(`#training=${value}`)).toEqual({
        view: "topics",
        lessonId: null,
      });
      expect(parseRoute(`#lesson=${value}`)).toEqual({
        view: "map",
        lessonId: null,
      });
    }
    expect(parseRoute("#unknown").view).toBe("map");
    expect(
      parseRoute("#pattern=pattern.requests.01%26other%3Dvalue").patternId,
    ).toBe("pattern.requests.01&other=value");
  });
  it("keeps every topic and exact frame reachable without inventing availability", () => {
    const topics = topicItems(
      catalog.topics,
      Object.fromEntries(
        Object.keys(topicRelease.stats).map((id) => [id, 120]),
      ),
    );
    expect(topics).toHaveLength(60);
    expect(
      topics.every(
        (row) =>
          topicGroups.some((group) => group.id === row.group) &&
          row.grade >= 1 &&
          row.grade <= 6 &&
          row.available,
      ),
    ).toBe(true);
    expect(topicItems(catalog.topics, {}).every((row) => !row.available)).toBe(
      true,
    );
    const groups = patternGroups(catalog.patterns),
      patterns = patternItems(catalog.patterns, patternRelease.stats);
    expect(groups).toHaveLength(12);
    expect(patterns).toHaveLength(72);
    expect(new Set(patterns.map((row) => row.id)).size).toBe(72);
    for (const group of groups)
      expect(patterns.filter((row) => row.group === group.id)).toHaveLength(6);
    expect(
      patternItems(catalog.patterns, {}).every((row) => !row.available),
    ).toBe(true);
  });
  it("starts browsing with eight or twelve category controls instead of sixty or seventy-two start actions", () => {
    const render = (kind: "topic" | "pattern") =>
      renderToStaticMarkup(
        createElement(PracticeLibrary, {
          kind,
          groups:
            kind === "topic" ? topicGroups : patternGroups(catalog.patterns),
          items:
            kind === "topic"
              ? topicItems(catalog.topics, {})
              : patternItems(catalog.patterns, patternRelease.stats),
          busy: false,
          onOpen: () => {},
          browse: { group: null, query: "", year: 0 },
          onBrowseChange: () => {},
        }),
      );
    const topics = render("topic"),
      patterns = render("pattern");
    expect(topics.match(/class="library-group word-tone/g)).toHaveLength(8);
    expect(patterns.match(/class="library-group word-tone/g)).toHaveLength(12);
    expect(topics + patterns).not.toContain('class="primary');
    expect(topics + patterns).not.toContain('class="library-item word-tone');
  });
  it("does not place a child's example in the rendered page before its save acknowledgement", () => {
    const pattern = catalog.patterns[0];
    const html = renderToStaticMarkup(
      createElement(PatternPractice, {
        pattern,
        stats: patternRelease.stats[pattern.pattern_id],
        childId: "child",
        busy: false,
        onBack: () => {},
        onStart: () => {},
      }),
    );
    expect(html).not.toContain(pattern.example);
    expect(html).toContain("出发，练5题");
    expect(html.match(/class="primary/g)).toHaveLength(1);
  });
  it("directs an unsigned child to a profile without promising to launch a plan", () => {
    const html = renderToStaticMarkup(
      createElement(TopicJourney, {
        topicId: "grammar.be",
        title: "be动词",
        busy: false,
        onBack: () => {},
        onProfile: () => {},
        onStart: () => {},
        onResume: () => {},
        onPractice: () => {},
      }),
    );
    expect(html).toContain("选择档案，再开始");
    expect(html).not.toContain("开始5题小尝试");
  });
  it("protects every matching pattern sentence and its choice/input/order family after a preview", () => {
    let matched = 0;
    for (const pattern of catalog.patterns) {
      const keys = patternExampleKeys(pattern.pattern_id);
      expect(keys).toContain(sentenceKey(pattern.example));
      const normalizedExamples = [
        pattern.example,
        pattern.example.replace(/\s+[—–]\s+/g, " "),
      ].map(sentenceKey);
      for (const item of patternRelease.items.filter(
        (row) => row.patternId === pattern.pattern_id,
      )) {
        if (
          !answerExposureKeys(item).some((key) =>
            normalizedExamples.includes(key),
          ) &&
          !(
            item.type === "order" &&
            item.answers.some((answer) =>
              normalizedExamples.includes(sentenceKey(answer)),
            )
          )
        )
          continue;
        matched++;
        for (const key of answerExposureKeys(item)) expect(keys).toContain(key);
        for (const sibling of patternRelease.items.filter(
          (row) => row.family === item.family,
        ))
          expect(keys).toContain(`family:${sibling.family}`);
      }
    }
    expect(matched).toBeGreaterThan(60);
    expect(patternExampleKeys("unknown")).toEqual([]);
  });
});
