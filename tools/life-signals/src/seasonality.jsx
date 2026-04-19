// Seasonality visuals: month bars + day-of-week bars + polar "year-clock" radar.

function MonthDOWBars({ monthAvg, dowAvg }) {
  const wrapRef = React.useRef(null);
  const w = useContainerWidth(wrapRef, 500);
  const h = 220;
  const margin = { top: 12, right: 12, bottom: 28, left: 44 };
  const innerW = Math.max(200, w - margin.left - margin.right);
  const innerH = h - margin.top - margin.bottom;

  const vals = monthAvg;
  const absMax = Math.max(...vals.map(Math.abs), 0.5);
  const lim = Math.ceil(absMax * 10)/10;
  const sy = scale([-lim, lim], [innerH, 0]);
  sy.w = innerW;
  const bandW = innerW / 12;
  const barPad = 8;

  return (
    <div ref={wrapRef} style={{position:'relative', width:'100%'}}>
      <div className="chart-title">Monthly seasonality</div>
      <div className="chart-sub">Average deviation from 1-year trend, by calendar month</div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          <YAxisLeft scaleY={sy} x={0}
            ticks={[-lim, 0, lim]}
            fmt={v => v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(1)} />
          <line x1="0" x2={innerW} y1={sy(0)} y2={sy(0)} stroke="var(--border)" strokeWidth="1" />
          {vals.map((v, i) => {
            const x = i * bandW + barPad/2;
            const bw = bandW - barPad;
            const top = v >= 0 ? sy(v) : sy(0);
            const bh = Math.abs(sy(v) - sy(0));
            const col = v >= 0 ? '#ff5555' : '#6c8cff';
            return (
              <g key={i}>
                <rect x={x} y={top} width={bw} height={bh} fill={col} opacity="0.85" rx="2" />
                <text x={x + bw/2} y={innerH + 14} className="axis-text"
                  textAnchor="middle">{MO_SHORT[i]}</text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function DOWBars({ dowAvg }) {
  const wrapRef = React.useRef(null);
  const w = useContainerWidth(wrapRef, 400);
  const h = 220;
  const margin = { top: 12, right: 12, bottom: 28, left: 44 };
  const innerW = Math.max(200, w - margin.left - margin.right);
  const innerH = h - margin.top - margin.bottom;
  const absMax = Math.max(...dowAvg.map(Math.abs), 0.2);
  const lim = Math.ceil(absMax * 10)/10;
  const sy = scale([-lim, lim], [innerH, 0]);
  // Reorder Mon..Sun
  const order = [1,2,3,4,5,6,0];
  const vals = order.map(i => dowAvg[i]);
  const bandW = innerW / 7;
  const barPad = 10;

  return (
    <div ref={wrapRef} style={{position:'relative', width:'100%'}}>
      <div className="chart-title">Day-of-week seasonality</div>
      <div className="chart-sub">Detrended average — Mon–Sun</div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          <YAxisLeft scaleY={sy} x={0} ticks={[-lim, 0, lim]}
            fmt={v => v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(1)} />
          <line x1="0" x2={innerW} y1={sy(0)} y2={sy(0)} stroke="var(--border)" strokeWidth="1" />
          {vals.map((v, i) => {
            const x = i * bandW + barPad/2;
            const bw = bandW - barPad;
            const top = v >= 0 ? sy(v) : sy(0);
            const bh = Math.abs(sy(v) - sy(0));
            const col = v >= 0 ? '#ff5555' : '#6c8cff';
            return (
              <g key={i}>
                <rect x={x} y={top} width={bw} height={bh} fill={col} opacity="0.85" rx="2" />
                <text x={x + bw/2} y={innerH + 14} className="axis-text"
                  textAnchor="middle">{DOW_SHORT[order[i]]}</text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// Polar "year-clock": 366-day seasonal profile rendered as radial area
function YearClock({ seasonalProfile }) {
  const wrapRef = React.useRef(null);
  const w = useContainerWidth(wrapRef, 380);
  const size = Math.min(w, 420);
  const cx = size/2, cy = size/2;
  const rMax = size/2 - 50;
  const rBase = size/2 - 100;

  const vals = seasonalProfile;
  const absMax = Math.max(...vals.map(Math.abs), 0.3);
  const rScale = (v) => rBase + (v / absMax) * (rMax - rBase);

  const pointAt = (dayOfYear, r) => {
    const theta = (dayOfYear - 1) / 366 * 2 * Math.PI - Math.PI/2;
    return [cx + Math.cos(theta) * r, cy + Math.sin(theta) * r];
  };

  // Build fill path: from baseline out to value, wraps around
  let posPath = '', negPath = '';
  let posOpen = false, negOpen = false;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    const [x, y] = pointAt(i+1, rScale(v));
    if (v >= 0) {
      if (!posOpen) { posPath += ` M ${cx} ${cy}`; posOpen = true; }
      posPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      if (!negOpen) { negPath += ` M ${cx} ${cy}`; negOpen = true; }
      negPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }

  // Closed ring
  const ringPts = vals.map((v, i) => pointAt(i+1, rScale(v)));
  const ringPath = 'M ' + ringPts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ') + ' Z';

  // Month labels around circle
  const moStarts = [0,31,59,90,120,151,181,212,243,273,304,334];
  const moLabels = moStarts.map((dStart, i) => {
    const center = dStart + (i === 11 ? 16 : (moStarts[i+1] - dStart)/2);
    const [x,y] = pointAt(center, rMax + 20);
    return { x, y, label: MO_SHORT[i] };
  });

  return (
    <div ref={wrapRef} style={{width:'100%'}}>
      <div className="chart-title">Annual seasonal cycle</div>
      <div className="chart-sub">Smoothed daily profile — inner ring is 1-year trend; outside = heavier, inside = lighter</div>
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} style={{display:'block', margin:'0 auto'}}>
        {/* baseline ring */}
        <circle cx={cx} cy={cy} r={rBase} fill="none" stroke="var(--border)" strokeDasharray="3 3" />
        {/* month guides */}
        {moStarts.map((d,i) => {
          const [x1,y1] = pointAt(d+1, rBase - 4);
          const [x2,y2] = pointAt(d+1, rMax);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border-soft)" strokeWidth="0.7" />;
        })}
        {/* filled ring, split by sign */}
        <path d={ringPath} fill="none" stroke="#6c8cff" strokeWidth="1.5" opacity="0.95"/>
        {ringPts.map((p, i) => {
          const v = vals[i];
          if (Math.abs(v) < 0.01) return null;
          const [bx, by] = pointAt(i+1, rBase);
          return <line key={i} x1={bx} y1={by} x2={p[0]} y2={p[1]}
            stroke={v >= 0 ? '#ff5555' : '#6c8cff'} strokeWidth="1" opacity="0.35" />;
        })}
        {/* Month labels */}
        {moLabels.map((m, i) => (
          <text key={i} x={m.x} y={m.y} textAnchor="middle" dominantBaseline="middle"
            className="axis-text" style={{fontSize: 10.5, fill:'var(--fg-muted)', fontWeight:600, letterSpacing:'0.05em'}}>
            {m.label.toUpperCase()}
          </text>
        ))}
        {/* scale markers */}
        <text x={cx} y={cy - rBase - 4} textAnchor="middle" className="axis-text" style={{fontSize:9}}>TREND</text>
        <text x={cx + 3} y={cy - rMax + 10} textAnchor="start" className="axis-text" style={{fontSize:9}}>+{absMax.toFixed(1)} lb</text>
      </svg>
    </div>
  );
}

window.MonthDOWBars = MonthDOWBars;
window.DOWBars = DOWBars;
window.YearClock = YearClock;
