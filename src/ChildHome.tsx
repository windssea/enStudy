import LearningIcon from "./LearningIcon";
import type { View } from "./routes";
export default function ChildHome({
  nickname,
  taskTitle,
  taskDetail,
  busy,
  ready,
  resume,
  review = false,
  onStart,
  onGo,
}: {
  nickname?: string;
  taskTitle?: string;
  taskDetail?: string;
  busy: boolean;
  ready: boolean;
  resume: boolean;
  review?: boolean;
  onStart: () => void;
  onGo: (v: View) => void;
}) {
  return (
    <div className="learning-home">
      <h1>今天学什么？</h1>
      <section
        className="learning-current-task"
        aria-labelledby="learning-home-title"
      >
        <div className="learning-task-copy">
          <h2 id="learning-home-title">
            {nickname ? taskTitle || "课程学习" : "选择学习档案"}
          </h2>
          {nickname && taskDetail && <p>{taskDetail}</p>}
        </div>
        <button
          className="learning-start"
          disabled={busy || !ready}
          onClick={onStart}
          aria-label={
            resume
              ? "继续上次的学习"
              : review
                ? "开始复习"
                : nickname
                  ? "开始课程学习"
                  : "请家长选择档案，再开始"
          }
        >
          <LearningIcon kind={resume ? "arrow" : "play"} />
          <span>
            {busy || !ready
              ? "正在准备…"
              : resume
                ? "继续学习"
                : review
                  ? "开始复习"
                  : nickname
                    ? "开始学习"
                    : "家长登录"}
          </span>
        </button>
      </section>
      <section className="learning-entries" aria-label="学习内容">
        <div className="learning-entry-grid">
          {(
            [
              ["map", "课程学习", "book"],
              ["words", "单词训练", "words"],
              ["topics", "专题特训", "topics"],
              ["patterns", "固定句式", "patterns"],
              ["review", "复习", "review"],
              ["phonics", "自然拼读", "phonics"],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              className="learning-entry"
              data-entry={id}
              key={id}
              onClick={() => onGo(id)}
            >
              <span className="learning-entry-icon">
                <LearningIcon kind={icon} />
              </span>
              <strong>{label}</strong>
              <LearningIcon kind="arrow" />
            </button>
          ))}
        </div>
      </section>
      <details className="learning-more">
        <summary>更多练习</summary>
        <div className="learning-more-grid">
          {(
            [
              ["writing", "写作练习"],
              ["talk", "对话练习"],
              ["workshops", "互动练习"],
              ["offline", "离线练习"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} onClick={() => onGo(id)}>
              <LearningIcon kind={id} />
              <span>
                <strong>{label}</strong>
              </span>
              <LearningIcon kind="arrow" />
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
