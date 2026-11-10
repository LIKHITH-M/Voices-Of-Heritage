/**
 * DEPKGGraph3D.tsx — Voices of Heritage
 * Ultra-Clean 3D Heritage Knowledge System (Fully Mobile Responsive)
 * 
 * Features:
 *  1. 100% Mobile Responsive:
 *     - Dynamic viewport awareness with mobile-optimized camera radius.
 *     - Smooth 1-finger touch rotation & 2-finger pinch-to-zoom on mobile devices.
 *     - Non-overlapping flex header bar for mode switches and fullscreen triggers.
 *     - Mobile bottom-sheet detail card that never covers graph or controls.
 *     - Mobile vertically stacked legend cards (1 column on mobile, 3 columns on desktop).
 *     - Horizontal scrollable filter pills with touch inertia.
 *  2. Dual Visual Modes:
 *     - 🪐 3D Solar Network: Concentric orbital network of Visited Sites -> Dynasties -> Passions.
 *     - 🏔️ 3D Surface Plot: Topographic 3D elevation response surface (Pic 2)
 *       with bounding box grid, axes A & B, rainbow elevation colormap, and wireframe lattice.
 *  3. High-Performance Large View Modal (Popup Screen):
 *     - Seamlessly morphs into high-res modal for large context viewing on any screen.
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';

type ViewMode = 'solar' | 'surface';

interface GraphNode {
  id: string;
  name: string;
  category: 'core' | 'site' | 'dynasty' | 'passion';
  categoryLabel: string;
  emoji: string;
  color: string;
  rating?: number;
  affinity?: number;
  ring: number;
  angle: number;
  elevation?: number;
  description: string;
  connectedTo: string[];
}

const NODES_DATA: GraphNode[] = [
  {
    id: 'you',
    name: 'You (Traveler DNA)',
    category: 'core',
    categoryLabel: 'Profile Center',
    emoji: '🧭',
    color: '#F59E0B',
    ring: 0,
    angle: 0,
    elevation: 0,
    description: 'Your central heritage profile built from 6 logged journeys across India.',
    connectedTo: ['hampi', 'belur', 'halebidu', 'mysore', 'badami', 'ajanta', 'konark']
  },
  {
    id: 'hampi',
    name: 'Hampi',
    category: 'site',
    categoryLabel: 'Visited Site',
    emoji: '🏛️',
    color: '#3B82F6',
    rating: 5.0,
    ring: 1,
    angle: 0,
    elevation: 8,
    description: '14th-century capital of the Vijayanagara Empire with monolithic granite boulders and temples.',
    connectedTo: ['you', 'vijayanagara', 'medieval_era', 'photography']
  },
  {
    id: 'belur',
    name: 'Belur Temple',
    category: 'site',
    categoryLabel: 'Visited Site',
    emoji: '🛕',
    color: '#3B82F6',
    rating: 5.0,
    ring: 1,
    angle: (1 / 7) * Math.PI * 2,
    elevation: -8,
    description: 'Chennakeshava Temple featuring intricate soapstone star-shaped architecture from 1117 CE.',
    connectedTo: ['you', 'hoysala', 'medieval_era', 'photography']
  },
  {
    id: 'halebidu',
    name: 'Halebidu',
    category: 'site',
    categoryLabel: 'Visited Site',
    emoji: '🛕',
    color: '#3B82F6',
    rating: 4.8,
    ring: 1,
    angle: (2 / 7) * Math.PI * 2,
    elevation: 10,
    description: 'Twin Hoysaleswara temples adorned with masterfully detailed narrative friezes.',
    connectedTo: ['you', 'hoysala', 'medieval_era']
  },
  {
    id: 'mysore',
    name: 'Mysore Palace',
    category: 'site',
    categoryLabel: 'Visited Site',
    emoji: '🏯',
    color: '#3B82F6',
    rating: 4.5,
    ring: 1,
    angle: (3 / 7) * Math.PI * 2,
    elevation: -10,
    description: 'Grand royal palace blending Hindu, Muslim, Rajput, and Gothic architectural motifs.',
    connectedTo: ['you', 'guided_walks', 'medieval_era']
  },
  {
    id: 'badami',
    name: 'Badami Caves',
    category: 'site',
    categoryLabel: 'Visited Site',
    emoji: '🪨',
    color: '#3B82F6',
    rating: 4.9,
    ring: 1,
    angle: (4 / 7) * Math.PI * 2,
    elevation: 8,
    description: '6th-century rock-cut sandstone cave temples carved by early Chalukyan craftsmen.',
    connectedTo: ['you', 'chalukya', 'ancient_era', 'photography']
  },
  {
    id: 'ajanta',
    name: 'Ajanta Caves',
    category: 'site',
    categoryLabel: 'Visited Site',
    emoji: '🎨',
    color: '#3B82F6',
    rating: 4.7,
    ring: 1,
    angle: (5 / 7) * Math.PI * 2,
    elevation: -6,
    description: 'Rock-cut Buddhist cave monuments known for masterwork mural frescoes and calm viharas.',
    connectedTo: ['you', 'ancient_era', 'guided_walks']
  },
  {
    id: 'konark',
    name: 'Konark Temple',
    category: 'site',
    categoryLabel: 'Visited Site',
    emoji: '☀️',
    color: '#3B82F6',
    rating: 5.0,
    ring: 1,
    angle: (6 / 7) * Math.PI * 2,
    elevation: 10,
    description: '13th-century chariot-shaped Sun Temple renowned for giant carved wheels and stone erotica.',
    connectedTo: ['you', 'medieval_era', 'photography']
  },
  {
    id: 'hoysala',
    name: 'Hoysala Architecture',
    category: 'dynasty',
    categoryLabel: 'Architectural Style',
    emoji: '✨',
    color: '#EAB308',
    affinity: 86,
    ring: 2,
    angle: (1.5 / 7) * Math.PI * 2,
    elevation: 6,
    description: 'Chloritic schist carvings, stellate sanctums, and high-relief mythological friezes.',
    connectedTo: ['belur', 'halebidu']
  },
  {
    id: 'vijayanagara',
    name: 'Vijayanagara Empire',
    category: 'dynasty',
    categoryLabel: 'Dynasty Era',
    emoji: '👑',
    color: '#A855F7',
    affinity: 82,
    ring: 2,
    angle: 0.15,
    elevation: 14,
    description: 'Massive granite pavilions, musical pillars, and military-royal citadel planning.',
    connectedTo: ['hampi']
  },
  {
    id: 'chalukya',
    name: 'Chalukyan Rock-Art',
    category: 'dynasty',
    categoryLabel: 'Dynasty Era',
    emoji: '⚔️',
    color: '#A855F7',
    affinity: 74,
    ring: 2,
    angle: (4.15 / 7) * Math.PI * 2,
    elevation: 12,
    description: 'Pioneers of Vesara architecture bridging North Nagara and South Dravidian styles.',
    connectedTo: ['badami']
  },
  {
    id: 'medieval_era',
    name: 'Medieval Period',
    category: 'dynasty',
    categoryLabel: 'Historical Period',
    emoji: '📜',
    color: '#F97316',
    affinity: 79,
    ring: 2,
    angle: (6.25 / 7) * Math.PI * 2,
    elevation: -10,
    description: '11th to 16th century CE architectural heights across Southern and Central India.',
    connectedTo: ['hampi', 'belur', 'halebidu', 'mysore', 'konark']
  },
  {
    id: 'ancient_era',
    name: 'Ancient Rock-Cut',
    category: 'dynasty',
    categoryLabel: 'Historical Period',
    emoji: '🏺',
    color: '#F97316',
    affinity: 68,
    ring: 2,
    angle: (4.85 / 7) * Math.PI * 2,
    elevation: -14,
    description: '2nd century BCE to 7th century CE stone sanctuaries hollowed out of living basalt cliffs.',
    connectedTo: ['badami', 'ajanta']
  },
  {
    id: 'photography',
    name: 'Heritage Photography',
    category: 'passion',
    categoryLabel: 'Travel Passion',
    emoji: '📸',
    color: '#10B981',
    affinity: 92,
    ring: 2,
    angle: (0.75 / 7) * Math.PI * 2,
    elevation: 16,
    description: 'High interest in golden-hour photography, stone relief macro textures, and drone perspectives.',
    connectedTo: ['hampi', 'belur', 'badami', 'konark']
  },
  {
    id: 'guided_walks',
    name: 'Curated Heritage Walks',
    category: 'passion',
    categoryLabel: 'Travel Passion',
    emoji: '🎙️',
    color: '#10B981',
    affinity: 75,
    ring: 2,
    angle: (3.45 / 7) * Math.PI * 2,
    elevation: -16,
    description: 'Guided audio tours and resident historian walkthroughs uncovering hidden folklore.',
    connectedTo: ['mysore', 'ajanta']
  }
];

// Surface Peaks data for Picture 2 style
const SURFACE_PEAKS = [
  { id: 'hoysala_summit', label: 'Summit: Hoysala Architecture & Photography', affinity: '94% Peak', x: 18, z: 12, height: 110, color: '#EF4444' },
  { id: 'vijayanagara_ridge', label: 'Ridge: Vijayanagara Citadel', affinity: '84% Match', x: -40, z: -25, height: 84, color: '#F59E0B' },
  { id: 'chalukyan_slopes', label: 'Plateau: Chalukyan Rock-Cut', affinity: '76% Match', x: -35, z: 40, height: 70, color: '#10B981' },
  { id: 'ancient_valley', label: 'Basal Plane: General Heritage', affinity: '45% Baseline', x: 50, z: -50, height: 26, color: '#3B82F6' },
];

const INNER_RADIUS = 125;
const OUTER_RADIUS = 230;

export default function DEPKGGraph3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);

  // Responsive state
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 640);
  const [viewMode, setViewMode] = useState<ViewMode>('solar');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('hampi');
  const [screenCoords, setScreenCoords] = useState<Map<string, { x: number; y: number; visible: boolean }>>(new Map());

  // Listen to window size for mobile breakpoint
  useEffect(() => {
    const handleWinResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleWinResize);
    return () => window.removeEventListener('resize', handleWinResize);
  }, []);

  // 3D Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphericalRef = useRef<THREE.Spherical | null>(null);

  // Group roots
  const solarGroupRef = useRef<THREE.Group>(new THREE.Group());
  const surfaceGroupRef = useRef<THREE.Group>(new THREE.Group());

  const nodesMeshMap = useRef<Map<string, { group: THREE.Group; sphere: THREE.Mesh; pos: THREE.Vector3 }>>(new Map());
  const linesMap = useRef<Array<{ line: THREE.Line; from: string; to: string; material: THREE.LineBasicMaterial }>>([]);

  const focusedNodeId = hoveredNodeId || selectedNodeId;
  const focusedNode = useMemo(() => NODES_DATA.find(n => n.id === focusedNodeId) || null, [focusedNodeId]);

  const highlightedNodeIds = useMemo(() => {
    if (!focusedNode) return new Set<string>();
    const set = new Set<string>();
    set.add(focusedNode.id);
    focusedNode.connectedTo.forEach(id => set.add(id));
    NODES_DATA.forEach(n => {
      if (n.connectedTo.includes(focusedNode.id)) {
        set.add(n.id);
      }
    });
    return set;
  }, [focusedNode]);

  // Node position helper
  const calculateNodePosition = useCallback((node: GraphNode): THREE.Vector3 => {
    if (node.ring === 0) return new THREE.Vector3(0, 0, 0);
    const radius = node.ring === 1 ? INNER_RADIUS : OUTER_RADIUS;
    const x = Math.cos(node.angle) * radius;
    const z = Math.sin(node.angle) * radius;
    const y = node.elevation || 0;
    return new THREE.Vector3(x, y, z);
  }, []);

  // Camera reset with mobile distance adaptation
  const resetCamera = useCallback((mode: ViewMode) => {
    if (!cameraRef.current || !sphericalRef.current) return;
    const mobile = window.innerWidth < 640;
    if (mode === 'solar') {
      // Wider radius on mobile so outer orbital nodes are not cut off horizontally
      sphericalRef.current.radius = mobile ? 660 : 500;
      sphericalRef.current.theta = 0.25;
      sphericalRef.current.phi = 1.05;
      cameraRef.current.position.setFromSpherical(sphericalRef.current);
      cameraRef.current.lookAt(0, -10, 0);
    } else {
      // Elevated isometric angle for 3D Surface Mesh (Pic 2)
      sphericalRef.current.radius = mobile ? 540 : 420;
      sphericalRef.current.theta = 0.78;
      sphericalRef.current.phi = 0.98;
      cameraRef.current.position.setFromSpherical(sphericalRef.current);
      cameraRef.current.lookAt(0, 45, 0);
    }
  }, []);

  const adjustZoom = useCallback((delta: number) => {
    if (!cameraRef.current || !sphericalRef.current) return;
    sphericalRef.current.radius = Math.max(180, Math.min(950, sphericalRef.current.radius + delta));
    cameraRef.current.position.setFromSpherical(sphericalRef.current);
    cameraRef.current.lookAt(0, viewMode === 'solar' ? -10 : 45, 0);
  }, [viewMode]);

  // Mode Switch Handler
  const handleModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (solarGroupRef.current) solarGroupRef.current.visible = mode === 'solar';
    if (surfaceGroupRef.current) surfaceGroupRef.current.visible = mode === 'surface';
    resetCamera(mode);
  }, [resetCamera]);

  // Build the 3D Topological Surface Mesh (Picture 2)
  const buildSurfaceMesh = useCallback((group: THREE.Group) => {
    while (group.children.length > 0) group.remove(group.children[0]);

    const GRID_SIZE = 200;
    const SEGMENTS = 28;

    const getElevation = (x: number, z: number): number => {
      const d1 = Math.hypot(x - 18, z - 12);
      const p1 = 112 * Math.exp(-(d1 * d1) / (2 * 28 * 28));

      const d2 = Math.hypot(x + 40, z + 25);
      const p2 = 82 * Math.exp(-(d2 * d2) / (2 * 26 * 26));

      const d3 = Math.hypot(x + 35, z - 40);
      const p3 = 68 * Math.exp(-(d3 * d3) / (2 * 24 * 24));

      const base = 10 + 6 * Math.sin(x * 0.05) * Math.cos(z * 0.05);

      return p1 + p2 + p3 + base;
    };

    const getColorForHeight = (h: number): THREE.Color => {
      const minH = 10;
      const maxH = 115;
      const t = Math.max(0, Math.min(1, (h - minH) / (maxH - minH)));

      if (t < 0.18) {
        return new THREE.Color().lerpColors(new THREE.Color(0x7C3AED), new THREE.Color(0x2563EB), t / 0.18);
      } else if (t < 0.4) {
        return new THREE.Color().lerpColors(new THREE.Color(0x2563EB), new THREE.Color(0x10B981), (t - 0.18) / 0.22);
      } else if (t < 0.65) {
        return new THREE.Color().lerpColors(new THREE.Color(0x10B981), new THREE.Color(0xFACC15), (t - 0.4) / 0.25);
      } else if (t < 0.85) {
        return new THREE.Color().lerpColors(new THREE.Color(0xFACC15), new THREE.Color(0xF97316), (t - 0.65) / 0.2);
      } else {
        return new THREE.Color().lerpColors(new THREE.Color(0xF97316), new THREE.Color(0xDC2626), (t - 0.85) / 0.15);
      }
    };

    const planeGeo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, SEGMENTS, SEGMENTS);
    planeGeo.rotateX(-Math.PI / 2);

    const posAttr = planeGeo.attributes.position;
    const colors: number[] = [];

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = getElevation(vx, vz);
      posAttr.setY(i, vy);

      const c = getColorForHeight(vy);
      colors.push(c.r, c.g, c.b);
    }

    planeGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    planeGeo.computeVertexNormals();

    // Colored surface mesh
    const surfaceMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.2,
      side: THREE.DoubleSide
    });
    group.add(new THREE.Mesh(planeGeo, surfaceMat));

    // Grey triangulated wireframe lattice (Picture 2)
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x94A3B8,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    const wireMesh = new THREE.Mesh(planeGeo, wireMat);
    wireMesh.position.y += 0.2;
    group.add(wireMesh);

    // 3D Coordinate Bounding Box & Axes
    const boxGeo = new THREE.BoxGeometry(GRID_SIZE, 120, GRID_SIZE);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxLines = new THREE.LineSegments(
      boxEdges,
      new THREE.LineBasicMaterial({ color: 0x64748B, transparent: true, opacity: 0.55 })
    );
    boxLines.position.set(0, 60, 0);
    group.add(boxLines);

    // Floor grid
    const floorGrid = new THREE.GridHelper(GRID_SIZE, 10, 0x64748B, 0x334155);
    floorGrid.position.y = 0;
    group.add(floorGrid);

    // Grids on back walls
    const wallGrid1 = new THREE.GridHelper(GRID_SIZE, 10, 0x475569, 0x1E293B);
    wallGrid1.rotation.x = Math.PI / 2;
    wallGrid1.position.set(0, 60, -GRID_SIZE / 2);
    group.add(wallGrid1);

    const wallGrid2 = new THREE.GridHelper(GRID_SIZE, 10, 0x475569, 0x1E293B);
    wallGrid2.rotation.z = Math.PI / 2;
    wallGrid2.position.set(-GRID_SIZE / 2, 60, 0);
    group.add(wallGrid2);

    // Summit markers
    SURFACE_PEAKS.forEach(peak => {
      const peakSphere = new THREE.Mesh(
        new THREE.SphereGeometry(4.5, 16, 16),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(peak.color),
          emissive: new THREE.Color(peak.color),
          emissiveIntensity: 0.8
        })
      );
      peakSphere.position.set(peak.x, peak.height + 2, peak.z);
      group.add(peakSphere);

      const pinGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(peak.x, 0, peak.z),
        new THREE.Vector3(peak.x, peak.height, peak.z)
      ]);
      const pinLine = new THREE.Line(
        pinGeo,
        new THREE.LineBasicMaterial({ color: 0xF59E0B, transparent: true, opacity: 0.5 })
      );
      group.add(pinLine);
    });

  }, []);

  // Main Three.js Lifecycle with Full Touch Support
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight || 460;
    const mobile = window.innerWidth < 640;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(44, width / height, 1, 2500);
    const initialRadius = mobile ? 660 : 500;
    const spherical = new THREE.Spherical(initialRadius, 1.05, 0.25);
    sphericalRef.current = spherical;
    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, -10, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // Clean Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(160, 260, 160);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x60A5FA, 1.2);
    dirLight2.position.set(-160, 180, -160);
    scene.add(dirLight2);

    const goldPoint = new THREE.PointLight(0xF59E0B, 3.0, 500);
    goldPoint.position.set(0, 50, 0);
    scene.add(goldPoint);

    // Attach Groups
    const solarGrp = solarGroupRef.current;
    const surfGrp = surfaceGroupRef.current;
    while (solarGrp.children.length > 0) solarGrp.remove(solarGrp.children[0]);
    while (surfGrp.children.length > 0) surfGrp.remove(surfGrp.children[0]);

    scene.add(solarGrp);
    scene.add(surfGrp);

    // Build Solar Nodes & Orbits
    const createOrbitRing = (radius: number, color: number, opacity: number) => {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
      const points = curve.getPoints(120);
      const geo = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, 0, p.y)));
      const ring = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
      ring.position.y = -2;
      return ring;
    };
    solarGrp.add(createOrbitRing(INNER_RADIUS, 0x3B82F6, 0.25));
    solarGrp.add(createOrbitRing(OUTER_RADIUS, 0xF59E0B, 0.18));

    nodesMeshMap.current.clear();
    NODES_DATA.forEach(node => {
      const pos = calculateNodePosition(node);
      const group = new THREE.Group();
      group.position.copy(pos);

      const sphereRadius = node.ring === 0 ? 11.5 : node.ring === 1 ? 8 : 6.8;
      const sphereMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(node.color),
        emissive: new THREE.Color(node.color),
        emissiveIntensity: node.ring === 0 ? 0.6 : 0.35,
        roughness: 0.25,
        metalness: 0.55
      });
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(sphereRadius, 32, 32), sphereMat);
      group.add(sphere);

      if (node.ring === 0) {
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(18, 0.7, 16, 60),
          new THREE.MeshBasicMaterial({ color: 0xF59E0B, transparent: true, opacity: 0.5 })
        );
        halo.rotation.x = Math.PI / 2;
        group.add(halo);
      }

      solarGrp.add(group);
      nodesMeshMap.current.set(node.id, { group, sphere, pos });
    });

    linesMap.current = [];
    const addedPairs = new Set<string>();
    NODES_DATA.forEach(fromNode => {
      const fromPos = calculateNodePosition(fromNode);
      fromNode.connectedTo.forEach(toId => {
        const pairKey = [fromNode.id, toId].sort().join('--');
        if (addedPairs.has(pairKey)) return;
        addedPairs.add(pairKey);

        const toNode = NODES_DATA.find(n => n.id === toId);
        if (!toNode) return;
        const toPos = calculateNodePosition(toNode);

        const lineGeo = new THREE.BufferGeometry().setFromPoints([fromPos, toPos]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x38BDF8, transparent: true, opacity: 0.22 });
        const line = new THREE.Line(lineGeo, lineMat);
        solarGrp.add(line);
        linesMap.current.push({ line, from: fromNode.id, to: toId, material: lineMat });
      });
    });

    // Build 3D Surface Mesh
    buildSurfaceMesh(surfGrp);

    solarGrp.visible = viewMode === 'solar';
    surfGrp.visible = viewMode === 'surface';

    // Desktop Mouse Drag Interaction
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };

      spherical.theta -= dx * 0.006;
      spherical.phi = Math.max(0.18, Math.min(Math.PI / 2.05, spherical.phi - dy * 0.006));
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, viewMode === 'solar' ? -10 : 45, 0);
    };

    const onMouseUp = () => { isDragging = false; };

    const onWheel = (e: WheelEvent) => {
      spherical.radius = Math.max(180, Math.min(950, spherical.radius + e.deltaY * 0.4));
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, viewMode === 'solar' ? -10 : 45, 0);
    };

    // Mobile Touch Gesture Support (1-finger rotate, 2-finger pinch-to-zoom)
    let isTouchDragging = false;
    let prevTouch = { x: 0, y: 0 };
    let initPinchDist = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isTouchDragging = true;
        prevTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        isTouchDragging = false;
        initPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isTouchDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - prevTouch.x;
        const dy = e.touches[0].clientY - prevTouch.y;
        prevTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        spherical.theta -= dx * 0.007;
        spherical.phi = Math.max(0.18, Math.min(Math.PI / 2.05, spherical.phi - dy * 0.007));
        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, viewMode === 'solar' ? -10 : 45, 0);
      } else if (e.touches.length === 2 && initPinchDist > 0) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = (initPinchDist - dist) * 0.8;
        spherical.radius = Math.max(180, Math.min(950, spherical.radius + delta));
        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, viewMode === 'solar' ? -10 : 45, 0);
        initPinchDist = dist;
      }
    };

    const onTouchEnd = () => {
      isTouchDragging = false;
      initPinchDist = 0;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: true });

    // Touch event listeners
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    // Animation & Coordinates Projection
    let animId: number;
    let clock = 0;
    const tempVec = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      clock += 0.015;

      const currentW = mount.clientWidth;
      const currentH = mount.clientHeight;

      const coords = new Map<string, { x: number; y: number; visible: boolean }>();
      if (viewMode === 'solar') {
        nodesMeshMap.current.forEach(({ pos }, id) => {
          tempVec.copy(pos);
          tempVec.project(camera);
          const x = (tempVec.x * 0.5 + 0.5) * currentW;
          const y = (-(tempVec.y * 0.5) + 0.5) * currentH;
          coords.set(id, { x, y, visible: tempVec.z < 1 });
        });
      } else {
        SURFACE_PEAKS.forEach(peak => {
          tempVec.set(peak.x, peak.height + 4, peak.z);
          tempVec.project(camera);
          const x = (tempVec.x * 0.5 + 0.5) * currentW;
          const y = (-(tempVec.y * 0.5) + 0.5) * currentH;
          coords.set(peak.id, { x, y, visible: tempVec.z < 1 });
        });
      }
      setScreenCoords(coords);

      if (viewMode === 'solar') {
        nodesMeshMap.current.forEach(({ group }, id) => {
          const node = NODES_DATA.find(n => n.id === id);
          if (node && node.ring > 0) {
            group.position.y = (node.elevation || 0) + Math.sin(clock * 1.4 + node.angle) * 2;
          }
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!mount || !renderer || !camera) return;
      const newW = mount.clientWidth;
      const newH = mount.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    });
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('mousedown', onMouseDown);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      try {
        renderer.dispose();
        renderer.forceContextLoss();
        const gl = renderer.getContext();
        const loseExt = gl?.getExtension('WEBGL_lose_context');
        loseExt?.loseContext();
      } catch (err) {
        // ignore
      }
      if (mount && mount.contains(dom)) mount.removeChild(dom);
    };
  }, [buildSurfaceMesh, calculateNodePosition, viewMode]);

  // Update line & sphere highlights in Solar mode
  useEffect(() => {
    if (viewMode !== 'solar') return;

    linesMap.current.forEach(({ from, to, material }) => {
      const isConnectedToFocused = focusedNodeId && (from === focusedNodeId || to === focusedNodeId);
      const fromNode = NODES_DATA.find(n => n.id === from);
      const toNode = NODES_DATA.find(n => n.id === to);
      const matchesCategory =
        activeCategory === 'all' ||
        fromNode?.category === activeCategory ||
        toNode?.category === activeCategory;

      if (!matchesCategory) {
        material.opacity = 0.04;
        material.color.setHex(0x1F2937);
      } else if (isConnectedToFocused) {
        material.opacity = 0.88;
        material.color.setHex(0xF59E0B);
      } else {
        material.opacity = 0.22;
        material.color.setHex(0x38BDF8);
      }
    });

    nodesMeshMap.current.forEach(({ sphere }, id) => {
      const node = NODES_DATA.find(n => n.id === id);
      if (!node) return;
      const isHighlighted = highlightedNodeIds.has(id);
      const matchesCategory = activeCategory === 'all' || node.category === activeCategory || node.category === 'core';

      if (!matchesCategory) {
        (sphere.material as THREE.MeshStandardMaterial).opacity = 0.18;
        (sphere.material as THREE.MeshStandardMaterial).transparent = true;
      } else if (isHighlighted) {
        (sphere.material as THREE.MeshStandardMaterial).opacity = 1;
        (sphere.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.85;
      } else {
        (sphere.material as THREE.MeshStandardMaterial).opacity = 0.9;
        (sphere.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
      }
    });
  }, [focusedNodeId, highlightedNodeIds, activeCategory, viewMode]);

  // ESC key closes popup modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPopupOpen) setIsPopupOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPopupOpen]);

  const filteredNodes = useMemo(() => {
    if (activeCategory === 'all') return NODES_DATA;
    return NODES_DATA.filter(n => n.category === activeCategory || n.category === 'core');
  }, [activeCategory]);

  return (
    <div ref={containerRef} style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── Top Explanation Banner (Mobile Optimized) ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(217,156,83,0.08) 0%, rgba(59,130,246,0.05) 100%)',
        border: '1px solid rgba(217,156,83,0.2)',
        borderRadius: '12px',
        padding: isMobile ? '.7rem .85rem' : '.75rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: '.7rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
          <div style={{
            width: isMobile ? '30px' : '34px',
            height: isMobile ? '30px' : '34px',
            borderRadius: '9px',
            background: 'rgba(217,156,83,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '1.05rem' : '1.2rem',
            flexShrink: 0
          }}>
            🧭
          </div>
          <div>
            <div style={{ fontSize: isMobile ? '.78rem' : '.84rem', fontWeight: 700, color: '#EDEDED' }}>
              Your Heritage Journey & Preferences
            </div>
            <div style={{ fontSize: isMobile ? '.64rem' : '.68rem', color: '#9CA3AF' }}>
              Toggle between the <strong>3D Solar Network</strong> and the <strong>3D Topological Surface (Pic 2)</strong>.
            </div>
          </div>
        </div>

        {/* Category Filter Pills (Smooth Horizontally Scrollable on Mobile) */}
        {viewMode === 'solar' && (
          <div style={{
            display: 'flex',
            gap: '.35rem',
            overflowX: 'auto',
            width: isMobile ? '100%' : 'auto',
            paddingBottom: isMobile ? '4px' : '0',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none'
          }}>
            {[
              { id: 'all', label: 'All (14)', icon: '✨' },
              { id: 'site', label: 'Visited Sites (7)', icon: '🏛️' },
              { id: 'dynasty', label: 'Styles & Dynasties (5)', icon: '👑' },
              { id: 'passion', label: 'Passions (2)', icon: '📸' }
            ].map(tab => {
              const active = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  style={{
                    background: active ? '#D99C53' : 'rgba(255,255,255,0.04)',
                    color: active ? '#000000' : '#D1D5DB',
                    fontWeight: active ? 700 : 500,
                    fontSize: isMobile ? '.62rem' : '.66rem',
                    padding: isMobile ? '.3rem .6rem' : '.35rem .7rem',
                    borderRadius: '20px',
                    border: active ? '1px solid #D99C53' : '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '.3rem',
                    flexShrink: 0
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Main Viewport Container (Seamlessly morphs into Fullscreen Popup Modal) ── */}
      <div style={isPopupOpen ? {
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(3, 5, 14, 0.96)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '1.5rem',
        animation: 'fadeIn 0.2s ease-out'
      } : {}}>
        <div style={{
          position: 'relative',
          width: isPopupOpen ? (isMobile ? '100vw' : '94vw') : '100%',
          maxWidth: isPopupOpen ? '1480px' : 'none',
          height: isPopupOpen ? (isMobile ? '100vh' : '85vh') : (isMobile ? '440px' : '520px'),
          borderRadius: isPopupOpen ? (isMobile ? '0' : '22px') : '16px',
          overflow: 'hidden',
          background: 'radial-gradient(ellipse at 50% 35%, #0e1224 0%, #030408 100%)',
          border: isPopupOpen && !isMobile ? '1.5px solid rgba(217,156,83,0.35)' : isPopupOpen ? 'none' : '1px solid rgba(217,156,83,0.22)',
          boxShadow: isPopupOpen ? '0 25px 80px rgba(0,0,0,0.95)' : 'inset 0 0 60px rgba(0,0,0,0.85)',
          transition: 'all 0.25s cubic-bezier(0.2, 0, 0, 1)'
        }}>
          {/* Continuous Three.js WebGL Mount */}
          <div ref={canvasMountRef} style={{ width: '100%', height: '100%', cursor: 'grab', touchAction: 'none' }} />

          {/* Top Header Bar inside 3D Canvas (Mobile-Responsive Stack) */}
          <div style={{
            position: 'absolute',
            top: isMobile ? '8px' : '12px',
            left: isMobile ? '10px' : '14px',
            right: isMobile ? '10px' : '14px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? '.4rem' : '.5rem',
            zIndex: 35,
            pointerEvents: 'none'
          }}>
            {/* View Mode Toggle & Large View Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMobile ? 'space-between' : 'flex-end',
              gap: '.4rem',
              pointerEvents: 'auto',
              order: isMobile ? 1 : 2
            }}>
              {/* Dual View Toggle */}
              <div style={{
                display: 'flex',
                background: 'rgba(15, 23, 42, 0.94)',
                border: '1.5px solid rgba(217,156,83,0.35)',
                borderRadius: '10px',
                padding: '2px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                flex: isMobile ? 1 : 'none'
              }}>
                <button
                  type="button"
                  onClick={() => handleModeChange('solar')}
                  style={{
                    background: viewMode === 'solar' ? '#D99C53' : 'transparent',
                    color: viewMode === 'solar' ? '#000000' : '#D1D5DB',
                    fontWeight: viewMode === 'solar' ? 800 : 500,
                    fontSize: isMobile ? '.58rem' : '.64rem',
                    padding: isMobile ? '.3rem .5rem' : '.35rem .7rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '.25rem',
                    flex: isMobile ? 1 : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🪐</span>
                  <span>{isMobile ? 'Network' : 'Solar Network'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('surface')}
                  style={{
                    background: viewMode === 'surface' ? '#D99C53' : 'transparent',
                    color: viewMode === 'surface' ? '#000000' : '#D1D5DB',
                    fontWeight: viewMode === 'surface' ? 800 : 500,
                    fontSize: isMobile ? '.58rem' : '.64rem',
                    padding: isMobile ? '.3rem .5rem' : '.35rem .7rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '.25rem',
                    flex: isMobile ? 1 : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🏔️</span>
                  <span>{isMobile ? 'Surface' : '3D Surface Plot'}</span>
                </button>
              </div>

              {/* Large View / Close Fullscreen Button */}
              {!isPopupOpen ? (
                <button
                  type="button"
                  onClick={() => setIsPopupOpen(true)}
                  title="Expand into Larger Context Screen"
                  style={{
                    background: 'rgba(15, 23, 42, 0.94)',
                    border: '1.5px solid rgba(255,255,255,0.22)',
                    color: '#F3F4F6',
                    borderRadius: '10px',
                    padding: isMobile ? '.3rem .6rem' : '.35rem .75rem',
                    fontSize: isMobile ? '.58rem' : '.64rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '.3rem',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                    flexShrink: 0
                  }}
                >
                  <span>⛶</span>
                  <span>{isMobile ? 'Expand' : 'Large View'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPopupOpen(false)}
                  title="Close Fullscreen View"
                  style={{
                    background: 'rgba(239, 68, 68, 0.25)',
                    border: '1.5px solid rgba(239, 68, 68, 0.6)',
                    color: '#FCA5A5',
                    borderRadius: '10px',
                    padding: isMobile ? '.3rem .65rem' : '.35rem .85rem',
                    fontSize: isMobile ? '.62rem' : '.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '.35rem',
                    flexShrink: 0
                  }}
                >
                  <span>✕</span>
                  <span>Close</span>
                </button>
              )}
            </div>

            {/* Title & Subtext */}
            <div style={{ order: isMobile ? 2 : 1 }}>
              <div style={{
                fontSize: isMobile ? '.62rem' : '.72rem',
                fontWeight: 800,
                color: '#D99C53',
                letterSpacing: '.06em',
                textTransform: 'uppercase'
              }}>
                {viewMode === 'solar' ? '3D Heritage Space' : '3D Topographic Surface (Pic 2)'}
              </div>
              {!isMobile && (
                <div style={{ fontSize: '.58rem', color: '#9CA3AF', marginTop: '1px' }}>
                  {viewMode === 'solar'
                    ? 'Inner: Visited Sites · Outer: Dynasties & Passions'
                    : 'Rainbow Elevation Mesh (Pic 2) · Axes A, B, Z'}
                </div>
              )}
            </div>
          </div>

          {/* Drag & Pinch Gesture Instruction (Hidden on very compact screens) */}
          {!isMobile && (
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '16px',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '.3rem .6rem',
              fontSize: '.58rem',
              color: '#9CA3AF',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '.4rem',
              zIndex: 30
            }}>
              <span>🖱️ Drag to Orbit</span>
              <span>•</span>
              <span>Scroll to Zoom</span>
            </div>
          )}

          {/* Floating Zoom & Reset Buttons */}
          <div style={{
            position: 'absolute',
            bottom: isMobile ? '8px' : '12px',
            right: isMobile ? '8px' : '16px',
            display: 'flex',
            gap: '.3rem',
            zIndex: 35
          }}>
            <button
              type="button"
              onClick={() => adjustZoom(-50)}
              title="Zoom In"
              style={{
                width: isMobile ? '28px' : '30px',
                height: isMobile ? '28px' : '30px',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.88)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#EDEDED',
                fontSize: '.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => adjustZoom(50)}
              title="Zoom Out"
              style={{
                width: isMobile ? '28px' : '30px',
                height: isMobile ? '28px' : '30px',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.88)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#EDEDED',
                fontSize: '.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              −
            </button>
            <button
              type="button"
              onClick={() => resetCamera(viewMode)}
              title="Reset View"
              style={{
                padding: '0 .55rem',
                height: isMobile ? '28px' : '30px',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.88)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#D99C53',
                fontSize: isMobile ? '.58rem' : '.64rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ⟲
            </button>
          </div>

          {/* ── Mode 1: Solar System Projected HTML Badges ── */}
          {viewMode === 'solar' && filteredNodes.map(node => {
            const coords = screenCoords.get(node.id);
            if (!coords || !coords.visible) return null;

            const isFocused = focusedNodeId === node.id;
            const isConnected = highlightedNodeIds.has(node.id);
            const isCenter = node.id === 'you';

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{
                  position: 'absolute',
                  left: `${coords.x}px`,
                  top: `${coords.y}px`,
                  transform: `translate(-50%, ${isCenter ? '-130%' : '-135%'}) scale(${isFocused ? 1.12 : 1})`,
                  transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease',
                  zIndex: isFocused ? 30 : isConnected ? 20 : 10,
                  cursor: 'pointer',
                  pointerEvents: 'auto'
                }}
              >
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: isMobile ? '.22rem' : '.32rem',
                  padding: isMobile
                    ? (isCenter ? '.25rem .5rem' : '.18rem .42rem')
                    : (isCenter ? '.35rem .7rem' : '.26rem .55rem'),
                  borderRadius: '20px',
                  background: isFocused
                    ? 'rgba(15, 23, 42, 0.95)'
                    : isConnected
                    ? 'rgba(10, 15, 30, 0.88)'
                    : 'rgba(5, 7, 15, 0.75)',
                  border: `1.5px solid ${isFocused ? '#F59E0B' : isConnected ? node.color : 'rgba(255,255,255,0.15)'}`,
                  backdropFilter: 'blur(8px)',
                  boxShadow: isFocused
                    ? `0 0 16px ${node.color}88, 0 4px 12px rgba(0,0,0,0.8)`
                    : '0 2px 8px rgba(0,0,0,0.6)',
                  whiteSpace: 'nowrap',
                  userSelect: 'none'
                }}>
                  <span style={{ fontSize: isMobile ? (isCenter ? '.8rem' : '.7rem') : (isCenter ? '1rem' : '.8rem'), lineHeight: 1 }}>
                    {node.emoji}
                  </span>
                  <span style={{
                    fontSize: isMobile ? (isCenter ? '.66rem' : '.58rem') : (isCenter ? '.75rem' : '.68rem'),
                    fontWeight: isFocused ? 700 : 600,
                    color: isFocused ? '#FFFFFF' : '#EDEDED',
                    letterSpacing: '.01em'
                  }}>
                    {node.name}
                  </span>

                  {node.rating && (
                    <span style={{
                      fontSize: isMobile ? '.5rem' : '.58rem',
                      color: '#FBBF24',
                      fontWeight: 700,
                      background: 'rgba(251,191,36,0.15)',
                      padding: '1px 4px',
                      borderRadius: '8px'
                    }}>
                      ★ {node.rating}
                    </span>
                  )}

                  {node.affinity && (
                    <span style={{
                      fontSize: isMobile ? '.5rem' : '.58rem',
                      color: '#34D399',
                      fontWeight: 700,
                      background: 'rgba(52,211,153,0.15)',
                      padding: '1px 4px',
                      borderRadius: '8px'
                    }}>
                      {node.affinity}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── Mode 2: 3D Surface Peak Badges (Picture 2) ── */}
          {viewMode === 'surface' && SURFACE_PEAKS.map(peak => {
            const coords = screenCoords.get(peak.id);
            if (!coords || !coords.visible) return null;

            return (
              <div
                key={peak.id}
                style={{
                  position: 'absolute',
                  left: `${coords.x}px`,
                  top: `${coords.y}px`,
                  transform: 'translate(-50%, -125%)',
                  pointerEvents: 'none',
                  zIndex: 25
                }}
              >
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.3rem',
                  padding: isMobile ? '.2rem .5rem' : '.28rem .65rem',
                  borderRadius: '14px',
                  background: 'rgba(15, 23, 42, 0.94)',
                  border: `1.5px solid ${peak.color}`,
                  boxShadow: `0 0 16px ${peak.color}77`,
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: peak.color }} />
                  <span style={{ fontSize: isMobile ? '.6rem' : '.7rem', fontWeight: 700, color: '#EDEDED' }}>{peak.label}</span>
                  <span style={{ fontSize: isMobile ? '.52rem' : '.6rem', fontWeight: 800, color: peak.color, background: `${peak.color}22`, padding: '1px 5px', borderRadius: '8px' }}>
                    {peak.affinity}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Active Node Detail Drawer in Solar Mode (Mobile Bottom Sheet vs Desktop Floating Panel) */}
          {viewMode === 'solar' && focusedNode && (
            <div style={isMobile ? {
              position: 'absolute',
              bottom: '44px',
              left: '10px',
              right: '10px',
              background: 'rgba(10, 14, 26, 0.96)',
              backdropFilter: 'blur(16px)',
              border: `1.5px solid ${focusedNode.color}77`,
              borderRadius: '14px',
              padding: '.8rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.9)',
              zIndex: 38,
              maxHeight: '190px',
              overflowY: 'auto'
            } : {
              position: 'absolute',
              top: '64px',
              left: '14px',
              width: '260px',
              maxWidth: 'calc(100% - 28px)',
              background: 'rgba(10, 14, 26, 0.94)',
              backdropFilter: 'blur(16px)',
              border: `1.5px solid ${focusedNode.color}66`,
              borderRadius: '14px',
              padding: '1rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
              zIndex: 38
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem', marginBottom: '.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `${focusedNode.color}22`,
                    border: `1px solid ${focusedNode.color}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.15rem'
                  }}>
                    {focusedNode.emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: '.8rem', fontWeight: 800, color: '#EDEDED', lineHeight: 1.2 }}>
                      {focusedNode.name}
                    </div>
                    <div style={{ fontSize: '.58rem', color: focusedNode.color, fontWeight: 600, marginTop: '2px' }}>
                      {focusedNode.categoryLabel}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNodeId(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6B7280',
                    fontSize: '.85rem',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: '.62rem', color: '#9CA3AF', lineHeight: 1.4, margin: '0 0 .6rem' }}>
                {focusedNode.description}
              </p>

              {focusedNode.affinity && (
                <div style={{ marginBottom: '.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.58rem', color: '#D1D5DB', marginBottom: '3px' }}>
                    <span>Affinity Strength</span>
                    <span style={{ color: focusedNode.color, fontWeight: 700 }}>{focusedNode.affinity}% Match</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${focusedNode.affinity}%`, background: focusedNode.color, borderRadius: '3px' }} />
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: '.55rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.35rem' }}>
                  Connected ({focusedNode.connectedTo.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.25rem' }}>
                  {focusedNode.connectedTo.map(connId => {
                    const target = NODES_DATA.find(n => n.id === connId);
                    if (!target) return null;
                    return (
                      <button
                        type="button"
                        key={connId}
                        onClick={() => setSelectedNodeId(connId)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '10px',
                          padding: '.18rem .45rem',
                          fontSize: '.56rem',
                          color: '#D1D5DB',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '.22rem',
                          cursor: 'pointer'
                        }}
                      >
                        <span>{target.emoji}</span>
                        <span>{target.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Surface Plot Legend overlay in Surface Mode */}
          {viewMode === 'surface' && (
            <div style={{
              position: 'absolute',
              bottom: isMobile ? '42px' : '48px',
              right: isMobile ? '8px' : '16px',
              left: isMobile ? '8px' : 'auto',
              background: 'rgba(10, 14, 26, 0.94)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              padding: '.55rem .75rem',
              maxWidth: isMobile ? 'none' : '240px',
              zIndex: 35
            }}>
              <div style={{ fontSize: '.6rem', fontWeight: 800, color: '#EDEDED', marginBottom: '4px' }}>
                Topological Response Scale (Pic 2)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '.52rem', color: '#818CF8' }}>Low</span>
                <div style={{
                  flex: 1,
                  height: '7px',
                  borderRadius: '4px',
                  background: 'linear-gradient(90deg, #7C3AED 0%, #2563EB 25%, #10B981 50%, #FACC15 75%, #DC2626 100%)'
                }} />
                <span style={{ fontSize: '.52rem', color: '#EF4444', fontWeight: 700 }}>Peak</span>
              </div>
              <div style={{ fontSize: '.54rem', color: '#9CA3AF', lineHeight: 1.3 }}>
                Summit indicates maximum Hoysala & Photography affinity clusters.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3-Tier Legend (Mobile: 1 Column Vertical Stack; Desktop: 3 Columns) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '.65rem',
        marginTop: '1rem'
      }}>
        {[
          {
            icon: '🏛️',
            title: 'Visited Heritage Sites (7)',
            desc: 'Real historical monuments you visited and rated 4.5★ or higher.',
            color: '#3B82F6',
            badge: 'Blue Spheres'
          },
          {
            icon: '👑',
            title: 'Styles & Dynasties (5)',
            desc: 'Architectural lineages derived from the temples and monuments you loved.',
            color: '#EAB308',
            badge: 'Gold / Purple'
          },
          {
            icon: '📸',
            title: 'Travel Passions (2)',
            desc: 'Activities and curated walks customized to your travel rhythm.',
            color: '#10B981',
            badge: 'Emerald Green'
          }
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
              padding: '.7rem .85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <span style={{ fontSize: '1.05rem' }}>{item.icon}</span>
                <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#EDEDED' }}>{item.title}</span>
              </div>
              <span style={{ fontSize: '.54rem', color: item.color, fontWeight: 700, background: `${item.color}15`, padding: '2px 6px', borderRadius: '8px' }}>
                {item.badge}
              </span>
            </div>
            <div style={{ fontSize: '.62rem', color: '#9CA3AF', lineHeight: 1.4 }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
