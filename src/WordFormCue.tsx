import type { Exercise } from "../packages/contracts/index";
import LearningIcon from "./LearningIcon";
const genericContexts = new Set([
  "选出合适的动词形式。",
  "写出合适的动词形式。",
  "看看原词，选出变好的词。",
  "看看原词，把变好的词写下来。",
]);
/** Only known generic repetition is omitted; custom requirements stay visible. */
export function wordFormExtraContext(context: string, instruction: string) {
  const text = context.trim();
  return !text || genericContexts.has(text) || text === instruction.trim()
    ? null
    : context;
}
export default function WordFormCue({
  cue,
  context = "",
}: {
  cue: NonNullable<Exercise["wordFormCue"]>;
  context?: string;
}) {
  const extraContext = wordFormExtraContext(context, cue.instruction);
  return (
    <>
      <div className="word-form-cue" role="group" aria-label="词形卡片">
        <strong className="word-form-cue-word" lang="en">
          {cue.word}
        </strong>
        <span className="word-form-cue-arrow" aria-hidden="true">
          <LearningIcon kind="arrow" />
        </span>
        <span className="word-form-cue-goal">{cue.instruction}</span>
      </div>
      {extraContext && <p className="lead">{extraContext}</p>}
    </>
  );
}
