"use client";

import { Message } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';
import StreamingText from './StreamingText';
import { FileText, Copy, Check, Terminal, User, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { ttsEngine } from '@/lib/tts';

export default function MessageBubble({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const isUser = message.role === 'user';
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  const handleSpeak = () => {
    ttsEngine?.speak(message.content, undefined, true);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      gap: '12px',
      width: '100%',
      animation: 'slideUp 0.15s ease forwards'
    }}>
      {/* Assistant Avatar on Left */}
      {!isUser && (
        <div style={{
          width: '32px',
          height: '32px',
          background: '#D0FF14',
          border: '2px solid #0F0F0F',
          boxShadow: '2px 2px 0px #0F0F0F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px',
          color: '#0F0F0F',
          fontWeight: 900,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.9rem'
        }}>
          S
        </div>
      )}

      {/* Message Bubble Container */}
      <div style={{
        maxWidth: isUser ? '80%' : '90%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start'
      }}>
        {isUser ? (
          <div style={{
            padding: '12px 18px',
            background: '#0F0F0F',
            color: '#FFFFFF',
            fontSize: '0.9rem',
            lineHeight: 1.55,
            border: '2px solid #0F0F0F',
            boxShadow: '4px 4px 0px #D0FF14',
            fontFamily: 'var(--font-mono)'
          }}>
            {message.image && (
              <div style={{ marginBottom: '10px' }}>
                <img 
                  src={message.image} 
                  alt="Upload preview" 
                  style={{ maxWidth: '100%', border: '1px solid #FFFFFF', maxHeight: '220px', objectFit: 'contain' }} 
                />
              </div>
            )}
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </div>
          </div>
        ) : (
          <div style={{
            width: '100%',
            padding: '18px 22px',
            background: '#FFFFFF',
            color: '#0F0F0F',
            border: '2px solid #0F0F0F',
            boxShadow: '4px 4px 0px #0F0F0F'
          }}>
            {isStreaming && message.content === '' ? (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '24px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#71717A' }}>INFERENCE ACTIVE</span>
                <span style={{ width: '8px', height: '14px', backgroundColor: '#D0FF14', border: '1px solid #0F0F0F', display: 'inline-block', animation: 'pulseSubtle 1s infinite' }} />
              </div>
            ) : (
              <div className="markdown-body">
                {isStreaming ? (
                  <StreamingText content={message.content} />
                ) : (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      pre: ({ node, children, ...props }) => {
                        return (
                          <div style={{ position: 'relative', margin: '14px 0' }}>
                            <div style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              zIndex: 10
                            }}>
                              <button
                                onClick={() => {
                                  const text = (node as any)?.children?.[0]?.children?.[0]?.value || '';
                                  if (text) handleCopyCode(text);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  background: '#FFFFFF',
                                  border: '1px solid #0F0F0F',
                                  boxShadow: '2px 2px 0px #0F0F0F',
                                  color: '#0F0F0F',
                                  fontSize: '0.7rem',
                                  fontFamily: 'var(--font-mono)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Copy size={11} /> COPY
                              </button>
                            </div>
                            <pre {...props}>{children}</pre>
                          </div>
                        );
                      }
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
            )}
            
            {/* Sources Citations Section */}
            {message.sources && message.sources.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '2px solid #0F0F0F' }}>
                <div style={{
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: '#0F0F0F',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  textTransform: 'uppercase'
                }}>
                  <FileText size={13} color="#0F0F0F" />
                  REFERENCED VAULT SOURCES ({message.sources.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {message.sources.map((src, i) => (
                    <div 
                      key={i} 
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '4px 8px',
                        background: '#F4F4F5',
                        border: '1px solid #0F0F0F',
                        color: '#0F0F0F',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span style={{ color: '#80A300', fontWeight: 800 }}>#</span>
                      {src.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Action Bar: Copy & Speak */}
            {!isStreaming && message.content && (
              <div style={{
                marginTop: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingTop: '10px',
                borderTop: '1px solid #E4E4E7'
              }}>
                <button
                  onClick={handleCopyMessage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    background: '#FFFFFF',
                    border: '1px solid #0F0F0F',
                    boxShadow: '1px 1px 0px #0F0F0F',
                    color: '#0F0F0F',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Copy full response"
                >
                  {copiedMsg ? <Check size={12} color="#15803D" /> : <Copy size={12} />}
                  <span>{copiedMsg ? 'COPIED' : 'COPY'}</span>
                </button>

                <button
                  onClick={handleSpeak}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    background: '#FFFFFF',
                    border: '1px solid #0F0F0F',
                    boxShadow: '1px 1px 0px #0F0F0F',
                    color: '#0F0F0F',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Read aloud"
                >
                  <Volume2 size={12} />
                  <span>SPEAK</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Avatar on Right */}
      {isUser && (
        <div style={{
          width: '32px',
          height: '32px',
          background: '#0F0F0F',
          border: '2px solid #0F0F0F',
          boxShadow: '2px 2px 0px #D0FF14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px',
          color: '#D0FF14',
          fontFamily: 'var(--font-mono)',
          fontWeight: 800,
          fontSize: '0.8rem'
        }}>
          OP
        </div>
      )}
    </div>
  );
}
