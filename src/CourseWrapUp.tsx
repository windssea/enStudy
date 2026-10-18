export default function CourseWrapUp({
  dueCount,
  onReview,
}: {
  dueCount: number;
  onReview: () => void;
}) {
  return (
    <div className="course-wrapup">
      <strong>这学期的核心练习都做过了</strong>
      <p>
        每节练习的完成记录已保存。练过一遍是新的起点，之后还可以复习、读故事、开口说和自己写。
      </p>
      <p>
        {dueCount > 0
          ? `现在有 ${dueCount} 条到期复习记录，可以到复习花园看看。`
          : "现在没有到期复习。可以先休息，之后再按自己的节奏回来。"}
      </p>
      <button className="primary" type="button" onClick={onReview}>
        看看复习安排
      </button>
      <small>完成练习不等于已掌握全部内容；提示与独立回忆会分别记录。</small>
    </div>
  );
}
