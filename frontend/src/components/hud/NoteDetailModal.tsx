import React, { useEffect, useState } from 'react';
import { X, FileText, Tag, Link as LinkIcon, ArrowRight, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { api } from '@/lib/api';

interface NoteDetailModalProps {
  note: any | null;
  onClose: () => void;
  onSelectNote?: (noteTitle: string) => void;
}

export default function NoteDetailModal({ note, onClose, onSelectNote }: NoteDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'backlinks' | 'forward'>('content');
  const [backlinkData, setBacklinkData] = useState<{
    backlinks: Array<{ title: string; path: string; tags: string[]; snippet: string }>;
    forward_links: Array<{ title: string; alias: string }>;
    backlink_count: number;
    forward_count: number;
  }>({
    backlinks: [],
    forward_links: [],
    backlink_count: 0,
    forward_count: 0
  });
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (note && note.title) {
      setIsLoadingLinks(true);
      setActiveTab('content');
      api.knowledge.getBacklinks(note.title)
        .then(res => {
          setBacklinkData(res);
        })
        .catch(console.error)
        .finally(() => setIsLoadingLinks(false));
    }
  }, [note?.title]);

  if (!note) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(15, 15, 15, 0.6)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '880px',
        width: '100%',
        height: '85vh',
        background: '#FFFFFF',
        border: '2px solid #0F0F0F',
        borderRadius: '0px',
        boxShadow: '8px 8px 0px #0F0F0F',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '2px solid #0F0F0F',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '0px',
              background: '#D0FF14',
              border: '2px solid #0F0F0F',
              boxShadow: '2px 2px 0px #0F0F0F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileText size={18} color="#0F0F0F" />
            </div>
            <div>
              <div style={{
                fontSize: '0.65rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800,
                color: '#71717A',
                letterSpacing: '0.12em',
              }}>
                [NOTE_INSPECTOR]
              </div>
              <h2 style={{ fontSize: '1.25rem', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, color: '#0F0F0F', letterSpacing: '-0.02em' }}>
                {note.title}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F0F0F',
              cursor: 'pointer',
              fontWeight: 800
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Sub-bar with Navigation Tabs */}
        <div style={{
          padding: '10px 24px',
          background: '#FAFAFA',
          borderBottom: '2px solid #0F0F0F',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.78rem',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('content')}
              style={{
                padding: '5px 12px',
                borderRadius: '0px',
                fontSize: '0.72rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800,
                background: activeTab === 'content' ? '#D0FF14' : '#FFFFFF',
                border: '1px solid #0F0F0F',
                boxShadow: activeTab === 'content' ? '2px 2px 0px #0F0F0F' : 'none',
                color: '#0F0F0F',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FileText size={12} /> DOCUMENT
            </button>

            <button
              onClick={() => setActiveTab('backlinks')}
              style={{
                padding: '5px 12px',
                borderRadius: '0px',
                fontSize: '0.72rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800,
                background: activeTab === 'backlinks' ? '#D0FF14' : '#FFFFFF',
                border: '1px solid #0F0F0F',
                boxShadow: activeTab === 'backlinks' ? '2px 2px 0px #0F0F0F' : 'none',
                color: '#0F0F0F',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ArrowLeft size={12} /> BACKLINKS ({backlinkData.backlink_count})
            </button>

            <button
              onClick={() => setActiveTab('forward')}
              style={{
                padding: '5px 12px',
                borderRadius: '0px',
                fontSize: '0.72rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800,
                background: activeTab === 'forward' ? '#D0FF14' : '#FFFFFF',
                border: '1px solid #0F0F0F',
                boxShadow: activeTab === 'forward' ? '2px 2px 0px #0F0F0F' : 'none',
                color: '#0F0F0F',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ArrowRight size={12} /> FORWARD LINKS ({backlinkData.forward_count})
            </button>
          </div>

          {/* Path Info */}
          {note.path && (
            <span style={{ fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace", color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px', fontWeight: 600 }}>
              {note.path.split('/').slice(-2).join('/') || note.path}
            </span>
          )}
        </div>

        {/* Modal Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          lineHeight: 1.6,
          background: '#FFFFFF',
          color: '#0F0F0F'
        }}>
          {activeTab === 'content' && (
            <div className="markdown-body" style={{ color: '#0F0F0F' }}>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeHighlight]}
                components={{
                  a: ({ href, children }) => {
                    if (href?.startsWith('wikilink:')) {
                      const target = decodeURIComponent(href.replace('wikilink:', ''));
                      return (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            if (onSelectNote) onSelectNote(target);
                          }}
                          style={{
                            color: '#0F0F0F',
                            background: '#D0FF14',
                            border: '1px solid #0F0F0F',
                            borderRadius: '0px',
                            padding: '1px 6px',
                            cursor: 'pointer',
                            fontSize: '0.82em',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 800,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            margin: '0 2px'
                          }}
                        >
                          [[{children}]]
                        </button>
                      );
                    }
                    return <a href={href} target="_blank" rel="noreferrer" style={{ color: '#0F0F0F', fontWeight: 700, textDecoration: 'underline' }}>{children}</a>;
                  }
                }}
              >
                {(note.content || note.summary || "No additional text content available for this note.")
                  .replace(/\[\[(.*?)\]\]/g, (match: string, p1: string) => {
                    const parts = p1.split('|');
                    const target = parts[0].trim();
                    const alias = parts.length > 1 ? parts[1].trim() : target;
                    return `[${alias}](wikilink:${encodeURIComponent(target)})`;
                  })}
              </ReactMarkdown>
            </div>
          )}

          {activeTab === 'backlinks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", color: '#71717A', marginBottom: '4px', fontWeight: 700 }}>
                // NOTES THAT REFERENCE [[{note.title}]]
              </div>

              {backlinkData.backlinks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#71717A', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
                  No incoming backlinks found for this note.
                </div>
              ) : (
                backlinkData.backlinks.map((bl, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#FAFAFA',
                      border: '1px solid #0F0F0F',
                      boxShadow: '2px 2px 0px #0F0F0F',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        onClick={() => onSelectNote && onSelectNote(bl.title)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0F0F0F',
                          fontSize: '0.9rem',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: 0,
                        }}
                      >
                        <ArrowLeft size={13} /> [[{bl.title}]]
                      </button>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        {bl.tags.map(t => (
                          <span key={t} style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: '#0F0F0F', background: '#E4FF66', border: '1px solid #0F0F0F', padding: '1px 5px', fontWeight: 700 }}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {bl.snippet && (
                      <div style={{
                        fontSize: '0.76rem',
                        fontFamily: "'JetBrains Mono', monospace",
                        color: '#52525B',
                        background: '#FFFFFF',
                        padding: '6px 10px',
                        borderLeft: '3px solid #0F0F0F',
                        border: '1px solid #E4E4E7'
                      }}>
                        "{bl.snippet}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'forward' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", color: '#71717A', marginBottom: '4px', fontWeight: 700 }}>
                // OUTBOUND LINKS FROM [[{note.title}]]
              </div>

              {backlinkData.forward_links.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#71717A', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
                  No outbound wiki-links found in this note.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                  {backlinkData.forward_links.map((fl, i) => (
                    <button
                      key={i}
                      onClick={() => onSelectNote && onSelectNote(fl.title)}
                      style={{
                        background: '#FAFAFA',
                        border: '1px solid #0F0F0F',
                        boxShadow: '2px 2px 0px #0F0F0F',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: '#0F0F0F',
                        fontSize: '0.82rem',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.1s',
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = '#D0FF14'; }}
                      onMouseOut={e => { e.currentTarget.style.background = '#FAFAFA'; }}
                    >
                      <span>[[{fl.title}]]</span>
                      <ArrowRight size={13} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '2px solid #0F0F0F',
          background: '#FAFAFA',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {note.tags && note.tags.map((tag: string) => (
              <span key={tag} style={{
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: '0px',
                background: '#FFFFFF',
                border: '1px solid #0F0F0F',
                color: '#0F0F0F',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700
              }}>
                <Tag size={10} /> #{tag}
              </span>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '0px',
              background: '#D0FF14',
              border: '2px solid #0F0F0F',
              boxShadow: '3px 3px 0px #0F0F0F',
              color: '#0F0F0F',
              fontWeight: 800,
              fontSize: '0.8rem',
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
              transition: 'all 0.1s',
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
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
