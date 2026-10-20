import { useEffect, useId, useRef, useState } from "react";
import {
  conceptView,
  type ConceptCase,
  type ConceptLabData,
} from "../packages/domain/concepts";
import { api } from "./api";
import ConceptScene from "./ConceptScene";
import MeasurementControls from "./MeasurementControls";
export default function ConceptLab({
  lab,
  childId,
}: {
  lab: ConceptLabData;
  childId?: string;
}) {
  const [example, setExample] = useState<ConceptCase | null>(null),
    [step, setStep] = useState(0),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const titleId = useId();
  const [selectedMeasurement, setSelectedMeasurement] = useState("");
  const request = useRef<AbortController | null>(null),
    live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      request.current?.abort();
    };
  }, []);
  async function open(id: string) {
    if (request.current) return;
    const chosen = lab.cases.find((row) => row.id === id);
    if (!chosen) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const data = childId
        ? await api<{ saved: boolean; example: ConceptCase }>(
            `/learning/concepts/${encodeURIComponent(lab.id)}/view`,
            { caseId: id },
            { signal: controller.signal },
          )
        : { saved: true, example: chosen };
      if (!live.current || controller.signal.aborted) return;
      if (!data.saved || data.example?.id !== id)
        throw new Error("演示暂时没打开，请再试一次。");
      setExample(data.example);
      setSelectedMeasurement(
        "measurement" in data.example
          ? (data.example.measurement?.items[0]?.id ?? "")
          : "",
      );
      setStep(0);
      setRevision((value) => value + 1);
    } catch (error) {
      if (live.current && !controller.signal.aborted)
        setError(
          error instanceof Error ? error.message : "演示暂时没打开，请重试。",
        );
    } finally {
      if (request.current === controller) request.current = null;
      if (live.current) setLoading(false);
    }
  }
  const scene = example ? conceptView(lab, example, step) : null;
  return (
    <section className="concept-lab" aria-labelledby={titleId}>
      <div className="concept-heading">
        <div>
          <p className="eyebrow">动手观察 · 不计分的示范</p>
          <h3 id={titleId}>{lab.title}</h3>
          <p>{lab.description}</p>
        </div>
      </div>
      <div className="concept-choices" role="group" aria-label="选择演示例子">
        {lab.cases.map((row) => (
          <button
            className="concept-choice"
            disabled={loading}
            aria-pressed={example?.id === row.id}
            onClick={() => void open(row.id)}
            key={row.id}
          >
            {row.label}
            <span aria-hidden="true"> →</span>
          </button>
        ))}
      </div>
      {loading && <p role="status">正在打开示范…</p>}
      {error && (
        <p className="notice error" role="alert">
          {error} 请再次点选上面的例子。
        </p>
      )}
      {!example && !loading && (
        <p className="concept-invitation">
          点选一个例子，观察时间、词形或实物之间的关系。
        </p>
      )}
      {example && scene && (
        <>
          <div
            className="concept-stage-layout"
            data-measured={Boolean(scene.measurement)}
          >
            <div className="concept-scene-shell">
              <ConceptScene
                data={scene}
                revision={revision}
                selectedMeasurement={selectedMeasurement}
                context={{ labId: lab.id, caseId: example.id }}
              />
              {scene.measurement && (
                <MeasurementControls
                  data={scene.measurement}
                  selected={selectedMeasurement}
                  onSelect={(id) => {
                    setSelectedMeasurement(id);
                    setRevision((value) => value + 1);
                  }}
                />
              )}
            </div>
            <div
              className="concept-observation"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="eyebrow">
                {lab.kind !== "timeline"
                  ? `第${step + 1}步 / 共3步`
                  : `正在观察 · ${example.label}`}
              </span>
              <h4>
                {lab.kind === "spatial"
                  ? "看清球和参照物的位置"
                  : scene.measurement
                    ? "尺寸和词形一起看"
                    : lab.kind === "morph"
                      ? "看看词形怎样变"
                      : example.label}
              </h4>
              {lab.kind === "morph" && (
                <p className="concept-word" lang="en">
                  {scene.tiles.join(` ${scene.joiner} `)}
                </p>
              )}
              <p>{scene.note}</p>
              {lab.kind === "timeline" && (
                <div className="timeline-example">
                  <p lang="en">{example.sentence}</p>
                  <p>{example.translation}</p>
                </div>
              )}
              {lab.kind === "morph" && (
                <p className="footnote">{example.note}</p>
              )}
            </div>
          </div>
          {lab.kind !== "timeline" && (
            <div className="concept-controls">
              <button
                className="secondary"
                disabled={loading || step === 0}
                onClick={() => {
                  setStep((value) => Math.max(0, value - 1));
                  setRevision((value) => value + 1);
                }}
              >
                ← 上一步
              </button>
              <button
                className="secondary"
                disabled={loading || step === 2}
                onClick={() => {
                  setStep((value) => Math.min(2, value + 1));
                  setRevision((value) => value + 1);
                }}
              >
                下一步 →
              </button>
              <span>{step + 1} / 3</span>
            </div>
          )}
          {lab.kind !== "timeline" && step === 2 && (
            <div className="concept-sentence">
              <p lang="en">{example.sentence}</p>
              <p>{example.translation}</p>
            </div>
          )}
          <button
            className="text-button"
            disabled={loading}
            onClick={() => setRevision((value) => value + 1)}
          >
            {lab.kind === "timeline" ? "再看时间关系" : "再看这一步"}
          </button>
        </>
      )}
      <details className="concept-teaching-notes">
        <summary>演示说明</summary>
        <p>
          这里是示范，不加星星，也不代表已经掌握。看过的词形或相同句子会留下示范记录；练习和复习里仍可以慢慢想。
        </p>
      </details>
    </section>
  );
}
