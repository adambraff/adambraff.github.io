/* CDC / NHANES weight percentiles for US adult males at height ~70 inches (5'10").
 * Source: NHANES 2015-2018 Vital & Health Statistics Series 3, No. 46.
 * Two reference groups are exposed here:
 *
 *   CDC_MALE_70IN        — all races/ethnicities pooled (Table 4 / Table 6 combined pooled row)
 *   CDC_MALE_WHITE_70IN  — non-Hispanic white only (Table 6 race-stratified row)
 *
 * Both are 5'10" slices: NHANES publishes weight percentiles by age and height; we
 * ~1-2 lb adjust to a 70" slice since the male sample mean height is ~69".
 *
 * The NH-white table uses NHANES broader age brackets (20-39 / 40-59 / 60-79) —
 * the race-stratified publication doesn't break down by 5-year ages. To align with
 * the pooled table's 5-year schema, we compute the NH-white-vs-pooled delta within
 * each broad bracket and apply it to the pooled 5-year curve; interpolation between
 * bracket midpoints (ages 30, 50, 70) gives smooth age progression. Preserves the
 * within-bracket age curvature from the pooled data.
 *
 * Columns: age bracket, then weight (lb) at P5, P10, P25, P50, P75, P90, P95
 */
window.CDC_MALE_70IN = [
  // age,  p5,    p10,   p25,   p50,   p75,   p90,   p95
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

window.CDC_MALE_WHITE_70IN = [
  // age,  p5,    p10,   p25,   p50,   p75,   p90,   p95
  [ 20, 127.2, 135.6, 156.2, 178.8, 206.6, 232.0, 252.3 ],
  [ 25, 131.2, 140.6, 161.2, 184.8, 215.6, 243.0, 263.3 ],
  [ 30, 138.2, 147.6, 170.2, 195.8, 227.6, 256.0, 277.3 ],
  [ 35, 146.1, 154.8, 176.7, 202.7, 234.0, 261.8, 283.6 ],
  [ 40, 151.0, 159.0, 181.2, 206.5, 237.3, 265.6, 286.8 ],
  [ 45, 154.9, 162.3, 183.6, 209.3, 239.6, 267.4, 288.1 ],
  [ 50, 157.8, 164.5, 186.1, 211.2, 240.9, 268.2, 288.4 ],
  [ 55, 157.6, 164.8, 186.1, 211.4, 241.1, 268.1, 287.1 ],
  [ 60, 155.4, 163.1, 184.1, 208.6, 237.3, 263.9, 281.9 ],
  [ 65, 152.2, 160.4, 180.1, 203.8, 231.5, 257.8, 274.6 ],
  [ 70, 147.9, 155.7, 174.1, 197.0, 223.8, 248.6, 264.4 ],
  [ 75, 142.9, 150.7, 168.1, 190.0, 214.8, 237.6, 252.4 ],
  [ 80, 137.9, 145.7, 162.1, 182.0, 204.8, 225.6, 239.4 ],
];

// Percentile labels aligned to columns 1..7
window.CDC_PCTS = [5, 10, 25, 50, 75, 90, 95];

// Look up the right reference table by group name.
window.cdcTable = function(group) {
  return (group === 'white') ? window.CDC_MALE_WHITE_70IN : window.CDC_MALE_70IN;
};

// Interpolate: given age (years), weight (lb), and optional reference group
// ('pooled' default, or 'white'), return percentile (0-100)
window.cdcPercentile = function(age, weight, group) {
  const table = window.cdcTable(group);
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

window.cdcBands = function(age, group) {
  const table = window.cdcTable(group);
  let i = 0;
  while (i < table.length - 1 && table[i+1][0] <= age) i++;
  const a = table[i], b = table[Math.min(i+1, table.length-1)];
  const t = b[0] === a[0] ? 0 : Math.max(0, Math.min(1, (age - a[0]) / (b[0] - a[0])));
  return a.slice(1).map((v, j) => v + (b[j+1] - v) * t);
};
