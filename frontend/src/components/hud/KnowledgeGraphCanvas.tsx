import React, { useEffect, useRef, useState } from 'react';

interface Node {
  id: string;
  title: string;
  category: string;
  color: string;
  connections: number;
  created?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface Link {
  source: string;
  target: string;
}

interface KnowledgeGraphCanvasProps {
  nodes: Node[];
  links: Link[];
  searchQuery?: string;
  activeCategory?: string | null;
  selectedNode?: Node | null;
  onSelectNode?: (node: Node | null) => void;
}

export default function KnowledgeGraphCanvas({
  nodes: initialNodes,
  links,
  searchQuery = '',
  activeCategory = null,
  selectedNode = null,
  onSelectNode
}: KnowledgeGraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!initialNodes || initialNodes.length === 0) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const initialized = initialNodes.map(node => ({
      ...node,
      x: (node.x ?? (width / 2 + (Math.random() - 0.5) * (width * 0.6))),
      y: (node.y ?? (height / 2 + (Math.random() - 0.5) * (height * 0.6))),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5
    }));

    setNodes(initialized);
  }, [initialNodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const activeId = selectedNode?.id || hoveredNode?.id;

    // Find daughter nodes set
    const connectedSet = new Set<string>();
    if (activeId) {
      connectedSet.add(activeId);
      links.forEach(l => {
        if (l.source === activeId) connectedSet.add(l.target);
        if (l.target === activeId) connectedSet.add(l.source);
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const nodeMap = new Map<string, Node>();
      nodes.forEach(n => nodeMap.set(n.id, n));

      // Draw links
      links.forEach(link => {
        const sourceNode = nodeMap.get(link.source);
        const targetNode = nodeMap.get(link.target);

        if (sourceNode && targetNode && sourceNode.x !== undefined && sourceNode.y !== undefined && targetNode.x !== undefined && targetNode.y !== undefined) {
          const isDaughterLink = activeId && (connectedSet.has(sourceNode.id) && connectedSet.has(targetNode.id));

          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          
          if (isDaughterLink) {
            ctx.strokeStyle = '#80A300';
            ctx.lineWidth = 2.5;
          } else {
            ctx.strokeStyle = activeId ? 'rgba(15, 15, 15, 0.05)' : 'rgba(15, 15, 15, 0.18)';
            ctx.lineWidth = 0.8;
          }
          ctx.stroke();
        }
      });

      // Draw nodes
      const time = performance.now() / 1000;
      const searchPulse = (Math.sin(time * 5.5) + 1) / 2;

      nodes.forEach(node => {
        if (node.x === undefined || node.y === undefined) return;

        const hasSearch = Boolean(searchQuery.trim());
        const matchesSearch = hasSearch ? node.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) : true;
        const matchesCategory = activeCategory ? node.category === activeCategory : true;
        const isDaughter = connectedSet.has(node.id);

        let opacity = 0.9;
        if (activeId) {
          opacity = isDaughter ? 1.0 : 0.12;
        } else if (hasSearch && matchesSearch) {
          opacity = 1.0;
        } else if (!matchesSearch || !matchesCategory) {
          opacity = 0.15;
        }

        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const baseRadius = isDaughter || isSelected || isHovered ? 10 : 5 + Math.min(node.connections * 0.8, 10);
        const radius = (hasSearch && matchesSearch) ? baseRadius * (1.2 + searchPulse * 0.3) : baseRadius;

        // Pulsing Lime Beacon for Search Matches
        if (hasSearch && matchesSearch && opacity > 0.5) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 8 + searchPulse * 8, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(208, 255, 20, ${0.35 + searchPulse * 0.3})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
          ctx.strokeStyle = '#0F0F0F';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        const nodeColor = node.color || (node as any).depth_color || '#0F0F0F';

        // Outer ring for active or daughter nodes
        if (isDaughter || isSelected || isHovered) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI);
          ctx.strokeStyle = '#0F0F0F';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }

        // Core Node
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        let fill = nodeColor;
        if (isSelected) {
          fill = '#D0FF14';
        } else if (isDaughter) {
          fill = '#80A300';
        } else if (hasSearch && matchesSearch) {
          fill = '#D0FF14';
        }
        ctx.fillStyle = fill;
        ctx.globalAlpha = opacity;
        ctx.fill();
        ctx.strokeStyle = '#0F0F0F';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Render Title Label for Daughter Nodes & Selected/Search Matches
        if (isDaughter || isSelected || isHovered || matchesSearch || (node.connections && node.connections > 8)) {
          ctx.font = isDaughter || isSelected ? 'bold 12px "JetBrains Mono", monospace' : '11px "JetBrains Mono", monospace';
          
          // Background text pill box for high-contrast legibility
          const textWidth = ctx.measureText(node.title).width;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(node.x + radius + 4, node.y - 10, textWidth + 8, 18);
          ctx.strokeStyle = '#0F0F0F';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(node.x + radius + 4, node.y - 10, textWidth + 8, 18);
          ctx.fillStyle = '#0F0F0F';
          ctx.fillText(node.title, node.x + radius + 8, node.y + 3);
        }

        // Slight drift movement
        node.x += node.vx || 0;
        node.y += node.vy || 0;

        if (node.x < 50 || node.x > canvas.width - 50) node.vx = -(node.vx || 0.1);
        if (node.y < 50 || node.y > canvas.height - 50) node.vy = -(node.vy || 0.1);
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [nodes, links, searchQuery, activeCategory, selectedNode, hoveredNode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const found = nodes.find(n => {
      if (n.x === undefined || n.y === undefined) return false;
      const dist = Math.hypot(n.x - mouseX, n.y - mouseY);
      return dist <= 14;
    });

    if (found) {
      setHoveredNode(found);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredNode(null);
      setTooltipPos(null);
    }
  };

  const handleClick = () => {
    if (hoveredNode) {
      if (onSelectNode) onSelectNode(hoveredNode);
    } else {
      if (onSelectNode) onSelectNode(null);
    }
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{ width: '100%', height: '100%', cursor: hoveredNode ? 'pointer' : 'default' }}
      />

      {hoveredNode && tooltipPos && (
        <div style={{
          position: 'fixed',
          left: `${tooltipPos.x + 12}px`,
          top: `${tooltipPos.y + 12}px`,
          background: '#FFFFFF',
          border: '2px solid #0F0F0F',
          padding: '8px 12px',
          borderRadius: '0px',
          pointerEvents: 'none',
          zIndex: 50,
          boxShadow: '4px 4px 0px #0F0F0F',
          fontFamily: "'JetBrains Mono', monospace"
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F0F0F' }}>
            [NODE] {hoveredNode.title} ({hoveredNode.category.toLowerCase()})
          </div>
          <div style={{ fontSize: '0.72rem', color: '#52525B', marginTop: '4px' }}>
            {hoveredNode.category} · {hoveredNode.connections} links — <span style={{ color: '#0F0F0F', background: '#D0FF14', padding: '1px 4px', fontWeight: 800, border: '1px solid #0F0F0F' }}>CLICK TO INSPECT</span>
          </div>
        </div>
      )}
    </div>
  );
}
