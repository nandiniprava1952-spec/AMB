(async function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const items = await (await fetch('form.json')).json();
  let lang = localStorage.getItem('amb_lang') || 'en', vals = {}, rel = {};
  const KEY = 'amb_records';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = (o, k = 'label') => (lang === 'or' && o.or) || o.en || '';
  const tpl = s => esc2(s).replace(/\$\{(\w+)\}/g, (_, n) => esc(vals[n] ?? ''))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const esc2 = s => s; // labels come from the trusted form file; only user values are escaped
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200); };

  // ---------- build form once ----------
  const dom = {};
  const form = $('#form');
  for (const it of items) {
    if (it.t === 'calculate' || (it.t === 'note' && !it.en && !it.or)) continue;
    if (it.t === 'note' && /^(LOOK|SEE|ASK)$/.test(it.n) && !it.rel) { /* image-only notes: show label */ }
    const d = document.createElement('div'); d.className = 'q' + (it.t === 'note' ? ' note' : ''); d.dataset.n = it.n;
    const lb = document.createElement('div'); lb.className = 'lbl'; d.append(lb);
    const ref = { it, d, lb, inputs: [] };
    if (it.t === 'select_one') {
      const o = document.createElement('div'); o.className = 'opts'; d.append(o);
      it.ch.forEach(([v, en, or]) => {
        const l = document.createElement('label'), r = document.createElement('input'), s = document.createElement('span');
        r.type = 'radio'; r.name = it.n; r.value = v; l.append(r, s); o.append(l);
        r.onchange = () => set(it.n, v); ref.inputs.push({ r, s, en, or });
      });
    } else if (it.t !== 'note') {
      const i = document.createElement('input');
      i.type = it.t === 'date' ? 'date' : (it.t === 'integer' || it.t === 'decimal') ? 'number' : 'text';
      if (it.t === 'decimal') { i.step = 'any'; i.inputMode = 'decimal'; }
      if (it.t === 'integer') i.inputMode = 'numeric';
      if (it.app === 'numbers') i.inputMode = 'numeric';
      i.autocomplete = 'off'; i.oninput = () => set(it.n, i.value.trim());
      d.append(i); ref.inputs.push({ i });
    }
    const m = document.createElement('div'); m.className = 'msg'; m.hidden = true; d.append(m); ref.m = m;
    dom[it.n] = ref; form.append(d);
  }

  function set(n, v) { vals[n] = v; refresh(); const r = dom[n]; if (r) { r.d.classList.remove('err'); r.m.hidden = true; } }

  function refresh() {
    rel = Engine.run(items, vals);
    for (const n in dom) {
      const r = dom[n], it = r.it;
      r.d.hidden = !rel[n];
      if (!rel[n]) continue;
      r.lb.innerHTML = tpl(L(it)) + (it.req ? ' <i>*</i>' : '');
      for (const x of r.inputs) {
        if (x.r) { x.r.checked = vals[n] === x.r.value; x.s.textContent = (lang === 'or' && x.or) || x.en; }
        else if (document.activeElement !== x.i && x.i.value !== (vals[n] ?? '')) x.i.value = vals[n] ?? '';
      }
    }
  }

  function validate() {
    let first = null;
    for (const n in dom) {
      const r = dom[n], it = r.it; if (it.t === 'note' || !rel[n]) continue;
      const v = vals[n] ?? ''; let msg = '';
      if (it.req && v === '') msg = lang === 'or' ? 'ଆବଶ୍ୟକ' : 'This field is required.';
      else if (v !== '' && !Engine.valid(it, v, vals)) msg = it.cm || 'Invalid value.';
      r.d.classList.toggle('err', !!msg); r.m.hidden = !msg; r.m.textContent = msg;
      if (msg && !first) first = r.d;
    }
    return first;
  }

  // ---------- records ----------
  const keyLike = (o, p) => Object.keys(o).find(k => k.startsWith(p) && o[k]);
  function renderRecs() {
    const rs = load(); $('#cnt').textContent = rs.length ? `(${rs.length})` : '';
    $('#csv').hidden = !rs.length;
    $('#recs').innerHTML = rs.length ? rs.slice().reverse().map(r => {
      const hb = r[keyLike(r, 'Hb')], type = r[keyLike(r, 'SMS_Anemia_Type')] || '', rt = r[keyLike(r, 'RETEST_DATE_0') ] || r[keyLike(r, 'RETEST_DATE_')] || '';
      const cat = r.CATEGORY_LABEL || r.CATEGORY || '';
      return `<div class="rec"><b>${esc(r.BENEFICIARY_NAME || '(no name)')}</b> <span style="color:var(--mute)">${esc(r.CONTACT_NO || '')}</span>
      <div style="margin-top:6px">${cat ? `<span class="tag">${esc(cat)}</span>` : ''}${type ? `<span class="tag ${esc(type.split(' ')[0])}">${esc(type)}</span>` : ''}</div>
      <div style="margin-top:6px;color:var(--mute);font-size:14px">${hb ? 'Hb ' + esc(hb) + ' g/dL · ' : ''}${rt ? 'Retest ' + esc(rt) + ' · ' : ''}${new Date(r._ts).toLocaleDateString()}</div>
      <div class="row">${/^\d{10}$/.test(r.CONTACT_NO || '') ? `<a href="tel:${r.CONTACT_NO}">📞 Call</a><a target="_blank" rel="noopener" href="https://wa.me/91${r.CONTACT_NO}">💬 WhatsApp</a>` : ''}<button data-del="${r._id}">🗑 Delete</button></div></div>`;
    }).join('') : '<div class="empty">No records yet.<br>Saved screenings appear here and work offline.</div>';
  }
  $('#recs').onclick = e => {
    const id = e.target.dataset.del; if (!id || !confirm('Delete this record?')) return;
    localStorage.setItem(KEY, JSON.stringify(load().filter(r => r._id !== id))); renderRecs();
  };
  $('#csv').onclick = () => {
    const rs = load(), cols = [...new Set(rs.flatMap(Object.keys))];
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const csv = '\ufeff' + [cols.map(q).join(','), ...rs.map(r => cols.map(c => q(r[c])).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'amb_records_' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
  };
  $('#save').onclick = () => {
    const bad = validate();
    if (bad) { bad.scrollIntoView({ behavior: 'smooth', block: 'center' }); return toast('Please fix the highlighted fields'); }
    const rec = { _id: Date.now().toString(36), _ts: new Date().toISOString() };
    for (const it of items) if (it.t !== 'note' && vals[it.n]) rec[it.n] = vals[it.n];
    const rs = load(); rs.push(rec); localStorage.setItem(KEY, JSON.stringify(rs));
    vals = {}; refresh(); renderRecs(); toast('Saved ✔'); go('records');
  };
  $('#reset').onclick = () => { if (confirm('Clear the form?')) { vals = {}; refresh(); scrollTo(0, 0); } };

  // ---------- nav / language / install ----------
  function go(t) {
    $$('.tab').forEach(x => x.classList.toggle('on', x.id === 't-' + t));
    $$('nav button').forEach(x => x.classList.toggle('on', x.dataset.go === t));
    document.body.classList.toggle('on-splash', t === 'splash'); scrollTo(0, 0);
  }
  document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); });
  const setLang = l => { lang = l; localStorage.setItem('amb_lang', l); $('#lang').textContent = l === 'en' ? 'ଓଡ଼ିଆ' : 'English'; document.documentElement.lang = l; refresh(); };
  $('#lang').onclick = () => setLang(lang === 'en' ? 'or' : 'en');
  let dp; const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (!installed()) { if (ios) $('#install').hidden = false;
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); dp = e; $('#install').hidden = false; }); }
  addEventListener('appinstalled', () => { $('#install').hidden = true; toast('App installed ✔'); });
  $('#install').onclick = async () => {
    if (dp) { dp.prompt(); const r = await dp.userChoice; if (r.outcome === 'accepted') $('#install').hidden = true; }
    else alert('Tap the Share button, then "Add to Home Screen".');
  };

  const net = () => { const on = navigator.onLine, b = $('#net'); b.classList.toggle('off', !on); b.lastChild.textContent = on ? 'Online' : 'Offline'; };
  addEventListener('online', net); addEventListener('offline', net); net();
  $('#net').onclick = () => toast(navigator.onLine ? 'Online – app is saved and works offline too' : 'Offline mode – all features still work');
  setLang(lang); renderRecs();
  // ---------- update flow ----------
  const U = { box: $('#upd'), ring: $('#ring'), pct: $('#pct'), t: $('#utitle'), sub: $('#usub'), go: $('#ugo'), later: $('#ulater') };
  const ring = p => { U.ring.style.strokeDashoffset = 150.8 * (1 - p / 100); U.pct.textContent = p + '%'; };
  const ui = (state, p = 0) => {
    U.box.hidden = false; U.box.classList.toggle('spin', state === 'apply');
    U.go.hidden = U.later.hidden = state !== 'ready';
    if (state === 'down') { ring(p); U.t.textContent = 'Downloading update…'; U.sub.textContent = 'Please keep the app open'; }
    if (state === 'ready') { ring(100); U.t.textContent = 'Update available'; U.sub.textContent = 'A new version is ready to install'; }
    if (state === 'apply') { ring(100); U.t.textContent = 'Installing update…'; U.sub.textContent = 'The app will restart'; }
  };
  if (localStorage.getItem('amb_updated')) { localStorage.removeItem('amb_updated'); setTimeout(() => toast('✔ Updated to the latest version'), 600); }
  if ('serviceWorker' in navigator) {
    const sw = navigator.serviceWorker; let waiting = null, reloading = false; const had = !!sw.controller;
    const ready = w => { waiting = w; ui('ready'); };
    const track = w => w.addEventListener('statechange', () => { if (w.state === 'installed' && sw.controller) ready(w); });
    sw.register('sw.js').then(reg => {
      if (reg.waiting && sw.controller) ready(reg.waiting);
      reg.addEventListener('updatefound', () => { if (sw.controller) { ui('down', 0); track(reg.installing); } });
      const check = () => reg.update().catch(() => {});
      setInterval(check, 30 * 60 * 1000); document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    });
    sw.addEventListener('message', e => { if (e.data && e.data.type === 'progress' && sw.controller && !waiting) ui('down', e.data.pct); });
    U.go.onclick = () => { ui('apply'); (waiting || {}).postMessage && waiting.postMessage('SKIP_WAITING'); };
    U.later.onclick = () => { U.box.hidden = true; };
    sw.addEventListener('controllerchange', () => { if (!had || reloading) return; reloading = true; localStorage.setItem('amb_updated', '1'); location.reload(); });
  }
})();
