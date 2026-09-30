"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { Lock, Mail, X, ArrowRight, Eye, EyeOff, Terminal } from "lucide-react";
import VaultInitModal from "./VaultInitModal";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userName, setUserName] = useState("");
  const [assistantName, setAssistantName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Vault initialization state after new registration
  const [showVaultInit, setShowVaultInit] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowVaultInit(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  if (showVaultInit) {
    return (
      <VaultInitModal
        isOpen={true}
        userName={createdUser?.user_name || userName || "OPERATOR"}
        onClose={() => {
          setShowVaultInit(false);
          if (createdUser) onSuccess(createdUser);
          onClose();
        }}
        onSuccess={(vaultPath) => {
          setShowVaultInit(false);
          if (createdUser) onSuccess(createdUser);
          onClose();
        }}
      />
    );
  }

  const syncUserSettings = (user: any) => {
    const opName = user.user_name || user.email?.split("@")[0] || "Operator";
    const astName = user.assistant_name || "Synapse";

    let currentSettings: any = {};
    try {
      const raw = localStorage.getItem("nexus_settings");
      if (raw) currentSettings = JSON.parse(raw);
    } catch (e) {}

    currentSettings.userName = opName;
    currentSettings.assistantName = astName;

    localStorage.setItem("nexus_settings", JSON.stringify(currentSettings));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("nexus_user_changed"));
      window.dispatchEvent(new Event("storage"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (mode === "login") {
        const res = await api.auth.login({ email, password });
        if (res.access_token) {
          localStorage.setItem("nexus_auth_token", res.access_token);
          localStorage.setItem("nexus_user", JSON.stringify(res.user));
          syncUserSettings(res.user);
          onSuccess(res.user);
          onClose();
        }
      } else {
        const res = await api.auth.register({ 
          email, 
          password, 
          user_name: userName || undefined, 
          assistant_name: assistantName || undefined 
        });

        if (res.access_token) {
          localStorage.setItem("nexus_auth_token", res.access_token);
          localStorage.setItem("nexus_user", JSON.stringify(res.user));
          syncUserSettings(res.user);
          setCreatedUser(res.user);
          setShowVaultInit(true);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMsg(err.message || "Authentication failed. Check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#FFFFFF',
        border: '2px solid #0F0F0F',
        boxShadow: '6px 6px 0px #0F0F0F',
        padding: '32px',
        position: 'relative',
        color: '#0F0F0F'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#FFFFFF',
            border: '1px solid #0F0F0F',
            color: '#0F0F0F',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#F4F4F5'}
          onMouseOut={e => e.currentTarget.style.background = '#FFFFFF'}
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: '#D0FF14',
            border: '2px solid #0F0F0F',
            boxShadow: '2px 2px 0px #0F0F0F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0F0F0F'
          }}>
            <Terminal size={16} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F0F0F', fontFamily: 'var(--font-mono)', margin: 0, textTransform: 'uppercase' }}>
              {mode === "login" ? "AUTH // OPERATOR LOGIN" : "AUTH // CREATE OPERATOR"}
            </h2>
          </div>
        </div>

        <p style={{ fontSize: '0.82rem', color: '#52525B', marginBottom: '20px', lineHeight: 1.5 }}>
          {mode === "login" 
            ? "Connect to your personal Obsidian knowledge base and private pgvector index." 
            : "Initialize your workspace to synchronize markdown notes and execute commands."}
        </p>

        {errorMsg && (
          <div style={{
            background: '#FEE2E2',
            border: '1px solid #DC2626',
            padding: '10px 14px',
            color: '#991B1B',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-mono)',
            marginBottom: '16px',
            fontWeight: 600
          }}>
            ERROR: {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#0F0F0F', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '6px' }}>
              EMAIL_IDENTIFIER
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="operator@domain.com"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  background: '#FFFFFF',
                  border: '2px solid #0F0F0F',
                  color: '#0F0F0F',
                  fontSize: '0.84rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#0F0F0F', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '6px' }}>
              ACCESS_KEY / PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  padding: '10px 36px',
                  background: '#FFFFFF',
                  border: '2px solid #0F0F0F',
                  color: '#0F0F0F',
                  fontSize: '0.84rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#71717A',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#0F0F0F', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '6px' }}>
                  OPERATOR_CALLSIGN (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="e.g. Abdo or CyberOperator"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#FFFFFF',
                    border: '2px solid #0F0F0F',
                    color: '#0F0F0F',
                    fontSize: '0.84rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#0F0F0F', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '6px' }}>
                  ASSISTANT_NAME (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={assistantName}
                  onChange={e => setAssistantName(e.target.value)}
                  placeholder="e.g. Synapse"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#FFFFFF',
                    border: '2px solid #0F0F0F',
                    color: '#0F0F0F',
                    fontSize: '0.84rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="brutalist-btn-primary"
            style={{
              marginTop: '8px',
              padding: '12px',
              fontSize: '0.84rem',
              width: '100%'
            }}
          >
            <span>{isLoading ? "PROCESSING..." : mode === "login" ? "AUTHENTICATE" : "REGISTER OPERATOR"}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#71717A' }}>
          {mode === "login" ? (
            <span>NEW OPERATOR? <button onClick={() => setMode("register")} style={{ color: '#0F0F0F', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}>CREATE ACCOUNT</button></span>
          ) : (
            <span>EXISTING ACCOUNT? <button onClick={() => setMode("login")} style={{ color: '#0F0F0F', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}>SIGN IN</button></span>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
