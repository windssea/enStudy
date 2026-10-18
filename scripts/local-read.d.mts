export function fetchLocalRead(
  url: string | URL,
  init?: RequestInit,
  send?: typeof fetch,
): Promise<Response>;
