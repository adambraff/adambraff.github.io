// Weight spiral — one turn per year, radius modulated by weight above baseline,
// color by season. Renders 15 years of weigh-ins as a single continuous coil.

function WeightSpiral({ daily, smoothing, size = 520 }) {
  const wrapRef = React.useRef(null);
  const w = useContainerWidth(wrapRef, size);
  const S = Math.min(w, 560);
  const cx = S/2, cy = S/2;
  const rMax = S/2 - 50;
  const rMin = 60;

  const rolled = React.useMemo(() => rollingAvg(daily.map(d => d.w), smoothing), [daily, smoothing]);

  const firstMs = parseDay(daily[0].d);
  const lastMs = parseDay(daily[daily.length-1].d);
  const totalYears = (lastMs - firstMs) / (365.25 * 86400000);

  // Weight color gradient: heavier -> warmer
  const validR = rolled.filter(v => v !== null);
  const wMin = Math.min(...validR);
  const wMax = Math.max(...validR);

  // Build points
  const pts = daily.map((d, i) => {
    const ms = parseDay(d.d);
    const yearsIn = (ms - firstMs) / (365.25 * 86400000);
    // doy for angle
    const date = new Date(ms);
    const jan1 = Date.UTC(date.getUTCFullYear(), 0, 1);
    const doy = (ms - jan1) / 86400000;
    const theta = (doy / 365.25) * 2 * Math.PI - Math.PI/2;
    const r = rMin + (yearsIn / totalYears) * (rMax - rMin);
    const x = cx + Math.cos(theta) * r;
    const y = cy + Math.sin(theta) * r;
    const wv = rolled[i];
    return { x, y, w: wv, year: date.getUTCFullYear(), doy };
  });

  // Color: weight -> blue (light) to red (heavy), interp using wMin/wMax
  const wColor = (v) => {
    if (v === null) return '#2e3345';
    const t = Math.max(0, Math.min(1, (v - wMin) / (wMax - wMin)));
    // 0: cool blue #6c8cff, 1: warm red #ff5555
    const r = Math.round(108 + (255-108)*t);
    const g = Math.round(140 + (85-140)*t);
    const b = Math.round(255 + (85-255)*t);
    return `rgb(${r},${g},${b})`;
  };

  // Build line segments so we can color per segment
  const segments = [];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].w === null || pts[i-1].w === null) continue;
    segments.push({
      x1: pts[i-1].x, y1: pts[i-1].y, x2: pts[i].x, y2: pts[i].y,
      color: wColor((pts[i].w + pts[i-1].w)/2)
    });
  }

  // Month labels at outer ring
  const moLabels = [];
  for (let m = 0; m < 12; m++) {
    const theta = (m/12) * 2 * Math.PI - Math.PI/2;
    const lr = rMax + 20;
    moLabels.push({ x: cx + Math.cos(theta)*lr, y: cy + Math.sin(theta)*lr, label: MO_SHORT[m] });
  }

  // Year markers — small dot at Jan 1 of each year along the spiral
  const yearMarks = [];
  const y0 = new Date(firstMs).getUTCFullYear() + 1;
  const y1 = new Date(lastMs).getUTCFullYear();
  for (let y = y0; y <= y1; y++) {
    const ms = Date.UTC(y, 0, 1);
    const yearsIn = (ms - firstMs) / (365.25 * 86400000);
    const r = rMin + (yearsIn / totalYears) * (rMax - rMin);
    yearMarks.push({ y, x: cx + 0*r, py: cy - r });
  }

  return (
    <div ref={wrapRef} style={{width:'100%'}}>
      <div className="chart-title">15 years as a spiral</div>
      <div className="chart-sub">Each turn = one year. Color is weight (cool = light, warm = heavy). Angle is calendar position.</div>
      <svg width="100%" height={S} viewBox={`0 0 ${S} ${S}`} style={{display:'block', margin:'0 auto'}}>
        {/* month guides */}
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
        {/* spiral */}
        {segments.map((s, i) => (
          <line key={i} x1={s.x1.toFixed(1)} y1={s.y1.toFixed(1)}
                x2={s.x2.toFixed(1)} y2={s.y2.toFixed(1)}
                stroke={s.color} strokeWidth="2.2" strokeLinecap="round" />
        ))}
        {/* year labels along jan axis (top) */}
        {yearMarks.map((m, i) => (
          <text key={i} x={cx + 4} y={m.py} className="axis-text"
            style={{fontSize:9.5, fill:'var(--fg-muted-2)'}}>{m.y}</text>
        ))}
        {/* month labels */}
        {moLabels.map((m,i) => (
          <text key={i} x={m.x} y={m.y} textAnchor="middle" dominantBaseline="middle"
            className="axis-text"
            style={{fontSize:10.5, fill:'var(--fg-muted)', fontWeight:600, letterSpacing:'0.05em'}}>
            {m.label.toUpperCase()}
          </text>
        ))}
        {/* legend */}
        <g transform={`translate(${S-110},${S-44})`}>
          <text x="0" y="0" className="axis-text" style={{fontSize:9, fill:'var(--fg-muted)'}}>{wMin.toFixed(0)} lb</text>
          <text x="90" y="0" textAnchor="end" className="axis-text" style={{fontSize:9, fill:'var(--fg-muted)'}}>{wMax.toFixed(0)} lb</text>
          <defs>
            <linearGradient id="gradLegend" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#6c8cff"/>
              <stop offset="1" stopColor="#ff5555"/>
            </linearGradient>
          </defs>
          <rect x="0" y="4" width="90" height="8" fill="url(#gradLegend)" rx="2" />
        </g>
      </svg>
    </div>
  );
}

window.WeightSpiral = WeightSpiral;
