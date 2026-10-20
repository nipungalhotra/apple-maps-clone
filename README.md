# RoadReady: Safe Driving Grounds & DMV Test Prep Engine

A high-fidelity navigation and driver education platform featuring the **RoadReady FreeSpace Engine** — discovering empty parking lots, quiet practice boulevards, virtual cone courses, official DMV examiner route simulations, and 1-on-1 driving coach marketplace.

---

## 🗺️ How RoadReady Works (Visual Workflow)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ROADREADY VISUAL WORKFLOW                       │
├──────────────────┬──────────────────┬──────────────────┬───────────────┤
│ 1. FreeSpace     │ 2. Virtual Cones │ 3. DMV Simulator │ 4. Logbook    │
│    Empty Lots    │    Parallel Bay  │    Examiner Audio│    50-Hour PDF│
└──────────────────┴──────────────────┴──────────────────┴───────────────┘

1. 🏞️ DISCOVER EMPTY GROUNDS:
   [ User GPS ] ──────► Scans 5 km radius ──► [ Candlestick Civic Lot ]
                                              • 65m wide open pavement
                                              • 0.1 cars/min low traffic
                                              • Gate status: Open

2. ▲ PRACTICE WITH VIRTUAL CONES:
   [ Map View ] ──────► Drops Cones ────────►   ▲   [ Your Car ]   ▲
                                              • Parallel Parking Bay
                                              • 90° Reverse Docking
                                              • Motorcycle MSF U-Turn Box

3. 🎖️ DRIVE OFFICIAL DMV EXAM ROUTES:
   [ Local DMV ] ─────► Real Test Path ─────► Examiner Voice Audio (Siri)
                                              • 4-Way intersection scan
                                              • Curb park alignment
                                              • Score: 90/100 PASSED

4. 📄 EXPORT OFFICIAL 50-HR DRIVING LOG:
   [ 50 Hours Met ] ──► Instant Export ─────► State Form DL-50HRS (PDF)
                                              • 40h Day + 10h Night tally
                                              • Supervisor Affidavit
                                              • Ready for DMV Examiner
```

---

## 🚀 Live Demo
Run locally at:
**[http://127.0.0.1:3000/](http://127.0.0.1:3000/)**

---

## ✨ Features

### 🖥️ Desktop UI/UX (macOS Experience)
- **Floating Glass Island:** Translucent frosted blur (`backdrop-blur-xl`), rounded Apple corners, and soft card drop shadows.
- **Search & Auto-Complete:** Instant suggestions, GPS Current Location quick-action, and OpenStreetMap Photon geocoding.
- **Category Filter Pills:** Food & Drink, Fuel / EV charging, Shopping, Parking, Transit.
- **Place Details Card:** Photos, star ratings, operating hours, phone, web links, and directions.
- **Multi-Modal Route Planner:** Drive (`car`), Walk (`foot`), and Cycle (`bike`).
- **Turn-by-Turn Maneuvers Preview:** Step-by-step route directions list with distance formatting.

### 📱 Mobile UI/UX (iOS Experience)
- **Interactive 3-Tier Bottom Sheet:**
  - `Peek` (compact search pill)
  - `Half` (search results & category discovery)
  - `Full` (complete place card details or turn instructions)
- **Touch & Drag Ergonomics:** Draggable notch handle and smooth spring transitions.
- **iPhone 16 Pro Frame Simulator:** Built-in mobile frame with Dynamic Island, Status Bar, and Home Indicator.

### 🔰 Learner FreeSpace Engine (For Cars & Bikes)
- **Dynamic Local Proximity Discovery:** Automatically discovers 5 verified beginner practice grounds and quiet road loops within 5 km of the user's active GPS location anywhere in the world.
- **5-Stage Mathematical Safety Pipeline:**
  1. *Spatial Geometry & Boundary* (turning clearance, run-off buffer width).
  2. *Road Hierarchy & Speed Ceiling* (15 mph quiet roads, zero-conflict open tarmac).
  3. *Temporal Traffic Activity Matrix* (time-of-day traffic modeling).
  4. *Surface Friction & Run-Off Buffer* (asphalt/concrete traction rating).
  5. *Vehicle Kinematics & Maneuver Suitability* (clutch friction zone, figure-8 balance, 3-point turns).
- **Virtual Traffic Cone Course Builder:**
  - Presets: Slalom Cone Weaving, Parallel Parking Bay, Motorcycle Figure-8, 3-Point Turn Box.
  - Interactive custom cone dropping anywhere on the map.
- **Siri Voice Guidance:** Live spoken maneuvers and feedback via Web Speech API (`speechSynthesis`).
- **Official DMV Driving Test Simulator:** SF Fell St & Daly City DMV official routes with 5 examiner evaluation checkpoints.
- **Live Weather Traction Engine:** Real-time wet asphalt braking distance multipliers (1.4x-2.2x stopping distance alert).
- **Community Ground Reports:** Crowd-sourced pavement status, open gates, and crowd activity notes.
- **Learner Passport & Logged Hours Tracker:** 50-hour state requirement tracker with milestone achievement badge unlocks.

### 🧭 Navigation & Map Engine
- **Turn-by-Turn Navigation HUD:** High-contrast green iOS banner, maneuver icons, and remaining distance/ETA.
- **Simulated GPS Drive Replay (`.navtrace`):** Live route playback driving the camera with speed controls (`1x`, `2x`, `4x`).
- **3D Buildings & Tilt:** Smooth perspective tilt with 3D building extrusions.
- **Dark / Light Theme:** Dynamic theme switcher.

---

## 🛠️ Tech Stack
- **Framework:** React 18, Vite 6
- **Styling:** Tailwind CSS, Lucide React
- **Map Engine:** MapLibre GL
- **Audio / Voice:** Web Speech API

---

## 📦 Getting Started

```bash
# Clone the repository
git clone https://github.com/nipungalhotra/apple-maps-clone.git
cd apple-maps-clone

# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Build for production
npm run build
```
