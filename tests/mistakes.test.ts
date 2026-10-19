import { describe, expect, it } from "vitest";
import { mistakeQuery, isGuidedRetry } from "../packages/domain/mistakes";
import { parseRoute } from "../src/routes";
describe("private mistake notebook queries and guided retries", () => {
  it("bounds keyset pagination to a fixed snapshot and rejects ambiguous or injected filters", () => {
    expect(mistakeQuery(new URLSearchParams())).toEqual({
      kind: "incorrect",
      category: "all",
      snapshot: undefined,
      before: undefined,
    });
    expect(
      mistakeQuery(
        new URLSearchParams("kind=all&category=tense&snapshot=44&before=20"),
      ),
    ).toMatchObject({
      kind: "all",
      category: "tense",
      snapshot: 44,
      before: 20,
    });
    for (const q of [
      "kind=correct",
      "kind=incorrect&kind=hinted",
      "category=secret",
      "snapshot=-1",
      "snapshot=1e4",
      "snapshot=01",
      "snapshot=NaN",
      "before=2",
      "snapshot=1&before=2",
      "snapshot=2&before=0",
      "snapshot=9007199254740992",
      "category=grammar&childId=other",
      "snapshot=2&snapshot=3",
      "limit=999999",
      "category=grammar%27--",
    ])
      expect(mistakeQuery(new URLSearchParams(q)), q).toBeNull();
  });
  it("recognizes only server-shaped retry references without changing ordinary single tasks", () => {
    expect(
      isGuidedRetry(
        "single:bank.grammar.be.1.input:mistake:714529ba-3bbf-4880-811a-e59b615ae520",
      ),
    ).toBe(true);
    for (const ref of [
      null,
      "single:sample.be",
      "topic:mistake:foo",
      "single:a:mistake:123",
    ])
      expect(isGuidedRetry(ref)).toBe(false);
  });
  it("keeps the notebook reloadable without exposing an attempt identifier in the URL", () => {
    expect(parseRoute("#mistakes")).toEqual({
      view: "mistakes",
      lessonId: null,
    });
  });
});
