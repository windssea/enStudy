import SceneStage from "./SceneStage";
import ToyPicture from "./ToyPicture";
import GuideButton from "./GuideButton";
import type { View } from "./routes";
export default function ChildHome({
  nickname,
  busy,
  ready,
  resume,
  onStart,
  onGo,
}: {
  nickname?: string;
  busy: boolean;
  ready: boolean;
  resume: boolean;
  onStart: () => void;
  onGo: (v: View) => void;
}) {
  return (
    <div className="child-home">
      <section className="child-welcome">
        <div className="child-welcome-copy">
          <p className="child-greeting">
            {nickname ? `${nickname}，你好呀！` : "你好呀，小探险家！"}
          </p>
          <h1>一起玩英语</h1>
          <GuideButton id="home" />
          <button
            className="child-play"
            disabled={busy || !ready}
            onClick={onStart}
            aria-label={
              resume
                ? "继续上次的学习"
                : nickname
                  ? "打开今天的小课"
                  : "请家长选择档案，再开始"
            }
          >
            <ToyPicture kind="play" />
            <span>
              {busy || !ready ? "准备中" : resume ? "接着玩" : "出发"}
            </span>
          </button>
          {!nickname && (
            <p className="child-parent-hint">第一次玩，请大人帮忙选好档案。</p>
          )}
        </div>
        <div className="child-host">
          <SceneStage kind="partner" simple />
        </div>
      </section>
      <h2 className="child-choose-title">也可以选一个</h2>
      <div className="child-destinations">
        {(
          [
            ["words", "单词小宝箱"],
            ["map", "小岛探险"],
            ["review", "照顾小花园"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} data-place={id} onClick={() => onGo(id)}>
            <ToyPicture kind={id} />
            <span>{label}</span>
            <span className="child-card-arrow" aria-hidden="true">
              ↗
            </span>
          </button>
        ))}
      </div>
      <details className="child-toybox">
        <summary>
          <ToyPicture kind="topics" />
          更多玩法
        </summary>
        <div>
          {(
            [
              ["topics", "句子积木"],
              ["patterns", "说一句"],
              ["phonics", "拼单词"],
              ["writing", "写一写"],
              ["talk", "小剧场"],
              ["workshops", "动手玩"],
              ["offline", "本机练习"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} onClick={() => onGo(id)}>
              <ToyPicture
                kind={
                  id === "phonics"
                    ? "words"
                    : id === "writing" || id === "talk"
                      ? "patterns"
                      : id === "workshops"
                        ? "topics"
                        : id === "offline"
                          ? "home"
                          : id
                }
              />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
