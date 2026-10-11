import type { PunchType } from "./contracts";

export type PunchPathEvidence = {
  forward: number;
  lateral: number;
  upward: number;
  movementFrames: number;
  lateralTurns: number;
};

export class JabDetector {
  detect(path: PunchPathEvidence, minimumForward: number) {
    return path.forward >= minimumForward ? "jab" as const : null;
  }
}

export class RearStraightDetector {
  detect(path: PunchPathEvidence, minimumForward: number) {
    return path.forward >= minimumForward ? "straight" as const : null;
  }
}

export class HookDetector {
  detect(path: PunchPathEvidence, minimumMovement: number) {
    return hasHookArc(path, minimumMovement) ? "hook" as const : null;
  }
}

export class UppercutDetector {
  detect(path: PunchPathEvidence, minimumMovement: number) {
    return hasUpwardPath(path, minimumMovement) ? "uppercut" as const : null;
  }
}

function hasHookArc(path: PunchPathEvidence, minimumMovement: number) {
  return path.movementFrames >= 3 && path.lateralTurns > 0 && path.lateral >= minimumMovement && path.lateral >= path.forward * 1.2;
}

function hasUpwardPath(path: PunchPathEvidence, minimumMovement: number) {
  return path.upward >= minimumMovement && path.upward >= path.forward * 0.85 && path.upward >= path.lateral * 0.55;
}

export function asPunchType(type: PunchType, lead: boolean): PunchType {
  return type === "straight" ? (lead ? "jab" : "straight") : type;
}
