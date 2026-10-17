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
    }),
  );
describe("family account entry states", () => {
  it("places temporary-password families in a password form before child management", () => {
    const html = render({
      authenticated: false,
      developmentIdentityAvailable: false,
      adult: {
        username: "family.test",
        householdId: "family",
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
        isAdmin: false,
        mustChangePassword: false,
      },
    });
    expect(html).toContain("添加一位小探险家");
    expect(html).toContain("账号与密码");
    expect(html).not.toContain("家庭账号管理");
    expect(html).not.toContain("交给家长的临时密码");
  });
});
