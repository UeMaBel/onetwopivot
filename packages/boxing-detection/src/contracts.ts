import type { Landmark, PoseFrame } from "./types";
import type { BoxingActionLabel } from "./labels";
export type { BoxingActionLabel, DefenseActionLabel, PunchLabel } from "./labels";

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
  lateralMovement: number;
  upwardMovement: number;
  targetPosition: number | null;
  actionStarted: boolean;
};

export type PunchType = "jab" | "straight" | "hook" | "uppercut";
export type PunchEvent = {
  id: number;
  type: PunchType;
  label: Extract<BoxingActionLabel, `${number}${"" | "b"}`>;
  timestamp: number;
  arm: ArmSide;
  stance: StanceContext;
  confidence: number;
  evidence: { extension: number; extensionDelta: number; movement: number; forwardMovement: number };
  recovery: "pending" | "recovered" | "incomplete";
  recoveryTimestamp?: number;
};
export type JabEvent = PunchEvent;

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
  events: PunchEvent[];
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
  jabs?: Array<{ timestamp: number; arm: ArmSide }>;
  actions?: Array<{ timestamp: number; arm: ArmSide; label: Extract<BoxingActionLabel, `${number}${"" | "b"}`> }>;
  movements?: Array<{ timestamp: number; arm: ArmSide; expected: BoxingActionLabel | "jab" | "unclassified" }>;
};

export type BenchmarkSplit = "tuning" | "validation";

export type VideoAnnotation = {
  version: 1;
  video: string;
  stance: Stance;
  split: BenchmarkSplit;
  actions: Partial<Record<BoxingActionLabel, number>>;
  metadata: Record<string, unknown>;
};

export type CountBenchmarkClip = {
  id: string;
  frames: PoseFrame[];
  annotation: VideoAnnotation;
};

export type ClipCountReport = {
  id: string;
  split: BenchmarkSplit;
  stance: { expected: Stance; detected: Stance | null; correct: boolean };
  expectedActions: Partial<Record<BoxingActionLabel, number>>;
  detectedActions: Partial<Record<BoxingActionLabel, number>>;
  unclassifiedDetections: number;
};

export type CountBenchmarkReport = {
  version: 1;
  split: BenchmarkSplit | "all";
  clips: ClipCountReport[];
  actions: Partial<Record<BoxingActionLabel, { expected: number; detected: number; difference: number }>>;
  unclassifiedDetections: number;
  stance: { expected: number; detected: number; correct: number; accuracy: number };
};
