import art from "../public/content/learning-art.v1.json";

export default function TimelineStory({
  labId,
  caseId,
}: {
  labId: string;
  caseId: string;
}) {
  if (labId !== "tense.past-simple") return null;
  const scene =
    caseId === "last-week" ? art.assets.stone : art.assets.telescope;
  return (
    <div className="timeline-story" data-art-style={art.styleId}>
      <img
        src={scene.url}
        width={scene.width}
        height={scene.height}
        alt={scene.alt}
        decoding="async"
      />
      <span className="timeline-time-label">
        {caseId === "last-week"
          ? "上周"
          : caseId === "question"
            ? "昨天？"
            : "昨天"}
      </span>
    </div>
  );
}
