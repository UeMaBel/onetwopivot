import { describe, expect, it } from "vitest";
import {
  evaluateCountBenchmark,
  parseVideoAnnotation,
  type Landmark,
  type PoseFrame,
} from "@onetwopivot/boxing-detection";

function pose(timestamp: number, leftExtended = false, rightExtended = false): PoseFrame {
  const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  landmarks[11] = { x: 0.4, y: 0.3, z: -0.25, visibility: 1 };
  landmarks[12] = { x: 0.6, y: 0.3, z: 0, visibility: 1 };
  landmarks[23] = { x: 0.45, y: 0.6, z: 0, visibility: 1 };
  landmarks[24] = { x: 0.55, y: 0.6, z: 0, visibility: 1 };
  setArm(landmarks, "left", leftExtended);
  setArm(landmarks, "right", rightExtended);
  return { timestamp, landmarks };
}

function setArm(points: Landmark[], side: "left" | "right", extended: boolean) {
  const [shoulder, elbow, wrist] = side === "left" ? [11, 13, 15] : [12, 14, 16];
  points[shoulder] = { ...points[shoulder], x: side === "left" ? 0.4 : 0.6, y: 0.3 };
  points[elbow] = extended
    ? { x: side === "left" ? 0.27 : 0.73, y: 0.4, z: points[shoulder].z - 0.06, visibility: 1 }
    : { x: side === "left" ? 0.38 : 0.62, y: 0.4, z: points[shoulder].z, visibility: 1 };
  points[wrist] = extended
    ? { x: side === "left" ? 0.13 : 0.87, y: 0.45, z: points[shoulder].z - 0.12, visibility: 1 }
    : { x: side === "left" ? 0.45 : 0.55, y: 0.38, z: points[shoulder].z, visibility: 1 };
}

const annotation = {
  version: 1,
  video: "clip.mp4",
  stance: "orthodox" as const,
  split: "tuning" as const,
  actions: { "1": 1, "2": 1 },
  metadata: {},
};

describe("video benchmark annotation and count evaluation", () => {
  it("accepts the documented sidecar shape and rejects unknown labels", () => {
    expect(parseVideoAnnotation(annotation)).toEqual(annotation);
    expect(() => parseVideoAnnotation({ ...annotation, actions: { jab: 2 } })).toThrow('unsupported action label "jab"');
  });

  it("reports detected punch counts and unknown movements separately", () => {
    const report = evaluateCountBenchmark([{
      id: "clip.mp4",
      frames: [pose(0), pose(100, true, true)],
      annotation,
    }]);

    expect(report.actions["1"]).toMatchObject({ expected: 1, detected: 1, difference: 0 });
    expect(report.actions["2"]).toMatchObject({ expected: 1, detected: 1, difference: 0 });
    expect(report.unclassifiedDetections).toBe(0);
    expect(report.stance).toMatchObject({ expected: 1, detected: 1, correct: 1, accuracy: 1 });
  });

  it("filters clips by tuning or validation split", () => {
    const report = evaluateCountBenchmark([{
      id: "validation.mp4",
      frames: [],
      annotation: { ...annotation, split: "validation" },
    }], undefined, "tuning");

    expect(report.clips).toEqual([]);
    expect(report.stance.expected).toBe(0);
  });
});
