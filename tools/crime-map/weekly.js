// Weekly notification text. Usage: node weekly.js [days]
// Expects core.js, streets.json and data.json (raw city API rows) in the same folder.
const fs = require('fs'), path = require('path');
const dir = __dirname;
const C = require(path.join(dir, 'core.js'));
const days = +(process.argv[2] || 7);
const geo = C.Geocoder(JSON.parse(fs.readFileSync(path.join(dir, 'streets.json'))));
const rows = JSON.parse(fs.readFileSync(path.join(dir, 'data.json')));
const URL = `https://adambraff.github.io/tools/crime-map/?days=${days}`;

if (!Array.isArray(rows) || !rows.length) { console.log(`Crime map: the city data API returned no records for the last ${days} days. Map: ${URL}`); process.exit(0); }
const newest = rows.reduce((m, r) => r.reported_date > m ? r.reported_date : m, '');
const staleDays = (Date.now() - new Date(newest)) / 864e5;

const res = C.analyze(rows, geo, { radius: 1, top: 20, half: 0.35 });
const counted = res.inRadius.filter(c => c.sev > 0);
const near = counted.filter(c => c.dist < 0.25).length;
const high = counted.filter(c => c.sev >= 7);
const d = s => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const line = c => `${c.rank}. ${c.offenses[0]} at ${C.prettyLoc(c.location)}${c.hospital ? ' (logged at RI Hospital)' : ''} (${c.dist.toFixed(2)} mi, ${d(c.date)})`;

const out = [];
out.push(`${counted.length} incidents within 1 mi of 56 Cooke St in the last ${days} days; ${near} within 0.25 mi, ${high.length} high severity.`);
if (res.ranked.length) { out.push('Top 5 by severity and distance:'); res.ranked.slice(0, 5).forEach(c => out.push(line(c))); }
const extraHigh = high.filter(c => !res.ranked.slice(0, 5).includes(c));
if (extraHigh.length) out.push('Also high severity: ' + extraHigh.map(c => `${c.offenses[0]} at ${C.prettyLoc(c.location)} (${c.dist.toFixed(2)} mi)`).join('; '));
if (staleDays > 5) out.push(`Warning: newest city record is from ${d(newest)}, so the feed may be lagging.`);
out.push(`Map of the top 20: ${URL}`);
console.log(out.join('\n'));
