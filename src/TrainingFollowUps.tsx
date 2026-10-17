import { useEffect, useState } from "react";
import type { TrainingCycle } from "../packages/contracts/index";
import { api } from "./api";
import { trainingLabels } from "../packages/domain/training";
export default function TrainingFollowUps({
  childId,
  onOpen,
  all = false,
}: {
  childId: string;
  onOpen: (id: string) => void;
  all?: boolean;
}) {
  const [items, setItems] = useState<TrainingCycle[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setItems([]);
    setError("");
    api<{ items: TrainingCycle[] }>("/training/cycles")
      .then((data) => {
        if (live) setItems(data.items);
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
  }, [childId, revision]);
  const followups = all
    ? items
    : items
        .filter((i) => !i.finished && i.next.phase === "retest")
        .sort((a, b) => a.next.readyAt - b.next.readyAt);
  if (!loading && !error && !followups.length) return null;
  return (
    <section
      className="card training-followups"
      aria-label={all ? "专题分步记录" : "专题回访计划"}
    >
      <span className="eyebrow">
        {all ? "看见每一步的依据" : "给记忆一点时间"}
      </span>
      <h2>{all ? "专题学习足迹" : "这些专题，记得回来看看。"}</h2>
      <p>
        {all
          ? "这里只列实际完成的步骤与原始计数，不把一次完成当作长期掌握。"
          : "回访共用原来的复习记录，逾期会合并。无需为了赶进度今天多做几轮。"}
      </p>
      {loading && <p role="status">正在读取专题足迹…</p>}
      {error && (
        <p className="notice error" role="alert">
          {error}
          <button
            className="text-button"
            onClick={() => setRevision((n) => n + 1)}
          >
            重新读取
          </button>
        </p>
      )}
      <ul>
        {followups.slice(0, 6).map((cycle) => {
          const completed = cycle.results
              .filter((r) => r.completedAt)
              .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
            last = completed[0],
            due = cycle.next.readyAt <= Date.now();
          return (
            <li key={cycle.id}>
              <div>
                <strong>{cycle.title}</strong>
                <p>
                  {cycle.finished
                    ? "本次计划已结束"
                    : cycle.next.phase === "retest"
                      ? `${cycle.next.checkpoint}天回访 · ${due ? "现在可以继续" : new Date(cycle.next.readyAt).toLocaleDateString("zh-CN") + "起"}`
                      : "下一步：" + trainingLabels[cycle.next.phase]}
                </p>
                {all && last && (
                  <p className="footnote">
                    最近完成{trainingLabels[last.phase]} · 独立答对
                    {last.independent}/{last.total}题 · 提示后答对
                    {(last.correct ?? 0) - (last.independent ?? 0)}题
                  </p>
                )}
              </div>
              <button
                className={due && !cycle.finished ? "primary" : "secondary"}
                onClick={() => onOpen(cycle.topicId)}
              >
                查看小计划
              </button>
            </li>
          );
        })}
      </ul>
      {followups.length > 6 && (
        <p className="footnote">
          还有{followups.length - 6}个专题，可从专题列表继续查看。
        </p>
      )}
    </section>
  );
}
