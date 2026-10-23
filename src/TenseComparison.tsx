import { useEffect, useRef, useState } from "react";
import {
  comparisonRowsFor,
  comparisonSentence,
  comparisonVersion,
  referenceLabels,
  timeReferences,
  type TimeReference,
  type TenseComparisonRow,
} from "../packages/domain/tenseComparison";
import art from "../public/content/learning-art.v1.json";
import { api } from "./api";
import TenseComparisonDiagram from "./TenseComparisonDiagram";
import TenseTimelineGame from "./TenseTimelineGame";

function ComparisonRow({ row }: { row: TenseComparisonRow }) {
  const state =
    row.aspect === "perfect" ||
    (row.reference === "past" && row.aspect === "simple")
      ? "finished"
      : row.aspect === "simple"
        ? "whole"
        : "progress";
  const image = art.assets[`apple-${state}` as keyof typeof art.assets];
  return (
    <article className="tense-comparison-row" data-aspect={row.aspect}>
      <div className="tense-row-heading">
        <h3>{row.name}</h3>
        {row.advanced && <span>拓展</span>}
      </div>
      <div className="tense-row-content">
        <div className="tense-row-sentence">
          <p lang="en">
            {row.before}
            <strong>{row.verb}</strong>
            {row.after}
          </p>
          <p>{row.translation}</p>
          <strong className="tense-focus">{row.focus}</strong>
        </div>
        <div className="tense-row-visual">
          {row.reference === "future" && (
            <span className="tense-prediction">设想画面</span>
          )}
          <img
            src={image.url}
            width={image.width}
            height={image.height}
            alt={image.alt}
            decoding="async"
          />
          <TenseComparisonDiagram row={row} />
        </div>
      </div>
      <details>
        <summary>为什么这样说</summary>
        <p>{row.explanation}</p>
        <p>{row.formula}</p>
      </details>
    </article>
  );
}
export default function TenseComparison({ childId }: { childId?: string }) {
  const [reference, setReference] = useState<TimeReference>("past"),
    [shown, setShown] = useState(false),
    [all, setAll] = useState(false),
    [gameShown, setGameShown] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const request = useRef<AbortController | null>(null),
    generation = useRef(0);
  useEffect(() => {
    generation.current++;
    request.current?.abort();
    request.current = null;
    setShown(false);
    setAll(false);
    setGameShown(false);
    setLoading(false);
    setError("");
    return () => {
      generation.current++;
      request.current?.abort();
    };
  }, [childId]);
  async function open(next: TimeReference | "all", game = false) {
    if (request.current) return;
    const controller = new AbortController(),
      current = generation.current;
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      if (childId) {
        const saved = await api<{
          saved: boolean;
          version: number;
          reference: string;
        }>(
          "/learning/tense-comparison/view",
          { reference: next, version: comparisonVersion },
          { signal: controller.signal },
        );
        if (
          !saved.saved ||
          saved.version !== comparisonVersion ||
          saved.reference !== next
        )
          throw Error("时态对比版本有变化，请重新打开。");
      }
      if (controller.signal.aborted || current !== generation.current) return;
      if (game) setGameShown(true);
      else if (next === "all") setAll(true);
      else {
        setReference(next);
        setShown(true);
      }
    } catch (e) {
      if (!controller.signal.aborted && current === generation.current)
        setError(e instanceof Error ? e.message : "暂时没打开，请重试。");
    } finally {
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  }
  return (
    <section className="card tense-comparison" aria-label="同一动作的时态对比">
      <header className="tense-comparison-heading">
        <div>
          <h2>同一个动作，时态怎么变？</h2>
          <p>吃一个苹果 · 换个时间看一看</p>
        </div>
        {!gameShown && (
          <button
            className="primary"
            disabled={loading}
            onClick={() => void open("all", true)}
          >
            {loading ? "正在打开…" : "玩时态小游戏"}
          </button>
        )}
        {!shown && (
          <button
            className="secondary"
            disabled={loading}
            onClick={() => void open(reference)}
          >
            {loading ? "正在打开…" : "打开时态对比"}
          </button>
        )}
      </header>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {gameShown && <TenseTimelineGame />}
      {shown && (
        <>
          <p className="tense-clock">
            情境设定：现在是今天下午 3 点。蓝线是正在观察的参照点。
          </p>
          <div
            className="tense-reference-controls"
            role="group"
            aria-label="选择时间参照点"
          >
            {timeReferences.map((key) => (
              <button
                className="secondary"
                key={key}
                aria-pressed={reference === key}
                disabled={loading}
                onClick={() => void open(key)}
              >
                {referenceLabels[key]}
              </button>
            ))}
          </div>
          <details className="tense-usage-notes">
            <summary>怎么看时间轴</summary>
            <p>
              蓝线是参照点；绿色线段表示吃苹果的过程，圆点概括整次事件。完成式的结果在参照点之前。重复圆点表示习惯，不确定此刻是否在吃；将来用虚线表示设想。线段边缘不表示具体结束时间，位置不按真实时长比例。
            </p>
          </details>
          <div
            className="tense-rows"
            aria-busy={loading}
            aria-label={`${referenceLabels[reference]}的四种表达`}
          >
            {comparisonRowsFor(reference).map((row) => (
              <ComparisonRow key={row.id} row={row} />
            ))}
          </div>
          <div className="tense-comparison-summary">
            <strong>先找参照点，再看动作与它的关系。</strong>
            <p>
              一般：整件事／习惯 · 进行：那时正在做 · 完成：到那时已有结果 ·
              完成进行：到那时已持续多久
            </p>
          </div>
          <details className="tense-usage-notes">
            <summary>容易混淆的地方</summary>
            <p>
              同一动作可以换时间视角，但背景也要说清。“每天吃”是习惯；“昨天那一次”是过去事件。现在完成时不直接搭配yesterday；since
              yesterday表示“从昨天以来”，用法不同。
            </p>
            <p>
              这组完成式选择“吃完”的结果来比较。完成式也能表达经历、次数或持续状态；完成进行式还可以描述刚结束的活动，是否仍在进行要结合语境。将来一组是设想或预测。
            </p>
            <p>
              本页是示范，不计分。看过的例句会记作示范，不能因此变成独立掌握。
            </p>
          </details>
          {!all ? (
            <button
              className="secondary"
              disabled={loading}
              onClick={() => void open("all")}
            >
              展开全部 12 种表达
            </button>
          ) : (
            <details className="tense-overview" open>
              <summary>全部 12 种表达</summary>
              <div className="tense-overview-grid">
                {timeReferences.map((key) => (
                  <section key={key}>
                    <h3>{referenceLabels[key]}</h3>
                    {comparisonRowsFor(key).map((row) => (
                      <div key={row.id}>
                        <h4>{row.name}</h4>
                        <p lang="en">{comparisonSentence(row)}</p>
                        <p>{row.translation}</p>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            </details>
          )}
          {loading && <p role="status">正在打开时间对比…</p>}
        </>
      )}
    </section>
  );
}
