import CompanionSticker from "./CompanionSticker";
import { mapColors } from "./scene/mapRoute";
import type { CourseMapStation } from "./courseMapModel";
const positions = [
  [135, 140],
  [350, 140],
  [565, 140],
  [565, 335],
  [350, 335],
  [135, 335],
];
export default function FlatMap({
  turned = false,
  selected = 0,
  stations,
}: {
  turned?: boolean;
  selected?: number;
  stations?: CourseMapStation[];
}) {
  const [partnerX, partnerY] = positions[selected] ?? positions[0];
  return (
    <svg className="flat-map" viewBox="0 0 700 440" aria-hidden="true">
      <ellipse cx="350" cy="375" rx="310" ry="45" fill="#d4eaf5" />
      <path
        d="M135 150H565Q650 150 650 225V270Q650 345 565 345H135"
        stroke="#e3b86b"
        strokeWidth="16"
        strokeDasharray="8 8"
        fill="none"
      />
      {positions
        .slice(0, stations ? Math.min(6, stations.length) : 6)
        .map(([x, y], index) => (
          <g key={index} transform={`translate(${x} ${y})`}>
            <path d="M-78 0q0 63 78 63T78 0Z" fill="#d7ae88" />
            <ellipse cy="7" rx="80" ry="34" fill="#e9c7a0" />
            <ellipse
              rx="83"
              ry="35"
              fill={mapColors[index]}
              stroke={index === selected ? "#2557d6" : "#fffaf1"}
              strokeWidth={index === selected ? 4 : 2}
            />
            {index === 0 ? (
              <g>
                <path d="M-35-8v-53l25-20 25 20v53Z" fill="#fff1bf" />
                <path d="m-48-55 39-35 36 35Z" fill="#ee9b86" />
                <rect
                  x="-18"
                  y="-32"
                  width="12"
                  height="22"
                  rx="5"
                  fill="#679de0"
                />
              </g>
            ) : index === 1 ? (
              <g>
                <rect
                  x="-45"
                  y="-62"
                  width="25"
                  height="57"
                  rx="5"
                  fill="#68a9cf"
                />
                <rect
                  x="-16"
                  y="-52"
                  width="25"
                  height="47"
                  rx="5"
                  fill="#f09a82"
                />
              </g>
            ) : index === 2 ? (
              <g fill="#fffaf0">
                <ellipse cx="-16" cy="-24" rx="22" ry="28" />
                <circle cx="-16" cy="-52" r="22" />
                <ellipse cx="-27" cy="-80" rx="7" ry="24" />
                <ellipse cx="-7" cy="-80" rx="7" ry="24" />
                <circle cx="-24" cy="-55" r="2.5" fill="#27334b" />
                <circle cx="-8" cy="-55" r="2.5" fill="#27334b" />
              </g>
            ) : index === 3 ? (
              <g>
                <rect
                  x="-45"
                  y="-29"
                  width="70"
                  height="17"
                  rx="5"
                  fill="#bb8d62"
                />
                <path
                  d="M-35-33v-18q12-7 25 0 12-7 25 0v18q-13-6-25 0-13-6-25 0"
                  fill="#fff1d6"
                  stroke="#68a9cf"
                  strokeWidth="4"
                />
              </g>
            ) : index === 4 ? (
              <g>
                <path
                  d="m-20-45-18 36m18-36L-4-9"
                  stroke="#bb8d62"
                  strokeWidth="7"
                />
                <rect
                  x="-48"
                  y="-61"
                  width="70"
                  height="23"
                  rx="9"
                  fill="#68a9cf"
                  transform="rotate(-20 -20 -45)"
                />
              </g>
            ) : (
              <g>
                <path d="m-32-5 8-65h24l8 65" fill="#fff1d6" />
                <path d="M-26-37H4" stroke="#f09a82" strokeWidth="9" />
                <circle cx="-12" cy="-74" r="14" fill="#ffd166" />
                <path
                  d="M-33-88H9"
                  stroke="#f09a82"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
              </g>
            )}
            <rect
              x="-64"
              y="8"
              width="36"
              height="30"
              rx="8"
              fill={index === selected ? "#96daff" : "#fff1d6"}
            />
            <text
              x="-46"
              y="30"
              textAnchor="middle"
              fill="#172b4d"
              fontSize="23"
              fontFamily="sans-serif"
              fontWeight="700"
            >
              {stations?.[index].number ?? index + 1}
            </text>
            {stations?.[index].total &&
            stations[index].practised === stations[index].total ? (
              <text x="52" y="14" fill="#146a4b" fontSize="26">
                ✓
              </text>
            ) : null}
          </g>
        ))}
      <g transform={`translate(${partnerX - 18} ${partnerY - 112}) scale(.55)`}>
        <CompanionSticker turned={turned} />
      </g>
    </svg>
  );
}
