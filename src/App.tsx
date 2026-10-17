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
  CourseLesson,
  TopicStats,
  PatternStats,
  WordTheme,
  WordMode,
  LearningSummary,
  SessionResult,
  Identity,
  LearningSession,
  Progress,
  Receipt,
} from "../packages/contracts/index";
import { api, ApiError, setLearningChild } from "./api";
import FamilySpace from "./FamilySpace";
import LessonView from "./LessonView";
import SceneStage, { MotionShell } from "./SceneStage";
import FlatMap from "./FlatMap";
import SessionAccess from "./SessionAccess";
import { reconcileDraft } from "./sessionDraft";
const World = lazy(() => import("./World"));
const WordTraining = lazy(() => import("./WordTraining"));
const AiExplanation = lazy(() => import("./AiExplanation"));
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
const journeys = ["萌芽", "探索", "成长", "远航", "发现", "创造"];
type View =
  | "map"
  | "topics"
  | "patterns"
  | "words"
  | "review"
  | "parent"
  | "exercise"
  | "lesson";
const readRoute = (): { view: View; lessonId: string | null } => {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith("lesson=")) {
    try {
      return { view: "lesson", lessonId: decodeURIComponent(hash.slice(7)) };
    } catch {
      return { view: "map", lessonId: null };
    }
  }
  return {
    view: ([
      "topics",
      "patterns",
      "words",
      "review",
      "parent",
      "exercise",
    ].includes(hash)
      ? hash
      : "map") as View,
    lessonId: null,
  };
};
const emptyLearning: LearningSummary = {
  completedLessons: [],
  dueCount: 0,
  recent: [],
};
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
    words: (
      <>
        <rect x="3" y="5" width="15" height="16" rx="3" />
        <path d="M7 17l3-7 3 7m-5-2h4M7 5V3h14v15h-3" />
      </>
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
  { children: ReactNode; onLost: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onLost();
  }
  render() {
    return this.state.failed ? (
      <div className="world-static">
        <FlatMap />
        <p>地图暂时使用2D模式，下方单元入口照常可用。</p>
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
  const [view, setView] = useState<View>(() => readRoute().view);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [lessonId, setLessonId] = useState<string | null>(
    () => readRoute().lessonId,
  );
  const [topicAvailability, setTopicAvailability] = useState<
    Record<string, number>
  >({});
  const [topicStats, setTopicStats] = useState<Record<string, TopicStats>>({});
  const [patternStats, setPatternStats] = useState<
    Record<string, PatternStats>
  >({});
  const [patternRoundSize, setPatternRoundSize] = useState(10);
  const [topicRoundSize, setTopicRoundSize] = useState(10);
  const [learning, setLearning] = useState<LearningSummary>(emptyLearning);
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);
  const [wordThemes, setWordThemes] = useState<WordTheme[]>([]);
  const [wordThemeId, setWordThemeId] = useState<string | null>(null);
  const selectedLesson = lessons.find((lesson) => lesson.id === lessonId);
  useEffect(() => {
    const pop = () => {
      const route = readRoute();
      setView(route.view);
      if (route.lessonId) setLessonId(route.lessonId);
    };
    window.addEventListener("popstate", pop);
    window.addEventListener("hashchange", pop);
    return () => {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("hashchange", pop);
    };
  }, []);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
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
  const [sessionStopped, setSessionStopped] = useState(false);
  const [draftBackup, setDraftBackup] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState("");
  const [freshReceiptEvent, setFreshReceiptEvent] = useState<string | null>(
    null,
  );
  const mutation = useRef(0);
  const snapshotRequest = useRef(0);
  const identityChannel = useRef<BroadcastChannel | null>(null);
  const pendingClaim = useRef<{
    id: string;
    session: string;
    version: number;
  } | null>(null);
  const draftRef = useRef(answer),
    sessionRef = useRef(session);
  draftRef.current = answer;
  sessionRef.current = session;
  const eventId = useRef(crypto.randomUUID());
  const epoch = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const move = (next: View, targetLessonId?: string) => {
    const hash =
      next === "lesson"
        ? `#lesson=${encodeURIComponent(targetLessonId ?? lessonId ?? "")}`
        : `#${next}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    setView(next);
    setError("");
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() =>
      mainRef.current?.focus({ preventScroll: true }),
    );
  };
  const refreshProgress = async (currentEpoch = epoch.current) => {
    const [result, summary] = await Promise.all([
      api<Progress>("/progress"),
      api<LearningSummary>("/learning/summary"),
    ]);
    if (epoch.current === currentEpoch) {
      setProgress(result);
      setLearning(summary);
    }
  };
  useEffect(() => {
    let cancelled = false;
    const initialEpoch = epoch.current;
    api<{
      lessons: CourseLesson[];
      topicAvailability: Record<string, number>;
      topicStats?: Record<string, TopicStats>;
      patternStats?: Record<string, PatternStats>;
      vocabulary?: { themes: WordTheme[] };
    }>("/lessons")
      .then((data) => {
        if (!cancelled) {
          setLessons(data.lessons);
          setTopicAvailability(data.topicAvailability);
          setTopicStats(data.topicStats ?? {});
          setPatternStats(data.patternStats ?? {});
          setWordThemes(data.vocabulary?.themes ?? []);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(message(e));
      });
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
    api<Identity>("/me")
      .then(async (me) => {
        if (cancelled || epoch.current !== initialEpoch) return;
        setLearningChild(me.child?.id ?? null);
        setIdentity(me);
        if (me.child) setGrade(me.child.grade);
        if (me.authenticated) {
          await refreshProgress();
          await restoreSession(epoch.current);
        } else if (readRoute().view === "exercise") move("parent");
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
  async function refreshIdentity(announce = true) {
    const current = ++epoch.current;
    const me = await api<Identity>("/me");
    if (epoch.current !== current) return;
    setLearningChild(me.child?.id ?? null);
    setIdentity(me);
    setSession(null);
    setReceipt(null);
    setHint("");
    setAnswer("");
    setProgress(emptyProgress);
    setLearning(emptyLearning);
    setLastResult(null);
    setFreshReceiptEvent(null);
    mutation.current++;
    pendingClaim.current = null;
    setSessionStopped(false);
    setDraftBackup(null);
    setSessionNotice("");
    if (me.child) setGrade(me.child.grade);
    if (me.authenticated) {
      await refreshProgress(current);
      await restoreSession(current);
    } else if (readRoute().view === "exercise") move("parent");
    if (announce) identityChannel.current?.postMessage("identity-changed");
  }
  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("eq-family-identity");
    identityChannel.current = channel;
    channel.onmessage = (event) => {
      if (event.data === "identity-changed")
        void refreshIdentity(false).catch((error) => setError(message(error)));
    };
    return () => {
      identityChannel.current = null;
      channel.close();
    };
  }, []);
  async function restoreSession(current: number) {
    const saved = await api<{
      session: LearningSession | null;
      receipt?: Receipt | null;
      hint?: string | null;
    }>("/sessions/current");
    if (epoch.current !== current) return;
    if (!saved.session) {
      if (readRoute().view === "exercise") move("map");
      return;
    }
    setSession(saved.session);
    setFreshReceiptEvent(null);
    setSessionStopped(false);
    setReceipt(saved.receipt ?? null);
    setHint(saved.hint ?? "");
    setAnswer(saved.session.exercise.type === "order" ? [] : "");
    eventId.current = crypto.randomUUID();
  }
  type SavedSession = {
    childId: string;
    session: LearningSession | null;
    receipt?: Receipt | null;
    hint?: string | null;
  };
  function applySnapshot(saved: SavedSession) {
    setFreshReceiptEvent(null);
    setSessionNotice("");
    if (!saved.session) {
      setSessionStopped(true);
      return;
    }
    const draft = reconcileDraft(
      sessionRef.current,
      saved.session,
      draftRef.current,
    );
    if (draft.backup) setDraftBackup(draft.backup);
    setAnswer(draft.answer);
    setSession(saved.session);
    setReceipt(saved.receipt ?? null);
    setHint(saved.hint ?? "");
    setSessionStopped(false);
    eventId.current = crypto.randomUUID();
  }
  async function syncSession(announce = true) {
    const current = epoch.current,
      stamp = mutation.current,
      ticket = ++snapshotRequest.current;
    const saved = await api<SavedSession>("/sessions/current");
    if (
      epoch.current !== current ||
      mutation.current !== stamp ||
      snapshotRequest.current !== ticket
    )
      return;
    if (saved.childId !== identity.child?.id) {
      await refreshIdentity(false);
      return;
    }
    applySnapshot(saved);
    if (announce)
      setSessionNotice(
        !saved.session
          ? "这轮学习已结束，可以回地图选择新任务。"
          : saved.session.access === "owner"
            ? "最新进度已读取，可以在这台设备继续。"
            : "最新进度已读取，请选择在哪里接着学。",
      );
  }
  async function refreshSession() {
    const current = epoch.current;
    setBusy(true);
    setError("");
    try {
      await syncSession();
    } catch (error) {
      await handleSessionError(error, current);
    } finally {
      setBusy(false);
    }
  }
  async function handleSessionError(error: unknown, current: number) {
    if (epoch.current !== current) return;
    setError(message(error));
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.code === "IDENTITY_CHANGED")
    ) {
      await refreshIdentity(false);
      return;
    }
    if (
      error instanceof ApiError &&
      ["LEASE_REPLACED", "SESSION_CHANGED", "TAKEOVER_REQUIRED"].includes(
        error.code,
      )
    ) {
      setSessionStopped(true);
      try {
        await syncSession(false);
      } catch {
        /* Keep the task blocked until progress can be read. */
      }
    }
  }
  async function takeOver() {
    if (!session || session.access !== "takeover-required") return;
    const current = epoch.current;
    if (
      !pendingClaim.current ||
      pendingClaim.current.session !== session.id ||
      pendingClaim.current.version !== session.leaseVersion
    )
      pendingClaim.current = {
        id: crypto.randomUUID(),
        session: session.id,
        version: session.leaseVersion,
      };
    setBusy(true);
    setError("");
    mutation.current++;
    try {
      const saved = await api<SavedSession>(
        `/sessions/${session.id}/takeover`,
        {
          clientRequestId: pendingClaim.current.id,
          expectedLeaseVersion: pendingClaim.current.version,
        },
      );
      if (epoch.current !== current) return;
      applySnapshot(saved);
      pendingClaim.current = null;
      setSessionNotice("进度接上啦。现在由这台设备保存作答。");
      await refreshProgress(current);
    } catch (error) {
      await handleSessionError(error, current);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (view !== "exercise" || busy || !session) return;
    const refresh = () => {
      if (!document.hidden)
        void syncSession(false).catch((error) => {
          if (
            error instanceof ApiError &&
            (error.status === 401 || error.code === "IDENTITY_CHANGED")
          )
            void refreshIdentity(false).catch(() => {});
        });
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [view, busy, session, answer]);
  const canWriteSession = Boolean(
    session?.access === "owner" && session.leaseId && !sessionStopped,
  );
  async function start(
    exerciseId: string,
    task?: {
      lessonId?: string;
      topicId?: string;
      patternId?: string;
      wordThemeId?: string;
      wordMode?: WordMode;
      mode?: "review";
      roundSize?: number;
    },
  ) {
    if (!identity.authenticated) {
      move("parent");
      setError("先请家长登录，再选择你的探险档案。");
      return;
    }
    if (session?.access === "takeover-required" && !sessionStopped) {
      move("exercise");
      return;
    }
    setBusy(true);
    setError("");
    mutation.current++;
    const current = epoch.current;
    try {
      const data = await api<LearningSession>("/sessions", {
        ...(task ?? { exerciseId }),
        clientRequestId: crypto.randomUUID(),
      });
      if (epoch.current !== current) return;
      setLastResult(null);
      setSessionStopped(false);
      setDraftBackup(null);
      setSessionNotice("");
      pendingClaim.current = null;
      setSession(data);
      setFreshReceiptEvent(null);
      setAnswer(data.exercise.type === "order" ? [] : "");
      setReceipt(null);
      setHint("");
      eventId.current = crypto.randomUUID();
      move("exercise");
    } catch (e) {
      await handleSessionError(e, current);
      if (
        epoch.current === current &&
        e instanceof ApiError &&
        e.code === "TAKEOVER_REQUIRED"
      )
        move("exercise");
    } finally {
      setBusy(false);
    }
  }
  async function check() {
    if (!session || !canWriteSession) return;
    if (
      (Array.isArray(answer) && !answer.length) ||
      (typeof answer === "string" && !answer.trim())
    ) {
      setError("先选择或填写答案，再检查吧。");
      return;
    }
    setBusy(true);
    setError("");
    mutation.current++;
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
      setFreshReceiptEvent(result.eventId);
      await refreshProgress(current);
    } catch (e) {
      await handleSessionError(e, current);
    } finally {
      setBusy(false);
    }
  }
  async function askHint() {
    if (!session || !canWriteSession) return;
    setBusy(true);
    setError("");
    mutation.current++;
    const current = epoch.current;
    try {
      const data = await api<{ hint: string }>(`/sessions/${session.id}/hint`, {
        assignmentId: session.assignmentId,
        leaseId: session.leaseId,
      });
      if (epoch.current === current) setHint(data.hint);
    } catch (e) {
      await handleSessionError(e, current);
    } finally {
      setBusy(false);
    }
  }
  async function nextQuestion() {
    if (!session || !canWriteSession) return;
    setBusy(true);
    setError("");
    mutation.current++;
    const current = epoch.current;
    try {
      const result = await api<{
        session: LearningSession | null;
        completed?: boolean;
        result?: SessionResult;
      }>(`/sessions/${session.id}/next`, {
        assignmentId: session.assignmentId,
        leaseId: session.leaseId,
      });
      if (epoch.current !== current) return;
      if (result.completed) {
        setFreshReceiptEvent(null);
        setLastResult(result.result ?? null);
        setSession(null);
        setReceipt(null);
        await refreshProgress(current);
        move("review");
      } else if (result.session) {
        setFreshReceiptEvent(null);
        setSession(result.session);
        setReceipt(null);
        setHint("");
        setAnswer(result.session.exercise.type === "order" ? [] : "");
        eventId.current = crypto.randomUUID();
        window.scrollTo({ top: 0 });
        requestAnimationFrame(() => mainRef.current?.focus());
      }
    } catch (e) {
      await handleSessionError(e, current);
    } finally {
      setBusy(false);
    }
  }
  function openLesson(lesson: CourseLesson) {
    setLessonId(lesson.id);
    move("lesson", lesson.id);
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
    ["words", "单词特训", "words"],
    ["topics", "专题特训", "blocks"],
    ["patterns", "固定句式", "book"],
    ["review", "复习花园", "leaf"],
    ["parent", "家长空间", "person"],
  ];
  return (
    <MotionShell quiet={quiet || reduced} flat={twoD}>
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
              data-nav={id}
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
        <span className="build-label">一起，慢慢进步。</span>
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
              aria-pressed={twoD}
              onClick={() => setTwoD(!twoD)}
            >
              {twoD ? "2D 场景" : "3D 场景"}
            </button>
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
            <button
              className="profile-button"
              aria-label={`家长空间与档案：${identity.child?.nickname ?? "选择档案"}`}
              onClick={() => move("parent")}
            >
              {identity.child?.nickname ?? "选择档案"}
            </button>
          </div>
        </header>
        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          className="page-motion"
          key={view}
          data-scene-page={view}
        >
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
                    <h2>
                      {session.access === "takeover-required"
                        ? "换台设备，接着上次的探索"
                        : receipt
                          ? "看看上次的小收获"
                          : "接着上次的小脚印"}
                    </h2>
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
                    {session.access === "takeover-required"
                      ? "查看进度并接续"
                      : receipt
                        ? "查看上次练习"
                        : "继续练习"}
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
                      <FlatMap />
                    ) : (
                      <WorldBoundary onLost={() => setTwoD(true)}>
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
                            onLost={() => setTwoD(true)}
                            completed={
                              learning.completedLessons.filter((row) =>
                                lessons.some(
                                  (lesson) =>
                                    lesson.id === row.lessonId &&
                                    lesson.grade === grade,
                                ),
                              ).length
                            }
                          />
                        </Suspense>
                      </WorldBoundary>
                    )}
                    <div className="world-caption">
                      <span role="status">
                        {greet
                          ? "你好，小探险家！"
                          : "小伙伴和热气球，等你一起出发。"}
                      </span>
                    </div>
                  </div>
                  <div className="unit-path" aria-label="本学期单元">
                    {units.map((u, i) => {
                      const available = lessons.find(
                        (lesson) => lesson.unitId === u.unit_id,
                      );
                      return (
                        <button
                          className="unit-node"
                          key={u.unit_id}
                          disabled={!available}
                          onClick={() => available && openLesson(available)}
                        >
                          <span>{i + 1}</span>
                          <strong>{u.title}</strong>
                          <small>{available ? "进入课程" : "规划中"}</small>
                        </button>
                      );
                    })}
                  </div>
                  <div className="map-footer">
                    {!twoD && (
                      <button
                        className="text-button"
                        onClick={() => setGreet(greet + 1)}
                      >
                        和探险伙伴打个招呼
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
              <section className="course-section">
                <div className="page-head">
                  <div>
                    <p className="eyebrow">A SMALL LESSON, A REAL DISCOVERY</p>
                    <h2>这一站，学会用英语表达</h2>
                    <p>先读中文小讲解，再试着把英语说完整。</p>
                  </div>
                  <span className="badge">
                    {
                      lessons.filter(
                        (l) => l.grade === grade && l.term === term,
                      ).length
                    }
                    节微课可体验 · 其余持续制作
                  </span>
                </div>
                <div className="course-grid">
                  {lessons
                    .filter((l) => l.grade === grade && l.term === term)
                    .map((lesson) => {
                      const completed = learning.completedLessons.find(
                        (row) => row.lessonId === lesson.id,
                      );
                      return (
                        <article className="card course-card" key={lesson.id}>
                          <span className="lesson-index">
                            {String(lesson.order).padStart(2, "0")}
                          </span>
                          <span className="badge">
                            {completed ? "已完成练习" : "约6分钟"}
                          </span>
                          <h3>{lesson.title}</h3>
                          <p>{lesson.subtitle}</p>
                          <small>
                            {lesson.itemCount}个练习任务 ·{" "}
                            {completed
                              ? `${completed.runs}次完成`
                              : "中文讲解与英语例句"}
                          </small>
                          <button
                            className="primary"
                            onClick={() => openLesson(lesson)}
                          >
                            {completed ? "再来看看" : "进入小讲堂"}
                            <Icon kind="arrow" />
                          </button>
                        </article>
                      );
                    })}
                </div>
                {!lessons.some((l) => l.grade === grade && l.term === term) && (
                  <div className="card empty-state">
                    <p>
                      这一学期的课件正在制作。可以切到上学期体验已开放的微课，或去专题中心练习。
                    </p>
                  </div>
                )}
              </section>
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
          {view === "words" && (
            <>
              {session?.source === "vocabulary" && (
                <div className="notice">
                  还有一轮单词练习可以继续。
                  <button
                    className="text-button"
                    onClick={() => move("exercise")}
                  >
                    继续第{session.position}题 →
                  </button>
                </div>
              )}
              <Suspense
                fallback={
                  <p className="empty-state" role="status">
                    正在准备单词小课堂…
                  </p>
                }
              >
                <WordTraining
                  themes={wordThemes}
                  grade={grade}
                  childId={identity.child?.id}
                  selectedId={wordThemeId}
                  onSelect={setWordThemeId}
                  busy={busy}
                  onStart={(id, wordMode, roundSize) =>
                    start("", { wordThemeId: id, wordMode, roundSize })
                  }
                  onReview={() => move("review")}
                />
              </Suspense>
            </>
          )}
          {view === "topics" && (
            <>
              <div className="discovery-hero">
                <div>
                  <p className="eyebrow">FOCUS ON ONE LITTLE CHALLENGE</p>
                  <h1>选一个专题，把它练明白。</h1>
                  <p className="lead">
                    每次抽一组新挑战，慢慢把规律练熟。最近练过的题组会尽量避开。
                  </p>
                </div>
                <SceneStage kind="workshop" />
              </div>
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
                <label>
                  每轮题量
                  <select
                    value={topicRoundSize}
                    onChange={(e) => setTopicRoundSize(Number(e.target.value))}
                    disabled={busy}
                  >
                    <option value={5}>5题 · 轻松热身</option>
                    <option value={10}>10题 · 标准练习</option>
                    <option value={20}>20题 · 加强挑战</option>
                  </select>
                </label>
                <span className="badge">
                  {topics.length}个专题 ·{" "}
                  {Object.values(topicAvailability).filter(Boolean).length}
                  个专题可练
                </span>
              </div>
              <div className="topic-grid">
                {topics.map((t) => (
                  <article className="card topic-card" key={t.topic_id}>
                    <span className="badge">
                      {labels[t.category]} · P{t.grade_min}–P{t.grade_max}
                    </span>
                    <h2>{t.title}</h2>
                    <p>
                      {t.category === "phonics"
                        ? "文字音形准备 · 听辨另练"
                        : t.category === "expression"
                          ? "句框文字练习 · 口语与自由写作另练"
                          : "选择与填写 · 随机练习"}
                    </p>
                    {topicStats[t.topic_id] && (
                      <p className="topic-bank-count">
                        <strong>{topicStats[t.topic_id].items}道题</strong>
                        <span>
                          {topicStats[t.topic_id].families}组题干 · 每轮随机
                          {topicRoundSize}题
                        </span>
                      </p>
                    )}
                    <button
                      className={
                        topicAvailability[t.topic_id] ? "primary" : "secondary"
                      }
                      disabled={!topicAvailability[t.topic_id] || busy}
                      onClick={() =>
                        start("", {
                          topicId: t.topic_id,
                          roundSize: topicRoundSize,
                        })
                      }
                    >
                      {topicAvailability[t.topic_id]
                        ? `随机抽${topicRoundSize}题`
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
              <div className="discovery-hero">
                <div>
                  <p className="eyebrow">THE PATTERN WORKSHOP</p>
                  <h1>一个句框，装下好多想法。</h1>
                  <p className="lead">
                    先读懂情景，再选词、填词、搭句子。每轮随机抽题，最近练过的句子会尽量避开。
                  </p>
                </div>
                <SceneStage kind="workshop" />
              </div>
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
                  {patterns.length}条句式 · {Object.keys(patternStats).length}
                  条可练
                </span>
              </div>
              <div className="filter-row">
                <label>
                  每轮题量
                  <select
                    value={patternRoundSize}
                    onChange={(e) =>
                      setPatternRoundSize(Number(e.target.value))
                    }
                    disabled={busy}
                  >
                    <option value={5}>5题 · 轻松热身</option>
                    <option value={10}>10题 · 标准练习</option>
                    <option value={20}>20题 · 加强挑战</option>
                  </select>
                </label>
                <p className="footnote">
                  选择、填写、词块组句交替练习；题库仍会持续做教研复核。
                </p>
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
                    {patternStats[p.pattern_id] && (
                      <p className="topic-bank-count">
                        <strong>
                          {patternStats[p.pattern_id].items}个练习变体
                        </strong>
                        <span>
                          {patternStats[p.pattern_id].contexts}组情境 · 3种练法
                        </span>
                      </p>
                    )}
                    <button
                      className="primary"
                      disabled={busy || !patternStats[p.pattern_id]}
                      onClick={() =>
                        start("", {
                          patternId: p.pattern_id,
                          roundSize: patternRoundSize,
                        })
                      }
                    >
                      {patternStats[p.pattern_id]
                        ? `随机练${patternRoundSize}题`
                        : "题库正在准备"}
                    </button>
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
              {lastResult && (
                <section className="completion-card" role="status">
                  <span className="completion-sun" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <span className="eyebrow">ONE MORE LITTLE DISCOVERY</span>
                    <h2>这一小轮，完成啦！</h2>
                    <p>
                      完成{lastResult.total}步练习 · 独立答对
                      {lastResult.independent}步 · 包含提示共答对
                      {lastResult.correct}步
                    </p>
                    <p>
                      休息一下，让记忆慢慢长大。完成练习不等于已经掌握，之后还会再见。
                    </p>
                  </div>
                  <button className="secondary" onClick={() => move("map")}>
                    回到地图
                  </button>
                </section>
              )}
              <div className="discovery-hero">
                <div>
                  <p className="eyebrow">YOUR MEMORY GARDEN</p>
                  <h1>让记忆，慢慢长大。</h1>
                  <p className="lead">隔几天独立想起来，才是记忆变稳的证据。</p>
                </div>
                <SceneStage kind="garden" />
              </div>
              <div className="review-start card">
                <div>
                  <h2>
                    {learning.dueCount
                      ? `今天有${learning.dueCount}项记忆可以照顾`
                      : "今天还没有到期的记忆"}
                  </h2>
                  <p>
                    按到期时间优先安排，每轮最多8题，尽量换一个情景再想一想。
                  </p>
                </div>
                <button
                  className="primary"
                  disabled={
                    busy || !identity.authenticated || !learning.dueCount
                  }
                  onClick={() => start("", { mode: "review" })}
                >
                  开始今日复习
                </button>
              </div>
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
                    到期后会优先安排这些知识的复习；同一天跨课程和专题反复答对，也不会重复晋级。
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
          {view === "lesson" && selectedLesson && (
            <LessonView
              lesson={selectedLesson}
              busy={busy}
              onStart={() => start("", { lessonId: selectedLesson.id })}
              onBack={() => move("map")}
              completed={learning.completedLessons.some(
                (row) => row.lessonId === selectedLesson.id,
              )}
            />
          )}
          {view === "lesson" && !selectedLesson && lessons.length > 0 && (
            <div className="card empty-state">
              <h1>这节课还在准备中</h1>
              <button className="primary" onClick={() => move("map")}>
                回到探险地图
              </button>
            </div>
          )}
          {view === "parent" && (
            <FamilySpace
              identity={identity}
              refresh={refreshIdentity}
              learning={learning}
              lessons={lessons}
            />
          )}
          {view === "exercise" && session && (
            <div className="exercise-wrap">
              <SessionAccess
                session={session}
                stopped={sessionStopped}
                busy={busy}
                backup={draftBackup}
                onRefresh={() => void refreshSession()}
                onTakeover={() => void takeOver()}
                onLeave={() => move("map")}
              />
              {sessionNotice && (
                <p className="notice" role="status">
                  {sessionNotice}
                </p>
              )}
              <div className="exercise-top">
                <button
                  className="secondary"
                  onClick={() =>
                    move(
                      session.source === "vocabulary"
                        ? "words"
                        : session.source === "pattern"
                          ? "patterns"
                          : session.source === "topic"
                            ? "topics"
                            : "map",
                    )
                  }
                >
                  返回
                  {session.source === "vocabulary"
                    ? "单词特训"
                    : session.source === "pattern"
                      ? "固定句式"
                      : session.source === "topic"
                        ? "专题特训"
                        : "学习地图"}
                </button>
                <span className="badge">
                  第{session.position ?? 1}步 / 共{session.total ?? 1}步
                </span>
              </div>
              <progress
                className="lesson-progress"
                aria-label="本轮学习进度"
                max={session.total ?? 1}
                value={(session.position ?? 1) - (receipt ? 0 : 1)}
              />
              <article
                className="card exercise-card"
                data-saved={Boolean(receipt)}
              >
                <p className="eyebrow">ONE STEP AT A TIME</p>
                <h1>{session.exercise.title}</h1>
                <p className="lead">{session.exercise.context}</p>
                <SceneStage
                  key={session.assignmentId}
                  kind="feedback"
                  compact
                  animateReaction={
                    canWriteSession && receipt?.eventId === freshReceiptEvent
                  }
                  reaction={
                    canWriteSession
                      ? (receipt?.outcome ?? "thinking")
                      : "thinking"
                  }
                />
                {session.exercise.reading && (
                  <section
                    className="reading-passage"
                    aria-label="阅读材料"
                    lang="en"
                  >
                    {session.exercise.reading}
                  </section>
                )}
                <fieldset
                  className="exercise-controls"
                  disabled={!canWriteSession}
                >
                  <legend className="visually-hidden">当前题目作答</legend>
                  <h2 className="question">{session.exercise.prompt}</h2>
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
                      你的答案
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
                            (t, index, all) =>
                              !Array.isArray(answer) ||
                              answer.filter((v) => v === t).length <=
                                all.slice(0, index).filter((v) => v === t)
                                  .length,
                          )
                          .map((t, index) => (
                            <button
                              className="token"
                              key={`${t}-${index}`}
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
                      data-outcome={receipt.outcome}
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
                      <button
                        className="primary"
                        onClick={check}
                        disabled={busy}
                      >
                        {busy ? "正在保存…" : "检查并保存"}
                        <Icon kind="arrow" />
                      </button>
                    </div>
                  )}
                  {receipt && (
                    <Suspense
                      fallback={<p className="footnote">正在准备辅助理解…</p>}
                    >
                      <AiExplanation
                        key={session.assignmentId}
                        session={session}
                        allowed={canWriteSession}
                      />
                    </Suspense>
                  )}
                  {receipt && (
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={nextQuestion}
                    >
                      {(session.position ?? 1) < (session.total ?? 1)
                        ? "下一小步"
                        : "完成这轮，看看收获"}
                      <Icon kind="leaf" />
                    </button>
                  )}
                </fieldset>
              </article>
              <p className="footnote">
                同一份答案重试不会重复计分；提示后答对不晋级。每轮学完可以休息，完整课程会持续更新。
              </p>
            </div>
          )}
          {view === "exercise" && !session && (
            <section className="card empty-state">
              <h1>准备好下一次小探索</h1>
              <p>
                {sessionStopped
                  ? "这轮学习已结束或已切换，可以回到地图选择课程。"
                  : "正在恢复学习记录，也可以回到地图选择课程。"}
              </p>
              <button className="primary" onClick={() => move("map")}>
                回到学习地图
              </button>
            </section>
          )}
          {!catalog && !error && (
            <p className="empty-state" role="status">
              正在准备课程目录…
            </p>
          )}
        </main>
      </div>
    </MotionShell>
  );
}
