"use client";

import React, { useState } from 'react';
import { X, Folder, Cpu, Terminal, Play, Shield } from 'lucide-react';

interface DirectorySelectorModalProps {
  onClose: () => void;
  onLaunch: (command: string, cwd: string) => void;
}

function getSavedSettings() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem("nexus_settings");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export default function DirectorySelectorModal({ onClose, onLaunch }: DirectorySelectorModalProps) {
  const settings = getSavedSettings();
  
  const [cwd, setCwd] = useState<string>(() => settings.vaultPath || '');
  const [model, setModel] = useState<string>(() => settings.selectedModel || '');
  const [agent, setAgent] = useState<string>('synapse');

  const buildCommand = () => {
    let cmd = 'claude';
    if (model && model.trim()) {
      cmd += ` --model ${model.trim()}`;
    }
    if (agent && agent.trim()) {
      cmd += ` --agent ${agent.trim()}`;
    }
    return cmd;
  };

  const handleLaunchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cwd.trim()) {
      alert("Working Directory Path is required.");
      return;
    }
    onLaunch(buildCommand(), cwd.trim());
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 15, 15, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '24px'
    }}>
      <div style={{
        width: '580px',
        maxWidth: '92vw',
        background: '#FFFFFF',
        border: '2px solid #0F0F0F',
        borderRadius: '0px',
        boxShadow: '8px 8px 0px #0F0F0F',
        overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '2px solid #0F0F0F',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#D0FF14',
              border: '2px solid #0F0F0F',
              boxShadow: '2px 2px 0px #0F0F0F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Cpu size={16} color="#0F0F0F" />
            </div>
            <div>
              <div style={{ fontSize: '0.62rem', fontFamily: "'JetBrains Mono', monospace", color: '#71717A', fontWeight: 800 }}>
                [AGENT_ENVIRONMENT]
              </div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0F0F0F', fontWeight: 900 }}>
                LAUNCH AGENT SESSION
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: '#F4F4F5', border: '1px solid #0F0F0F', color: '#0F0F0F', cursor: 'pointer', padding: '4px', fontWeight: 800 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLaunchSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#FFFFFF' }}>
          
          {/* Target Working Directory Path */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#0F0F0F', marginBottom: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
              <Folder size={12} /> TARGET DIRECTORY PATH (REQUIRED)
            </label>
            <input 
              type="text"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="/absolute/path/to/project"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#FFFFFF',
                border: '2px solid #0F0F0F',
                borderRadius: '0px',
                color: '#0F0F0F',
                fontSize: '0.85rem',
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ fontSize: '0.7rem', color: '#71717A', marginTop: '4px', fontFamily: "'JetBrains Mono', monospace" }}>
              Filesystem context where autonomous operations and file edits will execute.
            </div>
          </div>

          {/* Optional Model */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#0F0F0F', marginBottom: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
              <Cpu size={12} /> LLM MODEL IDENTIFIER
            </label>
            <input 
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder=""
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#FFFFFF',
                border: '2px solid #0F0F0F',
                borderRadius: '0px',
                color: '#0F0F0F',
                fontSize: '0.85rem',
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Optional Agent Persona */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#0F0F0F', marginBottom: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
              <Shield size={12} /> AGENT PERSONA
            </label>
            <input 
              type="text"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              placeholder="e.g. synapse"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#FFFFFF',
                border: '2px solid #0F0F0F',
                borderRadius: '0px',
                color: '#0F0F0F',
                fontSize: '0.85rem',
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Generated Command Preview */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 800, color: '#71717A', marginBottom: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
              <Terminal size={12} /> COMPILED CLI COMMAND
            </label>
            <div style={{ 
              padding: '10px 14px', 
              background: '#0F0F0F', 
              border: '2px solid #0F0F0F',
              borderRadius: '0px', 
              color: '#D0FF14',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.84rem',
              fontWeight: 700
            }}>
              {buildCommand()}
            </div>
          </div>

          {/* Footer Submit Button */}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '0px',
              background: '#D0FF14',
              border: '2px solid #0F0F0F',
              boxShadow: '3px 3px 0px #0F0F0F',
              color: '#0F0F0F',
              fontWeight: 900,
              fontSize: '0.85rem',
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '6px',
              letterSpacing: '0.05em',
              transition: 'all 0.1s ease'
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
            <Play size={14} fill="#0F0F0F" /> INITIALIZE AGENT SESSION
          </button>
        </form>
      </div>
    </div>
  );
}
