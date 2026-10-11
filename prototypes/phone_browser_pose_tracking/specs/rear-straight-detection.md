# Rear Straight Detection Spec

## Problem Statement

The boxing detector currently recognizes lead-hand jabs, but it does not identify rear-hand straight punches. A rear-hand extension therefore cannot be distinguished from other movements or counted under the project's `2` label.

## Solution

Recognize a straight punch thrown with the rear hand from timestamped pose frames. Emit label `2` for a head-target rear straight and `2b` for a body-target rear straight. Follow the shared event, stance, uncertainty, and evaluation behavior in [Jab Detection Spec](./jab-detection.md).

This spec detects actions. It does not score technique quality or assert that a punch landed.

## User Stories

1. As a boxer, I want a recognizable rear-hand straight detected as `2`, so that it is not left unclassified as a rear-arm extension.
2. As a southpaw or orthodox boxer, I want the rear straight associated with the correct anatomical arm using stance context.
3. As a boxer aiming a rear straight at the body, I want it labeled `2b` when body-target evidence supports that label.
4. As a boxer throwing a recognizable rear straight with an unclear target, I want the event labeled `2` rather than discarded.

## Detection Requirements

- A rear straight is a straight punch thrown with the rear hand. In this project, it is often called a cross, but **straight** is the preferred term.
- The event must be based on a recognizable straight-punch movement path. Arm extension alone is not enough to distinguish it from a jab, hook, uppercut, or unrelated extension.
- Resolve rear-hand role from the stance context captured when the action begins. Keep anatomical arm identity explicit and preserve whether stance was detected or assumed.
- Recognize the action once its movement is established, following the jab event boundary. Do not require contact or return to guard; track recovery separately.
- Emit `2b` when pose-relative evidence supports a body target. The fist endpoint relative to the boxer is primary evidence; lowering the body, such as bending the knees, may support the classification but cannot determine it alone.
- If the rear straight is recognized but its target is unclear, emit `2`. If the punch type itself is unclear, retain the movement as unclassified.
- A new event requires a distinct later straight-punch action, not continued extension of the same arm.
- Keep numeric thresholds, confidence calibration, and tracking-gap limits open for observation and tuning.

## Evaluation

- Add timestamped pose-sequence cases for orthodox and southpaw rear hands, both anatomical arms, head and body labels, target ambiguity, an extension that is not a straight, stance change during an action, recovery independent of detection, repeated actions, and missing frames.
- Measure event matching, classification coverage, and classification accuracy. Preserve unclassified movements rather than guessing the technique.
- Use whole-clip counts in the local video benchmark as supplementary evidence; do not infer event timing or precision from counts alone.

## Out of Scope

- Jab, hook, uppercut, combination, or defense labels.
- Contact, impact, speed, power, or technique-quality scoring.
- Exact movement thresholds or a calibrated confidence interpretation.
- A required camera angle.
