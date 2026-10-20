import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import type { Catalog } from "../packages/contracts/index";
import { courseCatalog } from "../packages/server/exercises";
import { clayArt } from "../src/clayArt";
import PaintedCompanion from "../src/PaintedCompanion";
import CoursePicker from "../src/CoursePicker";
import SceneStage from "../src/SceneStage";
const catalog: Catalog = JSON.parse(
  readFileSync(
    new URL("../public/content/catalog.json", import.meta.url),
    "utf8",
  ),
);
describe("illustrated clay scenery", () => {
  it("ships the actual generated PNGs with stable hashes, correct dimensions and an alpha character", () => {
    for (const asset of Object.values(clayArt)) {
      const b = readFileSync(new URL("../public" + asset.url, import.meta.url));
      expect(b.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(b.length).toBe(asset.bytes);
      expect(createHash("sha256").update(b).digest("hex")).toBe(asset.sha256);
      expect(b.readUInt32BE(16)).toBe(asset.width);
      expect(b.readUInt32BE(20)).toBe(asset.height);
      expect(asset.url).toContain(asset.sha256.slice(0, 24));
    }
    const fox = readFileSync(
      new URL("../public" + clayArt.fox.url, import.meta.url),
    );
    expect(fox[25]).toBe(6);
    expect(clayArt.fox.transparent).toBe(true);
  });
  it("uses the image fox while retaining an existing companion choice without relabeling it", () => {
    const fox = renderToStaticMarkup(<PaintedCompanion kind="fox" />),
      pika = renderToStaticMarkup(<PaintedCompanion kind="pikachu" />);
    expect(fox).toContain(clayArt.fox.url);
    expect(fox).toContain('alt=""');
    expect(pika).toContain(clayArt.bear.url);
    expect(pika).not.toContain(clayArt.fox.url);
    expect(fox + pika).not.toContain("<canvas");
  });
  it("keeps all six units and the requested selection in the course overview", () => {
    const html = renderToStaticMarkup(
      <CoursePicker
        units={catalog.units.slice(0, 6)}
        lessons={courseCatalog.lessons}
        completed={[]}
        nextUnitId={catalog.units[5].unit_id}
        onOpen={() => {}}
        onSelectUnit={() => {}}
      />,
    );
    expect(html.match(/class="course-unit-choice"/g)).toHaveLength(6);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toContain(
      `<h2 id="selected-unit-title">单元 ${catalog.units[5].unit_in_term} · ${catalog.units[5].title}</h2>`,
    );
    for (const unit of catalog.units.slice(0, 6))
      expect(html).toContain(unit.title);
    expect(html).toContain('aria-label="课程单元"');
    expect(html).not.toContain("<canvas");
  });
  it("renders an illustrated partner with real buttons and no fake turn or blink controls", () => {
    const html = renderToStaticMarkup(<SceneStage kind="partner" />);
    expect(html).toContain(clayArt.nook.url);
    expect(html).toContain(clayArt.fox.url);
    expect(html).toContain("跳一跳");
    expect(html).toContain("摇一摇");
    expect(html).not.toContain("看看背包");
    expect(html).not.toContain("眨眨眼");
    expect(html).not.toContain("<canvas");
  });
});
