import { useId, useState, type FormEvent } from "react";
import { api } from "./api";

export function SecretField({
  label,
  value,
  onChange,
  disabled,
  fresh = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  fresh?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      {label}
      <span className="password-field">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={fresh ? "new-password" : "current-password"}
          required
          minLength={fresh ? 12 : undefined}
          maxLength={fresh ? 128 : 256}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
        <button
          type="button"
          className="text-button"
          aria-label={`${visible ? "隐藏" : "显示"}${label}`}
          aria-controls={id}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible(!visible)}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </span>
    </label>
  );
}

export default function AccountSecurity({
  username,
  required = false,
  onChanged,
}: {
  username: string;
  required?: boolean;
  onChanged: () => Promise<void>;
}) {
  const [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (next !== repeat) {
      setError("两次填写的新密码不一样，请重新确认。");
      return;
    }
    setBusy(true);
    try {
      await api("/auth/password", {
        currentPassword: current,
        newPassword: next,
      });
      await onChanged();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "暂时没有保存成功，请重试。",
      );
    } finally {
      setCurrent("");
      setNext("");
      setRepeat("");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="profile-form account-password-form">
      <h3>{required ? "先设置你自己的密码" : "修改登录密码"}</h3>
      <p>
        {required
          ? "当前使用的是临时密码。设置完成后重新登录，就能添加孩子、保存学习进度。"
          : "修改后，所有设备都需要重新登录，孩子的学习记录会保留。"}
      </p>
      <p className="footnote">
        登录账号：{username} · 新密码12～128位，可以使用较长的短语。
      </p>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <SecretField
        label={required ? "当前临时密码" : "当前密码"}
        value={current}
        onChange={setCurrent}
        disabled={busy}
      />
      <div className="account-fields">
        <SecretField
          label="新密码"
          value={next}
          onChange={setNext}
          disabled={busy}
          fresh
        />
        <SecretField
          label="再填一次新密码"
          value={repeat}
          onChange={setRepeat}
          disabled={busy}
          fresh
        />
      </div>
      <button className="primary" disabled={busy} type="submit">
        {busy ? "正在保存…" : "更新密码并退出登录"}
      </button>
    </form>
  );
}
