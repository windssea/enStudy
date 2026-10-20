import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import source from "../content/ket/source-2025.v1.json";
import data from "../content/ket/words.v1.json";
import { ketRelease, searchKetWords } from "../packages/domain/ketVocabulary";
import {
  gradeAnswer,
  publicExercise,
  vocabularyRelease,
  vocabularyCatalog,
  exerciseVersion,
} from "../packages/server/exercises";
import { selectTopicItems } from "../packages/domain/selection";
import {
  wordExampleKeys,
  wordPreview,
  disclosureCheckKeys,
} from "../packages/server/exposure";
import KetVocabulary from "../src/KetVocabulary";
import WordTraining from "../src/WordTraining";
import { readFileSync } from "node:fs";

describe("auditable KET 2025 vocabulary", () => {
  it("maps every official alphabetical row, merging only repeated headwords", () => {
    expect(source.edition).toBe("August 2025");
    expect(source.rows).toHaveLength(1727);
    const alphabetical = data.words.filter((w) => w.section === "alphabet");
    expect(alphabetical).toHaveLength(1725);
    expect(new Set(alphabetical.map((w) => w.headword))).toEqual(
      new Set(source.rows.map((r) => r.headword)),
    );
    for (const row of source.rows) {
      const word = alphabetical.find((w) => w.headword === row.headword)!;
      expect(word.pages).toContain(row.page);
      expect(word.meaning.length).toBeGreaterThan(0);
      expect(word.example.length).toBeGreaterThan(12);
    }
    expect(source.rows.filter((r) => r.headword === "coat")).toHaveLength(2);
    expect(source.rows.filter((r) => r.headword === "visit")).toHaveLength(2);
    expect(ketRelease.source.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
  it("covers the explicitly bounded appendix sets with valid number forms", () => {
    const byHead = (section: string, n: number) =>
      data.words.find((w) => w.section === section && w.headword === String(n));
    for (let n = 2; n <= 1000; n++) expect(byHead("numbers", n)).toBeDefined();
    for (let n = 3; n <= 31; n++) expect(byHead("ordinals", n)).toBeDefined();
    for (const word of [
      "one",
      "first",
      "second",
      ..."Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December spring summer autumn winter".split(
        " ",
      ),
    ])
      expect(data.words.some((w) => w.word === word)).toBe(true);
    expect(byHead("numbers", 40)?.word).toBe("forty");
    expect(byHead("numbers", 101)?.word).toBe("one hundred and one");
    expect(byHead("numbers", 1000)?.word).toBe("one thousand");
    expect(byHead("ordinals", 12)?.word).toBe("twelfth");
    expect(byHead("ordinals", 20)?.word).toBe("twentieth");
    expect(byHead("ordinals", 31)?.word).toBe("thirty-first");
    for (const continent of [
      "Africa",
      "Antarctica",
      "Asia",
      "Australia",
      "Europe",
      "North America",
      "South America",
    ])
      expect(data.words.some((w) => w.word === continent)).toBe(true);
    expect(data.words).toHaveLength(2784);
  });
  it("keeps historical vocabulary versions while registering new immutable items", () => {
    expect(vocabularyRelease.totalWords).toBe(360);
    expect(vocabularyRelease.items).toHaveLength(1620);
    expect(vocabularyCatalog.totalWords).toBe(3144);
    expect(vocabularyCatalog.totalItems).toBe(7188);
    expect(new Set(vocabularyCatalog.items.map((i) => i.id)).size).toBe(7188);
    for (const item of ketRelease.items)
      expect(exerciseVersion(item.id, 1)).toBe(item);
    const migration = readFileSync(
      "migrations/0050_ket_vocabulary_2025_v1.sql",
      "utf8",
    );
    expect(migration).not.toMatch(/^\s*(?:UPDATE|DELETE|DROP|ALTER)\s/im);
    expect(migration).toContain(ketRelease.id);
  });
  it("makes every group large enough for a unique twenty-word draw in either mode", () => {
    expect(ketRelease.themes).toHaveLength(71);
    for (const theme of ketRelease.themes) {
      expect(theme.wordCount).toBeGreaterThanOrEqual(20);
      expect(theme.wordCount).toBeLessThanOrEqual(40);
      expect(theme.grade).toBe(0);
      expect(theme.modes).toEqual(["mixed", "meaning", "spelling"]);
      for (const mode of ["mixed", "meaning", "spelling"]) {
        const pool = ketRelease.items.filter(
          (i) =>
            i.wordThemeId === theme.id &&
            (mode === "mixed" || i.wordMode === mode),
        );
        const drawn = selectTopicItems(pool, new Set(), 20, () => 0.37);
        expect(drawn).toHaveLength(20);
        expect(new Set(drawn.map((i) => i.wordId)).size).toBe(20);
      }
    }
  });
  it("has unambiguous exact grading keys, and keeps quiz keys out of public exercises", () => {
    for (const item of ketRelease.items) {
      expect(gradeAnswer(item, item.answers[0])).toBe(true);
      expect(gradeAnswer(item, "not-a-ket-answer")).toBe(false);
      expect(publicExercise(item)).not.toHaveProperty("answers");
      expect(publicExercise(item)).not.toHaveProperty("hint");
      if (item.wordMode === "meaning") {
        expect(new Set(item.choices).size).toBe(3);
        expect(item.choices!.filter((c) => gradeAnswer(item, c))).toHaveLength(
          1,
        );
      } else expect(item).not.toHaveProperty("reading");
    }
    for (const [headword, accepted] of [
      ["grey", "gray"],
      ["jewellery", "jewelry"],
      ["driving/driver’s licence", "driver's license"],
      ["yog(h)urt", "yogurt"],
      ["favourite", "favorite"],
      ["centimetre/centimeter (cm)", "centimeter"],
    ]) {
      const word = data.words.find((w) => w.headword === headword)!;
      const item = ketRelease.items.find(
        (i) => i.wordId === word.id && i.wordMode === "spelling",
      )!;
      expect(gradeAnswer(item, accepted)).toBe(true);
    }
    const item = ketRelease.items.find(
      (i) => i.wordId === "ket.n0101" && i.wordMode === "spelling",
    )!;
    expect(gradeAnswer(item, "one hundred one")).toBe(true);
    expect(gradeAnswer(item, "one hundred and two")).toBe(false);
  });
  it("keeps constrained senses distinct and records a viewed card across its modes", () => {
    const smart = data.words.filter((w) => w.headword.startsWith("smart ("));
    expect(smart).toHaveLength(2);
    expect(new Set(smart.map((w) => w.meaning)).size).toBe(2);
    for (const word of smart) {
      expect(wordPreview(word.id)?.example).toBe(word.example);
      const keys = wordExampleKeys(word.id);
      for (const item of ketRelease.items.filter((i) => i.wordId === word.id))
        expect(
          disclosureCheckKeys(item).some((key) => keys.includes(key)),
        ).toBe(true);
    }
    expect(data.words.find((w) => w.headword === "chips")?.meaning).toBe(
      "炸薯条（英式用语）",
    );
  });
  it("searches across groups and variants, with stable bounded pages", () => {
    const apple = searchKetWords("apple");
    expect(apple.results[0].word.word).toBe("apple");
    expect(
      searchKetWords("gray").results.some((r) => r.word.word === "grey"),
    ).toBe(true);
    expect(
      searchKetWords("草莓").results.some((r) => r.word.word === "strawberry"),
    ).toBe(true);
    expect(searchKetWords("不存在的词").total).toBe(0);
    const a = searchKetWords("", 0),
      b = searchKetWords("", 24);
    expect(a.total).toBe(2784);
    expect(a.results).toHaveLength(24);
    expect(
      a.results.some((x) => b.results.some((y) => x.word.id === y.word.id)),
    ).toBe(false);
    expect(
      a.results.every((r) =>
        ketRelease.themes.some(
          (t) => t.id === r.themeId && t.words.some((w) => w.id === r.word.id),
        ),
      ),
    ).toBe(true);
  });
  it("renders a compact paginated picker without hidden quiz content or grade labels", () => {
    const html = renderToStaticMarkup(
      createElement(KetVocabulary, {
        themes: ketRelease.themes,
        busy: false,
        onChoose: () => {},
      }),
    );
    expect((html.match(/class="ket-group"/g) || []).length).toBe(12);
    expect(html).toContain("找单词");
    expect(html).toContain("首字母");
    expect(html).toContain("2784");
    expect(html).not.toContain("零年级");
    expect(html).not.toContain("听提示");
    expect(html).not.toContain("<canvas");
  });
  it("does not advertise unsupported listening or context in the KET mixed mode", () => {
    const html = renderToStaticMarkup(
      createElement(WordTraining, {
        themes: ketRelease.themes,
        grade: 3,
        selectedId: ketRelease.themes[0].id,
        busy: false,
        onSelect: () => {},
        onStart: () => {},
        onReview: () => {},
        onResume: () => {},
      }),
    );
    expect(html).toContain("认词义与拼写交替练");
    expect(html).not.toContain("听词、词义、拼写与语境");
  });
});
