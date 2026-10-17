let owner: symbol | null = null;

export const isSpeechActive = () => owner !== null;

export function acquireSpeech(next: symbol) {
  owner = next;
  document.dispatchEvent(new CustomEvent("eq-speech-active", { detail: true }));
}

// A stale callback or an unrelated word card must not stop the current voice.
export function releaseSpeech(current: symbol): boolean {
  if (owner !== current) return false;
  owner = null;
  document.dispatchEvent(
    new CustomEvent("eq-speech-active", { detail: false }),
  );
  return true;
}
