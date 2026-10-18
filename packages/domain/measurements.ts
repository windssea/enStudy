export type MeasurementVisual = {
  kind: "tower" | "bridge" | "book";
  metric: string;
  unit: string;
  preference: "larger" | "smaller";
  comparative: string;
  superlative: string;
  targetId: string;
  items: { id: string; label: string; value: number }[];
};
export const MEASUREMENT_COLOURS = ["#78c7f4", "#64dcae", "#ffa589"];
export const measurementColour = (index: number, count: number) =>
  MEASUREMENT_COLOURS[count === 2 && index === 1 ? 2 : index];
export function measurementRatio(data: MeasurementVisual, value: number) {
  const max = Math.max(...data.items.map((item) => item.value));
  return Number.isFinite(value) && Number.isFinite(max) && max > 0
    ? Math.max(0, Math.min(1, value / max))
    : 0;
}
export function measurementDimensions(
  data: MeasurementVisual,
  value: number,
): [number, number, number] {
  const ratio = measurementRatio(data, value);
  return data.kind === "tower"
    ? [0.65, ratio * 2.1, 0.65]
    : data.kind === "bridge"
      ? [ratio * 1.35, 0.12, 1.15]
      : [1, ratio * 0.9, 1.2];
}
export const measurementX = (index: number, count: number) =>
  (index - (count - 1) / 2) * (count === 2 ? 2.05 : 1.5);
export function measurementSummary(data: MeasurementVisual, id: string) {
  const selected = data.items.find((item) => item.id === id) ?? data.items[0];
  if (!selected) return "还没有可比较的数据。";
  const values = data.items.map((item) => item.value);
  const best =
    data.preference === "larger" ? Math.max(...values) : Math.min(...values);
  const prefix = `${selected.label}：${selected.value}${data.unit}。`;
  if (values.every((value) => value === values[0]))
    return `${prefix}这组物品的${data.metric}相同。`;
  if (selected.value === best) {
    if (values.filter((value) => value === best).length > 1)
      return `${prefix}有不止一个物品并列${data.superlative}。`;
    return `${prefix}${data.items.length === 2 ? `两者相比，它${data.comparative}` : `在这${data.items.length}个物品中，它${data.superlative}`}。`;
  }
  return `${prefix}对照全部数据，再找一找${data.items.length === 2 ? data.comparative : data.superlative}的那个。`;
}
