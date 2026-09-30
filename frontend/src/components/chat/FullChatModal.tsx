import React, { useEffect, useState } from 'react';
import { X, MessageSquare, Send, Bot, User } from 'lucide-react';
import { Message } from '@/types';
import { api } from '@/lib/api';

interface FullChatModalProps {
  conversationId: string;
  onClose: () => void;
  onInterceptCommand?: (cmd: string) => void;
}

export default function FullChatModal({ conversationId, onClose, onInterceptCommand }: FullChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const endRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (conversationId) {
      api.chat.getHistory(conversationId)
        .then(setMessages)
        .catch(console.error);
    }
  }, [conversationId]);

  useEffect(() => {
    if (autoScroll) {
      endRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const trimmedMsg = input.trim();
    if (onInterceptCommand && (trimmedMsg === 'claude' || trimmedMsg.startsWith('claude '))) {
      onInterceptCommand(trimmedMsg);
      setInput("");
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    const promptText = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const res = await api.chat.send(promptText, conversationId);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.response,
        sources: res.sources,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 15, 15, 0.6)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        width: '780px',
        maxWidth: '95vw',
        height: '80vh',
        background: '#FFFFFF',
        border: '2px solid #0F0F0F',
        borderRadius: '0px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '8px 8px 0px #0F0F0F',
        overflow: 'hidden'
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
              <MessageSquare size={16} color="#0F0F0F" />
            </div>
            <div>
              <div style={{ fontSize: '0.62rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#71717A' }}>
                [SESSION_LOG]
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F0F0F', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                THREAD CONVERSATION HISTORY
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F4F4F5',
              border: '1px solid #0F0F0F',
              borderRadius: '0px',
              width: '32px',
              height: '32px',
              color: '#0F0F0F',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Message History List */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            pointerEvents: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: '#FAFAFA'
          }}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: '12px',
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '0px',
                background: m.role === 'user' ? '#0F0F0F' : '#D0FF14',
                border: '2px solid #0F0F0F',
                boxShadow: '2px 2px 0px #0F0F0F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: m.role === 'user' ? '#FFFFFF' : '#0F0F0F',
                flexShrink: 0
              }}>
                {m.role === 'user' ? <User size={15} /> : <Bot size={15} />}
              </div>

              <div style={{
                maxWidth: '78%',
                background: m.role === 'user' ? '#0F0F0F' : '#FFFFFF',
                border: '2px solid #0F0F0F',
                boxShadow: m.role === 'user' ? '3px 3px 0px #D0FF14' : '3px 3px 0px #0F0F0F',
                borderRadius: '0px',
                padding: '12px 16px',
                fontSize: '0.88rem',
                lineHeight: '1.6',
                color: m.role === 'user' ? '#FFFFFF' : '#0F0F0F',
                whiteSpace: 'pre-wrap'
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ color: '#0F0F0F', fontSize: '0.82rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, paddingLeft: '44px' }}>
              &gt; STREAMING_RESPONSE...
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Footer Input Bar */}
        <div style={{
          padding: '14px 20px',
          borderTop: '2px solid #0F0F0F',
          background: '#FFFFFF',
          display: 'flex',
          gap: '10px'
        }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Type your instruction or message..."
            style={{
              flex: 1,
              padding: '10px 14px',
              background: '#FFFFFF',
              border: '2px solid #0F0F0F',
              borderRadius: '0px',
              color: '#0F0F0F',
              outline: 'none',
              fontSize: '0.86rem',
              fontFamily: "'JetBrains Mono', monospace"
            }}
          />
          <button
            onClick={handleSend}
            style={{
              background: '#D0FF14',
              border: '2px solid #0F0F0F',
              boxShadow: '2px 2px 0px #0F0F0F',
              borderRadius: '0px',
              width: '42px',
              height: '42px',
              color: '#0F0F0F',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
