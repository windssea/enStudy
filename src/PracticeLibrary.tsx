import { useEffect, useRef } from "react";
import ToyPicture, { type ToyKind } from "./ToyPicture";
import PatternFrame from "./PatternFrame";
import {
  gradeName,
  type LibraryGroup,
  type LibraryItem,
  type LibraryBrowse,
} from "./practiceCatalog";

export default function PracticeLibrary({
  kind,
  items,
  groups,
  hidden = false,
  busy,
  onOpen,
  onWorkshop,
  browse,
  onBrowseChange,
}: {
  kind: "topic" | "pattern";
  items: LibraryItem[];
  groups: LibraryGroup[];
  hidden?: boolean;
  busy: boolean;
  onOpen: (id: string) => void;
  onWorkshop?: () => void;
  browse: LibraryBrowse;
  onBrowseChange: (value: LibraryBrowse) => void;
}) {
  const { group, query, year } = browse;
  const update = (patch: Partial<LibraryBrowse>) =>
    onBrowseChange({ ...browse, ...patch });
  const heading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const returnTo = useRef<string | null>(browse.returnTo ?? null);
  const moved = useRef(false);
  const previousHidden = useRef(hidden);
  const searching = Boolean(query.trim());
  const selectedGroup = groups.find((row) => row.id === group);
  const picture = (symbol: string): ToyKind =>
    (
      ({
        blocks: "topics",
        clock: "clock",
        change: "change",
        sentence: "topics",
        words: "words",
        letters: "words",
        search: "search",
        talk: "patterns",
      }) as Record<string, ToyKind>
    )[symbol] ?? "patterns";
  const visible = items.filter(
    (item) =>
      (!group || item.group === group) &&
      (!year || item.grade <= year) &&
      `${item.title} ${item.description} ${groups.find((g) => g.id === item.group)?.title ?? item.group}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  useEffect(() => {
    if (!hidden && previousHidden.current) {
      const button =
        (returnTo.current ? buttons.current.get(returnTo.current) : null) ??
        heading.current;
      button?.focus({ preventScroll: true });
      button?.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
    previousHidden.current = hidden;
  }, [hidden]);
  useEffect(() => {
    if (!moved.current || hidden) return;
    moved.current = false;
    const target =
      !group && returnTo.current?.startsWith("group:")
        ? buttons.current.get(returnTo.current)
        : heading.current;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [group, hidden]);
  const chooseGroup = (id: string) => {
    returnTo.current = `group:${id}`;
    moved.current = true;
    update({ group: id, query: "", returnTo: `group:${id}` });
  };
  const back = () => {
    moved.current = true;
    returnTo.current = `group:${group}`;
    update({ group: null, query: "", returnTo: `group:${group}` });
  };
  return (
    <section className="practice-library" data-kind={kind} hidden={hidden}>
      {!hidden && !group && !searching && (
        <div className="discovery-hero library-hero">
          <div>
            <h1>{kind === "topic" ? "专题特训" : "固定句式"}</h1>
          </div>
          {onWorkshop && (
            <button className="secondary" onClick={onWorkshop} disabled={busy}>
              辨析与应用
            </button>
          )}
        </div>
      )}
      <div className="library-location" hidden={!group && !searching}>
        {group && (
          <button className="secondary" onClick={back} disabled={busy}>
            ← 换个{kind === "topic" ? "类别" : "场景"}
          </button>
        )}
        <p>
          {kind === "topic" ? "专题特训" : "固定句式"}
          <span aria-hidden="true"> / </span>
          {selectedGroup?.title ?? (searching ? "搜索结果" : "选择入口")}
        </p>
      </div>
      <div className="library-heading">
        <div>
          {group || searching ? (
            <h1 ref={heading} tabIndex={-1}>
              {selectedGroup?.title ?? "找到这些小挑战"}
            </h1>
          ) : (
            <h2 ref={heading} tabIndex={-1}>
              {kind === "topic" ? "选择专题类别" : "选择句式场景"}
            </h2>
          )}
        </div>
        <p role="status">
          {group || searching
            ? `${visible.length}个可选${kind === "topic" ? "专题" : "句式"}`
            : ""}
        </p>
      </div>
      <details className="child-library-options">
        <summary>
          <ToyPicture kind="parent" />
          搜索与年级筛选
        </summary>
        <div className="filter-row library-filters">
          <label>
            找{kind === "topic" ? "专题" : "句式"}
            <input
              ref={searchInput}
              type="search"
              value={query}
              onChange={(e) => update({ query: e.target.value })}
              placeholder={
                kind === "topic"
                  ? "例如：过去、复数、介词"
                  : "例如：邀请、would like"
              }
            />
          </label>
          <label>
            建议年级
            <select
              value={year}
              disabled={busy}
              onChange={(e) => update({ year: Number(e.target.value) })}
            >
              <option value={0}>全部年级</option>
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>
                  {gradeName(value)}年级及以下起步
                </option>
              ))}
            </select>
          </label>
          {(searching || year > 0) && (
            <button
              className="text-button"
              onClick={() => {
                update({ query: "", year: 0 });
                searchInput.current?.focus();
              }}
            >
              清除筛选
            </button>
          )}
        </div>
      </details>
      {group || searching ? (
        <div className="library-item-grid">
          {visible.map((item) => (
            <button
              className={`library-item word-tone-${
                Math.max(
                  0,
                  groups.findIndex((g) => g.id === item.group),
                ) % 4
              }`}
              key={item.id}
              ref={(node) => {
                if (node) buttons.current.set(item.id, node);
                else buttons.current.delete(item.id);
              }}
              disabled={busy || !item.available}
              onClick={() => {
                returnTo.current = item.id;
                update({ returnTo: item.id });
                onOpen(item.id);
              }}
            >
              <span className="library-item-meta">
                {gradeName(item.grade)}年级起 ·{" "}
                {item.available ? "可练习" : "题库准备中"}
              </span>
              <strong lang={kind === "pattern" ? "en" : undefined}>
                {kind === "pattern" ? (
                  <PatternFrame frame={item.title} />
                ) : (
                  item.title
                )}
              </strong>
              <span>{item.description}</span>
              <span className="library-card-action">
                进入练习 <span aria-hidden="true">→</span>
              </span>
            </button>
          ))}
          {!visible.length && (
            <p className="empty-state">
              这次没有找到，换个关键词或清除筛选再试试。
            </p>
          )}
        </div>
      ) : (
        <div className="library-group-grid">
          {groups.map((entry, index) => {
            const count = visible.filter(
              (item) => item.group === entry.id,
            ).length;
            return (
              <article className="child-library-group" key={entry.id}>
                <button
                  className={`library-group word-tone-${index % 4}`}
                  key={entry.id}
                  disabled={busy || !count}
                  ref={(node) => {
                    if (node) buttons.current.set(`group:${entry.id}`, node);
                    else buttons.current.delete(`group:${entry.id}`);
                  }}
                  onClick={() => chooseGroup(entry.id)}
                >
                  <span className="library-symbol">
                    <ToyPicture kind={picture(entry.symbol)} />
                  </span>
                  <strong>{entry.title}</strong>
                  <span>{entry.description}</span>
                  <span className="library-card-action">
                    {count}个{kind === "topic" ? "专题" : "句式"}
                    <span aria-hidden="true"> →</span>
                  </span>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
