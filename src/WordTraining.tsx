import { useEffect, useRef, useState } from "react";
import type {
  WordTheme,
  WordCard,
  WordMode,
  VocabularySummary,
} from "../packages/contracts/index";
import { api } from "./api";
import SpeechButton from "./SpeechButton";
import SceneStage from "./SceneStage";
const modes: { id: WordMode; title: string; description: string }[] = [
  { id: "meaning", title: "认词义", description: "看到英文，找中文意思" },
  {
    id: "listening",
    title: "听词辨义",
    description: "先听英文，再选意思；也可用文字辅助",
  },
  { id: "spelling", title: "练拼写", description: "看到中文，自己写英文" },
  { id: "context", title: "放进句子", description: "根据情景选合适的词" },
  {
    id: "mixed",
    title: "混合挑战",
    description: "听词、词义、拼写与语境轮流练",
  },
];
export default function WordTraining({
  themes,
  grade,
  childId,
  selectedId,
  onSelect,
  busy,
  onStart,
  onReview,
}: {
  themes: WordTheme[];
  grade: number;
  childId?: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  busy: boolean;
  onStart: (themeId: string, wordMode: WordMode, roundSize: number) => void;
  onReview: () => void;
}) {
  const [year, setYear] = useState(grade),
    [query, setQuery] = useState(""),
    [wordQuery, setWordQuery] = useState("");
  const [mode, setMode] = useState<WordMode>("meaning"),
    [roundSize, setRoundSize] = useState(5);
  const workshopHeading = useRef<HTMLHeadingElement>(null);
  const chooserHeading = useRef<HTMLHeadingElement>(null);
  const focusNext = useRef<"ready" | "choose" | null>(null);
  const returnTarget = useRef<string>("recommended");
  const themeButtons = useRef(new Map<string, HTMLButtonElement>());
  const [data, setData] = useState<{ id: string; words: WordCard[] } | null>(
      null,
    ),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  const [summary, setSummary] = useState<VocabularySummary | null>(null),
    [summaryError, setSummaryError] = useState(false);
  useEffect(() => setYear(grade), [grade]);
  const selected = themes.find((theme) => theme.id === selectedId);
  const recommended = themes.find(
    (theme) => year === 0 || theme.grade === year,
  );
  const selectedMode = modes.find((option) => option.id === mode)!;
  const visible = themes.filter(
    (theme) =>
      (year === 0 || theme.grade === year) &&
      `${theme.title} ${theme.description}`.includes(query.trim()),
  );
  useEffect(() => {
    if (!focusNext.current) return;
    const target =
      focusNext.current === "ready"
        ? workshopHeading.current
        : (themeButtons.current.get(returnTarget.current) ??
          chooserHeading.current);
    if (!target) return;
    focusNext.current = null;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [selectedId]);
  const choose = (id: string, from: string) => {
    returnTarget.current = from;
    focusNext.current = "ready";
    onSelect(id);
  };
  const changeTheme = () => {
    focusNext.current = "choose";
    onSelect(null);
  };
  useEffect(() => {
    let live = true;
    setSummary(null);
    setSummaryError(false);
    if (childId)
      api<VocabularySummary>("/learning/vocabulary")
        .then((value) => {
          if (live) setSummary(value);
        })
        .catch(() => {
          if (live) setSummaryError(true);
        });
    return () => {
      live = false;
    };
  }, [childId, reload]);
  useEffect(() => {
    let live = true;
    setError("");
    setWordQuery("");
    if (!selectedId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api<{ words: WordCard[] }>(`/vocabulary/${encodeURIComponent(selectedId)}`)
      .then((value) => {
        if (live) setData({ id: selectedId, words: value.words });
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
  }, [selectedId, reload]);
  const words =
    data?.id === selectedId
      ? data.words.filter((word) =>
          `${word.word} ${word.meaning}`
            .toLowerCase()
            .includes(wordQuery.trim().toLowerCase()),
        )
      : [];
  return (
    <div className="word-training" data-stage={selected ? "ready" : "choose"}>
      {!selected && (
        <div className="word-hero">
          <div>
            <p className="eyebrow">单词探险 · WORD ISLAND</p>
            <h1>今天，去单词岛探险！</h1>
            <p className="lead">挑一个喜欢的主题，做一轮小挑战。</p>
            {recommended && (
              <button
                className="primary word-quick-start"
                disabled={busy}
                ref={(node) => {
                  if (node) themeButtons.current.set("recommended", node);
                  else themeButtons.current.delete("recommended");
                }}
                onClick={() => choose(recommended.id, "recommended")}
              >
                从「{recommended.title}」开始 <span aria-hidden="true">→</span>
              </button>
            )}
            <div className="word-totals">
              <span>{themes.reduce((n, t) => n + t.wordCount, 0)}个单词</span>
              <span>{themes.length}个生活主题</span>
            </div>
          </div>
          <SceneStage kind="words" />
        </div>
      )}
      <ol className="word-path" aria-label="单词探险步骤">
        {["选个主题", "准备挑战", "做小练习"].map((label, index) => (
          <li
            key={label}
            aria-current={index === (selected ? 1 : 0) ? "step" : undefined}
            data-done={selected && index === 0}
          >
            <span aria-hidden="true">
              {selected && index === 0 ? "✓" : index + 1}
            </span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>
      {!selected && childId && (
        <div className="word-progress-strip" role="status">
          {summary ? (
            <>
              <span>
                已经练过 <strong>{summary.practisedWords}</strong> 个词条
              </span>
              <span>
                到了复习时间 <strong>{summary.dueWords}</strong> 个词条
              </span>
              <button className="text-button" onClick={onReview}>
                去复习花园 →
              </button>
            </>
          ) : summaryError ? (
            <>
              <span>学习记录暂时没加载好。</span>
              <button
                className="text-button"
                onClick={() => setReload((n) => n + 1)}
              >
                重试
              </button>
            </>
          ) : (
            <span>正在读取学习记录…</span>
          )}
        </div>
      )}
      {!selected && (
        <section className="word-chooser" aria-labelledby="word-chooser-title">
          <div className="word-section-heading">
            <div>
              <p className="eyebrow">第1步 · 选你喜欢的</p>
              <h2 id="word-chooser-title" ref={chooserHeading} tabIndex={-1}>
                也可以自己挑一个主题
              </h2>
            </div>
            <p>年级只是起点，想挑战别的也可以。</p>
          </div>
          <div className="filter-row">
            <label>
              年级
              <select
                value={year}
                onChange={(e) => {
                  setYear(Number(e.target.value));
                }}
                disabled={busy}
              >
                <option value={0}>全部年级</option>
                {["一", "二", "三", "四", "五", "六"].map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}年级
                  </option>
                ))}
              </select>
            </label>
            <label>
              找主题
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="例如：动物、餐桌、出行"
              />
            </label>
          </div>
          <div className="word-theme-grid" aria-label="单词主题">
            {visible.map((theme, index) => (
              <button
                className={`word-theme word-tone-${themes.indexOf(theme) % 4}`}
                onClick={() => choose(theme.id, theme.id)}
                disabled={busy}
                ref={(node) => {
                  if (node) themeButtons.current.set(theme.id, node);
                  else themeButtons.current.delete(theme.id);
                }}
                key={theme.id}
              >
                <span className="word-theme-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="eyebrow">
                    {["一", "二", "三", "四", "五", "六"][theme.grade - 1]}年级
                    · {theme.wordCount}个词
                  </span>
                  <strong>{theme.title}</strong>
                  <span>{theme.description}</span>
                </span>
                <span className="word-theme-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>
          {!visible.length && (
            <p className="empty-state">
              没有找到这个主题，换个关键词或年级试试。
            </p>
          )}
        </section>
      )}
      {selected && (
        <section
          className={`card word-workshop word-tone-${themes.indexOf(selected) % 4}`}
          aria-labelledby="word-workshop-title"
        >
          <div className="word-workshop-heading">
            <div>
              <p className="eyebrow">第2步 · 准备好就出发</p>
              <h1 id="word-workshop-title" ref={workshopHeading} tabIndex={-1}>
                {selected.title}
              </h1>
              <p>
                这一站有{selected.wordCount}
                个单词，每轮随机抽题，同一轮不重复单词。
              </p>
            </div>
            <button className="secondary" onClick={changeTheme} disabled={busy}>
              <span aria-hidden="true">←</span> 换个主题
            </button>
          </div>
          <div className="word-mission">
            <span className="word-mission-number" aria-hidden="true">
              {roundSize}
            </span>
            <div>
              <h2>这次的小挑战</h2>
              <p>
                {selectedMode.title} · {roundSize}道题
              </p>
              <span>{selectedMode.description}</span>
            </div>
          </div>
          <details className="word-options" key={`options-${selected.id}`}>
            <summary>
              换一种练法或题量 <span>按需调整</span>
            </summary>
            <fieldset className="word-modes">
              <legend>今天想怎么练？</legend>
              {modes.map((option) => (
                <label
                  className="word-mode"
                  data-selected={mode === option.id}
                  key={option.id}
                >
                  <input
                    type="radio"
                    name="word-mode"
                    value={option.id}
                    checked={mode === option.id}
                    onChange={() => setMode(option.id)}
                    disabled={busy}
                  />
                  <span>
                    <strong>{option.title}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="word-round-size">
              <label>
                每轮题量
                <select
                  value={roundSize}
                  onChange={(e) => setRoundSize(Number(e.target.value))}
                  disabled={busy}
                >
                  {[5, 10, 20].map((n) => (
                    <option key={n} value={n}>
                      {n}题
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>
          <div className="word-start">
            <button
              className="primary"
              disabled={busy}
              onClick={() => onStart(selected.id, mode, roundSize)}
            >
              {busy
                ? "正在准备…"
                : !childId
                  ? "选择档案，再开始"
                  : `出发，练${roundSize}题`}
              <span aria-hidden="true">→</span>
            </button>
            <p>
              {childId
                ? "不用赶时间，想一想再回答。"
                : "请家长登录并选好档案，就能保存你的进度。"}
            </p>
          </div>
          <details className="word-preview" key={`preview-${selected.id}`}>
            <summary>
              还不熟？先看一看单词卡 <span>{selected.wordCount}张词卡</span>
            </summary>
            <div className="word-card-heading">
              <div>
                <h3>先和单词打个招呼</h3>
                <p>点开词卡查看释义和例句，点击“听一听”才会播放。</p>
              </div>
              <label>
                找词
                <input
                  type="search"
                  value={wordQuery}
                  onChange={(e) => setWordQuery(e.target.value)}
                  placeholder="英文或中文"
                />
              </label>
            </div>
            {loading && <p role="status">正在打开词卡…</p>}
            {error && (
              <div className="notice error" role="alert">
                {error}
                <button
                  className="text-button"
                  onClick={() => setReload((n) => n + 1)}
                >
                  重新加载
                </button>
              </div>
            )}
            <div className="word-card-grid">
              {words.map((word) => (
                <details className="word-flashcard" key={word.id}>
                  <summary>
                    <strong lang="en">{word.word}</strong>
                    <span>点开释义与例句</span>
                  </summary>
                  <div>
                    <h4>{word.meaning}</h4>
                    <p lang="en">{word.example}</p>
                    <SpeechButton text={word.word} />
                    <SpeechButton text={word.example} label="读例句" />
                  </div>
                </details>
              ))}
            </div>
            {!loading && !error && data?.id === selectedId && !words.length && (
              <p className="empty-state">这个主题里没有找到该词。</p>
            )}
            <p className="footnote">
              看过词卡后可以多练几轮；完成练习不等于已经掌握，隔几天再独立想一想。
            </p>
          </details>
        </section>
      )}
    </div>
  );
}
