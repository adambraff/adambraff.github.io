// STL-style decomposition — 4 stacked panels: trend + monthly seasonal + DOW seasonal + residual.

function STLChart({ daily, height = 520 }) {
  const wrapRef = React.useRef(null);
  const w = useContainerWidth(wrapRef, 900);
  const margin = { top: 10, right: 20, bottom: 24, left: 44 };
  const innerW = Math.max(300, w - margin.left - margin.right);
  const panelGap = 12;
  const labelH = 18;
  const panelCount = 4;
  const totalInner = height - margin.top - margin.bottom - panelGap*(panelCount-1) - labelH*panelCount;
  const panelH = totalInner / panelCount;

  const firstMs = parseDay(daily[0].d);
  const lastMs = parseDay(daily[daily.length-1].d);
  const sx = scale([firstMs, lastMs], [0, innerW]);

  // Trend
  const trendVals = daily.map(d => d.trend).filter(v => v !== null);
  const trendMin = Math.floor(Math.min(...trendVals));
  const trendMax = Math.ceil(Math.max(...trendVals));
  const sTrend = scale([trendMin, trendMax], [panelH, 0]); sTrend.w = innerW;

  // Month seasonal
  const mAbs = Math.max(...daily.map(d => Math.abs(d.mSeas)));
  const mLim = Math.ceil(mAbs * 10) / 10;
  const sM = scale([-mLim, mLim], [panelH, 0]); sM.w = innerW;

  // DOW seasonal — compute the 7 average DOW offsets once; it's constant across time.
  const dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dowAvg = Array(7).fill(0).map((_,i) => {
    const vals = daily.filter(d => new Date(parseDay(d.d)).getUTCDay() === i).map(d => d.dSeas);
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
  });
  const dAbs = Math.max(...dowAvg.map(Math.abs));
  const dLim = Math.max(0.1, Math.ceil(dAbs * 20) / 20);
  const sD = scale([-dLim, dLim], [panelH, 0]); sD.w = innerW;

  // Residual — clip extreme outliers for y-scale, and compute a rolling mean so we get a readable line on top of the daily dots.
  const residVals = daily.map(d => d.resid).filter(v => v !== null).sort((a,b) => a - b);
  const pct = (arr, p) => arr[Math.floor(arr.length * p)];
  const rLim = Math.max(Math.abs(pct(residVals, 0.01)), Math.abs(pct(residVals, 0.99)));
  const rLimRound = Math.ceil(rLim);
  const sR = scale([-rLimRound, rLimRound], [panelH, 0]); sR.w = innerW;

  // 30-day rolling mean of residuals
  const residWin = 30;
  const residSmooth = (() => {
    const out = new Array(daily.length).fill(null);
    let sum = 0, n = 0;
    const half = Math.floor(residWin/2);
    for (let i = 0; i < daily.length; i++) {
      const lo = Math.max(0, i - half);
      const hi = Math.min(daily.length - 1, i + half);
      let s = 0, c = 0;
      for (let j = lo; j <= hi; j++) {
        if (daily[j].resid !== null) { s += daily[j].resid; c++; }
      }
      out[i] = c > 0 ? s / c : null;
    }
    return out;
  })();

  const y0 = new Date(firstMs).getUTCFullYear();
  const y1 = new Date(lastMs).getUTCFullYear();
  const step = y1 - y0 > 8 ? 2 : 1;
  const years = [];
  for (let y = y0; y <= y1; y += step) years.push(Date.UTC(y,0,1));

  const trendPts = daily.map(d => [sx(parseDay(d.d)), d.trend === null ? null : sTrend(d.trend)]);
  const mPts = daily.map(d => [sx(parseDay(d.d)), sM(d.mSeas)]);
  const rDots = daily.map(d => d.resid === null ? null :
    [sx(parseDay(d.d)), sR(Math.max(-rLimRound, Math.min(rLimRound, d.resid)))]).filter(Boolean);
  const rSmoothPts = daily.map((d, i) => [sx(parseDay(d.d)),
    residSmooth[i] === null ? null : sR(residSmooth[i])]);

  const panels = [
    { title: 'Trend', sub: '365-day centered average — long-run direction',
      pts: trendPts, s: sTrend, ticks: niceTicks(trendMin, trendMax, 4),
      color: '#6c8cff', fmt: v => v.toFixed(0) },
    { title: 'Monthly seasonal', sub: 'Average detrended deviation by calendar month',
      pts: mPts, s: sM, ticks: [-mLim, 0, mLim], color: '#ff9d4d', fill: true,
      fmt: v => v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(1) },
    { title: 'Day-of-week seasonal', sub: 'Average deviation by day of the week — constant across the series',
      custom: 'dow', s: sD, ticks: [-dLim, 0, dLim], color: '#9d8fff',
      fmt: v => v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(2) },
    { title: 'Residual', sub: 'What trend + monthly + DOW do not explain — daily dots, 30-day average line',
      pts: rSmoothPts, dots: rDots, s: sR, ticks: [-rLimRound, 0, rLimRound], color: '#c9c2ff', dotColor: '#5d5a78',
      fmt: v => v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(0) },
  ];

  let yOff = margin.top;

  return (
    <div ref={wrapRef} style={{position:'relative', width:'100%'}}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{display:'block'}}>
        {panels.map((p, idx) => {
          const y = yOff;
          yOff += labelH + panelH + (idx < panels.length - 1 ? panelGap : 0);
          return (
            <g key={p.title}>
              <text x={margin.left} y={y + 12} className="axis-text"
                style={{fontSize:10.5, fill:'var(--fg-muted)', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600}}>
                {p.title}<tspan dx="10" style={{fill:'var(--fg-muted-2)', fontWeight:400, textTransform:'none', letterSpacing:0}}>— {p.sub}</tspan>
              </text>
              <g transform={`translate(${margin.left},${y + labelH})`}>
                <YAxisLeft scaleY={p.s} x={0} ticks={p.ticks} fmt={p.fmt} />
                {p.title !== 'Trend' && (
                  <line x1={0} x2={innerW} y1={p.s(0)} y2={p.s(0)} stroke="var(--border)" strokeWidth="1" />
                )}
                {p.fill && (
                  <path d={(() => {
                    const zero = p.s(0);
                    let d = `M 0 ${zero}`;
                    p.pts.forEach(pt => d += ` L ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`);
                    d += ` L ${innerW} ${zero} Z`;
                    return d;
                  })()} fill={p.color} opacity="0.15" />
                )}
                {p.custom === 'dow' && (() => {
                  const zero = p.s(0);
                  const barW = innerW / 7 * 0.7;
                  const slot = innerW / 7;
                  return dowAvg.map((v, i) => {
                    const cx = slot * i + slot/2;
                    const y = p.s(v);
                    const top = Math.min(y, zero);
                    const h = Math.abs(y - zero);
                    const pos = v >= 0;
                    return (
                      <g key={i}>
                        <rect x={cx - barW/2} y={top} width={barW} height={h}
                          fill={pos ? '#ff6b6b' : '#4ae04a'} opacity="0.75" rx="1" />
                        <text x={cx} y={panelH + 14} textAnchor="middle"
                          style={{fontSize:9.5, fill:'var(--fg-muted)', letterSpacing:'0.04em'}}>
                          {dowNames[i]}
                        </text>
                        <text x={cx} y={pos ? top - 4 : top + h + 10} textAnchor="middle"
                          style={{fontSize:9.5, fill:'var(--fg-muted-2)', fontVariantNumeric:'tabular-nums'}}>
                          {p.fmt(v)}
                        </text>
                      </g>
                    );
                  });
                })()}
                {p.dots && p.dots.map((pt, i) => (
                  <circle key={i} cx={pt[0].toFixed(1)} cy={pt[1].toFixed(1)} r="0.9"
                    fill={p.dotColor} opacity="0.45" />
                ))}
                {p.pts && (
                  <path d={linePath(p.pts)} fill="none" stroke={p.color}
                    strokeWidth={p.title === 'Trend' ? 2 : (p.dots ? 1.6 : 1.1)} />
                )}
                {idx === panels.length - 1 &&
                  <XAxisTime scaleX={sx} y={panelH} ticks={years}
                    fmt={t => new Date(t).getUTCFullYear()} />
                }
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

window.STLChart = STLChart;
