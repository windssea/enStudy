import CompanionSticker from "./CompanionSticker";
export default function FlatMap({ turned = false }: { turned?: boolean }) {
  return (
    <svg className="flat-map" viewBox="0 0 700 350" aria-hidden="true">
      <ellipse cx="350" cy="275" rx="290" ry="45" fill="#d4eaf5" />
      <path
        d="M155 240Q260 135 350 185T550 240"
        stroke="#e3b86b"
        strokeWidth="12"
        strokeDasharray="8 8"
        fill="none"
      />
      {[
        { x: 155, y: 225, color: "#a4dcc0" },
        { x: 350, y: 160, color: "#c3e5a7" },
        { x: 550, y: 225, color: "#a5d7e4" },
      ].map(({ x, y, color }) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <path d="M-78 0q0 63 78 63T78 0Z" fill="#d7ae88" />
          <ellipse cy="7" rx="80" ry="34" fill="#e9c7a0" />
          <ellipse rx="83" ry="35" fill={color} />
          <path d="M-35-8v-53l25-20 25 20v53Z" fill="#fff1bf" />
          <path d="m-48-55 39-35 36 35Z" fill="#ee9b86" />
          <rect x="-18" y="-32" width="12" height="22" rx="5" fill="#679de0" />
        </g>
      ))}
      <g transform="translate(124 109) scale(.57)">
        <CompanionSticker turned={turned} />
      </g>
      <g transform="translate(480 74)">
        <ellipse rx="32" ry="40" fill="#ef9f87" />
        <path
          d="m-18 30 5 33h26l5-33"
          fill="none"
          stroke="#916c46"
          strokeWidth="3"
        />
        <rect x="-16" y="59" width="32" height="19" rx="4" fill="#d5a96b" />
      </g>
      <g fill="white">
        <ellipse cx="185" cy="73" rx="60" ry="18" />
        <ellipse cx="198" cy="60" rx="25" ry="23" />
        <ellipse cx="560" cy="145" rx="50" ry="16" />
      </g>
    </svg>
  );
}
