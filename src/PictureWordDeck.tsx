import { lazy, Suspense, useEffect, useState, useRef } from "react";
import type { WordCard } from "../packages/contracts/index";
import { api } from "./api";
import WordPicture, { pictureWord } from "./WordPicture";
import WordAudioButton from "./WordAudioButton";
import SpeechButton from "./SpeechButton";
import ToyPicture from "./ToyPicture";
import { wordObjectKind } from "./wordObjects";
const WordObjectScene = lazy(() => import("./WordObjectScene"));
export default function PictureWordDeck({
  words,
  childId,
}: {
  words: WordCard[];
  childId?: string;
}) {
  const [opened, setOpened] = useState(false),
    [index, setIndex] = useState(0),
    [preview, setPreview] = useState<WordCard | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const word = words[Math.min(index, words.length - 1)];
  useEffect(() => {
    setPreview(null);
    setError("");
    if (!opened || !word) return;
    if (!childId) {
      setPreview(word);
      return;
    }
    const controller = new AbortController();
    api<{ saved: boolean; word: WordCard }>(
      `/learning/vocabulary/${encodeURIComponent(word.id)}/view`,
      {},
      { signal: controller.signal },
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!data.saved || data.word.id !== word.id)
          throw Error("词卡还没有准备好，请重试。");
        setPreview(data.word);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [opened, childId, word, retry]);
  function turn(step: number) {
    document.dispatchEvent(new Event("eq-stop-speech"));
    setIndex((n) => Math.max(0, Math.min(words.length - 1, n + step)));
  }
  const current = preview?.id === word?.id ? preview : null,
    media = current && pictureWord(current.id);
  const deck = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (opened && current)
      deck.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [opened, current]);
  return (
    <details
      ref={deck}
      className="picture-word-deck card"
      onToggle={(e) => {
        setOpened(e.currentTarget.open);
        if (!e.currentTarget.open)
          document.dispatchEvent(new Event("eq-stop-speech"));
      }}
    >
      <summary>
        <ToyPicture kind="words" />
        <span>先看图，听单词</span>
      </summary>
      {opened && (
        <div>
          {error ? (
            <p role="alert">
              {error}
              <button
                className="secondary"
                onClick={() => setRetry((n) => n + 1)}
              >
                再打开一次
              </button>
            </p>
          ) : !current || !media ? (
            <p role="status">正在打开词卡…</p>
          ) : (
            <>
              <div
                className="picture-deck-counter"
                aria-label={`第${index + 1}张，共${words.length}张`}
              >
                {index + 1} / {words.length}
              </div>
              <div className="picture-deck-body">
                <WordPicture id={current.id} />
                <div>
                  <strong className="picture-deck-word" lang="en">
                    {current.word}
                  </strong>
                  <div className="picture-deck-audio">
                    <WordAudioButton
                      key={current.id}
                      url={media.audioUrl}
                      picture
                      label="听单词"
                    />
                    <SpeechButton
                      text={current.meaning}
                      language="zh-CN"
                      label="听意思"
                    />
                  </div>
                  <p>{current.meaning}</p>
                  {wordObjectKind(current) && (
                    <details key={current.id}>
                      <summary>看看词语插画</summary>
                      <Suspense fallback={<p>玩具准备中…</p>}>
                        <WordObjectScene word={current} />
                      </Suspense>
                    </details>
                  )}
                </div>
              </div>
              <div className="picture-deck-controls">
                <button
                  className="secondary"
                  disabled={index === 0}
                  onClick={() => turn(-1)}
                  aria-label="上一张单词图卡"
                >
                  <span className="toy-previous">
                    <ToyPicture kind="next" />
                  </span>
                </button>
                <button
                  className="secondary"
                  disabled={index >= words.length - 1}
                  onClick={() => turn(1)}
                  aria-label="下一张单词图卡"
                >
                  <ToyPicture kind="next" />
                </button>
              </div>
              <details>
                <summary>给大人：学习记录</summary>
                <p>
                  {childId
                    ? "今天看过图卡的词，在当天答对会记为跟着示范完成；隔天再独立回忆。"
                    : "请大人选好学习档案，才能保存练习和示范记录。"}{" "}
                  整词合成声音不做口语评分。
                </p>
              </details>
            </>
          )}
        </div>
      )}
    </details>
  );
}
