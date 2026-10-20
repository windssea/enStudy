import { featureLazy } from "./featureLazy";
import { Suspense, useState } from "react";
import { conceptLab } from "../packages/domain/concepts";
const ConceptLab = featureLazy(() => import("./ConceptLab"));
const TenseComparison = featureLazy(() => import("./TenseComparison"));

export default function LessonConcepts({
  ids,
  childId,
}: {
  ids: string[];
  childId?: string;
}) {
  const [open, setOpen] = useState(false);
  const labs = ids.map(conceptLab).filter((lab) => lab !== undefined);
  if (!labs.length) return null;
  return (
    <details
      className="lesson-concepts"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <strong>想看规律动起来？</strong>
        <span>打开互动小实验 · 可选</span>
      </summary>
      {open && (
        <div className="lesson-concept-content">
          <p>
            轻点一个例子，再一步步观察。看过示范后，相同示范内容的作答会另记为辅助练习。
          </p>
          <Suspense fallback={<p role="status">正在准备规律小实验…</p>}>
            {labs.some((lab) => lab.kind === "timeline") && (
              <TenseComparison key={childId ?? "guest"} childId={childId} />
            )}
            {labs.map((lab) => (
              <ConceptLab key={lab.id} lab={lab} childId={childId} />
            ))}
          </Suspense>
        </div>
      )}
    </details>
  );
}
