import {
  exportSections,
  type ExportManifest,
  type ExportPart,
  type ExportPartData,
} from "../contracts/dataExport";
export const exportLifetime = 10 * 60_000;
export const exportRowsPerPart = 25;
export const exportVolumeBytes = 8 * 1024 * 1024;
export const exportExclusions = [
  "密码与密码哈希",
  "API密钥及其加密值",
  "登录、设备令牌和邀请码",
  "临时AI对话、转写和合成音频",
  "公共题库标准答案及内部事务检查",
];
const uuid = (s: unknown): s is string =>
  typeof s === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
    s,
  );
export const validExportRequestId = uuid;
const natural = (v: unknown): v is number =>
  Number.isSafeInteger(v) && (v as number) >= 0;
export function validExportManifest(m: ExportManifest) {
  if (
    m?.format !== "english-quest-data" ||
    m.schema !== 1 ||
    !uuid(m.job?.id) ||
    !natural(m.job.rows) ||
    !natural(m.job.parts) ||
    !natural(m.job.dataBytes) ||
    !natural(m.job.createdAt) ||
    !natural(m.job.expiresAt) ||
    m.job.expiresAt <= m.job.createdAt ||
    !Array.isArray(m.parts) ||
    !Array.isArray(m.sections) ||
    !m.sections.every(
      (s) =>
        s &&
        typeof s === "object" &&
        !Array.isArray(s) &&
        typeof s.label === "string",
    ) ||
    !Array.isArray(m.excluded) ||
    !m.excluded.every((s) => typeof s === "string")
  )
    return false;
  const keys = new Set<string>();
  for (const p of m.parts) {
    if (
      !p ||
      typeof p !== "object" ||
      Array.isArray(p) ||
      !exportSections.some(([id]) => id === p.section) ||
      !natural(p.part) ||
      !Number.isSafeInteger(p.rows) ||
      p.rows <= 0 ||
      p.rows > exportRowsPerPart ||
      !natural(p.dataBytes) ||
      p.dataBytes < 4 ||
      p.dataBytes > 524288 ||
      keys.has(`${p.section}:${p.part}`)
    )
      return false;
    keys.add(`${p.section}:${p.part}`);
  }
  return (
    m.job.parts === m.parts.length &&
    m.job.rows === m.parts.reduce((n, p) => n + p.rows, 0) &&
    m.job.dataBytes === m.parts.reduce((n, p) => n + p.dataBytes, 0) &&
    exportSections.every(([id]) => {
      const sections = m.sections.filter((s) => s.id === id),
        parts = m.parts
          .filter((p) => p.section === id)
          .sort((a, b) => a.part - b.part);
      return (
        sections.length === 1 &&
        sections[0].rows === parts.reduce((n, p) => n + p.rows, 0) &&
        sections[0].parts === parts.length &&
        parts.every((p, i) => p.part === i)
      );
    }) &&
    m.sections.length === exportSections.length
  );
}
export function exportVolumes(parts: ExportPart[], bytes = exportVolumeBytes) {
  if (!Number.isSafeInteger(bytes) || bytes < 1)
    throw Error("导出分卷大小无效。");
  const volumes: ExportPart[][] = [[]];
  let current = 0;
  for (const p of parts) {
    if (current + p.dataBytes > bytes && volumes.at(-1)!.length) {
      volumes.push([]);
      current = 0;
    }
    volumes.at(-1)!.push(p);
    current += p.dataBytes;
  }
  return volumes;
}
export function exportPartLine(
  m: ExportManifest,
  p: ExportPart,
  data: ExportPartData,
) {
  if (
    data?.format !== m.format ||
    data.schema !== m.schema ||
    data.jobId !== m.job.id ||
    data.section !== p.section ||
    data.part !== p.part ||
    !Array.isArray(data.records) ||
    data.records.length !== p.rows ||
    data.records.some((r) => !r || typeof r !== "object" || Array.isArray(r))
  )
    throw Error("下载内容与数据包清单不一致，尚未交给浏览器保存，请重新读取。");
  return JSON.stringify(data) + "\n";
}
