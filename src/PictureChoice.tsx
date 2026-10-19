import type { Exercise } from "../packages/contracts/index";
import WordPicture from "./WordPicture";
export default function PictureChoice({
  exercise,
  value,
  revealed = false,
}: {
  exercise: Exercise;
  value: string;
  revealed?: boolean;
}) {
  const choice = exercise.pictureChoices?.find((c) => c.value === value);
  if (!choice) return <>{value}</>;
  return (
    <>
      <span aria-hidden="true">
        <WordPicture id={choice.wordId} />
      </span>
      <span className={revealed ? "picture-choice-label" : "visually-hidden"}>
        {choice.label}
      </span>
    </>
  );
}
