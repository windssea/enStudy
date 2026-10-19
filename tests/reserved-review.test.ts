import { describe, it, expect } from "vitest";
import original from "../content/training-reserved-release.v1.json";
import {
  exerciseVersion,
  gradeAnswer,
  publicExercise,
  reservedTrainingRelease,
  type PrivateExercise,
} from "../packages/server/exercises";
import { answerExposureKeys, sentenceKey } from "../packages/domain/exposure";
import {
  drawReservedTraining,
  trainingExposureKeys,
} from "../packages/domain/training";
const bank = reservedTrainingRelease;
describe("reviewed dedicated materials keep immutable history and fair answer boundaries", () => {
  it("corrects the observed Chinese bookshop scene without replacing its original task or family", () => {
    const item = bank.items.find(
      (i) => i.id === "reserved.grammar.be.negative.6",
    )!;
    expect(item.prompt).toContain("Owen现在不在书店");
    expect(item.prompt).toContain("at the bookshop");
    const prior = exerciseVersion(item.id, 1)!;
    expect(prior.prompt).toContain("现在不在活动室");
    expect(prior.family).toBe(item.family);
    expect(item.version).toBe(2);
    expect(bank.items).toHaveLength(1560);
    expect(
      bank.items.filter(
        (i) => i.version === 2 && !i.topicId?.startsWith("forms."),
      ),
    ).toHaveLength(373);
  });
  it("makes sentence-selection tasks answerable with public choices and protects their whole-sentence evidence", () => {
    for (const item of bank.items.filter(
      (i) =>
        i.topicId === "grammar.frequency" &&
        i.trainingDimension === "be-position",
    )) {
      expect(item.type).toBe("choice");
      expect(item.modality).toBe("recognition");
      expect(item.choices).toHaveLength(3);
      expect(item.choices!.filter((c) => gradeAnswer(item, c))).toHaveLength(1);
      expect(answerExposureKeys(item)).toContain(sentenceKey(item.answers[0]));
      expect(publicExercise(item)).not.toHaveProperty("solutionSentences");
    }
  });
  it("accepts specified equivalent affirmative forms while keeping prohibition different from no obligation", () => {
    const item = (d: string) =>
      bank.items.find(
        (i) => i.topicId === "grammar.modals" && i.trainingDimension === d,
      )!;
    for (const value of ["can", "is able to"])
      expect(gradeAnswer(item("ability"), value)).toBe(true);
    for (const value of ["should", "ought to"])
      expect(gradeAnswer(item("advice"), value)).toBe(true);
    for (const value of ["must", "has to", "has got to"])
      expect(gradeAnswer(item("rule"), value)).toBe(true);
    expect(gradeAnswer(item("prohibition"), "does not have to")).toBe(false);
    expect(gradeAnswer(item("prohibition"), "mustn't")).toBe(true);
  });
  it("accepts both stated possessive styles without corrupting other names or historical stored keys", () => {
    const item = bank.items.find(
      (i) => i.id === "reserved.grammar.possession.name.3",
    )!;
    expect(gradeAnswer(item, "Iris's")).toBe(true);
    expect(gradeAnswer(item, "Iris’")).toBe(true);
    expect(gradeAnswer(item, "Iriss")).toBe(false);
    expect(exerciseVersion(item.id, 1)!.answers).toEqual(["Iris's"]);
  });
  it("does not relabel corrected wording as unseen material for a child already assigned the original families", () => {
    const seen = new Set(
      (original.items as unknown as PrivateExercise[])
        .filter((i) => i.topicId === "grammar.be")
        .flatMap(trainingExposureKeys),
    );
    expect(
      drawReservedTraining(
        bank.items.filter((i) => i.topicId === "grammar.be"),
        "diagnostic",
        seen,
        new Set(),
      ),
    ).toEqual([]);
  });
});
