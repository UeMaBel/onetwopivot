# MediaPipe Pose Landmark Cheat Sheet

MediaPipe Pose Landmarker returns up to 33 body landmarks for each detected
person. A landmark has `x`, `y`, and `z` coordinates, and may have a
`visibility` value that indicates how likely the point is visible.

## Index map

Use the index in the left column to access a point in the landmarks array.
“Left” and “right” mean the person's left and right, not the left and right
sides of the screen. A selfie preview may be mirrored, so the person's left
side can appear on the screen's right.

| Index | Landmark | Index | Landmark |
| ---: | --- | ---: | --- |
| 0 | Nose | 17 | Left pinky |
| 1 | Left eye (inner) | 18 | Right pinky |
| 2 | Left eye | 19 | Left index finger |
| 3 | Left eye (outer) | 20 | Right index finger |
| 4 | Right eye (inner) | 21 | Left thumb |
| 5 | Right eye | 22 | Right thumb |
| 6 | Right eye (outer) | 23 | Left hip |
| 7 | Left ear | 24 | Right hip |
| 8 | Right ear | 25 | Left knee |
| 9 | Left side of mouth | 26 | Right knee |
| 10 | Right side of mouth | 27 | Left ankle |
| 11 | Left shoulder | 28 | Right ankle |
| 12 | Right shoulder | 29 | Left heel |
| 13 | Left elbow | 30 | Right heel |
| 14 | Right elbow | 31 | Left foot index (toe) |
| 15 | Left wrist | 32 | Right foot index (toe) |
| 16 | Right wrist | | |

## Accessing landmarks in this prototype

The worker takes the first detected person's points and sends them to the
page as `landmarks`. For example, in code that has received a worker result:

```ts
const landmarks = message.landmarks;
const leftElbow = landmarks?.[13];
const rightWrist = landmarks?.[16];

if (leftElbow) {
  console.log(leftElbow.x, leftElbow.y, leftElbow.visibility);
}
```

The `?.` means “only access this if `landmarks` exists.” There may be no
landmark array when no person was detected, so the check prevents an error.

In the worker, before the points are sent to the page, MediaPipe's result is
nested by person. Since this prototype tracks one person, the first person's
left elbow is `result.landmarks[0]?.[13]`:

```ts
const firstPerson = result.landmarks[0];
const leftElbow = firstPerson?.[13];
```

## What the coordinates mean

- `x` and `y` are normalized to the image: `0` is near the left/top edge and
  `1` is near the right/bottom edge. For example, `x: 0.5` is halfway across.
- `z` is a relative depth estimate. Treat it as relative, not as a precise
  distance from the camera.
- `visibility` is a confidence-like estimate for whether the point is visible.
  The overlay currently skips points below `0.3`.

The index assignments above follow MediaPipe's official [PoseLandmark
reference](https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/PoseLandmark).
