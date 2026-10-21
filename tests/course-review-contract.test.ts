import { describe, expect, it } from "vitest";
import { courseReviewContract } from "../scripts/course-review-contract.mjs";
const release = {
  id: "catalog",
  releases: ["original", "wording"],
  items: [{ id: "a" }, { id: "b", version: 2 }, { id: "c" }],
};
const review = { id: "review", items: [{ id: "c", version: 2 }] };
const contract = courseReviewContract(release, review);
const rows = [
  {
    itemId: "a",
    version: 1,
    origin: "original",
    publishedOrigin: "original",
    itemStatus: "published",
    releaseStatus: "published",
  },
  {
    itemId: "b",
    version: 2,
    origin: "wording",
    publishedOrigin: "wording",
    itemStatus: "published",
    releaseStatus: "published",
  },
  {
    itemId: "c",
    version: 2,
    origin: "review",
    publishedOrigin: "review",
    itemStatus: "published",
    releaseStatus: "published",
  },
];
describe("mixed reviewed course publication contracts", () => {
  it("accepts every intended frozen version and real publisher", () => {
    expect(contract.byId.get("c")?.version).toBe(2);
    expect(contract.valid(rows)).toBe(true);
    expect(contract.valid([...rows].reverse())).toBe(true);
  });
  it("rejects historical versions, catalog labels and copied memberships", () => {
    for (const patch of [
      { version: 1 },
      { origin: "catalog" },
      { publishedOrigin: "original" },
      { releaseStatus: "withdrawn" },
    ])
      expect(
        contract.valid(
          rows.map((r) => (r.itemId === "c" ? { ...r, ...patch } : r)),
        ),
      ).toBe(false);
  });
  it("rejects missing, repeated or substituted task identities", () => {
    expect(contract.valid(rows.slice(1))).toBe(false);
    expect(contract.valid([rows[0], rows[1], rows[1]])).toBe(false);
    expect(
      contract.valid(
        rows.map((r) => (r.itemId === "c" ? { ...r, itemId: "unknown" } : r)),
      ),
    ).toBe(false);
  });
});
