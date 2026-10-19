import type { WordCard } from "../packages/contracts/index";
import {
  wordObjectKind,
  wordObjectNote,
  type WordObjectKind,
} from "./wordObjects";
import WordPicture, { pictureWord } from "./WordPicture";
export function WordObjectFlat({ kind }: { kind: WordObjectKind }) {
  return (
    <svg viewBox="0 0 280 200" className="word-object-flat" aria-hidden="true">
      <ellipse cx="140" cy="178" rx="92" ry="12" fill="#dac7ac" />
      {kind === "apple" ? (
        <g>
          <path
            d="M140 69c-51-25-81 21-52 74 18 34 34 23 52 23s34 11 52-23c29-53-1-99-52-74Z"
            fill="#ee6d58"
          />
          <path
            d="m140 72 3-30"
            stroke="#986344"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <ellipse
            cx="162"
            cy="48"
            rx="22"
            ry="9"
            fill="#69be85"
            transform="rotate(-20 162 48)"
          />
        </g>
      ) : kind === "banana" ? (
        <g>
          <path d="M59 87q70 91 164-21c-4 80-105 138-164 21Z" fill="#ffd05a" />
          <path
            d="m60 85-4-9m167-10 3-12"
            stroke="#a67849"
            strokeWidth="9"
            strokeLinecap="round"
          />
        </g>
      ) : kind === "book" ? (
        <g>
          <rect x="79" y="34" width="122" height="136" rx="12" fill="#4d7ebe" />
          <rect x="89" y="43" width="106" height="121" rx="8" fill="#fff2d1" />
          <rect x="84" y="33" width="109" height="123" rx="10" fill="#6c9fdb" />
          <circle cx="139" cy="82" r="23" fill="#ffd05a" />
        </g>
      ) : kind === "pencil" ? (
        <g transform="rotate(20 140 100)">
          <rect x="125" y="45" width="30" height="99" fill="#ffc954" />
          <rect x="124" y="30" width="32" height="17" rx="2" fill="#b0b9cb" />
          <rect x="125" y="15" width="30" height="19" rx="9" fill="#ed9e9e" />
          <path d="m125 144 15 29 15-29Z" fill="#dcb38b" />
          <path d="m135 164 5 9 5-9Z" fill="#35445a" />
        </g>
      ) : kind === "fish" ? (
        <g>
          <path d="m91 104-48-36q-14 35 0 70Z" fill="#ed8561" />
          <ellipse cx="146" cy="104" rx="67" ry="43" fill="#f5ad50" />
          <path d="m109 78 17-30q29 9 39 25" fill="#ed8561" />
          <ellipse cx="174" cy="95" rx="7" ry="9" fill="#27334b" />
          <circle cx="172" cy="92" r="2.5" fill="white" />
          <ellipse
            cx="128"
            cy="123"
            rx="22"
            ry="10"
            fill="#ed8561"
            transform="rotate(20 128 123)"
          />
        </g>
      ) : (
        <g>
          <rect x="71" y="50" width="138" height="115" rx="27" fill="#f28a3d" />
          <path
            d="M91 73h35"
            stroke="#ffc083"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}
export default function WordObjectScene({ word }: { word: WordCard }) {
  const kind = wordObjectKind(word);
  if (!kind) return null;
  return (
    <div className="word-object-scene illustrated-word-object">
      <div className="word-object-viewport" aria-hidden="true">
        {pictureWord(word.id) ? (
          <WordPicture id={word.id} />
        ) : (
          <WordObjectFlat kind={kind} />
        )}
      </div>
      <p className="word-object-caption">词语插画 · {wordObjectNote(kind)}</p>
    </div>
  );
}
