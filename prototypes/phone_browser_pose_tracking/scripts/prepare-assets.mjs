import { cp, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageWasm = resolve(root, "node_modules/@mediapipe/tasks-vision/wasm");
const publicWasm = resolve(root, "public/mediapipe/wasm");
const packageBundle = resolve(root, "node_modules/@mediapipe/tasks-vision/vision_bundle.js");
const publicBundle = resolve(root, "public/mediapipe/vision_bundle.js");
const modelPath = resolve(root, "public/models/pose_landmarker_lite.task");
const modelUrl = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

try {
  await access(resolve(packageWasm, "vision_wasm_internal.js"), constants.R_OK);
} catch {
  throw new Error("MediaPipe is not installed yet. Run npm install in this directory, then npm run assets.");
}

await mkdir(dirname(publicWasm), { recursive: true });
await cp(packageWasm, publicWasm, { recursive: true, force: true });
await cp(packageBundle, publicBundle, { force: true });

try {
  await access(modelPath, constants.R_OK);
} catch {
  console.log("Downloading the bundled Pose Landmarker Lite model...");
  const response = await fetch(modelUrl);
  if (!response.ok) throw new Error(`Model download failed: ${response.status} ${response.statusText}`);
  await mkdir(dirname(modelPath), { recursive: true });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const { writeFile } = await import("node:fs/promises");
  await writeFile(modelPath, bytes);
  console.log(`Saved ${bytes.byteLength.toLocaleString()} bytes to public/models/pose_landmarker_lite.task`);
}
