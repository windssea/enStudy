import { useEffect, useRef, useState } from "react";
import type { MistakeDetail } from "../packages/contracts/mistakes";
import type { TrainingCycle } from "../packages/contracts/index";
import { api } from "./api";
export default function TrainingCoaching({
  card,
  childId,
  index,
}: {
  card: TrainingCycle["coaching"][number];
  childId?: string;
  index: number;
}) {
  const [detail, setDetail] = useState<MistakeDetail | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), [childId, card.eventId]);
  async function open(expanded: boolean) {
    request.current?.abort();
    setDetail(null);
    setError("");
    setLoading(false);
    if (!expanded || !childId || !card.eventId) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const data = await api<MistakeDetail>(
        `/learning/mistakes/${encodeURIComponent(card.eventId)}/open`,
        {},
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      if (data.childId !== childId || data.eventId !== card.eventId)
        throw Error("档案有变化，请刷新后再打开。");
      setDetail(data);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "暂时没读到讲解，请收起后重新打开。",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  return (
    <details onToggle={(event) => void open(event.currentTarget.open)}>
      <summary>
        {card.hinted ? "跟着提示完成的规律" : "可以再看一眼的规律"} {index + 1}
        {card.dimension ? ` · ${card.dimension}` : ""}
      </summary>
      {loading && <p role="status">正在打开那次作答的讲解…</p>}
      {error && <p role="alert">{error} 可以收起后重新打开。</p>}
      {detail && (
        <>
          <p className="teaching-english">{detail.exercise.prompt}</p>
          {detail.currentTeaching && (
            <p>这份材料后来有调整，接下来请按新版讲解练习。</p>
          )}
          <p>{detail.currentTeaching?.feedback ?? detail.feedback}</p>
          <p className="footnote">
            已记为今天看过这份讲解；提示与示范后的答对会另外保存。
          </p>
        </>
      )}
      {!card.eventId && <p>请从错题小本重新打开讲解。</p>}
    </details>
  );
}
