import { featureLazy } from "./featureLazy";
import { Suspense, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";
import LearningPageHeader from "./LearningPageHeader";
import type {
  WritingContent,
  WritingDraft,
  WritingReceipt,
  WritingSummary,
} from "../packages/contracts/writing";
import {
  blankWriting,
  sameWriting,
  sameWritingText,
  writingLimits,
  writingPrompt,
  writingPrompts,
  writingSaveResult,
  writingText,
} from "../packages/domain/writing";
type SaveCommand = {
  id: string;
  requestId: string;
  expectedRevision: number;
  content: WritingContent;
};
const WritingAiReview = featureLazy(() => import("./WritingAiReview"));
const copy = (c: WritingContent): WritingContent => ({
  ...c,
  paragraphs: [...c.paragraphs],
  checks: [...c.checks],
});
export function WritingPreview({
  draft,
  content,
  savedVersion = false,
}: {
  draft: WritingDraft;
  content: WritingContent;
  savedVersion?: boolean;
}) {
  return (
    <section
      className="writing-preview card"
      aria-label={savedVersion ? "另一处已保存的版本" : "当前文字预览"}
    >
      <span className="badge">
        {savedVersion ? "保存版本（用于比较）" : "当前文字预览"}
      </span>
      <h2>{content.title || "还没起标题的作品"}</h2>
      {content.paragraphs.map((p, i) => (
        <p key={draft.prompt.sections[i].id} lang="en">
          {p || `（${draft.prompt.sections[i].title}还没填写）`}
        </p>
      ))}
      {savedVersion && (
        <small>这是保存版本，供比较；当前文字不会被替换。</small>
      )}
    </section>
  );
}
export default function WritingWorkshop({
  childId,
  grade,
  initialPromptId,
  onBack,
  onDirtyChange,
}: {
  childId?: string;
  grade: number;
  initialPromptId?: string | null;
  onBack: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const initial =
    writingPrompt(initialPromptId ?? "") ??
    writingPrompts.find((p) => p.grade === grade) ??
    writingPrompts[0];
  const [promptId, setPromptId] = useState(initial.id),
    [list, setList] = useState<WritingSummary[]>([]);
  const [draft, setDraft] = useState<WritingDraft | null>(null),
    [content, setContent] = useState<WritingContent>(() =>
      blankWriting(initial),
    ),
    [saved, setSaved] = useState<WritingContent>(() => blankWriting(initial));
  const [busy, setBusy] = useState<
      "load" | "create" | "save" | "remove" | null
    >(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [conflict, setConflict] = useState(false),
    [remote, setRemote] = useState<WritingDraft | null>(null);
  const [reviewSection, setReviewSection] = useState<number | null>(null);
  const reviewTriggers = useRef<(HTMLButtonElement | null)[]>([]);
  const generation = useRef(0),
    pending = useRef<SaveCommand | null>(null),
    saving = useRef(false);
  const creating = useRef<{
    requestId: string;
    promptId: string;
    content?: WritingContent;
  } | null>(null);
  const live = useRef({ draft, content, saved });
  live.current = { draft, content, saved };
  const dirty = !!draft && !sameWriting(content, saved),
    textDirty = !!draft && !sameWritingText(content, saved),
    unconfirmed =
      dirty || !!pending.current || !!creating.current || busy === "save",
    blocked = busy !== null && busy !== "save";
  useEffect(() => {
    onDirtyChange(unconfirmed);
    return () => onDirtyChange(false);
  }, [unconfirmed, onDirtyChange]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (
        !pending.current &&
        !creating.current &&
        !saving.current &&
        (!live.current.draft ||
          sameWriting(live.current.content, live.current.saved))
      )
        return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      generation.current++;
      window.removeEventListener("beforeunload", warn);
    };
  }, []);
  async function refreshList(token = generation.current) {
    const result = await api<{ items: WritingSummary[] }>(
      "/learning/writing/drafts",
    );
    if (token === generation.current) setList(result.items);
  }
  useEffect(() => {
    if (childId)
      void refreshList().catch((e) =>
        setError(e instanceof Error ? e.message : "还没读取到草稿。"),
      );
  }, [childId]);
  useEffect(() => {
    if (initialPromptId && writingPrompt(initialPromptId))
      setPromptId(initialPromptId);
  }, [initialPromptId]);
  const mayLeave = () =>
    (!pending.current &&
      !creating.current &&
      !saving.current &&
      (!live.current.draft ||
        sameWriting(live.current.content, live.current.saved))) ||
    window.confirm(
      "还有文字未确认保存。可以先下载一份保留；现在仍要离开这份草稿吗？",
    );
  const fail = (e: unknown) =>
    e instanceof Error
      ? e.message
      : "没有确认保存，这页文字仍保留。可以下载一份，再手动重试。";
  async function open(id: string, confirmed = false) {
    if (!confirmed && !mayLeave()) return;
    const token = ++generation.current;
    pending.current = null;
    creating.current = null;
    setBusy("load");
    setNotice("正在读取保存版本…");
    setError("");
    setRemote(null);
    setConflict(false);
    try {
      const result = await api<{ draft: WritingDraft }>(
        `/learning/writing/drafts/${id}`,
      );
      if (token !== generation.current) return;
      setDraft(result.draft);
      setContent(copy(result.draft));
      setSaved(copy(result.draft));
      setPromptId(result.draft.prompt.id);
      setNotice("已读取这份草稿的保存版本。");
    } catch (e) {
      if (token === generation.current) setError(fail(e));
    } finally {
      if (token === generation.current) setBusy(null);
    }
  }
  async function create(keepCurrent = false) {
    if (!childId || (!keepCurrent && !creating.current && !mayLeave())) return;
    const command = creating.current ?? {
      requestId: crypto.randomUUID(),
      promptId: keepCurrent
        ? (live.current.draft?.prompt.id ?? promptId)
        : promptId,
      ...(keepCurrent ? { content: copy(live.current.content) } : {}),
    };
    creating.current = command;
    const token = ++generation.current;
    pending.current = null;
    setBusy("create");
    setNotice("正在新建草稿…");
    setError("");
    setConflict(false);
    setRemote(null);
    try {
      const receipt = await api<WritingReceipt>("/learning/writing/drafts", {
        childId,
        promptId: command.promptId,
        requestId: command.requestId,
      });
      const result = await api<{ draft: WritingDraft }>(
        `/learning/writing/drafts/${receipt.draftId}`,
      );
      if (token !== generation.current) return;
      setDraft(result.draft);
      setSaved(copy(result.draft));
      setContent(
        command.content
          ? { ...command.content, checks: [] }
          : copy(result.draft),
      );
      setPromptId(result.draft.prompt.id);
      creating.current = null;
      setNotice(
        command.content ? "已新建一份，正在保存保留的文字。" : "草稿已新建。",
      );
      await refreshList(token);
    } catch (e) {
      if (token === generation.current) setError(fail(e));
    } finally {
      if (token === generation.current) setBusy(null);
    }
  }
  async function save() {
    if (!childId || !live.current.draft || saving.current || creating.current)
      return;
    const current = live.current,
      token = generation.current;
    const command = pending.current ?? {
      id: current.draft!.id,
      requestId: crypto.randomUUID(),
      expectedRevision: current.draft!.revision,
      content: copy(current.content),
    };
    pending.current = command;
    saving.current = true;
    setBusy("save");
    setError("");
    setNotice("正在保存，请等确认后再离开…");
    try {
      const receipt = await api<WritingReceipt>(
        `/learning/writing/drafts/${command.id}/save`,
        {
          childId,
          requestId: command.requestId,
          expectedRevision: command.expectedRevision,
          content: command.content,
        },
      );
      if (token !== generation.current || live.current.draft?.id !== command.id)
        return;
      const result = writingSaveResult(
        command.content,
        live.current.content,
        receipt.checks,
      );
      setSaved(result.saved);
      setContent(
        (current) =>
          writingSaveResult(command.content, current, receipt.checks).content,
      );
      setDraft((d) =>
        d ? { ...d, revision: receipt.revision, updatedAt: Date.now() } : d,
      );
      pending.current = null;
      setNotice(
        receipt.checks.length
          ? "文字和你的自查勾选已确认保存；没有自动评分。"
          : "文字已确认保存。修改后的自查需重新勾选。",
      );
      void refreshList(token).catch(() => {});
    } catch (e) {
      if (token === generation.current) {
        setError(fail(e));
        setNotice("未确认保存，这页文字还在；不要把它当成已同步。");
        if (
          e instanceof ApiError &&
          ["WRITING_CHANGED", "COMMAND_CHANGED", "WRITING_NOT_FOUND"].includes(
            e.code,
          )
        )
          setConflict(true);
      }
    } finally {
      saving.current = false;
      if (token === generation.current) setBusy(null);
    }
  }
  useEffect(() => {
    if (
      !dirty ||
      busy ||
      error ||
      conflict ||
      pending.current ||
      creating.current
    )
      return;
    const timer = setTimeout(() => void save(), 2500);
    return () => clearTimeout(timer);
  }, [content, saved, draft?.revision, busy, error, conflict, dirty]);
  function edit(patch: Partial<WritingContent>) {
    setContent((c) => ({ ...c, ...patch, checks: [] }));
    setNotice("有改动，还未确认保存。停止输入后会尝试保存。");
  }
  async function compare() {
    if (!draft) return;
    const token = generation.current;
    try {
      const r = await api<{ draft: WritingDraft }>(
        `/learning/writing/drafts/${draft.id}`,
      );
      if (token === generation.current) setRemote(r.draft);
    } catch (e) {
      setError(fail(e));
    }
  }
  async function remove() {
    if (
      !draft ||
      !childId ||
      dirty ||
      !window.confirm(
        `移除“${draft.title || "未命名作品"}”？这份草稿和自查记录会删除。需要保留可先下载。`,
      )
    )
      return;
    const token = ++generation.current;
    setBusy("remove");
    setError("");
    try {
      await api(`/learning/writing/drafts/${draft.id}/remove`, {
        childId,
        expectedRevision: draft.revision,
      });
      if (token !== generation.current) return;
      setDraft(null);
      setContent(blankWriting(initial));
      setSaved(blankWriting(initial));
      setNotice("草稿已移除。");
      pending.current = null;
      creating.current = null;
      await refreshList(token);
    } catch (e) {
      if (token === generation.current) {
        if (e instanceof ApiError && e.status === 404) {
          setDraft(null);
          setContent(blankWriting(initial));
          setSaved(blankWriting(initial));
          pending.current = null;
          creating.current = null;
          setNotice("这份草稿已不在保存列表中。");
          void refreshList(token).catch(() => {});
          return;
        }
        if (e instanceof ApiError && e.code === "WRITING_CHANGED")
          setConflict(true);
        setError(fail(e));
      }
    } finally {
      if (token === generation.current) setBusy(null);
    }
  }
  function download() {
    if (!draft) return;
    const url = URL.createObjectURL(
      new Blob([writingText(draft.prompt, content)], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `english-draft-${draft.id}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="writing-workshop">
      <LearningPageHeader title="英语写作" onBack={onBack} />
      <details className="learning-page-details">
        <summary>作品保存与AI点评</summary>
        <p>
          作品只在当前档案保存，不公开发布。AI点评需家长单独开启，再由你核对并主动选择一段发送；保存和自查不会加星星，也不代表语法已正确。
        </p>
      </details>
      {!childId ? (
        <section className="card">
          <h2>先选择一个探险档案</h2>
          <p>请从顶部档案入口登录并选择孩子，再保存自己的作品。</p>
        </section>
      ) : (
        <>
          <section
            className="writing-library card"
            aria-label="主题和已保存草稿"
          >
            <div>
              <label htmlFor="writing-theme">选一个写作主题</label>
              <select
                id="writing-theme"
                value={promptId}
                disabled={!!busy || !!creating.current}
                onChange={(e) => setPromptId(e.target.value)}
              >
                {writingPrompts.map((p) => (
                  <option key={p.id} value={p.id}>
                    P{p.grade} · {p.title}
                  </option>
                ))}
              </select>
              <p>{writingPrompt(promptId)?.description}</p>
              <button
                className={draft ? "secondary" : "primary"}
                disabled={!!busy}
                onClick={() => void create()}
              >
                {busy === "create"
                  ? "正在新建…"
                  : creating.current
                    ? "重试新建这份草稿"
                    : "新建这份草稿"}
              </button>
            </div>
            <details>
              <summary>
                我的草稿（{list.length}/{writingLimits.drafts}）
              </summary>
              <button
                className="text-button"
                disabled={!!busy}
                onClick={() =>
                  void refreshList().catch((e) => setError(fail(e)))
                }
              >
                刷新草稿列表
              </button>
              {list.length === 0 ? (
                <p>还没有读取到作品。新建后会出现在这里。</p>
              ) : (
                <ul>
                  {list.map((row) => (
                    <li key={row.id}>
                      <button
                        className="writing-draft-button"
                        disabled={!!busy}
                        aria-current={row.id === draft?.id ? "true" : undefined}
                        onClick={() => void open(row.id)}
                      >
                        <strong>{row.title || "还没起标题"}</strong>
                        <span>
                          {row.promptTitle} ·{" "}
                          {row.checks ? "有自查记录" : "草稿"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          </section>
          {(error || notice) && (
            <div
              className={`writing-save-state card ${error ? "writing-save-error" : ""}`}
            >
              <p role={error ? "alert" : "status"}>{error || notice}</p>
              {error && (
                <p>这页的输入尚未确认全部同步，可以先下载保留，再手动重试。</p>
              )}
            </div>
          )}
          {draft && (
            <div className="writing-layout">
              <section className="writing-editor card" aria-label="编辑作品">
                <span className="badge">
                  P{draft.prompt.grade} · {draft.prompt.title}
                </span>
                <p>{draft.prompt.description}</p>
                <label htmlFor="writing-title">
                  作品标题 <small>最多{writingLimits.title}个字符</small>
                </label>
                <input
                  id="writing-title"
                  value={content.title}
                  maxLength={writingLimits.title}
                  disabled={blocked}
                  onChange={(e) => edit({ title: e.target.value })}
                />
                <details className="writing-plan">
                  <summary>先用中文想一想（可选）</summary>
                  <label htmlFor="writing-plan">我的提纲</label>
                  <textarea
                    id="writing-plan"
                    value={content.plan}
                    maxLength={writingLimits.plan}
                    disabled={blocked}
                    onChange={(e) => edit({ plan: e.target.value })}
                  />
                  <p>中文提纲也会保存；不会作为英文能力评分。</p>
                </details>
                {draft.prompt.sections.map((s, i) => (
                  <div className="writing-paragraph" key={s.id}>
                    <label htmlFor={`writing-paragraph-${s.id}`}>
                      {s.title}
                    </label>
                    <p id={`writing-help-${s.id}`}>{s.guidance}</p>
                    <details>
                      <summary>需要一个起步句框？</summary>
                      <p lang="en" className="writing-starter">
                        {s.starter}
                      </p>
                      <p>
                        句框只是帮助，省略号要换成自己的内容，也可以不用它。
                      </p>
                    </details>
                    <textarea
                      id={`writing-paragraph-${s.id}`}
                      lang="en"
                      spellCheck
                      value={content.paragraphs[i]}
                      aria-describedby={`writing-help-${s.id}`}
                      maxLength={writingLimits.paragraph}
                      disabled={blocked}
                      onChange={(e) =>
                        edit({
                          paragraphs: content.paragraphs.map((p, j) =>
                            i === j ? e.target.value : p,
                          ),
                        })
                      }
                    />
                    <small>
                      {content.paragraphs[i].length}/{writingLimits.paragraph}{" "}
                      字符
                    </small>
                    <button
                      className="text-button writing-review-trigger"
                      ref={(node) => {
                        reviewTriggers.current[i] = node;
                      }}
                      aria-expanded={reviewSection === i}
                      onClick={() =>
                        setReviewSection(reviewSection === i ? null : i)
                      }
                    >
                      AI建议
                    </button>
                    {reviewSection === i && (
                      <Suspense
                        fallback={<p role="status">正在准备点评入口…</p>}
                      >
                        <WritingAiReview
                          key={`${draft.id}:${draft.revision}:${i}`}
                          childId={childId}
                          draftId={draft.id}
                          revision={draft.revision}
                          section={i}
                          paragraph={content.paragraphs[i]}
                          disabled={unconfirmed || !!busy || conflict}
                          onClose={() => {
                            setReviewSection(null);
                            reviewTriggers.current[i]?.focus();
                          }}
                        />
                      </Suspense>
                    )}
                  </div>
                ))}
                <div className="writing-actions">
                  <button
                    className="primary"
                    disabled={
                      !!busy ||
                      conflict ||
                      (!dirty && !pending.current) ||
                      !!creating.current
                    }
                    onClick={() => void save()}
                  >
                    {busy === "save"
                      ? "正在保存…"
                      : pending.current
                        ? "重试上次保存"
                        : "保存我的作品"}
                  </button>
                  <button className="secondary" onClick={download}>
                    下载当前文字
                  </button>
                  <button
                    className="text-button"
                    disabled={!!busy || dirty || conflict || !!pending.current}
                    onClick={() => void remove()}
                  >
                    移除这份草稿
                  </button>
                </div>
                <p className="footnote">
                  停止输入后自动保存。未确认保存的修改，请先下载保留。
                </p>
                {conflict && (
                  <section
                    className="writing-conflict"
                    aria-label="版本变化处理"
                  >
                    <h2>先保留你这份文字</h2>
                    <p>
                      不会用旧内容覆盖另一台设备的新版本。可以比较保存版本，或把当前文字另存为一份新草稿。
                    </p>
                    <div className="writing-actions">
                      <button
                        className="secondary"
                        onClick={() => void compare()}
                      >
                        查看已保存版本
                      </button>
                      <button
                        className="secondary"
                        disabled={!!busy}
                        onClick={() => void create(true)}
                      >
                        保留这份并另存草稿
                      </button>
                    </div>
                    {remote && (
                      <>
                        <WritingPreview
                          draft={remote}
                          content={remote}
                          savedVersion
                        />
                        <button
                          className="secondary"
                          onClick={() => void open(remote.id)}
                        >
                          载入已保存版本继续
                        </button>
                      </>
                    )}
                  </section>
                )}
                <fieldset
                  disabled={
                    blocked ||
                    textDirty ||
                    !content.paragraphs.some((p) => p.trim()) ||
                    busy === "save" ||
                    conflict
                  }
                >
                  <legend>读回作品，自己检查</legend>
                  <p>保存后可自查；再次修改会清空勾选。</p>
                  {draft.prompt.checklist.map((check) => (
                    <label className="writing-check" key={check.id}>
                      <input
                        type="checkbox"
                        checked={content.checks.includes(check.id)}
                        onChange={(e) => {
                          setContent((c) => ({
                            ...c,
                            checks: e.target.checked
                              ? [...c.checks, check.id].sort()
                              : c.checks.filter((id) => id !== check.id),
                          }));
                          setNotice("自查有改动，还未确认保存。");
                        }}
                      />
                      {check.label}
                    </label>
                  ))}
                </fieldset>
              </section>
              <aside className="writing-side">
                <WritingPreview draft={draft} content={content} />
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}
