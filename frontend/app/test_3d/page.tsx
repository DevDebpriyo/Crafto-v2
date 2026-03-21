"use client";

import { useEffect, useState } from "react";
import TestModelViewer from "@/components/TestModelViewer";

interface ProductState {
  trellis_output?: {
    model_file?: string;
  };
  status?: string;
}

export default function Test3DPage() {
  const [modelUrl, setModelUrl] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load the test model from public folder
    setModelUrl("/test_model.glb");
    setIsLoading(false);
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden">
      <TestModelViewer
        modelUrl={modelUrl}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}

