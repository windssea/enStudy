import { AiFault, type AiConfig } from "./aiPolicy";
const bytes = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const base64 = (value: Uint8Array) => {
  let text = "";
  for (let i = 0; i < value.length; i += 8192)
    text += String.fromCharCode(...value.subarray(i, i + 8192));
  return btoa(text);
};
export function keyStoreReady(env: AiConfig) {
  try {
    const ring = JSON.parse(env.AI_KEYRING ?? "{}");
    const id = env.AI_ACTIVE_KEY_ID ?? "";
    return (
      /^[a-z0-9-]{1,32}$/.test(id) &&
      typeof ring[id] === "string" &&
      bytes(ring[id]).length === 32
    );
  } catch {
    return false;
  }
}
async function key(env: AiConfig, id: string) {
  try {
    const ring = JSON.parse(env.AI_KEYRING ?? "{}");
    const raw = bytes(ring[id]);
    if (raw.length !== 32) throw new Error();
    return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);
  } catch {
    throw new AiFault(
      "AI_KEY_STORE_UNAVAILABLE",
      "此部署尚未准备好AI密钥加密配置，请联系部署者。",
    );
  }
}
const aad = (household: string, connection: string, id: string) =>
  new TextEncoder().encode(JSON.stringify([household, connection, id]));
export async function sealKey(
  env: AiConfig,
  household: string,
  connection: string,
  secret: string,
) {
  if (!keyStoreReady(env))
    throw new AiFault(
      "AI_KEY_STORE_UNAVAILABLE",
      "此部署尚未准备好AI密钥加密配置，请联系部署者。",
    );
  const id = env.AI_ACTIVE_KEY_ID!,
    iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(household, connection, id) },
    await key(env, id),
    new TextEncoder().encode(secret),
  );
  return {
    ciphertext: base64(new Uint8Array(ciphertext)),
    iv: base64(iv),
    keyId: id,
    suffix: secret.slice(-4),
  };
}
export async function unsealKey(
  env: AiConfig,
  household: string,
  connection: string,
  record: { key_id: string; key_iv: string; key_ciphertext: string },
) {
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: bytes(record.key_iv),
        additionalData: aad(household, connection, record.key_id),
      },
      await key(env, record.key_id),
      bytes(record.key_ciphertext),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new AiFault(
      "AI_KEY_UNAVAILABLE",
      "连接密钥暂时不可用，请家长重新保存连接。",
    );
  }
}
