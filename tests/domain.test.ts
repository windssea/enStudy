import { describe, expect, it } from "vitest";
import {
  addDays,
  localDay,
  midnight,
  schedule,
} from "../packages/domain/review";
import { devAllowed } from "../packages/server/app";
import {
  exercises,
  gradeAnswer,
  publicExercise,
} from "../packages/server/exercises";

describe("shared review evidence", () => {
  const first = schedule(null, "2026-10-17", "correct");
  it("starts with a one-day retrieval check", () => {
    expect(first.stage).toBe(0);
    expect(first.dueDay).toBe("2026-10-18");
  });
  it("cannot advance twice on the same local day", () => {
    expect(schedule(first, "2026-10-17", "correct").independentSuccesses).toBe(
      1,
    );
  });
  it("advances one stage when due", () => {
    expect(schedule(first, "2026-10-18", "correct")).toMatchObject({
      stage: 1,
      dueDay: "2026-10-21",
    });
  });
  it("does not push an early review into the future", () => {
    const next = schedule(first, "2026-10-18", "correct");
    expect(schedule(next, "2026-10-19", "correct").dueDay).toBe("2026-10-21");
  });
  it("does not promote hinted answers", () => {
    expect(schedule(first, "2026-10-18", "hinted").stage).toBe(0);
  });
  it("records lapses without going below zero", () => {
    expect(schedule(first, "2026-10-18", "incorrect")).toMatchObject({
      stage: 0,
      lapses: 1,
      dueDay: "2026-10-19",
    });
  });
  it("does not skip stages for overdue work", () => {
    expect(schedule(first, "2026-12-17", "correct").stage).toBe(1);
  });
  it("does not mutate the previous card", () => {
    schedule(first, "2026-10-19", "incorrect");
    expect(first.lapses).toBe(0);
  });
  it("caps the final stage", () => {
    expect(
      schedule({ ...first, stage: 5 }, "2026-12-17", "correct").stage,
    ).toBe(5);
  });
  it("handles leap years and rejects impossible dates", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(() => addDays("2026-02-30", 1)).toThrow();
  });
  it("uses local calendar dates", () => {
    expect(localDay(Date.parse("2026-10-17T16:01:00Z"))).toBe("2026-10-18");
  });
  it("resolves Shanghai midnight", () => {
    expect(
      new Date(midnight("2026-10-18", "Asia/Shanghai")).toISOString(),
    ).toBe("2026-10-17T16:00:00.000Z");
  });
  it("does not assume every day lasts 24 hours", () => {
    expect(
      midnight("2026-03-09", "America/New_York") -
        midnight("2026-03-08", "America/New_York"),
    ).toBe(23 * 3600_000);
  });
});
describe("development identity boundaries", () => {
  it("requires both explicit local settings", () => {
    expect(
      devAllowed(
        { APP_STAGE: "local", ALLOW_DEV_AUTH: "true" },
        "http://127.0.0.1:8788",
      ),
    ).toBe(true);
    expect(
      devAllowed(
        { APP_STAGE: "local", ALLOW_DEV_AUTH: "false" },
        "http://localhost:8788",
      ),
    ).toBe(false);
  });
  it("rejects remote hostnames even with local settings", () => {
    expect(
      devAllowed(
        { APP_STAGE: "local", ALLOW_DEV_AUTH: "true" },
        "https://preview.example.com",
      ),
    ).toBe(false);
  });
  it("cannot use a loopback host to bypass preview settings", () => {
    expect(
      devAllowed(
        { APP_STAGE: "preview", ALLOW_DEV_AUTH: "false" },
        "http://localhost",
      ),
    ).toBe(false);
  });
});
describe("private answer boundary and grading", () => {
  it("only serializes explicit public fields", () => {
    for (const exercise of exercises) {
      const item = publicExercise(exercise);
      expect(item).not.toHaveProperty("answers");
      expect(item).not.toHaveProperty("hint");
      expect(item).not.toHaveProperty("explanation");
    }
  });
  it("grades forms without turning a wrong form into a correct one", () => {
    const exercise = exercises.find((e) => e.id === "sample.form.go")!;
    expect(gradeAnswer(exercise, " Went ")).toBe(true);
    expect(gradeAnswer(exercise, "goed")).toBe(false);
  });
  it("validates the entire word order", () => {
    const exercise = exercises.find((e) => e.type === "order")!;
    expect(gradeAnswer(exercise, ["Let's", "play", "football."])).toBe(true);
    expect(gradeAnswer(exercise, ["Let's", "to", "play", "football."])).toBe(
      false,
    );
  });
});
