import { Mic, MicOff } from 'lucide-react';
import { useEffect } from 'react';

interface VoiceButtonProps {
  isListening: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function VoiceButton({ isListening, onToggle, disabled }: VoiceButtonProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={isListening ? "Stop recording" : "Start voice input"}
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isListening ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
        color: isListening ? 'var(--accent-error)' : 'var(--text-muted)',
        transition: 'all var(--transition-fast)',
        animation: isListening ? 'pulseRecording 2s infinite' : 'none',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseOver={(e) => {
        if (!disabled && !isListening) {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.background = 'var(--bg-input)';
        }
      }}
      onMouseOut={(e) => {
        if (!disabled && !isListening) {
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {isListening ? <Mic size={20} fill="currentColor" /> : <Mic size={20} />}
    </button>
  );
}
