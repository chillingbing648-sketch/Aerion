import React from 'react';
import { Camera, Loader2, RefreshCw, MousePointer } from 'lucide-react';

interface GateModalProps {
  isOpen: boolean;
  isLoading: boolean;
  loadingMessage?: string;
  error?: string | null;
  onStart: () => void;
  onStartVirtual: () => void;
}

export const GateModal: React.FC<GateModalProps> = ({
  isOpen,
  isLoading,
  loadingMessage,
  error,
  onStart,
  onStartVirtual,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#040608]/70 backdrop-blur-md p-4 transition-all duration-700"
    >
      <div className="w-full max-w-[370px] glass-surface rounded-[24px] p-8 text-[#f2f7ff] shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[24px] font-semibold tracking-tight leading-none text-white">
            AERION
          </h1>
          <span className="text-[11px] text-[#ebf3ff]/40 tracking-wide font-medium">
            Spatial Interface
          </span>
        </div>

        <p className="text-[13px] text-[#ebf3ff]/65 leading-relaxed my-5 max-w-[32ch]">
          A living digital universe floating in your physical space. Control holographic matter, air trails, and optical lenses with natural hand movement.
        </p>

        <div className="space-y-2">
          <button
            onClick={onStart}
            disabled={isLoading}
            className="w-full py-3.5 px-5 rounded-full font-medium text-[13px] text-white bg-white/14 hover:bg-white/22 active:bg-white/28 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--ac)]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[var(--ac)]" />
                <span>{loadingMessage || 'Initializing…'}</span>
              </>
            ) : error ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-[var(--ac)]" />
                <span>Retry camera</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5 text-[var(--ac)]" />
                <span>Enable camera</span>
              </>
            )}
          </button>

          <button
            onClick={onStartVirtual}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-full font-medium text-[12px] text-[#ebf3ff]/70 hover:text-white bg-white/5 hover:bg-white/10 active:bg-white/15 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--ac)]"
          >
            <MousePointer className="w-3 h-3 text-[var(--ac)]" />
            <span>Virtual Spatial Control</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-white/4 border border-white/8 text-[11.5px] text-[#ebf3ff]/75 leading-relaxed animate-in fade-in duration-300">
            {error}
          </div>
        )}

        <div className="mt-5 pt-3.5 border-t border-white/6 flex items-center justify-between text-[10px] text-[#ebf3ff]/35 tracking-wide">
          <span>Local Machine Vision</span>
          <span>·</span>
          <span>Zero Video Transmission</span>
        </div>
      </div>
    </div>
  );
};
