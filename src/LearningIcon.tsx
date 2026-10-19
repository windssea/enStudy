import type { ReactNode } from "react";
export default function LearningIcon({ kind = "book" }: { kind?: string }) {
  const paths: Record<string, ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v10H3Z" />
        <path d="M9 20v-7h6v7" />
      </>
    ),
    book: (
      <>
        <path d="M12 5C8 3 3 4 3 4v15s5-1 9 1c4-2 9-1 9-1V4s-5-1-9 1ZM12 5v15" />
        <path d="M6 8h3m-3 4h3m6-4h3m-3 4h3" />
      </>
    ),
    words: (
      <>
        <rect x="3" y="5" width="15" height="16" rx="2" />
        <path d="M8 5V2h13v15h-3M7 16l3-7 3 7m-5-2h4" />
      </>
    ),
    topics: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M17.5 14v7M14 17.5h7" />
      </>
    ),
    patterns: (
      <>
        <path d="M21 14a3 3 0 0 1-3 3H9l-5 4v-4a3 3 0 0 1-2-3V6a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3Z" />
        <path d="M7 8h9M7 12h6" />
      </>
    ),
    review: (
      <>
        <path d="M3 11a9 9 0 1 1 3 8M3 4v7h7" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    phonics: (
      <>
        <path d="M5 10v4M9 6v12M13 3v18M17 7v10M21 10v4" />
      </>
    ),
    writing: (
      <>
        <path d="m16 3 5 5-12 12-6 1 1-6ZM13 6l5 5M3 21h18" />
      </>
    ),
    talk: (
      <>
        <rect x="8" y="2" width="8" height="13" rx="4" />
        <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
      </>
    ),
    workshops: (
      <>
        <path d="m12 3 9 5-9 5-9-5ZM3 8v9l9 5 9-5V8M12 13v9" />
      </>
    ),
    offline: (
      <>
        <rect x="3" y="3" width="18" height="14" rx="2" />
        <path d="M8 21h8M12 17v4M8 10l3 3 5-6" />
      </>
    ),
    play: <path d="m8 4 13 8-13 8Z" fill="currentColor" stroke="none" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    speaker: (
      <>
        <path d="m12 4-6 5H2v6h4l6 5ZM16 8a6 6 0 0 1 0 8m3-12a11 11 0 0 1 0 16" />
      </>
    ),
    person: (
      <>
        <circle cx="12" cy="7" r="3" />
        <path d="M5 21v-3a7 7 0 0 1 14 0v3" />
      </>
    ),
    check: <path d="m5 12 4 4L20 5" />,
  };
  return (
    <svg
      className="learning-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[kind] ?? paths.book}
    </svg>
  );
}
