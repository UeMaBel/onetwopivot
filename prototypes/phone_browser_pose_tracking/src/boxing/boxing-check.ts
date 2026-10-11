import { boxingProtocol } from "./boxing-config";
import type { BoxingCheckView } from "./boxing-view";
import type { PoseFrame } from "@onetwopivot/boxing-detection";

export class BoxingCheck {
  private phase: "guard" | "jabs" | "return" | null = null;
  private guardTimer: number | undefined;
  private processedFrames = 0;
  private framesWithPerson = 0;

  constructor(
    private readonly view: BoxingCheckView,
    private readonly isReady: () => boolean,
  ) {
    view.start.addEventListener("click", () => this.start());
    view.advance.addEventListener("click", () => this.advance());
  }

  stop() {
    if (this.guardTimer !== undefined) window.clearInterval(this.guardTimer);
    this.guardTimer = undefined;
    this.phase = null;
    this.view.advance.hidden = true;
    this.view.note.textContent = "Start the camera before beginning the check.";
    this.view.start.disabled = true;
  }

  cameraReady() {
    this.view.start.disabled = false;
  }

  onPoseFrame(frame: PoseFrame) {
    if (this.phase === null) return;
    this.processedFrames++;
    if (frame.landmarks) this.framesWithPerson++;
  }

  private start() {
    if (!this.isReady()) {
      this.view.note.textContent = "Wait for pose tracking to become ready.";
      return;
    }
    this.processedFrames = 0;
    this.framesWithPerson = 0;
    this.phase = "guard";
    this.render();
    this.view.start.disabled = true;
    let secondsLeft = boxingProtocol.guardHoldSeconds;
    this.view.note.textContent = `Hold guard · ${secondsLeft}`;
    this.guardTimer = window.setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        this.view.note.textContent = `Hold guard · ${secondsLeft}`;
        return;
      }
      if (this.guardTimer !== undefined) window.clearInterval(this.guardTimer);
      this.guardTimer = undefined;
      this.phase = "jabs";
      this.render();
    }, 1000);
  }

  private advance() {
    if (this.phase === "jabs") {
      this.phase = "return";
      this.render();
      return;
    }
    if (this.phase !== "return") return;
    const { framesWithPerson, processedFrames } = this;
    this.phase = null;
    this.view.step.innerHTML = `<span class="boxing-step-number">✓</span><div><strong>Check complete</strong><p>Run it again to compare another setup.</p></div>`;
    this.view.note.textContent = `Person detected in ${framesWithPerson.toLocaleString()} of ${processedFrames.toLocaleString()} check frames.`;
    this.view.advance.hidden = true;
    this.view.start.disabled = false;
    this.view.start.textContent = "Run check again";
  }

  private render() {
    if (this.phase === "guard") {
      this.view.step.innerHTML = `<span class="boxing-step-number">01</span><div><strong>Hold your boxing guard</strong><p>Keep your whole body in view for ${boxingProtocol.guardHoldSeconds} seconds.</p></div>`;
      this.view.note.textContent = `Guard hold: ${boxingProtocol.guardHoldSeconds} seconds.`;
      this.view.advance.hidden = true;
    } else if (this.phase === "jabs") {
      this.view.step.innerHTML = `<span class="boxing-step-number">02</span><div><strong>Throw ${boxingProtocol.leadHandJabs} lead-hand jabs</strong><p>Keep your other hand in guard. Tap below when you finish.</p></div>`;
      this.view.note.textContent =
        "Move at a comfortable pace. The prototype does not count or score punches.";
      this.view.advance.textContent = `Done with ${boxingProtocol.leadHandJabs} jabs`;
      this.view.advance.hidden = false;
    } else if (this.phase === "return") {
      this.view.step.innerHTML = `<span class="boxing-step-number">03</span><div><strong>Return to your guard</strong><p>Stay in view, then finish the check.</p></div>`;
      this.view.note.textContent =
        "Review the tracking and performance measurements above.";
      this.view.advance.textContent = "Finish check";
      this.view.advance.hidden = false;
    }
  }
}
