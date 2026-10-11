# PROJECT CONTEXT & ARCHITECTURE SPECIFICATION
**Project Name:** onetwopivot(Abstract Computer Vision & Biomechanics Engine)  
**Target Platform:** Progressive Web App (PWA) / Capacitor Native Mobile Wrapper  
**Primary Focus:** Motion capture pose analysis, joint telemetry, real-time gamified drills, and creator challenges.

---

## 1. PROJECT OVERVIEW & STRATEGY
The goal is to build an abstract, multi-sport computer vision application that records user movement via standard web/mobile cameras, extracts 3D pose keypoint telemetry, and evaluates athletic technique against biomechanical heuristics and creator reference baselines.

* **Initial Vertical:** Boxing fundamentals (jabs, crosses, guard integrity, form tracking).
* **Long-Term Vision:** An abstract `BaseSportAnalyzer` engine capable of evaluating golf, tennis, basketball, etc.
* **Commercial / Viral Strategy:** YouTube creators publish custom benchmark drills. Fans use deep links to compare their movement vectors against the creator's baseline and generate shareable social media scorecards.
* **Open-Core Strategy:** 
  * *Public Repo:* Abstract sport interfaces, joint vector math, React camera hooks (portfolio/job seeking).
  * *Private Repo:* Creator datasets, monetization (Stripe), proprietary scoring weights.

---

## 2. TECHNICAL ARCHITECTURE & STACK

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser / PWA)                          │
│  ┌────────────────────────┐              ┌──────────────────────────┐  │
│  │  React / Vite / PWA    │              │ MediaPipe JS (In-Browser)│  │
│  │  UI & Recording Canvas │─────────────►│ Real-time pose overlay   │  │
│  └───────────┬────────────┘              └──────────────────────────┘  │
└──────────────┼─────────────────────────────────────────────────────────┘
               │ Async HTTP POST (JSON Telemetry Payload sent post-drill)
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Python / FastAPI)                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ FastAPI Gateway                                                  │  │
│  │  ├── SQLModel (ORM - PostgreSQL)                                 │  │
│  │  ├── Alembic (DB Migrations)                                     │  │
│  │  └── SQLAdmin (Django-style Admin Dashboard)                     │  │
│  └───────────┬──────────────────────────────────────────┬───────────┘  │
│              ▼ Task Queue                               ▼ Math / AI    │
│  ┌────────────────────────┐              ┌──────────────────────────┐  │
│  │ Redis / Celery Worker  │              │ Biomechanics Engine      │  │
│  │ (Async processing)     │              │ (NumPy, SciPy, filters)  │  │
│  └────────────────────────┘              └──────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Infrastructure & Scaling
* **Frontend Hosting:** Cloudflare Pages or Vercel (Edge CDN for infinite scaling, zero server load).
* **Backend Hosting:** Stateless Dockerized FastAPI behind a Load Balancer.
* **Database:** PostgreSQL (Stores User Profiles, Leaderboards, and JSONB telemetry payloads).
* **Media Storage:** Cloudflare R2 / AWS S3 (Stores raw `.mp4` video files to prevent database bloat).

---

## 3. CORE DATA CONTRACT (TELEMETRY JSON)

To decouple the client-side vision model from the Python math engine, keypoint data is standardized:

```json
{
  "video_id": "session_9876",
  "challenge_id": "creator_jab_speed_v1",
  "fps": 30,
  "total_frames": 900,
  "sport_type": "boxing",
  "frames": [
    {
      "frame_index": 0,
      "timestamp_ms": 0,
      "landmarks": {
        "LEFT_SHOULDER": {"x": 0.61, "y": 0.38, "z": -0.05, "visibility": 0.98},
        "LEFT_ELBOW": {"x": 0.68, "y": 0.52, "z": -0.12, "visibility": 0.95},
        "LEFT_WRIST": {"x": 0.62, "y": 0.30, "z": -0.22, "visibility": 0.96}
      }
    }
  ]
}
```

---

## 4. MATHEMATICAL FOUNDATIONS

The backend uses deterministic geometric kinematics:

1. **Joint Angles (Dot Products):** For connected joint keypoints $A, B, C$:
   $$\theta = \arccos\left(\frac{\vec{BA} \cdot \vec{BC}}{|\vec{BA}| |\vec{BC}|}\right) \times \left(\frac{180}{\pi}\right)$$
2. **Velocity Tracking:** Speed equals positional change over time ($\Delta t$).
3. **Kinematic Power Index (KPI):** Weighted sum of angular velocities across the kinetic chain (Foot $\rightarrow$ Hip $\rightarrow$ Shoulder $\rightarrow$ Fist).

---

## 5. USER FLOWS & VIRAL MECHANICS

1. **Entry Points:** 
   * **Deep Links:** `app.domain.com/c/jab-speed` directly opens the creator challenge.
   * **App Catalog:** Grid view for returning users to browse drills.
2. **45° Camera Calibration:** Before starting, the app renders a target silhouette. The user must stand at a 45° angle to the camera (ensuring optimal visibility of all 4 limbs and hip rotation). Once aligned, a 3-2-1 countdown begins.
3. **Lazy Authentication:** Users complete the drill and view their scorecard as a **Guest** with zero friction. The app only prompts for OAuth (Google/Apple) when they want to "Save to Profile" or post to a Global Leaderboard.
4. **Shareable Outputs (Client-Side Rendering):** 
   * **Static:** An HTML5 `<canvas>` PNG scorecard showing peak speeds, angles, and form ratings.
   * **Video:** `canvas.captureStream()` records a 5-second WebM skeleton overlay loop locally on the device for easy Instagram/TikTok sharing, eliminating backend video rendering costs.

---

## 6. PROJECT DIRECTORY STRUCTURE

```text
sports-telemetry-ai/
├── AGENTS.md                  # Master AI context & rules
├── PROJECT_CONTEXT.md         # This architectural spec
├── docker-compose.yml         # Local Postgres + Redis
│
├── test_data/
│   ├── fixtures/              # COMMITTED: JSON telemetry mocks
│   └── media/                 # GIT-IGNORED: Heavy local test MP4s
│
├── prototypes/                # Research Sandbox (No React/FastAPI here)
│   ├── .venv/                 # Git-ignored local virtual env
│   ├── 01_jab_analyzer.py     # Math & CV tests (OpenCV + MediaPipe)
│   └── requirements.txt
│
├── backend/                   # FastAPI Production API
│   ├── app/
│   │   ├── api/               # HTTP endpoints
│   │   ├── domain/            # Core math & BaseSportAnalyzer
│   │   ├── models/            # SQLModel DB schemas
│   │   └── admin.py           # SQLAdmin dashboard config
│   ├── alembic/               # DB Migration scripts
│   └── tests/
│
└── frontend/                  # React / Vite / Capacitor Web App
    ├── public/models/         # Local MediaPipe WASM binaries
    ├── src/
    │   ├── components/        # CameraView, CanvasOverlay, GameHUD
    │   └── hooks/             # usePoseTracker, useGuardCheck
    └── capacitor.config.json
```

---

## 7. CRITICAL ENGINEERING DECISIONS (DO NOT ALTER)

1. **Client-Side Telemetry:** Device browser handles MediaPipe extraction locally to ensure sub-50ms feedback latency. Raw video is NOT streamed to the server during live games.
2. **No WebSockets for V1:** Real-time feedback (e.g., "Guard Police" buzzer) happens in local JS. Telemetry payloads are sent to FastAPI via standard asynchronous HTTP POST *after* the drill finishes.
3. **Database Parity:** Local development uses PostgreSQL via Docker. No SQLite fallbacks.
4. **Capacitor Mobile Ready:** No hardcoded public network paths for WASM files (they live locally in frontend build to bypass native webview restrictions).