import { useContext, useState } from "react";
import { CompanionContext } from "./CompanionContext";
import FoxSticker from "./FoxSticker";
import { clayArt } from "./clayArt";
import type { CompanionId } from "../packages/domain/companions";
export default function PaintedCompanion({ kind }: { kind?: CompanionId }) {
  const chosen = useContext(CompanionContext),
    current = kind ?? chosen;
  const asset = current === "fox" ? clayArt.fox : clayArt.bear;
  const [failed, setFailed] = useState<string>();
  return failed !== asset.url ? (
    <img
      className="painted-companion"
      src={asset.url}
      width={asset.width}
      height={asset.height}
      alt=""
      draggable={false}
      onError={() => setFailed(asset.url)}
    />
  ) : (
    <svg className="painted-companion" viewBox="0 0 190 205" aria-hidden="true">
      {current === "fox" ? (
        <FoxSticker />
      ) : (
        <g data-companion="bear">
          <circle cx="48" cy="49" r="23" fill="#dba24d" />
          <circle cx="140" cy="49" r="23" fill="#dba24d" />
          <ellipse cx="94" cy="145" rx="52" ry="54" fill="#e4af5d" />
          <circle cx="94" cy="79" r="63" fill="#edbc6d" />
          <ellipse cx="94" cy="103" rx="34" ry="25" fill="#fff0cb" />
          <circle cx="70" cy="76" r="7" fill="#45332b" />
          <circle cx="119" cy="76" r="7" fill="#45332b" />
          <ellipse cx="94" cy="94" rx="10" ry="7" fill="#664430" />
          <path
            d="M78 111q16 15 32 0"
            fill="none"
            stroke="#664430"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="m53 130 41 33 41-33" fill="#7ec4aa" />
          <ellipse cx="60" cy="185" rx="24" ry="15" fill="#e4af5d" />
          <ellipse cx="128" cy="185" rx="24" ry="15" fill="#e4af5d" />
        </g>
      )}
    </svg>
  );
}
