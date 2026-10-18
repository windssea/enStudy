import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { createSpatialModel } from "./scene/spatialModel";
import {
  spatialHome,
  spatialPath,
  spatialPosition,
  spatialTarget,
  type SpatialPoint,
  type SpatialVisual,
} from "../packages/domain/spatial";
import { conceptProgress } from "./conceptMotion";

export default function SpatialModels({
  data,
  placed,
  revision,
  moving,
}: {
  data: SpatialVisual;
  placed: boolean;
  revision: number;
  moving: boolean;
}) {
  const model = useMemo(() => createSpatialModel(), []);
  const target = placed ? spatialTarget(data.relation) : spatialHome;
  const motion = useRef({ revision, start: -100, path: [target] });
  useEffect(() => () => model.dispose(), [model]);
  useFrame(({ clock }) => {
    if (motion.current.revision !== revision)
      motion.current = {
        revision,
        start: clock.elapsedTime,
        path: spatialPath(
          model.ball.position.toArray() as SpatialPoint,
          target,
        ),
      };
    const progress = conceptProgress(
      (clock.elapsedTime - motion.current.start) * 1000,
      !moving,
    );
    model.ball.position.set(...spatialPosition(motion.current.path, progress));
  });
  return <primitive object={model.root} />;
}
