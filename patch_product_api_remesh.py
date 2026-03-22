with open('/home/koushik/Desktop/celo/sello/frontend/lib/product-api.ts', 'r') as f:
    content = f.read()

remesh_api = """
export async function remeshProduct(body: { target_polycount: number, topology: string, resize_height: number, origin_at?: string }): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/product/remesh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}
"""

if "remeshProduct" not in content:
    with open('/home/koushik/Desktop/celo/sello/frontend/lib/product-api.ts', 'a') as f:
        f.write("\n" + remesh_api)
    print("Patched product-api.ts")
