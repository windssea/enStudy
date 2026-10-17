export function announceAiSettings() {
  document.dispatchEvent(new Event("eq-ai-settings"));
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel("eq-ai-settings");
    channel.postMessage("changed");
    channel.close();
  }
}
