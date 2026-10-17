import { describe, it, expect } from "vitest";
import {
  vocabularyRelease,
  wordThemes,
  publicExercise,
  gradeAnswer,
} from "../packages/server/exercises";
import { selectTopicItems } from "../packages/domain/selection";
describe("dedicated vocabulary training", () => {
  it("contains 360 sense entries across eighteen real themes and six years", () => {
    expect(vocabularyRelease.themes).toHaveLength(18);
    expect(vocabularyRelease.items).toHaveLength(1080);
    expect(vocabularyRelease.themes.flatMap((t) => t.words)).toHaveLength(360);
    expect(new Set(vocabularyRelease.items.map((i) => i.id)).size).toBe(1080);
    for (let grade = 1; grade <= 6; grade++)
      expect(wordThemes.filter((t) => t.grade === grade)).toHaveLength(3);
    expect(wordThemes.every((theme) => !Object.hasOwn(theme, "words"))).toBe(
      true,
    );
  });
  it("uses distinct evidence for meaning, spelling and context without leaking keys", () => {
    for (const item of vocabularyRelease.items) {
      expect(publicExercise(item)).not.toHaveProperty("answers");
      expect(publicExercise(item)).not.toHaveProperty("hint");
      expect(gradeAnswer(item, item.answers[0])).toBe(true);
      if (item.choices) {
        expect(new Set(item.choices).size).toBe(3);
        expect(
          item.choices.filter((choice) => gradeAnswer(item, choice)),
        ).toHaveLength(1);
      }
      expect(item.modality).toBe(
        item.wordMode === "meaning"
          ? "recognition"
          : item.wordMode === "spelling"
            ? "spelling"
            : "context-recognition",
      );
    }
  });
  it("supports 20 unique entries for every theme and mode", () => {
    for (const theme of wordThemes)
      for (const mode of ["mixed", "meaning", "spelling", "context"]) {
        const pool = vocabularyRelease.items.filter(
          (i) =>
            i.wordThemeId === theme.id &&
            (mode === "mixed" || i.wordMode === mode),
        );
        const draw = selectTopicItems(pool, new Set(), 20, () => 0.3);
        expect(draw).toHaveLength(20);
        expect(new Set(draw.map((i) => i.wordId)).size).toBe(20);
        expect(draw.every((i) => i.wordThemeId === theme.id)).toBe(true);
      }
  });
  it("distinguishes senses of the same spelling and accepts regional spellings", () => {
    const squares = vocabularyRelease.themes
      .flatMap((t) => t.words)
      .filter((w) => w.word === "square");
    expect(squares).toHaveLength(2);
    expect(new Set(squares.map((w) => w.id)).size).toBe(2);
    for (const [word, accepted] of [
      ["neighbour", "neighbor"],
      ["grey", "gray"],
      ["harbour", "harbor"],
      ["maths", "math"],
    ]) {
      const item = vocabularyRelease.items.find(
        (i) => i.wordMode === "spelling" && i.answers[0] === word,
      )!;
      expect(gradeAnswer(item, accepted)).toBe(true);
      expect(gradeAnswer(item, word + "x")).toBe(false);
    }
  });
  it("has real contextual examples and keeps spelling targets out of their prompts", () => {
    for (const theme of vocabularyRelease.themes)
      for (const word of theme.words) {
        expect(word.example).toContain(word.word);
        const item = vocabularyRelease.items.find(
          (i) => i.wordId === word.id && i.wordMode === "spelling",
        )!;
        expect(item.prompt.toLowerCase()).not.toContain(
          word.word.toLowerCase(),
        );
      }
  });
});
