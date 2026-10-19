export function releasedAsset(
  read: () => Promise<Response>,
  expected: Uint8Array,
  options?: { attempts?: number; pauseMs?: number },
): Promise<Response>;
