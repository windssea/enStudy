import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/** Cap decorative animation at 30 fps; quiet/offscreen scenes do not run a loop. */
export function RenderActivity({ active }: { active: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
    if (!active) return;
    let frame = 0,
      previous = -Infinity;
    const tick = (now: number) => {
      if (now - previous >= 1000 / 30) {
        previous = now;
        invalidate();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, invalidate]);
  return null;
}
