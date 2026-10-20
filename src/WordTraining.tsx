import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type {
  WordTheme,
  WordCard,
  WordMode,
  VocabularySummary,
} from "../packages/contracts/index";
import { api } from "./api";
import WordStudyCard from "./WordStudyCard";
import ToyPicture from "./ToyPicture";
import WordPicture from "./WordPicture";
import PictureWordDeck from "./PictureWordDeck";
const KetVocabulary = lazy(() => import("./KetVocabulary"));
const themePaths: Record<string, string> = {
  animals:
    "M7 12 4 6l7 3h2l7-3-3 6v4a5 5 0 0 1-10 0v-4Zm2 2h.01M15 14h.01M10 18l2 1 2-1",
  school: "M7 8V6a5 5 0 0 1 10 0v2M6 8h12l2 13H4L6 8Zm3 5h6v5H9v-5Z",
  "colours-shapes":
    "M3 3h7v7H3V3Zm15 0 5 8H13l5-8ZM11 17a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm4-2h6v6h-6v-6Z",
  food: "M12 8c-8-6-12 6-6 12 3 3 4 0 6 0s3 3 6 0c6-6 2-18-6-12Zm0 0c-1-5 2-7 6-7-1 5-3 6-6 7Z",
  family:
    "M7 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM1 21v-2a6 6 0 0 1 12 0v2m-2-5a6 6 0 0 1 12 3v2",
  body: "M12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 10h16m-8-3v9m0 0-5 6m5-6 5 6",
  home: "m2 11 10-8 10 8M5 9v12h14V9M9 21v-8h6v8",
  clothes: "m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4a4 4 0 0 1-8 0Z",
  actions:
    "M16 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-8 7 3-5 5 3 5 1m-10-4 1 8 6 5m-6-5-5 6M2 8h4M1 12h4",
  places:
    "M3 21V6h8v15M11 21V2h10v19M1 21h22M6 10h2m-2 4h2m6-8h4m-4 4h4m-4 4h4",
  nature:
    "M12 21V9m0 5C1 17 1 3 1 3s13-1 11 11Zm0 3C11 6 23 6 23 6s0 12-11 11Z",
  time: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 6v6l4 3",
  feelings:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 9h.01M16 9h.01M7 14q5 8 10 0",
  travel: "m2 12 8-2 4-8h3l-2 8 7 2-7 2 2 8h-3l-4-8-8-2Z",
  learning: "M12 5C8 2 3 4 3 4v16s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Zm0 0v16",
  environment:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM5 6l5 2-2 5 4 2 1 6m5-17-3 6 6 3",
  community:
    "M4 12V3h16v9M7 7h10M7 10h5M3 21v-3a4 4 0 0 1 8 0v3m2 0v-3a4 4 0 0 1 8 0v3",
  describing: "M4 3h16v18H4V3Zm4 5h8m-8 4h5m-5 4h8",
};
function ThemeSymbol({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={themePaths[id] ?? themePaths.learning} />
    </svg>
  );
}
const modes: { id: WordMode; title: string; description: string }[] = [
  {
    id: "picture",
    title: "听音找图片",
    description: "听英语，点图片，不用读中文选项",
  },
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
  resume,
  onResume,
  onPhonics,
}: {
  themes: WordTheme[];
  grade: number;
  childId?: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  busy: boolean;
  onStart: (themeId: string, wordMode: WordMode, roundSize: number) => void;
  onReview: () => void;
  resume?: {
    title: string;
    position: number;
    saved: boolean;
    takeover: boolean;
  };
  onResume: () => void;
  onPhonics?: () => void;
}) {
  const [scope, setScope] = useState<"primary" | "ket">(
    themes.find((t) => t.id === selectedId)?.collection === "ket"
      ? "ket"
      : "primary",
  );
  const [year, setYear] = useState(grade),
    [query, setQuery] = useState(""),
    [wordQuery, setWordQuery] = useState("");
  const [chooserOpen, setChooserOpen] = useState(false);
  const [mode, setMode] = useState<WordMode>(
      grade === 1 ? "picture" : "meaning",
    ),
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
  const recommended = themes.find((theme) => theme.grade === grade);
  const effectiveMode =
    selected && !selected.modes.includes(mode) ? "meaning" : mode;
  const modeOptions = modes.map((option) =>
    selected?.collection === "ket" && option.id === "mixed"
      ? { ...option, description: "认词义与拼写交替练" }
      : option,
  );
  const selectedMode = modeOptions.find(
    (option) => option.id === effectiveMode,
  )!;
  const visible = themes.filter(
    (theme) =>
      theme.collection !== "ket" &&
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
    setMode(
      themes.find((t) => t.id === id)?.modes.includes("picture")
        ? "picture"
        : "meaning",
    );
    returnTarget.current = from;
    focusNext.current = "ready";
    onSelect(id);
  };
  const changeTheme = () => {
    if (selected)
      returnTarget.current =
        selected.collection === "ket" ? "ket" : selected.id;
    setChooserOpen(true);
    focusNext.current = "choose";
    onSelect(null);
  };
  useEffect(() => {
    if (selected?.collection === "ket") setScope("ket");
  }, [selected?.collection]);
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
        <div className="word-collections" role="group" aria-label="选择词库">
          <button
            className="secondary"
            aria-pressed={scope === "primary"}
            disabled={busy}
            onClick={() => setScope("primary")}
          >
            小学主题
          </button>
          <button
            className="secondary"
            aria-pressed={scope === "ket"}
            disabled={busy}
            ref={(node) => {
              if (node) themeButtons.current.set("ket", node);
              else themeButtons.current.delete("ket");
            }}
            onClick={() => setScope("ket")}
          >
            KET 词汇
          </button>
        </div>
      )}
      {!selected && scope === "ket" && (
        <Suspense fallback={<p role="status">正在打开 KET 词库…</p>}>
          <KetVocabulary
            themes={themes.filter((t) => t.collection === "ket")}
            childId={childId}
            busy={busy}
            onChoose={(id) => choose(id, "ket")}
          />
        </Suspense>
      )}
      {!selected && scope === "primary" && (
        <div className="word-hero">
          <div>
            <h1>一起玩单词</h1>
            {recommended && (
              <div className="word-launch">
                <p>
                  <span>
                    {resume
                      ? "接着上次"
                      : `${["一", "二", "三", "四", "五", "六"][grade - 1]}年级 · 今日起点`}
                  </span>
                  <strong>{resume?.title ?? recommended.title}</strong>
                </p>
                <button
                  className="primary word-quick-start"
                  disabled={busy}
                  ref={(node) => {
                    if (node) themeButtons.current.set("recommended", node);
                    else themeButtons.current.delete("recommended");
                  }}
                  onClick={() =>
                    resume
                      ? onResume()
                      : onStart(
                          recommended.id,
                          recommended.modes.includes("picture")
                            ? "picture"
                            : "meaning",
                          5,
                        )
                  }
                >
                  {busy
                    ? "正在准备…"
                    : childId
                      ? resume
                        ? resume.takeover
                          ? "接着上次练习"
                          : resume.saved
                            ? "查看上次作答"
                            : `继续第${resume.position}题`
                        : "开始5题挑战"
                      : "选择档案，再开始"}{" "}
                  <ToyPicture kind="play" />
                </button>
                <small>
                  {childId
                    ? resume
                      ? "进度已经保存，接着上次继续。"
                      : recommended.modes.includes("picture")
                        ? "听音找图片 · 随机5题 · 不计时"
                        : "认词义 · 随机抽题 · 不计时"
                    : "请家长登录并选好档案，保存你的学习进度。"}
                </small>
              </div>
            )}
            <ul className="word-loop" aria-label="这一轮怎么玩">
              <li>
                <span aria-hidden="true">1</span> 想一想
              </li>
              <li>
                <span aria-hidden="true">2</span> 看解释
              </li>
              <li>
                <span aria-hidden="true">3</span> 记得复习
              </li>
            </ul>
          </div>
        </div>
      )}
      {!selected && scope === "primary" && (
        <section className="picture-theme-entry" aria-label="听音找图片主题">
          <h2>听一听，找图片</h2>
          <div>
            {themes
              .filter((t) => t.modes.includes("picture"))
              .map((t) => (
                <button
                  key={t.id}
                  className="picture-theme-button"
                  disabled={busy}
                  onClick={() => choose(t.id, t.id)}
                >
                  <WordPicture
                    id={
                      t.id === "animals"
                        ? "animals.cat"
                        : t.id === "school"
                          ? "school.pencil"
                          : "colours-shapes.star"
                    }
                  />
                  <strong>{t.title}</strong>
                  <ToyPicture kind="play" />
                </button>
              ))}
          </div>
        </section>
      )}
      {onPhonics && !selected && scope === "primary" && (
        <section className="card phonics-entry">
          <h2>想把声音和字母连起来？</h2>
          <p>到拼读小路听整词、看粘土标记，再练字母块拼合。</p>
          <button className="secondary" disabled={busy} onClick={onPhonics}>
            进入拼读小路
          </button>
        </section>
      )}
      {selected && selected.collection !== "ket" && (
        <ol className="word-path" aria-label="单词探险步骤">
          {["主题已选", "确认玩法", "开始挑战"].map((label, index) => (
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
      )}
      {!selected && scope === "primary" && (
        <details
          className="word-browse"
          open={chooserOpen}
          onToggle={(event) => setChooserOpen(event.currentTarget.open)}
        >
          <summary>
            <span className="word-browse-icon" aria-hidden="true">
              <ThemeSymbol id="learning" />
            </span>
            <span>
              <strong>想换个主题？自己挑</strong>
              <small>
                动物、校园、美食…{" "}
                {themes.filter((t) => t.collection !== "ket").length}
                个主题等你探索
              </small>
            </span>
            <span className="word-browse-toggle" aria-hidden="true">
              {chooserOpen ? "收起 −" : "展开 +"}
            </span>
          </summary>
          <section
            className="word-chooser"
            aria-labelledby="word-chooser-title"
          >
            <div className="word-section-heading">
              <div>
                <h2 id="word-chooser-title" ref={chooserHeading} tabIndex={-1}>
                  挑一个你感兴趣的主题
                </h2>
              </div>
              <p>{themes.length}个主题</p>
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
              {visible.map((theme) => (
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
                    <ThemeSymbol id={theme.id} />
                  </span>
                  <span>
                    <span className="eyebrow">
                      {["一", "二", "三", "四", "五", "六"][theme.grade - 1]}
                      年级 · {theme.wordCount}个词
                    </span>
                    <strong>{theme.title}</strong>
                    <span>{theme.description}</span>
                    <span className="word-theme-action">
                      选主题，再选玩法 <span aria-hidden="true">→</span>
                    </span>
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
        </details>
      )}
      {!selected && scope === "primary" && childId && (
        <div className="word-progress-strip" role="status">
          {summary ? (
            <>
              <span>
                已经练过 <strong>{summary.practisedWords}</strong> 个词条 ·
                到期复习 <strong>{summary.dueWords}</strong> 个
              </span>
              <button className="text-button" onClick={onReview}>
                看看复习安排 →
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
      {selected && (
        <section
          className={`card word-workshop word-tone-${themes.indexOf(selected) % 4}`}
          aria-labelledby="word-workshop-title"
        >
          <div className="word-workshop-heading">
            <div>
              <h1 id="word-workshop-title" ref={workshopHeading} tabIndex={-1}>
                {selected.title}
              </h1>
              <p>
                {selected.collection === "ket"
                  ? `${selected.description} · `
                  : "这一站有"}
                {selected.wordCount}
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
              <h2>这轮这样玩</h2>
              <p>
                {selectedMode.title} · {roundSize}道题
              </p>
              <span>{selectedMode.description}</span>
            </div>
          </div>
          <details className="word-options" key={`options-${selected.id}`}>
            <summary>
              调整玩法和题量{" "}
              <span>
                当前：{selectedMode.title} · {roundSize}题
              </span>
            </summary>
            <fieldset className="word-modes">
              <legend>今天想怎么练？</legend>
              {modeOptions
                .filter((option) => selected.modes.includes(option.id))
                .map((option) => (
                  <label
                    className="word-mode"
                    data-selected={effectiveMode === option.id}
                    key={option.id}
                  >
                    <input
                      type="radio"
                      name="word-mode"
                      value={option.id}
                      checked={effectiveMode === option.id}
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
              onClick={() => onStart(selected.id, effectiveMode, roundSize)}
            >
              {busy
                ? "正在准备…"
                : !childId
                  ? "选择档案，再开始"
                  : `开始${roundSize}题 · ${selectedMode.title}`}
              <ToyPicture kind="play" />
            </button>
            <p>
              {childId
                ? "不用赶时间，想一想再回答。"
                : "请家长登录并选好档案，就能保存你的进度。"}
            </p>
          </div>
          {selected.modes.includes("picture") && data?.id === selectedId ? (
            <PictureWordDeck
              key={`${selectedId}:${childId ?? "guest"}`}
              words={data.words}
              childId={childId}
            />
          ) : (
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
                  <WordStudyCard
                    key={`${childId ?? "guest"}:${word.id}`}
                    word={word}
                    childId={childId}
                  />
                ))}
              </div>
              {!loading &&
                !error &&
                data?.id === selectedId &&
                !words.length && (
                  <p className="empty-state">这个主题里没有找到该词。</p>
                )}
              <p className="footnote">
                看过词卡后可以多练几轮；完成练习不等于已经掌握，隔几天再独立想一想。
              </p>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
