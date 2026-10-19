import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import type { Catalog } from "../packages/contracts/index";
import { courseCatalog } from "../packages/server/exercises";
import { clayArt } from "../src/clayArt";
import PaintedCompanion from "../src/PaintedCompanion";
import CourseIslandMap from "../src/CourseIslandMap";
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
  it("keeps six semantic touch markers, every course entry and selected unit on an illustrated map", () => {
    const html = renderToStaticMarkup(
      <CourseIslandMap
        units={catalog.units.slice(0, 6)}
        lessons={courseCatalog.lessons}
        completed={[]}
        nextUnitId={catalog.units[5].id}
        quiet={false}
        flat={false}
        onLost={() => {}}
        onOpen={() => {}}
        onSelectUnit={() => {}}
      />,
    );
    expect(html).toContain(clayArt.island.url);
    expect(html.match(/class="painted-map-stop"/g)).toHaveLength(6);
    expect(html.match(/class="course-map-station"/g)).toHaveLength(6);
    expect(html).toContain('aria-label="图片地图上的六个单元站点"');
    expect(html).toContain('aria-controls="course-map-selection"');
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
