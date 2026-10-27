import { poseModel } from "./config";
import { BrowserCameraSource } from "./camera-source";
import { mountApp, setTrackingStatus, showError, clearError } from "./app-view";
import { drawPose } from "./pose-overlay";
import type { Landmark, WorkerReply } from "./pose-types";
import { TrackingMetrics } from "./tracking-metrics";
import { mountBoxingCheck } from "./boxing/boxing-view";
import { BoxingCheck } from "./boxing/boxing-check";
import { BoxingDetectionPipeline } from "@onetwopivot/boxing-detection";
import { mountDetectionView } from "./boxing/detection-view";
import { mountPunchSummaryView } from "./boxing/punch-summary-view";

const view = mountApp();
const cameraSource = new BrowserCameraSource();
const metrics = new TrackingMetrics(view.metrics);
const boxingView = mountBoxingCheck();
const detectionPipeline = new BoxingDetectionPipeline();
const detectionView = mountDetectionView(detectionPipeline.thresholds);
const punchSummaryView = mountPunchSummaryView();

let worker: Worker | undefined;
let stream: MediaStream | undefined;
let workerReady = false;
let frameInFlight = false;
let lastVideoTime = -1;
let animationId = 0;
let latestLandmarks: Landmark[] | null = null;

const check = new BoxingCheck(boxingView, () => !!stream && workerReady);

function handleWorkerMessage(event: MessageEvent<WorkerReply>) {
  const message = event.data;
  if (message.type === "ready") {
    workerReady = true;
    view.cameraMessage.textContent = "Camera and pose tracking are ready.";
    setTrackingStatus("Looking for pose", "waiting");
    check.cameraReady();
    return;
  }
  if (message.type === "error") {
    showError(
      view.errorMessage,
      `Pose tracking could not start: ${message.message}`,
    );
    setTrackingStatus("Tracking error", "lost");
    view.cameraMessage.textContent = "Check your connection and retry.";
    frameInFlight = false;
    return;
  }
  frameInFlight = false;
  latestLandmarks = message.landmarks;
  check.onPoseFrame({
    timestamp: message.timestamp,
    landmarks: message.landmarks,
    aspectRatio: message.aspectRatio,
  });
  const boxingUpdate = detectionPipeline.process({
    timestamp: message.timestamp,
    landmarks: message.landmarks,
    aspectRatio: message.aspectRatio,
  });
  punchSummaryView.update(boxingUpdate);
  detectionView.update(boxingUpdate);
  metrics.record(message.inferenceMs, !!message.landmarks);
  if (message.landmarks) setTrackingStatus("Pose tracking", "tracking");
  else setTrackingStatus("Move fully into view", "lost");
}

async function sendFrame() {
  if (
    !stream ||
    !worker ||
    !workerReady ||
    frameInFlight ||
    view.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
  )
    return;
  if (view.video.currentTime === lastVideoTime) return;
  lastVideoTime = view.video.currentTime;
  frameInFlight = true;
  try {
    const bitmap = await createImageBitmap(view.video);
    worker.postMessage(
      { type: "frame", bitmap, timestamp: view.video.currentTime * 1000 },
      [bitmap],
    );
  } catch {
    frameInFlight = false;
  }
}

function tick() {
  drawPose(view.canvas, view.video, latestLandmarks);
  void sendFrame();
  animationId = requestAnimationFrame(tick);
}

async function startCamera() {
  clearError(view.errorMessage);
  view.startButton.disabled = true;
  view.cameraMessage.textContent = "Waiting for camera permission…";
  setTrackingStatus("Requesting camera", "waiting");
  try {
    stream = await cameraSource.start();
    view.video.srcObject = stream;
    await view.video.play();
    view.placeholder.hidden = true;
    view.stage.classList.add("active");
    view.stopButton.disabled = false;
    worker = new Worker(new URL("./pose-worker.ts", import.meta.url), {
      type: "classic",
    });
    worker.onmessage = handleWorkerMessage;
    worker.postMessage({
      type: "init",
      wasmPath: poseModel.wasmPath,
      modelPath: poseModel.assetPath,
    });
    metrics.reset();
    detectionPipeline.reset();
    detectionView.reset();
    punchSummaryView.reset();
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(tick);
  } catch (error) {
    stopCamera(false);
    const reason = error instanceof Error ? error.message : String(error);
    showError(
      view.errorMessage,
      `Camera unavailable: ${reason}. Check camera permission, then retry.`,
    );
    view.cameraMessage.textContent = "Camera did not start.";
    setTrackingStatus("Camera unavailable", "off");
    view.startButton.disabled = false;
  }
}

function stopCamera(resetMessage = true) {
  cancelAnimationFrame(animationId);
  worker?.terminate();
  worker = undefined;
  workerReady = false;
  frameInFlight = false;
  lastVideoTime = -1;
  latestLandmarks = null;
  detectionPipeline.reset();
  detectionView.reset();
  punchSummaryView.reset();
  cameraSource.stop();
  stream = undefined;
  view.video.srcObject = null;
  drawPose(view.canvas, view.video, null);
  view.placeholder.hidden = false;
  view.stage.classList.remove("active");
  view.startButton.disabled = false;
  view.stopButton.disabled = true;
  if (resetMessage) view.cameraMessage.textContent = "Camera stopped.";
  setTrackingStatus("Camera off", "off");
  check.stop();
}

view.startButton.addEventListener("click", () => void startCamera());
view.stopButton.addEventListener("click", () => stopCamera());
window.addEventListener("resize", () =>
  drawPose(view.canvas, view.video, latestLandmarks),
);
setTrackingStatus("Camera off", "off");
