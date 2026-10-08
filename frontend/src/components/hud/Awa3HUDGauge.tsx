import React, { useState, useEffect } from 'react';

interface Awa3HUDGaugeProps {
  status?: string;
  modelName?: string;
  onToggleVoice?: () => void;
}

export default function Awa3HUDGauge({
  status = "ONLINE",
  modelName = "GEMMA-4-31B-CLOUD",
  onToggleVoice
}: Awa3HUDGaugeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [assistantName, setAssistantName] = useState('Synapse');

  useEffect(() => {
    const updateName = () => {
      try {
        const raw = localStorage.getItem('nexus_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.assistantName) setAssistantName(parsed.assistantName);
        }
      } catch (e) {}
    };

    updateName();
    window.addEventListener('nexus_settings_changed', updateName);
    window.addEventListener('storage', updateName);
    return () => {
      window.removeEventListener('nexus_settings_changed', updateName);
      window.removeEventListener('storage', updateName);
    };
  }, []);

  const isListen = status.includes("LISTEN");
  const isThinking = status.includes("THINKING");
  const isResponding = status.includes("RESPONDING") || status.includes("WRITING");

  const statusBg = isListen ? '#E4FF66' : isThinking ? '#FEF08A' : isResponding ? '#D0FF14' : '#FFFFFF';
  const spinSpeed = isThinking ? '3s' : isListen ? '6s' : '18s';

  return (
    <div
      onClick={onToggleVoice}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        right: '24px',
        bottom: '24px',
        transform: isHovered ? 'translate(-2px, -2px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        zIndex: 35,
        pointerEvents: 'auto',
        userSelect: 'none',
        cursor: 'pointer',
        transition: 'transform 0.12s ease'
      }}
      title="Click to toggle Voice STT Intelligence"
    >
      {/* Outer Dial Container */}
      <div style={{
        position: 'relative',
        width: '160px',
        height: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FFFFFF',
        border: '2px solid #0F0F0F',
        boxShadow: isHovered ? '6px 6px 0px #0F0F0F' : '4px 4px 0px #0F0F0F',
        transition: 'box-shadow 0.12s ease'
      }}>
        {/* Layer 1: Clockwise Rotating Technical Ticks */}
        <svg
          width="160" height="160" viewBox="0 0 160 160"
          style={{
            position: 'absolute', top: 0, left: 0,
            animation: `spinCW ${spinSpeed} linear infinite`,
            willChange: 'transform'
          }}
        >
          {/* Outer Dashed Border */}
          <circle
            cx="80" cy="80" r="70"
            fill="none"
            stroke="#0F0F0F"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />

          {/* Accent Telemetry Arcs */}
          <path
            d="M 40 40 A 55 55 0 0 1 120 40"
            fill="none"
            stroke="#80A300"
            strokeWidth="2.5"
            strokeLinecap="square"
          />
          <path
            d="M 120 120 A 55 55 0 0 1 40 120"
            fill="none"
            stroke="#80A300"
            strokeWidth="2.5"
            strokeLinecap="square"
          />
        </svg>

        {/* Center Technical Readout */}
        <div style={{
          textAlign: 'center',
          zIndex: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '8px'
        }}>
          <div style={{
            fontSize: '0.62rem',
            fontFamily: "'JetBrains Mono', monospace",
            color: '#71717A',
            letterSpacing: '0.1em',
            fontWeight: 700
          }}>
            SYSTEM // GAUGED
          </div>

          <h2
            suppressHydrationWarning
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '1rem',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#0F0F0F',
              marginTop: '2px'
            }}
          >
            {assistantName.toUpperCase()}
          </h2>

          <span style={{
            fontSize: '0.58rem',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.08em',
            color: '#0F0F0F',
            marginTop: '4px',
            background: isHovered ? '#D0FF14' : '#F4F4F5',
            border: '1px solid #0F0F0F',
            padding: '1px 6px',
            fontWeight: 700
          }}>
            {isHovered ? 'TOGGLE_VOICE' : 'CORE_ACTIVE'}
          </span>
        </div>
      </div>

      {/* Clinical Telemetry Status Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.7rem',
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 800,
        letterSpacing: '0.08em',
        color: '#0F0F0F',
        background: statusBg,
        border: '2px solid #0F0F0F',
        boxShadow: '2px 2px 0px #0F0F0F',
        padding: '4px 10px'
      }}>
        <span style={{
          width: '7px',
          height: '7px',
          background: '#0F0F0F',
          display: 'inline-block'
        }} />
        {status}
      </div>

      {/* Model Parameter Strip */}
      <div style={{
        fontSize: '0.65rem',
        fontFamily: "'JetBrains Mono', monospace",
        color: '#0F0F0F',
        background: '#FFFFFF',
        border: '1px solid #0F0F0F',
        padding: '3px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontWeight: 700
      }}>
        <span style={{ color: '#80A300' }}>■</span>
        {modelName}
      </div>

      <style>{`
        @keyframes spinCW {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
