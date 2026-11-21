import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface DalaParticleBrainProps {
  progressRef?: React.MutableRefObject<number>;
  scrollProgress?: number;
  className?: string;
}

export const DalaParticleBrain: React.FC<DalaParticleBrainProps> = ({
  progressRef,
  scrollProgress = 0,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const internalScrollRef = useRef<number>(scrollProgress);
  if (scrollProgress !== undefined) {
    internalScrollRef.current = scrollProgress;
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if WebGL is supported
    try {
      const testCanvas = document.createElement('canvas');
      const isWebGLAvailable = !!(
        window.WebGLRenderingContext &&
        (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl'))
      );
      if (!isWebGLAvailable) return;
    } catch {
      return;
    }

    // ── 1. SCENE & CAMERA SETUP ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 800;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.8);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0); // 100% transparent background
    container.appendChild(renderer.domElement);

    // ── 2. CREATE GLOWING TRIANGLE SPRITE TEXTURE ────────────────────────────
    const createTriangleTexture = () => {
      const size = 64;
      const cvs = document.createElement('canvas');
      cvs.width = size;
      cvs.height = size;
      const ctx = cvs.getContext('2d');
      if (!ctx) return new THREE.Texture();

      ctx.clearRect(0, 0, size, size);

      // Draw glowing equilateral triangle
      const h = size * 0.75;
      const x0 = size * 0.5;
      const y0 = size * 0.15;
      const x1 = size * 0.12;
      const y1 = y0 + h;
      const x2 = size * 0.88;
      const y2 = y0 + h;

      // Outer glow
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.closePath();
      ctx.fill();

      // Inner hollow cutout to create iconic Dala triangle glyph
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      const ih = h * 0.55;
      const iy0 = y0 + h * 0.32;
      ctx.moveTo(x0, iy0);
      ctx.lineTo(x0 - ih * 0.52, iy0 + ih);
      ctx.lineTo(x0 + ih * 0.52, iy0 + ih);
      ctx.closePath();
      ctx.fill();

      const texture = new THREE.CanvasTexture(cvs);
      texture.needsUpdate = true;
      return texture;
    };

    const triangleTexture = createTriangleTexture();

    // ── 3. GENERATE 3D ANATOMICAL BRAIN PARTICLES ───────────────────────────
    const PARTICLE_COUNT = 4800;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const basePositions = new Float32Array(PARTICLE_COUNT * 3);
    const scatterOffsets = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const randomPhases = new Float32Array(PARTICLE_COUNT);

    // Dala Color Palette: Radiant Gold/Amber, Electric Cyan, Neon Magenta, White
    const colorAmber = new THREE.Color('#FBBF24');   // Warm amber / gold
    const colorGold = new THREE.Color('#F59E0B');    // Deep gold
    const colorCyan = new THREE.Color('#22D3EE');    // Cyber cyan
    const colorBlue = new THREE.Color('#38BDF8');    // Electric sky blue
    const colorPurple = new THREE.Color('#C084FC');  // Violet magenta
    const colorWhite = new THREE.Color('#FFFFFF');   // Neural spark white

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Alternate left/right cerebral hemisphere
      const hemisphere = i % 2 === 0 ? -1 : 1;
      const u = Math.PI * Math.random();
      const v = Math.PI * Math.random();

      // Mathematical Brain Cortex Parameterization (Sulci, Gyri & Lobes)
      const r_x = 1.02 + 0.14 * Math.cos(3 * u) * Math.sin(2 * v);
      const r_y = 0.92 + 0.11 * Math.sin(2 * u);
      const r_z = 1.30 + 0.16 * Math.cos(u);

      let x = hemisphere * (0.12 + Math.sin(u) * Math.sin(v) * r_x);
      let y = Math.cos(u) * r_y;
      let z = Math.sin(u) * Math.cos(v) * r_z;

      // Cortex folds (gyri & sulci)
      const convolution = 0.08 * Math.sin(6 * x) * Math.sin(6 * y) * Math.cos(6 * z);
      x += convolution;
      y += convolution;
      z += convolution;

      // Temporal & cerebellum sculpting
      if (y < -0.2 && z < -0.2) {
        y *= 1.15;
        x *= 0.88;
      }
      // Frontal curve
      if (z > 0.5) {
        const fCurv = 1.0 - 0.22 * Math.pow(z - 0.5, 2);
        x *= fCurv;
        y *= fCurv;
      }

      // Brainstem extension at base
      if (i > PARTICLE_COUNT - 300) {
        x = (Math.random() - 0.5) * 0.22;
        y = -0.85 - Math.random() * 0.55;
        z = -0.15 + (Math.random() - 0.5) * 0.25;
      }

      const idx = i * 3;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      basePositions[idx] = x;
      basePositions[idx + 1] = y;
      basePositions[idx + 2] = z;

      // 3D explosion vector outward into deep space + vortex swirl
      const len = Math.sqrt(x * x + y * y + z * z) || 1.0;
      const nx = x / len;
      const ny = y / len;
      const nz = z / len;

      const scatterAngle = Math.random() * Math.PI * 2;
      const spread = 2.4 + Math.random() * 4.6;
      const swirlX = Math.cos(scatterAngle) * (1.1 + Math.random() * 1.8);
      const swirlY = Math.sin(scatterAngle) * (1.1 + Math.random() * 1.8);
      const swirlZ = (Math.random() - 0.5) * 3.5;

      scatterOffsets[idx]     = nx * spread + swirlX;
      scatterOffsets[idx + 1] = ny * spread + swirlY;
      scatterOffsets[idx + 2] = nz * spread + swirlZ;

      randomPhases[i] = Math.random() * Math.PI * 2;
      sizes[i] = 10.0 + Math.random() * 18.0;

      // Iridescent Dala Multi-Spectral Color Mapping
      const tempColor = new THREE.Color();
      const normY = (y + 1.2) / 2.4; // 0 to 1
      const normZ = (z + 1.5) / 3.0; // 0 to 1

      if (normY < 0.35) {
        // Lower lobes: Gold/Amber warm glow
        tempColor.copy(colorAmber).lerp(colorGold, Math.random());
      } else if (normZ > 0.6) {
        // Frontal cortex: Radiant Cyan/Blue
        tempColor.copy(colorCyan).lerp(colorBlue, Math.random() * 0.7);
      } else if (normY > 0.7) {
        // Crown / upper parietal: Magenta / Purple / White mix
        tempColor.copy(colorPurple).lerp(colorWhite, Math.random() * 0.5);
      } else {
        // Core synapses: Multi-spectral mix
        const rSelect = Math.random();
        if (rSelect < 0.35) tempColor.copy(colorCyan);
        else if (rSelect < 0.65) tempColor.copy(colorAmber);
        else if (rSelect < 0.88) tempColor.copy(colorPurple);
        else tempColor.copy(colorWhite);
      }

      colors[idx] = tempColor.r;
      colors[idx + 1] = tempColor.g;
      colors[idx + 2] = tempColor.b;
    }

    const brainGeometry = new THREE.BufferGeometry();
    brainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    brainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const brainMaterial = new THREE.PointsMaterial({
      size: 0.16,
      map: triangleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const brainPoints = new THREE.Points(brainGeometry, brainMaterial);
    
    // Group containing the entire brain
    const brainGroup = new THREE.Group();
    brainGroup.add(brainPoints);
    scene.add(brainGroup);

    // Initial position on the right side of hero (matching Dala layout)
    brainGroup.position.set(0.7, -0.05, 0);
    brainGroup.rotation.y = -Math.PI * 0.35; // Three-quarter profile
    brainGroup.rotation.x = 0.15;

    // ── 4. FLOATING 3D WIREFRAME TRIANGLES & PRISMS (Dala signature) ────────
    const floatingGroup = new THREE.Group();
    scene.add(floatingGroup);

    const prismCount = 28;
    const prisms: {
      mesh: THREE.LineSegments;
      rotSpeedX: number;
      rotSpeedY: number;
      rotSpeedZ: number;
      basePos: THREE.Vector3;
      phase: number;
    }[] = [];

    const prismPalette = [0xFBBF24, 0x22D3EE, 0xC084FC, 0xFFFFFF];

    for (let k = 0; k < prismCount; k++) {
      const rad = 0.12 + Math.random() * 0.22;
      const geom = new THREE.TetrahedronGeometry(rad);
      const edges = new THREE.EdgesGeometry(geom);

      const pColor = prismPalette[k % prismPalette.length];
      const mat = new THREE.LineBasicMaterial({
        color: pColor,
        transparent: true,
        opacity: 0.65 + Math.random() * 0.3,
        blending: THREE.AdditiveBlending,
      });

      const line = new THREE.LineSegments(edges, mat);

      // Distribute in deep space around the brain
      const px = 0.7 + (Math.random() - 0.5) * 4.2;
      const py = (Math.random() - 0.5) * 3.4;
      const pz = -1.5 + Math.random() * 3.5;
      line.position.set(px, py, pz);

      floatingGroup.add(line);

      prisms.push({
        mesh: line,
        rotSpeedX: (Math.random() - 0.5) * 0.02,
        rotSpeedY: (Math.random() - 0.5) * 0.025,
        rotSpeedZ: (Math.random() - 0.5) * 0.015,
        basePos: new THREE.Vector3(px, py, pz),
        phase: Math.random() * Math.PI * 2,
      });
    }

    // ── 5. MOUSE PARALLAX INTERACTION ────────────────────────────────────────
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetMouseX = x * 0.45;
      targetMouseY = y * 0.35;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // ── 6. ANIMATION & RENDER LOOP ───────────────────────────────────────────
    let animationFrameId: number;
    let clock = new THREE.Clock();
    let smoothedProgress = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const p = progressRef ? progressRef.current : internalScrollRef.current; // 0.0 to 1.0
      smoothedProgress += (p - smoothedProgress) * 0.12;

      // Smoothstep curve for particle dispersion / scatter explosion
      const sFactor = smoothedProgress * smoothedProgress * (3 - 2 * smoothedProgress);

      // ── DALA SCROLL MAPPING: 3D Turntable Rotation & Lateral Glide ──
      const targetRotY = -Math.PI * 0.35 + smoothedProgress * Math.PI * 1.7 + mouseX;
      const targetRotX = 0.15 + Math.sin(smoothedProgress * Math.PI) * 0.35 - mouseY;
      const targetRotZ = Math.sin(smoothedProgress * Math.PI * 0.8) * 0.22;

      brainGroup.rotation.y += (targetRotY - brainGroup.rotation.y) * 0.08;
      brainGroup.rotation.x += (targetRotX - brainGroup.rotation.x) * 0.08;
      brainGroup.rotation.z += (targetRotZ - brainGroup.rotation.z) * 0.08;

      // Position transition across scroll stages:
      const targetX = 0.7 - smoothedProgress * 0.85;
      const targetY = -0.05 + Math.sin(smoothedProgress * Math.PI) * 0.15;
      const targetScale = 1.0 + smoothedProgress * 0.18;

      brainGroup.position.x += (targetX - brainGroup.position.x) * 0.08;
      brainGroup.position.y += (targetY - brainGroup.position.y) * 0.08;
      brainGroup.scale.set(targetScale, targetScale, targetScale);

      // ── DYNAMIC PARTICLE SCATTER & REASSEMBLY PIPELINE ──
      const posAttr = brainGeometry.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        const bx = basePositions[idx];
        const by = basePositions[idx + 1];
        const bz = basePositions[idx + 2];
        const sx = scatterOffsets[idx];
        const sy = scatterOffsets[idx + 1];
        const sz = scatterOffsets[idx + 2];
        const phase = randomPhases[i];

        // Synaptic living micro-pulse
        const pulseAmp = 0.015 + sFactor * 0.04;
        const pulse = Math.sin(elapsedTime * 2.2 + by * 2.5 + phase) * pulseAmp;

        posArr[idx]     = bx + sx * sFactor + pulse;
        posArr[idx + 1] = by + sy * sFactor + pulse * 0.6;
        posArr[idx + 2] = bz + sz * sFactor + pulse * 1.1;
      }
      posAttr.needsUpdate = true;

      // Rotate, scatter and float the 3D triangular wireframes
      prisms.forEach((prism) => {
        prism.mesh.rotation.x += prism.rotSpeedX * (1 + sFactor * 2.2);
        prism.mesh.rotation.y += prism.rotSpeedY * (1 + sFactor * 2.2);
        prism.mesh.rotation.z += prism.rotSpeedZ * (1 + sFactor * 2.2);

        // Floating hover + scatter expansion
        const bob = Math.sin(elapsedTime * 1.5 + prism.phase) * 0.15;
        const scatterMul = 1.0 + sFactor * 1.4;
        prism.mesh.position.x = prism.basePos.x * scatterMul;
        prism.mesh.position.y = prism.basePos.y * scatterMul + bob;
        prism.mesh.position.z = prism.basePos.z * scatterMul + smoothedProgress * 1.2;

        prism.mesh.scale.setScalar(1 + sFactor * 0.6);
      });

      renderer.render(scene, camera);
    };

    animate();

    // ── 7. RESIZE LISTENER ───────────────────────────────────────────────────
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // ── 8. CLEANUP ───────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      brainGeometry.dispose();
      brainMaterial.dispose();
      triangleTexture.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative select-none pointer-events-none ${className}`}
    />
  );
};
