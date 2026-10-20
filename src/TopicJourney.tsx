import ToyPicture from "./ToyPicture";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { TrainingCycle } from "../packages/contracts/index";
import { api } from "./api";
import {
  trainingLabels,
  type TrainingPhase,
} from "../packages/domain/training";
import { conceptLab } from "../packages/domain/concepts";
import TrainingCoaching from "./TrainingCoaching";
const ConceptLab = lazy(() => import("./ConceptLab"));
const TenseComparison = lazy(() => import("./TenseComparison"));
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
  const [cycle, setCycle] = useState<TrainingCycle | null>(null),
    [loading, setLoading] = useState(Boolean(childId)),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [loadFailed, setLoadFailed] = useState(false),
    [roundSize, setRoundSize] = useState(5);
  const [labOpen, setLabOpen] = useState(false);
  const [materials, setMaterials] = useState<{
    available: boolean;
    dimensions: { id: string; label: string }[];
  } | null>(null);
  const readProgress = async (signal?: AbortSignal) => {
    const [plans, outline] = await Promise.all([
      api<{ items: TrainingCycle[] }>("/training/cycles", undefined, {
        signal,
      }),
      api<{
        childId: string;
        topicId: string;
        available: boolean;
        dimensions: { id: string; label: string }[];
      }>(`/training/materials/${encodeURIComponent(topicId)}`, undefined, {
        signal,
      }),
    ]);
    if (outline.childId !== childId || outline.topicId !== topicId)
      throw Error("档案有变化，请重新打开专题。");
    return {
      cycle: plans.items.find((r) => r.topicId === topicId) ?? null,
      materials: outline,
    };
  };
  const lab = conceptLab(topicId);
  const createId = useRef(crypto.randomUUID());
  const generation = useRef(0);
  const creating = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [topicId]);
  const load = async () => {
    const current = generation.current;
    setLoading(true);
    setError("");
    try {
      const data = await readProgress();
      if (generation.current !== current) return;
      setCycle(data.cycle);
      setMaterials(data.materials);
      setLoadFailed(false);
    } catch (error) {
      if (generation.current !== current) return;
      setLoadFailed(true);
      setError(error instanceof Error ? error.message : "记录暂时没读到。");
    } finally {
      if (generation.current === current) setLoading(false);
    }
  };
  useEffect(() => {
    const current = ++generation.current;
    const controller = new AbortController();
    setCycle(null);
    setMaterials(null);
    setError("");
    setLoadFailed(false);
    setLoading(Boolean(childId));
    createId.current = crypto.randomUUID();
    if (childId)
      readProgress(controller.signal)
        .then((data) => {
          if (generation.current === current) {
            setCycle(data.cycle);
            setMaterials(data.materials);
          }
        })
        .catch((e) => {
          if (generation.current === current) {
            setLoadFailed(true);
            setError(e.message);
          }
        })
        .finally(() => {
          if (generation.current === current) setLoading(false);
        });
    return () => {
      generation.current++;
      controller.abort();
    };
  }, [topicId, childId]);
  async function create() {
    if (creating.current || !childId || loading || loadFailed) return;
    creating.current = true;
    const current = generation.current;
    setSaving(true);
    setError("");
    try {
      const created = await api<TrainingCycle>("/training/cycles", {
        topicId,
        clientRequestId: createId.current,
      });
      if (generation.current !== current) return;
      setCycle(created);
      if (!created.finished && created.next.readyAt <= Date.now()) {
        if (created.next.sessionId) onResume(created.next.sessionId);
        else await onStart(created);
      }
    } catch (e) {
      if (generation.current !== current) return;
      setError(e instanceof Error ? e.message : "计划暂时没保存，请重试。");
    } finally {
      creating.current = false;
      if (generation.current === current) setSaving(false);
    }
  }
  async function adoptMaterials() {
    if (
      !cycle ||
      !cycle.materials?.canAdopt ||
      creating.current ||
      busy ||
      saving
    )
      return;
    creating.current = true;
    setSaving(true);
    setError("");
    const current = generation.current;
    try {
      const updated = await api<TrainingCycle>(
        `/training/cycles/${encodeURIComponent(cycle.id)}/materials`,
        { expectedVersion: cycle.version },
      );
      if (generation.current !== current) return;
      if (updated.id !== cycle.id || updated.topicId !== topicId)
        throw Error("计划有变化，请刷新后再继续。");
      setCycle(updated);
    } catch (e) {
      if (generation.current === current)
        setError(
          e instanceof Error ? e.message : "材料暂时没准备好，请刷新后再试。",
        );
    } finally {
      creating.current = false;
      if (generation.current === current) setSaving(false);
    }
  }
  const waiting = cycle && !cycle.finished && cycle.next.readyAt > Date.now(),
    disabled = busy || saving || loading;
  return (
    <>
      <button className="secondary" onClick={onBack}>
        返回专题列表
      </button>
      <div className="discovery-hero training-hero">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            {title}
          </h1>
        </div>
      </div>
      {topicId.startsWith("tense.") && (
        <Suspense fallback={<p role="status">正在准备时态对比…</p>}>
          <TenseComparison
            key={`${topicId}:${childId ?? "guest"}`}
            childId={childId}
          />
        </Suspense>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <section
        className="card training-journey"
        aria-busy={loading || saving}
        aria-label="专题分步计划"
      >
        {!loading && materials?.available && !cycle?.finished && (
          <details className="library-disclosure training-blueprint">
            <summary>
              {cycle?.materials?.kind === "shared"
                ? "新材料可以练哪五点？"
                : "这份专用材料练哪五点？"}
            </summary>
            <ol>
              {materials.dimensions.map((d) => (
                <li key={d.id}>{d.label}</li>
              ))}
            </ol>
            <p>
              小尝试、换材料应用和隔天回访，每样试一题。巩固会换一些没做过的材料再练。
            </p>
            {cycle?.materials?.kind === "shared" && (
              <p>
                原来的步骤仍用当时的材料；先完成已开始的一步，再选择用专用材料继续。
              </p>
            )}
          </details>
        )}
        {loading ? (
          <p role="status">正在读取这个专题的足迹…</p>
        ) : loadFailed ? (
          <div className="training-next">
            <div>
              <h2>先把学习记录接回来</h2>
              <p>暂时没读到旧计划，重试后再开始，避免打乱原来的进度。</p>
            </div>
            <button
              className="primary"
              disabled={disabled}
              onClick={() => void load()}
            >
              重新读取记录
            </button>
          </div>
        ) : !childId ? (
          <div className="training-next">
            <div>
              <h2>选择学习档案</h2>
              <p>请家长登录并选择档案。</p>
            </div>
            <button
              className="primary"
              onClick={onProfile}
              aria-label="选择档案，再开始"
            >
              <ToyPicture kind="parent" />
              选择档案
            </button>
          </div>
        ) : !cycle ? (
          <>
            <h2>先做5题，看看会哪些</h2>

            <button
              className="primary"
              disabled={disabled}
              onClick={() => void create()}
            >
              <ToyPicture kind="play" />
              {saving || busy ? "正在准备…" : "开始5题小尝试"}
            </button>
          </>
        ) : (
          <>
            <div className="training-next">
              <div>
                <span className="badge">
                  {cycle.finished
                    ? "计划已走完"
                    : waiting
                      ? "让记忆歇一歇"
                      : "接下来的一小步"}
                </span>
                <h2>
                  {cycle.finished ? "把规律带到生活里吧。" : cycle.next.label}
                  {cycle.next.phase === "retest" && !cycle.finished
                    ? ` · 第${cycle.next.checkpoint}天回访`
                    : ""}
                </h2>
                <p>
                  {cycle.finished
                    ? "本次计划已结束，逾期回访可能已合并。下面只记录实际练习；到期的知识会继续进入复习花园。"
                    : waiting
                      ? `${new Date(cycle.next.readyAt).toLocaleDateString("zh-CN")} 起可以回来，用未见过的材料再试5题。不需要今天多刷一轮。`
                      : cycle.next.sessionId
                        ? "原来的题目、提示和已保存答案还在，接着走就好。"
                        : `这一步有${cycle.next.size}题，标准讲解和提示随时可用。`}
                </p>
              </div>
              {!cycle.finished && !waiting && (
                <button
                  className="primary"
                  disabled={disabled}
                  onClick={() =>
                    cycle.next.sessionId
                      ? onResume(cycle.next.sessionId)
                      : onStart(cycle)
                  }
                >
                  {cycle.next.sessionId
                    ? "继续这一步"
                    : `开始${cycle.next.size}题`}
                  <ToyPicture kind="play" />
                </button>
              )}
            </div>
            <details className="library-disclosure training-evidence-note">
              <summary>这一步的学习记录说明</summary>
              <p className="footnote">
                {cycle.scope === "controlled-context"
                  ? "这份材料专供分步计划；普通随机巩固不会提前抽取。每次小尝试、应用或回访覆盖上面五点，仍是受控文字任务，不代表自由表达或整个专题已经掌握。"
                  : cycle.scope === "new-frame"
                    ? "应用与复测使用另留的题框，避开本计划练过的框架。这仍是受控文字练习，不代表真实口语或自由表达能力。"
                    : "本专题目前检验换词后的提取；不等于已经验证新句型或自由表达。"}
                评估会检查全部已分配材料；新题不足时先做普通巩固，不把旧题算作新测验。
              </p>
            </details>
            {cycle.materials?.canAdopt && materials?.available && (
              <section className="training-material-change">
                <h3>用专用新材料继续</h3>
                <p>
                  已经完成的步骤和作答记录保留原样。选择后，接下来还没开始的步骤使用专用材料，不重做或重置旧结果。
                </p>
                <button
                  className="secondary"
                  disabled={disabled}
                  onClick={() => void adoptMaterials()}
                >
                  {saving ? "正在准备专用材料…" : "接下来使用专用材料"}
                </button>
              </section>
            )}
            {cycle.coaching.length > 0 && (
              <section className="training-coaching">
                <h3>这几组题，可以再看一眼</h3>
                <p>
                  依据本次小尝试中的提示与作答记录整理，不据此推断唯一错因。
                </p>
                {cycle.coaching.map((card, index) => (
                  <TrainingCoaching
                    key={card.eventId ?? index}
                    card={card}
                    childId={childId}
                    index={index}
                  />
                ))}
              </section>
            )}
            {cycle.results.some((r) => r.completedAt) && (
              <section className="training-records">
                <h3>已经走过的小步</h3>
                <ul>
                  {cycle.results
                    .filter((r) => r.completedAt)
                    .map((r) => (
                      <li key={r.sessionId}>
                        <strong>
                          {trainingLabels[r.phase]}
                          {r.checkpoint ? ` · 第${r.checkpoint}天` : ""}
                        </strong>
                        {cycle.materials?.kind === "reserved" && (
                          <small>
                            {r.materialKind === "reserved"
                              ? "专用材料"
                              : "原题库材料"}
                          </small>
                        )}
                        <span>
                          独立答对{r.independent}/{r.total}题 · 提示/示范后答对
                          {(r.correct ?? 0) - (r.independent ?? 0)}题 · 还需巩固
                          {(r.total ?? 0) - (r.correct ?? 0)}题
                        </span>
                      </li>
                    ))}
                </ul>
              </section>
            )}
            <button
              className="text-button"
              disabled={disabled}
              onClick={() => void load()}
            >
              刷新计划与日期
            </button>
          </>
        )}
        {lab && (
          <details
            className="library-disclosure concept-disclosure"
            onToggle={(event) => setLabOpen(event.currentTarget.open)}
          >
            <summary>
              {lab.kind === "timeline"
                ? "先玩一玩时态时间线"
                : "先玩一玩单词变形台"}
            </summary>
            {labOpen && (
              <Suspense fallback={<p role="status">正在搭建互动示范…</p>}>
                <ConceptLab lab={lab} childId={childId} />
              </Suspense>
            )}
          </details>
        )}
        <details className="library-disclosure training-path-details">
          <summary>看看后面怎么学</summary>
          <ol className="training-steps">
            {(
              [
                "diagnostic",
                "practice",
                "transfer",
                "retest",
              ] as TrainingPhase[]
            ).map((phase, i) => {
              const done =
                phase === "retest"
                  ? cycle?.finished
                  : cycle?.results.some(
                      (r) => r.phase === phase && r.completedAt,
                    );
              const current = cycle
                ? !cycle.finished && cycle.next.phase === phase
                : phase === "diagnostic";
              return (
                <li
                  key={phase}
                  data-complete={Boolean(done)}
                  aria-current={current ? "step" : undefined}
                >
                  <span className="training-step-number" aria-hidden="true">
                    {done ? "✓" : i + 1}
                  </span>
                  <strong>{trainingLabels[phase]}</strong>
                  <small>
                    {phase === "diagnostic"
                      ? "5题，先自己尝试"
                      : phase === "practice"
                        ? "10题，优先巩固有困难的题组"
                        : phase === "transfer"
                          ? "5题，使用另一组材料"
                          : "第1、3、7天各5题，逾期合并"}
                  </small>
                </li>
              );
            })}
          </ol>
          <p className="footnote">
            小尝试只覆盖本计划的一部分基础材料，不是完整能力测验。提示、独立答对与需要巩固会分别记录。
          </p>
        </details>
        <details className="training-practice library-disclosure">
          <summary>只想练一小轮？</summary>
          <p>
            也可以先做普通随机巩固。它与课程、复习共享记录，练完一轮不等于掌握这个专题。
          </p>
          <label className="field">
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
            className="secondary"
            disabled={disabled || loadFailed}
            onClick={() => onPractice(roundSize)}
          >
            普通随机巩固 · {roundSize}题
          </button>
        </details>
      </section>
    </>
  );
}
