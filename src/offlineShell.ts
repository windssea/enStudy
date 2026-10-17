export async function prepareOfflineShell() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext)
    throw Error("这台设备暂时不能准备离线页面，请保持联网练习。");
  await navigator.serviceWorker.register("/offline-sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(Error("离线页面准备超时，请保持联网后重试。")),
        15000,
      ),
    ),
  ]);
  const worker = registration.active;
  if (!worker) throw Error("离线页面还没准备好，请重试。");
  return new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      reject(Error("离线页面未准备完整，请保持联网后重试。"));
    }, 45000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      if (event.data?.prepared) resolve();
      else reject(Error("离线页面未准备完整，请保持联网后重试。"));
    };
    worker.postMessage({ type: "PREPARE_OFFLINE" }, [channel.port2]);
  });
}
