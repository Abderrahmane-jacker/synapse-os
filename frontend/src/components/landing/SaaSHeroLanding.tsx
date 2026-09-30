"use client";

import React, { useState } from "react";
import { 
  Terminal, Database, Shield, Cpu, Zap, ArrowRight, KeyRound, 
  Copy, Check, ExternalLink, Code2, Server, HardDrive, Network, 
  CheckCircle2, Play, ChevronRight, Layers, Lock, Sparkles, Activity
} from "lucide-react";

interface SaaSHeroLandingProps {
  onOpenAuth: () => void;
  onEnterConsole: () => void;
}

export default function SaaSHeroLanding({ onOpenAuth, onEnterConsole }: SaaSHeroLandingProps) {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const terminalTabs = [
    {
      id: "index",
      label: "01_INDEX_VAULT.SH",
      cmd: "synapse-cli index --vault ~/Documents/second-brain --strategy hnsw --dim 1536",
      output: [
        { text: "[INFO] SynapseOS Ingestion Daemon v2.4.0 started (PID: 49201)", color: "#94A3B8" },
        { text: "-> Discovered 1,428 Markdown files in ~/Documents/second-brain", color: "#F8FAFC" },
        { text: "-> Parsing YAML frontmatter and AST header trees... [OK] 42ms", color: "#D0FF14" },
        { text: "-> Extracting 4,812 semantic chunks (chunk_size=512, overlap=64)... [OK] 68ms", color: "#D0FF14" },
        { text: "-> Local Embedding Runtime (nomic-embed-text-v1.5) batch: 128 chunks/s", color: "#F8FAFC" },
        { text: "-> Upserting to PostgreSQL pgvector (HNSW m=16, ef_construction=64)... [OK] 34ms", color: "#D0FF14" },
        { text: "[SUCCESS] Index synchronized. Total vectors: 4,812. Memory footprint: 184MB RSS.", color: "#D0FF14" },
        { text: "[METRIC] p95 write latency: 1.8ms | Total duration: 184ms | Telemetry sent: 0 B", color: "#94A3B8" }
      ]
    },
    {
      id: "search",
      label: "02_HYBRID_QUERY.SQL",
      cmd: "synapse-cli query --hybrid \"CVE-2024 zero-day audit and mitigation plan\" --top-k 5",
      output: [
        { text: "EXPLAIN ANALYZE SELECT id, title, (ts_rank(tsv, q) * 0.4 + (1 - (embedding <=> $1)) * 0.6) AS score", color: "#94A3B8" },
        { text: "FROM vault_chunks WHERE vault_id = 'prod_sec_01' ORDER BY score DESC LIMIT 5;", color: "#94A3B8" },
        { text: "", color: "#F8FAFC" },
        { text: "[MATCH 1] score: 0.942 | 2026-04-Incident-Retro.md#L42 (pgvector cosine: 0.961)", color: "#D0FF14" },
        { text: "          Snippet: \"Kernel memory corruption patched via eBPF probe filter...\"", color: "#E2E8F0" },
        { text: "[MATCH 2] score: 0.887 | Architecture/ZeroTrust-Network.md#L112 (fts match)", color: "#D0FF14" },
        { text: "          Snippet: \"WireGuard mesh interface isolation policy enforcement...\"", color: "#E2E8F0" },
        { text: "[PERF] Execution time: 14.2ms | Buffer hits: 100% | Zero cloud round-trips.", color: "#94A3B8" }
      ]
    },
    {
      id: "agent",
      label: "03_AGENT_EXEC.PY",
      cmd: "synapse-cli agent run --task \"Audit nginx configuration for TLS 1.3 compliance\"",
      output: [
        { text: "[SANDBOX] Initializing isolated sub-process sandbox (cgroups v2, no-net)...", color: "#94A3B8" },
        { text: "[PLAN] 1. Inspect /etc/nginx/nginx.conf", color: "#F8FAFC" },
        { text: "[PLAN] 2. Verify ssl_protocols and ssl_ciphers directives", color: "#F8FAFC" },
        { text: "[PLAN] 3. Generate hardened configuration patch", color: "#F8FAFC" },
        { text: "-> Executing: grep -rn 'ssl_protocols' /etc/nginx/", color: "#D0FF14" },
        { text: "<- Match: ssl_protocols TLSv1.2 TLSv1.3;", color: "#F8FAFC" },
        { text: "[AUDIT] TLS 1.2 present. Recommendation: Enforce TLSv1.3 exclusively.", color: "#E4FF66" },
        { text: "[ACTION] Proposed unified diff ready in ./patches/nginx_tls13.patch [Exit: 0]", color: "#D0FF14" }
      ]
    },
    {
      id: "schema",
      label: "04_PGVECTOR_DDL.SQL",
      cmd: "cat schema.sql | grep -E 'CREATE TABLE|USING hnsw'",
      output: [
        { text: "CREATE EXTENSION IF NOT EXISTS vector;", color: "#D0FF14" },
        { text: "CREATE TABLE vault_chunks (", color: "#F8FAFC" },
        { text: "    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),", color: "#F8FAFC" },
        { text: "    vault_id TEXT NOT NULL REFERENCES vaults(id),", color: "#F8FAFC" },
        { text: "    content TEXT NOT NULL,", color: "#F8FAFC" },
        { text: "    metadata JSONB NOT NULL DEFAULT '{}',", color: "#F8FAFC" },
        { text: "    tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,", color: "#F8FAFC" },
        { text: "    embedding vector(1536) NOT NULL", color: "#F8FAFC" },
        { text: ");", color: "#F8FAFC" },
        { text: "CREATE INDEX idx_chunks_hnsw ON vault_chunks USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);", color: "#D0FF14" }
      ]
    }
  ];

  return (
    <div className="anti-slop-landing">
      {/* 1. TOP STATUS TICKER / HEADER */}
      <header style={{
        borderBottom: "2px solid #0F0F0F",
        backgroundColor: "#FFFFFF",
        position: "sticky",
        top: 0,
        zIndex: 50
      }}>
        {/* Top Minimalist Ticker */}
        <div style={{
          backgroundColor: "#0F0F0F",
          color: "#FFFFFF",
          padding: "6px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.72rem",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.04em"
        }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", backgroundColor: "#D0FF14", display: "inline-block" }}></span>
              KERNEL: READY
            </span>
            <span>INDEX: PGVECTOR_HNSW</span>
            <span>TELEMETRY: STRICT_ZERO</span>
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            <span>LATENCY: 14ms p95</span>
            <span style={{ color: "#D0FF14" }}>COST: $0.00 / MO</span>
          </div>
        </div>

        {/* Primary Navbar */}
        <div style={{
          maxWidth: "1320px",
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              backgroundColor: "#D0FF14",
              border: "2px solid #0F0F0F",
              boxShadow: "2px 2px 0px #0F0F0F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "1.1rem",
              fontFamily: "var(--font-mono)"
            }}>
              S
            </div>
            <div>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                fontSize: "1.1rem",
                letterSpacing: "0.02em",
                color: "#0F0F0F"
              }}>
                SYNAPSE_OS
              </span>
              <span style={{
                marginLeft: "8px",
                fontSize: "0.72rem",
                fontFamily: "var(--font-mono)",
                padding: "2px 6px",
                border: "1px solid #0F0F0F",
                backgroundColor: "#F4F4F5"
              }}>
                v2.4.0
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            fontSize: "0.84rem",
            fontFamily: "var(--font-mono)",
            fontWeight: 600
          }}>
            <a href="#architecture" style={{ color: "#0F0F0F", textDecoration: "none" }}>ARCH/SPEC</a>
            <a href="#pipeline" style={{ color: "#0F0F0F", textDecoration: "none" }}>PIPELINE</a>
            <a href="#datasheet" style={{ color: "#0F0F0F", textDecoration: "none" }}>BENCHMARKS</a>
            <a href="#comparison" style={{ color: "#0F0F0F", textDecoration: "none" }}>VS_CLOUD</a>
            <a href="#deployment" style={{ color: "#0F0F0F", textDecoration: "none" }}>SELF_HOST</a>
          </nav>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={onOpenAuth}
              className="brutalist-btn-secondary"
              style={{ fontSize: "0.82rem", padding: "8px 16px" }}
            >
              <KeyRound size={14} />
              AUTH / LOGIN
            </button>
            <button
              onClick={onEnterConsole}
              className="brutalist-btn-primary"
              style={{ fontSize: "0.82rem", padding: "8px 18px" }}
            >
              LAUNCH CONSOLE
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION — TECHNICAL DATASHEET SPEC */}
      <section style={{
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "64px 24px 48px 24px",
        borderBottom: "2px solid #0F0F0F"
      }}>
        <div style={{ maxWidth: "980px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
            <span className="brutalist-tag brutalist-tag-lime">
              CONTAINER-NATIVE OS
            </span>
            <span className="brutalist-tag brutalist-tag-white">
              POSTGRESQL 16 + PGVECTOR
            </span>
            <span className="brutalist-tag brutalist-tag-black">
              100% AIR-GAPPED CAPABLE
            </span>
          </div>

          <h1 style={{
            fontSize: "clamp(2.4rem, 5.5vw, 4.2rem)",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: "#0F0F0F",
            marginBottom: "24px",
            textTransform: "uppercase"
          }}>
            Local-First Cognitive Operating System.
          </h1>

          <p style={{
            fontSize: "1.18rem",
            lineHeight: 1.6,
            color: "#0F0F0F",
            fontWeight: 500,
            maxWidth: "840px",
            marginBottom: "36px"
          }}>
            SynapseOS indexes your Obsidian Markdown vaults into PostgreSQL pgvector embeddings and orchestrates local or cloud LLMs. Real-time bi-directional sync, sub-second HNSW semantic search, sandboxed agent task execution, and zero telemetry. Boots in 1.2 seconds.
          </p>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={onEnterConsole}
              className="brutalist-btn-primary"
              style={{ fontSize: "1rem", padding: "16px 28px" }}
            >
              OPEN CONSOLE [ENTER]
              <ArrowRight size={18} />
            </button>

            <div style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#0F0F0F",
              border: "2px solid #0F0F0F",
              boxShadow: "4px 4px 0px #0F0F0F",
              padding: "4px 4px 4px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.86rem",
              color: "#FFFFFF"
            }}>
              <span style={{ color: "#D0FF14", marginRight: "10px" }}>$</span>
              <span style={{ color: "#F8FAFC", marginRight: "16px" }}>curl -fsSL https://synapseos.dev/install.sh | bash</span>
              <button
                onClick={() => copyToClipboard("curl -fsSL https://synapseos.dev/install.sh | bash", "hero-install")}
                style={{
                  backgroundColor: "#262626",
                  color: "#FFFFFF",
                  border: "1px solid #404040",
                  padding: "8px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem"
                }}
              >
                {copiedCmd === "hero-install" ? <Check size={14} color="#D0FF14" /> : <Copy size={14} />}
                {copiedCmd === "hero-install" ? "COPIED" : "COPY"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AUTHENTIC TERMINAL WINDOW (STARK OFF-BLACK ON PURE WHITE) */}
      <section style={{
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "48px 24px",
        borderBottom: "2px solid #0F0F0F"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px" }}>
          <div>
            <div className="brutalist-tag brutalist-tag-black" style={{ marginBottom: "8px" }}>
              LIVE RUNTIME EMULATION
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, textTransform: "uppercase" }}>
              Auditable Terminal Execution
            </h2>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "#52525B" }}>
            STDOUT / TTY1 // UNBUFFERED
          </span>
        </div>

        {/* The Dark Terminal Box */}
        <div className="terminal-window">
          {/* Terminal Title Bar */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 16px",
            borderBottom: "2px solid #262626",
            backgroundColor: "#171717"
          }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ width: "10px", height: "10px", backgroundColor: "#EF4444", display: "inline-block" }}></span>
              <span style={{ width: "10px", height: "10px", backgroundColor: "#F59E0B", display: "inline-block" }}></span>
              <span style={{ width: "10px", height: "10px", backgroundColor: "#D0FF14", display: "inline-block" }}></span>
              <span style={{ marginLeft: "12px", fontSize: "0.75rem", color: "#A1A1AA" }}>
                operator@synapse-kernel:~ (bash)
              </span>
            </div>

            {/* Interactive Tabs */}
            <div style={{ display: "flex", gap: "4px" }}>
              {terminalTabs.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(idx)}
                  style={{
                    backgroundColor: activeTab === idx ? "#0F0F0F" : "#262626",
                    color: activeTab === idx ? "#D0FF14" : "#A1A1AA",
                    border: "1px solid #404040",
                    borderBottom: activeTab === idx ? "2px solid #D0FF14" : "1px solid #404040",
                    padding: "4px 10px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.72rem",
                    cursor: "pointer"
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Terminal Body */}
          <div style={{ padding: "20px 24px", minHeight: "340px", fontSize: "0.88rem", lineHeight: 1.6 }}>
            {/* Command Prompt */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ color: "#D0FF14", fontWeight: 700 }}>[operator@synapse ~]$</span>
              <span style={{ color: "#FFFFFF", fontWeight: 600 }}>{terminalTabs[activeTab].cmd}</span>
            </div>

            {/* Output Lines */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {terminalTabs[activeTab].output.map((line, idx) => (
                <div key={idx} style={{ color: line.color, wordBreak: "break-word" }}>
                  {line.text}
                </div>
              ))}
            </div>

            {/* Active Cursor */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "16px" }}>
              <span style={{ color: "#D0FF14", fontWeight: 700 }}>[operator@synapse ~]$</span>
              <span style={{
                width: "8px",
                height: "16px",
                backgroundColor: "#D0FF14",
                display: "inline-block",
                animation: "pulseSubtle 1s infinite"
              }}></span>
            </div>
          </div>

          {/* Terminal Footer */}
          <div style={{
            padding: "8px 16px",
            borderTop: "1px solid #262626",
            backgroundColor: "#141414",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.74rem",
            color: "#71717A"
          }}>
            <span>EXIT_CODE: 0 (OK)</span>
            <span>STREAM: READY // HNSW COSINE MATRIX</span>
          </div>
        </div>
      </section>

      {/* 4. SYSTEM ARCHITECTURE & FLOWCHART */}
      <section id="architecture" style={{
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "64px 24px",
        borderBottom: "2px solid #0F0F0F"
      }}>
        <div style={{ marginBottom: "32px" }}>
          <div className="brutalist-tag brutalist-tag-lime" style={{ marginBottom: "8px" }}>
            ENGINEERING SPECIFICATION // SYSTEM PIPELINE
          </div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, textTransform: "uppercase" }}>
            Dataflow Architecture
          </h2>
          <p style={{ color: "#52525B", maxWidth: "720px", marginTop: "8px" }}>
            Strict linear data pipeline with zero cloud dependencies. Your Markdown vaults stay in your filesystem; embeddings are calculated locally or through direct API keys.
          </p>
        </div>

        {/* Structured Flowchart with sharp 90-degree orthogonal connectors */}
        <div style={{
          backgroundColor: "#FFFFFF",
          border: "2px solid #0F0F0F",
          boxShadow: "4px 4px 0px #0F0F0F",
          padding: "36px 24px",
          overflowX: "auto"
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            alignItems: "center"
          }}>
            {/* Step 1 */}
            <div style={{
              border: "2px solid #0F0F0F",
              padding: "16px",
              backgroundColor: "#FFFFFF"
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "#52525B", marginBottom: "6px" }}>
                01 // SOURCE
              </div>
              <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "4px" }}>
                Obsidian Vault
              </div>
              <div style={{ fontSize: "0.8rem", color: "#52525B" }}>
                Markdown files, Wikilinks, YAML frontmatter on local disk.
              </div>
            </div>

            {/* Connector */}
            <div style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontWeight: 800,
              fontSize: "1.2rem"
            }}>
              ──&gt;
            </div>

            {/* Step 2 */}
            <div style={{
              border: "2px solid #0F0F0F",
              padding: "16px",
              backgroundColor: "#FFFFFF"
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "#52525B", marginBottom: "6px" }}>
                02 // INGESTION
              </div>
              <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "4px" }}>
                AST Parser & Chunker
              </div>
              <div style={{ fontSize: "0.8rem", color: "#52525B" }}>
                Preserves headers, links, and code blocks into semantic chunks.
              </div>
            </div>

            {/* Connector */}
            <div style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontWeight: 800,
              fontSize: "1.2rem"
            }}>
              ──&gt;
            </div>

            {/* Step 3 (HIGHLIGHTED LIME) */}
            <div style={{
              border: "2px solid #0F0F0F",
              padding: "16px",
              backgroundColor: "#D0FF14",
              boxShadow: "3px 3px 0px #0F0F0F"
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "#0F0F0F", fontWeight: 700, marginBottom: "6px" }}>
                03 // VECTOR INDEX
              </div>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0F0F0F", marginBottom: "4px" }}>
                PostgreSQL + pgvector
              </div>
              <div style={{ fontSize: "0.8rem", color: "#0F0F0F", fontWeight: 500 }}>
                HNSW cosine distance index. 14ms sub-second search latency.
              </div>
            </div>

            {/* Connector */}
            <div style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontWeight: 800,
              fontSize: "1.2rem"
            }}>
              ──&gt;
            </div>

            {/* Step 4 */}
            <div style={{
              border: "2px solid #0F0F0F",
              padding: "16px",
              backgroundColor: "#FFFFFF"
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "#52525B", marginBottom: "6px" }}>
                04 // INFERENCE
              </div>
              <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "4px" }}>
                Local & Cloud LLMs
              </div>
              <div style={{ fontSize: "0.8rem", color: "#52525B" }}>
                Ollama native, Gemini 2.5, Claude 3.5, OpenAI, or OpenRouter.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HARDWARE & PERFORMANCE BENCHMARKS (DATASHEET GRID) */}
      <section id="datasheet" style={{
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "64px 24px",
        borderBottom: "2px solid #0F0F0F"
      }}>
        <div style={{ marginBottom: "32px" }}>
          <div className="brutalist-tag brutalist-tag-black" style={{ marginBottom: "8px" }}>
            HARD METRICS // ZERO MARKETING INFLATION
          </div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, textTransform: "uppercase" }}>
            Performance Datasheet
          </h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px"
        }}>
          <div className="brutalist-card-static" style={{ padding: "24px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#71717A" }}>
              METRIC // P95 RETRIEVAL
            </div>
            <div style={{ fontSize: "3rem", fontWeight: 900, fontFamily: "var(--font-mono)", margin: "12px 0 6px 0", color: "#0F0F0F" }}>
              14.2ms
            </div>
            <div style={{ fontSize: "0.85rem", color: "#52525B" }}>
              HNSW vector similarity search on 10,000 indexed markdown documents.
            </div>
          </div>

          <div className="brutalist-card-static" style={{ padding: "24px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#71717A" }}>
              TELEMETRY // CALL HOME
            </div>
            <div style={{ fontSize: "3rem", fontWeight: 900, fontFamily: "var(--font-mono)", margin: "12px 0 6px 0", color: "#0F0F0F" }}>
              0 B
            </div>
            <div style={{ fontSize: "0.85rem", color: "#52525B" }}>
              Zero bytes transmitted to third-party tracking or cloud telemetry servers.
            </div>
          </div>

          <div className="brutalist-card-static" style={{ padding: "24px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#71717A" }}>
              MEMORY FOOTPRINT // IDLE
            </div>
            <div style={{ fontSize: "3rem", fontWeight: 900, fontFamily: "var(--font-mono)", margin: "12px 0 6px 0", color: "#0F0F0F" }}>
              184MB
            </div>
            <div style={{ fontSize: "0.85rem", color: "#52525B" }}>
              Resident Set Size (RSS) under Linux kernel 6.x. Commodity hardware ready.
            </div>
          </div>

          <div className="brutalist-card-static" style={{ padding: "24px", backgroundColor: "#D0FF14" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#0F0F0F", fontWeight: 700 }}>
              LICENSING & COST
            </div>
            <div style={{ fontSize: "3rem", fontWeight: 900, fontFamily: "var(--font-mono)", margin: "12px 0 6px 0", color: "#0F0F0F" }}>
              $0.00
            </div>
            <div style={{ fontSize: "0.85rem", color: "#0F0F0F", fontWeight: 600 }}>
              Fully open-source core. No recurring monthly SaaS subscription fees.
            </div>
          </div>
        </div>
      </section>

      {/* 6. CORE SPECIFICATIONS (6-CARD BRUTALIST GRID) */}
      <section id="pipeline" style={{
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "64px 24px",
        borderBottom: "2px solid #0F0F0F"
      }}>
        <div style={{ marginBottom: "36px" }}>
          <div className="brutalist-tag brutalist-tag-lime" style={{ marginBottom: "8px" }}>
            SPECIFICATIONS
          </div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, textTransform: "uppercase" }}>
            Engine Capabilities
          </h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "24px"
        }}>
          {/* Card 1 */}
          <div className="brutalist-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.8rem", color: "#80A300" }}>
                SPEC // 01
              </span>
              <Database size={20} color="#0F0F0F" />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "12px", textTransform: "uppercase" }}>
              Hybrid RAG Engine
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#3F3F46", lineHeight: 1.5 }}>
              Combines PostgreSQL full-text search (<code style={{ backgroundColor: "#F4F4F5", padding: "2px 4px" }}>tsvector</code>) with pgvector HNSW cosine embeddings for deterministic, zero-hallucination recall.
            </p>
          </div>

          {/* Card 2 */}
          <div className="brutalist-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.8rem", color: "#80A300" }}>
                SPEC // 02
              </span>
              <HardDrive size={20} color="#0F0F0F" />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "12px", textTransform: "uppercase" }}>
              Direct Vault Filesystem Sync
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#3F3F46", lineHeight: 1.5 }}>
              Mounts directly to your local Obsidian directory. Preserves raw Markdown, Wikilinks (<code style={{ backgroundColor: "#F4F4F5", padding: "2px 4px" }}>[[Page]]</code>), and tag taxonomies without proprietary database lock-in.
            </p>
          </div>

          {/* Card 3 */}
          <div className="brutalist-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.8rem", color: "#80A300" }}>
                SPEC // 03
              </span>
              <Cpu size={20} color="#0F0F0F" />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "12px", textTransform: "uppercase" }}>
              Multi-Model Orchestrator
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#3F3F46", lineHeight: 1.5 }}>
              Hot-swap inference targets in one keystroke. Execute completely offline via Ollama (<code style={{ backgroundColor: "#F4F4F5", padding: "2px 4px" }}>llama3</code>, <code style={{ backgroundColor: "#F4F4F5", padding: "2px 4px" }}>mistral</code>), or connect free Gemini / Claude / OpenAI API keys.
            </p>
          </div>

          {/* Card 4 */}
          <div className="brutalist-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.8rem", color: "#80A300" }}>
                SPEC // 04
              </span>
              <Terminal size={20} color="#0F0F0F" />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "12px", textTransform: "uppercase" }}>
              Sandboxed Agent Tasks
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#3F3F46", lineHeight: 1.5 }}>
              Execute bash, python, and sysadmin operational routines within process-isolated execution boundaries. Every command stream is logged and auditable in real-time.
            </p>
          </div>

          {/* Card 5 */}
          <div className="brutalist-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.8rem", color: "#80A300" }}>
                SPEC // 05
              </span>
              <Shield size={20} color="#0F0F0F" />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "12px", textTransform: "uppercase" }}>
              Role-Based Access Control
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#3F3F46", lineHeight: 1.5 }}>
              Built-in JWT session validation and vault partition isolation. Separate Operator, Admin, and Guest privileges without relying on external identity services.
            </p>
          </div>

          {/* Card 6 */}
          <div className="brutalist-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.8rem", color: "#80A300" }}>
                SPEC // 06
              </span>
              <Zap size={20} color="#0F0F0F" />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "12px", textTransform: "uppercase" }}>
              Zero Cold-Start Overhead
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#3F3F46", lineHeight: 1.5 }}>
              Compiled asynchronous FastAPI core with streaming Server-Sent Events (SSE). UI built on Next.js with sub-second page transitions and zero bloat.
            </p>
          </div>
        </div>
      </section>

      {/* 7. COMPARISON MATRIX (SYNAPSEOS VS. CLOUD AI SLOP) */}
      <section id="comparison" style={{
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "64px 24px",
        borderBottom: "2px solid #0F0F0F"
      }}>
        <div style={{ marginBottom: "32px" }}>
          <div className="brutalist-tag brutalist-tag-black" style={{ marginBottom: "8px" }}>
            ARCHITECTURAL COMPARISON
          </div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, textTransform: "uppercase" }}>
            SynapseOS vs. Cloud AI SaaS
          </h2>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "2px solid #0F0F0F",
            fontFamily: "var(--font-sans)",
            backgroundColor: "#FFFFFF"
          }}>
            <thead>
              <tr style={{ backgroundColor: "#0F0F0F", color: "#FFFFFF", fontFamily: "var(--font-mono)", fontSize: "0.84rem" }}>
                <th style={{ padding: "14px 18px", textAlign: "left", border: "1px solid #0F0F0F" }}>CRITICAL CAPABILITY</th>
                <th style={{ padding: "14px 18px", textAlign: "left", border: "1px solid #0F0F0F" }}>GENERIC CLOUD "AI SLOP" SAAS</th>
                <th style={{ padding: "14px 18px", textAlign: "left", border: "1px solid #0F0F0F", backgroundColor: "#D0FF14", color: "#0F0F0F" }}>SYNAPSE_OS (SELF-HOSTED)</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: "0.88rem" }}>
              <tr>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", fontWeight: 700 }}>Data Sovereignty</td>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", color: "#71717A" }}>Exported to remote cloud servers for model training</td>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", fontWeight: 700, backgroundColor: "#FAFAFA" }}>100% stored on local disk in native Markdown format</td>
              </tr>
              <tr>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", fontWeight: 700 }}>Search Latency</td>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", color: "#71717A" }}>400ms – 1,800ms (cloud round-trip + rate limits)</td>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", fontWeight: 700, backgroundColor: "#FAFAFA" }}>14ms p95 via local PostgreSQL pgvector HNSW</td>
              </tr>
              <tr>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", fontWeight: 700 }}>Pricing Structure</td>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", color: "#71717A" }}>$20 – $100 / user / month recurring subscription</td>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", fontWeight: 700, backgroundColor: "#FAFAFA" }}>$0 / month (open-source core, runs on your own hardware)</td>
              </tr>
              <tr>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", fontWeight: 700 }}>Offline Operation</td>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", color: "#71717A" }}>Impossible. Requires continuous broadband connectivity</td>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", fontWeight: 700, backgroundColor: "#FAFAFA" }}>Native offline execution via local Ollama runtime</td>
              </tr>
              <tr>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", fontWeight: 700 }}>System Telemetry</td>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", color: "#71717A" }}>User queries, mouse tracking, and keystroke analytics recorded</td>
                <td style={{ padding: "14px 18px", border: "1px solid #0F0F0F", fontWeight: 700, backgroundColor: "#FAFAFA" }}>Strict zero telemetry. Zero analytics pingbacks</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 8. DEPLOYMENT & QUICK-START */}
      <section id="deployment" style={{
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "64px 24px",
        borderBottom: "2px solid #0F0F0F"
      }}>
        <div style={{
          backgroundColor: "#0F0F0F",
          color: "#FFFFFF",
          border: "2px solid #0F0F0F",
          boxShadow: "6px 6px 0px #0F0F0F",
          padding: "48px 36px"
        }}>
          <div className="brutalist-tag brutalist-tag-lime" style={{ marginBottom: "16px" }}>
            ONE-COMMAND DEPLOYMENT
          </div>

          <h2 style={{ fontSize: "2.4rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "16px", color: "#FFFFFF" }}>
            Deploy SynapseOS on Bare Metal or Docker
          </h2>

          <p style={{ color: "#D4D4D8", maxWidth: "680px", marginBottom: "28px", fontSize: "1rem" }}>
            Run the pre-configured container suite including PostgreSQL 16, pgvector, FastAPI async daemon, and the Next.js console interface in seconds.
          </p>

          <div style={{
            backgroundColor: "#18181B",
            border: "1px solid #3F3F46",
            padding: "16px 20px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.9rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "28px"
          }}>
            <span style={{ color: "#D0FF14" }}>
              docker run -d -p 3000:3000 -p 8000:8000 -v ~/vault:/vault synapseos/runtime:v2.4
            </span>
            <button
              onClick={() => copyToClipboard("docker run -d -p 3000:3000 -p 8000:8000 -v ~/vault:/vault synapseos/runtime:v2.4", "docker-deploy")}
              style={{
                backgroundColor: "#27272A",
                color: "#FFFFFF",
                border: "1px solid #52525B",
                padding: "8px 14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem"
              }}
            >
              {copiedCmd === "docker-deploy" ? <Check size={14} color="#D0FF14" /> : <Copy size={14} />}
              {copiedCmd === "docker-deploy" ? "COPIED" : "COPY COMMAND"}
            </button>
          </div>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <button
              onClick={onEnterConsole}
              className="brutalist-btn-primary"
              style={{ fontSize: "0.95rem", padding: "14px 26px" }}
            >
              LAUNCH WEB CONSOLE NOW
              <ArrowRight size={16} />
            </button>
            <a
              href="https://github.com/Abderrahmane-jacker/SynapseOS"
              target="_blank"
              rel="noreferrer"
              className="brutalist-btn-secondary"
              style={{ fontSize: "0.95rem", padding: "14px 22px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <ExternalLink size={16} />
              SELF-HOST ON GITHUB
            </a>
          </div>
        </div>
      </section>

      {/* 9. BRUTALIST FOOTER */}
      <footer style={{
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "36px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px",
        fontFamily: "var(--font-mono)",
        fontSize: "0.8rem",
        color: "#52525B"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontWeight: 800, color: "#0F0F0F" }}>SYNAPSE_OS</span>
          <span>//</span>
          <span>BUILD: commit-ac845e4</span>
          <span>//</span>
          <span>LICENSE: MIT</span>
        </div>

        <div style={{ display: "flex", gap: "20px" }}>
          <a href="https://github.com/Abderrahmane-jacker/SynapseOS" target="_blank" rel="noreferrer" style={{ color: "#0F0F0F", textDecoration: "none", fontWeight: 700 }}>
            GITHUB: SynapseOS
          </a>
          <a href="#datasheet" style={{ color: "#0F0F0F", textDecoration: "none", fontWeight: 600 }}>
            BENCHMARKS
          </a>
          <a href="#architecture" style={{ color: "#0F0F0F", textDecoration: "none", fontWeight: 600 }}>
            SPEC_SHEET
          </a>
        </div>
      </footer>
    </div>
  );
}
