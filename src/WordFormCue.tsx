import type { Exercise } from "../packages/contracts/index";
import PaintedCompanion from "./PaintedCompanion";
import { useContext, useRef } from "react";
import { MotionContext } from "./SceneStage";
import { useIllustrationPause } from "./useIllustrationPause";
export default function WordFormCue({
  cue,
}: {
  cue: NonNullable<Exercise["wordFormCue"]>;
}) {
  const host = useRef<HTMLDivElement>(null),
    mode = useContext(MotionContext);
  const paused = useIllustrationPause(host, mode.quiet || mode.flat);
  return (
    <div
      ref={host}
      className="word-form-cue"
      role="group"
      aria-label="词形卡片"
      data-paused={paused}
    >
      <span className="word-form-cue-partner" aria-hidden="true">
        <PaintedCompanion />
      </span>
      <strong className="word-form-cue-word" lang="en">
        {cue.word}
      </strong>
      <span className="word-form-cue-arrow" aria-hidden="true">
        →
      </span>
      <span className="word-form-cue-goal">{cue.instruction}</span>
    </div>
  );
}
