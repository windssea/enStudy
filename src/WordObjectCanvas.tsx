import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { OrthographicCamera } from "three";
import { createWordObject } from "./scene/wordObjectModel";
import type { WordObjectKind } from "./wordObjects";
import { foxTurnAngle } from "./scene/foxTurn";
import ClayStudio from "./ClayStudio";
import { RenderActivity } from "./SceneRuntime";

function ObjectModel({
  kind,
  angle,
  paused,
}: {
  kind: WordObjectKind;
  angle: number;
  paused: boolean;
}) {
  const model = useMemo(() => createWordObject(kind), [kind]);
  const turn = useRef({ target: angle, from: angle, start: -100 });
  useEffect(() => () => model.dispose(), [model]);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (paused) turn.current = { target: angle, from: angle, start: -100 };
    else if (turn.current.target !== angle)
      turn.current = {
        target: angle,
        from: model.root.rotation.y,
        start: time,
      };
    model.root.rotation.y = foxTurnAngle(
      turn.current.from,
      angle,
      time - turn.current.start,
      paused,
    );
  });
  return <primitive object={model.root} />;
}
function Setup({ onLost }: { onLost: () => void }) {
  const { camera, size, gl, invalidate } = useThree();
  useEffect(() => {
    const lens = camera as OrthographicCamera;
    lens.zoom = Math.min(size.width / 2.8, size.height / 2.2);
    lens.lookAt(0, 0.65, 0);
    lens.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  return null;
}
export default function WordObjectCanvas({
  kind,
  angle,
  paused,
  moving,
  onLost,
}: {
  kind: WordObjectKind;
  angle: number;
  paused: boolean;
  moving: boolean;
  onLost: () => void;
}) {
  return (
    <Canvas
      shadows="percentage"
      orthographic
      camera={{ position: [2.8, 2.6, 4.8], zoom: 80 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
    >
      <RenderActivity active={!paused && moving} />
      <Setup onLost={onLost} />
      <ClayStudio revision={`${kind}:${angle}`} onLost={onLost} />
      <ObjectModel kind={kind} angle={angle} paused={paused || !moving} />
      <mesh position={[0, -0.065, 0]} receiveShadow>
        <cylinderGeometry args={[0.95, 1, 0.1, 48]} />
        <meshStandardMaterial color="#f4d9ac" roughness={0.92} />
      </mesh>
    </Canvas>
  );
}
