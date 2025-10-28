// Dynamic API configuration that works on any network
let cachedApiBase: string | null = null;

export async function getApiBase(): Promise<string> {
  // Return cached value when available
  if (cachedApiBase) return cachedApiBase;

  // 1) Runtime-injected API base (SSR or server-side injector)
  try {
    if (typeof window !== 'undefined') {
      const runtime = (window as any).__API_BASE__;
      if (runtime && typeof runtime === 'string') {
        cachedApiBase = runtime;
        return cachedApiBase;
      }
    }
  } catch (e) {
    // ignore and continue to next option
  }

  // 2) Build-time Vite variable (used for static SPA deploys)
  try {
    // import.meta.env is available in Vite-built code; use any to avoid TS errors
    const viteBase = (import.meta as any)?.env?.VITE_API_BASE;
    if (viteBase && typeof viteBase === 'string') {
      cachedApiBase = viteBase;
      return cachedApiBase;
    }
  } catch (e) {
    // continue to dynamic detection
  }

  // 3) Dynamic detection (local/dev fallback)
  try {
    // Only run this in a browser environment
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        cachedApiBase = 'http://localhost:3000';
      } else {
        // Assume API is on same host at port 3000 (use http)
        cachedApiBase = `http://${currentHost}:3000`;
      }

      // Test if the API is reachable
      const response = await fetch(`${cachedApiBase}/health`);
      if (response.ok) return cachedApiBase;
    }
  } catch (error) {
    console.warn('Failed to detect API base automatically:', error);
  }

  // Final fallback
  cachedApiBase = 'http://localhost:3000';
  return cachedApiBase;
}

// Reset cache when network changes
export function resetApiConfig() {
  cachedApiBase = null;
}