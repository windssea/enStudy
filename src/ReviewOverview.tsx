import type { Progress } from "../packages/contracts/index";
import { modalityLabels } from "../packages/domain/report";
import { reviewDueLabel } from "./reviewPresentation";
import LearningIcon from "./LearningIcon";

export default function ReviewOverview({
  progress,
  dueCount,
  ready,
  busy,
  onStart,
  onLearn,
  onParent,
  onMistakes,
}: {
  progress: Progress;
  dueCount: number;
  ready: boolean;
  busy: boolean;
  onStart: () => void;
  onLearn: () => void;
  onParent: () => void;
  onMistakes: () => void;
}) {
  const nextAt = progress.reviewPlan?.nextAt;
  return (
    <section className="review-overview" aria-labelledby="review-title">
      <h1 id="review-title">复习</h1>
      <div className="review-start card">
        <div>
          <h2>
            {!ready
              ? "选择学习档案"
              : dueCount
                ? `现在有${dueCount}项复习`
                : progress.cards.length
                  ? "今天没有到期复习"
                  : "还没有复习任务"}
          </h2>
          {ready && nextAt && !dueCount ? (
            <p>
              下次复习：
              {reviewDueLabel(
                nextAt,
                progress.reviewPlan?.timezone,
                progress.reviewPlan?.generatedAt,
              )}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={!ready ? onParent : dueCount ? onStart : onLearn}
        >
          <LearningIcon kind={ready && dueCount ? "review" : "book"} />
          {!ready ? "选择档案" : dueCount ? "开始复习" : "继续学习"}
        </button>
      </div>
      {ready && (
        <nav className="review-tools" aria-label="其他复习方式">
          <button type="button" className="secondary" onClick={onMistakes}>
            <LearningIcon kind="book" />
            错题复练
          </button>
        </nav>
      )}
      {ready && progress.cards.length > 0 && (
        <details className="card review-list">
          <summary>复习安排 · {progress.cards.length}</summary>
          <ul className="review-schedule">
            {progress.cards.map((card) => (
              <li
                className="review-row"
                key={`${card.skillId}:${card.modality ?? "legacy"}`}
              >
                <div>
                  <strong>
                    {card.modality === "listening-picture"
                      ? "听音找图片"
                      : (card.label ?? "学习目标")}
                  </strong>
                  {card.modality && (
                    <p>{modalityLabels[card.modality] ?? "练习"}</p>
                  )}
                </div>
                <span>
                  {reviewDueLabel(
                    card.dueAt,
                    progress.reviewPlan?.timezone,
                    progress.reviewPlan?.generatedAt,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {ready && progress.answered > 0 && (
        <details className="card review-history">
          <summary>累计练习记录</summary>
          <dl className="review-totals">
            <div>
              <dt>已保存作答</dt>
              <dd>{progress.answered}</dd>
            </div>
            <div>
              <dt>学习目标</dt>
              <dd>{progress.cards.length}</dd>
            </div>
            <div>
              <dt>完成奖励</dt>
              <dd>{progress.stars} 颗星</dd>
            </div>
          </dl>
        </details>
      )}
    </section>
  );
}
