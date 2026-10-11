import { describe, expect, it } from "vitest";
import type { Landmark, PoseFrame } from "../../pose-types";
import { evaluateSequences } from "./evaluate";

function makeFrame(timestamp: number, extended: boolean): PoseFrame {
  const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  landmarks[11] = { x: 0.4, y: 0.3, z: -0.25, visibility: 1 };
  landmarks[12] = { x: 0.6, y: 0.3, z: 0, visibility: 1 };
  landmarks[23] = { x: 0.45, y: 0.6, z: 0, visibility: 1 };
  landmarks[24] = { x: 0.55, y: 0.6, z: 0, visibility: 1 };
  landmarks[13] = extended ? { x: 0.27, y: 0.4, z: -0.31 } : { x: 0.38, y: 0.4, z: -0.25 };
  landmarks[15] = extended ? { x: 0.13, y: 0.45, z: -0.37 } : { x: 0.45, y: 0.38, z: -0.25 };
  landmarks[14] = { x: 0.62, y: 0.4, z: 0 };
  landmarks[16] = { x: 0.55, y: 0.38, z: 0 };
  return { timestamp, landmarks };
}

describe("labeled sequence evaluation", () => {
  it("reports misses, extras, coverage, correctness, and repeatable results", () => {
    const input = {
      sequences: [
        { id: "sample", frames: [makeFrame(0, false), makeFrame(100, true), makeFrame(200, false), makeFrame(300, true), makeFrame(400, false), makeFrame(500, true)] },
        { id: "stance-only", frames: [makeFrame(0, false)] },
      ],
      annotations: [
        { sequenceId: "sample", stance: "orthodox" as const, jabs: [{ timestamp: 100, arm: "left" as const }, { timestamp: 300, arm: "left" as const }, { timestamp: 900, arm: "left" as const }], movements: [{ timestamp: 100, arm: "left" as const, expected: "jab" as const }, { timestamp: 300, arm: "left" as const, expected: "jab" as const }, { timestamp: 700, arm: "left" as const, expected: "unclassified" as const }, { timestamp: 900, arm: "left" as const, expected: "jab" as const }] },
        { sequenceId: "stance-only", stances: [{ timestamp: 0, stance: "orthodox" as const }], jabs: [] },
      ],
    };
    const first = evaluateSequences(input);
    expect(first).toMatchObject({ sequenceCount: 2, expectedJabs: 3, detectedJabs: 3, matchedJabs: 2, precision: 2 / 3, recall: 2 / 3, f1: 2 / 3, movementCount: 4, classifiedMovements: 3, correctlyClassifiedMovements: 2, classificationCoverage: 3 / 4, classificationAccuracy: 2 / 3, stance: { expected: 2, correct: 2, accuracy: 1 } });
    expect(first.missedJabs).toEqual([{ sequenceId: "sample", timestamp: 900, arm: "left" }]);
    expect(first.extraJabs).toEqual([{ sequenceId: "sample", timestamp: 500, arm: "left" }]);
    expect(evaluateSequences(input)).toEqual(first);
  });
});
