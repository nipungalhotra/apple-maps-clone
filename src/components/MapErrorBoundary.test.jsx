import { describe, it, expect } from 'vitest';
import { MAP_STYLES, DEFAULT_REGION, API_ENDPOINTS } from '../config/mapConfig';

describe('Map Configuration & Spatial Endpoints', () => {
  it('should define valid fallback styles for light and dark modes', () => {
    expect(MAP_STYLES.light).toBeDefined();
    expect(MAP_STYLES.dark).toBeDefined();
    expect(typeof MAP_STYLES.light).toBe('string');
    expect(typeof MAP_STYLES.dark).toBe('string');
  });

  it('should define valid default coordinates and zoom level', () => {
    expect(Array.isArray(DEFAULT_REGION.center)).toBe(true);
    expect(DEFAULT_REGION.center).toHaveLength(2);
    expect(DEFAULT_REGION.zoom).toBeGreaterThan(0);
  });

  it('should define routing and geocoding API endpoints', () => {
    expect(API_ENDPOINTS.osrmRouting).toContain('project-osrm.org');
    expect(API_ENDPOINTS.photonGeocoding).toContain('komoot.io');
  });
});
