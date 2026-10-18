import type { PhonicsWord } from "../packages/contracts/phonics";
import { phonicsGroupLabel } from "../packages/domain/phonics";

/** Keep the spelling intact, including separated pairs such as a_e. */
export function phonicsLayout(word: PhonicsWord, folded: boolean) {
  const owners = word.tiles.map((_, i) =>
    word.groups.findIndex((g) => g.includes(i)),
  );
  const widths = word.tiles.map((tile) =>
    Math.max(1.06, Math.min(2.5, 0.35 * tile.length + 0.36)),
  );
  const positions = [widths[0] / 2];
  for (let i = 1; i < word.tiles.length; i++)
    positions.push(
      positions[i - 1] +
        (widths[i - 1] + widths[i]) / 2 +
        0.06 +
        (!folded && owners[i] !== owners[i - 1] ? 0.36 : 0),
    );
  const span = positions.at(-1)! + widths.at(-1)! / 2;
  const x = positions.map((p) => p - span / 2 + 0.65);
  return {
    x,
    owners,
    widths,
    companionX: x[0] - widths[0] / 2 - 1.15,
    width: Math.max(6.8, span + 3.4),
    platformWidth: span + 2.5,
  };
}

export function phonicsObservation(
  word: PhonicsWord,
  selected: number,
  kind: "sound" | "meaning",
) {
  const group = word.groups[selected] ?? word.groups[0],
    label = phonicsGroupLabel(word, group);
  if (kind === "meaning")
    return `${label} 是这个长词中的一个词义块。字母顺序不变，合起来再理解整个词。`;
  if (group.some((v, i) => i > 0 && v !== group[i - 1] + 1))
    return `${label} 隔着别的字母，也在这个词里一起合作。中间的字母留在原位。`;
  if (group.length > 1 || word.tiles[group[0]].length > 1)
    return `${label} 的这些字母，在这个词里共同对应一个音。`;
  return `现在看字母 ${label}。顺着标记观察，再读完整单词。`;
}

export const phonicsSteps = ["听整词", "看字母搭档", "合起来读"] as const;
