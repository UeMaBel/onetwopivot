import type { PoseFrame } from "../../pose-types";
import type { Stance, StanceContext, StanceObservation } from "./contracts";
import type { BoxingThresholds } from "./contracts";

export class StanceDetector {
  private latestCertain: StanceContext | undefined;

  constructor(private readonly thresholds: BoxingThresholds) {}

  observe(frame: PoseFrame): StanceObservation {
    const leftShoulder = frame.landmarks?.[11];
    const rightShoulder = frame.landmarks?.[12];
    const leftHip = frame.landmarks?.[23];
    const rightHip = frame.landmarks?.[24];
    let current: Stance | null = null;

    if (leftShoulder && rightShoulder && leftHip && rightHip && [leftShoulder, rightShoulder, leftHip, rightHip].every((point) => (point.visibility ?? 1) >= 0.3)) {
      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
      const hipWidth = Math.abs(leftHip.x - rightHip.x);
      const torsoWidth = Math.max(shoulderWidth, hipWidth, 0.001);
      const depthDifference = leftShoulder.z - rightShoulder.z;
      if (Math.abs(depthDifference) / torsoWidth >= this.thresholds.stanceDepthRatio) {
        // In a side-on stance, the shoulder nearer the camera identifies the lead side.
        current = depthDifference < 0 ? "orthodox" : "southpaw";
      }
    }

    if (current) this.latestCertain = { stance: current, source: "detected", timestamp: frame.timestamp };
    return {
      current,
      context: this.latestCertain ?? { stance: "orthodox", source: "assumed", timestamp: frame.timestamp },
    };
  }

  reset() {
    this.latestCertain = undefined;
  }
}
