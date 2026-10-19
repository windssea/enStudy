export type ToyKind =
  | "home"
  | "map"
  | "words"
  | "topics"
  | "patterns"
  | "review"
  | "parent"
  | "play"
  | "check"
  | "next"
  | "help"
  | "wave"
  | "clock"
  | "search"
  | "change"
  | "speaker";
export default function ToyPicture({ kind }: { kind: ToyKind }) {
  const art = {
    wave: (
      <>
        <path
          fill="#FFD166"
          stroke="#B97B36"
          strokeWidth="3"
          d="M43 74V30q0-12 10-12t10 12v27-37q0-12 10-12t10 12v37-31q0-12 10-12t10 12v38-19q0-12 10-12t10 12v46q0 38-34 43H72q-20-3-31-22L23 81q-9-15 2-20t18 13Z"
        />
        <path
          fill="none"
          stroke="#6BBAE3"
          strokeWidth="6"
          strokeLinecap="round"
          d="m12 22 12 9m0-24 6 13m91-7-7 11"
        />
      </>
    ),
    clock: (
      <>
        <circle cx="70" cy="70" r="55" fill="#96DAFF" />
        <circle cx="70" cy="70" r="43" fill="#fff" />
        <path
          stroke="#29445E"
          strokeWidth="8"
          strokeLinecap="round"
          d="M70 42v28l24 13"
        />
        <circle cx="70" cy="70" r="6" fill="#FF9A77" />
      </>
    ),
    search: (
      <>
        <rect x="14" y="14" width="77" height="96" rx="16" fill="#FFEAA0" />
        <path
          stroke="#D3A84E"
          strokeWidth="6"
          strokeLinecap="round"
          d="M30 37h43M30 53h25M30 69h32"
        />
        <path
          stroke="#B98B63"
          strokeWidth="19"
          strokeLinecap="round"
          d="m88 88 29 31"
        />
        <circle
          cx="78"
          cy="77"
          r="30"
          fill="#DFF4FC"
          fillOpacity=".85"
          stroke="#659BD5"
          strokeWidth="10"
        />
      </>
    ),
    change: (
      <>
        <rect x="11" y="20" width="43" height="43" rx="12" fill="#FF9A77" />
        <circle cx="100" cy="101" r="28" fill="#96DAFF" />
        <path
          fill="none"
          stroke="#7D60BE"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M70 33h34v29m-14-9 14 12 14-12M67 108H36V80m-14 9 14-12 14 12"
        />
      </>
    ),
    home: (
      <>
        <path fill="#FFA589" d="M20 63 70 18l50 45-12 11-38-34-38 34Z" />
        <rect x="35" y="63" width="70" height="59" rx="15" fill="#FFEAA0" />
        <path fill="#86CEDD" d="M60 122V90a10 10 0 0 1 20 0v32Z" />
        <circle cx="94" cy="84" r="9" fill="#fff" />
      </>
    ),
    map: (
      <>
        <ellipse cx="70" cy="115" rx="59" ry="15" fill="#88CFED" />
        <path fill="#64DCAE" d="M22 92q0-39 48-39t48 39q0 20-48 20T22 92" />
        <path
          fill="#FFEAA0"
          d="M48 104q1-22 19-29t-2-17l18-2q28 17 2 31t-17 20Z"
        />
        <path
          stroke="#B98B63"
          strokeWidth="8"
          strokeLinecap="round"
          d="M39 68V35"
        />
        <path fill="#FF9A77" d="M43 17v30l34-15Z" />
        <circle cx="101" cy="54" r="19" fill="#B3EDCE" />
        <path stroke="#B98B63" strokeWidth="6" d="M101 57v26" />
      </>
    ),
    words: (
      <>
        <rect
          x="17"
          y="35"
          width="83"
          height="92"
          rx="17"
          fill="#FFCB45"
          transform="rotate(-9 59 80)"
        />
        <rect
          x="44"
          y="16"
          width="79"
          height="94"
          rx="17"
          fill="#fff"
          stroke="#8DCDE6"
          strokeWidth="6"
          transform="rotate(7 83 63)"
        />
        <path
          fill="#FF8D79"
          d="M78 53c-30-17-35 24-17 37 8 7 14 0 18 0s12 7 20-1c20-20 6-49-21-36"
        />
        <path fill="#64BB80" d="M79 50c0-18 12-23 23-20-3 15-11 21-23 20" />
        <path
          fill="#29445E"
          d="m31 85 10 28h-7l-2-7h-9l-2 7h-7l10-28Zm-6 15h5l-2-9Z"
        />
      </>
    ),
    topics: (
      <>
        <rect x="14" y="70" width="54" height="55" rx="13" fill="#FFCB45" />
        <rect x="73" y="70" width="54" height="55" rx="13" fill="#96DAFF" />
        <rect x="43" y="10" width="55" height="55" rx="13" fill="#FFA589" />
        <circle cx="70" cy="37" r="12" fill="#fff" />
        <path fill="#fff" d="m41 83 15 28H26Z" />
        <path fill="#fff" d="M87 84h25v25H87Z" />
      </>
    ),
    patterns: (
      <>
        <path
          fill="#BCA3FF"
          d="M12 27q0-15 16-15h69q16 0 16 15v40q0 16-16 16H56L32 103V83h-4q-16 0-16-16Z"
        />
        <path
          fill="#96DAFF"
          d="M62 72h59q13 0 13 13v23q0 13-13 13h-5v15l-20-15H62q-13 0-13-13V85q0-13 13-13"
        />
        <circle cx="42" cy="47" r="7" fill="#fff" />
        <circle cx="66" cy="47" r="7" fill="#fff" />
        <circle cx="90" cy="47" r="7" fill="#fff" />
        <path
          stroke="#fff"
          strokeWidth="7"
          strokeLinecap="round"
          d="M70 96h41"
        />
      </>
    ),
    review: (
      <>
        <path fill="#FFA589" d="m42 90 10 38h39l10-38Z" />
        <path
          stroke="#548A53"
          strokeWidth="8"
          strokeLinecap="round"
          d="M71 91V46"
        />
        <path
          fill="#64DCAE"
          d="M68 77C30 85 27 49 27 49s38-4 41 28m7-14c-5-36 32-39 32-39s6 36-32 39"
        />
        <circle cx="69" cy="33" r="22" fill="#FFCB45" />
        <circle cx="69" cy="33" r="10" fill="#FF9A77" />
        <rect x="38" y="87" width="68" height="12" rx="6" fill="#E78362" />
      </>
    ),
    parent: (
      <>
        <circle cx="52" cy="40" r="22" fill="#FFE0B1" />
        <path fill="#8CB8D3" d="M17 120V90a35 35 0 0 1 70 0v30Z" />
        <circle cx="98" cy="69" r="17" fill="#FFE0B1" />
        <path fill="#FFCB45" d="M73 127v-21a25 25 0 0 1 50 0v21Z" />
        <path fill="#29445E" d="M30 32q3-30 31-13l13 21-10-3-7-15-15 16Z" />
      </>
    ),
    play: (
      <path
        fill="currentColor"
        d="M47 26q-6-4-6 5v78q0 9 8 4l64-38q8-5 0-10Z"
      />
    ),
    check: (
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="17"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m25 72 28 27 61-64"
      />
    ),
    next: (
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M23 70h90M80 36l34 34-34 34"
      />
    ),
    help: (
      <>
        <path fill="#FFCB45" d="M47 93V81a36 36 0 1 1 47 0v12Z" />
        <path
          stroke="#987432"
          strokeWidth="8"
          strokeLinecap="round"
          d="M49 105h43m-35 13h28"
        />
        <path
          fill="none"
          stroke="#fff"
          strokeWidth="6"
          strokeLinecap="round"
          d="M48 49q3-16 20-18"
        />
      </>
    ),
    speaker: (
      <>
        <path fill="currentColor" d="M19 52h23l31-25v86L42 88H19Z" />
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          d="M88 48q19 22 0 44m17-61q33 39 0 78"
        />
      </>
    ),
  };
  return (
    <svg
      className="toy-picture"
      viewBox="0 0 140 140"
      aria-hidden="true"
      focusable="false"
    >
      {art[kind]}
    </svg>
  );
}
