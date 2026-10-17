import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Answer,
  Catalog,
  Exercise,
  Identity,
  LearningSession,
  Progress,
  Receipt,
} from "../packages/contracts/index";
import { api } from "./api";
import FamilySpace from "./FamilySpace";
const World = lazy(() => import("./World"));
const labels: Record<string, string> = {
  grammar: "语法",
  tense: "时态",
  forms: "单词变形",
  sentence: "句型",
  vocabulary: "词汇",
  phonics: "拼读",
  reading: "阅读",
  expression: "表达",
};
const sampleTopics: Record<string, string> = {
  "grammar.be": "sample.be.1",
  "grammar.there-be": "sample.there.1",
  "tense.past-simple": "sample.past.1",
  "tense.present-simple": "sample.habit.1",
  "forms.irregular-past": "sample.form.go",
  "forms.ing": "sample.form.ing",
  "sentence.patterns.suggestions": "sample.pattern.about",
  "sentence.order": "sample.pattern.order",
};
const journeys = ["萌芽", "探索", "成长", "远航", "发现", "创造"];
type View = "map" | "topics" | "patterns" | "review" | "parent" | "exercise";
function Icon({ kind = "compass" }: { kind?: string }) {
  const paths: Record<string, ReactNode> = {
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m16 8-2.5 5.5L8 16l2.5-5.5Z" />
      </>
    ),
    map: <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3ZM9 3v15m6-12v15" />,
    blocks: (
      <>
        <path d="m12 3 9 5-9 5-9-5Z" />
        <path d="M3 8v9l9 5 9-5V8m-9 5v9" />
      </>
    ),
    leaf: <path d="M20 3C6 2 2 10 7 16s15 1 13-13ZM5 21l11-12" />,
    book: (
      <path d="M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Zm0 0v15" />
    ),
    person: (
      <>
        <circle cx="12" cy="7" r="3" />
        <path d="M4 21v-3a8 8 0 0 1 16 0v3" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    star: (
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9Z" />
    ),
  };
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[kind] ?? paths.compass}
    </svg>
  );
}
class WorldBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="world-fallback">
        地图暂时使用2D模式，下方单元入口照常可用。
      </div>
    ) : (
      this.props.children
    );
  }
}
const message = (e: unknown) =>
  e instanceof Error ? e.message : "暂时没连上，请重试。";
const emptyProgress: Progress = {
  answered: 0,
  correct: 0,
  stars: 0,
  cards: [],
  recent: [],
};
const storedFlag = (key: string) => {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};

export default function App() {
  const [view, setView] = useState<View>("map");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [samples, setSamples] = useState<Exercise[]>([]);
  const [identity, setIdentity] = useState<Identity>({
    authenticated: false,
    developmentIdentityAvailable: false,
  });
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [grade, setGrade] = useState(3),
    [term, setTerm] = useState("A");
  const [category, setCategory] = useState("all"),
    [patternCluster, setPatternCluster] = useState("all");
  const [search, setSearch] = useState("");
  const [quiet, setQuiet] = useState(() => storedFlag("eq-quiet"));
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [twoD, setTwoD] = useState(() => storedFlag("eq-2d")),
    [hidden, setHidden] = useState(document.hidden);
  const [greet, setGreet] = useState(0);
  const [worldVisible, setWorldVisible] = useState(true);
  const worldRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = () => setReduced(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("eq-quiet", String(quiet));
      localStorage.setItem("eq-2d", String(twoD));
    } catch {
      /* preferences remain available in memory */
    }
  }, [quiet, twoD]);
  useEffect(() => {
    const element = worldRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) =>
      setWorldVisible(entry.isIntersecting),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [view]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [session, setSession] = useState<LearningSession | null>(null),
    [answer, setAnswer] = useState<Answer>("");
  const [receipt, setReceipt] = useState<Receipt | null>(null),
    [hint, setHint] = useState("");
  const eventId = useRef(crypto.randomUUID());
  const epoch = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const move = (next: View) => {
    setView(next);
    setError("");
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() =>
      mainRef.current?.focus({ preventScroll: true }),
    );
  };
  const refreshProgress = async (currentEpoch = epoch.current) => {
    const result = await api<Progress>("/progress");
    if (epoch.current === currentEpoch) setProgress(result);
  };
  useEffect(() => {
    let cancelled = false;
    const initialEpoch = epoch.current;
    fetch("/content/catalog.json")
      .then((r) => {
        if (!r.ok) throw new Error("课程目录暂时没有加载好，请刷新后重试。");
        return r.json() as Promise<Catalog>;
      })
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((e) => {
        if (!cancelled) setError(message(e));
      });
    Promise.all([
      api<{ items: Exercise[] }>("/exercises"),
      api<Identity>("/me"),
    ])
      .then(async ([exerciseList, me]) => {
        if (cancelled || epoch.current !== initialEpoch) return;
        setSamples(exerciseList.items);
        setIdentity(me);
        if (me.child) setGrade(me.child.grade);
        if (me.authenticated) {
          await refreshProgress();
          await restoreSession(epoch.current);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(message(e));
      });
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  async function refreshIdentity() {
    const current = ++epoch.current;
    const me = await api<Identity>("/me");
    if (epoch.current !== current) return;
    setIdentity(me);
    setSession(null);
    setReceipt(null);
    setHint("");
    setAnswer("");
    setProgress(emptyProgress);
    if (me.child) setGrade(me.child.grade);
    if (me.authenticated) {
      await refreshProgress(current);
      await restoreSession(current);
    }
  }
  async function restoreSession(current: number) {
    const saved = await api<{
      session: LearningSession | null;
      receipt?: Receipt | null;
      hint?: string | null;
    }>("/sessions/current");
    if (epoch.current !== current || !saved.session) return;
    setSession(saved.session);
    setReceipt(saved.receipt ?? null);
    setHint(saved.hint ?? "");
    setAnswer(saved.session.exercise.type === "order" ? [] : "");
    eventId.current = crypto.randomUUID();
  }
  async function start(exerciseId: string) {
    if (!identity.authenticated) {
      move("parent");
      setError("先请家长登录，再选择你的探险档案。");
      return;
    }
    setBusy(true);
    setError("");
    const current = epoch.current;
    try {
      const data = await api<LearningSession>("/sessions", {
        exerciseId,
        clientRequestId: crypto.randomUUID(),
      });
      if (epoch.current !== current) return;
      setSession(data);
      setAnswer(data.exercise.type === "order" ? [] : "");
      setReceipt(null);
      setHint("");
      eventId.current = crypto.randomUUID();
      move("exercise");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function check() {
    if (!session) return;
    if (
      (Array.isArray(answer) && !answer.length) ||
      (typeof answer === "string" && !answer.trim())
    ) {
      setError("先选择或填写答案，再检查吧。");
      return;
    }
    setBusy(true);
    setError("");
    const current = epoch.current;
    try {
      const result = await api<Receipt>("/attempts", {
        eventId: eventId.current,
        sessionId: session.id,
        assignmentId: session.assignmentId,
        leaseId: session.leaseId,
        answer,
      });
      if (epoch.current !== current) return;
      setReceipt(result);
      await refreshProgress(current);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function askHint() {
    if (!session) return;
    setBusy(true);
    setError("");
    const current = epoch.current;
    try {
      const data = await api<{ hint: string }>(
        `/sessions/${session.id}/hint`,
        {},
      );
      if (epoch.current === current) setHint(data.hint);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const units = (catalog?.units ?? []).filter(
    (u) => u.grade === String(grade) && u.term === term,
  );
  const topics = (catalog?.topics ?? []).filter(
    (t) =>
      (category === "all" || t.category === category) &&
      (!search || t.title.includes(search)),
  );
  const patterns = (catalog?.patterns ?? []).filter(
    (p) =>
      (patternCluster === "all" || p.cluster === patternCluster) &&
      (!search ||
        `${p.frame} ${p.cluster} ${p.example}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  const nav: [View, string, string][] = [
    ["map", "探险地图", "map"],
    ["topics", "专题特训", "blocks"],
    ["patterns", "固定句式", "book"],
    ["review", "复习花园", "leaf"],
    ["parent", "家长空间", "person"],
  ];
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        跳到主要内容
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Icon />
          </span>
          <span>
            英语探险岛<small>ENGLISH QUEST</small>
          </span>
        </div>
        <nav aria-label="主导航">
          {nav.map(([id, label, icon]) => (
            <button
              key={id}
              aria-current={view === id ? "page" : undefined}
              onClick={() => {
                setSearch("");
                move(id);
              }}
            >
              <Icon kind={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <strong>每天，一小步就很好。</strong>
          <p>学完一小轮，就去生活里试试新学的英语。</p>
        </div>
        <span className="build-label">M1 · 探险启航</span>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <small>原创英语探索 · 每天进步一点点</small>
            <strong>
              {nav.find((n) => n[0] === view)?.[1] ?? "今天的小练习"}
            </strong>
          </div>
          <div className="toolbar">
            <button
              className="soft-button"
              aria-pressed={quiet || reduced}
              disabled={reduced}
              onClick={() => setQuiet(!quiet)}
            >
              {reduced
                ? "跟随系统减少动效"
                : quiet
                  ? "安静模式 · 开"
                  : "安静模式 · 关"}
            </button>
            <span className="stars">
              <Icon kind="star" />
              {progress.stars}
            </span>
            <button className="profile-button" onClick={() => move("parent")}>
              {identity.child?.nickname ?? "选择档案"}
            </button>
          </div>
        </header>
        <main id="main" ref={mainRef} tabIndex={-1}>
          {error && (
            <div className="notice error" role="alert">
              {error}
              <button
                className="text-button"
                onClick={() => setError("")}
                aria-label="关闭提示"
              >
                关闭
              </button>
            </div>
          )}
          {view === "map" && (
            <>
              <div className="page-head">
                <div>
                  <p className="eyebrow">HELLO, EXPLORER</p>
                  <h1>今天，去发现一个新世界。</h1>
                  <p className="lead">听见单词，搭出句子，让记忆慢慢长大。</p>
                </div>
                <div className="filters">
                  <label>
                    年级
                    <select
                      value={grade}
                      onChange={(e) => setGrade(Number(e.target.value))}
                    >
                      {journeys.map((j, i) => (
                        <option key={j} value={i + 1}>
                          {["一", "二", "三", "四", "五", "六"][i]}年级 · {j}
                          之旅
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    学期
                    <select
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                    >
                      <option value="A">上学期</option>
                      <option value="B">下学期</option>
                    </select>
                  </label>
                </div>
              </div>
              {session && identity.authenticated && (
                <section className="resume-banner">
                  <div>
                    <span className="eyebrow">YOUR ADVENTURE CONTINUES</span>
                    <h2>{receipt ? "看看上次的小收获" : "接着上次的小脚印"}</h2>
                    <p>
                      {session.exercise.title} ·{" "}
                      {receipt ? "作答已保存" : "上次停下的练习还在这里"}
                    </p>
                  </div>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => move("exercise")}
                  >
                    {receipt ? "查看上次练习" : "继续练习"}
                    <Icon kind="arrow" />
                  </button>
                </section>
              )}
              <div className="dashboard">
                <section className="map-card">
                  <div className="map-caption">
                    <div>
                      <h2>
                        {journeys[grade - 1]}岛{" "}
                        <span className="badge">自主路线</span>
                      </h2>
                      <p>六个单元，连成一段新的探索。</p>
                    </div>
                    <button
                      className="text-button"
                      aria-pressed={twoD}
                      onClick={() => setTwoD(!twoD)}
                    >
                      {twoD ? "试试3D地图" : "切换2D"}
                    </button>
                  </div>
                  <div className="world-scene" ref={worldRef}>
                    {twoD ? (
                      <div className="flat-world" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : (
                      <WorldBoundary>
                        <Suspense
                          fallback={
                            <div className="world-fallback">
                              岛屿正在准备，课程入口已经可用。
                            </div>
                          }
                        >
                          <World
                            quiet={quiet || reduced || hidden || !worldVisible}
                            greet={greet}
                          />
                        </Suspense>
                      </WorldBoundary>
                    )}
                    <div className="world-caption">
                      <span role="status">
                        {greet
                          ? "你好，小探险家！"
                          : "热气球带着新发现，等你一起出发。"}
                      </span>
                    </div>
                  </div>
                  <div className="unit-path" aria-label="本学期单元">
                    {units.map((u, i) => (
                      <div className="unit-node" key={u.unit_id}>
                        <span>{i + 1}</span>
                        <strong>{u.title}</strong>
                        <small>已规划</small>
                      </div>
                    ))}
                  </div>
                  <div className="map-footer">
                    {!twoD && (
                      <button
                        className="text-button"
                        onClick={() => setGreet(greet + 1)}
                      >
                        和热气球打个招呼
                      </button>
                    )}
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => start("sample.be.1")}
                    >
                      开始一题体验
                      <Icon kind="arrow" />
                    </button>
                  </div>
                </section>
                <aside className="right-rail">
                  <section className="card sunny">
                    <p className="eyebrow">TODAY’S LITTLE ADVENTURE</p>
                    <h2>今天练一点什么？</h2>
                    <p>一题一个小发现，做完就能休息。</p>
                    <ol className="task-list">
                      <li>
                        <span>1</span>给句子选一个伙伴
                      </li>
                      <li>
                        <span>2</span>看看单词怎样变形
                      </li>
                      <li>
                        <span>3</span>试一种新的表达
                      </li>
                    </ol>
                    <button className="primary" onClick={() => move("topics")}>
                      去专题特训
                      <Icon kind="arrow" />
                    </button>
                  </section>
                  <section className="card">
                    <Icon kind="leaf" />
                    <h3>记忆也需要被照顾</h3>
                    <p>
                      {progress.cards.length
                        ? `已经记录${progress.cards.length}项记忆，看看下次何时相见。`
                        : "做过的题会安排下一次复习。课程与特训共用同一份记录。"}
                    </p>
                    <button
                      className="secondary"
                      onClick={() => move("review")}
                    >
                      看看复习安排
                    </button>
                  </section>
                </aside>
              </div>
              <div className="feature-strip">
                <div>
                  <Icon kind="book" />
                  <strong>72个课程单元</strong>
                  <small>覆盖P1–P6的课程规划</small>
                </div>
                <div>
                  <Icon kind="blocks" />
                  <strong>60个专题</strong>
                  <small>按具体难点定向练习</small>
                </div>
                <div>
                  <Icon kind="compass" />
                  <strong>72条固定句式</strong>
                  <small>先懂场景，再换词块</small>
                </div>
              </div>
            </>
          )}
          {view === "topics" && (
            <>
              <p className="eyebrow">FOCUS ON ONE LITTLE CHALLENGE</p>
              <h1>选一个专题，把它练明白。</h1>
              <p className="lead">
                语法、时态、词形与表达，各有自己的练习方法。
              </p>
              <div className="filter-row">
                <label>
                  专题分类
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="all">全部8类</option>
                    {Object.entries(labels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  找专题
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="例如：过去、介词、邀请"
                  />
                </label>
                <span className="badge">
                  {topics.length}个专题 · {samples.length}道开发样题
                </span>
              </div>
              <div className="topic-grid">
                {topics.map((t) => (
                  <article className="card topic-card" key={t.topic_id}>
                    <span className="badge">
                      {labels[t.category]} · P{t.grade_min}–P{t.grade_max}
                    </span>
                    <h2>{t.title}</h2>
                    <p>{t.interaction}</p>
                    <button
                      className={
                        sampleTopics[t.topic_id] ? "primary" : "secondary"
                      }
                      disabled={!sampleTopics[t.topic_id] || busy}
                      onClick={() => start(sampleTopics[t.topic_id])}
                    >
                      {sampleTopics[t.topic_id]
                        ? "体验一题"
                        : "内容已规划，待制作"}
                    </button>
                  </article>
                ))}
              </div>
              {!topics.length && (
                <p className="empty-state">
                  没有找到这个专题，换个关键词试试。
                </p>
              )}
            </>
          )}
          {view === "patterns" && (
            <>
              <p className="eyebrow">THE PATTERN WORKSHOP</p>
              <h1>一个句框，装下好多想法。</h1>
              <p className="lead">固定的部分记住，可替换的部分大胆尝试。</p>
              <div className="filter-row">
                <label>
                  句式主题
                  <select
                    value={patternCluster}
                    onChange={(e) => setPatternCluster(e.target.value)}
                  >
                    <option value="all">全部12个主题</option>
                    {[...new Set(catalog?.patterns.map((p) => p.cluster))].map(
                      (c) => (
                        <option key={c}>{c}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  查找句式
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="例如：would like、邀请"
                  />
                </label>
                <span className="badge">
                  {patterns.length}条样稿 · 待教研复核
                </span>
              </div>
              <div className="pattern-grid">
                {patterns.map((p) => (
                  <article className="card pattern-card" key={p.pattern_id}>
                    <span className="badge">
                      {p.cluster} · P{p.grade_min}起
                    </span>
                    <h2 lang="en">{p.frame}</h2>
                    <p className="example" lang="en">
                      {p.example}
                    </p>
                    <p>{p.slot_rule}</p>
                    {p.topic_id === "sentence.patterns.suggestions" && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => start("sample.pattern.about")}
                      >
                        练习邀请与建议
                      </button>
                    )}
                  </article>
                ))}
              </div>
              {!patterns.length && (
                <p className="empty-state">
                  没有找到这条表达，试试换个关键词。
                </p>
              )}
            </>
          )}
          {view === "review" && (
            <>
              <p className="eyebrow">YOUR MEMORY GARDEN</p>
              <h1>让记忆，慢慢长大。</h1>
              <p className="lead">隔几天独立想起来，才是记忆变稳的证据。</p>
              <div className="stats">
                <div className="card">
                  <strong>{progress.answered}</strong>
                  <span>已保存的作答</span>
                </div>
                <div className="card">
                  <strong>{progress.cards.length}</strong>
                  <span>记录中的学习目标</span>
                </div>
                <div className="card">
                  <strong>{progress.stars}</strong>
                  <span>完成奖励，不代表掌握</span>
                </div>
              </div>
              {!identity.authenticated ? (
                <div className="card empty-state">
                  <p>先请家长登录，让每次进步都有自己的记录。</p>
                  <button className="primary" onClick={() => move("parent")}>
                    登录并选择档案
                  </button>
                </div>
              ) : progress.cards.length ? (
                <div className="card review-list">
                  {progress.cards.map((card) => (
                    <div className="review-row" key={card.skillId}>
                      <Icon kind="leaf" />
                      <div>
                        <strong>{card.label ?? "学习目标"}</strong>
                        <p>
                          阶段{card.stage + 1} · 需要巩固{card.lapses}次
                        </p>
                      </div>
                      <span>
                        {new Date(card.dueAt).toLocaleDateString("zh-CN", {
                          month: "long",
                          day: "numeric",
                        })}
                        再见
                      </span>
                    </div>
                  ))}
                  <p className="footnote">
                    当前验证保存和调度；完整复习选题、离线续学与迁移测验将在后续里程碑完成。
                  </p>
                </div>
              ) : (
                <div className="card empty-state">
                  <Icon kind="leaf" />
                  <h2>小花园正在等第一颗种子</h2>
                  <p>做一题，系统就会为相关知识安排下次复习。</p>
                  <button
                    className="primary"
                    onClick={() => start("sample.pattern.about")}
                  >
                    试一题固定句式
                  </button>
                </div>
              )}
            </>
          )}
          {view === "parent" && (
            <FamilySpace identity={identity} refresh={refreshIdentity} />
          )}
          {view === "exercise" && session && (
            <div className="exercise-wrap">
              <div className="exercise-top">
                <button className="secondary" onClick={() => move("topics")}>
                  返回专题
                </button>
                <span className="badge">启航小练习</span>
              </div>
              <article className="card exercise-card">
                <p className="eyebrow">ONE STEP AT A TIME</p>
                <h1>{session.exercise.title}</h1>
                <p className="lead">{session.exercise.context}</p>
                <div className="buddies" aria-hidden="true">
                  <span />
                  <span />
                </div>
                <h2 className="question" lang="en">
                  {session.exercise.prompt}
                </h2>
                {session.exercise.type === "choice" && (
                  <div className="answer-options">
                    {session.exercise.choices?.map((o) => (
                      <button
                        disabled={busy || Boolean(receipt)}
                        className="answer-option"
                        aria-pressed={answer === o}
                        key={o}
                        onClick={() => setAnswer(o)}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
                {session.exercise.type === "input" && (
                  <label className="field word-answer">
                    你的词形
                    <input
                      lang="en"
                      spellCheck={false}
                      autoComplete="off"
                      autoCapitalize="none"
                      disabled={busy || Boolean(receipt)}
                      value={typeof answer === "string" ? answer : ""}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !busy && !receipt) check();
                      }}
                    />
                  </label>
                )}
                {session.exercise.type === "order" && (
                  <>
                    <div className="sentence-slot" aria-label="已选择的词块">
                      {Array.isArray(answer) && answer.length ? (
                        answer.map((t, i) => (
                          <button
                            disabled={busy || Boolean(receipt)}
                            className="token picked"
                            key={`${t}-${i}`}
                            aria-label={`移除${t}`}
                            onClick={() =>
                              setAnswer(
                                answer.filter((_, index) => index !== i),
                              )
                            }
                          >
                            {t}
                          </button>
                        ))
                      ) : (
                        <span>点击词块，搭出句子。</span>
                      )}
                    </div>
                    <div className="answer-options">
                      {session.exercise.tokens
                        ?.filter(
                          (t) => !Array.isArray(answer) || !answer.includes(t),
                        )
                        .map((t) => (
                          <button
                            className="token"
                            key={t}
                            disabled={busy || Boolean(receipt)}
                            onClick={() =>
                              setAnswer([
                                ...(Array.isArray(answer) ? answer : []),
                                t,
                              ])
                            }
                          >
                            {t}
                          </button>
                        ))}
                    </div>
                  </>
                )}
                {hint && (
                  <div className="notice" role="status">
                    提示：{hint} 使用提示后，本题不作独立掌握证据。
                  </div>
                )}
                {receipt ? (
                  <div
                    className={`feedback ${receipt.outcome === "correct" ? "success" : ""}`}
                    role="status"
                  >
                    <strong>
                      {receipt.outcome === "correct"
                        ? "这一步，想对了！"
                        : receipt.outcome === "hinted"
                          ? "跟着提示，完成了这一步。"
                          : "先看看这个规律，再用新题练习。"}
                    </strong>
                    <p>{receipt.feedback}</p>
                    <small>
                      学习记录已保存 · 下次复习{receipt.nextReviewDay} ·
                      完成奖励+{receipt.rewardDelta}
                    </small>
                  </div>
                ) : (
                  <div className="exercise-actions">
                    <button
                      className="secondary"
                      onClick={askHint}
                      disabled={busy || Boolean(hint)}
                    >
                      给我一个提示
                    </button>
                    <button className="primary" onClick={check} disabled={busy}>
                      {busy ? "正在保存…" : "检查并保存"}
                      <Icon kind="arrow" />
                    </button>
                  </div>
                )}
                {receipt && (
                  <button className="primary" onClick={() => move("review")}>
                    看看复习安排
                    <Icon kind="leaf" />
                  </button>
                )}
              </article>
              <p className="footnote">
                同一份答案重试不会重复计分；提示后答对不晋级。8道样题仅用于开发验证，完整课件仍在待办计划中。
              </p>
            </div>
          )}
          {!catalog && !error && (
            <p className="empty-state" role="status">
              正在准备课程目录…
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
