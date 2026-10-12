import type { BoxingThresholds } from "./contracts";

// Keep these values together for tuning after phone observations.
export const defaultBoxingThresholds: BoxingThresholds = {
  stanceDepthRatio: 0.18,
  movementStartDelta: 0.08,
  minimumForwardMovement: 0.02,
  minimumExtension: 0.72,
  minimumExtensionDelta: 0.12,
  recoveryExtension: 0.7,
  trackingGapResetMs: 700,
};

