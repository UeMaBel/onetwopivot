# 03: Evaluate detection on labeled pose data

**What to build:** The prototype can repeatedly replay labeled local pose sequences through the boxing detection flow and report how well jab and stance results match the annotations, making detector changes comparable over the same examples.

**Blocked by:** 02: Detect and display jab events.

**Status:** ready-for-agent

- [ ] A local, timestamped pose sequence can be replayed through the same boxing detection pipeline used by the live prototype.
- [ ] Annotations can describe expected stance and jab events, including event timing and anatomical arm where available.
- [ ] The evaluation reports missed and extra jab detections and classification coverage alongside correctness.
- [ ] Results are repeatable for the same input and detector configuration, so changes can be compared across runs.
- [ ] Evaluation data and results remain local to the prototype; the workflow does not upload pose data or raw video.
