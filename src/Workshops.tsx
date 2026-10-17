import { useEffect, useState } from "react";
import type { Workshop } from "../packages/contracts/index";
import SceneStage from "./SceneStage";
export default function Workshops({
  busy,
  onStart,
  onBack,
}: {
  busy: boolean;
  onStart: (id: string, size: number) => void;
  onBack: () => void;
}) {
  const [banks, setBanks] = useState<Workshop[]>([]),
    [grade, setGrade] = useState(0),
    [size, setSize] = useState(5),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/content/workshops.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<{ workshops: Workshop[] }>;
      })
      .then((v) => setBanks(v.workshops))
      .catch(() => {
        if (!controller.signal.aborted)
          setError("工坊目录暂未读到，请稍后重新进入。");
      });
    return () => controller.abort();
  }, []);
  return (
    <section className="workshops-page">
      <div className="discovery-hero">
        <div>
          <span className="eyebrow">THINK · SORT · REPAIR</span>
          <h1>英语互动工坊</h1>
          <p className="lead">
            把词句放进合适的篮子，找出一处需要调整的词块。多想一步，学会自己检查。
          </p>
          <button className="secondary" onClick={onBack}>
            返回专题特训
          </button>
        </div>
        <SceneStage kind="sorting" />
      </div>
      <div className="filter-row">
        <label>
          建议年级
          <select
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
          >
            <option value={0}>全部年级</option>
            {[1, 2, 3, 4, 5, 6].map((g) => (
              <option key={g} value={g}>
                P{g}及以下
              </option>
            ))}
          </select>
        </label>
        <label>
          每轮题数
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          >
            {[5, 10, 20].map((n) => (
              <option key={n} value={n}>
                {n}题 · 随时休息
              </option>
            ))}
          </select>
        </label>
        <p>可自由回补，年级只作建议。每题检查一整组或一处修改，不计速度。</p>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="topic-grid">
        {banks
          .filter((b) => !grade || b.grade <= grade)
          .map((b) => (
            <article className="card workshop-bank" key={b.id}>
              <span className="badge">P{b.grade}起 · 分类与修正</span>
              <h2>{b.title}</h2>
              <p>{b.description}</p>
              <p className="topic-bank-count">
                <strong>{b.items}项任务</strong>
                <span>
                  {b.counts.sort}组卡片组合 · {b.counts.repair}句原创修正
                </span>
              </p>
              <details>
                <summary>看看本组规则</summary>
                <p>{b.rule}</p>
              </details>
              <button
                className="primary"
                disabled={busy}
                onClick={() => onStart(b.id, size)}
              >
                随机抽{size}题
              </button>
            </article>
          ))}
      </div>
      <p className="footnote">
        共12个工坊、288组分类组合与96句修正。组合会复用目标词，不等于384条不同语言知识。分类、句子修正与原有选择/拼写分别记录；刚看过示范或答案会记为辅助完成。
      </p>
    </section>
  );
}
