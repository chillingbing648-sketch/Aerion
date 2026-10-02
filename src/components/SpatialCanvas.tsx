import React, { useEffect, useRef, useCallback } from 'react';
import { HandLandmarker } from '@mediapipe/tasks-vision';
import { ParticleEngine } from '../systems/physics/ParticleEngine';
import { SpatialRenderer } from '../systems/rendering/SpatialRenderer';
import { QualityEngine } from '../systems/QualityEngine';
import { HandTracker } from '../systems/gesture/HandTracker';
import { spatialState, UXPhase } from '../systems/spatial/SpatialState';
import { HUDState } from './SpatialHUD';

interface SpatialCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarkerRef: React.RefObject<HandLandmarker | null>;
  isSessionActive: boolean;
  isVirtualControl?: boolean;
  onHUDUpdate: (state: HUDState) => void;
  onResetSceneRegister?: (resetFn: () => void) => void;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ez = (dt: number, k: number) => 1 - Math.exp(-k * dt);

export const SpatialCanvas: React.FC<SpatialCanvasProps> = ({
  videoRef,
  landmarkerRef,
  isSessionActive,
  isVirtualControl = false,
  onHUDUpdate,
  onResetSceneRegister,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const engineRef = useRef<{
    handTracker: HandTracker;
    particles: ParticleEngine;
    renderer: SpatialRenderer;
    quality: QualityEngine;
    smoothHUDConfidence: number;
    lastPrevGesture: string;
    lastPrevConfidence: number;
    lastPrevStatus: string;
    lastPrevPhase: UXPhase;
    lastPrevHint: string | null;
  } | null>(null);

  const pointerRef = useRef<{
    x: number;
    y: number;
    isDown: boolean;
    isShift: boolean;
    isAlt: boolean;
    isActive: boolean;
    lastSeen: number;
  }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 600,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
    isDown: false,
    isShift: false,
    isAlt: false,
    isActive: false,
    lastSeen: 0,
  });

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastDetectTimeRef = useRef<number>(-1);

  // Recenter digital matter helper
  const recenterMatter = useCallback(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    spatialState.obj.on = true;
    spatialState.obj.x = W / 2;
    spatialState.obj.y = H / 2;
    spatialState.obj.vx = 0;
    spatialState.obj.vy = 0;
    spatialState.obj.s = 1;
    spatialState.obj.a = 1;
    spatialState.obj.hold = null;
    spatialState.obj.focus = 1;
    spatialState.setMicroHint('SPATIAL MATTER RECENTERED', 1600);
  }, []);

  useEffect(() => {
    if (onResetSceneRegister) {
      onResetSceneRegister(recenterMatter);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R' || e.code === 'Space') {
        if (isSessionActive) {
          recenterMatter();
        }
      }
      if (e.key === 'Shift') {
        pointerRef.current.isShift = true;
      }
      if (e.key === 'Alt') {
        pointerRef.current.isAlt = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        pointerRef.current.isShift = false;
      }
      if (e.key === 'Alt') {
        pointerRef.current.isAlt = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onResetSceneRegister, recenterMatter, isSessionActive]);

  // Pointer event listeners for Virtual Spatial Mode
  useEffect(() => {
    if (!isSessionActive) return;

    const handlePointerMove = (e: PointerEvent) => {
      pointerRef.current.x = e.clientX;
      pointerRef.current.y = e.clientY;
      pointerRef.current.isActive = true;
      pointerRef.current.lastSeen = performance.now();
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerRef.current.x = e.clientX;
      pointerRef.current.y = e.clientY;
      pointerRef.current.isDown = true;
      pointerRef.current.isActive = true;
      pointerRef.current.lastSeen = performance.now();
    };

    const handlePointerUp = () => {
      pointerRef.current.isDown = false;
      pointerRef.current.lastSeen = performance.now();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isSessionActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const quality = new QualityEngine();
    const particles = new ParticleEngine(quality.isMobile, quality.prefersReducedMotion);
    const renderer = new SpatialRenderer(canvas, quality.isMobile, quality.prefersReducedMotion);
    const handTracker = new HandTracker();

    engineRef.current = {
      handTracker,
      particles,
      renderer,
      quality,
      smoothHUDConfidence: 0,
      lastPrevGesture: '',
      lastPrevConfidence: -1,
      lastPrevStatus: '',
      lastPrevPhase: 'BOOT',
      lastPrevHint: null,
    };

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, quality.isMobile ? 1.5 : 2);
      const W = window.innerWidth;
      const H = window.innerHeight;

      canvas.width = W * dpr;
      canvas.height = H * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      renderer.resize(W, H, dpr);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Sync video element with renderer
  useEffect(() => {
    if (engineRef.current && videoRef.current) {
      engineRef.current.renderer.setVideo(videoRef.current);
    }
  }, [videoRef]);

  // Main high-frequency render & tracking loop
  useEffect(() => {
    let isRunning = true;

    const loop = (now: number) => {
      if (!isRunning) return;
      rafRef.current = requestAnimationFrame(loop);

      const engine = engineRef.current;
      if (!engine) return;

      const dt = Math.min((now - (lastTimeRef.current || now)) / 1000 || 0.016, 0.05);
      lastTimeRef.current = now;

      const W = window.innerWidth;
      const H = window.innerHeight;
      const vid = videoRef.current;
      const landmarker = landmarkerRef.current;

      // 1. Ingest camera hand tracking if available
      let hasCameraData = false;
      if (
        !isVirtualControl &&
        landmarker &&
        vid &&
        vid.readyState >= 2 &&
        vid.currentTime !== lastDetectTimeRef.current
      ) {
        lastDetectTimeRef.current = vid.currentTime;
        try {
          const results = landmarker.detectForVideo(vid, now);
          if (results.landmarks && results.landmarks.length > 0) {
            engine.handTracker.ingest(results, now, vid, W, H);
            hasCameraData = true;
          }
        } catch (_detectErr) {
          // Camera frame detection catch
        }
      }

      // 2. If in Virtual Spatial Mode or no camera data, inject simulated hand
      if (isVirtualControl || (!hasCameraData && pointerRef.current.isActive)) {
        const p = pointerRef.current;
        const isRecent = now - p.lastSeen < 2500;
        if (isRecent) {
          engine.handTracker.injectSimulatedHand(
            {
              x: p.x,
              y: p.y,
              isPinching: p.isDown && !p.isShift,
              isFist: p.isShift,
              isOpen: !p.isDown && !p.isShift && p.isAlt,
              isSecondHand: p.isAlt,
              secondX: W - p.x,
              secondY: p.y,
            },
            now,
            W,
            H
          );
        }
      }

      // Update spatial systems
      engine.handTracker.update(dt, now, W, H, engine.quality.prefersReducedMotion);
      engine.particles.update(dt, now / 1000, W, H, engine.handTracker.hands);
      engine.quality.step(dt, now, engine.particles);

      // Render layers
      engine.renderer.render(engine.particles, engine.handTracker.hands, W, H, now / 1000);

      // Compute contextual HUD values
      const liveHands = engine.handTracker.hands
        .filter(h => h.vis > 0.4 && h.f)
        .sort((a, b) => b.vis - a.vis);

      let gestureName = 'Awaiting Hand';
      let confidenceRaw = 0;

      const portal = spatialState.portal;
      const lens = spatialState.lens;
      const wipe = spatialState.wipe;

      if (portal.k > 0.5) {
        gestureName = 'Two Hands';
        confidenceRaw = portal.R / (Math.min(W, H) * 0.45);
      } else if (lens.a > 0.4) {
        gestureName = 'Spatial Lens';
        confidenceRaw = lens.str;
      } else if (wipe.u < 0.7) {
        gestureName = 'Swipe';
        confidenceRaw = 1.0;
      } else if (liveHands.some(h => h.held)) {
        gestureName = 'Palm Hold';
        confidenceRaw = 1.0;
      } else if (liveHands[0] && liveHands[0].f) {
        const lead = liveHands[0];
        const f = lead.f!;
        const pose = lead.pose;
        if (pose === 'open') {
          gestureName = 'Open Palm';
          confidenceRaw = f.open;
        } else if (pose === 'pinch') {
          gestureName = 'Pinch';
          confidenceRaw = f.pinch;
        } else if (pose === 'fist') {
          gestureName = 'Fist';
          confidenceRaw = lead.fistT;
        } else if (pose === 'point') {
          gestureName = 'Point';
          confidenceRaw = clamp(lead.speed() / 10, 0, 1);
        } else {
          gestureName = 'Tracking';
          confidenceRaw = lead.vis;
        }
      }

      engine.smoothHUDConfidence = lerp(
        engine.smoothHUDConfidence,
        clamp(confidenceRaw, 0, 1),
        ez(dt, 10)
      );

      const roundedConfidence = Math.round(engine.smoothHUDConfidence * 50) * 2;
      const trackingStatus: 'Active' | 'Searching' = liveHands.length > 0 ? 'Active' : 'Searching';
      const uxPhase = spatialState.uxPhase;
      const microHint = spatialState.microHint;

      // Update React state only on discrete changes to eliminate React re-render overhead
      if (
        gestureName !== engine.lastPrevGesture ||
        roundedConfidence !== engine.lastPrevConfidence ||
        trackingStatus !== engine.lastPrevStatus ||
        uxPhase !== engine.lastPrevPhase ||
        microHint !== engine.lastPrevHint
      ) {
        engine.lastPrevGesture = gestureName;
        engine.lastPrevConfidence = roundedConfidence;
        engine.lastPrevStatus = trackingStatus;
        engine.lastPrevPhase = uxPhase;
        engine.lastPrevHint = microHint;

        onHUDUpdate({
          gesture: gestureName,
          confidence: roundedConfidence,
          isLive: liveHands.length > 0,
          trackingStatus,
          uxPhase,
          microHint,
        });
      }
    };

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [videoRef, landmarkerRef, isVirtualControl, onHUDUpdate]);

  return (
    <canvas
      ref={canvasRef}
      id="fx"
      aria-hidden="true"
      className={`fixed inset-0 w-full h-full select-none z-[2] ${
        isVirtualControl ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
      }`}
    />
  );
};
