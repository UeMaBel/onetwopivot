# Local video benchmark data

Put local boxing videos and their JSON sidecar annotations in this folder. This folder is ignored by Git so videos, annotations, pose caches, and generated reports stay local. This README is tracked as a guide.

## Sidecar JSON

Create one `.json` file for each video. The JSON filename must have the same base name as its video:

```text
5_1_5_2.mp4
5_1_5_2.json
```

Use this structure:

```json
{
  "version": 1,
  "video": "5_1_5_2.mp4",
  "stance": "orthodox",
  "split": "tuning",
  "actions": {
    "1": 5,
    "2": 5
  },
  "metadata": {}
}
```

- `version` is currently `1`.
- `video` is the video path relative to the JSON sidecar. Keep it inside this media folder.
- `stance` is `orthodox` or `southpaw`.
- `split` is `tuning` or `validation`. Tune parameters with `tuning` clips; reserve `validation` clips to check the result afterward.
- `actions` maps action labels to the number performed in the entire video. Counts are non-negative integers. You do not need to timestamp each action.
- `metadata` is an object reserved for optional future information; leave it as `{}` for now.

## Action labels

Punch numbers follow this project's convention. Add `b` to the number for a body punch.

| Label | Action |
| --- | --- |
| `1` | Jab |
| `2` | Rear straight |
| `3` | Lead hook |
| `4` | Rear hook |
| `5` | Lead uppercut |
| `6` | Rear uppercut |
| `1b`–`6b` | The corresponding punch aimed at the body |
| `lead_slip` | Slip toward the lead side |
| `rear_slip` | Slip toward the rear side |
| `lead_roll` | Roll toward the lead side |
| `rear_roll` | Roll toward the rear side |

Pivots are not currently supported. For the full label list and explanations, see the [boxing action cheatsheet](../../prototypes/phone_browser_pose_tracking/BOXING_ACTIONS_CHEATSHEET.md) and [project glossary](../../GLOSSARY.md).

## Run the benchmark

From `prototypes/phone_browser_pose_tracking/`, run:

```sh
npm run benchmark -- --dataset ../../test_data/media
```

Reports go into `runs/` under the dataset directory. Pose caches are saved next to each video and reused when the video, model, and runtime match. Use `--refresh-poses` to regenerate them. See the [benchmark instructions](../../prototypes/phone_browser_pose_tracking/README.md#local-video-benchmark) for setup, threshold profiles, and split options.
