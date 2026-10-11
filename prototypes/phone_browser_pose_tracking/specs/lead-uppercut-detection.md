# Lead Uppercut Detection Spec

## Problem Statement

The boxing detector does not identify lead-hand uppercuts. An upward lead-arm action is currently left unclassified or can be confused with a straight punch or hook.

## Solution

Recognize an uppercut thrown with the lead hand from timestamped pose frames. Emit label `5` for a head-target lead uppercut and `5b` for a body-target lead uppercut. Follow the shared event, stance, uncertainty, and evaluation behavior in [Jab Detection Spec](./jab-detection.md).

This spec detects actions. It does not score technique quality or assert that a punch landed.

## User Stories

1. As a boxer, I want a recognizable lead-hand uppercut detected as `5`, so that an uppercut is not confused with a straight punch or ignored.
2. As a southpaw or orthodox boxer, I want the lead uppercut associated with the correct anatomical arm using stance context.
3. As a boxer aiming a lead uppercut at the body, I want it labeled `5b` when body-target evidence supports that label.
4. As a boxer throwing a recognizable lead uppercut with an unclear target, I want the event labeled `5` rather than discarded.

## Detection Requirements

- A lead uppercut is an upward punch thrown with the lead hand. Its movement path must distinguish it from a straight punch or hook; extension alone is not enough to identify it.
- Resolve lead-hand role from the stance context captured when the action begins. Keep anatomical arm identity explicit and preserve whether stance was detected or assumed.
- Recognize the action once its movement is established, following the jab event boundary. Do not require contact or return to guard; track recovery separately.
- Emit `5b` when pose-relative evidence supports a body target. The fist endpoint relative to the boxer is primary evidence; lowering the body, such as bending the knees, may support the classification but cannot determine it alone.
- If the lead uppercut is recognized but its target is unclear, emit `5`. If the punch type itself is unclear, retain the movement as unclassified.
- A new event requires a distinct later uppercut action, not continued movement from the same uppercut.
- Keep numeric thresholds, confidence calibration, and tracking-gap limits open for observation and tuning.

## Evaluation

- Add timestamped pose-sequence cases for orthodox and southpaw lead hands, both anatomical arms, head and body labels, target ambiguity, straight and hook confusions, stance change during an action, recovery independent of detection, repeated actions, and missing frames.
- Measure event matching, classification coverage, and classification accuracy. Preserve unclassified movements rather than guessing the technique.
- Use whole-clip counts in the local video benchmark as supplementary evidence; do not infer event timing or precision from counts alone.

## Out of Scope

- Jab, rear straight, hooks, rear uppercut, combination, or defense labels.
- Contact, impact, speed, power, or technique-quality scoring.
- Exact movement thresholds or a calibrated confidence interpretation.
- A required camera angle.
