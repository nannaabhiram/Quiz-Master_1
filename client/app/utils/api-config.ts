// Dynamic API configuration that works on any network
let cachedApiBase: string | null = null;

export async function getApiBase(): Promise<string> {
  if (cachedApiBase) return cachedApiBase;

  // 1) Runtime-injected API base (SSR)
  try {
    if (typeof window !== 'undefined') {
      const runtime = (window as any).__API_BASE__;
      if (runtime && typeof runtime === 'string') {
        cachedApiBase = runtime;
        return cachedApiBase;
      }
    }
  } catch (e) {
    // ignore
  }

  // 2) Build-time environment variable
  try {
    const viteBase = (import.meta as any)?.env?.VITE_API_BASE;
    if (viteBase && typeof viteBase === 'string') {
      cachedApiBase = viteBase;
      return cachedApiBase;
    }
  } catch (e) {
    // continue
  }

  // 3) Dynamic detection for production
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    const isRender = currentHost.includes('onrender.com');
    
    if (isRender) {
      // On Render, both frontend and backend are on same domain
      cachedApiBase = window.location.origin;
      return cachedApiBase;
    } else if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      // Local development
      cachedApiBase = 'http://localhost:3000';
    } else {
      // Local network development
      cachedApiBase = `http://${currentHost}:3000`;
    }

    // Test API connectivity (development only)
    if (!isRender) {
      try {
        const response = await fetch(`${cachedApiBase}/health`);
        if (response.ok) return cachedApiBase;
      } catch (error) {
        console.warn('Failed to connect to API at', cachedApiBase);
      }
    }
    
    return cachedApiBase;
  }

  // Fallback
  cachedApiBase = 'http://localhost:3000';
  return cachedApiBase;
}

export function resetApiConfig() {
  cachedApiBase = null;
}