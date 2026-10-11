import type { PunchEvent } from "@onetwopivot/boxing-detection";

export function formatPunchEventLabel(event: Pick<PunchEvent, "label" | "type" | "arm">) {
  return `${event.label} · ${event.type} · ${event.arm} arm`;
}
