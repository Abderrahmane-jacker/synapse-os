"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  MessageSquare, Plus, Settings, Network, Terminal, LayoutDashboard, 
  Trash2, Pin, PinOff, Pencil, Check, UserCheck, LogOut, KeyRound, 
  Menu, X, Sparkles, Activity, ShieldCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import SetupWizard from '@/components/setup/SetupWizard';
import { Conversation, SystemStatus } from '@/types';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onTogglePin?: (id: string) => void;
  status: SystemStatus | null;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
  onTogglePin,
  status
}: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const [assistantName, setAssistantName] = useState<string>('Synapse');
  const [currentUserName, setCurrentUserName] = useState<string>('OPERATOR');
  const [currentProvider, setCurrentProvider] = useState<string>('omniroute');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const refreshUser = () => {
      try {
        const userRaw = localStorage.getItem('nexus_user');
        const settingsRaw = localStorage.getItem('nexus_settings');
        let opName = 'OPERATOR';
        let astName = 'Synapse';
        let prov = 'omniroute';

        if (userRaw) {
          const user = JSON.parse(userRaw);
          setCurrentUser(user);
          if (user.user_name) opName = user.user_name;
          if (user.assistant_name) astName = user.assistant_name;
        }

        // nexus_settings takes priority as it represents the active runtime configuration
        if (settingsRaw) {
          const s = JSON.parse(settingsRaw);
          if (s.userName) opName = s.userName;
          if (s.assistantName) astName = s.assistantName;
          if (s.llmProvider) prov = s.llmProvider;
        }

        setCurrentUserName(opName);
        setAssistantName(astName);
        setCurrentProvider(prov);
      } catch (e) {}
    };

    refreshUser();
    window.addEventListener("nexus_user_changed", refreshUser);
    window.addEventListener("nexus_settings_changed", refreshUser);
    window.addEventListener("storage", refreshUser);

    return () => {
      window.removeEventListener("nexus_user_changed", refreshUser);
      window.removeEventListener("nexus_settings_changed", refreshUser);
      window.removeEventListener("storage", refreshUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('nexus_auth_token');
    localStorage.removeItem('nexus_user');
    try {
      const raw = localStorage.getItem('nexus_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.userName = "GUEST_OPERATOR";
        parsed.assistantName = "Synapse";
        localStorage.setItem('nexus_settings', JSON.stringify(parsed));
      }
    } catch (e) {}
    setCurrentUser(null);
    window.dispatchEvent(new Event("nexus_user_changed"));
    window.location.href = '/';
  };

  const isConsole = pathname === '/';
  const isDashboard = pathname === '/dashboard';
  const isMatrix = pathname === '/knowledge';
  const isCommands = pathname === '/commands';
  const isSettings = pathname === '/settings';

  const toggle = () => setIsOpen(!isOpen);

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title || "");
  };

  const saveRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onRename && editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const pinnedConvs = conversations.filter(c => c.is_pinned);
  const recentConvs = conversations.filter(c => !c.is_pinned);

  const navLinks = [
    { href: '/', label: 'CONSOLE // CHAT', icon: MessageSquare, active: isConsole },
    { href: '/dashboard', label: 'DASHBOARD // OPS', icon: LayoutDashboard, active: isDashboard },
    { href: '/knowledge', label: 'VAULT // KNOWLEDGE', icon: Network, active: isMatrix },
    { href: '/commands', label: 'COMMANDS // ARSENAL', icon: Terminal, active: isCommands },
    { href: '/settings', label: 'SETTINGS // RUNTIME', icon: Settings, active: isSettings },
  ];

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-toggle"
        onClick={toggle}
        aria-label="Toggle Navigation"
        style={{
          position: 'fixed', top: '14px', left: '14px', zIndex: 60,
          background: '#FFFFFF', border: '2px solid #0F0F0F',
          boxShadow: '3px 3px 0px #0F0F0F', padding: '8px', color: '#0F0F0F',
          display: 'none'
        }}
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Main Sidebar Panel (Brutalist High-Contrast) */}
      <aside 
        className={`sidebar ${isOpen ? 'open' : ''}`}
        style={{
          width: 'var(--sidebar-width)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          borderRight: '2px solid #0F0F0F',
          position: 'relative',
          zIndex: 40,
          userSelect: 'none',
          flexShrink: 0
        }}
      >
        {/* Brand Header */}
        <div style={{
          padding: '18px 16px 14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid #0F0F0F'
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#D0FF14',
              border: '2px solid #0F0F0F',
              boxShadow: '2px 2px 0px #0F0F0F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F0F0F',
              fontWeight: 900,
              fontFamily: 'var(--font-mono)',
              fontSize: '1.05rem'
            }}>
              S
            </div>
            <div>
              <div style={{
                fontSize: '0.94rem',
                fontWeight: 800,
                color: '#0F0F0F',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.02em',
                lineHeight: 1.2
              }}>
                SYNAPSE_OS
              </div>
              <div style={{
                fontSize: '0.66rem',
                color: '#71717A',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600
              }}>
                LOCAL_FIRST // RAG
              </div>
            </div>
          </Link>

          <span className="brutalist-tag brutalist-tag-white" style={{ fontSize: '0.64rem', padding: '2px 6px' }}>
            v2.4
          </span>
        </div>

        {/* Primary Action Button: New Conversation */}
        <div style={{ padding: '14px 14px 6px 14px' }}>
          <button 
            onClick={onNewChat}
            className="brutalist-btn-primary"
            style={{
              width: '100%',
              fontSize: '0.8rem',
              padding: '10px 14px',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} />
              NEW THREAD
            </span>
            <span style={{
              fontSize: '0.66rem',
              color: '#0F0F0F',
              background: '#FFFFFF',
              border: '1px solid #0F0F0F',
              padding: '2px 6px',
              fontWeight: 700
            }}>
              ⌘N
            </span>
          </button>
        </div>

        {/* Primary Navigation Menu */}
        <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: item.active ? '#FFFFFF' : '#0F0F0F',
                  textDecoration: 'none',
                  background: item.active ? '#0F0F0F' : '#FFFFFF',
                  border: item.active ? '2px solid #0F0F0F' : '1px solid #E4E4E7',
                  boxShadow: item.active ? '3px 3px 0px #D0FF14' : 'none',
                  transition: 'all 0.1s ease'
                }}
                onMouseOver={e => {
                  if (!item.active) {
                    e.currentTarget.style.background = '#F4F4F5';
                    e.currentTarget.style.borderColor = '#0F0F0F';
                  }
                }}
                onMouseOut={e => {
                  if (!item.active) {
                    e.currentTarget.style.background = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#E4E4E7';
                  }
                }}
              >
                <Icon size={15} color={item.active ? '#D0FF14' : '#0F0F0F'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Conversations List (Scrollable Area) */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          {/* Pinned Section */}
          {pinnedConvs.length > 0 && (
            <div>
              <div style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: '#71717A',
                letterSpacing: '0.04em',
                marginBottom: '6px',
                paddingLeft: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Pin size={11} color="#0F0F0F" />
                PINNED THREADS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {pinnedConvs.map(conv => renderConvItem(conv))}
              </div>
            </div>
          )}

          {/* Recents Section */}
          <div>
            <div style={{
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: '#71717A',
              letterSpacing: '0.04em',
              marginBottom: '6px',
              paddingLeft: '4px'
            }}>
              THREAD HISTORY
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {recentConvs.length === 0 && (
                <div style={{
                  padding: '14px 8px',
                  fontSize: '0.76rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#71717A',
                  textAlign: 'center',
                  border: '1px dashed #D4D4D8'
                }}>
                  NO ACTIVE THREADS
                </div>
              )}
              {recentConvs.map(conv => renderConvItem(conv))}
            </div>
          </div>
        </div>

        {/* Engine Telemetry Quick Bar */}
        <div style={{
          padding: '10px 14px',
          borderTop: '2px solid #0F0F0F',
          background: '#F4F4F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              background: status?.ollama_online ? '#D0FF14' : '#DC2626',
              border: '1px solid #0F0F0F',
              display: 'inline-block'
            }} />
            <span style={{ color: '#0F0F0F' }}>
              {status?.ollama_online ? 'RUNTIME: ONLINE' : 'RUNTIME: OFFLINE'}
            </span>
          </div>

          <span style={{
            fontSize: '0.68rem',
            color: '#71717A',
            border: '1px solid #0F0F0F',
            backgroundColor: '#FFFFFF',
            padding: '2px 5px'
          }}>
            {status?.model ? status.model.split(':')[0] : 'gemma4'}
          </span>
        </div>

        {/* Operator Profile & Setup Controls */}
        <div style={{
          padding: '12px 14px',
          borderTop: '2px solid #0F0F0F',
          background: '#FFFFFF'
        }}>
          <div style={{
            background: '#F4F4F5',
            border: '2px solid #0F0F0F',
            boxShadow: '2px 2px 0px #0F0F0F',
            padding: '10px 12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <div style={{
                  width: '26px', height: '26px', background: '#D0FF14',
                  border: '1.5px solid #0F0F0F',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                  color: '#0F0F0F', flexShrink: 0
                }}>
                  {(currentUserName || 'OP').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontWeight: 800, fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#0F0F0F',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {currentUserName || 'OPERATOR'}
                  </div>
                  <div style={{ fontSize: '0.64rem', color: '#71717A', fontFamily: 'var(--font-mono)' }}>
                    {assistantName} // ONLINE
                  </div>
                </div>
              </div>
              <span className="brutalist-tag" style={{
                fontSize: '0.6rem',
                background: '#0F0F0F',
                color: '#FFFFFF',
                padding: '2px 6px',
                fontWeight: 800
              }}>
                {(currentProvider || 'OMNIROUTE').toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setIsSetupModalOpen(true)}
                className="brutalist-btn-secondary"
                style={{ flex: 1, fontSize: '0.7rem', padding: '5px 6px', justifyContent: 'center' }}
                title="Open Setup Wizard"
              >
                <Sparkles size={11} /> SETUP
              </button>
              <Link
                href="/settings"
                className="brutalist-btn-secondary"
                style={{ flex: 1, fontSize: '0.7rem', padding: '5px 6px', justifyContent: 'center', textDecoration: 'none' }}
                title="Settings"
              >
                <Settings size={11} /> CONFIG
              </Link>
              <button
                onClick={handleLogout}
                className="brutalist-btn-secondary"
                style={{ fontSize: '0.7rem', padding: '5px 8px', justifyContent: 'center', color: '#DC2626', borderColor: '#DC2626' }}
                title="Log Out / Terminate Session"
              >
                <LogOut size={11} /> LOGOUT
              </button>
            </div>
          </div>
        </div>

        <SetupWizard
          isOpen={isSetupModalOpen}
          onComplete={() => setIsSetupModalOpen(false)}
          canDismiss={true}
        />
      </aside>
    </>
  );

  function renderConvItem(conv: Conversation) {
    const isEditing = editingId === conv.id;
    const isHovered = hoveredId === conv.id;
    const isActive = activeId === conv.id;

    return (
      <div
        key={conv.id}
        onMouseEnter={() => setHoveredId(conv.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          background: isActive ? '#D0FF14' : isHovered ? '#F4F4F5' : '#FFFFFF',
          color: '#0F0F0F',
          fontSize: '0.78rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: isActive ? 800 : 500,
          cursor: 'pointer',
          border: isActive ? '2px solid #0F0F0F' : '1px solid #E4E4E7',
          boxShadow: isActive ? '2px 2px 0px #0F0F0F' : 'none',
          transition: 'all 0.1s ease'
        }}
        onClick={() => !isEditing && onSelect(conv.id)}
      >
        {isEditing ? (
          <form onSubmit={e => saveRename(conv.id, e)} style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Escape') setEditingId(null); }}
              style={{
                width: '100%',
                padding: '4px 8px',
                background: '#FFFFFF',
                border: '2px solid #0F0F0F',
                color: '#0F0F0F',
                fontSize: '0.78rem',
                outline: 'none'
              }}
            />
            <button type="submit" style={{ color: '#0F0F0F', padding: '2px', background: '#D0FF14', border: '1px solid #0F0F0F' }}>
              <Check size={14} />
            </button>
          </form>
        ) : (
          <>
            <span style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              paddingRight: '6px'
            }}>
              {conv.title || 'New Thread'}
            </span>

            {(isHovered || isActive || conv.is_pinned) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                {onTogglePin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onTogglePin(conv.id); }}
                    style={{
                      color: '#0F0F0F',
                      background: 'none',
                      border: 'none',
                      padding: '2px'
                    }}
                    title={conv.is_pinned ? "Unpin thread" : "Pin thread"}
                  >
                    {conv.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                  </button>
                )}

                {onRename && (isHovered || isActive) && (
                  <button 
                    onClick={(e) => startRename(conv, e)} 
                    style={{ color: '#0F0F0F', background: 'none', border: 'none', padding: '2px' }}
                    title="Rename thread"
                  >
                    <Pencil size={12} />
                  </button>
                )}

                {onDelete && (isHovered || isActive) && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }} 
                    style={{ color: '#0F0F0F', background: 'none', border: 'none', padding: '2px' }}
                    onMouseOver={e => e.currentTarget.style.color = '#DC2626'}
                    onMouseOut={e => e.currentTarget.style.color = '#0F0F0F'}
                    title="Delete thread"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}
