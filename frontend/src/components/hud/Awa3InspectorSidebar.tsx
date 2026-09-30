import React, { useState } from 'react';
import { Search, ArrowLeft, X, Layers, Network } from 'lucide-react';

interface Hub {
  name: string;
  count: number;
}

interface Awa3InspectorSidebarProps {
  totalNotes: number;
  totalConnections: number;
  topHubs: Hub[];
  categoryCounts?: Record<string, number>;
  activeCategory?: string | null;
  onSelectCategory?: (cat: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedNode: any | null;
  is3D: boolean;
  onToggle3D: () => void;
  onSelectHub?: (name: string) => void;
  onResetView?: () => void;
  onDeepDive?: (node: any) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Router": "#0F0F0F",
  "Wiki": "#1E293B",
  "Concepts": "#80A300",
  "Suites": "#312E81",
  "Skills": "#1E3A8A",
  "Tools": "#881337",
  "Worlds": "#0E7490",
  "Notes": "#27272A",
  "Files": "#3F3F46"
};

export default function Awa3InspectorSidebar({
  totalNotes,
  totalConnections,
  topHubs,
  categoryCounts = {},
  activeCategory = null,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  selectedNode,
  is3D,
  onToggle3D,
  onSelectHub,
  onResetView,
  onDeepDive
}: Awa3InspectorSidebarProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'hubs'>('categories');

  const defaultCategories: Record<string, number> = {
    "Skills": 12,
    "Tools": 9,
    "Concepts": 8,
    "Wiki": 7,
    "Suites": 5,
    "Worlds": 4,
    "Notes": 14
  };

  const currentCategoryCounts = Object.keys(categoryCounts).length > 0 ? categoryCounts : defaultCategories;
  const categoryEntries = Object.entries(currentCategoryCounts);

  return (
    <div style={{
      position: 'absolute',
      left: '24px',
      top: '72px',
      bottom: '30px',
      width: '280px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 30,
      pointerEvents: 'auto',
      userSelect: 'none'
    }}>
      {/* Header Grid Panel */}
      <div style={{
        background: '#FFFFFF',
        border: '2px solid #0F0F0F',
        boxShadow: '4px 4px 0px #0F0F0F',
        padding: '12px'
      }}>
        <div style={{ fontSize: '0.64rem', fontFamily: "'JetBrains Mono', monospace", color: '#71717A', letterSpacing: '0.12em', marginBottom: '2px', fontWeight: 700 }}>
          [INSPECTOR_ARCHIVE]
        </div>
        <h2 style={{
          fontSize: '0.92rem',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          color: '#0F0F0F',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          VAULT INSPECTOR
        </h2>

        <div style={{ fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace", color: '#52525B', marginTop: '4px', marginBottom: '8px', fontWeight: 600 }}>
          {totalNotes} NODES // {totalConnections} LINKS
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={onToggle3D}
            style={{
              fontSize: '0.68rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
              color: '#0F0F0F',
              background: '#D0FF14',
              border: '1px solid #0F0F0F',
              boxShadow: '2px 2px 0px #0F0F0F',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <ArrowLeft size={11} /> {is3D ? 'VIEW // 2D' : 'VIEW // 3D'}
          </button>

          {onResetView && (
            <button
              onClick={() => {
                onResetView();
                if (onSelectCategory) onSelectCategory(null);
                onSearchChange('');
              }}
              style={{
                fontSize: '0.68rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                color: '#0F0F0F',
                background: '#F4F4F5',
                border: '1px solid #0F0F0F',
                boxShadow: '2px 2px 0px #0F0F0F',
                padding: '4px 8px',
                cursor: 'pointer'
              }}
            >
              RESET ALL
            </button>
          )}
        </div>

        {/* Search Field */}
        <div style={{ position: 'relative', marginTop: '10px' }}>
          <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="FILTER_NODES..."
            style={{
              width: '100%',
              padding: '5px 24px 5px 26px',
              background: '#FFFFFF',
              border: '2px solid #0F0F0F',
              borderRadius: '0px',
              color: '#0F0F0F',
              fontSize: '0.72rem',
              fontFamily: "'JetBrains Mono', monospace",
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#71717A',
                padding: '2px'
              }}
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Selected Node Telemetry */}
      <div style={{
        background: '#FFFFFF',
        border: '2px solid #0F0F0F',
        boxShadow: '4px 4px 0px #0F0F0F',
        padding: '12px'
      }}>
        <div style={{
          fontSize: '0.62rem',
          fontWeight: 800,
          color: '#0F0F0F',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.12em',
          marginBottom: '6px'
        }}>
          // NODE_TELEMETRY
        </div>

        {selectedNode ? (
          <div style={{ fontSize: '0.76rem', fontFamily: "'JetBrains Mono', monospace", display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ fontWeight: 800, color: '#0F0F0F', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.88rem' }}>
              {selectedNode.title}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#52525B' }}>
              CATEGORY: <span style={{ color: '#0F0F0F', fontWeight: 800, background: '#E4FF66', padding: '1px 4px', border: '1px solid #0F0F0F' }}>{selectedNode.category || 'General'}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#71717A', marginBottom: '2px', fontWeight: 600 }}>
              CONNECTIONS: {selectedNode.connections || 0} LINKS
            </div>

            {onDeepDive && (
              <button
                onClick={() => onDeepDive(selectedNode)}
                style={{
                  width: '100%',
                  marginTop: '2px',
                  padding: '6px 8px',
                  background: '#D0FF14',
                  border: '2px solid #0F0F0F',
                  boxShadow: '3px 3px 0px #0F0F0F',
                  color: '#0F0F0F',
                  fontSize: '0.72rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 800,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.1s ease',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = '#E4FF66';
                  e.currentTarget.style.transform = 'translate(-1px, -1px)';
                  e.currentTarget.style.boxShadow = '4px 4px 0px #0F0F0F';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = '#D0FF14';
                  e.currentTarget.style.transform = 'translate(0, 0)';
                  e.currentTarget.style.boxShadow = '3px 3px 0px #0F0F0F';
                }}
              >
                DEEP DIVE / BACKLINKS →
              </button>
            )}
          </div>
        ) : (
          <div style={{
            fontSize: '0.7rem',
            fontFamily: "'JetBrains Mono', monospace",
            color: '#71717A',
            lineHeight: 1.35,
            border: '1px dashed #0F0F0F',
            padding: '6px 8px',
            background: '#FAFAFA'
          }}>
            SELECT NODE IN MATRIX TO INSPECT LINKS & TELEMETRY.
          </div>
        )}
      </div>

      {/* Knowledge & Categories Explorer (Tabbed) */}
      <div style={{
        flex: 1,
        minHeight: 0,
        background: '#FFFFFF',
        border: '2px solid #0F0F0F',
        boxShadow: '4px 4px 0px #0F0F0F',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', borderBottom: '2px solid #0F0F0F', paddingBottom: '8px' }}>
          <button
            onClick={() => setActiveTab('categories')}
            style={{
              flex: 1,
              fontSize: '0.68rem',
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              padding: '4px 6px',
              background: activeTab === 'categories' ? '#D0FF14' : '#F4F4F5',
              color: '#0F0F0F',
              border: '1px solid #0F0F0F',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Layers size={11} /> CATEGORIES
          </button>
          <button
            onClick={() => setActiveTab('hubs')}
            style={{
              flex: 1,
              fontSize: '0.68rem',
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              padding: '4px 6px',
              background: activeTab === 'hubs' ? '#D0FF14' : '#F4F4F5',
              color: '#0F0F0F',
              border: '1px solid #0F0F0F',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Network size={11} /> KNOWLEDGE HUBS
          </button>
        </div>

        {/* Active Filter Indicator */}
        {activeCategory && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#D0FF14',
            border: '1px solid #0F0F0F',
            padding: '4px 8px',
            marginBottom: '8px',
            fontSize: '0.68rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 800
          }}>
            <span>FILTER: {activeCategory.toUpperCase()}</span>
            <button
              onClick={() => onSelectCategory && onSelectCategory(null)}
              style={{
                background: '#0F0F0F',
                color: '#FFFFFF',
                border: 'none',
                padding: '1px 5px',
                cursor: 'pointer',
                fontSize: '0.64rem',
                fontWeight: 800
              }}
              title="Clear Category Filter"
            >
              CLEAR ✕
            </button>
          </div>
        )}

        {/* Tab 1: Categories List */}
        {activeTab === 'categories' && (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            paddingRight: '2px'
          }}>
            {categoryEntries.map(([cat, count]) => {
              const isSelected = activeCategory?.toLowerCase() === cat.toLowerCase();
              const color = CATEGORY_COLORS[cat] || '#0F0F0F';

              return (
                <div
                  key={cat}
                  onClick={() => onSelectCategory && onSelectCategory(isSelected ? null : cat)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.72rem',
                    fontFamily: "'JetBrains Mono', monospace",
                    cursor: 'pointer',
                    padding: '5px 8px',
                    background: isSelected ? '#D0FF14' : '#FAFAFA',
                    border: isSelected ? '2px solid #0F0F0F' : '1px solid #E4E4E7',
                    boxShadow: isSelected ? '2px 2px 0px #0F0F0F' : 'none',
                    transition: 'all 0.1s'
                  }}
                  onMouseOver={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#F4F4F5';
                      e.currentTarget.style.borderColor = '#0F0F0F';
                    }
                  }}
                  onMouseOut={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#FAFAFA';
                      e.currentTarget.style.borderColor = '#E4E4E7';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      background: color,
                      border: '1px solid #0F0F0F',
                      display: 'inline-block'
                    }} />
                    <span style={{ color: '#0F0F0F', fontWeight: isSelected ? 800 : 600 }}>{cat}</span>
                  </div>
                  <span style={{
                    color: '#0F0F0F',
                    fontWeight: 800,
                    background: '#FFFFFF',
                    border: '1px solid #0F0F0F',
                    padding: '0 5px',
                    fontSize: '0.66rem'
                  }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Knowledge Primary Hubs */}
        {activeTab === 'hubs' && (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            paddingRight: '2px'
          }}>
            {topHubs.map((hub, idx) => (
              <div
                key={idx}
                onClick={() => onSelectHub && onSelectHub(hub.name)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.72rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: 'pointer',
                  padding: '5px 8px',
                  background: '#FAFAFA',
                  border: '1px solid #E4E4E7',
                  transition: 'all 0.1s'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = '#D0FF14';
                  e.currentTarget.style.borderColor = '#0F0F0F';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = '#FAFAFA';
                  e.currentTarget.style.borderColor = '#E4E4E7';
                }}
              >
                <span style={{ color: '#0F0F0F', fontWeight: 600 }}>{hub.name}</span>
                <span style={{
                  color: '#0F0F0F',
                  fontWeight: 800,
                  background: '#FFFFFF',
                  border: '1px solid #0F0F0F',
                  padding: '0 5px',
                  fontSize: '0.66rem'
                }}>
                  {hub.count} links
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
