export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  let result: { error?: { message?: string; code?: string } };
  try {
    result = (await response.json()) as typeof result;
  } catch {
    throw new ApiError(
      "API未就绪，请检查本地8788服务。",
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
