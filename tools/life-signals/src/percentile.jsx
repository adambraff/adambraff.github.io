// CDC percentile comparison — 2 views
// 1) TIMESERIES: user's weight line over time, overlaid on P10/P25/P50/P75/P90 bands (which shift as age advances)
// 2) PERCENTILE HISTORY: the user's own percentile at each point in time

function PercentileTime({ daily, smoothing, birthYear, group, height=320 }) {
  const wrapRef = React.useRef(null);
  const w = useContainerWidth(wrapRef, 800);
  const margin = { top: 16, right: 16, bottom: 28, left: 44 };
  const innerW = Math.max(300, w - margin.left - margin.right);
  const innerH = height - margin.top - margin.bottom;

  const rolled = React.useMemo(() => rollingAvg(daily.map(d => d.w), smoothing), [daily, smoothing]);
  const firstMs = parseDay(daily[0].d);
  const lastMs = parseDay(daily[daily.length-1].d);

  // Build bands at each day (bands shift slowly with age)
  const bands = daily.map(d => {
    const ms = parseDay(d.d);
    return cdcBands(ageAt(ms, birthYear), group);
  });

  // y range: include user weight AND P25/P75 at least
  const userMin = Math.min(...rolled.filter(v => v !== null));
  const userMax = Math.max(...rolled.filter(v => v !== null));
  const bandMin = Math.min(...bands.map(b => b[1])); // P10
  const bandMax = Math.max(...bands.map(b => b[5])); // P90
  const yMin = Math.floor(Math.min(userMin, bandMin) - 2);
  const yMax = Math.ceil(Math.max(userMax, bandMax) + 2);
  const sx = scale([firstMs, lastMs], [0, innerW]);
  const sy = scale([yMin, yMax], [innerH, 0]);
  sy.w = innerW;

  // Build band area paths — shade between P25/P75 (darker), P10/P90 (lighter)
  const px = daily.map(d => sx(parseDay(d.d)));
  const areaPts25_75 = daily.map((d, i) => [px[i], sy(bands[i][2]), sy(bands[i][4])]);
  const areaPts10_90 = daily.map((d, i) => [px[i], sy(bands[i][1]), sy(bands[i][5])]);

  const lineP50 = daily.map((d, i) => [px[i], sy(bands[i][3])]);
  const userLine = daily.map((d, i) => [px[i], rolled[i] === null ? null : sy(rolled[i])]);

  // Year ticks
  const y0 = new Date(firstMs).getUTCFullYear();
  const y1 = new Date(lastMs).getUTCFullYear();
  const years = [];
  const step = y1 - y0 > 8 ? 2 : 1;
  for (let y = y0; y <= y1; y += step) years.push(Date.UTC(y,0,1));
  const yTicks = niceTicks(yMin, yMax, 5);

  return (
    <div ref={wrapRef} style={{position:'relative', width:'100%'}}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{display:'block'}}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          <YAxisLeft scaleY={sy} x={0} ticks={yTicks} fmt={v => v.toFixed(0)} label="WEIGHT (lb)" />
          <XAxisTime scaleX={sx} y={innerH} ticks={years}
            fmt={t => new Date(t).getUTCFullYear()} />

          {/* P10-P90 band (lightest) */}
          <path d={areaPath(areaPts10_90)} fill="#ff9d4d" opacity="0.07" />
          {/* P25-P75 band */}
          <path d={areaPath(areaPts25_75)} fill="#ff9d4d" opacity="0.14" />
          {/* P50 median line */}
          <path d={linePath(lineP50)} stroke="#ff9d4d" strokeWidth="1" strokeDasharray="4 4" fill="none" opacity="0.8" />
          {/* User weight */}
          <path d={linePath(userLine)} stroke="#6c8cff" strokeWidth="2" fill="none" />

          {/* Legend */}
          <g transform={`translate(${innerW - 220}, 10)`}>
            <rect width="220" height="58" fill="rgba(15,17,23,0.8)" stroke="var(--border)" rx="4" />
            <g transform="translate(12, 16)">
              <line x1="0" x2="20" y1="0" y2="0" stroke="#6c8cff" strokeWidth="2" />
              <text x="26" y="3" className="axis-text" style={{fontSize:10}}>Your {smoothing}-day avg</text>
            </g>
            <g transform="translate(12, 32)">
              <line x1="0" x2="20" y1="0" y2="0" stroke="#ff9d4d" strokeWidth="1" strokeDasharray="4 4" />
              <text x="26" y="3" className="axis-text" style={{fontSize:10}}>{group === 'white' ? 'NH-white male median' : 'US male median'} (age-adj.)</text>
            </g>
            <g transform="translate(12, 48)">
              <rect width="20" height="6" y="-3" fill="#ff9d4d" opacity="0.2" />
              <text x="26" y="3" className="axis-text" style={{fontSize:10}}>P25–P75 / P10–P90 bands</text>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

function PercentileHistory({ daily, smoothing, birthYear, group, height=240 }) {
  const wrapRef = React.useRef(null);
  const w = useContainerWidth(wrapRef, 800);
  const margin = { top: 16, right: 56, bottom: 28, left: 48 };
  const innerW = Math.max(300, w - margin.left - margin.right);
  const innerH = height - margin.top - margin.bottom;

  const rolled = React.useMemo(() => rollingAvg(daily.map(d => d.w), smoothing), [daily, smoothing]);
  const firstMs = parseDay(daily[0].d);
  const lastMs = parseDay(daily[daily.length-1].d);
  const sx = scale([firstMs, lastMs], [0, innerW]);
  const sy = scale([0, 100], [innerH, 0]);
  sy.w = innerW;

  const pctLine = daily.map((d, i) => {
    const wv = rolled[i];
    if (wv === null) return [sx(parseDay(d.d)), null];
    const pct = cdcPercentile(ageAt(parseDay(d.d), birthYear), wv, group);
    return [sx(parseDay(d.d)), sy(pct)];
  });

  const y0 = new Date(firstMs).getUTCFullYear();
  const y1 = new Date(lastMs).getUTCFullYear();
  const years = [];
  const step = y1 - y0 > 8 ? 2 : 1;
  for (let y = y0; y <= y1; y += step) years.push(Date.UTC(y,0,1));

  // Percentile reference lines — P50 emphasized, others visible but softer
  const pRefs = [
    { p: 10, label: 'P10', color: 'var(--fg-muted-2)', dash: '2 4', strong: false, desc: 'lighter than 90% of peers' },
    { p: 25, label: 'P25', color: 'var(--fg-muted-2)', dash: '2 4', strong: false, desc: '' },
    { p: 50, label: 'MEDIAN', color: '#ff9d4d', dash: '5 4', strong: true, desc: 'US male median' },
    { p: 75, label: 'P75', color: 'var(--fg-muted-2)', dash: '2 4', strong: false, desc: '' },
    { p: 90, label: 'P90', color: 'var(--fg-muted-2)', dash: '2 4', strong: false, desc: 'heavier than 90% of peers' },
  ];

  return (
    <div ref={wrapRef} style={{position:'relative', width:'100%'}}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{display:'block'}}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Banded zones — subtle tint so the 25-75 "typical" band is readable at a glance */}
          <rect x={0} y={sy(75)} width={innerW} height={sy(25) - sy(75)} fill="#ff9d4d" opacity="0.05" />

          {/* Reference lines with both-side labels */}
          {pRefs.map(r => (
            <g key={r.p}>
              <line x1={0} x2={innerW} y1={sy(r.p)} y2={sy(r.p)}
                stroke={r.color}
                strokeWidth={r.strong ? 1.2 : 1}
                strokeDasharray={r.dash}
                opacity={r.strong ? 0.9 : 0.55} />
              <text x={-8} y={sy(r.p) + 3.5} textAnchor="end"
                className="axis-text"
                style={{fontSize:10, fontWeight: r.strong ? 600 : 500,
                  fill: r.strong ? r.color : 'var(--fg-muted)',
                  textTransform:'uppercase', letterSpacing:'0.04em'}}>{r.label}</text>
              <text x={innerW + 6} y={sy(r.p) + 3.5} textAnchor="start"
                className="axis-text"
                style={{fontSize:10, fontWeight: r.strong ? 600 : 500,
                  fill: r.strong ? r.color : 'var(--fg-muted-2)',
                  textTransform:'uppercase', letterSpacing:'0.04em'}}>{r.label}</text>
            </g>
          ))}

          <XAxisTime scaleX={sx} y={innerH} ticks={years}
            fmt={t => new Date(t).getUTCFullYear()} />

          <path d={linePath(pctLine)} stroke="#9d8fff" strokeWidth="2" fill="none" />
        </g>
      </svg>
    </div>
  );
}

window.PercentileTime = PercentileTime;
window.PercentileHistory = PercentileHistory;
