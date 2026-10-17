import { describe, expect, it } from "vitest";
import type { OfflinePack, Receipt } from "../packages/contracts/index";
import { schedule } from "../packages/domain/review";
import {
  freshOffline,
  queueOffline,
  syncOffline,
  offlineAnswerText,
  type OfflineState,
} from "../src/offlineModel";
import { offlineVault, type SealedOffline } from "../src/offlineVault";
import { actionRelease, publicExercise } from "../packages/server/exercises";
const now = Date.now();
function pack(): OfflinePack {
  return {
    schema: 1,
    id: "pack",
    householdId: "family",
    childId: "child",
    nickname: "小星",
    preparedAt: now,
    expiresAt: now + 7 * 86400000,
    sessionId: "session",
    leaseId: "lease",
    leaseVersion: 0,
    source: "lesson",
    items: [
      {
        assignmentId: "first",
        position: 1,
        exercise: {
          id: "item",
          type: "input",
          category: "grammar",
          title: "小练习",
          prompt: "I ___ a student.",
          context: "自我介绍",
          gradeMin: 1,
        },
      },
    ],
  };
}
const queued = () =>
  queueOffline(
    { ...freshOffline(pack()), draft: { answer: "am" } },
    now,
    "event",
    "first",
  );
const receipt: Receipt = {
  eventId: "event",
  support: "offline",
  outcome: "hinted",
  independentEvidence: false,
  feedback: "I am a student.",
  nextReviewDay: "2026-10-18",
  rewardDelta: 0,
  serverSequence: 1,
};
function transport() {
  let wrote = false,
    advanced = false,
    loseAnswer = false,
    loseNext = false;
  const calls: { path: string; body: unknown }[] = [];
  const api = async <T>(path: string, body?: unknown): Promise<T> => {
    calls.push({ path, body: structuredClone(body) });
    if (path === "/me")
      return {
        authenticated: true,
        offlineProtocol: 1,
        child: { id: "child", householdId: "family" },
      } as T;
    if (path.endsWith("/snapshot"))
      return {
        session: {
          leaseId: "lease",
          leaseVersion: 0,
          state: advanced ? "completed" : "active",
        },
      } as T;
    if (path === "/attempts") {
      wrote = true;
      if (loseAnswer) {
        loseAnswer = false;
        throw Error("lost answer response");
      }
      return receipt as T;
    }
    if (path.endsWith("/next")) {
      advanced = true;
      if (loseNext) {
        loseNext = false;
        throw Error("lost next response");
      }
      return { completed: true } as T;
    }
    throw Error(path);
  };
  return {
    api,
    calls,
    get wrote() {
      return wrote;
    },
    get advanced() {
      return advanced;
    },
    loseAnswer: () => (loseAnswer = true),
    loseNext: () => (loseNext = true),
  };
}
describe("offline practice without unconfirmed mastery", () => {
  it("never sends pending answers to a server without the offline evidence protocol", async () => {
    const t = transport();
    const old = async <T>(path: string, body?: unknown): Promise<T> =>
      path === "/me"
        ? ({
            authenticated: true,
            child: { id: "child", householdId: "family" },
          } as T)
        : t.api(path, body);
    await expect(syncOffline(queued(), old, async () => {})).rejects.toThrow(
      "不支持",
    );
    expect(t.wrote).toBe(false);
    expect(t.calls).toHaveLength(0);
  });
  it("keeps the first online confirmation at the initial stage after only assisted or offline evidence", () => {
    const practice = schedule(null, "2026-10-17", "hinted");
    const confirmed = schedule(practice, "2026-10-18", "correct");
    expect(confirmed).toMatchObject({
      stage: 0,
      independentSuccesses: 1,
      dueDay: "2026-10-19",
    });
    expect(schedule(confirmed, "2026-10-19", "correct")).toMatchObject({
      stage: 1,
      independentSuccesses: 2,
    });
  });
  it("freezes the answer, event and occurrence time, leaving no pretend receipt", () => {
    const initial = freshOffline(pack());
    initial.draft.answer = "am";
    const saved = queueOffline(initial, now, "event", "first");
    initial.draft.answer = "are";
    expect(saved.entries[0]).toMatchObject({
      eventId: "event",
      answer: "am",
      clientOccurredAt: now,
    });
    expect(saved.entries[0].receipt).toBeUndefined();
    expect(initial.entries).toHaveLength(0);
    expect(() => queueOffline(saved, now, "new", "first")).toThrow();
  });
  it("rejects a stale submit instead of copying its answer into the next question", () => {
    const p = pack();
    p.items.push({ ...p.items[0], assignmentId: "second", position: 2 });
    const saved = queueOffline(
      { ...freshOffline(p), draft: { answer: "am" } },
      now,
      "event",
      "first",
    );
    expect(() =>
      queueOffline(
        { ...saved, draft: { answer: "am" } },
        now,
        "duplicate",
        "first",
      ),
    ).toThrow("已经前进");
    expect(saved.entries).toHaveLength(1);
  });
  it("preserves all seven task shapes and requires actual local hearing or text support", () => {
    for (const type of [
      "choice",
      "input",
      "order",
      "sort",
      "repair",
      "evidence",
      "listen",
    ] as const) {
      const privateItem = actionRelease.items.find((i) => i.type === type)!;
      const p = pack();
      p.items[0].exercise = publicExercise(privateItem);
      const answer =
        type === "sort"
          ? Object.entries(privateItem.placements!).map(([c, g]) => `${c}=${g}`)
          : type === "repair" || type === "evidence"
            ? JSON.parse(privateItem.answers[0])
            : type === "order"
              ? privateItem.answers[0].replace(/([.!?,])/g, " $1").split(/\s+/)
              : privateItem.answers[0];
      const state = { ...freshOffline(p), draft: { answer } };
      if (type === "listen")
        expect(() => queueOffline(state, now, "event", "first")).toThrow(
          "先听",
        );
      const saved = queueOffline(
        {
          ...state,
          draft: { answer, listening: { heard: false, textSupport: true } },
        },
        now,
        "event",
        "first",
      );
      expect(saved.entries[0].answer).toEqual(answer);
      expect(saved.entries[0].receipt).toBeUndefined();
      expect(offlineAnswerText(p.items[0].exercise, answer)).not.toContain(
        "=g",
      );
    }
  });
  it("rejects incomplete or expired work without deleting queued answers", () => {
    expect(() =>
      queueOffline(freshOffline(pack()), now, "e", "first"),
    ).toThrow();
    const p = pack();
    p.expiresAt = now - 1;
    const saved = { ...freshOffline(p), draft: { answer: "am" } };
    expect(() => queueOffline(saved, now, "e", "first")).toThrow("过期");
    expect(saved.draft.answer).toBe("am");
  });
  it("retries a committed answer whose receipt was lost using the identical event payload", async () => {
    const t = transport();
    t.loseAnswer();
    let stored = queued();
    await expect(
      syncOffline(stored, t.api, async (s) => {
        stored = structuredClone(s);
      }),
    ).rejects.toThrow("lost answer");
    expect(t.wrote).toBe(true);
    expect(stored.entries[0].receipt).toBeUndefined();
    await syncOffline(stored, t.api, async (s) => {
      stored = structuredClone(s);
    });
    const attempts = t.calls.filter((c) => c.path === "/attempts");
    expect(attempts).toHaveLength(2);
    expect(attempts[0].body).toEqual(attempts[1].body);
    expect(stored.entries[0].advanced).toBe(true);
  });
  it("persists a receipt before advancing and can retry a lost advance response", async () => {
    const t = transport();
    t.loseNext();
    let stored = queued();
    await expect(
      syncOffline(stored, t.api, async (s) => {
        stored = structuredClone(s);
      }),
    ).rejects.toThrow("lost next");
    expect(stored.entries[0].receipt).toEqual(receipt);
    expect(stored.entries[0].advanced).toBeUndefined();
    expect(t.advanced).toBe(true);
    await syncOffline(stored, t.api, async (s) => {
      stored = structuredClone(s);
    });
    expect(t.calls.filter((c) => c.path === "/attempts")).toHaveLength(1);
    expect(stored.entries[0].advanced).toBe(true);
  });
  it("stops before advancing when the confirmed receipt cannot be persisted locally", async () => {
    const t = transport();
    await expect(
      syncOffline(queued(), t.api, async () => {
        throw Error("storage full");
      }),
    ).rejects.toThrow("storage full");
    expect(t.wrote).toBe(true);
    expect(t.advanced).toBe(false);
  });
  it("rejects another child or changed lease without claiming a takeover", async () => {
    for (const variant of ["child", "lease"]) {
      const t = transport();
      const api = async <T>(path: string, body?: unknown): Promise<T> =>
        path === "/me" && variant === "child"
          ? ({
              authenticated: true,
              child: { id: "sibling", householdId: "family" },
            } as T)
          : path.endsWith("/snapshot") && variant === "lease"
            ? ({
                session: {
                  leaseId: "new-lease",
                  leaseVersion: 1,
                  state: "active",
                },
              } as T)
            : t.api(path, body);
      await expect(
        syncOffline(queued(), api, async () => {}),
      ).rejects.toThrow();
      expect(t.wrote).toBe(false);
      expect(t.calls.some((c) => c.path.includes("takeover"))).toBe(false);
    }
  });
  it("does not accept an independent or rewarded receipt for offline work", async () => {
    const t = transport();
    const api = async <T>(path: string, body?: unknown): Promise<T> =>
      path === "/attempts"
        ? ({ ...receipt, independentEvidence: true, rewardDelta: 1 } as T)
        : t.api(path, body);
    await expect(syncOffline(queued(), api, async () => {})).rejects.toThrow(
      "回执不匹配",
    );
    expect(t.advanced).toBe(false);
  });
  it("stops sending when the caller loses its active local scope", async () => {
    const t = transport();
    await expect(
      syncOffline(
        queued(),
        t.api,
        async () => {},
        () => false,
      ),
    ).rejects.toThrow("同步已停止");
    expect(t.wrote).toBe(false);
  });
});
describe("encrypted offline device records", () => {
  function storage() {
    const rows = new Map<string, SealedOffline>();
    const v = offlineVault({
      async read(id) {
        return rows.get(id);
      },
      async commit(id, expected, value) {
        if ((rows.get(id)?.version ?? 0) !== expected) throw Error("conflict");
        if (value) rows.set(id, value);
        else rows.delete(id);
      },
    });
    return { rows, v };
  }
  it("stores real ciphertext with a nonextractable key and restores a pending queue", async () => {
    const { rows, v } = storage();
    await v.write("family:child", queued(), 0);
    const raw = rows.get("family:child")!;
    expect(new TextDecoder().decode(raw.data)).not.toContain("小星");
    expect(raw.key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("raw", raw.key)).rejects.toThrow();
    expect((await v.read("family:child"))!.state.entries[0].answer).toBe("am");
  });
  it("prevents another tab from overwriting a newer queue revision", async () => {
    const { v } = storage();
    await v.write("family:child", queued(), 0);
    await expect(
      v.write("family:child", freshOffline(pack()), 0),
    ).rejects.toThrow("conflict");
    expect((await v.read("family:child"))!.state.entries).toHaveLength(1);
  });
  it("binds ciphertext to its family/child scope and detects tampering", async () => {
    const { rows, v } = storage();
    await v.write("family:child", queued(), 0);
    const raw = rows.get("family:child")!;
    rows.set("family:sibling", { ...raw, id: "family:sibling" });
    await expect(v.read("family:sibling")).rejects.toThrow();
    rows.set("family:child", {
      ...raw,
      data: new Uint8Array(raw.data.byteLength).buffer,
    });
    await expect(v.read("family:child")).rejects.toThrow();
    await expect(v.write("other:child", queued(), 0)).rejects.toThrow(
      "档案不匹配",
    );
  });
  it("clears only the explicitly selected profile after revision checks", async () => {
    const { v } = storage();
    await v.write("family:child", queued(), 0);
    const sibling = queued();
    sibling.pack.childId = "sibling";
    await v.write("family:sibling", sibling, 0);
    await expect(v.clear("family:child", 0)).rejects.toThrow("conflict");
    await v.clear("family:child", 1);
    expect(await v.read("family:child")).toBeNull();
    expect(await v.read("family:sibling")).not.toBeNull();
  });
});
