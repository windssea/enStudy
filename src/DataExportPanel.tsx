import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "./api";
import { SecretField } from "./AccountSecurity";
import {
  exportSections,
  type ExportJob,
  type ExportManifest,
} from "../packages/contracts/dataExport";
import {
  exportExclusions,
  exportVolumes,
  validExportManifest,
} from "../packages/domain/dataExport";
import { handToBrowser, prepareExportVolume } from "./dataExportDownload";
export default function DataExportPanel({
  householdId,
  householdName,
  username,
}: {
  householdId: string;
  householdName: string;
  username: string;
}) {
  const [jobs, setJobs] = useState<ExportJob[]>([]),
    [listed, setListed] = useState(false),
    [manifest, setManifest] = useState<ExportManifest | null>(null),
    [password, setPassword] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const life = useRef(false),
    epoch = useRef(0),
    working = useRef(false),
    request = useRef<AbortController | null>(null),
    pending = useRef<string | null>(null);
  const active = (n: number) => life.current && epoch.current === n;
  async function execute(fn: (n: number, c: AbortController) => Promise<void>) {
    if (working.current) return;
    working.current = true;
    const n = ++epoch.current,
      c = new AbortController();
    request.current = c;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn(n, c);
    } catch (e) {
      if (active(n))
        setError(
          e instanceof Error
            ? e.message
            : "暂时没有确认完成，请刷新数据包列表。",
        );
    } finally {
      if (active(n)) {
        working.current = false;
        setBusy(false);
        setPassword("");
        request.current = null;
      }
    }
  }
  async function load(n: number, c: AbortController) {
    const r = await api<{ items: ExportJob[] }>(
      "/family/exports/list",
      undefined,
      { signal: c.signal },
    );
    if (active(n)) {
      setJobs(r.items);
      setManifest(null);
      setListed(true);
    }
  }
  useEffect(() => {
    life.current = true;
    working.current = false;
    void execute(load);
    return () => {
      life.current = false;
      epoch.current++;
      working.current = false;
      request.current?.abort();
    };
  }, [householdId]);
  function cancel() {
    request.current?.abort();
    epoch.current++;
    working.current = false;
    setBusy(false);
    setPassword("");
    setNotice(
      "已停止本页等待。若刚才正在生成数据包，请刷新列表核对；下载准备停止后，本次文件不会交给浏览器。",
    );
  }
  async function readManifest(id: string, n: number, c: AbortController) {
    const m = await api<ExportManifest>(`/family/exports/${id}`, undefined, {
      signal: c.signal,
    });
    if (!validExportManifest(m))
      throw Error("收到的数据包目录不完整，请重新读取。");
    if (active(n)) setManifest(m);
    return m;
  }
  function create(e: FormEvent) {
    e.preventDefault();
    if (!confirmed) return;
    void execute(async (n, c) => {
      pending.current ??= crypto.randomUUID();
      setNotice("正在生成这一刻的家庭资料快照…");
      try {
        const r = await api<{ job: ExportJob }>(
          "/family/exports/create",
          {
            requestId: pending.current,
            householdId,
            currentPassword: password,
            confirmed: true,
          },
          { signal: c.signal, timeoutMs: 30000 },
        );
        if (!active(n)) return;
        pending.current = null;
        setJobs([r.job]);
        await readManifest(r.job.id, n, c);
        if (active(n))
          setNotice(
            "数据包已确认生成。请在到期前下载各卷，并核对浏览器保存的文件。",
          );
      } catch (e) {
        if (
          e instanceof ApiError &&
          ["EXPORT_REMOVED", "IDEMPOTENCY_MISMATCH"].includes(e.code)
        )
          pending.current = null;
        throw e;
      }
    });
  }
  function download(volume: number) {
    if (!manifest) return;
    const m = manifest,
      volumes = exportVolumes(m.parts);
    void execute(async (n, c) => {
      setNotice(`正在准备第${volume + 1}/${volumes.length}卷…`);
      const blob = await prepareExportVolume(
        m,
        volumes[volume],
        volume + 1,
        volumes.length,
        (path) => api(path, undefined, { signal: c.signal }),
        (done, total) => {
          if (active(n))
            setNotice(`第${volume + 1}卷：已核对${done}/${total}份数据…`);
        },
        () => active(n) && !c.signal.aborted,
      );
      if (!active(n)) return;
      handToBrowser(
        blob,
        `english-quest-${m.job.id}-volume-${volume + 1}.jsonl`,
      );
      setNotice(
        `第${volume + 1}卷已交给浏览器下载，请确认文件已保存。${volumes.length > 1 ? "其余卷也需要分别下载。" : ""}`,
      );
    });
  }
  function remove(id: string) {
    void execute(async (n, c) => {
      await api(`/family/exports/${id}/remove`, {}, { signal: c.signal });
      if (active(n)) {
        setJobs([]);
        setManifest(null);
        pending.current = null;
        setNotice("服务端下载包已移除，原学习记录和作品没有修改。");
      }
    });
  }
  return (
    <div className="data-export-panel">
      <header>
        <span className="badge">管理家长 · 私有资料</span>
        <h2>把孩子的学习足迹留一份</h2>
        <p>
          当前家庭：<strong>{householdName}</strong> · 当前账号：{username}
        </p>
      </header>
      <p>
        导出本家庭所有儿童的已保存资料，包括学习记录、复习状态、写作作品和相关设置。生成后得到固定快照；之后新增或修改的资料不会混入这个包。
      </p>
      <details className="export-scope">
        <summary>查看包含与排除的资料</summary>
        <p>
          包含{exportSections.length}类资料：
          {exportSections.map(([, label]) => label).join("、")}。
        </p>
        <p>不包含：{exportExclusions.join("、")}。</p>
      </details>
      <p className="footnote">
        数据包仅当前登录可下载，10分钟后不可读取。删除儿童或作品、退出登录、切换家庭或权限变化会使旧包失效。下载到本机的文件需要你自行保管和删除。
      </p>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="export-actions">
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void execute(load)}
        >
          刷新数据包列表
        </button>
        {busy && (
          <button className="secondary" onClick={cancel}>
            停止等待 / 下载准备
          </button>
        )}
      </div>
      {jobs.length === 0 ? (
        <form className="profile-form export-create" onSubmit={create}>
          <h3>生成当前家庭的数据包</h3>
          <label className="export-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={busy}
              required
            />
            <span>我已核对家庭，希望导出本家庭所有儿童的资料。</span>
          </label>
          <SecretField
            label="重新验证当前家长密码"
            value={password}
            onChange={setPassword}
            disabled={busy}
          />
          <button className="primary" disabled={busy || !confirmed || !listed}>
            {busy ? "正在确认…" : "验证并生成私有数据包"}
          </button>
          <p className="footnote">
            如果等待中断，先刷新列表核对。未确认结果前，重试会沿用同一请求编号。
          </p>
        </form>
      ) : (
        <section className="export-ready" aria-label="当前登录的数据包">
          {jobs.map((j) => (
            <div key={j.id} className="export-job">
              <div>
                <h3>已生成的资料快照</h3>
                <p>
                  生成于{new Date(j.createdAt).toLocaleString("zh-CN")}
                  <br />
                  到期于{new Date(j.expiresAt).toLocaleString("zh-CN")}
                </p>
                <p>{j.rows}条资料记录（含设置和展示版本，不等于答题次数）。</p>
              </div>
              <div className="export-actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void execute(async (n, c) => {
                      await readManifest(j.id, n, c);
                    })
                  }
                >
                  读取下载目录
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => remove(j.id)}
                >
                  移除这个下载包
                </button>
              </div>
            </div>
          ))}
          {manifest && (
            <div className="export-downloads">
              <h3>下载资料</h3>
              <p>
                为控制平板内存，较大的包按约8MB正文分卷。请下载全部
                {exportVolumes(manifest.parts).length}
                卷；每卷都含目录和范围说明。
              </p>
              <div className="export-volumes">
                {exportVolumes(manifest.parts).map((parts, i) => (
                  <button
                    className="primary"
                    disabled={busy}
                    key={i}
                    onClick={() => download(i)}
                  >
                    下载第{i + 1}卷 · {parts.reduce((n, p) => n + p.rows, 0)}
                    条资料
                  </button>
                ))}
              </div>
              <details>
                <summary>核对各类资料数量</summary>
                <dl>
                  {manifest.sections.map((s) => (
                    <div key={s.id}>
                      <dt>{s.label}</dt>
                      <dd>{s.rows}条</dd>
                    </div>
                  ))}
                </dl>
              </details>
              <p className="footnote">
                保存为JSONL资料文件，供个人留存或后续整理；当前不支持一键导入恢复。浏览器交付下载不等于已经写入你的磁盘。
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
