# AERION Spatial Interface

A browser-based spatial interface with real-time hand tracking, dynamic particle physics, and virtual control mode.

## Requirements

- Node.js 22 or later
- A modern browser with WebGL support
- Camera access for hand-tracking mode; camera access requires HTTPS outside localhost

## Development

```sh
npm ci
npm run dev
```

The application also supports virtual spatial control without camera access.

## Production

```sh
npm run lint
npm run build
npm run preview
```

The static production bundle is written to `dist/`. The repository includes a GitHub Pages workflow, and the relative asset base also supports deployment under a subpath on other static hosts.

Hand-tracking mode downloads the MediaPipe WebAssembly runtime and hand-landmarker model from their public CDNs. Video processing runs locally in the browser.
