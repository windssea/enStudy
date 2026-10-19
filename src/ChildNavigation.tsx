import type { View } from "./routes";
import ToyPicture from "./ToyPicture";
const destinations = [
  ["home", "小屋"],
  ["words", "单词"],
  ["topics", "积木"],
  ["patterns", "说一句"],
  ["review", "小花园"],
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
      <a className="child-brand" href="#home" aria-label="英语探险岛，回到小屋">
        <ToyPicture kind="home" />
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
                ? "回到小屋"
                : id === "topics"
                  ? "句子积木，专题特训"
                  : id === "patterns"
                    ? "说一句，固定句式"
                    : id === "review"
                      ? "小花园，复习"
                      : "单词特训"
            }
            onClick={() => onGo(id)}
          >
            <ToyPicture kind={id} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
