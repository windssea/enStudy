// Wrangler Pages list --json uses display headings in version 4.151.1.
export function pagesProjectNames(rows) {
  if (!Array.isArray(rows)) throw new Error("Unexpected Pages project list.");
  return rows.map((row) => {
    const name = row?.name ?? row?.["Project Name"];
    if (typeof name !== "string" || !name)
      throw new Error(
        "Unknown Pages project list format; reconcile before creating resources.",
      );
    return name;
  });
}
