// Universal Spoken Words TTS Engine for SynapseOS / 3awa-OS
// Integrates Edge High-Definition Neural Voice Proxy + Web Speech API Fallback

interface NexusSettings {
  ttsVoice?: string;
  ttsSpeed?: number;
  ttsAutoSpeak?: boolean;
  ttsThinkingAnnounce?: boolean;
  backendUrl?: string;
}

function getSavedSettings(): NexusSettings {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem("nexus_settings");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function getBackendUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = getSavedSettings();
    if (saved.backendUrl) return saved.backendUrl.replace(/\/$/, "");
    const hostname = window.location.hostname || "localhost";
    return `http://${hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

class TTSEngine {
  private synth: SpeechSynthesis | null = null;
  private isVoiceEnabled: boolean = true;
  private currentAudio: HTMLAudioElement | null = null;
  private isUnlocked: boolean = false;
  private abortController: AbortController | null = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
      }
      // Auto-unlock audio on the first user interaction anywhere in the window
      const unlockListener = () => {
        this.unlockAudio();
        window.removeEventListener('click', unlockListener);
        window.removeEventListener('keydown', unlockListener);
        window.removeEventListener('touchstart', unlockListener);
      };
      window.addEventListener('click', unlockListener);
      window.addEventListener('keydown', unlockListener);
      window.addEventListener('touchstart', unlockListener);
    }
  }

  public unlockAudio() {
    if (typeof window === 'undefined') return;
    this.isUnlocked = true;
    try {
      if (this.synth) {
        this.synth.resume();
        const dummy = new SpeechSynthesisUtterance('');
        dummy.volume = 0;
        this.synth.speak(dummy);
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!this.audioCtx) {
          this.audioCtx = new AudioCtx();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
      }
      // Play a tiny silent buffer to satisfy browser Autoplay Policy permanently
      const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/w==");
      audio.volume = 0.01;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  public setEnabled(enabled: boolean) {
    this.isVoiceEnabled = enabled;
    if (!enabled) {
      this.stop();
    } else {
      this.unlockAudio();
    }
  }

  public isEnabled(): boolean {
    return this.isVoiceEnabled;
  }

  public speak(text: string, onEnd?: () => void, force: boolean = false) {
    const settings = getSavedSettings();
    // Default to true if not explicitly set to false
    const autoSpeak = settings.ttsAutoSpeak !== false;

    if (!this.isVoiceEnabled && !force) {
      if (onEnd) onEnd();
      return;
    }

    if (!autoSpeak && !force) {
      if (onEnd) onEnd();
      return;
    }

    if (!text || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    this.stop();
    this.unlockAudio();

    // Clean text for natural spoken delivery
    let cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/[#*_\-\\`~>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    // If text is very long, limit spoken speech to first 3 sentences or 80 words for instant responsive briefing
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 3) {
      cleanText = sentences.slice(0, 3).join(' ').trim();
    } else {
      const words = cleanText.split(' ');
      if (words.length > 80) {
        cleanText = words.slice(0, 80).join(' ') + '...';
      }
    }

    const voice = settings.ttsVoice || "en-US-AndrewNeural";
    const speed = settings.ttsSpeed ?? 1.0;
    const ratePct = Math.round((speed - 1.0) * 100);
    const rateStr = `${ratePct >= 0 ? '+' : ''}${ratePct}%`;

    this.speakWithBackendProxy(cleanText, voice, rateStr, speed, onEnd);
  }

  private async speakWithBackendProxy(
    text: string, 
    voice: string, 
    rateStr: string, 
    speedFloat: number, 
    onEnd?: () => void
  ) {
    if (typeof window === 'undefined') {
      if (onEnd) onEnd();
      return;
    }

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      const backendUrl = getBackendUrl();
      const proxyUrl = `${backendUrl}/api/voice/tts`;

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, rate: rateStr }),
        signal
      });

      if (!response.ok) {
        throw new Error(`TTS status ${response.status}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      const audio = new Audio(audioUrl);
      this.currentAudio = audio;
      audio.playbackRate = 1.0;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        if (onEnd) onEnd();
      };

      audio.onerror = (err) => {
        URL.revokeObjectURL(audioUrl);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        console.warn('Backend TTS audio error, falling back to WebSpeech:', err);
        this.speakWithWebSpeechFallback(text, voice, speedFloat, onEnd);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err?.name === 'AbortError') {
            if (onEnd) onEnd();
            return;
          }
          console.warn('Audio play failed, falling back to WebSpeech:', err);
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          this.speakWithWebSpeechFallback(text, voice, speedFloat, onEnd);
        });
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.warn('Backend TTS fetch exception, trying WebSpeech:', e);
      this.speakWithWebSpeechFallback(text, voice, speedFloat, onEnd);
    }
  }

  private speakWithWebSpeechFallback(text: string, voiceName: string, speedFloat: number, onEnd?: () => void) {
    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    try {
      this.synth.resume();
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = this.synth.getVoices();

      const matched = voices.find(v => v.name.toLowerCase().includes(voiceName.toLowerCase())) ||
                      voices.find(v => v.lang.startsWith('en'));

      if (matched) utterance.voice = matched;
      utterance.rate = speedFloat;

      utterance.onend = () => { if (onEnd) onEnd(); };
      utterance.onerror = () => { if (onEnd) onEnd(); };

      this.synth.speak(utterance);
    } catch (e) {
      if (onEnd) onEnd();
    }
  }

  public stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
  }

  public isSpeaking(): boolean {
    const isSynthSpeaking = !!(this.synth && (this.synth.speaking || this.synth.pending));
    const isAudioPlaying = !!(this.currentAudio && !this.currentAudio.paused);
    return isSynthSpeaking || isAudioPlaying;
  }
}

export const ttsEngine = typeof window !== 'undefined' ? new TTSEngine() : null;
