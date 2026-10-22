# 📚 RoadReady API Reference & Developer Documentation

RoadReady provides a production-hardened Express 5 REST API powering real-time navigation telemetry, driver education logbooks, community ground reporting, and simulation engines.

---

## 🔒 Security & Middleware Specification

- **Security Headers:** Enforced via `helmet` with Content Security Policy tuned for MapLibre GL WebGL shaders and CartoDB vector basemaps.
- **Global Rate Limiting:** 300 requests per 15-minute sliding window per client IP on `/api/*`.
- **Write Mutation Rate Limiting:** 60 mutation requests per 15-minute window on `POST` endpoints.
- **Payload Sanitization:** JSON body parser restricted to `100kb` with strict string truncation and type validation.

---

## 📡 Endpoints

### 1. Health Check
Returns the current health status, active uptime, and environment profile of the backend.

- **Method:** `GET`
- **Route:** `/api/health`
- **Response:** `200 OK`
```json
{
  "status": "ok",
  "service": "Apple Maps Learner Engine Backend",
  "uptimeSeconds": 1420,
  "timestamp": "2026-10-22T21:50:00.000Z",
  "environment": "production"
}
```

---

### 2. Real-Time Traffic & Incidents
Returns real-time congestion flow vectors and dynamic road incidents (construction, school slowdowns, accidents) around a GPS coordinate.

- **Method:** `GET`
- **Route:** `/api/traffic`
- **Query Parameters:**
  - `lat` *(number, optional)*: Latitude (default: `37.7749`).
  - `lng` *(number, optional)*: Longitude (default: `-122.4194`).
- **Response:** `200 OK`
```json
{
  "type": "FeatureCollection",
  "isRushHour": false,
  "currentHour": 14,
  "overallTrafficIndex": 28,
  "legend": {
    "green": "Free Flow (Ideal for Learners)",
    "yellow": "Moderate Activity",
    "red": "Congested / Heavy Traffic"
  },
  "features": [
    {
      "type": "Feature",
      "id": "traf-seg-1",
      "properties": {
        "name": "Main Arterial Northbound",
        "congestion": "moderate",
        "speedMph": 28,
        "color": "#FFCC00"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [[-122.4254, 37.7669], [-122.4214, 37.7749], [-122.4184, 37.7829]]
      }
    }
  ],
  "incidents": [
    {
      "id": "inc-1",
      "type": "construction",
      "title": "Lane Resurfacing & Cones Active",
      "delayMinutes": 4,
      "coordinates": [-122.4234, 37.7799],
      "severity": "moderate"
    }
  ]
}
```

---

### 3. Learner Passport & Hours Verification
Retrieves the student driver's progress toward mandatory State Form DL-50HRS certification.

- **Method:** `GET`
- **Route:** `/api/passport`
- **Response:** `200 OK`
```json
{
  "loggedHours": 18,
  "targetHours": 50,
  "nightHours": 5,
  "highwayHours": 3,
  "badges": ["First Ignition", "Friction Master", "Cone Wizard"]
}
```

---

### 4. Log Practice Hour
Increments certified driving hours and checks for milestone badge unlocks.

- **Method:** `POST`
- **Route:** `/api/passport/log`
- **Request Body:**
```json
{
  "hours": 1,
  "isNight": false,
  "isHighway": false
}
```
- **Response:** `200 OK`
```json
{
  "success": true,
  "passport": {
    "loggedHours": 19,
    "targetHours": 50,
    "nightHours": 5,
    "highwayHours": 3,
    "badges": ["First Ignition", "Friction Master", "Cone Wizard"]
  }
}
```

---

### 5. Community Ground Conditions
Retrieves ground condition reports submitted by student drivers and coaches.

- **Method:** `GET`
- **Route:** `/api/community-reports`
- **Query Parameters:**
  - `zoneId` *(string, optional)*: Specific practice ground ID.
- **Response:** `200 OK`

---

### 6. Post Ground Condition Report
Submits an in-field surface and gate condition report.

- **Method:** `POST`
- **Route:** `/api/community-reports`
- **Request Body:**
```json
{
  "zoneId": "candlestick-open-ground",
  "author": "Elena R.",
  "status": "Gate Open",
  "surface": "Dry & Clean",
  "notes": "Completely empty this afternoon. Perfect for parallel parking."
}
```
- **Response:** `201 Created`

---

### 7. Subscription Checkout & Verification
Simulates B2C Pro Pass license activation and verifies feature entitlement.

- **Method:** `POST`
- **Route:** `/api/subscription/upgrade`
- **Request Body:**
```json
{
  "tier": "lifetime",
  "price": 29.99
}
```
- **Response:** `200 OK`
```json
{
  "success": true,
  "subscription": {
    "isPro": true,
    "tier": "lifetime",
    "price": 29.99,
    "unlockedAt": "2026-10-22T21:50:00.000Z",
    "transactionId": "TXN-MAPS-1792695000000"
  }
}
```

---

## ⚡ Offline PWA Capabilities

RoadReady includes a Service Worker registered at `/sw.js`:
- **Tile Caching:** Caches CartoDB vector/raster basemap tiles into the `roadready-map-tiles-v1` cache storage.
- **Route Fallback:** Automatically switches to client-side Bézier spline path simulation if offline or when the OSRM routing gateway is unreachable.
- **PWA Manifest:** Supported via `/manifest.json` for full-screen installation across iOS and Android.
