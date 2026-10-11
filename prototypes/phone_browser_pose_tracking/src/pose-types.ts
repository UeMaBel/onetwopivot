export type Landmark = { x: number; y: number; z: number; visibility?: number };

export type PoseFrame = {
  timestamp: number;
  landmarks: Landmark[] | null;
};

export type WorkerReply =
  | { type: "ready" }
  | {
      type: "result";
      timestamp: number;
      inferenceMs: number;
      landmarks: Landmark[] | null;
    }
  | { type: "error"; message: string };
