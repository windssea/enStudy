import { useEffect, useState } from "react";
import {
  irregularGroups,
  irregularPage,
  irregularVersion,
  type IrregularGroup,
  type IrregularScope,
} from "../packages/domain/irregularVerbs";
import { api } from "./api";
type Page = ReturnType<typeof irregularPage>;
export default function IrregularVerbGuide({
  childId,
  scope = "all",
}: {
  childId?: string;
  scope?: IrregularScope;
}) {
  const [group, setGroup] = useState<IrregularGroup>("all"),
    [page, setPage] = useState(0),
    [loaded, setData] = useState<(Page & { viewKey: string }) | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const viewKey = `${childId ?? "guest"}:${scope}:${group}:${page}:${revision}`;
  const data = loaded?.viewKey === viewKey ? loaded : null;
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    if (!childId) {
      setData({ ...irregularPage(group, page, scope), viewKey });
      return () => controller.abort();
    }
    void api<
      Page & {
        saved: boolean;
        version: number;
        childId: string;
        group: string;
        page: number;
        scope: string;
      }
    >(
      "/learning/irregular-verbs/view",
      { version: irregularVersion, group, page, scope },
      { signal: controller.signal },
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        if (
          !result.saved ||
          result.version !== irregularVersion ||
          result.childId !== childId ||
          result.group !== group ||
          result.page !== page ||
          result.scope !== scope
        )
          throw Error("词形表已变化，请重新打开。");
        setData({ ...result, viewKey });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "词形表暂时没有打开。");
      });
    return () => controller.abort();
  }, [childId, group, page, scope, revision]);
  return (
    <section className="card irregular-guide" aria-label="不规则动词三形对照">
      <header>
        <h2>不规则动词三形</h2>
        <label>
          按变形规律
          <select
            aria-label="按变形规律"
            value={group}
            onChange={(e) => {
              setGroup(e.target.value as IrregularGroup);
              setPage(0);
            }}
          >
            {Object.entries(irregularGroups).map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </header>
      {error ? (
        <p className="notice error" role="alert">
          {error}
          <button
            className="secondary"
            onClick={() => setRevision((n) => n + 1)}
          >
            重试
          </button>
        </p>
      ) : !data ? (
        <p role="status">正在打开词形表…</p>
      ) : (
        <>
          <div
            className="irregular-sentences"
            aria-label="肯定、否定与问句对照"
          >
            <p>
              <span>过去肯定</span>
              <strong lang="en">
                I <em>went</em> to the park yesterday.
              </strong>
            </p>
            <p>
              <span>过去否定</span>
              <strong lang="en">
                I didn't <em>go</em> to the park yesterday.
              </strong>
            </p>
            <p>
              <span>过去问句</span>
              <strong lang="en">
                Did you <em>go</em> to the park yesterday?
              </strong>
            </p>
          </div>
          <p>
            did / didn't 后用原形。be 动词另外变化：was / were，提问和否定不加
            did。
          </p>
          <table className="irregular-table">
            <caption>
              过去分词用于完成式等结构，作为拓展；它本身不是一种时态。
            </caption>
            <thead>
              <tr>
                <th scope="col">原形</th>
                <th scope="col">过去式</th>
                <th scope="col">过去分词</th>
                <th scope="col">词义</th>
              </tr>
            </thead>
            <tbody>
              {data.words.map((w) => (
                <tr key={w.base}>
                  <th scope="row" lang="en">
                    {w.base}
                  </th>
                  <td lang="en">{w.past}</td>
                  <td lang="en">{w.participle}</td>
                  <td>
                    <span className="irregular-meaning-label">词义 · </span>
                    {w.meaning}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.words
            .filter((w) => w.note)
            .map((w) => (
              <p className="irregular-word-note" key={w.base}>
                <strong lang="en">{w.base}</strong> · {w.note}
              </p>
            ))}
          <nav className="irregular-pages" aria-label="词形表翻页">
            <button
              className="secondary"
              disabled={page === 0}
              onClick={() => setPage((n) => n - 1)}
            >
              上一页
            </button>
            <span>
              {page + 1} / {data.pages} · {data.total}词
            </span>
            <button
              className="secondary"
              disabled={page + 1 >= data.pages}
              onClick={() => setPage((n) => n + 1)}
            >
              下一页
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
