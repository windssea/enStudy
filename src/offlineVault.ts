import type { OfflineState } from "./offlineModel";
export interface SealedOffline {
  id: string;
  version: number;
  key: CryptoKey;
  iv: Uint8Array;
  data: ArrayBuffer;
}
export interface OfflineBackend {
  read: (id: string) => Promise<SealedOffline | undefined>;
  commit: (
    id: string,
    expected: number,
    value: SealedOffline | null,
  ) => Promise<void>;
}
export function offlineVault(backend: OfflineBackend) {
  return {
    async read(id: string) {
      const record = await backend.read(id);
      if (!record) return null;
      const data = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: record.iv as Uint8Array<ArrayBuffer>,
          additionalData: new TextEncoder().encode(id),
        },
        record.key,
        record.data,
      );
      const state = JSON.parse(new TextDecoder().decode(data)) as OfflineState;
      if (
        state.schema !== 1 ||
        `${state.pack.householdId}:${state.pack.childId}` !== id
      )
        throw Error("本机练习包不匹配，请保留原数据并联网重试。");
      return { state, version: record.version };
    },
    async write(id: string, state: OfflineState, expected: number) {
      if (`${state.pack.householdId}:${state.pack.childId}` !== id)
        throw Error("档案不匹配，未写入本机。");
      const existing = await backend.read(id);
      const key =
        existing?.key ??
        (await crypto.subtle.generateKey(
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"],
        ));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(id) },
        key,
        new TextEncoder().encode(JSON.stringify(state)),
      );
      await backend.commit(id, expected, {
        id,
        version: expected + 1,
        key,
        iv,
        data,
      });
      return expected + 1;
    },
    async clear(id: string, expected: number) {
      await backend.commit(id, expected, null);
    },
  };
}
let dbPromise: Promise<IDBDatabase> | null = null;
function database() {
  return (dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("english-quest-offline", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("packs", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(Error("这台设备未允许本机保存，答案还没有暂存。"));
    };
  }));
}
const backend: OfflineBackend = {
  async read(id) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("packs", "readonly"),
        r = tx.objectStore("packs").get(id);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(Error("本机练习暂时无法读取。"));
    });
  },
  async commit(id, expected, value) {
    const db = await database();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("packs", "readwrite"),
        store = tx.objectStore("packs"),
        read = store.get(id);
      let conflict = false;
      read.onsuccess = () => {
        if ((read.result?.version ?? 0) !== expected) {
          conflict = true;
          tx.abort();
          return;
        }
        if (value) store.put(value);
        else store.delete(id);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(
          Error(
            conflict
              ? "另一页修改了本机练习，请重新读取；当前输入尚未保存。"
              : "本机保存失败，可能是存储空间不足。请保持页面并重试。",
          ),
        );
      tx.onerror = () => {};
    });
  },
};
export const deviceOfflineVault = offlineVault(backend);
