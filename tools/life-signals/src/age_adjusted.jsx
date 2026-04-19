// Age-adjusted weight decomposition + forecast.
//
// Model:  weight(t) = a + CDC_P50(age_t) + b_drift * years_since_start
//                    + monthly(m) + dow(d) + residual(t)
//
// Fit: (weight - CDC_P50(age)) regressed on years_since_start, yielding
//      a (personal offset) and b_drift (non-aging drift in lb/yr).
// Then seasonals computed from residuals off the (a + CDC shape + drift) baseline.

(function(){
  const DAY_MS_AA = 86400000;
  const BIRTH_YEAR = 1970; // mirrored from app.jsx — the Me DOB in the export

  // Fit the age + drift model. Returns every component needed for decomposition
  // and forecasting. Input: daily array from weight.json (each row has d and w).
  window.fitAgeModel = function(daily) {
    const n = daily.length;
    const t0ms = parseDay(daily[0].d);

    // Per-day: age, CDC P50 at that age, years-from-start
    const age   = new Float64Array(n);
    const cdc50 = new Float64Array(n);
    const years = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const ms = parseDay(daily[i].d);
      age[i]   = ageAt(ms, BIRTH_YEAR);
      cdc50[i] = cdcBands(age[i])[3]; // P50 column
      years[i] = (ms - t0ms) / (365.25 * DAY_MS_AA);
    }

    // Target = weight - CDC_P50(age). Fit intercept + slope on years.
    const target = new Float64Array(n);
    let tgtSum = 0, yrsSum = 0, validN = 0;
    for (let i = 0; i < n; i++) {
      const w = daily[i].w;
      if (w == null || isNaN(w)) { target[i] = NaN; continue; }
      target[i] = w - cdc50[i];
      tgtSum += target[i]; yrsSum += years[i]; validN += 1;
    }
    const tgtMean = tgtSum / validN;
    const yrsMean = yrsSum / validN;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      if (isNaN(target[i])) continue;
      const dy = years[i] - yrsMean;
      num += (target[i] - tgtMean) * dy;
      den += dy * dy;
    }
    const bDrift = den > 0 ? num / den : 0;
    const a      = tgtMean - bDrift * yrsMean;

    // Age+drift trend line (aka fitted baseline)
    const trend = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      trend[i] = a + cdc50[i] + bDrift * years[i];
    }

    // Standard error of bDrift slope (for long-horizon forecast uncertainty)
    let sseFit = 0;
    for (let i = 0; i < n; i++) {
      if (isNaN(target[i])) continue;
      const fit = a + bDrift * years[i];
      sseFit += (target[i] - fit) ** 2;
    }
    const residVarFit = validN > 2 ? sseFit / (validN - 2) : 0;
    const bDriftSE = den > 0 ? Math.sqrt(residVarFit / den) : 0;

    // R² — how much variance the (CDC_shape + linear drift) model explains
    let ssRes = 0, ssTot = 0;
    let wSum = 0;
    for (let i = 0; i < n; i++) {
      const w = daily[i].w;
      if (w == null) continue;
      wSum += w;
    }
    const wMean = wSum / validN;
    for (let i = 0; i < n; i++) {
      const w = daily[i].w;
      if (w == null) continue;
      ssRes += (w - trend[i]) ** 2;
      ssTot += (w - wMean) ** 2;
    }
    const r2 = 1 - ssRes / ssTot;

    // Residual from age+drift baseline (aka deviations)
    const resid0 = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const w = daily[i].w;
      resid0[i] = (w == null) ? NaN : (w - trend[i]);
    }

    // Monthly seasonal from resid0 by calendar month
    const mSum = new Float64Array(12), mCnt = new Int32Array(12);
    for (let i = 0; i < n; i++) {
      if (isNaN(resid0[i])) continue;
      const mo = parseInt(daily[i].d.slice(5, 7), 10) - 1;
      mSum[mo] += resid0[i]; mCnt[mo] += 1;
    }
    const monthSeas = Array.from(mSum, (s, i) => mCnt[i] > 0 ? s/mCnt[i] : 0);

    // DOW seasonal from (resid0 - monthly) by day-of-week
    const dSum = new Float64Array(7), dCnt = new Int32Array(7);
    for (let i = 0; i < n; i++) {
      if (isNaN(resid0[i])) continue;
      const dt = new Date(parseDay(daily[i].d));
      const mo = dt.getUTCMonth();
      const dw = dt.getUTCDay();
      dSum[dw] += (resid0[i] - monthSeas[mo]); dCnt[dw] += 1;
    }
    const dowSeas = Array.from(dSum, (s, i) => dCnt[i] > 0 ? s/dCnt[i] : 0);

    // Final residual per day
    const resid = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (isNaN(resid0[i])) { resid[i] = NaN; continue; }
      const dt = new Date(parseDay(daily[i].d));
      resid[i] = resid0[i] - monthSeas[dt.getUTCMonth()] - dowSeas[dt.getUTCDay()];
    }

    // Residual stddev for forecast bands
    let rSum = 0, rSum2 = 0, rN = 0;
    for (let i = 0; i < n; i++) {
      if (isNaN(resid[i])) continue;
      rSum += resid[i]; rSum2 += resid[i] * resid[i]; rN += 1;
    }
    const residMean = rSum / rN;
    const residStd  = Math.sqrt(rSum2/rN - residMean*residMean);

    return {
      a, bDrift, bDriftSE, r2, validN,
      age, cdc50, years, trend, resid0, resid,
      monthSeas, dowSeas, residStd,
      t0ms,
      firstAge: age[0],
      lastAge:  age[n-1],
    };
  };

  const MO_SHORT_A = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DOW_SHORT_A = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // ============================ DECOMPOSITION PANEL ============================

  function AgeDecomposition({ daily }) {
    const ref = React.useRef(null);
    const width = useContainerWidth(ref, 900);
    const model = React.useMemo(() => fitAgeModel(daily), [daily]);

    const margin = { top: 10, right: 20, bottom: 24, left: 60 };
    const innerW = Math.max(300, width - margin.left - margin.right);
    const panelGap = 12, labelH = 18, panelCount = 4;
    const height = 540;
    const totalInner = height - margin.top - margin.bottom - panelGap*(panelCount-1) - labelH*panelCount;
    const panelH = totalInner / panelCount;

    const n = daily.length;
    const firstMs = parseDay(daily[0].d);
    const lastMs  = parseDay(daily[n-1].d);
    const sx = scale([firstMs, lastMs], [0, innerW]);

    // Panel 1: trend (a + CDC_P50(age) + b_drift * years) and actual weight for overlay
    const wVals = daily.map(d => d.w).filter(v => v != null);
    const wLo = Math.min(...wVals), wHi = Math.max(...wVals);
    const trendLo = model.trend[0], trendHi = model.trend[n-1];
    const yLo = Math.floor(Math.min(wLo, trendLo) - 1);
    const yHi = Math.ceil(Math.max(wHi, trendHi) + 1);
    const sTrend = scale([yLo, yHi], [panelH, 0]); sTrend.w = innerW;

    // Panel 2/3: monthly/dow seasonals
    const mAbs = Math.max(...model.monthSeas.map(Math.abs), 0.1);
    const sM = scale([-mAbs * 1.2, mAbs * 1.2], [panelH, 0]); sM.w = innerW;
    const dAbs = Math.max(...model.dowSeas.map(Math.abs), 0.05);
    const sD = scale([-dAbs * 1.2, dAbs * 1.2], [panelH, 0]); sD.w = innerW;

    // Panel 4: residual
    const residList = [];
    for (let i = 0; i < n; i++) if (!isNaN(model.resid[i])) residList.push(model.resid[i]);
    residList.sort((a,b) => a-b);
    const pct = (p) => residList[Math.floor(residList.length * p)];
    const rLim = Math.max(Math.abs(pct(0.01)), Math.abs(pct(0.99)), 1);
    const sR = scale([-rLim, rLim], [panelH, 0]); sR.w = innerW;

    // 30-day rolling mean of residuals
    const residSmooth = React.useMemo(() => {
      const out = new Array(n).fill(null);
      const half = 15;
      for (let i = 0; i < n; i++) {
        let s = 0, c = 0;
        for (let j = Math.max(0, i-half); j <= Math.min(n-1, i+half); j++) {
          if (!isNaN(model.resid[j])) { s += model.resid[j]; c++; }
        }
        out[i] = c > 0 ? s/c : null;
      }
      return out;
    }, [model, n]);

    // Paths
    const trendPath = linePath(daily.map((d, i) => [sx(parseDay(d.d)), sTrend(model.trend[i])]));
    const weightPath = linePath(daily.map((d, i) => [sx(parseDay(d.d)), d.w == null ? null : sTrend(d.w)]));
    const mPath = linePath(daily.map((d, i) => {
      const mo = parseInt(d.d.slice(5,7), 10) - 1;
      return [sx(parseDay(d.d)), sM(model.monthSeas[mo])];
    }));
    const rSmoothPath = linePath(daily.map((d, i) => [sx(parseDay(d.d)),
      residSmooth[i] == null ? null : sR(residSmooth[i])]));
    const rDots = [];
    for (let i = 0; i < n; i++) {
      if (isNaN(model.resid[i])) continue;
      const clamped = Math.max(-rLim, Math.min(rLim, model.resid[i]));
      rDots.push([sx(parseDay(daily[i].d)), sR(clamped)]);
    }

    // Year ticks
    const y0 = new Date(firstMs).getUTCFullYear();
    const y1 = new Date(lastMs).getUTCFullYear();
    const step = (y1 - y0) > 8 ? 2 : 1;
    const yearTicks = [];
    for (let y = y0; y <= y1; y += step) yearTicks.push(Date.UTC(y, 0, 1));

    const fmtLb = v => (v == null || isNaN(v)) ? '—' : v.toFixed(0);
    const fmtSignedLb = v => v == null || v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(1);

    const panels = [
      { title: 'Age + drift baseline',
        sub: `a = ${model.a >= 0 ? '+' : ''}${model.a.toFixed(1)}, b = ${model.bDrift >= 0 ? '+' : ''}${model.bDrift.toFixed(2)}/yr`,
        s: sTrend, ticks: niceTicks(yLo, yHi, 4), fmt: fmtLb, color: '#6c8cff', draw: 'trend' },
      { title: 'Monthly', sub: 'seasonal',
        s: sM, ticks: [-mAbs, 0, mAbs], fmt: fmtSignedLb, color: '#ff9d4d', draw: 'area' },
      { title: 'Day-of-week', sub: 'detrended mean',
        s: sD, ticks: [-dAbs, 0, dAbs], fmt: fmtSignedLb, color: '#9d8fff', draw: 'dow' },
      { title: 'Residual', sub: 'unexplained',
        s: sR, ticks: [-rLim, 0, rLim], fmt: fmtSignedLb, color: '#c9c2ff', draw: 'resid' },
    ];

    let yOff = margin.top;

    return (
      <div ref={ref}>
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
                  {p.draw !== 'trend' && (
                    <line x1={0} x2={innerW} y1={p.s(0)} y2={p.s(0)}
                      stroke="var(--border)" strokeWidth="1" />
                  )}
                  {p.draw === 'trend' && (
                    <>
                      {/* faint actual weight curve in background */}
                      <path d={weightPath} fill="none" stroke="var(--fg-muted-2)"
                        strokeWidth="1" opacity="0.35" />
                      {/* fitted baseline */}
                      <path d={trendPath} fill="none" stroke={p.color} strokeWidth="2.2" />
                    </>
                  )}
                  {p.draw === 'area' && (
                    <>
                      <path d={(() => {
                        const zero = p.s(0);
                        let d = `M 0 ${zero}`;
                        for (let i = 0; i < n; i++) {
                          const mo = parseInt(daily[i].d.slice(5,7), 10) - 1;
                          const x = sx(parseDay(daily[i].d));
                          const yp = p.s(model.monthSeas[mo]);
                          d += ` L ${x.toFixed(1)} ${yp.toFixed(1)}`;
                        }
                        d += ` L ${innerW} ${zero} Z`;
                        return d;
                      })()} fill={p.color} opacity="0.15" />
                      <path d={mPath} fill="none" stroke={p.color} strokeWidth="1.1" />
                    </>
                  )}
                  {p.draw === 'dow' && (() => {
                    const zero = p.s(0);
                    const slot = innerW / 7;
                    const barW = slot * 0.7;
                    return model.dowSeas.map((v, i) => {
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
                            {DOW_SHORT_A[i]}
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
                      <path d={rSmoothPath} fill="none" stroke={p.color} strokeWidth="1.6" />
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

        {/* Interpretation callouts */}
        <div className="grid-3" style={{marginTop:14}}>
          <div className="stat-card">
            <div className="label">Offset (a)</div>
            <div className="val" style={{color: model.a > 0 ? '#ff9d4d' : '#4ae04a'}}>
              {model.a >= 0 ? '+' : ''}{model.a.toFixed(1)}<span className="unit">lb</span>
            </div>
            <div className="hint">vs. CDC P50.</div>
          </div>
          <div className="stat-card">
            <div className="label">Drift (b)</div>
            <div className="val" style={{color: model.bDrift > 0 ? '#ff5555' : '#4ae04a'}}>
              {model.bDrift >= 0 ? '+' : ''}{model.bDrift.toFixed(2)}<span className="unit">lb/yr</span>
            </div>
            <div className="hint">Non-aging change per year.</div>
          </div>
          <div className="stat-card">
            <div className="label">Residual σ</div>
            <div className="val">
              ±{model.residStd.toFixed(1)}<span className="unit">lb</span>
            </div>
            <div className="hint">Forecast uncertainty.</div>
          </div>
        </div>
      </div>
    );
  }

  window.AgeDecomposition = AgeDecomposition;

  // ============================ FORECAST PANEL ============================

  function WeightForecast({ daily }) {
    const ref = React.useRef(null);
    const width = useContainerWidth(ref, 900);
    const model = React.useMemo(() => fitAgeModel(daily), [daily]);
    const [horizonYrs, setHorizonYrs] = React.useState(5);

    const n = daily.length;
    const t0ms = parseDay(daily[0].d);
    const lastMs = parseDay(daily[n-1].d);
    const DAY = DAY_MS_AA;

    // Start the forecast from the last known weight, not the fitted baseline — this keeps the
    // visual line continuous at the join. Over time the "current offset" (how much you're
    // above or below the model today) decays toward zero, and the uncertainty band grows.
    const lastW = daily[n-1].w;
    const lastMonthIdx = new Date(lastMs).getUTCMonth();
    const lastMonthly = model.monthSeas[lastMonthIdx];
    const lastBaseline = model.trend[n-1];
    const offset0 = (lastW != null) ? (lastW - lastBaseline - lastMonthly) : 0;

    // Offset-decay time constant (years). Residuals in this series have persisted for ~1 yr
    // before reverting; this is the half-life-ish knob.
    const TAU = 1.0;

    // Build projection: one point per week (keeps chart readable)
    const futureDays = horizonYrs * 365;
    const stepDays = 7;
    const future = [];
    // Anchor point at t=0 so the chart connects cleanly
    future.push({ ms: lastMs, age: ageAt(lastMs, BIRTH_YEAR), center: lastW != null ? lastW : lastBaseline + lastMonthly, sigma: 0, baseline: lastBaseline });
    for (let off = stepDays; off <= futureDays; off += stepDays) {
      const ms = lastMs + off * DAY;
      const age = ageAt(ms, BIRTH_YEAR);
      const yearsFrom = (ms - t0ms) / (365.25 * DAY);
      const yrsAhead = off / 365.25;
      const baseline = model.a + cdcBands(age)[3] + model.bDrift * yearsFrom;
      const mo = new Date(ms).getUTCMonth();
      const monthly = model.monthSeas[mo];
      const decayedOffset = offset0 * Math.exp(-yrsAhead / TAU);
      const center = baseline + monthly + decayedOffset;
      // Variance: residual mean-reverts (grows from 0 to residStd²); drift slope uncertainty grows linearly in t.
      const resVar = model.residStd * model.residStd * (1 - Math.exp(-2 * yrsAhead / TAU));
      const driftVar = (model.bDriftSE * yrsAhead) ** 2;
      const sigma = Math.sqrt(resVar + driftVar);
      future.push({ ms, age, center, sigma, baseline });
    }

    // Historical baseline trace for comparison
    const histTrace = daily.map((d, i) => [parseDay(d.d), model.trend[i]]);

    // Scales
    const xMin = t0ms, xMax = lastMs + futureDays * DAY;
    const margin = { top: 14, right: 20, bottom: 32, left: 50 };
    const H = 420;
    const plotW = width - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;
    const sx = scale([xMin, xMax], [margin.left, margin.left + plotW]);

    // Y domain: min/max of weight + fitted + forecast bands
    const wVals = daily.map(d => d.w).filter(v => v != null);
    const hi95 = Math.max(...future.map(p => p.center + 1.96 * p.sigma));
    const lo95 = Math.min(...future.map(p => p.center - 1.96 * p.sigma));
    const yLo = Math.floor(Math.min(...wVals, lo95) - 1);
    const yHi = Math.ceil(Math.max(...wVals, hi95) + 1);
    const sy = scale([yLo, yHi], [margin.top + plotH, margin.top]);
    sy.w = plotW;

    // Actual weight line (smoothed a bit)
    const w30 = React.useMemo(() => rollingAvg(daily.map(d => d.w), 30), [daily]);
    const wPath = linePath(daily.map((d, i) => [sx(parseDay(d.d)), w30[i] == null ? null : sy(w30[i])]));

    // Fitted baseline (extended through history + future)
    const histBaselinePath = linePath(daily.map((d, i) => [sx(parseDay(d.d)), sy(model.trend[i])]));

    // Forecast center — future[] already starts at (lastMs, lastW)
    const fcCenter = linePath(future.map(p => [sx(p.ms), sy(p.center)]));

    // Forecast baseline (without monthly or offset-decay) — pure model expectation
    const fcBaselinePath = linePath(future.map(p => [sx(p.ms), sy(p.baseline)]));

    // Band paths — at t=0, sigma=0 so bands collapse to the anchor point for smooth opening
    const band = (mult) => {
      const pts = future.map(p => [sx(p.ms), sy(p.center - mult * p.sigma), sy(p.center + mult * p.sigma)]);
      return areaPath(pts);
    };
    const band95 = band(1.96);
    const band80 = band(1.28);

    // X ticks: one per year
    const y0 = new Date(xMin).getUTCFullYear();
    const y1 = new Date(xMax).getUTCFullYear();
    const stepY = (y1 - y0) > 10 ? 2 : 1;
    const yearTicks = [];
    for (let y = y0; y <= y1; y += stepY) yearTicks.push(Date.UTC(y, 0, 1));

    const yTicks = niceTicks(yLo, yHi, 5);

    // Summary table — key future ages
    const keyAges = [];
    const lastAge = ageAt(lastMs, BIRTH_YEAR);
    const targets = [
      { label: 'Today', yrsFromNow: 0 },
      { label: '+1 year', yrsFromNow: 1 },
      { label: '+2 years', yrsFromNow: 2 },
      { label: '+5 years', yrsFromNow: 5 },
      { label: `At age 60`, yrsFromNow: 60 - lastAge },
      { label: `At age 65`, yrsFromNow: 65 - lastAge },
      { label: `At age 70`, yrsFromNow: 70 - lastAge },
    ].filter(t => t.yrsFromNow >= 0 && t.yrsFromNow <= horizonYrs);

    const summaryRows = targets.map(t => {
      const ms = lastMs + t.yrsFromNow * 365.25 * DAY;
      const age = ageAt(ms, BIRTH_YEAR);
      const yearsFromStart = (ms - t0ms) / (365.25 * DAY);
      const base = model.a + cdcBands(age)[3] + model.bDrift * yearsFromStart;
      const mo = new Date(ms).getUTCMonth();
      const decayedOffset = offset0 * Math.exp(-t.yrsFromNow / TAU);
      const mid = base + model.monthSeas[mo] + decayedOffset;
      const resVar = model.residStd * model.residStd * (1 - Math.exp(-2 * t.yrsFromNow / TAU));
      const driftVar = (model.bDriftSE * t.yrsFromNow) ** 2;
      const sigma = Math.sqrt(resVar + driftVar);
      const lo95 = mid - 1.96 * sigma;
      const hi95 = mid + 1.96 * sigma;
      return { label: t.label, age, mid, lo95, hi95 };
    });

    return (
      <div ref={ref}>
        <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:14, flexWrap:'wrap'}}>
          <div className="label" style={{fontSize:'0.7rem', color:'var(--fg-muted)', fontWeight:600}}>
            Horizon:
          </div>
          <input type="range" min="1" max="20" step="1" value={horizonYrs}
            onChange={e => setHorizonYrs(+e.target.value)}
            style={{width:200, accentColor:'var(--blue)'}} />
          <div style={{fontSize:'0.88rem', fontWeight:600}}>
            {horizonYrs} year{horizonYrs === 1 ? '' : 's'}
            <span style={{color:'var(--fg-muted)', fontWeight:400}}> — to age {(lastAge + horizonYrs).toFixed(1)}</span>
          </div>
        </div>

        <svg width="100%" height={H} viewBox={`0 0 ${width} ${H}`} style={{display:'block'}}>
          {/* Gridlines */}
          {yTicks.map((t, i) => (
            <g key={i} transform={`translate(${margin.left},${sy(t)})`}>
              <line x1="0" x2={plotW} stroke="var(--border-soft)" strokeDasharray="2 3" strokeWidth="1" />
              <text x="-8" y="3" textAnchor="end" className="axis-text">{t}</text>
            </g>
          ))}
          <text transform={`translate(14,${margin.top + plotH/2}) rotate(-90)`} textAnchor="middle"
            style={{fontSize:10, fill:'var(--fg-muted-2)'}}>weight (lb)</text>

          {/* X axis */}
          <g transform={`translate(0,${margin.top + plotH})`}>
            <line x1={margin.left} x2={margin.left + plotW} stroke="var(--border)" />
            {yearTicks.map((t, i) => (
              <g key={i} transform={`translate(${sx(t)},0)`}>
                <line y1="0" y2="4" stroke="var(--border)" />
                <text y="16" className="axis-text" textAnchor="middle">{new Date(t).getUTCFullYear()}</text>
              </g>
            ))}
          </g>

          {/* Bands */}
          <path d={band95} fill="#6c8cff" opacity="0.10" />
          <path d={band80} fill="#6c8cff" opacity="0.18" />

          {/* Historical fit */}
          <path d={histBaselinePath} fill="none" stroke="#6c8cff" strokeWidth="1.5" opacity="0.55" strokeDasharray="4 3" />

          {/* Historical weight (30-day avg) */}
          <path d={wPath} fill="none" stroke="var(--fg)" strokeWidth="1.8" opacity="0.85" />

          {/* Forecast center (with monthly wobble) */}
          <path d={fcCenter} fill="none" stroke="#ff9d4d" strokeWidth="2" />

          {/* Forecast smooth baseline (no monthly) */}
          <path d={fcBaselinePath} fill="none" stroke="#ff9d4d" strokeWidth="1.2" opacity="0.55" strokeDasharray="3 3" />

          {/* Vertical line at "now" */}
          <line x1={sx(lastMs)} x2={sx(lastMs)} y1={margin.top} y2={margin.top + plotH}
            stroke="var(--fg-muted)" strokeDasharray="3 3" opacity="0.5" />
          <text x={sx(lastMs) + 4} y={margin.top + 10} className="axis-text"
            style={{fontSize:10, fill:'var(--fg-muted-2)'}}>today</text>

          {/* Legend */}
          <g transform={`translate(${margin.left + 8},${margin.top + 10})`}>
            <g>
              <line x1="0" x2="18" y1="5" y2="5" stroke="var(--fg)" strokeWidth="1.8" />
              <text x="24" y="9" style={{fontSize:10, fill:'var(--fg-muted)'}}>30-day avg weight</text>
            </g>
            <g transform="translate(0,14)">
              <line x1="0" x2="18" y1="5" y2="5" stroke="#6c8cff" strokeWidth="1.5" opacity="0.55" strokeDasharray="4 3" />
              <text x="24" y="9" style={{fontSize:10, fill:'var(--fg-muted)'}}>age+drift baseline</text>
            </g>
            <g transform="translate(0,28)">
              <line x1="0" x2="18" y1="5" y2="5" stroke="#ff9d4d" strokeWidth="2" />
              <text x="24" y="9" style={{fontSize:10, fill:'var(--fg-muted)'}}>forecast (incl. monthly)</text>
            </g>
            <g transform="translate(0,42)">
              <rect x="0" y="1" width="18" height="8" fill="#6c8cff" opacity="0.18" />
              <text x="24" y="9" style={{fontSize:10, fill:'var(--fg-muted)'}}>80% / 95% bands</text>
            </g>
          </g>
        </svg>

        {/* Summary table */}
        <div style={{marginTop:16, overflowX:'auto'}}>
          <table style={{width:'100%', fontSize:'0.85rem', borderCollapse:'collapse',
            fontVariantNumeric:'tabular-nums'}}>
            <thead>
              <tr style={{color:'var(--fg-muted)', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.05em'}}>
                <th style={{textAlign:'left', padding:'8px 10px', borderBottom:'1px solid var(--border)'}}>When</th>
                <th style={{textAlign:'right', padding:'8px 10px', borderBottom:'1px solid var(--border)'}}>Age</th>
                <th style={{textAlign:'right', padding:'8px 10px', borderBottom:'1px solid var(--border)'}}>Central forecast</th>
                <th style={{textAlign:'right', padding:'8px 10px', borderBottom:'1px solid var(--border)'}}>95% interval</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((r, i) => (
                <tr key={i}>
                  <td style={{padding:'8px 10px', borderBottom:'1px solid var(--border-soft)'}}>{r.label}</td>
                  <td style={{textAlign:'right', padding:'8px 10px', color:'var(--fg-muted)', borderBottom:'1px solid var(--border-soft)'}}>{r.age.toFixed(1)}</td>
                  <td style={{textAlign:'right', padding:'8px 10px', fontWeight:600, borderBottom:'1px solid var(--border-soft)'}}>{r.mid.toFixed(1)} lb</td>
                  <td style={{textAlign:'right', padding:'8px 10px', color:'var(--fg-muted)', borderBottom:'1px solid var(--border-soft)'}}>{r.lo95.toFixed(1)} – {r.hi95.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  window.WeightForecast = WeightForecast;
})();
