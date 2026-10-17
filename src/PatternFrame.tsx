const slotLabels: Record<string, string> = {
  name: "名字",
  feeling: "感受",
  "noun phrase": "人或事物",
  number: "数量",
  place: "地点",
  "singular noun phrase": "一个人或事物",
  "plural noun phrase": "多个人或事物",
  adjective: "特点",
  "place phrase": "地点",
  "V-ing phrase": "动作（-ing）",
  "V-base phrase": "动作（原形）",
  category: "类别",
  person: "人物",
  "noun / V-ing phrase": "事物或动作（-ing）",
  time: "一段时间",
  "comparison target": "比较的对象",
  "comparative adjective": "比较级",
  "superlative adjective": "最高级",
  "plural noun": "多个人或事物",
  "main clause": "要说的事",
  "reason clause": "原因",
  "cause clause": "原因",
  "result clause": "结果",
  "present clause": "现在时条件",
  "will clause": "将来的事",
  "past clause": "过去发生的事",
  "past main clause": "过去的另一件事",
  "parallel phrase": "同类词语",
  "contrasting adjective": "不同的特点",
};
export default function PatternFrame({ frame }: { frame: string }) {
  return (
    <>
      {frame.split(/(\[[^\]]+\])/g).map((part, index) =>
        part.startsWith("[") && part.endsWith("]") ? (
          <span className="frame-slot" lang="zh-CN" key={index}>
            {slotLabels[part.slice(1, -1)] ?? part.slice(1, -1)}
          </span>
        ) : (
          <span lang="en" key={index}>
            {part}
          </span>
        ),
      )}
    </>
  );
}
