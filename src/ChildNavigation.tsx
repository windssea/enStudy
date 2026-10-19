import type { View } from "./routes";
import LearningIcon from "./LearningIcon";
const destinations = [
  ["home", "首页"],
  ["words", "单词"],
  ["topics", "专题"],
  ["patterns", "句式"],
  ["review", "复习"],
] as const;
export default function ChildNavigation({
  active,
  onGo,
}: {
  active: View;
  onGo: (v: View) => void;
}) {
  return (
    <aside className="child-navigation">
      <a className="child-brand" href="#home" aria-label="英语探险岛，学习首页">
        <span className="learning-brand-mark" aria-hidden="true">
          EQ
        </span>
        <span>英语探险岛</span>
      </a>
      <nav aria-label="主导航">
        {destinations.map(([id, label]) => (
          <button
            key={id}
            data-place={id}
            aria-current={
              active === id || (id === "home" && active === "map")
                ? "page"
                : undefined
            }
            aria-label={
              id === "home"
                ? "学习首页"
                : id === "topics"
                  ? "专题特训，语法、时态与词形"
                  : id === "patterns"
                    ? "固定句式练习"
                    : id === "review"
                      ? "间隔复习"
                      : "单词特训"
            }
            onClick={() => onGo(id)}
          >
            <LearningIcon kind={id} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
