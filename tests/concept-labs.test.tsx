import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import source from "../content/concept-labs.v1.json";
import index from "../content/concept-exposure-map.json";
import catalog from "../public/content/catalog.json";
import {
  conceptLabs,
  conceptView,
  type MorphCase,
} from "../packages/domain/concepts";
import { exercises } from "../packages/server/exercises";
import { answerExposureKeys, sentenceKey } from "../packages/domain/exposure";
import {
  conceptProgress,
  timelineX,
  CONCEPT_MOTION_MS,
} from "../src/conceptMotion";
import { ConceptFlat } from "../src/ConceptScene";
import ConceptLab from "../src/ConceptLab";

describe("authored time and morphology concept demonstrations", () => {
  it("covers seventeen tense, morphology and spatial topics without pretending to add assessed tasks", () => {
    expect(conceptLabs).toHaveLength(17);
    expect(new Set(conceptLabs.map((l) => l.id)).size).toBe(17);
    expect(
      conceptLabs.every((l) => catalog.topics.some((t) => t.topic_id === l.id)),
    ).toBe(true);
    expect(conceptLabs.flatMap((l) => l.cases)).toHaveLength(54);
    for (const lab of conceptLabs) {
      expect(lab.cases).toHaveLength(lab.id === "forms.comparison" ? 6 : 3);
      expect(new Set(lab.cases.map((c) => c.id)).size).toBe(lab.cases.length);
    }
    expect(JSON.stringify(source)).not.toMatch(
      /"(?:answers|placements|repairs|rewardDelta)":/,
    );
  });
  it("keeps timeline references within their diagram and distinguishes recurrence from a single event", () => {
    for (const lab of conceptLabs.filter((l) => l.kind === "timeline"))
      for (const example of lab.cases) {
        if (!("visual" in example)) throw Error("Missing visual");
        const v = example.visual;
        expect(v.point).toBeGreaterThanOrEqual(0);
        expect(v.point).toBeLessThanOrEqual(1);
        for (const range of [v.span, v.secondSpan])
          if (range) {
            expect(range[0]).toBeLessThan(range[1]);
            expect(range[0]).toBeGreaterThanOrEqual(0);
            expect(range[1]).toBeLessThanOrEqual(1);
          }
        if (v.repeat) {
          expect(v.repeat.length).toBeGreaterThan(1);
          expect(v.repeat.every((p) => p >= 0 && p <= 1)).toBe(true);
        }
        if (v.linkToNow) expect(v.point).toBeLessThan(0.6);
      }
    const habit = conceptLabs.find((l) => l.id === "tense.present-simple")!
      .cases[0];
    expect("visual" in habit && habit.visual.repeat?.length).toBeGreaterThan(1);
  });
  it("keeps all fifty-four demonstrations readable through the SVG fallback at every supported step", () => {
    for (const lab of conceptLabs)
      for (const example of lab.cases)
        for (let step = 0; step < 3; step++) {
          const data = conceptView(lab, example, step),
            html = renderToStaticMarkup(createElement(ConceptFlat, { data }));
          expect(html).toContain("<svg");
          expect(html).not.toMatch(/NaN|Infinity|undefined/);
          for (const word of data.tiles)
            expect(html).toContain(`>${word}</text>`);
          if (data.kind === "morph" && data.tiles.length > 1)
            expect(html).toContain(`>${data.joiner}</text>`);
        }
  });
  it("shows real word changes without treating stems as complete words or deriving irregulars by suffix", () => {
    const cases = conceptLabs.flatMap((l) =>
      l.kind === "morph" ? (l.cases as MorphCase[]) : [],
    );
    expect(cases).toHaveLength(27);
    for (const row of cases) {
      expect(row.steps).toHaveLength(3);
      expect(row.steps[0].tiles).toEqual([row.base]);
      expect(row.steps[2].tiles).toEqual([row.result]);
      expect(row.targetForms).toContain(row.result);
    }
    expect(cases.find((c) => c.base === "bake")!.steps[1].tiles).toEqual([
      "bak",
      "ing",
    ]);
    expect(cases.find((c) => c.base === "sit")!.steps[1].tiles).toEqual([
      "sitt",
      "ing",
    ]);
    expect(cases.find((c) => c.base === "tooth")!.result).toBe("teeth");
    expect(cases.find((c) => c.base === "tooth")!.steps[1].joiner).toBe("→");
    expect(
      cases.find((c) => c.result === "written")!.steps.map((s) => s.tiles[0]),
    ).toEqual(["write", "wrote", "written"]);
    expect(cases.find((c) => c.base === "good")!.targetForms).toEqual([
      "better",
      "best",
    ]);
  });
  it("does not reveal or animate any demonstration before its explicit open action", () => {
    for (const lab of conceptLabs) {
      const html = renderToStaticMarkup(
        createElement(ConceptLab, { lab, childId: "selected-child" }),
      );
      expect(html.match(/class="concept-choice"/g)).toHaveLength(
        lab.cases.length,
      );
      expect(html).not.toContain("<canvas");
      for (const example of lab.cases)
        expect(html).not.toContain(example.sentence);
    }
  });
  it("bounds short motion and snaps immediately to the final state when paused or reduced", () => {
    expect(CONCEPT_MOTION_MS).toBeLessThanOrEqual(900);
    expect(conceptProgress(-1, false)).toBe(0);
    expect(conceptProgress(0, false)).toBe(0);
    expect(conceptProgress(CONCEPT_MOTION_MS / 2, false)).toBeGreaterThan(0.5);
    expect(conceptProgress(CONCEPT_MOTION_MS, false)).toBe(1);
    expect(conceptProgress(1e6, false)).toBe(1);
    expect(conceptProgress(0, true)).toBe(1);
    expect(conceptProgress(NaN, false)).toBe(1);
    for (const value of [-100, 0, 0.6, 1, 100, NaN])
      expect(Math.abs(timelineX(value))).toBeLessThanOrEqual(1.8);
  });
  it("binds teaching evidence to the exact authored data and includes every disclosed word target", () => {
    expect(index.sourceHash).toBe(
      createHash("sha256").update(JSON.stringify(source)).digest("hex"),
    );
    expect(Object.keys(index.entries)).toHaveLength(54);
    const entries = index.entries as Record<string, string[]>;
    for (const lab of conceptLabs)
      for (const row of lab.cases) {
        const keys = entries[`${lab.id}/${row.id}`];
        expect(keys).toContain(sentenceKey(row.sentence));
        expect(new Set(keys).size).toBe(keys.length);
        if (!("targetForms" in row)) continue;
        for (const item of exercises.filter((item) =>
          item.answers.some((a) =>
            row.targetForms.includes(a.trim().toLowerCase()),
          ),
        ))
          for (const key of answerExposureKeys(item))
            expect(keys).toContain(key);
      }
  });
});
