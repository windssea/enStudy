import ReviewOverview from "./ReviewOverview";
import { featureLazy } from "./featureLazy";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
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
  TrainingCycle,
} from "../packages/contracts/index";
import { api, setHouseholdContext, ApiError, setLearningChild } from "./api";
import { parseRoute, mapFragment, type View } from "./routes";
import { courseStep, courseLessonPath } from "./courseNavigation";
import CourseWrapUp from "./CourseWrapUp";
import WordFormCue from "./WordFormCue";
import { companionInfo } from "../packages/domain/companions";
import { applyCompanionChoice } from "./companionState";
import {
  topicGroups,
  topicItems,
  patternGroups,
  patternItems,
  type LibraryBrowse,
} from "./practiceCatalog";
import FamilySpace from "./FamilySpace";
import LessonView from "./LessonView";
import { MotionShell } from "./SceneStage";
import LearningIcon from "./LearningIcon";
import { exerciseKind } from "./exerciseKind";
import CoursePicker from "./CoursePicker";
import { reviewRefreshDelay } from "./reviewPresentation";
import SessionAccess from "./SessionAccess";
import ChildNavigation from "./ChildNavigation";
import ChildHome from "./ChildHome";
import ToyPicture from "./ToyPicture";
import PictureChoice from "./PictureChoice";
import PictureFeedback from "./PictureFeedback";
import { reconcileDraft } from "./sessionDraft";
import { setOfflineIdentity, lockOffline } from "./offlineAccess";
import {
  emptyAnswer,
  structuredCanonical,
  joinParts,
} from "../packages/domain/structured";
const PhonicsCentre = featureLazy(() => import("./PhonicsCentre"));
const WordAudioButton = featureLazy(() => import("./WordAudioButton"));
const WritingWorkshop = featureLazy(() => import("./WritingWorkshop"));
const MistakeNotebook = featureLazy(() => import("./MistakeNotebook"));
const WordTraining = featureLazy(() => import("./WordTraining"));
const PracticeLibrary = featureLazy(() => import("./PracticeLibrary"));
const PatternPractice = featureLazy(() => import("./PatternPractice"));
const AiExplanation = featureLazy(() => import("./AiExplanation"));
const TopicJourney = featureLazy(() => import("./TopicJourney"));
const ConversationPlayground = featureLazy(
  () => import("./ConversationPlayground"),
);
const Workshops = featureLazy(() => import("./Workshops"));
const StructuredAnswer = featureLazy(() => import("./StructuredAnswer"));
const ListeningPrompt = featureLazy(() => import("./ListeningPrompt"));
const EvidenceAnswer = featureLazy(() => import("./EvidenceAnswer"));
const OfflinePractice = featureLazy(() => import("./OfflinePractice"));
const grades = ["一", "二", "三", "四", "五", "六"];
const readRoute = () => parseRoute(window.location.hash);
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
  const [phonicsStageId, setPhonicsStageId] = useState<string | null>(
    () => readRoute().phonicsStageId ?? null,
  );
  const [writingPromptId, setWritingPromptId] = useState<string | null>(
    () => readRoute().writingPrompt ?? null,
  );
  const writingDirty = useRef(false),
    currentView = useRef(view),
    writingLocation = useRef(window.location.hash);
  currentView.current = view;
  if (view === "writing") writingLocation.current = window.location.hash;
  const [trainingTopic, setTrainingTopic] = useState<string | null>(
    () => readRoute().trainingTopic ?? null,
  );
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
  const [patternId, setPatternId] = useState<string | null>(
    () => readRoute().patternId ?? null,
  );
  const [topicBrowse, setTopicBrowse] = useState<LibraryBrowse>({
    group: null,
    query: "",
    year: 0,
  });
  const [patternBrowse, setPatternBrowse] = useState<LibraryBrowse>({
    group: null,
    query: "",
    year: 0,
  });
  const [learning, setLearning] = useState<LearningSummary>(emptyLearning);
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);
  const [wordThemes, setWordThemes] = useState<WordTheme[]>([]);
  const [wordThemeId, setWordThemeId] = useState<string | null>(null);
  const selectedLesson = lessons.find((lesson) => lesson.id === lessonId);
  useEffect(() => {
    const pop = () => {
      if (window.location.hash === "#main") return;
      const route = readRoute();
      if (
        currentView.current === "writing" &&
        writingDirty.current &&
        route.view !== "writing" &&
        !window.confirm(
          "还有文字未确认保存。可以先下载保留；现在仍要离开写作小工坊吗？",
        )
      ) {
        window.history.pushState(null, "", writingLocation.current);
        return;
      }
      // A hash navigation can emit both events; an accepted exit is confirmed once.
      if (currentView.current === "writing" && route.view !== "writing")
        writingDirty.current = false;
      setPhonicsStageId(route.phonicsStageId ?? null);
      setWritingPromptId(route.writingPrompt ?? null);
      setView(route.view);
      if (route.lessonId) setLessonId(route.lessonId);
      setTrainingTopic(route.trainingTopic ?? null);
      setPatternId(route.patternId ?? null);
      if (route.mapScope) {
        setGrade(route.mapScope.grade);
        setTerm(route.mapScope.term);
      }
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
  const [grade, setGrade] = useState(() => readRoute().mapScope?.grade ?? 3),
    [term, setTerm] = useState<string>(() => readRoute().mapScope?.term ?? "A");
  const [quiet, setQuiet] = useState(() => storedFlag("eq-quiet"));
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [twoD, setTwoD] = useState(() => storedFlag("eq-2d")),
    [hidden, setHidden] = useState(document.hidden);
  const partner = companionInfo(identity.child?.companionId);
  const mapUnitChoices = useRef(new Map<string, string>());
  const mapScope = `${identity.child?.id ?? "guest"}:${grade}:${term}`;
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
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [session, setSession] = useState<LearningSession | null>(null),
    [answer, setAnswer] = useState<Answer>("");
  const sessionLesson =
    session?.source === "lesson"
      ? lessons.find((lesson) => lesson.id === session.lessonId)
      : undefined;
  const [receipt, setReceipt] = useState<Receipt | null>(null),
    [hint, setHint] = useState("");
  const [sessionStopped, setSessionStopped] = useState(false);
  const [draftBackup, setDraftBackup] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState("");
  const [freshReceiptEvent, setFreshReceiptEvent] = useState<string | null>(
    null,
  );
  const mutation = useRef(0);
  const pictureFeedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view === "exercise" && session?.exercise.pictureChoices)
      document
        .getElementById("main")
        ?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [view, session?.assignmentId]);
  useEffect(() => {
    if (
      view === "exercise" &&
      session?.exercise.pictureChoices &&
      receipt &&
      receipt.eventId === freshReceiptEvent
    )
      pictureFeedbackRef.current?.scrollIntoView({
        block: "start",
        behavior: "auto",
      });
  }, [view, receipt?.eventId, freshReceiptEvent]);
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
  const move = (
    next: View,
    targetLessonId?: string,
    restoreLibrary = false,
  ) => {
    if (
      view === "writing" &&
      next !== "writing" &&
      writingDirty.current &&
      !window.confirm(
        "还有文字未确认保存。可以先下载保留；现在仍要离开写作小工坊吗？",
      )
    )
      return;
    if (view === "writing" && next !== "writing") writingDirty.current = false;
    if (next === "phonics")
      setPhonicsStageId(
        targetLessonId ?? phonicsStageId ?? session?.phonicsStageId ?? null,
      );
    if (next === "writing") setWritingPromptId(targetLessonId ?? null);
    let mapGrade = grade,
      mapTerm = term;
    if (next === "map") {
      const originId =
        view === "lesson"
          ? lessonId
          : view === "exercise"
            ? session?.lessonId
            : view === "review"
              ? lastResult?.lessonId
              : null;
      const origin = lessons.find((lesson) => lesson.id === originId);
      if (origin) {
        mapGrade = origin.grade;
        mapTerm = origin.term;
        setGrade(origin.grade);
        setTerm(origin.term);
        mapUnitChoices.current.set(
          `${identity.child?.id ?? "guest"}:${origin.grade}:${origin.term}`,
          origin.unitId,
        );
      }
    }
    if (next !== "exercise") {
      setTrainingTopic(null);
      setPatternId(null);
    }
    const hash =
      next === "phonics" &&
      (targetLessonId || phonicsStageId || session?.phonicsStageId)
        ? `#phonics=${encodeURIComponent(targetLessonId ?? phonicsStageId ?? session?.phonicsStageId ?? "")}`
        : next === "writing" && targetLessonId
          ? `#writing=${encodeURIComponent(targetLessonId)}`
          : next === "lesson"
            ? `#lesson=${encodeURIComponent(targetLessonId ?? lessonId ?? "")}`
            : next === "map"
              ? mapFragment(mapGrade, mapTerm)
              : `#${next}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    setView(next);
    setError("");
    if (!restoreLibrary) {
      window.scrollTo({ top: 0 });
      requestAnimationFrame(() =>
        mainRef.current?.focus({ preventScroll: true }),
      );
    }
  };
  function browseCourseMap(nextGrade: number, nextTerm: string) {
    setGrade(nextGrade);
    setTerm(nextTerm);
    const hash = mapFragment(nextGrade, nextTerm);
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  }
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
    if (
      !identity.authenticated ||
      !identity.child ||
      !["home", "review"].includes(view)
    )
      return;
    let live = true;
    const refresh = () => {
      if (live && !document.hidden) void refreshProgress().catch(() => {});
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      live = false;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [view, identity.authenticated, identity.child?.id]);
  useEffect(() => {
    if (
      !identity.authenticated ||
      !identity.child ||
      !["home", "review"].includes(view)
    )
      return;
    const delay = reviewRefreshDelay(progress.reviewPlan);
    if (delay === null) return;
    const current = epoch.current;
    const timer = window.setTimeout(() => {
      if (!document.hidden) void refreshProgress(current).catch(() => {});
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    view,
    identity.authenticated,
    identity.child?.id,
    progress.reviewPlan?.nextAt,
    progress.reviewPlan?.generatedAt,
  ]);
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
        setHouseholdContext(me.adult);
        setIdentity(me);
        setOfflineIdentity(me);
        if (me.child) setGrade(readRoute().mapScope?.grade ?? me.child.grade);
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
    setHouseholdContext(me.adult);
    setIdentity(me);
    setOfflineIdentity(me);
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
    if (me.child) setGrade(readRoute().mapScope?.grade ?? me.child.grade);
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
      if (event.data === "identity-changed") {
        lockOffline();
        void refreshIdentity(false).catch((error) => setError(message(error)));
      }
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
      submittedAnswer?: Answer | null;
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
    setAnswer(
      saved.receipt &&
        saved.submittedAnswer !== null &&
        saved.submittedAnswer !== undefined
        ? saved.submittedAnswer
        : emptyAnswer(saved.session.exercise),
    );
    eventId.current = crypto.randomUUID();
  }
  type SavedSession = {
    childId: string;
    session: LearningSession | null;
    receipt?: Receipt | null;
    hint?: string | null;
    submittedAnswer?: Answer | null;
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
      saved.receipt && saved.submittedAnswer !== null
        ? saved.submittedAnswer
        : undefined,
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
          ? "这轮学习已结束，可以回课程列表选择新任务。"
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
      (error.status === 401 ||
        error.code === "IDENTITY_CHANGED" ||
        error.code === "HOUSEHOLD_CONTEXT_CHANGED")
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
            (error.status === 401 ||
              error.code === "IDENTITY_CHANGED" ||
              error.code === "HOUSEHOLD_CONTEXT_CHANGED")
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
  const dueCount = progress.reviewPlan?.dueCount ?? learning.dueCount;
  async function start(
    exerciseId: string,
    task?: {
      lessonId?: string;
      topicId?: string;
      patternId?: string;
      wordThemeId?: string;
      workshopId?: string;
      phonicsStageId?: string;
      wordMode?: WordMode;
      mode?: "review";
      roundSize?: number;
      trainingCycleId?: string;
      trainingVersion?: number;
      mistakeEventId?: string;
      mistakeVersion?: number;
      clientRequestId?: string;
    },
  ) {
    if (!identity.authenticated || !identity.child) {
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
        ...(task?.mistakeEventId
          ? { ...task, exerciseId }
          : (task ?? { exerciseId })),
        clientRequestId: task?.clientRequestId ?? crypto.randomUUID(),
      });
      if (epoch.current !== current) return;
      setLastResult(null);
      setSessionStopped(false);
      setDraftBackup(null);
      setSessionNotice("");
      pendingClaim.current = null;
      setSession(data);
      setFreshReceiptEvent(null);
      setAnswer(emptyAnswer(data.exercise));
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
      session.exercise.type === "listen" &&
      !session.listening?.heard &&
      !session.listening?.textSupport
    ) {
      setError("请先播放并确认听到，或选择文字辅助，再检查答案。");
      return;
    }
    if (structuredCanonical(session.exercise, answer) === null) {
      setError(
        session.exercise.graphemeTokens
          ? "把下方字母块都用上，排成一个词，再检查吧。"
          : session.exercise.type === "evidence"
            ? "先选支持答案的原文句，再选问题答案，一起检查吧。"
            : "请放好全部卡片，或选好词块并填写修改，再检查吧。",
      );
      return;
    }
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
        const topicReturn = session.training?.topicId;
        setFreshReceiptEvent(null);
        setLastResult(result.result ?? null);
        setSession(null);
        setReceipt(null);
        await refreshProgress(current);
        if (topicReturn) openTraining(topicReturn);
        else move(session.guidedRetry ? "mistakes" : "review");
      } else if (result.session) {
        setFreshReceiptEvent(null);
        setSession(result.session);
        setReceipt(null);
        setHint("");
        setAnswer(emptyAnswer(result.session.exercise));
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
    setGrade(lesson.grade);
    setTerm(lesson.term);
    setLessonId(lesson.id);
    move("lesson", lesson.id);
  }
  function openTraining(id: string) {
    setTrainingTopic(id);
    setPatternId(null);
    setView("topics");
    window.history.pushState(null, "", `#training=${encodeURIComponent(id)}`);
    window.scrollTo({ top: 0 });
  }
  const pendingTrainingResume = useRef<{
    id: string;
    version: number;
    nonce: string;
  } | null>(null);
  function openPattern(id: string) {
    setPatternId(id);
    setTrainingTopic(null);
    setView("patterns");
    const hash = `#pattern=${encodeURIComponent(id)}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    window.scrollTo({ top: 0 });
  }
  async function resumeTraining(id: string) {
    setBusy(true);
    setError("");
    mutation.current++;
    const current = epoch.current;
    try {
      let snapshot = await api<SavedSession>(`/sessions/${id}/snapshot`);
      if (snapshot.session?.state === "paused") {
        const version = snapshot.session.leaseVersion;
        if (
          pendingTrainingResume.current?.id !== id ||
          pendingTrainingResume.current.version !== version
        )
          pendingTrainingResume.current = {
            id,
            version,
            nonce: crypto.randomUUID(),
          };
        snapshot = await api<SavedSession>(`/sessions/${id}/takeover`, {
          resume: true,
          expectedLeaseVersion: version,
          clientRequestId: pendingTrainingResume.current.nonce,
        });
      }
      if (epoch.current !== current) return;
      applySnapshot(snapshot);
      pendingTrainingResume.current = null;
      move("exercise");
    } catch (error) {
      await handleSessionError(error, current);
    } finally {
      setBusy(false);
    }
  }
  const units = (catalog?.units ?? []).filter(
    (u) => u.grade === String(grade) && u.term === term,
  );
  const courseNavigation = courseStep(
    lessons,
    grade,
    term,
    learning.completedLessons,
  );
  const availableLessons = courseNavigation.available;
  const nextLesson = courseNavigation.next;
  const nav: [View, string, string][] = [
    ["map", "课程学习", "map"],
    ["words", "单词特训", "words"],
    ["topics", "专题特训", "blocks"],
    ["patterns", "固定句式", "book"],
    ["review", "复习", "leaf"],
    ["parent", "家长空间", "person"],
  ];
  const sessionHome: View = session?.guidedRetry
    ? "mistakes"
    : ((
        {
          vocabulary: "words",
          topic: "topics",
          pattern: "patterns",
          workshop: "workshops",
          phonics: "phonics",
          review: "review",
        } as Record<string, View>
      )[session?.source ?? ""] ?? "map");
  const currentSection =
    view === "exercise"
      ? sessionHome
      : view === "lesson" || view === "talk" || view === "writing"
        ? "map"
        : view;
  useEffect(() => {
    document.dispatchEvent(new Event("eq-stop-speech"));
  }, [view, lessonId, trainingTopic, patternId]);
  const activeNav =
    currentSection === "mistakes"
      ? "review"
      : currentSection === "workshops"
        ? "topics"
        : currentSection === "phonics"
          ? "words"
          : currentSection;
  return (
    <MotionShell
      quiet={quiet || reduced}
      flat={twoD}
      companion={partner.id}
      childView={view}
    >
      <a className="skip" href="#main">
        跳到主要内容
      </a>
      <ChildNavigation active={activeNav} onGo={move} />
      <div className="workspace">
        <header className="topbar">
          <div className="learner-context">
            <LearningIcon kind="person" />
            <strong>{identity.child?.nickname ?? "英语学习"}</strong>
            {identity.child && (
              <span>{grades[identity.child.grade - 1]}年级</span>
            )}
          </div>
          <div className="toolbar">
            {view === "parent" && (
              <details className="display-settings" key={view}>
                <summary>显示偏好</summary>
                <div className="display-settings-panel">
                  <button
                    className="soft-button"
                    aria-pressed={quiet || reduced}
                    disabled={reduced}
                    onClick={() => setQuiet(!quiet)}
                  >
                    {reduced
                      ? "跟随系统减少动效"
                      : quiet
                        ? "减少动效：开"
                        : "减少动效：关"}
                  </button>
                </div>
              </details>
            )}
            {view !== "parent" && (
              <>
                <span className="stars">
                  <Icon kind="star" />
                  <span aria-label={`累计${progress.stars}颗星`}>
                    {progress.stars}
                  </span>
                </span>
                <button
                  className="profile-button"
                  aria-label={`家长空间与档案：${identity.child?.nickname ?? "选择档案"}`}
                  onClick={() => move("parent")}
                >
                  <LearningIcon kind="person" />
                  <span>家长设置</span>
                </button>
              </>
            )}
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
          {error && view !== "offline" && (
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
          {view === "home" && (
            <ChildHome
              nickname={identity.child?.nickname}
              taskTitle={
                session && identity.authenticated
                  ? session.exercise.title
                  : dueCount && identity.authenticated
                    ? "复习已学内容"
                    : nextLesson?.title
              }
              taskDetail={
                session && identity.authenticated
                  ? [
                      sessionLesson
                        ? courseLessonPath(
                            sessionLesson,
                            catalog?.units ?? [],
                            lessons,
                          )
                        : undefined,
                      `第${session.position ?? 1} / ${session.total}题`,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : dueCount && identity.authenticated
                    ? `${dueCount}项到期复习`
                    : nextLesson?.unitTitle
              }
              busy={busy}
              ready={
                Boolean(nextLesson) ||
                !identity.child ||
                Boolean(session) ||
                dueCount > 0
              }
              resume={Boolean(session && identity.authenticated)}
              review={Boolean(!session && identity.authenticated && dueCount)}
              onGo={move}
              onStart={() => {
                if (!identity.child) move("parent");
                else if (session && identity.authenticated) move("exercise");
                else if (dueCount) void start("", { mode: "review" });
                else if (nextLesson) openLesson(nextLesson);
              }}
            />
          )}
          {view === "map" && (
            <>
              <div className="page-head">
                <div>
                  <h1>课程学习</h1>
                </div>
                <div className="filters">
                  <label>
                    年级
                    <select
                      value={grade}
                      onChange={(e) =>
                        browseCourseMap(Number(e.target.value), term)
                      }
                    >
                      {grades.map((label, i) => (
                        <option key={label} value={i + 1}>
                          {label}年级
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    学期
                    <select
                      value={term}
                      onChange={(e) => browseCourseMap(grade, e.target.value)}
                    >
                      <option value="A">上学期</option>
                      <option value="B">下学期</option>
                    </select>
                  </label>
                </div>
              </div>
              <CoursePicker
                key={`${grade}:${term}:${identity.child?.id ?? "guest"}`}
                units={units}
                lessons={availableLessons}
                completed={learning.completedLessons}
                nextUnitId={
                  mapUnitChoices.current.get(mapScope) ?? nextLesson?.unitId
                }
                resume={
                  identity.authenticated &&
                  session?.source === "lesson" &&
                  session.lessonId &&
                  session.access !== "ended" &&
                  (session.state === "active" || session.state === "paused")
                    ? {
                        lessonId: session.lessonId,
                        position: session.position ?? 1,
                        total: session.total,
                        saved: Boolean(receipt),
                        takeover: session.access === "takeover-required",
                        busy,
                        onResume: () => move("exercise"),
                      }
                    : undefined
                }
                onSelectUnit={(unitId) =>
                  mapUnitChoices.current.set(mapScope, unitId)
                }
                onOpen={openLesson}
              />
              {courseNavigation.allPractised && (
                <div className="course-term-end">
                  {term === "B" ? (
                    <CourseWrapUp
                      dueCount={learning.dueCount}
                      onReview={() => move("review")}
                    />
                  ) : courseNavigation.nextTerm ? (
                    <button
                      className="secondary"
                      onClick={() => {
                        browseCourseMap(grade, "B");
                        window.scrollTo({ top: 0 });
                        requestAnimationFrame(() => mainRef.current?.focus());
                      }}
                    >
                      下学期课程
                      <Icon kind="arrow" />
                    </button>
                  ) : null}
                </div>
              )}
            </>
          )}
          {view === "words" && (
            <>
              <Suspense
                fallback={
                  <p className="empty-state" role="status">
                    正在准备单词小课堂…
                  </p>
                }
              >
                <WordTraining
                  themes={wordThemes}
                  onPhonics={() => move("phonics")}
                  grade={grade}
                  childId={identity.child?.id}
                  resume={
                    session?.source === "vocabulary"
                      ? {
                          title: session.exercise.title,
                          position: session.position ?? 1,
                          saved: Boolean(receipt),
                          takeover: session.access === "takeover-required",
                        }
                      : undefined
                  }
                  onResume={() => move("exercise")}
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
            <Suspense fallback={<p role="status">正在打开专题入口…</p>}>
              <PracticeLibrary
                kind="topic"
                groups={topicGroups}
                items={topicItems(catalog?.topics ?? [], topicAvailability)}
                hidden={Boolean(trainingTopic)}
                busy={busy}
                onOpen={openTraining}
                browse={topicBrowse}
                onBrowseChange={setTopicBrowse}
                onWorkshop={() => move("workshops")}
              />
              {trainingTopic && (
                <TopicJourney
                  key={`${identity.child?.id ?? "guest"}:${trainingTopic}`}
                  topicId={trainingTopic}
                  title={
                    catalog?.topics.find((t) => t.topic_id === trainingTopic)
                      ?.title ?? "专题小计划"
                  }
                  childId={identity.child?.id}
                  busy={busy}
                  onBack={() => move("topics", undefined, true)}
                  onProfile={() => move("parent")}
                  onStart={(cycle: TrainingCycle) =>
                    start("", {
                      topicId: cycle.topicId,
                      trainingCycleId: cycle.id,
                      trainingVersion: cycle.version,
                    })
                  }
                  onResume={(id) => void resumeTraining(id)}
                  onPractice={(size) =>
                    void start("", { topicId: trainingTopic, roundSize: size })
                  }
                />
              )}
            </Suspense>
          )}
          {view === "patterns" && (
            <Suspense fallback={<p role="status">正在打开句式小剧场…</p>}>
              <PracticeLibrary
                kind="pattern"
                groups={patternGroups(catalog?.patterns ?? [])}
                items={patternItems(catalog?.patterns ?? [], patternStats)}
                hidden={Boolean(patternId)}
                busy={busy}
                onOpen={openPattern}
                browse={patternBrowse}
                onBrowseChange={setPatternBrowse}
              />
              {patternId &&
                (catalog?.patterns.find((p) => p.pattern_id === patternId) ? (
                  <PatternPractice
                    key={`${identity.child?.id ?? "guest"}:${patternId}`}
                    pattern={catalog.patterns.find(
                      (p) => p.pattern_id === patternId,
                    )!}
                    stats={patternStats[patternId]}
                    childId={identity.child?.id}
                    busy={busy}
                    onBack={() => move("patterns", undefined, true)}
                    onStart={(size) =>
                      void start("", { patternId, roundSize: size })
                    }
                  />
                ) : (
                  <section className="card empty-state">
                    <h1>{catalog ? "暂时找不到这个句式" : "正在读取句式…"}</h1>
                    <p>可以回到场景入口，重新挑一个来练。</p>
                    <button
                      className="secondary"
                      onClick={() => move("patterns")}
                    >
                      返回句式入口
                    </button>
                  </section>
                ))}
            </Suspense>
          )}
          {view === "review" && (
            <>
              {lastResult && (
                <section className="completion-card" role="status">
                  <div>
                    <h2>本轮练习完成</h2>
                    <p>
                      完成{lastResult.total}题 · 独立答对
                      {lastResult.independent}题 · 含辅助共答对
                      {lastResult.correct}题
                    </p>
                  </div>
                  <button className="secondary" onClick={() => move("map")}>
                    回到课程列表
                  </button>
                </section>
              )}
              <ReviewOverview
                progress={progress}
                dueCount={dueCount}
                ready={identity.authenticated && Boolean(identity.child)}
                busy={busy}
                onStart={() => void start("", { mode: "review" })}
                onLearn={() => move("map")}
                onParent={() => move("parent")}
                onMistakes={() => move("mistakes")}
              />
            </>
          )}
          {view === "talk" && (
            <Suspense fallback={<p role="status">正在准备英语小剧场…</p>}>
              <ConversationPlayground
                key={identity.child?.id ?? "visitor"}
                onBack={() => move("map")}
                onParent={() => move("parent")}
              />
            </Suspense>
          )}
          {view === "phonics" && (
            <Suspense fallback={<p role="status">正在准备拼读小路…</p>}>
              <PhonicsCentre
                key={`${identity.child?.id ?? "none"}`}
                childId={identity.child?.id}
                busy={busy}
                initialStageId={phonicsStageId ?? session?.phonicsStageId}
                onBrowse={(id) => move("phonics", id)}
                onStart={(id, roundSize) => {
                  setPhonicsStageId(id);
                  void start("", { phonicsStageId: id, roundSize });
                }}
                onBack={() => move("words")}
                onParent={() => move("parent")}
              />
            </Suspense>
          )}
          {view === "writing" && (
            <Suspense fallback={<p role="status">正在准备写作小工坊…</p>}>
              <WritingWorkshop
                key={`${identity.adult?.householdId ?? "none"}:${identity.child?.id ?? "none"}`}
                childId={identity.child?.id}
                grade={identity.child?.grade ?? grade}
                initialPromptId={writingPromptId}
                onBack={() => move("map")}
                onDirtyChange={(dirty) => {
                  writingDirty.current = dirty;
                }}
              />
            </Suspense>
          )}
          {view === "workshops" && (
            <Suspense fallback={<p role="status">正在准备分类和修正工坊…</p>}>
              <Workshops
                busy={busy}
                onStart={(workshopId, roundSize) =>
                  void start("", { workshopId, roundSize })
                }
                onBack={() => move("topics")}
              />
            </Suspense>
          )}
          {view === "lesson" && selectedLesson && (
            <LessonView
              childId={identity.child?.id}
              lesson={selectedLesson}
              coursePath={courseLessonPath(
                selectedLesson,
                catalog?.units ?? [],
                lessons,
              )}
              onWriting={(id) => move("writing", id)}
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
                回到课程列表
              </button>
            </div>
          )}
          {view === "mistakes" && (
            <Suspense fallback={<p role="status">正在打开错题小本…</p>}>
              <MistakeNotebook
                key={identity.child?.id ?? "guest"}
                childId={identity.child?.id}
                busy={busy}
                onBack={() => move("review")}
                onProfile={() => move("parent")}
                onRetry={(
                  exerciseId,
                  mistakeEventId,
                  clientRequestId,
                  mistakeVersion,
                ) =>
                  void start(exerciseId, {
                    mistakeEventId,
                    clientRequestId,
                    mistakeVersion,
                  })
                }
              />
            </Suspense>
          )}
          {view === "parent" && (
            <FamilySpace
              key={`${identity.adult?.username}:${identity.adult?.householdId}:${identity.adult?.contextVersion}`}
              onOpenTraining={openTraining}
              onReview={() => move("review")}
              identity={identity}
              refresh={refreshIdentity}
              learning={learning}
              lessons={lessons}
            />
          )}
          {view === "offline" && (
            <Suspense fallback={<p role="status">正在打开本机练习…</p>}>
              <OfflinePractice
                session={session}
                identity={identity}
                onReturn={() => {
                  move("exercise");
                  void refreshSession();
                }}
                onProfile={() => move("parent")}
                onChoose={() => move("map")}
                onSynced={() => refreshIdentity()}
              />
            </Suspense>
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
                leaveLabel={`返回${sessionHome === "mistakes" ? "错题小本" : sessionHome === "phonics" ? "拼读小路" : sessionHome === "workshops" ? "辨析与应用" : (nav.find((n) => n[0] === sessionHome)?.[1] ?? "课程列表")}`}
                onLeave={() => move(sessionHome)}
              />
              {sessionNotice && (
                <p className="notice" role="status">
                  {sessionNotice}
                </p>
              )}
              {session.offlinePrepared && (
                <p className="notice">
                  这轮题目已准备为本机练习；联网提交也另记离线练习证据，不增加独立掌握计数或星星。
                </p>
              )}
              {session.guidedRetry && (
                <p className="notice">
                  跟着讲解重做 ·
                  这一题按辅助练习保存，不追加星星，不增加独立掌握计数。之后再用新材料回想。
                </p>
              )}
              <div className="exercise-top">
                {session.offlinePrepared && (
                  <a
                    className="offline-link"
                    href={
                      import.meta.env.DEV
                        ? "http://127.0.0.1:8788/#offline"
                        : "#offline"
                    }
                    onClick={(event) => {
                      if (!import.meta.env.DEV) {
                        event.preventDefault();
                        move("offline");
                      }
                    }}
                  >
                    查看待同步记录
                  </a>
                )}
                <button
                  className="secondary"
                  onClick={() =>
                    session.training
                      ? openTraining(session.training.topicId)
                      : session.source === "pattern" && patternId
                        ? openPattern(patternId)
                        : move(sessionHome)
                  }
                >
                  返回
                  {session.guidedRetry
                    ? "错题小本"
                    : session.source === "phonics"
                      ? "拼读小路"
                      : session.source === "workshop"
                        ? "辨析与应用"
                        : session.source === "vocabulary"
                          ? "单词特训"
                          : session.source === "pattern"
                            ? "固定句式"
                            : session.source === "topic"
                              ? "专题特训"
                              : session.source === "review"
                                ? "复习"
                                : "课程列表"}
                </button>
                <span className="badge">
                  第{session.position ?? 1}题 / 共{session.total ?? 1}题
                </span>
              </div>
              <progress
                className="lesson-progress"
                aria-label="本轮学习进度"
                max={session.total ?? 1}
                value={(session.position ?? 1) - (receipt ? 0 : 1)}
              />
              <article
                className={`card exercise-card${session.exercise.pictureChoices ? " picture-exercise" : ""}`}
                data-saved={Boolean(receipt)}
              >
                <p className="exercise-kind">
                  {exerciseKind(session.exercise)}
                </p>
                {session.training && (
                  <p className="badge">
                    {session.training.phase === "diagnostic"
                      ? "先试一试"
                      : session.training.phase === "practice"
                        ? "看规律，再巩固"
                        : session.training.phase === "transfer"
                          ? "换材料应用"
                          : `第${session.training.checkpoint}天回访`}{" "}
                    · 不计速度
                  </p>
                )}
                <h1>{session.exercise.title}</h1>
                <p className="lead">{session.exercise.context}</p>

                {session.exercise.wordFormCue && (
                  <WordFormCue
                    key={session.assignmentId}
                    cue={session.exercise.wordFormCue}
                  />
                )}

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
                  <h2
                    className={`question${session.exercise.wordFormCue ? " word-form-context" : ""}`}
                  >
                    {session.exercise.prompt}
                  </h2>
                  {session.exercise.type === "listen" && (
                    <Suspense fallback={<p role="status">正在准备本题声音…</p>}>
                      <ListeningPrompt
                        key={`${session.assignmentId}:${session.leaseVersion}`}
                        session={session}
                        disabled={busy || !canWriteSession}
                        answered={Boolean(receipt)}
                        onState={(state) =>
                          setSession((current) =>
                            current?.assignmentId === session.assignmentId &&
                            current.leaseId === session.leaseId
                              ? { ...current, listening: state }
                              : current,
                          )
                        }
                      />
                    </Suspense>
                  )}
                  {session.exercise.type === "evidence" && (
                    <Suspense fallback={<p role="status">正在准备小故事…</p>}>
                      <EvidenceAnswer
                        key={session.assignmentId}
                        exercise={session.exercise}
                        answer={answer}
                        onChange={setAnswer}
                        disabled={busy || !canWriteSession || Boolean(receipt)}
                      />
                    </Suspense>
                  )}
                  {(session.exercise.type === "sort" ||
                    session.exercise.type === "repair") && (
                    <Suspense fallback={<p role="status">正在准备互动卡片…</p>}>
                      <StructuredAnswer
                        key={session.assignmentId}
                        exercise={session.exercise}
                        answer={answer}
                        onChange={setAnswer}
                        disabled={!canWriteSession || busy || Boolean(receipt)}
                      />
                    </Suspense>
                  )}
                  {(session.exercise.type === "choice" ||
                    session.exercise.type === "listen") && (
                    <div
                      className={`answer-options${session.exercise.pictureChoices ? " picture-answer-options" : ""}`}
                    >
                      {session.exercise.choices?.map((o) => (
                        <div className="child-answer-choice" key={o}>
                          <button
                            disabled={
                              busy ||
                              Boolean(receipt) ||
                              (session.exercise.type === "listen" &&
                                !session.listening?.heard &&
                                !session.listening?.textSupport)
                            }
                            className="answer-option"
                            aria-pressed={answer === o}
                            key={o}
                            onClick={() => setAnswer(o)}
                          >
                            <PictureChoice
                              exercise={session.exercise}
                              value={o}
                              revealed={Boolean(receipt)}
                            />
                          </button>
                        </div>
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
                  {session.exercise.audioUrl &&
                    session.exercise.type !== "listen" && (
                      <Suspense fallback={<p>声音按钮准备中…</p>}>
                        <WordAudioButton
                          key={session.assignmentId}
                          url={session.exercise.audioUrl}
                        />
                      </Suspense>
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
                          <span>
                            {session.exercise.graphemeTokens
                              ? "点击字母块，拼成一个词。"
                              : "按顺序选择单词。"}
                          </span>
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
                      {(session.exercise.punctuationTokens ||
                        session.exercise.graphemeTokens) &&
                        Array.isArray(answer) && (
                          <p className="order-preview" lang="en">
                            {answer.length
                              ? session.exercise.graphemeTokens
                                ? answer.join("")
                                : joinParts(answer)
                              : "…"}
                          </p>
                        )}
                    </>
                  )}
                  {hint && (
                    <div className="notice" role="status">
                      提示：{hint} 本题记为辅助练习。
                    </div>
                  )}
                  {receipt ? (
                    <div
                      className={`feedback ${receipt.outcome === "correct" ? "success" : ""}`}
                      ref={pictureFeedbackRef}
                      data-outcome={receipt.outcome}
                      role="status"
                    >
                      <span className="child-receipt-symbol">
                        <ToyPicture
                          kind={
                            receipt.outcome === "correct" ? "check" : "help"
                          }
                        />
                      </span>
                      <strong>
                        {receipt.correctedPicture
                          ? receipt.outcome === "correct"
                            ? "听出来啦！"
                            : receipt.outcome === "incorrect"
                              ? "再看一看，听一听。"
                              : "跟着帮助，完成啦。"
                          : receipt.outcome === "correct"
                            ? "回答正确"
                            : receipt.outcome === "hinted"
                              ? receipt.support === "offline"
                                ? "离线练习已核对，另记练习证据。"
                                : receipt.support === "transcript"
                                  ? "借助文字，完成了这一步。"
                                  : receipt.support === "example"
                                    ? "跟着示范，完成了这一步。"
                                    : "跟着提示，完成了这一步。"
                              : "先看看这个规律，再用新题练习。"}
                      </strong>
                      {receipt.correctedPicture ? (
                        <PictureFeedback receipt={receipt} />
                      ) : (
                        <>
                          <p>{receipt.feedback}</p>
                        </>
                      )}
                      {receipt.correctedSentence && (
                        <div>
                          <p>一种正确表达：</p>
                          <p className="corrected-sentence" lang="en">
                            {receipt.correctedSentence}
                          </p>
                        </div>
                      )}
                      {receipt.details && (
                        <ul
                          className="structured-feedback"
                          aria-label="逐张核对，整题结果以上方为准"
                        >
                          {receipt.details.map((part, i) => (
                            <li key={i} data-correct={part.correct}>
                              <strong>{part.label}</strong>
                              <span>
                                {part.correct
                                  ? "这一步想对了"
                                  : "这一步再看一看"}
                              </span>
                              <small>我的：{part.submitted}</small>
                              {!part.correct && (
                                <small>可以用：{part.expected}</small>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      <small>已保存</small>
                    </div>
                  ) : (
                    <div className="exercise-actions">
                      <button
                        className="secondary"
                        onClick={askHint}
                        disabled={busy || Boolean(hint)}
                      >
                        <ToyPicture kind="help" />
                        <span>查看提示</span>
                      </button>
                      <button
                        className="primary"
                        onClick={check}
                        disabled={busy}
                      >
                        {busy ? "保存中…" : "提交答案"}
                        <ToyPicture kind="check" />
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
                        hideUnavailable
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
                        ? "下一题"
                        : "完成练习"}
                      <ToyPicture kind="next" />
                    </button>
                  )}
                </fieldset>
              </article>
            </div>
          )}
          {view === "exercise" && !session && (
            <section className="card empty-state">
              <h1>准备好下一次小探索</h1>
              <p>
                {sessionStopped
                  ? "这轮学习已结束或已切换，可以回到课程列表选择课程。"
                  : "正在恢复学习记录，也可以回到课程列表选择课程。"}
              </p>
              <button className="primary" onClick={() => move("map")}>
                回到课程列表
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
