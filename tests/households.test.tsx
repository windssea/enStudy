import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  householdRoleLabel,
  validAccessVersion,
  validHouseholdRole,
  validInviteToken,
  validRequestId,
} from "../packages/domain/households";
import HouseholdAccess from "../src/HouseholdAccess";
describe("household invitation boundaries", () => {
  it("allows two explicit family roles and gives an empty context its own label", () => {
    expect(validHouseholdRole("owner")).toBe(true);
    expect(validHouseholdRole("guardian")).toBe(true);
    for (const value of ["admin", "child", null, {}, "OWNER"])
      expect(validHouseholdRole(value)).toBe(false);
    expect(householdRoleLabel(null)).toBe("尚未选择家庭");
    expect(householdRoleLabel("guardian")).toBe("协助家长");
  });
  it("accepts bounded whole versions and rejects coercion, overflow and nonfinite counters", () => {
    for (const value of [0, 1, 2 ** 31 - 1])
      expect(validAccessVersion(value)).toBe(true);
    for (const value of [-1, 0.2, 2 ** 31, "0", NaN, Infinity, null])
      expect(validAccessVersion(value)).toBe(false);
  });
  it("distinguishes request identifiers from 256-bit invitation secrets", () => {
    expect(validRequestId(crypto.randomUUID())).toBe(true);
    expect(validInviteToken("af09".repeat(16))).toBe(true);
    for (const value of [
      "admin",
      crypto.randomUUID(),
      "a".repeat(63),
      "g".repeat(64),
      "A".repeat(64),
      {},
      null,
    ])
      expect(validInviteToken(value)).toBe(false);
    expect(validRequestId("af09".repeat(16))).toBe(false);
  });
  it("keeps sensitive forms and codes absent until the parent explicitly opens the section", () => {
    const html = renderToStaticMarkup(
      createElement(HouseholdAccess, { refresh: async () => {} }),
    );
    expect(html).toContain("家庭与共同陪伴");
    expect(html).toContain("切换家庭");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<textarea");
    expect(html).not.toContain('type="password"');
    expect(html).not.toContain("admin123123456");
  });
});
