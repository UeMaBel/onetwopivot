import { describe, expect, it } from "vitest";
import { formatPunchEventLabel } from "../src/boxing/punch-event-label";

describe("live punch event label", () => {
  it("shows the numbered body-target action, technique, and anatomical arm", () => {
    expect(formatPunchEventLabel({ label: "2b", type: "straight", arm: "right" })).toBe("2b · straight · right arm");
    expect(formatPunchEventLabel({ label: "5", type: "uppercut", arm: "left" })).toBe("5 · uppercut · left arm");
  });
});
