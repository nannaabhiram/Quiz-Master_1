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

  // 2) Build-time environment variable (for production deployment)
  try {
    const viteBase = (import.meta as any)?.env?.VITE_API_BASE;
    if (viteBase && typeof viteBase === 'string') {
      // Handle Render's service URL format
      const apiUrl = viteBase.startsWith('http') 
        ? viteBase 
        : `https://${viteBase}`;
      cachedApiBase = apiUrl;
      console.log('[API Config] Using VITE_API_BASE:', cachedApiBase);
      return cachedApiBase;
    }
  } catch (e) {
    // continue
  }

  // 3) Dynamic detection for production and development
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    const isRenderApp = currentHost.includes('onrender.com');
    
    if (isRenderApp) {
      // On Render, frontend and backend are separate services
      // Frontend: peekaboo-frontend.onrender.com
      // Backend: peekaboo-api.onrender.com
      // Try to construct backend URL from frontend hostname
      const backendHost = currentHost.replace('frontend', 'api');
      cachedApiBase = `https://${backendHost}`;
      console.log('[API Config] Detected Render deployment, using:', cachedApiBase);
      return cachedApiBase;
    } else if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      // Local development
      cachedApiBase = 'http://localhost:3000';
    } else {
      // Local network development
      cachedApiBase = `http://${currentHost}:3000`;
    }

    // Test API connectivity (development only)
    if (!isRenderApp) {
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