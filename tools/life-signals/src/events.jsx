// Events UI — editable list with add/delete/edit, supports date ranges.
//
// These defaults are the canonical seed. Edits the user makes in-app are stored
// in localStorage['we.events'] on whichever origin the app is served from, and
// persist there across reloads — these defaults only apply on first load (or
// when localStorage is cleared or a new origin/browser is used).
const DEFAULT_EVENTS = [
  { id: 'seed-jpmc',   date: '2011-08-09',                           label: 'JPMC' },
  { id: 'seed-dtv',    date: '2013-09-01',                           label: 'DirecTV' },
  { id: 'seed-zurich', date: '2015-09-01',                           label: 'Zurich' },
  { id: 'seed-p72',    date: '2016-10-01',                           label: 'Point72' },
  { id: 'seed-braff',  date: '2019-04-01',                           label: 'Launch Braff & Co.' },
  { id: 'seed-covid',  date: '2020-03-15', end: '2020-06-30',        label: 'COVID lockdown in Pittsburgh' },
  { id: 'seed-prov',   date: '2021-07-01',                           label: 'Moved to Providence' },
  { id: 'seed-brvo',   date: '2022-12-01',                           label: 'BRVO diagnosis' },
];

function EventRow({ ev, color, onDelete, onUpdate }) {
  const [editing, setEditing] = React.useState(false);
  const [date, setDate] = React.useState(ev.date);
  const [end, setEnd] = React.useState(ev.end || '');
  const [label, setLabel] = React.useState(ev.label);

  const save = () => {
    if (!date || !label.trim()) return;
    onUpdate({ ...ev, date, end: end || undefined, label: label.trim() });
    setEditing(false);
  };
  const cancel = () => {
    setDate(ev.date); setEnd(ev.end || ''); setLabel(ev.label); setEditing(false);
  };

  if (editing) {
    return (
      <div className="event-row editing">
        <span className="dot" style={{background: color}} />
        <div style={{display:'flex', gap:6, flex:1, flexWrap:'wrap'}}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{fontSize:'0.75rem', width:128}} title="Start" />
          <input type="date" value={end} onChange={e => setEnd(e.target.value)}
            style={{fontSize:'0.75rem', width:128}} title="End (optional)" placeholder="end" />
          <input type="text" value={label} onChange={e => setLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
            style={{flex:1, minWidth:120, fontSize:'0.78rem'}} autoFocus />
        </div>
        <button className="btn small" onClick={save} style={{padding:'4px 10px', fontSize:'0.72rem'}}>Save</button>
        <span className="delete" onClick={cancel} title="Cancel">×</span>
      </div>
    );
  }

  return (
    <div className="event-row" onClick={() => setEditing(true)}>
      <span className="dot" style={{background: color}} />
      <span className="date">
        {ev.date}
        {ev.end && <span style={{color:'var(--fg-muted)', fontWeight:400}}> → {ev.end}</span>}
      </span>
      <span className="label">{ev.label}</span>
      <span className="delete" onClick={(e) => { e.stopPropagation(); onDelete(ev.id); }} title="Delete">×</span>
    </div>
  );
}

function EventList({ events, onAdd, onDelete, onUpdate }) {
  const [newDate, setNewDate] = React.useState('');
  const [newEnd, setNewEnd] = React.useState('');
  const [newLabel, setNewLabel] = React.useState('');

  const submit = () => {
    if (!newDate || !newLabel.trim()) return;
    const ev = {
      id: 'e' + Date.now() + Math.floor(Math.random()*1000),
      date: newDate,
      label: newLabel.trim(),
    };
    if (newEnd && newEnd > newDate) ev.end = newEnd;
    onAdd(ev);
    setNewLabel(''); setNewEnd('');
  };

  const sorted = [...events].sort((a,b) => a.date.localeCompare(b.date));

  return (
    <div>
      <div className="event-add">
        <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            style={{fontSize:'0.76rem', width:128}} title="Start date" />
          <span style={{color:'var(--fg-muted-2)', fontSize:'0.75rem'}}>→</span>
          <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)}
            style={{fontSize:'0.76rem', width:128}} title="End date (optional — for ranges)" />
          <span style={{fontSize:'0.68rem', color:'var(--fg-muted-2)'}}>optional</span>
        </div>
        <div style={{display:'flex', gap:6, marginTop:6}}>
          <input type="text" placeholder="Label (e.g. New job, Marathon training)" value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            style={{flex:1, fontSize:'0.8rem'}} />
          <button className="btn small" onClick={submit} disabled={!newDate || !newLabel.trim()}
            style={{whiteSpace:'nowrap'}}>Add</button>
        </div>
      </div>
      {sorted.length === 0 && (
        <div style={{fontSize:'0.82rem', color:'var(--fg-muted)', padding:'20px 10px', textAlign:'center', fontStyle:'italic'}}>
          No events yet. Click on the trend chart to pin a date, or add one above.
        </div>
      )}
      <div className="event-list">
        {sorted.map(ev => {
          const origIdx = events.findIndex(e => e.id === ev.id);
          const col = EVENT_COLORS[origIdx % EVENT_COLORS.length];
          return <EventRow key={ev.id} ev={ev} color={col} onDelete={onDelete} onUpdate={onUpdate} />;
        })}
      </div>
    </div>
  );
}

window.EventList = EventList;
window.DEFAULT_EVENTS = DEFAULT_EVENTS;
