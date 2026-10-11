# Detector Design Handoff

This note records the agreed direction for starting boxing movement detection. It is separate from the project architecture specification; it is not an implementation plan or a set of finalized detection thresholds.

## Scope

- Start with jab detection in the boxing domain. Keep the work specific to boxing while the first detectors are explored.
- Keep detection on-device with the pose data, consistent with the V0 direction.
- Defense detection and contact detection are later work.

## Shared detection structure

- A small boxing pipeline receives timestamped pose frames and dispatches the same frame to the components that need it. Use typed contracts, but do not introduce a generic registry or broad detector framework yet.
- A stance detector provides the latest certain stance. If the current stance is uncertain, use the latest certain stance; if none has ever been certain, use orthodox as an explicitly assumed fallback. Capture the stance context when a punch movement begins.
- A shared per-arm observation component provides timestamped arm evidence and basic movement between frames. It is not a punch detector and does not own technique-specific phases or long action histories.
- Named technique detectors interpret that shared evidence. The initial detector is for the jab. In project terminology, `straight` means the rear-hand straight, often called a cross; see [GLOSSARY.md](./GLOSSARY.md).

## Jab behavior agreed so far

- A jab is a lead-hand straight punch. Detect the action from movement; do not require contact, a particular target, or a return to guard.
- Recognize the jab once extension is established. Observe recovery separately; poor recovery does not erase the jab.
- A sloppy but recognizable jab still counts as a jab. Keep movement that cannot be confidently classified as a technique unclassified rather than forcing a label.
- Keep the physical arm side explicit and preserve whether stance context was detected or assumed.
- Distinct jabs require distinct forward actions. Exact separation thresholds remain open.

## Deferred details

- Numeric movement, confidence, and tracking-gap thresholds should follow prototype observations.
- Include a confidence estimate with detector results; its meaning, calibration, and threshold remain to be designed with the detector implementation. Exact event fields also remain open.
- If latency requires it, the stance detector may process frames less often; decide from measurements.
- Measure classification coverage together with correctness. Do not optimize for fewer unclassified movements by guessing.
- Contact is not part of the jab result. If it becomes useful, choose a real evidence source and model contact as separate evidence linked to a punch by arm and time.

