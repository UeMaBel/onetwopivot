# 01: Extend jab detection to body jabs

**What to build:** A boxer can throw a jab and have it recorded as a head jab (`1`) or body jab (`1b`), with target handling visible in the prototype and available to labeled-sequence evaluation.

**Blocked by:** None (can start immediately).

**Status:** implemented

- [x] Recognized jabs use the established jab event boundary and preserve the anatomical arm and stance context captured when the action begins.
- [x] A pose-relative fist endpoint supports head-versus-body labeling; lowering the boxer’s height can support a body label but cannot determine it by itself.
- [x] A recognized jab with unclear target is labeled `1`; a movement whose punch type is unclear remains unclassified.
- [x] The live prototype and timestamped sequence evaluation expose the `1` and `1b` labels, and tests cover target ambiguity, knee bend, recovery, repeated jabs, and missing frames.
- [x] No contact, return to guard, fixed camera angle, or technique-quality score is required.
