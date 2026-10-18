import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, SRGBColorSpace, type Group } from "three";
import { roundedPanel } from "./scene/foxModel";
import type { SceneKind } from "./SceneStage";

export function Pebble({
  position,
  scale = [1, 1, 1],
  color = "#ffd166",
}: {
  position: [number, number, number];
  scale?: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 20, 14]} />
      <meshStandardMaterial color={color} roughness={0.88} />
    </mesh>
  );
}

export { default as Explorer } from "./FoxGuide";

export function Tile({
  word,
  color,
  position,
  rotation = 0,
}: {
  word: string;
  color: string;
  position: [number, number, number];
  rotation?: number;
}) {
  const geometry = useMemo(() => roundedPanel(1.06, 0.83, 0.23, 0.1), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 192;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#172b4d";
      let size = 60;
      ctx.font = `700 ${size}px sans-serif`;
      while (size > 18 && ctx.measureText(word).width > 228) {
        size -= 2;
        ctx.font = `700 ${size}px sans-serif`;
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(word, 128, 96);
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, [word]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={position} rotation={[0, 0, rotation]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} roughness={0.88} />
      </mesh>
      <mesh position={[0, 0, 0.12]}>
        <planeGeometry args={[1.02, 0.76]} />
        <meshBasicMaterial map={texture} transparent />
      </mesh>
    </group>
  );
}

function Book() {
  return (
    <group rotation={[-0.2, 0, -0.12]}>
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * 0.45, 0, 0]}
          rotation={[0, side * 0.22, 0]}
        >
          <mesh>
            <boxGeometry args={[0.88, 1.22, 0.2]} />
            <meshStandardMaterial color="#679de0" />
          </mesh>
          <mesh position={[0, 0.02, 0.12]}>
            <boxGeometry args={[0.78, 1.1, 0.07]} />
            <meshStandardMaterial color="#fff5da" />
          </mesh>
          {[0.2, 0, -0.2].map((y) => (
            <mesh key={y} position={[0, y, 0.16]}>
              <boxGeometry args={[0.5, 0.035, 0.01]} />
              <meshStandardMaterial color="#a1b3cb" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function StageProp({
  kind,
  paused,
  pulse,
}: {
  kind: SceneKind;
  paused: boolean;
  pulse: number;
}) {
  const group = useRef<Group>(null);
  const leaf = useRef<Group>(null);
  const blocks = useRef<Group>(null);
  const water = useRef<Group>(null);
  const seen = useRef(pulse),
    started = useRef(-100);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (seen.current !== pulse) {
      seen.current = pulse;
      started.current = t;
    }
    if (!group.current) return;
    const wave = paused ? 0 : Math.max(0, 1 - (t - started.current) / 1.2);
    group.current.rotation.y = paused
      ? -0.2
      : -0.2 + Math.sin(t * 0.7) * 0.1 + Math.sin(wave * Math.PI) * 0.3;
    group.current.position.y =
      0.8 +
      (paused ? 0 : Math.sin(t * 1.3) * 0.06 + Math.sin(wave * Math.PI) * 0.18);
    if (leaf.current) leaf.current.scale.setScalar(1 + wave * 0.18);
    const age = t - started.current;
    if (water.current) {
      water.current.visible = !paused && pulse > 0 && age < 0.8;
      water.current.position.y = 1.8 - age * 1.5;
    }
    if (blocks.current) {
      const rest = [
        [-0.5, 0.45, 0],
        [0.45, 0.15, 0.2],
        [-0.1, -0.65, 0.4],
      ];
      blocks.current.children.forEach((block, i) => {
        const p =
          pulse === 0
            ? 0
            : paused
              ? 1
              : Math.min(1, Math.max(0, (age - i * 0.08) / 0.45));
        const ease = 1 - (1 - p) ** 3;
        block.position.set(
          rest[i][0] * (1 - ease) + (-0.72 + i * 0.72) * ease,
          rest[i][1] * (1 - ease) + 0.2 * ease,
          rest[i][2] * (1 - ease) + 0.3 * ease,
        );
        block.scale.setScalar(1 - ease * 0.38);
        block.rotation.z = (i % 2 ? -0.1 : 0.08) * (1 - ease);
      });
    }
  });
  return (
    <group ref={group} position={[1.15, 0.8, 0]} rotation={[0, -0.2, 0]}>
      {kind === "sorting" ? (
        <SortingMachine pulse={pulse} paused={paused} />
      ) : kind === "words" ? (
        <>
          <Tile
            word="Aa"
            color="#a5d7e4"
            position={[0, 0.35, -0.15]}
            rotation={-0.13}
          />
          <group position={[0.35, -0.2, 0.35]}>
            <Pebble
              position={[-0.12, 0, 0]}
              scale={[0.33, 0.38, 0.3]}
              color="#ee786e"
            />
            <Pebble
              position={[0.12, 0, 0]}
              scale={[0.33, 0.38, 0.3]}
              color="#ee786e"
            />
            <mesh position={[0, 0.39, 0]} rotation={[0, 0, -0.2]}>
              <cylinderGeometry args={[0.04, 0.04, 0.3, 6]} />
              <meshStandardMaterial color="#916c46" />
            </mesh>
            <mesh
              position={[0.2, 0.47, 0]}
              rotation={[0, 0, -0.6]}
              scale={[0.23, 0.09, 0.055]}
            >
              <sphereGeometry args={[1, 10, 6]} />
              <meshStandardMaterial color="#449e79" />
            </mesh>
          </group>
        </>
      ) : kind === "garden" ? (
        <group position={[0, -0.3, 0]}>
          <mesh>
            <cylinderGeometry args={[0.52, 0.36, 0.65, 12]} />
            <meshStandardMaterial color="#ee9b86" />
          </mesh>
          <mesh position={[0, 0.33, 0]}>
            <cylinderGeometry args={[0.46, 0.46, 0.03, 12]} />
            <meshStandardMaterial color="#916c46" />
          </mesh>
          <group ref={leaf}>
            <mesh position={[0, 0.77, 0]}>
              <cylinderGeometry args={[0.035, 0.045, 0.9, 8]} />
              <meshStandardMaterial color="#449e79" />
            </mesh>
            {[-1, 1].map((side) => (
              <group
                key={side}
                rotation={[0, 0, side * -0.65]}
                position={[side * 0.22, 0.95 + side * 0.15, 0]}
              >
                <Pebble
                  position={[0, 0, 0]}
                  scale={[0.23, 0.4, 0.07]}
                  color="#74c79c"
                />
              </group>
            ))}
          </group>
          <group ref={water} position={[0.15, 1.8, 0.3]} visible={false}>
            <Pebble
              position={[0, 0, 0]}
              scale={[0.065, 0.13, 0.065]}
              color="#5aafe5"
            />
          </group>
        </group>
      ) : kind === "lesson" ? (
        <Book />
      ) : (
        <group ref={blocks}>
          <group position={[-0.5, 0.45, 0]}>
            <Tile word="I" color="#a5d7e4" position={[0, 0, 0]} />
          </group>
          <group position={[0.45, 0.15, 0.2]}>
            <Tile word="like" color="#ffd166" position={[0, 0, 0]} />
          </group>
          <group position={[-0.1, -0.65, 0.4]}>
            <Tile word="cats." color="#a4dcc0" position={[0, 0, 0]} />
          </group>
        </group>
      )}
    </group>
  );
}

function SortingMachine({ pulse, paused }: { pulse: number; paused: boolean }) {
  const card = useRef<Group>(null),
    seen = useRef(pulse),
    start = useRef(-100);
  useFrame(({ clock }) => {
    if (seen.current !== pulse) {
      seen.current = pulse;
      start.current = clock.elapsedTime;
    }
    if (!card.current) return;
    const t =
        pulse === 0
          ? 0
          : paused
            ? 1
            : Math.min(
                1,
                Math.max(0, (clock.elapsedTime - start.current) / 0.85),
              ),
      side = pulse % 2 ? 1 : -1;
    card.current.position.set(side * 0.48 * t, 1.1 - 1.4 * t, 0.25);
    card.current.rotation.z = (1 - t) * 0.2;
    card.current.scale.setScalar(0.52 - 0.14 * t);
  });
  return (
    <group position={[0, -0.2, 0]}>
      {[-1, 1].map((side, index) => (
        <group key={side} position={[side * 0.5, -0.38, 0]}>
          <mesh>
            <boxGeometry args={[0.8, 0.18, 0.62]} />
            <meshStandardMaterial color={index ? "#a5d7e4" : "#ffd166"} />
          </mesh>
          {[-1, 1].map((z) => (
            <mesh key={z} position={[0, 0.14, z * 0.29]}>
              <boxGeometry args={[0.8, 0.3, 0.06]} />
              <meshStandardMaterial color={index ? "#679de0" : "#edbd59"} />
            </mesh>
          ))}
          {[-1, 1].map((x) => (
            <mesh key={x} position={[x * 0.37, 0.14, 0]}>
              <boxGeometry args={[0.06, 0.3, 0.62]} />
              <meshStandardMaterial color={index ? "#679de0" : "#edbd59"} />
            </mesh>
          ))}
        </group>
      ))}
      <group ref={card} position={[0, 1.1, 0.25]} scale={0.52}>
        <Tile word="Aa" color="#a4dcc0" position={[0, 0, 0]} />
      </group>
    </group>
  );
}
