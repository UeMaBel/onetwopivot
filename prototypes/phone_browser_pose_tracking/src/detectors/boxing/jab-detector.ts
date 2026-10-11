import type { ArmEvidence, ArmSide, JabEvent, RecoveryUpdate, StanceContext, UnclassifiedMovement } from "./contracts";
import type { BoxingThresholds } from "./contracts";

type ActiveArm = { extended: boolean; lastExtension: number | null; movementStartExtension: number | null; forwardMovementSinceStart: number; eventId: number | null; stanceAtStart: StanceContext | null };

export class JabDetector {
  private arms: Record<ArmSide, ActiveArm> = {
    left: { extended: false, lastExtension: null, movementStartExtension: null, forwardMovementSinceStart: 0, eventId: null, stanceAtStart: null },
    right: { extended: false, lastExtension: null, movementStartExtension: null, forwardMovementSinceStart: 0, eventId: null, stanceAtStart: null },
  };
  private nextId = 1;

  constructor(private readonly thresholds: BoxingThresholds) {}

  observe(evidence: ArmEvidence, stance: StanceContext): { events: JabEvent[]; unclassified: UnclassifiedMovement[]; recoveryUpdates: RecoveryUpdate[] } {
    const active = this.arms[evidence.side];
    const events: JabEvent[] = [];
    const unclassified: UnclassifiedMovement[] = [];
    const recoveryUpdates: RecoveryUpdate[] = [];
    if (evidence.extension === null) return { events, unclassified, recoveryUpdates };

    if (active.extended && evidence.extension <= this.thresholds.recoveryExtension) {
      active.extended = false;
      if (active.eventId !== null) recoveryUpdates.push({ eventId: active.eventId, timestamp: evidence.timestamp, recovery: "recovered" });
      active.eventId = null;
      active.lastExtension = evidence.extension;
      active.movementStartExtension = null;
      active.forwardMovementSinceStart = 0;
      active.stanceAtStart = null;
      return { events, unclassified, recoveryUpdates };
    }

    const started = evidence.actionStarted;
    if (!active.extended && started && active.movementStartExtension === null) {
      active.movementStartExtension = active.lastExtension ?? evidence.extension - evidence.extensionDelta;
      active.stanceAtStart = stance;
      active.forwardMovementSinceStart = evidence.forwardMovement;
    } else if (!active.extended && active.movementStartExtension !== null) active.forwardMovementSinceStart += evidence.forwardMovement;
    if (!active.extended && active.movementStartExtension !== null && evidence.extension < active.movementStartExtension) {
      active.movementStartExtension = null;
      active.forwardMovementSinceStart = 0;
      active.stanceAtStart = null;
    }
    const deltaFromRetraction = active.movementStartExtension === null ? evidence.extensionDelta : evidence.extension - active.movementStartExtension;
    if (!active.extended && active.movementStartExtension !== null && evidence.extension >= this.thresholds.minimumExtension && deltaFromRetraction >= this.thresholds.minimumExtensionDelta) {
      active.extended = true;
      const capturedStance = active.stanceAtStart ?? stance;
      const lead = (capturedStance.stance === "orthodox" && evidence.side === "left") || (capturedStance.stance === "southpaw" && evidence.side === "right");
      const confidence = Math.min(0.99, Math.max(0.5, 0.55 + deltaFromRetraction * 0.45 + active.forwardMovementSinceStart));
      if (lead) {
        if (active.forwardMovementSinceStart >= this.thresholds.minimumForwardMovement) {
          const event: JabEvent = {
            id: this.nextId++, type: "jab", timestamp: evidence.timestamp, arm: evidence.side,
            stance: capturedStance, confidence,
            evidence: { extension: evidence.extension, extensionDelta: deltaFromRetraction, movement: evidence.movement, forwardMovement: active.forwardMovementSinceStart },
            recovery: "pending",
          };
          active.eventId = event.id;
          events.push(event);
        } else {
          unclassified.push({ timestamp: evidence.timestamp, arm: evidence.side, reason: "ambiguous-extension", extension: evidence.extension, forwardMovement: active.forwardMovementSinceStart, confidence: 0.45 });
        }
      } else {
        unclassified.push({ timestamp: evidence.timestamp, arm: evidence.side, reason: "rear-hand-extension", extension: evidence.extension, forwardMovement: active.forwardMovementSinceStart, confidence: Math.min(confidence, 0.75) });
      }
    } else if (!active.extended && started && evidence.extension >= this.thresholds.minimumExtension) {
      active.extended = true;
      active.stanceAtStart ??= stance;
      unclassified.push({ timestamp: evidence.timestamp, arm: evidence.side, reason: "ambiguous-extension", extension: evidence.extension, forwardMovement: active.forwardMovementSinceStart, confidence: 0.45 });
    }
    active.lastExtension = evidence.extension;
    return { events, unclassified, recoveryUpdates };
  }

  interrupt(timestamp: number): RecoveryUpdate[] {
    const updates: RecoveryUpdate[] = [];
    for (const side of ["left", "right"] as const) {
      const active = this.arms[side];
      if (active.extended && active.eventId !== null) {
        updates.push({ eventId: active.eventId, timestamp, recovery: "incomplete" });
      }
      this.arms[side] = { extended: false, lastExtension: null, movementStartExtension: null, forwardMovementSinceStart: 0, eventId: null, stanceAtStart: null };
    }
    return updates;
  }

  reset() {
    for (const side of ["left", "right"] as const) this.arms[side] = { extended: false, lastExtension: null, movementStartExtension: null, forwardMovementSinceStart: 0, eventId: null, stanceAtStart: null };
    this.nextId = 1;
  }
}
