// Shared utilities — dates, scales, colors, storage

const DAY_MS = 86400000;

window.parseDay = function(s) {
  return Date.UTC(+s.slice(0,4), +s.slice(5,7)-1, +s.slice(8,10));
};
window.fmtDay = function(ms) {
  const d = new Date(ms);
  return d.getUTCFullYear() + '-' +
    String(d.getUTCMonth()+1).padStart(2,'0') + '-' +
    String(d.getUTCDate()).padStart(2,'0');
};
window.fmtDayShort = function(ms) {
  const d = new Date(ms);
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];
  return `${mo} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

// Rolling trailing average over a daily array (ignores nulls but counts all in window)
window.rollingAvg = function(values, win) {
  const out = new Array(values.length);
  let sum = 0, count = 0;
  const q = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v !== null && v !== undefined && !isNaN(v)) { sum += v; count++; q.push(v); }
    else q.push(null);
    if (q.length > win) {
      const old = q.shift();
      if (old !== null) { sum -= old; count--; }
    }
    out[i] = count > 0 ? sum/count : null;
  }
  return out;
};

// Linear scale
window.scale = function(domain, range) {
  const [d0, d1] = domain, [r0, r1] = range;
  const m = (r1 - r0) / (d1 - d0);
  const fn = (v) => r0 + (v - d0) * m;
  fn.invert = (v) => d0 + (v - r0) / m;
  fn.domain = domain; fn.range = range;
  return fn;
};

// Nice ticks
window.niceTicks = function(min, max, count) {
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  let step;
  if (norm < 1.5) step = 1*mag;
  else if (norm < 3) step = 2*mag;
  else if (norm < 7) step = 5*mag;
  else step = 10*mag;
  const t0 = Math.ceil(min/step)*step;
  const ticks = [];
  for (let v = t0; v <= max + 1e-9; v += step) ticks.push(+v.toFixed(10));
  return ticks;
};

// Compute age at date given birth year
window.ageAt = function(dateMs, birthYear) {
  const d = new Date(dateMs);
  return d.getUTCFullYear() - birthYear + (d.getUTCMonth()/12);
};

window.EVENT_COLORS = [
  '#6c8cff', '#ff9d4d', '#4ae04a', '#9d8fff',
  '#00d9ff', '#f0c040', '#f472b6', '#1abc9c',
];

// Local storage helpers
window.loadLS = function(k, d) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }
  catch { return d; }
};
window.saveLS = function(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

// Month / day-of-week labels
window.MO_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
window.DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Small helpers
window.clsx = (...xs) => xs.filter(Boolean).join(' ');
window.fmtLb = (v, d=1) => (v === null || v === undefined || isNaN(v)) ? '—' : v.toFixed(d) + ' lb';
window.fmtDelta = (v, d=1) => {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const sign = v > 0 ? '+' : (v < 0 ? '−' : '');
  return sign + Math.abs(v).toFixed(d);
};
