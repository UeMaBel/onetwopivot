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

## Status

The first browser implementation is in place. The live phone run remains to be done; its measurements will set the later acceptance thresholds.
