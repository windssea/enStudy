import { useEffect, useState } from "react";
import type { TrainingCycle } from "../packages/contracts/index";
import { api } from "./api";
import { trainingLabels } from "../packages/domain/training";
import { trainingFollowUps } from "./topicPractice";
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
  const followups = trainingFollowUps(items, all);
  if (!loading && !error && !followups.length) return null;
  return (
    <section
      className="card training-followups"
      aria-label={all ? "专题分步记录" : "专题回访计划"}
    >
      <h2>{all ? "专题练习记录" : "专题复习"}</h2>
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
                    {last.independent}/{last.total}题 · 提示/示范后答对
                    {(last.correct ?? 0) - (last.independent ?? 0)}题
                  </p>
                )}
              </div>
              <button
                className={due && !cycle.finished ? "primary" : "secondary"}
                onClick={() => onOpen(cycle.topicId)}
              >
                进入专题
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
