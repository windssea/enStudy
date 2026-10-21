// Integration-test contract for mixed historical and reviewed course versions.
// Checking a catalog label alone would miss an old assignment or a copied
// release membership. Check the frozen version against its actual publisher.
export function courseReviewContract(release, review) {
  const revisions = new Map(review.items.map((i) => [i.id, i]));
  const byId = new Map(
    release.items.map((i) => [i.id, revisions.get(i.id) ?? i]),
  );
  const expectedOrigins = [...(release.releases ?? [release.id])];
  if (release.items.some((i) => revisions.has(i.id)))
    expectedOrigins.push(review.id);
  const expected = [...new Set(expectedOrigins)].sort();
  return {
    byId,
    valid(rows) {
      return (
        rows.length === byId.size &&
        new Set(rows.map((r) => r.itemId)).size === byId.size &&
        rows.every((row) => {
          const item = byId.get(row.itemId);
          return (
            item &&
            row.version === (item.version ?? 1) &&
            row.origin === row.publishedOrigin &&
            row.itemStatus === "published" &&
            row.releaseStatus === "published"
          );
        }) &&
        JSON.stringify([...new Set(rows.map((r) => r.origin))].sort()) ===
          JSON.stringify(expected)
      );
    },
  };
}
