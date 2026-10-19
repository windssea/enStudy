import { useEffect, useRef, useState } from "react";
import type {
  MistakeDetail,
  MistakeKind,
  MistakePage,
} from "../packages/contracts/mistakes";
import { mistakeCategories } from "../packages/domain/mistakes";
import { api } from "./api";
import CompanionSticker from "./CompanionSticker";

const labels: Record<string, string> = {
  all: "全部内容",
  grammar: "语法",
  tense: "时态",
  forms: "单词变形",
  patterns: "固定句式",
  vocabulary: "单词",
  phonics: "拼读",
  reading: "阅读",
};
const kinds: Record<MistakeKind, string> = {
  incorrect: "还需巩固",
  hinted: "跟着提示或示范答对",
  all: "这两类记录",
};
type Query = {
  kind: MistakeKind;
  category: string;
  snapshot?: number;
  before?: number;
  history: (number | undefined)[];
  revision: number;
};
export default function MistakeNotebook({
  childId,
  busy,
  onBack,
  onProfile,
  onRetry,
}: {
  childId?: string;
  busy: boolean;
  onBack: () => void;
  onProfile: () => void;
  onRetry: (
    exerciseId: string,
    eventId: string,
    requestId: string,
    version: number,
  ) => void;
}) {
  const [query, setQuery] = useState<Query>({
    kind: "incorrect",
    category: "all",
    history: [],
    revision: 0,
  });
  const [page, setPage] = useState<MistakePage | null>(null),
    [error, setError] = useState("");
  const [detail, setDetail] = useState<MistakeDetail | null>(null),
    [opening, setOpening] = useState<string | null>(null),
    [openError, setOpenError] = useState("");
  const controller = useRef<AbortController | null>(null),
    generation = useRef(0);
  const retryId = useRef(crypto.randomUUID());
  const listHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    setPage(null);
    setError("");
    setDetail(null);
    setOpening(null);
    setOpenError("");
    controller.current?.abort();
    const current = ++generation.current,
      request = new AbortController();
    if (!childId)
      return () => {
        generation.current++;
        request.abort();
      };
    const params = new URLSearchParams({
      kind: query.kind,
      category: query.category,
    });
    if (query.snapshot !== undefined)
      params.set("snapshot", String(query.snapshot));
    if (query.before !== undefined) params.set("before", String(query.before));
    api<MistakePage>(`/learning/mistakes?${params}`, undefined, {
      signal: request.signal,
    })
      .then((data) => {
        if (request.signal.aborted || generation.current !== current) return;
        if (data.childId !== childId)
          throw new Error("档案有变化，请重新打开错题小本。");
        setPage(data);
      })
      .catch((e) => {
        if (!request.signal.aborted && generation.current === current)
          setError(e instanceof Error ? e.message : "记录暂时没读到，请重试。");
      });
    return () => {
      generation.current++;
      request.abort();
      controller.current?.abort();
    };
  }, [query, childId]);
  function change(next: Query) {
    controller.current?.abort();
    setPage(null);
    setDetail(null);
    setError("");
    setOpening(null);
    setOpenError("");
    setQuery(next);
  }
  async function open(eventId: string) {
    if (opening === eventId || busy || !childId) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const current = generation.current;
    setOpening(eventId);
    setDetail(null);
    setOpenError("");
    retryId.current = crypto.randomUUID();
    try {
      const data = await api<MistakeDetail>(
        `/learning/mistakes/${encodeURIComponent(eventId)}/open`,
        {},
        { signal: request.signal },
      );
      if (request.signal.aborted || generation.current !== current) return;
      if (data.childId !== childId || data.eventId !== eventId)
        throw new Error("记录有变化，请重新读取。");
      setDetail(data);
    } catch (e) {
      if (!request.signal.aborted && generation.current === current)
        setOpenError(
          e instanceof Error ? e.message : "这一题暂时没打开，请重试。",
        );
    } finally {
      if (!request.signal.aborted && generation.current === current)
        setOpening(null);
    }
  }
  const refresh = () =>
    change({
      ...query,
      snapshot: undefined,
      before: undefined,
      history: [],
      revision: query.revision + 1,
    });
  return (
    <>
      <button type="button" className="secondary" onClick={onBack}>
        返回复习花园
      </button>
      <div className="mistake-hero">
        <div>
          <p className="eyebrow">慢慢找线索 · 看见自己的思考</p>
          <h1>错题小本</h1>
          <p className="lead">看看那次怎么想，再把一句规律弄明白。</p>
        </div>
        <svg viewBox="0 0 190 205" aria-hidden="true">
          <CompanionSticker />
        </svg>
      </div>
      <p className="mistake-explanation">
        这里按时间记录答错的题和跟着提示、示范答对的题。同一道题可能出现多次，不是“还欠几题”，也不是能力排名。
      </p>
      {!childId ? (
        <section className="card empty-state">
          <h2>先打开自己的小本</h2>
          <p>请家长登录并选好探险档案，记录会跟着你保存。</p>
          <button type="button" className="primary" onClick={onProfile}>
            登录并选择档案
          </button>
        </section>
      ) : (
        <>
          <div className="mistake-filters">
            <label>
              看哪类记录
              <select
                value={query.kind}
                disabled={busy}
                onChange={(e) =>
                  change({
                    ...query,
                    kind: e.target.value as MistakeKind,
                    snapshot: undefined,
                    before: undefined,
                    history: [],
                  })
                }
              >
                {Object.entries(kinds).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              内容
              <select
                value={query.category}
                disabled={busy}
                onChange={(e) =>
                  change({
                    ...query,
                    category: e.target.value,
                    snapshot: undefined,
                    before: undefined,
                    history: [],
                  })
                }
              >
                {["all", ...mistakeCategories].map((k) => (
                  <option key={k} value={k}>
                    {labels[k]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={refresh}
            >
              重新读取记录
            </button>
          </div>
          <section
            className="mistake-list"
            aria-busy={!page && !error}
            aria-labelledby="mistake-list-heading"
          >
            <h2 id="mistake-list-heading" tabIndex={-1} ref={listHeading}>
              {kinds[query.kind]} · 第{query.history.length + 1}页
            </h2>
            {error ? (
              <p className="notice error" role="alert">
                {error}{" "}
                <button type="button" className="text-button" onClick={refresh}>
                  重新读取
                </button>
              </p>
            ) : !page ? (
              <p role="status">正在打开这页记录…</p>
            ) : !page.items.length ? (
              <div className="card empty-state">
                <h3>这一页还没有这样的记录</h3>
                <p>
                  可以换一类看看，或回到课程慢慢探索。不需要为了填满小本去刷题。
                </p>
              </div>
            ) : (
              <>
                <p className="footnote">
                  一次最多20条，时间按本机显示。翻页期间保留同一批记录，想看刚完成的练习，请点“重新读取记录”。打开一题会记为今天看过它的讲解。
                </p>
                {page.items.map((entry, index) => (
                  <article
                    className="card mistake-card"
                    key={entry.eventId}
                    aria-labelledby={`mistake-${entry.eventId}`}
                  >
                    <div className="mistake-card-header">
                      <div>
                        <span className="badge">{kinds[entry.outcome]}</span>
                        <h3 id={`mistake-${entry.eventId}`}>
                          {entry.title || "词语与句子练习"}
                        </h3>
                        <p className="footnote">
                          {labels[entry.category] ?? "综合练习"} ·{" "}
                          {new Date(entry.savedAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="secondary"
                        disabled={
                          busy || opening === entry.eventId || !entry.available
                        }
                        aria-expanded={detail?.eventId === entry.eventId}
                        aria-controls={
                          detail?.eventId === entry.eventId
                            ? `mistake-detail-${entry.eventId}`
                            : undefined
                        }
                        aria-label={`${opening === entry.eventId ? "正在打开…" : detail?.eventId === entry.eventId ? "收起这一题" : "查看这一题"}，第${index + 1}条记录：${entry.title}`}
                        onClick={() => {
                          if (detail?.eventId === entry.eventId) {
                            setDetail(null);
                            setOpenError("");
                          } else void open(entry.eventId);
                        }}
                      >
                        {!entry.available
                          ? "材料已调整"
                          : opening === entry.eventId
                            ? "正在打开…"
                            : detail?.eventId === entry.eventId
                              ? "收起这一题"
                              : "查看这一题"}
                      </button>
                    </div>
                    {opening === entry.eventId && (
                      <p role="status">正在打开这一题的讲解…</p>
                    )}
                    {detail?.eventId === entry.eventId && (
                      <div
                        className="mistake-detail"
                        id={`mistake-detail-${entry.eventId}`}
                      >
                        <h4>1 · 回到那道题</h4>
                        <p>{detail.exercise.context}</p>
                        <p className="mistake-question">
                          {detail.exercise.prompt}
                        </p>
                        {detail.exercise.reading && (
                          <blockquote>{detail.exercise.reading}</blockquote>
                        )}
                        {detail.exercise.passage && (
                          <blockquote>
                            {detail.exercise.passage.map((p) => (
                              <p key={p.id}>{p.text}</p>
                            ))}
                          </blockquote>
                        )}
                        {detail.exercise.audioText && (
                          <p>
                            <strong>当时的听音文字：</strong>
                            {detail.exercise.audioText}
                          </p>
                        )}
                        {detail.exercise.editing && (
                          <p>
                            {detail.exercise.editing.parts
                              .map((p) => p.text)
                              .join(" ")}
                          </p>
                        )}
                        <h4>2 · 对照那次保存的答案</h4>
                        {detail.submitted !== null && (
                          <div className="mistake-comparison">
                            <div>
                              <span>那次保存的答案</span>
                              <p>{detail.submitted}</p>
                            </div>
                            {detail.reference !== null && (
                              <div>
                                <span>
                                  {detail.currentTeaching
                                    ? "当时的一种参考写法"
                                    : "一种参考写法"}
                                </span>
                                <p>{detail.reference}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {detail.details?.length ? (
                          <ul className="mistake-parts">
                            {detail.details.map((part, i) => (
                              <li key={i}>
                                <strong>{part.label}</strong>
                                <p>那次：{part.submitted}</p>
                                <p>参考：{part.expected}</p>
                                <small>
                                  {part.correct
                                    ? "这一处已答对"
                                    : "这一处再看看"}
                                </small>
                              </li>
                            ))}
                          </ul>
                        ) : detail.submitted === null ? (
                          <p>
                            这条早期记录没有逐项对照，可以先看下方标准解释。
                          </p>
                        ) : null}
                        {detail.submitted === null && detail.reference && (
                          <p className="teaching-english">{detail.reference}</p>
                        )}
                        <p className="footnote">
                          部分保存文字已统一大小写和空格；参考写法不一定是唯一正确表达。
                        </p>
                        <h4>3 · 找一个小线索</h4>
                        {detail.currentTeaching ? (
                          <>
                            <p className="feedback">
                              这题后来有调整。上方保留那次记录，接下来请按新版讲解练习。
                            </p>
                            <p className="teaching-english">
                              {detail.currentTeaching.prompt}
                            </p>
                            {detail.currentTeaching.context && (
                              <p>{detail.currentTeaching.context}</p>
                            )}
                            <p>{detail.currentTeaching.feedback}</p>
                          </>
                        ) : (
                          <p>{detail.feedback}</p>
                        )}
                        <p>
                          可以指着句子里的主语、时间词或原文依据，说说为什么这样写。不确定时，请家长一起看看；一条作答记录不能说明唯一错因。
                        </p>
                        <div className="mistake-retry">
                          <button
                            type="button"
                            className="secondary"
                            disabled={busy || detail.retryVersion === null}
                            onClick={() =>
                              onRetry(
                                detail.exercise.id,
                                detail.eventId,
                                retryId.current,
                                detail.retryVersion!,
                              )
                            }
                          >
                            {detail.retryVersion === null
                              ? "这题正在调整"
                              : detail.currentTeaching
                                ? "跟着新版讲解练习"
                                : "跟着讲解重做这一题"}
                          </button>
                          <p>
                            会保存辅助练习记录，不追加星星，也不算独立掌握。隔一段时间，用新材料再想一想。
                          </p>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </>
            )}
            {openError && (
              <p className="notice error" role="alert">
                {openError} 可以再点一次“查看这一题”，或重新读取记录。
              </p>
            )}
            {page && (
              <div className="mistake-pager">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy || !query.history.length}
                  onClick={() => {
                    change({
                      ...query,
                      before: query.history.at(-1),
                      snapshot: page.snapshotSequence,
                      history: query.history.slice(0, -1),
                    });
                    listHeading.current?.focus();
                  }}
                >
                  上一页
                </button>
                <span>第{query.history.length + 1}页</span>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy || page.nextBefore === null}
                  onClick={() => {
                    change({
                      ...query,
                      before: page.nextBefore!,
                      snapshot: page.snapshotSequence,
                      history: [...query.history, query.before],
                    });
                    listHeading.current?.focus();
                  }}
                >
                  下一页
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
