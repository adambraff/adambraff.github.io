/* Crime map core: location parsing, offline geocoding against TIGER street
   ranges, severity weights and scoring. Shared by index.html and weekly.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CrimeCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const HOME = { lat: 41.82659, lon: -71.39534, label: '56 Cooke St' };

  // ---------- severity ----------
  // 0 = not a crime against people/property; excluded from ranking.
  const SEVERITY = {
    'Murder\\Manslaughter': 10, 'Shots Fired': 9, 'Robbery': 8, 'Assault, Aggravated': 8,
    'Kidnapping': 8, 'Sex Offense': 8, 'Arson': 7, 'Burglary': 7, 'Weapons': 6,
    'Motor Vehicle Theft': 5, 'Larceny, Purse-snatching': 5, 'Larceny, Pickpocketing': 4,
    'Assault, Simple': 4, 'Assault, Threats': 4, 'Larceny from Motor Vehicle': 3,
    'Theft of MV Parts': 3, 'Larceny from Building': 3, 'Peeping Tom': 3,
    'Vandalism': 2, 'Malicious Mischief': 2, 'Property Damage': 2, 'Larceny, Other': 2,
    'Larceny - Theft': 2, 'Tresspassing': 2, 'Trespass': 2, 'Disorderly Conduct': 2,
    'Drug Offenses': 2, 'Suspicious Person': 2, 'Stolen Property': 1,
    'Receiving Stolen Property': 1, 'DUI': 1, 'Larceny, Shoplifting': 1, 'Fraud': 1,
    'Fraud, Swindle': 1, 'Fraud, Credit Card': 1, 'Fraud, Wire': 1, 'Forgery': 1,
    'Embezzelment': 1, 'Bad Checks': 1, 'Liquor Law Violations': 1, 'Disturbance': 1,
    'RI Statute Violation': 1,
    'Warrant\\Capias': 0, 'Traffic Violation': 0, 'Lost Article': 0,
    'Request for Assistance': 0, 'Municipal Code Violation': 0, 'Auto Towed': 0,
    'Assistance Rendered': 0, 'Dispersals': 0, 'Stolen Vehicle\\Recovered': 0,
    'Alarm-Panic': 0, 'Alarm-Business': 0, 'Accident': 0, 'Animal Complaint': 0,
    'Animal Bite': 0, 'City Ordinance Violation': 0
  };
  function severity(desc) {
    if (!desc) return 0;
    if (desc in SEVERITY) return SEVERITY[desc];
    const d = desc.toLowerCase();
    if (/homicide|murder/.test(d)) return 10;
    if (/robbery|aggravated|kidnap|sex/.test(d)) return 8;
    if (/burglary|arson/.test(d)) return 7;
    if (/weapon|shot/.test(d)) return 6;
    if (/assault/.test(d)) return 4;
    if (/larceny|theft/.test(d)) return 2;
    return 1;
  }
  function tier(sev) { return sev >= 7 ? 'high' : sev >= 4 ? 'med' : 'low'; }

  // ---------- street name normalization ----------
  const SUFFIX = {
    STREET: 'ST', STR: 'ST', SREET: 'ST', STRET: 'ST', STEET: 'ST', AVENUE: 'AVE', AV: 'AVE', AVE: 'AVE',
    BOULEVARD: 'BLVD', BLV: 'BLVD', BLVD: 'BLVD', ALLEY: 'ALY', ALL: 'ALY', ALY: 'ALY',
    PLACE: 'PL', ROAD: 'RD', LANE: 'LN', DRIVE: 'DR', TERRACE: 'TER', TERR: 'TER',
    COURT: 'CT', SQUARE: 'SQ', PARKWAY: 'PKWY', PKY: 'PKWY', PLAZA: 'PLZ',
    HIGHWAY: 'HWY', CIRCLE: 'CIR', EXPRESSWAY: 'EXPY'
  };
  const DIRS = { NORTH: 'N', SOUTH: 'S', EAST: 'E', WEST: 'W' };
  function norm(s) {
    if (!s) return '';
    let w = s.toUpperCase().replace(/[.,']/g, '').replace(/\s+/g, ' ').trim().split(' ');
    if (w.length > 1 && DIRS[w[0]]) w[0] = DIRS[w[0]];
    w = w.map(x => x === 'MT' ? 'MOUNT' : x);
    const last = w.length - 1;
    if (last > 0 && SUFFIX[w[last]]) w[last] = SUFFIX[w[last]];
    return w.join(' ');
  }
  function base(n) { const w = n.split(' '); return w.length > 1 && Object.values(SUFFIX).includes(w[w.length - 1]) ? w.slice(0, -1).join(' ') : n; }

  // ---------- geometry ----------
  const R = 3958.8;
  function miles(a, b) {
    const toR = Math.PI / 180, dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const P = c => ({ lon: c[0], lat: c[1] });
  function lineLen(cs) { let L = 0; for (let i = 1; i < cs.length; i++) L += miles(P(cs[i - 1]), P(cs[i])); return L; }
  function along(cs, f) {
    const total = lineLen(cs); let target = total * Math.min(1, Math.max(0, f)), acc = 0;
    for (let i = 1; i < cs.length; i++) {
      const seg = miles(P(cs[i - 1]), P(cs[i]));
      if (acc + seg >= target && seg > 0) {
        const t = (target - acc) / seg;
        return { lon: cs[i - 1][0] + t * (cs[i][0] - cs[i - 1][0]), lat: cs[i - 1][1] + t * (cs[i][1] - cs[i - 1][1]) };
      }
      acc += seg;
    }
    return P(cs[cs.length - 1]);
  }

  // ---------- geocoder ----------
  function Geocoder(streets) {
    const byName = new Map(), byBase = new Map();
    const num = v => (v === '' || v == null) ? null : +v;
    const decode = str => {
      const out = []; let i = 0, lat = 0, lon = 0;
      const next = () => { let b, shift = 0, r = 0; do { b = str.charCodeAt(i++) - 63; r |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20); return (r & 1) ? ~(r >> 1) : (r >> 1); };
      while (i < str.length) { lat += next(); lon += next(); out.push([lon / 1e5, lat / 1e5]); }
      return out;
    };
    streets.edges.forEach(e => {
      const n = norm(streets.names[e[0]]);
      if (!byName.has(n)) byName.set(n, []);
      byName.get(n).push({ lf: num(e[1]), lt: num(e[2]), rf: num(e[3]), rt: num(e[4]), cs: typeof e[5] === 'string' ? decode(e[5]) : e[5] });
    });
    for (const n of byName.keys()) { const b = base(n); if (!byBase.has(b)) byBase.set(b, []); byBase.get(b).push(n); }
    // Split each name into connected pieces (same name can exist in two places);
    // order longest first so the main street wins ties.
    const parts = new Map();
    for (const [n, edges] of byName) {
      const key = c => c[0] + ',' + c[1], seen = new Set(), comps = [];
      const ptEdges = new Map();
      edges.forEach((e, i) => [e.cs[0], e.cs[e.cs.length - 1]].forEach(c => { const k = key(c); if (!ptEdges.has(k)) ptEdges.set(k, []); ptEdges.get(k).push(i); }));
      edges.forEach((_, i) => {
        if (seen.has(i)) return;
        const comp = [], stack = [i]; seen.add(i);
        while (stack.length) {
          const j = stack.pop(); comp.push(edges[j]);
          const e = edges[j];
          [e.cs[0], e.cs[e.cs.length - 1]].forEach(c => ptEdges.get(key(c)).forEach(k => { if (!seen.has(k)) { seen.add(k); stack.push(k); } }));
        }
        comp.len = comp.reduce((L, e) => L + lineLen(e.cs), 0);
        comps.push(comp);
      });
      comps.sort((a, b) => b.len - a.len);
      parts.set(n, comps);
    }
    const names = [...byName.keys()];
    const cache = new Map();

    function lev(a, b) {
      if (Math.abs(a.length - b.length) > 2) return 9;
      const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
      for (let j = 1; j <= b.length; j++) d[0][j] = j;
      for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      return d[a.length][b.length];
    }
    function resolve(raw) {
      const n = norm(raw);
      if (!n) return null;
      if (byName.has(n)) return n;
      const b = byBase.get(base(n));
      if (b && b.length === 1) return b[0];
      if (b && b.length > 1) { const st = b.find(x => x.endsWith(' ST')); if (st) return st; }
      // prefix match for truncated names ("MEMORIAL BLV" handled above; "GEORGE M COHAN")
      let best = null, bd = 3;
      for (const c of names) { const d = lev(n, c); if (d < bd) { bd = d; best = c; } }
      if (best && bd <= (n.length > 8 ? 2 : 1)) return best;
      return null;
    }

    function block(street, N) {
      const comps = parts.get(street); if (!comps) return null;
      let fallback = null;
      for (const c of comps) {
        const r = blockIn(c, N);
        if (r && r.precision === 'block') return r;
        if (r && !fallback) fallback = r;
      }
      return fallback;
    }
    function blockIn(edges, N) {
      const lo = N === 0 ? 1 : N, hi = N + 99;
      let sx = 0, sy = 0, sw = 0, nearest = null, nd = Infinity;
      for (const e of edges) {
        for (const [f, t] of [[e.lf, e.lt], [e.rf, e.rt]]) {
          if (f == null || t == null) continue;
          const a = Math.min(f, t), b = Math.max(f, t);
          const oLo = Math.max(a, lo), oHi = Math.min(b, hi);
          if (oLo <= oHi) {
            const mid = (oLo + oHi) / 2, frac = b === a ? 0.5 : (mid - f) / (t - f);
            const p = along(e.cs, frac), w = oHi - oLo + 1;
            sx += p.lon * w; sy += p.lat * w; sw += w;
          } else {
            const gap = oLo > oHi ? (a > hi ? a - hi : lo - b) : 0;
            if (gap < nd) { nd = gap; nearest = along(e.cs, a > hi ? (a === f ? 0 : 1) : (b === f ? 0 : 1)); }
          }
        }
      }
      if (sw) return { lat: sy / sw, lon: sx / sw, precision: 'block' };
      if (nearest && nd <= 200) return { ...nearest, precision: 'approx' };
      return null;
    }
    function intersection(s1, s2) {
      const A = byName.get(s1), B = byName.get(s2); if (!A || !B) return null;
      const ends = new Map();
      for (const e of A) for (const c of e.cs) ends.set(c[0] + ',' + c[1], c);
      for (const e of B) for (const c of e.cs) { const k = c[0] + ',' + c[1]; if (ends.has(k)) return { ...P(c), precision: 'intersection' }; }
      let best = null, bd = Infinity;
      for (const ea of A) for (const ca of ea.cs) for (const eb of B) for (const cb of eb.cs) {
        const d = miles(P(ca), P(cb)); if (d < bd) { bd = d; best = [ca, cb]; }
      }
      if (best && bd < 0.1) return { lon: (best[0][0] + best[1][0]) / 2, lat: (best[0][1] + best[1][1]) / 2, precision: 'intersection' };
      return null;
    }
    function bareStreet(s) {
      const comps = parts.get(s); if (!comps) return null;
      const edges = comps[0], len = comps[0].len;
      if (len > 0.4) return null; // too long to place without a block number
      let cx = 0, cy = 0, n = 0;
      edges.forEach(e => e.cs.forEach(c => { cx += c[0]; cy += c[1]; n++; }));
      cx /= n; cy /= n;
      let best = null, bd = Infinity;
      edges.forEach(e => e.cs.forEach(c => { const d = (c[0] - cx) ** 2 + (c[1] - cy) ** 2; if (d < bd) { bd = d; best = c; } }));
      return { ...P(best), precision: 'street' };
    }

    function geocode(loc) {
      if (!loc) return null;
      if (cache.has(loc)) return cache.get(loc);
      let out = null;
      const s = loc.replace(/\s+/g, ' ').trim();
      const m = s.match(/^(\d+)\s*Block\s*(.+)$/i);
      if (m) {
        const st = resolve(m[2]);
        if (st) out = block(st, parseInt(m[1], 10));
      } else if (/[&\/]/.test(s)) {
        const parts = s.split(/[&\/]/).map(x => x.trim()).filter(Boolean);
        const r = parts.map(resolve);
        if (r[0] && r[1]) out = intersection(r[0], r[1]);
        if (!out) for (const x of r) if (x && (out = bareStreet(x))) break;
      } else {
        const st = resolve(s);
        if (st) out = bareStreet(st);
      }
      cache.set(loc, out);
      return out;
    }
    // true if the location names a street inside the mapped area (used to count unplaceable records)
    function covered(loc) {
      const s = (loc || '').replace(/^\d+\s*Block\s*/i, '');
      return s.split(/[&\/]/).some(x => resolve(x.trim()));
    }
    return { geocode, resolve, covered };
  }

  // ---------- scoring ----------
  // proximity factor halves at `half` miles: 1 / (1 + (d/half)^2)
  function score(sev, d, half) { return sev / (1 + (d / half) ** 2); }

  /* rows: raw API rows. Returns { ranked, inRadius, unlocated, excluded, total } */
  function analyze(rows, geo, opts) {
    const o = Object.assign({ radius: 1, half: 0.35, top: 20, home: HOME }, opts || {});
    const cases = new Map();
    for (const r of rows) {
      const key = r.casenumber || (r.reported_date + r.location + r.offense_desc);
      const sev = severity(r.offense_desc);
      const c = cases.get(key);
      if (!c) cases.set(key, { id: key, date: r.reported_date, location: r.location || '', offenses: [r.offense_desc], statutes: [r.statute_desc].filter(Boolean), sev });
      else {
        if (!c.offenses.includes(r.offense_desc)) c.offenses.push(r.offense_desc);
        if (r.statute_desc && !c.statutes.includes(r.statute_desc)) c.statutes.push(r.statute_desc);
        if (sev > c.sev) { c.sev = sev; c.offenses.unshift(c.offenses.splice(c.offenses.indexOf(r.offense_desc), 1)[0]); }
      }
    }
    const all = [...cases.values()];
    let unlocated = 0, excluded = 0;
    const inRadius = [];
    for (const c of all) {
      const g = geo.geocode(c.location);
      if (!g) { if (geo.covered(c.location)) unlocated++; continue; }
      c.lat = g.lat; c.lon = g.lon; c.precision = g.precision;
      c.dist = miles(o.home, g);
      if (c.dist > o.radius) continue;
      if (c.sev === 0) { excluded++; c.score = 0; inRadius.push(c); continue; }
      c.score = score(c.sev, c.dist, o.half);
      inRadius.push(c);
    }
    const ranked = inRadius.filter(c => c.sev > 0).sort((a, b) => b.score - a.score || a.dist - b.dist || (b.date > a.date ? 1 : -1)).slice(0, o.top);
    ranked.forEach((c, i) => c.rank = i + 1);
    return { ranked, inRadius, unlocated, excluded, total: all.length };
  }

  function prettyLoc(loc) {
    const t = s => s.toLowerCase().replace(/\b([a-z])/g, x => x.toUpperCase()).replace(/\bBlock\b/i, 'block of');
    return t((loc || '').replace(/\s+/g, ' ').replace(/(\d+)\s*Block\s*/i, '$1 Block ').replace(/\s*&\s*/g, ' & '));
  }

  return { HOME, SEVERITY, severity, tier, norm, miles, Geocoder, analyze, score, prettyLoc };
});
