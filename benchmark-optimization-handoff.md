# Detection Benchmark Optimization Handoff

This guide is for an agent improving boxing detection against the local video benchmark. Work in a measured loop: inspect the current detector, run labeled tuning clips, make one focused change, and compare the report. Keep the dataset and its split assignments intact.

## Current state (2026-10-11)

- The benchmark runner is `prototypes/phone_browser_pose_tracking/tools/benchmark.mjs`; the shared detection code is in `packages/boxing-detection`.
- Current observable detection capabilities are **stance** and **jab**. Confirm this from the current pipeline, contracts, detectors, and tests at the start of each task. Expand the optimization targets when the implementation gains another detectable action; do not assume this list stays current.
- The current local dataset has nine clips, all labeled `tuning`. Each sidecar expects five jabs (`1`) and five rear straights (`2`); four clips are orthodox and five are southpaw.
- The detector recognizes jabs. Rear-hand extensions are currently unclassified, so label `2`'s zero detections are outside the current detector's capability and are not a jab regression.
- The saved run `test_data/media/runs/benchmark-2026-10-11T18-05-41.083Z.json` used default thresholds on all nine clips: 24/45 jabs detected, 48 unclassified movements, and stance correct on 5/9 clips. This is a historical `all` split report, not a tuning-only baseline.
- The user will add validation clips. Do not relabel or move existing sidecars; use `tuning` to choose changes and reserve `validation` for a later check.

## Setup and run

From `prototypes/phone_browser_pose_tracking/`:

```sh
npm install
npm run assets
npm run install-benchmark-browser
npm run benchmark -- --dataset ../../test_data/media --split tuning
```

The benchmark decodes local videos with FFmpeg, runs MediaPipe pose inference in headless Chromium, and feeds timestamped pose frames through the shared boxing pipeline. Pose caches are written next to videos and reports are written under `test_data/media/runs/`. The workflow is local; it does not upload media or results.

Use the report path printed at the end of each run. A report includes the selected split, threshold values, model/version/hash, per-clip expected and detected action counts, per-clip stance result, unclassified count, cache status, and aggregate totals. The `--baseline` option reports changes in absolute count error, stance accuracy, and unclassified count.

## Optimization loop

1. **Discover the current target surface.** Read `prototypes/phone_browser_pose_tracking/README.md`, `specs/jab-detection.md`, `packages/boxing-detection/src/pipeline.ts`, the current detector and contracts, and `packages/boxing-detection/src/evaluate.ts`. Check which action labels the pipeline can actually emit and what each report field means. Keep this guide's target list in sync when capability changes.
2. **Establish a tuning baseline.** Run `--split tuning` with the current default thresholds and keep that report path. The historical `all` report is not a same-split comparator.
3. **Make one focused change.** For threshold-only experiments, copy `tools/thresholds/default.json` to a clearly named profile and change one or a small, related set of values. Keep the default profile unchanged. If the evidence points to detector logic instead, make a narrow code change in the shared detection package and rerun the same tuning set.
4. **Rerun the same tuning split.** Example with a profile and baseline:

   ```sh
   npm run benchmark -- --dataset ../../test_data/media --split tuning --thresholds tools/thresholds/jab-experiment.json --baseline ../../test_data/media/runs/<baseline-report>.json
   ```

   Replace `<baseline-report>` with the exact report filename. Use reports from the same split for comparisons. Pose frames are cached independently of detector thresholds, so threshold experiments should reuse the cache. Use `--refresh-poses` only when the source video, pose model/runtime, or frame-sampling policy needs to be reprocessed.

5. **Inspect the full report, not just the aggregate.** Compare jab count error for each clip and in aggregate; check stance correctness per clip and in aggregate; note unclassified movements. Look for regressions hidden by aggregate totals, including differences by stance. Keep each run's profile and report identifiable so results can be reproduced.
6. **Keep uncertainty honest.** Do not lower unclassified counts by assigning unsupported labels or weakening evidence until ambiguous motion is guessed. Unclassified movements are expected when the current detector sees a movement it cannot confidently call a jab; they are diagnostic context, not a score to minimize on their own.
7. **Stop tuning on tuning data when it improves the agreed target without an unacceptable regression.** Once validation sidecars exist, run the selected candidate on `--split validation` as a separate check. Do not use validation results to pick thresholds and do not move clips between splits to improve a result.

## What this benchmark can and cannot establish

- Sidecars provide whole-video action counts, not event timestamps. The benchmark can compare counts but cannot calculate event-level precision, recall, F1, timing accuracy, or determine which individual action was missed or double-counted.
- Stance annotations are per clip. The report counts the first detected stance for each clip and checks it against that clip's expected stance; it does not measure stance changes within a clip.
- Expected labels that the current pipeline cannot emit will appear as expected counts with zero detections. Treat these as unsupported targets, not evidence to tune unrelated thresholds. At present this applies to rear straight label `2`.
- The raw unclassified count is not a labeled false-positive/false-negative measure. Interpret it alongside per-clip action counts and the detector's supported behavior.
- Count agreement on this small set does not establish generalization. The user plans to supply held-out validation clips for that check.

## Dataset and local artifact rules

- Sidecars live beside their videos under `test_data/media/`; the filename base must match the video. Their `split` is `tuning` or `validation`, with whole-clip action counts and a stance label. See `test_data/media/README.md` for the schema and supported label vocabulary.
- Preserve the user's sidecar labels and split assignments. Do not edit annotations to fit detector output. If an annotation itself appears wrong, report the specific clip and ask the user to correct it.
- Media, sidecars, pose caches, and run reports are local ignored data. Do not add those generated/private artifacts to commits. Keep code and threshold-profile changes reviewable.
- Run `npm run benchmark -- --help` from the prototype directory for current options; follow the checked-in runner if its interface changes.

## Relevant references

- [Prototype and benchmark instructions](prototypes/phone_browser_pose_tracking/README.md#local-video-benchmark)
- [Jab detector specification](prototypes/phone_browser_pose_tracking/specs/jab-detection.md)
- [Media dataset schema](test_data/media/README.md)
- [Boxing action labels](prototypes/phone_browser_pose_tracking/BOXING_ACTIONS_CHEATSHEET.md)
- [Detector design handoff](detector-design-handoff.md)
- [Product glossary](GLOSSARY.md)
