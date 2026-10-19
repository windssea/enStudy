import { describe, expect, it } from "vitest";
import {
  connectionSupports,
  type AiAdapter,
} from "../packages/domain/aiConnections";
import { connectionUrl } from "../packages/server/aiPolicy";
describe("explicit provider capabilities", () => {
  it.each<[AiAdapter, "text" | "asr" | "tts", boolean]>([
    ["openai-chat", "text", true],
    ["openai-chat", "asr", true],
    ["openai-chat", "tts", true],
    ["dashscope-chat", "text", true],
    ["dashscope-chat", "asr", false],
    ["dashscope-chat", "tts", false],
    ["dashscope-asr", "text", false],
    ["dashscope-asr", "asr", true],
    ["dashscope-asr", "tts", false],
  ])("%s supports %s = %s", (adapter, kind, expected) =>
    expect(connectionSupports(adapter, kind)).toBe(expected),
  );
  it("keeps the legacy default and requires the exact Qwen compatible root", () => {
    expect(connectionSupports(undefined, "text")).toBe(true);
    expect(
      connectionUrl(
        "https://speech.example.com/compatible-mode/v1",
        {},
        "dashscope-chat",
      ).approved,
    ).toBe(false);
    expect(
      connectionUrl(
        "https://speech.example.com/compatible-mode/v1",
        { AI_HOST_ALLOWLIST: "speech.example.com" },
        "dashscope-chat",
      ).approved,
    ).toBe(true);
    expect(() =>
      connectionUrl("https://speech.example.com/v1", {}, "dashscope-chat"),
    ).toThrow("INVALID_BASE_URL");
  });
});
