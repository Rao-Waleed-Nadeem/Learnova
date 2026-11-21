import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeConstellationBannerProps {
  className?: string;
}

export const ThreeConstellationBanner: React.FC<ThreeConstellationBannerProps> = ({
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

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

    if (!isWebGLAvailable) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 180;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 500);
    camera.position.z = 18;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Floating Geometric Prisms
    const geomCount = 20;
    const nodeGeom = new THREE.OctahedronGeometry(0.35);
    const meshes: THREE.Mesh[] = [];
    const colors = [0x6366f1, 0x06b6d4, 0x10b981, 0x8b5cf6];

    for (let i = 0; i < geomCount; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        wireframe: true,
      });
      const mesh = new THREE.Mesh(nodeGeom, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 24,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      group.add(mesh);
      meshes.push(mesh);
    }

    // Connective Lines
    const linePositions: number[] = [];
    for (let i = 0; i < meshes.length; i++) {
      for (let j = i + 1; j < meshes.length; j++) {
        const d = meshes[i].position.distanceTo(meshes[j].position);
        if (d < 5.5) {
          linePositions.push(
            meshes[i].position.x, meshes[i].position.y, meshes[i].position.z,
            meshes[j].position.x, meshes[j].position.y, meshes[j].position.z
          );
        }
      }
    }

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.25,
    });
    const lines = new THREE.LineSegments(lineGeom, lineMat);
    group.add(lines);

    // MOUSE PARALLAX
    let mouseX = 0;
    const handleMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    };
    window.addEventListener('mousemove', handleMove);

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
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      group.rotation.y = mouseX * 0.2 + elapsed * 0.03;
      meshes.forEach((m, idx) => {
        m.rotation.x += 0.01 * ((idx % 2) ? 1 : -1);
        m.rotation.y += 0.008;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMove);
      observer.disconnect();

      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      nodeGeom.dispose();
      lineGeom.dispose();
      lineMat.dispose();
      meshes.forEach((m) => (m.material as THREE.Material).dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[140px] sm:h-[180px] overflow-hidden pointer-events-none rounded-2xl ${className}`}
      aria-label="Interactive 3D Constellation Wave"
    />
  );
};
