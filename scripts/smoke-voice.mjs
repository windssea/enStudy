import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { build } from "esbuild";
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from "miniflare";

let mode = "valid",
  calls = 0,
  lastRequest,
  began;
const provider = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString();
  calls++;
  lastRequest = { url: req.url, headers: req.headers, body };
  if (req.url === "/compatible-mode/v1/chat/completions") {
    const value = JSON.parse(body);
    if (
      value.enable_thinking !== false ||
      !Number.isInteger(value.max_tokens) ||
      "max_completion_tokens" in value
    ) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "fake-Qwen-requires-explicit-short-response-protocol",
        }),
      );
      return;
    }
  }
  const probe = body.includes("compatibility");
  began?.();
  if (!probe && mode === "slow") await new Promise((r) => setTimeout(r, 300));
  if (!probe && mode === "redirect") {
    res.writeHead(302, { Location: "http://127.0.0.1:1/leak" });
    res.end();
    return;
  }
  if (!probe && mode === "error") {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "private-upstream-error" }));
    return;
  }
  if (req.url.endsWith("/audio/speech")) {
    res.writeHead(200, { "Content-Type": "audio/mpeg" });
    res.end(
      mode === "bad-audio"
        ? Buffer.alloc(64)
        : mode === "large"
          ? Buffer.alloc(262145, 73)
          : Buffer.concat([Buffer.from("ID3"), Buffer.alloc(61)]),
    );
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  if (req.url === "/api/v1/services/aigc/multimodal-generation/generation") {
    res.end(
      JSON.stringify(
        mode === "native-error"
          ? { code: "InvalidApiKey", message: key }
          : {
              output:
                mode === "nested"
                  ? { output: { sentence: { text: "I like apples." } } }
                  : {
                      text:
                        mode === "echo-key"
                          ? key
                          : mode === "large"
                            ? "a".repeat(9000)
                            : "I like apples.",
                    },
              request_id: "fake-native-id",
            },
      ),
    );
    return;
  }
  if (req.url.endsWith("/audio/transcriptions")) {
    res.end(
      JSON.stringify({
        text:
          mode === "private"
            ? "My name is Real Kid."
            : mode === "echo-key"
              ? key
              : "I like apples.",
      }),
    );
    return;
  }
  res.end(
    JSON.stringify({
      choices: [
        {
          message: {
            content: probe
              ? JSON.stringify({ ok: true })
              : mode === "invalid"
                ? "not-json"
                : JSON.stringify({
                    replyEnglish: "I like fruit too. Do you like a banana?",
                    meaningChinese: "我也喜欢水果。你喜欢香蕉吗？",
                    hintChinese: "试着说出喜欢的水果。",
                  }),
          },
        },
      ],
      usage: { total_tokens: 32 },
    }),
  );
});
await new Promise((resolve) => provider.listen(0, "127.0.0.1", resolve));
const upstream = `http://127.0.0.1:${provider.address().port}`;
const key = `private-${randomBytes(24).toString("hex")}`,
  master = randomBytes(32).toString("base64");
const workerFile = ".wrangler/voice-smoke-worker.mjs";
await mkdir(".wrangler", { recursive: true });
await build({
  stdin: {
    contents:
      'import {app} from "./packages/server/app"; export default {fetch:app.fetch};',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: workerFile,
  logLevel: "silent",
});
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    scriptPath: workerFile,
    compatibilityDate: "2026-10-17",
    d1Databases: ["DB"],
    bindings: {
      APP_STAGE: "local",
      ALLOW_DEV_AUTH: "true",
      AI_KEYRING: JSON.stringify({ test: master }),
      AI_ACTIVE_KEY_ID: "test",
      AI_HOST_ALLOWLIST: "api.openai.com",
      AI_LOCAL_TEST_ORIGIN: upstream,
    },
    log: new Log(LogLevel.ERROR),
  }),
);
const jar = new Map(),
  foreign = new Map(),
  childOnly = new Map();
let checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  console.log(`PASS ${label}`);
  checks++;
};
async function request(path, body, cookies = jar) {
  const response = await mf.dispatchFetch(`http://127.0.0.1/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: Array.from(cookies, ([k, v]) => `${k}=${v}`).join("; "),
      "CF-Connecting-IP": `198.18.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`,
      ...(body === undefined
        ? {}
        : { Origin: "http://127.0.0.1", "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0],
      at = pair.indexOf("="),
      name = pair.slice(0, at),
      value = pair.slice(at + 1);
    if (value) cookies.set(name, value);
    else cookies.delete(name);
  }
  return { status: response.status, data: await response.json() };
}
const cfg = (model = "stub-valid") => ({
  clientRequestId: crypto.randomUUID(),
  label: "验证AI连接",
  baseUrl: `${upstream}/v1`,
  apiKey: key,
  model,
  policyUrl: "https://provider.example/privacy",
  tokenParameter: "max_completion_tokens",
  instructionRole: "system",
  currentPassword: "admin123123456",
});
const list = async () => (await request("/ai/connections")).data;
function statements(sql) {
  const out = [];
  let current = "",
    quote = "";
  sql = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      current += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) {
          current += sql[++i];
        } else quote = "";
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
    } else if (ch === ";") {
      if (current.trim()) out.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}
try {
  const db = await mf.getD1Database("DB");
  for (const name of [
    "0001_core.sql",
    "0002_accounts.sql",
    "0003_pilot_content.sql",
    "0004_learning_flow.sql",
    "0006_random_topic_assignments.sql",
    "0010_managed_accounts.sql",
    "0011_session_ownership.sql",
    "0012_ai_connections.sql",
    "0013_training_cycles.sql",
    "0015_teaching_exposure.sql",
    "0017_ai_voice.sql",
    "0021_listening_inputs.sql",
    "0025_offline_preparation.sql",
    "0030_child_companions.sql",
    "0032_household_membership.sql",
    "0033_household_member_lookup.sql",
  ])
    for (const sql of statements(await readFile(`migrations/${name}`, "utf8")))
      await db.prepare(sql).run();
  check(
    (await request("/ai/voice/settings", undefined, new Map())).status === 401,
    "voice settings require adult authentication",
  );
  assert.equal(
    (
      await request("/auth/login", {
        username: "admin",
        password: "admin123123456",
      })
    ).status,
    200,
  );
  const me = (await request("/me")).data;
  childOnly.set("eq_child", jar.get("eq_child"));
  check(
    (await request("/ai/voice/settings", undefined, childOnly)).status === 401,
    "child grant cannot read parent voice configuration",
  );
  check(
    !(await request("/learning/conversation-options")).data.enabled,
    "dialogue starts disabled",
  );
  let conn = (await request("/ai/connections", cfg())).data;
  assert.ok(conn.id);
  check(
    (
      await request(`/ai/connections/${conn.id}/test`, {
        version: conn.version,
        clientRequestId: crypto.randomUUID(),
        currentPassword: "admin123123456",
      })
    ).status === 200,
    "text compatibility probe passes through real adapter",
  );
  conn = (await list()).items[0];
  const audioConn = (await request("/ai/connections", cfg(""))).data;
  check(
    !!audioConn.id && !audioConn.model,
    "audio-only connection can omit a text model",
  );
  const getSettings = async () => (await request("/ai/voice/settings")).data;
  let settings = (await getSettings()).settings;
  const save = async (extra = {}) => {
    const value = {
      ...settings,
      text_connection_id: conn.id,
      asr_connection_id: audioConn.id,
      tts_connection_id: audioConn.id,
      asr_model: "stub-asr",
      tts_model: "stub-tts",
      tts_voice: "stub",
      text_enabled: false,
      asr_enabled: false,
      tts_enabled: false,
      currentPassword: "admin123123456",
      textConsent: true,
      audioConsent: true,
      ...extra,
    };
    const result = await request("/ai/voice/settings", value);
    settings = (await getSettings()).settings;
    return result;
  };
  check(
    (await save({ asr_enabled: true })).status !== 200,
    "audio cannot be enabled before its exact configuration is tested",
  );
  check(
    (await save()).status === 200,
    "disabled voice configuration saves independently of text explanations",
  );
  const wav = Buffer.alloc(32044);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(32000, 40);
  const audioBase64 = wav.toString("base64"),
    testId = crypto.randomUUID();
  const before = calls;
  const asrTest = await request("/ai/voice/test/asr", {
    version: settings.version,
    currentPassword: "admin123123456",
    clientRequestId: testId,
    audioBase64,
  });
  check(
    asrTest.status === 200 && asrTest.data.text === "I like apples.",
    "parent ASR test returns filtered transcription",
  );
  check(
    lastRequest.url === "/v1/audio/transcriptions" &&
      lastRequest.body.includes('name="file"') &&
      lastRequest.body.includes('filename="practice.wav"') &&
      lastRequest.body.includes("stub-asr"),
    "ASR sends bounded WAV as multipart to fixed endpoint",
  );
  await request("/ai/voice/test/asr", {
    version: settings.version,
    currentPassword: "admin123123456",
    clientRequestId: testId,
    audioBase64,
  });
  check(
    calls === before + 1,
    "repeating parent test reads encrypted result without provider call",
  );
  const ttsTest = await request("/ai/voice/test/tts", {
    version: settings.version,
    currentPassword: "admin123123456",
    clientRequestId: crypto.randomUUID(),
  });
  check(
    ttsTest.status === 200 && !!ttsTest.data.audioBase64,
    "parent TTS test returns bounded MP3 envelope",
  );
  check(
    lastRequest.url === "/v1/audio/speech" &&
      JSON.parse(lastRequest.body).response_format === "mp3",
    "TTS uses fixed speech endpoint and explicit MP3 format",
  );
  check(
    (
      await save({
        text_enabled: true,
        asr_enabled: true,
        tts_enabled: true,
        textConsent: false,
      })
    ).status === 409,
    "dialogue requires separate explicit text consent",
  );
  check(
    (
      await save({
        text_enabled: true,
        asr_enabled: true,
        tts_enabled: true,
        audioConsent: false,
      })
    ).status === 409,
    "child audio requires explicit recording consent",
  );
  check(
    (
      await save({
        text_enabled: true,
        asr_enabled: true,
        tts_enabled: true,
        child_turns: 12,
      })
    ).status === 200,
    "tested independent capabilities enable after consent",
  );
  const options = (await request("/learning/conversation-options")).data;
  check(
    options.enabled && options.asr && options.tts && !options.realtime,
    "capability negotiation reports only implemented tested protocols",
  );
  const open = async (cookies = jar) => {
    const result = await request(
      "/learning/conversations",
      { clientRequestId: crypto.randomUUID(), sceneId: "likes" },
      cookies,
    );
    assert.ok([200, 201].includes(result.status), JSON.stringify(result.data));
    return result.data.id;
  };
  let id = await open();
  check(
    (
      await request("/learning/conversations", {
        clientRequestId: crypto.randomUUID(),
        sceneId: "likes",
      })
    ).data.id === id,
    "same child grant restores its open conversation",
  );
  const turn = (
    text = "I like apples.",
    expectedTurn = 0,
    clientRequestId = crypto.randomUUID(),
    cookies = jar,
  ) =>
    request(
      `/learning/conversations/${id}/turn`,
      { text, expectedTurn, clientRequestId },
      cookies,
    );
  const startCalls = calls;
  check(
    (await turn("My name is Real Kid.")).status === 422 && calls === startCalls,
    "common personal information is rejected before outbound request",
  );
  const turnId = crypto.randomUUID(),
    first = await turn("I like apples.", 0, turnId);
  check(
    first.status === 200,
    "one child turn succeeds through real D1 and text adapter",
  );
  check(
    (await turn("I like apples.", 0, turnId)).data.cached &&
      calls === startCalls + 1,
    "same turn nonce replays after conversation cursor advances",
  );
  check(
    (await turn("I like apples.", 0)).data.cached && calls === startCalls + 1,
    "same payload with a new nonce cannot charge twice",
  );
  let snapshot = (await request(`/learning/conversations/${id}`)).data;
  check(
    snapshot.turnCount === 1 && snapshot.turns[0].user === "I like apples.",
    "conversation restores only confirmed successful turns",
  );
  const stored = await db
    .prepare("SELECT payload_json FROM ai_conversations WHERE id=?")
    .bind(id)
    .first();
  check(
    !stored.payload_json.includes("I like apples") &&
      !stored.payload_json.includes("replyEnglish"),
    "dialogue history is ciphertext at rest",
  );
  const exposure = await db
    .prepare("SELECT COUNT(*) AS n FROM teaching_exposures WHERE child_id=?")
    .bind(me.child.id)
    .first();
  check(exposure.n > 0, "AI English example is recorded as teaching exposure");
  const asr = () =>
    request(`/learning/conversations/${id}/transcribe`, {
      clientRequestId: crypto.randomUUID(),
      audioBase64,
      seconds: 0,
    });
  const audioCalls = calls;
  check(
    (await asr()).data.text === "I like apples.",
    "child explicitly transcribes recorded clip",
  );
  check(
    (await asr()).data.cached && calls === audioCalls + 1,
    "same audio content deduplicates across request IDs",
  );
  const voiceUsage = await db
    .prepare("SELECT audio_ms FROM ai_voice_budget WHERE subject=?")
    .bind(me.child.id)
    .first();
  check(
    voiceUsage.audio_ms === 1000,
    "quota duration comes from WAV payload, ignoring claimed duration",
  );
  const broken = Buffer.from(wav);
  broken.writeUInt32LE(8000, 24);
  check(
    (
      await request(`/learning/conversations/${id}/transcribe`, {
        clientRequestId: crypto.randomUUID(),
        audioBase64: broken.toString("base64"),
      })
    ).status === 422 && calls === audioCalls + 1,
    "forged WAV header never reaches provider",
  );
  const speak = (turnId = snapshot.turns[0].id) =>
    request(`/learning/conversations/${id}/speech`, {
      clientRequestId: crypto.randomUUID(),
      turnId,
    });
  check(
    (await speak("unknown")).status === 422,
    "TTS cannot proxy arbitrary input or nonexistent reply",
  );
  const speechCalls = calls;
  check(
    !!(await speak()).data.audioBase64,
    "child can explicitly synthesize saved AI reply",
  );
  check(
    (await speak()).data.cached && calls === speechCalls + 1,
    "reply audio request deduplicates by saved turn",
  );
  mode = "slow";
  const concurrent = await Promise.all([
    turn("I like bananas.", 1),
    turn("I like oranges.", 1),
  ]);
  check(
    concurrent.filter((r) => r.status === 200).length === 1 &&
      concurrent.some((r) => r.status !== 200),
    "parallel different turns cannot overwrite the same cursor",
  );
  mode = "valid";
  snapshot = (await request(`/learning/conversations/${id}`)).data;
  check(
    snapshot.turnCount === 2 && !snapshot.pendingRequestId,
    "pending conversation lease clears after completing one turn",
  );
  for (let i = 2; i < 6; i++)
    assert.equal((await turn(`I like fruit ${i}.`, i)).status, 200);
  const limitCalls = calls;
  check(
    (await turn("I like fruit.", 6)).status === 409 && calls === limitCalls,
    "conversation hard limit stops a seventh provider call",
  );
  check(
    (await request(`/learning/conversations/${id}/close`, {})).status === 200,
    "child explicitly closes its own dialogue",
  );
  const closed = await db
    .prepare("SELECT payload_json,state FROM ai_conversations WHERE id=?")
    .bind(id)
    .first();
  check(
    closed.state === "closed" && closed.payload_json === null,
    "closing clears encrypted history immediately",
  );
  check(
    (await request(`/learning/conversations/${id}`)).status !== 200,
    "closed history cannot be read",
  );
  id = await open();
  await request(
    "/auth/login",
    { username: "admin", password: "admin123123456" },
    foreign,
  );
  check(
    (await request(`/learning/conversations/${id}`, undefined, foreign))
      .status !== 200,
    "another device grant cannot read conversation",
  );
  check(
    (await request(`/learning/conversations/${id}/close`, {}, foreign))
      .status === 404,
    "another device cannot clear conversation or caches",
  );
  mode = "slow";
  const started = new Promise((resolve) => {
    began = resolve;
  });
  const inFlight = turn("I like apples.");
  await started;
  began = undefined;
  const saved = await save({
    text_enabled: false,
    asr_enabled: false,
    tts_enabled: false,
  });
  const signal = await inFlight;
  check(
    saved.status === 200 && signal.status !== 200 && !signal.data.replyEnglish,
    "disabling settings suppresses in-flight child result",
  );
  mode = "valid";
  const disabledCalls = calls;
  check(
    (await turn()).status !== 200 && calls === disabledCalls,
    "disabled dialogue never reaches upstream",
  );
  check(
    (
      await save({
        text_enabled: true,
        asr_enabled: true,
        tts_enabled: true,
        child_turns: 12,
      })
    ).status === 200,
    "unchanged protocol capability survives toggle-only configuration changes",
  );
  id = await open();
  for (const [failure, label] of [
    ["redirect", "redirect is blocked"],
    ["invalid", "non-schema dialogue is rejected"],
    ["error", "upstream error is sanitized"],
  ]) {
    mode = failure;
    const result = await turn(`I like fruit ${failure}.`);
    check(
      result.status !== 200 &&
        !JSON.stringify(result).includes("private-upstream-error"),
      label,
    );
  }
  mode = "valid";
  const usageBefore = await db
    .prepare("SELECT calls,units FROM ai_daily_budget")
    .first();
  await db
    .prepare("UPDATE ai_voice_budget SET turns=12 WHERE subject=?")
    .bind(me.child.id)
    .run();
  const exhaustedCalls = calls;
  check(
    (await turn("I like a banana.")).status === 429 && calls === exhaustedCalls,
    "child daily dialogue quota gates outbound request",
  );
  const usageAfter = await db
    .prepare("SELECT calls,units FROM ai_daily_budget")
    .first();
  check(
    JSON.stringify(usageBefore) === JSON.stringify(usageAfter),
    "failed child quota rolls back family reservation atomically",
  );
  await db
    .prepare("UPDATE ai_voice_budget SET turns=0 WHERE subject=?")
    .bind(me.child.id)
    .run();
  await request("/ai/settings", {
    connectionId: null,
    enabled: false,
    consent: false,
    dailyCalls: 300,
    dailyUnits: 1000000,
    childCalls: 100,
    version: 0,
    currentPassword: "admin123123456",
  });
  const parentTest = (kind) =>
    request(`/ai/voice/test/${kind}`, {
      version: settings.version,
      currentPassword: "admin123123456",
      clientRequestId: crypto.randomUUID(),
      ...(kind === "asr" ? { audioBase64 } : {}),
    });
  for (const [failure, kind, label] of [
    ["bad-audio", "tts", "unrecognized binary audio is rejected"],
    ["large", "tts", "oversize speech stream is stopped"],
    ["echo-key", "asr", "provider key echo is not returned in transcription"],
    [
      "private",
      "asr",
      "common personal information in transcription is blocked",
    ],
  ]) {
    mode = failure;
    const result = await parentTest(kind);
    check(
      result.status !== 200 && !JSON.stringify(result.data).includes(key),
      label,
    );
  }
  mode = "valid";
  check(
    (
      await save({
        text_enabled: true,
        asr_enabled: true,
        tts_enabled: true,
        child_turns: 12,
        child_audio_ms: 20000,
      })
    ).status === 200,
    "audio quota change preserves successful protocol capability",
  );
  id = await open();
  const freshWav = Buffer.from(wav);
  freshWav.writeInt16LE(123, 44);
  const freshAudio = freshWav.toString("base64");
  await db
    .prepare("UPDATE ai_voice_budget SET audio_ms=19500 WHERE subject=?")
    .bind(me.child.id)
    .run();
  const quotaCalls = calls,
    quotaBefore = await db
      .prepare("SELECT calls,units FROM ai_daily_budget")
      .first();
  check(
    (
      await request(`/learning/conversations/${id}/transcribe`, {
        clientRequestId: crypto.randomUUID(),
        audioBase64: freshAudio,
      })
    ).status === 429 && calls === quotaCalls,
    "measured audio duration cannot overspend child quota",
  );
  check(
    JSON.stringify(
      await db.prepare("SELECT calls,units FROM ai_daily_budget").first(),
    ) === JSON.stringify(quotaBefore),
    "audio quota failure rolls back all family reservations",
  );
  await db
    .prepare("UPDATE ai_voice_budget SET audio_ms=0 WHERE subject=?")
    .bind(me.child.id)
    .run();
  const expiryId = crypto.randomUUID();
  assert.equal(
    (
      await request(`/learning/conversations/${id}/transcribe`, {
        clientRequestId: expiryId,
        audioBase64: freshAudio,
      })
    ).status,
    200,
  );
  await db
    .prepare("UPDATE ai_requests SET expires_at=0 WHERE request_id=?")
    .bind(expiryId)
    .run();
  const expiryCalls = calls;
  check(
    (
      await request(`/learning/conversations/${id}/transcribe`, {
        clientRequestId: crypto.randomUUID(),
        audioBase64: freshAudio,
      })
    ).status !== 200 && calls === expiryCalls,
    "expired transcription result does not automatically bill a replacement",
  );
  await request("/learning/conversation-options");
  check(
    (
      await db
        .prepare("SELECT response_json FROM ai_requests WHERE request_id=?")
        .bind(expiryId)
        .first()
    ).response_json === null,
    "expired encrypted response is cleared on later access",
  );
  const temporary = "TmpVoice!7264",
    foreignPassword = "VoiceHouse!7265";
  assert.equal(
    (
      await request("/admin/accounts", {
        clientRequestId: crypto.randomUUID(),
        username: "voice.foreign",
        displayName: "验证家长",
        householdName: "隔离语音家庭",
        temporaryPassword: temporary,
        currentPassword: "admin123123456",
      })
    ).status,
    201,
  );
  await request(
    "/auth/login",
    { username: "voice.foreign", password: temporary },
    foreign,
  );
  check(
    (await request("/ai/voice/settings", undefined, foreign)).status === 403,
    "temporary-password guardian cannot configure audio",
  );
  await request(
    "/auth/password",
    { currentPassword: temporary, newPassword: foreignPassword },
    foreign,
  );
  await request(
    "/auth/login",
    { username: "voice.foreign", password: foreignPassword },
    foreign,
  );
  const foreignSettings = (
    await request("/ai/voice/settings", undefined, foreign)
  ).data.settings;
  const foreignSave = await request(
    "/ai/voice/settings",
    {
      ...foreignSettings,
      text_enabled: false,
      asr_enabled: false,
      tts_enabled: false,
      text_connection_id: conn.id,
      currentPassword: foreignPassword,
    },
    foreign,
  );
  check(
    foreignSave.status !== 200,
    "another household cannot attach this family's AI connection",
  );
  check(
    (await request(`/learning/conversations/${id}`, undefined, foreign))
      .status !== 200,
    "another household cannot read this child's transcript",
  );
  const nativePath = "/api/v1/services/aigc/multimodal-generation/generation";
  const nativeCfg = {
    ...cfg(""),
    adapter: "dashscope-asr",
    baseUrl: upstream + nativePath,
  };
  let native = (await request("/ai/connections", nativeCfg)).data;
  check(
    native.id && native.adapter === "dashscope-asr" && !native.tested,
    "native ASR connection persists its separate adapter without claiming text support",
  );
  const nativeBefore = calls;
  check(
    (
      await request(`/ai/connections/${native.id}/test`, {
        version: native.version,
        clientRequestId: crypto.randomUUID(),
        currentPassword: "admin123123456",
      })
    ).status === 422 && calls === nativeBefore,
    "native connection cannot dispatch a text probe or reserve provider usage",
  );
  check(
    (
      await request("/ai/connections", {
        ...nativeCfg,
        clientRequestId: crypto.randomUUID(),
        baseUrl: upstream + "/v1",
      })
    ).status === 422,
    "native adapter requires its exact generation path",
  );
  check(
    (await save({ text_connection_id: native.id, text_enabled: false }))
      .status === 422 &&
      (await save({ tts_connection_id: native.id, tts_enabled: false }))
        .status === 422,
    "even disabled text and TTS slots reject an ASR-only connection",
  );
  check(
    (
      await save({
        asr_connection_id: native.id,
        asr_model: "qwen-audio-3.1-asr-flash",
        asr_enabled: false,
        text_enabled: false,
        tts_enabled: false,
      })
    ).status === 200,
    "native ASR settings save separately from the existing text and TTS connections",
  );
  check(
    (
      await save({
        asr_connection_id: native.id,
        asr_model: "qwen-audio-3.1-asr-flash",
        asr_enabled: true,
      })
    ).status !== 200,
    "native ASR cannot enable before its own successful capability test",
  );
  await save({
    asr_connection_id: native.id,
    asr_model: "qwen-audio-3.1-asr-flash",
  });
  const nativeTestId = crypto.randomUUID();
  const nativeTest = (clientRequestId = crypto.randomUUID()) =>
    request("/ai/voice/test/asr", {
      version: settings.version,
      currentPassword: "admin123123456",
      clientRequestId,
      audioBase64,
    });
  const nativeResult = await nativeTest(nativeTestId);
  check(
    nativeResult.status === 200 && nativeResult.data.text === "I like apples.",
    "native output.text is parsed through the real workerd adapter and child content filter",
  );
  const nativeBody = JSON.parse(lastRequest.body);
  check(
    lastRequest.url === nativePath &&
      lastRequest.headers["x-dashscope-sse"] === "disable" &&
      lastRequest.headers["content-type"] === "application/json" &&
      nativeBody.model === "qwen-audio-3.1-asr-flash" &&
      nativeBody.parameters.format === "wav" &&
      nativeBody.parameters.sample_rate === "16000" &&
      nativeBody.input.messages[0].content[0].type === "input_audio" &&
      nativeBody.input.messages[0].content[0].input_audio.data ===
        `data:audio/wav;base64,${audioBase64}`,
    "native ASR sends the provided JSON contract and inline 16k WAV without a public recording URL",
  );
  const nativeOnce = calls;
  check(
    (await nativeTest(nativeTestId)).data.cached && calls === nativeOnce,
    "native ASR test replay reuses the encrypted receipt without a second provider request",
  );
  mode = "nested";
  check(
    (await nativeTest()).data.text === "I like apples.",
    "documented nested native sentence text is accepted",
  );
  for (const failure of ["echo-key", "native-error", "large", "redirect"]) {
    mode = failure;
    const result = await nativeTest();
    check(
      result.status !== 200 && !JSON.stringify(result.data).includes(key),
      `native ${failure} response is bounded and does not expose provider secrets`,
    );
  }
  mode = "valid";
  check(
    (
      await save({
        asr_connection_id: native.id,
        asr_model: "qwen-audio-3.1-asr-flash",
        asr_enabled: true,
      })
    ).status === 200 &&
      (await request("/learning/conversation-options")).data.asr,
    "tested native ASR can be explicitly enabled with the existing child audio consent",
  );
  check(
    (
      await save({
        asr_connection_id: native.id,
        asr_model: "qwen-audio-3.1-asr-flash",
        asr_enabled: true,
        text_enabled: true,
      })
    ).status === 200,
    "native ASR works alongside an independently tested text connection",
  );
  id = await open();
  const nativeChildId = crypto.randomUUID();
  const nativeChild = () =>
    request(`/learning/conversations/${id}/transcribe`, {
      clientRequestId: nativeChildId,
      audioBase64,
    });
  const nativeChildResult = await nativeChild(),
    nativeChildCalls = calls;
  check(
    nativeChildResult.status === 200 &&
      nativeChildResult.data.text === "I like apples." &&
      lastRequest.url === nativePath,
    "child short dialogue uses the native adapter with its own grant and audio budget",
  );
  check(
    (await nativeChild()).data.cached && calls === nativeChildCalls,
    "native child transcription replay does not redispatch or bill a second attempt",
  );
  const nativeUpdated = await request(`/ai/connections/${native.id}`, {
    ...nativeCfg,
    apiKey: "",
    version: native.version,
    label: "更新后的识别连接",
  });
  native = nativeUpdated.data;
  check(
    nativeUpdated.status === 200 &&
      native.adapter === "dashscope-asr" &&
      native.version === 1 &&
      !(await getSettings()).capabilities.asr,
    "editing native configuration invalidates its old capability receipt",
  );
  check(
    (await request("/ai/voice/settings", undefined, childOnly)).status ===
      401 &&
      (
        await request(
          `/ai/connections/${native.id}/storage`,
          { version: native.version, currentPassword: foreignPassword },
          foreign,
        )
      ).status === 404,
    "child and foreign household cannot read or decrypt native provider configuration",
  );
  const chatCfg = {
    ...cfg("qwen3.8-flash"),
    adapter: "dashscope-chat",
    tokenParameter: "max_tokens",
    baseUrl: upstream + "/compatible-mode/v1",
  };
  const chat = (await request("/ai/connections", chatCfg)).data;
  check(
    chat.id &&
      chat.adapter === "dashscope-chat" &&
      chat.model === "qwen3.8-flash" &&
      !chat.tested,
    "Qwen text profile persists separately without auto-enabling a family service",
  );
  const chatProbe = await request(`/ai/connections/${chat.id}/test`, {
    version: 0,
    clientRequestId: crypto.randomUUID(),
    currentPassword: "admin123123456",
  });
  const chatBody = JSON.parse(lastRequest.body);
  check(
    chatProbe.status === 200 &&
      lastRequest.url === "/compatible-mode/v1/chat/completions" &&
      chatBody.model === "qwen3.8-flash" &&
      chatBody.enable_thinking === false &&
      chatBody.max_tokens === 32 &&
      !("max_completion_tokens" in chatBody) &&
      chatBody.messages[0].role === "system",
    "Qwen real adapter explicitly disables thinking and uses system plus max_tokens for its minimal probe",
  );
  check(
    (await save({ asr_connection_id: chat.id, asr_enabled: false })).status ===
      422 &&
      (await save({ tts_connection_id: chat.id, tts_enabled: false }))
        .status === 422,
    "Qwen text profile cannot be configured for audio even with switches off",
  );
  check(
    (
      await request("/ai/connections", {
        ...chatCfg,
        clientRequestId: crypto.randomUUID(),
        tokenParameter: "max_completion_tokens",
      })
    ).status === 422 &&
      (
        await request("/ai/connections", {
          ...chatCfg,
          clientRequestId: crypto.randomUUID(),
          baseUrl: upstream + "/v1",
        })
      ).status === 422,
    "Qwen preset rejects incompatible limit parameters and the wrong root path before dispatch",
  );
  check(
    (
      await save({
        text_connection_id: chat.id,
        text_enabled: true,
        asr_connection_id: native.id,
        asr_model: "qwen-audio-3.1-asr-flash",
        asr_enabled: false,
        tts_enabled: false,
      })
    ).status === 200,
    "Qwen text profile saves independently beside the selected native ASR model",
  );
  await nativeTest();
  check(
    (
      await save({
        text_connection_id: chat.id,
        text_enabled: true,
        asr_connection_id: native.id,
        asr_model: "qwen-audio-3.1-asr-flash",
        asr_enabled: true,
      })
    ).status === 200,
    "independently tested Qwen text and Qwen native ASR enable only after explicit consent",
  );
  id = await open();
  const qwenTurnId = crypto.randomUUID();
  const qwenTurn = () =>
    request(`/learning/conversations/${id}/turn`, {
      clientRequestId: qwenTurnId,
      expectedTurn: 0,
      text: "I like apples.",
    });
  const qwenReply = await qwenTurn(),
    qwenCalls = calls;
  check(
    qwenReply.status === 200 &&
      JSON.parse(lastRequest.body).enable_thinking === false &&
      lastRequest.url === "/compatible-mode/v1/chat/completions",
    "child dialogue dispatches through the selected short-response Qwen text profile",
  );
  check(
    (await qwenTurn()).data.cached && calls === qwenCalls,
    "Qwen dialogue replay uses its original encrypted reply without redispatch",
  );
  console.log(
    `Local isolated voice smoke passed (${checks} checks; fake provider only).`,
  );
} finally {
  await mf.dispose();
  await new Promise((resolve) => provider.close(resolve));
  await unlink(workerFile).catch(() => {});
}
