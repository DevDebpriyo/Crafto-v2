"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ZoomIn, ZoomOut, Play, Pause, Settings, Sun, Warehouse, Eye, EyeOff, Download, X, Layers } from "lucide-react";
import { remeshProduct } from "@/lib/product-api";
import ModelViewer, { ModelViewerRef } from "@/components/ModelViewer";
import { AIChatPanel } from "@/components/AIChatPanel";
import { useLoading } from "@/providers/LoadingProvider";
import { getProductState } from "@/lib/product-api";
import { ProductState } from "@/lib/product-types";
import { getCachedModelUrl } from "@/lib/model-cache";

const REMESH_POLL_INTERVAL_MS = 2000;
const REMESH_MAX_WAIT_MS = 10 * 60 * 1000;

function ProductPage() {
  const { stopLoading } = useLoading();
  const [productState, setProductState] = useState<ProductState | null>(null);
  const [currentModelUrl, setCurrentModelUrl] = useState<string>();
  const [modelKey, setModelKey] = useState<string>("");
  const [lightingMode, setLightingMode] = useState<"studio" | "sunset" | "warehouse" | "forest">("studio");
  const [displayMode, setDisplayMode] = useState<"solid" | "wireframe">("solid");
  const [zoomAction, setZoomAction] = useState<"in" | "out" | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isEditInProgress, setIsEditInProgress] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isRemeshOpen, setIsRemeshOpen] = useState(false);
  const [remeshConfig, setRemeshConfig] = useState({ target_polycount: 30000, topology: "triangle", resize_height: 0, origin_at: "" });
  const [isRemeshing, setIsRemeshing] = useState(false);
  
  const latestIterationIdRef = useRef<string | null>(null);
  const isPollingRef = useRef(false);
  const viewerRef = useRef<ModelViewerRef>(null);

  const previewImage =
    productState?.trellis_output?.no_background_images?.[0] ??
    productState?.images?.[0] ??
    null;

  const applyModelUrl = useCallback((url?: string, modelIdentity?: string) => {
    if (!url) return;
    const identity = modelIdentity ?? `url:${url}`;
    console.log(`[ProductPage] 🔄 Applying new model: ${identity}`);
    setCurrentModelUrl(url);
    latestIterationIdRef.current = identity;
    setModelKey(identity); // Force clean remount with new key
  }, []);

  const hydrateProductState = useCallback(async () => {
    try {
      const state = await getProductState();
      const latestIteration = state.iterations.at(-1);
      const iterationId = latestIteration?.id;
      const remoteModelUrl = state.trellis_output?.model_file;
      const modelIdentity = remoteModelUrl ? (iterationId ?? `url:${remoteModelUrl}`) : undefined;
      
      console.log("[ProductPage] 🔍 Hydrating state:", {
        in_progress: state.in_progress,
        has_model: !!remoteModelUrl,
        iteration_id: modelIdentity,
        current_loaded: latestIterationIdRef.current
      });
      
      // Always update product state
        setProductState(state);
      
      // Check if state shows in_progress - if so, resume polling
      if (state.in_progress) {
        console.log("[ProductPage] 🔄 Generation in progress - resuming polling");
        setIsEditInProgress(true);
        // Still try to load previous model if we don't have one loaded
        if (!currentModelUrl && remoteModelUrl && modelIdentity) {
          console.log("[ProductPage] 📦 Loading previous model during generation (render-first)");
          applyModelUrl(remoteModelUrl, modelIdentity);
          void getCachedModelUrl(modelIdentity, remoteModelUrl).catch((cacheError) => {
            console.warn("Model cache warmup failed:", cacheError);
          });
        }
        return;
      }
      
      // Check if this is a new iteration - if so, ALWAYS reload even if we have a model
      const isNewIteration = !!modelIdentity && latestIterationIdRef.current !== modelIdentity;
      const alreadyLoaded = !!modelIdentity && latestIterationIdRef.current === modelIdentity && currentModelUrl;
      
      console.log("[ProductPage] 🔍 Model loading decision:", {
        iterationId: modelIdentity,
        currentIteration: latestIterationIdRef.current,
        isNewIteration,
        alreadyLoaded,
        hasCurrentModel: !!currentModelUrl
      });
      
      // Only skip if we already have this exact iteration loaded
      if (alreadyLoaded && !isNewIteration) {
        console.log("[ProductPage] ♻️ Same iteration already loaded, skipping");
        return;
      }
      
      // Load the model (new iteration or first load)
      if (remoteModelUrl && modelIdentity) {
        console.log("[ProductPage] 📦 Loading model (render-first):", { iterationId: modelIdentity, isNewIteration, url: remoteModelUrl.substring(0, 50) });
        applyModelUrl(remoteModelUrl, modelIdentity);
        void getCachedModelUrl(modelIdentity, remoteModelUrl).catch((cacheError) => {
          console.warn("Model cache warmup failed:", cacheError);
        });
      } else {
        console.log("[ProductPage] ⚠️ No model to load:", { remoteModelUrl, iterationId: modelIdentity });
      }
    } catch (error) {
      console.error("Failed to load product state:", error);
    }
  }, [applyModelUrl, currentModelUrl]);

  const pollUntilProductIdle = useCallback(async () => {
    const start = Date.now();
    while (Date.now() - start < REMESH_MAX_WAIT_MS) {
      const state = await getProductState();
      setProductState(state);

      if (!state.in_progress) {
        await hydrateProductState();
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, REMESH_POLL_INTERVAL_MS));
    }
    throw new Error("Remesh timed out");
  }, [hydrateProductState]);

  const ensureBackgroundPolling = useCallback(async () => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    try {
      await pollUntilProductIdle();
    } catch (error) {
      console.error("Background polling failed:", error);
    } finally {
      isPollingRef.current = false;
      setIsEditInProgress(false);
    }
  }, [pollUntilProductIdle]);

  useEffect(() => {
    // On mount, just hydrate - don't call recovery as it breaks ongoing generations
    hydrateProductState().finally(() => stopLoading());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!zoomAction) return;
    const timer = setTimeout(() => setZoomAction(null), 200);
    return () => clearTimeout(timer);
  }, [zoomAction]);

  const handleRemeshSubmit = async () => {
    try {
      setIsRemeshing(true);
      setIsEditInProgress(true);
      setIsRemeshOpen(false);
      
      const payload: {
        target_polycount: number;
        topology: string;
        resize_height: number;
        origin_at?: string;
      } = {
        target_polycount: remeshConfig.target_polycount,
        topology: remeshConfig.topology,
        resize_height: remeshConfig.resize_height || 0,
      };
      if (remeshConfig.origin_at) {
        payload.origin_at = remeshConfig.origin_at;
      }
      
      await remeshProduct(payload);
      await pollUntilProductIdle();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRemeshing(false);
      setIsEditInProgress(false);
    }
  };

  useEffect(() => {
    if (!productState?.in_progress || isRemeshing) return;
    void ensureBackgroundPolling();
  }, [productState?.in_progress, isRemeshing, ensureBackgroundPolling]);

  const handleDownloadScreenshot = useCallback(async () => {
    if (!viewerRef.current || isDownloading || !currentModelUrl) return;
    
    try {
      setIsDownloading(true);
      
      // Temporarily disable auto-rotate
      const wasAutoRotating = autoRotate;
      setAutoRotate(false);
      
      // Wait a bit for the rotation to stop
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Capture screenshot
      const dataUrl = await viewerRef.current.captureScreenshot();
      
      // Create download link
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `product-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Restore auto-rotate
      if (wasAutoRotating) {
        setAutoRotate(true);
      }
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
      alert("Failed to capture screenshot. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }, [autoRotate, currentModelUrl, isDownloading]);

  return (
    <>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative bg-muted/30">
          <ModelViewer
            ref={viewerRef}
            key={modelKey}
            modelUrl={currentModelUrl}
            lightingMode={lightingMode}
            wireframe={displayMode === "wireframe"}
            zoomAction={zoomAction}
            autoRotate={autoRotate}
          />

          {previewImage && (
              <div 
                className="absolute bottom-4 left-4 w-48 border-4 border-black bg-card shadow-[4px_4px_0_rgba(0,0,0,0.5)] cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0_rgba(0,0,0,0.5)]"
                onClick={() => setIsGalleryOpen(true)}
              >
                <div className="flex justify-between items-center px-3 py-1 border-b-2 border-black bg-black text-white">
                  <span className="text-[10px] font-mono uppercase">Latest Render</span>
                  <Eye className="w-3 h-3" />
              </div>
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={previewImage}
                  alt="Latest generated preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button 
              size="icon" 
              variant="secondary" 
              onClick={handleDownloadScreenshot}
              disabled={isDownloading || !currentModelUrl}
              title="Download Screenshot"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download className="w-4 h-4" />
              )}
            </Button>
            <Button size="icon" variant="secondary" onClick={() => setZoomAction("in")}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="secondary" onClick={() => setZoomAction("out")}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="secondary" onClick={() => setAutoRotate(!autoRotate)}>
              {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button size="icon" variant="secondary" onClick={() => setIsRemeshOpen(true)} title="Remesh Model">
              <Layers className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="secondary">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLightingMode("studio")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Studio Lighting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLightingMode("sunset")}>
                  <Sun className="w-4 h-4 mr-2" />
                  Sunset Lighting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLightingMode("warehouse")}>
                  <Warehouse className="w-4 h-4 mr-2" />
                  Warehouse Lighting
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDisplayMode("solid")}>
                  <Eye className="w-4 h-4 mr-2" />
                  Solid View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDisplayMode("wireframe")}>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Wireframe View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="w-[380px] border-l-2 border-black bg-card overflow-hidden flex flex-col shrink-0">
          <div className="border-b-2 border-black shrink-0 px-4 py-3">
            <h2 className="text-sm font-semibold">
              Chat
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <AIChatPanel
              productState={productState}
              isEditInProgress={isEditInProgress}
              onEditStart={() => setIsEditInProgress(true)}
              onEditComplete={async () => {
                await hydrateProductState();
                setIsEditInProgress(false);
              }}
              onEditError={() => setIsEditInProgress(false)}
            />
          </div>
        </div>
      </div>
    </div>
        {/* Remesh Modal */}
        {isRemeshOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="relative w-full max-w-md bg-card border-4 border-black p-6 shadow-[8px_8px_0_rgba(0,0,0,1)]">
              <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-4">
                <h2 className="text-xl font-bold font-mono">Remesh Model</h2>
                <Button variant="outline" size="icon" onClick={() => setIsRemeshOpen(false)} className="h-8 w-8 border-2 border-black hover:bg-black hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="space-y-4 font-mono">
                <div>
                  <label className="block text-sm font-bold mb-1">Target Polycount</label>
                  <input type="number" value={remeshConfig.target_polycount} onChange={(e) => setRemeshConfig({...remeshConfig, target_polycount: parseInt(e.target.value) || 30000})} className="w-full border-2 border-black p-2" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Topology</label>
                  <select value={remeshConfig.topology} onChange={(e) => setRemeshConfig({...remeshConfig, topology: e.target.value})} className="w-full border-2 border-black p-2 bg-background">
                    <option value="triangle">Triangle</option>
                    <option value="quad">Quad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Resize Height (0 for no resize)</label>
                  <input type="number" step="0.1" value={remeshConfig.resize_height} onChange={(e) => setRemeshConfig({...remeshConfig, resize_height: parseFloat(e.target.value) || 0})} className="w-full border-2 border-black p-2" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Origin Offset</label>
                  <select value={remeshConfig.origin_at} onChange={(e) => setRemeshConfig({...remeshConfig, origin_at: e.target.value})} className="w-full border-2 border-black p-2 bg-background">
                    <option value="">No effect</option>
                    <option value="center">Center</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" className="border-2 border-black" onClick={() => setIsRemeshOpen(false)}>Cancel</Button>
                <Button onClick={handleRemeshSubmit} disabled={isRemeshing} className="bg-black text-white hover:bg-black/80">Start</Button>
              </div>
            </div>
          </div>
        )}
      {/* Gallery Modal */}
      {isGalleryOpen && productState?.images && productState.images.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-5xl bg-card border-4 border-black p-6 shadow-[8px_8px_0_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-4">
              <h2 className="text-xl font-bold font-mono">Input Views</h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsGalleryOpen(false)}
                className="h-8 w-8 rounded-none border-2 border-black hover:bg-black hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {productState.images.map((img, idx) => (
                <div key={idx} className="relative aspect-square border-2 border-black bg-muted overflow-hidden">
                  <img
                    src={img}
                    alt={`View ${idx + 1}`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-0 left-0 bg-black text-white text-[10px] uppercase font-mono px-2 py-1">
                    View {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  export default ProductPage;
