# Boxing Punch Detection

Specs for extending the on-device boxing detector from jabs to the remaining numbered punches and body-target labels.

## Punch-family specs

- [Jab detection](../../prototypes/phone_browser_pose_tracking/specs/jab-detection.md)
- [Rear straight detection](../../prototypes/phone_browser_pose_tracking/specs/rear-straight-detection.md)
- [Lead hook detection](../../prototypes/phone_browser_pose_tracking/specs/lead-hook-detection.md)
- [Rear hook detection](../../prototypes/phone_browser_pose_tracking/specs/rear-hook-detection.md)
- [Lead uppercut detection](../../prototypes/phone_browser_pose_tracking/specs/lead-uppercut-detection.md)
- [Rear uppercut detection](../../prototypes/phone_browser_pose_tracking/specs/rear-uppercut-detection.md)

The shared behavior is to preserve stance and anatomical-arm context, recognize each punch from its distinctive movement path, report recovery separately, and keep uncertain punch types unclassified. Body labels use pose-relative target evidence, with body lowering as supporting evidence; an unclear target defaults to the head label. No camera angle is required.
