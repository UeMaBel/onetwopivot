# 01: Expose stance and per-arm movement context

**What to build:** The live prototype derives boxing stance context and independent movement observations for both arms from timestamped pose frames, so the user can inspect the context that jab detection will rely on.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Timestamped pose frames flow through a small, typed, on-device boxing detection pipeline and are shared with the components that need them.
- [ ] Stance context reports the latest certain stance; when current stance is uncertain it retains the latest certain stance, and before any certain result it reports orthodox stance as an explicitly marked assumption.
- [ ] Stance context is captured when a punch movement begins, so later stance changes do not relabel that action.
- [ ] Left and right arm observations are tracked independently and include timestamps and basic movement evidence without owning punch phases or long action histories.
- [ ] Detector modules live under `src/detectors/boxing/`, separate from the existing boxing UI and check flow; no general-purpose detector registry is introduced.
- [ ] The live prototype makes current stance and arm observations inspectable, including whether stance was detected or assumed.
- [ ] Movement and stance thresholds remain adjustable for later tuning from phone observations.
