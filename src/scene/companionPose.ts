import type { Object3D } from "three";
import type { CompanionId } from "../../packages/domain/companions";
import { applyFoxPose, type FoxPoseNodes } from "./foxModel";
import {
  companionGesture,
  gestureEnvelope,
  type CompanionGesture,
} from "./companionGestures";
export function applyCompanionPose(
  model: FoxPoseNodes & { root: Object3D },
  kind: CompanionId,
  options: Parameters<typeof applyFoxPose>[1] & { gesture?: CompanionGesture },
) {
  const { time, paused, idle, gesture: action } = options;
  const custom = action !== undefined && action !== "wave";
  const age = custom ? 10 : options.age;
  const leftArm = model.root.getObjectByName(
    kind === "fox" ? "left-cream-paw" : "pikachu-left-paw",
  )?.parent;
  // Reset every affected degree of freedom before applying an absolute pose;
  // rapid interruption and a return from speech/quiet cannot accumulate drift.
  model.body.scale.set(1, 1, 1);
  model.head.rotation.x = 0;
  model.head.rotation.y = 0;
  model.arm.rotation.x = 0;
  model.tail.rotation.y = 0;
  if (leftArm) leftArm.rotation.z = kind === "fox" ? -0.42 : -0.35;
  applyFoxPose(model, { ...options, age });
  if (kind === "pikachu") {
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
  if (!custom) return;
  const duration = companionGesture(action).duration / 1000;
  const p = Math.max(0, Math.min(1, options.age / duration));
  const envelope = paused ? 0.65 : gestureEnvelope(options.age, duration);
  model.body.position.y = 0;
  model.body.rotation.z = 0;
  model.arm.rotation.z = 0.35;
  model.head.rotation.z = 0;
  if (action === "nod") {
    model.head.rotation.x = paused
      ? 0.14
      : Math.sin(p * Math.PI * 4) * 0.18 * envelope;
  } else if (action === "stretch") {
    model.body.scale.set(
      1 - envelope * 0.025,
      1 + envelope * 0.035,
      1 - envelope * 0.02,
    );
    // Scale about the grounded foot plane, including the fox's corrected origin.
    model.body.position.y = (model.body.scale.y - 1) * model.root.position.y;
    model.arm.rotation.z = 0.35 + envelope * 1.3;
    if (leftArm)
      leftArm.rotation.z = (kind === "fox" ? -0.42 : -0.35) - envelope * 1.3;
    model.head.rotation.x = -envelope * 0.07;
    // These clay eyes are fitted to a curved face. Squashing the fitted mesh
    // cuts it into the face; keep the eyes attached while the limbs stretch.
    model.eyes.scale.y = 1;
  } else if (action === "tail") {
    model.tail.rotation.y = paused
      ? 0.22
      : Math.sin(p * Math.PI * 4) * 0.32 * envelope;
    model.tail.rotation.z += paused
      ? 0.06
      : Math.sin(p * Math.PI * 4) * 0.1 * envelope;
  }
}
