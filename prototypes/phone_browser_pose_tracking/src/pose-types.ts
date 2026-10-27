import type { Landmark } from "@onetwopivot/boxing-detection";

export type { Landmark, PoseFrame } from "@onetwopivot/boxing-detection";

export type WorkerReply =
  | { type: "ready" }
  | {
      type: "result";
      timestamp: number;
      inferenceMs: number;
      landmarks: Landmark[] | null;
      aspectRatio: number;
    }
  | { type: "error"; message: string };
