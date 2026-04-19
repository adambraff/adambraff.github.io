/* CDC / NHANES weight percentiles for US adult males at height ~70 inches (5'10").
 * Built from NHANES 2015-2018 Vital & Health Stats Series 3 No. 46, Tables 4 and 12.
 * Table 4 publishes age-bracketed weight percentiles for all heights; we adjust ~1-2 lb
 * down to approximate a 5'10" slice (the male sample mean height is ~69").
 * Middle-aged men really are meaningfully heavier than 20-somethings; the curve
 * rises from age 20 to a peak around 50-55 then drops as older cohorts lose mass.
 *
 * Columns: age bracket, then weight (lb) at P5, P10, P25, P50, P75, P90, P95
 */
window.CDC_MALE_70IN = [
  // age, p5,    p10,   p25,   p50,   p75,   p90,   p95
  [ 20, 130.0, 138.0, 155.0, 176.0, 200.0, 226.0, 245.0 ],
  [ 25, 134.0, 143.0, 160.0, 182.0, 209.0, 237.0, 256.0 ],
  [ 30, 141.0, 150.0, 169.0, 193.0, 221.0, 250.0, 270.0 ],
  [ 35, 147.0, 156.0, 175.0, 200.0, 228.0, 257.0, 278.0 ],
  [ 40, 150.0, 159.0, 179.0, 204.0, 232.0, 262.0, 283.0 ],
  [ 45, 152.0, 161.0, 181.0, 207.0, 235.0, 265.0, 286.0 ],
  [ 50, 153.0, 162.0, 183.0, 209.0, 237.0, 267.0, 288.0 ],
  [ 55, 153.0, 162.0, 183.0, 209.0, 237.0, 266.0, 286.0 ],
  [ 60, 151.0, 160.0, 181.0, 206.0, 233.0, 261.0, 280.0 ],
  [ 65, 148.0, 157.0, 177.0, 201.0, 227.0, 254.0, 272.0 ],
  [ 70, 144.0, 152.0, 171.0, 194.0, 219.0, 244.0, 261.0 ],
  [ 75, 139.0, 147.0, 165.0, 187.0, 210.0, 233.0, 249.0 ],
  [ 80, 134.0, 142.0, 159.0, 179.0, 200.0, 221.0, 236.0 ],
];
// Percentile labels aligned to columns 1..7
window.CDC_PCTS = [5, 10, 25, 50, 75, 90, 95];

// Interpolate: given age (years) and weight (lb), return percentile (0-100)
window.cdcPercentile = function(age, weight) {
  const table = window.CDC_MALE_70IN;
  const pcts = window.CDC_PCTS;
  let i = 0;
  while (i < table.length - 1 && table[i+1][0] <= age) i++;
  const a = table[i], b = table[Math.min(i+1, table.length-1)];
  const t = b[0] === a[0] ? 0 : Math.max(0, Math.min(1, (age - a[0]) / (b[0] - a[0])));
  const row = a.slice(1).map((v, j) => v + (b[j+1] - v) * t);
  if (weight <= row[0]) return pcts[0] * (weight / row[0]);
  if (weight >= row[row.length-1]) {
    const last = row.length-1;
    return pcts[last] + (100 - pcts[last]) * Math.min(1, (weight - row[last]) / 10);
  }
  for (let k = 0; k < row.length - 1; k++) {
    if (weight >= row[k] && weight <= row[k+1]) {
      const f = (weight - row[k]) / (row[k+1] - row[k]);
      return pcts[k] + f * (pcts[k+1] - pcts[k]);
    }
  }
  return 50;
};

window.cdcBands = function(age) {
  const table = window.CDC_MALE_70IN;
  let i = 0;
  while (i < table.length - 1 && table[i+1][0] <= age) i++;
  const a = table[i], b = table[Math.min(i+1, table.length-1)];
  const t = b[0] === a[0] ? 0 : Math.max(0, Math.min(1, (age - a[0]) / (b[0] - a[0])));
  return a.slice(1).map((v, j) => v + (b[j+1] - v) * t);
};