import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { conceptLabs, conceptView } from "../packages/domain/concepts";
import { ConceptFlat } from "../src/ConceptScene";
import TimelineStory from "../src/TimelineStory";
import art from "../public/content/learning-art.v1.json";

describe("time relationships and unified authored illustrations", () => {
  it("anchors the past event on the same rail as the fixed present", () => {
    const lab = conceptLabs.find((l) => l.id === "tense.past-simple")!;
    const html = renderToStaticMarkup(
      createElement(ConceptFlat, { data: conceptView(lab, lab.cases[0], 0) }),
    );
    const event = html.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="12"/)!;
    const present = html.match(/<path d="M([\d.]+) [\d.]+V[\d.]+"/)!;
    const rail = html.match(/<path d="M[\d.]+ ([\d.]+)H[\d.]+l/)!;
    expect(Number(event[1])).toBeLessThan(Number(present[1]));
    expect(Number(event[2])).toBe(Number(rail[1]));
    expect(html).toContain('role="img"');
    expect(html).not.toContain("ellipse");
  });
  it("preserves duration, repeated events and present links as different relationships", () => {
    const render = (id: string) => {
      const lab = conceptLabs.find((l) => l.id === id)!;
      return renderToStaticMarkup(
        createElement(ConceptFlat, { data: conceptView(lab, lab.cases[0], 0) }),
      );
    };
    expect(render("tense.past-continuous")).toContain('stroke-width="11"');
    expect(render("tense.present-simple")).toContain('r="6"');
    expect(render("tense.present-perfect")).toContain('stroke-dasharray="6 4"');
    expect(render("tense.past-simple")).not.toContain("stroke-dasharray");
  });
  it("marks the past question as a question and never invents an illustration for an unrelated tense", () => {
    const html = renderToStaticMarkup(
      createElement(TimelineStory, {
        labId: "tense.past-simple",
        caseId: "question",
      }),
    );
    expect(html).toContain("昨天？");
    expect(html).toContain(art.assets.telescope.url);
    expect(html).not.toContain("已完成");
    expect(
      renderToStaticMarkup(
        createElement(TimelineStory, {
          labId: "tense.future",
          caseId: "decision",
        }),
      ),
    ).toBe("");
  });
  it("ships original local art with one declared style, dimensions and content hashes", () => {
    expect(art.styleId).toBe("sports-clean-3d-v1");
    for (const asset of Object.values(art.assets)) {
      expect(asset.url).toMatch(/^\/art\/(concepts|courses)\/sports-v1\//);
      const bytes = readFileSync("public" + asset.url);
      expect(bytes.length).toBe(asset.bytes);
      expect(bytes.length).toBeLessThan(300000);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        asset.sha256,
      );
      expect(asset.width).toBeGreaterThan(1000);
      expect(asset.alt).toBeTruthy();
    }
  });
});
