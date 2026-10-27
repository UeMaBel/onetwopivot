import type * as MediaPipe from "@mediapipe/tasks-vision";

type InitMessage = {
  type: "init";
  wasmPath: string;
  modelPath: string;
};

type FrameMessage = {
  type: "frame";
  bitmap: ImageBitmap;
  timestamp: number;
};

type WorkerMessage = InitMessage | FrameMessage;

declare const Vision: typeof MediaPipe;

let landmarker: MediaPipe.PoseLandmarker | undefined;
let visionBundleLoaded = false;
const workerScope = self as unknown as DedicatedWorkerGlobalScope;

// MediaPipe returns one array of landmarks for each detected person. Each
// landmark has normalized x/y coordinates (usually 0 to 1), a relative z
// coordinate, and sometimes a visibility confidence value.
function serializableLandmarks(
  points: MediaPipe.NormalizedLandmark[] | undefined,
) {
  // Copy only the values this prototype needs. The returned plain objects can
  // safely be sent from this worker back to the page with postMessage().
  return (
    points?.map(({ x, y, z, visibility }) => ({ x, y, z, visibility })) ?? null
  );
}

workerScope.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === "init") {
    try {
      if (!visionBundleLoaded) {
        // Load MediaPipe's browser library inside this worker. importScripts is
        // available because main.ts creates this as a classic (not module) worker.
        // The library and WASM files are local public assets; Vite should serve
        // them as-is instead of trying to bundle/transform them.
        importScripts("/mediapipe/vision_bundle.js");
        visionBundleLoaded = true;
      }
      // Prepare the WebAssembly runtime, then load the selected pose model.
      // VIDEO mode lets MediaPipe use the frame timestamps we send below.
      const vision = await Vision.FilesetResolver.forVisionTasks(
        message.wasmPath,
      );
      landmarker = await Vision.PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: message.modelPath },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      workerScope.postMessage({ type: "ready" });
    } catch (error) {
      workerScope.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (message.type === "frame") {
    const startedAt = performance.now();
    try {
      // Detect a pose in this one camera frame. landmarks[0] is the first
      // detected person (there can be up to one because numPoses is set to 1).
      const result = landmarker?.detectForVideo(
        message.bitmap,
        message.timestamp,
      );
      // MediaPipe landmark arrays use fixed indexes. For example, the left
      // elbow is index 13: result.landmarks[0]?.[13]. The left shoulder is 11,
      // left wrist is 15, right shoulder is 12, and right elbow is 14. These
      // left/right labels refer to the person's body, not the screen's sides.
      // serializableLandmarks keeps the same order, so after this worker sends
      // landmarks back, page code can read landmarks[13] for the left elbow.
      workerScope.postMessage({
        type: "result",
        timestamp: message.timestamp,
        inferenceMs: performance.now() - startedAt,
        landmarks: serializableLandmarks(result?.landmarks[0]),
        aspectRatio: message.bitmap.width / message.bitmap.height,
      });
    } catch (error) {
      workerScope.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      message.bitmap.close();
    }
  }
};
