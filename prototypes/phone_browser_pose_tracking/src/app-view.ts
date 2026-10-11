import "./style.css";

export function mountApp() {
  const app = get<HTMLDivElement>("#app");
  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand-mark" aria-hidden="true">1·2</div>
        <div><p class="eyebrow">ONETWOPIVOT · EXPERIMENT</p><h1>Phone pose tracking</h1></div>
        <span class="device-tag">BROWSER TEST</span>
      </header>
      <section class="camera-card" aria-label="Live pose tracking">
        <div class="camera-stage" id="camera-stage">
          <video id="camera" autoplay playsinline muted></video><canvas id="overlay" aria-hidden="true"></canvas>
          <div class="camera-placeholder" id="placeholder"><div class="placeholder-icon" aria-hidden="true">◉</div><strong>Camera is off</strong><span>Place the phone upright and step back until your whole body fits.</span></div>
          <div class="tracking-chip" id="tracking-chip"><span class="status-dot"></span><span id="tracking-label">Camera off</span></div>
        </div>
        <div class="camera-controls"><button class="primary-button" id="start-camera">Start camera</button><button class="secondary-button" id="stop-camera" disabled>Stop</button><p class="camera-message" id="camera-message" role="status">Ready when you are.</p></div>
      </section>
      <section class="metrics-grid" aria-label="Live measurements">
        <article class="metric-card"><span class="metric-label">Person detected</span><strong id="pose-rate">—</strong><small>of processed frames</small></article>
        <article class="metric-card"><span class="metric-label">Inference</span><strong id="inference-time">—</strong><small>milliseconds per frame</small></article>
        <article class="metric-card"><span class="metric-label">Processing</span><strong id="processing-rate">—</strong><small>frames per second</small></article>
        <article class="metric-card"><span class="metric-label">Detection gaps</span><strong id="pose-gaps">0</strong><small>frames without a person</small></article>
      </section>
      <div id="boxing-check"></div>
      <footer class="privacy-note"><span class="privacy-icon" aria-hidden="true">⌁</span><p>Camera frames and pose results are processed on this device and are not recorded or uploaded. MediaPipe also sends API performance and usage metrics to Google.</p></footer>
      <p class="error-message" id="error-message" role="alert" hidden></p>
    </div>`;

  return {
    video: get<HTMLVideoElement>("#camera"),
    canvas: get<HTMLCanvasElement>("#overlay"),
    stage: get<HTMLDivElement>("#camera-stage"),
    placeholder: get<HTMLDivElement>("#placeholder"),
    startButton: get<HTMLButtonElement>("#start-camera"),
    stopButton: get<HTMLButtonElement>("#stop-camera"),
    cameraMessage: get<HTMLParagraphElement>("#camera-message"),
    trackingLabel: get<HTMLSpanElement>("#tracking-label"),
    errorMessage: get<HTMLParagraphElement>("#error-message"),
    metrics: {
      poseRate: get<HTMLElement>("#pose-rate"),
      inference: get<HTMLElement>("#inference-time"),
      processingRate: get<HTMLElement>("#processing-rate"),
      gaps: get<HTMLElement>("#pose-gaps"),
    },
  };
}

function get<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required app element not found: ${selector}`);
  return element;
}

export function setTrackingStatus(
  label: string,
  state: "off" | "waiting" | "tracking" | "lost",
) {
  get<HTMLSpanElement>("#tracking-label").textContent = label;
  get<HTMLDivElement>("#tracking-chip").dataset.state = state;
}

export function showError(element: HTMLElement, message: string) {
  element.textContent = message;
  element.hidden = false;
}
export function clearError(element: HTMLElement) {
  element.textContent = "";
  element.hidden = true;
}
