// DecomposeAny — signal-picker STL decomposition for any signal in life_signals.json.
// Computes monthly seasonal + DOW seasonal + residual on-the-fly from each signal's
// precomputed 365-day centered trend. Renders 4 panels matching the weight STL visual.

(function(){
  const DAY_MS_DC = 86400000;

  function computeDecomposition(values, trend, startMs) {
    const n = values.length;
    // Monthly seasonal = mean of (value - trend) grouped by calendar month
    const mSum = Array(12).fill(0), mCnt = Array(12).fill(0);
    for (let i = 0; i < n; i++) {
      const v = values[i], t = trend[i];
      if (v == null || t == null) continue;
      const m = new Date(startMs + i * DAY_MS_DC).getUTCMonth();
      mSum[m] += (v - t); mCnt[m] += 1;
    }
    const mSeas = mSum.map((s, i) => mCnt[i] > 0 ? s/mCnt[i] : 0);

    // DOW seasonal = mean of (value - trend - mSeas) grouped by day-of-week
    const dSum = Array(7).fill(0), dCnt = Array(7).fill(0);
    for (let i = 0; i < n; i++) {
      const v = values[i], t = trend[i];
      if (v == null || t == null) continue;
      const dt = new Date(startMs + i * DAY_MS_DC);
      const m = dt.getUTCMonth(), w = dt.getUTCDay();
      dSum[w] += (v - t - mSeas[m]); dCnt[w] += 1;
    }
    const dSeas = dSum.map((s, i) => dCnt[i] > 0 ? s/dCnt[i] : 0);

    // Residual per day
    const resid = new Array(n).fill(null);
    for (let i = 0; i < n; i++) {
      const v = values[i], t = trend[i];
      if (v == null || t == null) continue;
      const dt = new Date(startMs + i * DAY_MS_DC);
      resid[i] = v - t - mSeas[dt.getUTCMonth()] - dSeas[dt.getUTCDay()];
    }
    return { mSeas, dSeas, resid };
  }

  // Adaptive number formatter based on magnitude
  function makeFmt(scale) {
    return (v) => {
      if (v == null || isNaN(v)) return '—';
      const a = Math.abs(v);
      const s = scale || a;
      if (s >= 1000) return Math.round(v).toLocaleString();
      if (s >= 100)  return v.toFixed(0);
      if (s >= 10)   return v.toFixed(1);
      if (s >= 1)    return v.toFixed(2);
      return v.toFixed(3);
    };
  }
  function signedFmt(scale) {
    const f = makeFmt(scale);
    return (v) => {
      if (v === 0) return '0';
      if (v == null) return '—';
      return (v > 0 ? '+' : '−') + f(Math.abs(v));
    };
  }

  const DOW_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MO_NAMES  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function DecomposeAny({ signals, start, count, defaultKey = 'weight' }) {
    const [key, setKey] = React.useState(defaultKey);
    const ref = React.useRef(null);
    const width = useContainerWidth(ref, 900);

    const sig = signals[key];
    const startMs = parseDay(start);

    // Compute decomposition
    const { mSeas, dSeas, resid } = React.useMemo(
      () => computeDecomposition(sig.values, sig.trend, startMs),
      [sig, startMs]
    );

    // Slice to valid-data range (first to last non-null trend)
    const firstIdx = sig.firstIdx;
    const lastIdx  = sig.lastIdx;
    const slicedCount = lastIdx - firstIdx + 1;
    const firstMs = startMs + firstIdx * DAY_MS_DC;
    const lastMs  = startMs + lastIdx * DAY_MS_DC;

    // Layout
    const margin = { top: 10, right: 20, bottom: 24, left: 52 };
    const innerW = Math.max(300, width - margin.left - margin.right);
    const panelGap = 12, labelH = 18, panelCount = 4;
    const height = 540;
    const totalInner = height - margin.top - margin.bottom - panelGap*(panelCount-1) - labelH*panelCount;
    const panelH = totalInner / panelCount;

    const sx = scale([firstMs, lastMs], [0, innerW]);

    // ----- Trend panel -----
    let tLo = Infinity, tHi = -Infinity;
    for (let i = firstIdx; i <= lastIdx; i++) {
      const v = sig.trend[i];
      if (v != null) { if (v < tLo) tLo = v; if (v > tHi) tHi = v; }
    }
    const trendRange = tHi - tLo || 1;
    const tPad = trendRange * 0.05;
    const sTrend = scale([tLo - tPad, tHi + tPad], [panelH, 0]); sTrend.w = innerW;
    const fmtTrend = makeFmt(Math.max(Math.abs(tHi), Math.abs(tLo)));

    // ----- Monthly panel -----
    const mAbs = Math.max(...mSeas.map(Math.abs), 0.001);
    const sM = scale([-mAbs * 1.15, mAbs * 1.15], [panelH, 0]); sM.w = innerW;
    const fmtM = signedFmt(mAbs);

    // ----- DOW panel -----
    const dAbs = Math.max(...dSeas.map(Math.abs), 0.001);
    const sD = scale([-dAbs * 1.2, dAbs * 1.2], [panelH, 0]); sD.w = innerW;
    const fmtD = signedFmt(dAbs);

    // ----- Residual panel -----
    const residSorted = resid.filter(v => v != null).sort((a,b) => a-b);
    const pctR = (p) => {
      if (!residSorted.length) return 0;
      return residSorted[Math.floor(residSorted.length * p)];
    };
    const rLim = Math.max(Math.abs(pctR(0.01)), Math.abs(pctR(0.99)), 0.001);
    const sR = scale([-rLim, rLim], [panelH, 0]); sR.w = innerW;
    const fmtR = signedFmt(rLim);

    // 30-day rolling mean of residuals
    const residSmooth = React.useMemo(() => {
      const out = new Array(count).fill(null);
      const half = 15;
      for (let i = firstIdx; i <= lastIdx; i++) {
        const lo = Math.max(firstIdx, i - half), hi = Math.min(lastIdx, i + half);
        let s = 0, c = 0;
        for (let j = lo; j <= hi; j++) if (resid[j] != null) { s += resid[j]; c++; }
        out[i] = c > 0 ? s/c : null;
      }
      return out;
    }, [resid, firstIdx, lastIdx, count]);

    // Build paths
    const trendPath = React.useMemo(() => {
      const pts = [];
      for (let i = firstIdx; i <= lastIdx; i++) {
        const v = sig.trend[i];
        pts.push([sx(startMs + i * DAY_MS_DC), v == null ? null : sTrend(v)]);
      }
      return linePath(pts);
    }, [sig, firstIdx, lastIdx, width]);

    const mPts = React.useMemo(() => {
      const pts = [];
      for (let i = firstIdx; i <= lastIdx; i++) {
        const m = new Date(startMs + i * DAY_MS_DC).getUTCMonth();
        pts.push([sx(startMs + i * DAY_MS_DC), sM(mSeas[m])]);
      }
      return pts;
    }, [mSeas, firstIdx, lastIdx, width]);

    const rDots = React.useMemo(() => {
      const pts = [];
      for (let i = firstIdx; i <= lastIdx; i++) {
        if (resid[i] == null) continue;
        const clamped = Math.max(-rLim, Math.min(rLim, resid[i]));
        pts.push([sx(startMs + i * DAY_MS_DC), sR(clamped)]);
      }
      return pts;
    }, [resid, rLim, firstIdx, lastIdx, width]);

    const rSmoothPts = React.useMemo(() => {
      const pts = [];
      for (let i = firstIdx; i <= lastIdx; i++) {
        const v = residSmooth[i];
        pts.push([sx(startMs + i * DAY_MS_DC), v == null ? null : sR(v)]);
      }
      return pts;
    }, [residSmooth, firstIdx, lastIdx, width]);

    // Year ticks
    const y0 = new Date(firstMs).getUTCFullYear();
    const y1 = new Date(lastMs).getUTCFullYear();
    const step = (y1 - y0) > 8 ? 2 : 1;
    const yearTicks = [];
    for (let y = y0; y <= y1; y += step) yearTicks.push(Date.UTC(y, 0, 1));

    const panels = [
      { title: 'Trend', sub: '365-day centered mean',
        s: sTrend, ticks: niceTicks(tLo, tHi, 4), fmt: fmtTrend, color: '#6c8cff', draw: 'line' },
      { title: 'Monthly', sub: `${signedFmt(mAbs)(-mAbs)} to ${signedFmt(mAbs)(mAbs)}`,
        s: sM, ticks: [-mAbs, 0, mAbs], fmt: fmtM, color: '#ff9d4d', draw: 'area' },
      { title: 'Day-of-week', sub: 'detrended mean',
        s: sD, ticks: [-dAbs, 0, dAbs], fmt: fmtD, color: '#9d8fff', draw: 'dow' },
      { title: 'Residual', sub: 'remainder',
        s: sR, ticks: [-rLim, 0, rLim], fmt: fmtR, color: '#c9c2ff', draw: 'resid' },
    ];

    // Group signals for picker
    const groups = {};
    Object.entries(signals).forEach(([k, s]) => {
      if (!groups[s.group]) groups[s.group] = [];
      groups[s.group].push([k, s]);
    });
    const groupOrder = ['Body','Activity','Sleep','Gait','Other'];

    let yOff = margin.top;

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
          <div style={{fontSize:'0.78rem', color:'var(--fg-muted)'}}>
            {sig.n.toLocaleString()} days · {sig.label} ranges from {fmtTrend(tLo)} to {fmtTrend(tHi)}{sig.unit ? ` ${sig.unit}` : ''}
          </div>
        </div>

        <div className="chart-wrap" ref={ref} style={{paddingTop:12}}>
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{display:'block'}}>
            {panels.map((p, idx) => {
              const y = yOff;
              yOff += labelH + panelH + (idx < panels.length - 1 ? panelGap : 0);
              return (
                <g key={p.title}>
                  <text x={margin.left} y={y + 12}
                    style={{fontSize:10.5, fill:'var(--fg-muted)', textTransform:'uppercase',
                      letterSpacing:'0.05em', fontWeight:600}}>
                    {p.title}<tspan dx="10" style={{fill:'var(--fg-muted-2)', fontWeight:400,
                      textTransform:'none', letterSpacing:0}}>— {p.sub}</tspan>
                  </text>
                  <g transform={`translate(${margin.left},${y + labelH})`}>
                    <YAxisLeft scaleY={p.s} x={0} ticks={p.ticks} fmt={p.fmt} />
                    {p.title !== 'Trend' && (
                      <line x1={0} x2={innerW} y1={p.s(0)} y2={p.s(0)}
                        stroke="var(--border)" strokeWidth="1" />
                    )}
                    {p.draw === 'line' && (
                      <path d={trendPath} fill="none" stroke={p.color} strokeWidth="2" />
                    )}
                    {p.draw === 'area' && (
                      <>
                        <path d={(() => {
                          const zero = p.s(0);
                          let d = `M 0 ${zero}`;
                          mPts.forEach(pt => d += ` L ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`);
                          d += ` L ${innerW} ${zero} Z`;
                          return d;
                        })()} fill={p.color} opacity="0.15" />
                        <path d={linePath(mPts)} fill="none" stroke={p.color} strokeWidth="1.1" />
                      </>
                    )}
                    {p.draw === 'dow' && (() => {
                      const zero = p.s(0);
                      const slot = innerW / 7;
                      const barW = slot * 0.7;
                      return dSeas.map((v, i) => {
                        const cx = slot * i + slot/2;
                        const yy = p.s(v);
                        const top = Math.min(yy, zero);
                        const h = Math.abs(yy - zero);
                        const pos = v >= 0;
                        return (
                          <g key={i}>
                            <rect x={cx - barW/2} y={top} width={barW} height={h}
                              fill={pos ? '#ff6b6b' : '#4ae04a'} opacity="0.75" rx="1" />
                            <text x={cx} y={panelH + 14} textAnchor="middle"
                              style={{fontSize:9.5, fill:'var(--fg-muted)', letterSpacing:'0.04em'}}>
                              {DOW_NAMES[i]}
                            </text>
                            <text x={cx} y={pos ? top - 4 : top + h + 10} textAnchor="middle"
                              style={{fontSize:9.5, fill:'var(--fg-muted-2)', fontVariantNumeric:'tabular-nums'}}>
                              {p.fmt(v)}
                            </text>
                          </g>
                        );
                      });
                    })()}
                    {p.draw === 'resid' && (
                      <>
                        {rDots.map((pt, i) => (
                          <circle key={i} cx={pt[0].toFixed(1)} cy={pt[1].toFixed(1)}
                            r="0.9" fill="#5d5a78" opacity="0.45" />
                        ))}
                        <path d={linePath(rSmoothPts)} fill="none" stroke={p.color} strokeWidth="1.6" />
                      </>
                    )}
                    {idx === panels.length - 1 &&
                      <XAxisTime scaleX={sx} y={panelH} ticks={yearTicks}
                        fmt={t => new Date(t).getUTCFullYear()} />
                    }
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Monthly breakdown table */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(12, 1fr)', gap:4, marginTop:12,
          fontSize:'0.72rem', textAlign:'center'}}>
          {MO_NAMES.map((mo, i) => {
            const v = mSeas[i];
            const pos = v > 0;
            return (
              <div key={i} style={{padding:'6px 2px', borderRadius:3,
                background: Math.abs(v) < 0.001 ? 'transparent' :
                  (pos ? 'rgba(255,107,107,0.12)' : 'rgba(74,224,74,0.12)'),
                border:'1px solid var(--border-soft)'}}>
                <div style={{color:'var(--fg-muted)', fontWeight:600}}>{mo}</div>
                <div style={{fontVariantNumeric:'tabular-nums', color: pos ? '#ff6b6b' : '#4ae04a', marginTop:2}}>
                  {fmtM(v)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  window.DecomposeAny = DecomposeAny;
})();
