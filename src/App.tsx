/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CameraLayer } from './components/CameraLayer';
import { SpatialCanvas } from './components/SpatialCanvas';
import { SpatialHUD, HUDState } from './components/SpatialHUD';
import { GateModal } from './components/GateModal';
import { AuraVignette } from './components/AuraVignette';
import { useCamera } from './hooks/useCamera';
import { useHandTracking } from './hooks/useHandTracking';
import { spatialState } from './systems/spatial/SpatialState';

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isVirtualControl, setIsVirtualControl] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [isAltPalette, setIsAltPalette] = useState<boolean>(false);
  const resetSceneFnRef = useRef<(() => void) | null>(null);

  const [hudState, setHudState] = useState<HUDState>({
    gesture: 'Awaiting Hand',
    confidence: 0,
    isLive: false,
    trackingStatus: 'Searching',
    uxPhase: 'BOOT',
    microHint: null,
  });

  const {
    videoRef,
    error: cameraError,
    startCamera,
    stopCamera,
    clearError,
  } = useCamera();

  const {
    landmarkerRef,
    isModelLoading,
    modelError,
    loadModel,
  } = useHandTracking();

  // Watch palette changes to synchronize video filter
  useEffect(() => {
    const checkPalette = () => {
      setIsAltPalette(spatialState.paletteIndex !== 0);
    };

    const interval = setInterval(checkPalette, 300);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    clearError();
    setLoadingMessage('Emerging environment…');
    const cameraSuccess = await startCamera();
    if (!cameraSuccess) {
      return;
    }

    setLoadingMessage('Initializing spatial field…');
    const modelSuccess = await loadModel();
    if (!modelSuccess) {
      stopCamera();
      return;
    }

    setIsVirtualControl(false);
    setTimeout(() => {
      setIsSessionActive(true);
      spatialState.setMicroHint('AERION ONLINE', 2200);
    }, 350);
  };

  const handleStartVirtual = () => {
    clearError();
    setIsVirtualControl(true);
    setIsSessionActive(true);
    spatialState.setMicroHint('VIRTUAL SPATIAL MODE', 2200);
  };

  const handleToggleCamera = async () => {
    setLoadingMessage('Connecting camera…');
    const cameraSuccess = await startCamera();
    if (cameraSuccess) {
      const modelSuccess = await loadModel();
      if (modelSuccess) {
        setIsVirtualControl(false);
        spatialState.setMicroHint('CAMERA ACTIVE', 2200);
      }
    }
  };

  const handleHUDUpdate = useCallback((newHUD: HUDState) => {
    setHudState(newHUD);
  }, []);

  const handleResetRegister = useCallback((resetFn: () => void) => {
    resetSceneFnRef.current = resetFn;
  }, []);

  const handleResetScene = useCallback(() => {
    if (resetSceneFnRef.current) {
      resetSceneFnRef.current();
    }
  }, []);

  const errorMessage = cameraError || modelError;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#05070a]">
      {/* 1. Mirrored Camera Layer with Cinematic Emergence */}
      <CameraLayer
        videoRef={videoRef}
        isAltPalette={isAltPalette}
        isSessionActive={isSessionActive && !isVirtualControl}
      />

      {/* 2. Primary Spatial Canvas Layer */}
      <SpatialCanvas
        videoRef={videoRef}
        landmarkerRef={landmarkerRef}
        isSessionActive={isSessionActive}
        isVirtualControl={isVirtualControl}
        onHUDUpdate={handleHUDUpdate}
        onResetSceneRegister={handleResetRegister}
      />

      {/* 3. Atmospheric Frame Vignette */}
      <AuraVignette />

      {/* 4. Contextual Spatial HUD */}
      {isSessionActive && (
        <SpatialHUD
          hudState={hudState}
          isVirtualControl={isVirtualControl}
          onResetScene={handleResetScene}
          onToggleCamera={handleToggleCamera}
        />
      )}

      {/* 5. Permission & Startup Gate */}
      <GateModal
        isOpen={!isSessionActive}
        isLoading={isModelLoading}
        loadingMessage={loadingMessage}
        error={errorMessage}
        onStart={handleStart}
        onStartVirtual={handleStartVirtual}
      />
    </main>
  );
}
