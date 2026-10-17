import { useEffect, useState } from "react";
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
  { id: "mixed", title: "混合挑战", description: "词义、拼写与语境轮流练" },
  { id: "meaning", title: "认词义", description: "看到英文，找中文意思" },
  { id: "spelling", title: "练拼写", description: "看到中文，自己写英文" },
  { id: "context", title: "放进句子", description: "根据情景选合适的词" },
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
  const [mode, setMode] = useState<WordMode>("mixed"),
    [roundSize, setRoundSize] = useState(10);
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
  const visible = themes.filter(
    (theme) =>
      (year === 0 || theme.grade === year) &&
      `${theme.title} ${theme.description}`.includes(query.trim()),
  );
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
    <div className="word-training">
      <div className="word-hero">
        <div>
          <p className="eyebrow">LITTLE WORDS, BIG DISCOVERIES</p>
          <h1>把新词，变成熟悉的朋友。</h1>
          <p className="lead">先认一认、读一读，再用小挑战把它记住。</p>
          <div className="word-totals">
            <span>{themes.reduce((n, t) => n + t.wordCount, 0)}个词条</span>
            <span>{themes.length}个生活主题</span>
            <span>一至六年级</span>
          </div>
        </div>
        <SceneStage kind="words" />
      </div>
      {childId && (
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
      <div className="filter-row">
        <label>
          年级
          <select
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              onSelect(null);
            }}
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
        <span className="badge">年级为建议起点，可按孩子的基础选择</span>
      </div>
      <div className="word-theme-grid" aria-label="单词主题">
        {visible.map((theme, index) => (
          <button
            className="word-theme"
            data-selected={selectedId === theme.id}
            aria-pressed={selectedId === theme.id}
            onClick={() => onSelect(theme.id)}
            key={theme.id}
          >
            <span
              className={`word-theme-number word-colour-${index % 3}`}
              aria-hidden="true"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>
              <span className="eyebrow">
                {["一", "二", "三", "四", "五", "六"][theme.grade - 1]}年级 ·{" "}
                {theme.wordCount}词条
              </span>
              <strong>{theme.title}</strong>
              <span>{theme.description}</span>
            </span>
            <span className="word-theme-arrow" aria-hidden="true">
              {selectedId === theme.id ? "已选" : "→"}
            </span>
          </button>
        ))}
      </div>
      {!visible.length && (
        <p className="empty-state">没有找到这个主题，换个关键词或年级试试。</p>
      )}
      {!selected && (
        <p className="notice">点选一个主题，打开词卡和训练选项。</p>
      )}
      {selected && (
        <section
          className="card word-workshop"
          aria-labelledby="word-workshop-title"
        >
          <div className="word-workshop-heading">
            <div>
              <p className="eyebrow">认一认 · 想一想 · 自己用一用</p>
              <h2 id="word-workshop-title">{selected.title}</h2>
              <p>
                {selected.wordCount}个词条 · {selected.items}个练习 ·
                本轮不重复同一词条
              </p>
            </div>
            <button className="secondary" onClick={() => onSelect(null)}>
              收起主题
            </button>
          </div>
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
          <div className="word-start">
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
            <button
              className="primary"
              disabled={busy}
              onClick={() => onStart(selected.id, mode, roundSize)}
            >
              {busy ? "正在准备…" : `随机练${roundSize}题`}
              <span aria-hidden="true">→</span>
            </button>
          </div>
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
        </section>
      )}
    </div>
  );
}
