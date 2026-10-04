(async () => {
  const HOME = 'https://crm.marketing.godaddy.com/';
  if (!location.href.startsWith(HOME)) {
    location.href = 'https://crm.marketing.godaddy.com/venture/e82235ac-684c-4d95-9375-5e817cf0a6d7';
    return;
  }
  if (window.__brRunning) return;
  window.__brRunning = true;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const panel = document.createElement('div');
  panel.id = 'br-panel';
  panel.style.cssText = 'position:fixed;top:16px;right:16px;width:440px;max-height:90vh;overflow:auto;z-index:2147483647;background:#fff;color:#111;border:1px solid #ccc;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.25);font:14px/1.45 -apple-system,system-ui,sans-serif;padding:16px';
  document.body.appendChild(panel);
  const say = h => { panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="font-size:16px">Blog response</b><button id="br-x" style="border:0;background:none;font-size:20px;cursor:pointer">×</button></div>' + h; panel.querySelector('#br-x').onclick = () => { panel.remove(); window.__brRunning = false; }; };

  const nextBtn = () => document.querySelector('button[aria-label="Go to next page"]');
  const prevBtn = () => document.querySelector('button[aria-label="Go to previous page"]');
  const scrape = () => {
    const t = document.body.innerText;
    return [...t.matchAll(/\t\n([^\t\n]+@[^\t\n]+)\n\t\n[^\t\n]*\n\t\n([^\t\n]+)\n([A-Z][a-z]+ \d+, \d{4}) at (\d+:\d+ [AP]M)/g)]
      .map(m => ({ email: m[1].trim(), activity: m[2].trim(), when: new Date(m[3] + ' ' + m[4]) }));
  };
  const waitRows = async (notFirst) => {
    for (let i = 0; i < 240; i++) {
      const r = scrape();
      if (r.length && nextBtn() && (!notFirst || r[0].email !== notFirst)) { await sleep(400); return scrape(); }
      await sleep(500);
    }
    throw new Error('The contact list did not load. Reload the page and try again.');
  };
  const total = () => { const m = document.body.innerText.match(/Contacts \((\d+)\)/); return m ? +m[1] : null; };

  try {
    say('Loading contact list…');
    let rows = await waitRows();
    // rewind to page 1
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
    // the send = the latest "Email sent" timestamp shared by many contacts
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
    const list = (title, arr, open) => `<details ${open ? 'open' : ''} style="margin-top:8px"><summary><b>${title}</b> (${arr.length})</summary><div style="font-size:12px;color:#333;margin-top:4px">${arr.sort((a, b) => a.when - b.when).map(r => `${r.email} <span style="color:#888">${fmt(r.when)}</span>`).join('<br>') || '<i>none</i>'}</div></details>`;
    const row = (k, v, s) => `<tr><td style="padding:2px 10px 2px 0">${k}</td><td style="text-align:right;padding:2px 10px"><b>${v}</b></td><td style="text-align:right;color:#666">${s || ''}</td></tr>`;

    const csv = 'email,latest_activity,activity_time\n' + recs.map(r => `${r.email},${r.activity},${r.when.toISOString()}`).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const stamp = new Date(sendTime).toISOString().slice(0, 10);

    say(`<div style="color:#555;margin-bottom:8px">Send detected ${fmt(new Date(sendTime))} · ${hrs} hours ago · ${recs.length} contacts read</div>
      <table style="border-collapse:collapse;width:100%">
      ${row('Sent', recip.length)}
      ${row('Bounced', bounced.length, pct(bounced.length, recip.length) + ' of sent')}
      ${row('Delivered', delivered)}
      ${row('Opened (incl. clicks)', opened, pct(opened, delivered))}
      ${row('Clicked', clicked.length, pct(clicked.length, delivered))}
      ${row('Click-to-open', '', pct(clicked.length, opened))}
      ${row('No open yet', sent.length, pct(sent.length, delivered))}
      ${row('Unsubscribed since send', unsubs.length)}
      </table>
      <div style="font-size:12px;color:#777;margin-top:6px">Each contact counts once, at their latest action. Opens are inflated by Apple Mail privacy preloading; clicks may include corporate link scanners.</div>
      ${list('Clicked', clicked, true)}${list('Opened', viewed)}${list('Bounced', bounced, true)}${list('Unsubscribed', unsubs, true)}${other.length ? list('Other', other) : ''}${list('No open yet', sent)}
      <a href="${url}" download="blog-response-${stamp}.csv" style="display:inline-block;margin-top:12px;padding:8px 12px;background:#111;color:#fff;border-radius:6px;text-decoration:none">Download CSV</a>`);
  } catch (e) {
    say('<span style="color:#b00">' + e.message + '</span>');
  } finally {
    window.__brRunning = false;
  }
})();
