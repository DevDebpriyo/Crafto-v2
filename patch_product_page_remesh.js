const fs = require('fs');

let content = fs.readFileSync('/home/koushik/Desktop/celo/sello/frontend/app/product/page.tsx', 'utf8');

// Add imports
content = content.replace(
  /import \{ (.*?) \} from "lucide-react";/,
  'import { $1, Layers, Settings2 } from "lucide-react";\nimport { remeshProduct } from "@/lib/product-api";'
);

// Add states
content = content.replace(
  /const \[isGalleryOpen, setIsGalleryOpen\] = useState\(false\);/,
  `const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isRemeshOpen, setIsRemeshOpen] = useState(false);
  const [remeshConfig, setRemeshConfig] = useState({ target_polycount: 30000, topology: "triangle", resize_height: 0, origin_at: "" });
  const [isRemeshing, setIsRemeshing] = useState(false);`
);

// Add handleRemeshSubmit
const handleRemeshStr = `
  const handleRemeshSubmit = async () => {
    try {
      setIsRemeshing(true);
      setIsRemeshOpen(false);
      startLoading();
      await remeshProduct({
        target_polycount: remeshConfig.target_polycount,
        topology: remeshConfig.topology,
        resize_height: remeshConfig.resize_height || 0,
        origin_at: remeshConfig.origin_at || undefined
      });
      await pollUntilComplete();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRemeshing(false);
      stopLoading();
    }
  };
`;

content = content.replace(
  /const handleDownloadScreenshot/,
  handleRemeshStr + '\n  const handleDownloadScreenshot'
);

// Add Remesh button to controls
content = content.replace(
  /<DropdownMenu>/,
  `<Button size="icon" variant="secondary" onClick={() => setIsRemeshOpen(true)} title="Remesh Model">
              <Layers className="w-4 h-4" />
            </Button>
            <DropdownMenu>`
);

// Add Modal UI
const modalUI = `
      {isRemeshOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-md bg-card border-4 border-black p-6 shadow-[8px_8px_0_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-4">
              <h2 className="text-xl font-bold font-mono">Remesh Model</h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsRemeshOpen(false)}
                className="h-8 w-8 rounded-none border-2 border-black hover:bg-black hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="space-y-4 font-mono">
              <div>
                <label className="block text-sm font-bold mb-1">Target Polycount</label>
                <input 
                  type="number" 
                  value={remeshConfig.target_polycount} 
                  onChange={(e) => setRemeshConfig({...remeshConfig, target_polycount: parseInt(e.target.value) || 30000})}
                  className="w-full border-2 border-black p-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1">Topology</label>
                <select 
                  value={remeshConfig.topology} 
                  onChange={(e) => setRemeshConfig({...remeshConfig, topology: e.target.value})}
                  className="w-full border-2 border-black p-2"
                >
                  <option value="triangle">Triangle (for detailed geometry)</option>
                  <option value="quad">Quad (for smooth surfaces)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Resize Height (meters, 0 for no resize)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={remeshConfig.resize_height} 
                  onChange={(e) => setRemeshConfig({...remeshConfig, resize_height: parseFloat(e.target.value) || 0})}
                  className="w-full border-2 border-black p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Origin Position</label>
                <select 
                  value={remeshConfig.origin_at} 
                  onChange={(e) => setRemeshConfig({...remeshConfig, origin_at: e.target.value})}
                  className="w-full border-2 border-black p-2"
                >
                  <option value="">No effect</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" className="border-2 border-black" onClick={() => setIsRemeshOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleRemeshSubmit}
                className="bg-black text-white hover:bg-black/80"
              >
                Start Remeshing
              </Button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(
  /\{isGalleryOpen && productState\?\.images/,
  modalUI + '\n      {isGalleryOpen && productState?.images'
);

fs.writeFileSync('/home/koushik/Desktop/celo/sello/frontend/app/product/page.tsx', content);
console.log("Patched page.tsx");
