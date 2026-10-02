import React from 'react';

interface CameraLayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isAltPalette: boolean;
  isSessionActive: boolean;
}

export const CameraLayer: React.FC<CameraLayerProps> = ({
  videoRef,
  isAltPalette,
  isSessionActive,
}) => {
  return (
    <video
      ref={videoRef}
      id="cam"
      playsInline
      muted
      aria-hidden="true"
      className={`fixed inset-0 w-full h-full object-cover -scale-x-100 pointer-events-none select-none transition-all duration-1000 ease-out ${
        isSessionActive ? 'opacity-100 filter-none' : 'opacity-0 blur-md'
      } ${
        isAltPalette
          ? 'saturate-90 contrast-[1.02] brightness-80 sepia-12 hue-rotate--8'
          : 'saturate-90 contrast-[1.02] brightness-80'
      }`}
    />
  );
};
