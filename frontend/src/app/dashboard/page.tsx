"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { useChat } from "@/hooks/useChat";
import { api } from "@/lib/api";
import { SystemStatus, DashboardData, DashboardFeaturedCommand, DashboardRecentNote } from "@/types";
import { 
  LayoutDashboard, Database, Cpu, Zap, RefreshCw, 
  Play, Star, FileText, ArrowRight, ShieldCheck, Activity, Check, Copy,
  Layers, Folder, Tag, ExternalLink, MessageSquarePlus, Sparkles,
  BookOpen, Target, Dna, Compass, FolderTree, Send, ArrowUpRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import VaultInitModal from "@/components/auth/VaultInitModal";

function getCategoryMeta(categoryName: string) {
  const lower = categoryName.toLowerCase();
  if (lower.includes('project') || lower.includes('🎯')) {
    return { label: categoryName, color: '#BE123C', bg: '#FFE4E6', border: '#0F0F0F', icon: Target };
  }
  if (lower.includes('area') || lower.includes('🧬')) {
    return { label: categoryName, color: '#0369A1', bg: '#E0F2FE', border: '#0F0F0F', icon: Dna };
  }
  if (lower.includes('resource') || lower.includes('🧠')) {
    return { label: categoryName, color: '#15803D', bg: '#DCFCE7', border: '#0F0F0F', icon: BookOpen };
  }
  if (lower.includes('dashboard') || lower.includes('🌐')) {
    return { label: categoryName, color: '#6D28D9', bg: '#EDE9FE', border: '#0F0F0F', icon: Compass };
  }
  if (lower.includes('journal') || lower.includes('daily') || lower.includes('📓')) {
    return { label: categoryName, color: '#B45309', bg: '#FEF3C7', border: '#0F0F0F', icon: FileText };
  }
  return { label: categoryName, color: '#0F0F0F', bg: '#F4F4F5', border: '#0F0F0F', icon: Folder };
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "Recently";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Recently";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 60) return `${Math.max(1, diffMin)}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return "Recently";
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { 
    conversations, 
    activeConversationId, 
    switchConversation, 
    createNewChat, 
    deleteConversation, 
    renameConversation, 
    togglePinConversation 
  } = useChat();

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [assistantName, setAssistantName] = useState("Synapse");
  const [userName, setUserName] = useState("OPERATOR");
  const [selectedModel, setSelectedModel] = useState("");
  const [llmProvider, setLlmProvider] = useState("ollama");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isVaultInitOpen, setIsVaultInitOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      const data = await api.system.getDashboard();
      setDashboardData(data);
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDashboardData();
    api.system.getStatus().then(setStatus).catch(console.error);

    const refreshSettings = () => {
      if (typeof window === 'undefined') return;
      const userRaw = localStorage.getItem('nexus_user');
      const settingsRaw = localStorage.getItem('nexus_settings');
      
      if (userRaw) {
        setIsLoggedIn(true);
        try {
          const usr = JSON.parse(userRaw);
          setUserName(usr.user_name || usr.email?.split('@')[0] || "OPERATOR");
          setAssistantName(usr.assistant_name || "Synapse");
        } catch (e) {}
      } else {
        setIsLoggedIn(false);
        setUserName("GUEST_OPERATOR");
        setAssistantName("Synapse");
      }

      if (settingsRaw) {
        try {
          const parsed = JSON.parse(settingsRaw);
          if (parsed.selectedModel) setSelectedModel(parsed.selectedModel);
          if (parsed.llmProvider) setLlmProvider(parsed.llmProvider);
        } catch (e) {}
      }
    };

    refreshSettings();
    window.addEventListener("nexus_user_changed", refreshSettings);
    window.addEventListener("storage", refreshSettings);

    return () => {
      window.removeEventListener("nexus_user_changed", refreshSettings);
      window.removeEventListener("storage", refreshSettings);
    };
  }, [loadDashboardData]);

  const handleSyncVault = async () => {
    setIsSyncing(true);
    setSyncStatusText("INDEXING VAULT...");
    try {
      await api.knowledge.indexVault();
      await loadDashboardData();
      setSyncStatusText("SYNC COMPLETE!");
      setTimeout(() => {
        setSyncStatusText(null);
        setIsSyncing(false);
      }, 2000);
    } catch (e) {
      console.error("Sync failed:", e);
      setSyncStatusText("SYNC FAILED");
      setTimeout(() => {
        setSyncStatusText(null);
        setIsSyncing(false);
      }, 3000);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendToChat = (commandText: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_initial_prompt', commandText);
    }
    createNewChat();
    router.push('/');
  };

  const stats = dashboardData?.stats;
  const categories = dashboardData?.categories || {};
  const commandCategories = dashboardData?.command_categories || {};
  const recentNotes = dashboardData?.recent_notes || [];
  const topTags = dashboardData?.top_tags || [];
  const featuredCommands = dashboardData?.featured_commands || [];

  return (
    <main style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#FFFFFF',
      color: '#0F0F0F',
      overflow: 'hidden',
      position: 'relative'
    }}>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <AnimatedBackground />

        <Sidebar 
          conversations={conversations} 
          activeId={activeConversationId} 
          onSelect={switchConversation} 
          onNewChat={createNewChat}
          onDelete={deleteConversation}
          onRename={renameConversation}
          onTogglePin={togglePinConversation}
          status={status}
        />

        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          height: '100%',
          width: '100%',
          overflowY: 'auto'
        }}>
          
          {/* Top Header Bar */}
          <header style={{
            padding: '16px 32px',
            background: '#FFFFFF',
            borderBottom: '2px solid #0F0F0F',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 20,
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{
                fontSize: '0.72rem',
                color: '#71717A',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '2px'
              }}>
                <Sparkles size={12} />
                <span>OVERVIEW // VAULT ANALYTICS</span>
              </div>
              <h1 style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: '#0F0F0F',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                textTransform: 'uppercase'
              }}>
                Mission Control Dashboard
              </h1>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Operator Badge */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #0F0F0F',
                padding: '6px 12px',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                color: '#0F0F0F',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  background: stats?.ollama_online ? '#D0FF14' : '#DC2626',
                  border: '1px solid #0F0F0F',
                  display: 'inline-block'
                }} />
                <span>OPERATOR: <strong>{userName}</strong></span>
              </div>

              {/* Vault Path Badge */}
              <button 
                onClick={() => setIsVaultInitOpen(true)}
                title="Click to configure or change Obsidian vault"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #0F0F0F',
                  boxShadow: '2px 2px 0px #0F0F0F',
                  padding: '6px 14px',
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#0F0F0F',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = '#F4F4F5';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = '#FFFFFF';
                }}
              >
                <Folder size={14} color="#0F0F0F" />
                <span style={{ fontWeight: 700 }}>
                  {stats?.vault_path || '/vault'}
                </span>
                <span style={{ 
                  fontSize: '0.64rem', 
                  color: '#0F0F0F',
                  fontWeight: 800,
                  background: '#D0FF14',
                  border: '1px solid #0F0F0F',
                  padding: '1px 6px'
                }}>
                  SYNCED
                </span>
              </button>

              {/* Re-Index / Sync Vault Button */}
              <button
                onClick={() => handleSyncVault()}
                disabled={isSyncing}
                title="Re-index Obsidian Vault"
                className="brutalist-btn-secondary"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.74rem'
                }}
              >
                <RefreshCw size={13} className={isSyncing ? "spinning" : ""} />
                <span>{syncStatusText || (isSyncing ? "INDEXING..." : "SYNC VAULT")}</span>
              </button>

              {/* New Chat Button */}
              <button
                onClick={() => {
                  createNewChat();
                  router.push('/');
                }}
                className="brutalist-btn-primary"
                style={{ fontSize: '0.74rem', padding: '6px 14px' }}
              >
                <MessageSquarePlus size={14} />
                <span>NEW THREAD</span>
              </button>
            </div>
          </header>

          {/* Dashboard Main Content Body */}
          <div style={{ 
            padding: '28px 32px 48px 32px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '24px', 
            maxWidth: '1500px', 
            margin: '0 auto', 
            width: '100%' 
          }}>
            
            {/* SECTION 1: Modern KPI Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              
              {/* Card 1: Knowledge Vault Notes */}
              <div 
                onClick={() => router.push('/knowledge')}
                className="brutalist-card"
                style={{ padding: '20px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: '#0F0F0F', fontWeight: 800 }}>
                    KNOWLEDGE VAULT
                  </span>
                  <div style={{
                    width: '30px', height: '30px',
                    background: '#F4F4F5', border: '1px solid #0F0F0F', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <BookOpen size={15} color="#0F0F0F" />
                  </div>
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#0F0F0F', letterSpacing: '-0.03em' }}>
                  {isLoading ? '...' : (stats?.total_notes ?? 0)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#52525B', fontFamily: 'var(--font-mono)' }}>
                    Indexed Notes
                  </span>
                  <span className="brutalist-tag brutalist-tag-white" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                    PARA VAULT
                  </span>
                </div>
              </div>

              {/* Card 2: Semantic Chunks Index */}
              <div 
                onClick={() => router.push('/knowledge')}
                className="brutalist-card"
                style={{ padding: '20px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: '#0F0F0F', fontWeight: 800 }}>
                    VECTOR EMBEDDINGS
                  </span>
                  <div style={{
                    width: '30px', height: '30px',
                    background: '#D0FF14', border: '1px solid #0F0F0F', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Layers size={15} color="#0F0F0F" />
                  </div>
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#0F0F0F', letterSpacing: '-0.03em' }}>
                  {isLoading ? '...' : (stats?.total_chunks?.toLocaleString() ?? 0)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#52525B', fontFamily: 'var(--font-mono)' }}>
                    Semantic Chunks
                  </span>
                  <span className="brutalist-tag brutalist-tag-lime" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                    HNSW INDEX
                  </span>
                </div>
              </div>

              {/* Card 3: Command Vectors Arsenal */}
              <div 
                onClick={() => router.push('/commands')}
                className="brutalist-card"
                style={{ padding: '20px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: '#0F0F0F', fontWeight: 800 }}>
                    TACTICAL ARSENAL
                  </span>
                  <div style={{
                    width: '30px', height: '30px',
                    background: '#F4F4F5', border: '1px solid #0F0F0F', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Zap size={15} color="#0F0F0F" />
                  </div>
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#0F0F0F', letterSpacing: '-0.03em' }}>
                  {isLoading ? '...' : (stats?.total_commands ?? 0)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#52525B', fontFamily: 'var(--font-mono)' }}>
                    {stats?.total_categories ?? 9} Categories
                  </span>
                  <span className="brutalist-tag brutalist-tag-white" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                    COMMANDS READY
                  </span>
                </div>
              </div>

              {/* Card 4: Active Neural LLM Model */}
              <div 
                onClick={() => router.push('/settings')}
                className="brutalist-card"
                style={{ padding: '20px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: '#0F0F0F', fontWeight: 800 }}>
                    NEURAL ENGINE
                  </span>
                  <div style={{
                    width: '30px', height: '30px',
                    background: '#F4F4F5', border: '1px solid #0F0F0F', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Cpu size={15} color="#0F0F0F" />
                  </div>
                </div>
                <div style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 800, 
                  fontFamily: 'var(--font-mono)',
                  color: '#0F0F0F', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap' 
                }}>
                  {selectedModel || stats?.active_model || 'NOT CONFIGURED'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontFamily: 'var(--font-mono)',
                    color: '#0F0F0F', 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ width: '8px', height: '8px', border: '1px solid #0F0F0F', background: stats?.ollama_online ? '#D0FF14' : '#DC2626' }} />
                    {stats?.ollama_online ? 'RUNTIME: ONLINE' : 'RUNTIME: OFFLINE'}
                  </span>
                  <span className="brutalist-tag brutalist-tag-black" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                    AGENT RAG
                  </span>
                </div>
              </div>

            </div>

            {/* SECTION 2: Obsidian Vault PARA Breakdown */}
            <div className="brutalist-card-static" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <div style={{ 
                    fontSize: '0.72rem', 
                    color: '#71717A', 
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginBottom: '2px'
                  }}>
                    <FolderTree size={14} /> VAULT ARCHITECTURE
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0F0F0F', textTransform: 'uppercase' }}>
                    Obsidian PARA Distribution
                  </h3>
                </div>

                <button
                  onClick={() => router.push('/knowledge')}
                  className="brutalist-btn-secondary"
                  style={{ fontSize: '0.74rem', padding: '6px 12px' }}
                >
                  <span>EXPLORE VAULT</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* PARA Cards Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', 
                gap: '12px' 
              }}>
                {Object.entries(categories).map(([catName, count]) => {
                  const meta = getCategoryMeta(catName);
                  const Icon = meta.icon;
                  const totalNotes = stats?.total_notes || 1;
                  const pct = Math.round((count / totalNotes) * 100);

                  return (
                    <div
                      key={catName}
                      onClick={() => router.push('/knowledge')}
                      style={{
                        background: '#FFFFFF',
                        border: '2px solid #0F0F0F',
                        boxShadow: '3px 3px 0px #0F0F0F',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.1s ease'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.transform = 'translate(-1px, -1px)';
                        e.currentTarget.style.boxShadow = '4px 4px 0px #0F0F0F';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '3px 3px 0px #0F0F0F';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            padding: '6px',
                            background: meta.bg,
                            border: '1px solid #0F0F0F',
                            color: '#0F0F0F',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0F0F0F' }}>
                              {catName}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#52525B', fontFamily: 'var(--font-mono)' }}>
                              {count} Notes
                            </div>
                          </div>
                        </div>

                        <span style={{ fontSize: '0.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0F0F0F' }}>
                          {pct}%
                        </span>
                      </div>

                      {/* Percentage Bar */}
                      <div style={{
                        width: '100%',
                        height: '6px',
                        background: '#F4F4F5',
                        border: '1px solid #0F0F0F',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.max(6, pct)}%`,
                          height: '100%',
                          background: '#D0FF14',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 3: Tactical Arsenal // Featured Command Vectors */}
            <div className="brutalist-card-static" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <div style={{ 
                    fontSize: '0.72rem', 
                    color: '#71717A', 
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginBottom: '2px'
                  }}>
                    <Zap size={14} /> TACTICAL PLAYBOOKS
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0F0F0F', textTransform: 'uppercase' }}>
                    Featured Command Vectors
                  </h3>
                </div>

                <button
                  onClick={() => router.push('/commands')}
                  className="brutalist-btn-secondary"
                  style={{ fontSize: '0.74rem', padding: '6px 12px' }}
                >
                  <span>VIEW ALL ({stats?.total_commands || 6})</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* Commands Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {featuredCommands.map((cmd, i) => (
                  <div 
                    key={cmd.id || i}
                    className="brutalist-card"
                    style={{
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0F0F0F' }}>
                          {cmd.title}
                        </span>
                        <span className="brutalist-tag brutalist-tag-lime" style={{ fontSize: '0.64rem', padding: '2px 6px' }}>
                          {cmd.category}
                        </span>
                      </div>

                      {/* Code Snippet Box (Dark Terminal Block) */}
                      <div style={{
                        marginTop: '10px',
                        fontSize: '0.76rem',
                        fontFamily: 'var(--font-mono)',
                        color: '#D0FF14',
                        background: '#0F0F0F',
                        border: '2px solid #0F0F0F',
                        padding: '10px 12px',
                        maxHeight: '80px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}>
                        {cmd.template}
                      </div>

                      {/* Tags */}
                      {cmd.tags && cmd.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
                          {cmd.tags.slice(0, 3).map((t: string) => (
                            <span 
                              key={t}
                              className="brutalist-tag brutalist-tag-white"
                              style={{ fontSize: '0.64rem', padding: '1px 5px' }}
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        onClick={() => handleCopy(cmd.template, `feat_${cmd.id || i}`)}
                        className="brutalist-btn-secondary"
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          fontSize: '0.74rem'
                        }}
                      >
                        {copiedId === `feat_${cmd.id || i}` ? <Check size={13} color="#15803D" /> : <Copy size={13} />}
                        <span>{copiedId === `feat_${cmd.id || i}` ? "COPIED" : "COPY"}</span>
                      </button>

                      <button
                        onClick={() => handleSendToChat(cmd.template)}
                        className="brutalist-btn-primary"
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          fontSize: '0.74rem'
                        }}
                      >
                        <Send size={12} />
                        <span>RUN IN CHAT</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 4: Dual Insights Grid (Recent Notes & Tag Matrix) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
              
              {/* Left Column: Recent Knowledge Vault Notes */}
              <div className="brutalist-card-static" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <div style={{ 
                      fontSize: '0.72rem', 
                      color: '#71717A', 
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      marginBottom: '2px'
                    }}>
                      <FileText size={14} /> VAULT LOGS
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0F0F0F', textTransform: 'uppercase' }}>
                      Recent Knowledge Notes
                    </h3>
                  </div>

                  <button
                    onClick={() => router.push('/knowledge')}
                    className="brutalist-btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                  >
                    <span>VIEW GRAPH</span>
                    <ArrowRight size={12} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentNotes.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#71717A', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', border: '1px dashed #0F0F0F' }}>
                      NO RECENT NOTES INDEXED. CLICK "SYNC VAULT" TO SCAN.
                    </div>
                  )}

                  {recentNotes.map((note, idx) => {
                    const meta = getCategoryMeta(note.category || 'General');

                    return (
                      <div
                        key={note.path || idx}
                        onClick={() => router.push('/knowledge')}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #0F0F0F',
                          boxShadow: '2px 2px 0px #0F0F0F',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.1s ease'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = '#F4F4F5';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = '#FFFFFF';
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontSize: '0.86rem', 
                            fontWeight: 800, 
                            fontFamily: 'var(--font-mono)',
                            color: '#0F0F0F', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap' 
                          }}>
                            {note.title}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span className="brutalist-tag brutalist-tag-white" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                              {note.category}
                            </span>

                            {note.folder && (
                              <span style={{ 
                                fontSize: '0.72rem', 
                                color: '#71717A', 
                                fontFamily: 'var(--font-mono)',
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap', 
                                maxWidth: '200px' 
                              }}>
                                {note.folder}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#71717A' }}>
                            {formatRelativeTime(note.modified)}
                          </div>
                          <ArrowUpRight size={14} color="#0F0F0F" style={{ marginTop: '4px', display: 'inline-block' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Vault Tag Cloud & Command Arsenal Categories */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Panel 1: Vault Tag Matrix */}
                <div className="brutalist-card-static" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <div style={{ 
                        fontSize: '0.72rem', 
                        color: '#71717A', 
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        marginBottom: '2px'
                      }}>
                        <Tag size={14} /> SEMANTIC TAXONOMY
                      </div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0F0F0F', textTransform: 'uppercase' }}>
                        Vault Topic Matrix
                      </h3>
                    </div>

                    <button
                      onClick={() => router.push('/knowledge')}
                      className="brutalist-btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                    >
                      <span>BROWSE ALL</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                    {topTags.map(item => (
                      <button
                        key={item.tag}
                        onClick={() => router.push('/knowledge')}
                        className="brutalist-tag brutalist-tag-white"
                        style={{
                          fontSize: '0.74rem',
                          cursor: 'pointer'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = '#D0FF14';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = '#FFFFFF';
                        }}
                      >
                        <span>#{item.tag}</span>
                        <span style={{ 
                          fontSize: '0.64rem', 
                          background: '#0F0F0F', 
                          color: '#FFFFFF',
                          padding: '1px 5px', 
                          marginLeft: '4px'
                        }}>
                          {item.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Panel 2: Command Categories Arsenal */}
                <div className="brutalist-card-static" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <div style={{ 
                        fontSize: '0.72rem', 
                        color: '#71717A', 
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        marginBottom: '2px'
                      }}>
                        <ShieldCheck size={14} /> ARSENAL DOMAINS
                      </div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0F0F0F', textTransform: 'uppercase' }}>
                        Command Categories
                      </h3>
                    </div>

                    <button
                      onClick={() => router.push('/commands')}
                      className="brutalist-btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                    >
                      <span>ARSENAL HUB</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {Object.entries(commandCategories).slice(0, 5).map(([cat, count]) => (
                      <div
                        key={cat}
                        onClick={() => router.push('/commands')}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #0F0F0F',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.1s ease'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = '#F4F4F5';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = '#FFFFFF';
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#0F0F0F', fontWeight: 700 }}>
                          {cat}
                        </span>
                        <span className="brutalist-tag brutalist-tag-lime" style={{ fontSize: '0.66rem', padding: '2px 6px' }}>
                          {count} vectors
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>

      <VaultInitModal
        isOpen={isVaultInitOpen}
        onClose={() => setIsVaultInitOpen(false)}
        onSuccess={() => {
          setIsVaultInitOpen(false);
          handleSyncVault();
        }}
        userName={userName}
      />
    </main>
  );
}
