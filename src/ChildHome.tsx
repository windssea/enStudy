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
          <p className="learning-eyebrow">
            {nickname ? nickname + "，欢迎回来" : "欢迎来到英语探险岛"}
          </p>
          <h1 id="learning-home-title">
            从一句话，
            <br />
            开始学英语。
          </h1>
          <p className="learning-intro">
            听懂例句，试着表达。每次完成一小步，学习进度会为你保存。
          </p>
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
              首次使用，请家长先登录并选择学习档案。
            </p>
          )}
        </div>
        <div className="learning-path-preview" aria-label="课程学习的三个步骤">
          <div className="learning-path-heading">
            <LearningIcon kind="book" />
            <span>{grade ? grade + "年级课程" : "按年级循序学习"}</span>
          </div>
          <ol>
            <li>
              <span className="learning-step-number">1</span>
              <div>
                <strong>选一节课</strong>
                <span>从当前年级的内容开始</span>
              </div>
            </li>
            <li>
              <span className="learning-step-number">2</span>
              <div>
                <strong>听一句，想一想</strong>
                <span>先理解，再试着自己表达</span>
              </div>
            </li>
            <li>
              <span className="learning-step-number">3</span>
              <div>
                <strong>完成一轮练习</strong>
                <span>保留进度，下次接着学</span>
              </div>
            </li>
          </ol>
          <p>按自己的节奏，完成后就可以休息。</p>
        </div>
      </section>
      <section
        className="learning-entries"
        aria-labelledby="learning-entries-title"
      >
        <div className="learning-section-heading">
          <h2 id="learning-entries-title">选择学习内容</h2>
          <span>课程、词汇与复习，按自己的节奏来</span>
        </div>
        <div className="learning-entry-grid">
          {(
            [
              ["map", "课程学习", "按年级与学期，循序练习", "book"],
              ["words", "单词训练", "认识词义、听音与拼写", "words"],
              ["review", "间隔复习", "回顾到了复习时间的内容", "review"],
            ] as const
          ).map(([id, label, description, icon]) => (
            <button
              className="learning-entry"
              key={id}
              onClick={() => onGo(id)}
            >
              <span className="learning-entry-icon">
                <LearningIcon kind={icon} />
              </span>
              <strong>{label}</strong>
              <span>{description}</span>
              <LearningIcon kind="arrow" />
            </button>
          ))}
        </div>
      </section>
      <details className="learning-more">
        <summary>
          专项与更多练习<span>语法、句式、拼读与表达</span>
        </summary>
        <div className="learning-more-grid">
          {(
            [
              ["topics", "专题特训", "语法、时态与单词变形"],
              ["patterns", "固定句式", "练习常用表达与句型"],
              ["phonics", "自然拼读", "听音与字母组合"],
              ["writing", "写作练习", "从提纲到一段话"],
              ["talk", "对话练习", "在熟悉的场景里表达"],
              ["workshops", "互动练习", "分类、排序与观察"],
              ["offline", "离线练习", "先准备内容，再离线使用"],
            ] as const
          ).map(([id, label, description]) => (
            <button key={id} onClick={() => onGo(id)}>
              <LearningIcon kind={id} />
              <span>
                <strong>{label}</strong>
                <span>{description}</span>
              </span>
              <LearningIcon kind="arrow" />
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
