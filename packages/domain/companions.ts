export const companions = [
  {
    id: "fox",
    name: "小狐狸橙橙",
    detail: "围上小围巾，一起探索词语和句子。",
    backAction: "看看背包",
    backLine: "橙橙的小背包，装着下一次探险的好奇心。",
  },
  {
    id: "pikachu",
    name: "皮卡丘",
    detail: "软软的耳朵、圆圆的脸颊，陪你慢慢想一想。",
    backAction: "看看尾巴",
    backLine: "皮卡丘转过身，露出闪电形的小尾巴。",
  },
] as const;
export type CompanionId = (typeof companions)[number]["id"];
export const isCompanionId = (value: unknown): value is CompanionId =>
  value === "fox" || value === "pikachu";
export const companionInfo = (value: unknown) =>
  companions.find((row) => row.id === value) ?? companions[0];
export interface CompanionChoice {
  childId: string;
  companionId: CompanionId;
  version: number;
}
export function isCompanionChoice(
  value: unknown,
  childId: string,
): value is CompanionChoice {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    row.childId === childId &&
    isCompanionId(row.companionId) &&
    typeof row.version === "number" &&
    Number.isSafeInteger(row.version) &&
    row.version >= 0
  );
}
export function companionCommand(body: unknown): {
  childId: string;
  companionId: CompanionId;
  expectedVersion: number;
  requestId: string;
} | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const row = body as Record<string, unknown>;
  if (
    typeof row.childId !== "string" ||
    !row.childId ||
    row.childId.length > 160 ||
    !isCompanionId(row.companionId) ||
    typeof row.expectedVersion !== "number" ||
    !Number.isSafeInteger(row.expectedVersion) ||
    row.expectedVersion < 0 ||
    row.expectedVersion >= 2147483647 ||
    typeof row.requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      row.requestId,
    )
  )
    return null;
  return {
    childId: row.childId,
    companionId: row.companionId,
    expectedVersion: row.expectedVersion,
    requestId: row.requestId,
  };
}
