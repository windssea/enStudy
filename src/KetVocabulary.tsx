import { useEffect, useState } from "react";
import type { WordCard, WordTheme } from "../packages/contracts/index";
import { api } from "./api";
import WordStudyCard from "./WordStudyCard";

type SearchResult = {
  query: string;
  offset: number;
  total: number;
  results: { word: WordCard; themeId: string; themeTitle: string }[];
};
const sections = [
  ["alphabet", "单词与词组"],
  ["numbers", "数字扩展 2–1000"],
  ["ordinals", "序数扩展 3–31"],
  ["world", "国家与洲"],
];
export default function KetVocabulary({
  themes,
  childId,
  busy,
  onChoose,
}: {
  themes: WordTheme[];
  childId?: string;
  busy: boolean;
  onChoose: (id: string) => void;
}) {
  const [section, setSection] = useState("alphabet");
  const [letter, setLetter] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [packPage, setPackPage] = useState(0);
  const [data, setData] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const key = query.trim();
  useEffect(() => {
    setData(null);
    setError("");
    if (!key) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => {
      api<SearchResult>(
        `/vocabulary/ket/search?q=${encodeURIComponent(key)}&offset=${offset}`,
        undefined,
        { signal: controller.signal },
      )
        .then((result) => {
          if (!controller.signal.aborted) setData(result);
        })
        .catch((e) => {
          if (!controller.signal.aborted)
            setError(e instanceof Error ? e.message : "词库暂时没打开。");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, offset, reload]);
  const visible = themes.filter(
    (t) => t.section === section && (!letter || t.letters?.includes(letter)),
  );
  return (
    <section className="ket-library" aria-labelledby="ket-title">
      <div className="ket-heading">
        <div>
          <h2 id="ket-title">KET 词汇</h2>
          <p>
            A2 Key · 2025 版 · {themes.reduce((n, t) => n + t.wordCount, 0)}{" "}
            张词卡
          </p>
        </div>
        <label>
          找单词
          <input
            type="search"
            value={query}
            maxLength={80}
            placeholder="输入英文或中文"
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
            }}
          />
        </label>
      </div>
      {!key ? (
        <>
          <div className="ket-filters">
            <label>
              词汇范围
              <select
                value={section}
                disabled={busy}
                onChange={(e) => {
                  setSection(e.target.value);
                  setLetter("");
                  setPackPage(0);
                }}
              >
                {sections.map(([id, title]) => (
                  <option key={id} value={id}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
            {section === "alphabet" && (
              <label>
                首字母
                <select
                  value={letter}
                  disabled={busy}
                  onChange={(e) => {
                    setLetter(e.target.value);
                    setPackPage(0);
                  }}
                >
                  <option value="">全部字母</option>
                  {"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                    .split("")
                    .filter((l) =>
                      themes.some(
                        (t) =>
                          t.section === "alphabet" && t.letters?.includes(l),
                      ),
                    )
                    .map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                </select>
              </label>
            )}
            <span>{visible.length} 组 · 每组最多 40 词</span>
          </div>
          <div className="ket-group-grid">
            {visible.slice(packPage * 12, packPage * 12 + 12).map((t) => (
              <button
                type="button"
                className="ket-group"
                disabled={busy}
                key={t.id}
                onClick={() => onChoose(t.id)}
              >
                <span className="ket-group-index" aria-hidden="true">
                  {t.id.split(".").at(-1)}
                </span>
                <span>
                  <strong>{t.title.replace("KET ", "")}</strong>
                  <span lang="en">{t.description}</span>
                  <small>{t.wordCount} 词</small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
          {visible.length > 12 && (
            <nav className="ket-pagination" aria-label="词组分页">
              <button
                className="secondary"
                disabled={busy || packPage === 0}
                onClick={() => setPackPage((n) => n - 1)}
              >
                上一页
              </button>
              <span>
                {packPage + 1} / {Math.ceil(visible.length / 12)}
              </span>
              <button
                className="secondary"
                disabled={busy || (packPage + 1) * 12 >= visible.length}
                onClick={() => setPackPage((n) => n + 1)}
              >
                下一页
              </button>
            </nav>
          )}
        </>
      ) : (
        <div className="ket-search-results" aria-busy={loading}>
          {loading && <p role="status">正在找词…</p>}
          {error && (
            <p role="alert">
              {error}{" "}
              <button
                className="secondary"
                onClick={() => setReload((n) => n + 1)}
              >
                重试
              </button>
            </p>
          )}
          {!loading && !error && data?.query === key && (
            <>
              <p role="status">
                找到 {data.total} 个词条
                {data.total > 24
                  ? ` · ${offset + 1}–${Math.min(offset + 24, data.total)}`
                  : ""}
              </p>
              {!data.total && <p>试试其他英文或中文，或清空搜索浏览词组。</p>}
              <div className="word-card-grid">
                {data.results.map(({ word, themeId, themeTitle }) => (
                  <div className="ket-search-card" key={word.id}>
                    <WordStudyCard word={word} childId={childId} />
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => onChoose(themeId)}
                    >
                      练习这组 · {themeTitle.replace("KET ", "")}
                    </button>
                  </div>
                ))}
              </div>
              {data.total > 24 && (
                <nav className="ket-pagination" aria-label="搜索结果分页">
                  <button
                    className="secondary"
                    disabled={offset === 0}
                    onClick={() => setOffset((n) => Math.max(0, n - 24))}
                  >
                    上一页
                  </button>
                  <button
                    className="secondary"
                    disabled={offset + 24 >= data.total}
                    onClick={() => setOffset((n) => n + 24)}
                  >
                    下一页
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      )}
      <details className="ket-source">
        <summary>词库范围与来源</summary>
        <p>
          覆盖官方字母表 1727 行，合并重复词条后为 1725 项；另补 1059
          项数字、序数、国家与洲词集。one、first、second以及星期、月份、季节已在字母表中。中文释义和例句由本站编写。
        </p>
        <p>
          国家、语言和国籍在官方附录中属于开放词集，本站收录其列出的示例及常见英语国家。官方词表也不穷尽考试可能出现的所有词语。
        </p>
        <a
          href="https://www.cambridgeenglish.org/Images/506886-a2-key-2020-vocabulary-list.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Cambridge 官方 A2 Key / Key for Schools 词表 ↗
        </a>
      </details>
    </section>
  );
}
