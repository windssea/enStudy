import { useEffect, useState } from "react";
import type { CourseLesson } from "../packages/contracts/index";
import { writingForLesson } from "../packages/domain/writing";
import SpeechButton from "./SpeechButton";
import { api } from "./api";
import LessonConcepts from "./LessonConcepts";
import ToyPicture from "./ToyPicture";
import { lessonExampleScene } from "./lessonScenes";
import { courseLessonPath } from "./courseNavigation";
export default function LessonView({
  lesson,
  coursePath,
  busy,
  onStart,
  onBack,
  completed,
  childId,
  onWriting,
}: {
  lesson: CourseLesson;
  coursePath?: string;
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
  const scene = lessonExampleScene(lesson, card.example);
  function turn(step: number) {
    document.dispatchEvent(new Event("eq-stop-speech"));
    setIndex((n) => Math.max(0, Math.min(lesson.cards.length - 1, n + step)));
  }
  return (
    <div className="lesson-view child-lesson">
      <button className="secondary child-back" onClick={onBack}>
        <ToyPicture kind="map" />
        <span>返回课程</span>
      </button>
      <div className="child-lesson-title">
        <div>
          <p className="course-location">
            {coursePath ?? courseLessonPath(lesson, [])}
          </p>
          <h1>{lesson.title}</h1>
        </div>
      </div>
      <section className="card child-example" aria-label="例句观察卡">
        <div
          className="child-card-count"
          aria-label={`第${index + 1}张，共${lesson.cards.length}张`}
        >
          <strong>
            例句 {index + 1} / {lesson.cards.length}
          </strong>
        </div>
        <div
          className="lesson-example-layout"
          data-illustrated={Boolean(scene)}
        >
          {scene && (
            <figure
              className="lesson-example-scene"
              data-art-style={scene.styleId}
            >
              <img
                src={scene.url}
                width={scene.width}
                height={scene.height}
                alt={scene.alt}
                decoding="async"
              />
            </figure>
          )}
          <div className="lesson-example-text">
            <p className="teaching-english" lang="en">
              {card.example}
            </p>
            <p className="child-translation">{card.translation}</p>
            <p className="lesson-rule">{card.rule}</p>
          </div>
        </div>
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
            <span>上一例句</span>
          </button>
          <button
            className="secondary"
            disabled={index >= lesson.cards.length - 1}
            onClick={() => turn(1)}
            aria-label="下一张例句"
          >
            <span>下一例句</span>
            <ToyPicture kind="next" />
          </button>
          <button
            className="child-play"
            disabled={busy}
            onClick={onStart}
            aria-label={completed ? "重新进行这节课的练习" : "开始这节课的练习"}
          >
            <ToyPicture kind="play" />
            <span>{busy ? "准备中" : completed ? "重新练习" : "开始练习"}</span>
          </button>
        </div>
      </section>
      <details className="lesson-extra card">
        <summary>
          <span>本课词汇与拓展</span>
          <ToyPicture kind="next" />
        </summary>
        {Boolean(lesson.conceptLabIds?.length) && (
          <LessonConcepts
            key={`${lesson.id}:${childId ?? "guest"}`}
            ids={lesson.conceptLabIds!}
            childId={childId}
          />
        )}
        <section className="word-shelf">
          <h2>本课词汇</h2>
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
      </details>
    </div>
  );
}
