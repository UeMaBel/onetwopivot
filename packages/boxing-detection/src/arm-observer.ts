import type { PoseFrame } from "./types";
import type { ArmEvidence, ArmSide } from "./contracts";
import type { BoxingThresholds } from "./contracts";

const indexes: Record<ArmSide, [number, number, number]> = {
  left: [11, 13, 15],
  right: [12, 14, 16],
};

function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export class ArmObserver {
  private previous = new Map<ArmSide, { extension: number | null; wrist: { x: number; y: number; z: number } | null; timestamp: number }>();

  constructor(private readonly thresholds: BoxingThresholds) {}

  observe(frame: PoseFrame, side: ArmSide) {
    const [shoulderIndex, elbowIndex, wristIndex] = indexes[side];
    const points = frame.landmarks;
    const shoulder = points?.[shoulderIndex];
    const elbow = points?.[elbowIndex];
    const wrist = points?.[wristIndex];
    const prior = this.previous.get(side);
    if (!shoulder || !elbow || !wrist || [shoulder, elbow, wrist].some((point) => (point.visibility ?? 1) < 0.3)) {
      return { side, timestamp: frame.timestamp, wrist: null, extension: null, extensionDelta: 0, movement: 0, forwardMovement: 0, actionStarted: false } satisfies ArmEvidence;
    }
    const extension = distance(shoulder, wrist) / Math.max(distance(shoulder, elbow) + distance(elbow, wrist), 0.001);
    const extensionDelta = extension !== null && prior?.extension !== null && prior?.extension !== undefined
      ? extension - prior.extension : 0;
    const movement = wrist && prior?.wrist ? distance(wrist, prior.wrist) : 0;
    const forwardMovement = wrist && prior?.wrist ? prior.wrist.z - wrist.z : 0;
    const actionStarted = extensionDelta >= this.thresholds.movementStartDelta;
    this.previous.set(side, { extension, wrist: wrist ?? null, timestamp: frame.timestamp });
    return {
      side, timestamp: frame.timestamp, wrist: wrist ?? null, extension,
      extensionDelta, movement, actionStarted,
      forwardMovement,
    } satisfies ArmEvidence;
  }

  reset() { this.previous.clear(); }
}
