"use client";

import { useEffect, useRef } from 'react';
import { Message } from '@/types';
import MessageBubble from './MessageBubble';
import { Terminal, Database, Shield, BookOpen, ArrowUpRight } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onPromptClick?: (prompt: string) => void;
}

export default function ChatWindow({ messages, isLoading, onPromptClick }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = scrollRef.current;
      const isScrolledUp = scrollHeight - clientHeight - scrollTop > 120;
      
      if (!isScrolledUp) {
        scrollRef.current.scrollTo({
          top: scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [messages, isLoading]);

  const quickPrompts = [
    {
      title: "QUERY // OBSIDIAN VAULT",
      description: "Synthesize key architecture concepts and active notes in your local Obsidian vault.",
      prompt: "Synthesize the key architectural concepts and active notes in my Obsidian vault.",
      icon: BookOpen
    },
    {
      title: "SECURITY // AD PLAYBOOKS",
      description: "Review domain reconnaissance and attack methodology for enterprise security.",
      prompt: "What are the core Active Directory attack steps and AS-REP roasting vectors in our playbook?",
      icon: Shield
    },
    {
      title: "COMMAND // TACTICAL TEMPLATES",
      description: "Lookup high-speed network scanning and web fuzzing templates.",
      prompt: "Show me the top recommended Nmap and FFUF command templates with parameter placeholders.",
      icon: Terminal
    },
    {
      title: "AGENT // EXECUTION RUNTIME",
      description: "Launch autonomous agent with terminal sandbox and tool calling.",
      prompt: "claude --model gemma4:31b-cloud --agent synapse",
      icon: Database
    }
  ];

  if (messages.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        overflowY: 'auto'
      }}>
        <div style={{
          maxWidth: '820px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {/* Hero Icon Badge */}
          <div style={{
            width: '48px',
            height: '48px',
            background: '#D0FF14',
            border: '2px solid #0F0F0F',
            boxShadow: '4px 4px 0px #0F0F0F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            color: '#0F0F0F'
          }}>
            <Terminal size={24} />
          </div>

          {/* Heading */}
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            color: '#0F0F0F',
            marginBottom: '10px',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.02em'
          }}>
            SYNAPSE_OS // KERNEL CONSOLE
          </h2>

          <p style={{
            fontSize: '0.92rem',
            color: '#52525B',
            maxWidth: '560px',
            lineHeight: 1.55,
            marginBottom: '32px'
          }}>
            Local-first cognitive operator connected to PostgreSQL pgvector and local Obsidian vault. Enter any technical query or choose a playbook below.
          </p>

          {/* Quick Action Matrix Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '14px',
            width: '100%',
            textAlign: 'left'
          }}>
            {quickPrompts.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => onPromptClick && onPromptClick(item.prompt)}
                  className="brutalist-card"
                  style={{
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      background: '#F4F4F5',
                      border: '1px solid #0F0F0F',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0F0F0F'
                    }}>
                      <Icon size={14} />
                    </div>
                    <ArrowUpRight size={14} color="#71717A" />
                  </div>

                  <div>
                    <div style={{
                      fontSize: '0.78rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      color: '#0F0F0F',
                      marginBottom: '4px'
                    }}>
                      {item.title}
                    </div>
                    <div style={{
                      fontSize: '0.78rem',
                      color: '#52525B',
                      lineHeight: 1.45
                    }}>
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        maxWidth: '860px',
        margin: '0 auto',
        width: '100%'
      }}
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isStreaming={isLoading && message === messages[messages.length - 1] && message.role === 'assistant'}
        />
      ))}
    </div>
  );
}
