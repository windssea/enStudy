import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { LearningSession } from "../packages/contracts/index";
import { reconcileDraft } from "../src/sessionDraft";
import SessionAccess from "../src/SessionAccess";

const session: LearningSession = {
  id: "session",
  leaseId: "lease",
  leaseVersion: 0,
  access: "owner",
  state: "active",
  assignmentId: "first",
  hintLevel: 0,
  exercise: {
    id: "question",
    category: "grammar",
    title: "练习",
    prompt: "Choose",
    context: "情景",
    type: "input",
    gradeMin: 1,
  },
};
describe("draft preservation during session reconciliation", () => {
  it("uses the authoritative submitted answer and keeps a conflicting local draft readable", () => {
    expect(
      reconcileDraft(session, session, "my unsaved draft", "saved answer"),
    ).toEqual({ answer: "saved answer", backup: "my unsaved draft" });
    expect(
      reconcileDraft(session, session, " SAVED   ANSWER ", "saved answer"),
    ).toEqual({ answer: "saved answer", backup: null });
  });
  it("restores a submitted answer after reload without carrying a previous child's draft", () => {
    expect(
      reconcileDraft(null, session, "previous child", "saved answer"),
    ).toEqual({ answer: "saved answer", backup: null });
  });
  it("preserves typed input when the same assignment changes devices", () => {
    expect(
      reconcileDraft(
        session,
        {
          ...session,
          leaseId: null,
          leaseVersion: 1,
          access: "takeover-required",
        },
        "my latest input",
      ),
    ).toEqual({ answer: "my latest input", backup: null });
  });
  it("archives a displaced draft and prepares the next question's input type", () => {
    expect(
      reconcileDraft(
        session,
        {
          ...session,
          assignmentId: "second",
          exercise: { ...session.exercise, type: "order" },
        },
        "old unsaved word",
      ),
    ).toEqual({ answer: [], backup: "old unsaved word" });
  });
  it("preserves ordered tokens in a readable local backup", () => {
    expect(
      reconcileDraft(session, { ...session, assignmentId: "second" }, [
        "I",
        "like",
        "cats.",
      ]),
    ).toEqual({ answer: "", backup: "I like cats." });
  });
  it("does not carry input into a newly selected child's session", () => {
    expect(reconcileDraft(null, session, "previous identity text")).toEqual({
      answer: "",
      backup: null,
    });
    expect(
      reconcileDraft(session, { ...session, assignmentId: "second" }, " "),
    ).toEqual({ answer: "", backup: null });
  });
});
describe("explicit device choice", () => {
  const render = (stopped: boolean) =>
    renderToStaticMarkup(
      createElement(SessionAccess, {
        session: { ...session, leaseId: null, access: "takeover-required" },
        stopped,
        busy: false,
        backup: null,
        onRefresh: () => {},
        onTakeover: () => {},
        onLeave: () => {},
      }),
    );
  it("offers a clear explicit choice without claiming a read has taken ownership", () => {
    const html = render(false);
    expect(html).toContain("要在这台设备接着学吗？");
    expect(html).toContain("在这台设备接着学</button>");
    expect(html).toContain("未保存的输入不会自动传过来");
  });
  it("requires a refresh before claiming when the latest state is unknown", () => {
    const html = render(true);
    expect(html).toContain("先看看最新进度");
    expect(html).toContain("刷新进度</button>");
    expect(html).not.toContain("在这台设备接着学</button>");
  });
});
