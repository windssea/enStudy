import type { Object3D } from "three";
import type { CompanionId } from "../../packages/domain/companions";
import { applyFoxPose, type FoxPoseNodes } from "./foxModel";
export function applyCompanionPose(
  model: FoxPoseNodes & { root: Object3D },
  kind: CompanionId,
  options: Parameters<typeof applyFoxPose>[1],
) {
  applyFoxPose(model, options);
  if (kind !== "pikachu") return;
  const { time, age, paused, idle } = options;
  const gesture =
    paused || age < 0 || age > 0.9 ? 0 : Math.sin((Math.PI * age) / 0.9);
  // Keep both feet on the pedestal during idle; only the short gesture lifts.
  model.body.position.y =
    gesture * (options.reaction === "incorrect" ? 0.025 : 0.11);
  model.tail.rotation.z =
    0.015 +
    (paused ? 0 : (idle ? Math.sin(time * 1.4) * 0.035 : 0) + gesture * 0.09);
  for (const side of [-1, 1]) {
    const ear = model.root.getObjectByName(`pikachu-ear-${side}`);
    if (ear)
      ear.rotation.z =
        side * -0.32 +
        (paused
          ? 0
          : side *
            (gesture * 0.04 + (idle ? Math.sin(time * 1.1) * 0.012 : 0)));
  }
}
