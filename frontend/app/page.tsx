"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Upload, Boxes, X, RefreshCw, Wand2, Check } from "lucide-react";
import { useLoading } from "@/providers/LoadingProvider";
import { generateDraft, editDraft, generateDraftMultiview, startTrellisOnly, getProductStatus } from "@/lib/product-api";
import { Bungee } from "next/font/google";

const bungee = Bungee({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bungee",
});

const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes

export default function Home() {
  const router = useRouter();
  const { startLoading, stopLoading } = useLoading();
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Draft Mode States
  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [draftImages, setDraftImages] = useState<string[] | null>(null);
  const [multiviewBackup, setMultiviewBackup] = useState<string[] | null>(null);

  // Remaining path Refs
  const [pathLengths, setPathLengths] = useState<number[]>([]);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedModel, setSelectedModel] = useState("fal-ai/trellis-2");

  const productIdeas = ["Lego", "ball", "hat", "mug", "chair", "pillow", "labubu"];

  useEffect(() => {
    // Just trigger the animation load directly since paths are commented out
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded || draftImage || draftImages) return;
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentProductIndex((prev) => (prev + 1) % productIdeas.length);
        setIsAnimating(false);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoaded, productIdeas.length, draftImage, draftImages]);

  const pollUntilComplete = async () => {
    const startTime = Date.now();
    while (Date.now() - startTime < MAX_WAIT_MS) {
      const status = await getProductStatus();
      if (status.status === "complete") return;
      if (status.status === "error") throw new Error(status.error || status.message || "Generation failed");
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    throw new Error("Generation timed out");
  };

  const handleGenerateDraft = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    startLoading();

    try {
      if (draftImage || draftImages) {
        // Edit mode (edit the base image, clearing multi-view)
        const baseImg = draftImage || (draftImages && draftImages[0]);
        const res = await editDraft(prompt.trim(), baseImg!);
        setDraftImage(res.image_url);
        setDraftImages(null);
        setMultiviewBackup(null);
        setMultiviewBackup(null);
        setPrompt(""); // clear input for next request
      } else {
        // Initial create mode
        const res = await generateDraft(prompt.trim());
        setDraftImage(res.image_url);
        setPrompt("");
      }
    } catch (error) {
      console.error("Draft generation failed:", error);
    } finally {
      setIsGenerating(false);
      stopLoading();
    }
  };

  const handleGenerateMultiView = async () => {
    if (!draftImage) return;
    setIsGenerating(true);
    startLoading();

    try {
      // Generate 3 extra views using identical style
      const multiviewRes = await generateDraftMultiview(prompt.trim() || "same product", draftImage);
      setDraftImages(multiviewRes.images);
      setDraftImage(null); // Clear single image to show grid
      setPrompt("");
    } catch (error) {
      console.error("Multi-view generation failed:", error);
    } finally {
      setIsGenerating(false);
      stopLoading();
    }
  };

  const handleGenerate3D = async () => {
    if (!draftImages || draftImages.length === 0) return;
    setIsGenerating(true);
    startLoading();

    try {
      // Start 3D process with 4 images combined
      await startTrellisOnly(prompt.trim() || "product", draftImages, "create", selectedModel);
      await pollUntilComplete();
      router.push("/product");
    } catch (error) {
      console.error("3D generation failed:", error);
      setIsGenerating(false);
      stopLoading();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerateDraft();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) setImages(prev => [...prev, e.target!.result as string]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const suggestions = [
    { text: "Design a blue water bottle" },
    { text: "Create a brown wooden baseball bat" },
    { text: "Generate a red lego block" },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center h-full p-4 md:p-8 max-w-4xl mx-auto w-full overflow-hidden" 
         onClick={() => { if (multiviewBackup) { setDraftImages(multiviewBackup); setDraftImage(null); setMultiviewBackup(null); } }}>
      
      <div className="flex flex-col items-center w-full space-y-8 z-10" onClick={(e) => e.stopPropagation()}>
        
        {!draftImage && !draftImages && (
          <div className={`space-y-2 text-center mb-4 transition-all duration-500 ease-out ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight relative inline-block">
              Build a{" "}
              <span className={`inline-block w-[160px] text-left transition-all duration-500 ease-in-out ${isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
                {productIdeas[currentProductIndex]}
              </span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Describe your product idea and let AI visualize it for you.
            </p>
          </div>
        )}

        {draftImage && !draftImages && (
           <div className="w-full max-w-lg mb-4 flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-500">
             <div className="flex items-center justify-between w-full">
               <h2 className="text-2xl font-bold">Draft Preview</h2>
               {multiviewBackup && (
                 <Button variant="outline" size="sm" onClick={() => { setDraftImages(multiviewBackup); setDraftImage(null); setMultiviewBackup(null); }}>
                   Back to Grid
                 </Button>
               )}
             </div>
             <div className="relative w-full h-[40vh] min-h-[300px] rounded-2xl border-4 border-black overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white flex items-center justify-center">
                 <img src={draftImage} alt="Draft" className="max-w-full max-h-full object-contain" />
             </div>
             <p className="text-muted-foreground text-center">
               Not quite right? Enter edit instructions below, or continue to generate the 3D model!
             </p>
           </div>
        )}

        {draftImages && draftImages.length > 0 && (
           <div className="w-full max-w-4xl mb-4 flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-500">
             <h2 className="text-2xl font-bold">Multi-View Preview</h2>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full px-4">
               {draftImages.map((img: string, idx: number) => (
                 <div key={idx} onClick={() => { setMultiviewBackup(draftImages); setDraftImage(img); setDraftImages(null); }} className="group relative w-full h-40 md:h-56 rounded-2xl border-4 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white flex items-center justify-center cursor-pointer transition-all hover:scale-[1.02]">
                     <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity flex-col space-y-2">
                       <span className="text-white font-bold text-lg">Edit View {idx + 1}</span>
                       <span className="text-white/80 text-sm px-4 text-center">Click to select this view for editing</span>
                     </div>
                 </div>
               ))}
             </div>
             <p className="text-muted-foreground text-center">
               Review the generated views. If you are satisfied, generate the Final 3D Model!
             </p>
           </div>
        )}


        <div className={`w-full ${draftImage || draftImages ? 'max-w-lg' : 'max-w-2xl'} relative group transition-all duration-500 ease-out ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className={`relative bg-background rounded-xl border-2 border-black overflow-hidden cursor-pointer transition-all duration-300 ease-out ${isFocused ? "scale-[1.005] shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] -translate-y-px -translate-x-px" : "scale-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"}`} onClick={() => document.querySelector<HTMLTextAreaElement>('textarea')?.focus()}>
            
            <div className="p-4 pb-0">
              {!draftImage && images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {images.map((img, index) => (
                    <div key={index} className="relative group/image">
                      <img src={img} alt={`Attachment ${index + 1}`} className="h-16 w-16 object-cover rounded-md border border-black/20" />
                      <button onClick={(e) => { e.stopPropagation(); removeImage(index); }} className="absolute -top-2 -right-2 bg-background text-foreground border-2 border-black rounded-full p-1 opacity-0 group-hover/image:opacity-100 transition-all duration-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:scale-110 active:scale-95">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Textarea
                placeholder={draftImage || draftImages ? "E.g. make it red, add a handle..." : "I want a hexagonal box for organic tea..."}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={isGenerating}
                className="min-h-[100px] w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-lg bg-transparent shadow-none"
              />
            </div>
            
            <div className="flex items-center justify-between p-3 border-t-2 border-black bg-muted/30 cursor-default">
              <div className="flex gap-2">                  <select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="h-9 px-2 text-sm bg-white border-2 border-black rounded-lg cursor-pointer outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    onClick={(e) => e.stopPropagation()}
                    title={selectedModel.includes("trellis") ? "Faster generation" : "High quality"}
                  >
                    <option value="fal-ai/trellis-2" title="Faster generation">Trellis</option>
                    <option value="fal-ai/meshy/v5/multi-image-to-3d" title="High quality">Meshy</option>
                  </select>                {!draftImage && !draftImages && (
                 <>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-black hover:bg-secondary transition-colors duration-200 cursor-pointer" title="Upload reference image" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <Upload className="w-4 h-4" />
                  </Button>
                 </>
                )}
              </div>
              
              <div className="flex gap-3 ml-auto">
                <Button 
                  onClick={(e) => { e.stopPropagation(); handleGenerateDraft(); }}
                  disabled={!prompt.trim() || isGenerating}
                  className={`transition-all duration-300 cursor-pointer ${prompt.trim() && !isGenerating ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} ${draftImage ? 'bg-secondary text-primary border-2 border-black hover:bg-black hover:text-white' : ''}`}
                >
                  {isGenerating && !draftImage ? "Generating..." : draftImage ? "Apply Edit" : "Generate Draft"}
                  {!isGenerating && !draftImage && <ArrowRight className="w-4 h-4 ml-2" />}
                  {draftImage && <RefreshCw className="w-4 h-4 ml-2" />}
                </Button>
                
                {draftImage && !draftImages && (
                  <Button
                    onClick={(e) => { e.stopPropagation(); handleGenerateMultiView(); }}
                    disabled={isGenerating}
                    className="bg-primary text-primary-foreground transition-all duration-300 cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-px hover:translate-x-px hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {isGenerating ? "Generating..." : "Confirm & Gen Multi-View"}
                    <Wand2 className="w-4 h-4 ml-2" />
                  </Button>
                )}

                {draftImages && (
                  <Button
                    onClick={(e) => { e.stopPropagation(); handleGenerate3D(); }}
                    disabled={isGenerating}
                    className="bg-primary text-primary-foreground transition-all duration-300 cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-px hover:translate-x-px hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {isGenerating ? "Generating 3D..." : "Final 3D Generate"}
                    <Check className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {!draftImage && !draftImages && (
          <div className={`flex flex-wrap justify-center gap-3 mt-8 transition-all duration-300 ease-out delay-200 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => setPrompt(suggestion.text)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-background border-2 border-black rounded-full hover:bg-secondary hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
              >
                {suggestion.text}
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
