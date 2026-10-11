import type { Landmark, PoseFrame } from "../../pose-types";

export type ArmSide = "left" | "right";
export type Stance = "orthodox" | "southpaw";
export type StanceSource = "detected" | "assumed";

export type StanceContext = {
  stance: Stance;
  source: StanceSource;
  timestamp: number;
};

export type StanceObservation = {
  current: Stance | null;
  context: StanceContext;
};

export type ArmEvidence = {
  side: ArmSide;
  timestamp: number;
  wrist: Landmark | null;
  extension: number | null;
  extensionDelta: number;
  movement: number;
  forwardMovement: number;
  actionStarted: boolean;
};

export type JabEvent = {
  id: number;
  type: "jab";
  timestamp: number;
  arm: ArmSide;
  stance: StanceContext;
  confidence: number;
  evidence: { extension: number; extensionDelta: number; movement: number; forwardMovement: number };
  recovery: "pending" | "recovered" | "incomplete";
  recoveryTimestamp?: number;
};

export type RecoveryUpdate = {
  eventId: number;
  timestamp: number;
  recovery: "recovered" | "incomplete";
};

export type UnclassifiedMovement = {
  timestamp: number;
  arm: ArmSide;
  reason: "rear-hand-extension" | "ambiguous-extension";
  extension: number;
  forwardMovement: number;
  confidence: number;
};

export type BoxingPipelineUpdate = {
  timestamp: number;
  personDetected: boolean;
  stance: StanceObservation;
  arms: Record<ArmSide, ArmEvidence>;
  events: JabEvent[];
  unclassified: UnclassifiedMovement[];
  recoveryUpdates: RecoveryUpdate[];
};

export type BoxingThresholds = {
  stanceDepthRatio: number;
  movementStartDelta: number;
  minimumForwardMovement: number;
  minimumExtension: number;
  minimumExtensionDelta: number;
  recoveryExtension: number;
  trackingGapResetMs: number;
};

export type PoseSequence = { id: string; frames: PoseFrame[] };

export type SequenceAnnotation = {
  sequenceId: string;
  stance?: Stance;
  stances?: Array<{ timestamp: number; stance: Stance }>;
  jabs: Array<{ timestamp: number; arm: ArmSide }>;
  movements?: Array<{ timestamp: number; arm: ArmSide; expected: "jab" | "unclassified" }>;
};
