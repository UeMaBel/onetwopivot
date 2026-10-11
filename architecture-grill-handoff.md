# Architecture Grill Handoff

Use this note to resume the architecture discussion in a new session. It records decisions made so far, separates them from open questions, and points to the source documents. It is a design handoff, not an implementation specification.

## Goal

Shape the overall architecture for **onetwopivot V0**, a boxing-focused movement-analysis proof of concept. Continue grilling the user on unresolved product and architecture choices before revising the main architecture specification. The repository currently contains architecture and glossary documents, but no application implementation.

## Confirmed Direction

### Product scope

- V0 focuses on boxing. Add more boxing drills before considering another sport; keep the implementation boxing-specific until the product feels good.
- V0 starts with a fixed drill authored by the project owner. The app fetches drill definitions from the backend.
- Drill records should carry authorship and publication status from the start, even though only the project owner publishes drills in V0.
- A **challenge** may later package a drill with creator material, a reference baseline, and a leaderboard. V0 models drills; creator self-service and challenge packaging are future scope.
- The camera's proposed 45-degree angle is a hypothesis to evaluate in prototypes, not a V0 requirement.
- Show an in-app scorecard in V0. Defer scorecard image/video export.

### Training and analysis

- Pose extraction and scoring run on-device for V0. The Python backend serves drills and rankings; it does not score training sessions.
- Keep raw video on-device. Whether V0 records video or processes live camera frames only is still open.
- Deep analysis is out of V0 scope. A possible future coaching feature should give detailed, actionable feedback grounded in drill criteria and observed movement evidence; it may later be paid, but there is no V0 monetization.
- Do not add V0 accounts or saved training history.
- The first drill is a jab drill. Detailed scoring rules, including how to represent jab form and the non-punching hand, are deferred to a later design session; do not add speed or power scoring to V0 at this stage.
- The drill should provide both in-session feedback and a scorecard. The agreed example is an audio and visual alarm when the non-punching hand drops; the exact trigger and scoring thresholds remain for the prototype and later scoring discussion.
- Before the drill starts, confirm that pose tracking is working. If camera tracking stops mid-drill, pause and offer a way to resume.
- V0 success means a usable end-to-end drill: fetch a drill, complete it with camera-based analysis, view its scorecard, and submit a ranked result while online. User feedback is not a V0 success criterion.

### Leaderboard proof of concept

- Build a deliberately simple, replaceable ranking system in V0 and design the architecture with future leaderboards in mind.
- People enter as guests using a chosen display name. A device-local anonymous ID distinguishes guests who choose the same name; the name is only a label.
- The client submits its score to the backend. V0 accepts client-reported scores without strong anti-cheat measures.
- Rank each guest's best score for a particular drill.
- A result retains the drill and scoring versions needed to interpret it. Ranking rules may change later.
- Send only ranking data needed for this feature. Do not upload pose telemetry or video for V0 ranking. Additional metadata, including a possible short clip, is deferred until a concrete use is defined.
- Anyone can view the leaderboard without signing in or submitting a result. Ask for a display name only when a guest chooses to submit a result.
- The device-local guest identity persists across app sessions; reinstalling or clearing app data may create a new guest identity.
- Whether ties use submission time and whether guests can remove submitted results are deferred to a later session.

### Architecture and development workflow

- Use one deployable FastAPI backend organized around drills and rankings, with an admin area. A basic private admin workflow lets the project owner create and update drills; creator self-service is later.
- Organize the React frontend around training, results, and rankings, with pose tracking and platform services as shared capabilities.
- Create a platform wrapper from the start so feature flows do not depend directly on device-specific APIs. Android and iOS are future targets using the same React app through Capacitor.
- Keep Python prototypes in the repository as isolated experiments. They are for testing ideas only; always reimplement validated behavior in production code rather than promoting or sharing prototype code.
- Use a fully containerized environment, including Nginx and the API/database stack, with Redis and Celery available through optional services/profiles. Prototypes remain lightweight and do not need the production stack.
- Keep the project public for now. A private boundary may be introduced later.
- Production hosting is undecided.
- Use a project-owned platform wrapper for device services. For live camera access, first try the browser camera API in both the mobile browser and Capacitor app; keep training and pose analysis independent of that implementation so it can be replaced if needed. The wrapper should expose start/stop, readiness and permission state, and video frames. Validate responsiveness in the prototype.
- Start the prototype in a phone browser, then try Android through Capacitor. If camera access is denied or unavailable, explain the issue and offer a retry. Cache the latest fetched drill for offline use; scoring/ranking still requires internet.
- The standard Capacitor Camera plugin is for photo/video capture and is not the selected live tracking interface. See the [Capacitor Camera API](https://next.capacitorjs.com/docs/apis/camera).

## Open Questions for the Next Session

The following items are explicitly deferred; do not silently fill them in when revising the architecture specification:

1. **Prototype findings:** Validate tracking continuity and feedback responsiveness in a phone browser. Use the prototype to decide whether V0 processes live frames only or also records video locally, and whether model assets should be bundled or downloaded and cached. Determine the tracking/feedback acceptance thresholds from observed runs.
2. **Scoring and ranking details:** Define jab form and non-punching-hand scoring, leaderboard score semantics, tie handling, and whether guests can remove a submitted result in a later session.
3. **Production hosting and admin authentication:** Keep the hosting provider open. Choose the owner's sign-in method once the hosting approach is selected; admin access remains owner-only for V0.
4. **Android camera validation:** After the browser prototype, validate the browser camera API inside the Capacitor Android app and revisit the wrapper boundary if responsiveness or access requires another implementation.

When asking these, continue the grilling workflow: ask the current decision frontier together, include a recommendation for each, and wait for the user's answers before asking dependent questions. Do not implement the architecture or revise the source specification until the user confirms a shared understanding.

## Conflicts to Reconcile with the Source Specification

The current [architecture specification](./project_context_architecture_specification.md) describes a broader future product. In the next grill, distinguish V0 choices from future direction and update that file only after the design is settled.

- It presents a multi-sport analyzer as an architectural target; V0 is boxing-specific, with sport abstraction deferred until another sport is validated.
- It describes uploading telemetry after drills and includes server-side biomechanics processing; V0 scores on-device and submits only leaderboard data.
- It includes raw video storage, creator publishing, account flows, deep analysis, and shareable media; these are future or deferred features as described above.
- It specifies a 45-degree calibration flow; this is a prototype hypothesis.
- It proposes Cloudflare/Vercel and object storage; production hosting remains undecided.
- It names Redis/Celery and other infrastructure; the user wants the full containerized environment available, while keeping prototypes lightweight and background services optional until used.
- It should be revised to reflect the agreed first-release drill (jab), guest leaderboard flow, offline drill caching, and camera wrapper. Keep the explicitly deferred decisions above marked as open.

## Reference Documents

- [Project context and architecture specification](./project_context_architecture_specification.md): original architecture proposal to revise after the grill.
- [Product glossary](./GLOSSARY.md): current domain terms, including drill, training session, guest, challenge, and leaderboard result.
