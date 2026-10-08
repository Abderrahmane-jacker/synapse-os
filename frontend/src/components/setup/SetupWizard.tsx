"use client";

import React, { useState, useEffect } from "react";
import { 
  Database, Terminal, KeyRound, Bot, Folder, FolderOpen, 
  Check, Sparkles, X, Eye, EyeOff, Shield, ArrowRight, Server,
  CheckCircle2, AlertCircle, RefreshCw
} from "lucide-react";
import { api } from "@/lib/api";
import { generateSystemPrompt } from "@/lib/prompt";
import VaultInitModal from "@/components/auth/VaultInitModal";

interface SetupWizardProps {
  isOpen?: boolean;
  onComplete: () => void;
  canDismiss?: boolean;
}

export default function SetupWizard({ 
  isOpen = true, 
  onComplete, 
  canDismiss = false 
}: SetupWizardProps) {
  const [operatorName, setOperatorName] = useState("Operator");
  const [agentName, setAgentName] = useState("Synapse");
  const [provider, setProvider] = useState<"omniroute" | "ollama" | "anthropic" | "gemini" | "openai" | "openrouter">("omniroute");
  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [omnirouteHost, setOmnirouteHost] = useState("http://localhost:20128");
  const [vaultPath, setVaultPath] = useState("./vault");

  const [isValidatingVault, setIsValidatingVault] = useState(false);
  const [vaultValidation, setVaultValidation] = useState<{
    valid: boolean;
    noteCount: number;
    message: string;
  } | null>(null);

  const [detectedVaults, setDetectedVaults] = useState<Array<{ path: string; name: string; note_count: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVaultBrowserOpen, setIsVaultBrowserOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load existing settings if previously initialized
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("nexus_settings");
      if (raw) {
        const s = JSON.parse(raw);
        if (s.userName) setOperatorName(s.userName);
        if (s.assistantName) setAgentName(s.assistantName);
        if (s.llmProvider) setProvider(s.llmProvider);
        if (s.vaultPath) setVaultPath(s.vaultPath);
        if (s.omnirouteHostUrl) setOmnirouteHost(s.omnirouteHostUrl);
        if (s.omnirouteApiKey) setApiToken(s.omnirouteApiKey);
        else if (s.anthropicApiKey) setApiToken(s.anthropicApiKey);
        else if (s.geminiApiKey) setApiToken(s.geminiApiKey);
        else if (s.openaiApiKey) setApiToken(s.openaiApiKey);
      }
    } catch (e) {}

    // Auto-detect candidate vaults
    api.knowledge.detectVaults().then((res) => {
      if (res?.vaults && res.vaults.length > 0) {
        setDetectedVaults(res.vaults);
      }
    }).catch(() => {});
  }, []);

  // Validate vault path whenever it changes
  useEffect(() => {
    const trimmed = vaultPath.trim();
    if (!trimmed) {
      setVaultValidation(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsValidatingVault(true);
      try {
        const res = await api.knowledge.validatePath(trimmed);
        setVaultValidation({
          valid: res.valid,
          noteCount: res.note_count || 0,
          message: res.message || (res.valid ? `${res.note_count} notes found` : "Directory not found")
        });
      } catch (e) {
        setVaultValidation({
          valid: true,
          noteCount: 0,
          message: "Will be initialized on boot"
        });
      } finally {
        setIsValidatingVault(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [vaultPath]);

  const handleInitialize = async () => {
    setIsSubmitting(true);
    setStatusMessage("Configuring local OS runtime & knowledge vault...");

    const op = operatorName.trim() || "Operator";
    const ast = agentName.trim() || "Synapse";
    const finalVault = vaultPath.trim() || "./vault";
    const token = apiToken.trim();

    // 1. Sync with backend setup endpoint
    try {
      await api.system.setup({
        vault_path: finalVault,
        model: provider === "omniroute" ? "auto/best-coding" : "",
        provider: provider,
        operator_name: op,
        agent_name: ast,
        omniroute_token: token,
        omniroute_host: omnirouteHost.trim() || "http://localhost:20128"
      });
    } catch (e) {
      console.warn("Backend setup warning (proceeding with local config):", e);
    }

    // 2. Build local settings object
    const existingSettings = (() => {
      try {
        return JSON.parse(localStorage.getItem("nexus_settings") || "{}");
      } catch {
        return {};
      }
    })();

    const updatedSettings = {
      ...existingSettings,
      userName: op,
      assistantName: ast,
      llmProvider: provider,
      selectedModel: provider === "omniroute" ? "auto/best-coding" : (existingSettings.selectedModel || ""),
      agentModel: provider === "omniroute" ? "auto/best-coding" : (existingSettings.agentModel || ""),
      vaultPath: finalVault,
      omnirouteApiKey: provider === "omniroute" ? token : (existingSettings.omnirouteApiKey || ""),
      omnirouteHostUrl: omnirouteHost.trim() || "http://localhost:20128",
      anthropicApiKey: provider === "anthropic" ? token : (existingSettings.anthropicApiKey || ""),
      geminiApiKey: provider === "gemini" ? token : (existingSettings.geminiApiKey || ""),
      openaiApiKey: provider === "openai" ? token : (existingSettings.openaiApiKey || ""),
      openrouterApiKey: provider === "openrouter" ? token : (existingSettings.openrouterApiKey || ""),
      agentSystemPrompt: generateSystemPrompt(op, ast),
      ttsAutoSpeak: existingSettings.ttsAutoSpeak ?? true,
      ttsThinkingAnnounce: existingSettings.ttsThinkingAnnounce ?? false,
      voiceInputEnabled: existingSettings.voiceInputEnabled ?? true,
      backendUrl: existingSettings.backendUrl || "http://localhost:8000"
    };

    localStorage.setItem("nexus_settings", JSON.stringify(updatedSettings));
    localStorage.setItem("nexus_setup_completed", "true");
    localStorage.setItem("nexus_vault_initialized", "true");
    localStorage.setItem("nexus_user", JSON.stringify({
      id: "operator-01",
      user_name: op,
      assistant_name: ast,
      role: "operator"
    }));

    window.dispatchEvent(new Event("nexus_settings_changed"));
    window.dispatchEvent(new Event("nexus_user_changed"));
    window.dispatchEvent(new Event("storage"));

    setIsSubmitting(false);
    onComplete();
  };

  const handleSkipDemo = () => {
    localStorage.setItem("nexus_setup_completed", "true");
    window.dispatchEvent(new Event("nexus_settings_changed"));
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(15, 15, 15, 0.8)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999, color: "#0F0F0F", fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: "16px"
      }}>
        <div style={{
          width: "100%", maxWidth: "720px", padding: "32px",
          background: "#FFFFFF",
          border: "3px solid #0F0F0F",
          borderRadius: "0px",
          boxShadow: "8px 8px 0px #0F0F0F",
          maxHeight: "92vh", overflowY: "auto",
          position: "relative"
        }}>
          {canDismiss && (
            <button
              onClick={onComplete}
              style={{
                position: "absolute", top: "18px", right: "18px",
                background: "#F4F4F5", border: "2px solid #0F0F0F",
                color: "#0F0F0F", cursor: "pointer", padding: "6px",
                fontWeight: 800, display: "flex", alignItems: "center"
              }}
            >
              <X size={16} />
            </button>
          )}

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{
              width: "36px", height: "36px", background: "#D0FF14",
              border: "2px solid #0F0F0F", boxShadow: "2px 2px 0px #0F0F0F",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Terminal size={20} color="#0F0F0F" />
            </div>
            <div>
              <div style={{
                fontSize: "0.66rem", fontFamily: "'JetBrains Mono', monospace",
                color: "#71717A", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em"
              }}>
                [FIRST BOOT INITIALIZATION] // REPO SETUP
              </div>
              <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.02em", color: "#0F0F0F" }}>
                INITIALIZE SYNAPSE PROTOCOL
              </h1>
            </div>
          </div>

          <p style={{ color: "#52525B", marginBottom: "24px", fontSize: "0.86rem", lineHeight: "1.5" }}>
            Welcome to your local AI Second Brain. Configure your operator profile, AI credentials, and knowledge vault.
            All parameters run strictly on your device ($0 SaaS cost).
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Row 1: Identity & Key Name */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 800, color: "#0F0F0F", marginBottom: "6px", fontFamily: "'JetBrains Mono', monospace" }}>
                  <KeyRound size={13} style={{ display: "inline", marginRight: "6px" }} />
                  KEY IDENTIFIER / OPERATOR NAME
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Operator or Your Name"
                  style={{
                    width: "100%", padding: "10px 12px",
                    background: "#FFFFFF", border: "2px solid #0F0F0F",
                    color: "#0F0F0F", outline: "none", boxSizing: "border-box",
                    fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem", fontWeight: 700
                  }}
                />
                <div style={{ fontSize: "0.7rem", color: "#71717A", marginTop: "4px" }}>
                  Your operator alias & credential identifier.
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 800, color: "#0F0F0F", marginBottom: "6px", fontFamily: "'JetBrains Mono', monospace" }}>
                  <Bot size={13} style={{ display: "inline", marginRight: "6px" }} />
                  AI AGENT IDENTITY NAME
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Synapse"
                  style={{
                    width: "100%", padding: "10px 12px",
                    background: "#FFFFFF", border: "2px solid #0F0F0F",
                    color: "#0F0F0F", outline: "none", boxSizing: "border-box",
                    fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem", fontWeight: 700
                  }}
                />
                <div style={{ fontSize: "0.7rem", color: "#71717A", marginTop: "4px" }}>
                  The persona name your assistant responds to.
                </div>
              </div>
            </div>

            {/* Row 2: AI Provider Choice */}
            <div style={{ padding: "16px", border: "2px solid #0F0F0F", background: "#FAFAFA" }}>
              <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 800, color: "#0F0F0F", marginBottom: "10px", fontFamily: "'JetBrains Mono', monospace" }}>
                <Server size={13} style={{ display: "inline", marginRight: "6px" }} />
                AI PROVIDER & ROUTING ENGINE
              </label>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
                {[
                  { id: "omniroute", name: "OmniRoute (Unified)", badge: "RECOMMENDED" },
                  { id: "ollama", name: "Ollama (Local LLM)", badge: "OFFLINE" },
                  { id: "anthropic", name: "Anthropic Claude", badge: "CLOUD" },
                  { id: "gemini", name: "Google Gemini", badge: "CLOUD" },
                  { id: "openai", name: "OpenAI GPT", badge: "CLOUD" }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setProvider(item.id as any)}
                    style={{
                      padding: "7px 12px",
                      background: provider === item.id ? "#0F0F0F" : "#FFFFFF",
                      color: provider === item.id ? "#FFFFFF" : "#0F0F0F",
                      border: "2px solid #0F0F0F",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      fontFamily: "'JetBrains Mono', monospace",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    {item.name}
                    {item.badge && (
                      <span style={{
                        fontSize: "0.6rem",
                        padding: "1px 5px",
                        background: provider === item.id ? "#D0FF14" : "#F4F4F5",
                        color: "#0F0F0F",
                        fontWeight: 900
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Provider Token / Key Input */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0F0F0F", fontFamily: "'JetBrains Mono', monospace" }}>
                    {provider === "omniroute" ? "OMNIROUTE BEARER TOKEN / API KEY" : `${provider.toUpperCase()} API KEY`}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "#71717A" }}
                  >
                    {showToken ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showToken ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <input
                  type={showToken ? "text" : "password"}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder={provider === "ollama" ? "Optional for local Ollama" : `Enter your ${provider} API token`}
                  style={{
                    width: "100%", padding: "10px 12px",
                    background: "#FFFFFF", border: "2px solid #0F0F0F",
                    color: "#0F0F0F", outline: "none", boxSizing: "border-box",
                    fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem"
                  }}
                />
                <div style={{ fontSize: "0.7rem", color: "#71717A", marginTop: "4px" }}>
                  {provider === "omniroute" 
                    ? "OmniRoute automatically routes requests to dynamic combos like 'auto/best-coding'."
                    : provider === "ollama"
                    ? "Leave blank if your local Ollama instance on port 11434 has no authentication."
                    : "Direct API key stored locally in browser sandbox."}
                </div>
              </div>

              {provider === "omniroute" && (
                <div style={{ marginTop: "12px" }}>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 800, color: "#0F0F0F", marginBottom: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
                    OMNIROUTE HOST URL
                  </label>
                  <input
                    type="text"
                    value={omnirouteHost}
                    onChange={(e) => setOmnirouteHost(e.target.value)}
                    placeholder="http://localhost:20128"
                    style={{
                      width: "100%", padding: "8px 12px",
                      background: "#FFFFFF", border: "2px solid #0F0F0F",
                      color: "#0F0F0F", outline: "none", boxSizing: "border-box",
                      fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem"
                    }}
                  />
                </div>
              )}
            </div>

            {/* Row 3: Obsidian Vault Path */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0F0F0F", fontFamily: "'JetBrains Mono', monospace" }}>
                  <Database size={13} style={{ display: "inline", marginRight: "6px" }} />
                  OBSIDIAN / MARKDOWN VAULT PATH
                </label>
                {vaultValidation && (
                  <span style={{
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: vaultValidation.valid ? "#16A34A" : "#DC2626",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    {vaultValidation.valid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {vaultValidation.message}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={vaultPath}
                  onChange={(e) => setVaultPath(e.target.value)}
                  placeholder="./vault or /home/username/obsidian"
                  style={{
                    flex: 1, padding: "10px 12px",
                    background: "#FFFFFF", border: "2px solid #0F0F0F",
                    color: "#0F0F0F", outline: "none", boxSizing: "border-box",
                    fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem", fontWeight: 700
                  }}
                />
                <button
                  type="button"
                  onClick={() => setIsVaultBrowserOpen(true)}
                  style={{
                    padding: "10px 14px",
                    background: "#FFFFFF", border: "2px solid #0F0F0F",
                    cursor: "pointer", fontSize: "0.76rem", fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: "6px"
                  }}
                  title="Browse local folders or upload ZIP archive"
                >
                  <FolderOpen size={14} /> BROWSE
                </button>
              </div>

              {/* Quick shortcut pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setVaultPath("./vault")}
                  style={{
                    background: vaultPath === "./vault" ? "#D0FF14" : "#F4F4F5",
                    border: "1px solid #0F0F0F",
                    padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace", cursor: "pointer"
                  }}
                >
                  ./vault (Default Repo Vault)
                </button>
                {detectedVaults.map((v) => (
                  <button
                    key={v.path}
                    type="button"
                    onClick={() => setVaultPath(v.path)}
                    style={{
                      background: vaultPath === v.path ? "#D0FF14" : "#F4F4F5",
                      border: "1px solid #0F0F0F",
                      padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace", cursor: "pointer"
                    }}
                  >
                    {v.name} ({v.note_count} notes)
                  </button>
                ))}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#71717A", marginTop: "4px" }}>
                Folder containing your Markdown notes. SynapseOS indexes them into vector embeddings for instant semantic search.
              </div>
            </div>

            {/* Submission Actions */}
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={handleInitialize}
                disabled={isSubmitting}
                style={{
                  width: "100%", padding: "14px",
                  background: isSubmitting ? "#E4E4E7" : "#D0FF14",
                  border: "2px solid #0F0F0F",
                  boxShadow: isSubmitting ? "none" : "4px 4px 0px #0F0F0F",
                  color: "#0F0F0F",
                  fontWeight: 900, fontSize: "0.95rem", cursor: isSubmitting ? "not-allowed" : "pointer",
                  textTransform: "uppercase", letterSpacing: "0.04em",
                  fontFamily: "'JetBrains Mono', monospace",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    INITIALIZING LOCAL RUNTIME...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    INITIALIZE OS & BOOT
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSkipDemo}
                style={{
                  width: "100%", padding: "8px",
                  background: "transparent", border: "none",
                  color: "#71717A", fontSize: "0.74rem", fontWeight: 700,
                  cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                  textDecoration: "underline"
                }}
              >
                SKIP & EXPLORE IN GUEST DEMO MODE
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Visual Vault Browser & Zip Upload Modal */}
      {isVaultBrowserOpen && (
        <VaultInitModal
          isOpen={isVaultBrowserOpen}
          onClose={() => setIsVaultBrowserOpen(false)}
          onSuccess={(newVaultPath) => {
            setVaultPath(newVaultPath);
            setIsVaultBrowserOpen(false);
          }}
          userName={operatorName}
        />
      )}
    </>
  );
}
