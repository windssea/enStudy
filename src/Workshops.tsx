import { useEffect, useState } from "react";
import type { Workshop } from "../packages/contracts/index";
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
          <h1>辨析与应用</h1>
          <button className="secondary" onClick={onBack}>
            返回专题特训
          </button>
        </div>
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
                {n}题
              </option>
            ))}
          </select>
        </label>
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
              <span className="badge">{b.grade}年级起</span>
              <h2>{b.title}</h2>
              <p className="topic-bank-count">
                <strong>{b.items}项任务</strong>
                <span>
                  {Object.entries(b.counts)
                    .filter(([, count]) => count > 0)
                    .map(
                      ([type, count]) =>
                        `${({ sort: "分类", repair: "改错", choice: "选择", input: "填空", evidence: "阅读依据", order: "排序" } as Record<string, string>)[type]} ${count}`,
                    )
                    .join(" · ")}
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
                开始{Math.min(size, b.items)}题
              </button>
            </article>
          ))}
      </div>
    </section>
  );
}
