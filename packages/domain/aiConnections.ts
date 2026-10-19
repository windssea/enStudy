export type AiAdapter = "openai-chat" | "dashscope-asr" | "dashscope-chat";
export function connectionSupports(
  adapter: AiAdapter | undefined,
  kind: "text" | "asr" | "tts",
) {
  return adapter === "dashscope-asr"
    ? kind === "asr"
    : adapter === "dashscope-chat"
      ? kind === "text"
      : true;
}
