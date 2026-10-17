import { useEffect, useRef, useState } from "react";
import type {
  AiExplanationResult,
  LearningSession,
} from "../packages/contracts/index";
import { api } from "./api";
import SpeechButton from "./SpeechButton";
export default function AiExplanation({
  session,
  allowed,
}: {
  session: LearningSession;
  allowed: boolean;
}) {
  const [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<AiExplanationResult | null>(null);
  const generation = useRef(0),
    requestId = useRef(crypto.randomUUID()),
    controller = useRef<AbortController | null>(null);
  useEffect(() => {
    let live = true;
    setEnabled(false);
    setBusy(false);
    setResult(null);
    setError("");
    requestId.current = crypto.randomUUID();
    if (allowed)
      api<{ enabled: boolean }>("/ai/status")
        .then((status) => {
          if (live) setEnabled(status.enabled);
        })
        .catch(() => {});
    return () => {
      live = false;
      generation.current++;
      controller.current?.abort();
    };
  }, [session.assignmentId, session.leaseId, allowed]);
  async function explain() {
    const stamp = ++generation.current;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      const value = await api<AiExplanationResult>(
        `/sessions/${session.id}/explain`,
        {
          clientRequestId: requestId.current,
          assignmentId: session.assignmentId,
          leaseId: session.leaseId,
        },
        { signal: controller.current.signal, timeoutMs: 25000 },
      );
      if (generation.current === stamp) setResult(value);
    } catch (error) {
      if (generation.current === stamp)
        setError(
          error instanceof Error
            ? error.name === "AbortError"
              ? "等待已结束，本次请求仍可能产生用量。可读取这次结果，或先看标准讲解。"
              : error.message
            : "AI暂时没有回应，请先看标准讲解。",
        );
    } finally {
      if (generation.current === stamp) setBusy(false);
    }
  }
  if (!allowed || !enabled)
    return (
      <p className="footnote">
        AI辅助需由家长开启；上面的标准讲解可以直接使用。
      </p>
    );
  return (
    <section
      className="ai-explanation"
      aria-label="AI辅助理解"
      aria-busy={busy}
    >
      <div className="ai-explanation-heading">
        <div>
          <span className="badge">AI辅助理解</span>
          <h3>换个说法，再想明白一点。</h3>
        </div>
        {!result?.explanation && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void explain()}
          >
            {result?.pending || error ? "读取这次结果" : "请AI换个说法"}
          </button>
        )}
      </div>
      {busy && (
        <p role="status">
          AI正在准备解释，可以先看标准讲解。
          <button
            className="text-button"
            onClick={() => {
              generation.current++;
              controller.current?.abort();
              setBusy(false);
              setError(
                "已停止等待，请求仍可能产生用量。可读取这次结果，不会自动重复调用。",
              );
            }}
          >
            停止等待
          </button>
        </p>
      )}
      {error && (
        <p className="notice" role="status">
          {error}
        </p>
      )}
      {result?.pending && (
        <p role="status">
          这次请求还在处理中，稍后可以读取结果，标准讲解照常可用。
        </p>
      )}
      <div aria-live="polite">
        {result?.explanation && (
          <>
            <p>{result.explanation.explanationChinese}</p>
            <div className="ai-example">
              <p className="teaching-english" lang="en">
                {result.explanation.exampleEnglish}
              </p>
              <p>{result.explanation.exampleChinese}</p>
              <SpeechButton
                text={result.explanation.exampleEnglish}
                label="听例句"
              />
            </div>
          </>
        )}
      </div>
      <p className="footnote">
        AI可能出错，以标准讲解为准；它不会改变本题评分或掌握记录。请求会使用家长配置的服务并计入家庭用量。
      </p>
    </section>
  );
}
