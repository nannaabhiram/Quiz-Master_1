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

  // 2) Build-time Vite variable
  try {
    const viteBase = (import.meta as any)?.env?.VITE_API_BASE;
    if (viteBase && typeof viteBase === 'string') {
      cachedApiBase = viteBase;
      return cachedApiBase;
    }
  } catch (e) {
    // continue to dynamic detection
  }

  // 3) Production detection
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    const isProduction = currentHost.includes('onrender.com') || currentHost.includes('herokuapp.com') || currentHost.includes('vercel.app');
    
    if (isProduction) {
      // For production, API is usually on the same domain
      const protocol = window.location.protocol; // Will be 'https:'
      cachedApiBase = `${protocol}//${currentHost}`;
    } else if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      cachedApiBase = 'http://localhost:3000';
    } else {
      // Local network (development)
      cachedApiBase = `http://${currentHost}:3000`;
    }

    // Test if the API is reachable (only for non-production)
    if (!isProduction) {
      try {
        const response = await fetch(`${cachedApiBase}/health`);
        if (response.ok) return cachedApiBase;
      } catch (error) {
        console.warn('Failed to detect API base automatically:', error);
      }
    }
    
    return cachedApiBase;
  }

  // Final fallback
  cachedApiBase = 'http://localhost:3000';
  return cachedApiBase;
}

export function resetApiConfig() {
  cachedApiBase = null;
}