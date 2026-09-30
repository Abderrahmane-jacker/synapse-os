import React, { useState, useEffect } from 'react';
import { X, Zap, RefreshCw, Check, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

interface LinkPrediction {
  source: string;
  target: string;
  similarity: number;
  score: number;
  source_path: string;
  target_path: string;
}

interface LinkPredictorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkConnected: () => void;
}

export default function LinkPredictorModal({ isOpen, onClose, onLinkConnected }: LinkPredictorModalProps) {
  const [predictions, setPredictions] = useState<LinkPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectingMap, setConnectingMap] = useState<Record<string, boolean>>({});
  const [connectedMap, setConnectedMap] = useState<Record<string, boolean>>({});

  const fetchPredictions = async () => {
    setIsLoading(true);
    try {
      const res = await api.knowledge.getPredictions(8);
      setPredictions(res);
    } catch (err) {
      console.error("Failed to load link predictions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPredictions();
    }
  }, [isOpen]);

  const handleConnect = async (pred: LinkPrediction) => {
    const key = `${pred.source}__${pred.target}`;
    setConnectingMap(prev => ({ ...prev, [key]: true }));

    try {
      const res = await api.knowledge.connectNotes(pred.source_path, pred.target);
      if (res.success) {
        setConnectedMap(prev => ({ ...prev, [key]: true }));
        setTimeout(() => {
          onLinkConnected();
        }, 600);
      }
    } catch (err) {
      console.error("Failed to connect notes:", err);
    } finally {
      setConnectingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 15, 15, 0.6)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '680px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          background: '#FFFFFF',
          border: '2px solid #0F0F0F',
          borderRadius: '0px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '8px 8px 0px #0F0F0F',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '2px solid #0F0F0F',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '0px',
              background: '#D0FF14',
              border: '2px solid #0F0F0F',
              boxShadow: '2px 2px 0px #0F0F0F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Zap size={18} color="#0F0F0F" />
            </div>
            <div>
              <div style={{
                fontSize: '0.62rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800,
                color: '#71717A',
                letterSpacing: '0.12em',
              }}>
                [NEURAL_LINK_PREDICTOR]
              </div>
              <div style={{
                fontSize: '1.1rem',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 900,
                color: '#0F0F0F',
                letterSpacing: '-0.02em',
              }}>
                PREDICTED GRAPH CONNECTIONS
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={fetchPredictions}
              disabled={isLoading}
              style={{
                background: '#F4F4F5',
                border: '1px solid #0F0F0F',
                borderRadius: '0px',
                color: '#0F0F0F',
                padding: '6px 12px',
                fontSize: '0.74rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                cursor: isLoading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              RE-SCAN
            </button>

            <button
              onClick={onClose}
              style={{
                background: '#F4F4F5',
                border: '1px solid #0F0F0F',
                color: '#0F0F0F',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                borderRadius: '0px',
                fontWeight: 800
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', background: '#FFFFFF' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#71717A', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
              Scanning vault embeddings for semantic associations...
            </div>
          ) : predictions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#15803D', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', fontWeight: 700 }}>
              ✓ All high-affinity concepts are linked in your vault.
            </div>
          ) : (
            predictions.map(pred => {
              const key = `${pred.source}__${pred.target}`;
              const isConnecting = connectingMap[key];
              const isConnected = connectedMap[key];

              return (
                <div
                  key={key}
                  style={{
                    background: '#FAFAFA',
                    border: '1px solid #0F0F0F',
                    boxShadow: '2px 2px 0px #0F0F0F',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  {/* Left: Notes Pair */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.86rem',
                        fontWeight: 800,
                        color: '#0F0F0F',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        {pred.source}
                      </span>
                      <ArrowRight size={13} color="#0F0F0F" />
                      <span style={{
                        fontSize: '0.86rem',
                        fontWeight: 800,
                        color: '#0F0F0F',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        background: '#E4FF66',
                        padding: '1px 5px',
                        border: '1px solid #0F0F0F'
                      }}>
                        {pred.target}
                      </span>
                    </div>

                    {/* Similarity Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        flex: 1,
                        maxWidth: '180px',
                        height: '6px',
                        background: '#FFFFFF',
                        border: '1px solid #0F0F0F',
                        borderRadius: '0px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${pred.similarity}%`,
                          height: '100%',
                          background: '#D0FF14',
                        }} />
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 800,
                        color: '#0F0F0F',
                      }}>
                        {pred.similarity}% MATCH
                      </span>
                    </div>
                  </div>

                  {/* Right: Connect Action */}
                  <button
                    onClick={() => handleConnect(pred)}
                    disabled={isConnecting || isConnected}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: isConnected ? '#DCFCE7' : '#D0FF14',
                      border: '1px solid #0F0F0F',
                      boxShadow: '2px 2px 0px #0F0F0F',
                      borderRadius: '0px',
                      color: isConnected ? '#15803D' : '#0F0F0F',
                      fontSize: '0.75rem',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 800,
                      cursor: isConnected || isConnecting ? 'default' : 'pointer',
                      transition: 'all 0.1s',
                    }}
                  >
                    {isConnected ? (
                      <>
                        <Check size={14} />
                        LINKED
                      </>
                    ) : isConnecting ? (
                      <>CONNECTING...</>
                    ) : (
                      <>
                        <Zap size={13} />
                        CONNECT
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
