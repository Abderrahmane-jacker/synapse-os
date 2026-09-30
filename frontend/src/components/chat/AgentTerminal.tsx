import React, { useState, useEffect, useRef } from 'react';
import { X, Terminal, Loader2 } from 'lucide-react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface AgentChatModalProps {
  command: string;
  cwd: string;
  onClose: () => void;
}

export default function AgentTerminal({ command, cwd, onClose }: AgentChatModalProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const getPersistentSessionId = () => {
    if (typeof window === 'undefined') return 'claude_session_default';
    let sid = localStorage.getItem("nexus_active_claude_session_id");
    if (!sid) {
      sid = "claude_session_" + Math.random().toString(36).substring(7);
      localStorage.setItem("nexus_active_claude_session_id", sid);
    }
    return sid;
  };

  const sessionId = useRef(getPersistentSessionId());

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      theme: {
        background: '#0F0F0F',
        foreground: '#F4F4F5',
        cursor: '#D0FF14',
        selectionBackground: 'rgba(208, 255, 20, 0.35)',
        black: '#0F0F0F',
        brightBlack: '#52525B',
        red: '#EF4444',
        brightRed: '#F87171',
        green: '#D0FF14',
        brightGreen: '#E4FF66',
        yellow: '#FBBF24',
        brightYellow: '#FDE047',
        blue: '#60A5FA',
        brightBlue: '#93C5FD',
        magenta: '#C084FC',
        brightMagenta: '#E9D5FF',
        cyan: '#38BDF8',
        brightCyan: '#7DD3FC',
        white: '#F4F4F5',
        brightWhite: '#FFFFFF',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      cursorBlink: true,
      convertEol: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const wsUrl = `${API_URL.replace('http', 'ws')}/api/agent`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({
        command,
        cwd,
        session_id: sessionId.current
      }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'output' || payload.type === 'done') {
          term.write(payload.content);
        }
        if (payload.type === 'done') {
          setIsFinished(true);
        }
      } catch (e) {
        console.error("Failed to parse agent message", e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsFinished(true);
      term.write('\r\n\x1b[31m[WebSocket Disconnected]\x1b[0m\r\n');
    };

    term.onData(data => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', content: data }));
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) {
        wsRef.current.close();
      }
      term.dispose();
    };
  }, [command, cwd]);

  const handleTerminateSession = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'terminate' }));
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem("nexus_active_claude_session_id");
    }
    onClose();
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#0F0F0F',
      border: '2px solid #0F0F0F',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '2px solid #27272A',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#0F0F0F'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            background: '#D0FF14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Terminal size={15} color="#0F0F0F" />
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', fontFamily: "'JetBrains Mono', monospace", color: '#D0FF14', fontWeight: 800 }}>
              [operator@synapse ~]$
            </div>
            <div style={{ fontSize: '0.78rem', color: '#A1A1AA', fontFamily: "'JetBrains Mono', monospace" }}>
              {cwd} $ {command}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Status indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            color: isFinished ? '#EF4444' : isConnected ? '#D0FF14' : '#FBBF24',
            fontWeight: 800,
            fontFamily: "'JetBrains Mono', monospace",
            background: '#18181B',
            padding: '4px 10px',
            border: '1px solid #27272A'
          }}>
            {!isFinished && !isConnected ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <div style={{
                width: '6px', height: '6px',
                background: isFinished ? '#EF4444' : '#D0FF14'
              }} />
            )}
            {isFinished ? 'TERMINATED' : isConnected ? 'CONNECTED' : 'CONNECTING...'}
          </div>

          <button
            onClick={handleTerminateSession}
            title="Terminate Session"
            style={{
              background: '#27272A',
              border: '1px solid #3F3F46',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.72rem',
              fontWeight: 800,
              gap: '4px'
            }}
          >
            <X size={14} /> EXIT
          </button>
        </div>
      </div>

      {/* XTerm Container */}
      <div style={{
        flex: 1,
        padding: '12px',
        background: '#0F0F0F',
        overflow: 'hidden'
      }}>
        <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
