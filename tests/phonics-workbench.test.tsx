import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OrthographicCamera, Vector3 } from "three";
import { phonicsRelease } from "../packages/server/exercises";
import {
  phonicsLayout,
  phonicsObservation,
} from "../src/phonicsWorkbenchModel";
import PhonicsWorkbench from "../src/PhonicsWorkbench";
const demos = phonicsRelease.stages.flatMap((s) => s.demos);

describe("guided clay spelling workbench", () => {
  it("fits every published demonstration tile, including lifted and folded poses, in narrow and wide camera frames", () => {
    for (const w of demos) {
      const opened = phonicsLayout(w, false);
      for (const [width, height] of [
        [320, 240],
        [768, 300],
        [1000, 300],
      ]) {
        const camera = new OrthographicCamera(
          -width / 2,
          width / 2,
          height / 2,
          -height / 2,
          0.1,
          100,
        );
        camera.position.set(0, 2.75, 7.4);
        camera.zoom = Math.min(width / opened.width, height / 4.2);
        camera.lookAt(0, 0.95, 0);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        for (const folded of [false, true]) {
          const layout = phonicsLayout(w, folded);
          for (let i = 0; i < w.tiles.length; i++)
            for (const side of [-1, 1])
              for (const y of [0.3, 1.85])
                for (const z of [-0.16, 0.16]) {
                  const p = new Vector3(
                    layout.x[i] + side * (layout.widths[i] / 2 + 0.03),
                    y,
                    z,
                  ).project(camera);
                  expect(Math.abs(p.x), `${w.id} ${width} x`).toBeLessThan(
                    0.96,
                  );
                  expect(Math.abs(p.y), `${w.id} ${width} y`).toBeLessThan(
                    0.96,
                  );
                }
        }
      }
    }
  });
  it("never overlaps neighbouring tiles or the companion reservation, and joins without reordering", () => {
    for (const w of demos) {
      const opened = phonicsLayout(w, false),
        folded = phonicsLayout(w, true);
      expect(opened.companionX + 0.55).toBeLessThan(
        opened.x[0] - opened.widths[0] / 2,
      );
      for (const layout of [opened, folded])
        for (let i = 1; i < w.tiles.length; i++)
          expect(
            layout.x[i] -
              layout.widths[i] / 2 -
              (layout.x[i - 1] + layout.widths[i - 1] / 2),
          ).toBeGreaterThan(0.05);
      expect(opened.owners).toEqual(folded.owners);
      expect(folded.platformWidth).toBeLessThanOrEqual(opened.platformWidth);
      expect(w.tiles.join("")).toBe(w.word);
    }
  });
  it("gives a long meaning block more physical and texture space without stretching a short letter", () => {
    const compound = demos.find((w) => w.id === "sunflower")!;
    const layout = phonicsLayout(compound, false);
    expect(layout.widths[1]).toBeGreaterThan(layout.widths[0]);
    expect(layout.widths[0]).toBeGreaterThan(
      phonicsLayout(demos[0], false).widths[0],
    );
  });
  it("keeps split-vowel partners separated by their original middle letter", () => {
    const w = demos.find((w) => w.id === "late")!;
    for (const folded of [false, true]) {
      const layout = phonicsLayout(w, folded);
      expect(layout.owners).toEqual([0, 1, 2, 1]);
      expect(layout.x[1]).toBeLessThan(layout.x[2]);
      expect(layout.x[2]).toBeLessThan(layout.x[3]);
    }
    expect(phonicsObservation(w, 1, "sound")).toContain("隔着别的字母");
  });
  it("explains a multi-letter tile as one correspondence, and keeps meaning parts distinct from sounds", () => {
    const shed = demos.find((w) => w.id === "shed")!;
    expect(phonicsObservation(shed, 0, "sound")).toContain("共同对应一个音");
    const sunflower = demos.find((w) => w.id === "sunflower")!;
    const meaning = phonicsObservation(sunflower, 0, "meaning");
    expect(meaning).toContain("词义块");
    expect(meaning).not.toContain("一个音");
  });
  it("offers real buttons for steps and each original tile, preserving a complete no-WebGL and silent path", () => {
    const html = renderToStaticMarkup(
      createElement(PhonicsWorkbench, {
        word: demos.find((w) => w.id === "late")!,
        kind: "sound",
      }),
    );
    expect(html).toContain('aria-label="示范观察步骤"');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("暂时不方便开声音");
    expect(html).toContain("选择标记2：e，第4块");
    expect(html.match(/class="phonics-letter"/g)).toHaveLength(4);
    expect(html).toContain("a_e");
    expect(html).not.toContain("整词已播放完");
  });
});
