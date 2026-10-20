import data from "../../content/ket/words.v1.json" with { type: "json" };
import type { WordCard, WordTheme, WordMode } from "../contracts/index";

export interface KetWord extends WordCard {
  alternatives: string[];
  section: string;
  headword: string;
  pos: string;
  pages: number[];
}
const words = data.words as KetWord[];
const themes: (WordTheme & { words: KetWord[] })[] = [];
for (const section of ["alphabet", "numbers", "ordinals", "world"]) {
  const entries = words.filter((w) => w.section === section);
  const groups = Math.ceil(entries.length / 40);
  for (let group = 1; group <= groups; group++) {
    const cards = entries.slice(
      Math.floor(((group - 1) * entries.length) / groups),
      Math.floor((group * entries.length) / groups),
    );
    const title = {
      alphabet: "词汇",
      numbers: "数字",
      ordinals: "序数",
      world: "世界",
    }[section];
    themes.push({
      id: `ket.${section}.${String(group).padStart(2, "0")}`,
      grade: 0,
      collection: "ket",
      section,
      title: `KET ${title} ${String(group).padStart(2, "0")}`,
      description: `${cards[0].word} — ${cards.at(-1)!.word}`,
      letters: [...new Set(cards.map((w) => w.word[0].toUpperCase()))],
      wordCount: cards.length,
      items: cards.length * 2,
      modes: ["mixed", "meaning", "spelling"] as WordMode[],
      words: cards,
    });
  }
}
const items = themes.flatMap((theme) =>
  theme.words.flatMap((word, index) => {
    const distractors: KetWord[] = [];
    const accepted = new Set(
      [word.word, ...word.alternatives].map((s) => s.toLowerCase()),
    );
    for (let step = 0; distractors.length < 2 && step < words.length; step++) {
      const candidate = words[(index * 37 + 91 + step * 743) % words.length];
      if (
        candidate.meaning === word.meaning ||
        distractors.some((d) => d.meaning === candidate.meaning) ||
        [candidate.word, ...candidate.alternatives].some((s) =>
          accepted.has(s.toLowerCase()),
        ) ||
        [...candidate.meaning.matchAll(/[\u4e00-\u9fff]{2,}/g)].some(([s]) =>
          word.meaning.includes(s),
        )
      )
        continue;
      distractors.push(candidate);
    }
    if (distractors.length !== 2)
      throw Error(`KET distractors missing: ${word.id}`);
    return (["meaning", "spelling"] as const).map((mode) => ({
      id: `word.${word.id}.${mode}`,
      wordId: word.id,
      wordThemeId: theme.id,
      wordMode: mode,
      category: "vocabulary" as const,
      title: `${theme.title} · ${mode === "meaning" ? "认词义" : "练拼写"}`,
      context:
        mode === "meaning"
          ? "结合例句，选择这张词卡的意思。"
          : "按 KET 词卡的写法拼写单词或词组。",
      prompt:
        mode === "meaning"
          ? word.word
          : `${word.meaning}（${word.word.replace(/[^a-z]/gi, "").length > 2 ? `首字母 ${word.word[0]}；` : ""}${word.word.replace(/[^a-z]/gi, "").length} 个英文字母${word.alternatives.length ? "，接受词卡中的其他写法" : ""}）`,
      ...(mode === "meaning"
        ? {
            reading: word.example,
            choices: [word.meaning, ...distractors.map((f) => f.meaning)],
          }
        : {}),
      type: mode === "meaning" ? ("choice" as const) : ("input" as const),
      answers:
        mode === "meaning" ? [word.meaning] : [word.word, ...word.alternatives],
      gradeMin: 1,
      skill: `lexeme.word.${word.id}`,
      modality: mode === "meaning" ? "recognition" : "spelling",
      family: `word-sense-${word.id}`,
      pattern: `vocabulary.${mode}`,
      hint:
        mode === "meaning"
          ? `再读例句：${word.example}`
          : `开头是 ${word.word.slice(0, 2)}。`,
      explanation: `${word.word}：${word.meaning}。${word.example}`,
    }));
  }),
);
export const ketRelease = {
  id: data.id,
  source: data.source,
  themes,
  items,
  totalWords: words.length,
  totalItems: items.length,
};
export function searchKetWords(query: string, offset = 0) {
  const key = query.trim().toLocaleLowerCase();
  const rows = themes.flatMap((t) =>
    t.words.map((w) => ({ word: w, themeId: t.id, themeTitle: t.title })),
  );
  const matches = rows.filter(
    ({ word: w }) =>
      !key ||
      [w.word, w.meaning, w.headword, ...w.alternatives].some((s) =>
        s.toLocaleLowerCase().includes(key),
      ),
  );
  const ranked = matches
    .map((row, index) => ({
      row,
      index,
      rank:
        row.word.word.toLowerCase() === key
          ? 0
          : row.word.word.toLowerCase().startsWith(key)
            ? 1
            : 2,
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);
  return {
    query,
    offset,
    total: matches.length,
    results: ranked.slice(offset, offset + 24).map(({ row }) => row),
  };
}
