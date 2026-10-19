import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FamilySpace from "../src/FamilySpace";
import type { Identity } from "../packages/contracts/index";

const render = (identity: Identity) =>
  renderToStaticMarkup(
    createElement(FamilySpace, {
      identity,
      refresh: async () => {},
      learning: { completedLessons: [], dueCount: 0, recent: [] },
      lessons: [],
      onOpenTraining: () => {},
      onReview: () => {},
    }),
  );
describe("family account entry states", () => {
  it("keeps guardians in teaching and report tools without owner-only profile or AI forms", () => {
    const html = render({
      authenticated: false,
      developmentIdentityAvailable: false,
      adult: {
        username: "helper",
        householdId: "shared",
        householdName: "共同陪伴",
        role: "guardian",
        contextVersion: 1,
        isAdmin: false,
        mustChangePassword: false,
      },
    });
    expect(html).toContain("协助家长");
    expect(html).toContain("共同陪伴");
    expect(html).toContain("账号与密码");
    expect(html).not.toContain("添加一位小探险家");
    expect(html).not.toContain("家长设置 · AI解释");
  });
  it("retains adult password access and a family-selection explanation when no membership remains", () => {
    const html = render({
      authenticated: false,
      developmentIdentityAvailable: false,
      adult: {
        username: "waiting",
        householdId: "",
        role: null,
        contextVersion: 0,
        isAdmin: false,
        mustChangePassword: false,
      },
    });
    expect(html).toContain("尚未选择家庭");
    expect(html).toContain("账号与密码");
    expect(html).not.toContain("添加一位小探险家");
    expect(html).not.toContain("家长设置 · AI解释");
  });
  it("places temporary-password families in a password form before child management", () => {
    const html = render({
      authenticated: false,
      developmentIdentityAvailable: false,
      adult: {
        username: "family.test",
        householdId: "family",
        role: "owner",
        isAdmin: false,
        mustChangePassword: true,
      },
    });
    expect(html).toContain("先设置你自己的密码");
    expect(html).not.toContain("添加一位小探险家");
    expect(html).not.toContain("家庭账号管理");
    expect(html.match(/type="password"/g)).toHaveLength(3);
    expect(html).not.toContain("admin123123456");
  });
  it("keeps normal parents in their family tools without administrative controls", () => {
    const html = render({
      authenticated: false,
      developmentIdentityAvailable: false,
      adult: {
        username: "family.test",
        householdId: "family",
        role: "owner",
        isAdmin: false,
        mustChangePassword: false,
      },
    });
    expect(html).toContain("添加档案");
    expect(html).toContain("账号与密码");
    expect(html).not.toContain("家庭账号管理");
    expect(html).not.toContain("交给家长的临时密码");
  });
});
