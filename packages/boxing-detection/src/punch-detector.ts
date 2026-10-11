import type { ArmEvidence, ArmSide, PunchEvent, RecoveryUpdate, StanceContext, UnclassifiedMovement } from "./contracts";
import type { BoxingThresholds } from "./contracts";

type ActiveArm = {
  extended: boolean;
  lastExtension: number | null;
  movementStartExtension: number | null;
  forward: number;
  lateral: number;
  upward: number;
  movementFrames: number;
  idleFrames: number;
  eventId: number | null;
  stanceAtStart: StanceContext | null;
};
const emptyArm = (): ActiveArm => ({ extended: false, lastExtension: null, movementStartExtension: null, forward: 0, lateral: 0, upward: 0, movementFrames: 0, idleFrames: 0, eventId: null, stanceAtStart: null });

export class PunchDetector {
  private arms: Record<ArmSide, ActiveArm> = { left: emptyArm(), right: emptyArm() };
  private nextId = 1;

  constructor(private readonly thresholds: BoxingThresholds) {}

  observe(evidence: ArmEvidence, stance: StanceContext): { events: PunchEvent[]; unclassified: UnclassifiedMovement[]; recoveryUpdates: RecoveryUpdate[] } {
    const active = this.arms[evidence.side];
    const events: PunchEvent[] = [];
    const unclassified: UnclassifiedMovement[] = [];
    const recoveryUpdates: RecoveryUpdate[] = [];
    if (evidence.extension === null) return { events, unclassified, recoveryUpdates };

    if (active.extended && evidence.extension <= this.thresholds.recoveryExtension) {
      active.extended = false;
      if (active.eventId !== null) recoveryUpdates.push({ eventId: active.eventId, timestamp: evidence.timestamp, recovery: "recovered" });
      this.arms[evidence.side] = { ...emptyArm(), lastExtension: evidence.extension };
      return { events, unclassified, recoveryUpdates };
    }

    if (!active.extended && active.movementStartExtension === null && (evidence.actionStarted || evidence.movement >= this.thresholds.movementStartDelta)) {
      active.movementStartExtension = Math.min(active.lastExtension ?? evidence.extension, evidence.extension);
      active.stanceAtStart = stance;
      active.forward = 0; active.lateral = 0; active.upward = 0; active.movementFrames = 0;
    }
    if (!active.extended && active.movementStartExtension !== null) {
      active.forward += Math.max(0, evidence.forwardMovement);
      active.lateral += Math.abs(evidence.lateralMovement);
      active.upward += Math.max(0, evidence.upwardMovement);
      if (evidence.movement > 0.015) { active.movementFrames++; active.idleFrames = 0; }
      else if (++active.idleFrames >= 3) {
        active.movementStartExtension = null;
        active.forward = 0; active.lateral = 0; active.upward = 0; active.movementFrames = 0;
        active.stanceAtStart = null;
        active.idleFrames = 0;
      }
    }

    const deltaFromRetraction = active.movementStartExtension === null ? evidence.extensionDelta : evidence.extension - active.movementStartExtension;
    if (!active.extended && active.movementStartExtension !== null && evidence.extension >= this.thresholds.minimumExtension && deltaFromRetraction >= this.thresholds.minimumExtensionDelta) {
      active.extended = true;
      const capturedStance = active.stanceAtStart ?? stance;
      const lead = isLead(evidence.side, capturedStance);
      const pathType = classifyPath(active, this.thresholds.minimumForwardMovement);
      if (pathType) {
        const type = pathType === "straight" ? (lead ? "jab" : "straight") : pathType;
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

  reset() { this.arms = { left: emptyArm(), right: emptyArm() }; this.nextId = 1; }
}

function isLead(side: ArmSide, stance: StanceContext) {
  return (stance.stance === "orthodox" && side === "left") || (stance.stance === "southpaw" && side === "right");
}

function classifyPath(active: ActiveArm, minimumForward: number): "straight" | "hook" | "uppercut" | null {
  if (active.upward >= minimumForward && active.upward >= active.forward * 0.85 && active.upward >= active.lateral * 0.55) return "uppercut";
  if (active.movementFrames >= 2 && active.lateral >= minimumForward && active.forward < active.lateral * 0.25) return "hook";
  if (active.forward >= minimumForward) return "straight";
  return null;
}

function labelFor(type: PunchEvent["type"], lead: boolean, body: boolean): PunchEvent["label"] {
  const punchNumber = type === "jab" ? "1" : type === "straight" ? "2" : type === "hook" ? (lead ? "3" : "4") : (lead ? "5" : "6");
  return `${punchNumber}${body ? "b" : ""}` as PunchEvent["label"];
}
