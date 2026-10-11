export type Landmark = { x: number; y: number; z: number; visibility?: number };

export type PoseFrame = {
  timestamp: number;
  landmarks: Landmark[] | null;
};
