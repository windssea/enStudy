import { useEffect, useState } from "react";
import type { CourseLesson } from "../packages/contracts/index";
import { writingForLesson } from "../packages/domain/writing";
import SpeechButton from "./SpeechButton";
import SceneStage from "./SceneStage";
import { api } from "./api";
import LessonConcepts from "./LessonConcepts";
import ToyPicture from "./ToyPicture";
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
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    if (childId)
      void api(`/learning/lessons/${lesson.id}/view`, {}).catch(() => {});
  }, [childId, lesson.id]);
  const writing = writingForLesson(lesson.id),
    card = lesson.cards[Math.min(index, lesson.cards.length - 1)];
  function turn(step: number) {
    document.dispatchEvent(new Event("eq-stop-speech"));
    setIndex((n) => Math.max(0, Math.min(lesson.cards.length - 1, n + step)));
  }
  return (
    <div className="lesson-view child-lesson">
      <button className="secondary child-back" onClick={onBack}>
        <ToyPicture kind="map" />
        <span>回小岛</span>
      </button>
      <div className="child-lesson-title">
        <div>
          <p>听一句，再试一试</p>
          <h1>{lesson.title}</h1>
        </div>
        <SceneStage kind="lesson" compact />
      </div>
      <section className="card child-example" aria-label="例句观察卡">
        <div
          className="child-card-count"
          aria-label={`第${index + 1}张，共${lesson.cards.length}张`}
        >
          <span aria-hidden="true">
            {lesson.cards.map((_, i) => (
              <i key={i} data-current={i === index} />
            ))}
          </span>
          <strong>
            {index + 1}/{lesson.cards.length}
          </strong>
        </div>
        <p className="teaching-english" lang="en">
          {card.example}
        </p>
        <div className="child-example-listen">
          <SpeechButton text={card.example} label="听英语" />
          <SpeechButton
            text={
              card.translation.replace(/[。！？.!?]+$/, "") + "。" + card.rule
            }
            language="zh-CN"
            label="听意思"
          />
        </div>
        <p className="child-translation">{card.translation}</p>
        <details className="child-rule">
          <summary>看看小发现</summary>
          <p>{card.rule}</p>
        </details>
        <div className="child-example-controls">
          <button
            className="secondary"
            disabled={index === 0}
            onClick={() => turn(-1)}
            aria-label="上一张例句"
          >
            <span className="toy-previous">
              <ToyPicture kind="next" />
            </span>
          </button>
          <button
            className="secondary"
            disabled={index >= lesson.cards.length - 1}
            onClick={() => turn(1)}
            aria-label="下一张例句"
          >
            <ToyPicture kind="next" />
          </button>
          <button
            className="child-play"
            disabled={busy}
            onClick={onStart}
            aria-label={completed ? "再玩这一课的练习" : "开始这节课的练习"}
          >
            <ToyPicture kind="play" />
            <span>{busy ? "准备中" : "试一试"}</span>
          </button>
        </div>
      </section>
      <details className="lesson-extra card">
        <summary>
          <ToyPicture kind="help" />
          更多小发现
        </summary>
        <p>
          {lesson.subtitle} · {lesson.grade}年级
          {lesson.term === "A" ? "上学期" : "下学期"}
        </p>
        <p>
          {["一", "二", "三", "四", "五", "六"][lesson.grade - 1]}年级 ·{" "}
          {lesson.term === "A" ? "上学期" : "下学期"} · 第
          {lesson.unitLesson ?? lesson.order}课 · {lesson.unitTitle} · 约
          {lesson.minutes}分钟
        </p>
        {Boolean(lesson.conceptLabIds?.length) && (
          <LessonConcepts
            key={`${lesson.id}:${childId ?? "guest"}`}
            ids={lesson.conceptLabIds!}
            childId={childId}
          />
        )}
        <section className="word-shelf">
          <h2>今天的小词袋</h2>
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
        {writing && onWriting && (
          <div>
            <button
              className="secondary"
              aria-label="去写一写，保存草稿"
              onClick={() => onWriting(writing.id)}
            >
              写自己的小作品
            </button>
            <p className="footnote">
              写作草稿与本课九题进度分开，保存作品不会替代课程练习。
            </p>
          </div>
        )}
        {lesson.homeActivity && (
          <details className="lesson-home-activity">
            <summary>练完后，和家人用一用（可选）</summary>
            <p>{lesson.homeActivity}</p>
            <p className="footnote">
              这项生活小活动不用提交，不计分，也不影响课程进度。可以休息后再试。
            </p>
          </details>
        )}
        <p className="footnote">
          {lesson.task} 本课有{lesson.itemCount}
          个任务，完成后安排复习。听例句和看规律不会计为独立作答；设备朗读不做口语评分。
        </p>
      </details>
    </div>
  );
}
