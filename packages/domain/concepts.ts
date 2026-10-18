import source from "../../content/concept-labs.v1.json";
import type { MeasurementVisual } from "./measurements";
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
export type ConceptCase = TimeCase | MorphCase;
export type ConceptLabData = {
  id: string;
  skill: string;
  title: string;
  description: string;
  cases: ConceptCase[];
  kind: "timeline" | "morph";
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
