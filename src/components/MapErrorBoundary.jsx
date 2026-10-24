import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('MapErrorBoundary caught a WebGL/Map rendering error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-zinc-900 text-white text-center"
        >
          <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Map Rendering Failed</h2>
          <p className="text-zinc-400 text-sm max-w-md mb-6">
            WebGL could not initialize the map surface, or network connectivity interrupted the map tiles.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-apple-blue hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-md active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Map</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm transition-all"
            >
              Reload Page
            </button>
          </div>
          {this.state.error?.message && (
            <p className="mt-6 text-xs text-zinc-500 font-mono max-w-lg truncate">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
