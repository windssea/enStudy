import { describe, it, expect } from "vitest";
import {
  exercises,
  publicExercise,
  reservedTrainingRelease,
  topicRelease,
} from "../packages/server/exercises";
import {
  drawReservedTraining,
  trainingExposureKeys,
  trainingSizes,
} from "../packages/domain/training";
import { disclosureCheckKeys } from "../packages/server/exposure";
import conceptExposure from "../content/concept-exposure-map.json";
const bank = reservedTrainingRelease;
describe("reserved controlled-text training materials", () => {
  it("states five dimensions for each of twenty-six authored topics and partitions all 1560 tasks", () => {
    expect(Object.keys(bank.blueprints)).toHaveLength(26);
    expect(bank.items).toHaveLength(1560);
    for (const [id, blueprint] of Object.entries(bank.blueprints)) {
      expect(blueprint.dimensions).toHaveLength(5);
      const items = bank.items.filter((i) => i.topicId === id);
      expect(new Set(items.map((i) => i.family)).size).toBe(60);
      for (const phase of [
        "diagnostic",
        "practice",
        "transfer",
        "retest",
      ] as const)
        expect(items.filter((i) => i.trainingPhase === phase)).toHaveLength(
          phase === "practice" || phase === "retest" ? 20 : 10,
        );
    }
  });
  it("supports a complete balanced cycle even after ordinary topic banks have all been assigned", () => {
    const original = new Set(topicRelease.items.flatMap(trainingExposureKeys));
    for (const id of Object.keys(bank.blueprints)) {
      const seen = new Set(original),
        used = new Set<string>(),
        items = bank.items.filter((i) => i.topicId === id);
      for (const phase of [
        "diagnostic",
        "practice",
        "transfer",
        "retest",
        "retest",
        "retest",
      ] as const) {
        const draw = drawReservedTraining(
          items,
          phase,
          seen,
          new Set(),
          () => 0.37,
        );
        expect(draw, id + phase).toHaveLength(trainingSizes[phase]);
        if (phase !== "practice")
          expect(new Set(draw.map((i) => i.trainingDimension)).size).toBe(5);
        for (const item of draw) {
          expect(used.has(item.family!)).toBe(false);
          used.add(item.family!);
          trainingExposureKeys(item).forEach((k) => seen.add(k));
        }
      }
      expect(used.size).toBe(35);
    }
  });
  it("does not hide an exhausted dimension by repeating other dimensions", () => {
    const items = bank.items.filter((i) => i.topicId === "grammar.be");
    const seen = new Set(
      items
        .filter((i) => i.trainingDimension === "i")
        .flatMap(trainingExposureKeys),
    );
    expect(drawReservedTraining(items, "diagnostic", seen, new Set())).toEqual(
      [],
    );
  });
  it("retains a complete balanced path after all current concept demonstrations, while excluding their word targets", () => {
    const teaching = new Set(Object.values(conceptExposure.entries).flat());
    for (const id of Object.keys(bank.blueprints)) {
      const candidates = bank.items.filter(
        (i) =>
          i.topicId === id &&
          !disclosureCheckKeys(i).some((k) => teaching.has(k)),
      );
      const seen = new Set<string>();
      for (const phase of [
        "diagnostic",
        "practice",
        "transfer",
        "retest",
        "retest",
        "retest",
      ] as const) {
        const draw = drawReservedTraining(
          candidates,
          phase,
          seen,
          new Set(),
          () => 0.28,
        );
        expect(draw, id + phase).toHaveLength(trainingSizes[phase]);
        draw.forEach((i) =>
          trainingExposureKeys(i).forEach((k) => seen.add(k)),
        );
      }
    }
  });
  it("focused practice never backfills with its own already selected families", () => {
    const items = bank.items.filter(
      (i) =>
        i.topicId === "grammar.be" &&
        i.trainingPhase === "practice" &&
        i.trainingDimension === "i",
    );
    const draw = drawReservedTraining(
      items,
      "practice",
      new Set(),
      new Set(items.map((i) => i.pattern!)),
    );
    expect(draw).toHaveLength(4);
    expect(new Set(draw.map((i) => i.family)).size).toBe(4);
  });
  it("recognizes the same completed sentence across a different task frame or release", () => {
    const original = bank.items.find((i) => i.topicId === "grammar.be")!;
    const other = {
      ...original,
      id: "other.source",
      family: "other.family",
      prompt: original.prompt.replace("___", original.answers[0]).toUpperCase(),
    };
    const keys = new Set(trainingExposureKeys(original));
    expect(trainingExposureKeys(other).some((k) => keys.has(k))).toBe(true);
  });
  it("keeps phase slots and private answers out of public question packets", () => {
    for (const item of bank.items) {
      const packet = publicExercise(item);
      for (const key of [
        "answers",
        "hint",
        "explanation",
        "trainingPhase",
        "trainingDimension",
        "solutionSentences",
      ])
        expect(packet).not.toHaveProperty(key);
    }
    expect(exercises.filter((i) => i.trainingPhase)).toHaveLength(1560);
  });
});
