import { describe, expect, it } from "vitest";
import reviewed from "../content/grade4-tense-concepts.v1.json";
import original from "../content/topic-release.v1.json";
import {
  exerciseVersion,
  topicCatalog,
  gradeAnswer,
  topicPublicationReleases,
} from "../packages/server/exercises";
describe("tense concepts use fair visible choices", () => {
  it("keeps all sixty facts and old input versions while publishing recognition tasks", () => {
    expect(reviewed.items).toHaveLength(60);
    for (const row of reviewed.items) {
      const old = exerciseVersion(row.id, 1)!;
      const current = exerciseVersion(row.id, 2)!;
      expect(old.type).toBe("input");
      expect(current.type).toBe("choice");
      expect(current.modality).toBe("recognition");
      expect(current.family).toBe(old.family);
      expect(current.skill).toBe(old.skill);
      expect(current.choices).toHaveLength(3);
      expect(
        current.choices!.filter((a) => gradeAnswer(current, a)),
      ).toHaveLength(1);
      expect(topicCatalog.items.find((i) => i.id === row.id)).toEqual(current);
      expect(topicPublicationReleases(row.topicId)).toContain(reviewed.id);
    }
  });
  it("does not change verb-form production or the original topic publication", () => {
    expect(exerciseVersion("bank.tense.past-contrast.1.input", 2)?.type).toBe(
      "input",
    );
    expect(
      exerciseVersion("bank.tense.present-contrast.1.input", 2)?.modality,
    ).toBe("controlled-production");
    expect(
      original.items
        .filter((i) => reviewed.items.some((r) => r.id === i.id))
        .every((i) => i.type === "input"),
    ).toBe(true);
    expect(topicCatalog.stats["tense.past-contrast"].families).toBe(60);
  });
  it("rejects false time meanings while preserving the expected contrast", () => {
    const row = exerciseVersion("bank.tense.past-contrast.37.input", 2)!;
    expect(gradeAnswer(row, "过去某时正在进行")).toBe(true);
    expect(gradeAnswer(row, "每天固定习惯")).toBe(false);
    expect(gradeAnswer(row, "明天的打算")).toBe(false);
  });
});
