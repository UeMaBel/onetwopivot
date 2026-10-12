# Detection Benchmark Optimization Handoff

Use this guide to improve boxing detection against the local video benchmark. Work in a measured loop: inspect the current detector, run labeled tuning clips, make one focused change, then compare reports. Preserve the dataset and its split assignments.

## Current state (checked 2026-10-12)

- The benchmark runner is `prototypes/phone_browser_pose_tracking/tools/benchmark.mjs`; shared detection logic is in `packages/boxing-detection`.
- The pipeline currently detects stance and all six basic punch types: jab (`1`), rear straight (`2`), lead/rear hook (`3`/`4`), and lead/rear uppercut (`5`/`6`). It can also label body-target variants (`1b`–`6b`). Confirm emitted labels from the current pipeline and detector code at the start of each task; keep this handoff in sync as implementation changes.
- The local dataset has nine `tuning` clips and seven `validation` clips. All 16 videos annotate only jabs (`1`) and rear straights (`2`), with five of each per clip. Tuning includes four orthodox and five southpaw stances; validation has four orthodox and three southpaw clips.
- For the current videos, optimize jab, rear straight, and stance performance. Hooks, uppercuts, and body-target classification have no labeled examples here, so this benchmark cannot establish whether those detections improve. Add labeled media before optimizing those categories against video.
- Existing reports are historical snapshots, not necessarily baselines for later code changes. At handoff update time, the latest tuning report was `test_data/media/runs/benchmark-2026-10-11T18-59-51.971Z.json` (default profile: 35/45 jabs, 0/45 rear straights, stance 5/9). The available validation report was `test_data/media/runs/benchmark-2026-10-11T18-52-54.304Z.json` (`validation-candidate`: 25/35 jabs, 0/35 rear straights, stance 4/7). Establish a fresh baseline for the current code and profile before comparing iterations.
- Preserve existing sidecar labels and splits. Use `tuning` to choose changes. Keep `validation` held out until a candidate is selected, then run it as a separate check; do not tune against validation results.

## Setup and run

From `prototypes/phone_browser_pose_tracking/`:

```sh
npm install
npm run assets
npm run install-benchmark-browser
npm run benchmark -- --dataset ../../test_data/media --split tuning
```

The benchmark decodes local videos with FFmpeg, runs MediaPipe pose inference in headless Chromium, and feeds timestamped pose frames through the shared boxing pipeline. Pose caches are written next to videos and reports go under `test_data/media/runs/`. Media and results remain local.

Use the report path printed at the end of each run. Reports include the split, threshold values, pose model/version/hash, per-clip expected and detected action counts, per-clip stance results, unclassified counts, cache status, and aggregate totals. `--baseline` compares absolute action count error, stance accuracy, and unclassified count.

## Optimization loop

1. **Discover detector and dataset coverage.** Read the prototype README, relevant detection specs, `packages/boxing-detection/src/pipeline.ts`, detector code, contracts, and `packages/boxing-detection/src/evaluate.ts`. Check which labels the pipeline can emit, which labels have examples in the selected media split, and what report fields mean. Refresh this handoff's capability and dataset summary if either changed.
2. **Establish a tuning baseline.** Run `--split tuning` with current default thresholds and keep the report path. Do not use an `all` report as a same-split comparator.
3. **Make one focused change.** For threshold-only experiments, copy `tools/thresholds/default.json` to a clearly named profile and change one value or a small related set. Keep the default unchanged. If evidence points to detector logic, make a narrow change in the shared detection package and rerun the same tuning set.
4. **Rerun the same tuning split.** Example:

   ```sh
   npm run benchmark -- --dataset ../../test_data/media --split tuning --thresholds tools/thresholds/jab-experiment.json --baseline ../../test_data/media/runs/<baseline-report>.json
   ```

   Replace `<baseline-report>` with the exact report filename. Compare reports from the same split. Pose frames are cached independently of detector thresholds, so threshold experiments should reuse them. Use `--refresh-poses` only when the video, pose model/runtime, or frame-sampling policy needs reprocessing.

5. **Inspect per-clip and aggregate results.** Compare count error for each annotated and supported label (`1` and `2`) and stance correctness. Check for regressions hidden by aggregate totals, including differences by stance. Keep profiles and report paths identifiable so results can be reproduced.
6. **Keep uncertainty honest.** Do not lower unclassified counts by assigning unsupported labels or weakening evidence until ambiguous motion is guessed. Treat unclassified counts as diagnostic context, not a score to minimize on its own.
7. **Select using tuning, then validate once.** Choose a candidate based on tuning results and any agreed regression limits. Run that candidate on `--split validation` as a separate check. Do not use validation results to choose thresholds or make further tuning changes; do not move clips between splits.

## What this benchmark can and cannot establish

- Sidecars provide whole-video action counts, not event timestamps. This benchmark compares counts; it cannot calculate event-level precision, recall, F1, timing accuracy, or identify which individual action was missed or double-counted.
- Stance annotations are per clip. The report checks the first detected stance against the expected stance; it does not measure stance changes within a clip.
- The current videos cover only labels `1` and `2`. Although the detector implements hooks, uppercuts, and body-target variants, these videos provide no labeled examples for `3`–`6` or `1b`–`6b`.
- An expected label with zero detections may indicate a detector failure even when the implementation has that capability. Check the current implementation before deciding a label is unsupported; do not tune unrelated thresholds based on labels the pipeline cannot emit.
- The raw unclassified count is not a labeled false-positive/false-negative measure. Interpret it alongside per-clip counts and the detector's supported behavior.
- Count agreement on these short clips does not establish event-level correctness or generalization. The seven validation clips provide a held-out count check for labels `1` and `2` and stance, but not for other punch categories.

## Dataset and local artifact rules

- Sidecars live beside their videos under `test_data/media/`; the base filename must match the video. Each sidecar gives a stance, `tuning` or `validation` split, and whole-clip action counts. See `test_data/media/README.md` for the schema and action vocabulary.
- Preserve sidecar labels and split assignments. Do not edit annotations to fit detector output. If an annotation appears wrong, identify the clip and ask the user to correct it.
- Media, sidecars, pose caches, and run reports are local ignored data. Do not add these generated/private artifacts to commits. Keep code and threshold-profile changes reviewable.
- Run `npm run benchmark -- --help` from the prototype directory for current options; follow the checked-in runner if its interface changes.

## Relevant references

- [Prototype and benchmark instructions](prototypes/phone_browser_pose_tracking/README.md#local-video-benchmark)
- [Jab detection specification](prototypes/phone_browser_pose_tracking/specs/jab-detection.md)
- [Media dataset schema](test_data/media/README.md)
- [Boxing action labels](prototypes/phone_browser_pose_tracking/BOXING_ACTIONS_CHEATSHEET.md)
- [Detector design handoff](detector-design-handoff.md)
- [Product glossary](GLOSSARY.md)
