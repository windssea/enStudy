import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { passwordHash, equalHash, tokenHash } from "../packages/server/auth";
import {
  validPassword,
  validUsername,
} from "../packages/server/managedAccounts";

describe("account password and opaque sessions", () => {
  it("accepts long passphrases while bounding credential input", () => {
    expect(validPassword("a long family passphrase")).toBe(true);
    for (const value of [
      null,
      {},
      "short",
      " ".repeat(12),
      "a".repeat(129),
      "secret\npassword",
    ])
      expect(validPassword(value)).toBe(false);
  });
  it("limits managed usernames to unambiguous lowercase account identifiers", () => {
    expect(validUsername("family.lin-2")).toBe(true);
    for (const value of [
      null,
      "ab",
      "2family",
      "Family",
      "a b",
      "<script>",
      "家长账号",
      "a".repeat(41),
    ])
      expect(validUsername(value)).toBe(false);
  });
  it("matches the salted bootstrap credential and rejects a wrong password", async () => {
    const sql = readFileSync("migrations/0002_accounts.sql", "utf8");
    const credential = sql.match(
      /'admin','([a-f0-9]{64})','([a-f0-9]{48})',100000/,
    )!;
    expect(credential).not.toBeNull();
    expect(await passwordHash("admin123123456", credential[2])).toBe(
      credential[1],
    );
    expect(
      equalHash(await passwordHash("incorrect", credential[2]), credential[1]),
    ).toBe(false);
    expect(sql).not.toContain("admin123123456");
  });
  it("produces different verifiers for different salts", async () => {
    expect(await passwordHash("test-password", "salt-one")).not.toBe(
      await passwordHash("test-password", "salt-two"),
    );
  });
  it("compares the complete digest including length", () => {
    expect(equalHash("abcd", "abcd")).toBe(true);
    expect(equalHash("abcd", "abce")).toBe(false);
    expect(equalHash("abcd", "abcd0")).toBe(false);
  });
  it("stores token digests rather than bearer values", async () => {
    const token = crypto.randomUUID();
    expect(await tokenHash(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(await tokenHash(token)).not.toContain(token);
  });
});
