import React, { useState } from 'react';
import { Tag as TagIcon, ChevronDown, ChevronUp } from 'lucide-react';

interface NexusFilterPanelProps {
  tagCounts?: Record<string, number>;
  activeTag?: string | null;
  activeDepth?: number | null;
  onSelectTag?: (tag: string | null) => void;
  onSelectDepth?: (depth: number | null) => void;
}

export default function NexusFilterPanel({
  tagCounts = {},
  activeTag,
  activeDepth,
  onSelectTag,
  onSelectDepth
}: NexusFilterPanelProps) {
  const [filterTab, setFilterTab] = useState<'tags' | 'depth'>('tags');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const depthLevels = [
    { level: 0, name: "Depth 0 (Root Core)", color: "#0F0F0F" },
    { level: 1, name: "Depth 1 (Daughter)", color: "#80A300" },
    { level: 2, name: "Depth 2 (Grandchild)", color: "#1E293B" },
    { level: 3, name: "Depth 3 (Sub-branch)", color: "#3F3F46" },
    { level: 4, name: "Depth 4+ (Leaves)", color: "#52525B" }
  ];

  const tagList = Object.entries(tagCounts).length > 0
    ? Object.entries(tagCounts).map(([tag, count]) => ({ name: tag, count }))
    : [
        { name: "ai", count: 42 },
        { name: "security", count: 38 },
        { name: "projects", count: 29 },
        { name: "tools", count: 24 },
        { name: "architecture", count: 18 },
        { name: "models", count: 15 },
        { name: "research", count: 12 }
      ];

  const hasActiveFilter = activeTag !== null || activeDepth !== null;

  return (
    <div style={{
      position: 'absolute',
      right: '24px',
      top: '72px',
      width: '230px',
      maxHeight: isCollapsed ? 'auto' : 'calc(100vh - 340px)',
      background: '#FFFFFF',
      border: '2px solid #0F0F0F',
      boxShadow: '4px 4px 0px #0F0F0F',
      padding: isCollapsed ? '8px 12px' : '12px',
      zIndex: 30,
      pointerEvents: 'auto',
      userSelect: 'none',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isCollapsed ? '0px' : '10px',
        borderBottom: isCollapsed ? 'none' : '2px solid #0F0F0F',
        paddingBottom: isCollapsed ? '0px' : '8px'
      }}>
        {!isCollapsed ? (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setFilterTab('tags')}
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                padding: '3px 8px',
                background: filterTab === 'tags' ? '#D0FF14' : '#F4F4F5',
                color: '#0F0F0F',
                border: '1px solid #0F0F0F',
                cursor: 'pointer'
              }}
            >
              TAGS
            </button>
            <button
              onClick={() => setFilterTab('depth')}
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                padding: '3px 8px',
                background: filterTab === 'depth' ? '#D0FF14' : '#F4F4F5',
                color: '#0F0F0F',
                border: '1px solid #0F0F0F',
                cursor: 'pointer'
              }}
            >
              DEPTH
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '0.72rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#0F0F0F' }}>
            FILTERS {hasActiveFilter ? '●' : ''}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {hasActiveFilter && !isCollapsed && (
            <button
              onClick={() => {
                if (onSelectTag) onSelectTag(null);
                if (onSelectDepth) onSelectDepth(null);
              }}
              style={{
                fontSize: '0.64rem',
                fontFamily: "'JetBrains Mono', monospace",
                color: '#0F0F0F',
                background: '#F4F4F5',
                border: '1px solid #0F0F0F',
                padding: '2px 5px',
                cursor: 'pointer',
                fontWeight: 800
              }}
            >
              CLEAR
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: '#FAFAFA',
              border: '1px solid #0F0F0F',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F0F0F'
            }}
            title={isCollapsed ? "Expand filters" : "Collapse filters"}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Tab 1: Vault Note Tags */}
          {filterTab === 'tags' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
              {tagList.map((tagObj) => {
                const isSelected = activeTag === tagObj.name;

                return (
                  <div
                    key={tagObj.name}
                    onClick={() => onSelectTag && onSelectTag(isSelected ? null : tagObj.name)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      background: isSelected ? '#D0FF14' : '#FAFAFA',
                      border: isSelected ? '2px solid #0F0F0F' : '1px solid #E4E4E7',
                      boxShadow: isSelected ? '2px 2px 0px #0F0F0F' : 'none',
                      fontFamily: "'JetBrains Mono', monospace",
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <TagIcon size={11} color="#0F0F0F" />
                      <span style={{ fontWeight: isSelected ? 800 : 500, color: '#0F0F0F' }}>#{tagObj.name}</span>
                    </div>
                    <span style={{
                      fontSize: '0.66rem',
                      color: '#0F0F0F',
                      fontWeight: 800,
                      background: '#FFFFFF',
                      border: '1px solid #0F0F0F',
                      padding: '0 4px'
                    }}>
                      {tagObj.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Node Depth Color Hierarchy */}
          {filterTab === 'depth' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.66rem', color: '#71717A', marginBottom: '2px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                // FILTER_BY_Z_DEPTH:
              </div>
              {depthLevels.map((d, i) => {
                const isSelected = activeDepth === d.level;
                return (
                  <div
                    key={i}
                    onClick={() => onSelectDepth && onSelectDepth(isSelected ? null : d.level)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.74rem',
                      color: '#0F0F0F',
                      cursor: 'pointer',
                      padding: '5px 8px',
                      background: isSelected ? '#D0FF14' : '#FAFAFA',
                      border: isSelected ? '2px solid #0F0F0F' : '1px solid #E4E4E7',
                      boxShadow: isSelected ? '2px 2px 0px #0F0F0F' : 'none',
                      fontFamily: "'JetBrains Mono', monospace",
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
                        width: '9px',
                        height: '9px',
                        background: d.color,
                        border: '1px solid #0F0F0F'
                      }} />
                      <span style={{ fontWeight: isSelected ? 800 : 600 }}>{d.name}</span>
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: '0.62rem', background: '#0F0F0F', color: '#D0FF14', padding: '1px 4px', fontWeight: 800 }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
