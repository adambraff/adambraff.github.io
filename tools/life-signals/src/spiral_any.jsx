// SpiralAny — one-turn-per-year spiral, signal-selectable.
// Color = signal value (cool→warm sequential). Angle = calendar position. Radius = year.

(function(){
  const DAY_MS_SP = 86400000;

  // Sequential cool→warm gradient (indigo→blue→teal→lime→yellow) — dark-bg friendly,
  // not red-green.
  const STOPS = [
    [0.00, [0x32, 0x3f, 0x9b]],
    [0.25, [0x3b, 0x6e, 0xc4]],
    [0.50, [0x3f, 0xab, 0xba]],
    [0.75, [0xa9, 0xce, 0x5a]],
    [1.00, [0xff, 0xe8, 0x4c]],
  ];
  function grad(t) {
    if (t == null || isNaN(t)) return '#2e3345';
    t = Math.max(0, Math.min(1, t));
    for (let i = 1; i < STOPS.length; i++) {
      if (t <= STOPS[i][0]) {
        const [t0, c0] = STOPS[i-1], [t1, c1] = STOPS[i];
        const f = (t - t0) / (t1 - t0);
        return `rgb(${Math.round(c0[0]+f*(c1[0]-c0[0]))},${Math.round(c0[1]+f*(c1[1]-c0[1]))},${Math.round(c0[2]+f*(c1[2]-c0[2]))})`;
      }
    }
    return `rgb(${STOPS[4][1].join(',')})`;
  }

  function pctile(sorted, p) {
    if (!sorted.length) return null;
    const k = (sorted.length - 1) * p;
    const lo = Math.floor(k), hi = Math.ceil(k);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (k - lo);
  }

  function rollingMean(values, win) {
    const n = values.length;
    const out = new Array(n).fill(null);
    const half = Math.floor(win/2);
    for (let i = 0; i < n; i++) {
      let s = 0, c = 0;
      for (let j = Math.max(0, i-half); j <= Math.min(n-1, i+half); j++) {
        if (values[j] != null) { s += values[j]; c++; }
      }
      out[i] = c > 0 ? s/c : null;
    }
    return out;
  }

  const MO_SHORT_SP = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function SpiralAny({ signals, start, count, defaultKey = 'weight' }) {
    const [key, setKey] = React.useState(defaultKey);
    const [smoothing, setSmoothing] = React.useState(30);
    const sig = signals[key];
    const startMs = parseDay(start);

    const ref = React.useRef(null);
    const w = useContainerWidth(ref, 520);
    const S = Math.min(w, 560);
    const cx = S/2, cy = S/2;
    const rMax = S/2 - 50;
    const rMin = 60;

    const smoothed = React.useMemo(() => rollingMean(sig.values, smoothing), [sig, smoothing]);

    // Percentile-based color range (2nd-98th) to ignore extreme outliers
    const sortedVals = React.useMemo(() => {
      const arr = smoothed.filter(v => v != null).slice().sort((a,b) => a-b);
      return arr;
    }, [smoothed]);
    const vLo = pctile(sortedVals, 0.02);
    const vHi = pctile(sortedVals, 0.98);

    const firstIdx = sig.firstIdx;
    const lastIdx  = sig.lastIdx;
    const firstMs = startMs + firstIdx * DAY_MS_SP;
    const lastMs  = startMs + lastIdx * DAY_MS_SP;
    const totalYears = (lastMs - firstMs) / (365.25 * DAY_MS_SP);

    // Build points for every day in the signal's active range
    const pts = [];
    for (let i = firstIdx; i <= lastIdx; i++) {
      const ms = startMs + i * DAY_MS_SP;
      const yearsIn = (ms - firstMs) / (365.25 * DAY_MS_SP);
      const dt = new Date(ms);
      const jan1 = Date.UTC(dt.getUTCFullYear(), 0, 1);
      const doy = (ms - jan1) / DAY_MS_SP;
      const theta = (doy / 365.25) * 2 * Math.PI - Math.PI/2;
      const r = rMin + (yearsIn / totalYears) * (rMax - rMin);
      pts.push({
        x: cx + Math.cos(theta) * r,
        y: cy + Math.sin(theta) * r,
        v: smoothed[i],
      });
    }

    const colorOf = (v) => {
      if (v == null || vLo == null || vHi == null) return '#2e3345';
      const t = (v - vLo) / (vHi - vLo || 1);
      return grad(t);
    };

    // Segments: adjacent pts, colored by mean of their values
    const segments = [];
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].v == null || pts[i-1].v == null) continue;
      segments.push({
        x1: pts[i-1].x, y1: pts[i-1].y,
        x2: pts[i].x,   y2: pts[i].y,
        color: colorOf((pts[i].v + pts[i-1].v) / 2),
      });
    }

    // Month ring
    const moLabels = [];
    for (let m = 0; m < 12; m++) {
      const theta = (m/12) * 2 * Math.PI - Math.PI/2;
      const lr = rMax + 20;
      moLabels.push({ x: cx + Math.cos(theta)*lr, y: cy + Math.sin(theta)*lr, label: MO_SHORT_SP[m] });
    }

    // Year markers along top ray
    const yearMarks = [];
    const y0 = new Date(firstMs).getUTCFullYear() + 1;
    const y1 = new Date(lastMs).getUTCFullYear();
    for (let y = y0; y <= y1; y++) {
      const ms = Date.UTC(y, 0, 1);
      const yearsIn = (ms - firstMs) / (365.25 * DAY_MS_SP);
      const r = rMin + (yearsIn / totalYears) * (rMax - rMin);
      yearMarks.push({ y, py: cy - r });
    }

    // Group picker
    const groups = {};
    Object.entries(signals).forEach(([k, s]) => {
      if (!groups[s.group]) groups[s.group] = [];
      groups[s.group].push([k, s]);
    });
    const groupOrder = ['Body','Activity','Sleep','Gait','Other'];

    const fmtV = (v) => {
      if (v == null) return '—';
      const a = Math.abs(v);
      if (a >= 1000) return Math.round(v).toLocaleString();
      if (a >= 100) return v.toFixed(0);
      if (a >= 10) return v.toFixed(1);
      if (a >= 1) return v.toFixed(2);
      return v.toFixed(3);
    };

    return (
      <div>
        <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:12, flexWrap:'wrap'}}>
          <div className="label" style={{fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em',
            color:'var(--fg-muted)', fontWeight:600}}>Signal:</div>
          <select value={key} onChange={e => setKey(e.target.value)}
            style={{background:'#0f1117', border:'1px solid var(--border)', color:'var(--fg)',
              padding:'6px 10px', borderRadius:4, fontSize:'0.88rem', fontFamily:'var(--font-sans)'}}>
            {groupOrder.filter(g => groups[g]).map(g => (
              <optgroup key={g} label={g}>
                {groups[g].map(([k, s]) => (
                  <option key={k} value={k}>{s.label}{s.unit ? ` (${s.unit})` : ''}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:8}}>
            <div className="label" style={{fontSize:'0.68rem', color:'var(--fg-muted)', fontWeight:600}}>
              Smoothing: <b style={{color:'var(--blue)'}}>{smoothing}d</b>
            </div>
            <div className="btn-group">
              {[7, 14, 30, 60, 180].map(n => (
                <button key={n} className={clsx('btn small', smoothing === n && 'active')}
                  onClick={() => setSmoothing(n)}>{n}d</button>
              ))}
            </div>
          </div>
        </div>

        <div ref={ref} style={{width:'100%'}}>
          <div className="chart-title">{sig.label} as a spiral</div>
          <div className="chart-sub">
            Each turn = one year. Color = {smoothing}-day rolling {sig.label.toLowerCase()} ({sig.unit || ''}).
            Angle is calendar position; radius is year. {firstMs && new Date(firstMs).getUTCFullYear()} at the center, {lastMs && new Date(lastMs).getUTCFullYear()} at the edge.
          </div>
          <svg width="100%" height={S} viewBox={`0 0 ${S} ${S}`} style={{display:'block', margin:'0 auto'}}>
            {moLabels.map((m,i) => {
              const theta = (i/12)*2*Math.PI - Math.PI/2;
              return (
                <line key={'mg'+i}
                  x1={cx + Math.cos(theta) * (rMin - 10)}
                  y1={cy + Math.sin(theta) * (rMin - 10)}
                  x2={cx + Math.cos(theta) * rMax}
                  y2={cy + Math.sin(theta) * rMax}
                  stroke="var(--border-soft)" strokeWidth="0.5" />
              );
            })}
            {segments.map((s, i) => (
              <line key={i} x1={s.x1.toFixed(1)} y1={s.y1.toFixed(1)}
                x2={s.x2.toFixed(1)} y2={s.y2.toFixed(1)}
                stroke={s.color} strokeWidth="2.2" strokeLinecap="round" />
            ))}
            {yearMarks.map((m, i) => (
              <text key={i} x={cx + 4} y={m.py} className="axis-text"
                style={{fontSize:9.5, fill:'var(--fg-muted-2)'}}>{m.y}</text>
            ))}
            {moLabels.map((m,i) => (
              <text key={i} x={m.x} y={m.y} textAnchor="middle" dominantBaseline="middle"
                className="axis-text"
                style={{fontSize:10.5, fill:'var(--fg-muted)', fontWeight:600, letterSpacing:'0.05em'}}>
                {m.label.toUpperCase()}
              </text>
            ))}
            {/* Legend */}
            <g transform={`translate(${S-130},${S-36})`}>
              <text x="0" y="0" className="axis-text" style={{fontSize:9, fill:'var(--fg-muted)'}}>{fmtV(vLo)}</text>
              <text x="110" y="0" textAnchor="end" className="axis-text" style={{fontSize:9, fill:'var(--fg-muted)'}}>{fmtV(vHi)}</text>
              <defs>
                <linearGradient id="spiralGrad" x1="0" x2="1" y1="0" y2="0">
                  {STOPS.map(([t, c], i) => (
                    <stop key={i} offset={t} stopColor={`rgb(${c.join(',')})`} />
                  ))}
                </linearGradient>
              </defs>
              <rect x="0" y="4" width="110" height="8" fill="url(#spiralGrad)" rx="2" />
              <text x="55" y="22" textAnchor="middle" className="axis-text"
                style={{fontSize:9, fill:'var(--fg-muted-2)'}}>
                {sig.label}{sig.unit ? ` (${sig.unit})` : ''}
              </text>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  window.SpiralAny = SpiralAny;
})();
