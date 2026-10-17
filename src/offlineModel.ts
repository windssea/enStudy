import type {
  Answer,
  OfflinePack,
  Receipt,
  Identity,
  Exercise,
} from "../packages/contracts/index";
export function offlineAnswerText(exercise: Exercise, answer: Answer) {
  if (!Array.isArray(answer)) return answer;
  if (exercise.type === "sort")
    return answer
      .map((entry) => {
        const [card, group] = entry.split("=");
        return `${exercise.sorting?.cards.find((c) => c.id === card)?.text ?? "卡片"} → ${exercise.sorting?.groups.find((g) => g.id === group)?.label ?? "未放好"}`;
      })
      .join("；");
  if (exercise.type === "repair")
    return `${exercise.editing?.parts.find((p) => p.id === answer[0])?.text ?? "词块"} → ${answer[1] ?? "未填写"}`;
  if (exercise.type === "evidence")
    return `原文：${exercise.passage?.find((p) => p.id === answer[0])?.text ?? "未选择"}；答案：${answer[1] ?? "未选择"}`;
  return answer.join(" ");
}
import {
  emptyAnswer,
  structuredCanonical,
} from "../packages/domain/structured";
export interface OfflineEntry {
  eventId: string;
  assignmentId: string;
  answer: Answer;
  clientOccurredAt: number;
  listening?: { heard: boolean; textSupport: boolean };
  receipt?: Receipt;
  advanced?: boolean;
}
export interface OfflineState {
  schema: 1;
  pack: OfflinePack;
  entries: OfflineEntry[];
  draft: {
    answer: Answer;
    listening?: { heard: boolean; textSupport: boolean };
  };
}
export function freshOffline(pack: OfflinePack): OfflineState {
  return {
    schema: 1,
    pack,
    entries: [],
    draft: {
      answer: emptyAnswer(pack.items[0].exercise),
      listening: pack.items[0].listening,
    },
  };
}
export function queueOffline(
  state: OfflineState,
  now: number,
  eventId: string,
  assignmentId: string,
): OfflineState {
  if (now > state.pack.expiresAt)
    throw Error("这份练习包已过期，本机答案仍保留。请联网读取原任务。");
  const item = state.pack.items[state.entries.length];
  if (!item) throw Error("本轮离线答案已全部暂存。");
  if (item.assignmentId !== assignmentId)
    throw Error("题目已经前进，请重新读取当前题。");
  if (
    structuredCanonical(item.exercise, state.draft.answer) === null ||
    !String(state.draft.answer).trim()
  )
    throw Error("先完成这一题，再暂存答案。");
  if (
    item.exercise.type === "listen" &&
    !state.draft.listening?.heard &&
    !state.draft.listening?.textSupport
  )
    throw Error("先听一句并确认，或使用文字辅助。");
  const next = state.pack.items[state.entries.length + 1];
  return {
    ...state,
    entries: [
      ...state.entries,
      {
        eventId,
        assignmentId: item.assignmentId,
        answer: structuredClone(state.draft.answer),
        clientOccurredAt: now,
        listening: state.draft.listening,
      },
    ],
    draft: {
      answer: next ? emptyAnswer(next.exercise) : "",
      listening: next?.listening,
    },
  };
}
type Transport = <T>(path: string, body?: unknown) => Promise<T>;
export async function syncOffline(
  initial: OfflineState,
  api: Transport,
  persist: (state: OfflineState) => Promise<void>,
  live: () => boolean = () => true,
) {
  let state = structuredClone(initial);
  const me = await api<Identity>("/me");
  if (
    !me.authenticated ||
    me.child?.id !== state.pack.childId ||
    me.child.householdId !== state.pack.householdId
  )
    throw Error("请联网进入原来的家庭和儿童档案，再同步本机答案。");
  if (me.offlineProtocol !== 1)
    throw Error(
      "当前服务端不支持这份离线同步协议。本机答案保留，请更新服务后重试。",
    );
  if (Date.now() > state.pack.expiresAt)
    throw Error("离线练习包已过期；本机答案仍保留，请回到联网进度。");
  const snapshot = await api<{
    session: {
      leaseId: string | null;
      leaseVersion: number;
      state: string;
    } | null;
  }>(`/sessions/${state.pack.sessionId}/snapshot`);
  if (
    !snapshot.session ||
    (snapshot.session.state !== "completed" &&
      (snapshot.session.leaseId !== state.pack.leaseId ||
        snapshot.session.leaseVersion !== state.pack.leaseVersion)) ||
    !["active", "completed"].includes(snapshot.session.state)
  )
    throw Object.assign(
      Error(
        "这轮练习已换设备或被替换。本机答案保留，请先查看联网进度；不会自动接管另一台设备。",
      ),
      { code: "OFFLINE_LEASE_CHANGED" },
    );
  for (let index = 0; index < state.entries.length; index++) {
    if (!live()) throw Error("同步已停止，本机答案仍保留。");
    let entry = state.entries[index];
    if (entry.advanced) continue;
    const body = {
      eventId: entry.eventId,
      sessionId: state.pack.sessionId,
      assignmentId: entry.assignmentId,
      leaseId: state.pack.leaseId,
      answer: entry.answer,
      evidenceSource: "offline_unverified",
      clientOccurredAt: entry.clientOccurredAt,
    };
    if (!entry.receipt) {
      let receipt: Receipt;
      try {
        receipt = await api<Receipt>("/attempts", body);
      } catch (error) {
        if ((error as { code?: string }).code !== "LISTENING_INPUT_REQUIRED")
          throw error;
        if (!live()) throw Error("档案已变化，其他答案仍在本机。");
        const mode = entry.listening?.textSupport
          ? "text"
          : entry.listening?.heard
            ? "heard"
            : null;
        if (!mode) throw Error("本机听音状态不完整，答案仍保留。");
        await api(`/sessions/${state.pack.sessionId}/listening`, {
          assignmentId: entry.assignmentId,
          leaseId: state.pack.leaseId,
          mode,
        });
        receipt = await api<Receipt>("/attempts", body);
      }
      if (!live())
        throw Error("档案已变化；已确认的作答可在原档案重读，其他答案仍保留。");
      if (
        receipt.independentEvidence ||
        receipt.rewardDelta !== 0 ||
        receipt.support !== "offline"
      )
        throw Error("服务端离线回执不匹配，本机答案仍保留。");
      entry = { ...entry, receipt };
      state.entries[index] = entry;
      await persist(state);
    }
    if (!live()) throw Error("同步已停止，本机答案仍保留。");
    if (snapshot.session.state !== "completed")
      await api(`/sessions/${state.pack.sessionId}/next`, {
        assignmentId: entry.assignmentId,
        leaseId: state.pack.leaseId,
      });
    if (!live()) throw Error("档案已变化，重连后可确认已保存的进度。");
    state.entries[index] = { ...entry, advanced: true };
    await persist(state);
  }
  return state;
}
