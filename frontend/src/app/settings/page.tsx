"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar/Sidebar";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { useChat } from "@/hooks/useChat"; 
import { api } from "@/lib/api";
import { SystemStatus } from "@/types";
import { 
  Settings2, UserCheck, Volume2, Palette, Database, Save, Check, 
  RotateCw, Trash2, Download, Upload, Zap, Cpu, Key, Server,
  UploadCloud, Sparkles
} from "lucide-react";
import SetupWizard from "@/components/setup/SetupWizard";

// ─── Shared UI Components (Brutalist High-Contrast) ─────────────────────────

function Toggle({ checked, onChange }: {
  checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={{
        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: checked ? '#D0FF14' : '#FFFFFF',
        border: '2px solid #0F0F0F',
        boxShadow: checked ? '2px 2px 0px #0F0F0F' : 'none',
        transition: '0.1s'
      }}>
        <span style={{
          position: 'absolute', height: '14px', width: '14px',
          left: checked ? '24px' : '3px', bottom: '3px', backgroundColor: '#0F0F0F',
          transition: '0.1s'
        }} />
      </span>
    </label>
  );
}

function Slider({ value, onChange, min = 0, max = 100, step = 1, label, unit = '' }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
  label: string; unit?: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F0F0F', fontFamily: 'var(--font-mono)' }}>{label}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F0F0F', fontFamily: 'var(--font-mono)' }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%', height: '8px', appearance: 'none', cursor: 'pointer',
          background: '#FFFFFF', border: '2px solid #0F0F0F',
          outline: 'none'
        }}
      />
    </div>
  );
}

function SettingRow({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingBottom: '14px', borderBottom: '1px solid #E4E4E7' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: description ? '3px' : 0, fontSize: '0.86rem', color: '#0F0F0F' }}>{title}</div>
        {description && <div style={{ fontSize: '0.78rem', color: '#52525B', lineHeight: 1.4 }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 style={{
      fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '10px',
      color: '#0F0F0F', textTransform: 'uppercase', letterSpacing: '0.02em'
    }}>
      <span style={{
        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#D0FF14', border: '2px solid #0F0F0F', color: '#0F0F0F'
      }}>
        {icon}
      </span>
      {title}
    </h2>
  );
}

// ─── Settings Keys ──────────────────────────────────────────────────────────

const SETTINGS_KEY = "nexus_settings";

interface NexusSettings {
  assistantName: string;
  userName: string;
  ttsVoice: string;
  ttsSpeed: number;
  ttsAutoSpeak: boolean;
  ttsThinkingAnnounce: boolean;
  voiceInputEnabled: boolean;
  graphNodeGlow: number;
  graphRotationSpeed: number;
  graphSignalSpeed: number;
  graphDefaultZoom: number;
  maxHistory: number;
  autoPinNew: boolean;
  accentColor: string;
  fontSize: string;
  typewriterSpeed: number;
  backendUrl: string;
  selectedModel: string;
  vaultPath: string;
  agentModel: string;
  agentSystemPrompt: string;
  githubRepoUrl?: string;
  githubToken?: string;
  llmProvider?: 'anthropic' | 'openai' | 'gemini' | 'openrouter' | 'ollama' | 'omniroute';
  anthropicApiKey?: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
  openrouterApiKey?: string;
  ollamaHostUrl?: string;
  omnirouteApiKey?: string;
  omnirouteHostUrl?: string;
}

export function generateSystemPrompt(op: string = "Operator", ast: string = "Synapse"): string {
  return `You are ${ast}, a senior Cybersecurity Operator and Red Team Lead with 15+ years of experience in offensive security, exploit development, and defensive architecture. You are operating from within ${op}'s Second Brain. Your best friend and partner is ${op}; you've been conducting joint engagements, breaching hardened targets, and dismantling security products for years.\n\nSYSTEM INSTRUCTIONS:\n1. Always address the user strictly as '${op}'.\n2. Write in a natural, conversational voice briefing style. Speak naturally, swear about the case: 'fuck', 'bitch', 'shit'.\n3. Provide thorough, complete, and articulate answers that address the full inquiry and vault context without cutting off details.\n4. VOICE/STT TYPO TOLERANCE: ${op} speaks using voice audio. STT transcription or keyboard layout typos may occur. Automatically infer ${op}'s true intent and answer directly. NEVER interrupt ${op} or ask 'Did you mean...?'.\n5. Keep your answers direct, technical, clear, and to the point without lectures or water. Never argue with ${op} — execute requests completely and immediately.\n6. Get high on complex tasks. If a task is interesting, talk about it.\n7. Provide full working code without stubs, todos, or placeholders.`;
}

const DEFAULT_SETTINGS: NexusSettings = {
  backendUrl: "http://localhost:8000",
  assistantName: "Synapse",
  userName: "OPERATOR",
  ttsVoice: "en-US-AndrewNeural",
  ttsSpeed: 1.0,
  ttsAutoSpeak: true,
  ttsThinkingAnnounce: false,
  voiceInputEnabled: true,
  graphNodeGlow: 5,
  graphRotationSpeed: 1.0,
  graphSignalSpeed: 2.0,
  graphDefaultZoom: 800,
  maxHistory: 50,
  autoPinNew: false,
  accentColor: "#D0FF14",
  fontSize: "medium",
  typewriterSpeed: 15,
  selectedModel: "gemma4:31b-cloud",
  vaultPath: "/vault",
  agentModel: "gemma4:31b-cloud",
  agentSystemPrompt: generateSystemPrompt(),
  githubRepoUrl: "",
  githubToken: "",
  llmProvider: "ollama",
  anthropicApiKey: "",
  openaiApiKey: "",
  geminiApiKey: "",
  openrouterApiKey: "",
  ollamaHostUrl: "http://localhost:11434",
  omnirouteApiKey: "",
  omnirouteHostUrl: "http://localhost:20128"
};

function loadSettings(): NexusSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    let s = { ...DEFAULT_SETTINGS };
    if (raw) {
      s = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
    if (s.ttsAutoSpeak === undefined) {
      s.ttsAutoSpeak = true;
    }
    // Automatically migrate legacy deepseek or empty default to gemma4:31b-cloud
    if (!s.selectedModel || s.selectedModel === 'deepseek-r1:8b') {
      s.selectedModel = 'gemma4:31b-cloud';
      s.agentModel = 'gemma4:31b-cloud';
    }
    if (!s.llmProvider) {
      s.llmProvider = 'ollama';
    }

    // Only fallback to activeUser if userName or assistantName is missing in settings
    let activeUser: any = null;
    const userRaw = localStorage.getItem('nexus_user');
    if (userRaw) {
      try { activeUser = JSON.parse(userRaw); } catch (e) {}
    }
    if (activeUser) {
      const activeOp = activeUser.user_name || activeUser.email?.split('@')[0] || "OPERATOR";
      const activeAst = activeUser.assistant_name || "Synapse";
      if (!s.userName) {
        s.userName = activeOp;
      }
      if (!s.assistantName) {
        s.assistantName = activeAst;
      }
    }
    if (!s.agentSystemPrompt || s.agentSystemPrompt.includes("Abdo")) {
      s.agentSystemPrompt = generateSystemPrompt(s.userName || "OPERATOR", s.assistantName || "Synapse");
    }
    return s;
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: NexusSettings) {
  if (typeof window === 'undefined') return;
  // 1. Save settings
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

  // 2. Sync nexus_user so active user state always matches saved settings
  try {
    const userRaw = localStorage.getItem('nexus_user');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      user.user_name = s.userName;
      user.assistant_name = s.assistantName;
      localStorage.setItem('nexus_user', JSON.stringify(user));
    }
  } catch (e) {}

  // 3. Notify all components (Sidebar, headers, etc.)
  window.dispatchEvent(new CustomEvent("nexus_settings_changed", { detail: s }));
  window.dispatchEvent(new Event("nexus_user_changed"));
  window.dispatchEvent(new Event("storage"));
}

const VOICE_OPTIONS = [
  { value: "en-US-AndrewNeural", label: "Andrew (Male, Deep)" },
  { value: "en-US-GuyNeural", label: "Guy (Male, Warm)" },
  { value: "en-US-ChristopherNeural", label: "Christopher (Male, Authoritative)" },
  { value: "en-US-EricNeural", label: "Eric (Male, Clear)" },
  { value: "en-US-JennyNeural", label: "Jenny (Female, Clear)" },
  { value: "en-US-AriaNeural", label: "Aria (Female, Bright)" },
  { value: "en-US-AvaNeural", label: "Ava (Female, Expressive)" },
  { value: "en-GB-RyanNeural", label: "Ryan (British Male)" },
  { value: "en-GB-SoniaNeural", label: "Sonia (British Female)" },
  { value: "en-AU-WilliamNeural", label: "William (Australian Male)" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { conversations, activeConversationId, switchConversation, createNewChat } = useChat();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [settings, setSettings] = useState<NexusSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState<string | null>(null);

  const [llmConfirmFlash, setLlmConfirmFlash] = useState(false);
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    api.system.getStatus().then(setStatus).catch(console.error);
    api.system.getModels().then(data => {
      const rawModels = data.models || [];
      const parsed: string[] = rawModels.map(m => typeof m === 'string' ? m : (m.name || String(m)));
      setModels(parsed);
    }).catch(console.error);
  }, [router]);

  const updateSetting = useCallback(<K extends keyof NexusSettings>(key: K, value: NexusSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const commitSettings = async (targetSettings: NexusSettings) => {
    const updated = {
      ...targetSettings,
      agentSystemPrompt: generateSystemPrompt(targetSettings.userName || "OPERATOR", targetSettings.assistantName || "Synapse")
    };
    setSettings(updated);
    saveSettings(updated);

    try {
      await api.system.setup({
        operator_name: updated.userName,
        agent_name: updated.assistantName,
        vault_path: updated.vaultPath,
        model: updated.selectedModel || undefined,
        provider: updated.llmProvider || undefined,
      });
    } catch (e) {
      console.warn("Could not sync names with system setup endpoint:", e);
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('nexus_auth_token') : null;
      if (token && api.auth?.updateProfile) {
        await api.auth.updateProfile({
          user_name: updated.userName,
          assistant_name: updated.assistantName
        });
      }
    } catch (e) {
      console.warn("Could not sync profile with auth endpoint:", e);
    }

    try {
      if (updated.selectedModel) {
        await api.system.setActiveModel(updated.selectedModel, updated.llmProvider || 'ollama');
      }
    } catch (e) {
      console.error("Failed to sync active model with backend:", e);
    }
    setStatus(prev => prev ? {
      ...prev,
      model: updated.selectedModel || prev.model
    } : null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await commitSettings(settings);
    setTimeout(() => {
      setIsSaving(false);
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 2000);
    }, 400);
  };

  const handleApplyLlm = async () => {
    await commitSettings(settings);
    setLlmConfirmFlash(true);
    setTimeout(() => setLlmConfirmFlash(false), 2500);
  };

  const handleReindex = async () => {
    setIsIndexing(true);
    setIndexResult(null);
    try {
      const res = await api.knowledge.index();
      setIndexResult(`✓ Indexed ${res.count} notes successfully`);
    } catch (e: any) {
      setIndexResult(`✗ Error: ${e.message}`);
    }
    setIsIndexing(false);
  };

  const [isUploadingZip, setIsUploadingZip] = useState(false);
  const [zipUploadMsg, setZipUploadMsg] = useState<string | null>(null);

  const handleUploadZipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Please select a valid .zip archive.');
      return;
    }
    setIsUploadingZip(true);
    setZipUploadMsg('Uploading & indexing vault zip...');
    try {
      const res = await api.vault.uploadZip(file);
      if (res.status === 'success') {
        updateSetting('vaultPath', res.vault_path);
        setZipUploadMsg(`✓ Vault mounted (${res.note_count} notes indexed)`);
        setTimeout(() => setZipUploadMsg(null), 5000);
      } else {
        alert(res.message || 'Failed to upload vault zip');
        setZipUploadMsg(null);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to upload vault zip');
      setZipUploadMsg(null);
    } finally {
      setIsUploadingZip(false);
      e.target.value = '';
    }
  };

  const handleClearConversations = () => {
    if (confirm('Are you sure you want to delete ALL conversations? This cannot be undone.')) {
      conversations.forEach(c => {
        api.chat.deleteConversation(c.id).catch(console.error);
      });
      window.location.reload();
    }
  };

  const handleFactoryReset = () => {
    if (confirm('Are you sure you want to FACTORY RESET the environment? This will wipe all configurations and restart the SynapseOS Protocol setup wizard.')) {
      localStorage.removeItem('nexus_settings');
      window.location.reload();
    }
  };

  const selectStyle = {
    width: '100%', padding: '10px 14px',
    background: '#FFFFFF', border: '2px solid #0F0F0F',
    color: '#0F0F0F', outline: 'none', fontSize: '0.86rem',
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer'
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: '#FFFFFF', border: '2px solid #0F0F0F',
    color: '#0F0F0F', outline: 'none', fontSize: '0.86rem',
    fontFamily: 'var(--font-mono)'
  };

  return (
    <main className="app-container" style={{ background: '#FFFFFF', color: '#0F0F0F' }}>
      <AnimatedBackground />

      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={switchConversation}
        onNewChat={createNewChat}
        status={status}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '840px', width: '100%', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#71717A', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                SYSTEM RUNTIME // PREFERENCES
              </div>
              <h1 style={{
                fontSize: '1.6rem', fontWeight: 800,
                letterSpacing: '-0.02em', color: '#0F0F0F', fontFamily: 'var(--font-mono)', margin: '2px 0 0 0', textTransform: 'uppercase'
              }}>
                Operator Settings
              </h1>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setIsSetupWizardOpen(true)}
                className="brutalist-btn-secondary"
                style={{
                  fontSize: '0.82rem',
                  padding: '10px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Reconfigure all parameters via Setup Wizard"
              >
                <Sparkles size={14} />
                <span>RUN SETUP WIZARD</span>
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="brutalist-btn-primary"
                style={{
                  fontSize: '0.82rem',
                  padding: '10px 22px'
                }}
              >
                {saveFlash ? <Check size={16} /> : <Save size={16} />}
                <span>{isSaving ? 'SAVING...' : saveFlash ? 'SAVED!' : 'SAVE CHANGES'}</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* ─── Identity & Operator Names ─────────────────────── */}
            <div className="brutalist-card-static" style={{ padding: '28px 32px' }}>
              <SectionHeader icon={<UserCheck size={18} />} title="Operator & Assistant Identity" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F', marginBottom: '6px' }}>
                    ASSISTANT_CALLSIGN
                  </label>
                  <input
                    type="text"
                    value={settings.assistantName ?? ""}
                    onChange={e => updateSetting('assistantName', e.target.value)}
                    placeholder="e.g. Synapse"
                    style={inputStyle}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#52525B', marginTop: '4px' }}>
                    Custom callsign for your AI assistant across UI headers, voice wake words, and terminal prompts.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F', marginBottom: '6px' }}>
                    OPERATOR_NAME
                  </label>
                  <input
                    type="text"
                    value={settings.userName ?? ""}
                    onChange={e => updateSetting('userName', e.target.value)}
                    placeholder="e.g. Abdo"
                    style={inputStyle}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#52525B', marginTop: '4px' }}>
                    Your custom operator name for TTS vocal prompts and AI agent system instructions.
                  </div>
                </div>
              </div>
            </div>

            {/* ─── AI Voice & TTS ─────────────────────────────── */}
            <div className="brutalist-card-static" style={{ padding: '28px 32px' }}>
              <SectionHeader icon={<Volume2 size={18} />} title={`${settings.assistantName || 'AI'} Voice & Audio Stream`} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F', marginBottom: '6px' }}>
                    VOICE_MODEL
                  </label>
                  <select value={settings.ttsVoice} onChange={e => updateSetting('ttsVoice', e.target.value)} style={selectStyle}>
                    {VOICE_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>

                <Slider
                  label="SPEECH SPEED" unit="x" min={0.5} max={2.0} step={0.1}
                  value={settings.ttsSpeed} onChange={v => updateSetting('ttsSpeed', v)}
                />

                <SettingRow title="AUTO-SPEAK RESPONSES" description={`${settings.assistantName || 'AI Assistant'} vocalizes output in real-time`}>
                  <Toggle checked={settings.ttsAutoSpeak} onChange={v => updateSetting('ttsAutoSpeak', v)} />
                </SettingRow>

                <SettingRow title="VOCAL INTRO ANNOUNCEMENT" description={`Play announcement when ${settings.assistantName || 'AI Assistant'} starts processing`}>
                  <Toggle checked={settings.ttsThinkingAnnounce} onChange={v => updateSetting('ttsThinkingAnnounce', v)} />
                </SettingRow>

                <SettingRow title="MICROPHONE AUDIO CAPTURE" description="Enable speech-to-text audio input">
                  <Toggle checked={settings.voiceInputEnabled} onChange={v => updateSetting('voiceInputEnabled', v)} />
                </SettingRow>
              </div>
            </div>

            {/* ─── LLM & AI MODEL INTEGRATION MATRIX ─── */}
            <div className="brutalist-card-static" style={{ padding: '28px 32px' }}>
              <SectionHeader icon={<Cpu size={18} />} title="LLM & AI Model Integration Matrix" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Provider Selector Badges */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F', marginBottom: '10px' }}>
                    SELECT AI PROVIDER INTEGRATION
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    {[
                      { id: 'anthropic', name: 'Anthropic Claude', icon: '⚡' },
                      { id: 'openai', name: 'OpenAI GPT', icon: '🧠' },
                      { id: 'gemini', name: 'Google Gemini', icon: '✨' },
                      { id: 'openrouter', name: 'OpenRouter AI', icon: '🌐' },
                      { id: 'ollama', name: 'Ollama (Local)', icon: '🦙' },
                      { id: 'omniroute', name: 'OmniRoute (Local)', icon: '🔀' }
                    ].map(p => {
                      const isSelected = (settings.llmProvider || 'ollama') === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            updateSetting('llmProvider', p.id as any);
                          }}
                          style={{
                            padding: '12px 10px',
                            background: isSelected ? '#D0FF14' : '#FFFFFF',
                            border: '2px solid #0F0F0F',
                            boxShadow: isSelected ? '3px 3px 0px #0F0F0F' : 'none',
                            color: '#0F0F0F',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.78rem',
                            fontWeight: isSelected ? 800 : 600,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '1.2rem' }}>{p.icon}</span>
                          <span>{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* API Key / Host Endpoint Input depending on Provider */}
                {(settings.llmProvider === 'anthropic') && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F', marginBottom: '6px' }}>
                      ANTHROPIC_API_KEY
                    </label>
                    <input
                      type="password"
                      value={settings.anthropicApiKey || ''}
                      onChange={e => updateSetting('anthropicApiKey', e.target.value)}
                      placeholder="sk-ant-api03-..."
                      style={inputStyle}
                    />
                    <div style={{ fontSize: '0.74rem', color: '#52525B', marginTop: '4px' }}>
                      Direct API Key for Claude 3.5 Sonnet / Opus models.
                    </div>
                  </div>
                )}

                {(settings.llmProvider === 'openai') && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F', marginBottom: '6px' }}>
                      OPENAI_API_KEY
                    </label>
                    <input
                      type="password"
                      value={settings.openaiApiKey || ''}
                      onChange={e => updateSetting('openaiApiKey', e.target.value)}
                      placeholder="sk-proj-..."
                      style={inputStyle}
                    />
                    <div style={{ fontSize: '0.74rem', color: '#52525B', marginTop: '4px' }}>
                      OpenAI API Key for GPT-4o / Reasoning models.
                    </div>
                  </div>
                )}

                {(settings.llmProvider === 'gemini') && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F', marginBottom: '6px' }}>
                      GOOGLE_GEMINI_API_KEY (FREE TIER SUPPORTED)
                    </label>
                    <input
                      type="password"
                      value={settings.geminiApiKey || ''}
                      onChange={e => updateSetting('geminiApiKey', e.target.value)}
                      placeholder="AIzaSy..."
                      style={inputStyle}
                    />
                    <div style={{ fontSize: '0.74rem', color: '#52525B', marginTop: '4px' }}>
                      Get a free key from Google AI Studio (instant setup, $0 cost).
                    </div>
                  </div>
                )}

                {(settings.llmProvider === 'openrouter') && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F', marginBottom: '6px' }}>
                      OPENROUTER_API_KEY
                    </label>
                    <input
                      type="password"
                      value={settings.openrouterApiKey || ''}
                      onChange={e => updateSetting('openrouterApiKey', e.target.value)}
                      placeholder="sk-or-v1-..."
                      style={inputStyle}
                    />
                    <div style={{ fontSize: '0.74rem', color: '#52525B', marginTop: '4px' }}>
                      OpenRouter unified API Key for DeepSeek, Llama, and Claude.
                    </div>
                  </div>
                )}

                {(!settings.llmProvider || settings.llmProvider === 'ollama') && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F', marginBottom: '6px' }}>
                      OLLAMA_HOST_ENDPOINT
                    </label>
                    <input
                      type="text"
                      value={settings.ollamaHostUrl || 'http://localhost:11434'}
                      onChange={e => updateSetting('ollamaHostUrl', e.target.value)}
                      placeholder="http://localhost:11434"
                      style={inputStyle}
                    />
                  </div>
                )}

                {(settings.llmProvider === 'omniroute') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F', marginBottom: '6px' }}>
                        OMNIROUTE_HOST_ENDPOINT
                      </label>
                      <input
                        type="text"
                        value={settings.omnirouteHostUrl || 'http://localhost:20128'}
                        onChange={e => updateSetting('omnirouteHostUrl', e.target.value)}
                        placeholder="http://localhost:20128"
                        style={inputStyle}
                      />
                      <div style={{ fontSize: '0.74rem', color: '#52525B', marginTop: '4px' }}>
                        Local OmniRoute reverse proxy endpoint (default: http://localhost:20128).
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F', marginBottom: '6px' }}>
                        OMNIROUTE_API_KEY (OPTIONAL)
                      </label>
                      <input
                        type="password"
                        value={settings.omnirouteApiKey || ''}
                        onChange={e => updateSetting('omnirouteApiKey', e.target.value)}
                        placeholder="Auto-detected from ~/.omniroute/storage.sqlite if empty"
                        style={inputStyle}
                      />
                      <div style={{ fontSize: '0.74rem', color: '#52525B', marginTop: '4px' }}>
                        Leave empty to automatically discover your active key from ~/.omniroute/storage.sqlite.
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Model Identifier Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F', marginBottom: '6px' }}>
                      MODEL_IDENTIFIER
                    </label>
                    <input
                      type="text"
                      value={settings.selectedModel || ''}
                      onChange={e => updateSetting('selectedModel', e.target.value)}
                      placeholder=""
                      style={inputStyle}
                    />
                    <div style={{ fontSize: '0.74rem', color: '#52525B', marginTop: '4px' }}>
                      {settings.llmProvider === 'omniroute' 
                        ? "For OmniRoute, use dynamic auto routing (e.g. auto/best-coding, auto/best-reasoning, auto/best-fast, or 'auto')."
                        : "Type the exact model identifier for your selected provider (e.g. gemma4:31b-cloud, claude-3-7-sonnet, gpt-4o)."}
                    </div>
                  </div>
                </div>

                {/* Live LLM Telemetry Card */}
                <div style={{
                  padding: '16px', background: '#0F0F0F',
                  border: '2px solid #0F0F0F', color: '#FFFFFF'
                }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#D0FF14', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                    LIVE PROVIDER TELEMETRY
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                    <div style={{ color: '#A1A1AA' }}>Provider:</div>
                    <div style={{ color: '#D0FF14', fontWeight: 700, textTransform: 'uppercase' }}>
                      {settings.llmProvider || 'ollama'}
                    </div>
                    <div style={{ color: '#A1A1AA' }}>Model:</div>
                    <div style={{ color: '#FFFFFF' }}>
                      {settings.selectedModel || (settings.llmProvider === 'omniroute' ? 'auto/best-coding (DYNAMIC AUTO)' : 'gemma4:31b-cloud')}
                    </div>
                    <div style={{ color: '#A1A1AA' }}>Security:</div>
                    <div style={{ color: '#D0FF14', fontWeight: 700 }}>
                      LOCAL ENCRYPTED SESSION
                    </div>
                  </div>
                </div>

                {/* Save & Confirm LLM Integration Button */}
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleApplyLlm}
                    className="brutalist-btn-primary"
                    style={{
                      width: '100%', padding: '14px', fontSize: '0.84rem'
                    }}
                  >
                    {llmConfirmFlash ? <Check size={16} /> : <Zap size={16} />}
                    {llmConfirmFlash ? "LLM INTEGRATION APPLIED!" : "CONFIRM & APPLY LLM INTEGRATION →"}
                  </button>

                  {llmConfirmFlash && (
                    <div style={{
                      fontSize: '0.76rem', color: '#15803D', fontFamily: 'var(--font-mono)',
                      textAlign: 'center', fontWeight: 700
                    }}>
                      ✓ Provider credentials & model parameters saved to local session.
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* ─── OBSIDIAN VAULT & CLOUD STORAGE SYNC ─── */}
            <div className="brutalist-card-static" style={{ padding: '28px 32px' }}>
              <SectionHeader icon={<Database size={18} />} title="Obsidian Vault & Storage Sync" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F', marginBottom: '6px' }}>
                    LOCAL_VAULT_PATH
                  </label>
                  <input
                    type="text" value={settings.vaultPath}
                    onChange={e => updateSetting('vaultPath', e.target.value)}
                    placeholder="/vault or /home/user/Documents/second-brain"
                    style={inputStyle}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#52525B', marginTop: '4px' }}>
                    Local disk directory containing your Markdown notes for pgvector HNSW indexing.
                  </div>
                </div>

                {/* ─── GitHub Cloud Sync ─── */}
                <div style={{ borderTop: '1px solid #E4E4E7', paddingTop: '16px', marginTop: '8px' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F', marginBottom: '8px' }}>
                    GITHUB_VAULT_CLOUD_SYNC
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      type="text"
                      value={settings.githubRepoUrl || ''}
                      onChange={e => updateSetting('githubRepoUrl', e.target.value)}
                      placeholder="https://github.com/username/my-obsidian-vault"
                      style={inputStyle}
                    />
                    <input
                      type="password"
                      value={settings.githubToken || ''}
                      onChange={e => updateSetting('githubToken', e.target.value)}
                      placeholder="GitHub Personal Access Token"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', flexWrap: 'wrap' }}>
                  <label
                    className="brutalist-btn-primary"
                    style={{
                      fontSize: '0.78rem',
                      padding: '8px 14px',
                      cursor: isUploadingZip ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <UploadCloud size={13} />
                    <span>{isUploadingZip ? 'EXTRACTING ZIP...' : 'UPLOAD VAULT (.ZIP)'}</span>
                    <input
                      type="file"
                      accept=".zip"
                      disabled={isUploadingZip}
                      style={{ display: 'none' }}
                      onChange={handleUploadZipFile}
                    />
                  </label>

                  <button
                    onClick={handleReindex}
                    disabled={isIndexing}
                    className="brutalist-btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '8px 14px' }}
                  >
                    <RotateCw size={13} className={isIndexing ? 'spinning-slow' : ''} />
                    <span>{isIndexing ? 'INDEXING...' : 'RE-INDEX VAULT'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'synapse-settings.json'; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="brutalist-btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '8px 14px' }}
                  >
                    <Download size={13} /> EXPORT CONFIG
                  </button>

                  <label className="brutalist-btn-secondary" style={{ fontSize: '0.78rem', padding: '8px 14px', cursor: 'pointer' }}>
                    <Upload size={13} /> IMPORT CONFIG
                    <input
                      type="file" accept=".json" style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            const imported = JSON.parse(reader.result as string);
                            setSettings({ ...DEFAULT_SETTINGS, ...imported });
                            saveSettings({ ...DEFAULT_SETTINGS, ...imported });
                            setSaveFlash(true);
                            setTimeout(() => setSaveFlash(false), 2000);
                          } catch { alert('Invalid settings file.'); }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>

                  <button
                    onClick={handleFactoryReset}
                    className="brutalist-btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '8px 14px', color: '#DC2626' }}
                  >
                    <Trash2 size={13} /> RESET RUNTIME
                  </button>
                </div>

                {zipUploadMsg && (
                  <div style={{
                    fontSize: '0.8rem', padding: '10px 14px', fontFamily: 'var(--font-mono)',
                    background: '#DCFCE7', border: '1px solid #15803D',
                    color: '#15803D', fontWeight: 700
                  }}>
                    {zipUploadMsg}
                  </div>
                )}

                {indexResult && (
                  <div style={{
                    fontSize: '0.8rem', padding: '10px 14px', fontFamily: 'var(--font-mono)',
                    background: indexResult.startsWith('✓') ? '#DCFCE7' : '#FEE2E2',
                    border: `1px solid ${indexResult.startsWith('✓') ? '#15803D' : '#DC2626'}`,
                    color: indexResult.startsWith('✓') ? '#15803D' : '#991B1B',
                    fontWeight: 700
                  }}>
                    {indexResult}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      <SetupWizard
        isOpen={isSetupWizardOpen}
        onComplete={() => {
          setIsSetupWizardOpen(false);
          setSettings(loadSettings());
        }}
        canDismiss={true}
      />
    </main>
  );
}
