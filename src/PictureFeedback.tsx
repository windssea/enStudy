import type { Receipt } from "../packages/contracts/index";
import WordPicture from "./WordPicture";
import WordAudioButton from "./WordAudioButton";
export default function PictureFeedback({ receipt }: { receipt: Receipt }) {
  const picture = receipt.correctedPicture;
  if (!picture) return null;
  return (
    <div className="picture-feedback">
      <p>听到的是</p>
      <div>
        <WordPicture id={picture.wordId} />
        <div>
          <strong lang="en">{picture.word}</strong>
          <p>{picture.label}</p>
          <WordAudioButton url={picture.audioUrl} picture label="再听单词" />
        </div>
      </div>
      <details>
        <summary>给大人：这一题的解释</summary>
        <p>{receipt.feedback}</p>
      </details>
    </div>
  );
}
