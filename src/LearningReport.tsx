import { useEffect, useState } from "react";
import type {
  LearningReport as Report,
  ReportCounts,
} from "../packages/contracts/index";
import {
  interactionLabels,
  modalityLabels,
  sourceLabels,
} from "../packages/domain/report";
import { api, ApiError } from "./api";

const bucketLabels = {
  independent: "独立答对",
  assisted: "辅助后答对",
  incorrect: "还需再练",
  unscored: "未计分记录",
} as const;
const buckets = Object.keys(bucketLabels) as (keyof typeof bucketLabels)[];
const shortDay = (day: string) => day.slice(5).replace("-", "/");
function CountTable({
  rows,
  caption,
  label,
}: {
  rows: (ReportCounts & { name: string })[];
  caption: string;
  label: string;
}) {
  return (
    <div
      className="report-table-scroll"
      tabIndex={0}
      role="region"
      aria-label={`${caption}，窄屏可横向滚动`}
    >
      <table className="report-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{label}</th>
            <th scope="col">已保存</th>
            {buckets.map((key) => (
              <th scope="col" key={key}>
                {bucketLabels[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row">{row.name}</th>
              <td>{row.attempts}</td>
              {buckets.map((key) => (
                <td key={key}>{row[key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportBody({
  report,
  onReview,
}: {
  report: Report;
  onReview: () => void;
}) {
  const { totals, window, days, review } = report;
  const maximum = Math.max(1, ...days.map((day) => day.attempts));
  return (
    <>
      <p className="report-range">
        <time dateTime={window.from}>{window.from}</time> 至{" "}
        <time dateTime={window.through}>{window.through}</time> ·{" "}
        {window.timezone}
        {window.timezoneFallback && "（使用默认时区）"}
      </p>
      <div className="report-stat-grid">
        {[
          ["已保存作答", totals.attempts],
          ["独立答对", totals.independent],
          ["辅助后答对", totals.assisted],
          ["有记录的天数", `${totals.activeDays}/${window.days}`],
        ].map(([label, value]) => (
          <div className="report-stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p>
        这段时间完成了<strong>{totals.completedRounds}</strong>轮练习，涉及
        <strong>{totals.completedLessons}</strong>节微课；作答覆盖
        <strong>{totals.taskFamilies}</strong>组不同材料，其中
        <strong>{totals.independentTaskFamilies}</strong>组留下独立答对记录。
      </p>
      <p className="footnote">
        一题多次练习会留下多条作答；“不同材料”按题目家族去重，不等于掌握了同样数量的知识点。未完成的一轮也会计入已保存作答。
      </p>
      <section
        className="report-activity"
        aria-labelledby="report-activity-title"
      >
        <h3 id="report-activity-title">每天留下的小脚印</h3>
        {totals.attempts ? (
          <>
            <div className="report-legend">
              {buckets.map((key) => (
                <span key={key}>
                  <i className={`report-bucket-${key}`} aria-hidden="true" />
                  {bucketLabels[key]}
                </span>
              ))}
            </div>
            <div
              className="report-plot"
              role="img"
              aria-label={`近${window.days}天每天保存的作答数。最大一天${maximum}题，完整数字可展开下方每日记录。`}
            >
              {days.map((day) => (
                <div key={day.day} className="report-column" aria-hidden="true">
                  {buckets.map((key) => (
                    <span
                      key={key}
                      className={`report-bucket-${key}`}
                      style={{ height: `${(day[key] / maximum) * 100}%` }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="report-axis" aria-hidden="true">
              <span>{shortDay(window.from)}</span>
              <span>{shortDay(window.through)}</span>
            </div>
          </>
        ) : (
          <p className="notice">
            这段时间还没有保存的作答。和孩子完成一小轮后，再回来看看。
          </p>
        )}
        <details className="report-details">
          <summary>查看每天的完整数字</summary>
          <CountTable
            rows={days.map((day) => ({ ...day, name: day.day }))}
            caption="每日作答记录"
            label="日期"
          />
        </details>
      </section>
      <section className="report-next" aria-labelledby="report-next-title">
        <div>
          <h3 id="report-next-title">下一次，照顾哪些记忆？</h3>
          <p>
            现在有<strong>{review.dueNow}</strong>
            项记忆到了复习时间，未来7天还有
            <strong>{review.dueNext7Days}</strong>项将到期。
          </p>
          <p className="footnote">
            一项记忆对应一个知识点和一种练习能力，不等于一个单词或一道题。分成小轮练习，不需要一次做完。
          </p>
        </div>
        <button className="secondary" onClick={onReview}>
          去复习花园 <span aria-hidden="true">→</span>
        </button>
      </section>
      <section
        className="report-practice"
        aria-labelledby="report-practice-title"
      >
        <h3 id="report-practice-title">这些地方，可以再想一想</h3>
        <p className="footnote">
          按本期需要再练、辅助后答对的记录排列，最多列8项。这是练习依据，不是能力诊断或掌握排名。
        </p>
        {report.practice.length ? (
          <ul>
            {report.practice.map((row) => (
              <li key={`${row.skillId}:${row.modality}`}>
                <div>
                  <strong>{row.label}</strong>
                  <span>{modalityLabels[row.modality] ?? "其他练习能力"}</span>
                </div>
                <p>
                  还需再练{row.incorrect}次 · 辅助后答对{row.assisted}次 ·
                  独立答对{row.independent}次
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            本期没有这类记录。隔几天再用不同材料独立试试，才能观察记忆是否稳定。
          </p>
        )}
      </section>
      <details className="report-details">
        <summary>按学习入口和题型查看</summary>
        {report.sources.length ? (
          <>
            <CountTable
              rows={report.sources.map((row) => ({
                ...row,
                name: sourceLabels[row.source] ?? "其他学习入口",
              }))}
              caption="学习入口"
              label="入口"
            />
            <CountTable
              rows={report.interactions.map((row) => ({
                ...row,
                name: interactionLabels[row.type] ?? "其他题型",
              }))}
              caption="练习题型"
              label="题型"
            />
          </>
        ) : (
          <p>有保存的作答后，这里会显示各入口和题型的记录。</p>
        )}
      </details>
      <p className="footnote">
        独立答对以服务端保存的证据为准。提示、当天看过相同示范或文字辅助后的答对另列；早期已展示答案的基础课保守记为辅助。听音确认是孩子的使用记录，不是听力或发音认证；AI对话不计入这些题目成绩。报告不推算学习时长、排名或掌握率。
      </p>
      <p className="report-updated">
        更新于{" "}
        <time dateTime={new Date(window.generatedAt).toISOString()}>
          {new Intl.DateTimeFormat("zh-CN", {
            timeZone: window.timezone,
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          }).format(window.generatedAt)}
        </time>{" "}
        · 复习数量为读取时的即时状态
      </p>
    </>
  );
}

export default function LearningReport({
  childId,
  nickname,
  onReview,
}: {
  childId: string;
  nickname: string;
  onReview: () => void;
}) {
  const [days, setDays] = useState<7 | 30>(7),
    [revision, setRevision] = useState(0),
    [report, setReport] = useState<Report | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    let live = true;
    setLoading(true);
    setError("");
    setReport(null);
    api<Report>(
      `/family/children/${encodeURIComponent(childId)}/report?days=${days}`,
      undefined,
      { signal: abort.signal },
    )
      .then((value) => {
        if (!live) return;
        if (value.child.id !== childId || value.window.days !== days)
          throw Error("Report identity mismatch");
        setReport(value);
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof ApiError
              ? e.message
              : "报告暂时没加载好，请稍后重试。",
          );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      abort.abort();
    };
  }, [childId, days, revision]);
  const current =
    report?.child.id === childId && report.window.days === days ? report : null;
  return (
    <section
      className="card family-report"
      aria-labelledby="family-report-title"
      aria-busy={loading}
    >
      <div className="report-heading">
        <div>
          <p className="eyebrow">看见过程，也留一点耐心</p>
          <h2 id="family-report-title">{nickname}的学习报告</h2>
        </div>
        <div className="report-period" role="group" aria-label="报告时间范围">
          {([7, 30] as const).map((value) => (
            <button
              className="secondary"
              key={value}
              aria-pressed={days === value}
              onClick={() => setDays(value)}
            >
              近{value}天
            </button>
          ))}
        </div>
      </div>
      {loading && <p role="status">正在整理已保存的学习足迹…</p>}
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button
            className="text-button"
            onClick={() => setRevision((n) => n + 1)}
          >
            重新读取
          </button>
        </div>
      )}
      {!loading && current && (
        <ReportBody report={current} onReview={onReview} />
      )}
      {!loading && !error && (
        <button
          className="text-button"
          onClick={() => setRevision((n) => n + 1)}
        >
          更新报告
        </button>
      )}
    </section>
  );
}
