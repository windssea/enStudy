import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Mesh, PMREMGenerator } from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/** Baked soft-box IBL + one soft shadow map. No network HDR or postprocessing. */
export default function ClayStudio({
  wide = false,
  revision,
  onLost,
}: {
  wide?: boolean;
  revision: string;
  onLost: () => void;
}) {
  const { gl, scene, invalidate } = useThree();
  const lastShadow = useRef(-Infinity);
  const lost = useRef(onLost);
  lost.current = onLost;
  useEffect(() => {
    const room = new RoomEnvironment(),
      pmrem = new PMREMGenerator(gl);
    const previous = scene.environment,
      previousIntensity = scene.environmentIntensity;
    let target: ReturnType<PMREMGenerator["fromScene"]> | undefined;
    try {
      target = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 128 });
      scene.environment = target.texture;
      scene.environmentIntensity = 0.65;
      invalidate();
    } catch {
      lost.current();
    } finally {
      room.dispose();
      pmrem.dispose();
    }
    return () => {
      if (target) {
        if (scene.environment === target.texture) {
          scene.environment = previous;
          scene.environmentIntensity = previousIntensity;
        }
        target.dispose();
      }
    };
  }, [gl, scene, invalidate]);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    scene.traverse((node) => {
      if (node instanceof Mesh) {
        const materials = Array.isArray(node.material)
          ? node.material
          : [node.material];
        node.castShadow = !materials.some((material) => material.transparent);
        node.receiveShadow = true;
      }
    });
    lastShadow.current = -Infinity;
    invalidate();
  }, [gl, scene, revision, invalidate]);
  useFrame(({ clock }) => {
    // Demand rendering already stops when quiet/offscreen. Limit shadow refresh
    // to 10 fps during movement, independently of the 30 fps character budget.
    if (clock.elapsedTime - lastShadow.current >= 0.1) {
      gl.shadowMap.needsUpdate = true;
      lastShadow.current = clock.elapsedTime;
    }
  });
  const span = wide ? 7 : 3.5;
  return (
    <>
      <hemisphereLight args={["#dcefff", "#f4ceb2", 0.45]} />
      <directionalLight
        position={[-3, 7, 5]}
        color="#fff0dc"
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
        shadow-radius={3}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
      />
      <directionalLight
        position={[4, 3, -4]}
        color="#c3e4ff"
        intensity={0.65}
      />
    </>
  );
}
