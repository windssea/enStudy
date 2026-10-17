export type View =
  | "map"
  | "topics"
  | "patterns"
  | "words"
  | "review"
  | "parent"
  | "talk"
  | "workshops"
  | "exercise"
  | "lesson"
  | "offline";
export type Route = {
  view: View;
  lessonId: string | null;
  trainingTopic?: string;
  patternId?: string;
};
export function parseRoute(fragment: string): Route {
  const hash = fragment.replace(/^#/, "");
  for (const [prefix, view, field] of [
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
    "parent",
    "talk",
    "workshops",
    "exercise",
    "offline",
  ];
  return {
    view: views.includes(hash as View) ? (hash as View) : "map",
    lessonId: null,
  };
}
