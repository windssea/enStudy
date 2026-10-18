import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { foxTurnAngle } from "../src/scene/foxTurn";
import FoxSticker from "../src/FoxSticker";

describe("partner observation", () => {
  it("turns in a bounded interval and can reverse smoothly before reaching the back", () => {
    const middle = foxTurnAngle(0, Math.PI, 0.35, false);
    expect(middle).toBeCloseTo(Math.PI / 2);
    expect(foxTurnAngle(middle, 0, 0, false)).toBe(middle);
    expect(foxTurnAngle(middle, 0, 0.7, false)).toBe(0);
    expect(foxTurnAngle(0, Math.PI, -1, false)).toBe(0);
    expect(foxTurnAngle(0, Math.PI, 10, false)).toBe(Math.PI);
  });
  it("snaps to the selected view when motion is paused", () => {
    expect(foxTurnAngle(0.9, Math.PI, 0.02, true)).toBe(Math.PI);
    expect(foxTurnAngle(2, 0, 0.02, true)).toBe(0);
  });
  it("also shows the backpack view in the 2D fallback", () => {
    const back = renderToStaticMarkup(
      <svg>
        <FoxSticker turned />
      </svg>,
    );
    const front = renderToStaticMarkup(
      <svg>
        <FoxSticker />
      </svg>,
    );
    expect(back).toContain('data-view="back"');
    expect(front).not.toContain('data-view="back"');
    expect(back).toContain("#75c9b3");
    expect(back).not.toBe(front);
  });
});
