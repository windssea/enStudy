import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Box3, Mesh, Vector3 } from "three";
import { wordExampleKeys, wordPreview } from "../packages/server/exposure";
import { vocabularyRelease } from "../packages/server/exercises";
import { answerExposureKeys } from "../packages/domain/exposure";
import { createWordObject } from "../src/scene/wordObjectModel";
import { WordObjectFlat } from "../src/WordObjectScene";
import { wordObjectKind, type WordObjectKind } from "../src/wordObjects";
import WordStudyCard from "../src/WordStudyCard";
const kinds: WordObjectKind[] = [
  "apple",
  "banana",
  "book",
  "pencil",
  "fish",
  "orange-swatch",
];

describe("word study, meaning and illustration", () => {
  it("binds the Blender topology inspection to the actual runtime modelling source", () => {
    const qa = JSON.parse(
      readFileSync(
        new URL("../design-assets/word-objects.qa.json", import.meta.url),
        "utf8",
      ),
    );
    const source = readFileSync(
      new URL("../src/scene/wordObjectModel.ts", import.meta.url),
      "utf8",
    ).replaceAll("\r\n", "\n");
    expect(qa.source_ts_sha256).toBe(
      createHash("sha256").update(source).digest("hex"),
    );
    expect(qa.objects).toHaveLength(25);
    for (const item of qa.objects) {
      expect(
        item.boundary_edges +
          item.non_manifold_edges +
          item.degenerate_faces +
          item.invalid_coordinates,
      ).toBe(0);
      expect(item.volume).toBeGreaterThan(0);
    }
  });
  it("marks the selected lexeme across all four modes, including later-added listening", () => {
    const keys = wordExampleKeys("food.apple");
    const apple = vocabularyRelease.items.filter(
      (item) => item.wordId === "food.apple",
    );
    expect(apple).toHaveLength(4);
    expect(new Set(apple.map((item) => item.wordMode)).size).toBe(4);
    for (const item of apple)
      for (const key of answerExposureKeys(item)) expect(keys).toContain(key);
    for (const item of vocabularyRelease.items.filter(
      (item) => item.wordId === "food.banana",
    ))
      expect(keys).not.toContain(`family:${item.family}`);
    expect(wordExampleKeys("missing.word")).toEqual([]);
    expect(wordPreview("food.apple")?.meaning).toBe("苹果");
  });
  it("keeps the colour sense of orange distinct from fruit, and declines unmodelled senses", () => {
    expect(wordObjectKind({ id: "colours-shapes.orange" })).toBe(
      "orange-swatch",
    );
    expect(wordObjectKind({ id: "food.orange" })).toBeNull();
    expect(wordObjectKind({ id: "animals.fish" })).toBe("fish");
    expect(wordObjectKind({ id: "actions.book" })).toBeNull();
  });
  it("does not disclose closed card content or mount a 3D scene before opening", () => {
    const word = wordPreview("food.apple")!;
    const html = renderToStaticMarkup(
      createElement(WordStudyCard, { word, childId: "test-child" }),
    );
    expect(html).toContain("apple");
    expect(html).not.toContain(word.meaning);
    expect(html).not.toContain(word.example);
    expect(html).not.toContain("<canvas");
  });
  it("keeps six real clay meshes finite, grounded and within a small geometry budget", () => {
    for (const kind of kinds) {
      const model = createWordObject(kind);
      try {
        const bounds = new Box3().setFromObject(model.root),
          size = bounds.getSize(new Vector3());
        expect(bounds.min.y, kind).toBeCloseTo(0, 5);
        expect(Math.max(size.x, size.y, size.z), kind).toBeLessThan(2);
        let triangles = 0;
        model.root.traverse((node) => {
          if (node instanceof Mesh) {
            const p = node.geometry.getAttribute("position");
            expect(Array.from(p.array).every(Number.isFinite), kind).toBe(true);
            triangles += (node.geometry.index?.count ?? p.count) / 3;
          }
        });
        expect(triangles, kind).toBeGreaterThan(100);
        expect(triangles, kind).toBeLessThan(16000);
      } finally {
        model.dispose();
      }
    }
  });
  it("provides a matching 2D illustration for every supported object", () => {
    const outputs = kinds.map((kind) =>
      renderToStaticMarkup(createElement(WordObjectFlat, { kind })),
    );
    expect(new Set(outputs).size).toBe(6);
    for (const html of outputs) expect(html).toContain('aria-hidden="true"');
    expect(outputs[kinds.indexOf("orange-swatch")]).not.toContain("apple");
  });
});
