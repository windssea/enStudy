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
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(learningChild ? { "X-EQ-Child-ID": learningChild } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
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
}
