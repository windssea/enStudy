import ClayStudio from "./ClayStudio";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Color,
  Object3D,
  type Group,
  type InstancedMesh,
  type OrthographicCamera,
} from "three";
import { Explorer, Tile } from "./SceneModels";
import { RenderActivity } from "./SceneRuntime";
import { createIslandModel } from "./scene/islandModel";
import {
  mapColors,
  mapKinds,
  mapStops,
  mapRoutePoint,
  mapRouteLeg,
  mapLegLength,
  mapTravel,
} from "./scene/mapRoute";
import type { CourseMapStation } from "./courseMapModel";
import { roundedPanel } from "./scene/foxModel";

function Framing({ onLost }: { onLost: () => void }) {
  const { camera, size, invalidate, gl } = useThree();
  useLayoutEffect(() => {
    const lens = camera as OrthographicCamera;
    lens.zoom = Math.min(size.width / 10.8, size.height / 6.1);
    lens.lookAt(0, 0.35, 0.35);
    lens.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
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

function Island({
  index,
  station,
  selected,
  onSelect,
}: {
  index: number;
  station: CourseMapStation;
  selected: boolean;
  onSelect: (index: number) => void;
}) {
  const { gl } = useThree();
  const model = useMemo(
    () => createIslandModel(mapKinds[index], mapColors[index]),
    [index],
  );
  useEffect(() => () => model.dispose(), [model]);
  useEffect(
    () => () => {
      gl.domElement.style.cursor = "";
    },
    [gl],
  );
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.delta <= 8 && station.next) onSelect(index);
  };
  const [x, y, z] = mapStops[index];
  return (
    <group
      position={[x, y, z]}
      onClick={activate}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (station.next) gl.domElement.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = "";
      }}
    >
      <group scale={0.77}>
        <primitive object={model.root} />
      </group>
      <mesh position={[0, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, selected ? 0.055 : 0.025, 8, 64]} />
        <meshStandardMaterial
          color={selected ? "#2557d6" : "#fffaf1"}
          roughness={0.9}
        />
      </mesh>
      <group position={[-0.65, 0.6, 0.7]} scale={0.65}>
        <Tile
          word={String(station.number)}
          fontSize={112}
          color={selected ? "#96daff" : "#fff1d6"}
          position={[0, 0, 0]}
        />
      </group>
      {station.total > 0 && station.practised === station.total && (
        <group position={[0.85, 0.7, 0.15]}>
          <mesh>
            <cylinderGeometry args={[0.018, 0.018, 0.8, 6]} />
            <meshStandardMaterial color="#bb8d62" />
          </mesh>
          <group position={[0.15, 0.26, 0]} scale={0.3}>
            <Tile word="✓" color="#b3edce" position={[0, 0, 0]} />
          </group>
        </group>
      )}
    </group>
  );
}

function Path({ count }: { count: number }) {
  const instances = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => roundedPanel(0.18, 0.1, 0.62, 0.035), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const planks = useMemo(() => {
    const result: { x: number; y: number; z: number; angle: number }[] = [];
    for (let index = 0; index < Math.min(count - 1, 5); index++) {
      const steps = Math.ceil(mapLegLength(mapRouteLeg(index)) / 0.21);
      for (let step = 0; step <= steps; step++) {
        const p = index + step / steps;
        const point = mapRoutePoint(p);
        if (
          mapStops.some(
            (s) => Math.hypot(s[0] - point[0], s[2] - point[2]) < 1.04,
          )
        )
          continue;
        const before = mapRoutePoint(Math.max(index, p - 0.001)),
          after = mapRoutePoint(Math.min(index + 1, p + 0.001));
        result.push({
          x: point[0],
          y: 0.3,
          z: point[2],
          angle: Math.atan2(before[2] - after[2], after[0] - before[0]),
        });
      }
    }
    return result;
  }, [count]);
  useLayoutEffect(() => {
    const mesh = instances.current;
    if (!mesh) return;
    const transform = new Object3D();
    for (const [i, p] of planks.entries()) {
      transform.position.set(p.x, p.y, p.z);
      transform.rotation.set(0, p.angle, 0);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
      mesh.setColorAt(i, new Color(i % 2 ? "#efc68b" : "#ffe0a8"));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [planks]);
  return (
    <instancedMesh ref={instances} args={[geometry, undefined, planks.length]}>
      <meshStandardMaterial roughness={0.95} />
    </instancedMesh>
  );
}

function TravellingPartner({
  selected,
  quiet,
  moving,
  greet,
  turned,
}: {
  selected: number;
  quiet: boolean;
  moving: boolean;
  greet: number;
  turned: boolean;
}) {
  const root = useRef<Group>(null);
  const initialPosition = useRef(mapRoutePoint(selected));
  const travel = useRef({
    from: selected,
    to: selected,
    value: selected,
    started: -Infinity,
    fromLift: 0,
  });
  useLayoutEffect(() => {
    const state = travel.current;
    if (quiet || !moving) {
      travel.current = {
        from: selected,
        to: selected,
        value: selected,
        started: -Infinity,
        fromLift: 0,
      };
      root.current?.position.set(...mapRoutePoint(selected));
      if (root.current) {
        root.current.rotation.y = 0;
        root.current.rotation.z = 0;
      }
    } else if (state.to !== selected) {
      travel.current = {
        from: state.value,
        to: selected,
        value: state.value,
        started: performance.now(),
        fromLift: Math.max(0, (root.current?.position.y ?? 0.37) - 0.37),
      };
    }
  }, [selected, quiet, moving]);
  useFrame((_, delta) => {
    if (!root.current) return;
    const state = travel.current;
    const sample = mapTravel(
      state.from,
      state.to,
      performance.now() - state.started,
      quiet || !moving,
      state.fromLift,
    );
    state.value = sample.value;
    const previous = root.current.position.clone();
    root.current.position.set(...sample.position);
    const dx = sample.position[0] - previous.x,
      dz = sample.position[2] - previous.z;
    const target =
      sample.moving && Math.hypot(dx, dz) > 0.00001 ? Math.atan2(dx, dz) : 0;
    const difference = Math.atan2(
      Math.sin(target - root.current.rotation.y),
      Math.cos(target - root.current.rotation.y),
    );
    root.current.rotation.y += difference * Math.min(1, delta * 15);
    root.current.rotation.z = sample.moving
      ? Math.sin(sample.value * Math.PI * 4) * 0.035
      : 0;
  });
  return (
    <group ref={root} position={initialPosition.current}>
      <group scale={0.62}>
        <Explorer
          paused={quiet || !moving}
          pulse={greet}
          turned={turned}
          idle={false}
        />
      </group>
    </group>
  );
}

function SkyToy({ moving, greet }: { moving: boolean; greet: number }) {
  const group = useRef<Group>(null);
  const start = useRef(-Infinity);
  const seen = useRef(greet);
  useEffect(() => {
    if (!moving) start.current = -Infinity;
    else if (seen.current !== greet) start.current = performance.now();
    seen.current = greet;
  }, [greet, moving]);
  useFrame(() => {
    if (!group.current) return;
    const age = (performance.now() - start.current) / 1500;
    const wave = moving && age >= 0 && age < 1 ? Math.sin(age * Math.PI) : 0;
    group.current.rotation.z = wave * 0.12;
    group.current.position.y = 2.65 + wave * 0.16;
  });
  return (
    <group ref={group} position={[-4.2, 2.65, 0.3]} scale={0.55}>
      <mesh scale={[0.65, 0.8, 0.65]}>
        <sphereGeometry args={[1, 32, 20]} />
        <meshStandardMaterial color="#ffa589" roughness={0.92} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.64, 0.055, 8, 32]} />
        <meshStandardMaterial color="#fff1d6" roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.23, -0.78, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.66, 6]} />
          <meshStandardMaterial color="#bb8d62" />
        </mesh>
      ))}
      <mesh position={[0, -1.1, 0]}>
        <capsuleGeometry args={[0.25, 0.17, 4, 12]} />
        <meshStandardMaterial color="#efc68b" roughness={0.95} />
      </mesh>
    </group>
  );
}

export default function CourseMapCanvas({
  quiet,
  moving,
  selected,
  stations,
  onSelect,
  greet = 0,
  turned = false,
  onLost,
}: {
  quiet: boolean;
  moving: boolean;
  selected: number;
  stations: CourseMapStation[];
  onSelect: (index: number) => void;
  greet?: number;
  turned?: boolean;
  onLost: () => void;
}) {
  return (
    <Canvas
      aria-hidden="true"
      shadows="percentage"
      orthographic
      camera={{ position: [0, 10, 14], zoom: 43 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      style={{ touchAction: "pan-y" }}
    >
      <ClayStudio
        wide
        revision={`${selected}:${greet}:${turned}:${stations.map((s) => s.practised).join(":")}`}
        onLost={onLost}
      />
      <RenderActivity active={!quiet && moving} />
      <Framing onLost={onLost} />
      {stations.slice(0, 6).map((station, index) => (
        <Island
          key={station.id}
          index={index}
          station={station}
          selected={selected === index}
          onSelect={onSelect}
        />
      ))}
      <Path count={stations.length} />
      <TravellingPartner
        selected={selected}
        quiet={quiet}
        moving={moving}
        greet={greet}
        turned={turned}
      />
      <SkyToy moving={!quiet && moving} greet={greet} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.7, 0.3]}
        scale={[1, 0.7, 1]}
      >
        <circleGeometry args={[6.2, 64]} />
        <meshBasicMaterial
          color="#c8e9f6"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>
    </Canvas>
  );
}
