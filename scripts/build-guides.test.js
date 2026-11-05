import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, beforeAll } from 'vitest';
import { buildGuides } from './build-guides.mjs';
import { GUIDES } from '../src/data/guides.js';

let outDir;
let written;
beforeAll(async () => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'roadready-guides-'));
  written = await buildGuides({ outDir, siteUrl: 'https://example.test/' });
});

const read = (p) => fs.readFileSync(path.join(outDir, p), 'utf-8');

describe('guide pages', () => {
  it('writes an index plus one page per guide', () => {
    expect(written).toEqual(['/guides/', ...GUIDES.map((g) => `/guides/${g.slug}/`)]);
    for (const p of written) expect(fs.existsSync(path.join(outDir, p, 'index.html'))).toBe(true);
  });

  it('state guides only publish with official sources and a checked date', () => {
    for (const g of GUIDES.filter((x) => x.kind !== 'spots')) {
      expect(g.sources.length).toBeGreaterThan(0);
      for (const s of g.sources) expect(s.url).toMatch(/^https:\/\/(www\.)?dmv\.[a-z]{2}\.gov\//);
      expect(g.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('renders the California facts with sources, canonical link and FAQ data', () => {
    const html = read('guides/california-learner-permit-practice-hours/index.html');
    expect(html).toContain('<link rel="canonical" href="https://example.test/guides/california-learner-permit-practice-hours/">');
    expect(html).toContain('50 hours with a licensed adult aged 25 or older');
    expect(html).toContain('10 of the 50 hours');
    expect(html).toContain('Checked against the official California DMV website on November 5, 2026');
    expect(html).toContain('href="https://www.dmv.ca.gov/portal/teen-drivers/"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('utm_source=guide&amp;utm_campaign=california-learner-permit-practice-hours');
    expect(html).toContain('not affiliated with any DMV');
    expect(html).not.toMatch(/undefined|null|\[object Object\]/);
  });

  it('lists the practice spots with the safety note and no invented ratings', () => {
    const html = read('guides/san-francisco-places-to-practice-driving/index.html');
    expect(html).toContain('Candlestick Point Practice Grounds');
    expect(html).toContain('Always check signs and access rules');
    expect(html).not.toMatch(/\d+% safe|safety score/i);
    expect(html).not.toMatch(/undefined|\[object Object\]/);
  });

  it('escapes quotes and apostrophes in titles', () => {
    const html = read('guides/index.html');
    expect(html).toContain('California learner’s permit');
    expect(html).not.toMatch(/<a href="[^"]*"[^>]*"[^>]*>/);
  });

  it('writes a sitemap and a robots.txt that keeps /admin and /api out of search', () => {
    const sitemap = read('sitemap.xml');
    expect(sitemap).toContain('<loc>https://example.test/</loc>');
    expect(sitemap).toContain('<loc>https://example.test/guides/california-learner-permit-practice-hours/</loc>');
    const robots = read('robots.txt');
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Sitemap: https://example.test/sitemap.xml');
  });
});
