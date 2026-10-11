import { defaultBoxingThresholds, evaluateCountBenchmark } from "@onetwopivot/boxing-detection";
import type { BoxingThresholds, ClipCountReport, CountBenchmarkClip, VideoAnnotation } from "@onetwopivot/boxing-detection";
import type { PoseFrame } from "@onetwopivot/boxing-detection";
import type { WorkerReply } from "../pose-types";

type FrameFile = { url: string; timestamp: number };
type BenchmarkJob = {
  id: string;
  frames: FrameFile[];
  annotation: VideoAnnotation;
  thresholds: BoxingThresholds;
  split: "all" | "tuning" | "validation";
};

declare global {
  interface Window {
    benchmarkReady: boolean;
    getDefaultThresholds: () => BoxingThresholds;
    processBenchmarkClip: (job: BenchmarkJob) => Promise<{
      frames: PoseFrame[];
      clip: ClipCountReport;
    }>;
    evaluateCachedClip: (job: Omit<BenchmarkJob, "frames"> & { frames: PoseFrame[] }) => Promise<ClipCountReport>;
  }
}

const status = document.querySelector<HTMLElement>("#benchmark-status");
if (!status) throw new Error("Benchmark status element is missing.");

window.benchmarkReady = false;
window.getDefaultThresholds = () => ({ ...defaultBoxingThresholds });
window.processBenchmarkClip = processClip;
window.evaluateCachedClip = async (job) => {
  const clip: CountBenchmarkClip = { id: job.id, frames: job.frames, annotation: job.annotation };
  const report = evaluateCountBenchmark([clip], job.thresholds, job.split);
  const result = report.clips[0];
  if (!result) throw new Error(`No benchmark report was produced for ${job.id}.`);
  return result;
};
window.benchmarkReady = true;
status.textContent = "Benchmark page ready.";

async function processClip(job: BenchmarkJob) {
  const worker = new Worker(new URL("../pose-worker.ts", import.meta.url), {
    type: "classic",
  });
  const frames: PoseFrame[] = [];
  let pendingResult: ((reply: WorkerReply) => void) | undefined;
  let rejectPending: ((error: Error) => void) | undefined;
  let resolveReady: (() => void) | undefined;
  let rejectReady: ((error: Error) => void) | undefined;

  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  worker.onmessage = (event: MessageEvent<WorkerReply>) => {
    const reply = event.data;
    if (reply.type === "ready") {
      resolveReady?.();
      return;
    }
    if (reply.type === "error") {
      const error = new Error(reply.message);
      rejectReady?.(error);
      rejectPending?.(error);
      return;
    }
    pendingResult?.(reply);
    pendingResult = undefined;
    rejectPending = undefined;
  };

  worker.onerror = (event) => {
    const error = new Error(event.message || "Pose worker failed.");
    rejectReady?.(error);
    rejectPending?.(error);
  };

  worker.postMessage({
    type: "init",
    wasmPath: "/mediapipe/wasm",
    modelPath: "/models/pose_landmarker_lite.task",
  });

  try {
    await ready;
    for (let index = 0; index < job.frames.length; index++) {
      const input = job.frames[index];
      if (!input) continue;
      if (status) status.textContent = `Processing ${job.id}: frame ${index + 1} of ${job.frames.length}`;
      const response = await fetch(input.url);
      if (!response.ok) throw new Error(`Could not load frame ${index + 1} for ${job.id}.`);
      const bitmap = await createImageBitmap(await response.blob());
      const reply = await new Promise<WorkerReply>((resolve, reject) => {
        pendingResult = resolve;
        rejectPending = reject;
        worker.postMessage({ type: "frame", bitmap, timestamp: input.timestamp }, [bitmap]);
      });
      if (reply.type !== "result") throw new Error("Pose worker returned an unexpected reply.");
      frames.push({ timestamp: reply.timestamp, landmarks: reply.landmarks });
    }

    const input: CountBenchmarkClip = {
      id: job.id,
      frames,
      annotation: job.annotation,
    };
    if (job.split !== "all" && job.annotation.split !== job.split) {
      throw new Error(`Clip ${job.id} is not in the requested ${job.split} split.`);
    }
    const report = evaluateCountBenchmark([input], job.thresholds, job.split);
    const clip = report.clips[0];
    if (!clip) throw new Error(`No benchmark report was produced for ${job.id}.`);
    return { frames, clip };
  } finally {
    worker.terminate();
  }
}
