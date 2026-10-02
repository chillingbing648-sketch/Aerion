import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, X, RotateCcw, MousePointer } from 'lucide-react';
import { spatialState, UXPhase } from '../systems/spatial/SpatialState';

export interface HUDState {
  gesture: string;
  confidence: number;
  isLive: boolean;
  trackingStatus: 'Active' | 'Searching';
  uxPhase: UXPhase;
  microHint: string | null;
}

interface SpatialHUDProps {
  hudState: HUDState;
  isVirtualControl?: boolean;
  onResetScene?: () => void;
  onToggleCamera?: () => void;
}

const PALETTE_NAMES = ['Ice Blue', 'Amber Warmth', 'Auroral Cyan'];

// Clean human-facing gesture labels
const DISPLAY_GESTURES: Record<string, string> = {
  'Awaiting Hand': 'Awaiting Hand',
  'Tracking': 'Tracking',
  'Open Palm': 'Spatial Core',
  'Point': 'Air Trail',
  'Pinch': 'Spatial Lens',
  'Fist': 'Gravity Collapse',
  'Palm Hold': 'Time Dilation',
  'Two Hands': 'Dimensional Portal',
  'Swipe': 'Energy Wave',
};

export const SpatialHUD: React.FC<SpatialHUDProps> = ({
  hudState,
  isVirtualControl = false,
  onResetScene,
  onToggleCamera,
}) => {
  const [showGuide, setShowGuide] = useState(false);
  const prevGestureRef = useRef(hudState.gesture);
  const gestureElRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowGuide(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const displayGesture = DISPLAY_GESTURES[hudState.gesture] || hudState.gesture;

  // Blur-to-sharp morphing animation on gesture change
  useEffect(() => {
    if (prevGestureRef.current !== displayGesture && gestureElRef.current) {
      prevGestureRef.current = displayGesture;
      const el = gestureElRef.current;
      if (el.animate) {
        el.animate(
          [
            { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0px)' },
            { opacity: 0, filter: 'blur(3px)', transform: 'translateY(-2px)' },
          ],
          { duration: 110, easing: 'ease-in', fill: 'forwards' }
        ).onfinish = function () {
          this.cancel();
          el.textContent = displayGesture;
          el.animate(
            [
              { opacity: 0, filter: 'blur(3px)', transform: 'translateY(3px)' },
              { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0px)' },
            ],
            { duration: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
          );
        };
      } else {
        el.textContent = displayGesture;
      }
    }
  }, [displayGesture]);

  const paletteName = PALETTE_NAMES[spatialState.paletteIndex] || 'Ice Blue';
  const isInteracting =
    hudState.gesture !== 'Awaiting Hand' && hudState.gesture !== 'Tracking';
  const isHighEnergy = hudState.uxPhase === 'HIGH_ENERGY';

  return (
    <>
      {/* Top Left: Aerion Spatial Identity */}
      <div
        className="fixed z-10 pointer-events-none select-none text-[#f2f7ff] transition-opacity duration-700"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 26px)',
          left: 'calc(env(safe-area-inset-left, 0px) + 30px)',
          textShadow: '0 1px 12px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div className="text-[12.5px] font-semibold tracking-[-0.015em] leading-tight">
          AERION
        </div>
        <div className="text-[10.5px] text-[#ebf3ff]/45 tracking-[0.01em]">
          Spatial Interface
        </div>
      </div>

      {/* Top Right: Status & Palette */}
      <div
        className="fixed z-10 select-none text-right text-[#f2f7ff] transition-opacity duration-700 pointer-events-auto"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 26px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 30px)',
          textShadow: '0 1px 12px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div className="text-[12px] font-medium flex items-center justify-end gap-2">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full transition-all duration-500 ${
              hudState.isLive
                ? 'bg-[var(--ac)] shadow-[0_0_8px_var(--ac)] opacity-100'
                : 'bg-[var(--ac)] opacity-25'
            }`}
          />
          <span className="text-[#f2f7ff]/90">
            {isVirtualControl ? 'Virtual Control' : hudState.trackingStatus}
          </span>
        </div>
        <div className="text-[10px] text-[#ebf3ff]/40 mt-0.5 tracking-wide flex items-center justify-end gap-1.5">
          <span>{paletteName}</span>
          {isVirtualControl && onToggleCamera && (
            <>
              <span>·</span>
              <button
                onClick={onToggleCamera}
                className="hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
              >
                Use Camera
              </button>
            </>
          )}
        </div>
      </div>

      {/* Center Bottom: Contextual Micro-Hint */}
      {hudState.microHint && (
        <div
          className="fixed z-10 pointer-events-none select-none left-1/2 -translate-x-1/2 text-center text-[#f2f7ff] transition-all duration-500 animate-in fade-in slide-in-from-bottom-2"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
            textShadow: '0 2px 16px rgba(0, 0, 0, 0.75)',
          }}
        >
          <div className="text-[11px] font-medium tracking-[0.06em] uppercase text-[#ebf3ff]/80">
            {hudState.microHint}
          </div>
        </div>
      )}

      {/* Bottom Left: Contextual Gesture State */}
      <div
        className={`fixed z-10 pointer-events-none select-none text-[#f2f7ff] transition-opacity duration-700 ${
          isHighEnergy
            ? 'opacity-100'
            : isInteracting
            ? 'opacity-90'
            : 'opacity-25 hover:opacity-75'
        }`}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)',
          left: 'calc(env(safe-area-inset-left, 0px) + 30px)',
          textShadow: '0 1px 12px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div className="text-[9.5px] font-medium tracking-[0.06em] uppercase text-[#ebf3ff]/45">
          Interaction
        </div>
        <div
          ref={gestureElRef}
          className="text-[14px] font-medium tracking-tight mt-0.5"
        >
          {displayGesture}
        </div>
      </div>

      {/* Bottom Right: Quick Quiet Actions */}
      <div
        className="fixed z-10 pointer-events-auto flex items-center gap-2"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 30px)',
        }}
      >
        {onResetScene && (
          <button
            onClick={onResetScene}
            title="Recenter digital matter (Space / R)"
            aria-label="Recenter digital matter"
            className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 active:bg-white/16 text-[#ebf3ff]/65 hover:text-[#f2f7ff] border border-white/8 backdrop-blur-md flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--ac)] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => setShowGuide(true)}
          title="Spatial Gestures Guide"
          aria-label="Spatial Gestures Guide"
          className="h-8 px-3 rounded-full bg-white/6 hover:bg-white/12 active:bg-white/16 text-[#ebf3ff]/65 hover:text-[#f2f7ff] border border-white/8 backdrop-blur-md flex items-center gap-1.5 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--ac)] cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Gestures</span>
        </button>
      </div>

      {/* Spatial guide surface */}
      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Spatial Interface Guide"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm glass-surface rounded-2xl p-6 text-[#f2f7ff] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <div>
                <h3 className="text-[13px] font-semibold tracking-tight text-white">
                  Spatial Interactions
                </h3>
                <p className="text-[11px] text-[#ebf3ff]/50">AERION Spatial Vocabulary</p>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#ebf3ff]/50 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-[12px] leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[var(--ac)] mt-2 shrink-0 opacity-80" />
                <div>
                  <span className="font-medium text-white/95">Open Palm</span>
                  <span className="text-[#ebf3ff]/60"> — Awakens the holographic core and celestial orbital ring.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[var(--ac)] mt-2 shrink-0 opacity-80" />
                <div>
                  <span className="font-medium text-white/95">Point</span>
                  <span className="text-[#ebf3ff]/60"> — Primary cursor. Moving draws luminous filaments of Air Trails.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[var(--ac)] mt-2 shrink-0 opacity-80" />
                <div>
                  <span className="font-medium text-white/95">Pinch</span>
                  <span className="text-[#ebf3ff]/60"> — Condenses trails into digital matter, or holds and manipulates objects.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[var(--ac)] mt-2 shrink-0 opacity-80" />
                <div>
                  <span className="font-medium text-white/95">Spatial Lens</span>
                  <span className="text-[#ebf3ff]/60"> — Steady pinch in open space summons an optical refractive glass lens.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[var(--ac)] mt-2 shrink-0 opacity-80" />
                <div>
                  <span className="font-medium text-white/95">Reality Burst</span>
                  <span className="text-[#ebf3ff]/60"> — Fast pinch release unleashes an outward refractive shockwave.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[var(--ac)] mt-2 shrink-0 opacity-80" />
                <div>
                  <span className="font-medium text-white/95">Fist</span>
                  <span className="text-[#ebf3ff]/60"> — Gravitational collapse well. Inhales surrounding particles into a dark core.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[var(--ac)] mt-2 shrink-0 opacity-80" />
                <div>
                  <span className="font-medium text-white/95">Two Hands</span>
                  <span className="text-[#ebf3ff]/60"> — Opens a dimensional portal between hands. Pulling apart expands the field.</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/8 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-1.5 text-[11px] font-medium text-white bg-white/10 hover:bg-white/18 rounded-full transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
