import { featureLazy } from "./featureLazy";
import { Suspense, useEffect, useRef, useState } from "react";
import type { TrainingCycle } from "../packages/contracts/index";
import { api } from "./api";
import { conceptLab } from "../packages/domain/concepts";
import { trainingContinuation } from "./topicPractice";
import LearningIcon from "./LearningIcon";
const ConceptLab = featureLazy(() => import("./ConceptLab"));
const TenseComparison = featureLazy(() => import("./TenseComparison"));

export default function TopicJourney({
  topicId,
  title,
  childId,
  busy,
  onBack,
  onStart,
  onResume,
  onPractice,
  onProfile,
}: {
  topicId: string;
  title: string;
  childId?: string;
  busy: boolean;
  onBack: () => void;
  onStart: (cycle: TrainingCycle) => void | Promise<void>;
  onResume: (id: string) => void;
  onPractice: (size: number) => void;
  onProfile: () => void;
}) {
  const [cycle, setCycle] = useState<TrainingCycle | null>(null);
  const [roundSize, setRoundSize] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const generation = useRef(0),
    pending = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [topicId]);
  useEffect(() => {
    const current = ++generation.current;
    const controller = new AbortController();
    setCycle(null);
    setError("");
    if (childId) {
      void Promise.all([
        api<{ items: TrainingCycle[] }>("/training/cycles", undefined, {
          signal: controller.signal,
        }),
        api<{ childId: string; topicId: string }>(
          `/training/materials/${encodeURIComponent(topicId)}`,
          undefined,
          { signal: controller.signal },
        ),
      ])
        .then(([plans, outline]) => {
          if (generation.current !== current) return;
          if (outline.childId !== childId || outline.topicId !== topicId)
            throw Error("档案已变化，请重新打开专题。");
          setCycle(plans.items.find((row) => row.topicId === topicId) ?? null);
        })
        .catch(() => {
          if (generation.current === current)
            setError("专题记录暂时无法读取。");
        });
    }
    return () => {
      generation.current++;
      controller.abort();
    };
  }, [topicId, childId, revision]);
  const continuation = trainingContinuation(cycle);
  const disabled = busy || saving;
  const lab = topicId.startsWith("tense.") ? undefined : conceptLab(topicId);
  async function continueTraining() {
    if (!cycle || !continuation || disabled || pending.current) return;
    if (cycle.next.sessionId) {
      onResume(cycle.next.sessionId);
      return;
    }
    const current = generation.current;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const updated = cycle.materials?.canAdopt
        ? await api<TrainingCycle>(
            `/training/cycles/${encodeURIComponent(cycle.id)}/materials`,
            { expectedVersion: cycle.version },
          )
        : cycle;
      if (generation.current !== current) return;
      if (updated.id !== cycle.id || updated.topicId !== topicId)
        throw Error("专题记录已变化，请重试。");
      setCycle(updated);
      await onStart(updated);
    } catch (e) {
      if (generation.current === current)
        setError(e instanceof Error ? e.message : "练习暂时无法接续。");
    } finally {
      pending.current = false;
      if (generation.current === current) setSaving(false);
    }
  }
  return (
    <>
      <button className="secondary" onClick={onBack}>
        返回专题列表
      </button>
      <div className="discovery-hero training-hero">
        <h1 ref={heading} tabIndex={-1}>
          {title}
        </h1>
      </div>
      <section className="card topic-practice-launch" aria-label="专题练习">
        <label>
          每轮题量
          <select
            value={roundSize}
            disabled={disabled}
            onChange={(e) => setRoundSize(Number(e.target.value))}
          >
            {[5, 10, 20].map((n) => (
              <option key={n} value={n}>
                {n}题
              </option>
            ))}
          </select>
        </label>
        <button
          className="primary"
          disabled={disabled}
          onClick={() => (childId ? onPractice(roundSize) : onProfile())}
          aria-label={childId ? `开始练习，${roundSize}题` : "选择档案，再开始"}
        >
          <LearningIcon kind="play" />
          {disabled ? "正在准备…" : childId ? "开始练习" : "选择档案"}
        </button>
      </section>
      {continuation && (
        <section
          className="topic-practice-continuation"
          aria-label={continuation.label}
        >
          <strong>
            {continuation.label} · {cycle!.next.size}题
          </strong>
          <button
            className="secondary"
            disabled={disabled}
            onClick={() => void continueTraining()}
          >
            {continuation.label === "专题复习" ? "开始复习" : "继续练习"}
            <LearningIcon kind="arrow" />
          </button>
        </section>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
          <button
            className="text-button"
            disabled={disabled}
            onClick={() => setRevision((n) => n + 1)}
          >
            重试
          </button>
        </p>
      )}
      {topicId.startsWith("tense.") && (
        <Suspense fallback={<p role="status">正在准备时态对比…</p>}>
          <TenseComparison
            key={`${topicId}:${childId ?? "guest"}`}
            childId={childId}
          />
        </Suspense>
      )}
      {lab && (
        <Suspense fallback={<p role="status">正在准备示例…</p>}>
          <ConceptLab
            key={`${topicId}:${childId ?? "guest"}`}
            lab={lab}
            childId={childId}
          />
        </Suspense>
      )}
    </>
  );
}
