import { useEffect, useRef, useState } from "react";
import type {
  Answer,
  Identity,
  LearningSession,
  OfflinePack,
} from "../packages/contracts/index";
import { api } from "./api";
import {
  offlineScope,
  sameOfflineScope,
  OFFLINE_ACCESS_KEY,
  type OfflineScope,
} from "./offlineAccess";
import { deviceOfflineVault as vault } from "./offlineVault";
import {
  freshOffline,
  queueOffline,
  syncOffline,
  offlineAnswerText,
  type OfflineState,
} from "./offlineModel";
import { prepareOfflineShell } from "./offlineShell";
import StructuredAnswer from "./StructuredAnswer";
import EvidenceAnswer from "./EvidenceAnswer";
import ListeningPrompt from "./ListeningPrompt";

export default function OfflinePractice({
  session,
  identity,
  onReturn,
  onProfile,
  onSynced,
  onChoose,
}: {
  session: LearningSession | null;
  identity: Identity;
  onReturn: () => void;
  onProfile: () => void;
  onSynced: () => Promise<void>;
  onChoose: () => void;
}) {
  const [scope, setScope] = useState<OfflineScope | null>(offlineScope),
    [record, setRecord] = useState<{
      state: OfflineState;
      version: number;
    } | null>(null),
    [draft, setDraft] = useState<OfflineState["draft"]>({ answer: "" }),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reconnectNeeded, setReconnectNeeded] = useState(false),
    [notice, setNotice] = useState(""),
    [reload, setReload] = useState(0),
    [online, setOnline] = useState(navigator.onLine);
  const tail = useRef<Promise<unknown>>(Promise.resolve()),
    dirty = useRef(false),
    operation = useRef(false),
    generation = useRef(0),
    alive = useRef(true),
    edits = useRef(0),
    scopeRef = useRef(scope);
  scopeRef.current = scope;
  function begin() {
    if (operation.current) return false;
    operation.current = true;
    setBusy(true);
    return true;
  }
  const id = scope ? `${scope.householdId}:${scope.childId}` : null;
  useEffect(() => {
    alive.current = true;
    const access = (event: Event) => {
      if (
        event.type === "storage" &&
        (event as StorageEvent).key !== OFFLINE_ACCESS_KEY &&
        (event as StorageEvent).key !== null
      )
        return;
      const next = offlineScope();
      if (sameOfflineScope(scopeRef.current, next)) return;
      generation.current++;
      edits.current++;
      dirty.current = false;
      setRecord(null);
      setDraft({ answer: "" });
      setScope(next);
      setReload((n) => n + 1);
    };
    const network = () => setOnline(navigator.onLine);
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("eq-offline-access", access);
    window.addEventListener("storage", access);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    window.addEventListener("beforeunload", leave);
    return () => {
      alive.current = false;
      generation.current++;
      window.removeEventListener("eq-offline-access", access);
      window.removeEventListener("storage", access);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      window.removeEventListener("beforeunload", leave);
    };
  }, []);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    setRecord(null);
    if (!id) {
      setLoading(false);
      return;
    }
    vault
      .read(id)
      .then((value) => {
        if (live && sameOfflineScope(scope, offlineScope())) {
          setRecord(value);
          setDraft(value?.state.draft ?? { answer: "" });
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [id, reload]);
  const current =
    record &&
    scope &&
    record.state.pack.childId === scope.childId &&
    record.state.pack.householdId === scope.householdId
      ? record
      : null;
  const state = current?.state,
    item = state?.pack.items[state.entries.length],
    pending = state?.entries.filter((e) => !e.advanced).length ?? 0,
    confirmed = state?.entries.filter((e) => !!e.receipt).length ?? 0;
  const hasDraft = (value: OfflineState["draft"]) =>
    typeof value.answer === "string"
      ? !!value.answer.trim()
      : value.answer.length > 0;
  function mutate(change: (value: OfflineState) => OfflineState) {
    const packId = state?.pack.id,
      captured = scope;
    const job = tail.current.then(async () => {
      if (!id || !sameOfflineScope(captured, offlineScope()))
        throw Error("档案已变化，当前输入尚未保存。");
      const value = await vault.read(id);
      if (!value || value.state.pack.id !== packId)
        throw Error("本机练习包已变化，请重新读取。");
      const next = change(value.state);
      const version = await vault.write(id, next, value.version);
      if (alive.current && sameOfflineScope(captured, offlineScope()))
        setRecord({ state: next, version });
      return next;
    });
    tail.current = job.catch(() => {});
    return job;
  }
  function changeDraft(next: OfflineState["draft"]) {
    setDraft(next);
    dirty.current = true;
    setNotice("正在保存到本机…");
    const assignment = item?.assignmentId,
      edit = ++edits.current;
    void mutate((value) =>
      value.pack.items[value.entries.length]?.assignmentId === assignment
        ? { ...value, draft: next }
        : value,
    )
      .then(() => {
        if (alive.current && edit === edits.current) {
          dirty.current = false;
          setNotice("草稿已在本机保存，尚未同步云端。");
        }
      })
      .catch((e) => {
        if (alive.current) setError(e.message);
      });
  }
  async function prepare() {
    if (
      !session ||
      session.access !== "owner" ||
      !session.leaseId ||
      !identity.authenticated ||
      !scope
    ) {
      setError("请先联网进入原档案，并开始一轮普通课程或随机特训。");
      return;
    }
    if (import.meta.env.DEV) {
      setError("离线刷新请使用本机预览版；开发页不会缓存编译中的模块。");
      return;
    }
    if (pending || dirty.current || hasDraft(draft)) {
      setError("先同步或保留当前本机答案，再准备新的练习包。");
      return;
    }
    if (!begin()) return;
    setError("");
    setNotice("正在准备题目和离线页面，请保持联网…");
    const captured = scope;
    try {
      const pack = await api<OfflinePack>(
        `/sessions/${session.id}/offline-pack`,
        { assignmentId: session.assignmentId, leaseId: session.leaseId },
      );
      if (
        !sameOfflineScope(captured, offlineScope()) ||
        pack.childId !== captured.childId ||
        pack.householdId !== captured.householdId
      )
        throw Error("档案已变化，未保留新的练习包。");
      await prepareOfflineShell();
      if (!sameOfflineScope(captured, offlineScope()))
        throw Error("档案已变化，未保留新的练习包。");
      const existing = await vault.read(id!);
      if (
        existing &&
        (existing.state.entries.some((e) => !e.advanced) ||
          hasDraft(existing.state.draft))
      )
        throw Error("另一页有待同步答案，未覆盖原练习。");
      const next = freshOffline(pack),
        version = await vault.write(id!, next, existing?.version ?? 0);
      setRecord({ state: next, version });
      setDraft(next.draft);
      setNotice(
        "本轮已准备好，可断网练习；答案只在本机暂存，联网同步后才确认。",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "离线练习没有准备完整，请重试。",
      );
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  async function queue() {
    if (!item || !state) return;
    if (!begin()) return;
    setError("");
    try {
      const next = await mutate((value) =>
        queueOffline(
          { ...value, draft },
          Date.now(),
          crypto.randomUUID(),
          item.assignmentId,
        ),
      );
      dirty.current = false;
      setDraft(next.draft);
      setNotice("答案已在本机暂存，尚未判题，也未确认云端保存。");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  async function synchronize() {
    if (!state || !id || !pending) return;
    if (!begin()) return;
    setError("");
    setNotice("正在逐题确认，请保持页面打开…");
    const stamp = generation.current,
      captured = scope;
    const live = () =>
      alive.current &&
      stamp === generation.current &&
      sameOfflineScope(captured, offlineScope());
    try {
      await tail.current;
      if (dirty.current) throw Error("本题草稿未能保存，请先重试保存。");
      const latest = await vault.read(id);
      if (!latest || latest.state.pack.id !== state.pack.id)
        throw Error("本机练习包已变化，请重读。");
      let version = latest.version;
      await syncOffline(
        latest.state,
        api,
        async (next) => {
          if (!live()) throw Error("档案已变化，其他答案仍在本机。");
          version = await vault.write(id, next, version);
          if (live()) setRecord({ state: structuredClone(next), version });
        },
        live,
      );
      setNotice("已收到服务端确认。本次离线练习不增加独立掌握计数或星星。");
      await onSynced();
    } catch (e) {
      setReconnectNeeded(
        [
          "OFFLINE_LEASE_CHANGED",
          "LEASE_REPLACED",
          "TAKEOVER_REQUIRED",
        ].includes((e as { code?: string }).code ?? ""),
      );
      setError(
        `${(e as Error).message} 本机答案未删除；网络错误时，云端可能已收到部分答案，下次会用原编号确认。`,
      );
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  async function clear() {
    if (
      !current ||
      !id ||
      !window.confirm(
        pending
          ? "还有待同步答案。确定删除这台设备上的本轮草稿与答案？此操作不能撤销。"
          : "清除本机这轮练习？已同步的云端记录会保留。",
      )
    )
      return;
    if (!begin()) return;
    try {
      await tail.current;
      const latest = await vault.read(id);
      if (!latest || latest.state.pack.id !== current.state.pack.id)
        throw Error("本机练习已变化，未清除另一份练习。");
      await vault.clear(id, latest.version);
      setRecord(null);
      setDraft({ answer: "" });
      dirty.current = false;
      setNotice("本机这轮练习已清除。");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  async function reconnect() {
    if (!state || !pending || !begin()) return;
    setError("");
    try {
      const me = await api<Identity>("/me");
      if (
        !me.authenticated ||
        me.child?.id !== state.pack.childId ||
        me.child.householdId !== state.pack.householdId
      )
        throw Error("请家长先进入原来的儿童档案，再重新授权。");
      const saved = await api<{ session: LearningSession | null }>(
        `/sessions/${state.pack.sessionId}/snapshot`,
      );
      let latest = saved.session;
      if (latest?.state === "completed") {
        setNotice("云端已完成本轮，可以直接点同步确认已有回执，无需接管。");
        return;
      }
      if (!latest || latest.state !== "active")
        throw Error("原任务已被替换，不能覆盖新的进度。本机答案仍保留。");
      if (
        !window.confirm(
          "在这台设备接着同步原任务？另一台设备将暂停写入。离线答案会逐题核对，云端已有不同答案时会停止，并保留本机答案。",
        )
      )
        return;
      if (latest.access !== "owner")
        latest = (
          await api<{ session: LearningSession }>(
            `/sessions/${state.pack.sessionId}/takeover`,
            {
              clientRequestId: crypto.randomUUID(),
              expectedLeaseVersion: latest.leaseVersion,
            },
          )
        ).session;
      if (!latest.leaseId || latest.access !== "owner")
        throw Error("设备授权尚未接上，请重新读取进度。");
      const leaseId = latest.leaseId,
        leaseVersion = latest.leaseVersion;
      await mutate((value) => ({
        ...value,
        pack: { ...value.pack, leaseId, leaseVersion },
      }));
      setNotice(
        "本机已重新获得这轮任务的权限。请点同步逐题确认；尚未自动提交答案。",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  const virtual: LearningSession | null =
    item && state
      ? {
          id: state.pack.sessionId,
          assignmentId: item.assignmentId,
          exercise: item.exercise,
          leaseId: state.pack.leaseId,
          leaseVersion: state.pack.leaseVersion,
          access: "owner",
          state: "active",
          hintLevel: 0,
          listening: draft.listening,
        }
      : null;
  const inputDisabled =
    busy || !item || (!!state && Date.now() > state.pack.expiresAt);
  const answerChange = (answer: Answer) => changeDraft({ ...draft, answer });
  return (
    <div className="offline-practice">
      <div className="page-head">
        <div>
          <p className="eyebrow">断网也能练，联网再确认</p>
          <h1>把一轮练习，带在身边。</h1>
          <p className="lead">
            {online
              ? "设备显示已联网；同步仍以服务端回执为准。"
              : "设备显示离线，答案会留在本机。"}
          </p>
        </div>
        <button className="secondary" onClick={onReturn}>
          查看联网进度
        </button>
      </div>
      <ol className="offline-path" aria-label="离线练习步骤">
        <li>1 · 联网准备本轮</li>
        <li>2 · 本机暂存答案</li>
        <li>3 · 联网逐题确认</li>
      </ol>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              if (
                dirty.current &&
                !window.confirm(
                  "当前输入尚未在本机保存。确定放弃这段输入并重读已保存的草稿？",
                )
              )
                return;
              dirty.current = false;
              setReload((n) => n + 1);
            }}
          >
            重新读取本机
          </button>
        </div>
      )}
      {reconnectNeeded && error && pending > 0 && online && (
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void reconnect()}
        >
          设备或登录变化？重新授权本机
        </button>
      )}
      {loading ? (
        <p role="status">正在读取本机练习…</p>
      ) : !scope ? (
        <section className="card">
          <h2>先联网进入你的档案</h2>
          <p>
            退出或切换账号会锁定本机练习；数据仍在原档案中，联网进入原档案后可恢复。
          </p>
          <button className="primary" onClick={onProfile}>
            去家长空间选择档案
          </button>
        </section>
      ) : !current ? (
        <section className="card offline-prepare">
          <h2>先带走当前这一轮</h2>
          <p>
            联网开始一轮课程、单词或随机特训，再回来准备。只保存题目和自己的答案，不带正确答案；有效期7天。
          </p>
          <p>
            题目与答案加密留在这台设备，退出账号会锁定。浏览器清理数据或设备存储紧张时可能删除本机资料，请及时同步。AI服务与专题分步测验需要联网。
          </p>
          <p>
            开始准备后，这轮只作练习记录，不计独立晋级或星星。即使页面缓存失败，随后联网提交也会保留这个规则。
          </p>
          {import.meta.env.DEV ? (
            <a className="primary" href="http://127.0.0.1:8788/#offline">
              打开本机预览版准备离线练习
            </a>
          ) : !session ? (
            <button className="primary" disabled={!online} onClick={onChoose}>
              先选一轮联网练习
            </button>
          ) : session.access !== "owner" ? (
            <button className="primary" disabled={!online} onClick={onReturn}>
              先查看进度并接续
            </button>
          ) : session.training ? (
            <button className="primary" disabled={!online} onClick={onReturn}>
              继续联网完成分步测验
            </button>
          ) : (
            <button
              className="primary"
              disabled={busy || !online}
              onClick={() => void prepare()}
            >
              {busy ? "正在准备…" : "准备当前这轮离线练习"}
            </button>
          )}
        </section>
      ) : (
        <>
          <section className="offline-summary card">
            <div>
              <p className="eyebrow">{state!.pack.nickname}的本机练习</p>
              <h2>
                已暂存{state!.entries.length}/{state!.pack.items.length}题 ·
                云端已确认{confirmed}题
              </h2>
              <p>
                待完成同步{pending}题 · 有效至
                {new Date(state!.pack.expiresAt).toLocaleString("zh-CN")}
                （本机时间）
              </p>
            </div>
            <button
              className="secondary"
              disabled={busy || !pending || !online}
              onClick={() => void synchronize()}
            >
              {busy ? "正在处理…" : "同步本机答案"}
            </button>
          </section>
          {Date.now() > state!.pack.expiresAt && (
            <p className="notice">
              练习包已过期。本机答案仍可查看；请联网读取原任务，过期答案不会自动提交。
            </p>
          )}
          {item && virtual ? (
            <article className="card offline-question">
              <p className="badge">
                离线练习 · 第{state!.entries.length + 1}/
                {state!.pack.items.length}题 · 尚未判题
              </p>
              <h2>{item.exercise.title}</h2>
              <p>{item.exercise.context}</p>
              <h3 lang="en">{item.exercise.prompt}</h3>
              {item.exercise.reading && (
                <p lang="en">{item.exercise.reading}</p>
              )}
              {item.exercise.type === "listen" && (
                <ListeningPrompt
                  key={item.assignmentId}
                  session={virtual}
                  disabled={inputDisabled}
                  answered={false}
                  local
                  onState={(listening) => changeDraft({ ...draft, listening })}
                />
              )}
              {item.exercise.type === "evidence" ? (
                <EvidenceAnswer
                  key={item.assignmentId}
                  exercise={item.exercise}
                  answer={draft.answer}
                  onChange={answerChange}
                  disabled={inputDisabled}
                />
              ) : ["sort", "repair"].includes(item.exercise.type) ? (
                <StructuredAnswer
                  key={item.assignmentId}
                  exercise={item.exercise}
                  answer={draft.answer}
                  onChange={answerChange}
                  disabled={inputDisabled}
                />
              ) : ["choice", "listen"].includes(item.exercise.type) ? (
                <div className="answer-options">
                  {item.exercise.choices?.map((choice) => (
                    <button
                      key={choice}
                      className="answer-option"
                      aria-pressed={draft.answer === choice}
                      disabled={inputDisabled}
                      onClick={() => answerChange(choice)}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              ) : item.exercise.type === "input" ? (
                <label className="field">
                  你的答案
                  <input
                    lang="en"
                    autoComplete="off"
                    spellCheck={false}
                    value={String(draft.answer)}
                    maxLength={100}
                    disabled={inputDisabled}
                    onChange={(e) => answerChange(e.target.value)}
                  />
                </label>
              ) : (
                <div className="offline-order">
                  <p lang="en">
                    {Array.isArray(draft.answer)
                      ? draft.answer.join(
                          item.exercise.graphemeTokens ? "" : " ",
                        )
                      : ""}
                  </p>
                  <div className="token-bank">
                    {item.exercise.tokens?.map((token, index) => (
                      <button
                        className="token"
                        key={index}
                        disabled={
                          inputDisabled ||
                          (Array.isArray(draft.answer)
                            ? draft.answer.filter((value) => value === token)
                                .length
                            : 0) >=
                            (item.exercise.tokens?.filter(
                              (value) => value === token,
                            ).length ?? 0)
                        }
                        onClick={() =>
                          answerChange([
                            ...(Array.isArray(draft.answer)
                              ? draft.answer
                              : []),
                            token,
                          ])
                        }
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                  <button
                    className="text-button"
                    disabled={inputDisabled}
                    onClick={() => answerChange([])}
                  >
                    重新组句
                  </button>
                </div>
              )}
              <button
                className="primary"
                disabled={inputDisabled}
                onClick={() => void queue()}
              >
                暂存答案
                {state!.entries.length + 1 < state!.pack.items.length
                  ? "，下一题"
                  : "，完成本机练习"}
              </button>
              <p className="footnote">
                这一步只存到本机，不判对错、不加星星，也不改变云端进度。
              </p>
            </article>
          ) : (
            <section className="card">
              <h2>本轮答案都已在本机暂存</h2>
              <p>联网后点“同步本机答案”，逐题核对并取得服务端确认。</p>
            </section>
          )}
          <details className="card offline-records">
            <summary>查看本机答案与确认记录</summary>
            <ol>
              {state!.entries.map((entry, index) => (
                <li key={entry.eventId}>
                  <strong>
                    第{index + 1}题 ·{" "}
                    {entry.receipt ? "云端已确认" : "仅在本机，待确认"}
                  </strong>
                  <p>
                    {offlineAnswerText(
                      state!.pack.items[index].exercise,
                      entry.answer,
                    )}
                  </p>
                  {entry.receipt && (
                    <>
                      <p>
                        {entry.receipt.outcome === "incorrect"
                          ? "还需再练"
                          : "本次核对正确，另记离线练习证据"}
                      </p>
                      <p>{entry.receipt.feedback}</p>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </details>
          <div className="offline-tools">
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void clear()}
            >
              清除本机这轮练习
            </button>
            {!pending &&
              state!.entries.length === state!.pack.items.length &&
              (session &&
              session.id !== state!.pack.sessionId &&
              session.access === "owner" &&
              !session.training ? (
                <button
                  className="secondary"
                  disabled={busy || !online}
                  onClick={() => void prepare()}
                >
                  准备当前联网任务
                </button>
              ) : (
                <button
                  className="secondary"
                  disabled={busy || !online}
                  onClick={onChoose}
                >
                  去选下一轮联网练习
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
