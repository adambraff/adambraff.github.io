// Life Signals — small-multiples decomposition of non-weight signals, aligned
// to the weight trend. Each panel shows one signal's 365-day centered trend
// (colored line) with a faint daily-point cloud behind it. All panels share
// the same x-axis; the reader scans vertically to pattern-match with weight.

(function(){
  const DAY_MS_LS = 86400000;

  // Which signals appear, in what order, with what accent color.
  const PANEL_DEFS = [
    { key: 'weight',        color: '#ececed', accent: false, fmt: v => v.toFixed(1) + ' lb' },
    { key: 'steps',         color: '#6c8cff', accent: true,  fmt: v => Math.round(v).toLocaleString() },
    { key: 'sleep_total',   color: '#9d8fff', accent: true,  fmt: v => v.toFixed(2) + ' hr' },
    { key: 'walk_speed',    color: '#4ae04a', accent: true,  fmt: v => v.toFixed(2) + ' mph' },
    { key: 'active_energy', color: '#ff5555', accent: true,  fmt: v => Math.round(v) + ' cal' },
    { key: 'double_support',color: '#00d9ff', accent: true,  fmt: v => (v*100).toFixed(2) + '%' },
  ];

  const PANEL_H = 86;
  const MARGIN  = { top: 10, right: 14, bottom: 2, left: 60 };
  const X_AXIS_H = 22;

  function LifeSignals({ signals, start, count }) {
    const ref = React.useRef(null);
    const width = useContainerWidth(ref, 900);
    const [hoverIdx, setHoverIdx] = React.useState(null);

    const startMs = parseDay(start);
    const endMs   = startMs + (count - 1) * DAY_MS_LS;

    const sx = scale([startMs, endMs], [MARGIN.left, width - MARGIN.right]);

    // Year ticks: one per year
    const y0 = new Date(startMs).getUTCFullYear();
    const y1 = new Date(endMs).getUTCFullYear();
    const yearTicks = [];
    for (let y = y0; y <= y1; y++) yearTicks.push(Date.UTC(y, 0, 1));
    const yearFmt = t => new Date(t).getUTCFullYear();

    const totalH = PANEL_DEFS.length * PANEL_H + X_AXIS_H + MARGIN.top;

    // Build per-panel y-scales from signal values (trim to visible first/last idx)
    const panels = PANEL_DEFS.map((def, idx) => {
      const sig = signals[def.key];
      if (!sig) return null;
      const top = MARGIN.top + idx * PANEL_H;
      const innerH = PANEL_H - 12;

      // y-domain from trend range (primary) — tighter than raw range
      const trend = sig.trend;
      const vals  = sig.values;
      let lo = Infinity, hi = -Infinity;
      for (const v of trend) if (v != null && v !== undefined) { if (v < lo) lo = v; if (v > hi) hi = v; }
      // pad 5%
      const pad = (hi - lo) * 0.1 || 1;
      lo -= pad; hi += pad;

      const sy = scale([lo, hi], [top + innerH, top + 4]);
      sy.w = width - MARGIN.right;

      return { def, sig, top, innerH, sy, lo, hi };
    }).filter(Boolean);

    // Hover tracking
    const onMove = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < MARGIN.left || x > width - MARGIN.right) { setHoverIdx(null); return; }
      const ms = sx.invert(x);
      const idx = Math.max(0, Math.min(count - 1, Math.round((ms - startMs) / DAY_MS_LS)));
      setHoverIdx(idx);
    };
    const onLeave = () => setHoverIdx(null);

    // Precompute trend line paths once per width
    const trendPaths = React.useMemo(() => {
      return panels.map(p => {
        const pts = [];
        const trend = p.sig.trend;
        for (let i = 0; i < trend.length; i++) {
          const v = trend[i];
          const xp = sx(startMs + i * DAY_MS_LS);
          const yp = v == null ? null : p.sy(v);
          pts.push([xp, yp]);
        }
        return linePath(pts);
      });
    }, [width, panels.length]);

    // Daily dots as raster: we don't want to render 4k circles per panel.
    // Instead, draw a thin "min-max band" of daily values behind the trend
    // by sampling weekly min/max — visually looks like a cloud, very cheap.
    const bands = React.useMemo(() => {
      return panels.map(p => {
        const vals = p.sig.values;
        const step = 7; // weekly
        const upper = [], lower = [];
        for (let i = 0; i < vals.length; i += step) {
          let lo = Infinity, hi = -Infinity;
          for (let j = i; j < Math.min(i + step, vals.length); j++) {
            const v = vals[j];
            if (v != null) { if (v < lo) lo = v; if (v > hi) hi = v; }
          }
          const x = sx(startMs + (i + step/2) * DAY_MS_LS);
          if (lo !== Infinity) { upper.push([x, p.sy(hi)]); lower.push([x, p.sy(lo)]); }
          else { upper.push([x, null]); lower.push([x, null]); }
        }
        // areaPath wants continuous; split into contiguous chunks
        const chunks = [];
        let cur = [];
        for (let i = 0; i < upper.length; i++) {
          if (upper[i][1] == null || lower[i][1] == null) {
            if (cur.length) { chunks.push(cur); cur = []; }
          } else {
            cur.push([upper[i][0], lower[i][1], upper[i][1]]);
          }
        }
        if (cur.length) chunks.push(cur);
        return chunks.map(areaPath).join(' ');
      });
    }, [width, panels.length]);

    return (
      <div className="chart-wrap" ref={ref} style={{padding:'18px 20px 12px'}}>
        <div className="chart-title">Life signals, decomposed</div>
        <div className="chart-sub">
          Each row is one signal's 365-day centered trend. Faint band behind shows weekly min–max of daily readings.
          Scan vertically: where does a signal rise or fall around weight's inflections?
        </div>

        <svg width={width} height={totalH} onMouseMove={onMove} onMouseLeave={onLeave}
             style={{display:'block', marginTop:6}}>
          {/* Panels */}
          {panels.map((p, i) => (
            <g key={p.def.key}>
              {/* Panel background separator (between panels) */}
              {i > 0 && <line x1={MARGIN.left} x2={width-MARGIN.right}
                y1={p.top} y2={p.top} className="gridline" />}

              {/* Y-axis: just show domain endpoints */}
              <text x={MARGIN.left - 8} y={p.sy(p.hi) + 3} className="axis-text" textAnchor="end"
                style={{fontSize:10, fill:'var(--fg-muted-2)'}}>
                {p.def.fmt(p.hi)}
              </text>
              <text x={MARGIN.left - 8} y={p.sy(p.lo) + 3} className="axis-text" textAnchor="end"
                style={{fontSize:10, fill:'var(--fg-muted-2)'}}>
                {p.def.fmt(p.lo)}
              </text>

              {/* Label */}
              <text x={MARGIN.left + 6} y={p.top + 14} style={{fontSize:11, fontWeight:600, fill:'var(--fg)'}}>
                {p.sig.label}
              </text>
              <text x={MARGIN.left + 6} y={p.top + 28} style={{fontSize:9.5, fill:'var(--fg-muted)'}}>
                {p.sig.unit && p.sig.unit}
              </text>

              {/* Weekly min-max band */}
              <path d={bands[i]} fill={p.def.color} opacity={0.11} />

              {/* Trend line */}
              <path d={trendPaths[i]} fill="none" stroke={p.def.color}
                strokeWidth={p.def.accent ? 1.8 : 2.2}
                opacity={p.def.accent ? 0.95 : 1.0} />

              {/* Hover marker */}
              {hoverIdx !== null && p.sig.trend[hoverIdx] != null && (
                <circle cx={sx(startMs + hoverIdx * DAY_MS_LS)}
                        cy={p.sy(p.sig.trend[hoverIdx])}
                        r="3" fill={p.def.color} stroke="#0d0d10" strokeWidth="1" />
              )}
            </g>
          ))}

          {/* X axis at bottom */}
          <XAxisTime scaleX={sx} y={MARGIN.top + panels.length * PANEL_H + 4}
                     ticks={yearTicks.filter((_, i) => i % 2 === 0)} fmt={yearFmt} />

          {/* Hover crosshair */}
          {hoverIdx !== null && (
            <line x1={sx(startMs + hoverIdx * DAY_MS_LS)} x2={sx(startMs + hoverIdx * DAY_MS_LS)}
                  y1={MARGIN.top} y2={MARGIN.top + panels.length * PANEL_H}
                  stroke="var(--fg-muted)" strokeDasharray="2 3" strokeWidth="1" opacity="0.6" />
          )}
        </svg>

        {/* Hover readout */}
        {hoverIdx !== null && (
          <div style={{
            marginTop: 8, padding: '8px 12px', background: '#0f1117',
            border: '1px solid var(--border-soft)', borderRadius: 4,
            display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '0.78rem'
          }}>
            <span style={{color: 'var(--fg-muted)'}}>
              {fmtDayShort(startMs + hoverIdx * DAY_MS_LS)}
            </span>
            {panels.map(p => {
              const raw = p.sig.values[hoverIdx];
              const tr  = p.sig.trend[hoverIdx];
              return (
                <span key={p.def.key} style={{color: p.def.color, fontVariantNumeric: 'tabular-nums'}}>
                  <b>{p.sig.label}:</b>{' '}
                  {tr != null ? p.def.fmt(tr) : '—'}
                  {raw != null && <span style={{color:'var(--fg-muted-2)', marginLeft:4}}>
                    (raw {p.def.fmt(raw)})
                  </span>}
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  window.LifeSignals = LifeSignals;
})();
