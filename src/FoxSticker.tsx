import type { Reaction } from "./SceneStage";

/** Same original character as the mesh model; used while WebGL loads or is off. */
export default function FoxSticker({
  reaction = "thinking",
  turned = false,
}: {
  reaction?: Reaction;
  turned?: boolean;
}) {
  if (turned)
    return (
      <g data-view="back">
        <ellipse cx="79" cy="190" rx="56" ry="8" fill="#27334b" opacity=".12" />
        <rect x="50" y="168" width="27" height="23" rx="10" fill="#285da1" />
        <rect x="83" y="168" width="27" height="23" rx="10" fill="#285da1" />
        <ellipse cx="80" cy="143" rx="34" ry="38" fill="#f5823f" />
        <path
          d="M34 54 31 12q1-12 10-4l29 32m21-1 29-32q9-8 10 4l-3 43"
          fill="#f5823f"
          stroke="#e36e32"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <ellipse cx="80" cy="76" rx="52" ry="44" fill="#f5823f" />
        <path d="M51 114q30 14 57 0l-4 11q-26 9-49-1Z" fill="#188f9b" />
        <rect
          x="51"
          y="121"
          width="59"
          height="53"
          rx="16"
          fill="#75c9b3"
          stroke="#3ca08f"
          strokeWidth="3"
        />
        <path
          d="M57 136q24 15 47 0"
          fill="none"
          stroke="#3ca08f"
          strokeWidth="3"
        />
        <circle cx="81" cy="147" r="4" fill="#ffd05a" />
        <path d="M81 172c40 19 62-9 46-38-1 20-21 14-32 17Z" fill="#f5823f" />
        <path d="M122 150c8 3 12-4 5-16-1 10-6 13-11 14Z" fill="#fff0d3" />
      </g>
    );
  return (
    <g>
      <ellipse cx="79" cy="190" rx="56" ry="8" fill="#27334b" opacity=".12" />
      <path d="M43 170C-5 169 2 110 27 105c-5 23 24 20 33 37Z" fill="#f5823f" />
      <path
        d="M10 124c-7-13 2-27 17-19-4 12 1 18 9 23-12 8-17 2-26-4Z"
        fill="#fff0d3"
      />
      <rect
        x="101"
        y="107"
        width="33"
        height="50"
        rx="13"
        fill="#75c9b3"
        stroke="#3ca08f"
        strokeWidth="3"
      />
      <path
        d="M43 143c-8 8-12 20-7 23 8 5 12-9 16-14m55-15c8-16 18-19 22-13 5 8-8 14-13 24"
        fill="none"
        stroke="#f5823f"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <rect x="50" y="168" width="27" height="23" rx="10" fill="#285da1" />
      <rect x="83" y="168" width="27" height="23" rx="10" fill="#285da1" />
      <path
        d="M54 184h17m18 0h16"
        stroke="#fff0d3"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="80" cy="143" rx="34" ry="38" fill="#f5823f" />
      <ellipse cx="80" cy="147" rx="23" ry="26" fill="#fff0d3" />
      <path
        d="M34 54 31 12q1-12 10-4l29 32m21-1 29-32q9-8 10 4l-3 43"
        fill="#f5823f"
        stroke="#e36e32"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="m40 42-2-24 19 23m48 0 18-23-1 26" fill="#ed928a" />
      <ellipse cx="80" cy="76" rx="52" ry="44" fill="#f5823f" />
      <path
        d="M29 77q10-24 33-15l18 21 18-21q25-9 33 15c0 29-25 40-51 40S30 104 29 77Z"
        fill="#fff0d3"
      />
      {[-1, 1].map((side) => (
        <g key={side}>
          <ellipse cx={80 + side * 22} cy="76" rx="6" ry="9" fill="#27334b" />
          <circle cx={78 + side * 22} cy="73" r="2.5" fill="white" />
          <ellipse cx={80 + side * 36} cy="88" rx="7" ry="3" fill="#ed928a" />
        </g>
      ))}
      <path d="M73 87q7-6 14 0l-7 7Z" fill="#27334b" strokeLinejoin="round" />
      <path
        d={reaction === "incorrect" ? "M74 101q6 2 12 0" : "M71 99q9 12 18 0"}
        fill="none"
        stroke="#27334b"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M51 114q30 14 57 0l-4 11q-26 9-49-1Z" fill="#188f9b" />
      <path d="m102 121 9 24-17-3 2-20Z" fill="#188f9b" />
      <circle cx="77" cy="148" r="7" fill="#ffd05a" />
      <circle cx="77" cy="148" r="3" fill="#fff0d3" />
    </g>
  );
}
