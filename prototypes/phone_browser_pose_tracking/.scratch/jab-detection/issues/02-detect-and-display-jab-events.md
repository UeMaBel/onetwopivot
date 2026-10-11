# 02: Detect and display jab events

**What to build:** A person shadowboxing or hitting a heavy bag sees each recognizable lead-hand straight action reported as a jab, with its arm and stance context, while recovery and uncertainty remain visible as separate information.

**Blocked by:** 01: Expose stance and per-arm movement context.

**Status:** ready-for-agent

- [ ] A jab is reported once lead-hand extension is established; contact, a target, and return to guard are not required.
- [ ] A sloppy but recognizable jab is still reported. Ambiguous movement remains unclassified rather than being forced into a technique label.
- [ ] Each event identifies the anatomical arm and the stance context captured at movement start, including whether that stance was detected or assumed.
- [ ] Each classification includes a confidence estimate and supporting movement evidence.
- [ ] Recovery is reported separately and does not determine whether the jab occurred; missing or poor recovery does not erase a jab.
- [ ] A later jab requires a distinct new forward action, rather than repeated reports while the arm remains extended.
- [ ] The running prototype exposes detected jab events so they can be reviewed during a live session.
- [ ] A black-box test seam at the boxing detection pipeline accepts timestamped pose-frame sequences and verifies externally visible jab results, stance context, arm identity, recovery, repeated actions, ambiguous movement, and tolerated missing frames.
