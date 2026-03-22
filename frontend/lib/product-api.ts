import { ProductState, ProductStatus } from "@/lib/product-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage: string;
    const contentType = response.headers.get("content-type");
    
    try {
      if (contentType?.includes("application/json")) {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
      } else {
        errorMessage = await response.text();
      }
    } catch (e) {
      errorMessage = `Request failed with status ${response.status}`;
    }
    
    // Provide user-friendly messages for common errors
    if (response.status === 409 && errorMessage.includes("Generation already running")) {
      errorMessage = "A product generation is already in progress. Please wait for it to complete or use the recover option.";
    }
    
    throw new Error(errorMessage || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function createProduct(prompt: string, imageCount: number = 1, trellisModelId?: string): Promise<ProductStatus> {
  const response = await fetch(`${API_BASE}/product/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, image_count: imageCount, trellis_model_id: trellisModelId }),
  });

  return handleResponse(response);
}

export async function editProduct(prompt: string, trellisModelId?: string): Promise<ProductStatus> {
  const response = await fetch(`${API_BASE}/product/edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, trellis_model_id: trellisModelId }),
  });

  return handleResponse(response);
}

export async function getProductState(): Promise<ProductState> {
  const response = await fetch(`${API_BASE}/product`);
  return handleResponse<ProductState>(response);
}

export async function getProductStatus(): Promise<ProductStatus> {
  const response = await fetch(`${API_BASE}/product/status`);
  return handleResponse<ProductStatus>(response);
}

export async function rewindProduct(
  iterationIndex: number,
): Promise<{ status: string; iteration_index: number; total_iterations: number }> {
  const response = await fetch(`${API_BASE}/product/rewind/${iterationIndex}`, {
    method: "POST",
  });
  return handleResponse(response);
}

export async function recoverProductState(): Promise<{ recovered: boolean; message?: string }> {
  const response = await fetch(`${API_BASE}/product/recover`, {
    method: "POST",
  });
  return handleResponse(response);
}

export async function exportProductFormats(): Promise<{ status: string; files: Record<string, string> }> {
  const response = await fetch(`${API_BASE}/product/export`, {
    method: "POST",
  });
  return handleResponse(response);
}

export async function downloadProductExport(format: "blend" | "stl" | "jpg"): Promise<Blob> {
  const response = await fetch(`${API_BASE}/product/export/${format}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }
  return response.blob();
}

export async function clearProductState(): Promise<{ message: string; state: ProductState }> {
  const response = await fetch(`${API_BASE}/product/clear`, {
    method: "POST",
  });
  return handleResponse(response);
}


export async function generateDraft(prompt: string): Promise<{ image_url: string }> {
  const response = await fetch(`${API_BASE}/product/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  return handleResponse(response);
}

export async function editDraft(prompt: string, imageUrl: string): Promise<{ image_url: string }> {
  const response = await fetch(`${API_BASE}/product/draft-edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, image_url: imageUrl }),
  });
  return handleResponse(response);
}

export async function generateDraftMultiview(prompt: string, imageUrl: string): Promise<{ images: string[] }> {
  const response = await fetch(`${API_BASE}/product/draft-multiview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, image_url: imageUrl }),
  });
  return handleResponse(response);
}

export async function startTrellisOnly(prompt: string, images: string[], mode: "create" | "edit" = "create", trellisModelId?: string): Promise<ProductStatus> {
  const response = await fetch(`${API_BASE}/product/trellis-only`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, images, mode, trellis_model_id: trellisModelId }),
  });
  return handleResponse(response);
}


export async function remeshProduct(body: { target_polycount: number, topology: string, resize_height: number, origin_at?: string }): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/product/remesh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}
