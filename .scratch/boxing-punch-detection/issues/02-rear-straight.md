# 02: Detect rear straights

**What to build:** A boxer can throw a rear-hand straight and have it recognized as a head rear straight (`2`) or body rear straight (`2b`) in the prototype.

**Blocked by:** 01: Extend jab detection to body jabs.

**Status:** implemented

- [x] The detector distinguishes a recognizable straight-punch path from a jab, hook, uppercut, and unrelated arm extension.
- [x] It resolves the rear hand from stance context, preserves anatomical arm identity, and captures stance context when the action begins.
- [x] Pose-relative target evidence determines `2b`; body lowering may support that label but is not sufficient alone. An unclear target defaults to `2`.
- [x] The event appears in the live prototype and timestamped sequence evaluation; tests cover orthodox and southpaw stances, both anatomical arms, target ambiguity, repeated actions, recovery, and missing frames.
- [x] Contact, return to guard, fixed camera angle, combo labels, and technique-quality scoring are not required.
