import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createHash } from "node:crypto";
import {
  writingPrompts,
  writingPrompt,
  writingForLesson,
  blankWriting,
  writingContent,
  writingLimits,
  sameWriting,
  sameWritingText,
  writingSaveResult,
  writingText,
} from "../packages/domain/writing";
import type { WritingDraft } from "../packages/contracts/writing";
import { WritingPreview } from "../src/WritingWorkshop";
import { courseCatalog } from "../packages/server/exercises";
import { parseRoute } from "../src/routes";
import LessonView from "../src/LessonView";
import preserved from "./fixtures/writing-prompts.v1-hash.json";
vi.mock("../src/SceneStage", () => ({ default: () => null }));
const prompt = writingPrompt("writing.p6.project")!;
describe("private authored writing", () => {
  it("keeps version-one prompt contracts stable", () =>
    expect(
      createHash("sha256").update(JSON.stringify(writingPrompts)).digest("hex"),
    ).toBe(preserved.sha256));
  it("supports all grades with distinct guidance and real lesson bridges", () => {
    expect(writingPrompts.map((p) => p.grade)).toEqual([1, 2, 3, 4, 5, 6]);
    const lessons = new Set(courseCatalog.lessons.map((l) => l.id));
    for (const p of writingPrompts) {
      expect(p.sections).toHaveLength(3);
      expect(new Set(p.sections.map((s) => s.id)).size).toBe(3);
      expect(p.checklist).toHaveLength(3);
      expect(p.lessonIds.every((id) => lessons.has(id))).toBe(true);
      expect(blankWriting(p).paragraphs).toEqual(["", "", ""]);
    }
    expect(writingForLesson("P6B-U05-L2")?.id).toBe(prompt.id);
    expect(writingForLesson("P1A-U01-L1")).toBeUndefined();
  });
  it("validates actual field bounds, paragraph shape and declared self-checks", () => {
    const valid = {
      ...blankWriting(prompt),
      title: "我的模型 project",
      plan: "先用中文想一想\n再试英文",
      paragraphs: [
        "My project is about a paper city.",
        "The notes show two card bridges.",
        "We could test the labels later.",
      ],
      checks: ["revision", "structure"],
    };
    expect(writingContent(valid, prompt)).toEqual({
      ...valid,
      checks: ["revision", "structure"],
    });
    expect(
      writingContent(
        { ...valid, title: "x".repeat(writingLimits.title + 1) },
        prompt,
      ),
    ).toBeNull();
    expect(
      writingContent(
        { ...valid, plan: "中".repeat(writingLimits.plan + 1) },
        prompt,
      ),
    ).toBeNull();
    expect(
      writingContent(
        {
          ...valid,
          paragraphs: ["x".repeat(writingLimits.paragraph + 1), "", ""],
        },
        prompt,
      ),
    ).toBeNull();
    for (const paragraphs of [["one"], ["a", "b", null], ["a", {}, "c"]])
      expect(writingContent({ ...valid, paragraphs }, prompt)).toBeNull();
    expect(
      writingContent({ ...valid, checks: ["unknown"] }, prompt),
    ).toBeNull();
    expect(
      writingContent({ ...valid, checks: ["revision", "revision"] }, prompt),
    ).toBeNull();
    expect(writingContent({ ...valid, title: "a\0b" }, prompt)).toBeNull();
    expect(writingContent(null, prompt)).toBeNull();
    expect(
      writingContent(
        { ...blankWriting(prompt), checks: ["structure"] },
        prompt,
      ),
    ).toBeNull();
  });
  it("preserves multilingual planning, whitespace and HTML-looking text as user text", () => {
    const c = {
      ...blankWriting(prompt),
      plan: "中文提纲\n\n第二行",
      paragraphs: [
        "  My title <script>alert('text')</script>  ",
        "\nA second idea.\n",
        "",
      ],
    };
    expect(writingContent(c, prompt)).toEqual(c);
    const exported = writingText(prompt, c);
    expect(exported).toContain(c.plan);
    expect(exported).toContain(c.paragraphs[0]);
    expect(exported).not.toContain("householdId");
  });
  it("does not erase edits made while a save response is in flight", () => {
    const sent = {
      ...blankWriting(prompt),
      paragraphs: ["First version.", "", ""],
      checks: ["structure"],
    };
    const live = {
      ...sent,
      paragraphs: ["Newer words typed while saving.", "", ""],
    };
    const result = writingSaveResult(sent, live, []);
    expect(result.saved.paragraphs[0]).toBe("First version.");
    expect(result.content).toBe(live);
    const undone = blankWriting(prompt);
    const afterUndo = writingSaveResult(sent, undone, []);
    expect(afterUndo.content).toBe(undone);
    expect(sameWriting(afterUndo.content, afterUndo.saved)).toBe(false);
    expect(sameWriting(result.saved, result.content)).toBe(false);
    expect(writingSaveResult(sent, sent, []).content.checks).toEqual([]);
  });
  it("separates text revisions from self-check changes and compares checks without order sensitivity", () => {
    const a = { ...blankWriting(prompt), checks: ["structure", "revision"] };
    const b = { ...a, checks: ["revision", "structure"] };
    expect(sameWriting(a, b)).toBe(true);
    expect(sameWritingText(a, { ...a, checks: [] })).toBe(true);
    expect(sameWriting(a, { ...a, checks: [] })).toBe(false);
    expect(sameWritingText(a, { ...a, plan: "新提纲" })).toBe(false);
  });
  it("renders content safely as plain text and does not present a score", () => {
    const c = {
      ...blankWriting(prompt),
      title: "<img src=x onerror=alert(1)>",
      paragraphs: ["<script>alert(2)</script>", "A second line.", "A plan."],
    };
    const d: WritingDraft = {
      ...c,
      id: crypto.randomUUID(),
      childId: "fictional",
      prompt,
      revision: 2,
      createdAt: 0,
      updatedAt: 0,
    };
    const html = renderToStaticMarkup(
      createElement(WritingPreview, { draft: d, content: c }),
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("不自动判定内容或语法正确");
    const compared = renderToStaticMarkup(
      createElement(WritingPreview, {
        draft: d,
        content: c,
        savedVersion: true,
      }),
    );
    expect(compared).toContain("保存版本（用于比较）");
    expect(compared).toContain("当前编辑文字不会因此被替换");
  });
  it("links relevant courses to authored work without changing the practice start", () => {
    const lesson = courseCatalog.lessons.find((l) => l.id === "P6B-U05-L2")!;
    const html = renderToStaticMarkup(
      createElement(LessonView, {
        lesson,
        busy: false,
        completed: false,
        onStart: () => {},
        onBack: () => {},
        onWriting: () => {},
      }),
    );
    expect(html).toContain("开始这节课的练习");
    expect(html).toContain("去写一写，保存草稿");
    expect(html).toContain("与本课九题进度分开");
  });
  it("round trips writing links while rejecting broken encodings and controls", () => {
    expect(parseRoute("#writing").view).toBe("writing");
    expect(parseRoute("#writing=writing.p6.project")).toEqual({
      view: "writing",
      lessonId: null,
      writingPrompt: "writing.p6.project",
    });
    expect(parseRoute("#writing=%00").writingPrompt).toBeUndefined();
    expect(parseRoute("#writing=%E0%A4").writingPrompt).toBeUndefined();
  });
});
