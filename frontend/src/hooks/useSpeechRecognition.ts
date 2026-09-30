"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onWakeWord?: (command: string) => void;
  wakeWord?: string;
  lang?: string;
  autoStart?: boolean;
}

export function useSpeechRecognition({
  onTranscript,
  onWakeWord,
  wakeWord = 'synapse',
  lang = 'en-US',
  autoStart = false
}: SpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const restartTimerRef = useRef<any>(null);

  const onTranscriptRef = useRef(onTranscript);
  const onWakeWordRef = useRef(onWakeWord);
  const shouldListenRef = useRef(autoStart);
  const isPausedRef = useRef(false);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onWakeWordRef.current = onWakeWord; }, [onWakeWord]);

  // Force bypass native speech to route ALL audio to backend Whisper AI
  const hasNativeSpeech = false;

  const processText = useCallback((rawText: string, isFinal: boolean = true) => {
    const trimmed = rawText.trim();
    if (trimmed) {
      setTranscript(trimmed);
      if (onTranscriptRef.current) {
        onTranscriptRef.current(trimmed, isFinal);
      }
      if (wakeWord) {
        const lower = trimmed.toLowerCase();
        const wIdx = lower.indexOf(wakeWord.toLowerCase());
        if (wIdx !== -1) {
          const commandAfter = trimmed.substring(wIdx + wakeWord.length).replace(/^[,.\s]+/, '').trim();
          if (onWakeWordRef.current) {
            onWakeWordRef.current(commandAfter);
          }
        }
      }
    }
  }, [wakeWord]);

  // Send recorded audio snippet to backend API (/api/voice/transcribe)
  const sendAudioToBackend = useCallback(async (audioBlob: Blob) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('file', audioBlob, 'speech.webm');

      const res = await fetch(`${backendUrl}/api/voice/transcribe`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          processText(data.text, true);
        }
      }
    } catch (err) {
      console.warn('Backend audio transcription error:', err);
    }
  }, [processText]);

  // MediaRecorder + Web Audio API VAD (Voice Activity Detection) Fallback
  const startMediaRecorderFallback = useCallback(async () => {
    if (isPausedRef.current) return;
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const stream = streamRef.current;
      audioChunksRef.current = [];

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const recorder = new MediaRecorder(stream);

      let hasSpoken = false;
      let silenceStart: number | null = null;
      let vadInterval: any = null;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (vadInterval) clearInterval(vadInterval);
        if (audioContextRef.current) {
          const ctx = audioContextRef.current;
          audioContextRef.current = null;
          if ((ctx.state as string) !== 'closed' && (ctx.state as string) !== 'closing') {
            ctx.close().catch(() => {});
          }
        }
        // DO NOT stop the stream tracks here so we can reuse the stream!

        if (audioChunksRef.current.length > 0 && hasSpoken) {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          sendAudioToBackend(blob);
        }

        // Restart recording if hands-free is still enabled
        if (shouldListenRef.current && !isPausedRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (shouldListenRef.current && !isPausedRef.current) {
              startMediaRecorderFallback();
            }
          }, 400);
        }
      };

      // VAD Loop: Check speech volume every 100ms
      vadInterval = setInterval(() => {
        if (!audioCtx || (audioCtx.state as string) === 'closed' || (audioCtx.state as string) === 'closing') return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Speech threshold
        if (average > 14) {
          hasSpoken = true;
          silenceStart = null;
        } else if (hasSpoken) {
          // Silence detected after speech
          if (silenceStart === null) {
            silenceStart = Date.now();
          } else if (Date.now() - silenceStart > 1200) {
            // 1.2s of silence reached -> stop recording & transcribe!
            clearInterval(vadInterval);
            if (recorder.state === 'recording') {
              try { recorder.stop(); } catch (e) {}
            }
          }
        }
      }, 100);

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsListening(true);
      setErrorMessage(null);
    } catch (err: any) {
      console.warn('MediaRecorder VAD error:', err);
      setErrorMessage('Microphone access blocked.');
      setIsListening(false);
    }
  }, [sendAudioToBackend]);

  const stopMediaRecorderFallback = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      if ((ctx.state as string) !== 'closed' && (ctx.state as string) !== 'closing') {
        ctx.close().catch(() => {});
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Native WebSpeech start/stop
  const startNativeSpeech = useCallback(async () => {
    setErrorMessage(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return startMediaRecorderFallback();

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onstart = () => {
      setIsListening(true);
      setErrorMessage(null);
    };

    rec.onresult = (event: any) => {
      let currentTranscript = '';
      let isFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        currentTranscript += res[0].transcript;
        if (res.isFinal) isFinal = true;
      }
      processText(currentTranscript, isFinal);
    };

    rec.onerror = (e: any) => {
      console.warn('Native WebSpeech status:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setErrorMessage('Microphone permission blocked by browser.');
        shouldListenRef.current = false;
        setIsListening(false);
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        // Fall back to VAD MediaRecorder for audio-capture / network issues
        if (shouldListenRef.current && !isPausedRef.current) {
          try { rec.stop(); } catch (err) {}
          startMediaRecorderFallback();
        }
      }
    };

    rec.onend = () => {
      if (shouldListenRef.current && !isPausedRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current && !isPausedRef.current) {
            try {
              rec.start();
            } catch (err) {
              startMediaRecorderFallback();
            }
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = rec;

    try {
      shouldListenRef.current = true;
      rec.start();
      setIsListening(true);
    } catch (err) {
      startMediaRecorderFallback();
    }
  }, [lang, processText, startMediaRecorderFallback]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    isPausedRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    stopMediaRecorderFallback();
    setIsListening(false);
  }, [stopMediaRecorderFallback]);

  const pauseListening = useCallback(() => {
    isPausedRef.current = true;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    stopMediaRecorderFallback();
  }, [stopMediaRecorderFallback]);

  const resumeListening = useCallback(() => {
    if (shouldListenRef.current) {
      isPausedRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (shouldListenRef.current && !isPausedRef.current) {
          if (hasNativeSpeech) {
            startNativeSpeech();
          } else {
            startMediaRecorderFallback();
          }
        }
      }, 500);
    }
  }, [hasNativeSpeech, startNativeSpeech, startMediaRecorderFallback]);

  const startListening = useCallback(() => {
    shouldListenRef.current = true;
    isPausedRef.current = false;
    if (hasNativeSpeech) {
      startNativeSpeech();
    } else {
      startMediaRecorderFallback();
    }
  }, [hasNativeSpeech, startNativeSpeech, startMediaRecorderFallback]);

  const toggleListening = useCallback(() => {
    if (shouldListenRef.current || isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Auto-start on mount if enabled
  useEffect(() => {
    if (autoStart) {
      startListening();
    }
    return () => {
      stopListening();
    };
  }, []);

  return {
    isListening,
    transcript,
    isSupported: true,
    errorMessage,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    toggleListening
  };
}
