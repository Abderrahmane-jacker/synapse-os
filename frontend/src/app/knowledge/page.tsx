"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import GlassCard from "@/components/ui/GlassCard";
import Awa3HUDGauge from "@/components/hud/Awa3HUDGauge";
import Awa3InspectorSidebar from "@/components/hud/Awa3InspectorSidebar";
import NexusFilterPanel from "@/components/hud/NexusFilterPanel";
import NexusBottomDock from "@/components/hud/NexusBottomDock";
import KnowledgeGraphCanvas from "@/components/hud/KnowledgeGraphCanvas";
import KnowledgeGraph3D from "@/components/hud/KnowledgeGraph3D";
import TimeMachineSlider from "@/components/hud/TimeMachineSlider";
import NoteDetailModal from "@/components/hud/NoteDetailModal";
import QuickCaptureModal from "@/components/hud/QuickCaptureModal";
import LinkPredictorModal from "@/components/hud/LinkPredictorModal";
import FullChatModal from "@/components/chat/FullChatModal";
import NexusAmbientAudio from "@/components/audio/NexusAmbientAudio";

import { useChat } from "@/hooks/useChat";
import { useKnowledge } from "@/hooks/useKnowledge";
import { useVisionStream } from "@/hooks/useVisionStream";
import { api } from "@/lib/api";
import { SystemStatus } from "@/types";
import { ttsEngine } from "@/lib/tts";
import { Search, Database, RefreshCw, FileText, Calendar, Tag, LayoutGrid, Eye, RotateCcw, Volume2, VolumeX, Plus, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

export default function KnowledgePage() {
  const router = useRouter();
  const { conversations, activeConversationId, switchConversation, createNewChat, deleteConversation, renameConversation, togglePinConversation } = useChat();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const { notes, searchResults, stats, isSearching, isLoadingNotes, isIndexing, search, fetchNotes, indexVault } = useKnowledge();

  const [viewMode, setViewMode] = useState<'graph' | 'grid'>('graph');
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeDepth, setActiveDepth] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [activeModalNote, setActiveModalNote] = useState<any | null>(null);
  const [is3D, setIs3D] = useState(true);
  const [ragPathNodes, setRagPathNodes] = useState<string[]>([]);
  const [deepDiveNode, setDeepDiveNode] = useState<any | null>(null);
  const [isDeepDiveMode, setIsDeepDiveMode] = useState(false);
  const [agentSessionCommand, setAgentSessionCommand] = useState<string | null>(null);
  const [temporalMaxDate, setTemporalMaxDate] = useState<number | null>(null);
  const [temporalMinDate, setTemporalMinDate] = useState<number>(0);
  const [spawnSpeed, setSpawnSpeed] = useState<number>(1.0);
  const [temporalVaultMaxDate, setTemporalVaultMaxDate] = useState<number | null>(null);
  const [activeAgentSession, setActiveAgentSession] = useState<{ command: string; cwd: string } | null>(null);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [linkPredictorOpen, setLinkPredictorOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);


  const [activeFullChatConvId, setActiveFullChatConvId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLoggedIn(!!localStorage.getItem("nexus_auth_token"));
    }
  }, []);
  const [hudMessages, setHudMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string }[]>([]);
  const [activeHudConvId, setActiveHudConvId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("nexus_active_conv_id") || null;
    }
    return null;
  });
  const [latestAnswer, setLatestAnswer] = useState<string>("");
  const [isHudPinned, setIsHudPinned] = useState<boolean>(true);
  const [isHudMinimized, setIsHudMinimized] = useState<boolean>(false);

  const updateActiveHudConvId = useCallback((id: string | null) => {
    setActiveHudConvId(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem("nexus_active_conv_id", id);
      } else {
        localStorage.removeItem("nexus_active_conv_id");
      }
    }
  }, []);

  // Sync active conversation when conversations load if no persistent ID exists
  useEffect(() => {
    if (conversations.length > 0) {
      if (!activeHudConvId || !conversations.some(c => c.id === activeHudConvId)) {
        const defaultConv = conversations.find(c => c.is_pinned) || conversations[0];
        if (defaultConv) {
          updateActiveHudConvId(defaultConv.id);
        }
      }
    }
  }, [conversations, activeHudConvId, updateActiveHudConvId]);

  const [hudResponseText, setHudResponseText] = useState<string>("");
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isResponding, setIsResponding] = useState<boolean>(false);

  const [graphData, setGraphData] = useState<{
    total_notes: number;
    total_connections: number;
    nodes: any[];
    links: any[];
    constellation_links: any[];
    top_hubs: any[];
    category_counts: Record<string, number>;
    tag_counts: Record<string, number>;
  }>({
    total_notes: 492,
    total_connections: 1786,
    nodes: [],
    links: [],
    constellation_links: [],
    top_hubs: [],
    category_counts: {},
    tag_counts: {}
  });

  const handleNavigateNote = useCallback((targetTitle: string) => {
    if (!targetTitle) return;

    // Clean target title (strip aliases [[Note|Alias]], headings [[Note#Header]], paths, extensions)
    let clean = targetTitle.split('|')[0].split('#')[0].trim();
    clean = clean.replace(/\.md$/i, '');
    const cleanBasename = (clean.split('/').pop() || clean).toLowerCase();
    const cleanLower = clean.toLowerCase();

    const allNotes = [...notes, ...graphData.nodes];

    const foundNote = allNotes.find(n => {
      if (!n || !n.title) return false;
      const tLower = n.title.toLowerCase();
      const tBase = (n.title.split('/').pop() || n.title).replace(/\.md$/i, '').toLowerCase();
      const pBase = n.path ? (n.path.split('/').pop() || n.path).replace(/\.md$/i, '').toLowerCase() : '';

      return tLower === cleanLower ||
             tBase === cleanBasename ||
             pBase === cleanBasename ||
             tLower === cleanBasename;
    });

    if (foundNote) {
      if (isDeepDiveMode) {
        setDeepDiveNode(foundNote);
      } else {
        setActiveModalNote(foundNote);
      }
    } else {
      console.warn("Could not find note matching:", targetTitle);
    }
  }, [notes, graphData.nodes, isDeepDiveMode]);

  const loadGraph = useCallback(() => {
    api.knowledge.getGraph()
      .then(data => {
        if (data && data.nodes && data.nodes.length > 0) {
          setGraphData(data);
          // Initialize Temporal Growth boundaries
          const dates = data.nodes.map((n: any) => n.created || 0).filter((d: number) => d > 0);
          if (dates.length > 0) {
            const minD = Math.min(...dates);
            const maxD = Math.max(...dates);
            setTemporalMinDate(minD);
            setTemporalMaxDate(maxD);
            setTemporalVaultMaxDate(maxD);
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    api.system.getStatus()
      .then(setStatus)
      .catch(console.error);

    fetchNotes();
    loadGraph();
  }, [fetchNotes, loadGraph]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        search(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, search]);

  const handleResetView = useCallback(() => {
    setSelectedNode(null);
    setActiveCategory(null);
    setActiveTag(null);
    setActiveDepth(null);
    setSearchQuery("");
    setActiveModalNote(null);
    setRagPathNodes([]);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'Escape' && isDeepDiveMode) {
        setIsDeepDiveMode(false);
        setDeepDiveNode(null);
      }
      
      if (e.key.toLowerCase() === 'n' && !quickCaptureOpen) {
        e.preventDefault();
        setQuickCaptureOpen(true);
      }

      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleResetView();
      }

      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeepDiveMode, quickCaptureOpen, handleResetView]);

  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isSpeechListening, setIsSpeechListening] = useState<boolean>(false);

  const handleVoiceToggle = useCallback(() => {
    setIsVoiceActive(prev => {
      const next = !prev;
      if (ttsEngine) {
        ttsEngine.setEnabled(next);
        if (!next) setIsSpeaking(false);
      }
      return next;
    });
  }, []);

  const handleDockSendMessage = async (msg: string) => {
    if (!msg.trim()) return;

    const trimmedMsg = msg.trim();
    if (trimmedMsg === 'claude' || trimmedMsg.startsWith('claude ')) {
      let finalCommand = trimmedMsg;
      if (trimmedMsg === 'claude') {
        finalCommand = 'claude --model deepseek-r1:8b --agent synapse';
      }
      router.push(`/agent?command=${encodeURIComponent(finalCommand)}`);
      return;
    }

    if (ttsEngine) {
      ttsEngine.unlockAudio();
      ttsEngine.stop();
    }
    setIsSpeaking(false);
    setIsThinking(true);
    setIsResponding(false);
    setIsWriting(false);
    setLatestAnswer("");
    setRagPathNodes([]);

    // Vocal Audio Prompt when Assistant starts thinking
    let thinkingAnnounce = true;
    let currentUserName = "Abdo";
    try {
      const saved = localStorage.getItem("nexus_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        thinkingAnnounce = parsed.ttsThinkingAnnounce ?? true;
        if (parsed.userName) currentUserName = parsed.userName;
      }
    } catch {}

    if (ttsEngine && isVoiceActive && thinkingAnnounce) {
      setIsSpeaking(true);
      ttsEngine.speak(`Wait ${currentUserName}, I'm thinking...`, () => setIsSpeaking(false));
    }

    try {
      let imageBase64 = undefined;
      if (isVisionMode) {
        const frame = captureFrame();
        if (frame) {
          imageBase64 = frame;
        }
      }

      const res = await api.chat.send(msg, activeHudConvId || activeConversationId || undefined, imageBase64);

      if (res.conversation_id) {
        updateActiveHudConvId(res.conversation_id);
      }

      setIsThinking(false);
      setIsResponding(true);
      setIsWriting(true);

      const fullText = res.response || "No response text returned.";

      // Ultra-Accurate Node Finder Algorithm
      let targetNode: any = null;
      const lowerMsg = msg.toLowerCase().trim();

      // Sort nodes by longest title first to prevent short words like "Hub" matching prematurely
      const sortedNodes = [...graphData.nodes].sort((a, b) => (b.title || '').length - (a.title || '').length);

      // Priority 1: Direct match in user query (e.g. "tell me about the library" -> "The Library")
      for (const node of sortedNodes) {
        if (!node.title) continue;
        const nodeTitleLower = node.title.toLowerCase();
        if (nodeTitleLower.length < 3) continue;

        if (lowerMsg.includes(nodeTitleLower) || nodeTitleLower.includes(lowerMsg.replace(/^(tell me about|show me|what is|find|open)\s+/, ''))) {
          targetNode = node;
          break;
        }
      }

      // Priority 2: Wiki Link in response [[Note Title]]
      if (!targetNode) {
        const matches = fullText.match(/\[\[(.*?)\]\]/g);
        if (matches) {
          for (const rawMatch of matches) {
            const cleanTitle = rawMatch.replace(/[\[\]]/g, '').trim().toLowerCase();
            targetNode = sortedNodes.find(n => n.title && n.title.toLowerCase() === cleanTitle) ||
                         sortedNodes.find(n => n.title && (n.title.toLowerCase().includes(cleanTitle) || cleanTitle.includes(n.title.toLowerCase())));
            if (targetNode) break;
          }
        }
      }

      // Priority 3: RAG Source Title Match
      const newRagNodes: string[] = [];
      
      if (res.sources && res.sources.length > 0) {
        for (const src of res.sources) {
          const srcTitleLower = (src.title || '').toLowerCase();
          const matched = sortedNodes.find(n => n.title && n.title.toLowerCase() === srcTitleLower) ||
                          sortedNodes.find(n => n.title && srcTitleLower.includes(n.title.toLowerCase()));
          if (matched) {
            if (!newRagNodes.includes(matched.id)) {
              newRagNodes.push(matched.id);
            }
            if (!targetNode) targetNode = matched;
          }
        }
      }

      if (targetNode && newRagNodes.length === 0) {
        newRagNodes.push(targetNode.id);
      }

      if (targetNode) {
        setSelectedNode(targetNode);
      }
      
      setRagPathNodes(newRagNodes);

      // Trigger Browser Text-to-Speech (TTS) concurrently with typing
      if (ttsEngine && isVoiceActive) {
        setIsSpeaking(true);
        ttsEngine.speak(fullText, () => setIsSpeaking(false));
      }

      // Smooth Voice-Synchronized Typewriter Effect (slower, natural spoken pace)
      let charIdx = 0;
      setLatestAnswer("");

      const timer = setInterval(() => {
        charIdx += 1;
        if (charIdx >= fullText.length) {
          setLatestAnswer(fullText);
          setIsWriting(false);
          clearInterval(timer);
        } else {
          setLatestAnswer(fullText.slice(0, charIdx));
        }
      }, 32);

    } catch (err: any) {
      setIsThinking(false);
      setIsResponding(false);
      setIsWriting(false);
      setIsSpeaking(false);
      setLatestAnswer(`Error: ${err.message || "Failed to communicate with model"}`);
    }
  };

  const { isStreaming: isVisionMode, toggleStream: toggleVisionMode, captureFrame } = useVisionStream();

  const handleAgentRun = () => {
    router.push(`/?msg=${encodeURIComponent('claude --model deepseek-r1:8b --agent synapse')}`);
  };

  const displayNotes = searchQuery ? searchResults : notes;

  const handleSelectNode = useCallback((node: any) => {
    setSelectedNode(node);
  }, []);

  const handleSelectHub = useCallback((hubName: string) => {
    if (!hubName) return;
    const lower = hubName.toLowerCase();
    const match = graphData.nodes.find(n => n.title && n.title.toLowerCase() === lower) ||
                  graphData.nodes.find(n => n.title && n.title.toLowerCase().includes(lower));
    if (match) {
      setSelectedNode(match);
    } else {
      const noteMatch = notes.find(n => n.title && n.title.toLowerCase().includes(lower));
      if (noteMatch) {
        setSelectedNode({ ...noteMatch, id: (noteMatch as any).id || noteMatch.title });
      }
    }
  }, [graphData.nodes, notes]);

  const visibleNodesCount = graphData.nodes.filter(n => !temporalMaxDate || (n.created && n.created <= temporalMaxDate)).length;

  return (
    <main className="app-container" style={{ position: 'relative', overflow: 'hidden' }}>
      <AnimatedBackground />
      <NexusAmbientAudio isThinking={isThinking} visibleNodesCount={visibleNodesCount} isMuted={isAudioMuted} />

      <Sidebar 
        conversations={conversations} 
        activeId={activeHudConvId || activeConversationId} 
        onSelect={(id) => {
          updateActiveHudConvId(id);
          setActiveFullChatConvId(id);
        }} 
        onNewChat={async () => {
          const newId = await createNewChat();
          if (newId) updateActiveHudConvId(newId);
        }}
        onDelete={(id) => {
          deleteConversation(id);
          if (activeHudConvId === id) updateActiveHudConvId(null);
          if (activeFullChatConvId === id) setActiveFullChatConvId(null);
        }}
        onRename={renameConversation}
        onTogglePin={togglePinConversation}
        status={status}
      />

      <div style={{ flex: 1, position: 'relative', height: '100vh', width: '100%', overflow: 'hidden' }}>

        {/* View Switcher & Reset View Top Bar */}
        <div style={{
          position: 'absolute',
          top: '24px',
          left: '320px',
          zIndex: 35,
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => setViewMode('graph')}
            style={{
              padding: '6px 14px',
              borderRadius: '0px',
              fontSize: '0.74rem',
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              background: viewMode === 'graph' ? '#D0FF14' : '#FFFFFF',
              border: '2px solid #0F0F0F',
              boxShadow: '3px 3px 0px #0F0F0F',
              color: '#0F0F0F',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Eye size={13} /> 3D OS GRAPH
          </button>

          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '6px 14px',
              borderRadius: '0px',
              fontSize: '0.74rem',
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              background: viewMode === 'grid' ? '#D0FF14' : '#FFFFFF',
              border: '2px solid #0F0F0F',
              boxShadow: '3px 3px 0px #0F0F0F',
              color: '#0F0F0F',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LayoutGrid size={13} /> NOTES GRID
          </button>

          <button
            onClick={() => setLinkPredictorOpen(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '0px',
              fontSize: '0.74rem',
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              background: '#FFFFFF',
              border: '2px solid #0F0F0F',
              boxShadow: '3px 3px 0px #0F0F0F',
              color: '#0F0F0F',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#D0FF14';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <Zap size={13} /> LINK PREDICTOR
          </button>

          <button
            onClick={() => setQuickCaptureOpen(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '0px',
              fontSize: '0.74rem',
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              background: '#D0FF14',
              border: '2px solid #0F0F0F',
              boxShadow: '3px 3px 0px #0F0F0F',
              color: '#0F0F0F',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#E4FF66';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = '#D0FF14';
            }}
          >
            <Plus size={13} /> CAPTURE NOTE
          </button>
          
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            style={{
              padding: '6px 14px',
              borderRadius: '0px',
              fontSize: '0.74rem',
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              background: !isAudioMuted ? '#E4FF66' : '#FFFFFF',
              border: '2px solid #0F0F0F',
              boxShadow: '3px 3px 0px #0F0F0F',
              color: '#0F0F0F',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isAudioMuted ? <VolumeX size={13} /> : <Volume2 size={13} />} {isAudioMuted ? "AUDIO OFF" : "AUDIO ON"}
          </button>
        </div>

        {/* ----------------- GRAPH OS VIEW ----------------- */}
        {viewMode === 'graph' ? (
          <>
            {/* Interactive Graph Canvas (3D or 2D) */}
            {is3D ? (
              <KnowledgeGraph3D 
                nodes={graphData.nodes}
                links={graphData.links}
                constellation_links={graphData.constellation_links || []}
                searchQuery={searchQuery}
                activeCategory={activeCategory}
                activeTag={activeTag}
                activeDepth={activeDepth}
                ragPathNodes={ragPathNodes}
                selectedNode={selectedNode}
                onSelectNode={handleSelectNode}
                temporalMaxDate={temporalMaxDate}
                spawnSpeed={spawnSpeed}
                deepDiveNode={deepDiveNode}
                onDeepDiveNode={(node) => {
                  let fullNode = node;
                  if (node.title) {
                    const match = notes.find(n => n.title === node.title);
                    if (match) fullNode = { ...node, ...match };
                  }
                  setDeepDiveNode(fullNode);
                  setIsDeepDiveMode(true);
                }}
              />
            ) : (
              <KnowledgeGraphCanvas 
                nodes={graphData.nodes}
                links={graphData.links}
                searchQuery={searchQuery}
                activeCategory={activeCategory}
                selectedNode={selectedNode}
                onSelectNode={handleSelectNode}
              />
            )}

            {/* Hide standard UI in Deep Dive Mode or Fullscreen Mode */}
            {!isDeepDiveMode && !isFullscreen && (
              <>
                {/* Left Inspector Sidebar with Categories & Knowledge Hubs */}
                <Awa3InspectorSidebar
                  totalNotes={graphData.total_notes || stats?.total_notes || 492}
                  totalConnections={graphData.total_connections || 1786}
                  topHubs={graphData?.top_hubs && graphData.top_hubs.length > 0 ? graphData.top_hubs : [
                    { name: 'Architecture', count: 12 },
                    { name: 'Cloud Recon', count: 8 },
                    { name: 'Active Directory', count: 7 },
                    { name: 'Web Security', count: 6 },
                    { name: 'AI Automation', count: 5 },
                    { name: 'DevSecOps', count: 4 },
                  ]}
                  categoryCounts={graphData.category_counts}
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                  onSelectHub={handleSelectHub}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  selectedNode={selectedNode}
                  is3D={is3D}
                  onToggle3D={() => setIs3D(!is3D)}
                  onResetView={handleResetView}
                  onDeepDive={(n) => {
                    let fullNode = n;
                    if (n && n.title) {
                      const match = notes.find(item => item.title.toLowerCase() === n.title.toLowerCase());
                      if (match) fullNode = { ...n, ...match };
                    }
                    setDeepDiveNode(fullNode);
                    setIsDeepDiveMode(true);
                  }}
                />

                {/* Right SynapseOS Imperial HUD Dial */}
                <Awa3HUDGauge 
                  status={isSpeechListening ? 'SPEECH LISTEN' : isThinking ? 'THINKING...' : isWriting ? 'WRITING...' : isResponding ? 'RESPONDING' : 'ONLINE'}
                  modelName={status?.model || 'GEMMA-4-31B-CLOUD'}
                  onToggleVoice={handleVoiceToggle}
                />

                {/* Top Right Filter Panel */}
                <NexusFilterPanel 
                  tagCounts={graphData.tag_counts}
                  activeTag={activeTag}
                  activeDepth={activeDepth}
                  onSelectTag={setActiveTag}
                  onSelectDepth={setActiveDepth}
                />
              </>
            )}

            {/* Terminal Cyberpunk Typewriter Answer Box */}
            {(latestAnswer || isThinking) && !isDeepDiveMode && !isFullscreen && (
              <div style={{
                position: 'absolute',
                bottom: '92px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '680px',
                maxWidth: '92vw',
                maxHeight: '290px',
                overflowY: 'auto',
                pointerEvents: 'auto',
                overscrollBehavior: 'contain',
                background: '#0F0F0F',
                border: '2px solid #0F0F0F',
                borderRadius: '0px',
                padding: '16px 20px',
                color: '#FFFFFF',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.86rem',
                lineHeight: '1.6',
                zIndex: 45,
                boxShadow: '4px 4px 0px #0F0F0F',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  borderBottom: '1px solid #27272A',
                  paddingBottom: '8px'
                }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    color: '#D0FF14',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      width: '7px',
                      height: '7px',
                      background: '#D0FF14',
                      display: 'inline-block'
                    }} />
                    {isThinking ? '> TERMINAL // THINKING...' : isWriting ? '> TERMINAL // TYPING...' : '> TERMINAL // RESPONSE_STREAM'}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={handleVoiceToggle}
                      title={isVoiceActive ? "Voice Enabled" : "Voice Muted"}
                      style={{
                        background: isVoiceActive ? '#D0FF14' : '#27272A',
                        border: '1px solid #3F3F46',
                        borderRadius: '0px',
                        padding: '3px 8px',
                        color: isVoiceActive ? '#0F0F0F' : '#A1A1AA',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {isVoiceActive ? <Volume2 size={12} /> : <VolumeX size={12} />}
                      {isSpeaking ? 'Speaking...' : isVoiceActive ? 'VOICE ON' : 'MUTED'}
                    </button>

                    {activeHudConvId && (
                      <button
                        onClick={() => setActiveFullChatConvId(activeHudConvId)}
                        title="View complete conversation history"
                        style={{
                          background: '#27272A',
                          border: '1px solid #3F3F46',
                          borderRadius: '0px',
                          padding: '3px 8px',
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          fontFamily: 'inherit',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        HISTORY
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setLatestAnswer("");
                        setIsResponding(false);
                        setIsWriting(false);
                        setIsSpeaking(false);
                        if (ttsEngine) ttsEngine.stop();
                      }}
                      style={{
                        background: '#27272A',
                        border: '1px solid #3F3F46',
                        borderRadius: '0px',
                        width: '22px',
                        height: '22px',
                        color: '#A1A1AA',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div style={{ whiteSpace: 'pre-wrap', color: '#F4F4F5' }}>
                  {isThinking ? (
                    <span style={{ color: '#FDE047' }}>
                      &gt; Initializing neural search query... Scanning obsidian vault...
                    </span>
                  ) : (
                    <>
                      <span style={{ color: '#D0FF14', fontWeight: 800 }}>&gt; </span>
                      {latestAnswer}
                      {isWriting && (
                        <span style={{
                          color: '#D0FF14',
                          fontWeight: 900,
                          backgroundColor: '#D0FF14',
                          width: '8px',
                          height: '14px',
                          display: 'inline-block',
                          marginLeft: '4px'
                        }}></span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Controls / Dock */}
            {!isDeepDiveMode && !isFullscreen && (
              <>
                {/* Time Machine Slider (Bottom Left — below Inspector Sidebar) */}
                {temporalMaxDate !== null && temporalMinDate > 0 && viewMode === 'graph' && is3D && (
                  <div style={{
                    position: 'absolute',
                    bottom: '90px',
                    left: '24px',
                    zIndex: 45,
                    pointerEvents: 'auto',
                  }}>
                    <TimeMachineSlider 
                      minDate={temporalMinDate}
                      maxDate={temporalVaultMaxDate !== null ? temporalVaultMaxDate : temporalMaxDate} 
                      currentDate={temporalMaxDate}
                      onDateChange={setTemporalMaxDate}
                      spawnSpeed={spawnSpeed}
                      onSpawnSpeedChange={setSpawnSpeed}
                    />
                  </div>
                )}

                {/* Main Dock (Center) */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center z-40 pointer-events-none">
                  <NexusBottomDock
                    onSendMessage={handleDockSendMessage}
                    onVoiceToggle={handleVoiceToggle}
                    onResetView={handleResetView}
                    onAgentRun={handleAgentRun}
                    onSpeechListenChange={setIsSpeechListening}
                    isLoading={isThinking}
                    isResponding={isResponding}
                    isSpeaking={isSpeaking}
                    isVoiceActive={isVoiceActive}
                    isCanvasMode={!is3D}
                    onToggleCanvasMode={() => setIs3D(!is3D)}
                    isVisionMode={isVisionMode}
                    onToggleVisionMode={toggleVisionMode}
                  />
                </div>
              </>
            )}
            
            {/* ----------------- DEEP DIVE HOLOGRAPHIC HUD ----------------- */}
            {isDeepDiveMode && deepDiveNode && (
              <NoteDetailModal 
                note={deepDiveNode} 
                onClose={() => { 
                  setIsDeepDiveMode(false); 
                  setDeepDiveNode(null); 
                }} 
                onSelectNote={handleNavigateNote}
              />
            )}

            {/* Bottom Dock removed */}

            {/* Full Conversation History Viewer Modal */}
            {activeFullChatConvId && (
              <FullChatModal
                conversationId={activeFullChatConvId}
                onClose={() => setActiveFullChatConvId(null)}
                onInterceptCommand={(cmd) => {
                  setActiveFullChatConvId(null);
                  setAgentSessionCommand(cmd);
                }}
              />
            )}
          </>
        ) : (
          /* ----------------- GRID NOTES VIEW ----------------- */
          <div style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '2rem 3rem' }}>
            <div style={{ maxWidth: '1100px', margin: '3rem auto 0 auto' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '6px', color: '#0F0F0F', letterSpacing: '-0.02em' }}>Knowledge Vault Matrix</h1>
                  <p style={{ color: '#52525B', fontSize: '0.88rem' }}>Location: <span style={{ color: '#80A300', fontWeight: 800 }}>{isLoggedIn ? (stats?.vault_path || 'Mounted Vault') : 'SynapseOS Virtual Demo Matrix'}</span> · {stats?.total_notes || notes.length} indexed notes</p>
                </div>
                
                <button
                  onClick={() => { indexVault(); loadGraph(); }}
                  disabled={isIndexing}
                  style={{
                    fontSize: '0.82rem',
                    padding: '8px 16px',
                    opacity: isIndexing ? 0.7 : 1,
                    cursor: isIndexing ? 'not-allowed' : 'pointer',
                    background: '#D0FF14',
                    border: '2px solid #0F0F0F',
                    boxShadow: '3px 3px 0px #0F0F0F',
                    color: '#0F0F0F',
                    fontWeight: 900,
                    borderRadius: '0px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}
                >
                  <RefreshCw size={14} className={isIndexing ? 'spinning' : ''} />
                  <span>{isIndexing ? 'INDEXING...' : 'INDEX VAULT'}</span>
                </button>
              </div>

              {/* Depth Filter Pills Bar */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '2rem' }}>
                {[
                  { level: null, name: 'All' },
                  { level: 0, name: 'Depth 0 (Root)' },
                  { level: 1, name: 'Depth 1 (Daughter)' },
                  { level: 2, name: 'Depth 2 (Grandchild)' },
                  { level: 3, name: 'Depth 3 (Sub-branch)' },
                  { level: 4, name: 'Depth 4+ (Leaves)' }
                ].map(depthObj => {
                  const isSelected = activeDepth === depthObj.level;
                  return (
                    <button
                      key={depthObj.name}
                      onClick={() => setActiveDepth(depthObj.level)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '0px',
                        fontSize: '0.74rem',
                        fontWeight: isSelected ? 800 : 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        background: isSelected ? '#D0FF14' : '#FFFFFF',
                        border: '1px solid #0F0F0F',
                        boxShadow: isSelected ? '2px 2px 0px #0F0F0F' : 'none',
                        color: '#0F0F0F',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.1s'
                      }}
                    >
                      {depthObj.name}
                    </button>
                  );
                })}
              </div>

              {/* Note Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', paddingBottom: '4rem' }}>
                {isLoadingNotes || isSearching ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ padding: '20px', minHeight: '140px', background: '#FFFFFF', border: '2px solid #0F0F0F', boxShadow: '4px 4px 0px #0F0F0F' }}>
                      <div style={{ height: '20px', width: '70%', background: '#F4F4F5', border: '1px solid #0F0F0F', marginBottom: '12px' }} />
                      <div style={{ height: '14px', width: '100%', background: '#F4F4F5', marginBottom: '8px' }} />
                    </div>
                  ))
                ) : displayNotes.length > 0 ? (
                  displayNotes
                    .filter(note => {
                      if (activeDepth === null) return true;
                      const graphNode = graphData.nodes.find(n => n.title === note.title);
                      const nodeDepth = graphNode ? (graphNode.depth !== undefined ? graphNode.depth : (graphNode.connections > 15 ? 0 : graphNode.connections > 5 ? 1 : 2)) : 2;
                      return Math.min(nodeDepth, 4) === activeDepth;
                    })
                    .map((note: any, i) => {
                      const graphNode = graphData.nodes.find(n => n.title === note.title);
                      const nodeDepth = graphNode ? (graphNode.depth !== undefined ? graphNode.depth : (graphNode.connections > 15 ? 0 : graphNode.connections > 5 ? 1 : 2)) : 2;
                      const clampedDepth = Math.min(nodeDepth, 4);

                      let catName = "Depth 2 (Grandchild)";
                      if (clampedDepth === 0) { catName = "Depth 0 (Root)"; }
                      else if (clampedDepth === 1) { catName = "Depth 1 (Daughter)"; }
                      else if (clampedDepth === 3) { catName = "Depth 3 (Sub-branch)"; }
                      else if (clampedDepth === 4) { catName = "Depth 4+ (Leaves)"; }

                      return (
                        <div
                          key={i}
                          onClick={() => setActiveModalNote(note)}
                          style={{
                            background: '#FFFFFF',
                            border: '2px solid #0F0F0F',
                            borderRadius: '0px',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '4px 4px 0px #0F0F0F',
                            transition: 'all 0.1s ease',
                            cursor: 'pointer'
                          }}
                          onMouseOver={e => {
                            e.currentTarget.style.transform = 'translate(-2px, -2px)';
                            e.currentTarget.style.boxShadow = '6px 6px 0px #0F0F0F';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.transform = 'translate(0, 0)';
                            e.currentTarget.style.boxShadow = '4px 4px 0px #0F0F0F';
                          }}
                        >
                          {/* Card Header: Category Badge + Title */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '0px',
                              background: '#F4F4F5',
                              border: '1px solid #0F0F0F',
                              color: '#0F0F0F',
                              fontFamily: "'JetBrains Mono', monospace",
                              letterSpacing: '0.04em',
                            }}>
                              {catName}
                            </span>

                            {note.score && (
                              <span style={{ fontSize: '0.72rem', color: '#0F0F0F', background: '#D0FF14', padding: '1px 5px', border: '1px solid #0F0F0F', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                                {Math.round(note.score * 100)}% match
                              </span>
                            )}
                          </div>

                          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '8px', color: '#0F0F0F', lineHeight: 1.35, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {note.title}
                          </h3>

                          <p style={{
                            fontSize: '0.84rem',
                            color: '#52525B',
                            lineHeight: 1.5,
                            marginBottom: '16px',
                            flex: 1,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {note.content}
                          </p>

                          {/* Footer Tags */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #0F0F0F' }}>
                            <div style={{ display: 'flex', gap: '4px', overflow: 'hidden' }}>
                              {note.tags && note.tags.slice(0, 2).map((tag: string) => (
                                <span key={tag} style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '0px', background: '#FAFAFA', border: '1px solid #0F0F0F', color: '#0F0F0F', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                                  <Tag size={9} /> #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: '#71717A', fontFamily: "'JetBrains Mono', monospace" }}>
                    No notes found for Depth {activeDepth}. Try selecting "All".
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Full Note Detail Modal */}
      <NoteDetailModal 
        note={activeModalNote} 
        onClose={() => setActiveModalNote(null)} 
        onSelectNote={handleNavigateNote}
      />

      {/* Floating Quick Capture FAB */}
      <button
        onClick={() => setQuickCaptureOpen(true)}
        title="Quick Capture (N)"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '196px',
          zIndex: 60,
          width: '46px',
          height: '46px',
          borderRadius: '0px',
          background: '#D0FF14',
          border: '2px solid #0F0F0F',
          color: '#0F0F0F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '4px 4px 0px #0F0F0F',
          transition: 'all 0.1s ease',
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = '#E4FF66';
          e.currentTarget.style.transform = 'translate(-1px, -1px)';
          e.currentTarget.style.boxShadow = '5px 5px 0px #0F0F0F';
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = '#D0FF14';
          e.currentTarget.style.transform = 'translate(0, 0)';
          e.currentTarget.style.boxShadow = '4px 4px 0px #0F0F0F';
        }}
      >
        <Plus size={22} />
      </button>

      {/* Quick Capture Modal */}
      <QuickCaptureModal
        isOpen={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        onNoteCreated={() => {
          fetchNotes();
          loadGraph();
        }}
        existingTags={Object.keys(graphData.tag_counts || {})}
      />

      {/* AI Link Predictor Modal */}
      <LinkPredictorModal
        isOpen={linkPredictorOpen}
        onClose={() => setLinkPredictorOpen(false)}
        onLinkConnected={() => {
          fetchNotes();
          loadGraph();
        }}
      />

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spinning { animation: spin 1s linear infinite; }
      `}</style>
    </main>
  );
}
