import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus, Hash, FolderOpen, Sparkles, Send, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteCreated: () => void;
  existingTags?: string[];
}

export default function QuickCaptureModal({ isOpen, onClose, onNoteCreated, existingTags = [] }: QuickCaptureModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [folder, setFolder] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && titleRef.current) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setContent('');
      setTags([]);
      setTagInput('');
      setFolder('');
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, title, content, tags, folder]);

  const addTag = useCallback((tag: string) => {
    const cleaned = tag.trim().replace(/^#/, '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (cleaned && !tags.includes(cleaned)) {
      setTags(prev => [...prev, cleaned]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
  }, [tags]);

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      if (tagInput.trim()) addTag(tagInput);
    }
    if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const filteredSuggestions = existingTags
    .filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t))
    .slice(0, 6);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      titleRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.knowledge.createNote({
        title: title.trim(),
        content: content.trim(),
        tags,
        folder: folder.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        onNoteCreated();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to create note');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 15, 15, 0.6)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '580px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          background: '#FFFFFF',
          border: '2px solid #0F0F0F',
          borderRadius: '0px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '8px 8px 0px #0F0F0F',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
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
              borderRadius: '0px',
              background: '#D0FF14',
              border: '2px solid #0F0F0F',
              boxShadow: '2px 2px 0px #0F0F0F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sparkles size={16} color="#0F0F0F" />
            </div>
            <div>
              <div style={{
                fontSize: '0.62rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800,
                color: '#71717A',
                letterSpacing: '0.12em',
              }}>
                [QUICK_CAPTURE]
              </div>
              <div style={{
                fontSize: '1.1rem',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 900,
                color: '#0F0F0F',
                letterSpacing: '-0.02em',
              }}>
                NEW KNOWLEDGE NOTE
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F4F4F5',
              border: '1px solid #0F0F0F',
              color: '#0F0F0F',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              borderRadius: '0px',
              fontWeight: 800
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', background: '#FFFFFF' }}>

          {/* Title Input */}
          <div>
            <label style={{
              fontSize: '0.68rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
              color: '#0F0F0F',
              letterSpacing: '0.08em',
              marginBottom: '6px',
              display: 'block',
            }}>
              NOTE TITLE *
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              placeholder="e.g. Distributed Consensus Engine"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#FFFFFF',
                border: error && !title.trim() ? '2px solid #EF4444' : '2px solid #0F0F0F',
                borderRadius: '0px',
                color: '#0F0F0F',
                fontSize: '0.88rem',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Content Textarea */}
          <div>
            <label style={{
              fontSize: '0.68rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
              color: '#0F0F0F',
              letterSpacing: '0.08em',
              marginBottom: '6px',
              display: 'block',
            }}>
              CONTENT <span style={{ color: '#71717A', fontWeight: 500 }}>— Markdown & [[wiki-links]] supported</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write note contents... Use [[Note Title]] to link with existing graph nodes."
              rows={7}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#FFFFFF',
                border: '2px solid #0F0F0F',
                borderRadius: '0px',
                color: '#0F0F0F',
                fontSize: '0.84rem',
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.5,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Tags */}
          <div style={{ position: 'relative' }}>
            <label style={{
              fontSize: '0.68rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
              color: '#0F0F0F',
              letterSpacing: '0.08em',
              marginBottom: '6px',
              display: 'block',
            }}>
              <Hash size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              TAGS
            </label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              padding: '6px 10px',
              background: '#FFFFFF',
              border: '2px solid #0F0F0F',
              borderRadius: '0px',
              alignItems: 'center',
              minHeight: '40px',
            }}>
              {tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    background: '#D0FF14',
                    border: '1px solid #0F0F0F',
                    borderRadius: '0px',
                    fontSize: '0.72rem',
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#0F0F0F',
                    fontWeight: 700,
                  }}
                >
                  #{tag}
                  <button
                    onClick={() => removeTag(tag)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0F0F0F',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '0.8rem',
                      lineHeight: 1,
                      display: 'flex',
                      fontWeight: 800
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                value={tagInput}
                onChange={e => {
                  setTagInput(e.target.value);
                  setShowTagSuggestions(e.target.value.length > 0);
                }}
                onKeyDown={handleTagKeyDown}
                onFocus={() => tagInput.length > 0 && setShowTagSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                placeholder={tags.length === 0 ? "Add tag and press Enter..." : ""}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  background: 'none',
                  border: 'none',
                  color: '#0F0F0F',
                  fontSize: '0.8rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: 'none',
                  boxShadow: 'none'
                }}
              />
            </div>

            {/* Tag Suggestions Dropdown */}
            {showTagSuggestions && filteredSuggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                background: '#FFFFFF',
                border: '2px solid #0F0F0F',
                boxShadow: '4px 4px 0px #0F0F0F',
                borderRadius: '0px',
                overflow: 'hidden',
                zIndex: 10,
              }}>
                {filteredSuggestions.map(tag => (
                  <button
                    key={tag}
                    onMouseDown={e => { e.preventDefault(); addTag(tag); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid #E4E4E7',
                      color: '#0F0F0F',
                      fontSize: '0.75rem',
                      fontFamily: "'JetBrains Mono', monospace",
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = '#D0FF14';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'none';
                    }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Folder */}
          <div>
            <label style={{
              fontSize: '0.68rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
              color: '#0F0F0F',
              letterSpacing: '0.08em',
              marginBottom: '6px',
              display: 'block',
            }}>
              <FolderOpen size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              FOLDER <span style={{ color: '#71717A', fontWeight: 500 }}>— optional relative subfolder</span>
            </label>
            <input
              value={folder}
              onChange={e => setFolder(e.target.value)}
              placeholder="e.g. Architecture/Specs"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#FFFFFF',
                border: '2px solid #0F0F0F',
                borderRadius: '0px',
                color: '#0F0F0F',
                fontSize: '0.8rem',
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '2px solid #0F0F0F',
          background: '#FAFAFA',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace" }}>
            {error && <span style={{ color: '#EF4444', fontWeight: 700 }}>[ERROR] {error}</span>}
            {success && <span style={{ color: '#15803D', fontWeight: 800 }}>✓ NOTE CREATED SUCCESSFULLY</span>}
            {!error && !success && (
              <span style={{ color: '#71717A' }}>Ctrl+Enter to save</span>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: '#D0FF14',
              border: '2px solid #0F0F0F',
              borderRadius: '0px',
              boxShadow: '3px 3px 0px #0F0F0F',
              color: '#0F0F0F',
              fontSize: '0.8rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
              cursor: isSubmitting ? 'wait' : 'pointer',
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
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : success ? (
              <>✓ CAPTURED</>
            ) : (
              <>
                <Send size={13} />
                CAPTURE NOTE
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
