export interface AiConfig {
  APP_STAGE?: string;
  ALLOW_DEV_AUTH?: string;
  AI_KEYRING?: string;
  AI_ACTIVE_KEY_ID?: string;
  AI_HOST_ALLOWLIST?: string;
  AI_LOCAL_TEST_ORIGIN?: string;
}
export class AiFault extends Error {
  constructor(
    public code: string,
    public publicMessage: string,
  ) {
    super(code);
  }
}
export const hosts = (env: AiConfig) =>
  (env.AI_HOST_ALLOWLIST ?? "api.openai.com")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
export const dashscopeAsrPath =
  "/api/v1/services/aigc/multimodal-generation/generation";
export function connectionUrl(
  value: unknown,
  env: AiConfig,
  adapter = "openai-chat",
) {
  if (!["openai-chat", "dashscope-asr", "dashscope-chat"].includes(adapter))
    throw new AiFault("INVALID_AI_ADAPTER", "请选择支持的连接类型。");
  const target = providerUrl(value, env);
  const isNative = new URL(target.baseUrl).pathname === dashscopeAsrPath;
  if (
    adapter === "dashscope-chat" &&
    new URL(target.baseUrl).pathname !== "/compatible-mode/v1"
  )
    throw new AiFault(
      "INVALID_BASE_URL",
      "阿里文字连接请填写以 /compatible-mode/v1 结尾的根地址。",
    );
  if ((adapter === "dashscope-asr") !== isNative)
    throw new AiFault(
      "INVALID_BASE_URL",
      adapter === "dashscope-asr"
        ? "阿里原生识别请填写以 /api/v1/services/aigc/multimodal-generation/generation 结尾的完整地址。"
        : "此地址属于阿里原生识别，请选择对应连接类型。",
    );
  return target;
}
export function providerUrl(value: unknown, env: AiConfig) {
  if (
    typeof value !== "string" ||
    value.length > 260 ||
    /[\s%\\?#]/.test(value)
  )
    throw new AiFault(
      "INVALID_BASE_URL",
      "请填写API根地址，不要包含查询参数、片段或编码字符。",
    );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AiFault("INVALID_BASE_URL", "API地址格式不正确。");
  }
  const test =
    env.APP_STAGE === "local" &&
    env.ALLOW_DEV_AUTH === "true" &&
    env.AI_LOCAL_TEST_ORIGIN === url.origin &&
    url.hostname === "127.0.0.1" &&
    url.protocol === "http:";
  if (
    !test &&
    (url.protocol !== "https:" ||
      (url.port && url.port !== "443") ||
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
        url.hostname,
      ) ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid|onion)$/.test(
        url.hostname,
      ))
  )
    throw new AiFault(
      "INVALID_BASE_URL",
      "请使用公共HTTPS域名及443端口，不能使用IP、内网或本机地址。",
    );
  if (
    url.username ||
    url.password ||
    !/^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(url.pathname) ||
    url.pathname.endsWith("/chat/completions")
  )
    throw new AiFault(
      "INVALID_BASE_URL",
      "请填写API根地址，例如 https://服务商域名/v1，不要填写完整对话端点。",
    );
  return {
    baseUrl: url.origin + url.pathname.replace(/\/+$/, ""),
    approved: test || hosts(env).includes(url.hostname),
  };
}
export const validModel = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,119}$/.test(value);
export const validApiKey = (value: unknown): value is string =>
  typeof value === "string" && /^[\x21-\x7e]{8,512}$/.test(value);
export const validPolicy = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 400) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
};
export interface Explanation {
  explanationChinese: string;
  exampleEnglish: string;
  exampleChinese: string;
}
const unsafe =
  /https?:|www\.|<|>|\b(?:porn|suicide|fuck|kill yourself)\b|自杀|色情|裸照|性交|杀死|银行卡|身份证|加我微信|(?:api[_ -]?key|密钥)\s*[:：]/i;
export function parseExplanation(text: string): Explanation {
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/, "$1"));
  } catch {
    throw new AiFault(
      "AI_OUTPUT_INVALID",
      "AI解释格式暂时不合适，请先看标准讲解。",
    );
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new AiFault(
      "AI_OUTPUT_INVALID",
      "AI解释格式暂时不合适，请先看标准讲解。",
    );
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).sort().join(",") !==
      "exampleChinese,exampleEnglish,explanationChinese" ||
    !["explanationChinese", "exampleEnglish", "exampleChinese"].every(
      (key) =>
        typeof v[key] === "string" &&
        (v[key] as string).trim().length > 0 &&
        (v[key] as string).length <=
          (key === "explanationChinese" ? 420 : 180) &&
        !unsafe.test(v[key] as string) &&
        !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v[key] as string),
    ) ||
    !/[\u4e00-\u9fff]/.test(v.explanationChinese as string)
  )
    throw new AiFault(
      "AI_OUTPUT_BLOCKED",
      "这次AI内容未通过检查，请先看标准讲解。",
    );
  return {
    explanationChinese: v.explanationChinese as string,
    exampleEnglish: v.exampleEnglish as string,
    exampleChinese: v.exampleChinese as string,
  };
}
