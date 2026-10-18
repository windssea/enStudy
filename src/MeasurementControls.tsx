import {
  measurementColour,
  measurementSummary,
  type MeasurementVisual,
} from "../packages/domain/measurements";
export default function MeasurementControls({
  data,
  selected,
  onSelect,
}: {
  data: MeasurementVisual;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="measurement-controls" data-count={data.items.length}>
      <p>点选物品，看看{data.metric}。数字是同一组虚构数据。</p>
      <div
        className="measurement-choices"
        role="group"
        aria-label={`选择物品观察${data.metric}`}
      >
        {data.items.map((item, index) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={selected === item.id}
            onClick={() => onSelect(item.id)}
          >
            <span
              className="measurement-number"
              style={{
                background: measurementColour(index, data.items.length),
              }}
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <span>
              <strong>{item.label}</strong>
              <span>
                {item.value}
                {data.unit}
              </span>
            </span>
            <small>{selected === item.id ? "正在观察" : "点我看看"}</small>
          </button>
        ))}
      </div>
      <p className="measurement-status" role="status" aria-atomic="true">
        {measurementSummary(data, selected)}
      </p>
    </div>
  );
}
