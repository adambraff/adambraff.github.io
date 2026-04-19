// Explorer — interactive scatterplot across all signals.
//
//   X, Y: any signal (raw or day-over-day delta)
//   Size: optional signal (min 2px → max 14px, linear on 1st-99th percentile)
//   Color: optional signal, sequential gradient (cividis-like, dark-friendly)
//   Lag: integer days applied as Y shifted by `lag` relative to X
//        (positive lag = X leads Y → "does X today predict Y in `lag` days?")
//
// All transforms happen client-side from life_signals.json.

(function(){
  const DAY_MS_EX = 86400000;

  // Dark-bg friendly sequential palette (not red-green).
  // Blues -> teals -> yellows, inspired by cividis but tweaked for the app's dark theme.
  const COLOR_STOPS = [
    [0.00, [0x32, 0x3f, 0x9b]],  // deep indigo
    [0.25, [0x3b, 0x6e, 0xc4]],  // blue
    [0.50, [0x3f, 0xab, 0xba]],  // teal
    [0.75, [0xa9, 0xce, 0x5a]],  // lime
    [1.00, [0xff, 0xe8, 0x4c]],  // yellow
  ];

  function gradColor(t) {
    if (t == null || isNaN(t)) return '#666';
    t = Math.max(0, Math.min(1, t));
    for (let i = 1; i < COLOR_STOPS.length; i++) {
      if (t <= COLOR_STOPS[i][0]) {
        const [t0, c0] = COLOR_STOPS[i-1], [t1, c1] = COLOR_STOPS[i];
        const f = (t - t0) / (t1 - t0);
        const r = Math.round(c0[0] + f*(c1[0]-c0[0]));
        const g = Math.round(c0[1] + f*(c1[1]-c0[1]));
        const b = Math.round(c0[2] + f*(c1[2]-c0[2]));
        return `rgb(${r},${g},${b})`;
      }
    }
    return `rgb(${COLOR_STOPS[4][1].join(',')})`;
  }

  function percentile(sorted, p) {
    if (!sorted.length) return null;
    const k = (sorted.length - 1) * p;
    const lo = Math.floor(k), hi = Math.ceil(k);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (k - lo);
  }

  function transform(values, mode) {
    if (mode === 'raw') return values;
    // Δ 1-day
    const n = values.length;
    const out = new Array(n);
    out[0] = null;
    for (let i = 1; i < n; i++) {
      const a = values[i], b = values[i-1];
      out[i] = (a != null && b != null) ? (a - b) : null;
    }
    return out;
  }

  function pearson(xs, ys) {
    const n = xs.length;
    if (n < 3) return null;
    let mx = 0, my = 0;
    for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
    mx /= n; my /= n;
    let sx = 0, sy = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - mx, dy = ys[i] - my;
      sx += dx*dx; sy += dy*dy; sxy += dx*dy;
    }
    const denom = Math.sqrt(sx * sy);
    return denom > 0 ? sxy/denom : null;
  }

  function SigSelect({ label, sigs, value, onChange, allowNone, mode, onModeChange }) {
    const groups = {};
    Object.entries(sigs).forEach(([k, s]) => {
      if (!groups[s.group]) groups[s.group] = [];
      groups[s.group].push([k, s]);
    });
    const groupOrder = ['Body', 'Activity', 'Sleep', 'Gait', 'Other'];
    return (
      <div style={{display:'flex', flexDirection:'column', gap:6, minWidth:180}}>
        <div className="label" style={{fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.05em',
          color:'var(--fg-muted)', fontWeight:600}}>{label}</div>
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{background:'#0f1117', border:'1px solid var(--border)', color:'var(--fg)',
            padding:'6px 8px', borderRadius:4, fontFamily:'var(--font-sans)', fontSize:'0.82rem'}}>
          {allowNone && <option value="none">— None —</option>}
          {groupOrder.filter(g => groups[g]).map(g => (
            <optgroup key={g} label={g}>
              {groups[g].map(([k, s]) => (
                <option key={k} value={k}>{s.label}{s.unit ? ` (${s.unit})` : ''}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {value !== 'none' && (
          <div className="btn-group" style={{alignSelf:'flex-start'}}>
            <button className={clsx('btn small', mode === 'raw' && 'active')}
              onClick={() => onModeChange('raw')}>Raw</button>
            <button className={clsx('btn small', mode === 'delta' && 'active')}
              onClick={() => onModeChange('delta')}>Δ day-over-day</button>
          </div>
        )}
      </div>
    );
  }

  function Explorer({ signals, start, count }) {
    const ref = React.useRef(null);
    const width = useContainerWidth(ref, 820);

    const [xKey, setXKey] = React.useState('steps');
    const [yKey, setYKey] = React.useState('weight');
    const [sKey, setSKey] = React.useState('none');
    const [cKey, setCKey] = React.useState('sleep_total');
    const [xMode, setXMode] = React.useState('raw');
    const [yMode, setYMode] = React.useState('raw');
    const [sMode, setSMode] = React.useState('raw');
    const [cMode, setCMode] = React.useState('raw');
    const [lag, setLag]   = React.useState(0);
    const [hoverPt, setHoverPt] = React.useState(null);
    const [showFit, setShowFit] = React.useState(true);

    const startMs = parseDay(start);

    // ---- Transform inputs ----
    const xVals = React.useMemo(() => transform(signals[xKey].values, xMode), [signals, xKey, xMode]);
    const yVals = React.useMemo(() => transform(signals[yKey].values, yMode), [signals, yKey, yMode]);
    const sVals = React.useMemo(() => sKey === 'none' ? null : transform(signals[sKey].values, sMode),
                                [signals, sKey, sMode]);
    const cVals = React.useMemo(() => cKey === 'none' ? null : transform(signals[cKey].values, cMode),
                                [signals, cKey, cMode]);

    // ---- Build points: X at day i, Y at day (i + lag) ----
    const points = React.useMemo(() => {
      const pts = [];
      for (let i = 0; i < count; i++) {
        const j = i + lag;
        if (j < 0 || j >= count) continue;
        const x = xVals[i], y = yVals[j];
        if (x == null || y == null) continue;
        const s = sVals ? sVals[j] : null;
        if (sVals && s == null) continue;
        const c = cVals ? cVals[j] : null;
        if (cVals && c == null) continue;
        pts.push({ i, j, x, y, s, c });
      }
      return pts;
    }, [xVals, yVals, sVals, cVals, lag, count]);

    // ---- Scales from 1st-99th percentile to shrug off outliers ----
    const xsSorted = React.useMemo(() => points.map(p => p.x).sort((a,b) => a-b), [points]);
    const ysSorted = React.useMemo(() => points.map(p => p.y).sort((a,b) => a-b), [points]);
    const ssSorted = React.useMemo(() => sVals ? points.map(p => p.s).sort((a,b) => a-b) : null, [points, sVals]);
    const csSorted = React.useMemo(() => cVals ? points.map(p => p.c).sort((a,b) => a-b) : null, [points, cVals]);

    const MARGIN = { top: 20, right: cVals ? 70 : 20, bottom: 42, left: 56 };
    const H = 440;
    const plotW = width - MARGIN.left - MARGIN.right;
    const plotH = H - MARGIN.top - MARGIN.bottom;

    const xLo = percentile(xsSorted, 0.01), xHi = percentile(xsSorted, 0.99);
    const yLo = percentile(ysSorted, 0.01), yHi = percentile(ysSorted, 0.99);
    const sx = scale([xLo != null ? xLo : 0, xHi != null ? xHi : 1], [MARGIN.left, MARGIN.left + plotW]);
    const sy = scale([yLo != null ? yLo : 0, yHi != null ? yHi : 1], [MARGIN.top + plotH, MARGIN.top]);
    sy.w = plotW;

    const sizeLo = ssSorted ? percentile(ssSorted, 0.02) : null;
    const sizeHi = ssSorted ? percentile(ssSorted, 0.98) : null;
    const sizeOf = (v) => {
      if (!sVals || v == null || sizeLo == null) return 3.2;
      const t = (v - sizeLo) / (sizeHi - sizeLo || 1);
      return 2 + Math.max(0, Math.min(1, t)) * 12;
    };
    const colorLo = csSorted ? percentile(csSorted, 0.02) : null;
    const colorHi = csSorted ? percentile(csSorted, 0.98) : null;
    const colorOf = (v) => {
      if (!cVals || v == null || colorLo == null) return '#6c8cff';
      const t = (v - colorLo) / (colorHi - colorLo || 1);
      return gradColor(t);
    };

    // ---- Stats ----
    const r = React.useMemo(
      () => pearson(points.map(p => p.x), points.map(p => p.y)),
      [points]
    );

    // Simple linear regression for fit line
    const fit = React.useMemo(() => {
      const n = points.length;
      if (n < 3) return null;
      let sxM = 0, syM = 0;
      for (const p of points) { sxM += p.x; syM += p.y; }
      sxM /= n; syM /= n;
      let num = 0, den = 0;
      for (const p of points) { num += (p.x - sxM)*(p.y - syM); den += (p.x - sxM)**2; }
      if (den === 0) return null;
      const slope = num / den, intercept = syM - slope*sxM;
      return { slope, intercept };
    }, [points]);

    const xTicks = niceTicks(xLo != null ? xLo : 0, xHi != null ? xHi : 1, 6);
    const yTicks = niceTicks(yLo != null ? yLo : 0, yHi != null ? yHi : 1, 6);
    const fmtNum = v => {
      if (v == null) return '—';
      const a = Math.abs(v);
      if (a >= 1000) return Math.round(v).toLocaleString();
      if (a >= 10)   return v.toFixed(1);
      if (a >= 1)    return v.toFixed(2);
      return v.toFixed(3);
    };

    const lagLabel = (l) => {
      if (l === 0) return 'same-day';
      if (Math.abs(l) >= 30) return `${l > 0 ? '+' : ''}${(l/30).toFixed(1)} mo`;
      return `${l > 0 ? '+' : ''}${l} d`;
    };

    return (
      <div>
        {/* Controls */}
        <div className="panel panel-pad" style={{marginBottom:16}}>
          <div style={{display:'flex', gap:20, flexWrap:'wrap', alignItems:'flex-start'}}>
            <SigSelect label="X axis"  sigs={signals} value={xKey} onChange={setXKey}
              mode={xMode} onModeChange={setXMode} />
            <SigSelect label="Y axis"  sigs={signals} value={yKey} onChange={setYKey}
              mode={yMode} onModeChange={setYMode} />
            <SigSelect label="Bubble size (opt)" sigs={signals} value={sKey} onChange={setSKey}
              allowNone mode={sMode} onModeChange={setSMode} />
            <SigSelect label="Color (opt)" sigs={signals} value={cKey} onChange={setCKey}
              allowNone mode={cMode} onModeChange={setCMode} />
          </div>

          <div style={{display:'flex', gap:20, alignItems:'center', marginTop:18, flexWrap:'wrap'}}>
            <div style={{display:'flex', flexDirection:'column', gap:4, flex:'1 1 420px', minWidth:300}}>
              <div className="label" style={{fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.05em',
                color:'var(--fg-muted)', fontWeight:600, display:'flex', justifyContent:'space-between'}}>
                <span>Lag: X at day d, Y at day d + <b style={{color:'var(--blue)'}}>{lag}</b> ({lagLabel(lag)})</span>
                <button className="btn small" onClick={() => setLag(0)} style={{padding:'2px 8px'}}>Reset</button>
              </div>
              <input type="range" min="-180" max="180" step="1" value={lag}
                onChange={e => setLag(+e.target.value)}
                style={{width:'100%', accentColor:'var(--blue)'}} />
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.7rem', color:'var(--fg-muted-2)'}}>
                <span>−180 d</span><span>−90</span><span>0</span><span>+90</span><span>+180 d</span>
              </div>
            </div>

            <button className={clsx('btn small', showFit && 'active')}
              onClick={() => setShowFit(f => !f)}>
              {showFit ? '✓ Fit line' : 'Fit line'}
            </button>
          </div>

          <div style={{marginTop:14, display:'flex', gap:24, fontSize:'0.82rem', color:'var(--fg-muted)', flexWrap:'wrap'}}>
            <span><b style={{color:'var(--fg)'}}>n = {points.length.toLocaleString()}</b> days</span>
            <span>Pearson <b style={{color: r == null ? 'var(--fg-muted)' :
              (Math.abs(r) >= 0.3 ? 'var(--blue)' : 'var(--fg)')}}>r = {r == null ? '—' : r.toFixed(3)}</b></span>
            <span>r² = <b style={{color:'var(--fg)'}}>{r == null ? '—' : (r*r).toFixed(3)}</b></span>
            {lag !== 0 && <span style={{color:'var(--fg-muted-2)', fontStyle:'italic'}}>
              {lag > 0 ? 'X leads Y' : 'Y leads X'} by {Math.abs(lag)} d
            </span>}
          </div>
        </div>

        {/* Chart */}
        <div className="chart-wrap" ref={ref}>
          <div className="chart-title">
            {signals[yKey].label}{yMode === 'delta' ? ' (Δ)' : ''} vs {signals[xKey].label}{xMode === 'delta' ? ' (Δ)' : ''}
          </div>
          <div className="chart-sub">
            {points.length.toLocaleString()} overlapping days
            {sKey !== 'none' && ` · size = ${signals[sKey].label}${sMode === 'delta' ? ' (Δ)' : ''}`}
            {cKey !== 'none' && ` · color = ${signals[cKey].label}${cMode === 'delta' ? ' (Δ)' : ''}`}
          </div>

          <svg width={width} height={H} style={{display:'block'}}>
            {/* Axes */}
            <XAxisTime scaleX={sx} y={MARGIN.top + plotH}
              ticks={xTicks} fmt={fmtNum} />
            <YAxisLeft scaleY={sy} x={MARGIN.left} ticks={yTicks} fmt={fmtNum} />

            {/* Axis labels */}
            <text x={MARGIN.left + plotW/2} y={H - 6} textAnchor="middle"
              style={{fontSize:11, fill:'var(--fg-muted)'}}>
              {signals[xKey].label}{signals[xKey].unit ? ` (${signals[xKey].unit})` : ''}
              {xMode === 'delta' && ' — day-over-day Δ'}
            </text>
            <text transform={`translate(14,${MARGIN.top + plotH/2}) rotate(-90)`}
              textAnchor="middle" style={{fontSize:11, fill:'var(--fg-muted)'}}>
              {signals[yKey].label}{signals[yKey].unit ? ` (${signals[yKey].unit})` : ''}
              {yMode === 'delta' && ' — day-over-day Δ'}
            </text>

            {/* Fit line */}
            {showFit && fit && (
              <line x1={sx(xLo)} x2={sx(xHi)}
                y1={sy(fit.slope * xLo + fit.intercept)} y2={sy(fit.slope * xHi + fit.intercept)}
                stroke="var(--fg-muted)" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.7" />
            )}

            {/* Zero lines for delta modes */}
            {xMode === 'delta' && xLo < 0 && xHi > 0 &&
              <line x1={sx(0)} x2={sx(0)} y1={MARGIN.top} y2={MARGIN.top + plotH}
                stroke="var(--fg-muted-2)" strokeDasharray="2 4" strokeWidth="1" opacity="0.5" />}
            {yMode === 'delta' && yLo < 0 && yHi > 0 &&
              <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={sy(0)} y2={sy(0)}
                stroke="var(--fg-muted-2)" strokeDasharray="2 4" strokeWidth="1" opacity="0.5" />}

            {/* Points */}
            {points.map((p, i) => (
              <circle key={i}
                cx={sx(p.x)} cy={sy(p.y)}
                r={sizeOf(p.s)}
                fill={colorOf(p.c)}
                opacity={sVals ? 0.55 : 0.48}
                stroke="none"
                onMouseEnter={() => setHoverPt(p)}
                onMouseLeave={() => setHoverPt(null)}
              />
            ))}

            {/* Hovered point highlight */}
            {hoverPt && (
              <circle cx={sx(hoverPt.x)} cy={sy(hoverPt.y)} r={sizeOf(hoverPt.s) + 3}
                fill="none" stroke="var(--fg)" strokeWidth="1.5" />
            )}

            {/* Color legend (vertical bar on right) */}
            {cVals && (
              <g transform={`translate(${width - 54},${MARGIN.top})`}>
                <defs>
                  <linearGradient id="expGrad" x1="0" y1="1" x2="0" y2="0">
                    {COLOR_STOPS.map(([t, c], i) => (
                      <stop key={i} offset={t} stopColor={`rgb(${c.join(',')})`} />
                    ))}
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="10" height={plotH} fill="url(#expGrad)" />
                <text x="14" y="6" style={{fontSize:10, fill:'var(--fg-muted)'}}>{fmtNum(colorHi)}</text>
                <text x="14" y={plotH - 2} style={{fontSize:10, fill:'var(--fg-muted)'}}>{fmtNum(colorLo)}</text>
                <text transform={`translate(42, ${plotH/2}) rotate(-90)`} textAnchor="middle"
                  style={{fontSize:10, fill:'var(--fg-muted-2)'}}>
                  {signals[cKey].label}{cMode === 'delta' ? ' Δ' : ''}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Hover tooltip (HTML overlay) */}
        {hoverPt && (
          <div style={{
            marginTop: 10, padding: '10px 14px', background:'#0f1117',
            border: '1px solid var(--border-soft)', borderRadius: 6,
            display:'inline-block', fontSize:'0.82rem', lineHeight:1.6
          }}>
            <div style={{color:'var(--fg-muted)', marginBottom:4}}>
              X: {fmtDayShort(startMs + hoverPt.i * DAY_MS_EX)}
              {lag !== 0 && <span> → Y: {fmtDayShort(startMs + hoverPt.j * DAY_MS_EX)}</span>}
            </div>
            <div style={{fontVariantNumeric:'tabular-nums'}}>
              <span style={{color:'var(--fg-muted)'}}>{signals[xKey].label}{xMode==='delta'?' Δ':''}:</span>{' '}
              <b>{fmtNum(hoverPt.x)}</b>{'  '}
              <span style={{color:'var(--fg-muted)'}}>→ {signals[yKey].label}{yMode==='delta'?' Δ':''}:</span>{' '}
              <b>{fmtNum(hoverPt.y)}</b>
              {sVals && <><span style={{color:'var(--fg-muted)'}}>  · size {signals[sKey].label}:</span>{' '}<b>{fmtNum(hoverPt.s)}</b></>}
              {cVals && <><span style={{color:'var(--fg-muted)'}}>  · color {signals[cKey].label}:</span>{' '}<b>{fmtNum(hoverPt.c)}</b></>}
            </div>
          </div>
        )}
      </div>
    );
  }

  window.Explorer = Explorer;
})();
