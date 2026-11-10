/**
 * Artifact3DViewer.tsx
 * Loads an OBJ+MTL+Texture file using Three.js and renders it
 * with OrbitControls inside a canvas element.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Props {
  objUrl:  string;
  mtlUrl:  string;
  height?: number;
  bgColor?: string;
  autoRotate?: boolean;
}

export default function Artifact3DViewer({
  objUrl,
  mtlUrl,
  height = 400,
  bgColor = '#0a0a14',
  autoRotate = true,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animRef     = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = container.clientWidth || 600;
    const h = height;

    /* ── Scene ── */
    const scene = new THREE.Scene();
    if (bgColor && bgColor !== 'transparent') {
      try {
        scene.background = new THREE.Color(bgColor);
        scene.fog = new THREE.FogExp2(bgColor, 0.002);
      } catch (e) {
        // Fallback for non-standard color strings
      }
    }

    /* ── Camera ── */
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
    camera.position.set(0, 1, 4);

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    /* ── Lights ── */
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff4e0, 2.5);
    sun.position.set(5, 10, 7);
    sun.castShadow = true;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x7090ff, 0.8);
    fill.position.set(-5, 2, -5);
    scene.add(fill);

    const rim = new THREE.PointLight(0xf59e0b, 1.5, 50);
    rim.position.set(0, 5, -3);
    scene.add(rim);

    /* ── OrbitControls ── */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.6;
    controls.minDistance = 0.5;
    controls.maxDistance = 30;

    /* ── Grid helper ── */
    const grid = new THREE.GridHelper(10, 20, 0x222244, 0x111133);
    (grid.material as THREE.Material).opacity = 0.4;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    /* ── Load MTL then OBJ ── */
    const mtlLoader = new MTLLoader();
    mtlLoader.load(
      mtlUrl,
      (materials) => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load(
          objUrl,
          (obj) => {
            /* Centre & scale the model */
            const box    = new THREE.Box3().setFromObject(obj);
            const centre = box.getCenter(new THREE.Vector3());
            const size   = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale  = 2.5 / maxDim;

            obj.position.sub(centre);
            obj.scale.setScalar(scale);
            obj.position.y -= (size.y * scale) / 2;   // sit on grid

            /* Enable shadow */
            obj.traverse(child => {
              if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).castShadow    = true;
                (child as THREE.Mesh).receiveShadow = true;
              }
            });

            scene.add(obj);
            /* Fit camera */
            camera.position.set(0, size.y * scale * 0.6, maxDim * scale * 2.2);
            controls.target.set(0, 0, 0);
            controls.update();
            setLoading(false);
          },
          undefined,
          (e) => { setError('Could not load OBJ: ' + e); setLoading(false); }
        );
      },
      undefined,
      () => {
        /* If MTL fails, just load OBJ plain */
        const objLoader = new OBJLoader();
        objLoader.load(
          objUrl,
          (obj) => {
            const box   = new THREE.Box3().setFromObject(obj);
            const centre= box.getCenter(new THREE.Vector3());
            const size  = box.getSize(new THREE.Vector3());
            const maxDim= Math.max(size.x, size.y, size.z);
            const scale = 2.5 / maxDim;
            obj.position.sub(centre);
            obj.scale.setScalar(scale);
            scene.add(obj);
            setLoading(false);
          },
          undefined,
          (e) => { setError('Load failed: ' + e); setLoading(false); }
        );
      }
    );

    /* ── Animate ── */
    let running = true;
    const tick = () => {
      if (!running) return;
      animRef.current = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    /* ── Resize ── */
    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      camera.aspect = nw / h;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      try {
        renderer.dispose();
        renderer.forceContextLoss();
        const gl = renderer.getContext();
        const loseExt = gl?.getExtension('WEBGL_lose_context');
        loseExt?.loseContext();
      } catch (err) {
        // ignore
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [objUrl, mtlUrl, height, bgColor, autoRotate]);

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: 12, overflow: 'hidden' }}>
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 2,
          background: bgColor, gap: '1rem',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '4px solid rgba(245,158,11,.2)',
            borderTopColor: '#f59e0b',
            animation: 'spin3d 1s linear infinite',
          }} />
          <div style={{ fontSize: '.82rem', color: '#94a3b8' }}>Loading 3D model…</div>
          <style>{`@keyframes spin3d{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: bgColor, color: '#fca5a5', fontSize: '.85rem', padding: '1rem', textAlign: 'center',
        }}>
          ⚠️ {error}
        </div>
      )}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {/* Controls hint */}
      {!loading && !error && (
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)',
          padding: '4px 12px', borderRadius: 20, fontSize: '.68rem', color: '#94a3b8',
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          🖱️ Drag to rotate · Scroll to zoom · Right-click to pan
        </div>
      )}
    </div>
  );
}
