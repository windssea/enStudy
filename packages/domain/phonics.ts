import type { PhonicsWord } from "../contracts/phonics";
export const phonicsGroupLabel = (word: PhonicsWord, group: number[]) =>
  group
    .map((i) => word.tiles[i])
    .join(group.some((v, i) => i > 0 && v !== group[i - 1] + 1) ? "_" : "");
export function validPhonicsWord(w: PhonicsWord) {
  const indices = w.groups.flat();
  return (
    /^[a-z]+$/.test(w.word) &&
    w.tiles.join("") === w.word &&
    w.groups.length > 0 &&
    indices.length === w.tiles.length &&
    new Set(indices).size === w.tiles.length &&
    indices.every((i) => Number.isInteger(i) && i >= 0 && i < w.tiles.length) &&
    w.groups.every((g) => g.length > 0) &&
    w.focus.length > 0 &&
    w.focus.every((i) => Number.isInteger(i) && i >= 0 && i < w.tiles.length) &&
    /^\/audio\/phonics\/[a-f0-9]{24}\.wav$/.test(w.audioUrl)
  );
}
