import type { SpatialVisual } from "../packages/domain/spatial";
export default function SpatialFlat({
  data,
  placed,
}: {
  data: SpatialVisual;
  placed: boolean;
}) {
  const [x, y] = !placed
    ? [48, 186]
    : data.relation === "in"
      ? [300, 154]
      : data.relation === "on"
        ? [125, 99]
        : [125, 185];
  return (
    <svg viewBox="0 0 400 240" className="concept-flat" aria-hidden="true">
      <ellipse cx="200" cy="212" rx="185" ry="12" fill="#e7d6b9" />
      <rect x="66" y="125" width="13" height="85" rx="5" fill="#596c90" />
      <rect x="174" y="125" width="13" height="85" rx="5" fill="#596c90" />
      <rect
        x="58"
        y="114"
        width="137"
        height="15"
        rx="6"
        fill="#f0bf6d"
        stroke="#735422"
        strokeWidth="2"
      />
      <path
        d="M250 198V133Q250 125 258 125H342Q350 125 350 133V198Z"
        fill="#b9eaf2"
        stroke="#286b82"
        strokeWidth="3"
      />
      <path
        d="M263 192V138H337V192"
        fill="#e9f8fa"
        stroke="#69c6dc"
        strokeWidth="7"
      />
      <circle
        cx={x}
        cy={y}
        r="15"
        fill="#f48974"
        stroke="#933e2d"
        strokeWidth="2"
      />
      <path d={`M${x - 14} ${y}H${x + 14}`} stroke="#fff6dc" strokeWidth="3" />
      <rect
        x="250"
        y="184"
        width="100"
        height="15"
        rx="4"
        fill="#69c6dc"
        stroke="#286b82"
        strokeWidth="2"
      />
      <text x="125" y="231" textAnchor="middle" fontSize="16" fill="#172b4d">
        桌子 table
      </text>
      <text x="300" y="231" textAnchor="middle" fontSize="16" fill="#172b4d">
        盒子 box
      </text>
    </svg>
  );
}
