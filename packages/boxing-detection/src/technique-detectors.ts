import type { PunchType } from "./contracts";

export type PunchPathEvidence = {
  forward: number;
  lateral: number;
  upward: number;
  movementDurationMs: number;
  lateralTurns: number;
};

export class JabDetector {
  detect(path: PunchPathEvidence, minimumForward: number) {
    return hasStraightPath(path, minimumForward) ? "jab" as const : null;
  }
}

export class RearStraightDetector {
  detect(path: PunchPathEvidence, minimumForward: number) {
    return hasStraightPath(path, minimumForward) ? "straight" as const : null;
  }
}

export class HookDetector {
  detect(path: PunchPathEvidence, minimumMovement: number, minimumDurationMs: number) {
    return hasHookArc(path, minimumMovement, minimumDurationMs) ? "hook" as const : null;
  }
}

export class UppercutDetector {
  detect(path: PunchPathEvidence, minimumMovement: number, minimumDurationMs: number) {
    return hasUpwardPath(path, minimumMovement, minimumDurationMs) ? "uppercut" as const : null;
  }
}

function hasHookArc(path: PunchPathEvidence, minimumMovement: number, minimumDurationMs: number) {
  return path.movementDurationMs >= minimumDurationMs && path.lateralTurns > 0 && path.lateral >= minimumMovement && path.lateral >= path.forward * 1.2;
}

function hasUpwardPath(path: PunchPathEvidence, minimumMovement: number, minimumDurationMs: number) {
  return path.movementDurationMs >= minimumDurationMs
    && path.upward >= minimumMovement
    && path.upward >= path.forward * 0.85
    && path.upward >= path.lateral * 0.55;
}

function hasStraightPath(path: PunchPathEvidence, minimumForward: number) {
  return path.forward >= minimumForward
    && path.forward >= path.lateral * 0.75
    && path.forward >= path.upward * 0.75;
}

export function asPunchType(type: PunchType, lead: boolean): PunchType {
  return type === "straight" ? (lead ? "jab" : "straight") : type;
}
