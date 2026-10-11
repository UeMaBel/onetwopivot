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

function lateralRightExtension(timestamp: number): PoseFrame {
  const frame = pose(timestamp, false, true);
  if (!frame.landmarks) throw new Error("Test pose should have landmarks");
  frame.landmarks[14].z = frame.landmarks[12].z;
  frame.landmarks[16].z = frame.landmarks[12].z;
  return frame;
}

function setArm(points: Landmark[], side: "left" | "right", extended: boolean) {
  const [shoulder, elbow, wrist] = side === "left" ? [11, 13, 15] : [12, 14, 16];
  points[shoulder] = { ...points[shoulder], x: side === "left" ? 0.4 : 0.6, y: 0.3 };
  points[elbow] = extended
    ? { x: side === "left" ? 0.34 : 0.66, y: 0.4, z: points[shoulder].z - 0.06, visibility: 1 }
    : { x: side === "left" ? 0.38 : 0.62, y: 0.4, z: points[shoulder].z, visibility: 1 };
  points[wrist] = extended
    ? { x: side === "left" ? 0.3 : 0.7, y: 0.45, z: points[shoulder].z - 0.12, visibility: 1 }
    : { x: side === "left" ? 0.45 : 0.55, y: 0.38, z: points[shoulder].z, visibility: 1 };
}

function trajectoryPose(timestamp: number, side: "left" | "right", wrist: { x: number; y: number; z: number }, stretched = false): PoseFrame {
  const frame = pose(timestamp);
  if (!frame.landmarks) throw new Error("Expected landmarks");
  const [shoulderIndex, elbowIndex, wristIndex] = side === "left" ? [11, 13, 15] : [12, 14, 16];
  const shoulder = frame.landmarks[shoulderIndex];
  const guardElbow = { x: shoulder.x + (side === "left" ? -0.12 : 0.12), y: shoulder.y + 0.1, z: shoulder.z };
  frame.landmarks[elbowIndex] = stretched
    ? { x: (shoulder.x + wrist.x) / 2, y: (shoulder.y + wrist.y) / 2, z: (shoulder.z + wrist.z) / 2 }
    : guardElbow;
  frame.landmarks[wristIndex] = { ...wrist, visibility: 1 };
  return frame;
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

  it("labels head and body punches from the fist endpoint relative to the torso", () => {
    const headPipeline = new BoxingDetectionPipeline();
    headPipeline.process(pose(0));
    expect(headPipeline.process(pose(100, true)).events[0]).toMatchObject({ label: "1", type: "jab" });

    const unclearPipeline = new BoxingDetectionPipeline();
    unclearPipeline.process(pose(0));
    const unclearTarget = pose(100, true);
    if (!unclearTarget.landmarks) throw new Error("Expected landmarks");
    unclearTarget.landmarks[23].y = unclearTarget.landmarks[11].y;
    expect(unclearPipeline.process(unclearTarget).events[0]).toMatchObject({ label: "1", type: "jab" });

    const bodyPipeline = new BoxingDetectionPipeline();
    bodyPipeline.process(pose(0));
    const bodyPose = pose(100, true);
    if (!bodyPose.landmarks) throw new Error("Expected landmarks");
    bodyPose.landmarks[15].y = 0.58;
    expect(bodyPipeline.process(bodyPose).events[0]).toMatchObject({ label: "1b", type: "jab" });

    const loweredPipeline = new BoxingDetectionPipeline();
    loweredPipeline.process(pose(0));
    const loweredBoxer = pose(100, true);
    if (!loweredBoxer.landmarks) throw new Error("Expected landmarks");
    for (const index of [11, 12, 13, 14, 15, 16, 23, 24]) loweredBoxer.landmarks[index].y += 0.1;
    expect(loweredPipeline.process(loweredBoxer).events[0]).toMatchObject({ label: "1", type: "jab" });
  });

  it("resolves lead and rear straight labels from captured orthodox and southpaw stance", () => {
    for (const stance of ["orthodox", "southpaw"] as const) {
      const leadSide = stance === "orthodox" ? "left" : "right";
      const rearSide = stance === "orthodox" ? "right" : "left";
      for (const [side, label, type] of [[leadSide, "1", "jab"], [rearSide, "2", "straight"]] as const) {
        const pipeline = new BoxingDetectionPipeline();
        pipeline.process(pose(0, false, false, stance));
        const update = pipeline.process(pose(100, side === "left", side === "right", stance));
        expect(update.events[0]).toMatchObject({ arm: side, label, type, stance: { stance } });
        const recovered = pipeline.process(pose(200, false, false, stance));
        expect(recovered.recoveryUpdates[0]).toMatchObject({ eventId: update.events[0].id, recovery: "recovered" });
        expect(pipeline.process(pose(300, side === "left", side === "right", stance)).events).toHaveLength(1);
      }
    }
    const bodyPipeline = new BoxingDetectionPipeline();
    bodyPipeline.process(pose(0));
    const bodyStraight = pose(100, false, true);
    if (!bodyStraight.landmarks) throw new Error("Expected landmarks");
    bodyStraight.landmarks[16].y = 0.58;
    expect(bodyPipeline.process(bodyStraight).events[0]).toMatchObject({ type: "straight", label: "2b", arm: "right" });
  });

  it("distinguishes an arcing hook path from a straight extension", () => {
    for (const [side, label] of [["left", "3"], ["right", "4"]] as const) {
      const pipeline = new BoxingDetectionPipeline();
      pipeline.process(pose(0));
      pipeline.process(trajectoryPose(50, side, { x: side === "left" ? 0.55 : 0.4, y: 0.38, z: 0 }));
      pipeline.process(trajectoryPose(100, side, { x: 0.7, y: 0.38, z: 0 }));
      const hook = pipeline.process(trajectoryPose(150, side, { x: 0.65, y: 0.38, z: 0 }, true));
      expect(hook.events[0]).toMatchObject({ type: "hook", label, arm: side });
    }
    const sidewaysExtension = new BoxingDetectionPipeline();
    sidewaysExtension.process(pose(0));
    sidewaysExtension.process(trajectoryPose(50, "left", { x: 0.55, y: 0.38, z: 0 }));
    sidewaysExtension.process(trajectoryPose(100, "left", { x: 0.7, y: 0.38, z: 0 }));
    const unclassified = sidewaysExtension.process(trajectoryPose(150, "left", { x: 0.85, y: 0.38, z: 0 }, true));
    expect(unclassified.events).toHaveLength(0);
    expect(unclassified.unclassified).toHaveLength(1);
    for (const [side, label] of [["left", "3b"], ["right", "4b"]] as const) {
      const pipeline = new BoxingDetectionPipeline();
      pipeline.process(pose(0));
      pipeline.process(trajectoryPose(50, side, { x: side === "left" ? 0.55 : 0.4, y: 0.38, z: 0 }));
      pipeline.process(trajectoryPose(100, side, { x: 0.7, y: 0.38, z: 0 }));
      const hook = pipeline.process(trajectoryPose(150, side, { x: 0.65, y: 0.58, z: 0 }, true));
      expect(hook.events[0]).toMatchObject({ type: "hook", label, arm: side });
    }
  });

  it("recognizes an upward rear-hand path and labels its body target", () => {
    const pipeline = new BoxingDetectionPipeline();
    const guard = trajectoryPose(0, "right", { x: 0.55, y: 0.68, z: 0 });
    pipeline.process(guard);
    pipeline.process(trajectoryPose(50, "right", { x: 0.55, y: 0.59, z: 0 }));
    const uppercut = pipeline.process(trajectoryPose(100, "right", { x: 0.55, y: 0.52, z: 0 }, true));
    expect(uppercut.events[0]).toMatchObject({ type: "uppercut", label: "6b", arm: "right" });

    const leadPipeline = new BoxingDetectionPipeline();
    leadPipeline.process(trajectoryPose(0, "left", { x: 0.45, y: 0.68, z: 0 }));
    leadPipeline.process(trajectoryPose(50, "left", { x: 0.45, y: 0.56, z: 0 }));
    const leadUppercut = leadPipeline.process(trajectoryPose(100, "left", { x: 0.45, y: 0.45, z: 0 }, true));
    expect(leadUppercut.events[0]).toMatchObject({ type: "uppercut", label: "5", arm: "left" });

    const leadBodyPipeline = new BoxingDetectionPipeline();
    leadBodyPipeline.process(trajectoryPose(0, "left", { x: 0.45, y: 0.68, z: 0 }));
    leadBodyPipeline.process(trajectoryPose(50, "left", { x: 0.45, y: 0.59, z: 0 }));
    const leadBodyUppercut = leadBodyPipeline.process(trajectoryPose(100, "left", { x: 0.45, y: 0.52, z: 0 }, true));
    expect(leadBodyUppercut.events[0]).toMatchObject({ type: "uppercut", label: "5b", arm: "left" });
  });

  it("captures detected stance when movement starts and retains it through a stance change", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0, false, false, "orthodox"));
    const update = pipeline.process(partialLeftExtension(100, "orthodox"));
    pipeline.process(pose(200, true, false, "orthodox"));
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

  it("recognizes rear straights and permits a new punch after retraction", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0));
    const rearPunch = pipeline.process(pose(100, false, true));
    expect(rearPunch.events[0]).toMatchObject({ arm: "right", type: "straight", label: "2" });
    pipeline.process(pose(200));
    expect(pipeline.process(pose(300, true)).events).toHaveLength(1);
    pipeline.process(pose(400));
    expect(pipeline.process(pose(500, true)).events).toHaveLength(1);
  });

  it("observes both arms independently in the same pose frame", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0));
    const update = pipeline.process(pose(100, true, true));
    expect(update.events.map((event) => event.arm)).toEqual(["left", "right"]);
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

  it("keeps a rear-arm lateral extension unclassified instead of calling it a straight", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0));
    const update = pipeline.process(lateralRightExtension(100));
    expect(update.events).toHaveLength(0);
    expect(update.unclassified).toMatchObject([{ arm: "right", reason: "rear-hand-extension" }]);
  });

  it("keeps a forward-moving rear extension unclassified when its path is not straight", () => {
    const pipeline = new BoxingDetectionPipeline();
    pipeline.process(pose(0));
    const diagonalExtension = pose(100, false, true);
    if (!diagonalExtension.landmarks) throw new Error("Expected landmarks");
    diagonalExtension.landmarks[16].x = 0.87;
    const update = pipeline.process(diagonalExtension);
    expect(update.events).toHaveLength(0);
    expect(update.unclassified).toMatchObject([{ arm: "right", reason: "rear-hand-extension" }]);
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
