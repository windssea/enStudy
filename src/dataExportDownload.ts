import type {
  ExportManifest,
  ExportPart,
  ExportPartData,
} from "../packages/contracts/dataExport";
import {
  exportPartLine,
  exportVolumes,
  validExportManifest,
} from "../packages/domain/dataExport";
type Read = <T>(path: string) => Promise<T>;
const samePart = (a: ExportPart, b?: ExportPart) =>
  !!b &&
  a.section === b.section &&
  a.part === b.part &&
  a.rows === b.rows &&
  a.dataBytes === b.dataBytes;
export async function prepareExportVolume(
  manifest: ExportManifest,
  parts: ExportPart[],
  volume: number,
  total: number,
  read: Read,
  progress: (done: number, total: number) => void,
  live: () => boolean,
) {
  if (!validExportManifest(manifest))
    throw Error("数据包目录不完整，请重新读取。");
  const volumes = exportVolumes(manifest.parts),
    expected = volumes[volume - 1];
  if (
    !Number.isSafeInteger(volume) ||
    volume < 1 ||
    total !== volumes.length ||
    !expected ||
    parts.length !== expected.length ||
    parts.some((p, i) => !samePart(p, expected[i]))
  )
    throw Error("数据包目录不完整，请重新读取。");
  const chunks: BlobPart[] = [
    JSON.stringify({
      format: "english-quest-data-volume",
      schema: 1,
      volume,
      totalVolumes: total,
      manifest,
    }) + "\n",
  ];
  const active = () => {
    if (!live()) throw Error("下载准备已停止，没有交给浏览器保存。");
  };
  active();
  for (let index = 0; index < parts.length; index++) {
    const p = parts[index];
    active();
    const data = await read<ExportPartData>(
      `/family/exports/${manifest.job.id}/parts/${p.section}/${p.part}`,
    );
    active();
    chunks.push(exportPartLine(manifest, p, data));
    progress(index + 1, parts.length);
  }
  // A final authorized read prevents a package removed during a multi-part
  // download from being announced or saved as a complete volume.
  const confirmed = await read<ExportManifest>(
    `/family/exports/${manifest.job.id}`,
  );
  active();
  if (
    !validExportManifest(confirmed) ||
    confirmed.job.id !== manifest.job.id ||
    confirmed.job.createdAt !== manifest.job.createdAt ||
    confirmed.parts.length !== manifest.parts.length ||
    confirmed.parts.some((p, i) => !samePart(p, manifest.parts[i]))
  )
    throw Error("数据包已经变化或失效，请重新读取后再下载。");
  return new Blob(chunks, { type: "application/x-ndjson;charset=utf-8" });
}
export function handToBrowser(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
