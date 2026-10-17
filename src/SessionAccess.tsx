import type { LearningSession } from "../packages/contracts/index";

export default function SessionAccess({
  session,
  stopped,
  busy,
  backup,
  onRefresh,
  onTakeover,
  onLeave,
  leaveLabel = "回到地图",
}: {
  session: LearningSession;
  stopped: boolean;
  busy: boolean;
  backup: string | null;
  onRefresh: () => void;
  onTakeover: () => void;
  onLeave: () => void;
  leaveLabel?: string;
}) {
  const waiting = session.access === "takeover-required";
  const ended = stopped || session.access === "ended";
  return (
    <>
      {(waiting || ended) && (
        <section
          className="session-access"
          aria-labelledby="session-access-title"
        >
          <div>
            <span className="badge">
              {ended ? "进度有变化" : "换一台设备，接着学"}
            </span>
            <h2 id="session-access-title">
              {ended ? "先看看最新进度" : "要在这台设备接着学吗？"}
            </h2>
            <p>
              {ended
                ? "这轮学习已结束或已切换。已经保存的记录还在，先刷新进度，或回地图选新任务。"
                : "已保存的题目、提示和作答记录会一起带过来。接过来后，另一台设备会暂停作答；未保存的输入不会自动传过来。"}
            </p>
          </div>
          <div className="session-access-actions">
            {waiting && !ended && (
              <button className="primary" disabled={busy} onClick={onTakeover}>
                {busy ? "正在接上进度…" : "在这台设备接着学"}
              </button>
            )}
            <button className="secondary" disabled={busy} onClick={onRefresh}>
              刷新进度
            </button>
            <button className="text-button" disabled={busy} onClick={onLeave}>
              {leaveLabel}
            </button>
          </div>
        </section>
      )}
      {backup && (
        <details className="draft-backup">
          <summary>上一步尚未保存的输入</summary>
          <p>
            草稿留在这一页，还没保存到学习记录。刷新或关掉这一页后，它就不在了。
          </p>
          <p className="draft-text" lang="en">
            {backup}
          </p>
        </details>
      )}
    </>
  );
}
