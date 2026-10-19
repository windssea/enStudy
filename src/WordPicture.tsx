import media from "../public/content/picture-words.v1.json";
import { useId } from "react";
const colours: Record<string, string> = {
  red: "#E63C42",
  blue: "#2874D7",
  green: "#29974C",
  yellow: "#FFE052",
  orange: "#F39829",
  purple: "#8C4CC3",
  pink: "#F18FBA",
  black: "#202735",
  white: "#FFFFFF",
  brown: "#865839",
  grey: "#8E959D",
};
const shapes: Record<string, React.ReactNode> = {
  circle: <circle cx="80" cy="80" r="52" />,
  square: <rect x="28" y="28" width="104" height="104" rx="3" />,
  triangle: <path d="M80 22 142 135H18Z" />,
  rectangle: <rect x="15" y="48" width="130" height="65" rx="3" />,
  oval: <ellipse cx="80" cy="80" rx="65" ry="36" />,
  star: <path d="m80 16 19 41 45 5-33 31 9 45-40-23-40 23 9-45-33-31 45-5Z" />,
  heart: <path d="M80 135 25 82C-8 33 47 8 80 48c33-40 88-15 55 34Z" />,
  line: <path d="M20 80h120" strokeWidth="9" />,
  dot: <circle cx="80" cy="80" r="12" />,
};
export const pictureWord = (id: string) => media.words.find((w) => w.id === id);
export default function WordPicture({
  id,
  label,
}: {
  id: string;
  label?: string;
}) {
  const clipId = useId();
  const word = pictureWord(id);
  if (!word)
    return (
      <span
        className="word-picture-missing"
        role="img"
        aria-label={label ?? "图片未准备好"}
      >
        ?
      </span>
    );
  if ("atlas" in word) {
    const atlas = media.atlases.find((a) => a.id === word.atlas)!;
    const crop = word.crop!;
    return (
      <svg
        role="img"
        aria-label={label ?? word.meaning}
        className="word-picture word-picture-atlas"
        viewBox={crop.join(" ")}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={crop[0]} y={crop[1]} width={crop[2]} height={crop[3]} />
          </clipPath>
        </defs>
        <image
          clipPath={`url(#${clipId})`}
          href={atlas.url}
          x="0"
          y="0"
          width={atlas.coordinateSpace}
          height={atlas.coordinateSpace}
        />
      </svg>
    );
  }
  const name = word.word;
  return (
    <svg
      className="word-picture word-picture-vector"
      role="img"
      aria-label={label ?? word.meaning}
      viewBox="0 0 160 160"
    >
      {colours[name] ? (
        <circle
          cx="80"
          cy="80"
          r="52"
          fill={colours[name]}
          stroke="#52647A"
          strokeWidth="3"
        />
      ) : (
        <g
          fill="#397BDB"
          stroke="#173C77"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          {shapes[name]}
        </g>
      )}
    </svg>
  );
}
