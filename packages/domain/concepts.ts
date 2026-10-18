import source from "../../content/concept-labs.v1.json";
import type { MeasurementVisual } from "./measurements";
import type { SpatialVisual } from "./spatial";
export type TimelineVisual = {
  point: number;
  span?: [number, number];
  secondSpan?: [number, number];
  repeat?: number[];
  linkToNow?: boolean;
};
export type ConceptStep = { tiles: string[]; note: string; joiner?: "+" | "→" };
type BaseCase = {
  id: string;
  label: string;
  sentence: string;
  translation: string;
  note: string;
};
export type TimeCase = BaseCase & { visual: TimelineVisual };
export type MorphCase = BaseCase & {
  base: string;
  result: string;
  targetForms: string[];
  steps: ConceptStep[];
  measurement?: MeasurementVisual;
};
export type SpatialCase = BaseCase & { spatial: SpatialVisual };
export type ConceptCase = TimeCase | MorphCase | SpatialCase;
export type ConceptLabData = {
  id: string;
  skill: string;
  title: string;
  description: string;
  cases: ConceptCase[];
  kind: "timeline" | "morph" | "spatial";
};
export const conceptLabs = source.labs as unknown as ConceptLabData[];
export const conceptLab = (id: string) =>
  conceptLabs.find((lab) => lab.id === id);
export function conceptView(
  lab: ConceptLabData,
  example: ConceptCase,
  step: number,
) {
  const safeStep = Number.isInteger(step) ? Math.max(0, Math.min(2, step)) : 0;
  if (lab.kind === "spatial" && "spatial" in example)
    return {
      kind: "spatial" as const,
      spatial: example.spatial,
      placed: safeStep > 0,
      visual: undefined,
      tiles: [] as string[],
      joiner: "+" as const,
      note: [
        "先找到珊瑚色小球，再找桌子和开口盒子。轻点下一步，看球移动。",
        example.note,
        `用英文说明这个位置：${example.note}`,
      ][safeStep],
      measurement: undefined,
    };
  if (lab.kind === "timeline" && "visual" in example)
    return {
      kind: "timeline" as const,
      visual: example.visual,
      tiles: [] as string[],
      joiner: "+" as const,
      note: example.note,
      measurement: undefined,
    };
  if ("steps" in example)
    return {
      kind: "morph" as const,
      visual: undefined,
      tiles: example.steps[safeStep].tiles,
      joiner: example.steps[safeStep].joiner ?? "+",
      note: example.steps[safeStep].note,
      measurement: example.measurement,
    };
  throw new Error("演示内容与场景类型不一致。");
}
export type ConceptSceneData = ReturnType<typeof conceptView>;
