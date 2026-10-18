import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import {
  measurementColour,
  measurementDimensions,
  measurementX,
  type MeasurementVisual,
} from "../packages/domain/measurements";
import { conceptProgress } from "./conceptMotion";
import { Tile } from "./SceneModels";

export default function MeasurementModels({
  data,
  selected,
  revision,
  moving,
}: {
  data: MeasurementVisual;
  selected?: string;
  revision: number;
  moving: boolean;
}) {
  const marker = useRef<Group>(null);
  const index = Math.max(
      0,
      data.items.findIndex((item) => item.id === selected),
    ),
    target = measurementX(index, data.items.length);
  const motion = useRef({ revision, start: 0, from: target, current: target });
  useFrame(({ clock }) => {
    const now = clock.elapsedTime * 1000;
    if (motion.current.revision !== revision)
      motion.current = {
        revision,
        start: now,
        from: motion.current.current,
        current: motion.current.current,
      };
    const p = conceptProgress(now - motion.current.start, !moving);
    motion.current.current =
      motion.current.from + (target - motion.current.from) * p;
    if (marker.current) marker.current.position.x = motion.current.current;
  });
  return (
    <group>
      {data.items.map((item, i) => {
        const [width, height, depth] = measurementDimensions(data, item.value),
          x = measurementX(i, data.items.length),
          colour = measurementColour(i, data.items.length),
          cover = Math.min(0.02, height * 0.15);
        return (
          <group
            key={item.id}
            name={`measurement:${item.id}`}
            position={[x, 0, 0]}
          >
            {data.kind === "bridge" ? (
              <>
                <mesh position={[0, 0.72, 0]}>
                  <boxGeometry args={[width, height, depth]} />
                  <meshStandardMaterial color={colour} roughness={0.75} />
                </mesh>
                {[-1, 1].flatMap((side) =>
                  [-1, 1].map((end) => (
                    <mesh
                      key={`${side}:${end}`}
                      position={[side * (width / 2 - 0.04), 0.33, end * 0.44]}
                    >
                      <boxGeometry args={[0.06, 0.65, 0.06]} />
                      <meshStandardMaterial color="#46566e" />
                    </mesh>
                  )),
                )}
                {[-1, 1].map((side) => (
                  <mesh key={side} position={[(side * width) / 2, 0.93, 0]}>
                    <boxGeometry args={[0.045, 0.07, depth]} />
                    <meshStandardMaterial color="#172b4d" />
                  </mesh>
                ))}
              </>
            ) : data.kind === "book" ? (
              <>
                <mesh position={[0, height / 2, 0]}>
                  <boxGeometry
                    args={[width - 0.05, height - cover * 2, depth - 0.04]}
                  />
                  <meshStandardMaterial color="#fffaf1" />
                </mesh>
                {[cover / 2, height - cover / 2].map((y) => (
                  <mesh key={y} position={[0, y, 0]}>
                    <boxGeometry args={[width, cover, depth]} />
                    <meshStandardMaterial color={colour} />
                  </mesh>
                ))}
                <mesh position={[-width / 2 + 0.012, height / 2, 0]}>
                  <boxGeometry args={[0.025, height, depth]} />
                  <meshStandardMaterial color={colour} />
                </mesh>
              </>
            ) : (
              <>
                <mesh position={[0, height / 2, 0]}>
                  <boxGeometry args={[width, height, depth]} />
                  <meshStandardMaterial color={colour} roughness={0.7} />
                </mesh>
                {[0.35, 0.7].flatMap((level) =>
                  [-0.15, 0.15].map((side) => (
                    <mesh
                      key={`${level}:${side}`}
                      position={[side, height * level, depth / 2 + 0.006]}
                    >
                      <boxGeometry args={[0.1, 0.12, 0.015]} />
                      <meshStandardMaterial color="#2557d6" />
                    </mesh>
                  )),
                )}
              </>
            )}
            <group position={[0, 0.15, 0.93]} scale={0.35}>
              <Tile word={String(i + 1)} color={colour} position={[0, 0, 0]} />
            </group>
          </group>
        );
      })}
      <group ref={marker} position={[target, 0.02, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.64, 0.7, 36]} />
          <meshStandardMaterial color="#2557d6" />
        </mesh>
      </group>
    </group>
  );
}
