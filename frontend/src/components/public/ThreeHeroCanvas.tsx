import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeHeroCanvasProps {
  className?: string;
}

export const ThreeHeroCanvas: React.FC<ThreeHeroCanvasProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    // Check if WebGL is supported in the environment
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

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    // SCENE & CAMERA
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 28;

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x6366f1, 2.5); // Indigo
    dirLight1.position.set(15, 20, 15);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x06b6d4, 2.0); // Cyan
    dirLight2.position.set(-15, -15, 10);
    scene.add(dirLight2);

    // KNOWLEDGE CONSTELLATION GRAPH
    const nodeCount = 38;
    const nodesGroup = new THREE.Group();
    scene.add(nodesGroup);

    const nodePositions: THREE.Vector3[] = [];
    const nodeSpheres: THREE.Mesh[] = [];

    const sphereGeom = new THREE.SphereGeometry(0.35, 16, 16);
    const centralGeom = new THREE.IcosahedronGeometry(1.6, 1);

    // Central Knowledge Core
    const centralMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      wireframe: true,
      roughness: 0.2,
      metalness: 0.8,
    });
    const centralMesh = new THREE.Mesh(centralGeom, centralMat);
    nodesGroup.add(centralMesh);

    // Inner glowing core
    const innerCoreGeom = new THREE.SphereGeometry(0.8, 16, 16);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      wireframe: true,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeom, innerCoreMat);
    nodesGroup.add(innerCoreMesh);

    // Orbiting Concept Nodes
    const colors = [0x6366f1, 0x3b82f6, 0x10b981, 0x8b5cf6, 0x06b6d4];
    for (let i = 0; i < nodeCount; i++) {
      const radius = 6 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const pos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
      nodePositions.push(pos);

      const col = colors[i % colors.length];
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.3,
        metalness: 0.7,
      });

      const sphere = new THREE.Mesh(sphereGeom, mat);
      sphere.position.copy(pos);
      nodesGroup.add(sphere);
      nodeSpheres.push(sphere);
    }

    // INTERCONNECTING PREREQUISITE EDGES (Directed DAG connections)
    const lineCoords: number[] = [];
    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        const dist = nodePositions[i].distanceTo(nodePositions[j]);
        if (dist < 4.8) {
          lineCoords.push(
            nodePositions[i].x, nodePositions[i].y, nodePositions[i].z,
            nodePositions[j].x, nodePositions[j].y, nodePositions[j].z
          );
        }
      }
      // Connect some to center
      if (nodePositions[i].length() < 8.5) {
        lineCoords.push(
          0, 0, 0,
          nodePositions[i].x, nodePositions[i].y, nodePositions[i].z
        );
      }
    }

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(lineCoords, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.35,
    });
    const lines = new THREE.LineSegments(lineGeom, lineMat);
    nodesGroup.add(lines);

    // FLOATING PARTICLE NEBULA (200 particles)
    const particleCount = 200;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 40;
      particlePositions[i + 1] = (Math.random() - 0.5) * 40;
      particlePositions[i + 2] = (Math.random() - 0.5) * 30;
    }
    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xa5b4fc,
      size: 0.18,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // MOUSE INTERACTION & LERPING
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x;
      mouseY = y;
      targetRotationY = mouseX * 0.9;
      targetRotationX = -mouseY * 0.9;
    };

    window.addEventListener('mousemove', handlePointerMove);

    // RESIZE OBSERVER
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ANIMATION LOOP
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      // Smooth inertia rotation
      nodesGroup.rotation.y += (targetRotationY - nodesGroup.rotation.y) * 0.05 + 0.003;
      nodesGroup.rotation.x += (targetRotationX - nodesGroup.rotation.x) * 0.05 + 0.001;

      // Pulse central core
      const pulse = 1 + Math.sin(elapsed * 2.5) * 0.08;
      centralMesh.scale.set(pulse, pulse, pulse);
      innerCoreMesh.rotation.y -= 0.01;
      innerCoreMesh.rotation.z += 0.005;

      // Subtle particle drift
      particles.rotation.y = elapsed * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    // CLEANUP
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handlePointerMove);
      resizeObserver.disconnect();

      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      // Dispose Geometries and Materials
      sphereGeom.dispose();
      centralGeom.dispose();
      centralMat.dispose();
      innerCoreGeom.dispose();
      innerCoreMat.dispose();
      lineGeom.dispose();
      lineMat.dispose();
      particleGeom.dispose();
      particleMat.dispose();
      nodeSpheres.forEach((s) => (s.material as THREE.Material).dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[320px] flex items-center justify-center overflow-hidden pointer-events-auto ${className}`}
      aria-label="Interactive 3D Three.js Knowledge Constellation"
    >
      {/* Visual background gradient halo */}
      <div className="absolute inset-0 bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};
