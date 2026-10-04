(async () => {
  const LIST = 'https://crm.marketing.godaddy.com/venture/e82235ac-684c-4d95-9375-5e817cf0a6d7';
  if (location.host !== 'crm.marketing.godaddy.com' || /filterKeys|queryString|\/contact\//.test(location.href)) {
    location.href = LIST;
    return;
  }
  if (window.__brRunning) return;
  window.__brRunning = true;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const old = document.getElementById('br-host'); if (old) old.remove();
  const host = document.createElement('div');
  host.id = 'br-host';
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  const close = () => { host.remove(); window.__brRunning = false; };

  const CSS = `
  *{box-sizing:border-box}
  .wrap{font:14px/1.45 -apple-system,system-ui,sans-serif;color:#1a1a1a}
  .toast{pointer-events:auto;position:absolute;top:16px;right:16px;width:340px;background:#fff;border:1px solid #ddd;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.2);padding:14px 16px}
  .shade{pointer-events:auto;position:absolute;inset:0;background:rgba(20,20,20,.45);display:flex;align-items:center;justify-content:center;padding:24px}
  .page{background:#fafaf7;width:min(1200px,100%);max-height:100%;overflow:auto;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.35);padding:28px 32px}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
  h1{font-size:24px;margin:0 0 2px} .sub{color:#666;margin:0}
  .btns{display:flex;gap:8px;align-items:center}
  .btn{display:inline-block;padding:8px 14px;border-radius:7px;border:1px solid #111;background:#111;color:#fff;font:600 13px -apple-system,system-ui,sans-serif;text-decoration:none;cursor:pointer}
  .btn.ghost{background:#fff;color:#111}
  .x{border:0;background:none;font-size:26px;line-height:1;cursor:pointer;color:#444;padding:0 4px}
  .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:22px 0}
  .tile{background:#fff;border:1px solid #e3e1da;border-radius:10px;padding:12px 14px}
  .tile .k{color:#666;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .tile .v{font-size:26px;font-weight:700;margin-top:2px}
  .tile .s{color:#666;font-size:13px}
  .note{color:#777;font-size:12px;margin:-8px 0 18px}
  .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
  .col{background:#fff;border:1px solid #e3e1da;border-radius:10px;padding:12px 14px}
  .col h2{font-size:15px;margin:0 0 8px} .col h2 span{color:#888;font-weight:400}
  .col ol{margin:0;padding-left:22px;max-height:420px;overflow:auto;font-size:12.5px}
  .col li{margin:1px 0;word-break:break-all} .col li i{color:#999;font-style:normal;white-space:nowrap}
  .err{color:#b00}`;
  const say = h => { root.innerHTML = `<style>${CSS}</style><div class="wrap"><div class="toast"><div style="display:flex;justify-content:space-between"><b>Blog response</b><button class="x" id="x">×</button></div>${h}</div></div>`; root.getElementById('x').onclick = close; };

  const nextBtn = () => document.querySelector('button[aria-label="Go to next page"]');
  const prevBtn = () => document.querySelector('button[aria-label="Go to previous page"]');
  const scrape = () => {
    const t = document.body.innerText;
    return [...t.matchAll(/\t\n([^\t\n]+@[^\t\n]+)\n\t\n[^\t\n]*\n\t\n([^\t\n]+)\n([A-Z][a-z]+ \d+, \d{4}) at (\d+:\d+ [AP]M)/g)]
      .map(m => ({ email: m[1].trim(), activity: m[2].trim(), when: new Date(m[3] + ' ' + m[4]) }));
  };
  const waitRows = async (notFirst) => {
    for (let i = 0; i < 300; i++) {
      const r = scrape();
      if (r.length && nextBtn() && (!notFirst || r[0].email !== notFirst)) {
        let last = r.length, stable = 0;
        for (let j = 0; j < 20 && stable < 3; j++) { await sleep(300); const n = scrape().length; stable = n === last ? stable + 1 : 0; last = n; }
        return scrape();
      }
      await sleep(400);
    }
    throw new Error('The contact list did not load. Reload the page and try again.');
  };
  const total = () => { const m = document.body.innerText.match(/Contacts \((\d+)\)/); return m ? +m[1] : null; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  try {
    say('Loading contact list…');
    let rows = await waitRows();
    for (let i = 0; i < 60 && prevBtn() && !prevBtn().disabled; i++) {
      const first = rows[0].email; prevBtn().click(); rows = await waitRows(first);
    }
    const all = new Map();
    const n = total(); const pages = n ? Math.ceil(n / 25) : '?';
    for (let p = 1; p <= 200; p++) {
      rows.forEach(r => all.set(r.email.toLowerCase(), r));
      say(`Reading page ${p} of ${pages}… (${all.size} contacts)<br><span style="color:#666">Keep this tab in front while it runs.</span>`);
      const b = nextBtn();
      if (!b || b.disabled) break;
      const first = rows[0].email; b.click(); rows = await waitRows(first);
    }

    const recs = [...all.values()];
    const emailRecs = recs.filter(r => /^Email /.test(r.activity));
    if (!emailRecs.length) throw new Error('No email activity found.');
    const sentCounts = {};
    emailRecs.filter(r => r.activity === 'Email sent').forEach(r => { const k = +r.when; sentCounts[k] = (sentCounts[k] || 0) + 1; });
    const big = Object.entries(sentCounts).filter(([, c]) => c >= 5).map(([k]) => +k);
    const sendTime = big.length ? Math.max(...big) : Math.min(...emailRecs.map(r => +r.when));
    const start = sendTime - 30 * 60 * 1000;
    const recip = recs.filter(r => +r.when >= start && (/^Email /.test(r.activity) || /unsubscrib/i.test(r.activity)));
    const by = a => recip.filter(r => r.activity === a);
    const clicked = by('Email clicked'), viewed = by('Email viewed'), sent = by('Email sent');
    const bounced = recip.filter(r => /undeliverable|bounce/i.test(r.activity));
    const unsubs = recip.filter(r => /unsubscrib/i.test(r.activity));
    const other = recip.filter(r => !clicked.includes(r) && !viewed.includes(r) && !sent.includes(r) && !bounced.includes(r) && !unsubs.includes(r));
    const delivered = recip.length - bounced.length;
    const opened = clicked.length + viewed.length;
    const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '–';
    const fmt = d => d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const hrs = ((Date.now() - sendTime) / 3600000).toFixed(1);
    const stamp = new Date(sendTime).toISOString().slice(0, 10);

    const csv = 'email,latest_activity,activity_time\n' + recs.map(r => `${r.email},${r.activity},${r.when.toISOString()}`).join('\n');
    const csvUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));

    const tile = (k, v, s) => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s || '&nbsp;'}</div></div>`;
    const col = (title, arr) => `<div class="col"><h2>${title} <span>(${arr.length})</span></h2>${arr.length ? `<ol>${arr.slice().sort((a, b) => a.when - b.when).map(r => `<li>${esc(r.email)} <i>${fmt(r.when)}</i></li>`).join('')}</ol>` : '<div style="color:#999">none</div>'}</div>`;
    const body = `
      <div class="top"><div><h1>Blog response</h1><p class="sub">Send detected ${fmt(new Date(sendTime))} · ${hrs} hours ago · ${recs.length} contacts read</p></div>
      <div class="btns">BUTTONS</div></div>
      <div class="tiles">
        ${tile('Delivered', delivered, `${recip.length} sent · ${bounced.length} bounced`)}
        ${tile('Opened', opened, pct(opened, delivered) + ' of delivered')}
        ${tile('Clicked', clicked.length, pct(clicked.length, delivered) + ' of delivered')}
        ${tile('Click-to-open', pct(clicked.length, opened), 'clicks ÷ opens')}
        ${tile('No open yet', sent.length, pct(sent.length, delivered))}
        ${tile('Unsubscribed', unsubs.length, 'since send')}
      </div>
      <p class="note">Each contact counts once, at their latest action, so run this before the next post goes out. Opens are inflated by Apple Mail privacy preloading; clicks may include corporate link scanners.</p>
      <div class="cols">${col('Clicked', clicked)}${col('Opened, no click', viewed)}${col('Bounced', bounced)}${unsubs.length ? col('Unsubscribed', unsubs) : ''}${other.length ? col('Other', other) : ''}${col('No open yet', sent)}</div>`;

    const dl = `<a class="btn ghost" href="${csvUrl}" download="blog-response-${stamp}.csv">Download CSV</a>`;
    const tabDoc = `<!doctype html><html><head><meta charset="utf-8"><title>Blog response ${stamp}</title><style>${CSS} body{margin:0;background:#fafaf7} .page{box-shadow:none;max-height:none;margin:0 auto;border-radius:0}</style></head><body><div class="wrap"><div class="page">${body.replace('BUTTONS', dl)}</div></div></body></html>`;
    const tabUrl = URL.createObjectURL(new Blob([tabDoc], { type: 'text/html' }));

    root.innerHTML = `<style>${CSS}</style><div class="wrap"><div class="shade" id="shade"><div class="page">${body.replace('BUTTONS', `<a class="btn" href="${tabUrl}" target="_blank">Open in new tab</a>${dl}<button class="x" id="x">×</button>`)}</div></div></div>`;
    root.getElementById('x').onclick = close;
    root.getElementById('shade').onclick = e => { if (e.target.id === 'shade') close(); };
  } catch (e) {
    say('<div class="err">' + esc(e.message) + '</div>');
  } finally {
    window.__brRunning = false;
  }
})();
