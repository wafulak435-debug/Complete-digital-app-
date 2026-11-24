import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { handleOfflineFetch } from './utils/offlineAi';

// Google Maps Platform Quota Defense Listener (Tier 1)
if (typeof window !== "undefined") {
  (window as any).gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  };
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    origError.apply(console, args);
    const msg = args.map((a) => String(a)).join(' ');
    if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  };
}

// Global Fetch Interceptor for Bungoma Offline Core
const originalFetch = typeof window !== "undefined" ? window.fetch : null;
export async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlString = typeof input === "string" ? input : (input instanceof URL ? input.href : input.url);
  const offlineResponse = handleOfflineFetch(urlString, init);
  if (offlineResponse !== null) {
    const mockRes = await offlineResponse;
    return mockRes as unknown as Response;
  }
  if (originalFetch) {
    return originalFetch(input, init);
  }
  return fetch(input, init);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register background offline Service Worker safely
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Skip if served behind a redirect proxy or iframe sandbox where sw.js might get redirected
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js")
        .then((registration) => {
          console.log("🔒 Wafula reads offline service worker registered successfully:", registration.scope);
        })
        .catch((error) => {
          // Suppress redirect or MIME errors gracefully in cloud preview iframe environments
          console.log("ℹ️ Service worker bypassed (preview environment redirect check):", error?.message || error);
        });
    }
  });
}
