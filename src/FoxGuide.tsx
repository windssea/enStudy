import { useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { applyFoxPose, createFoxModel } from "./scene/foxModel";
import type { Reaction } from "./SceneStage";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { prepareClayFox } from "./scene/loadClayFox";
import { foxTurnAngle } from "./scene/foxTurn";
import type { Object3D } from "three";

const clayFoxUrl = new URL("./assets/models/clay-fox-v1.glb", import.meta.url)
  .href;

function useFoxTurn(root: Object3D, turned: boolean, paused: boolean) {
  const state = useRef({ target: 0, from: 0, start: -100 });
  useFrame(({ clock }) => {
    const target = turned ? Math.PI : 0;
    const time = clock.elapsedTime;
    if (paused) {
      state.current = { target, from: target, start: -100 };
      root.rotation.y = target;
    } else {
      if (state.current.target !== target)
        state.current = { target, from: root.rotation.y, start: time };
      root.rotation.y = foxTurnAngle(
        state.current.from,
        target,
        time - state.current.start,
        false,
      );
    }
  });
}

function ProceduralGuide({
  paused,
  pulse = 0,
  reaction = "thinking",
  idle = true,
  turned = false,
}: {
  paused: boolean;
  pulse?: number;
  reaction?: Reaction;
  idle?: boolean;
  turned?: boolean;
}) {
  const model = useMemo(createFoxModel, []);
  useFoxTurn(model.root, turned, paused);
  const changed = useRef({ pulse, reaction, start: -100 });
  useEffect(() => () => model.dispose(), [model]);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (paused) changed.current = { pulse, reaction, start: -100 };
    else if (
      changed.current.pulse !== pulse ||
      changed.current.reaction !== reaction
    )
      changed.current = { pulse, reaction, start: time };
    applyFoxPose(model, {
      time,
      age: time - changed.current.start,
      paused,
      idle,
      reaction,
    });
  });
  return <primitive object={model.root} />;
}
type Props = Parameters<typeof ProceduralGuide>[0];
function LoadedGuide({
  paused,
  pulse = 0,
  reaction = "thinking",
  idle = true,
  turned = false,
}: Props) {
  const gltf = useLoader(GLTFLoader, clayFoxUrl);
  const model = useMemo(() => prepareClayFox(gltf.scene), [gltf.scene]);
  useFoxTurn(model.root, turned, paused);
  const changed = useRef({ pulse, reaction, start: -100 });
  useEffect(() => () => model.dispose(), [model]);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (paused) changed.current = { pulse, reaction, start: -100 };
    else if (
      changed.current.pulse !== pulse ||
      changed.current.reaction !== reaction
    )
      changed.current = { pulse, reaction, start: time };
    applyFoxPose(model, {
      time,
      age: time - changed.current.start,
      paused,
      idle,
      reaction,
    });
  });
  return <primitive object={model.root} />;
}
export default function FoxGuide(props: Props) {
  return (
    <Suspense fallback={<ProceduralGuide {...props} />}>
      <LoadedGuide {...props} />
    </Suspense>
  );
}
