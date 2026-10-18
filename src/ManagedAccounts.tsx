import { useEffect, useId, useState, type FormEvent } from "react";
import type { ManagedAccount } from "../packages/contracts/index";
import { api, ApiError } from "./api";
import { SecretField } from "./AccountSecurity";

type Operation = "disable" | "enable" | "reset_password";
const actions: Record<Operation, string> = {
  disable: "停用账号",
  enable: "恢复账号",
  reset_password: "重设临时密码",
};
export default function ManagedAccounts() {
  const titleId = useId();
  const [items, setItems] = useState<ManagedAccount[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [loadError, setLoadError] = useState(""),
    [notice, setNotice] = useState(""),
    [reload, setReload] = useState(0);
  const [username, setUsername] = useState(""),
    [householdName, setHouseholdName] = useState("");
  const [temporary, setTemporary] = useState(""),
    [current, setCurrent] = useState("");
  const [selection, setSelection] = useState<{
    account: ManagedAccount;
    operation: Operation;
  } | null>(null);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setLoadError("");
    api<{ items: ManagedAccount[]; cursor: string | null }>(
      `/admin/accounts${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    )
      .then((data) => {
        if (live) {
          setItems(data.items);
          setNextCursor(data.cursor);
        }
      })
      .catch((error) => {
        if (live) {
          setItems([]);
          setNextCursor(null);
          setLoadError(error.message);
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [cursor, reload]);
  function clearSecrets() {
    setTemporary("");
    setCurrent("");
    setError("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (selection) {
        await api(
          `/admin/accounts/${encodeURIComponent(selection.account.id)}`,
          {
            operation: selection.operation,
            version: selection.account.version,
            temporaryPassword: temporary,
            currentPassword: current,
          },
        );
        setNotice(
          `${selection.account.username}：${actions[selection.operation]}已完成。原有登录均已退出，学习记录保留。`,
        );
      } else {
        const result = await api<{ username: string }>("/admin/accounts", {
          username,
          householdName,
          temporaryPassword: temporary,
          currentPassword: current,
        });
        setNotice(
          `已创建账号 ${result.username}。请通过你信任的方式单独交给家长；首次登录需要修改临时密码。`,
        );
        setUsername("");
        setHouseholdName("");
        setCursor(null);
      }
      setSelection(null);
      setReload((n) => n + 1);
    } catch (error) {
      if (error instanceof ApiError && error.code === "ACCOUNT_CHANGED")
        setSelection(null);
      setError(error instanceof Error ? error.message : "暂时没有保存成功。");
      setReload((n) => n + 1);
    } finally {
      setTemporary("");
      setCurrent("");
      setBusy(false);
    }
  }
  return (
    <section className="card managed-accounts" aria-labelledby={titleId}>
      <div className="family-heading">
        <div>
          <span className="eyebrow">由管理员邀请，家庭独立学习</span>
          <h2 id={titleId}>家庭账号管理</h2>
          <p>
            公开注册保持关闭。这里只管理账号和状态，不查看其他家庭的学习明细。
          </p>
        </div>
        <span className="badge">仅站点管理员可用</span>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {loadError && (
        <div className="notice error" role="alert">
          {loadError}
          <button
            className="text-button"
            disabled={loading || busy}
            onClick={() => setReload((n) => n + 1)}
          >
            重试列表
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">正在读取家庭账号…</p>
      ) : (
        <ul className="managed-account-list" aria-label="家庭账号列表">
          {items.map((account) => (
            <li key={account.id}>
              <div>
                <strong>{account.username}</strong>
                <p>
                  {account.householdCount === 0
                    ? "尚未加入家庭"
                    : account.householdName}
                  {(account.householdCount ?? 1) > 1
                    ? `等${account.householdCount}个家庭`
                    : ""}
                  {" · "}
                  {account.childCount}位可访问的探险家
                </p>
                <span className="account-state">
                  {account.isAdmin
                    ? "站点管理员"
                    : account.disabled
                      ? "已停用"
                      : account.mustChangePassword
                        ? "待家长修改临时密码"
                        : "可登录"}
                </span>
              </div>
              {!account.isAdmin && (
                <div className="account-row-actions">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => {
                      clearSecrets();
                      setSelection({
                        account,
                        operation: account.disabled ? "enable" : "disable",
                      });
                    }}
                  >
                    {account.disabled ? "恢复" : "停用"}
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => {
                      clearSecrets();
                      setSelection({ account, operation: "reset_password" });
                    }}
                  >
                    重设密码
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="account-pagination">
        <span>每页最多50个账号</span>
        {cursor && (
          <button
            className="secondary"
            disabled={loading || busy}
            onClick={() => {
              clearSecrets();
              setSelection(null);
              setCursor(null);
            }}
          >
            回到首页
          </button>
        )}
        {nextCursor && (
          <button
            className="secondary"
            disabled={loading || busy}
            onClick={() => {
              clearSecrets();
              setSelection(null);
              setCursor(nextCursor);
            }}
          >
            下一页
          </button>
        )}
      </div>
      <form className="profile-form account-admin-form" onSubmit={submit}>
        <div className="family-heading">
          <h3>
            {selection
              ? `${actions[selection.operation]}：${selection.account.username}`
              : "创建一个家庭账号"}
          </h3>
          {selection && (
            <button
              className="text-button"
              type="button"
              disabled={busy}
              onClick={() => {
                clearSecrets();
                setSelection(null);
              }}
            >
              取消操作
            </button>
          )}
        </div>
        {selection ? (
          <p>
            {selection.operation === "disable"
              ? "此账号在全部家庭的设备会退出并暂时不能登录。其他家长仍可使用自己的账号，儿童学习记录保留，之后可恢复此账号。"
              : selection.operation === "enable"
                ? "恢复后家长需要重新登录；临时密码仍需由家长修改。"
                : "设置新的临时密码，退出此账号的所有设备。家长下次登录时必须先修改密码。"}
          </p>
        ) : (
          <div className="account-fields">
            <label className="field">
              登录账号
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                required
                minLength={3}
                maxLength={40}
                pattern="[A-Za-z][A-Za-z0-9_.\-]{2,39}"
                disabled={busy}
                placeholder="例如：family.lin"
              />
            </label>
            <label className="field">
              家庭名称
              <input
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                required
                maxLength={40}
                disabled={busy}
                placeholder="用便于识别的昵称即可"
              />
            </label>
          </div>
        )}
        {(!selection || selection.operation === "reset_password") && (
          <SecretField
            label="交给家长的临时密码（12～128位）"
            value={temporary}
            onChange={setTemporary}
            disabled={busy}
            fresh
          />
        )}
        <SecretField
          label="当前管理员密码（验证本次操作）"
          value={current}
          onChange={setCurrent}
          disabled={busy}
        />
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <button className="primary" disabled={busy} type="submit">
          {busy
            ? "正在保存…"
            : selection
              ? `确认${actions[selection.operation]}`
              : "创建家庭账号"}
        </button>
        <p className="footnote">
          账号不需要邮箱、手机号或儿童实名。密码不会在列表中显示或回显；忘记密码由管理员重设。
        </p>
      </form>
    </section>
  );
}
