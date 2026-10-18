export type WordObjectKind =
  "apple" | "banana" | "book" | "pencil" | "fish" | "orange-swatch";
const objects: Record<string, WordObjectKind> = {
  "food.apple": "apple",
  "food.banana": "banana",
  "school.book": "book",
  "school.pencil": "pencil",
  "animals.fish": "fish",
  "colours-shapes.orange": "orange-swatch",
};
/** Use the sense-specific word ID: orange (colour) must not become a fruit. */
export const wordObjectKind = (word: { id: string }) =>
  objects[word.id] ?? null;
export function wordObjectNote(kind: WordObjectKind) {
  return kind === "orange-swatch"
    ? "orange 在这张词卡里表示“橙色的”。观察色块，再读例句中的橙色胡萝卜。"
    : "粘土示意，不按真实大小比例。转一转，观察外形，再把单词放回例句里。";
}
