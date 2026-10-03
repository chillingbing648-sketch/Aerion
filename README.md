<div align="center">

# ◌ AERION

### **Spatial interaction, without the interface.**

A browser-based spatial interface that turns hand movement — or a pointer in virtual mode — into a live field of digital matter, gesture-driven interactions, and atmospheric visual feedback.

<p>
  <a href="https://chillingbing648-sketch.github.io/Aerion/"><strong>✦ Open Live Experience</strong></a>
  &nbsp; · &nbsp;
  <a href="https://github.com/chillingbing648-sketch/Aerion"><strong>⌘ View Source</strong></a>
</p>

<p>
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=111" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-7.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 7">
  <img src="https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 8.3">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4.3">
  <img src="https://img.shields.io/badge/MediaPipe-Tasks%20Vision-FF6F00?style=for-the-badge" alt="MediaPipe Tasks Vision">
</p>

<p>
  <img src="https://img.shields.io/badge/Lucide-React-111827?style=for-the-badge&logo=lucide&logoColor=white" alt="Lucide React">
  <img src="https://img.shields.io/badge/Canvas-2D-0B1220?style=for-the-badge" alt="Canvas 2D">
  <img src="https://img.shields.io/badge/GitHub%20Actions-Deploy-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions">
  <img src="https://img.shields.io/badge/GitHub%20Pages-Live-222222?style=for-the-badge&logo=githubpages&logoColor=white" alt="GitHub Pages">
</p>

</div>

---

<p align="center">
  <img src="./assets/aerion-spatial-map.svg" alt="AERION product and interaction architecture" width="1100">
</p>

<p align="center">
  <sub>Input → Hand Tracking → Spatial State → Physics → Canvas Rendering → Spatial HUD</sub>
</p>

---

## ✦ The Concept

AERION treats the screen as a **spatial field instead of a collection of controls**.

There is no conventional dashboard to operate. The main experience is a continuous canvas where physical hand motion becomes interaction and the resulting state is reflected through particles, trails, lenses, portals, gravity effects, and a restrained HUD.

The application supports two entry paths:

| Path | What happens |
|---|---|
| **Camera mode** | Webcam frames feed MediaPipe Hand Landmarker for real-time two-hand tracking. |
| **Virtual Spatial Mode** | Pointer input simulates a hand so the experience remains usable without a camera. |

The core implementation lives in React, while the high-frequency spatial loop runs through dedicated TypeScript systems rather than React re-rendering every frame.

---

## ◌ Interaction Vocabulary

| Gesture | Spatial response |
|---|---|
| **Open Palm** | Awakens the spatial core and orbital field |
| **Point** | Draws luminous air trails |
| **Pinch** | Condenses and manipulates digital matter; steady pinches can summon the Spatial Lens |
| **Fist** | Creates a gravitational collapse well |
| **Palm Hold** | Enters the time-dilation interaction state |
| **Two Hands** | Builds and expands a dimensional portal between the hands |
| **Swipe** | Produces an energy-wave interaction |
| **Virtual Pointer** | Mirrors the interaction model without camera tracking |

The in-app **Gestures** guide exposes the same interaction vocabulary to the user.

---

## 🧠 How AERION Works

The application separates sensing, state, simulation, rendering, and presentation.

```text
Camera / Pointer
      │
      ▼
MediaPipe Hand Landmarker
      │
      ▼
HandTracker
      │
      ├── gesture features
      ├── smoothing
      └── hand state
      │
      ▼
SpatialState / SpatialBus
      │
      ├── lens
      ├── portal
      ├── wipe / motion state
      └── UX phase
      │
      ▼
ParticleEngine
      │
      ├── gravity
      ├── trails
      ├── matter
      └── particle motion
      │
      ▼
SpatialRenderer
      │
      ├── main canvas
      ├── offscreen canvas
      └── camera compositing
      │
      ▼
SpatialHUD
```

This separation keeps the visual field responsive while limiting React state updates to meaningful HUD changes.

---

## ⚙️ Runtime Architecture

```text
src/
├── components/
│   ├── AuraVignette.tsx
│   ├── CameraLayer.tsx
│   ├── GateModal.tsx
│   ├── SpatialCanvas.tsx
│   └── SpatialHUD.tsx
│
├── hooks/
│   ├── useCamera.ts
│   └── useHandTracking.ts
│
├── systems/
│   ├── QualityEngine.ts
│   ├── gesture/
│   │   ├── GestureFeatures.ts
│   │   ├── Hand.ts
│   │   ├── HandTracker.ts
│   │   ├── Smoother.ts
│   │   └── types.ts
│   ├── physics/
│   │   └── ParticleEngine.ts
│   ├── rendering/
│   │   ├── SpatialRenderer.ts
│   │   └── SpriteFactory.ts
│   └── spatial/
│       ├── SpatialBus.ts
│       └── SpatialState.ts
│
├── App.tsx
├── index.css
└── main.tsx
```

### Responsibility map

| Layer | Responsibility |
|---|---|
| **Components** | Entry gate, camera surface, canvas shell and spatial HUD |
| **Hooks** | Camera lifecycle and MediaPipe model lifecycle |
| **Gesture system** | Hand features, poses, smoothing and tracking state |
| **Physics system** | Particle simulation and interaction forces |
| **Spatial system** | Shared spatial state and interaction phases |
| **Rendering system** | Canvas drawing, projection, glow and compositing |
| **Quality engine** | Adaptive particle quality for changing frame performance |

---

## 🖐️ Hand Tracking Pipeline

AERION uses **MediaPipe Tasks Vision** with the Hand Landmarker in video mode.

Current configuration:

- up to **2 hands**
- GPU delegate attempted first
- CPU fallback when GPU initialization fails
- minimum detection confidence: **0.55**
- minimum presence confidence: **0.50**
- minimum tracking confidence: **0.50**

The hand-tracking model and WebAssembly runtime are loaded from public CDNs at runtime.

Camera frames are processed in the browser; the repository does not define a remote application backend for this interaction loop.

---

## ⚡ Performance Model

AERION is designed around a high-frequency animation loop rather than continuous React rendering.

### Adaptive quality

The `QualityEngine` monitors recent frame duration and can reduce or recover the active particle count according to runtime conditions.

```text
Frame health
    │
    ├── Slow → reduce particle count
    │
    └── Healthy → recover particle count
```

Additional runtime considerations include:

- mobile-aware rendering
- reduced-motion preference detection
- capped device-pixel ratio
- offscreen canvas support
- smoothed gesture confidence
- discrete HUD updates to reduce React overhead

---

## ◇ Virtual Spatial Mode

AERION does not require a camera to explore the spatial field.

Virtual mode maps pointer input onto the same hand-state abstraction used by the gesture engine.

| Input | Virtual behavior |
|---|---|
| **Pointer move** | Spatial hand position |
| **Pointer down** | Pinch-like interaction |
| **Shift** | Fist simulation |
| **Alt** | Open/second-hand simulation |
| **R / Space** | Recenter digital matter |

This makes the experience testable on machines where camera permissions are unavailable.

---

## ◐ Experience Layer

The UI intentionally stays quiet while the canvas remains active.

The current HUD provides:

- AERION spatial identity
- live/searching tracking state
- current palette
- contextual micro-hints
- interaction state
- gesture guide
- camera toggle from virtual mode
- recenter control

The HUD also uses a small blur-to-sharp transition when the detected interaction state changes.

---

## 🔐 Camera, Model & Privacy Notes

AERION requires camera access only for camera-controlled interaction.

Important runtime details:

- camera access requires a secure context outside localhost
- the MediaPipe WASM runtime is loaded from jsDelivr
- the hand-landmarker model is loaded from Google Cloud Storage
- hand processing occurs in the browser
- the current repository exposes no application database, login system, or API backend for user data

Virtual Spatial Mode provides a camera-free path for experimentation.

---

## 🛠️ Technology Stack

| Area | Technology |
|---|---|
| UI | React 19 |
| Language | TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Hand tracking | MediaPipe Tasks Vision |
| Rendering | HTML Canvas 2D |
| Icons | Lucide React |
| Deployment | GitHub Actions + GitHub Pages |

---

## 🚀 Run Locally

### Requirements

- Node.js 22+
- npm
- a modern browser
- camera permission for camera mode

### Install

```bash
npm ci
```

### Development

```bash
npm run dev
```

### Type-check

```bash
npm run lint
```

### Production build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

---

## ☁️ Deployment

The repository includes a GitHub Pages workflow.

```text
git push origin main
        │
        ▼
GitHub Actions
        │
        ▼
npm ci
        │
        ▼
npm run build
        │
        ▼
dist/
        │
        ▼
GitHub Pages
```

Vite uses a relative asset base:

```js
base: './'
```

so the production bundle can resolve correctly when hosted below a domain root.

---

## 📁 Project Structure

```text
AERION/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── assets/
│   └── aerion-spatial-map.svg
├── src/
│   ├── components/
│   ├── hooks/
│   ├── systems/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## ⚠️ Current Constraints

- camera mode requires permission and a secure context
- gesture/model initialization depends on external MediaPipe assets
- GPU hand-tracking initialization can fall back to CPU
- the visual field is intentionally computationally active; adaptive quality helps, but device performance still matters
- the current project is an interactive spatial experiment rather than a conventional productivity application

---

## 🗺️ Current Scope

### Implemented

- [x] Camera-driven hand tracking
- [x] Two-hand support
- [x] Virtual spatial control
- [x] Gesture detection and smoothing
- [x] Particle field and physics
- [x] Spatial Lens interaction
- [x] Gravity collapse interaction
- [x] Dimensional portal interaction
- [x] Atmospheric camera layer
- [x] Contextual HUD
- [x] Gesture guide
- [x] Adaptive quality controls
- [x] Reduced-motion awareness
- [x] GitHub Pages deployment

### Possible future refinement

- richer gesture vocabulary
- deeper interaction chaining
- more spatial objects
- expanded accessibility cues
- additional performance instrumentation
- stronger onboarding for first-time users

---

## ◌ Design Principle

AERION is built around one idea:

> **The interface should respond to movement, not wait for a click.**

```text
Motion
   ↓
Interpretation
   ↓
Physical response
   ↓
Visual feedback
```

The goal is not to reproduce a traditional control panel in a futuristic skin. It is to make the screen behave more like a responsive spatial surface.

---

<div align="center">

### AERION

**Spatial Interface**

*Move through the field. The field responds.*

</div>