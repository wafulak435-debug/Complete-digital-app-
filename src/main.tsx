import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { handleOfflineFetch } from './utils/offlineAi';

// Global Fetch Interceptor for Bungoma Offline Core
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlString = typeof input === "string" ? input : (input instanceof URL ? input.href : input.url);
    const offlineResponse = handleOfflineFetch(urlString, init);
    if (offlineResponse !== null) {
      const mockRes = await offlineResponse;
      return mockRes as unknown as Response;
    }
    return originalFetch.apply(this, [input, init]);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register background offline Service Worker
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then((registration) => {
        console.log("🔒 Wafula reads offline service worker registered successfully:", registration.scope);
      })
      .catch((error) => {
        console.error("❌ Service worker registration failed:", error);
      });
  });
}
