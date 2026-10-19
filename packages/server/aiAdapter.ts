import { AiFault, connectionUrl, type AiConfig } from "./aiPolicy";
import { connectionSupports, type AiAdapter } from "../domain/aiConnections";
export interface TextConnection {
  adapter?: AiAdapter;
  id: string;
  household_id: string;
  base_url: string;
  model: string;
  token_parameter: "max_tokens" | "max_completion_tokens";
  instruction_role: "system" | "developer";
  key_id: string;
  key_iv: string;
  key_ciphertext: string;
  version: number;
}
export async function textCompletion(
  env: AiConfig,
  connection: TextConnection,
  apiKey: string,
  messages: { role: string; content: string }[],
  maxOutput: number,
) {
  if (!connectionSupports(connection.adapter, "text"))
    throw new AiFault(
      "INVALID_AI_CAPABILITY",
      "这条连接只支持语音识别，请为文字选择其他连接。",
    );
  const target = connectionUrl(connection.base_url, env, connection.adapter);
  if (!target.approved)
    throw new AiFault(
      "AI_HOST_PENDING",
      "这个服务域名还未通过部署者验证，暂时不能调用。",
    );
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 20000);
  try {
    const response = await fetch(`${target.baseUrl}/chat/completions`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: connection.model,
        messages,
        stream: false,
        ...(connection.adapter === "dashscope-chat"
          ? { enable_thinking: false }
          : {}),
        [connection.token_parameter]: maxOutput,
      }),
      signal: timeout.signal,
    });
    if (response.status >= 300 && response.status < 400)
      throw new AiFault(
        "AI_REDIRECT_BLOCKED",
        "服务返回了重定向，请家长核对API根地址。",
      );
    if (!response.ok) {
      await response.body?.cancel();
      throw new AiFault(
        response.status === 401 || response.status === 403
          ? "AI_AUTH_FAILED"
          : response.status === 429
            ? "AI_PROVIDER_LIMIT"
            : "AI_PROVIDER_ERROR",
        "服务暂时没有完成请求，请先使用标准讲解，并请家长检查连接。",
      );
    }
    if (
      !response.headers
        .get("Content-Type")
        ?.toLowerCase()
        .includes("application/json")
    ) {
      await response.body?.cancel();
      throw new AiFault(
        "AI_RESPONSE_TYPE",
        "服务响应格式不兼容，请先使用标准讲解。",
      );
    }
    const reader = response.body?.getReader();
    if (!reader)
      throw new AiFault(
        "AI_EMPTY_RESPONSE",
        "AI没有返回内容，请先看标准讲解。",
      );
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 32768) {
        await reader.cancel();
        throw new AiFault(
          "AI_RESPONSE_TOO_LARGE",
          "AI返回内容过长，已停止读取。",
        );
      }
      chunks.push(part.value);
    }
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(data));
    } catch {
      throw new AiFault(
        "AI_RESPONSE_INVALID",
        "服务响应不兼容，请先看标准讲解。",
      );
    }
    const body = parsed as {
      choices?: { message?: { content?: unknown } }[];
      usage?: { total_tokens?: unknown };
    };
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length > 4000)
      throw new AiFault(
        "AI_RESPONSE_INVALID",
        "AI没有返回合适的文本，请先看标准讲解。",
      );
    const total = body.usage?.total_tokens;
    return {
      content,
      actualTokens:
        typeof total === "number" &&
        Number.isSafeInteger(total) &&
        total >= 0 &&
        total <= 1_000_000
          ? total
          : null,
    };
  } catch (error) {
    if (error instanceof AiFault) throw error;
    throw new AiFault(
      "AI_REQUEST_UNKNOWN",
      "AI暂时没有回应；请求可能已到达服务商，本次预留不会自动退回。请先看标准讲解。",
    );
  } finally {
    clearTimeout(timer);
  }
}
