import { useEffect, useRef, useState } from "react";
import type { TrainingCycle } from "../packages/contracts/index";
import { api } from "./api";
import {
  trainingLabels,
  type TrainingPhase,
} from "../packages/domain/training";
import SceneStage from "./SceneStage";
export default function TopicJourney({
  topicId,
  title,
  childId,
  busy,
  onBack,
  onStart,
  onResume,
  onPractice,
}: {
  topicId: string;
  title: string;
  childId?: string;
  busy: boolean;
  onBack: () => void;
  onStart: (cycle: TrainingCycle) => void;
  onResume: (id: string) => void;
  onPractice: () => void;
}) {
  const [cycle, setCycle] = useState<TrainingCycle | null>(null),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const createId = useRef(crypto.randomUUID());
  const load = async () => {
    const data = await api<{ items: TrainingCycle[] }>("/training/cycles");
    setCycle(data.items.find((r) => r.topicId === topicId) ?? null);
  };
  useEffect(() => {
    let live = true;
    setCycle(null);
    setError("");
    setLoading(Boolean(childId));
    createId.current = crypto.randomUUID();
    if (childId)
      api<{ items: TrainingCycle[] }>("/training/cycles")
        .then((data) => {
          if (live)
            setCycle(data.items.find((r) => r.topicId === topicId) ?? null);
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
  }, [topicId, childId]);
  async function create() {
    setSaving(true);
    setError("");
    try {
      setCycle(
        await api<TrainingCycle>("/training/cycles", {
          topicId,
          clientRequestId: createId.current,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "计划暂时没保存，请重试。");
    } finally {
      setSaving(false);
    }
  }
  const waiting = cycle && !cycle.finished && cycle.next.readyAt > Date.now(),
    disabled = busy || saving || loading;
  return (
    <>
      <button className="secondary" onClick={onBack}>
        返回专题列表
      </button>
      <div className="discovery-hero">
        <div>
          <p className="eyebrow">SMALL STEPS, LASTING LEARNING</p>
          <h1>{title}</h1>
          <p className="lead">
            先看看会什么，再看规律、换材料。隔几天回来试一次，给记忆一点生长的时间。
          </p>
        </div>
        <SceneStage kind="workshop" />
      </div>
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
        <ol className="training-steps">
          {(
            ["diagnostic", "practice", "transfer", "retest"] as TrainingPhase[]
          ).map((phase, i) => {
            const done =
              phase === "retest"
                ? cycle?.finished
                : cycle?.results.some(
                    (r) => r.phase === phase && r.completedAt,
                  );
            const current =
              cycle && !cycle.finished && cycle.next.phase === phase;
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
        {loading ? (
          <p role="status">正在读取这个专题的足迹…</p>
        ) : !childId ? (
          <p className="notice">
            请先让家长登录并选择探险档案，再建立自己的小计划。
          </p>
        ) : !cycle ? (
          <>
            <h2>从一次小尝试开始</h2>
            <p>
              不是考试，不计速度。小尝试只抽本计划的部分基础材料，不覆盖全部错因。答对、用过提示、还需练习都会分别留下记录。
            </p>
            <button
              className="primary"
              disabled={disabled}
              onClick={() => void create()}
            >
              建立分步小计划
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
                </button>
              )}
            </div>
            <p className="footnote">
              {cycle.scope === "new-frame"
                ? "应用与复测使用另留的题框，避开本计划练过的框架。这仍是受控文字练习，不代表真实口语或自由表达能力。"
                : "本专题目前检验换词后的提取；不等于已经验证新句型或自由表达。"}
              评估会检查全部已分配材料；新题不足时先做普通巩固，不把旧题算作新测验。
            </p>
            {cycle.coaching.length > 0 && (
              <section className="training-coaching">
                <h3>这几组题，可以再看一眼</h3>
                <p>
                  依据本次小尝试中的提示与作答记录整理，不据此推断唯一错因。
                </p>
                {cycle.coaching.map((card, index) => (
                  <details key={index}>
                    <summary>
                      {card.hinted ? "跟着提示完成的规律" : "还需巩固的规律"}{" "}
                      {index + 1}
                    </summary>
                    <p>{card.rule}</p>
                    <p className="teaching-english">{card.example}</p>
                  </details>
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
                        <span>
                          独立答对{r.independent}/{r.total}题 · 提示后答对
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
              onClick={() => {
                setLoading(true);
                void load()
                  .catch((e) => setError(e.message))
                  .finally(() => setLoading(false));
              }}
            >
              刷新计划与日期
            </button>
          </>
        )}
        <div className="training-practice">
          <p>
            也可以先做普通随机巩固。它与课程、复习共享记录，练完一轮不等于掌握这个专题。
          </p>
          <button
            className="secondary"
            disabled={disabled}
            onClick={onPractice}
          >
            普通随机巩固 · 10题
          </button>
        </div>
      </section>
    </>
  );
}
