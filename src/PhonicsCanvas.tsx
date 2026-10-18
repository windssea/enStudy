import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group, OrthographicCamera } from "three";
import { Tile, Explorer } from "./SceneModels";
import ClayStudio from "./ClayStudio";
import { RenderActivity } from "./SceneRuntime";
import type { PhonicsWord } from "../packages/contracts/phonics";
const colors = ["#ffd166", "#96daff", "#b3edce", "#e0cdff"];
function Setup({ revision, onLost }: { revision: string; onLost: () => void }) {
  const { camera, size, invalidate, gl } = useThree();
  useEffect(() => {
    const c = camera as OrthographicCamera;
    c.zoom = Math.min(size.width / 7.8, size.height / 3.6);
    c.lookAt(0, 0.7, 0);
    c.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);
  useEffect(() => {
    invalidate();
  }, [revision, invalidate]);
  useEffect(() => {
    const lost = (e: Event) => {
      e.preventDefault();
      onLost();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  return null;
}
function Letter({
  text,
  index,
  total,
  folded,
  moving,
  color,
  selected,
}: {
  text: string;
  index: number;
  total: number;
  folded: boolean;
  moving: boolean;
  color: string;
  selected: boolean;
}) {
  const root = useRef<Group>(null);
  const target = (index - (total - 1) / 2) * (folded ? 1.16 : 1.4) + 0.55;
  const initial = useRef<[number, number, number]>([target, 0.54, 0]);
  useFrame((_, delta) => {
    if (!root.current) return;
    root.current.position.x = moving
      ? root.current.position.x +
        (target - root.current.position.x) * (1 - Math.exp(-delta * 14))
      : target;
  });
  return (
    <group ref={root} position={initial.current} scale={selected ? 1.035 : 1}>
      <Tile word={text} color={color} position={[0, 0, 0]} />
    </group>
  );
}
function Contents({
  word,
  selected,
  folded,
  moving,
}: {
  word: PhonicsWord;
  selected: number;
  folded: boolean;
  moving: boolean;
}) {
  const group = word.groups[selected] ?? [];
  const span =
    group.length > 1 ? (group.at(-1)! - group[0]) * (folded ? 1.16 : 1.4) : 0;
  const x = group.length
    ? ((group[0] + group.at(-1)!) / 2 - (word.tiles.length - 1) / 2) *
        (folded ? 1.16 : 1.4) +
      0.55
    : 0;
  return (
    <>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[3.65, 3.4, 0.16, 48]} />
        <meshStandardMaterial color="#d8c4a4" roughness={0.94} />
      </mesh>
      <group position={[-2.9, 0.1, 0.25]} scale={0.58}>
        <Explorer paused idle={false} />
      </group>
      {word.tiles.map((text, i) => (
        <Letter
          key={i}
          text={text}
          index={i}
          total={word.tiles.length}
          folded={folded}
          moving={moving}
          selected={group.includes(i)}
          color={group.includes(i) ? colors[selected % 4] : "#fff3da"}
        />
      ))}
      {span > 0 && (
        <mesh position={[x, 1.28, -0.03]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.045, span, 5, 12]} />
          <meshStandardMaterial color={colors[selected % 4]} roughness={0.94} />
        </mesh>
      )}
      {group.map((i) => (
        <mesh
          key={i}
          position={[
            (i - (word.tiles.length - 1) / 2) * (folded ? 1.16 : 1.4) + 0.55,
            0.07,
            0.62,
          ]}
        >
          <sphereGeometry args={[0.08, 12, 8]} />
          <meshStandardMaterial color={colors[selected % 4]} roughness={0.94} />
        </mesh>
      ))}
    </>
  );
}
export default function PhonicsCanvas({
  word,
  selected,
  folded,
  moving,
  onLost,
}: {
  word: PhonicsWord;
  selected: number;
  folded: boolean;
  moving: boolean;
  onLost: () => void;
}) {
  const revision = `${word.id}:${selected}:${folded}`;
  return (
    <Canvas
      aria-hidden="true"
      shadows="percentage"
      orthographic
      camera={{ position: [0.2, 2.35, 7.4], zoom: 70 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ alpha: true, antialias: true }}
    >
      <RenderActivity active={moving} />
      <Setup revision={revision} onLost={onLost} />
      <ClayStudio wide revision={revision} onLost={onLost} />
      <Contents
        word={word}
        selected={selected}
        folded={folded}
        moving={moving}
      />
    </Canvas>
  );
}
