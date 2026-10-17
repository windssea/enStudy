import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group, OrthographicCamera } from "three";
import { Explorer, Pebble, StageProp, Tile } from "./SceneModels";
import type { Reaction, SceneKind } from "./SceneStage";
import { RenderActivity } from "./SceneRuntime";

function Setup({ onLost }: { onLost: () => void }) {
  const { camera, size, gl, invalidate } = useThree();
  useEffect(() => {
    const lens = camera as OrthographicCamera;
    lens.zoom = Math.min(size.width / 4.9, size.height / 3.6);
    lens.lookAt(0, 0.85, 0);
    lens.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  return null;
}

function Sparkles({ reaction }: { reaction: Reaction }) {
  const group = useRef<Group>(null);
  const start = useRef<number | null>(null);
  useEffect(() => {
    start.current = null;
  }, [reaction]);
  useFrame(({ clock }) => {
    if (!group.current) return;
    start.current ??= clock.elapsedTime;
    const age = Math.min(1, (clock.elapsedTime - start.current) / 0.85);
    group.current.visible = age < 1;
    group.current.children.forEach((child, i) => {
      const angle = (i / 10) * Math.PI * 2;
      child.position.set(
        -0.6 + Math.cos(angle) * age * 1.5,
        1.1 + Math.sin(angle) * age * 1.15,
        0.6,
      );
      child.rotation.z = age * Math.PI;
      child.scale.setScalar(Math.sin(age * Math.PI) * 0.07);
    });
  });
  return (
    <group ref={group} visible={false}>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            color={["#2557d6", "#ee9b86", "#449e79", "#e3ad32"][i % 4]}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function SceneCanvas({
  kind,
  reaction,
  pulse,
  paused,
  moving,
  onLost,
}: {
  kind: SceneKind;
  reaction: Reaction;
  pulse: number;
  paused: boolean;
  moving: boolean;
  onLost: () => void;
}) {
  const active = !paused && moving;
  return (
    <Canvas
      aria-hidden="true"
      orthographic
      camera={{ position: [3, 2.3, 7], zoom: 70 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
    >
      <RenderActivity active={active} />
      <Setup onLost={onLost} />
      <ambientLight intensity={1.9} />
      <directionalLight position={[-3, 7, 5]} intensity={2.4} />
      <group position={[-0.85, 0, 0]}>
        <Explorer
          paused={!active}
          pulse={pulse}
          reaction={reaction}
          idle={kind !== "feedback"}
        />
      </group>
      <Pebble
        position={[0, -0.04, 0]}
        scale={[2.2, 0.13, 1.05]}
        color="#bde4cf"
      />
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[2.05, 1.85, 0.22, 48]} />
        <meshStandardMaterial color="#c9dcec" />
      </mesh>
      {kind === "feedback" ? (
        <Tile
          word={
            reaction === "correct" ? "✓" : reaction === "thinking" ? "?" : "…"
          }
          color={reaction === "correct" ? "#a4dcc0" : "#a5d7e4"}
          position={[1.05, 0.95, 0]}
          rotation={-0.08}
        />
      ) : (
        <StageProp kind={kind} paused={!active} pulse={pulse} />
      )}
      {kind === "feedback" && reaction === "correct" && active && (
        <Sparkles reaction={reaction} />
      )}
    </Canvas>
  );
}
