import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import baseline from "./fixtures/concept-cases.v1.json";
import {
  conceptLabs,
  conceptView,
  type MorphCase,
} from "../packages/domain/concepts";
import {
  measurementColour,
  measurementDimensions,
  measurementRatio,
  measurementSummary,
  measurementX,
} from "../packages/domain/measurements";
import MeasurementControls from "../src/MeasurementControls";
import { ConceptFlat } from "../src/ConceptScene";
import index from "../content/concept-exposure-map.json";
import { discoveryRelease } from "../packages/server/exercises";
import { answerExposureKeys } from "../packages/domain/exposure";
const cases = conceptLabs
  .find((lab) => lab.id === "forms.comparison")!
  .cases.filter(
    (row): row is MorphCase => "steps" in row && Boolean(row.measurement),
  );
describe("measured comparative teaching", () => {
  it("retains every original case exactly and appends three distinct physical comparisons", () => {
    expect(Object.keys(baseline)).toHaveLength(48);
    for (const [key, hash] of Object.entries(baseline)) {
      const [labId, caseId] = key.split("/");
      const row = conceptLabs
        .find((lab) => lab.id === labId)!
        .cases.find((row) => row.id === caseId)!;
      expect(
        createHash("sha256").update(JSON.stringify(row)).digest("hex"),
        key,
      ).toBe(hash);
    }
    expect(cases.map((row) => row.measurement!.kind)).toEqual([
      "tower",
      "bridge",
      "book",
    ]);
  });
  it("uses one linear scale for height, width and thickness without changing the other book dimensions", () => {
    for (const row of cases) {
      const data = row.measurement!,
        axis = data.kind === "bridge" ? 0 : 1;
      const a = data.items[0],
        b = data.items[1];
      const da = measurementDimensions(data, a.value),
        db = measurementDimensions(data, b.value);
      expect(da[axis] / db[axis]).toBeCloseTo(a.value / b.value, 12);
      expect(
        measurementRatio(
          data,
          Math.max(...data.items.map((item) => item.value)),
        ),
      ).toBe(1);
      const scaled = {
        ...data,
        items: data.items.map((item) => ({ ...item, value: item.value * 10 })),
      };
      expect(measurementDimensions(scaled, a.value * 10)).toEqual(da);
      for (const item of data.items)
        expect(
          measurementDimensions(data, item.value).every(
            (value) => Number.isFinite(value) && value > 0,
          ),
        ).toBe(true);
      if (data.kind === "book") {
        expect(da[0]).toBe(db[0]);
        expect(da[2]).toBe(db[2]);
      }
    }
  });
  it("makes taller and widest follow greater values while thinner follows a smaller thickness", () => {
    for (const row of cases) {
      const data = row.measurement!,
        target = data.items.find((item) => item.id === data.targetId)!;
      expect(target.value).toBe(
        data.preference === "larger"
          ? Math.max(...data.items.map((item) => item.value))
          : Math.min(...data.items.map((item) => item.value)),
      );
      expect(measurementSummary(data, target.id)).toContain(
        data.items.length === 2
          ? `它${data.comparative}`
          : `它${data.superlative}`,
      );
    }
    const book = cases.find(
      (row) => row.measurement!.kind === "book",
    )!.measurement!;
    expect(measurementSummary(book, "orange")).toContain(
      "1厘米。两者相比，它更薄",
    );
    expect(measurementSummary(book, "blue")).not.toContain("它更薄");
  });
  it("reports equality and tied extremes without claiming a unique winner", () => {
    const original = cases[1].measurement!;
    const equal = {
      ...original,
      items: original.items.map((item) => ({ ...item, value: 3 })),
    };
    expect(measurementSummary(equal, "blue")).toContain("宽度相同");
    expect(measurementSummary(equal, "blue")).not.toContain("它最宽");
    const tied = {
      ...original,
      items: original.items.map((item) => ({
        ...item,
        value: item.id === "blue" ? 2 : 5,
      })),
    };
    expect(measurementSummary(tied, "green")).toContain("并列最宽");
  });
  it("uses the same named colours, numbers and data in SVG and accessible native controls", () => {
    expect(measurementColour(1, 2)).toBe(measurementColour(2, 3));
    const lab = conceptLabs.find((lab) => lab.id === "forms.comparison")!;
    for (const row of cases) {
      const data = row.measurement!;
      for (const item of data.items) {
        const svg = renderToStaticMarkup(
          createElement(ConceptFlat, {
            data: conceptView(lab, row, 2),
            selectedMeasurement: item.id,
          }),
        );
        const controls = renderToStaticMarkup(
          createElement(MeasurementControls, {
            data,
            selected: item.id,
            onSelect() {},
          }),
        );
        expect(svg).toContain(`data-measurement="${item.id}"`);
        expect(svg).toContain(`${item.value}${data.unit}`);
        expect(controls.match(/aria-pressed="true"/g)).toHaveLength(1);
        expect(controls.match(/<button/g)).toHaveLength(data.items.length);
        expect(controls).toContain('role="status"');
        expect(controls).toContain(item.label);
        expect(svg + controls).not.toMatch(/NaN|Infinity|undefined/);
      }
    }
  });
  it("keeps every object inside the common platform without zero or invalid scales", () => {
    for (const row of cases) {
      const data = row.measurement!;
      for (let i = 0; i < data.items.length; i++)
        expect(
          Math.abs(measurementX(i, data.items.length)) +
            measurementDimensions(data, data.items[i].value)[0] / 2,
        ).toBeLessThan(2.35);
      expect(measurementRatio(data, NaN)).toBe(0);
      expect(measurementRatio(data, Infinity)).toBe(0);
      expect(measurementRatio(data, -1)).toBe(0);
    }
  });
  it("links the new physical examples to their existing word-form exposure protection", () => {
    const entries = index.entries as Record<string, string[]>;
    for (const [caseId, itemId] of [
      ["tower-pair", "P4A-U05-L1.p3.choice"],
      ["bridge-group", "P5A-U05-L2.p8.input"],
      ["book-pair", "P4A-U05-L3.p6.repair"],
    ]) {
      const item = discoveryRelease.items.find((item) => item.id === itemId)!;
      for (const key of answerExposureKeys(item))
        expect(entries[`forms.comparison/${caseId}`]).toContain(key);
    }
  });
});
