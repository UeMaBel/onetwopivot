import { boxingActionLabels } from "./action-labels.mjs";

const validActionLabels = new Set(boxingActionLabels);

export function parseVideoAnnotation(value, source = "annotation") {
  const fail = (message) => { throw new Error(`${source}: ${message}`); };
  if (!isRecord(value)) fail("expected a JSON object.");
  if (value.version !== 1) fail("version must be 1.");
  if (typeof value.video !== "string" || value.video.trim() === "") fail("video must be a non-empty path.");
  if (!["orthodox", "southpaw"].includes(value.stance)) fail('stance must be "orthodox" or "southpaw".');
  if (!["tuning", "validation"].includes(value.split)) fail('split must be "tuning" or "validation".');
  if (!isRecord(value.actions)) fail("actions must be a label-count object.");
  for (const [label, count] of Object.entries(value.actions)) {
    if (!validActionLabels.has(label)) fail(`unsupported action label "${label}".`);
    if (!Number.isInteger(count) || count < 0) fail(`count for "${label}" must be a non-negative integer.`);
  }
  if (!isRecord(value.metadata)) fail("metadata must be an object.");
  return value;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
