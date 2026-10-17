export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
let learningChild: string | null = null;
export const setLearningChild = (id: string | null) => {
  learningChild = id;
};
export async function api<T>(
  path: string,
  body?: unknown,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, options.timeoutMs ?? 12_000);
  try {
    const response = await fetch(`/api/v1${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      headers: {
        "X-EQ-Player-Version": "3",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(learningChild ? { "X-EQ-Child-ID": learningChild } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    let result: { error?: { message?: string; code?: string } };
    try {
      result = (await response.json()) as typeof result;
    } catch {
      throw new ApiError(
        "暂时没连上学习服务，请稍后重试。",
        "INVALID_RESPONSE",
        response.status,
      );
    }
    if (!response.ok)
      throw new ApiError(
        result.error?.message ?? "请求失败，请重试。",
        result.error?.code ?? "REQUEST_FAILED",
        response.status,
      );
    return result as T;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
