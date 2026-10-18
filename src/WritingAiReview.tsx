import { useEffect, useRef, useState } from "react";
import type {
  WritingReviewResult,
  WritingReviewStatus,
} from "../packages/contracts/writingReview";
import {
  parseWritingReview,
  reviewableParagraph,
} from "../packages/domain/writingReview";
import { api } from "./api";
export default function WritingAiReview({
  childId,
  draftId,
  revision,
  section,
  paragraph,
  disabled,
  onClose,
}: {
  childId: string;
  draftId: string;
  revision: number;
  section: number;
  paragraph: string;
  disabled: boolean;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<WritingReviewStatus | null>(null),
    [result, setResult] = useState<WritingReviewResult | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [started, setStarted] = useState(false);
  const epoch = useRef(0),
    statusEpoch = useRef(0),
    live = useRef(false),
    working = useRef(false),
    controller = useRef<AbortController | null>(null),
    requestId = useRef(crypto.randomUUID());
  useEffect(() => {
    live.current = true;
    const reset = () => {
      const stamp = ++statusEpoch.current;
      epoch.current++;
      controller.current?.abort();
      working.current = false;
      setBusy(false);
      setResult(null);
      setConfirmed(false);
      setStarted(false);
      setStatus(null);
      setError("");
      requestId.current = crypto.randomUUID();
      void api<WritingReviewStatus>("/learning/writing/ai/status")
        .then((r) => {
          if (live.current && stamp === statusEpoch.current) setStatus(r);
        })
        .catch((e) => {
          if (live.current && stamp === statusEpoch.current)
            setError(e.message);
        });
    };
    reset();
    document.addEventListener("eq-ai-settings", reset);
    const channel =
      "BroadcastChannel" in window
        ? new BroadcastChannel("eq-ai-settings")
        : null;
    channel?.addEventListener("message", reset);
    return () => {
      live.current = false;
      epoch.current++;
      statusEpoch.current++;
      controller.current?.abort();
      document.removeEventListener("eq-ai-settings", reset);
      channel?.close();
    };
  }, [childId, draftId, revision, section]);
  useEffect(() => {
    if (disabled) {
      epoch.current++;
      controller.current?.abort();
      working.current = false;
      setBusy(false);
      setResult(null);
      setConfirmed(false);
    }
  }, [disabled, paragraph]);
  function stop() {
    epoch.current++;
    controller.current?.abort();
    working.current = false;
    setBusy(false);
    setError("已停止本页等待；已发出的请求可能计费。需要时读取本次结果。");
  }
  async function submit() {
    if (
      working.current ||
      disabled ||
      !confirmed ||
      !status?.enabled ||
      !reviewableParagraph(paragraph)
    )
      return;
    working.current = true;
    const stamp = ++epoch.current;
    controller.current = new AbortController();
    setBusy(true);
    setStarted(true);
    setError("");
    try {
      const r = await api<WritingReviewResult>(
        `/learning/writing/drafts/${draftId}/review`,
        {
          childId,
          expectedRevision: revision,
          section,
          clientRequestId: requestId.current,
          confirmed: true,
          readOnly: status.remaining === 0,
        },
        { signal: controller.current.signal, timeoutMs: 25000 },
      );
      if (!live.current || stamp !== epoch.current) return;
      if (
        r.draftId !== draftId ||
        r.revision !== revision ||
        r.section !== section
      )
        throw Error("点评版本不匹配，请重新读取作品。");
      if (r.review) parseWritingReview(JSON.stringify(r.review), paragraph);
      setResult(r);
    } catch (e) {
      if (live.current && stamp === epoch.current)
        setError(
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : "暂未确认点评结果，可能已产生用量。可读取本次结果，继续写作不受影响。",
        );
    } finally {
      if (live.current && stamp === epoch.current) {
        working.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <section
      className="writing-ai-review"
      aria-label={`第${section + 1}段AI建议`}
      aria-busy={busy}
    >
      <div className="writing-ai-heading">
        <h3>让这一段更清楚一点</h3>
        <button className="text-button" onClick={onClose}>
          收起点评
        </button>
      </div>
      <p>
        AI建议可能有误。先读懂理由，再决定怎样修改；这里不会替你改文或打分。
      </p>
      {disabled ? (
        <p className="notice" role="status">
          先等当前文字确认保存，再请求本段的建议。旧版本的点评已收起。
        </p>
      ) : (
        <>
          {!status && !error && <p role="status">正在核对作品点评开关…</p>}
          {status && !status.enabled && (
            <p className="notice">
              家长还没有开启作品点评。你可以继续用中文提纲、句框和自查来修改。
            </p>
          )}
          {status?.enabled && !reviewableParagraph(paragraph) && (
            <p className="notice">
              请先写下这一段，使用虚构信息，不填网址、联系方式或明显敏感资料。写作和保存照常可用。
            </p>
          )}
          {status?.enabled &&
            reviewableParagraph(paragraph) &&
            !result?.review && (
              <>
                <p>
                  将交给：<strong>{status.connectionLabel}</strong>（
                  {status.providerHost}
                  ）。只发送下面这一段及本段任务提示，可能产生费用。
                </p>
                <blockquote
                  className="writing-review-source"
                  lang="en"
                  tabIndex={0}
                  aria-label="将发送的这一段，可滚动核对全文"
                >
                  {paragraph}
                </blockquote>
                <label className="writing-review-confirm">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={busy}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  我核对了这一段，愿意请家长选定的服务给建议。
                </label>
                {status.remaining === 0 && !started && (
                  <p>
                    今天的共用AI次数已用完；仍可读取本版本已有的点评，没有结果时不会新发请求。
                  </p>
                )}
                <button
                  className="secondary"
                  disabled={busy || !confirmed}
                  onClick={() => void submit()}
                >
                  {busy
                    ? "正在准备建议…"
                    : status.remaining === 0
                      ? "读取本版本的已有点评"
                      : started
                        ? "读取本次点评结果"
                        : "请AI给这一段建议"}
                </button>
              </>
            )}
          {busy && (
            <p role="status">
              正在点评，可以继续写作。
              <button className="text-button" onClick={stop}>
                停止等待
              </button>
            </p>
          )}
          {result?.pending && (
            <p role="status">这次请求仍在处理中，稍后可手动读取同一次结果。</p>
          )}
          {result?.review && (
            <div className="writing-review-result" aria-live="polite">
              <span className="badge">
                第{section + 1}段 · 保存版本{revision}的建议
              </span>
              <p>{result.review.encouragementChinese}</p>
              {result.review.observations.map((o, i) => (
                <article key={i} className="writing-review-observation">
                  <h4>可以想一想 · {i + 1}</h4>
                  <p>你写的是：</p>
                  <blockquote lang="en">{o.quote}</blockquote>
                  <p>一种改法：</p>
                  <p lang="en" className="writing-review-example">
                    {o.suggestionEnglish}
                  </p>
                  <p>{o.reasonChinese}</p>
                </article>
              ))}
              <p>
                <strong>下一小步：</strong>
                {result.review.nextStepChinese}
              </p>
              <p className="footnote">
                建议只对应当时保存的这一段。修改并保存后会收起，是否采用由你决定。
              </p>
            </div>
          )}
        </>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <p className="footnote">
        收起或停止等待不会撤回已经发给服务商的内容。点评在10分钟内可读取，不会自动再次请求。
      </p>
    </section>
  );
}
