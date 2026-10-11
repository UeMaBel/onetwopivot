import { describe, expect, it } from "vitest";
import type { Landmark, PoseFrame } from "@onetwopivot/boxing-detection";
import { BoxingDetectionPipeline, defaultBoxingThresholds } from "@onetwopivot/boxing-detection";

function pose(timestamp: number, leftExtended = false, rightExtended = false, stance: "front" | "orthodox" | "southpaw" = "front"): PoseFrame {
  const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  landmarks[11] = { x: 0.4, y: 0.3, z: stance === "orthodox" ? -0.25 : 0, visibility: 1 };
  landmarks[12] = { x: 0.6, y: 0.3, z: stance === "southpaw" ? -0.25 : 0, visibility: 1 };
  landmarks[23] = { x: 0.45, y: 0.6, z: 0, visibility: 1 };
  landmarks[24] = { x: 0.55, y: 0.6, z: 0, visibility: 1 };
  setArm(landmarks, "left", leftExtended);
  setArm(landmarks, "right", rightExtended);
  return { timestamp, landmarks };
}

function partialLeftExtension(timestamp: number, stance: "front" | "orthodox" | "southpaw"): PoseFrame {
  const frame = pose(timestamp, false, false, stance);
  const landmarks = frame.landmarks;
  if (!landmarks) throw new Error("Test pose should have landmarks");
  landmarks[13] = { x: 0.5, y: 0.3, z: landmarks[11].z - 0.03, visibility: 1 };
  landmarks[15] = { x: 0.5, y: 0.4, z: landmarks[11].z - 0.06, visibility: 1 };
  return frame;
}

function lateralLeftExtension(timestamp: number): PoseFrame {
  const frame = pose(timestamp, true);
  if (!frame.landmarks) throw new Error("Test pose should have landmarks");
  frame.landmarks[13].z = frame.landmarks[11].z;
  frame.landmarks[15].z = frame.landmarks[11].z;
  return frame;
}

function setArm(points: Landmark[], side: "left" | "right", extended: boolean) {
  const [shoulder, elbow, wrist] = side === "left" ? [11, 13, 15] : [12, 14, 16];
  const sign = side === "left" ? -1 : 1;
  points[shoulder] = { ...points[shoulder], x: side === "left" ? 0.4 : 0.6, y: 0.3 };
  points[elbow] = extended
    ? { x: 0.3 + (sign < 0 ? -0.03 : 0.03), y: 0.4, z: points[shoulder].z - 0.06, visibility: 1 }
    : { x: 0.36 + (sign < 0 ? 0.02 : -0.02), y: 0.4, z: points[shoulder].z, visibility: 1 };
  points[wrist] = extended
    ? { x: 0.16 + (sign < 0 ? -0.03 : 0.03), y: 0.45, z: points[shoulder].z - 0.12, visibility: 1 }
    : { x: 0.42 + (sign < 0 ? 0.03 : -0.03), y: 0.38, z: points[shoulder].z, visibility: 1 };
}

describe("boxing detection pipeline", () => {
  it("keeps orthodox as an explicit assumption until stance is certain", () => {
    const pipeline = new BoxingDetectionPipeline();
    const update = pipeline.process(pose(0));
    expect(update.stance).toEqual({ current: null, context: { stance: "orthodox", source: "assumed", timestamp: 0 } });
  });

  it("reports a lead arm extension once, then reports recovery separately", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0));
    const jab = pipeline.process(pose(100, true));
    expect(jab.events).toHaveLength(1);
    expect(jab.events[0]).toMatchObject({ type: "jab", arm: "left", stance: { stance: "orthodox", source: "assumed" }, recovery: "pending" });
    expect(pipeline.process(pose(200, true)).events).toHaveLength(0);
    const recovered = pipeline.process(pose(300));
    expect(recovered.events).toHaveLength(0);
    expect(recovered.recoveryUpdates[0]).toMatchObject({ eventId: jab.events[0].id, recovery: "recovered" });
  });

  it("captures detected stance when movement starts and retains it through a stance change", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0, false, false, "orthodox"));
    pipeline.process(partialLeftExtension(100, "orthodox"));
    const update = pipeline.process(pose(200, true, false, "orthodox"));
    pipeline.process(pose(300, true, false, "southpaw"));
    expect(update.events[0]).toMatchObject({ arm: "left", stance: { stance: "orthodox", source: "detected" } });
  });

  it("retains the latest certain stance when the current frame is ambiguous", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0, false, false, "orthodox"));
    const update = pipeline.process(pose(100));
    expect(update.stance).toEqual({ current: null, context: { stance: "orthodox", source: "detected", timestamp: 0 } });
  });

  it("starts a new session with no retained stance", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0, false, false, "orthodox"));
    pipeline.reset();
    expect(pipeline.process(pose(0)).stance.context).toMatchObject({ stance: "orthodox", source: "assumed" });
  });

  it("keeps rear-hand extension unclassified and permits a new jab after retraction", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0));
    expect(pipeline.process(pose(100, false, true)).unclassified[0]).toMatchObject({ arm: "right", reason: "rear-hand-extension" });
    pipeline.process(pose(200));
    expect(pipeline.process(pose(300, true)).events).toHaveLength(1);
    pipeline.process(pose(400));
    expect(pipeline.process(pose(500, true)).events).toHaveLength(1);
  });

  it("observes both arms independently in the same pose frame", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0));
    const update = pipeline.process(pose(100, true, true));
    expect(update.events.map((event) => event.arm)).toEqual(["left"]);
    expect(update.unclassified.map((movement) => movement.arm)).toEqual(["right"]);
    expect(update.arms.left.extension).toBeGreaterThan(0.78);
    expect(update.arms.right.extension).toBeGreaterThan(0.78);
  });

  it("recognizes a sloppy lead-hand jab when the adjustable extension threshold allows it", () => {
    const pipeline = new BoxingDetectionPipeline({ ...defaultBoxingThresholds, minimumExtension: 0.65 });
    pipeline.process(pose(0));
    const update = pipeline.process(partialLeftExtension(100, "front"));
    expect(update.events[0]).toMatchObject({ type: "jab", arm: "left" });
  });

  it("keeps a lead-arm extension without forward punch motion unclassified", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0));
    const update = pipeline.process(lateralLeftExtension(100));
    expect(update.events).toHaveLength(0);
    expect(update.unclassified).toMatchObject([{ arm: "left", reason: "ambiguous-extension" }]);
  });

  it("resets movement baselines across a long tracking gap", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0));
    const update = pipeline.process({ timestamp: 1000, landmarks: null });
    expect(update.personDetected).toBe(false);
    expect(update.events).toHaveLength(0);
    expect(update.arms.left.extension).toBeNull();
  });

  it("tolerates a brief missing frame during an extension", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0));
    pipeline.process({ timestamp: 50, landmarks: null });
    expect(pipeline.process(pose(100, true)).events).toHaveLength(1);
  });

  it("marks recovery incomplete after tracking is lost without erasing the jab", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0));
    const jab = pipeline.process(pose(100, true)).events[0];
    const lost = pipeline.process({ timestamp: 1000, landmarks: null });
    expect(jab).toMatchObject({ type: "jab", recovery: "pending" });
    expect(lost.recoveryUpdates[0]).toMatchObject({ eventId: jab.id, recovery: "incomplete" });
  });
});
