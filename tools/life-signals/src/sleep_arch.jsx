// SleepArchitecture — stacked-area chart of sleep stages (Awake / REM / Core / Deep)
// zoomed to the window where stage data exists (Feb 2025 onward for Adam's export).

(function(){
  const DAY_MS_SA = 86400000;

  // Order matters: stacks from bottom up. Deep at bottom (most restorative),
  // Core on top of deep, REM on top of core, Awake on top.
  const STAGES = [
    { key: 'sleep_deep',  label: 'Deep',  color: '#3b528b' },
    { key: 'sleep_core',  label: 'Core',  color: '#6c8cff' },
    { key: 'sleep_rem',   label: 'REM',   color: '#9d8fff' },
    { key: 'sleep_awake', label: 'Awake', color: '#ff9d4d' },
  ];

  function SleepArchitecture({ signals, start, count }) {
    const ref = React.useRef(null);
    const width = useContainerWidth(ref, 900);

    // Find first day where any stage has a value
    const startMs = parseDay(start);
    const firstStageIdx = React.useMemo(() => {
      for (let i = 0; i < count; i++) {
        for (const st of STAGES) {
          const v = signals[st.key]?.values[i];
          if (v != null && v > 0) return i;
        }
      }
      return null;
    }, [signals, count]);

    const lastIdx = count - 1;

    if (firstStageIdx == null) {
      return (
        <div className="chart-wrap" style={{padding:'32px', textAlign:'center', color:'var(--fg-muted)'}}>
          No sleep-stage data in this export.
        </div>
      );
    }

    const firstMs = startMs + firstStageIdx * DAY_MS_SA;
    const lastMs  = startMs + lastIdx * DAY_MS_SA;
    const daysShown = lastIdx - firstStageIdx + 1;

    // 7-day centered rolling mean per stage (to smooth nightly noise)
    const smooth = React.useMemo(() => {
      const out = {};
      const win = 7;
      const half = 3;
      for (const st of STAGES) {
        const vals = signals[st.key].values;
        const s = new Array(count).fill(null);
        for (let i = firstStageIdx; i <= lastIdx; i++) {
          let sum = 0, n = 0;
          for (let j = Math.max(firstStageIdx, i-half); j <= Math.min(lastIdx, i+half); j++) {
            if (vals[j] != null) { sum += vals[j]; n++; }
          }
          s[i] = n > 0 ? sum/n : null;
        }
        out[st.key] = s;
      }
      return out;
    }, [signals, firstStageIdx, lastIdx, count]);

    // Build stacked arrays: at each day i, running sum of smoothed stage values
    // stack[stageIdx][i] = cumulative total through this stage
    const stacks = React.useMemo(() => {
      const arr = STAGES.map(() => new Array(count).fill(null));
      for (let i = firstStageIdx; i <= lastIdx; i++) {
        let cum = 0;
        let anyValid = false;
        for (let s = 0; s < STAGES.length; s++) {
          const v = smooth[STAGES[s].key][i];
          if (v != null) { cum += v; anyValid = true; }
          arr[s][i] = anyValid ? cum : null;
        }
      }
      return arr;
    }, [smooth, firstStageIdx, lastIdx, count]);

    // Y domain: max total across the window, with some headroom
    const maxTotal = React.useMemo(() => {
      let m = 0;
      const top = stacks[stacks.length - 1];
      for (let i = firstStageIdx; i <= lastIdx; i++) {
        if (top[i] != null && top[i] > m) m = top[i];
      }
      return Math.ceil(m * 1.05);
    }, [stacks, firstStageIdx, lastIdx]);

    const margin = { top: 20, right: 20, bottom: 30, left: 46 };
    const H = 340;
    const plotW = width - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;

    const sx = scale([firstMs, lastMs], [margin.left, margin.left + plotW]);
    const sy = scale([0, maxTotal], [margin.top + plotH, margin.top]);
    sy.w = plotW;

    // Build area paths for each stage layer, bottom up.
    // Layer s occupies: lower = stacks[s-1] (or 0), upper = stacks[s]
    const areas = React.useMemo(() => {
      const paths = [];
      for (let s = 0; s < STAGES.length; s++) {
        const upper = stacks[s];
        const lower = s === 0 ? null : stacks[s-1];
        // Collect contiguous point ranges (skip nulls)
        let d = '';
        let pen = false;
        let chunkStart = null;
        for (let i = firstStageIdx; i <= lastIdx; i++) {
          if (upper[i] == null) {
            if (pen && chunkStart != null) {
              // Close the chunk: trace back along lower
              for (let j = i - 1; j >= chunkStart; j--) {
                const lo = lower ? (lower[j] ?? 0) : 0;
                d += ` L ${sx(startMs + j*DAY_MS_SA).toFixed(1)} ${sy(lo).toFixed(1)}`;
              }
              d += ' Z';
            }
            pen = false; chunkStart = null;
            continue;
          }
          const x = sx(startMs + i*DAY_MS_SA);
          const yy = sy(upper[i]);
          if (!pen) { d += ` M ${x.toFixed(1)} ${yy.toFixed(1)}`; pen = true; chunkStart = i; }
          else       d += ` L ${x.toFixed(1)} ${yy.toFixed(1)}`;
        }
        // Close final chunk if still open
        if (pen && chunkStart != null) {
          for (let j = lastIdx; j >= chunkStart; j--) {
            if (upper[j] == null) continue;
            const lo = lower ? (lower[j] ?? 0) : 0;
            d += ` L ${sx(startMs + j*DAY_MS_SA).toFixed(1)} ${sy(lo).toFixed(1)}`;
          }
          d += ' Z';
        }
        paths.push(d);
      }
      return paths;
    }, [stacks, firstStageIdx, lastIdx, width]);

    // X ticks: one per month
    const xTicks = React.useMemo(() => {
      const ticks = [];
      let dt = new Date(firstMs);
      dt.setUTCDate(1);
      // Start at the first of the following month to avoid a partial-month label at the edge
      dt.setUTCMonth(dt.getUTCMonth() + 1);
      while (dt.getTime() <= lastMs) {
        ticks.push(dt.getTime());
        dt.setUTCMonth(dt.getUTCMonth() + 1);
      }
      return ticks;
    }, [firstMs, lastMs]);
    const monthFmt = t => {
      const d = new Date(t);
      const moShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return moShort[d.getUTCMonth()] + (d.getUTCMonth() === 0 ? ` '${String(d.getUTCFullYear()).slice(2)}` : '');
    };

    // Averages for each stage across the window
    const averages = STAGES.map(st => {
      const vals = signals[st.key].values;
      let s = 0, n = 0;
      for (let i = firstStageIdx; i <= lastIdx; i++) {
        if (vals[i] != null) { s += vals[i]; n++; }
      }
      return n > 0 ? s/n : 0;
    });
    const avgTotal = averages.reduce((a,b) => a+b, 0);

    const [hoverIdx, setHoverIdx] = React.useState(null);
    const onMove = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < margin.left || x > width - margin.right) { setHoverIdx(null); return; }
      const ms = sx.invert(x);
      const idx = Math.round((ms - startMs) / DAY_MS_SA);
      if (idx < firstStageIdx || idx > lastIdx) { setHoverIdx(null); return; }
      setHoverIdx(idx);
    };

    const hoverVals = hoverIdx != null ? STAGES.map(st => signals[st.key].values[hoverIdx]) : null;
    const hoverTotal = hoverVals ? hoverVals.reduce((a,v) => a + (v || 0), 0) : null;

    return (
      <div>
        {/* Averages summary */}
        <div className="panel panel-pad" style={{marginBottom:14}}>
          <div className="label" style={{fontSize:'0.68rem', color:'var(--fg-muted)', marginBottom:8}}>
            {daysShown}-night average composition
          </div>
          <div style={{display:'flex', gap:16, flexWrap:'wrap', alignItems:'baseline'}}>
            {STAGES.map((st, i) => (
              <div key={st.key} style={{display:'flex', alignItems:'baseline', gap:8}}>
                <div style={{width:10, height:10, background:st.color, borderRadius:2, flexShrink:0}}></div>
                <div style={{fontSize:'0.78rem', color:'var(--fg-muted)'}}>{st.label}:</div>
                <div style={{fontSize:'1.05rem', fontWeight:600, fontVariantNumeric:'tabular-nums'}}>
                  {averages[i].toFixed(2)}<span style={{fontSize:'0.7rem', color:'var(--fg-muted-2)', marginLeft:3}}>hr</span>
                </div>
                <div style={{fontSize:'0.72rem', color:'var(--fg-muted-2)'}}>
                  {(averages[i]/avgTotal*100).toFixed(0)}%
                </div>
              </div>
            ))}
            <div style={{marginLeft:'auto', fontSize:'0.78rem', color:'var(--fg-muted)'}}>
              Total: <b style={{color:'var(--fg)', fontSize:'0.95rem'}}>{avgTotal.toFixed(2)} hr</b>
            </div>
          </div>
        </div>

        <div className="chart-wrap" ref={ref}>
          <div className="chart-title">Sleep architecture over time</div>
          <div className="chart-sub">
            7-day rolling mean per stage, stacked to total asleep hours. {fmtDayShort(firstMs)} → {fmtDayShort(lastMs)}.
          </div>

          <svg width={width} height={H} onMouseMove={onMove} onMouseLeave={() => setHoverIdx(null)}
               style={{display:'block'}}>
            {/* Y grid + axis */}
            {niceTicks(0, maxTotal, 5).map((t, i) => (
              <g key={i} transform={`translate(${margin.left},${sy(t)})`}>
                <line x1="0" x2={plotW} stroke="var(--border-soft)" strokeWidth="1" strokeDasharray="2 3" />
                <text x="-8" y="3" textAnchor="end" className="axis-text">{t}</text>
              </g>
            ))}
            <text transform={`translate(14,${margin.top + plotH/2}) rotate(-90)`} textAnchor="middle"
              style={{fontSize:10, fill:'var(--fg-muted-2)'}}>hours</text>

            {/* X ticks */}
            <g transform={`translate(0,${margin.top + plotH})`}>
              <line x1={margin.left} x2={margin.left + plotW} stroke="var(--border)" strokeWidth="1" />
              {xTicks.map((t, i) => (
                <g key={i} transform={`translate(${sx(t)},0)`}>
                  <line y1="0" y2="4" stroke="var(--border)" />
                  <text y="16" className="axis-text" textAnchor="middle">{monthFmt(t)}</text>
                </g>
              ))}
            </g>

            {/* Stacked areas */}
            {areas.map((d, i) => (
              <path key={i} d={d} fill={STAGES[i].color} opacity="0.82" />
            ))}

            {/* Hover crosshair */}
            {hoverIdx != null && (
              <line x1={sx(startMs + hoverIdx*DAY_MS_SA)} x2={sx(startMs + hoverIdx*DAY_MS_SA)}
                y1={margin.top} y2={margin.top + plotH}
                stroke="var(--fg)" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
            )}
          </svg>
        </div>

        {/* Hover readout */}
        {hoverIdx != null && hoverVals && (
          <div style={{marginTop:10, padding:'10px 14px', background:'#0f1117',
            border:'1px solid var(--border-soft)', borderRadius:6, fontSize:'0.82rem',
            display:'flex', gap:18, flexWrap:'wrap', alignItems:'baseline'}}>
            <span style={{color:'var(--fg-muted)'}}>{fmtDayShort(startMs + hoverIdx*DAY_MS_SA)}</span>
            {STAGES.map((st, i) => (
              <span key={st.key} style={{color: st.color, fontVariantNumeric:'tabular-nums'}}>
                <b>{st.label}:</b> {hoverVals[i] == null ? '—' : hoverVals[i].toFixed(2) + ' hr'}
              </span>
            ))}
            {hoverTotal != null && (
              <span style={{color:'var(--fg-muted)'}}>· total asleep {(hoverTotal - (hoverVals[3] || 0)).toFixed(2)} hr</span>
            )}
          </div>
        )}
      </div>
    );
  }

  window.SleepArchitecture = SleepArchitecture;
})();
