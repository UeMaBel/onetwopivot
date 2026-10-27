import type { PoseFrame } from "./types";
import type { ArmEvidence, ArmSide } from "./contracts";
import type { BoxingThresholds } from "./contracts";

const indexes: Record<ArmSide, [number, number, number]> = {
  left: [11, 13, 15],
  right: [12, 14, 16],
};

function distance2d(a: { x: number; y: number }, b: { x: number; y: number }, aspectRatio: number) {
  return Math.hypot((a.x - b.x) * aspectRatio, a.y - b.y);
}

export class ArmObserver {
  private previous = new Map<ArmSide, { extension: number; wrist: { x: number; y: number; z: number }; timestamp: number }>();

  constructor(private readonly thresholds: BoxingThresholds) {}

  observe(frame: PoseFrame, side: ArmSide) {
    const [shoulderIndex, elbowIndex, wristIndex] = indexes[side];
    const points = frame.landmarks;
    const shoulder = points?.[shoulderIndex];
    const elbow = points?.[elbowIndex];
    const wrist = points?.[wristIndex];
    const prior = this.previous.get(side);
    if (!shoulder || !elbow || !wrist || [shoulder, elbow, wrist].some((point) => (point.visibility ?? 1) < 0.3)) {
      this.previous.delete(side);
      return { side, timestamp: frame.timestamp, wrist: null, extension: null, extensionSpeed: 0, elapsedSeconds: 0, movement: 0, forwardMovement: 0, lateralMovement: 0, upwardMovement: 0, targetPosition: null, actionStarted: false } satisfies ArmEvidence;
    }

    const aspectRatio = frame.aspectRatio && frame.aspectRatio > 0 ? frame.aspectRatio : 1;
    const armLength = distance2d(shoulder, elbow, aspectRatio) + distance2d(elbow, wrist, aspectRatio);
    const extension = distance2d(shoulder, wrist, aspectRatio) / Math.max(armLength, 0.001);
    const elapsedSeconds = prior ? Math.max(0, (frame.timestamp - prior.timestamp) / 1000) : 0;
    const validInterval = elapsedSeconds > 0 ? elapsedSeconds : 0;
    const extensionSpeed = prior && validInterval ? (extension - prior.extension) / validInterval : 0;
    const dx = prior && validInterval ? (wrist.x - prior.wrist.x) * aspectRatio / validInterval : 0;
    const dy = prior && validInterval ? (prior.wrist.y - wrist.y) / validInterval : 0;
    // MediaPipe relative z is evaluated as its own depth axis, then expressed
    // in the same width-corrected coordinate scale as x for path comparisons.
    const dz = prior && validInterval ? (prior.wrist.z - wrist.z) * aspectRatio / validInterval : 0;
    const movement = Math.hypot(dx, dy);
    const hip = points?.[side === "left" ? 23 : 24];
    const torsoHeight = hip ? hip.y - shoulder.y : 0;
    const targetPosition = torsoHeight > 0 ? (wrist.y - shoulder.y) / torsoHeight : null;
    const actionStarted = extensionSpeed >= this.thresholds.movementStartSpeed;
    this.previous.set(side, { extension, wrist, timestamp: frame.timestamp });
    return {
      side, timestamp: frame.timestamp, wrist, extension,
      extensionSpeed, elapsedSeconds, movement, actionStarted,
      forwardMovement: dz, lateralMovement: dx, upwardMovement: dy,
      targetPosition: targetPosition !== null && Number.isFinite(targetPosition) ? targetPosition : null,
    } satisfies ArmEvidence;
  }

  reset(side?: ArmSide) {
    if (side) this.previous.delete(side);
    else this.previous.clear();
  }
}
