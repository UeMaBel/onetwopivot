import type { ArmEvidence, ArmSide, PunchEvent, RecoveryUpdate, StanceContext, UnclassifiedMovement } from "./contracts";
import type { BoxingThresholds } from "./contracts";
import { asPunchType, HookDetector, JabDetector, RearStraightDetector, UppercutDetector } from "./technique-detectors";

type ActiveArm = {
  extended: boolean;
  lastExtension: number | null;
  movementStartExtension: number | null;
  forward: number;
  lateral: number;
  upward: number;
  movementDurationMs: number;
  idleDurationMs: number;
  lastLateralDirection: number;
  lateralTurns: number;
  eventId: number | null;
  stanceAtStart: StanceContext | null;
};
const emptyArm = (): ActiveArm => ({ extended: false, lastExtension: null, movementStartExtension: null, forward: 0, lateral: 0, upward: 0, movementDurationMs: 0, idleDurationMs: 0, lastLateralDirection: 0, lateralTurns: 0, eventId: null, stanceAtStart: null });

export class PunchDetector {
  private arms: Record<ArmSide, ActiveArm> = { left: emptyArm(), right: emptyArm() };
  private nextId = 1;
  private readonly jab = new JabDetector();
  private readonly rearStraight = new RearStraightDetector();
  private readonly hook = new HookDetector();
  private readonly uppercut = new UppercutDetector();

  constructor(private readonly thresholds: BoxingThresholds) {}

  observe(evidence: ArmEvidence, stance: StanceContext): { events: PunchEvent[]; unclassified: UnclassifiedMovement[]; recoveryUpdates: RecoveryUpdate[] } {
    const active = this.arms[evidence.side];
    const events: PunchEvent[] = [];
    const unclassified: UnclassifiedMovement[] = [];
    const recoveryUpdates: RecoveryUpdate[] = [];
    if (evidence.extension === null) return { events, unclassified, recoveryUpdates };

    if (active.extended && evidence.extension <= this.thresholds.recoveryExtension) {
      active.extended = false;
      if (active.eventId !== null) recoveryUpdates.push({ eventId: active.eventId, timestamp: evidence.timestamp, recovery: "retracted" });
      this.arms[evidence.side] = { ...emptyArm(), lastExtension: evidence.extension };
      return { events, unclassified, recoveryUpdates };
    }

    if (!active.extended && active.movementStartExtension === null && (evidence.actionStarted || evidence.movement >= this.thresholds.movementStartSpeed)) {
      active.movementStartExtension = Math.min(active.lastExtension ?? evidence.extension, evidence.extension);
      active.stanceAtStart = stance;
      active.forward = 0; active.lateral = 0; active.upward = 0; active.movementDurationMs = 0;
      active.idleDurationMs = 0;
      active.lastLateralDirection = 0; active.lateralTurns = 0;
    }
    if (!active.extended && active.movementStartExtension !== null) {
      const elapsedMs = evidence.elapsedSeconds * 1000;
      active.forward += Math.max(0, evidence.forwardMovement) * evidence.elapsedSeconds;
      active.lateral += Math.abs(evidence.lateralMovement) * evidence.elapsedSeconds;
      active.upward += Math.max(0, evidence.upwardMovement) * evidence.elapsedSeconds;
      const lateralDirection = Math.sign(evidence.lateralMovement);
      if (lateralDirection !== 0 && active.lastLateralDirection !== 0 && lateralDirection !== active.lastLateralDirection) active.lateralTurns++;
      if (lateralDirection !== 0) active.lastLateralDirection = lateralDirection;
      if (evidence.movement > this.thresholds.minimumActivitySpeed) {
        active.movementDurationMs += elapsedMs;
        active.idleDurationMs = 0;
      } else if ((active.idleDurationMs += elapsedMs) >= this.thresholds.idleResetMs) {
        active.movementStartExtension = null;
        active.forward = 0; active.lateral = 0; active.upward = 0; active.movementDurationMs = 0;
        active.stanceAtStart = null;
        active.idleDurationMs = 0;
      }
    }

    const deltaFromRetraction = active.movementStartExtension === null ? evidence.extensionSpeed * evidence.elapsedSeconds : evidence.extension - active.movementStartExtension;
    const capturedStance = active.stanceAtStart ?? stance;
    const lead = isLead(evidence.side, capturedStance);
    const pathType = active.movementStartExtension === null ? null : this.detectTechnique(active, lead);
    const isPathDrivenTechnique = pathType === "hook" || pathType === "uppercut";
    const reachedExtension = evidence.extension >= this.thresholds.minimumExtension && deltaFromRetraction >= this.thresholds.minimumExtensionDelta;
    if (!active.extended && active.movementStartExtension !== null && (isPathDrivenTechnique || reachedExtension)) {
      active.extended = true;
      if (pathType) {
        const type = asPunchType(pathType, lead);
        const bodyTarget = evidence.targetPosition !== null && evidence.targetPosition >= 0.68;
        const label = labelFor(type, lead, bodyTarget);
        const confidence = Math.min(0.99, Math.max(0.5, 0.55 + deltaFromRetraction * 0.45 + Math.max(0, active.forward)));
        const event: PunchEvent = {
          id: this.nextId++, type, label, timestamp: evidence.timestamp, arm: evidence.side,
          stance: capturedStance, confidence,
          evidence: { extension: evidence.extension, extensionDelta: deltaFromRetraction, movement: evidence.movement, forwardMovement: active.forward },
          recovery: "pending",
        };
        active.eventId = event.id;
        events.push(event);
      } else {
        unclassified.push({ timestamp: evidence.timestamp, arm: evidence.side, reason: lead ? "ambiguous-extension" : "rear-hand-extension", extension: evidence.extension, forwardMovement: active.forward, confidence: 0.45 });
      }
    } else if (!active.extended && evidence.actionStarted && evidence.extension >= this.thresholds.minimumExtension) {
      active.extended = true;
      active.stanceAtStart ??= stance;
      unclassified.push({ timestamp: evidence.timestamp, arm: evidence.side, reason: "ambiguous-extension", extension: evidence.extension, forwardMovement: active.forward, confidence: 0.45 });
    }
    active.lastExtension = evidence.extension;
    return { events, unclassified, recoveryUpdates };
  }

  interrupt(timestamp: number): RecoveryUpdate[] {
    const updates: RecoveryUpdate[] = [];
    for (const side of ["left", "right"] as const) {
      const active = this.arms[side];
      if (active.extended && active.eventId !== null) updates.push({ eventId: active.eventId, timestamp, recovery: "incomplete" });
      this.arms[side] = emptyArm();
    }
    return updates;
  }

  interruptArm(side: ArmSide, timestamp: number): RecoveryUpdate[] {
    const active = this.arms[side];
    const updates = active.extended && active.eventId !== null
      ? [{ eventId: active.eventId, timestamp, recovery: "incomplete" as const }]
      : [];
    this.arms[side] = emptyArm();
    return updates;
  }

  reset() { this.arms = { left: emptyArm(), right: emptyArm() }; this.nextId = 1; }

  private detectTechnique(active: ActiveArm, lead: boolean) {
    const path = active;
    const minimum = this.thresholds.minimumForwardMovement;
    return this.uppercut.detect(path, minimum, this.thresholds.uppercutMinimumMovementMs)
      ?? this.hook.detect(path, minimum, this.thresholds.hookMinimumMovementMs)
      ?? (lead ? this.jab.detect(path, minimum) : this.rearStraight.detect(path, minimum));
  }
}

function isLead(side: ArmSide, stance: StanceContext) {
  return (stance.stance === "orthodox" && side === "left") || (stance.stance === "southpaw" && side === "right");
}

function labelFor(type: PunchEvent["type"], lead: boolean, body: boolean): PunchEvent["label"] {
  const punchNumber = type === "jab" ? "1" : type === "straight" ? "2" : type === "hook" ? (lead ? "3" : "4") : (lead ? "5" : "6");
  return `${punchNumber}${body ? "b" : ""}` as PunchEvent["label"];
}
