export type MetricsView = {
  poseRate: HTMLElement;
  inference: HTMLElement;
  processingRate: HTMLElement;
  gaps: HTMLElement;
};

export class TrackingMetrics {
  private processed = 0;
  private detected = 0;
  private gaps = 0;
  private inferenceTotal = 0;
  private lastResultTime = 0;

  constructor(private readonly view: MetricsView) {}

  record(inferenceMs: number, hasPose: boolean) {
    this.processed++;
    this.inferenceTotal += inferenceMs;
    if (hasPose) this.detected++;
    else this.gaps++;
    const now = performance.now();
    const fps =
      this.lastResultTime === 0 ? 0 : 1000 / (now - this.lastResultTime);
    this.lastResultTime = now;
    this.view.poseRate.textContent = `${Math.round((this.detected / this.processed) * 100)}%`;
    this.view.inference.textContent = `${(this.inferenceTotal / this.processed).toFixed(0)} ms`;
    this.view.processingRate.textContent = fps > 0 ? fps.toFixed(1) : "—";
    this.view.gaps.textContent = `${this.gaps}`;
  }

  reset() {
    this.processed = 0;
    this.detected = 0;
    this.gaps = 0;
    this.inferenceTotal = 0;
    this.lastResultTime = 0;
    this.view.poseRate.textContent = "—";
    this.view.inference.textContent = "—";
    this.view.processingRate.textContent = "—";
    this.view.gaps.textContent = "0";
  }

  summary() {
    return { processed: this.processed, detected: this.detected };
  }
}
