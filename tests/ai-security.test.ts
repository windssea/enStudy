import { describe, expect, it } from "vitest";
import {
  providerUrl,
  connectionUrl,
  dashscopeAsrPath,
  parseExplanation,
  validApiKey,
  validModel,
} from "../packages/server/aiPolicy";
import { sealKey, unsealKey, keyStoreReady } from "../packages/server/aiCrypto";

describe("AI destination policy", () => {
  it("requires the native path and explicit adapter without widening exact-host approval", () => {
    const url = "https://speech.example.com" + dashscopeAsrPath;
    expect(connectionUrl(url, {}, "dashscope-asr").approved).toBe(false);
    expect(
      connectionUrl(
        url,
        { AI_HOST_ALLOWLIST: "speech.example.com" },
        "dashscope-asr",
      ).approved,
    ).toBe(true);
    expect(
      connectionUrl(
        "https://speech.example.com.attacker.example" + dashscopeAsrPath,
        { AI_HOST_ALLOWLIST: "speech.example.com" },
        "dashscope-asr",
      ).approved,
    ).toBe(false);
    expect(() => connectionUrl(url, {}, "openai-chat")).toThrow(
      "INVALID_BASE_URL",
    );
    expect(() =>
      connectionUrl("https://speech.example.com/v1", {}, "dashscope-asr"),
    ).toThrow("INVALID_BASE_URL");
    expect(() => connectionUrl(url, {}, "arbitrary")).toThrow(
      "INVALID_AI_ADAPTER",
    );
    expect(() =>
      connectionUrl(url + "?next=internal", {}, "dashscope-asr"),
    ).toThrow();
  });
  it("normalizes an approved root and leaves other public domains pending", () => {
    expect(providerUrl("https://API.OPENAI.COM:443/v1/", {})).toEqual({
      baseUrl: "https://api.openai.com/v1",
      approved: true,
    });
    expect(
      providerUrl("https://api.openai.com.attacker.example/v1", {}).approved,
    ).toBe(false);
    expect(
      providerUrl("https://other.example/v1", {
        AI_HOST_ALLOWLIST: "other.example",
      }).approved,
    ).toBe(true);
  });
  it.each([
    "http://api.openai.com/v1",
    "https://127.0.0.1/v1",
    "https://2130706433/v1",
    "https://[::1]/v1",
    "https://localhost/v1",
    "https://a.internal/v1",
    "https://a.local/v1",
    "https://a.onion/v1",
    "https://api.openai.com:8443/v1",
    "https://user:pass@api.openai.com/v1",
    "https://api.openai.com/v1?redirect=private",
    "https://api.openai.com/v1#fragment",
    "https://api.openai.com/%2e%2e/v1",
    "https://api.openai.com/v1/chat/completions",
    "https://bad..example/v1",
    "https://-bad.example/v1",
    "https://api.openai.com\\@127.0.0.1/v1",
  ])("rejects ambiguous or unsafe root %s", (url) =>
    expect(() => providerUrl(url, {})).toThrow(),
  );
  it("allows the exact localhost test origin only in explicit local development", () => {
    const env = {
      APP_STAGE: "local",
      ALLOW_DEV_AUTH: "true",
      AI_LOCAL_TEST_ORIGIN: "http://127.0.0.1:9999",
    };
    expect(providerUrl("http://127.0.0.1:9999/v1", env).approved).toBe(true);
    expect(() => providerUrl("http://127.0.0.1:9998/v1", env)).toThrow();
    expect(() =>
      providerUrl("http://127.0.0.1:9999/v1", {
        ...env,
        APP_STAGE: "production",
      }),
    ).toThrow();
  });
  it("rejects header control characters and arbitrary model payloads", () => {
    expect(validApiKey("secret\r\nAuthorization: stolen")).toBe(false);
    expect(validModel("model\nother")).toBe(false);
  });
});
describe("untrusted AI explanation", () => {
  const value = {
    explanationChinese: "先看主语，再选择合适的be动词。",
    exampleEnglish: "They are happy.",
    exampleChinese: "他们很开心。",
  };
  it("parses bounded plain text and optional JSON fences", () => {
    expect(
      parseExplanation("```json\n" + JSON.stringify(value) + "\n```"),
    ).toEqual(value);
  });
  it.each([
    { ...value, tool: "send_message" },
    { ...value, explanationChinese: "Visit the site." },
    { ...value, exampleEnglish: "<script>alert(1)</script>" },
    { ...value, exampleChinese: "请访问 https://bad.example" },
    { ...value, explanationChinese: "请提供银行卡" },
    { ...value, explanationChinese: "中".repeat(421) },
    { ...value, exampleEnglish: "abc\u0001" },
  ])("blocks schema violations or unsuitable text", (content) =>
    expect(() => parseExplanation(JSON.stringify(content))).toThrow(),
  );
});
describe("household scoped authenticated encryption", () => {
  const ring = { v1: btoa("a".repeat(32)), v2: btoa("b".repeat(32)) },
    env = { AI_KEYRING: JSON.stringify(ring), AI_ACTIVE_KEY_ID: "v1" };
  const record = (s: Awaited<ReturnType<typeof sealKey>>) => ({
    key_id: s.keyId,
    key_iv: s.iv,
    key_ciphertext: s.ciphertext,
  });
  it("uses fresh IVs and decrypts only under the original household and connection", async () => {
    const a = await sealKey(
        env,
        "family-a",
        "connection",
        "private-provider-key",
      ),
      b = await sealKey(env, "family-a", "connection", "private-provider-key");
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toContain("private-provider-key");
    expect(await unsealKey(env, "family-a", "connection", record(a))).toBe(
      "private-provider-key",
    );
    await expect(
      unsealKey(env, "family-b", "connection", record(a)),
    ).rejects.toThrow("AI_KEY_UNAVAILABLE");
    await expect(
      unsealKey(env, "family-a", "another", record(a)),
    ).rejects.toThrow("AI_KEY_UNAVAILABLE");
    const bytes = Uint8Array.from(atob(a.ciphertext), (c) => c.charCodeAt(0));
    bytes[0] ^= 1;
    await expect(
      unsealKey(env, "family-a", "connection", {
        ...record(a),
        key_ciphertext: btoa(String.fromCharCode(...bytes)),
      }),
    ).rejects.toThrow("AI_KEY_UNAVAILABLE");
  });
  it("retains old keys during active key rotation and fails closed on missing keys", async () => {
    const old = await sealKey(env, "family", "connection", "provider-key"),
      rotated = { ...env, AI_ACTIVE_KEY_ID: "v2" };
    expect(
      (await sealKey(rotated, "family", "connection", "provider-key")).keyId,
    ).toBe("v2");
    expect(await unsealKey(rotated, "family", "connection", record(old))).toBe(
      "provider-key",
    );
    expect(keyStoreReady({})).toBe(false);
    expect(keyStoreReady({ ...env, AI_ACTIVE_KEY_ID: "missing" })).toBe(false);
    await expect(
      sealKey({}, "family", "connection", "provider-key"),
    ).rejects.toThrow("AI_KEY_STORE_UNAVAILABLE");
    await expect(
      unsealKey(
        { AI_KEYRING: JSON.stringify({ v2: ring.v2 }), AI_ACTIVE_KEY_ID: "v2" },
        "family",
        "connection",
        record(old),
      ),
    ).rejects.toThrow("AI_KEY_UNAVAILABLE");
  });
});
