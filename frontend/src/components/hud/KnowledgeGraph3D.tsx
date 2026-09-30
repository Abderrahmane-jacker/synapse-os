import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Node {
  id: string;
  title: string;
  category: string;
  color: string;
  connections: number;
  content?: string;
  path?: string;
  tags?: string[];
  depth?: number;
  depth_color?: string;
  cluster?: number;
  created?: number;
  x?: number;
  y?: number;
  z?: number;
}

interface Link {
  source: string;
  target: string;
}

interface KnowledgeGraph3DProps {
  nodes: Node[];
  links: Link[];
  constellation_links?: Link[];
  searchQuery?: string;
  activeCategory?: string | null;
  activeTag?: string | null;
  activeDepth?: number | null;
  ragPathNodes?: string[];
  selectedNode?: Node | null;
  temporalMaxDate?: number | null;
  spawnSpeed?: number;
  deepDiveNode?: Node | null;
  onSelectNode?: (node: Node | null) => void;
  onDeepDiveNode?: (node: Node) => void;
}

// High-Contrast Technical Palette: 0 Off-Black, 1 Dark Lime, 2 Charcoal, 3 Slate Steel, 4 Muted Gray
const DEPTH_COLOR_MAP: Record<number, string> = {
  0: "#0F0F0F",
  1: "#80A300",
  2: "#27272A",
  3: "#52525B",
  4: "#71717A"
};

// 3D Semantic Galaxy Centers for Auto-Clustering
const GALAXY_CENTERS: Record<number, THREE.Vector3> = {
  0: new THREE.Vector3(0, 0, 0),         // Core Alpha
  1: new THREE.Vector3(-180, 100, 100),  // Beta Nebula
  2: new THREE.Vector3(180, -100, -100), // Gamma Cluster
  3: new THREE.Vector3(-100, -180, 100), // Delta Expanse
  4: new THREE.Vector3(100, 180, -100),  // Epsilon Cloud
  5: new THREE.Vector3(0, 0, 250),       // Zeta Void
};

function createBareTextSprite(text: string, colorStr: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, 256, 64);
    // Technical Label Badge with 2px border
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(8, 14, 240, 36);
    ctx.strokeStyle = '#0F0F0F';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 14, 240, 36);

    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0F0F0F';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const displayTitle = text.length > 20 ? text.substring(0, 18) + '…' : text;
    ctx.fillText(displayTitle, 128, 33);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(20, 5, 1);
  return sprite;
}

function KnowledgeGraph3DComponent({
  nodes: initialNodes,
  links,
  constellation_links = [],
  searchQuery = '',
  activeCategory = null,
  activeTag = null,
  activeDepth = null,
  ragPathNodes = [],
  selectedNode = null,
  deepDiveNode = null,
  temporalMaxDate = null,
  spawnSpeed = 1.0,
  onSelectNode,
  onDeepDiveNode
}: KnowledgeGraph3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const selectedNodeRef = useRef<Node | null>(selectedNode);
  const hoveredNodeRef = useRef<Node | null>(null);
  const searchQueryRef = useRef<string>(searchQuery);
  const activeCategoryRef = useRef<string | null>(activeCategory);
  const activeTagRef = useRef<string | null>(activeTag);
  const temporalMaxDateRef = useRef<number | null>(temporalMaxDate);
  const spawnSpeedRef = useRef<number>(spawnSpeed);
  const activeDepthRef = useRef<number | null>(activeDepth);
  const ragPathNodesRef = useRef<string[]>(ragPathNodes);
  const deepDiveNodeRef = useRef<Node | null>(deepDiveNode);
  const onSelectNodeRef = useRef<((node: Node | null) => void) | undefined>(onSelectNode);
  const onDeepDiveNodeRef = useRef<((node: Node) => void) | undefined>(onDeepDiveNode);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
    searchQueryRef.current = searchQuery;
    activeCategoryRef.current = activeCategory;
    activeTagRef.current = activeTag;
    activeDepthRef.current = activeDepth;
    ragPathNodesRef.current = ragPathNodes;
    deepDiveNodeRef.current = deepDiveNode;
    temporalMaxDateRef.current = temporalMaxDate;
    spawnSpeedRef.current = spawnSpeed;
  }, [selectedNode, searchQuery, activeCategory, activeTag, activeDepth, ragPathNodes, deepDiveNode, temporalMaxDate, spawnSpeed]);

  useEffect(() => { onSelectNodeRef.current = onSelectNode; }, [onSelectNode]);
  useEffect(() => { onDeepDiveNodeRef.current = onDeepDiveNode; }, [onDeepDiveNode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Three.js Scene Setup
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    camera.position.set(0, 50, 520);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lighting & Technical Environment
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(200, 350, 200);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xe4e4e7, 0.5);
    fillLight.position.set(-200, -250, -200);
    scene.add(fillLight);

    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 200;
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 1400;
      particlePositions[i + 1] = (Math.random() - 0.5) * 1400;
      particlePositions[i + 2] = (Math.random() - 0.5) * 1400;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x71717a, size: 1.6, transparent: true, opacity: 0.15 });
    const dustParticles = new THREE.Points(particleGeo, particleMat);
    dustParticles.frustumCulled = false;
    scene.add(dustParticles);



    // 3. Neural Network Force-Directed Simulation Engine
    interface SimNode extends Node {
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      mesh: THREE.Mesh;
      sprite: THREE.Sprite;
    }

    const simNodes: SimNode[] = [];
    const simNodeMap = new Map<string, SimNode>();
    const nodeGroup = new THREE.Group();

    // Initial position clustering based on Semantic Constellations (Galaxies)
    initialNodes.forEach((node) => {
      const clusterId = node.cluster !== undefined ? node.cluster : 0;
      const lobeCenter = GALAXY_CENTERS[clusterId] || new THREE.Vector3(0, 0, 0);

      const px = lobeCenter.x + (Math.random() - 0.5) * 150;
      const py = lobeCenter.y + (Math.random() - 0.5) * 150;
      const pz = lobeCenter.z + (Math.random() - 0.5) * 150;

      const pos = new THREE.Vector3(px, py, pz);
      const vel = new THREE.Vector3(0, 0, 0);

      const connectionsCount = typeof node.connections === 'number' && !isNaN(node.connections) ? node.connections : 0;
      const baseSize = Math.max(3.5, Math.min(13, 3.5 + connectionsCount * 0.42));
      // Perfectly Smooth Solid Sphere
      const geometry = new THREE.SphereGeometry(baseSize, 32, 32);

      const depthVal = node.depth !== undefined ? node.depth : (node.connections > 15 ? 0 : node.connections > 5 ? 1 : 2);
      const hexStr = node.depth_color || node.color || DEPTH_COLOR_MAP[Math.min(depthVal, 4)] || "#0F0F0F";
      const colorHex = parseInt(hexStr.replace('#', '0x'));

      // Solid Technical Colored Sphere (Matte, high-contrast)
      const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.55,
        metalness: 0.12,
        emissive: 0x000000,
        emissiveIntensity: 0.0
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(pos);

      const labelSprite = createBareTextSprite(node.title, hexStr);
      labelSprite.position.set(0, baseSize + 6, 0);
      labelSprite.visible = false;
      mesh.add(labelSprite);

      mesh.userData = { nodeData: node, sprite: labelSprite };

      nodeGroup.add(mesh);

      const sNode: SimNode = { ...node, pos, vel, mesh, sprite: labelSprite };
      simNodes.push(sNode);
      simNodeMap.set(node.id, sNode);
    });

    scene.add(nodeGroup);

    // 4. Force Physics Warmup Simulation (Calculates Organic Neural Network Lobes)
    const runPhysicsStep = () => {
      // A. Repulsion Force between nodes (Coulomb Law)
      for (let i = 0; i < simNodes.length; i++) {
        const nA = simNodes[i];
        if (temporalMaxDateRef.current && nA.created && nA.created > temporalMaxDateRef.current) continue;

        for (let j = i + 1; j < simNodes.length; j++) {
          const nB = simNodes[j];
          if (temporalMaxDateRef.current && nB.created && nB.created > temporalMaxDateRef.current) continue;

          const delta = new THREE.Vector3().subVectors(nA.pos, nB.pos);
          let dist = delta.length();
          if (dist < 0.001) { delta.set(Math.random() + 0.1, Math.random() + 0.1, Math.random() + 0.1).normalize(); dist = 1; }

          if (dist < 180) {
            const force = (180 - dist) * 0.08 / dist;
            delta.multiplyScalar(force);
            nA.vel.add(delta);
            nB.vel.sub(delta);
          }
        }
      }

      // B. Spring Attraction along Links (Hooke Law)
      links.forEach((l) => {
        const nA = simNodeMap.get(l.source);
        const nB = simNodeMap.get(l.target);
        if (nA && nB) {
          if (temporalMaxDateRef.current) {
             if (nA.created && nA.created > temporalMaxDateRef.current) return;
             if (nB.created && nB.created > temporalMaxDateRef.current) return;
          }
          const delta = new THREE.Vector3().subVectors(nB.pos, nA.pos);
          const dist = delta.length();
          if (dist > 0.0001) {
            const restLength = 45;
            const force = (dist - restLength) * 0.02;
            delta.normalize().multiplyScalar(force);
            nA.vel.add(delta);
            nB.vel.sub(delta);
          }
        }
      });

      // C. Semantic Galaxy Attraction Force
      simNodes.forEach((n) => {
        if (temporalMaxDateRef.current && n.created && n.created > temporalMaxDateRef.current) return;
        const clusterId = n.cluster !== undefined ? n.cluster : 0;
        const targetCenter = GALAXY_CENTERS[clusterId] || new THREE.Vector3(0, 0, 0);
        const delta = new THREE.Vector3().subVectors(targetCenter, n.pos);
        n.vel.add(delta.multiplyScalar(0.005));

        // Damping / Friction
        n.vel.multiplyScalar(0.72);
        if (isNaN(n.vel.x) || isNaN(n.vel.y) || isNaN(n.vel.z)) n.vel.set(0, 0, 0);
        n.pos.add(n.vel);
        if (isNaN(n.pos.x) || isNaN(n.pos.y) || isNaN(n.pos.z)) n.pos.set(0, 0, 0);
        n.mesh.position.copy(n.pos);
      });
    };    // 5. Build 3D Link Lines with per-vertex colors for glow & signal pulse
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(links.length * 6);
    const lineColors = new Float32Array(links.length * 6); // RGB per vertex (2 verts per segment)
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    const lineMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1.0 });
    const linesMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    linesMesh.frustumCulled = false;
    scene.add(linesMesh);

    // Glow overlay: additive blending layer for active links
    const glowGeometry = new THREE.BufferGeometry();
    const glowPositions = new Float32Array(links.length * 6);
    const glowColors = new Float32Array(links.length * 6);
    glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
    glowGeometry.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));
    const glowMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glowMesh = new THREE.LineSegments(glowGeometry, glowMaterial);
    glowMesh.frustumCulled = false;
    scene.add(glowMesh);

    // Constellation lines (faint connections between hubs)
    const constelGeometry = new THREE.BufferGeometry();
    const constelPositions = new Float32Array(constellation_links.length * 6);
    constelGeometry.setAttribute('position', new THREE.BufferAttribute(constelPositions, 3));
    const constelMaterial = new THREE.LineBasicMaterial({
      color: 0x80a300, // Dark Lime Accent
      transparent: true,
      opacity: 0.2,
      blending: THREE.NormalBlending
    });
    const constelMesh = new THREE.LineSegments(constelGeometry, constelMaterial);
    constelMesh.frustumCulled = false;
    scene.add(constelMesh);

    // Signal dots traveling along links
    const signalGeo = new THREE.BufferGeometry();
    const signalPositions = new Float32Array(links.length * 3);
    const signalColors = new Float32Array(links.length * 3);
    const signalProgress = new Float32Array(links.length); // 0.0 to 1.0
    const signalSpeed = new Float32Array(links.length);

    for (let i = 0; i < links.length; i++) {
      signalProgress[i] = Math.random();
      signalSpeed[i] = 0.002 + Math.random() * 0.004; // Base speed + variance
    }

    signalGeo.setAttribute('position', new THREE.BufferAttribute(signalPositions, 3));
    signalGeo.setAttribute('color', new THREE.BufferAttribute(signalColors, 3));
    
    // Create a crisp high-contrast technical pulse dot texture
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 64; dotCanvas.height = 64;
    const dotCtx = dotCanvas.getContext('2d');
    if (dotCtx) {
      const grad = dotCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(15, 15, 15, 1)');
      grad.addColorStop(0.3, 'rgba(208, 255, 20, 0.95)'); // High-impact Neon Lime
      grad.addColorStop(0.65, 'rgba(128, 163, 0, 0.4)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      dotCtx.fillStyle = grad;
      dotCtx.fillRect(0, 0, 64, 64);
    }
    const dotTexture = new THREE.CanvasTexture(dotCanvas);

    const signalMat = new THREE.PointsMaterial({
      size: 14.0, // Size of the signal pulse dots
      map: dotTexture,
      transparent: true,
      opacity: 0.95,
      vertexColors: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
    const signalMesh = new THREE.Points(signalGeo, signalMat);
    signalMesh.frustumCulled = false;
    scene.add(signalMesh);

    // RAG Neural Pathway Laser
    const ragLaserGeo = new THREE.BufferGeometry();
    const maxRagPoints = 50;
    const ragLaserPositions = new Float32Array(maxRagPoints * 3);
    ragLaserGeo.setAttribute('position', new THREE.BufferAttribute(ragLaserPositions, 3));
    const ragLaserMat = new THREE.LineBasicMaterial({
      color: 0xd0ff14, // High-Impact Neon Lime
      transparent: true,
      opacity: 0,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
    const ragLaserLine = new THREE.Line(ragLaserGeo, ragLaserMat);
    ragLaserLine.frustumCulled = false;
    scene.add(ragLaserLine);
    
    let currentRagNodes: string[] = [];
    let ragStartTime = 0;

    const updateLinkGeometry = () => {
      const positions = linesMesh.geometry.attributes.position.array as Float32Array;
      const gPositions = glowMesh.geometry.attributes.position.array as Float32Array;
      const cPositions = constelMesh.geometry.attributes.position.array as Float32Array;

      // Environment Dissolve for Links during deep dive
      if (deepDiveNodeRef.current) {
        (linesMesh.material as THREE.Material).opacity = 0.02;
        (glowMesh.material as THREE.Material).opacity = 0.0;
        signalMesh.material.opacity = 0.0;
        (constelMesh.material as THREE.Material).opacity = 0.0;
      } else {
        (linesMesh.material as THREE.Material).opacity = 1.0;
        (glowMesh.material as THREE.Material).opacity = 0.65;
        signalMesh.material.opacity = 0.9;
        (constelMesh.material as THREE.Material).opacity = 0.15;
      }

      let ptr = 0;
      links.forEach((l) => {
        const nA = simNodeMap.get(l.source);
        const nB = simNodeMap.get(l.target);
        if (nA && nB) {
          let isFuture = false;
          if (temporalMaxDateRef.current) {
            if ((nA.created && nA.created > temporalMaxDateRef.current) || (nB.created && nB.created > temporalMaxDateRef.current)) {
              isFuture = true;
            }
          }
          
          if (isFuture) {
            // Collapse the line to zero vector (0,0,0) so WebGL renders 0 length without NaN error
            positions[ptr] = 0; positions[ptr+1] = 0; positions[ptr+2] = 0;
            positions[ptr+3] = 0; positions[ptr+4] = 0; positions[ptr+5] = 0;
            gPositions[ptr] = 0; gPositions[ptr+1] = 0; gPositions[ptr+2] = 0;
            gPositions[ptr+3] = 0; gPositions[ptr+4] = 0; gPositions[ptr+5] = 0;
          } else {
            positions[ptr] = nA.pos.x; positions[ptr+1] = nA.pos.y; positions[ptr+2] = nA.pos.z;
            positions[ptr+3] = nB.pos.x; positions[ptr+4] = nB.pos.y; positions[ptr+5] = nB.pos.z;
            gPositions[ptr] = nA.pos.x; gPositions[ptr+1] = nA.pos.y; gPositions[ptr+2] = nA.pos.z;
            gPositions[ptr+3] = nB.pos.x; gPositions[ptr+4] = nB.pos.y; gPositions[ptr+5] = nB.pos.z;
          }
          ptr += 6;
        }
      });

      let cPtr = 0;
      constellation_links.forEach((l) => {
        const nA = simNodeMap.get(l.source);
        const nB = simNodeMap.get(l.target);
        if (nA && nB) {
          let isFuture = false;
          if (temporalMaxDateRef.current) {
            if ((nA.created && nA.created > temporalMaxDateRef.current) || (nB.created && nB.created > temporalMaxDateRef.current)) {
              isFuture = true;
            }
          }

          if (isFuture) {
            cPositions[cPtr] = 0; cPositions[cPtr+1] = 0; cPositions[cPtr+2] = 0;
            cPositions[cPtr+3] = 0; cPositions[cPtr+4] = 0; cPositions[cPtr+5] = 0;
          } else {
            cPositions[cPtr] = nA.pos.x; cPositions[cPtr+1] = nA.pos.y; cPositions[cPtr+2] = nA.pos.z;
            cPositions[cPtr+3] = nB.pos.x; cPositions[cPtr+4] = nB.pos.y; cPositions[cPtr+5] = nB.pos.z;
          }
          cPtr += 6;
        }
      });

      linesMesh.geometry.attributes.position.needsUpdate = true;
      glowMesh.geometry.attributes.position.needsUpdate = true;
      constelMesh.geometry.attributes.position.needsUpdate = true;
    };

    // Pre-simulate 60 physics steps for instantaneous settled neural network layout
    for (let s = 0; s < 60; s++) {
      runPhysicsStep();
    }
    updateLinkGeometry();

    // Caching state to avoid unnecessary WebGL material mutations
    let lastActiveKey = "";

    // Helper to fetch live user settings
    const getSavedSettings = () => {
      try {
        const raw = localStorage.getItem('nexus_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            nodeGlow: Number(parsed.graphNodeGlow ?? 5.0),
            rotationSpeed: Number(parsed.graphRotationSpeed ?? 0.5),
            signalSpeed: Number(parsed.graphSignalSpeed ?? 2.0),
            defaultZoom: Number(parsed.graphDefaultZoom ?? 950)
          };
        }
      } catch {}
      return { nodeGlow: 5.0, rotationSpeed: 0.5, signalSpeed: 2.0, defaultZoom: 950 };
    };

    const userSettings = getSavedSettings();

    // --- Per-link color update: glow connected, dim others, animate signal pulse ---
    // --- Per-link color update: Synapse Tactical Titanium & Gold ---
    const BASE_R = 0.44, BASE_G = 0.44, BASE_B = 0.48;   // #71717A brushed steel
    const GLOW_R = 0.816, GLOW_G = 1.0, GLOW_B = 0.078;  // #D0FF14 neon lime
    const DIM_R = 0.82, DIM_G = 0.82, DIM_B = 0.84;      // #D4D4D8 subtle wire
    const SIGNAL_R = 0.06, SIGNAL_G = 0.06, SIGNAL_B = 0.06; // off-black signal pulse

    const updateLinkColors = (time: number) => {
      const colors = linesMesh.geometry.attributes.color.array as Float32Array;
      const gColors = glowMesh.geometry.attributes.color.array as Float32Array;
      const activeId = selectedNodeRef.current?.id || hoveredNodeRef.current?.id;

      const connectedSet = new Set<string>();
      if (activeId) {
        connectedSet.add(activeId);
        links.forEach(l => {
          if (l.source === activeId) connectedSet.add(l.target);
          if (l.target === activeId) connectedSet.add(l.source);
        });
      }

      let ci = 0;
      links.forEach((l, idx) => {
        const isActive = activeId && (connectedSet.has(l.source) && connectedSet.has(l.target));

        if (isActive) {
          // Animated signal pulse: a bright white flash traveling along the link using user signalSpeed
          const phase = (time * userSettings.signalSpeed + idx * 0.73) % (Math.PI * 2);
          const pulse = Math.max(0, Math.sin(phase));
          const pr = GLOW_R + (SIGNAL_R - GLOW_R) * pulse * 0.7;
          const pg = GLOW_G + (SIGNAL_G - GLOW_G) * pulse * 0.7;
          const pb = GLOW_B + (SIGNAL_B - GLOW_B) * pulse * 0.5;

          // Source vertex gets the pulse, target vertex gets steady glow (directional signal feel)
          colors[ci]   = pr;  colors[ci+1] = pg;  colors[ci+2] = pb;
          colors[ci+3] = GLOW_R; colors[ci+4] = GLOW_G; colors[ci+5] = GLOW_B;

          // Glow overlay: steady bright electric cyan
          gColors[ci]   = GLOW_R * (1 + pulse * 0.5);
          gColors[ci+1] = GLOW_G * (1 + pulse * 0.3);
          gColors[ci+2] = GLOW_B * (1 + pulse * 0.3);
          gColors[ci+3] = GLOW_R; gColors[ci+4] = GLOW_G; gColors[ci+5] = GLOW_B;
        } else if (activeId) {
          // Unconnected links: dim navy
          colors[ci] = DIM_R; colors[ci+1] = DIM_G; colors[ci+2] = DIM_B;
          colors[ci+3] = DIM_R; colors[ci+4] = DIM_G; colors[ci+5] = DIM_B;
          gColors[ci] = 0; gColors[ci+1] = 0; gColors[ci+2] = 0;
          gColors[ci+3] = 0; gColors[ci+4] = 0; gColors[ci+5] = 0;
        } else {
          // Default: subtle base cyan
          colors[ci] = BASE_R; colors[ci+1] = BASE_G; colors[ci+2] = BASE_B;
          colors[ci+3] = BASE_R; colors[ci+4] = BASE_G; colors[ci+5] = BASE_B;
          gColors[ci] = 0; gColors[ci+1] = 0; gColors[ci+2] = 0;
          gColors[ci+3] = 0; gColors[ci+4] = 0; gColors[ci+5] = 0;
        }
        ci += 6;
      });

      linesMesh.geometry.attributes.color.needsUpdate = true;
      glowMesh.geometry.attributes.color.needsUpdate = true;

      // Adjust base line opacity based on selection state
      lineMaterial.opacity = activeId ? 0.85 : 0.25;
      glowMaterial.opacity = activeId ? 0.6 : 0.0;
    };

    const updateSignalParticles = () => {
      const positions = signalMesh.geometry.attributes.position.array as Float32Array;
      const colors = signalMesh.geometry.attributes.color.array as Float32Array;
      const activeId = selectedNodeRef.current?.id || hoveredNodeRef.current?.id;

      const connectedSet = new Set<string>();
      if (activeId) {
        connectedSet.add(activeId);
        links.forEach(l => {
          if (l.source === activeId) connectedSet.add(l.target);
          if (l.target === activeId) connectedSet.add(l.source);
        });
      }

      for (let i = 0; i < links.length; i++) {
        const l = links[i];
        const nA = simNodeMap.get(l.source);
        const nB = simNodeMap.get(l.target);
        if (!nA || !nB) continue;

        let isFuture = false;
        if (temporalMaxDateRef.current) {
          if ((nA.created && nA.created > temporalMaxDateRef.current) || (nB.created && nB.created > temporalMaxDateRef.current)) {
            isFuture = true;
          }
        }

        if (isFuture) {
          positions[i * 3] = 0;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = 0;
          colors[i * 3] = 0;
          colors[i * 3 + 1] = 0;
          colors[i * 3 + 2] = 0;
          continue;
        }

        // Update dot progress
        signalProgress[i] += signalSpeed[i] * userSettings.signalSpeed;
        if (signalProgress[i] > 1.0) signalProgress[i] -= 1.0;

        const p = signalProgress[i];
        const px = nA.pos.x + (nB.pos.x - nA.pos.x) * p;
        const py = nA.pos.y + (nB.pos.y - nA.pos.y) * p;
        const pz = nA.pos.z + (nB.pos.z - nA.pos.z) * p;

        positions[i * 3] = px;
        positions[i * 3 + 1] = py;
        positions[i * 3 + 2] = pz;

        // Color based on active state (only show dots on active links, or very faint elsewhere)
        const isActive = activeId && (connectedSet.has(l.source) && connectedSet.has(l.target));
        if (isActive) {
          colors[i * 3] = 0.816;     // Neon Lime R
          colors[i * 3 + 1] = 1.0;   // G
          colors[i * 3 + 2] = 0.078; // B
        } else if (activeId) {
          // Dim dots when a node is focused but this link isn't part of it
          colors[i * 3] = 0.0;
          colors[i * 3 + 1] = 0.0;
          colors[i * 3 + 2] = 0.0;
        } else {
          // Subtle slate dots on all links
          colors[i * 3] = 0.44;
          colors[i * 3 + 1] = 0.44;
          colors[i * 3 + 2] = 0.48;
        }
      }
      signalMesh.geometry.attributes.position.needsUpdate = true;
      signalMesh.geometry.attributes.color.needsUpdate = true;
    };

    // Node Spawning State
    const nodeRevealProgress = new Map<string, number>();

    let lastSpawnEmit = 0;

    const updateNodeVisibilities = (elapsed: number = 0) => {
      const activeId = selectedNodeRef.current?.id || hoveredNodeRef.current?.id;
      const currentKey = `${activeId || ''}-${activeCategoryRef.current || ''}-${activeTagRef.current || ''}-${activeDepthRef.current !== null ? activeDepthRef.current : ''}-${searchQueryRef.current || ''}-${deepDiveNodeRef.current?.id || ''}-${temporalMaxDateRef.current || ''}`;

      const hasSearchFilter = Boolean(searchQueryRef.current);
      const hasRagNodes = ragPathNodesRef.current.length > 0;

      // Skip static cache check if search is active (search nodes pulse every frame)
      if (!hasSearchFilter && !hasRagNodes && currentKey === lastActiveKey) return;
      lastActiveKey = currentKey;

      const connectedSet = new Set<string>();
      if (activeId) {
        connectedSet.add(activeId);
        links.forEach(l => {
          if (l.source === activeId) connectedSet.add(l.target);
          if (l.target === activeId) connectedSet.add(l.source);
        });
      }

      const hasCategoryFilter = Boolean(activeCategoryRef.current);
      const hasTagFilter = Boolean(activeTagRef.current);
      const hasDepthFilter = activeDepthRef.current !== null;

      const pulse = (Math.sin(elapsed * 5.5) + 1.0) / 2.0;



      nodeGroup.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        const n = mesh.userData.nodeData as Node;
        if (!n) return;
        const sprite = mesh.userData.sprite as THREE.Sprite;

        const mat = mesh.material as THREE.MeshStandardMaterial;

        // Temporal Hide & Spawn Logic
        const isLogicallyVisible = !(temporalMaxDateRef.current && n.created && n.created > temporalMaxDateRef.current);
        let progress = nodeRevealProgress.get(n.id) ?? (isLogicallyVisible ? 1.0 : 0.0);

        if (isLogicallyVisible) {
           if (progress === 0.0) {
              progress = 0.01; // Kickstart the fade-in immediately
           }
        } else {
           progress = 0.0;
           nodeRevealProgress.set(n.id, 0.0);
        }

        if (progress > 0 && progress < 1) {
           progress += 0.075 * spawnSpeedRef.current; // scales up in ~13 frames (200ms) at 1x
           if (progress >= 1) progress = 1.0;
           nodeRevealProgress.set(n.id, progress);
        }

        if (progress === 0.0) {
           mat.opacity = 0.0;
           mat.transparent = true;
           mesh.scale.set(0, 0, 0);
           if (sprite) sprite.visible = false;
           return; 
        }

        const query = (searchQueryRef.current || '').toLowerCase().trim();
        const matchesSearch = hasSearchFilter
          ? (n.title.toLowerCase().includes(query) ||
             (n.tags && n.tags.some(t => t.toLowerCase().includes(query))) ||
             (n.content && n.content.toLowerCase().includes(query)))
          : true;

        const matchesCategory = hasCategoryFilter ? n.category === activeCategoryRef.current : true;
        const matchesTag = hasTagFilter ? (n.tags && n.tags.some(t => t.toLowerCase() === activeTagRef.current?.toLowerCase())) : true;
        
        const nodeDepth = n.depth !== undefined ? n.depth : (n.connections > 15 ? 0 : n.connections > 5 ? 1 : 2);
        const matchesDepth = hasDepthFilter ? nodeDepth === activeDepthRef.current : true;

        // Environment Dissolve during deep dive
        if (deepDiveNodeRef.current) {
          if (n.id === deepDiveNodeRef.current.id) {
             mat.opacity = 0.5;
             mat.transparent = true;
             mat.emissiveIntensity = 0.2; // Dim the background sphere!
             mesh.scale.set(3.0, 3.0, 3.0);
             if (sprite) sprite.visible = false;
          } else {
             mat.opacity = 0.02; // Ghosted
             mat.transparent = true;
             mat.emissiveIntensity = 0.0;
             if (sprite) sprite.visible = false;
          }
          return;
        }

        const isDaughter = connectedSet.has(n.id);

        const anyFilterActive = hasSearchFilter || hasCategoryFilter || hasTagFilter || hasDepthFilter;
        const matchesAllFilters = matchesSearch && matchesCategory && matchesTag && matchesDepth;

        if (isDaughter || matchesAllFilters || (!anyFilterActive && n.connections > 10)) {
          if (sprite) {
            sprite.visible = true;
            (sprite.material as THREE.SpriteMaterial).opacity = isDaughter || (hasSearchFilter && matchesSearch) || matchesTag ? 1.0 : 0.6;
            if (activeId && isDaughter) {
              sprite.scale.set(n.id === activeId ? 70 : 50, n.id === activeId ? 17.5 : 12.5, 1);
            } else if (hasSearchFilter && matchesSearch) {
              const spScaleW = 46 + pulse * 14;
              const spScaleH = 11.5 + pulse * 3.5;
              sprite.scale.set(spScaleW, spScaleH, 1);
            } else {
              sprite.scale.set(40, 10, 1);
            }
          }
        } else {
          if (sprite) sprite.visible = false;
        }

        const depthVal = n.depth !== undefined ? n.depth : (n.connections > 15 ? 0 : n.connections > 5 ? 1 : 2);
        const nodeColorHex = n.depth_color || n.color || DEPTH_COLOR_MAP[Math.min(depthVal, 4)] || '#0F0F0F';

        if (activeId) {
          if (isDaughter) {
            mat.opacity = 1.0;
            mat.transparent = false;
            // Selected node: High-Impact Neon Lime
            if (n.id === activeId) {
              mat.color.set(0xd0ff14);
              mat.emissive.set(0xd0ff14);
              mat.emissiveIntensity = 0.8;
              mesh.scale.set(1.5, 1.5, 1.5);
            } else {
              // Daughter nodes: Dark Technical Lime
              mat.color.set(0x80a300);
              mat.emissive.set(0x80a300);
              mat.emissiveIntensity = 0.35;
              mesh.scale.set(1.3, 1.3, 1.3);
            }
          } else {
            mat.color.set(nodeColorHex);
            mat.opacity = 0.12;
            mat.transparent = true;
            mat.emissive.set(0x000000);
            mat.emissiveIntensity = 0.0;
            mesh.scale.set(0.65, 0.65, 0.65);
          }
        } else if (hasSearchFilter && matchesSearch) {
          // Dynamic Neon Lime Breathing Pulse for Search Matching Nodes
          mat.opacity = 1.0;
          mat.transparent = false;
          mat.color.set(0xd0ff14);
          mat.emissive.set(0xd0ff14);
          mat.emissiveIntensity = 0.7 * (1.0 + pulse * 0.4);
          const pScale = 1.4 + pulse * 0.35;
          mesh.scale.set(pScale, pScale, pScale);
        } else if (anyFilterActive) {
          if (!matchesAllFilters) {
            mat.color.set(nodeColorHex);
            mat.opacity = 0.10;
            mat.transparent = true;
            mat.emissive.set(0x000000);
            mat.emissiveIntensity = 0.0;
            mesh.scale.set(0.6, 0.6, 0.6);
          } else {
            mat.opacity = 1.0;
            mat.transparent = false;
            mat.color.set(nodeColorHex);
            mat.emissive.set(0x000000);
            mat.emissiveIntensity = 0.0;
            mesh.scale.set(1.4, 1.4, 1.4);
          }
        } else {
          // Default unselected state: solid, dark, crisp matte node
          mat.opacity = 1.0;
          mat.transparent = false;
          mat.color.set(nodeColorHex);
          mat.emissive.set(0x000000);
          mat.emissiveIntensity = 0.0;
          mesh.scale.set(1.0, 1.0, 1.0);
        }

        // Override: if this node is in the active RAG sequence
        if (ragPathNodesRef.current.includes(n.id)) {
          mat.opacity = 1.0;
          mat.transparent = false;
          mat.color.set(0xd0ff14); // Pure Neon Lime
          mat.emissive.set(0xd0ff14);
          mat.emissiveIntensity = 1.2;
          mesh.scale.set(1.8, 1.8, 1.8);
          if (sprite) {
             sprite.visible = true;
             (sprite.material as THREE.SpriteMaterial).opacity = 1.0;
          }
        }

        // Apply Spawning Stagger Animation Scale
        if (progress < 1.0) {
           mesh.scale.multiplyScalar(progress);
           mat.opacity *= progress;
           if (sprite) {
              sprite.scale.multiplyScalar(progress);
              (sprite.material as THREE.SpriteMaterial).opacity *= progress;
           }
        }

      });
    };

    updateNodeVisibilities();

    // Pointer state variables
    let isMouseDown = false;
    let previousMousePosition = { x: 0, y: 0 };
    let isDragging = false;

    // 7. Ultra-Smooth 60 FPS Animation with Smooth Camera Fly-To, Stable Brain Lock & Signal Pulse
    let animId: number;
    const targetCamPos = new THREE.Vector3(0, 0, userSettings.defaultZoom);
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    const startTime = performance.now();
    let lastSelectionKey = "";
    let cameraLerpFrames = 0; // counts down from N to 0, lerp only while > 0

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const elapsed = (performance.now() - startTime) / 1000;
      const activeId = selectedNodeRef.current?.id || hoveredNodeRef.current?.id;
      const hasSelection = Boolean(activeId || activeCategoryRef.current || activeTagRef.current || searchQueryRef.current);

      // Pause auto-rotation when a node/hub/filter is active so brain stays 100% stable & still!
      if (!isMouseDown && !hasSelection) {
        const rotDelta = 0.001 * userSettings.rotationSpeed;
        nodeGroup.rotation.y += rotDelta;
        linesMesh.rotation.y += rotDelta;
      }
      // Keep glow, signal, and rag laser meshes synced with lines mesh rotation
      glowMesh.rotation.copy(linesMesh.rotation);
      signalMesh.rotation.copy(linesMesh.rotation);
      ragLaserLine.rotation.copy(linesMesh.rotation);

      // 8. RAG Laser Animation
      if (ragPathNodesRef.current.join(',') !== currentRagNodes.join(',')) {
        currentRagNodes = [...ragPathNodesRef.current];
        if (currentRagNodes.length > 0) {
          ragStartTime = performance.now();
          ragLaserMat.opacity = 1.0;
        } else {
          ragLaserMat.opacity = 0;
        }
      }

      if (currentRagNodes.length > 0) {
        const ragElapsed = (performance.now() - ragStartTime) / 1000;
        // Animation length: 3.5 seconds total
        if (ragElapsed < 3.5) {
          const pts: THREE.Vector3[] = [new THREE.Vector3(0,0,0)]; // start at center
          currentRagNodes.forEach(id => {
             const node = simNodeMap.get(id);
             if (node) pts.push(node.pos.clone());
          });
          const count = Math.min(pts.length, maxRagPoints);
          for (let i = 0; i < count; i++) {
             ragLaserPositions[i*3] = pts[i].x;
             ragLaserPositions[i*3+1] = pts[i].y;
             ragLaserPositions[i*3+2] = pts[i].z;
          }
          
          // Lightning fast discrete segment reveal
          const revealProgress = Math.min(1.0, ragElapsed / 0.5); // reveal in 0.5s
          const drawCount = Math.max(0, Math.floor(revealProgress * count));
          ragLaserGeo.setDrawRange(0, drawCount);
          ragLaserGeo.attributes.position.needsUpdate = true;
          
          // Pulse opacity
          if (ragElapsed > 2.0) {
            ragLaserMat.opacity = Math.max(0, 1.0 - (ragElapsed - 2.0) / 1.5);
          } else {
            // Intense energy flicker effect
            ragLaserMat.opacity = 0.5 + Math.random() * 0.5;
          }
        } else {
          ragLaserMat.opacity = 0;
        }
      }

      // Detect selection change -> trigger camera fly-to (120 frames ~2s of lerp)
      const selKey = `${selectedNodeRef.current?.id || ''}-${activeCategoryRef.current || ''}-${deepDiveNodeRef.current?.id || ''}`;
      if (selKey !== lastSelectionKey) {
        lastSelectionKey = selKey;
        cameraLerpFrames = 120;

        if (deepDiveNodeRef.current) {
          const sn = deepDiveNodeRef.current;
          const sPos = simNodeMap.get(sn.id)?.pos || new THREE.Vector3(sn.x || 0, sn.y || 0, sn.z || 0);
          targetCamPos.set(sPos.x, sPos.y, sPos.z + 20); // Extreme zoom for Deep Dive
          targetLookAt.set(sPos.x, sPos.y, sPos.z);
        } else if (selectedNodeRef.current) {
          const sn = selectedNodeRef.current;
          const sPos = simNodeMap.get(sn.id)?.pos || new THREE.Vector3(sn.x || 0, sn.y || 0, sn.z || 0);
          targetCamPos.set(sPos.x * 0.35, sPos.y * 0.35, sPos.z + 750);
          targetLookAt.set(sPos.x * 0.35, sPos.y * 0.35, sPos.z);
        } else if (activeCategoryRef.current) {
          targetCamPos.set(0, 0, userSettings.defaultZoom + 100);
          targetLookAt.set(0, 0, 0);
        } else {
          targetCamPos.set(0, 0, userSettings.defaultZoom);
          targetLookAt.set(0, 0, 0);
        }
      }

      // Only lerp camera while fly-to is active, then stop so manual zoom/scroll works freely
      if (cameraLerpFrames > 0) {
        camera.position.lerp(targetCamPos, 0.07);
        camera.lookAt(targetLookAt);
        cameraLerpFrames--;
      }

      // Animate link geometries & colors every frame
      updateLinkGeometry();
      updateLinkColors(elapsed);
      updateSignalParticles();
      updateNodeVisibilities(elapsed);



      // Render
      renderer.render(scene, camera);
    };

    animate();

    // 6. Raycast & Pointer Handlers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tooltipEl = tooltipRef.current;

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isMouseDown) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          isDragging = true;
        }

        nodeGroup.rotation.y += deltaX * 0.005;
        nodeGroup.rotation.x += deltaY * 0.005;
        linesMesh.rotation.y += deltaX * 0.005;
        linesMesh.rotation.x += deltaY * 0.005;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeGroup.children);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const data = hit?.userData?.nodeData as Node | undefined;

        if (data) {
          hoveredNodeRef.current = data;
          renderer.domElement.style.cursor = 'pointer';

          if (tooltipEl) {
            const depthVal = data.depth !== undefined ? data.depth : 0;
            const tagStr = data.tags && data.tags.length > 0 ? ` · #${data.tags.slice(0, 2).join(' #')}` : '';

            tooltipEl.style.display = 'block';
            tooltipEl.style.left = `${e.clientX + 14}px`;
            tooltipEl.style.top = `${e.clientY + 14}px`;
            tooltipEl.innerHTML = `
              <div style="font-size: 0.82rem; font-weight: 800; color: #0F0F0F; font-family: 'JetBrains Mono', monospace;">[NODE] ${data.title}</div>
              <div style="font-size: 0.72rem; color: #52525B; margin-top: 4px; font-family: 'JetBrains Mono', monospace;">
                <span style="color: #0F0F0F; background: #D0FF14; padding: 1px 4px; font-weight: 800; border: 1px solid #0F0F0F;">Depth ${depthVal}</span> · Category: ${data.category} · ${data.connections} links${tagStr}
              </div>
            `;
          }
        } else {
          hoveredNodeRef.current = null;
          renderer.domElement.style.cursor = 'default';
          if (tooltipEl) tooltipEl.style.display = 'none';
        }
      } else {
        hoveredNodeRef.current = null;
        renderer.domElement.style.cursor = 'default';
        if (tooltipEl) tooltipEl.style.display = 'none';
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      isDragging = false;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    let lastClickTime = 0;
    let clickTimeout: NodeJS.Timeout | null = null;
    const onMouseUp = () => {
      if (!isDragging) {
        if (hoveredNodeRef.current) {
          const now = performance.now();
          const node = hoveredNodeRef.current;

          if (now - lastClickTime < 300) {
            // Double click detected! Cancel single click timeout and trigger Deep Dive.
            if (clickTimeout) {
              clearTimeout(clickTimeout);
              clickTimeout = null;
            }
            if (onDeepDiveNodeRef.current) {
              onDeepDiveNodeRef.current(node);
            }
          } else {
            // Single click detected - update selection immediately!
            selectedNodeRef.current = node;
            if (onSelectNodeRef.current) {
              onSelectNodeRef.current(node);
            }
          }
          lastClickTime = now;
        } else {
          // Clicked on empty background - clear selection
          selectedNodeRef.current = null;
          if (onSelectNodeRef.current) {
            onSelectNodeRef.current(null);
          }
        }
      }
      isMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      camera.position.z += e.deltaY * 0.35;
      camera.position.z = Math.max(100, Math.min(1100, camera.position.z));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousemove', onPointerMove);
    dom.addEventListener('mousedown', onMouseDown);
    dom.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel);

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousemove', onPointerMove);
      dom.removeEventListener('mousedown', onMouseDown);
      dom.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
    };
  }, [initialNodes, links]);

  return (
    <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}>
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          display: 'none',
          background: '#FFFFFF',
          border: '2px solid #0F0F0F',
          padding: '8px 12px',
          borderRadius: '0px',
          pointerEvents: 'none',
          zIndex: 60,
          boxShadow: '4px 4px 0px #0F0F0F'
        }}
      />
    </div>
  );
}

export default React.memo(KnowledgeGraph3DComponent);
