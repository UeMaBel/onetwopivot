import type { BoxingThresholds } from "./contracts";

// Keep these values together for tuning after phone observations.
export const defaultBoxingThresholds: BoxingThresholds = {
  stanceDepthRatio: 0.18,
  // Motion rates are normalized-coordinate units per second.
  movementStartSpeed: 2.4,
  minimumForwardMovement: 0.02,
  minimumExtension: 0.72,
  minimumExtensionDelta: 0.12,
  recoveryExtension: 0.7,
  trackingGapResetMs: 700,
  hookMinimumMovementMs: 100,
  uppercutMinimumMovementMs: 67,
  idleResetMs: 100,
  minimumActivitySpeed: 0.45,
};

