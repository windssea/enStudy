import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import preserved from "./fixtures/exports.v1-hashes.json";
import {
  exportSections,
  type ExportManifest,
  type ExportPartData,
} from "../packages/contracts/dataExport";
import {
  exportLifetime,
  exportVolumes,
  exportPartLine,
  validExportManifest,
  validExportRequestId,
} from "../packages/domain/dataExport";
import { exportSourceFields } from "../packages/server/dataExport";
import { prepareExportVolume } from "../src/dataExportDownload";
import DataExportPanel from "../src/DataExportPanel";
const id = "bfbc74bf-8dd2-49e8-9fd7-aa3a4df92840";
function manifest(): ExportManifest {
  return {
    format: "english-quest-data",
    schema: 1,
    job: {
      id,
      createdAt: 100,
      expiresAt: 100 + exportLifetime,
      rows: 2,
      parts: 2,
      dataBytes: 100,
    },
    sections: exportSections.map(([id, label]) => ({
      id,
      label,
      rows: id === "writing" ? 2 : 0,
      parts: id === "writing" ? 2 : 0,
    })),
    parts: [
      { section: "writing", part: 0, rows: 1, dataBytes: 50 },
      { section: "writing", part: 1, rows: 1, dataBytes: 50 },
    ],
    excluded: ["密码"],
  };
}
const content = (m: ExportManifest, part = 0): ExportPartData => ({
  format: m.format,
  schema: m.schema,
  jobId: m.job.id,
  section: "writing",
  part,
  records: [
    {
      title: "我的小书",
      paragraphs: [
        "I like books.",
        "<script>plain text</script>",
        "中文提纲与😀",
      ],
    },
  ],
});
describe("private family export contract and bounded downloads", () => {
  it("preserves the applied export migration", () => {
    for (const [path, hash] of Object.entries(preserved))
      expect(
        createHash("sha256")
          .update(
            readFileSync(
              new URL(`../${path}`, import.meta.url),
              "utf8",
            ).replaceAll("\r\n", "\n"),
          )
          .digest("hex"),
      ).toBe(hash);
  });
  it("allows only explicit current source fields and includes all scoped learning sources", () => {
    expect(exportSourceFields.map((s) => s.section)).toEqual(
      exportSections.map(([id]) => id),
    );
    expect(exportSections).toHaveLength(25);
    for (const source of exportSourceFields)
      for (const field of source.fields)
        expect(
          [
            "password_hash",
            "salt",
            "iterations",
            "key_ciphertext",
            "key_iv",
            "key_id",
            "key_suffix",
            "token_hash",
            "lease_id",
            "lease_grant_id",
            "private_answer_json",
            "last_command_hash",
            "last_request_id",
          ],
          `${source.table}.${field}`,
        ).not.toContain(field);
    expect(
      exportSourceFields.find((s) => s.section === "attempts")!.fields,
    ).toContain("answer");
    expect(
      exportSourceFields.find((s) => s.section === "writing")!.fields,
    ).toContain("paragraphs");
  });
  it("checks counts, contiguous parts, sections and lifetime in an authoritative manifest", () => {
    expect(validExportManifest(manifest())).toBe(true);
    const m = manifest();
    m.job.rows++;
    expect(validExportManifest(m)).toBe(false);
    const skipped = manifest();
    skipped.parts[1].part = 2;
    expect(validExportManifest(skipped)).toBe(false);
    const duplicate = manifest();
    duplicate.parts[1].part = 0;
    expect(validExportManifest(duplicate)).toBe(false);
    const absent = manifest();
    absent.sections.pop();
    expect(validExportManifest(absent)).toBe(false);
    const oversized = manifest();
    oversized.parts[0].dataBytes = 524289;
    expect(validExportManifest(oversized)).toBe(false);
    const expired = manifest();
    expired.job.expiresAt = expired.job.createdAt;
    expect(validExportManifest(expired)).toBe(false);
    expect(
      validExportManifest({
        ...manifest(),
        parts: [null],
      } as unknown as ExportManifest),
    ).toBe(false);
    expect(
      validExportManifest({
        ...manifest(),
        sections: [null],
      } as unknown as ExportManifest),
    ).toBe(false);
  });
  it("separates request identifiers from file paths and never accepts user-chosen archive names", () => {
    expect(validExportRequestId(id)).toBe(true);
    for (const bad of [
      "../../foo",
      id + ".json",
      null,
      "",
      id.replace("49e8", "59e8"),
    ])
      expect(validExportRequestId(bad)).toBe(false);
  });
  it("partitions without dropping or duplicating any record, including an empty snapshot", () => {
    const m = manifest();
    expect(exportVolumes(m.parts, 100)).toEqual([m.parts]);
    const split = exportVolumes(m.parts, 60);
    expect(split).toHaveLength(2);
    expect(split.flat()).toEqual(m.parts);
    expect(exportVolumes([], 1)).toEqual([[]]);
    expect(() => exportVolumes(m.parts, 0)).toThrow();
  });
  it("rejects mixed snapshots, missing records and wrong parts before preparing a file", () => {
    const m = manifest(),
      p = m.parts[0],
      data = content(m);
    expect(JSON.parse(exportPartLine(m, p, data)).records[0].title).toBe(
      "我的小书",
    );
    expect(() =>
      exportPartLine(m, p, { ...data, jobId: crypto.randomUUID() }),
    ).toThrow();
    expect(() => exportPartLine(m, p, { ...data, part: 1 })).toThrow();
    expect(() => exportPartLine(m, p, { ...data, records: [] })).toThrow();
  });
  it("fetches every selected part in order and authorizes again before yielding a complete JSONL volume", async () => {
    const m = manifest(),
      calls: string[] = [],
      progress = vi.fn();
    const read = async <T,>(path: string): Promise<T> => {
      calls.push(path);
      return (
        path.includes("/parts/")
          ? content(m, Number(path.at(-1)))
          : {
              ...m,
              parts: m.parts.map((p) => ({
                dataBytes: p.dataBytes,
                rows: p.rows,
                part: p.part,
                section: p.section,
              })),
            }
      ) as T;
    };
    const blob = await prepareExportVolume(
        m,
        m.parts,
        1,
        1,
        read,
        progress,
        () => true,
      ),
      lines = (await blob.text())
        .trim()
        .split("\n")
        .map((s) => JSON.parse(s));
    expect(calls).toHaveLength(3);
    expect(calls.at(-1)).toBe(`/family/exports/${id}`);
    expect(lines).toHaveLength(3);
    expect(lines[0].totalVolumes).toBe(1);
    expect(lines[2].records[0].paragraphs[2]).toContain("😀");
    expect(blob.type).toContain("application/x-ndjson");
    expect(progress).toHaveBeenLastCalledWith(2, 2);
  });
  it("refuses incomplete or duplicated volume selections before requesting private rows", async () => {
    const m = manifest(),
      read = async <T,>(): Promise<T> => {
        throw Error("must not fetch");
      };
    for (const parts of [[m.parts[0]], [m.parts[0], m.parts[0]]])
      await expect(
        prepareExportVolume(
          m,
          parts,
          1,
          1,
          read,
          () => {},
          () => true,
        ),
      ).rejects.toThrow("目录不完整");
    await expect(
      prepareExportVolume(
        m,
        m.parts,
        2,
        1,
        read,
        () => {},
        () => true,
      ),
    ).rejects.toThrow("目录不完整");
  });
  it("stops after a cancelled response without fetching the rest or yielding a false complete file", async () => {
    const m = manifest();
    let live = true;
    const calls = vi.fn();
    const read = async <T,>() => {
      calls();
      live = false;
      return content(m) as T;
    };
    await expect(
      prepareExportVolume(
        m,
        m.parts,
        1,
        1,
        read,
        () => {},
        () => live,
      ),
    ).rejects.toThrow("停止");
    expect(calls).toHaveBeenCalledTimes(1);
  });
  it("does not provide a file when a package is revoked during its final authorization", async () => {
    const m = manifest();
    const read = async <T,>(path: string): Promise<T> => {
      if (!path.includes("/parts/")) throw Error("EXPIRED");
      return content(m, Number(path.at(-1))) as T;
    };
    await expect(
      prepareExportVolume(
        m,
        m.parts,
        1,
        1,
        read,
        () => {},
        () => true,
      ),
    ).rejects.toThrow("EXPIRED");
  });
  it("does not mix a changed final manifest into the volume", async () => {
    const m = manifest(),
      changed = manifest();
    changed.job.id = crypto.randomUUID();
    const read = async <T,>(path: string): Promise<T> =>
      (path.includes("/parts/")
        ? content(m, Number(path.at(-1)))
        : changed) as T;
    await expect(
      prepareExportVolume(
        m,
        m.parts,
        1,
        1,
        read,
        () => {},
        () => true,
      ),
    ).rejects.toThrow("变化");
  });
  it("renders a scoped parent-only confirmation form without pretending a file has been generated", () => {
    const html = renderToStaticMarkup(
      createElement(DataExportPanel, {
        householdId: "family",
        householdName: "测试家庭",
        username: "parent",
      }),
    );
    expect(html).toContain("测试家庭");
    expect(html).toContain('type="password"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain("API密钥");
    expect(html).not.toContain("已生成的资料快照");
    expect(html).not.toContain("下载成功");
  });
});
