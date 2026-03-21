"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Suspense } from "react";
import * as THREE from "three";

interface TestModelViewerProps {
  modelUrl?: string;
  isLoading?: boolean;
  error?: string | null;
}

function Model({
  url,
  wireframe,
  showColor,
}: {
  url: string;
  wireframe: boolean;
  showColor: boolean;
}) {
  const { scene } = useGLTF(url);
  const [originalMaterials] = useState<Map<any, any>>(new Map());

  // Clone the scene to avoid modifying cached materials
  // Use useMemo to prevent re-cloning on every render
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();
    
    // Center the model in 3D space
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    
    // Center the model at origin (0, 0, 0)
    cloned.position.x = -center.x;
    cloned.position.y = -center.y;
    cloned.position.z = -center.z;
    
    return cloned;
  }, [scene]);

  // Store original materials on first render
  useEffect(() => {
    if (originalMaterials.size === 0) {
      clonedScene.traverse((child: any) => {
        if (child.isMesh && child.material) {
          // Clone and store the original material
          originalMaterials.set(child, child.material.clone());
        }
      });
    }
  }, [clonedScene, originalMaterials]);

  // Apply wireframe and color settings to all meshes in the scene
  useEffect(() => {
    clonedScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const originalMaterial = originalMaterials.get(child);
        
        if (!originalMaterial) return;

        if (wireframe) {
          // Wireframe mode: holographic green wireframe
          // Clone from original to avoid stale state
          const wireMaterial = originalMaterial.clone();
          wireMaterial.wireframe = true;
          wireMaterial.color.set("#67B68B"); // Holographic green
          if (wireMaterial.emissive) wireMaterial.emissive.set("#67B68B"); // Glowing effect
          
          // Only set these if the material supports them
          if ("metalness" in wireMaterial) wireMaterial.metalness = 0.3;
          if ("roughness" in wireMaterial) wireMaterial.roughness = 0.7;
          if ("emissiveIntensity" in wireMaterial) wireMaterial.emissiveIntensity = 0.2;

          wireMaterial.needsUpdate = true;
          child.material = wireMaterial;
        } else {
          // Base Texture Mode: restore original material with full color
          const colorMaterial = originalMaterial.clone();
          colorMaterial.wireframe = false; // Explicitly disable wireframe
          colorMaterial.needsUpdate = true;
          child.material = colorMaterial;
        }
      }
    });
  }, [clonedScene, wireframe, showColor, originalMaterials]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      useGLTF.clear(url);
      originalMaterials.clear();
    };
  }, [url, originalMaterials]);

  return <primitive object={clonedScene} />;
}

function LoadingPlaceholder() {
  // Return null to prevent cube from flashing
  return null;
}

function LoadingSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#2A3038]">
      <div className="text-center">
        <div className="mb-4">
          <div className="w-16 h-16 border-4 border-[#4ade80] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
        <p className="text-[#67B68B] text-lg font-semibold mb-2">
          Loading 3D Model
        </p>
        <p className="text-gray-400 text-sm">This may take a few moments...</p>
      </div>
    </div>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#2A3038]">
      <div className="text-center px-8">
        <div className="mb-4">
          <svg
            className="w-16 h-16 text-red-500 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-red-400 text-lg font-semibold mb-2">Error</p>
        <p className="text-gray-400 text-sm">{message}</p>
      </div>
    </div>
  );
}

export default function TestModelViewer({
  modelUrl,
  isLoading,
  error,
}: TestModelViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [contrast, setContrast] = useState(3.0);
  const [exposure, setExposure] = useState(2.0);
  const [wireframe, setWireframe] = useState(true); // Default: wireframe ON
  const [showColor, setShowColor] = useState(false); // Default: Base Texture Mode OFF
  const [autoRotate, setAutoRotate] = useState(true); // Default: auto-rotate ON
  const [lightingMode, setLightingMode] = useState<"studio" | "sunset" | "warehouse" | "forest">("studio");
  const [showLightingDropdown, setShowLightingDropdown] = useState(false);

  // Show loading skeleton while generating
  if (isLoading) {
    return (
      <div className="bg-[#2A3038] border-[0.5px] border-[#67B68B] h-full min-h-[400px] relative">
        <LoadingSkeleton />
      </div>
    );
  }

  // Show error if generation failed
  if (error) {
    return (
      <div className="bg-[#2A3038] border-[0.5px] border-[#67B68B] h-full min-h-[400px] relative">
        <ErrorDisplay message={error} />
      </div>
    );
  }

  return (
    <div className="bg-[#0a0e14] border-[0.5px] border-[#67B68B] w-full h-full relative overflow-hidden">
      {/* Holographic corner accents */}
      <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-[#67B68B] opacity-30" />
      <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-[#67B68B] opacity-30" />
      <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-[#67B68B] opacity-30" />
      <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-[#67B68B] opacity-30" />
      
      {/* Scan line effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(0deg, transparent 0%, rgba(103, 182, 139, 0.03) 50%, transparent 100%)',
          backgroundSize: '100% 4px',
          animation: 'scan 8s linear infinite',
        }}
      />
      
      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(100%); }
        }
      `}</style>
      <Canvas
        camera={{ position: [2, 1.5, 3.5], fov: 50 }}
        gl={{
          toneMapping: 2, // ACESFilmic tone mapping
          toneMappingExposure: exposure,
        }}
      >
        {/* Terminal/Holographic background gradient */}
        <color attach="background" args={["#0a0e14"]} />
        
        {/* Holographic grid effect */}
        <mesh position={[0, 0, -10]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[50, 50, 20, 20]} />
          <meshBasicMaterial 
            color="#67B68B" 
            wireframe 
            transparent 
            opacity={0.08}
          />
        </mesh>

        <Suspense fallback={<LoadingPlaceholder />}>
          {/* HDR Environment for PBR materials */}
          <Environment preset={lightingMode} background={false} />

          {/* Additional subtle lighting with contrast control */}
          <ambientLight intensity={0.5 * contrast} />
          <directionalLight
            position={[5, 5, 5]}
            intensity={0.8 * contrast}
            castShadow
          />
          <directionalLight position={[-5, 3, -5]} intensity={0.3 * contrast} />

          {modelUrl ? (
            <Model
              key={modelUrl}
              url={modelUrl}
              wireframe={wireframe}
              showColor={showColor}
            />
          ) : (
            <LoadingPlaceholder />
          )}

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            minDistance={2}
            maxDistance={10}
            autoRotate={autoRotate}
            autoRotateSpeed={1.5}
          />
        </Suspense>
      </Canvas>

      {/* Top Controls Row */}
      <div className="absolute top-4 left-4 flex gap-3">
        {/* View Mode Selector */}
        <div className="bg-[#161924] border-[0.5px] border-[#3a4560] rounded flex overflow-hidden">
        {/* Base Texture Mode */}
        <button
          onClick={() => {
            setShowColor(true);
            setWireframe(false);
          }}
          className={`w-12 h-12 flex items-center justify-center transition-colors ${
            showColor
              ? "bg-[#67B68B] text-black"
              : "bg-transparent text-[#67B68B] hover:bg-[#2A3142]"
          }`}
          title="Base Texture Mode"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-[1px] bg-[#3a4560]" />

        {/* Wireframe Mode */}
        <button
          onClick={() => {
            setWireframe(true);
            setShowColor(false);
          }}
          className={`w-12 h-12 flex items-center justify-center transition-colors ${
            wireframe
              ? "bg-[#67B68B] text-black"
              : "bg-transparent text-[#67B68B] hover:bg-[#2A3142]"
          }`}
          title="Wireframe Mode"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
        </button>
        </div>
        
        {/* Lighting Mode Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowLightingDropdown(!showLightingDropdown)}
            className="bg-[#161924] border-[0.5px] border-[#3a4560] rounded px-3 h-12 flex items-center gap-2 text-[#67B68B] hover:bg-[#2A3142] transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <span className="text-sm capitalize">{lightingMode}</span>
            <svg
              className={`w-4 h-4 transition-transform ${showLightingDropdown ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          
          {/* Dropdown Menu */}
          {showLightingDropdown && (
            <div className="absolute top-14 left-0 bg-[#161924] border-[0.5px] border-[#3a4560] rounded overflow-hidden z-10 min-w-[140px]">
              {(['studio', 'sunset', 'warehouse', 'forest'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setLightingMode(mode);
                    setShowLightingDropdown(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm capitalize transition-colors ${
                    lightingMode === mode
                      ? 'bg-[#67B68B] text-black'
                      : 'text-[#67B68B] hover:bg-[#2A3142]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vertical Control Stack - Right Side */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 bg-[#2A3038] border-[0.5px] border-[#3a4560] rounded flex flex-col overflow-hidden">
        {/* Reset Camera */}
        <button
          onClick={() => controlsRef.current?.reset()}
          className="w-12 h-12 flex items-center justify-center text-[#67B68B] hover:bg-[#3a4560] transition-colors border-b border-[#3a4560]"
          title="Reset Camera"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        {/* Zoom In */}
        <button
          onClick={() => {
            if (controlsRef.current) {
              const camera = controlsRef.current.object;
              camera.position.multiplyScalar(0.8);
              controlsRef.current.update();
            }
          }}
          className="w-12 h-12 flex items-center justify-center text-[#67B68B] hover:bg-[#3a4560] transition-colors border-b border-[#3a4560]"
          title="Zoom In"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" strokeWidth={2} />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M11 8v6m-3-3h6"
            />
          </svg>
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => {
            if (controlsRef.current) {
              const camera = controlsRef.current.object;
              camera.position.multiplyScalar(1.2);
              controlsRef.current.update();
            }
          }}
          className="w-12 h-12 flex items-center justify-center text-[#67B68B] hover:bg-[#3a4560] transition-colors border-b border-[#3a4560]"
          title="Zoom Out"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" strokeWidth={2} />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M8 11h6"
            />
          </svg>
        </button>

        {/* Auto-Rotate Toggle (Dot Button) */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`w-12 h-12 flex items-center justify-center transition-colors border-b border-[#3a4560] ${
            autoRotate ? "bg-[#67B68B]/20" : "hover:bg-[#3a4560]"
          }`}
          title={autoRotate ? "Stop Auto-Rotate" : "Start Auto-Rotate"}
        >
          <div
            className={`w-3 h-3 rounded-full transition-colors ${
              autoRotate ? "bg-[#67B68B]" : "bg-[#67B68B]/40"
            }`}
          />
        </button>

        {/* Increase Contrast */}
        <button
          onClick={() => setContrast(Math.min(contrast + 0.3, 5.0))}
          className="w-12 h-12 flex items-center justify-center text-[#67B68B] hover:bg-[#3a4560] transition-colors border-b border-[#3a4560]"
          title="Increase Brightness"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v8m4-4H8"
            />
          </svg>
        </button>

        {/* Decrease Contrast */}
        <button
          onClick={() => setContrast(Math.max(contrast - 0.3, 0.5))}
          className="w-12 h-12 flex items-center justify-center text-[#67B68B] hover:bg-[#3a4560] transition-colors"
          title="Decrease Brightness"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 12H8"
            />
          </svg>
        </button>
      </div>

      {/* Bottom Tooltip */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-sm text-[#67B68B]">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Use mouse to rotate, zoom, and pan</span>
      </div>
    </div>
  );
}
