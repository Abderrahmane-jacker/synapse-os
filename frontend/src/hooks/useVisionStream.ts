import { useState, useRef, useCallback } from 'react';

export function useVisionStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor'
        } as any,
        audio: false
      });
      
      streamRef.current = stream;
      
      // Listen for user clicking "Stop sharing" in browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopStream();
      };

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      videoRef.current = video;

      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;

      setIsStreaming(true);
    } catch (err) {
      console.error("Error accessing screen for vision stream:", err);
      setIsStreaming(false);
    }
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      return null;
    }
    
    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    
    if (ctx) {
      // Scale down the image to save bandwidth and LLM context size
      // Let's cap max dimension to 1024
      let width = v.videoWidth;
      let height = v.videoHeight;
      const MAX_DIM = 1024;
      
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      c.width = width;
      c.height = height;
      ctx.drawImage(v, 0, 0, width, height);
      
      // Get JPEG base64
      return c.toDataURL('image/jpeg', 0.6); 
    }
    return null;
  }, []);

  const stopStream = useCallback(() => {
    setIsStreaming(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    videoRef.current = null;
    canvasRef.current = null;
  }, []);

  const toggleStream = useCallback(() => {
    if (isStreaming) {
      stopStream();
    } else {
      startStream();
    }
  }, [isStreaming, startStream, stopStream]);

  return {
    isStreaming,
    startStream,
    stopStream,
    toggleStream,
    captureFrame
  };
}
