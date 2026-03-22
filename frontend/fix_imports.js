const fs = require('fs');
let content = fs.readFileSync('/home/koushik/Desktop/celo/sello/frontend/app/product/page.tsx', 'utf8');

// Ensure remesh imports exist
if (!content.includes('import { remeshProduct }')) {
    content = content.replace(
        /import \{ ([\s\S]*?) \} from "lucide-react";/,
        'import { $1, Layers, Settings2 } from "lucide-react";\nimport { remeshProduct } from "@/lib/product-api";'
    );
}
if (!content.includes('Layers className="w-4 h-4"')) {
   content = content.replace(
     /<DropdownMenu>/,
     `<Button size="icon" variant="secondary" onClick={() => setIsRemeshOpen(true)} title="Remesh Model">
              <Layers className="w-4 h-4" />
            </Button>
            <DropdownMenu>`
   );
}
fs.writeFileSync('/home/koushik/Desktop/celo/sello/frontend/app/product/page.tsx', content);
