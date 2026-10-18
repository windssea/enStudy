import {
  companionGestures,
  type CompanionGesture,
} from "./scene/companionGestures";

export default function CompanionActions({
  onPlay,
}: {
  onPlay: (gesture: CompanionGesture) => void;
}) {
  return (
    <div className="companion-gestures" role="group" aria-label="伙伴小动作">
      {companionGestures
        .filter((gesture) => gesture.id !== "wave")
        .map((gesture) => (
          <button
            className="scene-play"
            type="button"
            key={gesture.id}
            onClick={() => onPlay(gesture.id)}
          >
            {gesture.label}
          </button>
        ))}
    </div>
  );
}
