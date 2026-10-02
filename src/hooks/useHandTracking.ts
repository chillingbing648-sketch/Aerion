import { useState, useRef, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const MEDIAPIPE_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_ASSET_PATH = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export interface UseHandTrackingResult {
  landmarkerRef: React.RefObject<HandLandmarker | null>;
  isModelLoading: boolean;
  modelError: string | null;
  loadModel: () => Promise<boolean>;
  cleanupModel: () => void;
}

export function useHandTracking(): UseHandTrackingResult {
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const cleanupModel = useCallback(() => {
    if (landmarkerRef.current) {
      try {
        landmarkerRef.current.close();
      } catch (err) {
        console.warn('Error closing HandLandmarker:', err);
      }
      landmarkerRef.current = null;
    }
  }, []);

  const loadModel = useCallback(async (): Promise<boolean> => {
    if (landmarkerRef.current) return true;

    setIsModelLoading(true);
    setModelError(null);

    try {
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);

      const createLandmarker = async (delegate: 'GPU' | 'CPU') => {
        return await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_PATH,
            delegate: delegate,
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      };

      let lm: HandLandmarker;
      try {
        lm = await createLandmarker('GPU');
      } catch (gpuErr) {
        console.warn('GPU delegate failed for HandLandmarker, falling back to CPU:', gpuErr);
        lm = await createLandmarker('CPU');
      }

      landmarkerRef.current = lm;
      setIsModelLoading(false);
      return true;
    } catch (err: any) {
      console.warn('Hand tracking initialization note:', err?.message || err);
      setModelError(err?.message || 'Hand tracking model could not be initialized.');
      setIsModelLoading(false);
      return false;
    }
  }, []);

  return {
    landmarkerRef,
    isModelLoading,
    modelError,
    loadModel,
    cleanupModel,
  };
}
