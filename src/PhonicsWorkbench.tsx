import { useState } from "react";
import type { PhonicsWord } from "../packages/contracts/phonics";
import { phonicsGroupLabel } from "../packages/domain/phonics";
import WordAudioButton from "./WordAudioButton";
import { phonicsObservation, phonicsSteps } from "./phonicsWorkbenchModel";
export default function PhonicsWorkbench({
  word,
  kind,
}: {
  word: PhonicsWord;
  kind: "sound" | "meaning";
}) {
  const [selected, setSelected] = useState(0),
    [step, setStep] = useState(0),
    [heard, setHeard] = useState(false);
  const group = word.groups[selected] ?? [],
    label = phonicsGroupLabel(word, group),
    folded = step === 2;
  function choose(i: number) {
    setSelected(i);
    go(1);
  }
  function go(next: number) {
    setStep(next);
  }
  return (
    <section className="phonics-workbench" aria-label="字母对应示范">
      <ol className="phonics-path" aria-label="示范观察步骤">
        {phonicsSteps.map((title, i) => (
          <li key={title}>
            <button
              className="secondary"
              aria-current={step === i ? "step" : undefined}
              onClick={() => go(i)}
            >
              <span>{i + 1}</span>
              {kind === "meaning" && i === 1 ? "看词义块" : title}
            </button>
          </li>
        ))}
      </ol>
      <div className="phonics-coach">
        <strong>
          {step + 1} / 3 ·{" "}
          {kind === "meaning" && step === 1 ? "看词义块" : phonicsSteps[step]}
        </strong>
        <p>
          {step === 0
            ? "先听一遍整个单词。暂时不方便开声音，也可以直接看下一步。"
            : step === 1
              ? "从左到右点字母块，找找哪些是一组。选中的词块会轻轻抬起来。"
              : `字母回到一起，仍然是 ${word.word}。再听一次整词，试着自己读一读。`}
        </p>
      </div>
      <div className="phonics-canvas" data-flat={true}>
        {
          <div
            className="phonics-flat"
            data-group={selected % 4}
            data-folded={folded}
            aria-hidden="true"
          >
            <div className="phonics-flat-tiles" lang="en">
              {word.tiles.map((tile, i) => (
                <span key={i} data-selected={group.includes(i)}>
                  {tile}
                </span>
              ))}
            </div>
            <strong>
              <span lang="en">{word.word}</span> · {word.meaning}
            </strong>
            <small>用下方的词块按钮，慢慢看一看。</small>
          </div>
        }
      </div>
      <div
        className="phonics-letter-row"
        data-group={selected % 4}
        lang="en"
        aria-label="按原拼写排列的字母块"
      >
        {word.tiles.map((tile, i) => (
          <button
            className="phonics-letter"
            key={i}
            data-selected={group.includes(i)}
            aria-pressed={group.includes(i)}
            aria-label={`选择${kind === "meaning" ? "词义块" : "标记"}${word.groups.findIndex((g) => g.includes(i)) + 1}：${tile}，第${i + 1}块`}
            onClick={() => choose(word.groups.findIndex((g) => g.includes(i)))}
          >
            {tile}
          </button>
        ))}
      </div>
      <p className="phonics-group-status" role="status">
        {kind === "meaning" ? "词义块" : "音—字母标记"} {selected + 1}/
        {word.groups.length}：<strong lang="en">{label}</strong>
        {kind === "sound" && (group.length > 1 || label.length > 1)
          ? " · 这些字母共同对应本词的一个音。"
          : ""}
        <span className="phonics-observation">
          {phonicsObservation(word, selected, kind)}
        </span>
      </p>
      <div
        className="phonics-group-buttons"
        aria-label={kind === "meaning" ? "选择词义块" : "选择音与字母标记"}
      >
        {word.groups.map((g, i) => (
          <button
            className="secondary"
            key={i}
            aria-pressed={selected === i}
            onClick={() => choose(i)}
          >
            <span lang="en">{phonicsGroupLabel(word, g)}</span>
            <small>
              {kind === "meaning" ? `词块${i + 1}` : `标记${i + 1}`}
            </small>
          </button>
        ))}
      </div>
      {step === 1 && (
        <div className="phonics-browse" aria-label="逐个观察标记">
          <button
            className="secondary"
            disabled={selected === 0}
            onClick={() => choose(selected - 1)}
          >
            上一个{kind === "meaning" ? "词义块" : "标记"}
          </button>
          <span>
            {selected + 1} / {word.groups.length}
          </span>
          <button
            className="secondary"
            disabled={selected === word.groups.length - 1}
            onClick={() => choose(selected + 1)}
          >
            下一个{kind === "meaning" ? "词义块" : "标记"}
          </button>
        </div>
      )}
      <div className="phonics-controls">
        <WordAudioButton
          key={word.id}
          url={word.audioUrl}
          onComplete={() => setHeard(true)}
        />
        <button
          className="primary"
          onClick={() => go(step === 2 ? 1 : step + 1)}
        >
          {step === 0
            ? kind === "meaning"
              ? "去看词义块"
              : "去看字母搭档"
            : folded
              ? "再分开观察"
              : "合在一起看拼写"}
        </button>
      </div>
      {heard && (
        <p className="phonics-heard" role="status">
          整词已播放完。可以再听一次，或继续观察字母块。
        </p>
      )}
      <p>
        {kind === "meaning"
          ? "这里数有意义的小词，不是音素或音节。"
          : "字母下的标记帮你看对应关系；播放的是完整单词，不是逐个纯音素录音。"}
        点标记和移动词块都不计成绩。
      </p>
    </section>
  );
}
