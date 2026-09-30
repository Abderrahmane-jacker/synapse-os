"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Radio, Monitor, Bell, Ear, Mic, Send, Sparkles, RotateCcw, Eye } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { ttsEngine } from '@/lib/tts';

interface NexusBottomDockProps {
  onSendMessage?: (msg: string) => void;
  onVoiceToggle?: () => void;
  onResetView?: () => void;
  onAgentRun?: () => void;
  onSpeechListenChange?: (isListening: boolean) => void;
  isLoading?: boolean;
  isResponding?: boolean;
  isSpeaking?: boolean;
  isVoiceActive?: boolean;
  isCanvasMode?: boolean;
  onToggleCanvasMode?: () => void;
  isVisionMode?: boolean;
  onToggleVisionMode?: () => void;
}

export default function NexusBottomDock({
  onSendMessage,
  onVoiceToggle,
  onResetView,
  onAgentRun,
  onSpeechListenChange,
  isLoading = false,
  isResponding = false,
  isSpeaking = false,
  isVoiceActive = true,
  isCanvasMode = false,
  onToggleCanvasMode,
  isVisionMode = false,
  onToggleVisionMode
}: NexusBottomDockProps) {
  const [input, setInput] = useState("");
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  const [assistantName, setAssistantName] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('nexus_settings');
        if (raw) return JSON.parse(raw).assistantName || 'Synapse';
      } catch (e) {}
    }
    return 'Synapse';
  });
  const silenceTimerRef = useRef<any>(null);

  const handleSend = useCallback((textToSend?: string) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const targetMsg = textToSend || input;
    if (targetMsg.trim() && onSendMessage) {
      onSendMessage(targetMsg.trim());
      setInput("");
    }
  }, [input, onSendMessage]);

  const handleTranscript = useCallback((transcribedText: string) => {
    if (isLoading || isSpeaking) return;

    let trimmed = transcribedText.trim();
    
    if (trimmed.toLowerCase().startsWith('synapse') || trimmed.toLowerCase().startsWith('3awa')) {
      trimmed = trimmed.replace(/^(synapse|3awa)/i, '').replace(/^[,.\s]+/, '').trim();
    }
    
    if (trimmed) {
      const lower = trimmed.toLowerCase().replace(/[.,!?]+$/, '');
      if (lower === 'thank you' || lower === 'nevermind' || lower === 'cancel') {
        setInput("");
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        if (ttsEngine && isVoiceActive) {
          ttsEngine.speak("Acknowledged, operator.");
        }
        return;
      }

      setInput(trimmed);

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      silenceTimerRef.current = setTimeout(() => {
        if (trimmed && onSendMessage) {
          onSendMessage(trimmed);
          setInput("");
        }
      }, 1200);
    }
  }, [onSendMessage, isLoading, isSpeaking, isVoiceActive]);

  const { isListening, errorMessage, toggleListening } = useSpeechRecognition({
    onTranscript: handleTranscript
  });

  useEffect(() => {
    if (onSpeechListenChange) {
      onSpeechListenChange(isListening);
    }
  }, [isListening, onSpeechListenChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      zIndex: 50,
      pointerEvents: 'auto'
    }}>
      {/* Reset View Button */}
      {onResetView && (
        <button
          type="button"
          onClick={onResetView}
          title="Reset Graph View"
          style={{
            width: '42px',
            height: '42px',
            background: '#FFFFFF',
            border: '2px solid #0F0F0F',
            boxShadow: '3px 3px 0px #0F0F0F',
            color: '#0F0F0F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.1s ease',
            borderRadius: '0px'
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = '#D0FF14';
            e.currentTarget.style.transform = 'translate(-1px, -1px)';
            e.currentTarget.style.boxShadow = '4px 4px 0px #0F0F0F';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = '3px 3px 0px #0F0F0F';
          }}
        >
          <RotateCcw size={16} />
        </button>
      )}

      {/* Terminal Prompt Bar */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: '#FFFFFF',
        border: '2px solid #0F0F0F',
        boxShadow: '4px 4px 0px #0F0F0F',
        borderRadius: '0px',
        padding: '6px 14px',
        width: '460px',
        maxWidth: '75vw',
        transition: 'all 0.12s ease'
      }}>
        {/* Error Banner Toast */}
        {errorMessage && (
          <div style={{
            position: 'absolute',
            top: '-36px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#EF4444',
            border: '2px solid #0F0F0F',
            color: '#FFFFFF',
            padding: '2px 10px',
            fontSize: '0.72rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 800,
            whiteSpace: 'nowrap',
            zIndex: 100,
            boxShadow: '2px 2px 0px #0F0F0F'
          }}>
            [ERROR] {errorMessage}
          </div>
        )}

        {isListening && (
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            fontFamily: "'JetBrains Mono', monospace",
            color: '#0F0F0F',
            background: '#D0FF14',
            border: '1px solid #0F0F0F',
            padding: '1px 6px',
            marginRight: '8px',
            whiteSpace: 'nowrap'
          }}>
            VOICE_REC
          </span>
        )}

        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.85rem',
          color: '#80A300',
          fontWeight: 800,
          marginRight: '6px'
        }}>
          &gt;
        </span>

        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening... will submit on silence' : `Query knowledge vault or ask ${assistantName}...`}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#0F0F0F',
            fontSize: '0.85rem',
            fontFamily: "'JetBrains Mono', monospace",
            boxShadow: 'none'
          }}
        />

        {/* Mic Toggle inside prompt bar */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleListening();
          }}
          title={isListening ? "Stop listening" : "Start hands-free voice mode"}
          style={{
            background: isListening ? '#D0FF14' : '#F4F4F5',
            border: '1px solid #0F0F0F',
            color: '#0F0F0F',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '5px',
            marginLeft: '6px',
            borderRadius: '0px'
          }}
        >
          <Mic size={15} />
        </button>

        {input.trim() && (
          <button
            type="button"
            onClick={() => handleSend()}
            style={{
              background: '#D0FF14',
              border: '2px solid #0F0F0F',
              boxShadow: '2px 2px 0px #0F0F0F',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F0F0F',
              cursor: 'pointer',
              marginLeft: '8px',
              borderRadius: '0px'
            }}
          >
            <Send size={13} />
          </button>
        )}
      </div>

      {/* Brutalist Action Button Strip */}
      <div style={{ display: 'flex', gap: '6px' }}>

        {/* Satellite / Voice TTS */}
        <button
          type="button"
          title={isVoiceActive ? (isSpeaking ? "TTS Voice Speaking..." : "TTS Voice Active (Click to Mute)") : "TTS Voice Muted (Click to Enable)"}
          onClick={onVoiceToggle}
          style={{
            width: '42px', height: '42px',
            background: isSpeaking ? '#D0FF14' : isVoiceActive ? '#E4FF66' : '#FFFFFF',
            border: '2px solid #0F0F0F',
            boxShadow: '3px 3px 0px #0F0F0F',
            color: '#0F0F0F',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: '0px',
            transition: 'all 0.1s'
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'translate(-1px, -1px)';
            e.currentTarget.style.boxShadow = '4px 4px 0px #0F0F0F';
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = '3px 3px 0px #0F0F0F';
          }}
        >
          <Radio size={16} />
        </button>

        {/* Vision Stream Toggle */}
        <button
          type="button"
          title="Vision Stream (Canvas Mode)"
          onClick={() => {
             setActiveBtn(activeBtn === 'vision' ? null : 'vision');
             if (onToggleVisionMode) onToggleVisionMode();
          }}
          style={{
            width: '42px', height: '42px',
            background: isVisionMode ? '#D0FF14' : '#FFFFFF',
            border: '2px solid #0F0F0F',
            boxShadow: '3px 3px 0px #0F0F0F',
            color: '#0F0F0F',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: '0px',
            transition: 'all 0.1s'
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'translate(-1px, -1px)';
            e.currentTarget.style.boxShadow = '4px 4px 0px #0F0F0F';
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = '3px 3px 0px #0F0F0F';
          }}
        >
          <Eye size={16} />
        </button>

        {/* Canvas Display Mode */}
        <button
          type="button"
          title="2D / 3D Canvas Switch"
          onClick={() => {
            setActiveBtn(activeBtn === 'canvas' ? null : 'canvas');
            if (onToggleCanvasMode) onToggleCanvasMode();
          }}
          style={{
            width: '42px', height: '42px',
            background: isCanvasMode ? '#D0FF14' : '#FFFFFF',
            border: '2px solid #0F0F0F',
            boxShadow: '3px 3px 0px #0F0F0F',
            color: '#0F0F0F',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: '0px',
            transition: 'all 0.1s'
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'translate(-1px, -1px)';
            e.currentTarget.style.boxShadow = '4px 4px 0px #0F0F0F';
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = '3px 3px 0px #0F0F0F';
          }}
        >
          <Monitor size={16} />
        </button>

        {/* Agent Run Button */}
        <button
          type="button"
          title="Launch Autonomous Agent"
          onClick={onAgentRun}
          style={{
            width: '42px', height: '42px',
            background: '#D0FF14',
            border: '2px solid #0F0F0F',
            boxShadow: '3px 3px 0px #0F0F0F',
            color: '#0F0F0F',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: '0px',
            transition: 'all 0.1s'
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = '#E4FF66';
            e.currentTarget.style.transform = 'translate(-1px, -1px)';
            e.currentTarget.style.boxShadow = '4px 4px 0px #0F0F0F';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = '#D0FF14';
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = '3px 3px 0px #0F0F0F';
          }}
        >
          <Sparkles size={16} />
        </button>

      </div>
    </div>
  );
}
