import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "vite";
import { chromium } from "playwright";
import ffmpegPath from "ffmpeg-static";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parseVideoAnnotation } from "../../../packages/boxing-detection/src/annotation-schema.mjs";

const prototypeRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repositoryRoot = resolve(prototypeRoot, "../..");
const defaultModelPath = resolve(prototypeRoot, "public/models/pose_landmarker_lite.task");
const visionPackage = JSON.parse(await readFile(resolve(prototypeRoot, "node_modules/@mediapipe/tasks-vision/package.json"), "utf8"));
const samplingPolicy = "every-decoded-frame";
const labelNames = {
  "1": "Jab", "2": "Straight", "3": "Lead hook", "4": "Rear hook",
  "5": "Lead uppercut", "6": "Rear uppercut", "1b": "Body jab",
  "2b": "Body straight", "3b": "Lead body hook", "4b": "Rear body hook",
  "5b": "Lead body uppercut", "6b": "Rear body uppercut",
  lead_slip: "Lead slip", rear_slip: "Rear slip", lead_roll: "Lead roll", rear_roll: "Rear roll",
};

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}
if (!options.dataset) throw new Error("Pass --dataset <directory>. Run with --help for usage.");
if (!ffmpegPath) throw new Error("FFmpeg is unavailable for this platform.");

const datasetRoot = await realpath(resolve(options.dataset));
const clips = await loadDataset(datasetRoot);
if (clips.length === 0) throw new Error(`No video JSON sidecars found in ${datasetRoot}.`);
const selectedClips = clips.filter((clip) => options.split === "all" || clip.annotation.split === options.split);
if (selectedClips.length === 0) throw new Error(`No clips found in the ${options.split} split.`);

let thresholds = options.thresholds ? await loadThresholdProfile(options.thresholds) : null;
const modelHash = await sha256File(defaultModelPath);
const tempRoot = await mkdtemp(resolve(tmpdir(), "onetwopivot-benchmark-"));
const framePathsByKey = new Map();
let vite;
let browser;

try {
  const jobs = [];
  for (const clip of selectedClips) {
    const cache = await loadPoseCache(clip, modelHash, options.refreshPoses);
    if (cache) {
      jobs.push({ ...clip, frames: cache.frames, cacheStatus: "reused" });
      continue;
    }

    const decoded = await decodeFrames(clip.videoPath, resolve(tempRoot, randomUUID()));
    const frames = decoded.timestamps.map((timestamp, index) => {
      const framePath = decoded.framePaths[index];
      if (!framePath) throw new Error(`Missing decoded frame ${index} for ${clip.id}.`);
      const key = randomUUID();
      framePathsByKey.set(key, framePath);
      return { url: `/__benchmark_frames/${key}`, timestamp };
    });
    jobs.push({ ...clip, frames, cacheStatus: "generated" });
  }

  vite = await createServer({
    configFile: false,
    root: prototypeRoot,
    resolve: { alias: { "@onetwopivot/boxing-detection": resolve(repositoryRoot, "packages/boxing-detection/src/index.ts") } },
    server: { host: "127.0.0.1", port: 0, strictPort: false, fs: { allow: [repositoryRoot] } },
    logLevel: "error",
  });
  await vite.listen();
  const baseUrl = vite.resolvedUrls?.local[0];
  if (!baseUrl) throw new Error("Vite did not expose a local benchmark URL.");

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route("**/__benchmark_frames/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1);
    const framePath = key ? framePathsByKey.get(key) : undefined;
    if (!framePath) {
      await route.fulfill({ status: 404, body: "Unknown local benchmark frame." });
      return;
    }
    await route.fulfill({ status: 200, contentType: "image/png", body: await readFile(framePath) });
  });
  await page.goto(new URL("benchmark.html", baseUrl).href);
  await page.waitForFunction(() => window.benchmarkReady === true);
  thresholds ??= { name: "default", values: await page.evaluate(() => window.getDefaultThresholds()) };

  const clipReports = [];
  for (const job of jobs) {
    let poseFrames;
    if (job.cacheStatus === "reused") {
      poseFrames = job.frames;
    } else {
      const result = await page.evaluate((input) => window.processBenchmarkClip(input), {
        id: job.id,
        frames: job.frames,
        annotation: job.annotation,
        thresholds: thresholds.values,
        split: options.split,
      });
      poseFrames = result.frames;
      await savePoseCache(job, poseFrames, modelHash);
      job.clipReport = result.clip;
    }

    if (!job.clipReport) {
      const result = await page.evaluate((input) => window.evaluateCachedClip(input), {
        id: job.id,
        frames: poseFrames,
        annotation: job.annotation,
        thresholds: thresholds.values,
        split: options.split,
      });
      job.clipReport = result;
    }
    clipReports.push({
      ...job.clipReport,
      frameCount: poseFrames.length,
      personDetectedFrames: poseFrames.filter((frame) => frame.landmarks !== null).length,
      poseCache: job.cacheStatus,
    });
  }

  const report = buildReport({
    datasetPath: relative(repositoryRoot, datasetRoot),
    split: options.split,
    clips: clipReports,
    thresholds,
    modelHash,
    visionVersion: visionPackage.version,
  });
  if (options.baseline) report.baselineComparison = compareReports(parseJson(await readFile(resolve(options.baseline), "utf8"), options.baseline));

  const outputDir = resolve(datasetRoot, "runs");
  await mkdir(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, `benchmark-${new Date().toISOString().replaceAll(":", "-")}.json`);
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  printReport(report, outputPath);
} finally {
  await browser?.close();
  await vite?.close();
  await rm(tempRoot, { recursive: true, force: true });
}

function parseArgs(args) {
  const result = { split: "all", refreshPoses: false, help: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") result.help = true;
    else if (arg === "--refresh-poses") result.refreshPoses = true;
    else if (["--dataset", "--split", "--thresholds", "--baseline"].includes(arg)) {
      const value = args[++index];
      if (!value) throw new Error(`${arg} requires a value.`);
      if (arg === "--dataset") result.dataset = value;
      if (arg === "--split") result.split = value;
      if (arg === "--thresholds") result.thresholds = value;
      if (arg === "--baseline") result.baseline = value;
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (!["all", "tuning", "validation"].includes(result.split)) throw new Error("--split must be all, tuning, or validation.");
  return result;
}

async function loadDataset(root) {
  const sidecars = await walkJson(root);
  const clips = [];
  const seenVideos = new Set();
  for (const sidecarPath of sidecars) {
    if (sidecarPath.endsWith(".pose-cache.json") || relative(root, sidecarPath).split(sep).includes("runs")) continue;
    let value;
    try {
      value = parseJson(await readFile(sidecarPath, "utf8"), sidecarPath);
    } catch (error) {
      throw new Error(`Could not read sidecar ${relative(root, sidecarPath)}: ${error.message}`);
    }
    const annotation = validateAnnotation(value, relative(root, sidecarPath));
    if (isAbsolute(annotation.video)) throw new Error(`${relative(root, sidecarPath)}: video path must be relative.`);
    const videoPath = resolve(sidecarPath, "..", annotation.video);
    const videoRelative = relative(root, videoPath);
    if (videoRelative === ".." || videoRelative.startsWith(`..${sep}`) || isAbsolute(videoRelative)) {
      throw new Error(`${relative(root, sidecarPath)}: video path must stay inside the dataset directory.`);
    }
    if (basename(sidecarPath, ".json") !== basename(videoPath, extname(videoPath))) {
      throw new Error(`${relative(root, sidecarPath)} must share the video's base name.`);
    }
    if (seenVideos.has(videoPath)) throw new Error(`Video is referenced by more than one sidecar: ${videoRelative}`);
    seenVideos.add(videoPath);
    try {
      await stat(videoPath);
    } catch {
      throw new Error(`${relative(root, sidecarPath)}: video does not exist: ${annotation.video}`);
    }
    clips.push({ id: videoRelative, videoPath, annotation, cachePath: `${videoPath}.pose-cache.json` });
  }
  return clips.sort((a, b) => a.id.localeCompare(b.id));
}

async function walkJson(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    if (entry.name === "runs" || entry.name === "node_modules") continue;
    const item = resolve(directory, entry.name);
    if (entry.isDirectory()) found.push(...await walkJson(item));
    else if (entry.isFile() && entry.name.endsWith(".json")) found.push(item);
  }
  return found;
}

function validateAnnotation(value, source) {
  return parseVideoAnnotation(value, source);
}

async function loadThresholdProfile(profilePath) {
  const profile = parseJson(await readFile(resolve(profilePath), "utf8"), profilePath);
  if (profile.version !== 1 || typeof profile.name !== "string" || !profile.thresholds || typeof profile.thresholds !== "object") {
    throw new Error("Threshold profile must contain version: 1, a name, and a thresholds object.");
  }
  const keys = ["stanceDepthRatio", "movementStartDelta", "minimumForwardMovement", "minimumExtension", "minimumExtensionDelta", "recoveryExtension", "trackingGapResetMs"];
  const values = profile.thresholds;
  for (const key of keys) {
    if (!Number.isFinite(values[key]) || values[key] <= 0) throw new Error(`Threshold profile has invalid value for ${key}.`);
  }
  if (Object.keys(values).some((key) => !keys.includes(key))) throw new Error("Threshold profile contains an unknown threshold.");
  return { name: profile.name, values };
}

async function loadPoseCache(clip, modelHash, force) {
  if (force) return null;
  try {
    const cache = parseJson(await readFile(clip.cachePath, "utf8"), clip.cachePath);
    const sourceHash = await sha256File(clip.videoPath);
    if (cache.version !== 1 || cache.videoSha256 !== sourceHash || cache.modelSha256 !== modelHash || cache.visionVersion !== visionPackage.version || cache.frameSampling !== samplingPolicy || !Array.isArray(cache.frames) || !cache.frames.every(isPoseFrame)) return null;
    return cache;
  } catch {
    return null;
  }
}

function isPoseFrame(frame) {
  return frame && Number.isFinite(frame.timestamp) && (frame.landmarks === null || Array.isArray(frame.landmarks));
}

function parseJson(text, source) {
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`Could not parse JSON from ${source}: ${error.message}`);
  }
}

async function savePoseCache(clip, frames, modelHash) {
  const sourceHash = await sha256File(clip.videoPath);
  const cache = {
    version: 1,
    videoSha256: sourceHash,
    modelSha256: modelHash,
    visionVersion: visionPackage.version,
    frameSampling: samplingPolicy,
    frames,
  };
  await atomicWrite(clip.cachePath, `${JSON.stringify(cache)}\n`);
}

async function decodeFrames(videoPath, outputDir) {
  await mkdir(outputDir, { recursive: true });
  const outputPattern = resolve(outputDir, "frame-%09d.png");
  const args = ["-hide_banner", "-loglevel", "info", "-i", videoPath, "-vf", "showinfo", "-fps_mode", "passthrough", "-start_number", "0", "-y", outputPattern];
  const { stderr } = await runProcess(ffmpegPath, args);
  const timestamps = [...stderr.matchAll(/\bn:\s*\d+\s+pts:\s*-?\d+\s+pts_time:([+-]?(?:\d+\.?\d*|\.\d+))/g)].map((match) => Number(match[1]) * 1000);
  const framePaths = (await readdir(outputDir)).filter((file) => /^frame-\d+\.png$/.test(file)).sort().map((file) => resolve(outputDir, file));
  if (timestamps.length === 0 || timestamps.length !== framePaths.length) {
    throw new Error(`Could not pair decoded frames with timestamps for ${basename(videoPath)} (frames ${framePaths.length}, timestamps ${timestamps.length}).`);
  }
  for (let index = 1; index < timestamps.length; index++) {
    if (timestamps[index] <= timestamps[index - 1]) throw new Error(`${basename(videoPath)} has non-increasing presentation timestamps.`);
  }
  return { timestamps, framePaths };
}

function runProcess(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`FFmpeg failed (${code}): ${stderr.split("\n").slice(-12).join("\n")}`));
      else resolvePromise({ stderr });
    });
  });
}

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function atomicWrite(path, content) {
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, content, "utf8");
  await rename(temporaryPath, path);
}

function buildReport({ datasetPath, split, clips, thresholds, modelHash, visionVersion }) {
  const expected = {};
  const detected = {};
  let expectedStances = 0;
  let detectedStances = 0;
  let correctStances = 0;
  let unclassifiedDetections = 0;
  for (const clip of clips) {
    expectedStances++;
    if (clip.stance.detected !== null) detectedStances++;
    if (clip.stance.correct) correctStances++;
    unclassifiedDetections += clip.unclassifiedDetections;
    for (const [label, count] of Object.entries(clip.expectedActions)) expected[label] = (expected[label] ?? 0) + count;
    for (const [label, count] of Object.entries(clip.detectedActions)) detected[label] = (detected[label] ?? 0) + count;
  }
  const actions = {};
  for (const label of new Set([...Object.keys(expected), ...Object.keys(detected)])) {
    const expectedCount = expected[label] ?? 0;
    const detectedCount = detected[label] ?? 0;
    actions[label] = { expected: expectedCount, detected: detectedCount, difference: detectedCount - expectedCount };
  }
  return {
    format: "onetwopivot.boxing-benchmark",
    version: 1,
    runId: randomUUID(),
    createdAt: new Date().toISOString(),
    dataset: datasetPath,
    split,
    thresholds: { name: thresholds.name, values: thresholds.values },
    poseModel: { variant: "lite", visionVersion, modelSha256: modelHash, frameSampling: samplingPolicy },
    clips,
    actions,
    unclassifiedDetections,
    stance: {
      expected: expectedStances,
      detected: detectedStances,
      correct: correctStances,
      accuracy: expectedStances === 0 ? 1 : correctStances / expectedStances,
    },
  };
}

function compareReports(current, baseline) {
  if (baseline.format !== "onetwopivot.boxing-benchmark" || baseline.version !== 1) throw new Error("Baseline is not a supported onetwopivot benchmark report.");
  const labels = new Set([...Object.keys(current.actions), ...Object.keys(baseline.actions ?? {})]);
  const actions = {};
  for (const label of labels) {
    const currentError = Math.abs(current.actions[label]?.difference ?? 0);
    const baselineError = Math.abs(baseline.actions?.[label]?.difference ?? 0);
    actions[label] = { countErrorChange: currentError - baselineError };
  }
  return {
    baselineRunId: baseline.runId ?? null,
    actions,
    unclassifiedChange: current.unclassifiedDetections - (baseline.unclassifiedDetections ?? 0),
    stanceAccuracyChange: current.stance.accuracy - (baseline.stance?.accuracy ?? 0),
  };
}

function printReport(report, outputPath) {
  console.log(`\nBenchmark ${report.runId} · ${report.clips.length} clips · split ${report.split}`);
  console.log(`Threshold profile: ${report.thresholds.name}`);
  console.table(Object.entries(report.actions).map(([label, counts]) => ({
    label: `${label} · ${labelNames[label] ?? label}`,
    expected: counts.expected,
    detected: counts.detected,
    difference: counts.difference,
  })));
  console.log(`Unclassified detections: ${report.unclassifiedDetections}`);
  console.log(`Stance: ${report.stance.correct}/${report.stance.expected} correct; detected on ${report.stance.detected}/${report.stance.expected} clips`);
  if (report.baselineComparison) console.log(`Compared against baseline ${report.baselineComparison.baselineRunId ?? "(unknown run)"}.`);
  console.log(`Report saved to ${outputPath}`);
}

function printHelp() {
  console.log(`Usage: npm run benchmark -- --dataset <directory> [options]

Options:
  --split <all|tuning|validation>  Select clips (default: all)
  --thresholds <profile.json>      Use a named threshold profile
  --baseline <report.json>         Compare counts with a previous run
  --refresh-poses                  Re-extract cached pose frames
  --help                           Show this help

Each clip needs a same-name JSON sidecar. Videos, sidecars, pose caches, and
run reports stay local under test_data/media and are not uploaded.`);
}
