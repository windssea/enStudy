import { describe, it, expect } from "vitest";
import previous from "../content/training-reserved-release.latest.json";
import extension from "../content/training-reserved-release.forms.latest.json";
import originalForms from "../content/training-reserved-release.forms.v1.json";
import {
  reservedTrainingRelease as catalog,
  gradeAnswer,
  publicExercise,
  exerciseVersion,
  type PrivateExercise,
} from "../packages/server/exercises";
const items = extension.items as PrivateExercise[];
const item = (topic: string, base: string) =>
  items.find((i) => i.topicId === topic && i.prompt.includes(base))!;
describe("reserved word-form practice", () => {
  it("adds all eight morphology topics without reinterpreting any previous item or edition", () => {
    expect(Object.keys(extension.blueprints).sort()).toEqual(
      [
        "forms.noun-plural",
        "forms.third-person",
        "forms.ing",
        "forms.regular-past",
        "forms.irregular-past",
        "forms.past-participle",
        "forms.comparison",
        "forms.derivation",
      ].sort(),
    );
    expect(items).toHaveLength(480);
    expect(new Set(items.map((i) => i.family)).size).toBe(480);
    expect(catalog.items.slice(0, previous.items.length)).toEqual(
      previous.items,
    );
    for (const topic of Object.keys(previous.blueprints)) {
      expect(catalog.blueprints[topic].editionId).toBe(previous.editionId);
      expect(catalog.blueprints[topic].revisionId).toBe(previous.revisionId);
      expect(catalog.blueprints[topic].releases).toEqual(previous.releases);
    }
    for (const topic of Object.keys(extension.blueprints))
      expect(catalog.blueprints[topic].releases).toEqual(extension.releases);
  });
  it.each(Object.keys(extension.blueprints))(
    "%s reserves five dimensions and different phase slots",
    (topic) => {
      const bank = items.filter((i) => i.topicId === topic);
      expect(bank.filter((i) => i.type === "choice")).toHaveLength(30);
      expect(bank.filter((i) => i.type === "input")).toHaveLength(30);
      for (const d of new Set(bank.map((i) => i.trainingDimension))) {
        const rows = bank.filter((i) => i.trainingDimension === d);
        expect(rows).toHaveLength(12);
        expect(
          rows.filter((i) => i.trainingPhase === "diagnostic"),
        ).toHaveLength(2);
        expect(rows.filter((i) => i.trainingPhase === "practice")).toHaveLength(
          4,
        );
        expect(rows.filter((i) => i.trainingPhase === "transfer")).toHaveLength(
          2,
        );
        expect(rows.filter((i) => i.trainingPhase === "retest")).toHaveLength(
          4,
        );
      }
    },
  );
  it("accepts every authored form, rejects every distractor and keeps answers private", () => {
    for (const i of items) {
      for (const a of i.answers)
        expect(gradeAnswer(i, a), i.id + " " + a).toBe(true);
      for (const c of i.choices ?? [])
        expect(gradeAnswer(i, c)).toBe(i.answers.includes(c));
      if (i.choices)
        expect(i.choices.filter((c) => gradeAnswer(i, c))).toHaveLength(1);
      expect(publicExercise(i)).not.toHaveProperty("answers");
      expect(publicExercise(i)).not.toHaveProperty("trainingDimension");
      expect(publicExercise(i)).not.toHaveProperty("trainingPhase");
      expect(i.context).toBe(
        i.type === "choice"
          ? "看看原词，选出变好的词。"
          : "看看原词，把变好的词写下来。",
      );
      expect(publicExercise(i).wordFormCue).toEqual(i.wordFormCue);
      expect(i.prompt).toContain(i.wordFormCue!.word);
    }
  });
  it("preserves every first version and the same families while adding child-facing cues", () => {
    for (const old of originalForms.items) {
      const current = items.find((i) => i.id === old.id)!;
      expect(exerciseVersion(old.id, 1)).toEqual(old);
      expect(exerciseVersion(old.id, 2)).toEqual(current);
      expect(current.family).toBe(old.family);
      expect(current.answers).toEqual(old.answers);
      expect(current.trainingPhase).toBe(old.trainingPhase);
      expect(current.trainingDimension).toBe(old.trainingDimension);
    }
    const did = items.find(
      (i) =>
        i.topicId === "forms.irregular-past" &&
        i.trainingDimension === "after-did",
    )!;
    expect(did.wordFormCue?.word).toBe("grew");
    expect(did.wordFormCue?.instruction).toBe("did后，用原形");
    expect(did.wordFormCue?.word).not.toBe(did.answers[0]);
  });
  it("keeps accepted spelling variants and f-ending exceptions fair", () => {
    for (const a of ["scarves", "scarfs"])
      expect(gradeAnswer(item("forms.noun-plural", "scarf"), a)).toBe(true);
    for (const a of ["people", "persons"])
      expect(gradeAnswer(item("forms.noun-plural", "person"), a)).toBe(true);
    for (const a of ["fish", "fishes"])
      expect(gradeAnswer(item("forms.noun-plural", "fish"), a)).toBe(true);
    expect(gradeAnswer(item("forms.noun-plural", "roof"), "roofs")).toBe(true);
    expect(gradeAnswer(item("forms.noun-plural", "roof"), "rooves")).toBe(
      false,
    );
  });
  it("distinguishes ie, silent e, dye and y spelling, allowing both queue variants", () => {
    for (const [base, answer] of [
      ["tie", "tying"],
      ["lie", "lying"],
      ["die", "dying"],
      ["dye", "dyeing"],
      ["study", "studying"],
      ["swim", "swimming"],
    ])
      expect(gradeAnswer(item("forms.ing", base), answer)).toBe(true);
    for (const a of ["queuing", "queueing"])
      expect(gradeAnswer(item("forms.ing", "queue"), a)).toBe(true);
    expect(gradeAnswer(item("forms.ing", "dye"), "dying")).toBe(false);
  });
  it("distinguishes ordinary past, participle and original form after did", () => {
    const past = items.find(
      (i) =>
        i.topicId === "forms.irregular-past" &&
        i.trainingDimension === "changed-vowel" &&
        i.prompt.includes("begin"),
    )!;
    const pp = item("forms.past-participle", "begin");
    expect(gradeAnswer(past, "began")).toBe(true);
    expect(gradeAnswer(past, "begun")).toBe(false);
    expect(gradeAnswer(pp, "begun")).toBe(true);
    expect(gradeAnswer(pp, "began")).toBe(false);
    const afterDid = items.find(
      (i) =>
        i.topicId === "forms.irregular-past" &&
        i.trainingDimension === "after-did" &&
        i.prompt.includes("grew"),
    )!;
    expect(gradeAnswer(afterDid, "grow")).toBe(true);
    expect(gradeAnswer(afterDid, "grew")).toBe(false);
    for (const topic of ["forms.irregular-past", "forms.past-participle"]) {
      const cost = item(topic, "cost");
      expect(cost.prompt).toContain("花费某金额");
      expect(gradeAnswer(cost, "cost")).toBe(true);
      expect(gradeAnswer(cost, "costed")).toBe(false);
    }
  });
  it("constrains comparison meanings without exposing the older/oldest target in the prompt", () => {
    const old = item("forms.comparison", "指定old");
    expect(old.prompt).toContain("物品年代");
    expect(old.prompt).not.toMatch(/older|oldest/);
    const far = item("forms.comparison", "指定far");
    for (const a of ["farthest", "furthest"])
      expect(gradeAnswer(far, a)).toBe(true);
    const long = item("forms.comparison", "指定beautiful");
    expect(long.prompt).toContain("用more或most");
    expect(gradeAnswer(long, "more beautiful")).toBe(true);
    expect(gradeAnswer(long, "beautifuler")).toBe(false);
    const colourful = item("forms.derivation", "多彩的");
    expect(gradeAnswer(colourful, "colourful")).toBe(true);
    expect(gradeAnswer(colourful, "colorful")).toBe(true);
  });
});
