export type View =
  | "home"
  | "map"
  | "topics"
  | "patterns"
  | "words"
  | "review"
  | "mistakes"
  | "parent"
  | "talk"
  | "workshops"
  | "exercise"
  | "lesson"
  | "offline"
  | "writing"
  | "phonics";
export type Route = {
  view: View;
  lessonId: string | null;
  trainingTopic?: string;
  writingPrompt?: string;
  phonicsStageId?: string;
  patternId?: string;
  mapScope?: { grade: number; term: "A" | "B" };
};
export const mapFragment = (grade: number, term: string) => {
  if (
    !Number.isInteger(grade) ||
    grade < 1 ||
    grade > 6 ||
    !["A", "B"].includes(term)
  )
    throw new Error("Unknown course map scope.");
  return `#map?grade=${grade}&term=${term}`;
};
export function parseRoute(fragment: string): Route {
  const hash = fragment.replace(/^#/, "");
  if (!hash || hash === "home") return { view: "home", lessonId: null };
  if (hash.startsWith("map?")) {
    const params = new URLSearchParams(hash.slice(4));
    const rawGrade = params.get("grade"),
      term = params.get("term");
    return {
      view: "map",
      lessonId: null,
      ...(rawGrade && /^[1-6]$/.test(rawGrade) && (term === "A" || term === "B")
        ? { mapScope: { grade: Number(rawGrade), term } }
        : {}),
    };
  }
  for (const [prefix, view, field] of [
    ["phonics=", "phonics", "phonicsStageId"],
    ["writing=", "writing", "writingPrompt"],
    ["training=", "topics", "trainingTopic"],
    ["pattern=", "patterns", "patternId"],
    ["lesson=", "lesson", "lessonId"],
  ] as const) {
    if (!hash.startsWith(prefix)) continue;
    try {
      const id = decodeURIComponent(hash.slice(prefix.length));
      if (!id || id.length > 180 || /[\u0000-\u001f\u007f]/.test(id))
        return { view: view === "lesson" ? "map" : view, lessonId: null };
      return { view, lessonId: null, [field]: id };
    } catch {
      return { view: view === "lesson" ? "map" : view, lessonId: null };
    }
  }
  const views: View[] = [
    "topics",
    "patterns",
    "words",
    "review",
    "mistakes",
    "parent",
    "talk",
    "workshops",
    "exercise",
    "offline",
    "writing",
    "phonics",
  ];
  return {
    view: views.includes(hash as View) ? (hash as View) : "map",
    lessonId: null,
  };
}
