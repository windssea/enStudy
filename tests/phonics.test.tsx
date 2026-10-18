import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  phonicsRelease as release,
  gradeAnswer,
  publicExercise,
  courseCatalog,
  vocabularyRelease,
} from "../packages/server/exercises";
import {
  validPhonicsWord,
  phonicsGroupLabel,
} from "../packages/domain/phonics";
import { structuredCanonical } from "../packages/domain/structured";
import {
  selectTopicItems,
  selectReviewItems,
} from "../packages/domain/selection";
import { sentenceKey } from "../packages/domain/exposure";
import {
  disclosureCheckKeys,
  wordExampleKeys,
} from "../packages/server/exposure";
import audio from "../public/content/phonics-audio.v1.json";
import preserved from "./fixtures/phonics.v1-hashes.json";
import { parseRoute } from "../src/routes";
import PhonicsCentre from "../src/PhonicsCentre";
import PhonicsWorkbench from "../src/PhonicsWorkbench";
import {
  freshOffline,
  queueOffline,
  offlineAnswerText,
} from "../src/offlineModel";
import type { OfflinePack } from "../packages/contracts/index";
const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url));
const word = (id: string) =>
  release.stages.flatMap((s) => s.demos).find((w) => w.id === id)!;
const build = release.items.find(
  (i) => i.phonicsWordId === "cat" && i.type === "order",
)!;
describe("authored phonics and meaning-parts route", () => {
  it("preserves applied publications and previous writing/course migrations", () => {
    for (const [path, hash] of Object.entries(preserved))
      expect(
        createHash("sha256")
          .update(read(path).toString("utf8").replaceAll("\r\n", "\n"))
          .digest("hex"),
        path,
      ).toBe(hash);
  });
  it("keeps 288 core lessons separate from six additional practice stages", () => {
    expect(courseCatalog.lessons).toHaveLength(288);
    expect(release.stages).toHaveLength(6);
    expect(release.items).toHaveLength(240);
    expect(new Set(release.items.map((i) => i.family)).size).toBe(120);
    for (const s of release.stages) {
      const items = release.items.filter((i) => i.phonicsStageId === s.id);
      expect(items).toHaveLength(40);
      expect(items.filter((i) => i.type === "listen")).toHaveLength(20);
      expect(new Set(items.map((i) => i.family)).size).toBe(20);
      expect(s.roundSizes).toEqual([5, 10, 20]);
      expect(s.demos.every(validPhonicsWord)).toBe(true);
    }
    const demos = release.stages.flatMap((s) => s.demos.map((w) => w.word));
    expect(new Set(demos).size).toBe(25);
    expect(release.items.some((i) => demos.includes(i.phonicsWordId!))).toBe(
      false,
    );
  });
  it("verifies every authored answer using its actual payload and distinct alternatives", () => {
    for (const i of release.items) {
      expect(
        gradeAnswer(i, i.graphemeTokens ? i.orderedTokens! : i.answers[0]),
        i.id,
      ).toBe(true);
      expect(
        gradeAnswer(
          i,
          i.graphemeTokens ? [...i.orderedTokens!].reverse() : "not-an-answer",
        ),
        i.id,
      ).toBe(false);
      if (i.choices) {
        expect(new Set(i.choices).size).toBe(3);
        expect(i.choices.filter((c) => gradeAnswer(i, c))).toEqual(i.answers);
      }
      for (const key of [
        "answers",
        "orderedTokens",
        "solutionSentences",
        "hint",
        "explanation",
        "family",
        "skill",
      ])
        expect(publicExercise(i), i.id).not.toHaveProperty(key);
    }
  });
  it("requires the complete token bag and joins graphemes without sentence spaces", () => {
    expect(structuredCanonical(build, ["c", "a", "t"])).toBe('"cat"');
    for (const invalid of [
      "cat",
      ["c", "a"],
      ["c", "a", "a"],
      ["c", "a", "t", "t"],
      ["cat"],
    ])
      expect(structuredCanonical(build, invalid)).toBeNull();
    expect(gradeAnswer(build, ["a", "c", "t"])).toBe(false);
    const moon = release.items.find(
      (i) => i.phonicsWordId === "moon" && i.graphemeTokens,
    )!;
    expect(gradeAnswer(moon, ["m", "oo", "n"])).toBe(true);
    expect(gradeAnswer(moon, ["m", "o", "o", "n"])).toBe(false);
    expect(offlineAnswerText(publicExercise(build), ["c", "a", "t"])).toBe(
      "cat",
    );
  });
  it("preserves split vowel partners and distinguishes meaning blocks from phonemes", () => {
    const late = word("late");
    expect(late.groups).toEqual([[0], [1, 3], [2]]);
    expect(phonicsGroupLabel(late, late.groups[1])).toBe("a_e");
    expect(word("shed").tiles).toEqual(["sh", "e", "d"]);
    expect(word("drum").groups).toHaveLength(4);
    expect(release.stages.at(-1)!.kind).toBe("meaning");
    expect(word("sunflower").tiles).toEqual(["sun", "flower"]);
    expect(release.stages.at(-1)!.rule).toContain("不是音素数或音节数");
    expect(validPhonicsWord({ ...late, groups: [[0], [1, 1], [2]] })).toBe(
      false,
    );
  });
  it("draws distinct word families and avoids recent families while fresh ones remain", () => {
    for (const stage of release.stages) {
      const bank = release.items.filter((i) => i.phonicsStageId === stage.id);
      const first = selectTopicItems(bank, new Set(), 5, () => 0.42);
      const recent = new Set(first.map((i) => i.family!));
      const next = selectTopicItems(bank, recent, 10, () => 0.67);
      expect(next.some((i) => recent.has(i.family!))).toBe(false);
      for (const size of [5, 10, 20]) {
        const round = selectTopicItems(bank, recent, size, () => 0.24);
        expect(round).toHaveLength(size);
        expect(new Set(round.map((i) => i.family)).size).toBe(size);
      }
    }
  });
  it("uses shared due-review selection without treating another task type as a new word", () => {
    const choices = release.items.filter(
      (i) => i.skill === build.skill && i.modality === build.modality,
    );
    const reviews = selectReviewItems(
      [
        {
          skillId: build.skill,
          modality: build.modality,
          dueAt: 1,
          lastFamily: build.family,
        },
      ],
      choices,
      2,
    );
    expect(reviews).toHaveLength(1);
    expect(reviews[0].family).not.toBe(build.family);
  });
  it("reads historic vocabulary demonstration aliases and word disclosures across entry points", () => {
    // Old vocabulary views wrote example/family keys rather than sentence:cat.
    const cat = vocabularyRelease.themes
      .flatMap((t) => t.words)
      .find((w) => w.word === "cat")!;
    const keys = disclosureCheckKeys(build);
    expect(keys).toContain(sentenceKey("cat"));
    for (const key of wordExampleKeys(cat.id)) expect(keys).toContain(key);
  });
  it("checks all 145 pinned WAV bytes, headers, duration and numeric audio data without claiming a listening review", () => {
    expect(audio.kind).toBe("synthetic-whole-word");
    expect(audio.items).toHaveLength(145);
    expect(new Set(audio.items.map((i) => i.word)).size).toBe(145);
    for (const item of audio.items) {
      const b = read("public" + item.url);
      expect(createHash("sha256").update(b).digest("hex"), item.word).toBe(
        item.sha256,
      );
      expect(b.byteLength).toBe(item.bytes);
      expect(b.toString("ascii", 0, 4)).toBe("RIFF");
      expect(b.toString("ascii", 8, 12)).toBe("WAVE");
      expect(b.readUInt16LE(22)).toBe(1);
      expect(b.readUInt16LE(34)).toBe(16);
      expect(item.duration).toBeGreaterThan(0.1);
      expect(item.duration).toBeLessThan(6);
      expect(item.rms).toBeGreaterThan(0.005);
      expect(item.peak).toBeLessThan(1);
    }
    expect(read("public/audio/phonics/NOTICE.txt").toString()).toContain(
      audio.model.revision,
    );
  });
  it("keeps token validity in the existing private offline queue", () => {
    const now = Date.now(),
      pack: OfflinePack = {
        schema: 1,
        id: "pack",
        householdId: "family",
        childId: "child",
        nickname: "小星",
        preparedAt: now,
        expiresAt: now + 10000,
        sessionId: "session",
        leaseId: "lease",
        leaseVersion: 0,
        source: "phonics",
        items: [
          { assignmentId: "a", position: 1, exercise: publicExercise(build) },
        ],
      };
    expect(() =>
      queueOffline(
        { ...freshOffline(pack), draft: { answer: ["c", "a"] } },
        now,
        "e",
        "a",
      ),
    ).toThrow();
    expect(
      queueOffline(
        { ...freshOffline(pack), draft: { answer: ["c", "a", "t"] } },
        now,
        "e",
        "a",
      ).entries[0].answer,
    ).toEqual(["c", "a", "t"]);
  });
  it("offers six native stage buttons, a selected route and an honest Chinese no-profile state", () => {
    expect(parseRoute("#phonics=split-vowels")).toMatchObject({
      view: "phonics",
      phonicsStageId: "split-vowels",
    });
    expect(parseRoute("#phonics=%E0%A4%A")).toMatchObject({ view: "phonics" });
    const html = renderToStaticMarkup(
      createElement(PhonicsCentre, {
        busy: false,
        initialStageId: "split-vowels",
        onBack() {},
        onBrowse() {},
        onStart() {},
        onParent() {},
      }),
    );
    expect(html.match(/class="phonics-stage"/g)).toHaveLength(6);
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("选择探险档案");
    expect(html).not.toContain("phonics-demo-choices");
    const studio = renderToStaticMarkup(
      createElement(PhonicsWorkbench, { word: word("late"), kind: "sound" }),
    );
    expect(studio).toContain("a_e");
    expect(studio).toContain('aria-pressed="true"');
    expect(studio).toContain("不是逐个纯音素录音");
  });
});
