import { useContext } from "react";
import { CompanionContext } from "./CompanionContext";
import type { CompanionId } from "../packages/domain/companions";
import type { Reaction } from "./SceneStage";
import FoxSticker from "./FoxSticker";
import type { CompanionGesture } from "./scene/companionGestures";
export default function CompanionSticker({
  kind,
  turned = false,
  reaction = "thinking",
  gesture,
}: {
  kind?: CompanionId;
  turned?: boolean;
  reaction?: Reaction;
  gesture?: CompanionGesture;
}) {
  const current = useContext(CompanionContext);
  if ((kind ?? current) === "fox")
    return (
      <g
        data-gesture={gesture}
        transform={
          gesture === "stretch" ? "translate(-2 -5) scale(1.025)" : undefined
        }
      >
        <FoxSticker turned={turned} reaction={reaction} />
      </g>
    );
  return (
    <g
      data-companion="pikachu"
      data-view={turned ? "back" : "front"}
      data-gesture={gesture}
      transform={
        gesture === "stretch" ? "translate(-2 -5) scale(1.025)" : undefined
      }
    >
      <ellipse cx="80" cy="191" rx="57" ry="8" fill="#27313c" opacity=".12" />
      <path
        d="m106 156 13-20-8-17 30-19-11-13 35-23 17 24-31 17 10 16-28 16 10 17-25 15Z"
        fill="#ffda50"
        stroke="#e5b638"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <ellipse cx="63" cy="181" rx="23" ry="11" fill="#ffda50" />
      <ellipse cx="99" cy="181" rx="23" ry="11" fill="#ffda50" />
      <ellipse cx="80" cy="144" rx="36" ry="38" fill="#ffda50" />
      {turned && (
        <g fill="#a67446">
          <rect x="52" y="130" width="55" height="9" rx="4" />
          <rect x="53" y="149" width="52" height="9" rx="4" />
        </g>
      )}
      <path
        d="M43 145q-4 19-12 17m78-18q4 18 10 15"
        fill="none"
        stroke="#ffda50"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <g transform="rotate(-18 49 61)">
        <path d="M39 63q-3-40 9-59 13 19 11 59Z" fill="#ffda50" />
        <path d="M41 26q2-14 7-22 6 9 9 22Z" fill="#393744" />
      </g>
      <g transform="rotate(18 109 61)">
        <path d="M99 63q-3-34 13-51 10-7 16-3-13 19-9 54Z" fill="#ffda50" />
        <path d="M103 28q4-13 9-16 10-7 16-3-8 11-12 24Z" fill="#393744" />
      </g>
      <ellipse cx="80" cy="82" rx="52" ry="43" fill="#ffda50" />
      <path d="M48 119q32 12 64 0l-2 8q-30 10-60-1Z" fill="#4ba99a" />
      {!turned ? (
        <g>
          <path d="M58 125q22 6 44 0L83 146q-3 3-6 0Z" fill="#4ba99a" />
          <circle cx="80" cy="133" r="3" fill="#fffaf0" />
        </g>
      ) : (
        <path d="m103 125 8 19-14-2 1-17Z" fill="#4ba99a" />
      )}
      {!turned && (
        <>
          <ellipse cx="44" cy="91" rx="10" ry="8" fill="#ef6b5e" />
          <ellipse cx="116" cy="91" rx="10" ry="8" fill="#ef6b5e" />
          {[-1, 1].map((side) => (
            <g key={side}>
              <ellipse
                cx={80 + side * 21}
                cy="77"
                rx="6"
                ry="9"
                fill="#27313c"
              />
              <ellipse
                cx={78 + side * 21}
                cy="74"
                rx="2"
                ry="3"
                fill="#fffaf0"
              />
            </g>
          ))}
          <ellipse cx="80" cy="91" rx="3" ry="2" fill="#27313c" />
          <path
            d={
              reaction === "incorrect"
                ? "M72 102h16"
                : "M68 101q6 10 12 0 6 10 12 0"
            }
            fill="none"
            stroke="#27313c"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      )}
    </g>
  );
}
