import { useEffect, useRef, useState } from "react";
import type { PatternStats } from "../packages/contracts/index";
import { gradeName } from "./practiceCatalog";
import SceneStage from "./SceneStage";
import { api } from "./api";
import PatternFrame from "./PatternFrame";

export default function PatternPractice({
  pattern,
  stats,
  busy,
  childId,
  onBack,
  onStart,
}: {
  pattern: Record<string, string>;
  stats?: PatternStats;
  busy: boolean;
  childId?: string;
  onBack: () => void;
  onStart: (size: number) => void;
}) {
  const [size, setSize] = useState(5);
  const [example, setExample] = useState<string | null>(null),
    [exampleLoading, setExampleLoading] = useState(false),
    [exampleError, setExampleError] = useState("");
  const live = useRef(true);
  const previewRequest = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [pattern.pattern_id]);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      previewRequest.current?.abort();
    };
  }, []);
  async function showExample() {
    if (previewRequest.current || example) return;
    const controller = new AbortController();
    previewRequest.current = controller;
    setExampleLoading(true);
    setExampleError("");
    try {
      const result = childId
        ? await api<{ saved: boolean; example: string }>(
            `/learning/patterns/${encodeURIComponent(pattern.pattern_id)}/view`,
            {},
            { signal: controller.signal },
          )
        : { saved: true, example: pattern.example };
      if (!live.current || controller.signal.aborted) return;
      if (!result.saved || typeof result.example !== "string")
        throw new Error("例句暂时没打开，请重试。");
      setExample(result.example);
    } catch (error) {
      if (live.current && !controller.signal.aborted)
        setExampleError(
          error instanceof Error ? error.message : "例句暂时没打开，请重试。",
        );
    } finally {
      if (previewRequest.current === controller) previewRequest.current = null;
      if (live.current) setExampleLoading(false);
    }
  }
  return (
    <section className="pattern-preparation">
      <div className="library-location">
        <button className="secondary" onClick={onBack} disabled={busy}>
          ← 换个句式
        </button>
        <p>固定句式 / {pattern.cluster} / 准备挑战</p>
      </div>
      <div className="discovery-hero pattern-ready-hero">
        <div>
          <p className="eyebrow">第2步 · 看看这句怎么用</p>
          <h1 ref={heading} tabIndex={-1}>
            把这句话，用进生活里。
          </h1>
          <span className="badge">
            {gradeName(Number(pattern.grade_min))}年级起 · {pattern.cluster}
          </span>
        </div>
        <SceneStage kind="workshop" compact />
      </div>
      <section
        className="card pattern-mission"
        aria-labelledby="pattern-mission-title"
      >
        <h2 id="pattern-mission-title" lang="en">
          <PatternFrame frame={pattern.frame} />
        </h2>
        <p className="frame-help">彩色空位可以换词，组成你想说的话。</p>
        <p>{pattern.slot_rule}</p>
        <details
          className="library-disclosure"
          onToggle={(event) => {
            if (event.currentTarget.open) void showExample();
          }}
        >
          <summary>先看一个例句</summary>
          {exampleLoading && <p role="status">正在打开例句…</p>}
          {exampleError && (
            <div className="notice error" role="alert">
              <p>{exampleError}</p>
              <button
                className="text-button"
                onClick={() => void showExample()}
              >
                再试一次
              </button>
            </div>
          )}
          {example && (
            <p lang="en" className="pattern-example">
              {example}
            </p>
          )}
          <p className="footnote">
            例句帮你理解用法，不计作答。同一天再遇到相同句子，会记为借助示范完成。
          </p>
        </details>
        <div className="pattern-task-preview">
          <span aria-hidden="true">{size}</span>
          <div>
            <h3>这次练{size}道小题</h3>
            <p>选一选、填一填、用词块搭句子。遇到不会的可以看提示。</p>
          </div>
        </div>
        <details className="library-disclosure">
          <summary>换个题量</summary>
          <label className="field">
            每轮题量
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              disabled={busy}
            >
              {[5, 10, 20].map((value) => (
                <option key={value} value={value}>
                  {value}题
                </option>
              ))}
            </select>
          </label>
        </details>
        <div className="pattern-start">
          <button
            className="primary"
            disabled={busy || !stats?.items}
            onClick={() => onStart(size)}
          >
            {busy
              ? "正在准备…"
              : !stats?.items
                ? "题库准备中"
                : !childId
                  ? "选择档案，再开始"
                  : `出发，练${size}题`}{" "}
            <span aria-hidden="true">→</span>
          </button>
          <p>
            {childId
              ? "不计速度，可以慢慢想。"
              : "请家长登录并选择档案，就能保存进度。"}
          </p>
        </div>
        <details className="library-disclosure">
          <summary>题库与学习记录说明</summary>
          <p>
            {stats
              ? `${stats.items}个练习变体、${stats.contexts}组情景。`
              : "正在读取题库规模。"}
            每轮按句子去重，最近练过的材料会尽量避开。完成一轮不等于掌握；提示与独立答对分别记录，到期后在复习花园再想一想。
          </p>
        </details>
      </section>
    </section>
  );
}
