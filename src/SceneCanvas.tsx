import ClayStudio from "./ClayStudio";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group, OrthographicCamera } from "three";
import { Explorer, Pebble, StageProp, Tile } from "./SceneModels";
import type { Reaction, SceneKind } from "./SceneStage";
import { RenderActivity } from "./SceneRuntime";
import type { CompanionGesture } from "./scene/companionGestures";

function Setup({ onLost, partner }: { onLost: () => void; partner: boolean }) {
  const { camera, size, gl, invalidate } = useThree();
  useEffect(() => {
    const lens = camera as OrthographicCamera;
    lens.zoom = Math.min(
      size.width / (partner ? 3.4 : 4.9),
      size.height / (partner ? 2.9 : 3.6),
    );
    lens.lookAt(0, partner ? 1.15 : 0.85, 0);
    lens.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate, partner]);
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
  turned,
  paused,
  moving,
  onLost,
  gesture,
}: {
  kind: SceneKind;
  reaction: Reaction;
  pulse: number;
  turned: boolean;
  paused: boolean;
  moving: boolean;
  onLost: () => void;
  gesture?: CompanionGesture;
}) {
  const active = !paused && moving;
  return (
    <Canvas
      aria-hidden="true"
      shadows="percentage"
      orthographic
      camera={{ position: [3, 2.3, 7], zoom: 70 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
    >
      <RenderActivity active={active} />
      <Setup onLost={onLost} partner={kind === "partner"} />
      <ClayStudio
        revision={`${kind}:${pulse}:${reaction}:${turned}`}
        onLost={onLost}
      />
      <group position={[kind === "partner" ? 0 : -0.85, 0.1, 0]}>
        <Explorer
          paused={kind === "partner" ? paused : !active}
          pulse={pulse}
          turned={turned}
          reaction={reaction}
          idle={kind !== "feedback" && kind !== "partner"}
          gesture={gesture}
        />
      </group>
      <Pebble
        position={[0, -0.04, 0]}
        scale={[2.2, 0.13, 1.05]}
        color="#bde4cf"
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[kind === "partner" ? 0 : -0.78, 0.095, 0.15]}
      >
        <circleGeometry args={[0.57, 32]} />
        <meshBasicMaterial
          color="#24584b"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[2.05, 1.85, 0.22, 48]} />
        <meshStandardMaterial color="#d8c4a4" roughness={0.9} />
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
      ) : kind !== "partner" ? (
        <StageProp kind={kind} paused={!active} pulse={pulse} />
      ) : null}
      {kind === "feedback" && reaction === "correct" && active && (
        <Sparkles reaction={reaction} />
      )}
    </Canvas>
  );
}
