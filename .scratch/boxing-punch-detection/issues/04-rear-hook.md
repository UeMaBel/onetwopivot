# 04: Detect rear hooks

**What to build:** A boxer can throw a rear-hand hook and have it recognized as a head rear hook (`4`) or body rear hook (`4b`) in the prototype.

**Blocked by:** 01: Extend jab detection to body jabs.

**Status:** implemented

- [x] The detector distinguishes a recognizable arcing hook path from a straight punch, uppercut, and unrelated arm extension.
- [x] It resolves the rear hand from stance context, preserves anatomical arm identity, and captures stance context when the action begins.
- [x] Pose-relative target evidence determines `4b`; body lowering may support that label but is not sufficient alone. An unclear target defaults to `4`.
- [x] The event appears in the live prototype and timestamped sequence evaluation; tests cover orthodox and southpaw stances, both anatomical arms, target ambiguity, repeated actions, recovery, and missing frames.
- [x] Contact, return to guard, fixed camera angle, combo labels, and technique-quality scoring are not required.
