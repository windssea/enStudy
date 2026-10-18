import ClayStudio from "./ClayStudio";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group, OrthographicCamera } from "three";
import { Tile } from "./SceneModels";
import { RenderActivity } from "./SceneRuntime";
import { conceptProgress, timelineX } from "./conceptMotion";
import type { ConceptSceneData } from "../packages/domain/concepts";
import MeasurementModels from "./MeasurementModels";
import SpatialModels from "./SpatialModels";

function Setup({ revision, onLost }: { revision: number; onLost: () => void }) {
  const { camera, size, gl, invalidate } = useThree();
  useEffect(() => {
    const lens = camera as OrthographicCamera;
    lens.zoom = Math.min(size.width / 5.3, size.height / 3.5);
    lens.lookAt(0, 0.85, 0);
    lens.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);
  useEffect(() => {
    invalidate();
  }, [revision, invalidate]);
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
function Rail({
  data,
  revision,
  moving,
}: {
  data: ConceptSceneData;
  revision: number;
  moving: boolean;
}) {
  const marker = useRef<Group>(null),
    pieces = useRef<Group>(null);
  const motion = useRef({
    revision,
    start: 0,
    from: timelineX(data.visual?.point ?? 0.6),
    current: timelineX(data.visual?.point ?? 0.6),
  });
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 1000;
    if (motion.current.revision !== revision) {
      motion.current = {
        revision,
        start: t,
        from:
          data.kind === "timeline" ? timelineX(0.6) : motion.current.current,
        current: motion.current.current,
      };
    }
    const p = conceptProgress(t - motion.current.start, !moving);
    if (marker.current) {
      motion.current.current =
        motion.current.from +
        (timelineX(data.visual?.point ?? 0.6) - motion.current.from) * p;
      marker.current.position.x = motion.current.current;
      marker.current.position.y =
        1.35 + (moving ? Math.sin(Math.PI * p) * 0.16 : 0);
    }
    if (pieces.current)
      pieces.current.children.forEach((piece, index) => {
        const target = (index - (data.tiles.length - 1) / 2) * 1.25;
        piece.position.set(
          target + (index % 2 ? 1 : -1) * (1 - p) * 0.7,
          1.25 + (1 - p) * 0.55,
          0.15,
        );
        piece.rotation.z = (index % 2 ? 1 : -1) * (1 - p) * 0.13;
      });
  });
  if (data.kind === "morph")
    return (
      <group>
        <group ref={pieces}>
          {data.tiles.map((word, index) => (
            <group
              key={`${revision}:${index}`}
              position={[
                (index - (data.tiles.length - 1) / 2) * 1.25,
                1.25,
                0.15,
              ]}
            >
              <Tile
                word={word}
                color={
                  data.tiles.length === 1
                    ? "#b7edcd"
                    : index
                      ? "#ffb293"
                      : "#a5d7e4"
                }
                position={[0, 0, 0]}
              />
            </group>
          ))}
        </group>
        {Array.from({ length: data.tiles.length - 1 }, (_, index) => (
          <group
            key={index}
            position={[
              (index - (data.tiles.length - 2) / 2) * 1.25,
              1.25,
              0.26,
            ]}
          >
            <mesh>
              <boxGeometry args={[0.14, 0.025, 0.025]} />
              <meshStandardMaterial color="#46566e" />
            </mesh>
            {data.joiner === "→" ? (
              <mesh position={[0.075, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <coneGeometry args={[0.045, 0.08, 8]} />
                <meshStandardMaterial color="#46566e" />
              </mesh>
            ) : (
              <mesh>
                <boxGeometry args={[0.025, 0.14, 0.025]} />
                <meshStandardMaterial color="#46566e" />
              </mesh>
            )}
          </group>
        ))}
      </group>
    );
  const visual = data.visual!;
  const spans = [visual.span, visual.secondSpan].filter(
    (span): span is [number, number] => Boolean(span),
  );
  return (
    <group>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[4, 0.12, 0.18]} />
        <meshStandardMaterial color="#697e9e" />
      </mesh>
      {[
        { point: 0.16, word: "PAST" },
        { point: 0.6, word: "NOW" },
        { point: 0.94, word: "FUTURE" },
      ].map(({ point, word }) => (
        <group key={word} position={[timelineX(point), 0.22, 0]}>
          <group scale={0.65}>
            <Tile
              word={word}
              color={word === "NOW" ? "#b7edcd" : "#dcecff"}
              position={[0, 0, 0]}
            />
          </group>
        </group>
      ))}
      <mesh position={[timelineX(0.6), 1.12, -0.1]}>
        <boxGeometry args={[0.045, 1.1, 0.12]} />
        <meshStandardMaterial color="#247957" />
      </mesh>
      {spans.map((span, index) => (
        <mesh
          key={index}
          position={[
            (timelineX(span[0]) + timelineX(span[1])) / 2,
            0.92 + index * 0.22,
            0.08,
          ]}
        >
          <boxGeometry
            args={[timelineX(span[1]) - timelineX(span[0]), 0.16, 0.18]}
          />
          <meshStandardMaterial color={index ? "#c7a6f5" : "#ffcb45"} />
        </mesh>
      ))}
      {visual.repeat?.map((point, index) => (
        <mesh key={index} position={[timelineX(point), 1.04, 0]}>
          <sphereGeometry args={[0.075, 12, 8]} />
          <meshStandardMaterial color="#6240a4" />
        </mesh>
      ))}
      {visual.linkToNow && (
        <mesh
          position={[
            (timelineX(visual.point) + timelineX(0.6)) / 2,
            0.95,
            0.06,
          ]}
        >
          <boxGeometry
            args={[
              Math.abs(timelineX(0.6) - timelineX(visual.point)),
              0.1,
              0.15,
            ]}
          />
          <meshStandardMaterial color="#6240a4" />
        </mesh>
      )}
      <group ref={marker} position={[timelineX(visual.point), 1.35, 0.12]}>
        <mesh>
          <sphereGeometry args={[0.18, 16, 12]} />
          <meshStandardMaterial color="#ee786e" />
        </mesh>
        <mesh position={[0, -0.24, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.11, 0.19, 12]} />
          <meshStandardMaterial color="#9d4027" />
        </mesh>
      </group>
    </group>
  );
}
export default function ConceptCanvas({
  data,
  revision,
  moving,
  onLost,
  selectedMeasurement,
}: {
  data: ConceptSceneData;
  revision: number;
  moving: boolean;
  onLost: () => void;
  selectedMeasurement?: string;
}) {
  return (
    <Canvas
      aria-hidden="true"
      shadows="percentage"
      orthographic
      camera={{ position: [2, 2.1, 7], zoom: 70 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ alpha: true, antialias: true }}
    >
      <RenderActivity active={moving} />
      <Setup revision={revision} onLost={onLost} />
      <ClayStudio revision={`${data.kind}:${revision}`} onLost={onLost} />
      <mesh position={[0, data.kind === "spatial" ? -0.1 : -0.18, 0]}>
        <cylinderGeometry args={[2.35, 2.1, 0.2, 40]} />
        <meshStandardMaterial color="#d8c4a4" roughness={0.9} />
      </mesh>
      {data.kind === "spatial" ? (
        <SpatialModels
          data={data.spatial}
          placed={data.placed}
          revision={revision}
          moving={moving}
        />
      ) : data.measurement ? (
        <MeasurementModels
          data={data.measurement}
          selected={selectedMeasurement}
          revision={revision}
          moving={moving}
        />
      ) : (
        <Rail data={data} revision={revision} moving={moving} />
      )}
    </Canvas>
  );
}
