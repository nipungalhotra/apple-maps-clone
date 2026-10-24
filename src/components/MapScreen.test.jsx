import { describe, it, expect } from 'vitest';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import MapScreen, { MapboxGL } from './MapScreen';
import { ErrorBoundary as MapErrorBoundaryAlias } from './MapErrorBoundary';
import useLocation from '../hooks/useLocation';

describe('MapScreen & Mapbox Compatibility', () => {
  it('should export MapScreen component and MapboxGL compatibility shims', () => {
    expect(typeof MapScreen).toBe('function');
    expect(MapboxGL).toBeDefined();
    expect(typeof MapboxGL.Map).toBe('function');
    expect(typeof MapboxGL.Camera).toBe('function');
    expect(typeof MapboxGL.MapView).toBe('function');
  });

  it('should ensure ErrorBoundary is properly imported and defined', () => {
    expect(ReactErrorBoundary).toBeDefined();
    expect(typeof ReactErrorBoundary).toBe('function');
    expect(MapErrorBoundaryAlias).toBeDefined();
    expect(typeof MapErrorBoundaryAlias).toBe('function');
  });

  it('should render MapboxGL.Camera without throwing Invariant Violation', () => {
    expect(() => MapboxGL.Camera()).not.toThrow();
  });

  it('should export useLocation hook', () => {
    expect(typeof useLocation).toBe('function');
  });
});
