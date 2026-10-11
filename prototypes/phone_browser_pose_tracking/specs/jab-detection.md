# Jab Detection Spec

## Problem Statement

The phone browser prototype currently detects and displays a pose, but it does not identify boxing actions. A person performing a jab drill therefore gets no reliable record of which jabs occurred, which arm moved, or how the arm recovered. This blocks later drill feedback and movement analysis.

## Solution

Add an on-device, boxing-specific detection pipeline that consumes timestamped pose frames and stance context. It should recognize lead-hand straight-punch actions as jabs, preserve uncertainty instead of forcing classifications, and report recovery separately from whether a jab occurred.

The first version detects actions; it does not score jab quality or assert that a punch landed.

## User Stories

1. As a person shadowboxing or hitting a heavy bag, I want a recognizable lead-hand straight punch detected as a jab, so that my movement can be analyzed later.
2. As a boxer with imperfect form, I want a sloppy but recognizable jab detected, so that mistakes do not disappear from later analysis.
3. As a boxer, I want a jab detected without requiring a return to guard, so that a punch followed by a slow or absent recovery is still recorded.
4. As a boxer, I want recovery observed separately from the jab, so that a poor recovery can be analyzed without changing whether the jab happened.
5. As a boxer throwing repeated jabs, I want each distinct forward action treated as a separate jab, so that one extended arm is not counted repeatedly.
6. As a boxer, I want each detected action associated with the anatomical arm that moved, so that left and right arm evidence remains unambiguous when my stance changes.
7. As a boxer changing stance, I want the stance context captured when a punch begins, so that a stance change during the punch does not relabel that action.
8. As a boxer whose stance is temporarily hard to classify, I want the latest certain stance retained, so that close-range or occluded frames do not erase useful context.
9. As a boxer whose stance has never been classified, I want the prototype to use orthodox stance as an explicitly marked assumption, so that the action can still be analyzed without presenting the assumption as observed fact.
10. As a boxer, I want both arms observed independently, so that one arm's movement does not hide the other arm's movement.
11. As a reviewer of detection results, I want a confidence estimate and supporting movement evidence, so that I can distinguish strong classifications from uncertain ones.
12. As a boxer making a movement that cannot yet be confidently classified, I want that movement retained as unclassified, so that the detector does not silently discard evidence or guess a technique.
13. As a product owner, I want classification coverage measured alongside correctness, so that reducing the number of unclassified movements does not reward inaccurate guesses.
14. As a prototype operator, I want movement and stance thresholds left adjustable until phone observations are available, so that values reflect real tracking continuity and responsiveness.
15. As a person using the prototype, I want pose and detection data to stay on-device and transient, so that the prototype does not record or upload my movement.

## Implementation Decisions

- Keep detection on-device and specific to boxing while the first techniques are explored.
- Use a small boxing pipeline with typed contracts. It receives timestamped pose frames and shares each frame with the components that need it; do not add a general-purpose detector registry.
- Include a stance detector and a shared per-arm observation component. The arm component supplies timestamped evidence and basic movement between frames; it does not own punch phases or long action histories.
- Let named technique detectors interpret shared arm evidence. Implement jab detection first. In project terminology, a jab is a lead-hand straight punch. The term "straight" refers to the rear-hand straight, often called a cross.
- Keep left/right anatomical arm identity separate from lead/rear role. Capture the stance context at the beginning of a punch movement and preserve whether that context was detected or assumed.
- When current stance is uncertain, use the latest certain stance. If none has ever been certain, use orthodox stance as an explicitly marked fallback.
- Recognize a jab once extension is established. Do not require contact, a particular target, or return to guard. Observe recovery independently; recovery quality does not determine whether the jab occurred.
- A distinct later jab requires a new forward action after movement away from the previous extension. Exact separation thresholds remain open.
- Include a confidence estimate and supporting evidence with classifications. Confidence meaning, calibration, and exact result fields remain open.
- Preserve ambiguous movements as unclassified. Evaluate classification coverage together with correctness.
- If latency measurements require it, the stance detector may process frames less often; make that decision from prototype measurements.

## Testing Decisions

- Use one black-box test seam at the boxing detection pipeline: feed timestamped pose-frame sequences and stance context, then assert the results exposed by the pipeline. Keep arm geometry calculations and detector state private to the tests.
- Test externally visible behavior for lead-hand jab recognition, anatomical arm identity, detected versus assumed stance context, stance changes during an action, recovery independent of jab detection, repeated forward actions, poor but recognizable form, unclassified movement, and tolerated missing frames.
- Include cases where stance is uncertain after a certain stance and where no certain stance has ever been observed.
- A good test asserts the action and evidence the caller receives; it does not assert private angles, helper calls, or implementation-specific state transitions.
- The current prototype has no test runner, test script, or existing detector tests. Establish the smallest test setup needed for the pipeline seam; there is no prior detector-test pattern to follow.

## Out of Scope

- Jab quality scoring, speed or power scoring, coaching feedback, and scorecards.
- Contact or impact detection for a heavy bag or another target.
- Head-versus-body target classification.
- Rear-hand straight, hook, combo, or defense detection, including guard drops, slips, and parries.
- Exact movement thresholds, confidence calibration, stance sampling rate, and tracking-gap duration before prototype observations.
- Recording or uploading raw video, pose frames, or detection results.
- Changes to backend APIs, drill definitions, rankings, or production application architecture.

## Further Notes

- Use the project glossary terms for jab, straight, lead hand, and rear hand. The project uses "straight" for the rear-hand straight to avoid ambiguity with the jab.
- Existing pose output already carries a timestamp and either landmarks or no detected person. The detection pipeline should operate on that pose-level boundary rather than camera frames or MediaPipe internals.
- The root detector-design handoff records the conversation's broader design decisions. This spec narrows those decisions to the first implementable detector in the current prototype.
