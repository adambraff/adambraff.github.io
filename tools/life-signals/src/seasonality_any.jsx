// SeasonalityAny — picker + monthly-bar + DOW-bar + polar year-clock for any signal.
// Computes monthSeas, dowSeas, and a 366-day smoothed day-of-year profile on the fly.

(function(){
  const DAY_MS_SA2 = 86400000;

  function computeSeasonals(values, trend, startMs) {
    const n = values.length;

    // Monthly: mean of (value - trend) by calendar month
    const mSum = Array(12).fill(0), mCnt = Array(12).fill(0);
    // DOW: mean of (value - trend - monthSeas) by day-of-week
    const dSum = Array(7).fill(0), dCnt = Array(7).fill(0);
    // Day-of-year: mean of (value - trend) by doy (1..366)
    const ySum = Array(366).fill(0), yCnt = Array(366).fill(0);

    // Pass 1: monthly
    for (let i = 0; i < n; i++) {
      const v = values[i], t = trend[i];
      if (v == null || t == null) continue;
      const dt = new Date(startMs + i * DAY_MS_SA2);
      mSum[dt.getUTCMonth()] += (v - t);
      mCnt[dt.getUTCMonth()] += 1;
    }
    const monthSeas = mSum.map((s, i) => mCnt[i] > 0 ? s/mCnt[i] : 0);

    // Pass 2: DOW and day-of-year (subtract monthly from DOW; for doy, just detrended)
    for (let i = 0; i < n; i++) {
      const v = values[i], t = trend[i];
      if (v == null || t == null) continue;
      const dt = new Date(startMs + i * DAY_MS_SA2);
      const m = dt.getUTCMonth();
      const w = dt.getUTCDay();
      dSum[w] += (v - t - monthSeas[m]); dCnt[w] += 1;
      const jan1 = Date.UTC(dt.getUTCFullYear(), 0, 1);
      const doy = Math.floor((startMs + i * DAY_MS_SA2 - jan1) / DAY_MS_SA2); // 0-based
      ySum[doy] += (v - t); yCnt[doy] += 1;
    }
    const dowSeas = dSum.map((s, i) => dCnt[i] > 0 ? s/dCnt[i] : 0);

    // Day-of-year raw means
    const doyRaw = ySum.map((s, i) => yCnt[i] > 0 ? s/yCnt[i] : null);

    // 31-day circular smoothing
    const doySmooth = new Array(366).fill(0);
    const half = 15;
    for (let i = 0; i < 366; i++) {
      let sum = 0, c = 0;
      for (let k = -half; k <= half; k++) {
        const j = ((i + k) % 366 + 366) % 366;
        if (doyRaw[j] != null) { sum += doyRaw[j]; c++; }
      }
      doySmooth[i] = c > 0 ? sum/c : 0;
    }

    return { monthSeas, dowSeas, seasonalProfile: doySmooth };
  }

  const MO_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DOW_S = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function makeFmtS(scale) {
    return (v) => {
      if (v == null || isNaN(v)) return '—';
      if (v === 0) return '0';
      const a = Math.abs(v);
      const s = scale || a;
      let digits = 3;
      if (s >= 1000) digits = 0;
      else if (s >= 100) digits = 0;
      else if (s >= 10) digits = 1;
      else if (s >= 1) digits = 2;
      return (v > 0 ? '+' : '−') + a.toFixed(digits);
    };
  }

  function MonthBarsPanel({ monthSeas, unit }) {
    const ref = React.useRef(null);
    const w = useContainerWidth(ref, 500);
    const H = 220;
    const m = { top: 12, right: 12, bottom: 28, left: 52 };
    const innerW = Math.max(200, w - m.left - m.right);
    const innerH = H - m.top - m.bottom;
    const absMax = Math.max(...monthSeas.map(Math.abs), 1e-6);
    const lim = absMax * 1.2;
    const sy = scale([-lim, lim], [innerH, 0]); sy.w = innerW;
    const bandW = innerW / 12;
    const fmt = makeFmtS(absMax);
    return (
      <div ref={ref} style={{width:'100%'}}>
        <div className="chart-title">Monthly seasonality</div>
        <div className="chart-sub">Average deviation from 1-year trend, by calendar month{unit ? ` (${unit})` : ''}</div>
        <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} style={{display:'block'}}>
          <g transform={`translate(${m.left},${m.top})`}>
            <YAxisLeft scaleY={sy} x={0} ticks={[-absMax, 0, absMax]} fmt={fmt} />
            <line x1="0" x2={innerW} y1={sy(0)} y2={sy(0)} stroke="var(--border)" strokeWidth="1" />
            {monthSeas.map((v, i) => {
              const x = i * bandW + 4;
              const bw = bandW - 8;
              const top = v >= 0 ? sy(v) : sy(0);
              const bh = Math.abs(sy(v) - sy(0));
              const col = v >= 0 ? '#ff5555' : '#6c8cff';
              return (
                <g key={i}>
                  <rect x={x} y={top} width={bw} height={bh} fill={col} opacity="0.85" rx="2" />
                  <text x={x + bw/2} y={innerH + 14} className="axis-text" textAnchor="middle">{MO_S[i]}</text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    );
  }

  function DOWBarsPanel({ dowSeas, unit }) {
    const ref = React.useRef(null);
    const w = useContainerWidth(ref, 400);
    const H = 220;
    const m = { top: 12, right: 12, bottom: 28, left: 52 };
    const innerW = Math.max(200, w - m.left - m.right);
    const innerH = H - m.top - m.bottom;
    const order = [1,2,3,4,5,6,0]; // Mon..Sun
    const vals = order.map(i => dowSeas[i]);
    const absMax = Math.max(...vals.map(Math.abs), 1e-6);
    const lim = absMax * 1.2;
    const sy = scale([-lim, lim], [innerH, 0]); sy.w = innerW;
    const bandW = innerW / 7;
    const fmt = makeFmtS(absMax);
    return (
      <div ref={ref} style={{width:'100%'}}>
        <div className="chart-title">Day-of-week seasonality</div>
        <div className="chart-sub">Detrended average — Mon–Sun{unit ? ` (${unit})` : ''}</div>
        <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} style={{display:'block'}}>
          <g transform={`translate(${m.left},${m.top})`}>
            <YAxisLeft scaleY={sy} x={0} ticks={[-absMax, 0, absMax]} fmt={fmt} />
            <line x1="0" x2={innerW} y1={sy(0)} y2={sy(0)} stroke="var(--border)" strokeWidth="1" />
            {vals.map((v, i) => {
              const x = i * bandW + 5;
              const bw = bandW - 10;
              const top = v >= 0 ? sy(v) : sy(0);
              const bh = Math.abs(sy(v) - sy(0));
              const col = v >= 0 ? '#ff5555' : '#6c8cff';
              return (
                <g key={i}>
                  <rect x={x} y={top} width={bw} height={bh} fill={col} opacity="0.85" rx="2" />
                  <text x={x + bw/2} y={innerH + 14} className="axis-text" textAnchor="middle">{DOW_S[order[i]]}</text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    );
  }

  function YearClockPanel({ seasonalProfile, unit, signalLabel }) {
    const ref = React.useRef(null);
    const w = useContainerWidth(ref, 380);
    const size = Math.min(w, 420);
    const cx = size/2, cy = size/2;
    const rMax = size/2 - 50;
    const rBase = size/2 - 100;

    const vals = seasonalProfile;
    const absMax = Math.max(...vals.map(Math.abs), 1e-6);
    const rScale = (v) => rBase + (v / absMax) * (rMax - rBase);

    const pointAt = (doy, r) => {
      const theta = (doy - 1) / 366 * 2 * Math.PI - Math.PI/2;
      return [cx + Math.cos(theta) * r, cy + Math.sin(theta) * r];
    };

    const ringPts = vals.map((v, i) => pointAt(i+1, rScale(v)));
    const ringPath = 'M ' + ringPts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ') + ' Z';

    const moStarts = [0,31,59,90,120,151,181,212,243,273,304,334];
    const moLabels = moStarts.map((dStart, i) => {
      const center = dStart + (i === 11 ? 16 : (moStarts[i+1] - dStart)/2);
      const [x,y] = pointAt(center, rMax + 20);
      return { x, y, label: MO_S[i] };
    });

    const fmt = makeFmtS(absMax);

    return (
      <div ref={ref} style={{width:'100%'}}>
        <div className="chart-title">Annual seasonal cycle</div>
        <div className="chart-sub">Smoothed daily profile — inner ring is 1-year trend; outside = above trend, inside = below</div>
        <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} style={{display:'block', margin:'0 auto'}}>
          <circle cx={cx} cy={cy} r={rBase} fill="none" stroke="var(--border)" strokeDasharray="3 3" />
          {moStarts.map((d,i) => {
            const [x1,y1] = pointAt(d+1, rBase - 4);
            const [x2,y2] = pointAt(d+1, rMax);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border-soft)" strokeWidth="0.7" />;
          })}
          <path d={ringPath} fill="none" stroke="#6c8cff" strokeWidth="1.5" opacity="0.95"/>
          {ringPts.map((p, i) => {
            const v = vals[i];
            if (Math.abs(v) < absMax * 0.02) return null;
            const [bx, by] = pointAt(i+1, rBase);
            return <line key={i} x1={bx} y1={by} x2={p[0]} y2={p[1]}
              stroke={v >= 0 ? '#ff5555' : '#6c8cff'} strokeWidth="1" opacity="0.35" />;
          })}
          {moLabels.map((m, i) => (
            <text key={i} x={m.x} y={m.y} textAnchor="middle" dominantBaseline="middle"
              className="axis-text" style={{fontSize:10.5, fill:'var(--fg-muted)', fontWeight:600, letterSpacing:'0.05em'}}>
              {m.label.toUpperCase()}
            </text>
          ))}
          <text x={cx} y={cy - rBase - 4} textAnchor="middle" className="axis-text" style={{fontSize:9}}>TREND</text>
          <text x={cx + 3} y={cy - rMax + 10} textAnchor="start" className="axis-text" style={{fontSize:9}}>
            {fmt(absMax)}{unit ? ` ${unit}` : ''}
          </text>
        </svg>
      </div>
    );
  }

  function SeasonalityAny({ signals, start, count, defaultKey = 'weight' }) {
    const [key, setKey] = React.useState(defaultKey);
    const sig = signals[key];
    const startMs = parseDay(start);

    const { monthSeas, dowSeas, seasonalProfile } = React.useMemo(
      () => computeSeasonals(sig.values, sig.trend, startMs),
      [sig, startMs]
    );

    // Findings
    let heaviestMo = 0, lightestMo = 0;
    monthSeas.forEach((v,i) => {
      if (v > monthSeas[heaviestMo]) heaviestMo = i;
      if (v < monthSeas[lightestMo]) lightestMo = i;
    });
    const moSwing = monthSeas[heaviestMo] - monthSeas[lightestMo];
    let heaviestDow = 0, lightestDow = 0;
    dowSeas.forEach((v,i) => {
      if (v > dowSeas[heaviestDow]) heaviestDow = i;
      if (v < dowSeas[lightestDow]) lightestDow = i;
    });
    const dowSwing = dowSeas[heaviestDow] - dowSeas[lightestDow];

    // Group picker
    const groups = {};
    Object.entries(signals).forEach(([k, s]) => {
      if (!groups[s.group]) groups[s.group] = [];
      groups[s.group].push([k, s]);
    });
    const groupOrder = ['Body','Activity','Sleep','Gait','Other'];

    const fmtSwing = makeFmtS(Math.max(Math.abs(moSwing), Math.abs(dowSwing)));

    return (
      <div>
        <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:14, flexWrap:'wrap'}}>
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
            Seasonal swing: <b style={{color:'var(--fg)'}}>{MO_S[heaviestMo]}</b> highest,{' '}
            <b style={{color:'var(--fg)'}}>{MO_S[lightestMo]}</b> lowest (Δ {Math.abs(moSwing).toFixed(2)}
            {sig.unit ? ` ${sig.unit}` : ''})
          </div>
        </div>

        <div className="grid-2">
          <div className="chart-wrap">
            <MonthBarsPanel monthSeas={monthSeas} unit={sig.unit} />
          </div>
          <div className="chart-wrap">
            <DOWBarsPanel dowSeas={dowSeas} unit={sig.unit} />
          </div>
        </div>
        <div className="chart-wrap" style={{marginTop:20}}>
          <YearClockPanel seasonalProfile={seasonalProfile} unit={sig.unit} signalLabel={sig.label} />
        </div>
      </div>
    );
  }

  window.SeasonalityAny = SeasonalityAny;
})();
