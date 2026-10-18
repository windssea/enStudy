import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useContext, useEffect, useMemo, useRef } from "react";
import { createFoxModel } from "./scene/foxModel";
import { createPikachuModel } from "./scene/pikachuModel";
import { CompanionContext } from "./CompanionContext";
import { applyCompanionPose } from "./scene/companionPose";
import type { CompanionId } from "../packages/domain/companions";
import type { Reaction } from "./SceneStage";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { prepareClayPartner } from "./scene/loadClayFox";
import { foxTurnAngle } from "./scene/foxTurn";
import { Mesh, type Object3D } from "three";

const clayFoxUrl = new URL("./assets/models/clay-fox-v1.glb", import.meta.url)
  .href;
const clayPikachuUrl = new URL(
  "./assets/models/clay-pikachu-v1.glb",
  import.meta.url,
).href;
function usePartnerShadow(root: Object3D) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    root.traverse((node) => {
      if (node instanceof Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [root, gl, invalidate]);
}

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
  companion,
}: {
  paused: boolean;
  pulse?: number;
  reaction?: Reaction;
  idle?: boolean;
  turned?: boolean;
  companion: CompanionId;
}) {
  const model = useMemo(
    () => (companion === "fox" ? createFoxModel() : createPikachuModel()),
    [companion],
  );
  useFoxTurn(model.root, turned, paused);
  usePartnerShadow(model.root);
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
    applyCompanionPose(model, companion, {
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
  companion,
}: Props) {
  const gltf = useLoader(
    GLTFLoader,
    companion === "fox" ? clayFoxUrl : clayPikachuUrl,
  );
  const model = useMemo(
    () => prepareClayPartner(gltf.scene, companion),
    [gltf.scene, companion],
  );
  useFoxTurn(model.root, turned, paused);
  usePartnerShadow(model.root);
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
    applyCompanionPose(model, companion, {
      time,
      age: time - changed.current.start,
      paused,
      idle,
      reaction,
    });
  });
  return <primitive object={model.root} />;
}
export default function FoxGuide(props: Omit<Props, "companion">) {
  const companion = useContext(CompanionContext);
  return (
    <Suspense
      fallback={
        <ProceduralGuide key={companion} {...props} companion={companion} />
      }
    >
      <LoadedGuide key={companion} {...props} companion={companion} />
    </Suspense>
  );
}
