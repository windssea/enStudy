import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "./api";
import { SecretField } from "./AccountSecurity";
import {
  householdRoleLabel,
  type HouseholdAccess as Access,
  type HouseholdRole,
  type InvitePreview,
} from "../packages/domain/households";
type Review = {
  id: string;
  username: string;
  operation: "change_role" | "remove_member" | "leave" | "revoke_invite";
  role?: HouseholdRole;
};
export default function HouseholdAccess({
  refresh,
}: {
  refresh: () => Promise<void>;
}) {
  const [opened, setOpened] = useState(false),
    [data, setData] = useState<Access | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [destination, setDestination] = useState(""),
    [username, setUsername] = useState(""),
    [role, setRole] = useState<HouseholdRole>("guardian"),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [share, setShare] = useState<{
      token: string;
      expiresAt: number;
      recipient: string;
      role: HouseholdRole;
    } | null>(null),
    [preview, setPreview] = useState<InvitePreview | null>(null),
    [review, setReview] = useState<Review | null>(null);
  const request = useRef<AbortController | null>(null),
    live = useRef(true),
    createId = useRef(crypto.randomUUID()),
    acceptId = useRef(crypto.randomUUID());
  const reviewPanel = useRef<HTMLFormElement>(null),
    previewPanel = useRef<HTMLFormElement>(null),
    returnFocus = useRef<HTMLElement | null>(null),
    hadPanel = useRef(false);
  const titleId = useId();
  useEffect(() => {
    if (review) setPreview(null);
  }, [review]);
  useEffect(() => {
    const panel = review
      ? reviewPanel.current
      : preview
        ? previewPanel.current
        : null;
    if (panel) {
      if (!hadPanel.current)
        returnFocus.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      hadPanel.current = true;
      panel.focus();
    } else if (hadPanel.current) {
      hadPanel.current = false;
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
    }
  }, [review, preview]);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      request.current?.abort();
    };
  }, []);
  async function load(signal?: AbortSignal) {
    const next = await api<Access>("/households/current", undefined, {
      signal,
    });
    if (live.current && !signal?.aborted) {
      setData(next);
      setDestination(next.current?.id ?? next.households[0]?.id ?? "");
    }
    return next;
  }
  useEffect(() => {
    if (!opened) {
      setData(null);
      setShare(null);
      setPreview(null);
      setCode("");
      setPassword("");
      setReview(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void load(controller.signal)
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "暂时没读到家庭列表。");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      request.current?.abort();
    };
  }, [opened]);
  async function action(
    fn: (signal: AbortSignal) => Promise<void>,
    maySwitch = false,
  ) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn(controller.signal);
    } catch (e) {
      if (controller.signal.aborted || !live.current) return;
      setError(
        e instanceof Error ? e.message : "操作暂时没确认，请刷新后核对。",
      );
      if (
        maySwitch ||
        (e instanceof ApiError &&
          (e.code === "HOUSEHOLD_CONTEXT_CHANGED" || e.status === 401))
      )
        await refresh().catch(() => {});
      else {
        if (e instanceof ApiError && e.code === "HOUSEHOLD_CHANGED") {
          setReview(null);
          setPreview(null);
        }
        await load(controller.signal).catch(() => {});
      }
    } finally {
      if (live.current) {
        setBusy(false);
        setPassword("");
      }
      if (request.current === controller) request.current = null;
    }
  }
  const owner = data?.current?.role === "owner";
  const owners =
    data?.members.filter(
      (m) => m.role === "owner" && !m.disabled && !m.needsPasswordChange,
    ).length ?? 0;
  function invite(event: FormEvent) {
    event.preventDefault();
    if (!data) return;
    setShare(null);
    void action(async (signal) => {
      const saved = await api<{ token: string; expiresAt: number }>(
        "/households/invitations",
        {
          username: username.trim().toLowerCase(),
          role,
          currentPassword: password,
          expectedVersion: data.version,
          requestId: createId.current,
        },
        { signal },
      );
      if (signal.aborted || !live.current) return;
      setShare({ ...saved, recipient: username.trim().toLowerCase(), role });
      setUsername("");
      createId.current = crypto.randomUUID();
      setNotice(
        "邀请已创建，请自行把邀请码交给这位家长；这里不会自动发送消息。",
      );
      await load(signal);
    });
  }
  function inspect(event: FormEvent) {
    event.preventDefault();
    void action(async (signal) => {
      const found = await api<InvitePreview>(
        "/households/invitations/preview",
        { token: code.trim().toLowerCase() },
        { signal },
      );
      if (!signal.aborted && live.current) {
        setPreview(found);
        setReview(null);
        acceptId.current = crypto.randomUUID();
      }
    });
  }
  function accept(event: FormEvent) {
    event.preventDefault();
    if (!preview) return;
    void action(async (signal) => {
      await api(
        "/households/invitations/accept",
        {
          token: code.trim().toLowerCase(),
          expectedVersion: preview.version,
          requestId: acceptId.current,
          currentPassword: password,
        },
        { signal },
      );
      if (signal.aborted || !live.current) return;
      setPreview(null);
      setCode("");
      setNotice(
        "已加入。原家庭和学习记录保留，请在家庭列表中主动选择要进入的家庭。",
      );
      await load(signal);
    });
  }
  function confirm(event: FormEvent) {
    event.preventDefault();
    if (!review || !data) return;
    void action(async (signal) => {
      const result = await api<{ signedOut?: boolean }>(
        review.operation === "revoke_invite"
          ? `/households/invitations/${review.id}/revoke`
          : `/households/members/${review.id}`,
        {
          operation: review.operation,
          role: review.role,
          currentPassword: password,
          expectedVersion: data.version,
        },
        { signal },
      );
      if (signal.aborted || !live.current) return;
      if (result.signedOut) {
        await refresh();
        return;
      }
      setReview(null);
      setNotice(
        review.operation === "revoke_invite"
          ? "邀请已撤销，旧邀请码不再可用。"
          : "权限已更新，对方需要重新登录。家庭中的儿童学习记录保留。",
      );
      await load(signal);
    });
  }
  return (
    <details
      className="card household-access"
      onToggle={(e) => setOpened(e.currentTarget.open)}
    >
      <summary>
        <strong>家庭与共同陪伴</strong>
        <span>切换家庭 · 邀请家长 · 管理权限</span>
      </summary>
      {opened && (
        <div className="household-access-body">
          <p>
            每位家长使用自己的账号。加入另一个家庭会增加访问权限，原家庭与学习记录仍各自保留。
          </p>
          {loading && <p role="status">正在读取家庭权限…</p>}
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="notice success">
              {notice}
            </p>
          )}
          <button
            type="button"
            className="text-button"
            disabled={busy || loading}
            onClick={() =>
              void action(async (signal) => {
                await refresh();
                await load(signal);
              })
            }
          >
            刷新家庭状态
          </button>
          {data && !data.sharingEnabled && (
            <p className="notice" role="status">
              共同陪伴正在准备。当前家庭的学习与档案照常使用，稍后刷新页面查看。
            </p>
          )}
          {data && data.sharingEnabled && (
            <>
              <section aria-label="当前家庭">
                <span className="badge">
                  现在是{householdRoleLabel(data.current?.role)}
                </span>
                <h3>{data.current?.name ?? "尚未选择家庭"}</h3>
                <p>
                  {!data.current
                    ? "先选择已加入的家庭，或在下方核对收到的邀请码。"
                    : owner
                      ? "可管理成员、探险档案和家庭AI设置。"
                      : "可选择探险档案、陪伴学习并查看报告；档案和AI设置由管理家长维护。"}
                </p>
                <form
                  className="profile-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(async (signal) => {
                      await api(
                        "/households/switch",
                        {
                          householdId: destination,
                          expectedContextVersion: data.contextVersion,
                          requestId: crypto.randomUUID(),
                        },
                        { signal },
                      );
                      if (!signal.aborted) await refresh();
                    }, true);
                  }}
                >
                  <label className="field">
                    选择要进入的家庭
                    <select
                      value={destination}
                      disabled={busy || !data.households.length}
                      onChange={(e) => setDestination(e.target.value)}
                    >
                      {!data.households.length && (
                        <option value="">尚未加入家庭</option>
                      )}
                      {data.households.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} · {householdRoleLabel(h.role)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="footnote">
                    切换会结束本设备当前的儿童授权。已保存的题目与进度保留，进入后请重新选择探险档案。
                  </p>
                  <button
                    className="secondary"
                    disabled={
                      busy || !destination || destination === data.current?.id
                    }
                  >
                    切换到所选家庭
                  </button>
                </form>
              </section>
              <section aria-label="家庭成员">
                <h3>一起陪伴的家长</h3>
                <ul className="household-members">
                  {data.members.map((m) => {
                    const protectedAdmin =
                      data.current?.id === "admin-household" &&
                      m.id === "admin-adult";
                    const lastOwner =
                      m.role === "owner" &&
                      !m.disabled &&
                      !m.needsPasswordChange &&
                      owners <= 1;
                    return (
                      <li key={m.id}>
                        <div>
                          <strong>
                            {m.username}
                            {m.self ? "（我）" : ""}
                          </strong>
                          <p>
                            {householdRoleLabel(m.role)}
                            {m.disabled
                              ? " · 账号已停用"
                              : m.needsPasswordChange
                                ? " · 需先修改临时密码"
                                : ""}
                          </p>
                        </div>
                        {owner && !protectedAdmin && (
                          <div className="household-actions">
                            <button
                              type="button"
                              className="text-button"
                              disabled={busy || lastOwner}
                              onClick={() => {
                                setReview({
                                  id: m.id,
                                  username: m.username,
                                  operation: "change_role",
                                  role:
                                    m.role === "owner" ? "guardian" : "owner",
                                });
                                setPassword("");
                              }}
                            >
                              设为
                              {householdRoleLabel(
                                m.role === "owner" ? "guardian" : "owner",
                              )}
                            </button>
                            {!m.self && (
                              <button
                                type="button"
                                className="text-button"
                                disabled={busy || lastOwner}
                                onClick={() => {
                                  setReview({
                                    id: m.id,
                                    username: m.username,
                                    operation: "remove_member",
                                  });
                                  setPassword("");
                                }}
                              >
                                移出家庭
                              </button>
                            )}
                          </div>
                        )}
                        {m.self && !protectedAdmin && (
                          <button
                            type="button"
                            className="text-button"
                            disabled={busy || lastOwner}
                            onClick={() => {
                              setReview({
                                id: m.id,
                                username: m.username,
                                operation: "leave",
                              });
                              setPassword("");
                            }}
                          >
                            退出这个家庭
                          </button>
                        )}
                        {m.self && lastOwner && !protectedAdmin && (
                          <p className="footnote">
                            退出或降级前，需要先指定另一位可用的管理家长。
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
              {owner && (
                <section>
                  <h3>邀请已有账号</h3>
                  <p>
                    公开注册仍关闭。对方需要先取得管理员提供的账号，并修改临时密码。
                  </p>
                  <form className="profile-form" onSubmit={invite}>
                    <label className="field">
                      对方的家长账号
                      <input
                        required
                        maxLength={40}
                        autoComplete="off"
                        value={username}
                        disabled={busy}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          createId.current = crypto.randomUUID();
                        }}
                      />
                    </label>
                    <fieldset disabled={busy}>
                      <legend>加入后的权限</legend>
                      {(["guardian", "owner"] as const).map((value) => (
                        <label className="household-role" key={value}>
                          <input
                            type="radio"
                            name="invite-role"
                            checked={role === value}
                            onChange={() => {
                              setRole(value);
                              createId.current = crypto.randomUUID();
                            }}
                          />
                          <span>
                            <strong>{householdRoleLabel(value)}</strong>
                            <small>
                              {value === "guardian"
                                ? "陪伴学习、选择孩子和查看报告"
                                : "还可管理成员、儿童档案与AI连接及预算"}
                            </small>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                    <SecretField
                      label="用我的当前密码确认邀请"
                      value={password}
                      onChange={setPassword}
                      disabled={busy}
                    />
                    <button
                      className="secondary"
                      disabled={
                        busy ||
                        data.members.length >= 6 ||
                        data.invitations.length >= 6
                      }
                    >
                      {busy ? "正在确认…" : "创建24小时邀请码"}
                    </button>
                    <p className="footnote">
                      每个家庭最多6位家长、同时最多6个待接受邀请；每个账号最多加入6个家庭。
                    </p>
                  </form>
                  {share && (
                    <div className="notice household-share">
                      <label className="field">
                        给{share.recipient}的{householdRoleLabel(share.role)}
                        邀请码（只在本次创建后显示）
                        <textarea
                          readOnly
                          rows={3}
                          value={share.token}
                          onFocus={(e) => e.currentTarget.select()}
                        />
                      </label>
                      <p>
                        有效期至
                        {new Date(share.expiresAt).toLocaleString("zh-CN")}
                        。仅指定账号可用，关闭面板后不再显示。
                      </p>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          if (!navigator.clipboard) {
                            setNotice("请选中上方邀请码手动复制。");
                            return;
                          }
                          void navigator.clipboard
                            .writeText(share.token)
                            .then(() =>
                              setNotice("邀请码已复制，请自行交给指定家长。"),
                            )
                            .catch(() =>
                              setNotice("请选中上方邀请码手动复制。"),
                            );
                        }}
                      >
                        复制邀请码
                      </button>
                    </div>
                  )}
                  <h4>尚未接受的邀请</h4>
                  {data.invitations.length ? (
                    <ul className="household-members">
                      {data.invitations.map((i) => (
                        <li key={i.id}>
                          <div>
                            <strong>{i.username}</strong>
                            <p>
                              {householdRoleLabel(i.role)} ·{" "}
                              {new Date(i.expiresAt).toLocaleString("zh-CN")}
                              到期
                            </p>
                          </div>
                          <button
                            type="button"
                            className="text-button"
                            disabled={busy}
                            onClick={() => {
                              setReview({
                                id: i.id,
                                username: i.username,
                                operation: "revoke_invite",
                              });
                              setPassword("");
                            }}
                          >
                            撤销邀请
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="footnote">目前没有待接受的邀请。</p>
                  )}
                </section>
              )}
              {review && (
                <form
                  className="household-confirm profile-form"
                  ref={reviewPanel}
                  tabIndex={-1}
                  aria-labelledby={`${titleId}-review`}
                  onSubmit={confirm}
                >
                  <h3 id={`${titleId}-review`}>
                    确认
                    {review.operation === "revoke_invite"
                      ? "撤销邀请"
                      : review.operation === "leave"
                        ? "退出家庭"
                        : review.operation === "remove_member"
                          ? "移除访问权限"
                          : "调整成员权限"}
                  </h3>
                  <p>
                    账号：{review.username}
                    {review.role
                      ? `，将设为${householdRoleLabel(review.role)}`
                      : ""}
                    。
                  </p>
                  <p>
                    {review.operation === "revoke_invite"
                      ? "尚未接受的邀请码会立即失效。"
                      : "该账号的所有设备会退出，重新登录后以新权限访问。此操作不会删除家庭里的儿童学习记录。"}
                  </p>
                  <SecretField
                    label="我的当前密码"
                    value={password}
                    onChange={setPassword}
                    disabled={busy}
                  />
                  <div className="profile-fields">
                    <button className="secondary" disabled={busy}>
                      {busy ? "正在确认…" : "确认这项操作"}
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => {
                        setReview(null);
                        setPassword("");
                      }}
                    >
                      取消
                    </button>
                  </div>
                </form>
              )}
              <section>
                <h3>我收到的邀请码</h3>
                <form className="profile-form" onSubmit={inspect}>
                  <label className="field">
                    粘贴邀请码
                    <textarea
                      required
                      autoComplete="off"
                      spellCheck={false}
                      rows={3}
                      maxLength={160}
                      value={code}
                      disabled={busy}
                      onChange={(e) => {
                        setCode(e.target.value);
                        setPreview(null);
                      }}
                    />
                  </label>
                  <button
                    className="secondary"
                    disabled={busy || code.trim().length !== 64}
                  >
                    先核对家庭与权限
                  </button>
                </form>
                {preview && (
                  <form
                    className="household-confirm profile-form"
                    ref={previewPanel}
                    tabIndex={-1}
                    aria-labelledby={`${titleId}-preview`}
                    onSubmit={accept}
                  >
                    <h4 id={`${titleId}-preview`}>
                      将加入：{preview.householdName}
                    </h4>
                    <p>邀请账号：{preview.invitedBy}</p>
                    <p>
                      权限：{householdRoleLabel(preview.role)}。
                      {preview.role === "owner"
                        ? "包含成员、档案和AI连接及预算管理。"
                        : "可陪伴学习、选择档案并查看报告。"}
                    </p>
                    <p>
                      原家庭与记录保留，不会自动切换。邀请码到期：
                      {new Date(preview.expiresAt).toLocaleString("zh-CN")}。
                    </p>
                    <SecretField
                      label="用我的当前密码确认加入"
                      value={password}
                      onChange={setPassword}
                      disabled={busy}
                    />
                    {data.households.length >= 6 && (
                      <p className="notice">
                        此账号已加入6个家庭，请先退出不再需要访问的家庭。
                      </p>
                    )}
                    <button
                      className="secondary"
                      disabled={busy || data.households.length >= 6}
                    >
                      确认加入这个家庭
                    </button>
                  </form>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </details>
  );
}
