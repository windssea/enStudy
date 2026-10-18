import { describe, expect, it } from "vitest";
import { responseCookieHeader } from "../scripts/response-cookies.mjs";

describe("same-origin release verifier cookies", () => {
  it("keeps the parent cookie while selecting and then removing a disposable child", () => {
    const selected = responseCookieHeader([
      "eq_account=parent",
      "eq_child=old",
      "eq_child=; Max-Age=0; Path=/",
      "eq_child=selected; Secure; Path=/",
    ]);
    expect(selected).toBe("eq_account=parent; eq_child=selected");
    expect(
      responseCookieHeader([
        ...selected.split("; "),
        "eq_child=; Max-Age=0; Path=/",
      ]),
    ).toBe("eq_account=parent");
  });
  it("sends the new login cookies after the server expires previous sessions", () => {
    expect(
      responseCookieHeader([
        "eq_account=; Max-Age=0; Path=/",
        "eq_child=; Max-Age=0; Path=/",
        "eq_dev_session=; Max-Age=0; Path=/",
        "eq_account=new-parent; HttpOnly; Secure; Path=/; SameSite=Strict",
        "eq_child=new-child; HttpOnly; Secure; Path=/; SameSite=Strict",
      ]),
    ).toBe("eq_account=new-parent; eq_child=new-child");
  });
  it("honors a later deletion and never sends response attributes", () => {
    expect(
      responseCookieHeader([
        "eq_account=stale; Path=/; HttpOnly",
        "eq_account=; Max-Age=0; Path=/",
      ]),
    ).toBe("");
    expect(responseCookieHeader([])).toBe("");
  });
  it("retains equals signs in values and only sends the final value of a name", () => {
    expect(
      responseCookieHeader([
        "ignored",
        "eq_account=old; Path=/",
        "eq_account=encoded==; Path=/; Secure",
      ]),
    ).toBe("eq_account=encoded==");
  });
});
