import { useEffect, useRef, useState } from "react";
import type { Answer, Exercise } from "../packages/contracts/index";
import { joinParts } from "../packages/domain/structured";
export default function StructuredAnswer({
  exercise,
  answer,
  onChange,
  disabled,
}: {
  exercise: Exercise;
  answer: Answer;
  onChange: (answer: Answer) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null),
    [announcement, setAnnouncement] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const values = Array.isArray(answer) ? answer : [];
  useEffect(() => {
    setSelected(null);
    setAnnouncement("");
  }, [exercise.id]);
  useEffect(() => {
    if (exercise.type === "repair" && values[0] && !disabled)
      input.current?.focus();
  }, [values[0], disabled, exercise.type]);
  if (exercise.type === "sort" && exercise.sorting) {
    const { cards, groups } = exercise.sorting,
      placements = Object.fromEntries(values.map((v) => v.split("="))),
      chosen = cards.find((c) => c.id === selected);
    const move = (group: string) => {
      if (!chosen || disabled) return;
      const next = { ...placements, [chosen.id]: group };
      onChange(
        cards.filter((c) => next[c.id]).map((c) => `${c.id}=${next[c.id]}`),
      );
      setAnnouncement(
        `已把 ${chosen.text} 放到 ${groups.find((g) => g.id === group)?.label}。还可以改放，尚未判题。`,
      );
      setSelected(null);
      cardRefs.current[chosen.id]?.focus();
    };
    return (
      <div className="sorting-answer">
        <p className="sorting-count" role="status">
          已放好{values.length}/{cards.length}张 ·{" "}
          {chosen
            ? `已选：${chosen.text}`
            : "点选卡片，再点篮子；用Tab和Enter也能完成。"}
        </p>
        <div className="sorting-cards" aria-label="选择要移动的卡片">
          {cards.map((c) => (
            <button
              type="button"
              key={c.id}
              ref={(node) => {
                cardRefs.current[c.id] = node;
              }}
              className="sorting-card"
              data-placed={!!placements[c.id]}
              aria-pressed={selected === c.id}
              disabled={disabled}
              onClick={() => setSelected(selected === c.id ? null : c.id)}
            >
              <strong lang="en">{c.text}</strong>
              <small>
                {groups.find((g) => g.id === placements[c.id])?.label ??
                  "还没放好"}
              </small>
            </button>
          ))}
        </div>
        <div className="sorting-baskets" aria-label="分类篮子">
          {groups.map((g, index) => (
            <section
              className="sorting-basket"
              key={g.id}
              data-tone={index % 3}
            >
              <button
                className="secondary"
                type="button"
                disabled={disabled || !chosen}
                onClick={() => move(g.id)}
                aria-label={
                  chosen
                    ? `把${chosen.text}放进${g.label}`
                    : `先选卡片，再放进${g.label}`
                }
              >
                <svg viewBox="0 0 48 36" aria-hidden="true">
                  <path
                    d="M5 12h38l-5 20H10Z M14 12 21 3M34 12 27 3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                </svg>
                {g.label}
              </button>
              <ul>
                {cards
                  .filter((c) => placements[c.id] === g.id)
                  .map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        className="basket-chip"
                        onClick={() => {
                          setSelected(c.id);
                          setAnnouncement(
                            `已选择${c.text}，再点一个篮子改放。`,
                          );
                        }}
                        lang="en"
                      >
                        {c.text}
                        <span className="visually-hidden">，点击改放</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="visually-hidden" role="status">
          {announcement}
        </p>
        {values.length > 0 && (
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={() => {
              onChange([]);
              setSelected(null);
              setAnnouncement("已取回所有卡片，可以重新分组。");
            }}
          >
            取回所有卡片
          </button>
        )}
      </div>
    );
  }
  if (exercise.type === "repair" && exercise.editing) {
    const parts = exercise.editing.parts,
      picked = parts.find((p) => p.id === values[0]),
      replacement = values[1] ?? "";
    return (
      <div className="repair-answer">
        <p>先找到一处需要调整的词块。选中后，下面填写新词或短语。</p>
        <div className="repair-parts" aria-label="选择要修改的词块">
          {parts.map((p) => (
            <button
              type="button"
              key={p.id}
              className="repair-part"
              aria-pressed={values[0] === p.id}
              disabled={disabled}
              onClick={() => {
                if (values[0] !== p.id) onChange([p.id, ""]);
                setAnnouncement(`已选中 ${p.text}，请填写新词或短语。`);
                input.current?.focus();
              }}
              lang="en"
            >
              {p.text}
            </button>
          ))}
        </div>
        <label className="field">
          {picked ? `把“${picked.text}”改成` : "先选一个词块，再填写修改"}
          <input
            ref={input}
            disabled={disabled || !picked}
            value={replacement}
            onChange={(e) => onChange([values[0], e.target.value])}
            maxLength={60}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="none"
            lang="en"
          />
        </label>
        <div className="repair-preview">
          <small>我的修改预览 · 还没判题</small>
          <p lang="en">
            {joinParts(
              parts.map((p) =>
                p.id === values[0] && replacement.trim()
                  ? replacement.trim()
                  : p.text,
              ),
            )}
          </p>
        </div>
        <p className="visually-hidden" role="status">
          {announcement}
        </p>
      </div>
    );
  }
  return null;
}
