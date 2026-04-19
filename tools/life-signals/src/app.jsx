// Main app — wires together all sections.

const BIRTH_YEAR = 1970;
const HEIGHT_IN = 70;

function App() {
  const [data, setData] = React.useState(null);
  const [lifeSignals, setLifeSignals] = React.useState(null);
  const [smoothing, setSmoothing] = React.useState(() => {
    return loadLS('we.smoothing', TWEAK_DEFAULTS.smoothingWindow || 7);
  });
  // Events are the single source of truth from src/events.jsx — same list on every
  // device, no localStorage. To change the list, edit DEFAULT_EVENTS in events.jsx.
  const events = DEFAULT_EVENTS;
  // One-time migration: clean up stale per-device events localStorage from prior versions.
  React.useEffect(() => { try { localStorage.removeItem('we.events'); } catch (_) {} }, []);
  const [rangeKey, setRangeKey] = React.useState('all');
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [cdcGroup, setCdcGroup] = React.useState('pooled'); // 'pooled' | 'white'
  const [cdcSes, setCdcSes] = React.useState('pooled');     // 'pooled' | 'college' | 'affluent' | 'ne_urban'

  React.useEffect(() => {
    fetch('data/weight.json').then(r => r.json()).then(setData);
    fetch('data/life_signals.json').then(r => r.json()).then(setLifeSignals).catch(() => {});
  }, []);

  React.useEffect(() => saveLS('we.smoothing', smoothing), [smoothing]);

  // Edit-mode protocol
  React.useEffect(() => {
    const handler = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') setTweaksOpen(true);
      else if (e.data.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({type: '__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const setSmoothingAndPersist = (v) => {
    setSmoothing(v);
    window.parent.postMessage({type: '__edit_mode_set_keys', edits: {smoothingWindow: v}}, '*');
  };

  if (!data) {
    return <div style={{padding:'120px 32px', textAlign:'center', color:'var(--fg-muted)'}}>Loading 5,400 weigh-ins…</div>;
  }

  // Range presets
  const daily = data.daily;
  const lastMs = parseDay(daily[daily.length-1].d);
  const rangePresets = {
    all:   [parseDay(daily[0].d), lastMs],
    '5y':  [lastMs - 5*365*DAY_MS, lastMs],
    '3y':  [lastMs - 3*365*DAY_MS, lastMs],
    '1y':  [lastMs - 365*DAY_MS, lastMs],
    '90d': [lastMs - 90*DAY_MS, lastMs],
  };
  const currentRange = rangePresets[rangeKey];

  // ===== HEADLINE STATS =====
  const firstW = daily[0].w;
  const lastW = daily[daily.length-1].w;
  const totalChange = lastW - firstW;
  const rolledAll = rollingAvg(daily.map(d => d.w), 7);
  const currentAvg = rolledAll[rolledAll.length-1];
  const ageNow = ageAt(lastMs, BIRTH_YEAR);
  const currentPct = cdcPercentile(ageNow, currentAvg, cdcGroup, cdcSes);
  const ageStart = ageAt(parseDay(daily[0].d), BIRTH_YEAR);
  const startPct = cdcPercentile(ageStart, rolledAll.find(v => v !== null), cdcGroup, cdcSes);

  // Biggest moves (12-month): find largest net gain and loss over any rolling 12-month window
  const window365 = 365;
  let maxGain = 0, maxGainIdx = 0, maxLoss = 0, maxLossIdx = 0;
  for (let i = window365; i < rolledAll.length; i++) {
    if (rolledAll[i] === null || rolledAll[i-window365] === null) continue;
    const delta = rolledAll[i] - rolledAll[i-window365];
    if (delta > maxGain) { maxGain = delta; maxGainIdx = i; }
    if (delta < maxLoss) { maxLoss = delta; maxLossIdx = i; }
  }

  // ===== EVENT DELTAS =====
  const eventDeltas = events.map(ev => {
    const evMs = parseDay(ev.date);
    const evIdx = Math.max(0, Math.min(daily.length-1, Math.round((evMs - parseDay(daily[0].d))/DAY_MS)));
    const before = [];
    const after = [];
    for (let i = Math.max(0, evIdx - 90); i < evIdx; i++) if (rolledAll[i] !== null) before.push(rolledAll[i]);
    for (let i = evIdx; i < Math.min(daily.length, evIdx + 90); i++) if (rolledAll[i] !== null) after.push(rolledAll[i]);
    if (before.length < 20 || after.length < 20) return {...ev, delta: null};
    const avg = a => a.reduce((s,v) => s+v,0)/a.length;
    return {...ev, delta: avg(after) - avg(before)};
  });

  return (
    <div>
      {/* Top nav */}
      <div className="topnav">
        <div className="topnav-inner">
          <div className="logo">
            <img src="assets/logo-white.svg" alt="Braff & Co." />
            <span>Life Signals</span>
          </div>
          <nav>
            <a href="#signals">Signals</a>
            <a href="#trend">Weight</a>
            <a href="#events">Events</a>
            <a href="#ageModel">Age model</a>
            <a href="#forecast">Forecast</a>
            <a href="#sleep">Sleep</a>
            <a href="#comparison">vs. US pop.</a>
            <a href="#explorer">Explorer</a>
            <a href="#spiral">Spiral</a>
          </nav>
        </div>
      </div>

      <div className="wrap">
        {/* Hero */}
        <header className="hero">
          <h1>Life Signals</h1>
          <div className="subtitle">
            <b>{data.meta.weighInCount.toLocaleString()} weigh-ins</b>, {data.meta.firstDay} → {data.meta.lastDay}, plus iPhone signals.
          </div>
          <div className="meta-row">
            <div className="meta-item"><span className="label">Weigh-ins</span><span className="val">{data.meta.weighInCount.toLocaleString()}</span></div>
            <div className="meta-item"><span className="label">Days Covered</span><span className="val">{data.meta.totalDays.toLocaleString()}</span></div>
            <div className="meta-item"><span className="label">Days With Data</span><span className="val">{data.meta.dayCount.toLocaleString()}</span></div>
            <div className="meta-item"><span className="label">Current ({smoothing}-day)</span><span className="val">{currentAvg.toFixed(1)}<span className="unit">lb</span></span></div>
            <div className="meta-item"><span className="label">Δ Since 2011</span><span className="val" style={{color: totalChange > 0 ? '#ff5555' : '#4ae04a'}}>{fmtDelta(totalChange, 1)}<span className="unit">lb</span></span></div>
          </div>
        </header>

        {/* LIFE SIGNALS — overview */}
        <section className="block" id="signals">
          <h2>At a glance</h2>
          <div className="sect-sub">
            365-day centered trend per signal, shared timeline. Gaps are absent data, not zeros.
          </div>
          {lifeSignals
            ? <LifeSignals signals={lifeSignals.signals} start={lifeSignals.start} count={lifeSignals.count} />
            : <div style={{padding:'40px', textAlign:'center', color:'var(--fg-muted)'}}>Loading signals…</div>}
        </section>

        {/* TREND */}
        <section className="block" id="trend">
          <h2>Weight — the long run</h2>
          <div className="sect-sub">
            {smoothing}-day rolling average. Dots = single mornings. Colored bands = events.
          </div>

          <div style={{display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap'}}>
            <div className="btn-group">
              {Object.keys(rangePresets).map(k => (
                <button key={k} className={clsx('btn small', rangeKey === k && 'active')}
                  onClick={() => setRangeKey(k)}>
                  {k === 'all' ? 'All 15y' : k.replace('y',' yr').replace('d',' days')}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-wrap">
            <TrendChart daily={daily} smoothing={smoothing} events={events}
              range={currentRange} />
          </div>

          <div className="grid-4" style={{marginTop:20}}>
            <div className="stat-card">
              <div className="label">Net Change · 15y</div>
              <div className="val" style={{color: totalChange > 0 ? '#ff5555' : '#4ae04a'}}>
                {fmtDelta(totalChange, 1)}<span className="unit">lb</span>
              </div>
              <div className="hint">{firstW.toFixed(1)} lb in Aug 2011 → {lastW.toFixed(1)} lb today</div>
            </div>
            <div className="stat-card">
              <div className="label">Biggest 12-mo Gain</div>
              <div className="val" style={{color:'#ff5555'}}>+{maxGain.toFixed(1)}<span className="unit">lb</span></div>
              <div className="hint">Year ending {fmtDayShort(parseDay(daily[maxGainIdx].d))}</div>
            </div>
            <div className="stat-card">
              <div className="label">Biggest 12-mo Loss</div>
              <div className="val" style={{color:'#4ae04a'}}>{maxLoss.toFixed(1)}<span className="unit">lb</span></div>
              <div className="hint">Year ending {fmtDayShort(parseDay(daily[maxLossIdx].d))}</div>
            </div>
            <div className="stat-card">
              <div className="label">Current Percentile</div>
              <div className="val" style={{color:'#9d8fff'}}>P{currentPct.toFixed(0)}</div>
              <div className="hint">vs. US males age {ageNow.toFixed(0)}, 5'10"</div>
            </div>
          </div>
        </section>

        {/* EVENT DELTAS — placed right after the Weight trend chart so event colors are in context */}
        <section className="block" id="events">
          <h2>Event deltas</h2>
          <div className="sect-sub">
            90-day weight Δ after vs. before each event. Dot color matches the chart above.
          </div>
          <div className="panel panel-pad">
            {eventDeltas.length === 0 &&
              <div style={{fontSize:'0.82rem', color:'var(--fg-muted)', fontStyle:'italic'}}>No events configured.</div>
            }
            {eventDeltas.map((ev) => {
              const origIdx = events.findIndex(e => e.id === ev.id);
              const color = EVENT_COLORS[origIdx % EVENT_COLORS.length];
              return (
                <div key={ev.id} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 0',
                  borderBottom:'1px solid var(--border-soft)', fontSize:'0.88rem'}}>
                  <span style={{width:10, height:10, background:color, borderRadius:'50%', flexShrink:0, display:'inline-block'}} />
                  <span style={{color:'var(--fg-muted)', fontSize:'0.78rem', fontVariantNumeric:'tabular-nums',
                    minWidth:92, whiteSpace:'nowrap'}}>
                    {ev.date}{ev.end ? ' → ' + ev.end : ''}
                  </span>
                  <span style={{color:'var(--fg-2)', flex:1, overflow:'hidden', textOverflow:'ellipsis',
                    whiteSpace:'nowrap'}} title={ev.label}>{ev.label}</span>
                  <span style={{fontVariantNumeric:'tabular-nums', fontWeight:600, whiteSpace:'nowrap',
                    color: ev.delta === null ? 'var(--fg-muted)' : (ev.delta > 0 ? '#ff5555' : '#4ae04a')}}>
                    {ev.delta === null ? 'n/a' : fmtDelta(ev.delta, 1) + ' lb'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* AGE-ADJUSTED WEIGHT MODEL */}
        <section className="block" id="ageModel">
          <h2>Age-adjusted decomposition — weight</h2>
          <div className="sect-sub">
            weight = a + CDC_P50(age) + b<sub>drift</sub>·years + monthly + DOW + residual
          </div>
          <div className="chart-wrap">
            <AgeDecomposition daily={daily} />
          </div>
        </section>

        {/* FORECAST */}
        <section className="block" id="forecast">
          <h2>Forecast</h2>
          <div className="sect-sub">
            Projection from the age-adjusted model. Bands = ±1.28σ (80%), ±1.96σ (95%) of residual.
            Assumes current drift continues; intervention invalidates.
          </div>
          <div className="chart-wrap">
            <WeightForecast daily={daily} />
          </div>
        </section>

        {/* SLEEP ARCHITECTURE */}
        <section className="block" id="sleep">
          <h2>Sleep architecture</h2>
          <div className="sect-sub">
            Awake / REM / Core / Deep composition, stacked. Stage data begins Feb 2025.
          </div>
          {lifeSignals
            ? <SleepArchitecture signals={lifeSignals.signals} start={lifeSignals.start} count={lifeSignals.count} />
            : <div style={{padding:'40px', textAlign:'center', color:'var(--fg-muted)'}}>Loading…</div>}
        </section>

        {/* COMPARISON */}
        <section className="block" id="comparison">
          <h2>Weight vs. US pop.</h2>
          <div className="sect-sub">
            Age-adjusted. NHANES 2015–2018.
          </div>
          <div style={{display:'flex', gap:16, marginBottom:16, flexWrap:'wrap', alignItems:'center'}}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <span className="label" style={{fontSize:'0.68rem', color:'var(--fg-muted)'}}>Race:</span>
              <div className="btn-group">
                <button className={clsx('btn small', cdcGroup === 'pooled' && 'active')}
                  onClick={() => setCdcGroup('pooled')}>All US men</button>
                <button className={clsx('btn small', cdcGroup === 'white' && 'active')}
                  onClick={() => setCdcGroup('white')}>NH-white</button>
              </div>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <span className="label" style={{fontSize:'0.68rem', color:'var(--fg-muted)'}}>SES:</span>
              <div className="btn-group">
                <button className={clsx('btn small', cdcSes === 'pooled' && 'active')}
                  onClick={() => setCdcSes('pooled')}>US avg</button>
                <button className={clsx('btn small', cdcSes === 'college' && 'active')}
                  onClick={() => setCdcSes('college')}>+ college grad</button>
                <button className={clsx('btn small', cdcSes === 'affluent' && 'active')}
                  onClick={() => setCdcSes('affluent')}>+ affluent</button>
                <button className={clsx('btn small', cdcSes === 'ne_urban' && 'active')}
                  onClick={() => setCdcSes('ne_urban')}>+ NE urban</button>
              </div>
              {cdcSes !== 'pooled' && (
                <span style={{fontSize:'0.74rem', color:'var(--fg-muted-2)', fontStyle:'italic'}}>
                  ref. −{CDC_SES_SHIFTS[cdcSes].lbs} lb (rough, literature-based)
                </span>
              )}
            </div>
          </div>
          <div className="chart-wrap" style={{marginBottom:20}}>
            <PercentileTime daily={daily} smoothing={smoothing} birthYear={BIRTH_YEAR} group={cdcGroup} ses={cdcSes} />
          </div>
          <div className="chart-wrap">
            <PercentileHistory daily={daily} smoothing={smoothing} birthYear={BIRTH_YEAR} group={cdcGroup} ses={cdcSes} />
          </div>
        </section>

        {/* EXPLORER */}
        <section className="block" id="explorer">
          <h2>Explorer</h2>
          <div className="sect-sub">
            Scatter any two signals. Optional size and color. Lag shifts Y relative to X.
          </div>
          {lifeSignals
            ? <Explorer signals={lifeSignals.signals} start={lifeSignals.start} count={lifeSignals.count} />
            : <div style={{padding:'40px', textAlign:'center', color:'var(--fg-muted)'}}>Loading signals…</div>}
        </section>

        {/* SPIRAL */}
        <section className="block" id="spiral">
          <h2>Spiral</h2>
          <div className="sect-sub">
            Angle = calendar position, radius = year, color = signal value.
          </div>
          <div className="chart-wrap">
            {lifeSignals
              ? <SpiralAny signals={lifeSignals.signals} start={lifeSignals.start} count={lifeSignals.count} defaultKey="weight" />
              : <div style={{padding:'40px', textAlign:'center', color:'var(--fg-muted)'}}>Loading…</div>}
          </div>
        </section>

        <footer>
          <p>
            {data.meta.weighInCount.toLocaleString()} weigh-ins, {data.meta.firstDay} – {data.meta.lastDay}.
            Weigh-ins cover {((data.meta.dayCount/data.meta.totalDays)*100).toFixed(0)}% of days; rest linearly interpolated.
            CDC tables: NHANES 2015–2018.
          </p>
        </footer>
      </div>

      {/* Tweaks panel */}
      <div className={clsx('tweaks', tweaksOpen && 'show')}>
        <h4>Tweaks</h4>
        <div className="tweaks-row">
          <div className="label">Smoothing: <b style={{color:'var(--blue)'}}>{smoothing}d</b></div>
          <input type="range" min="1" max="60" step="1" value={smoothing}
            onChange={e => setSmoothingAndPersist(+e.target.value)} />
        </div>
        <div className="tweaks-row">
          <div className="label">Reset smoothing</div>
          <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
            {[1, 7, 14, 28, 60].map(w => (
              <button key={w} className={clsx('btn small', smoothing === w && 'active')}
                onClick={() => setSmoothingAndPersist(w)}>{w}d</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==== Findings blocks ====

function Findings({ daily, events }) {
  // Extract some noteworthy things from the data
  const rolled = rollingAvg(daily.map(d => d.w), 30);
  const trend = daily.map(d => d.trend);
  // Flatten null trend by clamping
  const firstTrend = trend.find(v => v !== null);
  const lastTrend = [...trend].reverse().find(v => v !== null);
  const netTrend = lastTrend - firstTrend;

  // Largest residual spike
  let maxAbsResid = 0, maxResidIdx = 0;
  daily.forEach((d,i) => { if (d.resid !== null && Math.abs(d.resid) > maxAbsResid) { maxAbsResid = Math.abs(d.resid); maxResidIdx = i; } });

  return (
    <div style={{marginTop:20}}>
      <div className="finding">
        <b className="tag">Finding:</b>
        The underlying trend moved <b>{fmtDelta(netTrend, 1)} lb</b> across the 15 years — about <b>{(netTrend/15).toFixed(1)} lb/year</b>.
        Most of the motion happened in discrete episodes, not as a smooth drift; the trend line is more staircase than ramp.
      </div>
      <div className="finding">
        <b className="tag">Finding:</b>
        The largest single residual — the biggest move neither trend nor season explains — sits around <b>{fmtDayShort(parseDay(daily[maxResidIdx].d))}</b>,
        at <b>{fmtDelta(daily[maxResidIdx].resid, 1)} lb</b> off the expected value. Consider tagging what was happening then.
      </div>
    </div>
  );
}

function SeasonalFindings({ monthAvg, dowAvg }) {
  let heaviestMo = 0, lightestMo = 0;
  monthAvg.forEach((v,i) => { if (v > monthAvg[heaviestMo]) heaviestMo = i; if (v < monthAvg[lightestMo]) lightestMo = i; });
  const seasSwing = monthAvg[heaviestMo] - monthAvg[lightestMo];

  let heaviestDow = 0, lightestDow = 0;
  dowAvg.forEach((v,i) => { if (v > dowAvg[heaviestDow]) heaviestDow = i; if (v < dowAvg[lightestDow]) lightestDow = i; });
  const dowSwing = dowAvg[heaviestDow] - dowAvg[lightestDow];

  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
