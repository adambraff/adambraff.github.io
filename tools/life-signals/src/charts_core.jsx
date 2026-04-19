// Charting core — reusable SVG chart primitives.
// No React hooks exported — these are pure render functions called inside components.

// Axis renderers
window.XAxisTime = function({ scaleX, y, ticks, fmt }) {
  return (
    <g transform={`translate(0,${y})`}>
      <line className="axis-line" x1={scaleX.range[0]} x2={scaleX.range[1]} y1="0" y2="0" />
      {ticks.map((t, i) => (
        <g key={i} transform={`translate(${scaleX(t)},0)`}>
          <line y1="0" y2="4" className="axis-line" />
          <text y="16" className="axis-text" textAnchor="middle">{fmt(t)}</text>
        </g>
      ))}
    </g>
  );
};

window.YAxisLeft = function({ scaleY, x, ticks, fmt, label }) {
  return (
    <g transform={`translate(${x},0)`}>
      {ticks.map((t, i) => (
        <g key={i} transform={`translate(0,${scaleY(t)})`}>
          <line x1="-4" x2="0" className="axis-line" />
          <text x="-8" y="3" className="axis-text" textAnchor="end">{fmt(t)}</text>
          <line x1="0" x2={scaleY.w || 800} y1="0" y2="0" className="gridline" />
        </g>
      ))}
      {label && <text transform={`translate(-42,${(scaleY.range[0]+scaleY.range[1])/2}) rotate(-90)`}
        className="axis-text" textAnchor="middle" style={{fontSize:11, fill:'var(--fg-muted)'}}>{label}</text>}
    </g>
  );
};

// Build a smooth line path from (x,y) points, nulls create gaps
window.linePath = function(points) {
  let d = '';
  let pen = false;
  for (const p of points) {
    if (p === null || p[1] === null || p[1] === undefined || isNaN(p[1])) { pen = false; continue; }
    d += (pen ? ' L ' : ' M ') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
    pen = true;
  }
  return d;
};

// Area path between two series (upper/lower)
window.areaPath = function(points) {
  // points: [[x, yLow, yHigh], ...] with no nulls
  if (!points.length) return '';
  let d = 'M ' + points[0][0].toFixed(1) + ' ' + points[0][2].toFixed(1);
  for (let i = 1; i < points.length; i++)
    d += ' L ' + points[i][0].toFixed(1) + ' ' + points[i][2].toFixed(1);
  for (let i = points.length-1; i >= 0; i--)
    d += ' L ' + points[i][0].toFixed(1) + ' ' + points[i][1].toFixed(1);
  d += ' Z';
  return d;
};

// Use hook for container sizing (responsive width)
window.useContainerWidth = function(ref, fallback = 800) {
  const [w, setW] = React.useState(fallback);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(Math.floor(e.contentRect.width));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return w;
};
