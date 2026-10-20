import { featureLazy } from "./featureLazy";
import { Suspense, useEffect, useState } from "react";
import type { WordCard } from "../packages/contracts/index";
import { api } from "./api";
import SpeechButton from "./SpeechButton";
import { wordObjectKind } from "./wordObjects";
const WordObjectScene = featureLazy(() => import("./WordObjectScene"));

export default function WordStudyCard({
  word,
  childId,
}: {
  word: WordCard;
  childId?: string;
}) {
  const [opened, setOpened] = useState(false),
    [preview, setPreview] = useState<WordCard | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    setPreview(null);
    setError("");
    if (!opened) return;
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
          throw new Error("词卡暂时没打开，请重试。");
        setPreview(data.word);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "词卡暂时没打开，请重试。",
          );
      });
    return () => controller.abort();
  }, [opened, childId, word, retry]);
  return (
    <details
      className="word-flashcard"
      onToggle={(event) => {
        setPreview(null);
        setOpened(event.currentTarget.open);
      }}
    >
      <summary>
        <strong lang="en">{word.word}</strong>
        <span>点开释义与例句</span>
      </summary>
      {opened && (
        <div>
          {error ? (
            <p className="notice error" role="alert">
              {error}
              <button
                type="button"
                className="text-button"
                onClick={() => setRetry((value) => value + 1)}
              >
                重新打开
              </button>
            </p>
          ) : !preview ? (
            <p role="status">正在打开词卡…</p>
          ) : (
            <>
              <h4>{preview.meaning}</h4>
              <p lang="en">{preview.example}</p>
              {!!preview.alternatives?.length && (
                <p>
                  其他写法：
                  <span lang="en">{preview.alternatives.join(" / ")}</span>
                </p>
              )}
              <SpeechButton text={preview.word} />
              {wordObjectKind(preview) && (
                <Suspense fallback={<p role="status">粘土小物正在准备…</p>}>
                  <WordObjectScene word={preview} />
                </Suspense>
              )}
              <p className="word-study-note">
                {childId
                  ? "先看一看，再隔天独立想一想。今天看过的词，答对时会单独记录为跟着示范完成。"
                  : "选定学习档案后，可以保存这个孩子的练习与示范记录。"}
              </p>
            </>
          )}
        </div>
      )}
    </details>
  );
}
