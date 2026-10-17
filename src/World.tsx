import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

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
    </group>
  );
}
export default function World({ quiet }: { quiet: boolean }) {
  return (
    <Canvas
      aria-hidden="true"
      orthographic
      camera={{ position: [11, 12, 15], zoom: 43 }}
      dpr={[1, 1.5]}
      frameloop={quiet ? "demand" : "always"}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={1.9} />
      <directionalLight position={[3, 8, 5]} intensity={2.5} />
      <Island position={[-3.3, 0, 0.8]} color="#a4dcc0" animate={!quiet} />
      <Island position={[0, 0.65, -0.8]} color="#c3e5a7" animate={!quiet} />
      <Island position={[3.1, 0.05, 0.4]} color="#a5d7e4" animate={false} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <circleGeometry args={[6.2, 48]} />
        <meshBasicMaterial color="#d4eaf5" transparent opacity={0.65} />
      </mesh>
    </Canvas>
  );
}
