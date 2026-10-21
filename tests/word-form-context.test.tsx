import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import WordFormCue, { wordFormExtraContext } from "../src/WordFormCue";

describe("word-form instructions retain meaningful task scope", () => {
  it("omits only known generic repetition and preserves additional requirements", () => {
    const instruction = "变成过去式";
    expect(
      wordFormExtraContext("写出合适的动词形式。", instruction),
    ).toBeNull();
    expect(
      wordFormExtraContext("看看原词，选出变好的词。", instruction),
    ).toBeNull();
    expect(wordFormExtraContext(instruction, instruction)).toBeNull();
    const context = "根据故事里昨天的事件作答；这里不评分听音。";
    const html = renderToStaticMarkup(
      <WordFormCue cue={{ word: "write", instruction }} context={context} />,
    );
    expect(html).toContain(context);
    expect(html).toContain("write");
    expect(html).toContain(instruction);
    expect(
      wordFormExtraContext(
        "写出合适的动词形式。这里需用两个单词。",
        instruction,
      ),
    ).not.toBeNull();
  });
});
