import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import release from "../content/picture-word-release.v1.json";
import media from "../public/content/picture-words.v1.json";
import {
  gradeAnswer,
  publicExercise,
  structuredFeedback,
  vocabularyRelease,
  type PrivateExercise,
} from "../packages/server/exercises";
import { selectTopicItems } from "../packages/domain/selection";
import { wordExampleKeys } from "../packages/server/exposure";
import { answerExposureKeys } from "../packages/domain/exposure";
import { restoreStoredAnswer } from "../packages/domain/structured";
import { offlineAnswerText } from "../src/offlineModel";
import WordPicture from "../src/WordPicture";
import PictureChoice from "../src/PictureChoice";
import PictureWordDeck from "../src/PictureWordDeck";
const items = release.items as PrivateExercise[];
describe("picture-led vocabulary with separate listening evidence", () => {
  it("adds sixty sense-specific illustrations and 180 variants without replacing legacy vocabulary", () => {
    expect(media.words).toHaveLength(60);
    expect(items).toHaveLength(180);
    expect(new Set(items.map((i) => i.family)).size).toBe(60);
    expect(
      vocabularyRelease.items.filter((i) => i.wordMode !== "picture"),
    ).toHaveLength(1440);
    expect(
      vocabularyRelease.themes
        .filter((t) => t.modes.includes("picture"))
        .map((t) => t.id),
    ).toEqual(["animals", "school", "colours-shapes"]);
  });
  it("pins every original atlas and English clip to immutable bytes and bounded public media paths", () => {
    expect(media.atlases).toHaveLength(2);
    for (const a of media.atlases) {
      expect(a.url).toMatch(/^\/pictures\/words\/[a-f0-9]{24}\.png$/);
      const b = readFileSync(new URL("../public" + a.url, import.meta.url));
      expect(b.length).toBe(a.bytes);
      expect(createHash("sha256").update(b).digest("hex")).toBe(a.sha256);
      expect([...b.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(a.columns * a.rows).toBe(20);
    }
    for (const w of media.words) {
      expect(w.audioUrl).toMatch(/^\/audio\/words\/[a-f0-9]{24}\.mp3$/);
      const b = readFileSync(
        new URL("../public" + w.audioUrl, import.meta.url),
      );
      expect(b.length).toBe(w.audioBytes);
      expect(createHash("sha256").update(b).digest("hex")).toBe(w.audioSha256);
      expect(w.duration).toBeGreaterThan(0.1);
      expect(w.duration).toBeLessThan(6);
      expect(w.rms).toBeGreaterThan(0.005);
    }
  });
  it("never uses target-first picture metadata as a solution cue and grades exactly one choice", () => {
    for (const i of items) {
      const p = publicExercise(i);
      expect(p).not.toHaveProperty("answers");
      expect(p).not.toHaveProperty("wordId");
      expect(p).not.toHaveProperty("correctedPicture");
      expect(
        structuredFeedback(i, i.choices![1]).correctedPicture?.wordId,
      ).toBe(i.wordId);
      expect(p.pictureChoices?.map((c) => c.value)).toEqual(
        [...i.choices!].sort((a, b) => a.localeCompare(b)),
      );
      expect(i.choices?.filter((c) => gradeAnswer(i, c))).toHaveLength(1);
      expect(
        i.pictureChoices?.every((c) =>
          media.words.some((w) => w.id === c.wordId && w.meaning === c.label),
        ),
      ).toBe(true);
      expect(i.modality).toBe("listening-picture");
      expect(i.context).not.toContain(i.audioText);
    }
  });
  it("excludes confusing whole-versus-part or subset pairs from animal and shape choices", () => {
    for (const i of items) {
      const ids = i.choices!;
      for (const [a, b] of [
        ["animals.bird", "animals.duck"],
        ["animals.bear", "animals.panda"],
        ["colours-shapes.square", "colours-shapes.rectangle"],
        ["colours-shapes.circle", "colours-shapes.oval"],
        ["school.pencil", "school.eraser"],
      ])
        if (i.wordId === a || i.wordId === b)
          expect(ids.includes(a) && ids.includes(b)).toBe(false);
    }
  });
  it("draws twenty different word families per picture theme and never enlarges mixed into a different mode", () => {
    for (const theme of ["animals", "school", "colours-shapes"]) {
      const pool = items.filter((i) => i.wordThemeId === theme);
      const draw = selectTopicItems(pool, new Set(), 20, () => 0.4);
      expect(draw).toHaveLength(20);
      expect(new Set(draw.map((i) => i.wordId)).size).toBe(20);
      expect(new Set(pool.map((i) => JSON.stringify(i.choices))).size).toBe(60);
    }
  });
  it("keeps picture study and wrong-answer restoration linked to the same real word sense", () => {
    for (const i of items)
      for (const k of answerExposureKeys(i))
        expect(wordExampleKeys(i.wordId!)).toContain(k);
    const i = items[0],
      wrong = i.choices!.find((c) => !gradeAnswer(i, c))!;
    expect(restoreStoredAnswer(publicExercise(i), wrong)).toBe(wrong);
    expect(offlineAnswerText(publicExercise(i), wrong)).toBe(
      i.pictureChoices!.find((c) => c.value === wrong)!.label,
    );
  });
  it("renders matching atlas cells and precise vector shapes, including orange as a colour", () => {
    for (const w of media.words) {
      if ("atlas" in w) {
        const a = media.atlases.find((a) => a.id === w.atlas)!;
        expect(w.crop).toHaveLength(4);
        expect(w.crop![0]).toBeGreaterThanOrEqual(0);
        expect(w.crop![1]).toBeGreaterThanOrEqual(0);
        expect(w.crop![0] + w.crop![2]).toBeLessThanOrEqual(a.coordinateSpace);
        expect(w.crop![1] + w.crop![3]).toBeLessThanOrEqual(a.coordinateSpace);
      }
      const html = renderToStaticMarkup(<WordPicture id={w.id} />);
      expect(html).toContain(w.meaning);
      expect(html).not.toContain("word-picture-missing");
      if ("atlas" in w) expect(html).toContain('clip-path="url(#');
    }
    const colour = renderToStaticMarkup(
      <WordPicture id="colours-shapes.orange" />,
    );
    expect(colour).toContain("#F39829");
    expect(colour).not.toContain("background-image");
  });
  it("keeps visible choices as pictures until saved and does not show technical answer IDs", () => {
    const i = items[0],
      html = renderToStaticMarkup(
        <PictureChoice exercise={publicExercise(i)} value={i.choices![0]} />,
      );
    expect(html).toContain("word-picture");
    expect(html).toContain("visually-hidden");
    expect(html).not.toContain("picture-choice-label");
    expect(html).not.toContain(i.choices![0]);
  });
  it("does not disclose a word picture or meaning while its study deck is closed", () => {
    const html = renderToStaticMarkup(
      <PictureWordDeck
        words={vocabularyRelease.themes[0].words}
        childId="disposable"
      />,
    );
    expect(html).not.toContain("/pictures/words/");
    expect(html).not.toContain(">cat<");
    expect(html).not.toContain(">猫<");
  });
});
