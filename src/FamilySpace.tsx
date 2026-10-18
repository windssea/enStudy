import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import type {
  ChildProfile,
  Identity,
  LearningSummary,
  CourseLesson,
} from "../packages/contracts/index";
import { api } from "./api";
import AccountSecurity from "./AccountSecurity";
const ManagedAccounts = lazy(() => import("./ManagedAccounts"));
const AiSettings = lazy(() => import("./AiSettings"));
const TrainingFollowUps = lazy(() => import("./TrainingFollowUps"));
const LearningReport = lazy(() => import("./LearningReport"));
const HouseholdAccess = lazy(() => import("./HouseholdAccess"));

export default function FamilySpace({
  identity,
  refresh,
  learning,
  lessons,
  onOpenTraining,
  onReview,
}: {
  identity: Identity;
  refresh: () => Promise<void>;
  learning: LearningSummary;
  lessons: CourseLesson[];
  onOpenTraining: (id: string) => void;
  onReview: () => void;
}) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [nickname, setNickname] = useState("");
  const [grade, setGrade] = useState(3);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const canManage = identity.adult?.role === "owner";
  const loadChildren = async () =>
    setChildren((await api<{ items: ChildProfile[] }>("/children")).items);
  useEffect(() => {
    let live = true;
    if (identity.adult && !identity.adult.mustChangePassword)
      api<{ items: ChildProfile[] }>("/children")
        .then((data) => {
          if (live) setChildren(data.items);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    else setChildren([]);
    return () => {
      live = false;
    };
  }, [identity.adult?.username, identity.adult?.mustChangePassword]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "暂时没有连上，请重试。");
    } finally {
      setBusy(false);
    }
  }
  function login(e: FormEvent) {
    e.preventDefault();
    void action(async () => {
      await api("/auth/login", { username, password });
      setPassword("");
      await refresh();
      setNotice("登录成功，出发去探索吧。");
    });
  }
  function saveChild(e: FormEvent) {
    e.preventDefault();
    void action(async () => {
      const child = await api<ChildProfile>(
        editing ? `/children/${editing}` : "/children",
        { nickname, grade },
      );
      if (!editing) await api(`/children/${child.id}/select`, {});
      setNickname("");
      setEditing(null);
      await loadChildren();
      await refresh();
      setNotice("档案已保存，每位小探险家的进度都会单独记录。");
    });
  }
  return (
    <>
      <p className="eyebrow">A LITTLE HELP, A BIG ADVENTURE</p>
      <h1>陪孩子，把每一步走扎实。</h1>
      <p className="lead">先选好探险家，再把今天的小进步留在这里。</p>
      {identity.adult && !identity.adult.mustChangePassword && (
        <>
          <p className="notice">
            当前家庭：{identity.adult.householdName || "尚未选择家庭"} ·{" "}
            {identity.adult.role === "owner"
              ? "管理家长"
              : identity.adult.role === "guardian"
                ? "协助家长"
                : "请先选择家庭"}
          </p>
          <Suspense fallback={<p role="status">正在准备共同陪伴设置…</p>}>
            <HouseholdAccess refresh={refresh} />
          </Suspense>
        </>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <div className="family-layout">
        {!identity.adult ? (
          <section className="card login-card">
            <div className="login-emblem" aria-hidden="true">
              <span> Aa </span>
              <i />
              <i />
            </div>
            <span className="badge">欢迎回到英语探险岛</span>
            <h2>家长登录</h2>
            <p>登录后，孩子可以继续上次的练习，学习记录不会丢失。</p>
            <form onSubmit={login} className="profile-form">
              <label className="field">
                账号
                <input
                  required
                  autoComplete="username"
                  maxLength={80}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="field">
                密码
                <span className="password-field">
                  <input
                    required
                    autoComplete="current-password"
                    type={visible ? "text" : "password"}
                    value={password}
                    maxLength={256}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="text-button"
                    aria-pressed={visible}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? "隐藏" : "显示"}
                  </button>
                </span>
              </label>
              <button className="primary" disabled={busy} type="submit">
                {busy ? "正在登录…" : "登录，开始探索"}
                <span aria-hidden="true">→</span>
              </button>
            </form>
            <p className="footnote">暂不开放注册，请使用管理员提供的账号。</p>
          </section>
        ) : identity.adult.mustChangePassword ? (
          <section className="card">
            <span className="badge">临时密码 · 首次登录</span>
            <AccountSecurity
              username={identity.adult.username}
              required
              onChanged={async () => {
                await refresh();
                setNotice("密码已更新，请使用新密码重新登录。");
              }}
            />
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  await api("/logout", {});
                  await refresh();
                })
              }
            >
              退出账号
            </button>
          </section>
        ) : (
          <section className="card family-card">
            <div className="family-heading">
              <div>
                <span className="badge">
                  已登录 · {identity.adult.username}
                </span>
                <h2>
                  {identity.adult.householdId
                    ? "谁来开始今天的探索？"
                    : "请先选择要进入的家庭"}
                </h2>
              </div>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await api("/logout", {});
                    await refresh();
                  })
                }
              >
                退出登录
              </button>
            </div>
            <div className="children-grid">
              {children.map((child, i) => (
                <article
                  className="child-profile"
                  key={child.id}
                  data-selected={identity.child?.id === child.id}
                >
                  <div
                    className={`child-avatar avatar-${i % 4}`}
                    aria-hidden="true"
                  >
                    {child.nickname.slice(0, 1)}
                  </div>
                  <h3>{child.nickname}</h3>
                  <p>
                    {["一", "二", "三", "四", "五", "六"][child.grade - 1]}年级
                    · 独立学习记录
                  </p>
                  <button
                    className={
                      identity.child?.id === child.id
                        ? "soft-button"
                        : "primary"
                    }
                    disabled={busy || identity.child?.id === child.id}
                    onClick={() =>
                      void action(async () => {
                        await api(`/children/${child.id}/select`, {});
                        await refresh();
                        setNotice(`已切换到${child.nickname}。`);
                      })
                    }
                  >
                    {identity.child?.id === child.id
                      ? "正在使用"
                      : "选这位探险家"}
                  </button>
                  {canManage && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => {
                        setEditing(child.id);
                        setNickname(child.nickname);
                        setGrade(child.grade);
                        setError("");
                      }}
                    >
                      编辑昵称与年级
                    </button>
                  )}
                  {canManage && children.length > 1 && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `移除“${child.nickname}”及其全部学习记录？这个操作无法撤销。`,
                          )
                        )
                          return;
                        void action(async () => {
                          await api(`/children/${child.id}/remove`, {});
                          await loadChildren();
                          await refresh();
                          setNotice(
                            "档案已移除。你可以选择其他探险家继续学习。",
                          );
                        });
                      }}
                    >
                      移除档案
                    </button>
                  )}
                </article>
              ))}
            </div>
            {canManage && (
              <form onSubmit={saveChild} className="profile-form child-form">
                <h3>{editing ? "编辑探险档案" : "添加一位小探险家"}</h3>
                <p className="footnote">
                  用昵称就好，不需要孩子的真实姓名或生日。
                </p>
                <div className="profile-fields">
                  <label className="field">
                    昵称
                    <input
                      required
                      maxLength={24}
                      value={nickname}
                      disabled={busy}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="例如：小星星"
                    />
                  </label>
                  <label className="field">
                    年级
                    <select
                      value={grade}
                      disabled={busy}
                      onChange={(e) => setGrade(Number(e.target.value))}
                    >
                      {["一", "二", "三", "四", "五", "六"].map((n, i) => (
                        <option key={n} value={i + 1}>
                          {n}年级
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="profile-fields">
                  <button type="submit" className="primary" disabled={busy}>
                    {busy
                      ? "正在保存…"
                      : editing
                        ? "保存修改"
                        : "添加并开始学习"}
                  </button>
                  {editing && (
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => {
                        setEditing(null);
                        setNickname("");
                      }}
                    >
                      取消编辑
                    </button>
                  )}
                </div>
              </form>
            )}
          </section>
        )}
        <aside className="card parent-guide">
          <span className="eyebrow">给家长的一点小建议</span>
          <h2>
            少一点催促，
            <br />
            多一点“我也来试试”。
          </h2>
          <ol>
            <li>
              <strong>每天一小轮</strong>
              <p>先从5～10分钟开始，学完就休息，不用一直刷题。</p>
            </li>
            <li>
              <strong>先听，再开口</strong>
              <p>联系家里、学校、公园里的真实情景，让句子有用起来的机会。</p>
            </li>
            <li>
              <strong>错了也能长本领</strong>
              <p>问问孩子“你是怎么想的”，一起找规律，再隔几天回来看。</p>
            </li>
          </ol>
          <div className="notice">
            当前有{lessons.length}
            节原创微课，覆盖一至六年级；课程包含文字、听辨、阅读和部分分类修正互动。其余课程、完整听说读写与教材映射会按阶段更新。
          </div>
        </aside>
      </div>
      {identity.adult &&
        !identity.adult.mustChangePassword &&
        identity.child && (
          <Suspense fallback={<p role="status">正在准备学习报告…</p>}>
            <LearningReport
              key={`${identity.adult.username}:${identity.child.id}`}
              childId={identity.child.id}
              nickname={identity.child.nickname}
              onReview={onReview}
            />
          </Suspense>
        )}
      {identity.adult && !identity.adult.mustChangePassword && (
        <details className="card account-security">
          <summary>账号与密码 · {identity.adult.username}</summary>
          <AccountSecurity
            username={identity.adult.username}
            onChanged={async () => {
              await refresh();
              setNotice("密码已更新，所有设备已退出。请使用新密码重新登录。");
            }}
          />
        </details>
      )}
      {identity.adult?.isAdmin && !identity.adult.mustChangePassword && (
        <Suspense fallback={<p role="status">正在准备家庭账号管理…</p>}>
          <ManagedAccounts />
        </Suspense>
      )}
      {identity.adult && canManage && !identity.adult.mustChangePassword && (
        <details
          className="card ai-settings-disclosure"
          onToggle={(event) => setAiOpen(event.currentTarget.open)}
        >
          <summary>家长设置 · AI解释、角色对话与语音</summary>
          <Suspense fallback={<p role="status">正在准备AI连接设置…</p>}>
            {aiOpen && <AiSettings key={identity.adult.username} />}
          </Suspense>
        </details>
      )}
      {identity.adult &&
        !identity.adult.mustChangePassword &&
        identity.child && (
          <details className="card learning-report">
            <summary>最近十轮原始记录与累计完成</summary>
            <span className="eyebrow">每一步，都有迹可循</span>
            <h2>{identity.child.nickname}的学习足迹</h2>
            <p>
              已完成{learning.completedLessons.length}节微课，当前有
              {learning.dueCount}项记忆到了复习时间。
            </p>
            {learning.recent.length ? (
              <ul className="learning-records">
                {learning.recent.map((result) => (
                  <li key={result.sessionId}>
                    <div>
                      <strong>
                        {lessons.find((lesson) => lesson.id === result.lessonId)
                          ?.title ?? "专题或复习练习"}
                      </strong>
                      <p>
                        共{result.total}题，答对{result.correct}题，其中独立完成
                        {result.independent}题。
                      </p>
                    </div>
                    <time dateTime={new Date(result.completedAt).toISOString()}>
                      {new Date(result.completedAt).toLocaleDateString("zh-CN")}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="notice">
                完成一轮练习后，这里就会留下孩子的小进步。
              </p>
            )}
            <p className="footnote">
              提示、文字辅助或当天看过示范后的答对会单独记录；完成一课不代表已经完全掌握。
            </p>
          </details>
        )}
      {identity.adult &&
        !identity.adult.mustChangePassword &&
        identity.child && (
          <Suspense fallback={<p role="status">正在读取专题记录…</p>}>
            <TrainingFollowUps
              key={identity.child.id}
              childId={identity.child.id}
              all
              onOpen={onOpenTraining}
            />
          </Suspense>
        )}
      {identity.developmentIdentityAvailable && (
        <details className="dev-tools">
          <summary>本机开发测试档案</summary>
          <p>仅在本机开放，用于验证家庭之间的进度隔离。</p>
          <div className="profile-fields">
            {["a:1", "a:2", "b:1", "b:2"].map((value) => (
              <button
                className="secondary"
                disabled={busy}
                key={value}
                onClick={() =>
                  void action(async () => {
                    const [family, child] = value.split(":");
                    await api("/dev/session", { family, child: Number(child) });
                    await refresh();
                  })
                }
              >
                测试家庭{value.toUpperCase()}
              </button>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
