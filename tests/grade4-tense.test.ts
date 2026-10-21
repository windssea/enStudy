import { describe, expect, it } from "vitest";
import {
  courseCatalog,
  grade4TenseRelease as release,
  gradeAnswer,
  publicExercise,
  exerciseVersion,
  topicCatalog,
  topicRelease,
  topicPublicationReleases,
} from "../packages/server/exercises";
import {
  irregularVerbs,
  irregularPage,
  grade4PracticeTopics,
} from "../packages/domain/irregularVerbs";
import {
  irregularExampleKeys,
  disclosureCheckKeys,
  lessonExampleKeys,
} from "../packages/server/exposure";
import { selectTopicItems } from "../packages/domain/selection";
import originalTopics from "../content/topic-release.v1.json";

describe("P4 tense teaching and irregular-verb practice", () => {
  it("enriches 28 tense lessons while preserving 48 P4 lessons and all nine-task course assignments", () => {
    expect(courseCatalog.lessons.filter((l) => l.grade === 4)).toHaveLength(48);
    expect(release.lessons).toHaveLength(28);
    for (const l of release.lessons) {
      expect(l.version).toBeGreaterThanOrEqual(2);
      expect(l.grade).toBe(4);
      expect(l.cards).toHaveLength(5);
      expect(grade4PracticeTopics(l.id).length).toBeGreaterThan(0);
      expect(
        courseCatalog.items.filter((i) => i.lessonId === l.id),
      ).toHaveLength(9);
      expect(lessonExampleKeys(l.id)).toHaveLength(5);
      expect(courseCatalog.lessons.find((x) => x.id === l.id)).toEqual(l);
    }
  });
  it("keeps original topics and item keys available alongside four additive banks", () => {
    expect(topicRelease.items).toEqual(originalTopics.items);
    expect(Object.keys(topicCatalog.stats)).toHaveLength(64);
    expect(topicPublicationReleases("grammar.be")).toEqual(["topic-bank-v1"]);
    expect(topicPublicationReleases("forms.irregular-past.core")).toEqual(
      release.releases,
    );
    expect(topicPublicationReleases("unknown")).toEqual([]);
    expect(release.items).toHaveLength(840);
    expect(new Set(release.items.map((i) => i.skill)).size).toBe(180);
    expect(new Set(release.items.map((i) => i.id)).size).toBe(840);
    for (const item of release.items) {
      expect(exerciseVersion(item.id, item.version ?? 1)).toBe(item);
      if (item.version && item.version > 1) {
        const old = exerciseVersion(item.id, 1)!;
        expect(old.family).toBe(item.family);
        expect(old.answers).toEqual(item.answers);
        if (item.topicId?.endsWith(".did") || item.id.includes(".restore."))
          expect(old.wordFormCue?.word).toBe(item.answers[0]);
      }
      expect(gradeAnswer(item, item.answers[0]), item.id).toBe(true);
      const visible = publicExercise(item);
      expect(visible).not.toHaveProperty("answers");
      expect(visible).not.toHaveProperty("hint");
      if (item.choices) {
        expect(new Set(item.choices).size).toBe(3);
        expect(item.choices.filter((a) => gradeAnswer(item, a))).toHaveLength(
          1,
        );
      }
    }
    for (const [topic, stats] of Object.entries(release.stats)) {
      const rows = release.items.filter((i) => i.topicId === topic);
      expect(new Set(rows.map((i) => i.family)).size).toBe(stats.families);
      const first = selectTopicItems(rows, new Set(), 20, () => 0.3),
        seen = new Set(first.map((i) => i.family!));
      const second = selectTopicItems(rows, seen, 20, () => 0.3);
      expect(first).toHaveLength(20);
      expect(new Set(first.map((i) => i.family)).size).toBe(20);
      expect(second.every((i) => !seen.has(i.family!))).toBe(true);
    }
  });
  it("distinguishes ate/eaten and did+eat, accepts gotten only in the participle slot", () => {
    const item = (word: string, dimension: string) =>
      release.items.find(
        (i) =>
          i.id ===
          `g4.forms.irregular-past.participle.${word}.${dimension}.input`,
      )!;
    expect(gradeAnswer(item("eat", "past"), "eaten")).toBe(false);
    expect(gradeAnswer(item("eat", "participle"), "ate")).toBe(false);
    expect(gradeAnswer(item("get", "participle"), "gotten")).toBe(true);
    expect(gradeAnswer(item("get", "past"), "gotten")).toBe(false);
    for (const i of release.items.filter((i) => i.topicId?.endsWith(".did"))) {
      expect(i.wordFormCue?.word).toBe(
        irregularVerbs.find((w) => w.base === i.answers[0])?.past,
      );
      expect(i.wordFormCue?.instruction).not.toContain("原形");
      expect(i.prompt).not.toContain(`（${i.answers[0]}）`);
      expect(i.prompt).not.toMatch(/Did you ___.*（be）/);
    }
  });
  it("groups 60 words by actual spelling and retains the read pronunciation exception", () => {
    expect(irregularVerbs).toHaveLength(60);
    expect(new Set(irregularVerbs.map((w) => w.base)).size).toBe(60);
    for (const w of irregularVerbs) {
      if (w.group === "AAA")
        expect(new Set([w.base, w.past, w.participle]).size).toBe(1);
      if (w.group === "ABB") {
        expect(w.past).toBe(w.participle);
        expect(w.base).not.toBe(w.past);
      }
      if (w.group === "ABA") {
        expect(w.base).toBe(w.participle);
        expect(w.past).not.toBe(w.base);
      }
      if (w.group === "ABC")
        expect(new Set([w.base, w.past, w.participle]).size).toBe(3);
    }
    expect(irregularVerbs.find((w) => w.base === "read")?.note).toContain(
      "/red/",
    );
    expect(irregularPage("all", 5).words.at(-1)?.base).toBe("catch");
    expect(irregularPage("all", 6).words).toHaveLength(0);
    expect(irregularPage("all", 0, "core").total).toBe(30);
    expect(irregularPage("all", 0, "extended").words[0].base).toBe("begin");
  });
  it("records only shown word families and cannot turn table viewing into independent mastery", () => {
    const words = irregularPage("all", 0).words,
      keys = new Set(irregularExampleKeys(words));
    const go = release.items.find(
      (i) => i.id === "g4.forms.irregular-past.core.go.form.input",
    )!;
    const catchRow = release.items.find(
      (i) => i.id === "g4.forms.irregular-past.extended.catch.form.input",
    )!;
    expect(disclosureCheckKeys(go).some((k) => keys.has(k))).toBe(true);
    expect(disclosureCheckKeys(catchRow).some((k) => keys.has(k))).toBe(false);
    const course = courseCatalog.items.find(
      (i) =>
        i.lessonId?.startsWith("P4") &&
        i.skill.startsWith("grammar.past-simple") &&
        i.answers[0] === "ate",
    )!;
    expect(course).toBeDefined();
    expect(disclosureCheckKeys(course).some((k) => keys.has(k))).toBe(true);
    expect(irregularExampleKeys(words)).toContain(
      "sentence:i went to the park yesterday",
    );
  });
});
