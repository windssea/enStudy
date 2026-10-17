import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, SRGBColorSpace, type Group } from "three";
import type { Reaction, SceneKind } from "./SceneStage";

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
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
  );
}

export function Explorer({
  paused,
  pulse = 0,
  reaction = "thinking",
  idle = true,
}: {
  paused: boolean;
  pulse?: number;
  reaction?: Reaction;
  idle?: boolean;
}) {
  const body = useRef<Group>(null),
    arm = useRef<Group>(null);
  const changed = useRef({ pulse, reaction, start: -100 });
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (
      changed.current.pulse !== pulse ||
      changed.current.reaction !== reaction
    )
      changed.current = { pulse, reaction, start: t };
    if (!body.current || !arm.current) return;
    const age = t - changed.current.start;
    const wave = !paused && age < 0.9 ? Math.sin((age / 0.9) * Math.PI) : 0;
    body.current.position.y = paused
      ? 0
      : (idle ? Math.sin(t * 1.5) * 0.035 : 0) +
        wave * (reaction === "incorrect" ? 0 : 0.22);
    body.current.rotation.z = paused
      ? 0
      : wave * (reaction === "incorrect" ? 0.08 : -0.08);
    arm.current.rotation.z = paused
      ? -0.25
      : -0.25 - wave * (0.7 + Math.sin(age * 16) * 0.25);
  });
  return (
    <group ref={body}>
      <Pebble position={[0, 0.93, 0]} scale={[0.67, 0.8, 0.5]} />
      <Pebble
        position={[0, 0.6, -0.4]}
        scale={[0.46, 0.52, 0.24]}
        color="#679de0"
      />
      <Pebble
        position={[-0.29, 0.15, 0.15]}
        scale={[0.25, 0.14, 0.32]}
        color="#2557d6"
      />
      <Pebble
        position={[0.29, 0.15, 0.15]}
        scale={[0.25, 0.14, 0.32]}
        color="#2557d6"
      />
      <Pebble position={[-0.64, 0.8, 0]} scale={[0.18, 0.35, 0.18]} />
      <group ref={arm} position={[0.61, 1.05, 0]} rotation={[0, 0, -0.25]}>
        <Pebble position={[0.03, -0.18, 0]} scale={[0.18, 0.35, 0.18]} />
      </group>
      {[-0.23, 0.23].map((x) => (
        <group key={x}>
          <Pebble
            position={[x, 1.1, 0.46]}
            scale={[0.105, 0.14, 0.065]}
            color="#172b4d"
          />
          <Pebble
            position={[x - 0.025, 1.15, 0.52]}
            scale={[0.028, 0.035, 0.015]}
            color="white"
          />
          <Pebble
            position={[x * 1.45, 0.91, 0.45]}
            scale={[0.12, 0.055, 0.025]}
            color="#ef9f87"
          />
        </group>
      ))}
      {reaction === "incorrect" ? (
        <mesh position={[0, 0.82, 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.025, 0.16, 4, 8]} />
          <meshStandardMaterial color="#172b4d" />
        </mesh>
      ) : (
        <mesh position={[0, 0.88, 0.49]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.13, 0.026, 6, 16, Math.PI]} />
          <meshStandardMaterial color="#172b4d" />
        </mesh>
      )}
      <Pebble
        position={[0, 1.63, -0.05]}
        scale={[0.57, 0.22, 0.47]}
        color="#a4dcc0"
      />
      <Pebble
        position={[0, 1.57, 0.33]}
        scale={[0.6, 0.055, 0.36]}
        color="#449e79"
      />
      <Pebble
        position={[0.06, 1.88, -0.03]}
        scale={[0.11, 0.18, 0.07]}
        color="#449e79"
      />
    </group>
  );
}

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
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 192;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#172b4d";
      ctx.font = "700 60px sans-serif";
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
      <mesh>
        <boxGeometry args={[1.06, 0.83, 0.23]} />
        <meshStandardMaterial color={color} roughness={0.65} />
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
      {kind === "words" ? (
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
