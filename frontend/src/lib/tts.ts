// Universal Spoken Words TTS Engine for Nexus OS
// Integrates Edge High-Definition Neural Voice Proxy + Web Speech API Fallback

interface NexusSettings {
  ttsVoice?: string;
  ttsSpeed?: number;
  ttsAutoSpeak?: boolean;
  ttsThinkingAnnounce?: boolean;
}

function getSavedSettings(): NexusSettings {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem("nexus_settings");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

class TTSEngine {
  private synth: SpeechSynthesis | null = null;
  private isVoiceEnabled: boolean = true;
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public unlockAudio() {
    if (typeof window === 'undefined') return;
    try {
      if (this.synth) {
        this.synth.resume();
        const dummy = new SpeechSynthesisUtterance('');
        dummy.volume = 0;
        this.synth.speak(dummy);
      }
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

  public speak(text: string, onEnd?: () => void) {
    const settings = getSavedSettings();
    const autoSpeak = settings.ttsAutoSpeak ?? true;

    if (!this.isVoiceEnabled || !autoSpeak || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    this.stop();
    this.unlockAudio();

    // Clean text for vocal delivery
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code snippet.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[#*_\-\\`~]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const voice = settings.ttsVoice || "en-US-AndrewNeural";
    const speed = settings.ttsSpeed ?? 1.0;
    const ratePct = Math.round((speed - 1.0) * 100);
    const rateStr = `${ratePct >= 0 ? '+' : ''}${ratePct}%`;

    // Attempt 1: High-Definition Edge Neural Voice Backend Proxy
    this.speakWithBackendProxy(cleanText, voice, rateStr, speed, onEnd);
  }

  private async speakWithBackendProxy(text: string, voice: string, rateStr: string, speedFloat: number, onEnd?: () => void) {
    if (typeof window === 'undefined' || !this.isVoiceEnabled) {
      if (onEnd) onEnd();
      return;
    }

    try {
      const backendApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const proxyUrl = `${backendApiUrl}/api/voice/tts`;
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, rate: rateStr })
      });

      if (!response.ok) {
        throw new Error(`TTS POST failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.playbackRate = 1.0;

      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        if (onEnd) onEnd();
      };

      this.currentAudio.onerror = (err) => {
        URL.revokeObjectURL(audioUrl);
        console.warn('Backend Neural TTS Proxy error, trying WebSpeech fallback:', err);
        this.currentAudio = null;
        this.speakWithWebSpeechFallback(text, voice, speedFloat, onEnd);
      };

      const playPromise = this.currentAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err?.name === 'AbortError') {
            // Playback was intentionally stopped or interrupted
            if (onEnd) onEnd();
            return;
          }
          console.warn('Audio playback blocked or failed, trying WebSpeech fallback:', err);
          this.currentAudio = null;
          this.speakWithWebSpeechFallback(text, voice, speedFloat, onEnd);
        });
      }
    } catch (e) {
      console.warn('Backend TTS Proxy Exception:', e);
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
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = this.synth.getVoices();

      // Find matching voice name or english voice
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
    if (this.synth) {
      try { this.synth.cancel(); } catch (e) {}
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio = null;
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
