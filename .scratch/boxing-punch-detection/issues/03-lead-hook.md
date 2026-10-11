# 03: Detect lead hooks

**What to build:** A boxer can throw a lead-hand hook and have it recognized as a head lead hook (`3`) or body lead hook (`3b`) in the prototype.

**Blocked by:** 01: Extend jab detection to body jabs.

**Status:** ready-for-agent

- [ ] The detector distinguishes a recognizable arcing hook path from a straight punch, uppercut, and unrelated arm extension.
- [ ] It resolves the lead hand from stance context, preserves anatomical arm identity, and captures stance context when the action begins.
- [ ] Pose-relative target evidence determines `3b`; body lowering may support that label but is not sufficient alone. An unclear target defaults to `3`.
- [ ] The event appears in the live prototype and timestamped sequence evaluation; tests cover orthodox and southpaw stances, both anatomical arms, target ambiguity, repeated actions, recovery, and missing frames.
- [ ] Contact, return to guard, fixed camera angle, combo labels, and technique-quality scoring are not required.
