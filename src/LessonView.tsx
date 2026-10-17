import type { CourseLesson } from "../packages/contracts/index";
import SpeechButton from "./SpeechButton";

export default function LessonView({
  lesson,
  busy,
  onStart,
  onBack,
  completed,
}: {
  lesson: CourseLesson;
  busy: boolean;
  onStart: () => void;
  onBack: () => void;
  completed: boolean;
}) {
  return (
    <div className="lesson-view">
      <button className="secondary" onClick={onBack}>
        ← 返回探险地图
      </button>
      <div className="lesson-hero">
        <div>
          <p className="eyebrow">LEARN IT. TRY IT. USE IT.</p>
          <span className="badge">
            {["一", "二", "三", "四", "五", "六"][lesson.grade - 1]}年级 · 第
            {lesson.order}课 · 约{lesson.minutes}分钟
          </span>
          <h1>{lesson.title}</h1>
          <p className="lead">{lesson.subtitle}</p>
        </div>
        <div className="lesson-mascot" aria-hidden="true">
          <span>Aa</span>
          <i />
          <i />
        </div>
      </div>
      <ol className="learning-steps" aria-label="这一课的学习步骤">
        <li aria-current="step">
          <span>1</span>发现规律
        </li>
        <li>
          <span>2</span>试着运用
        </li>
        <li>
          <span>3</span>留下小收获
        </li>
      </ol>
      <section className="card rule-card">
        <span className="eyebrow">今天的小发现</span>
        <h2>先看意思，再找句子伙伴。</h2>
        <p>{lesson.cards[0].rule}</p>
      </section>
      <div className="teaching-grid">
        {lesson.cards.map((card, index) => (
          <article className="card teaching-card" key={card.example}>
            <span className="example-number">0{index + 1}</span>
            <p className="teaching-english" lang="en">
              {card.example}
            </p>
            <p>{card.translation}</p>
            <SpeechButton text={card.example} label="听例句" />
          </article>
        ))}
      </div>
      <section className="card word-shelf">
        <h2>装进今天的小词袋</h2>
        <p>轻点单词旁的按钮，听设备中的英语声音。</p>
        <div className="word-chips">
          {lesson.vocabulary.map((word) => (
            <div key={word.word}>
              <strong lang="en">{word.word}</strong>
              <span>{word.meaning}</span>
              <SpeechButton text={word.word} />
            </div>
          ))}
        </div>
      </section>
      <section className="lesson-mission">
        <div>
          <span className="eyebrow">把英语带到生活里</span>
          <h2>学完后，去试一试</h2>
          <p>{lesson.task}</p>
        </div>
        <button className="primary" disabled={busy} onClick={onStart}>
          {busy ? "正在准备…" : completed ? "再练一轮" : "开始这节课的练习"}
          <span aria-hidden="true">→</span>
        </button>
      </section>
      <p className="footnote">
        先看例句理解规律，再用{lesson.itemCount}
        个练习任务试一试。练完可以休息，系统会安排之后的复习。设备朗读不做口语评分。
      </p>
    </div>
  );
}
