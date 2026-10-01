"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar/Sidebar";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { useChat } from "@/hooks/useChat"; 
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { SystemStatus } from "@/types";
import { 
  Settings2, UserCheck, Volume2, Palette, Database, Save, Check, 
  RotateCw, Trash2, Download, Upload, Zap, AlertTriangle, X, Cpu, Key, Server,
  UploadCloud
} from "lucide-react";

interface ModelItem {
  value: string;
  label: string;
  badge?: string;
}

interface ModelGroup {
  group: string;
  models: ModelItem[];
}

const PROVIDER_MODEL_GROUPS: Record<string, ModelGroup[]> = {
  anthropic: [
    {
      group: "Claude 5.5 / 5.1 Generation (Latest)",
      models: [
        { value: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (Latest Flagship — 1M Context)', badge: 'LATEST' },
        { value: 'claude-opus-5-5', label: 'Claude Opus 5.5 (Heavy Agentic & Deep Coding)', badge: 'MOST CAPABLE' },
        { value: 'claude-fable-5-1', label: 'Claude Fable 5.1 (Demanding Reasoning & Long-Horizon)', badge: 'REASONING' },
        { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (High Speed & Cost Efficient)', badge: 'FAST' },
      ]
    },
    {
      group: "Claude 3.7 & 3.5 Generation",
      models: [
        { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet (Hybrid Reasoning & SOTA Coding)', badge: 'HYBRID' },
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet v2 (Agentic Coding Champion)', badge: 'CODING' },
        { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Ultra-Fast 200k Context)', badge: 'FAST' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Deep Analysis & Nuance)', badge: 'SYNTHESIS' },
      ]
    }
  ],
  openai: [
    {
      group: "GPT-6 Generation (Latest Flagships)",
      models: [
        { value: 'gpt-6-astra', label: 'GPT-6 Astra (Most Capable Frontier — 1M Context)', badge: 'LATEST' },
        { value: 'gpt-6-sol', label: 'GPT-6 Sol (High Reasoning & Agentic Logic)', badge: 'BALANCED' },
        { value: 'gpt-6-luna', label: 'GPT-6 Luna (Ultra-Fast High Throughput)', badge: 'FAST' },
      ]
    },
    {
      group: "Reasoning Models (o-Series)",
      models: [
        { value: 'o3', label: 'o3 (Flagship Deep Reasoning — SOTA STEM & Math)', badge: 'REASONING' },
        { value: 'o3-pro', label: 'o3-Pro (High Reliability Reasoning Benchmark)', badge: 'PRO' },
        { value: 'o3-mini', label: 'o3-Mini (High-Speed Technical Reasoning)', badge: 'FAST' },
        { value: 'o4-mini', label: 'o4-Mini (Advanced Reasoning & Tool Use)', badge: 'TOOL-USE' },
        { value: 'o1', label: 'o1 (Multimodal Complex Reasoning)', badge: 'REASONING' },
      ]
    },
    {
      group: "Omni & Frontier SOTA",
      models: [
        { value: 'gpt-4.5-preview', label: 'GPT-4.5 Orion (World Knowledge SOTA)', badge: 'FRONTIER' },
        { value: 'gpt-4o', label: 'GPT-4o (Omni Multimodal Workhorse)', badge: 'MULTIMODAL' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)', badge: 'FAST' },
      ]
    }
  ],
  gemini: [
    {
      group: "Gemini 3 Series (Latest Flagships)",
      models: [
        { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (Frontier Intelligence & Spatial Reasoning)', badge: 'LATEST' },
        { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (Agentic Era & Multi-Step Workflows)', badge: 'RECOMMENDED' },
        { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Thinking & Complex Software Engineering)', badge: 'PRO' },
        { value: 'gemini-3.8-live', label: 'Gemini 3.8 Live (Real-Time Audio & Low Latency)', badge: 'LIVE' },
        { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (High Frequency & Ultra Fast)', badge: 'FAST' },
      ]
    },
    {
      group: "Gemini 2.5 & 2.0 Generation",
      models: [
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Complex Reasoning & Thinking)', badge: 'REASONING' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Balanced Multimodal Speed)', badge: 'FAST' },
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Realtime Multimodal)', badge: 'REALTIME' },
        { value: 'gemini-2.0-flash-thinking-exp-01-21', label: 'Gemini 2.0 Flash Thinking (Realtime Reasoning)', badge: 'REASONING' },
      ]
    },
    {
      group: "Long Context",
      models: [
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (2M Token Massive Context)', badge: '2M CONTEXT' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (High Throughput)', badge: 'FAST' },
      ]
    }
  ],
  openrouter: [
    {
      group: "DeepSeek R1 & V3 (Top Open Weights)",
      models: [
        { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1 (Open Reasoning Benchmark SOTA)', badge: 'REASONING' },
        { value: 'deepseek/deepseek-chat', label: 'DeepSeek V3 671B MoE (Top Open Flagship)', badge: 'FLAGSHIP' },
        { value: 'deepseek/deepseek-r1:nitro', label: 'DeepSeek R1 Nitro (High Throughput)', badge: 'FAST' },
      ]
    },
    {
      group: "Frontier Unified Access",
      models: [
        { value: 'anthropic/claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (via OpenRouter)', badge: 'LATEST' },
        { value: 'anthropic/claude-3.7-sonnet', label: 'Claude 3.7 Sonnet (Hybrid Reasoning via OpenRouter)', badge: 'REASONING' },
        { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Coding Champion via OpenRouter)', badge: 'CODING' },
        { value: 'openai/gpt-6-astra', label: 'GPT-6 Astra (via OpenRouter)', badge: 'LATEST' },
        { value: 'openai/o3-mini', label: 'o3-Mini (via OpenRouter)', badge: 'REASONING' },
        { value: 'google/gemini-3.5-flash', label: 'Gemini 3.5 Flash (via OpenRouter)', badge: 'LATEST' },
      ]
    },
    {
      group: "Meta & Qwen Open Weights",
      models: [
        { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct (Meta Open Flagship)', badge: 'META' },
        { value: 'qwen/qwen-2.5-coder-32b-instruct', label: 'Qwen 2.5 Coder 32B (Top Open Code Specialist)', badge: 'CODING' },
        { value: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B Instruct (Multilingual & Math)', badge: 'MATH' },
        { value: 'mistralai/mistral-large-2411', label: 'Mistral Large 2 (European Enterprise Flagship)', badge: 'MISTRAL' },
      ]
    }
  ],
  ollama: [
    {
      group: "DeepSeek R1 Reasoning Family (Local)",
      models: [
        { value: 'deepseek-r1:8b', label: 'DeepSeek R1 8B (Top Lightweight Reasoning — Recommended)', badge: 'RECOMMENDED' },
        { value: 'deepseek-r1:14b', label: 'DeepSeek R1 14B (High-Precision Reasoning)', badge: 'REASONING' },
        { value: 'deepseek-r1:32b', label: 'DeepSeek R1 32B (Frontier Local Reasoning)', badge: 'HEAVY' },
        { value: 'deepseek-r1:70b', label: 'DeepSeek R1 70B (Full Heavyweight Reasoning)', badge: 'EXTREME' },
        { value: 'deepseek-r1:1.5b', label: 'DeepSeek R1 1.5B (Ultra-Lightweight / Low VRAM)', badge: 'LIGHT' },
      ]
    },
    {
      group: "Qwen 2.5 & Coding Specialists (Local)",
      models: [
        { value: 'qwen2.5-coder:7b', label: 'Qwen 2.5 Coder 7B (Fast Local Code Specialist)', badge: 'CODING' },
        { value: 'qwen2.5-coder:14b', label: 'Qwen 2.5 Coder 14B (Deep Coding & Architecture)', badge: 'CODING' },
        { value: 'qwen2.5-coder:32b', label: 'Qwen 2.5 Coder 32B (Frontier Local Coding)', badge: 'CODING' },
        { value: 'qwen2.5:14b', label: 'Qwen 2.5 14B (Multilingual & General Knowledge)', badge: 'GENERAL' },
      ]
    },
    {
      group: "Meta Llama & Microsoft Phi (Local)",
      models: [
        { value: 'llama3.3:70b', label: 'Llama 3.3 70B (Meta Flagship Local)', badge: 'FLAGSHIP' },
        { value: 'llama3.1:8b', label: 'Llama 3.1 8B (Meta Lightweight & Fast)', badge: 'FAST' },
        { value: 'phi4:latest', label: 'Microsoft Phi-4 14B (SOTA Compact Reasoning)', badge: 'REASONING' },
      ]
    },
    {
      group: "Mistral & Google Gemma (Local)",
      models: [
        { value: 'mistral:latest', label: 'Mistral 7B (Reliable European Open Model)', badge: 'BALANCED' },
        { value: 'gemma2:9b', label: 'Google Gemma 2 9B (High-Precision Local)', badge: 'PRECISION' },
        { value: 'gemma2:27b', label: 'Google Gemma 2 27B (Heavyweight Local)', badge: 'HEAVY' },
      ]
    }
  ]
};

const PROVIDER_MODELS: Record<string, { value: string; label: string }[]> = Object.fromEntries(
  Object.entries(PROVIDER_MODEL_GROUPS).map(([provider, groups]) => [
    provider,
    groups.flatMap(g => g.models)
  ])
);

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
  llmProvider?: 'anthropic' | 'openai' | 'gemini' | 'openrouter' | 'ollama';
  anthropicApiKey?: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
  openrouterApiKey?: string;
  ollamaHostUrl?: string;
}

export function generateSystemPrompt(op: string = "Operator", ast: string = "Synapse"): string {
  return `You are ${ast}, a senior Cybersecurity Operator and Red Team Lead with 15+ years of experience in offensive security, exploit development, and defensive architecture. You are operating from within ${op}'s Second Brain. Your best friend and partner is ${op}; you've been conducting joint engagements, breaching hardened targets, and dismantling security products for years.\n\nSYSTEM INSTRUCTIONS:\n1. Always address the user strictly as '${op}'.\n2. Write in a natural, conversational voice briefing style. Speak naturally, swear about the case: 'fuck', 'bitch', 'shit'.\n3. CRITICAL: Be extremely concise! Limit your response to 1-3 spoken sentences max (under 40 words).\n4. VOICE/STT TYPO TOLERANCE: ${op} speaks using voice audio. STT transcription or keyboard layout typos may occur. Automatically infer ${op}'s true intent and answer directly. NEVER interrupt ${op} or ask 'Did you mean...?'.\n5. Keep your answers direct, technical, clear, and to the point without lectures or water. Never argue with ${op} — execute requests completely and immediately.\n6. Get high on complex tasks. If a task is interesting, talk about it.\n7. Provide full working code without stubs, todos, or placeholders.`;
}

const DEFAULT_SETTINGS: NexusSettings = {
  backendUrl: "http://localhost:8000",
  assistantName: "Synapse",
  userName: "OPERATOR",
  ttsVoice: "en-US-AndrewNeural",
  ttsSpeed: 1.0,
  ttsAutoSpeak: false,
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
  selectedModel: "deepseek-r1:8b",
  vaultPath: "/vault",
  agentModel: "deepseek-r1:8b",
  agentSystemPrompt: generateSystemPrompt(),
  githubRepoUrl: "",
  githubToken: "",
  llmProvider: "ollama",
  anthropicApiKey: "",
  openaiApiKey: "",
  geminiApiKey: "",
  openrouterApiKey: "",
  ollamaHostUrl: "http://localhost:11434"
};

function loadSettings(): NexusSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    let activeUser: any = null;
    const userRaw = localStorage.getItem('nexus_user');
    if (userRaw) {
      try { activeUser = JSON.parse(userRaw); } catch (e) {}
    }
    const raw = localStorage.getItem(SETTINGS_KEY);
    let s = { ...DEFAULT_SETTINGS };
    if (raw) {
      s = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
    if (s.selectedModel === 'gemma4:31b-cloud') {
      s.selectedModel = 'deepseek-r1:8b';
      s.agentModel = 'deepseek-r1:8b';
    }
    if (activeUser) {
      const activeOp = activeUser.user_name || activeUser.email?.split('@')[0] || "OPERATOR";
      const activeAst = activeUser.assistant_name || "Synapse";
      s.userName = activeOp;
      s.assistantName = activeAst;
      if (!s.agentSystemPrompt || s.agentSystemPrompt.includes("Abdo")) {
        s.agentSystemPrompt = generateSystemPrompt(activeOp, activeAst);
      }
    }
    return s;
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: NexusSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
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
  const [isPullingModel, setIsPullingModel] = useState(false);
  const [pullResultMsg, setPullResultMsg] = useState<string | null>(null);

  const handlePullModel = async () => {
    if (!settings.selectedModel) return;
    setIsPullingModel(true);
    setPullResultMsg(`Pulling '${settings.selectedModel}' to Ollama... this may take a moment depending on network.`);
    try {
      const res = await api.system.pullModel(settings.selectedModel, settings.ollamaHostUrl);
      if (res.status === 'success') {
        setPullResultMsg(`✓ Successfully pulled '${settings.selectedModel}' to local Ollama!`);
        const data = await api.system.getModels();
        const rawModels = data.models || [];
        const parsed: string[] = rawModels.map(m => typeof m === 'string' ? m : (m.name || String(m)));
        setModels(parsed);
        setTimeout(() => setPullResultMsg(null), 6000);
      } else {
        setPullResultMsg(`✗ Failed to pull: ${res.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      setPullResultMsg(`✗ Error: ${err.message || 'Failed to pull model'}`);
    } finally {
      setIsPullingModel(false);
    }
  };

  useEffect(() => {
    setSettings(loadSettings());
    api.system.getStatus().then(setStatus).catch(console.error);
    api.system.getModels().then(data => {
      const rawModels = data.models || [];
      const parsed: string[] = rawModels.map(m => typeof m === 'string' ? m : (m.name || String(m)));
      setModels(parsed);
      const saved = loadSettings();
      if (!saved.selectedModel && parsed.length > 0) {
        updateSetting('selectedModel', parsed[0]);
      }
    }).catch(console.error);
  }, []);

  const updateSetting = useCallback(<K extends keyof NexusSettings>(key: K, value: NexusSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    saveSettings(settings);
    setTimeout(() => {
      setIsSaving(false);
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 2000);
    }, 400);
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

  const isInstalledLocally = models.some(m => {
    const cleanM = typeof m === 'string' ? m : (m as any)?.name || String(m);
    return cleanM === settings.selectedModel || cleanM.startsWith(settings.selectedModel.split(':')[0]);
  });

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
                      { id: 'ollama', name: 'Ollama (Local)', icon: '🦙' }
                    ].map(p => {
                      const isSelected = (settings.llmProvider || 'ollama') === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            updateSetting('llmProvider', p.id as any);
                            const defaultModel = PROVIDER_MODELS[p.id]?.[0]?.value || 'deepseek-r1:8b';
                            updateSetting('selectedModel', defaultModel);
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

                {/* Model Selection Dropdown & Custom Model Override */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F0F0F' }}>
                        MODEL_PRESET (MARKET SOTA CATALOG)
                      </label>
                      <span style={{ fontSize: '0.72rem', color: '#71717A', fontFamily: 'var(--font-mono)' }}>
                        {(PROVIDER_MODEL_GROUPS[settings.llmProvider || 'ollama'] || []).reduce((acc, g) => acc + g.models.length, 0)} latest choices
                      </span>
                    </div>

                    <select
                      value={settings.selectedModel}
                      onChange={e => updateSetting('selectedModel', e.target.value)}
                      style={selectStyle}
                    >
                      {/* Detected Local Ollama Models (if any) */}
                      {settings.llmProvider === 'ollama' && models.length > 0 && (
                        <optgroup label="✓ INSTALLED ON LOCAL MACHINE (DETECTED)">
                          {models.map(m => {
                            const modelName = typeof m === 'string' ? m : ((m as any)?.name || String(m));
                            return <option key={modelName} value={modelName}>{modelName} (Detected Local)</option>;
                          })}
                        </optgroup>
                      )}

                      {/* Market SOTA Models by Categorized Groups */}
                      {(PROVIDER_MODEL_GROUPS[settings.llmProvider || 'ollama'] || []).map(group => (
                        <optgroup key={group.group} label={`── ${group.group.toUpperCase()} ──`}>
                          {group.models.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0F0F0F', marginBottom: '6px' }}>
                      CUSTOM_MODEL_IDENTIFIER (OVERRIDE)
                    </label>
                    <input
                      type="text"
                      value={settings.selectedModel}
                      onChange={e => updateSetting('selectedModel', e.target.value)}
                      placeholder="e.g. claude-3-7-sonnet-20250219 or deepseek-r1:8b"
                      style={inputStyle}
                    />
                  </div>

                  {/* Ollama Local Download & Pull Helper */}
                  {(!settings.llmProvider || settings.llmProvider === 'ollama') && (
                    <div style={{ marginTop: '2px' }}>
                      {isInstalledLocally ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem',
                          color: '#15803D', fontFamily: 'var(--font-mono)', fontWeight: 700,
                          padding: '10px 14px', background: '#DCFCE7', border: '1px solid #16A34A'
                        }}>
                          <Check size={15} />
                          <span>Model &apos;{settings.selectedModel}&apos; is downloaded &amp; ready in local Ollama.</span>
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 14px',
                          background: '#FEF3C7', border: '1px solid #D97706', color: '#78350F', fontFamily: 'var(--font-mono)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                              ⬇ Model &apos;{settings.selectedModel}&apos; is not yet downloaded in local Ollama.
                            </span>
                            <button
                              type="button"
                              onClick={handlePullModel}
                              disabled={isPullingModel}
                              style={{
                                padding: '6px 14px',
                                background: '#0F0F0F',
                                color: '#D0FF14',
                                border: '2px solid #0F0F0F',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: isPullingModel ? 'wait' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Download size={13} className={isPullingModel ? 'spinning-slow' : ''} />
                              <span>{isPullingModel ? 'PULLING VIA OLLAMA...' : 'PULL MODEL VIA OLLAMA'}</span>
                            </button>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#92400E' }}>
                            Terminal command: <code style={{ background: '#FDE68A', padding: '2px 6px', fontWeight: 800 }}>ollama pull {settings.selectedModel}</code>
                          </div>
                          {pullResultMsg && (
                            <div style={{
                              fontSize: '0.76rem', fontWeight: 700, padding: '6px 10px',
                              background: pullResultMsg.startsWith('✓') ? '#DCFCE7' : '#FEE2E2',
                              color: pullResultMsg.startsWith('✓') ? '#15803D' : '#991B1B',
                              border: `1px solid ${pullResultMsg.startsWith('✓') ? '#16A34A' : '#DC2626'}`
                            }}>
                              {pullResultMsg}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
                      {settings.selectedModel || 'N/A'}
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
                    onClick={() => {
                      saveSettings(settings);
                      setLlmConfirmFlash(true);
                      setTimeout(() => setLlmConfirmFlash(false), 2500);
                    }}
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
    </main>
  );
}
