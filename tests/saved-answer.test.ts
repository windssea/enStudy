import { describe, it, expect } from "vitest";
import type { Exercise } from "../packages/contracts/index";
import { restoreStoredAnswer } from "../packages/domain/structured";
const base: Exercise = {
  id: "saved",
  title: "回看",
  category: "grammar",
  context: "情景",
  prompt: "___",
  gradeMin: 1,
  type: "input",
};
describe("restoring the learner's saved response without revealing a solution", () => {
  it("matches original choice labels, including capital letters, and preserves an incorrect selection", () => {
    for (const type of ["choice", "listen"] as const) {
      const item = { ...base, type, choices: ["We", "They"] };
      expect(restoreStoredAnswer(item, "we")).toBe("We");
      expect(restoreStoredAnswer(item, "they")).toBe("They");
    }
  });
  it("restores typed, repaired and evidence answers in the shapes expected by their public controls", () => {
    expect(restoreStoredAnswer(base, "is not")).toBe("is not");
    expect(
      restoreStoredAnswer(
        {
          ...base,
          type: "repair",
          editing: { parts: [{ id: "p1", text: "is" }] },
        },
        ["p1", "are"],
      ),
    ).toEqual(["p1", "are"]);
    expect(
      restoreStoredAnswer(
        {
          ...base,
          type: "evidence",
          passage: [{ id: "s1", text: "A blue kite." }],
          choices: ["Blue", "Red"],
        },
        ["s1", "red"],
      ),
    ).toEqual(["s1", "Red"]);
  });
  it("reconstructs saved classifications rather than displaying internal pair arrays", () => {
    const item: Exercise = {
      ...base,
      type: "sort",
      sorting: {
        cards: [
          { id: "c1", text: "cat" },
          { id: "c2", text: "cats" },
        ],
        groups: [
          { id: "one", label: "一个" },
          { id: "many", label: "多个" },
        ],
      },
    };
    expect(
      restoreStoredAnswer(item, [
        ["c2", "one"],
        ["c1", "many"],
      ]),
    ).toEqual(["c2=one", "c1=many"]);
  });
  it("reconstructs ordered tokens with duplicate words and multiword cards", () => {
    expect(
      restoreStoredAnswer(
        { ...base, type: "order", tokens: ["like", "I", "I", "blue kites"] },
        "i i like blue kites",
      ),
    ).toEqual(["I", "I", "like", "blue kites"]);
  });
  it("respects punctuation joins and repeated letters in spelling blocks", () => {
    expect(
      restoreStoredAnswer(
        {
          ...base,
          type: "order",
          punctuationTokens: true,
          tokens: ["a paper plane", ".", "made", "We"],
        },
        "we made a paper plane.",
      ),
    ).toEqual(["We", "made", "a paper plane", "."]);
    expect(
      restoreStoredAnswer(
        {
          ...base,
          type: "order",
          graphemeTokens: true,
          tokens: ["t", "e", "r", "l", "e", "t"],
        },
        "letter",
      ),
    ).toEqual(["l", "e", "t", "t", "e", "r"]);
  });
  it("does not invent selections for unrepresentable or malformed historical content", () => {
    expect(
      restoreStoredAnswer(
        { ...base, type: "order", tokens: ["cat", "dog"] },
        "unknown word",
      ),
    ).toEqual([]);
    expect(
      restoreStoredAnswer(
        {
          ...base,
          type: "repair",
          editing: { parts: [{ id: "p1", text: "is" }] },
        },
        ["foreign", "are"],
      ),
    ).toEqual([]);
    expect(restoreStoredAnswer(base, [["private", "pair"]])).toBe("");
  });
});
