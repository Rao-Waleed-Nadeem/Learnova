import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeArchitectureCanvasProps {
  className?: string;
}

export const ThreeArchitectureCanvas: React.FC<ThreeArchitectureCanvasProps> = ({
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    // Guard against environments without WebGL
    let isWebGLAvailable = false;
    try {
      const testCanvas = document.createElement('canvas');
      isWebGLAvailable = !!(
        window.WebGLRenderingContext &&
        (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl'))
      );
    } catch {
      isWebGLAvailable = false;
    }

    if (!isWebGLAvailable) {
      return;
    }

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 360;

    // SCENE & CAMERA
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 14);

    // RENDERER
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x6366f1, 2.8); // Indigo
    dirLight1.position.set(10, 15, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x10b981, 2.2); // Emerald
    dirLight2.position.set(-10, -10, -5);
    scene.add(dirLight2);

    const group = new THREE.Group();
    scene.add(group);

    // CENTRAL TORUS KNOT (Modular Monolith Structure)
    const torusGeom = new THREE.TorusKnotGeometry(2.4, 0.55, 128, 24, 2, 3);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      wireframe: true,
      roughness: 0.25,
      metalness: 0.75,
    });
    const torusMesh = new THREE.Mesh(torusGeom, torusMat);
    group.add(torusMesh);

    // INNER CORE SPHERE
    const coreGeom = new THREE.IcosahedronGeometry(1.2, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x818cf8,
      wireframe: false,
      roughness: 0.3,
      metalness: 0.6,
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    group.add(coreMesh);

    // ORBITING ARCHITECTURAL SERVICE SATELLITES (BKT, DAG, Quarantine, Outbox)
    const satelliteColors = [0x6366f1, 0x10b981, 0xf59e0b, 0x06b6d4];
    const satellites: THREE.Mesh[] = [];
    const satGeom = new THREE.SphereGeometry(0.35, 16, 16);

    for (let i = 0; i < 4; i++) {
      const satMat = new THREE.MeshStandardMaterial({
        color: satelliteColors[i],
        roughness: 0.2,
        metalness: 0.8,
      });
      const sat = new THREE.Mesh(satGeom, satMat);
      satellites.push(sat);
      group.add(sat);
    }

    // PARTICLE RING
    const ringCount = 120;
    const ringPositions = new Float32Array(ringCount * 3);
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2;
      const rad = 5.2 + (Math.random() - 0.5) * 0.8;
      ringPositions[i * 3] = Math.cos(angle) * rad;
      ringPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      ringPositions[i * 3 + 2] = Math.sin(angle) * rad;
    }
    const ringGeom = new THREE.BufferGeometry();
    ringGeom.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
    const ringMat = new THREE.PointsMaterial({
      color: 0xa5b4fc,
      size: 0.14,
      transparent: true,
      opacity: 0.65,
    });
    const ringPoints = new THREE.Points(ringGeom, ringMat);
    group.add(ringPoints);

    // MOUSE TRACKING
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x;
      mouseY = y;
      targetRotY = mouseX * 0.8;
      targetRotX = -mouseY * 0.8;
    };

    window.addEventListener('mousemove', handlePointerMove);

    // RESIZE OBSERVER
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ANIMATION LOOP
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Inertia rotation
      group.rotation.y += (targetRotY - group.rotation.y) * 0.04 + 0.005;
      group.rotation.x += (targetRotX - group.rotation.x) * 0.04 + 0.002;

      // Pulse core
      const pulse = 1 + Math.sin(elapsed * 2) * 0.06;
      coreMesh.scale.set(pulse, pulse, pulse);

      // Orbit satellites
      satellites.forEach((sat, idx) => {
        const offset = (idx * Math.PI) / 2;
        const orbitRadius = 4.4;
        const curAngle = elapsed * 0.8 + offset;
        sat.position.set(
          Math.cos(curAngle) * orbitRadius,
          Math.sin(curAngle * 1.5) * 1.2,
          Math.sin(curAngle) * orbitRadius
        );
      });

      // Rotate particle ring
      ringPoints.rotation.y = elapsed * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handlePointerMove);
      resizeObserver.disconnect();

      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      torusGeom.dispose();
      torusMat.dispose();
      coreGeom.dispose();
      coreMat.dispose();
      satGeom.dispose();
      ringGeom.dispose();
      ringMat.dispose();
      satellites.forEach((s) => (s.material as THREE.Material).dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[300px] flex items-center justify-center overflow-hidden pointer-events-auto ${className}`}
      aria-label="Interactive 3D Modular Monolith Architecture"
    >
      <div className="absolute inset-0 bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};
