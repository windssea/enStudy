import LearningIcon from "./LearningIcon";
import type { View } from "./routes";
export default function ChildHome({
  nickname,
  taskTitle,
  taskDetail,
  busy,
  ready,
  resume,
  onStart,
  onGo,
}: {
  nickname?: string;
  taskTitle?: string;
  taskDetail?: string;
  busy: boolean;
  ready: boolean;
  resume: boolean;
  onStart: () => void;
  onGo: (v: View) => void;
}) {
  return (
    <div className="learning-home">
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
              ["review", "复习", "review"],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              className="learning-entry"
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
              ["topics", "专题特训"],
              ["patterns", "固定句式"],
              ["phonics", "自然拼读"],
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
