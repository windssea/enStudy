import LearningIcon from "./LearningIcon";
import GuideButton from "./GuideButton";
import type { View } from "./routes";
export default function ChildHome({
  nickname,
  grade,
  busy,
  ready,
  resume,
  onStart,
  onGo,
}: {
  nickname?: string;
  grade?: number;
  busy: boolean;
  ready: boolean;
  resume: boolean;
  onStart: () => void;
  onGo: (v: View) => void;
}) {
  return (
    <div className="learning-home">
      <section
        className="learning-welcome"
        aria-labelledby="learning-home-title"
      >
        <div className="learning-welcome-copy">
          {nickname && <p className="learning-eyebrow">{nickname}，欢迎回来</p>}
          <h1 id="learning-home-title">
            从一句话，
            <br />
            开始学英语。
          </h1>
          <div className="learning-start-row">
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
                    : "开始学习"}
              </span>
            </button>
            <GuideButton id="home" />
          </div>
          {!nickname && (
            <p className="learning-parent-hint">
              首次使用，请家长登录并选择档案。
            </p>
          )}
        </div>
        <div className="learning-path-preview" aria-label="课程学习的三个步骤">
          <div className="learning-path-heading">
            <LearningIcon kind="book" />
            <span>{grade ? grade + "年级课程" : "学习步骤"}</span>
          </div>
          <ol>
            <li>
              <span className="learning-step-number">1</span>
              <strong>选一节课</strong>
            </li>
            <li>
              <span className="learning-step-number">2</span>
              <strong>听一句，想一想</strong>
            </li>
            <li>
              <span className="learning-step-number">3</span>
              <strong>完成一轮练习</strong>
            </li>
          </ol>
        </div>
      </section>
      <section
        className="learning-entries"
        aria-labelledby="learning-entries-title"
      >
        <div className="learning-section-heading">
          <h2 id="learning-entries-title">选择学习内容</h2>
        </div>
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
