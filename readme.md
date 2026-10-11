# onetwopivot

onetwopivot is a boxing-focused movement-analysis proof of concept. The planned app uses a camera to track movement during drills, gives feedback, shows a result, and lets a guest submit a ranking result.

This repository currently contains the project documents and an initial directory scaffold. The application is not implemented yet.

## V0 direction

- Focus on boxing, starting with a jab drill. Keep the first version boxing-specific; consider other sports after the product is validated.
- Fetch drill definitions from a FastAPI backend. The project owner authors and publishes drills through a basic private admin area.
- Run pose tracking and scoring on the device. The backend serves drills and rankings; it does not analyze training sessions.
- Keep raw video on the device. Whether V0 records video locally or processes live camera frames only remains open.
- Show an in-app scorecard. Image and video export, deep coaching analysis, accounts, and saved training history are out of scope for V0.
- Let guests choose a display name and submit a result. A device-local anonymous ID distinguishes guests with the same name. Anyone can view rankings without signing in.
- Rank each guest's best result for a drill. V0 accepts client-reported scores without strong anti-cheat measures and submits ranking data only; it does not upload pose telemetry or video.
- Cache the latest fetched drill for offline use. Completing analysis and submitting a ranking result requires internet access.
- Place camera access behind a project-owned platform wrapper so the camera implementation can change if prototype findings require it.

## Planned structure

```text
backend/                 FastAPI API, drill and ranking features, admin, and migrations
frontend/                React app organized around training, results, and rankings
  public/models/          Potential location for locally bundled pose model assets
  src/platform/           Device and browser service boundary
  src/shared/pose-tracking/ Shared pose-tracking capability
infra/                   Container and service configuration, including Nginx and PostgreSQL
  redis/                  Optional Redis service
  celery/                 Optional background-worker service
prototypes/               Lightweight, isolated experiments
test_data/
  fixtures/               Small test fixtures intended for version control
  media/                  Large local test media; ignored by Git
```

The current directories are scaffolding, not finished modules. The backend is planned as one deployable service. Redis and Celery should be available as optional services and are not required by the initial user flow.

## Test data

Put small, deterministic fixtures for automated tests in `test_data/fixtures/`; these can be committed with the code that uses them. Keep large local recordings and other heavy test media in `test_data/media/`, which is ignored by Git.

## Linting

The phone browser pose-tracking prototype uses Biome as a local development dependency. From `prototypes/phone_browser_pose_tracking/`, run `npm run lint` to lint its source files. See the [prototype README](prototypes/phone_browser_pose_tracking/README.md) for setup details. Other prototypes can choose their own linting tools and configuration.

## Decisions still open

- Prototype results will determine live-frame versus local-video processing, model asset bundling and caching, and acceptable tracking and feedback responsiveness.
- Jab scoring details, score semantics, tie handling, and guest result removal need a later design decision.
- Production hosting and owner-only admin authentication are undecided.
- Validate browser camera access inside Capacitor on Android after the phone-browser prototype.

## Project documents

- [Architecture specification](project_context_architecture_specification.md) — original broader architecture proposal; it includes future direction as well as ideas superseded or deferred for V0.
- [Architecture grill handoff](architecture-grill-handoff.md) — current V0 decisions and explicitly open questions.
- [Product glossary](GLOSSARY.md) — preferred terms such as *drill*, *training session*, *guest*, and *leaderboard result*.

## Detector design

The agreed jab-detection direction is recorded separately in [detector-design-handoff.md](detector-design-handoff.md); implementation details and thresholds remain open.
