export const boxingActionLabels: readonly [
  "1", "2", "3", "4", "5", "6",
  "1b", "2b", "3b", "4b", "5b", "6b",
  "lead_slip", "rear_slip", "lead_roll", "rear_roll",
];
export type BoxingActionLabel = (typeof boxingActionLabels)[number];
