import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group, OrthographicCamera } from "three";
import { Explorer, Tile } from "./SceneModels";
import { RenderActivity } from "./SceneRuntime";

function Framing({ onLost }: { onLost: () => void }) {
  const { camera, size, invalidate, gl } = useThree();
  useEffect(() => {
    const lens = camera as OrthographicCamera;
    lens.zoom = Math.max(18, Math.min(48, size.width / 12.5));
    lens.lookAt(0, 1, 0);
    lens.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, invalidate]);
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
function Cloud({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      {[-0.4, 0, 0.4].map((x, i) => (
        <mesh
          key={x}
          position={[x, i === 1 ? 0.18 : 0, 0]}
          scale={[0.6, 0.36, 0.4]}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#ffffff" flatShading />
        </mesh>
      ))}
    </group>
  );
}
function Balloon({ quiet, greet }: { quiet: boolean; greet: number }) {
  const group = useRef<Group>(null);
  const started = useRef(-100);
  const seen = useRef(greet);
  useFrame(({ clock }, delta) => {
    if (!group.current || quiet) return;
    const t = clock.elapsedTime;
    if (seen.current !== greet) {
      seen.current = greet;
      started.current = t;
    }
    const wave = Math.max(0, 1 - (t - started.current) / 2);
    group.current.position.x = 2 + Math.sin(t * 0.18) * 0.6;
    group.current.position.y =
      3 + Math.sin(t * 0.7) * 0.12 + Math.sin(wave * Math.PI * 3) * wave * 0.18;
    group.current.rotation.z +=
      (Math.sin(t * 0.5) * 0.05 + wave * 0.12 - group.current.rotation.z) *
      Math.min(delta * 4, 1);
  });
  return (
    <group ref={group} position={[2, 3, -1.5]}>
      <mesh scale={[0.72, 0.9, 0.72]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial
          color={greet % 2 ? "#f7c85f" : "#ef9f87"}
          flatShading
        />
      </mesh>
      {[
        [-0.3, -0.9, 0.2],
        [0.3, -0.9, 0.2],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <cylinderGeometry args={[0.018, 0.018, 0.6, 4]} />
          <meshStandardMaterial color="#987659" />
        </mesh>
      ))}
      <mesh position={[0, -1.2, 0]}>
        <boxGeometry args={[0.55, 0.32, 0.45]} />
        <meshStandardMaterial color="#d5a96b" />
      </mesh>
      <mesh position={[0, -1.32, 0.03]}>
        <boxGeometry args={[0.65, 0.09, 0.5]} />
        <meshStandardMaterial color="#b6844b" />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0.1]}>
        <torusGeometry args={[0.74, 0.045, 6, 24]} />
        <meshStandardMaterial color="#fff1bf" />
      </mesh>
    </group>
  );
}

function Island({
  position,
  color,
  animate,
}: {
  position: [number, number, number];
  color: string;
  animate: boolean;
}) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (group.current && animate)
      group.current.position.y =
        position[1] + Math.sin(clock.elapsedTime * 0.7 + position[0]) * 0.07;
  });
  return (
    <group ref={group} position={position}>
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[1.5, 0.75, 0.85, 6]} />
        <meshStandardMaterial color="#a4bdd1" flatShading />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[1.55, 1.5, 0.14, 6]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0.55, 0.65, -0.35]}>
        <cylinderGeometry args={[0.08, 0.1, 0.7, 7]} />
        <meshStandardMaterial color="#987659" />
      </mesh>
      <mesh position={[0.55, 1.1, -0.35]}>
        <coneGeometry args={[0.45, 1.1, 7]} />
        <meshStandardMaterial color="#449e79" flatShading />
      </mesh>
      <mesh position={[-0.45, 0.65, 0.1]}>
        <boxGeometry args={[0.65, 0.7, 0.65]} />
        <meshStandardMaterial color="#fff1bf" />
      </mesh>
      <mesh position={[-0.45, 1.18, 0.1]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.64, 0.5, 4]} />
        <meshStandardMaterial color="#ee9b86" flatShading />
      </mesh>
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * 0.9, 0.38, 0.5]}>
          <dodecahedronGeometry args={[0.18, 0]} />
          <meshStandardMaterial color={x === 1 ? "#ffd166" : "#ef9f87"} />
        </mesh>
      ))}
    </group>
  );
}
export default function World({
  quiet,
  greet = 0,
  completed = 0,
  onLost,
}: {
  quiet: boolean;
  greet?: number;
  completed?: number;
  onLost: () => void;
}) {
  return (
    <Canvas
      aria-hidden="true"
      orthographic
      camera={{ position: [11, 12, 15], zoom: 43 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={1.9} />
      <RenderActivity active={!quiet} />
      <Framing onLost={onLost} />
      <directionalLight position={[3, 8, 5]} intensity={2.5} />
      <Island position={[-3.3, 0, 0.8]} color="#a4dcc0" animate={false} />
      <Island position={[0, 0.65, -0.8]} color="#c3e5a7" animate={false} />
      <Island position={[3.1, 0.05, 0.4]} color="#a5d7e4" animate={false} />
      <Balloon quiet={quiet} greet={greet} />
      <group position={[-2.85, 0.35, 1.2]} rotation={[0, 0.35, 0]} scale={0.8}>
        <Explorer paused={quiet} pulse={greet} />
      </group>
      <group position={[0.15, 1.6, -0.3]} rotation={[0, 0.45, 0]}>
        <mesh>
          <torusGeometry args={[0.78, 0.16, 10, 32, Math.PI]} />
          <meshStandardMaterial color="#679de0" />
        </mesh>
        <mesh position={[-0.78, -0.35, 0]}>
          <cylinderGeometry args={[0.16, 0.2, 0.7, 10]} />
          <meshStandardMaterial color="#679de0" />
        </mesh>
        <mesh position={[0.78, -0.35, 0]}>
          <cylinderGeometry args={[0.16, 0.2, 0.7, 10]} />
          <meshStandardMaterial color="#679de0" />
        </mesh>
        <Tile word="ABC" color="#ffd166" position={[0, 0.63, 0]} />
      </group>
      <group position={[3.3, 0.8, 0.9]} rotation={[0, 0.35, -0.08]} scale={0.9}>
        <Tile word="Hello!" color="#fff1bf" position={[0, 0, 0]} />
      </group>
      {Array.from({ length: Math.min(4, completed) }, (_, i) => (
        <group key={`flag-${i}`} position={[-3.8 + i * 0.75, 0.7, 1.2]}>
          <mesh>
            <cylinderGeometry args={[0.025, 0.025, 0.8, 6]} />
            <meshStandardMaterial color="#7d6d52" />
          </mesh>
          <mesh position={[0.17, 0.28, 0]}>
            <boxGeometry args={[0.34, 0.23, 0.04]} />
            <meshStandardMaterial color="#f5ce68" />
          </mesh>
        </group>
      ))}
      <Cloud position={[-4, 2.5, -2]} scale={0.8} />
      <Cloud position={[4.2, 1.9, 1.5]} scale={0.7} />
      {Array.from({ length: 15 }, (_, i) => (
        <mesh
          key={i}
          position={[
            -2.5 + i * 0.36,
            0.35 + Math.sin((i / 14) * Math.PI) * 0.58,
            0.55 - Math.sin((i / 14) * Math.PI) * 0.45,
          ]}
        >
          <boxGeometry args={[0.27, 0.1, 0.52]} />
          <meshStandardMaterial color={i % 2 ? "#e5b976" : "#f6d69c"} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <circleGeometry args={[6.2, 48]} />
        <meshBasicMaterial color="#d4eaf5" transparent opacity={0.65} />
      </mesh>
    </Canvas>
  );
}
