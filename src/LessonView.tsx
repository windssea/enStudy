import type { CourseLesson } from "../packages/contracts/index";
import { writingForLesson } from "../packages/domain/writing";
import SpeechButton from "./SpeechButton";
import SceneStage from "./SceneStage";
import { useEffect } from "react";
import { api } from "./api";
import LessonConcepts from "./LessonConcepts";

export default function LessonView({
  lesson,
  busy,
  onStart,
  onBack,
  completed,
  childId,
  onWriting,
}: {
  lesson: CourseLesson;
  busy: boolean;
  onStart: () => void;
  onBack: () => void;
  completed: boolean;
  childId?: string;
  onWriting?: (promptId: string) => void;
}) {
  useEffect(() => {
    if (childId)
      void api(`/learning/lessons/${lesson.id}/view`, {}).catch(() => {});
  }, [childId, lesson.id]);
  const writing = writingForLesson(lesson.id);
  return (
    <div className="lesson-view">
      <button className="secondary" onClick={onBack}>
        ← 返回探险地图
      </button>
      <div className="lesson-hero">
        <div>
          <p className="eyebrow">LEARN IT. TRY IT. USE IT.</p>
          <span className="badge">
            {["一", "二", "三", "四", "五", "六"][lesson.grade - 1]}年级 ·
            {lesson.term === "B" ? "下学期" : "上学期"} · 第
            {lesson.unitLesson ?? lesson.order}课 · {lesson.unitTitle} · 约
            {lesson.minutes}分钟
          </span>
          <h1>{lesson.title}</h1>
          <p className="lead">{lesson.subtitle}</p>
        </div>
        <SceneStage kind="lesson" />
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
      {Boolean(lesson.conceptLabIds?.length) && (
        <LessonConcepts
          key={`${lesson.id}:${childId ?? "guest"}`}
          ids={lesson.conceptLabIds!}
          childId={childId}
        />
      )}
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
          <span className="eyebrow">试着运用今天的小发现</span>
          <h2>准备好，开始小练习</h2>
          <p>{lesson.task}</p>
        </div>
        <button className="primary" disabled={busy} onClick={onStart}>
          {busy ? "正在准备…" : completed ? "再练一轮" : "开始这节课的练习"}
          <span aria-hidden="true">→</span>
        </button>
      </section>
      {writing && onWriting && (
        <section className="card writing-entry">
          <h2>把想法写成自己的作品</h2>
          <p>
            进入“{writing.title}
            ”，填写并保存自己的文字；它与本课九题进度分开，不自动评分。
          </p>
          <button className="secondary" onClick={() => onWriting(writing.id)}>
            去写一写，保存草稿
          </button>
        </section>
      )}
      {lesson.homeActivity && (
        <details className="card lesson-home-activity" key={lesson.id}>
          <summary>练完后，和家人用一用（可选）</summary>
          <p>{lesson.homeActivity}</p>
          <p className="footnote">
            这项生活小活动不用提交，不计分，也不影响课程进度。可以休息后再试。
          </p>
        </details>
      )}
      <p className="footnote">
        先看例句理解规律，再用{lesson.itemCount}
        个练习任务试一试。练完可以休息，系统会安排之后的复习。设备朗读不做口语评分。
      </p>
    </div>
  );
}
