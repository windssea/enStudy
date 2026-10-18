import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { type Group, type Mesh, type OrthographicCamera } from "three";
import { Tile, Explorer } from "./SceneModels";
import ClayStudio from "./ClayStudio";
import { RenderActivity } from "./SceneRuntime";
import { roundedPanel } from "./scene/foxModel";
import { phonicsLayout } from "./phonicsWorkbenchModel";
import type { PhonicsWord } from "../packages/contracts/phonics";

const colors = ["#ffd166", "#96daff", "#b3edce", "#e0cdff"];
function Setup({
  width,
  revision,
  onLost,
}: {
  width: number;
  revision: string;
  onLost: () => void;
}) {
  const { camera, size, invalidate, gl } = useThree();
  useEffect(() => {
    const c = camera as OrthographicCamera;
    c.zoom = Math.min(size.width / width, size.height / 4.2);
    c.lookAt(0, 0.95, 0);
    c.updateProjectionMatrix();
    invalidate();
  }, [camera, size, width, invalidate]);
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

function Platform({ width }: { width: number }) {
  const geometry = useMemo(() => roundedPanel(width, 2.05, 0.22, 0.5), [width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group>
      <mesh
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.06, 0]}
      >
        <meshStandardMaterial color="#e2cfb3" roughness={0.94} />
      </mesh>
      <mesh
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.16, 0]}
        scale={[0.985, 0.94, 0.45]}
      >
        <meshStandardMaterial color="#edf6eb" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Pieces({
  word,
  selected,
  folded,
  moving,
  onSelect,
}: {
  word: PhonicsWord;
  selected: number;
  folded: boolean;
  moving: boolean;
  onSelect: (index: number) => void;
}) {
  const layout = phonicsLayout(word, folded),
    opened = phonicsLayout(word, false),
    group = word.groups[selected] ?? [],
    color = colors[selected % colors.length];
  const letters = useRef<(Group | null)[]>([]),
    dots = useRef<(Mesh | null)[]>([]),
    bridge = useRef<Mesh>(null),
    feet = useRef<(Mesh | null)[]>([]);
  const initial = useRef(
    layout.x.map(
      (x, i) =>
        [x, group.includes(i) && !folded ? 0.99 : 0.77, 0] as [
          number,
          number,
          number,
        ],
    ),
  );
  // Markers follow the same live positions as their letters when interrupted.
  useFrame((_, delta) => {
    const blend = moving ? 1 - Math.exp(-Math.min(delta, 0.05) * 16) : 1;
    letters.current.forEach((letter, i) => {
      if (!letter) return;
      const active = group.includes(i),
        y = active && !folded ? 0.99 : 0.77;
      letter.position.x += (layout.x[i] - letter.position.x) * blend;
      letter.position.y += (y - letter.position.y) * blend;
      letter.rotation.z +=
        ((active && !folded ? -0.025 : 0) - letter.rotation.z) * blend;
      const dot = dots.current[i];
      if (dot) dot.position.x = letter.position.x;
    });
    const first = letters.current[group[0]],
      last = letters.current[group.at(-1)!];
    if (!first || !last) return;
    if (bridge.current) {
      bridge.current.position.x = (first.position.x + last.position.x) / 2;
      bridge.current.position.y =
        Math.max(first.position.y, last.position.y) + 0.7;
      bridge.current.scale.x = Math.max(
        0.01,
        last.position.x - first.position.x,
      );
    }
    feet.current.forEach((foot, i) => {
      if (foot) {
        foot.position.x = (i ? last : first).position.x;
        foot.position.y = Math.max(first.position.y, last.position.y) + 0.6;
      }
    });
  });
  return (
    <>
      <Platform width={opened.platformWidth} />
      <group position={[opened.companionX, 0.23, -0.12]} scale={0.53}>
        <Explorer paused idle={false} />
      </group>
      {word.tiles.map((text, i) => (
        <group key={i}>
          <group
            ref={(node) => {
              letters.current[i] = node;
            }}
            position={initial.current[i]}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(layout.owners[i]);
            }}
          >
            <Tile
              word={text}
              width={layout.widths[i]}
              fontSize={88}
              color={group.includes(i) ? color : "#fff3da"}
              position={[0, 0, 0]}
            />
          </group>
          <mesh
            ref={(node) => {
              dots.current[i] = node;
            }}
            position={[layout.x[i], 0.32, 0.64]}
            scale={[1.6, 0.45, 1]}
          >
            <sphereGeometry args={[0.09, 16, 10]} />
            <meshStandardMaterial
              color={group.includes(i) ? color : "#c2d3c6"}
              roughness={0.94}
            />
          </mesh>
        </group>
      ))}
      {group.length > 1 && (
        <group>
          <mesh
            ref={bridge}
            position={[
              (layout.x[group[0]] + layout.x[group.at(-1)!]) / 2,
              1.74,
              0.02,
            ]}
            scale={[layout.x[group.at(-1)!] - layout.x[group[0]], 0.1, 0.1]}
          >
            <sphereGeometry args={[0.5, 20, 12]} />
            <meshStandardMaterial color={color} roughness={0.94} />
          </mesh>
          {[0, 1].map((i) => (
            <mesh
              key={i}
              ref={(node) => {
                feet.current[i] = node;
              }}
              position={[layout.x[i ? group.at(-1)! : group[0]], 1.65, 0.02]}
              scale={[0.065, 0.15, 0.065]}
            >
              <sphereGeometry args={[1, 16, 10]} />
              <meshStandardMaterial color={color} roughness={0.94} />
            </mesh>
          ))}
        </group>
      )}
    </>
  );
}

export default function PhonicsCanvas({
  word,
  selected,
  folded,
  moving,
  onSelect,
  onLost,
}: {
  word: PhonicsWord;
  selected: number;
  folded: boolean;
  moving: boolean;
  onSelect: (index: number) => void;
  onLost: () => void;
}) {
  const revision = `${word.id}:${selected}:${folded}`,
    width = phonicsLayout(word, false).width;
  return (
    <Canvas
      aria-hidden="true"
      shadows="percentage"
      orthographic
      camera={{ position: [0, 2.75, 7.4], zoom: 70 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ alpha: true, antialias: true }}
    >
      <RenderActivity active={moving} />
      <Setup width={width} revision={revision} onLost={onLost} />
      <ClayStudio wide revision={revision} onLost={onLost} />
      <Pieces
        word={word}
        selected={selected}
        folded={folded}
        moving={moving}
        onSelect={onSelect}
      />
    </Canvas>
  );
}
