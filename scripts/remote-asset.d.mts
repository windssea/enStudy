export function releasedAsset(
  read: () => Promise<Response>,
  expected: Uint8Array,
  options?: { attempts?: number; pauseMs?: number },
): Promise<Response>;
export function releasedJson(
  read: () => Promise<Response>,
  expected: unknown,
  options?: { attempts?: number; pauseMs?: number },
): Promise<Response>;
