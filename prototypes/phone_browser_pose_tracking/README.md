# Phone browser pose tracking prototype

## Purpose

Evaluate live pose tracking and visual responsiveness on a Samsung Galaxy S22 Ultra in Chrome before choosing V0 tracking thresholds. This is an isolated experiment, not the product training flow.

## Agreed experiment

- Use the phone's selfie camera in portrait orientation; the person faces the phone.
- Keep browser camera access behind a small `CameraSource` boundary with start/stop operations.
- Show a live skeleton and whether a pose is currently tracked. Do not score punches.
- Run MediaPipe Pose Landmarker Lite in a classic web worker. Load the library's browser bundle and WASM runtime as local scripts so Vite does not try to transform files in `public/`. Keep the model variant and asset path configurable so a later comparison with Full is straightforward.
- Load the browser app over a local secure origin using Chrome USB debugging and port forwarding.
- Test: hold a boxing guard for 10 seconds, throw 10 lead-hand jabs, then return to guard.
- Show tracking and performance measurements for review. Camera frames and pose results are transient and remain on the device; do not record or upload them.
- Use the first run to establish observed tracking continuity and responsiveness, then set numeric acceptance thresholds.

The screen reports the share of processed frames where a person was detected, average inference time, result update rate, and count of processed frames without a detected person. Also note perceived overlay lag during the jabs; these measurements do not directly measure camera-to-overlay latency. Camera measurements remain in memory and reset when the camera session starts. The movement check reports person detections only for frames processed while that check is active.

## Privacy note

The user approved proceeding with MediaPipe after being informed that the current `@mediapipe/tasks-vision` package notice says MediaPipe Tasks sends API performance and utilization metrics to Google. It says input data is processed on-device and is not sent to Google. The prototype UI will disclose the SDK metrics. See the [package privacy notice](https://www.npmjs.com/package/@mediapipe/tasks-vision).

## Vite worker loading

Keep the pose worker classic and load `vision_bundle.js` with `importScripts`. A module worker falls back to a dynamic import for the WASM loader, which makes Vite try to transform a script from `public/` and fail in development.

## Browser camera access

Camera access requires a secure context and permission. Do not open the development server through the computer's plain HTTP LAN address. Use Chrome DevTools port forwarding over USB so the phone opens the development server as `localhost`.

1. Enable USB debugging on the phone and connect it to the development computer.
2. Start the development server with the host bound to the local network interface.
3. In desktop Chrome, open `chrome://inspect/#devices`, inspect the connected phone, and configure port forwarding for the development server port to the same local port.
4. On the phone, open `http://localhost:<port>` and grant camera permission.

See [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) and [Chrome Android port forwarding](https://developer.chrome.com/docs/devtools/remote-debugging/local-server/).

## Run it

From this directory, install dependencies and start the Vite server:

```sh
npm install
npm run dev
```

Run the linter from this directory with:

```sh
npm run lint
```

This uses the prototype's locally installed Biome version and checks files in `src/`.

The `predev` step copies MediaPipe's browser bundle and WASM runtime into the app and downloads the Lite model to `public/models/` if it is missing. These files are served locally after setup. Open the forwarded `localhost:5173` address on the phone.

To switch variants later, add the corresponding model asset and update `poseModel` in `src/config.ts`; the model selection is kept out of the camera and overlay code.

## Boxing detection

The on-device boxing pipeline consumes timestamped pose frames shared from the live pose worker. It exposes stance context, separate left and right arm observations, events for jabs (`1`), rear straights (`2`), hooks (`3`, `4`), and uppercuts (`5`, `6`), plus body-target variants (`1b`–`6b`), unclassified movements, and recovery updates. Thresholds are collected in the shared `packages/boxing-detection` package and can also be adjusted in the live detection panel. These values are provisional until they are tuned from phone observations.

Punch type follows the wrist path: forward movement identifies a jab or rear straight, a lateral arc identifies a hook, and upward movement identifies an uppercut. Motion is calculated per second from frame timestamps, and movement paths integrate velocity over elapsed time. The worker also sends the video aspect ratio so 2D arm distances use corrected coordinates; relative depth remains a separate path feature. For V1, face the camera square on and punch toward it, since camera-relative depth is the forward direction. The anatomical arm is mapped to lead or rear using the stance captured when movement begins. The wrist endpoint relative to the shoulders and hips supports head-versus-body labels; lowering the body alone does not produce a body label, and an unclear target defaults to the head. Unclear punch paths remain unclassified. When the arm bends below the extension threshold, the event is marked retracted; this does not confirm return to guard. Loss of tracking marks recovery incomplete without removing the event. The confidence value is a provisional heuristic, not a calibrated probability.

## Labeled sequence evaluation

Use **Evaluate labeled pose sequences** below the live detection panel to replay a local JSON file through the same `BoxingDetectionPipeline`. Nothing is uploaded. The file shape is:

```json
{
  "sequences": [
    {
      "id": "jab-01",
      "frames": [
        { "timestamp": 0, "landmarks": null },
        { "timestamp": 100, "landmarks": [{ "x": 0.4, "y": 0.3, "z": 0, "visibility": 1 }] }
      ]
    }
  ],
  "annotations": [
    {
      "sequenceId": "jab-01",
      "stances": [{ "timestamp": 0, "stance": "orthodox" }],
      "actions": [{ "timestamp": 100, "arm": "left", "label": "1" }],
      "movements": [
        { "timestamp": 100, "arm": "left", "expected": "1" },
        { "timestamp": 500, "arm": "right", "expected": "unclassified" }
      ]
    }
  ]
}
```

Each non-null `landmarks` array uses MediaPipe's landmark order and should contain the full 33-point pose. `stances` is optional; its timestamped samples are scored independently of action matches. A single `stance` field can describe one stance sample at the sequence start. `actions` lists punch labels with event time in milliseconds and anatomical arm; legacy `jabs` annotations remain supported. `movements` describes the candidates used for classification coverage and accuracy; if omitted, the action annotations supply that set. The report includes per-label action matches and missed or extra actions, movement classification coverage and accuracy, and stance accuracy. `timingToleranceMs` defaults to 250 in the evaluator API.

The one-point landmark array in the abbreviated JSON example illustrates the object shape only; real input frames need all 33 landmarks.

Run `npm test` for the black-box pipeline and evaluator tests, `npm run lint` for linting, and `npm run build` for type checking and a production build.

## Local video benchmark

The benchmark processes local videos through the same MediaPipe pose worker and shared boxing detector used by the prototype. Video frames are decoded locally, pose results are cached next to the source video, and each run writes a JSON report under `test_data/media/runs/`. Nothing is uploaded.

1. Install the prototype dependencies, prepare its local MediaPipe assets, and install the benchmark browser once:

   ```sh
   npm install
   npm run assets
   npm run install-benchmark-browser
   ```

2. Put each video and same-base-name JSON sidecar in a directory under the repository's ignored `test_data/media/` folder. For example, `test_data/media/round-01.mp4` uses `test_data/media/round-01.json`:

   ```json
   {
     "version": 1,
     "video": "round-01.mp4",
     "stance": "orthodox",
     "split": "tuning",
     "actions": { "1": 5, "2": 5 },
     "metadata": {}
   }
   ```

   Counts describe the whole clip; timestamp labels are not needed. The `metadata` object is reserved for future use. Use `tuning` clips while adjusting thresholds and keep `validation` clips untouched for a separate check. See the [boxing action cheatsheet](BOXING_ACTIONS_CHEATSHEET.md) for labels.

3. Run the benchmark from this directory:

   ```sh
   npm run benchmark -- --dataset ../../test_data/media
   ```

   Optionally use `--split tuning` or `--split validation`, `--thresholds tools/thresholds/default.json`, `--baseline path/to/report.json`, or `--refresh-poses`. Threshold profiles have `version: 1`, a `name`, and a `thresholds` object containing every field from `defaultBoxingThresholds`; copy the included default profile to make a named variant. Reports show expected/detected counts and their difference per label, unclassified detections, stance results, and cache use. They compare total counts, not individual punch timing or precision/recall.

The benchmark requires the bundled FFmpeg development dependency and headless Chromium (installed by the setup command). The `test` command remains a fast, media-free automated suite; the benchmark command is the explicit local video run. The detector core lives in `packages/boxing-detection` so the main application can consume it without importing the prototype runner.

## Status

The browser detection and local evaluation workflows are implemented. The live phone run remains to be done; its measurements will guide threshold tuning and validation against labeled movement data.
