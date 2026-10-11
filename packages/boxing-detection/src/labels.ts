export { boxingActionLabels } from "./action-labels.mjs";
export type { BoxingActionLabel } from "./action-labels.mjs";
import type { BoxingActionLabel } from "./action-labels.mjs";

export type PunchLabel = Extract<BoxingActionLabel, `${number}${"" | "b"}`>;
export type DefenseActionLabel = Exclude<BoxingActionLabel, PunchLabel>;
