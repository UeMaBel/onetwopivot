import type { Landmark } from "./pose-types";

/** Draw the latest detected pose over the camera video. */
export function drawPose(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  landmarks: Landmark[] | null,
) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D rendering is unavailable.");
  const bounds = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.round(bounds.width * dpr),
    height = Math.round(bounds.height * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.clearRect(0, 0, width, height);
  if (!landmarks || video.videoWidth === 0 || video.videoHeight === 0) return;
  const scale = Math.min(
    bounds.width / video.videoWidth,
    bounds.height / video.videoHeight,
  );
  const imageWidth = video.videoWidth * scale,
    imageHeight = video.videoHeight * scale;
  const offsetX = (bounds.width - imageWidth) / 2,
    offsetY = (bounds.height - imageHeight) / 2;
  context.setTransform(
    -scale * dpr,
    0,
    0,
    scale * dpr,
    (offsetX + imageWidth) * dpr,
    offsetY * dpr,
  );
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = Math.max(3, video.videoWidth * 0.004);
  context.strokeStyle = "#c7ff61";
  context.fillStyle = "#f5ffdb";
  const connections = [
    [11, 12],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
    [11, 23],
    [12, 24],
    [23, 24],
    [23, 25],
    [25, 27],
    [27, 29],
    [29, 31],
    [24, 26],
    [26, 28],
    [28, 30],
    [30, 32],
  ];
  for (const [a, b] of connections) {
    const from = landmarks[a],
      to = landmarks[b];
    if (
      !from ||
      !to ||
      (from.visibility ?? 1) < 0.3 ||
      (to.visibility ?? 1) < 0.3
    )
      continue;
    context.beginPath();
    context.moveTo(from.x * video.videoWidth, from.y * video.videoHeight);
    context.lineTo(to.x * video.videoWidth, to.y * video.videoHeight);
    context.stroke();
  }
  for (const point of landmarks) {
    if ((point.visibility ?? 1) < 0.3) continue;
    context.beginPath();
    context.arc(
      point.x * video.videoWidth,
      point.y * video.videoHeight,
      video.videoWidth * 0.007,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.setTransform(1, 0, 0, 1, 0, 0);
}
