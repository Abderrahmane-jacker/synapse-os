"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import InputBar from "@/components/chat/InputBar";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import SetupWizard from "@/components/setup/SetupWizard";
import VaultInitModal from "@/components/auth/VaultInitModal";
import { useChat } from "@/hooks/useChat";
import { api } from "@/lib/api";
import { SystemStatus } from "@/types";
import { 
  Terminal, Database, Shield, Mic, Activity, ArrowUpRight, Cpu, 
  Layers, Settings, Globe, KeyRound, Sparkles, LayoutDashboard, 
  Folder, Network, CheckCircle2, ChevronRight, Clock
} from "lucide-react";

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

  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(false);
  const [isVaultInitOpen, setIsVaultInitOpen] = useState<boolean>(false);
  const [activeVaultName, setActiveVaultName] = useState<string>("Local Vault");

  const [assistantName, setAssistantName] = useState("Synapse");
  const [userName, setUserName] = useState("OPERATOR");
  const [activeModel, setActiveModel] = useState<string>("");
  const [activeProvider, setActiveProvider] = useState<string>("omniroute");

  // Check setup state on load
  useEffect(() => {
    api.system.getStatus().then(setStatus).catch(() => {});

    const refreshState = () => {
      if (typeof window === 'undefined') return;
      const setupDone = localStorage.getItem('nexus_setup_completed');
      const settingsRaw = localStorage.getItem('nexus_settings');
      const userRaw = localStorage.getItem('nexus_user');

      // Prompt first-time users to initialize settings if empty
      if (!setupDone) {
        setIsSetupOpen(true);
      }

      if (settingsRaw) {
        try {
          const parsed = JSON.parse(settingsRaw);
          if (parsed.selectedModel !== undefined) setActiveModel(parsed.selectedModel);
          if (parsed.llmProvider !== undefined) setActiveProvider(parsed.llmProvider);
          if (parsed.assistantName) setAssistantName(parsed.assistantName);
          if (parsed.userName) setUserName(parsed.userName);
          if (parsed.vaultPath) {
            const parts = parsed.vaultPath.split('/').filter(Boolean);
            setActiveVaultName(parts[parts.length - 1] || parsed.vaultPath);
          }
        } catch (e) {}
      }

      if (userRaw) {
        try {
          const usr = JSON.parse(userRaw);
          if (usr.user_name) setUserName(usr.user_name);
          if (usr.assistant_name) setAssistantName(usr.assistant_name);
        } catch (e) {}
      }

      api.system.getStatus().then(setStatus).catch(() => {});
    };

    refreshState();
    window.addEventListener("nexus_user_changed", refreshState);
    window.addEventListener("nexus_settings_changed", refreshState);
    window.addEventListener("storage", refreshState);

    const updateClock = () => {
      const d = new Date();
      setTimeStr(d.toISOString().slice(11, 19) + " UTC");
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("nexus_user_changed", refreshState);
      window.removeEventListener("nexus_settings_changed", refreshState);
      window.removeEventListener("storage", refreshState);
    };
  }, []);

  const handleInterceptSendMessage = useCallback((msg: string, image?: string) => {
    if (!msg.trim() && !image) return;
    const trimmedMsg = msg.trim();
    if (trimmedMsg === 'claude' || trimmedMsg.startsWith('claude ')) {
      let finalCommand = trimmedMsg;
      if (trimmedMsg === 'claude') {
        finalCommand = 'claude --model gemma4:31b-cloud --agent synapse';
      }
      router.push(`/agent?command=${encodeURIComponent(finalCommand)}`);
      return;
    }
    sendMessage(msg, image);
  }, [sendMessage, router]);

  return (
    <main style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#F4F4F5',
      position: 'relative'
    }}>
      <AnimatedBackground />

      <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', zIndex: 1 }}>
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

        {/* Central Workspace Container */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Universal Brutalist Top Bar */}
          <header style={{
            height: '56px',
            borderBottom: '2px solid #0F0F0F',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
            fontFamily: 'var(--font-mono)'
          }}>
            {/* Left: Active Intelligence Node */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  background: status?.ollama_online || activeProvider === 'omniroute' ? '#D0FF14' : '#DC2626',
                  border: '1.5px solid #0F0F0F',
                  display: 'inline-block'
                }} />
                <span style={{ fontWeight: 800, color: '#0F0F0F' }}>
                  {assistantName}
                </span>
              </div>

              <span style={{ color: '#0F0F0F' }}>//</span>

              <div className="brutalist-tag brutalist-tag-white" style={{ fontSize: '0.7rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={12} />
                <span style={{ fontWeight: 700 }}>{activeModel || (activeProvider === 'omniroute' ? 'auto/best-coding' : (status?.model || 'NO MODEL'))}</span>
              </div>

              {activeProvider && activeProvider !== 'ollama' && (
                <span className="brutalist-tag brutalist-tag-black" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                  {activeProvider.toUpperCase()}
                </span>
              )}
            </div>

            {/* Center: Connected Obsidian Vault Pill */}
            <button
              onClick={() => setIsVaultInitOpen(true)}
              title="Click to configure or change Obsidian vault"
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
                background: '#D0FF14',
                border: '1px solid #0F0F0F',
                padding: '1px 6px',
                fontWeight: 800
              }}>
                SYNCED
              </span>
            </button>

            {/* Right: Quick Navigation, Setup & Telemetry */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => setIsSetupOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #0F0F0F',
                  padding: '3px 8px',
                  boxShadow: '1px 1px 0px #0F0F0F',
                  color: '#0F0F0F',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                title="Open Initial Setup Wizard"
              >
                <Sparkles size={12} />
                <span>SETUP</span>
              </button>

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

      {/* First-Run Setup Wizard */}
      <SetupWizard 
        isOpen={isSetupOpen} 
        onComplete={() => setIsSetupOpen(false)}
        canDismiss={true}
      />

      {/* Knowledge Vault Explorer & Zip Uploader */}
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
