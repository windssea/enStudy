import { useState } from "react";
import type { Answer, Exercise } from "../packages/contracts/index";
export default function EvidenceAnswer({
  exercise,
  answer,
  onChange,
  disabled,
}: {
  exercise: Exercise;
  answer: Answer;
  onChange: (value: Answer) => void;
  disabled: boolean;
}) {
  const selected = Array.isArray(answer) ? answer : [],
    [status, setStatus] = useState("");
  return (
    <div className="evidence-answer">
      <section
        className="evidence-passage"
        aria-label="故事原文，点选支持答案的一句"
      >
        <p className="eyebrow">READ · FIND · ANSWER</p>
        <h3>小故事里的线索</h3>
        {exercise.passage?.map((line, i) => (
          <button
            type="button"
            key={line.id}
            className="evidence-line"
            aria-pressed={selected[0] === line.id}
            disabled={disabled}
            onClick={() => {
              onChange([line.id, selected[1] ?? ""]);
              setStatus(`已选第${i + 1}句作为依据，再选择问题答案。`);
            }}
          >
            <span aria-hidden="true">{i + 1}</span>
            <span lang="en">{line.text}</span>
            <small>
              {selected[0] === line.id ? "我找到的线索" : "选这句作线索"}
            </small>
          </button>
        ))}
      </section>
      <p className="evidence-instruction">
        先选依据句，再选答案；两项一起检查。
      </p>
      <div className="answer-options">
        {exercise.choices?.map((choice) => (
          <button
            type="button"
            className="answer-option"
            aria-pressed={selected[1] === choice}
            disabled={disabled || !selected[0]}
            key={choice}
            onClick={() => onChange([selected[0], choice])}
          >
            {choice}
          </button>
        ))}
      </div>
      <p className="visually-hidden" role="status">
        {status}
      </p>
    </div>
  );
}
