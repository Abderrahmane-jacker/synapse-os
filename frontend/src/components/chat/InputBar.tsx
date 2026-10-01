"use client";

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ArrowUp, Terminal, Sparkles, Image as ImageIcon, X, Search, Zap } from 'lucide-react';
import VoiceButton from '../voice/VoiceButton';
import { useVoice } from '@/hooks/useVoice';

interface InputBarProps {
  onSend: (message: string, image?: string) => void;
  isLoading: boolean;
}

export default function InputBar({ onSend, isLoading }: InputBarProps) {
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isListening, transcript, startListening, stopListening, isSupported } = useVoice();
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nexus_initial_prompt');
      if (stored) {
        setInput(stored);
        localStorage.removeItem('nexus_initial_prompt');
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if ((input.trim() || image) && !isLoading) {
      onSend(input, image || undefined);
      setInput('');
      setImage(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertQuickCmd = (cmd: string) => {
    setInput(cmd);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const canSend = (input.trim().length > 0 || image !== null) && !isLoading;

  return (
    <div style={{
      padding: '0 20px 20px 20px',
      width: '100%',
      maxWidth: '860px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 20
    }}>
      
      {/* Quick Action Badges / CLI Triggers */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '10px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <button
          onClick={() => insertQuickCmd('claude --model deepseek-r1:8b --agent synapse ')}
          style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            padding: '4px 10px',
            background: '#FFFFFF',
            border: '1px solid #0F0F0F',
            color: '#0F0F0F',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = '#D0FF14';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = '#FFFFFF';
          }}
        >
          <Sparkles size={12} /> RUN_CLAUDE_AGENT
        </button>

        <button
          onClick={() => insertQuickCmd('/run ')}
          style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            padding: '4px 10px',
            background: '#FFFFFF',
            border: '1px solid #0F0F0F',
            color: '#0F0F0F',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = '#D0FF14';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = '#FFFFFF';
          }}
        >
          <Terminal size={12} /> /EXEC_BASH
        </button>

        <button
          onClick={() => insertQuickCmd('/search ')}
          style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            padding: '4px 10px',
            background: '#FFFFFF',
            border: '1px solid #0F0F0F',
            color: '#0F0F0F',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = '#D0FF14';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = '#FFFFFF';
          }}
        >
          <Search size={12} /> /QUERY_VAULT
        </button>
      </div>

      {/* Brutalist Command Box */}
      <div 
        style={{ 
          padding: '10px 14px',
          display: 'flex', 
          alignItems: 'flex-end', 
          gap: '10px',
          background: '#FFFFFF',
          border: '2px solid #0F0F0F',
          boxShadow: isFocused ? '6px 6px 0px #0F0F0F' : '4px 4px 0px #0F0F0F',
          transition: 'all 0.1s ease'
        }}
      >
        {/* Voice Input Button */}
        {isSupported && (
          <div style={{ paddingBottom: '3px' }}>
            <VoiceButton 
              isListening={isListening} 
              onToggle={isListening ? stopListening : startListening} 
              disabled={isLoading}
            />
          </div>
        )}

        {/* Attachment Upload Button */}
        <div style={{ paddingBottom: '3px' }}>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            style={{ display: 'none' }} 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            style={{
              width: '32px',
              height: '32px',
              background: '#FFFFFF',
              color: '#0F0F0F',
              border: '1px solid #0F0F0F',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#F4F4F5';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = '#FFFFFF';
            }}
            title="Attach image"
          >
            <ImageIcon size={15} />
          </button>
        </div>
        
        {/* Text Area & Image Preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {image && (
            <div style={{ padding: '6px 4px 10px 4px', position: 'relative', display: 'inline-block', alignSelf: 'flex-start' }}>
              <img 
                src={image} 
                alt="Upload preview" 
                style={{ maxHeight: '90px', border: '2px solid #0F0F0F' }} 
              />
              <button
                onClick={() => setImage(null)}
                style={{
                  position: 'absolute', top: '2px', right: '0px',
                  background: '#0F0F0F', color: '#FFFFFF',
                  border: '1px solid #0F0F0F', width: '22px', height: '22px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={13} />
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Type query or command (Shift+Enter for newline)..."
            rows={1}
            disabled={isLoading}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#0F0F0F',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.88rem',
              lineHeight: 1.5,
              resize: 'none',
              maxHeight: '180px',
              padding: '6px 4px',
              outline: 'none'
            }}
          />
        </div>

        {/* Send Action Button */}
        <div style={{ paddingBottom: '3px' }}>
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              width: '34px',
              height: '34px',
              background: canSend ? '#D0FF14' : '#F4F4F5',
              color: '#0F0F0F',
              border: '2px solid #0F0F0F',
              boxShadow: canSend ? '2px 2px 0px #0F0F0F' : 'none',
              cursor: canSend ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.1s ease'
            }}
            title="Execute query (Enter)"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
