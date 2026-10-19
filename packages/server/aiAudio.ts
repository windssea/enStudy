import { AiFault, connectionUrl, type AiConfig } from "./aiPolicy";
import type { TextConnection } from "./aiAdapter";
import { voiceBase64 } from "../domain/voice";
export async function audioRequest(
  env: AiConfig,
  connection: TextConnection,
  key: string,
  kind: "asr" | "tts",
  model: string,
  input: Uint8Array | string,
  voice = "",
) {
  const native = connection.adapter === "dashscope-asr";
  if (native && kind !== "asr")
    throw new AiFault(
      "INVALID_AI_CAPABILITY",
      "阿里原生识别连接不能合成语音，请另选TTS连接。",
    );
  const target = connectionUrl(connection.base_url, env, connection.adapter);
  if (!target.approved)
    throw new AiFault("AI_HOST_PENDING", "语音服务域名仍待验证。");
  const abort = new AbortController(),
    timer = setTimeout(() => abort.abort(), 20000);
  try {
    let body: FormData | string;
    const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
    if (native) {
      headers["Content-Type"] = "application/json";
      headers["X-DashScope-SSE"] = "disable";
      body = JSON.stringify({
        model,
        input: {
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "input_audio",
                  input_audio: {
                    data: `data:audio/wav;base64,${voiceBase64(input as Uint8Array)}`,
                  },
                },
              ],
            },
          ],
        },
        parameters: { format: "wav", sample_rate: "16000" },
      });
    } else if (kind === "asr") {
      const form = new FormData();
      form.set(
        "file",
        new File([new Uint8Array(input as Uint8Array).buffer], "practice.wav", {
          type: "audio/wav",
        }),
      );
      form.set("model", model);
      form.set("response_format", "json");
      form.set("language", "en");
      body = form;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({ model, voice, input, response_format: "mp3" });
    }
    const r = await fetch(
      native
        ? target.baseUrl
        : `${target.baseUrl}/audio/${kind === "asr" ? "transcriptions" : "speech"}`,
      {
        method: "POST",
        headers,
        body,
        redirect: "manual",
        signal: abort.signal,
      },
    );
    if (r.status >= 300 && r.status < 400) {
      await r.body?.cancel();
      throw new AiFault(
        "AI_REDIRECT_BLOCKED",
        "语音服务返回重定向，请家长核对根地址。",
      );
    }
    if (!r.ok) {
      await r.body?.cancel();
      throw new AiFault(
        "AI_AUDIO_PROVIDER_ERROR",
        "语音服务暂未完成请求，请先打字或使用设备朗读。",
      );
    }
    const mime = (r.headers.get("Content-Type") ?? "").toLowerCase();
    if (
      kind === "asr"
        ? !mime.includes("application/json")
        : !/^audio\/(mpeg|mp3)(?:;|$)/.test(mime)
    ) {
      await r.body?.cancel();
      throw new AiFault(
        "AI_AUDIO_FORMAT",
        "语音响应格式暂不兼容，请先用文字练习。",
      );
    }
    const reader = r.body?.getReader();
    if (!reader) throw new AiFault("AI_AUDIO_EMPTY", "语音服务没有返回内容。");
    const parts: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > (kind === "asr" ? 8192 : 262144)) {
        await reader.cancel();
        throw new AiFault("AI_AUDIO_TOO_LARGE", "语音结果过长，已停止读取。");
      }
      parts.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.length;
    }
    if (kind === "asr") {
      const value = JSON.parse(new TextDecoder().decode(bytes));
      if (native && value?.code)
        throw new AiFault(
          "AI_AUDIO_PROVIDER_ERROR",
          "语音服务未完成识别，请家长检查模型和服务状态。",
        );
      const text = native
        ? (value?.output?.text ?? value?.output?.output?.sentence?.text)
        : value?.text;
      if (
        typeof text !== "string" ||
        !text.trim() ||
        text.length > 320 ||
        text.includes(key)
      )
        throw new AiFault(
          "AI_TRANSCRIPT_INVALID",
          "没有得到合适的识别文字，可重新录制或直接打字。",
        );
      return { text: text.trim().replace(/\s+/g, " ") };
    }
    if (
      size < 32 ||
      !(
        (bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51) ||
        (bytes[0] === 255 && (bytes[1] & 224) === 224)
      )
    )
      throw new AiFault(
        "AI_AUDIO_INVALID",
        "合成结果不是可识别的MP3，可先用设备朗读。",
      );
    if (new TextDecoder().decode(bytes).includes(key))
      throw new AiFault(
        "AI_AUDIO_INVALID",
        "语音内容没有通过检查，请先使用设备朗读。",
      );
    return { audioBase64: voiceBase64(bytes), mime: "audio/mpeg" };
  } catch (error) {
    if (error instanceof AiFault) throw error;
    throw new AiFault(
      "AI_REQUEST_UNKNOWN",
      "语音结果暂时未知，请先用文字；本次预留不会自动退回。",
    );
  } finally {
    clearTimeout(timer);
  }
}
