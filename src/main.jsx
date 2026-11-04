import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';
import './index.css';

function RootErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div
      role="alert"
      className="w-screen h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-white select-none text-center"
    >
      <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-5 text-2xl">
        ⚠️
      </div>
      <h1 className="text-2xl font-black mb-2 tracking-tight">RoadReady Application Notice</h1>
      <p className="text-zinc-400 text-sm max-w-md mb-6 leading-relaxed">
        An unexpected runtime error occurred. Your learner practice data is safely preserved in local storage.
      </p>
      <div className="flex gap-3">
        <button
          onClick={resetErrorBoundary}
          className="px-6 py-2.5 rounded-full bg-apple-blue hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-lg active:scale-95"
        >
          Resume Session
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm transition-all"
        >
          Reload RoadReady
        </button>
      </div>
      {error?.message && (
        <pre className="mt-8 text-xs text-zinc-500 font-mono bg-zinc-900/80 p-3 rounded-lg max-w-md text-left overflow-x-auto border border-white/5">
          {error.message}
        </pre>
      )}
    </div>
  );
}

// Register PWA Service Worker for Offline Basemap & Asset Caching
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA service worker registration failed:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
