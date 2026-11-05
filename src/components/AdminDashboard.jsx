import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../services/apiConfig';

/**
 * Owner-only business dashboard at /admin. Reads GET /api/admin/metrics with the
 * ADMIN_TOKEN (kept in this browser tab only). Answers one question first:
 * "is RoadReady making money?", then shows why (funnel, churn, sources, trend).
 */
const TOKEN_KEY = 'roadready_admin_token';
const PERIODS = [7, 30, 90];

const css = `
.viz-root {
  color-scheme: light;
  --surface-0: #f4f4f2; --surface-1: #fcfcfb; --border: rgba(11,11,11,0.10);
  --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #6f6e69;
  --grid: #e1e0d9; --axis: #c3c2b7; --series-1: #2a78d6;
  --good: #0ca30c; --good-text: #006300; --critical: #d03b3b;
}
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme="light"])) .viz-root {
    color-scheme: dark;
    --surface-0: #111110; --surface-1: #1a1a19; --border: rgba(255,255,255,0.10);
    --text-primary: #f0efec; --text-secondary: #c3c2b7; --text-muted: #9a998f;
    --grid: #2c2c2a; --axis: #383835; --series-1: #3987e5;
    --good: #0ca30c; --good-text: #0ca30c; --critical: #e66767;
  }
}
:root[data-theme="dark"] .viz-root {
  color-scheme: dark;
  --surface-0: #111110; --surface-1: #1a1a19; --border: rgba(255,255,255,0.10);
  --text-primary: #f0efec; --text-secondary: #c3c2b7; --text-muted: #9a998f;
  --grid: #2c2c2a; --axis: #383835; --series-1: #3987e5;
  --good: #0ca30c; --good-text: #0ca30c; --critical: #e66767;
}
.viz-root { position: fixed; inset: 0; overflow-y: auto; background: var(--surface-0); color: var(--text-primary);
  font-family: inherit; /* the app's own typeface, set on <body> in index.html */ font-variant-numeric: tabular-nums; }
.viz-wrap { max-width: 1080px; margin: 0 auto; padding: 24px 16px 64px; }
.viz-card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 16px; padding: 16px; }
.viz-h1 { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; margin: 0; }
.viz-sub { color: var(--text-secondary); font-size: 13px; margin: 4px 0 0; }
.viz-label { color: var(--text-secondary); font-size: 12px; font-weight: 600; }
.viz-muted { color: var(--text-muted); font-size: 12px; }
.viz-filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 16px 0; }
.viz-seg { display: inline-flex; border: 1px solid var(--border); border-radius: 999px; overflow: hidden; }
.viz-seg button { background: transparent; color: var(--text-secondary); border: 0; padding: 6px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.viz-seg button[aria-pressed="true"] { background: var(--text-primary); color: var(--surface-1); }
.viz-input { background: var(--surface-1); color: var(--text-primary); border: 1px solid var(--border); border-radius: 10px; padding: 6px 10px; font-size: 13px; }
.viz-btn { background: var(--series-1); color: #fff; border: 0; border-radius: 10px; padding: 8px 14px; font-weight: 700; font-size: 13px; cursor: pointer; }
.viz-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(max(200px, 30%), 1fr)); }
.viz-tile-value { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; margin-top: 4px; }
.viz-hero { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; }
.viz-hero-value { font-size: 44px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
.viz-status { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border); }
.viz-section { margin-top: 16px; }
.viz-section h2 { font-size: 14px; font-weight: 700; margin: 0 0 12px; }
.viz-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.viz-table th { text-align: left; color: var(--text-secondary); font-weight: 600; padding: 6px 8px; border-bottom: 1px solid var(--grid); }
.viz-table td { padding: 6px 8px; border-bottom: 1px solid var(--grid); }
.viz-table td.num, .viz-table th.num { text-align: right; }
.viz-tooltip { position: absolute; pointer-events: none; background: var(--surface-1); color: var(--text-primary);
  border: 1px solid var(--border); border-radius: 8px; padding: 6px 8px; font-size: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); white-space: nowrap; }
.viz-trends { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.viz-error { color: var(--critical); font-size: 13px; font-weight: 600; }
.viz-funnel-row { display: grid; grid-template-columns: 140px 1fr 110px; grid-template-areas: "label bar value"; align-items: center; gap: 12px; padding: 5px 0; }
@media (max-width: 560px) {
  .viz-funnel-row { grid-template-columns: 1fr auto; grid-template-areas: "label value" "bar bar"; gap: 4px 12px; }
}
`;

const money = (n) => (n === null || n === undefined ? '—' : `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const percent = (n, digits = 1) => (n === null || n === undefined ? '—' : `${(n * 100).toFixed(digits)}%`);
const count = (n) => (n === null || n === undefined ? '—' : n.toLocaleString());

function StatTile({ label, value, note }) {
  return (
    <div className="viz-card">
      <div className="viz-label">{label}</div>
      <div className="viz-tile-value">{value}</div>
      {note && <div className="viz-muted" style={{ marginTop: 4 }}>{note}</div>}
    </div>
  );
}

/** Horizontal funnel: one hue, value + share of visitors labelled on each bar. */
function Funnel({ steps }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...steps.map((s) => s.value));
  const top = steps[0]?.value || 0;
  return (
    <div role="list" aria-label="Conversion funnel" style={{ position: 'relative' }}>
      {steps.map((s, i) => {
        const width = Math.max(0.5, (s.value / max) * 100);
        return (
          <div
            key={s.label}
            role="listitem"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="viz-funnel-row"
          >
            <span className="viz-label" style={{ gridArea: 'label' }}>{s.label}</span>
            <div style={{ height: 22, position: 'relative', gridArea: 'bar' }}>
              <div
                style={{
                  width: `${width}%`, height: '100%', background: 'var(--series-1)',
                  borderRadius: '0 4px 4px 0', opacity: hover === null || hover === i ? 1 : 0.55, transition: 'opacity 120ms'
                }}
              />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'right', gridArea: 'value' }}>
              {count(s.value)}
              <span className="viz-muted" style={{ fontWeight: 500, marginLeft: 6 }}>
                {i === 0 ? '' : top > 0 ? percent(s.value / top) : '—'}
              </span>
            </span>
          </div>
        );
      })}
      <div className="viz-muted" style={{ marginTop: 6 }}>Percentages are the share of all visitors in the period.</div>
    </div>
  );
}

/** Single-series daily line with a crosshair tooltip. */
function TrendChart({ title, data, field }) {
  const [hover, setHover] = useState(null);
  const W = 320, H = 120, PAD = { l: 28, r: 8, t: 8, b: 20 };
  const values = data.map((d) => d[field]);
  const max = Math.max(1, ...values);
  const x = (i) => PAD.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * (W - PAD.l - PAD.r));
  const y = (v) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  // The last day is today and still in progress: draw it dashed so a partial day doesn't read as a drop.
  const full = values.length > 1 ? values.slice(0, -1) : values;
  const path = full.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;
  const partialPath = values.length > 1
    ? `M${x(last - 1).toFixed(1)},${y(values[last - 1]).toFixed(1)} L${x(last).toFixed(1)},${y(values[last]).toFixed(1)}`
    : '';
  const total = values.reduce((a, b) => a + b, 0);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  return (
    <div className="viz-card" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{title}</h3>
        <span className="viz-muted">{count(total)} total</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`${title}: ${count(total)} in the period, peak ${count(max)} per day`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ display: 'block', marginTop: 8, touchAction: 'none' }}
      >
        <line x1={PAD.l} x2={W - PAD.r} y1={y(max)} y2={y(max)} stroke="var(--grid)" strokeWidth="1" />
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="var(--axis)" strokeWidth="1" />
        <text x={PAD.l - 4} y={y(max) + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{max}</text>
        <text x={PAD.l - 4} y={y(0) + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">0</text>
        {data.length > 0 && (
          <>
            <text x={PAD.l} y={H - 4} fontSize="10" fill="var(--text-muted)">{data[0].date.slice(5)}</text>
            <text x={W - PAD.r} y={H - 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">today</text>
          </>
        )}
        <path d={path} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {partialPath && (
          <path d={partialPath} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" opacity="0.7" />
        )}
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--axis)" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(values[hover])} r="4" fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth="2" />
          </>
        )}
        <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} fill="transparent" />
      </svg>
      {hover !== null && (
        <div
          className="viz-tooltip"
          // Sit beside the crosshair, flipping to its left on the right half so it never overflows the card.
          style={
            x(hover) > W / 2
              ? { right: `${100 - (x(hover) / W) * 100 + 2}%`, top: 36, zIndex: 2 }
              : { left: `${(x(hover) / W) * 100 + 2}%`, top: 36, zIndex: 2 }
          }
        >
          <div className="viz-muted">{data[hover].date}{hover === last ? ' (today, so far)' : ''}</div>
          <div style={{ fontWeight: 700 }}>{count(values[hover])} {title.toLowerCase()}</div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
  });
  const [tokenInput, setTokenInput] = useState('');
  const [days, setDays] = useState(30);
  const [costs, setCosts] = useState('');
  const [includeTests, setIncludeTests] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'RoadReady · Business metrics';
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ days: String(days), includeSimulated: includeTests ? '1' : '0' });
    if (costs !== '' && Number.isFinite(Number(costs))) params.set('costs', String(Number(costs)));
    try {
      const res = await fetch(apiUrl(`/api/admin/metrics?${params}`), { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        setError('That admin token was not accepted.');
        setData(null);
        try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
        setToken('');
        return;
      }
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
      setData(body);
    } catch (err) {
      setError(err.message || 'Could not load metrics.');
    } finally {
      setLoading(false);
    }
  }, [token, days, includeTests, costs]);

  useEffect(() => { load(); }, [load]);

  const signIn = (e) => {
    e.preventDefault();
    const t = tokenInput.trim();
    if (!t) return;
    try { sessionStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ }
    setToken(t);
    setTokenInput('');
  };

  const funnelSteps = useMemo(() => data ? [
    { label: 'Visitors', value: data.funnel.visitors },
    { label: 'Saw the paywall', value: data.funnel.paywallViewers },
    { label: 'Created an account', value: data.funnel.signups },
    { label: 'Started checkout', value: data.funnel.checkoutStarts },
    { label: 'Became paying', value: data.funnel.newPaying }
  ] : [], [data]);

  if (!token) {
    return (
      <div className="viz-root">
        <style>{css}</style>
        <div className="viz-wrap" style={{ maxWidth: 420, paddingTop: 80 }}>
          <div className="viz-card">
            <h1 className="viz-h1">Business metrics</h1>
            <p className="viz-sub">Owner only. Enter the ADMIN_TOKEN set on the API server. It is kept in this tab only.</p>
            <form onSubmit={signIn} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <input
                type="password"
                className="viz-input"
                style={{ flex: 1 }}
                aria-label="Admin token"
                placeholder="Admin token"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                autoComplete="off"
              />
              <button className="viz-btn" type="submit">Open</button>
            </form>
            {error && <p className="viz-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  const m = data?.money;
  const profitable = m && m.profitPerMonth >= 0;
  const needed = m && m.breakEvenSubscribers !== null ? Math.max(0, m.breakEvenSubscribers - (data.subscribers.activeMonthly || 0)) : null;

  return (
    <div className="viz-root">
      <style>{css}</style>
      <div className="viz-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h1 className="viz-h1">Is RoadReady making money?</h1>
            <p className="viz-sub">
              Last {days} days{data ? ` · since ${new Date(data.period.since).toLocaleDateString()}` : ''}
              {includeTests ? ' · including test purchases' : ' · real purchases only'}
            </p>
          </div>
          <button
            className="viz-input"
            onClick={() => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } setToken(''); setData(null); }}
          >
            Lock
          </button>
        </div>

        {/* Filters: one row above everything they control */}
        <div className="viz-filters" role="group" aria-label="Filters">
          <div className="viz-seg" role="group" aria-label="Period">
            {PERIODS.map((p) => (
              <button key={p} aria-pressed={days === p} onClick={() => setDays(p)}>{p} days</button>
            ))}
          </div>
          <label className="viz-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Monthly costs $
            <input
              className="viz-input"
              style={{ width: 80 }}
              inputMode="decimal"
              placeholder={m ? String(m.monthlyCosts) : '75'}
              value={costs}
              onChange={(e) => setCosts(e.target.value.replace(/[^0-9.]/g, ''))}
              aria-label="Monthly running costs in dollars"
            />
          </label>
          <label className="viz-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={includeTests} onChange={(e) => setIncludeTests(e.target.checked)} />
            Include test purchases
          </label>
          {loading && <span className="viz-muted">Loading…</span>}
        </div>

        {error && <p className="viz-error" role="alert">{error}</p>}

        {data && (
          <>
            {/* The headline answer */}
            <div className="viz-card viz-hero">
              <div>
                <div className="viz-label">Profit per month, at today's subscribers</div>
                <div className="viz-hero-value">{money(m.profitPerMonth)}</div>
                <div className="viz-muted" style={{ marginTop: 6 }}>
                  {count(data.subscribers.activeMonthly)} paying × {money(m.netPerPayment)} kept each
                  ({money(m.price)} − card fees) − {money(m.monthlyCosts)} running costs
                </div>
              </div>
              <span
                className="viz-status"
                style={{ color: profitable ? 'var(--good-text)' : 'var(--critical)' }}
              >
                <span aria-hidden="true">{profitable ? '✓' : '!'}</span>
                {profitable ? 'Profitable' : `Not yet: ${count(needed)} more subscriber${needed === 1 ? '' : 's'} to break even`}
              </span>
            </div>

            <div className="viz-grid viz-section">
              <StatTile label="Paying subscribers" value={count(data.subscribers.active)} note={`Break-even at ${count(m.breakEvenSubscribers)}`} />
              <StatTile label="Monthly revenue (after fees)" value={money(m.netMrr)} note={`${money(m.grossMrr)} before fees`} />
              <StatTile label="Visitors who pay" value={percent(data.funnel.visitorToPaid, 2)} note={`${count(data.funnel.newPaying)} new in ${days} days`} />
              <StatTile
                label="Monthly cancellations"
                value={percent(data.subscribers.monthlyChurn)}
                note={data.subscribers.avgMonthsRetained ? `Subscribers stay ~${data.subscribers.avgMonthsRetained} months` : 'Not enough history yet'}
              />
              <StatTile label="Value of a customer" value={money(m.lifetimeValue)} note="Kept per subscriber over their lifetime" />
              <StatTile
                label="Max to spend winning one"
                value={money(m.maxAcquisitionCost)}
                note="A third of customer value; above this, ads lose money"
              />
            </div>

            <div className="viz-card viz-section">
              <h2>From visit to paying</h2>
              <Funnel steps={funnelSteps} />
            </div>

            <div className="viz-section">
              <div className="viz-trends">
                <TrendChart title="Visitors" data={data.daily} field="visitors" />
                <TrendChart title="Sign-ups" data={data.daily} field="signups" />
                <TrendChart title="New paying" data={data.daily} field="new_paying" />
              </div>
            </div>

            <div className="viz-card viz-section">
              <h2>Where people come from</h2>
              {data.sources.length === 0 ? (
                <p className="viz-muted">No visits recorded yet. Share links with ?utm_source=tiktok (or google, school…) to see which channels bring paying customers.</p>
              ) : (
                <table className="viz-table">
                  <thead>
                    <tr><th>Source</th><th className="num">Visitors</th><th className="num">Paying</th><th className="num">Visitors who pay</th></tr>
                  </thead>
                  <tbody>
                    {data.sources.map((s) => (
                      <tr key={s.source}>
                        <td>{s.source}</td>
                        <td className="num">{count(s.visitors)}</td>
                        <td className="num">{count(s.paying)}</td>
                        <td className="num">{s.visitors ? percent(s.paying / s.visitors) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <details className="viz-card viz-section">
              <summary className="viz-label" style={{ cursor: 'pointer' }}>Daily numbers (table)</summary>
              <table className="viz-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr><th>Date</th><th className="num">Visitors</th><th className="num">Sign-ups</th><th className="num">New paying</th></tr>
                </thead>
                <tbody>
                  {[...data.daily].reverse().map((d) => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td className="num">{count(d.visitors)}</td>
                      <td className="num">{count(d.signups)}</td>
                      <td className="num">{count(d.new_paying)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>

            <p className="viz-muted viz-section">
              Card fees assume Stripe's standard 2.9% + 30¢ plus 0.7% for subscriptions. Visitors are counted once per device;
              people with Do Not Track or Global Privacy Control switched on are not counted.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
