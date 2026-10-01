"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import InputBar from "@/components/chat/InputBar";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import VaultInitModal from "@/components/auth/VaultInitModal";
import { useChat } from "@/hooks/useChat";
import { api } from "@/lib/api";
import { SystemStatus } from "@/types";
import { 
  Terminal, Database, Shield, Mic, Activity, ArrowUpRight, Cpu, 
  Layers, Settings, Globe, KeyRound, Sparkles, LayoutDashboard, 
  Folder, Network, CheckCircle2, ChevronRight, Clock
} from "lucide-react";
import GuestBanner from "@/components/ui/GuestBanner";

export default function Home() {
  const router = useRouter();
  const { 
    messages, 
    conversations, 
    activeConversationId, 
    isLoading, 
    sendMessage, 
    switchConversation, 
    createNewChat, 
    deleteConversation, 
    renameConversation, 
    togglePinConversation 
  } = useChat();

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [timeStr, setTimeStr] = useState<string>("");

  const [showLanding, setShowLanding] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [isVaultInitOpen, setIsVaultInitOpen] = useState<boolean>(false);
  const [activeVaultName, setActiveVaultName] = useState<string>("Local Vault");

  const [assistantName, setAssistantName] = useState("Synapse");
  const [userName, setUserName] = useState("OPERATOR");
  const [activeModel, setActiveModel] = useState<string>("");
  const [activeProvider, setActiveProvider] = useState<string>("ollama");

  // Check auth & environment setup state
  useEffect(() => {
    api.system.getStatus().then(setStatus).catch(console.error);

    const refreshUserState = () => {
      if (typeof window === 'undefined') return;
      const settingsRaw = localStorage.getItem('nexus_settings');
      const vaultInit = localStorage.getItem('nexus_vault_initialized');
      
      if (!vaultInit) {
        setIsVaultInitOpen(true);
      }

      if (settingsRaw) {
        try {
          const parsed = JSON.parse(settingsRaw);
          if (parsed.vaultPath) {
            const parts = parsed.vaultPath.split('/').filter(Boolean);
            setActiveVaultName(parts[parts.length - 1] || parsed.vaultPath);
          }
          if (parsed.userName) setUserName(parsed.userName);
          if (parsed.assistantName) setAssistantName(parsed.assistantName);
          if (parsed.selectedModel !== undefined) setActiveModel(parsed.selectedModel);
          if (parsed.llmProvider !== undefined) setActiveProvider(parsed.llmProvider);
        } catch (e) {}
      }
      api.system.getStatus().then(setStatus).catch(console.error);
    };

    refreshUserState();
    window.addEventListener("nexus_user_changed", refreshUserState);
    window.addEventListener("nexus_settings_changed", refreshUserState);
    window.addEventListener("storage", refreshUserState);

    const updateClock = () => {
      const d = new Date();
      setTimeStr(d.toISOString().slice(11, 19) + " UTC");
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("nexus_user_changed", refreshUserState);
      window.removeEventListener("nexus_settings_changed", refreshUserState);
      window.removeEventListener("storage", refreshUserState);
    };
  }, []);

  const handleInterceptSendMessage = useCallback((msg: string, image?: string) => {
    if (!msg.trim() && !image) return;
    const trimmedMsg = msg.trim();
    if (trimmedMsg === 'claude' || trimmedMsg.startsWith('claude ')) {
      let finalCommand = trimmedMsg;
      if (trimmedMsg === 'claude') {
        finalCommand = 'claude --model deepseek-r1:8b --agent synapse';
      }
      router.push(`/agent?command=${encodeURIComponent(finalCommand)}`);
      return;
    }
    sendMessage(msg, image);
  }, [sendMessage, router]);

  const handleAuthSuccess = (user: any) => {
    setUserName(user.user_name || user.email || "OPERATOR");
    setAssistantName(user.assistant_name || "Synapse");
  };

  return (
    <main style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
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
        
        {/* Main Fluid Chat Canvas */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 10,
          height: '100%',
          overflow: 'hidden',
          background: 'var(--bg-primary)'
        }}>
          
          {/* Refined Top Navigation Bar */}
          <header style={{
            height: '54px',
            background: '#FFFFFF',
            borderBottom: '2px solid #0F0F0F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
            zIndex: 20,
            userSelect: 'none'
          }}>
            {/* Left: Assistant & Engine Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  background: (!activeProvider || activeProvider === 'ollama') ? (status?.ollama_online ? '#D0FF14' : '#DC2626') : '#D0FF14',
                  border: '1px solid #0F0F0F',
                  display: 'inline-block'
                }} />
                <span style={{ fontWeight: 800, color: '#0F0F0F' }}>
                  {assistantName}
                </span>
              </div>

              <span style={{ color: '#0F0F0F' }}>//</span>

              <div className="brutalist-tag brutalist-tag-white" style={{ fontSize: '0.7rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={12} />
                <span style={{ fontWeight: 700 }}>{activeModel || status?.model || 'NO MODEL'}</span>
              </div>

              {activeProvider && activeProvider !== 'ollama' && (
                <span className="brutalist-tag brutalist-tag-black" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                  {activeProvider.toUpperCase()}
                </span>
              )}
            </div>

            {/* Center: Connected Obsidian Vault Pill */}
            <button
              onClick={() => {
                if (!isLoggedIn) {
                  setIsAuthOpen(true);
                } else {
                  setIsVaultInitOpen(true);
                }
              }}
              title={isLoggedIn ? "Click to configure or change Obsidian vault" : "Sign in to connect personal vault"}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                background: '#FFFFFF',
                border: '1px solid #0F0F0F',
                boxShadow: '2px 2px 0px #0F0F0F',
                color: '#0F0F0F',
                fontSize: '0.76rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = '#F4F4F5';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = '#FFFFFF';
              }}
            >
              <Folder size={13} color="#0F0F0F" />
              <span style={{ fontWeight: 700 }}>
                {activeVaultName}
              </span>
              <span style={{
                fontSize: '0.64rem',
                color: '#0F0F0F',
                background: isLoggedIn ? '#D0FF14' : '#F4F4F5',
                border: '1px solid #0F0F0F',
                padding: '1px 6px',
                fontWeight: 800
              }}>
                {isLoggedIn ? 'SYNCED' : 'DEMO'}
              </span>
            </button>

            {/* Right: Quick Navigation & Telemetry */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Link
                href="/knowledge"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#0F0F0F',
                  textDecoration: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
              >
                <Network size={13} />
                <span>VAULT_MAP</span>
              </Link>

              <button
                onClick={() => setIsVaultInitOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#0F0F0F',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <Folder size={13} />
                <span>VAULT_CONFIG</span>
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#71717A',
                fontSize: '0.72rem',
                borderLeft: '1px solid #0F0F0F',
                paddingLeft: '14px'
              }}>
                <Clock size={12} />
                <span>{timeStr || '16:00:00 UTC'}</span>
              </div>
            </div>
          </header>

          {/* Main Full-Height Chat Stream */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 56px)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <ChatWindow 
              messages={messages} 
              isLoading={isLoading} 
              onPromptClick={(prompt) => handleInterceptSendMessage(prompt)}
            />
            
            <InputBar onSend={handleInterceptSendMessage} isLoading={isLoading} />
          </div>

        </div>
      </div>

      <VaultInitModal
        isOpen={isVaultInitOpen}
        onClose={() => setIsVaultInitOpen(false)}
        onSuccess={(vPath) => {
          const parts = vPath.split('/').filter(Boolean);
          setActiveVaultName(parts[parts.length - 1] || vPath);
          setIsVaultInitOpen(false);
        }}
        userName={userName}
      />
    </main>
  );
}
