const STORAGE_KEY = 'xactly-customers-v1';
const DAY = 86400000;

let customers = loadCustomers();
let toastTimer;

const listEl = document.getElementById('customer-list');
const nudgeEl = document.getElementById('nudge-list');
const searchInput = document.getElementById('search-input');
const modal = document.getElementById('modal');
const form = document.getElementById('customer-form');

function loadCustomers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { const p = JSON.parse(saved); if (Array.isArray(p)) return p; }
  } catch (e) { console.warn('Could not load customers.', e); }
  return [];
}
function saveCustomers() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(customers)); }
  catch (e) { showToast('Your browser could not save this update.'); }
}
function esc(v) {
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function money(v) {
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(v)||0);
}
function daysSince(ts) { return Math.floor((Date.now() - ts) / DAY); }
function statusOf(c) {
  const d = daysSince(c.lastSeen);
  if (d < 30) return { key: 'active', label: 'Active' };
  if (d < 60) return { key: 'cooling', label: 'Cooling' };
  return { key: 'cold', label: 'Cold' };
}
function lastSeenLabel(c) {
  const d = daysSince(c.lastSeen);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return d + 'd ago';
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function render() {
  const q = searchInput.value.trim().toLowerCase();
  const visible = customers.filter(c =>
    (c.name + ' ' + (c.business || '')).toLowerCase().includes(q));

  const monthly = customers.reduce((s, c) => s + (Number(c.value) || 0), 0);
  const active = customers.filter(c => statusOf(c).key === 'active').length;
  const risk = customers.filter(c => statusOf(c).key !== 'active').length;
  document.getElementById('m-monthly').textContent = money(monthly);
  document.getElementById('m-active').textContent = active;
  document.getElementById('m-risk').textContent = risk;
  document.getElementById('nav-count').textContent = customers.length;
  document.getElementById('nudge-dot').hidden = risk === 0;

  document.getElementById('empty-state').hidden = visible.length !== 0;
  listEl.innerHTML = visible.map(c => {
    const st = statusOf(c);
    return `<tr>
      <td><strong>${esc(c.name)}</strong>${c.business ? `<span class="dim"> · ${esc(c.business)}</span>` : ''}</td>
      <td>${money(c.value)}</td>
      <td>${lastSeenLabel(c)}</td>
      <td><span class="status st-${st.key}">${st.label}</span></td>
      <td><button class="btn-small" data-seen="${c.id}">Seen today</button>
          <button class="btn-small danger" data-del="${c.id}">Remove</button></td>
    </tr>`;
  }).join('');

  const nudges = customers
    .filter(c => statusOf(c).key !== 'active')
    .sort((a, b) => a.lastSeen - b.lastSeen);
  nudgeEl.innerHTML = nudges.length === 0
    ? '<div class="empty-state" style="min-height:100px"><div>✓</div><strong>Everyone\'s warm</strong><span>No cooling customers right now.</span></div>'
    : nudges.map(c => {
        const st = statusOf(c);
        return `<div class="nudge-row">
          <div><strong>${esc(c.name)}</strong><span class="dim"> · quiet ${daysSince(c.lastSeen)}d · ${money(c.value)}/mo</span></div>
          <span class="status st-${st.key}">${st.label}</span>
          <button class="btn-small" data-seen="${c.id}">Log visit</button>
        </div>`;
      }).join('');
}

listEl.addEventListener('click', onAction);
nudgeEl.addEventListener('click', onAction);
function onAction(e) {
  const seen = e.target.dataset.seen, del = e.target.dataset.del;
  if (seen) {
    const c = customers.find(x => x.id === seen);
    if (c) { c.lastSeen = Date.now(); saveCustomers(); render(); showToast(c.name + ' marked seen today.'); }
  }
  if (del) {
    customers = customers.filter(x => x.id !== del);
    saveCustomers(); render(); showToast('Customer removed.');
  }
}

document.getElementById('add-open').addEventListener('click', () => { modal.hidden = false; form.reset(); form.name.focus(); });
document.getElementById('modal-cancel').addEventListener('click', () => { modal.hidden = true; });
modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });
form.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(form);
  const name = String(fd.get('name') || '').trim();
  if (!name) return;
  customers.unshift({
    id: 'c-' + Date.now().toString(36),
    name,
    business: String(fd.get('business') || '').trim(),
    value: Number(fd.get('value')) || 0,
    lastSeen: Date.now()
  });
  saveCustomers(); render(); modal.hidden = true;
  showToast(name + ' added.');
});
searchInput.addEventListener('input', render);

render();
