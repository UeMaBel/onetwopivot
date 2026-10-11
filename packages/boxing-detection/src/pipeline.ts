import type { PoseFrame } from "./types";
import { ArmObserver } from "./arm-observer";
import type { BoxingThresholds, BoxingPipelineUpdate, ArmSide } from "./contracts";
import { JabDetector } from "./jab-detector";
import { StanceDetector } from "./stance-detector";
import { defaultBoxingThresholds } from "./thresholds";

export class BoxingDetectionPipeline {
  private readonly stanceDetector: StanceDetector;
  private readonly armObserver: ArmObserver;
  private readonly jabDetector: JabDetector;
  private lastTimestamp: number | undefined;
  readonly thresholds: BoxingThresholds;

  constructor(thresholds: BoxingThresholds = defaultBoxingThresholds) {
    this.thresholds = { ...thresholds };
    this.stanceDetector = new StanceDetector(this.thresholds);
    this.armObserver = new ArmObserver(this.thresholds);
    this.jabDetector = new JabDetector(this.thresholds);
  }

  process(frame: PoseFrame): BoxingPipelineUpdate {
    const recoveryUpdates: BoxingPipelineUpdate["recoveryUpdates"] = [];
    if (this.lastTimestamp !== undefined && frame.timestamp - this.lastTimestamp > this.thresholds.trackingGapResetMs) {
      this.armObserver.reset();
      recoveryUpdates.push(...this.jabDetector.interrupt(frame.timestamp));
    }
    this.lastTimestamp = frame.timestamp;
    const stance = this.stanceDetector.observe(frame);
    const arms = { left: this.armObserver.observe(frame, "left"), right: this.armObserver.observe(frame, "right") };
    const events = [] as BoxingPipelineUpdate["events"];
    const unclassified = [] as BoxingPipelineUpdate["unclassified"];
    for (const side of ["left", "right"] as const satisfies readonly ArmSide[]) {
      const result = this.jabDetector.observe(arms[side], stance.context);
      events.push(...result.events);
      unclassified.push(...result.unclassified);
      recoveryUpdates.push(...result.recoveryUpdates);
    }
    return { timestamp: frame.timestamp, personDetected: frame.landmarks !== null, stance, arms, events, unclassified, recoveryUpdates };
  }

  reset() {
    this.lastTimestamp = undefined;
    this.stanceDetector.reset();
    this.armObserver.reset();
    this.jabDetector.reset();
  }
}
