"use client";

import React, { useState } from "react";
import { Database, Terminal, Settings, X } from "lucide-react";

interface SetupWizardProps {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [assistantName, setAssistantName] = useState("Synapse");
  const [userName, setUserName] = useState("Operator");
  const [model, setModel] = useState("gemma4:31b-cloud");
  const [backendUrl, setBackendUrl] = useState("http://localhost:8000");
  const [vaultPath, setVaultPath] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are Synapse, a technical intelligence lead. You operate within the user's second brain. Always answer concisely with zero fluff, technical precision, and working code."
  );

  const handleInitialize = () => {
    if (!vaultPath.trim()) {
      alert("Vault path is required.");
      return;
    }
    const settings = {
      ttsVoice: "en-US-AndrewNeural",
      ttsSpeed: 1.0,
      ttsAutoSpeak: true,
      ttsThinkingAnnounce: true,
      voiceInputEnabled: true,
      graphNodeGlow: 0,
      graphRotationSpeed: 0.5,
      graphSignalSpeed: 2.0,
      graphDefaultZoom: 950,
      maxHistory: 20,
      autoPinNew: false,
      accentColor: "#D0FF14",
      fontSize: "medium",
      typewriterSpeed: 32,
      backendUrl: backendUrl,
      selectedModel: model,
      vaultPath: vaultPath.trim() || "/vault",
      assistantName: assistantName || "Synapse",
      userName: userName || "Operator",
      agentModel: model,
      agentSystemPrompt: systemPrompt
    };
    localStorage.setItem("nexus_settings", JSON.stringify(settings));
    localStorage.setItem("nexus_setup_completed", "true");
    onComplete();
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(15, 15, 15, 0.6)", display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, color: "#0F0F0F", fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <div style={{
        width: "100%", maxWidth: "680px", padding: "32px",
        background: "#FFFFFF",
        border: "2px solid #0F0F0F",
        borderRadius: "0px",
        boxShadow: "8px 8px 0px #0F0F0F",
        maxHeight: "90vh", overflowY: "auto",
        position: "relative"
      }}>
        <button
          onClick={onComplete}
          style={{ position: 'absolute', top: '16px', right: '16px', background: '#F4F4F5', border: '1px solid #0F0F0F', color: '#0F0F0F', cursor: 'pointer', padding: '4px', fontWeight: 800 }}
        >
          <X size={18} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div style={{ width: '32px', height: '32px', background: '#D0FF14', border: '2px solid #0F0F0F', boxShadow: '2px 2px 0px #0F0F0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Database size={18} color="#0F0F0F" />
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', fontFamily: "'JetBrains Mono', monospace", color: '#71717A', fontWeight: 800 }}>
              [SYSTEM_BOOT]
            </div>
            <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, letterSpacing: "-0.02em", color: '#0F0F0F' }}>
              INITIALIZE SYNAPSE PROTOCOL
            </h1>
          </div>
        </div>
        
        <p style={{ color: "#52525B", marginBottom: "24px", fontSize: "0.88rem", lineHeight: "1.5" }}>
          Configure runtime environment parameters. All settings run strictly on your machine ($0 SaaS cost).
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#0F0F0F', marginBottom: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
              <Terminal size={12} style={{ display: "inline", marginRight: "6px" }} />
              AI MODEL IDENTIFIER
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: "0px",
                background: "#FFFFFF", border: "2px solid #0F0F0F",
                color: "#0F0F0F", outline: "none", boxSizing: "border-box",
                fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem"
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#0F0F0F', marginBottom: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
              <Settings size={12} style={{ display: "inline", marginRight: "6px" }} />
              BACKEND API URL
            </label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: "0px",
                background: "#FFFFFF", border: "2px solid #0F0F0F",
                color: "#0F0F0F", outline: "none", boxSizing: "border-box",
                fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem"
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#0F0F0F', marginBottom: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
              <Database size={12} style={{ display: "inline", marginRight: "6px" }} />
              OBSIDIAN VAULT PATH (REQUIRED)
            </label>
            <input
              type="text"
              value={vaultPath}
              onChange={(e) => setVaultPath(e.target.value)}
              placeholder="/home/user/obsidian"
              style={{
                width: "100%", padding: "10px 12px", borderRadius: "0px",
                background: "#FFFFFF", border: "2px solid #0F0F0F",
                color: "#0F0F0F", outline: "none", boxSizing: "border-box",
                fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem"
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#0F0F0F', marginBottom: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
              SYSTEM PROMPT & DIRECTIVES
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: "0px",
                background: "#FFFFFF", border: "2px solid #0F0F0F",
                color: "#0F0F0F", outline: "none", resize: "vertical", boxSizing: "border-box",
                fontFamily: "'JetBrains Mono', monospace", fontSize: "0.82rem", lineHeight: "1.4"
              }}
            />
          </div>

          <button
            onClick={handleInitialize}
            style={{
              width: "100%", padding: "14px", borderRadius: "0px",
              background: "#D0FF14", border: "2px solid #0F0F0F",
              boxShadow: "4px 4px 0px #0F0F0F",
              color: "#0F0F0F",
              fontWeight: 900, fontSize: "0.9rem", cursor: "pointer",
              marginTop: "8px", textTransform: "uppercase", letterSpacing: "0.05em",
              fontFamily: "'JetBrains Mono', monospace",
              transition: "all 0.1s"
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = "#E4FF66";
              e.currentTarget.style.transform = "translate(-1px, -1px)";
              e.currentTarget.style.boxShadow = "5px 5px 0px #0F0F0F";
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = "#D0FF14";
              e.currentTarget.style.transform = "translate(0, 0)";
              e.currentTarget.style.boxShadow = "4px 4px 0px #0F0F0F";
            }}
          >
            BOOT SYNAPSE SYSTEM
          </button>
        </div>
      </div>
    </div>
  );
}
