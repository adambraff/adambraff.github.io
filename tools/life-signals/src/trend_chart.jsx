// Main trend chart — raw points + rolling average + event markers/bands.
// Supports two interactive add modes:
//   - 'point' : click pins a single-date event
//   - 'band'  : click-drag selects a date range

function TrendChart({ daily, smoothing, events, addMode, onAddPoint, onAddBand, height=360, range=null }) {
  const wrapRef = React.useRef(null);
  const w = useContainerWidth(wrapRef, 900);
  const [hover, setHover] = React.useState(null);
  const [drag, setDrag] = React.useState(null); // {x0, x1} in px

  const margin = { top: 16, right: 20, bottom: 28, left: 44 };
  const innerW = Math.max(300, w - margin.left - margin.right);
  const innerH = height - margin.top - margin.bottom;

  const data = React.useMemo(() => {
    if (!range) return daily;
    const [a, b] = range;
    return daily.filter(d => {
      const ms = parseDay(d.d);
      return ms >= a && ms <= b;
    });
  }, [daily, range]);

  const rolled = React.useMemo(() => rollingAvg(data.map(d => d.w), smoothing), [data, smoothing]);

  const firstMs = parseDay(data[0].d);
  const lastMs = parseDay(data[data.length-1].d);
  const allW = data.map(d => d.w_raw).filter(x => x !== null);
  const rawMin = Math.min(...allW);
  const rawMax = Math.max(...allW);
  const yMin = Math.floor(rawMin - 1);
  const yMax = Math.ceil(rawMax + 1);
  const sx = scale([firstMs, lastMs], [0, innerW]);
  const sy = scale([yMin, yMax], [innerH, 0]);
  sy.w = innerW;

  const years = [];
  const y0 = new Date(firstMs).getUTCFullYear();
  const y1 = new Date(lastMs).getUTCFullYear();
  const yearStep = (y1 - y0) > 8 ? 2 : 1;
  for (let y = y0; y <= y1; y += yearStep) years.push(Date.UTC(y,0,1));
  const yTicks = niceTicks(yMin, yMax, 6);

  const rollPts = data.map((d, i) => {
    const v = rolled[i];
    return [sx(parseDay(d.d)), v === null ? null : sy(v)];
  });
  const rawDots = data.filter(d => d.w_raw !== null);

  const pxToDay = (px) => {
    const ms = sx.invert(px);
    const idx = Math.max(0, Math.min(data.length-1, Math.round((ms - firstMs)/DAY_MS)));
    return data[idx].d;
  };

  const mousePx = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX - rect.left - margin.left;
  };

  const handleDown = (e) => {
    if (addMode !== 'band') return;
    const x = mousePx(e);
    if (x < 0 || x > innerW) return;
    setDrag({ x0: x, x1: x });
  };
  const handleMove = (e) => {
    const x = mousePx(e);
    if (x >= 0 && x <= innerW) {
      const idx = Math.max(0, Math.min(data.length-1, Math.round((sx.invert(x) - firstMs)/DAY_MS)));
      const d = data[idx];
      setHover({
        x: sx(parseDay(d.d)) + margin.left,
        y: (rolled[idx] !== null ? sy(rolled[idx]) : innerH/2) + margin.top,
        day: d.d, w: d.w_raw, wAvg: rolled[idx],
      });
    } else {
      setHover(null);
    }
    if (drag) setDrag(d => ({ ...d, x1: Math.max(0, Math.min(innerW, x)) }));
  };
  const handleUp = (e) => {
    if (drag) {
      const px0 = Math.min(drag.x0, drag.x1);
      const px1 = Math.max(drag.x0, drag.x1);
      if (px1 - px0 >= 4) {
        const d0 = pxToDay(px0);
        const d1 = pxToDay(px1);
        if (onAddBand) onAddBand(d0, d1);
      } else if (addMode === 'band') {
        // treated as a click in band mode — no-op
      }
      setDrag(null);
    }
  };
  const handleClick = (e) => {
    if (addMode !== 'point' || !onAddPoint) return;
    const x = mousePx(e);
    if (x < 0 || x > innerW) return;
    onAddPoint(pxToDay(x));
  };

  // Visible events within current range
  const visibleEvents = events.filter(ev => {
    const a = parseDay(ev.date);
    const b = ev.end ? parseDay(ev.end) : a;
    return b >= firstMs && a <= lastMs;
  });

  return (
    <div ref={wrapRef} style={{position:'relative', width:'100%'}}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}
        style={{cursor: addMode === 'point' ? 'crosshair' : (addMode === 'band' ? 'ew-resize' : 'default'), display:'block', userSelect:'none'}}
        onMouseMove={handleMove}
        onMouseLeave={() => { setHover(null); setDrag(null); }}
        onMouseDown={handleDown}
        onMouseUp={handleUp}
        onClick={handleClick}>
        <g transform={`translate(${margin.left},${margin.top})`}>

          {/* Event BANDS (shaded rectangles, behind everything) */}
          {visibleEvents.filter(ev => ev.end).map((ev, i) => {
            const idx = events.findIndex(e => e.id === ev.id);
            const col = EVENT_COLORS[idx % EVENT_COLORS.length];
            const x0 = Math.max(0, sx(parseDay(ev.date)));
            const x1 = Math.min(innerW, sx(parseDay(ev.end)));
            return (
              <g key={ev.id}>
                <rect x={x0} y={0} width={Math.max(1, x1 - x0)} height={innerH}
                  fill={col} opacity="0.08" />
                <line x1={x0} x2={x0} y1={0} y2={innerH} stroke={col} strokeWidth="1" opacity="0.5" />
                <line x1={x1} x2={x1} y1={0} y2={innerH} stroke={col} strokeWidth="1" opacity="0.5" />
                <rect x={x0} y={0} width={Math.max(1, x1-x0)} height={14} fill={col} opacity="0.85" />
                <title>{ev.date} → {ev.end} — {ev.label}</title>
              </g>
            );
          })}

          <YAxisLeft scaleY={sy} x={0} ticks={yTicks} fmt={v => v.toFixed(0)} label="WEIGHT (lb)" />
          <XAxisTime scaleX={sx} y={innerH} ticks={years}
            fmt={t => new Date(t).getUTCFullYear()} />

          {rawDots.map((d, i) => (
            <circle key={i}
              cx={sx(parseDay(d.d))} cy={sy(d.w_raw)}
              r="1.3" fill="#6c8cff" opacity="0.25" />
          ))}

          <path d={linePath(rollPts)} fill="none" stroke="#6c8cff" strokeWidth="1.8" />

          {/* Event POINTS (vertical lines) */}
          {visibleEvents.filter(ev => !ev.end).map((ev) => {
            const idx = events.findIndex(e => e.id === ev.id);
            const col = EVENT_COLORS[idx % EVENT_COLORS.length];
            const x = sx(parseDay(ev.date));
            return (
              <g key={ev.id}>
                <line x1={x} x2={x} y1={0} y2={innerH} stroke={col} strokeDasharray="3 3" strokeWidth="1" opacity="0.55" />
                <circle cx={x} cy={8} r="4" fill={col} />
                <title>{ev.date} — {ev.label}</title>
              </g>
            );
          })}

          {/* Drag preview */}
          {drag && (
            <g pointerEvents="none">
              <rect x={Math.min(drag.x0, drag.x1)} y={0}
                width={Math.abs(drag.x1 - drag.x0)} height={innerH}
                fill="#6c8cff" opacity="0.18" />
              <line x1={drag.x0} x2={drag.x0} y1={0} y2={innerH} stroke="#6c8cff" strokeWidth="1" />
              <line x1={drag.x1} x2={drag.x1} y1={0} y2={innerH} stroke="#6c8cff" strokeWidth="1" />
            </g>
          )}

          {hover && (
            <g pointerEvents="none">
              <line x1={hover.x - margin.left} x2={hover.x - margin.left}
                y1={0} y2={innerH} stroke="#6c8cff" strokeWidth="1" opacity="0.5" />
              {hover.wAvg !== null && (
                <circle cx={hover.x - margin.left} cy={hover.y - margin.top} r="4" fill="#6c8cff" />
              )}
            </g>
          )}
        </g>
      </svg>

      {hover && !drag && (
        <div className="tooltip" style={{
          left: Math.min(w - 180, Math.max(0, hover.x + 10)),
          top: Math.max(0, hover.y - 50)
        }}>
          <div><span className="tt-k">{fmtDayShort(parseDay(hover.day))}</span></div>
          {hover.w !== null && <div><span className="tt-k">Weigh-in: </span><span className="tt-v">{hover.w.toFixed(1)} lb</span></div>}
          <div><span className="tt-k">{smoothing}-day avg: </span><span className="tt-v">{hover.wAvg ? hover.wAvg.toFixed(1) : '—'} lb</span></div>
        </div>
      )}

      {drag && (
        <div className="tooltip" style={{
          left: Math.min(w - 200, Math.max(0, Math.min(drag.x0, drag.x1) + margin.left)),
          top: 4
        }}>
          <span className="tt-k">Selecting: </span>
          <span className="tt-v">{pxToDay(Math.min(drag.x0, drag.x1))} → {pxToDay(Math.max(drag.x0, drag.x1))}</span>
        </div>
      )}

      {addMode === 'point' && <div className="scroll-hint">Click to pin a date</div>}
      {addMode === 'band' && <div className="scroll-hint">Click-drag to select a range</div>}
    </div>
  );
}

window.TrendChart = TrendChart;
