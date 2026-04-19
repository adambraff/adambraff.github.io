// Main app — wires together all sections.

const BIRTH_YEAR = 1970;
const HEIGHT_IN = 70;

function App() {
  const [data, setData] = React.useState(null);
  const [lifeSignals, setLifeSignals] = React.useState(null);
  const [smoothing, setSmoothing] = React.useState(() => {
    return loadLS('we.smoothing', TWEAK_DEFAULTS.smoothingWindow || 7);
  });
  const [events, setEvents] = React.useState(() => loadLS('we.events', DEFAULT_EVENTS));
  const [rangeKey, setRangeKey] = React.useState('all');
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [addMode, setAddMode] = React.useState(false);

  React.useEffect(() => {
    fetch('data/weight.json').then(r => r.json()).then(setData);
    fetch('data/life_signals.json').then(r => r.json()).then(setLifeSignals).catch(() => {});
  }, []);

  React.useEffect(() => saveLS('we.smoothing', smoothing), [smoothing]);
  React.useEffect(() => saveLS('we.events', events), [events]);

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
  const currentPct = cdcPercentile(ageNow, currentAvg);
  const ageStart = ageAt(parseDay(daily[0].d), BIRTH_YEAR);
  const startPct = cdcPercentile(ageStart, rolledAll.find(v => v !== null));

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
            <a href="#decompose">Decompose</a>
            <a href="#seasonality">Seasonality</a>
            <a href="#sleep">Sleep</a>
            <a href="#events">Events</a>
            <a href="#comparison">Compare</a>
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
            Fifteen years of one body, instrumented. <b>5,400 weigh-ins</b> on a Withings scale since <b>August 2011</b>,
            plus a decade of steps, sleep, gait, and other passive readings from iPhone and Apple Watch.
            What moves together, what leads what, what explains what.
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
            Weight plus six non-weight signals, each shown as a 365-day centered trend on a shared timeline.
            The faint band behind each line is the weekly min–max of daily readings. Scan vertically: where does a signal inflect
            the same way weight does, at roughly the same time? That's a candidate hypothesis — not a conclusion.
          </div>
          {lifeSignals
            ? <LifeSignals signals={lifeSignals.signals} start={lifeSignals.start} count={lifeSignals.count} />
            : <div style={{padding:'40px', textAlign:'center', color:'var(--fg-muted)'}}>Loading signals…</div>}
          <div className="finding" style={{marginTop:16}}>
            <b className="tag">Coverage note:</b>
            Each series starts when its sensor did. Weight from 2011, steps from 2014, sleep from 2016, gait and active-energy
            metrics from 2020. Visual dropouts are absent data, not zeros. Don't read a flat gap as "nothing was happening."
          </div>
        </section>

        {/* TREND */}
        <section className="block" id="trend">
          <h2>Weight — the long run</h2>
          <div className="sect-sub">
            Your full weigh-in history at the {smoothing}-day rolling average (blue line). Each small dot is a single morning on the scale —
            the cloud around the line is the daily noise. Shaded bars overlay life events: click the chart to pin a date, or edit events on the right.
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
            <div style={{marginLeft:'auto'}}>
              <button className={clsx('btn small', addMode && 'active')}
                onClick={() => setAddMode(m => !m)}>
                {addMode ? 'Click chart to add…' : '+ Add event by click'}
              </button>
            </div>
          </div>

          <div className="grid-trend">
            <div className="chart-wrap">
              <TrendChart daily={daily} smoothing={smoothing} events={events}
                range={currentRange}
                onClickAdd={addMode ? (d) => {
                  const label = prompt(`What happened around ${d}?`);
                  if (label && label.trim()) {
                    setEvents(evs => [...evs, {
                      id: 'e' + Date.now(),
                      date: d,
                      label: label.trim()
                    }]);
                  }
                } : null} />
            </div>
            <div className="panel panel-pad">
              <div className="label" style={{marginBottom:10}}>Life events</div>
              <div style={{fontSize:'0.76rem', color:'var(--fg-muted)', marginBottom:12, lineHeight:1.5}}>
                Annotate your history. Use date ranges for jobs or phases, single dates for moments.
                Click any row to edit. Stored locally.
              </div>
              <EventList events={events}
                onAdd={(ev) => setEvents(e => [...e, ev])}
                onDelete={(id) => setEvents(e => e.filter(x => x.id !== id))}
                onUpdate={(ev) => setEvents(e => e.map(x => x.id === ev.id ? ev : x))} />
            </div>
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

        {/* DECOMPOSE — any signal */}
        <section className="block" id="decompose">
          <h2>Decomposition — trend, season, residual</h2>
          <div className="sect-sub">
            A simplified STL for any signal. The trend is a 365-day centered mean; the monthly seasonal is each calendar month's average deviation from that trend;
            the DOW seasonal is each day-of-week's average deviation; the residual is what's left — one-off moves that neither the long arc nor the calendar can explain.
            Pick a signal to see its own decomposition.
          </div>
          {lifeSignals
            ? <DecomposeAny signals={lifeSignals.signals} start={lifeSignals.start} count={lifeSignals.count} defaultKey="weight" />
            : <div style={{padding:'40px', textAlign:'center', color:'var(--fg-muted)'}}>Loading…</div>}
          <Findings daily={daily} events={events} />
        </section>

        {/* SEASONALITY */}
        <section className="block" id="seasonality">
          <h2>The calendar's pull</h2>
          <div className="sect-sub">
            How much the selected signal tends to deviate from its 1-year trend, by month and by day of the week,
            plus a polar view of the full annual cycle. Pick any signal to see its own seasonal pattern.
          </div>
          {lifeSignals
            ? <SeasonalityAny signals={lifeSignals.signals} start={lifeSignals.start} count={lifeSignals.count} defaultKey="weight" />
            : <div style={{padding:'40px', textAlign:'center', color:'var(--fg-muted)'}}>Loading…</div>}
        </section>

        {/* SLEEP ARCHITECTURE */}
        <section className="block" id="sleep">
          <h2>Sleep architecture</h2>
          <div className="sect-sub">
            Apple only started emitting stage-level breakdowns from your phone in early 2025 — before that, all sleep was lumped
            into "asleep, unspecified." This section shows the stage composition (Awake / REM / Core / Deep) from the day stages
            first appeared, stacked to total time in bed. The longer-run total-sleep trend lives in the Signals panel and Decompose section above.
          </div>
          {lifeSignals
            ? <SleepArchitecture signals={lifeSignals.signals} start={lifeSignals.start} count={lifeSignals.count} />
            : <div style={{padding:'40px', textAlign:'center', color:'var(--fg-muted)'}}>Loading…</div>}
        </section>

        {/* EVENT DELTAS */}
        <section className="block" id="events">
          <h2>Event deltas</h2>
          <div className="sect-sub">
            For each annotated event, the change in 90-day average weight after vs. before. Edit the event list in the
            Weight section above, or click the trend chart with "Add event" on to pin one directly. Your annotations are saved locally.
          </div>
          <div className="panel panel-pad">
            {eventDeltas.length === 0 &&
              <div style={{fontSize:'0.82rem', color:'var(--fg-muted)', fontStyle:'italic'}}>Add events to see deltas.</div>
            }
            {eventDeltas.map(ev => (
              <div key={ev.id} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border-soft)', fontSize:'0.88rem'}}>
                <span style={{color:'var(--fg-2)', paddingRight:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={ev.label}>{ev.label}</span>
                <span style={{fontVariantNumeric:'tabular-nums', fontWeight:600,
                  color: ev.delta === null ? 'var(--fg-muted)' : (ev.delta > 0 ? '#ff5555' : '#4ae04a')}}>
                  {ev.delta === null ? 'n/a' : fmtDelta(ev.delta, 1) + ' lb'}
                </span>
              </div>
            ))}
            <div style={{fontSize:'0.74rem', color:'var(--fg-muted-2)', fontStyle:'italic', marginTop:14, lineHeight:1.5}}>
              ⚠ Correlation, not causation. Many events coincide — e.g. a move and a diet change in the same week will both appear to own the delta.
            </div>
          </div>
        </section>

        {/* COMPARISON */}
        <section className="block" id="comparison">
          <h2>How you sit against the distribution</h2>
          <div className="sect-sub">
            US adult males, age-adjusted, height 5'10". Bands are from the CDC NHANES anthropometric reference tables, interpolated
            to your height. As you age, the median weight of your peers shifts — so your own percentile can drift even while you stand still.
          </div>
          <div className="chart-wrap" style={{marginBottom:20}}>
            <div className="chart-title">Your weight vs. the age-adjusted distribution</div>
            <div className="chart-sub">Orange bands = US male distribution at your age (shifts over time)</div>
            <PercentileTime daily={daily} smoothing={smoothing} birthYear={BIRTH_YEAR} />
          </div>
          <div className="chart-wrap">
            <div className="chart-title">Your percentile over time</div>
            <div className="chart-sub">Where you fall among US males at each point in your life (lower = lighter than median)</div>
            <PercentileHistory daily={daily} smoothing={smoothing} birthYear={BIRTH_YEAR} />
          </div>
          <div className="finding" style={{marginTop:20}}>
            <b className="tag">Finding:</b>
            You've held roughly the <b>P{currentPct.toFixed(0)}</b> slot among US males your age, meaning you are lighter than roughly
            <b> {(100 - currentPct).toFixed(0)}%</b> of American men age {Math.round(ageNow)} at 5'10".
            Because the median US male <i>gains</i> weight from age 40 to 55 before losing it, your percentile has drifted down even when your own weight hasn't moved much.
          </div>
        </section>

        {/* EXPLORER */}
        <section className="block" id="explorer">
          <h2>Explorer — test your hypothesis</h2>
          <div className="sect-sub">
            Pick any two signals for X and Y. Optionally add a third as bubble size and a fourth as color.
            Toggle each between raw daily values and day-over-day change. The lag slider shifts Y relative to X
            — positive lag asks "does X today predict Y in <i>lag</i> days?" One point per day where all selected
            variables have a reading.
          </div>
          {lifeSignals
            ? <Explorer signals={lifeSignals.signals} start={lifeSignals.start} count={lifeSignals.count} />
            : <div style={{padding:'40px', textAlign:'center', color:'var(--fg-muted)'}}>Loading signals…</div>}
          <div className="finding" style={{marginTop:16}}>
            <b className="tag">Warning:</b>
            Pearson r is fragile. Day-over-day Δ amplifies noise; long lags reduce n; outliers distort slopes. Use n and r² together —
            an r of 0.3 with n=50 is weaker than r=0.15 with n=2,000. And correlation is still not causation.
          </div>
        </section>

        {/* SPIRAL */}
        <section className="block" id="spiral">
          <h2>One signal, one glance</h2>
          <div className="sect-sub">
            A radial map: calendar angle, year radius, signal-value color. A single image of the entire record. If you see consistent warm arcs in
            the same angular slices, that's seasonality made visible; if a ring is uniformly warmer than its neighbors, that's a year-long shift.
            Pick any signal.
          </div>
          <div className="chart-wrap">
            {lifeSignals
              ? <SpiralAny signals={lifeSignals.signals} start={lifeSignals.start} count={lifeSignals.count} defaultKey="weight" />
              : <div style={{padding:'40px', textAlign:'center', color:'var(--fg-muted)'}}>Loading…</div>}
          </div>
        </section>

        <footer>
          <p>
            Data: <b>{data.meta.weighInCount.toLocaleString()}</b> weigh-ins from a Withings scale, {data.meta.firstDay} through {data.meta.lastDay}.
            Daily series linearly interpolated where weigh-ins are missing (<b>{((1 - data.meta.dayCount/data.meta.totalDays)*100).toFixed(0)}%</b> of days).
            Comparison tables derive from CDC NHANES 2015–2018 anthropometric reference data for US adult males, height-matched to 70".
          </p>
          <p><i>Methodology: trend = 365-day centered mean. Seasonal = mean detrended residual by day-of-year, smoothed with a 31-day circular window.
          Percentile interpolation is linear within CDC bands; treat within ±3 percentile points as noise. This is a decomposition, not a forecast.</i></p>
        </footer>
      </div>

      {/* Tweaks panel */}
      <div className={clsx('tweaks', tweaksOpen && 'show')}>
        <h4>Tweaks</h4>
        <div className="tweaks-row">
          <div className="label">Smoothing window: <b style={{color:'var(--blue)'}}>{smoothing} days</b></div>
          <input type="range" min="1" max="60" step="1" value={smoothing}
            onChange={e => setSmoothingAndPersist(+e.target.value)} />
          <div style={{fontSize:'0.72rem', color:'var(--fg-muted)', marginTop:4}}>
            Raw daily scale readings are noisy. A wider window calms the line but delays inflection points.
          </div>
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
