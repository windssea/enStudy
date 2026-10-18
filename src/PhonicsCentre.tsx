import { useEffect, useRef, useState } from "react";
import type { PhonicsStage, PhonicsWord } from "../packages/contracts/phonics";
import metadata from "../public/content/phonics.json";
import { api } from "./api";
import PhonicsWorkbench from "./PhonicsWorkbench";
type Stage = PhonicsStage & {
  progress?: { rounds: number; answers: number; independent: number };
};
export default function PhonicsCentre({
  childId,
  busy,
  initialStageId,
  onBrowse,
  onStart,
  onBack,
  onParent,
}: {
  childId?: string;
  busy: boolean;
  initialStageId?: string | null;
  onBrowse: (id: string) => void;
  onStart: (stageId: string, roundSize: number) => void;
  onBack: () => void;
  onParent: () => void;
}) {
  const [stages, setStages] = useState<Stage[]>(
      metadata.stages as PhonicsStage[],
    ),
    [round, setRound] = useState(5),
    [word, setWord] = useState<PhonicsWord | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0),
    stage = stages.find((s) => s.id === initialStageId) ?? stages[0];
  useEffect(() => {
    let live = true;
    if (childId)
      void api<{ stages: Stage[] }>("/learning/phonics")
        .then((r) => {
          if (live) setStages(r.stages);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    return () => {
      live = false;
      generation.current++;
    };
  }, [childId]);
  useEffect(() => {
    generation.current++;
    setWord(null);
    setError("");
    setLoading(false);
  }, [stage.id]);
  async function demonstrate(id: string) {
    if (!childId) return;
    const token = ++generation.current;
    setLoading(true);
    setWord(null);
    setError("");
    try {
      const r = await api<{ saved: boolean; word: PhonicsWord }>(
        `/learning/phonics/${stage.id}/view`,
        { wordId: id },
      );
      if (token === generation.current && r.saved) setWord(r.word);
    } catch (e) {
      if (token === generation.current)
        setError(
          e instanceof Error ? e.message : "示范还未确认记录，请稍后再试。",
        );
    } finally {
      if (token === generation.current) setLoading(false);
    }
  }
  return (
    <div className="phonics-centre">
      <button className="secondary" onClick={onBack}>
        ← 返回单词特训
      </button>
      <header className="card phonics-hero">
        <span className="eyebrow">LISTEN. NOTICE. BUILD.</span>
        <h1>拼读小路</h1>
        <p>听完整单词，看看音和字母怎样合作，再自己试一小轮。</p>
        <p className="footnote">
          六站原创基础练习 · 不按年级锁题 · 整词声音为本地合成，不做儿童口语评分
        </p>
      </header>
      <nav className="phonics-stages" aria-label="拼读学习站">
        {stages.map((s, i) => (
          <button
            key={s.id}
            className="phonics-stage"
            aria-current={s.id === stage.id ? "step" : undefined}
            disabled={busy}
            onClick={() => onBrowse(s.id)}
          >
            <span>{i + 1}</span>
            <strong>{s.title}</strong>
            <small>
              {s.kind === "meaning" ? "理解词块" : "声音与拼写"} · {s.items}题 /{" "}
              {s.families}词家族
            </small>
          </button>
        ))}
      </nav>
      <section className="card">
        <span className="badge">
          第{stages.findIndex((s) => s.id === stage.id) + 1}站 · 建议P
          {stage.grade}起，可按基础回补
        </span>
        <h2>{stage.title}</h2>
        <p>
          先选一个示范观察，再练不同的词。第六站按词义块拆长词，不把它们当成单个音。
        </p>
        {!childId ? (
          <div className="notice">
            <p>先选择探险档案，才能记录看过的示范并保存练习。</p>
            <button className="secondary" onClick={onParent}>
              选择探险档案
            </button>
          </div>
        ) : (
          <>
            <div className="phonics-demo-choices" aria-label="选择示范">
              <span>想看哪个例子？</span>
              {stage.demos.map((w) => (
                <button
                  className="secondary"
                  key={w.id}
                  disabled={loading || busy}
                  aria-pressed={word?.id === w.id}
                  onClick={() => void demonstrate(w.id)}
                >
                  {w.meaning}
                </button>
              ))}
            </div>
            {loading && <p role="status">正在记录这次示范…</p>}
            {word && (
              <div className="phonics-demo">
                <h3>
                  <span lang="en">{word.word}</span> · {word.meaning}
                </h3>
                <p>{stage.rule}</p>
                <p>{stage.focus}</p>
                <PhonicsWorkbench
                  key={`${stage.id}:${word.id}`}
                  word={word}
                  kind={stage.kind}
                />
              </div>
            )}
          </>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="phonics-start">
          <div>
            <h3>换一组词，自己试试</h3>
            <p>
              听词辨拼写、补字母、拼合词块与分组判断随机搭配。提示和文字辅助分别记录，不计速度。
            </p>
            {stage.progress && (
              <p>
                已完成{stage.progress.rounds}轮，共保存
                {stage.progress.answers}
                次作答；这是已完成轮次的记录，不是掌握证明。
              </p>
            )}
            <label htmlFor="phonics-round">
              这一轮练几题？
              <select
                id="phonics-round"
                value={round}
                disabled={busy}
                onChange={(e) => setRound(Number(e.target.value))}
              >
                {stage.roundSizes.map((n) => (
                  <option key={n} value={n}>
                    {n}题
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            className="primary"
            disabled={busy || !childId}
            onClick={() => onStart(stage.id, round)}
          >
            {busy ? "正在准备…" : "开始这一站的练习"}
          </button>
        </div>
      </section>
      <details className="card">
        <summary>给家长：声音与学习范围</summary>
        <p>
          现有145段英式合成整词、25个独立示范词和120个练习词，提供240个任务。相同词的不同题型属于同一词家族。听完确认是操作记录，不能证明真实声学能力。
        </p>
        <p>
          这不是完整的纯音素教学或经过验证的拼读项目；完整字母音、异常拼写、专用诊断与教研听审仍需继续补齐。
        </p>
        <a href="/audio/phonics/NOTICE.txt" target="_blank" rel="noreferrer">
          查看合成声音来源说明
        </a>
      </details>
    </div>
  );
}
