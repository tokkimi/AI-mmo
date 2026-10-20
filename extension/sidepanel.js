'use strict';

const DEFAULT_API = 'https://i-ateliers.ca/api/icourtier/';
const $ = (s) => document.querySelector(s);
const state = { token: '', api: DEFAULT_API, fields: {}, contracts: {}, dossiers: {}, current: '', pdf: '' };

// ---------- Stockage local (les dossiers restent dans le navigateur du courtier) ----------
async function load() {
  const data = await chrome.storage.local.get(['token', 'apiBase', 'dossiers', 'current']);
  state.token = data.token || '';
  state.api = data.apiBase || DEFAULT_API;
  state.dossiers = data.dossiers || {};
  state.current = data.current || '';
}
const save = () => chrome.storage.local.set({ dossiers: state.dossiers, current: state.current });
const dossier = () => state.dossiers[state.current];

// ---------- API ----------
async function api(action, body) {
  const res = await fetch(state.api + action, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({ error: 'Réponse invalide du serveur.' }));
  if (res.status === 401 && action !== 'login') { await setToken(''); show('login'); }
  if (res.status === 402) show('noaccess');
  if (!res.ok) throw new Error(data.error || 'Erreur ' + res.status);
  return data;
}
async function setToken(token) { state.token = token; await chrome.storage.local.set({ token }); }

// ---------- UI utilitaires ----------
function show(view) {
  for (const id of ['login', 'noaccess', 'app']) $('#' + id).hidden = id !== view;
  $('#logout').hidden = view === 'login';
}
function toast(msg, error = false) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (error ? ' error' : ''); t.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => (t.hidden = true), error ? 6000 : 3000);
}
async function busy(label, fn) {
  $('#busy-text').textContent = label; $('#busy').hidden = false;
  try { return await fn(); } catch (e) { toast(e.message, true); } finally { $('#busy').hidden = true; }
}
function tab(name) {
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach((p) => (p.hidden = p.dataset.panel !== name));
}
const el = (tag, props = {}, ...children) => { const n = Object.assign(document.createElement(tag), props); n.append(...children.filter(Boolean)); return n; };
async function copy(text) { await navigator.clipboard.writeText(text); toast('Copié dans le presse-papiers.'); }
function card(title, text) {
  const btn = el('button', { className: 'link copy', textContent: 'Copier', onclick: () => copy(text) });
  return el('div', { className: 'card' }, el('h3', {}, title, btn), el('pre', { textContent: text }));
}

// ---------- Dossiers ----------
function newDossier(nom = 'Nouveau dossier') {
  const id = Date.now().toString(36);
  state.dossiers[id] = { id, nom, fiche: {}, verify: [], source: '', recus: '', listing: null, contracts: [], updated: Date.now() };
  state.current = id; save(); renderAll();
}
function renderDossiers() {
  const sel = $('#dossier'); sel.innerHTML = '';
  Object.values(state.dossiers).sort((a, b) => b.updated - a.updated).forEach((d) => sel.append(el('option', { value: d.id, textContent: d.nom, selected: d.id === state.current })));
}
function touch() { const d = dossier(); d.updated = Date.now(); save(); }

// ---------- Fiche ----------
function renderFiche() {
  const d = dossier(); const form = $('#fiche'); form.innerHTML = '';
  for (const [key, label] of Object.entries(state.fields)) {
    const input = el('input', { name: key, value: d.fiche[key] || '' });
    input.classList.toggle('empty', !input.value);
    input.oninput = () => { d.fiche[key] = input.value; input.classList.toggle('empty', !input.value); touch(); };
    form.append(el('label', { textContent: label }, input));
  }
  const v = $('#verify');
  v.hidden = !d.verify.length; v.innerHTML = '';
  if (d.verify.length) v.append(el('strong', { textContent: 'À vérifier' }), el('ul', {}, ...d.verify.map((x) => el('li', { textContent: x }))));
}
const ficheText = () => Object.entries(state.fields).map(([k, l]) => `${l} : ${dossier().fiche[k] || '—'}`).join('\n');

// ---------- Capture de la page ----------
async function activeTab() {
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!t || !/^(https?|file):/.test(t.url || '')) throw new Error('Ouvrez une page web (pas une page interne du navigateur).');
  return t;
}
async function capture() {
  const t = await activeTab();
  const results = await chrome.scripting.executeScript({
    target: { tabId: t.id, allFrames: true },
    func: () => { const sel = String(getSelection() || '').trim(); return sel || (document.body ? document.body.innerText : ''); },
  });
  const text = results.map((r) => r.result || '').filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').slice(0, 58000);
  if (!text.trim()) throw new Error('Aucun texte lisible sur cette page.');
  $('#source').value = `Page : ${t.title}\n${t.url}\n\n${text}`;
  dossier().source = $('#source').value; dossier().url = t.url; touch();
  toast('Page capturée. Lancez l’extraction.');
}

// ---------- Remplissage de formulaires ----------
function collectFields() {
  const out = [];
  const skip = ['hidden', 'submit', 'button', 'reset', 'file', 'password', 'image'];
  document.querySelectorAll('input, select, textarea').forEach((n, i) => {
    if (skip.includes(n.type) || n.disabled || n.readOnly) return;
    const r = n.getBoundingClientRect(); if (!r.width && !r.height) return;
    const key = 'f' + i; n.dataset.icourtierKey = key;
    let label = '';
    if (n.id) { const l = document.querySelector(`label[for="${CSS.escape(n.id)}"]`); if (l) label = l.innerText; }
    if (!label && n.closest('label')) label = n.closest('label').innerText;
    if (!label) label = n.getAttribute('aria-label') || n.placeholder || n.title || '';
    if (!label) { const prev = n.closest('td, div, li')?.previousElementSibling; if (prev) label = prev.innerText; }
    const field = { k: key, label: label.trim().slice(0, 120), name: n.name || n.id || '', type: n.tagName === 'SELECT' ? 'select' : n.type || 'text' };
    if (n.tagName === 'SELECT') field.options = [...n.options].map((o) => o.text.trim()).filter(Boolean).slice(0, 60);
    out.push(field);
  });
  return out;
}
function fillFields(values) {
  let count = 0;
  const setter = (proto) => Object.getOwnPropertyDescriptor(proto, 'value').set;
  for (const { champ, valeur } of values) {
    const n = document.querySelector(`[data-icourtier-key="${champ}"]`);
    if (!n || valeur == null || valeur === '') continue;
    if (n.tagName === 'SELECT') {
      const opt = [...n.options].find((o) => o.text.trim().toLowerCase() === String(valeur).toLowerCase() || o.value === valeur);
      if (!opt) continue; n.value = opt.value;
    } else if (n.type === 'checkbox' || n.type === 'radio') {
      n.checked = /^(oui|yes|true|1|x)$/i.test(String(valeur));
    } else {
      setter(n.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype).call(n, valeur);
    }
    n.dispatchEvent(new Event('input', { bubbles: true }));
    n.dispatchEvent(new Event('change', { bubbles: true }));
    n.style.outline = '2px solid #b8914a'; n.style.background = '#fffaf0';
    count++;
  }
  return count;
}
async function fill() {
  const t = await activeTab();
  const frames = await chrome.scripting.executeScript({ target: { tabId: t.id, allFrames: true }, func: collectFields });
  const fields = frames.flatMap((f) => (f.result || []).map((x) => ({ ...x, k: f.frameId + ':' + x.k })));
  if (!fields.length) throw new Error('Aucun champ de formulaire trouvé sur cette page.');
  const res = await api('map', { fields, fiche: dossier().fiche });
  let total = 0;
  for (const f of frames) {
    const values = res.remplissage.filter((v) => v.champ.startsWith(f.frameId + ':')).map((v) => ({ champ: v.champ.split(':')[1], valeur: v.valeur }));
    if (!values.length) continue;
    const [r] = await chrome.scripting.executeScript({ target: { tabId: t.id, frameIds: [f.frameId] }, func: fillFields, args: [values] });
    total += r.result || 0;
  }
  $('#fill-report').textContent = `${total} champ(s) remplis et surlignés. Vérifiez chaque valeur avant d’enregistrer.` + (res.non_remplis.length ? ` Non remplis : ${res.non_remplis.join(', ')}.` : '');
  toast(`${total} champ(s) remplis.`);
}

// ---------- Inscription ----------
const STATUS = { 'reçu': 'reçu', 'à obtenir': 'obtenir', 'à vérifier': 'verifier' };
function renderListing() {
  const d = dossier(); const out = $('#listing-out'); out.innerHTML = '';
  $('#recus').value = d.recus || '';
  const l = d.listing; if (!l) return;
  if (l.alertes.length) out.append(el('div', { className: 'notice' }, el('strong', { textContent: 'Alertes' }), el('ul', {}, ...l.alertes.map((a) => el('li', { textContent: a })))));
  const list = el('div', { className: 'card' }, el('h3', { textContent: 'Documents de l’inscription' }));
  l.checklist.forEach((c) => {
    const pill = el('button', { className: 'pill ' + STATUS[c.statut], textContent: c.statut, title: 'Changer le statut' });
    pill.onclick = () => { const keys = Object.keys(STATUS); c.statut = keys[(keys.indexOf(c.statut) + 1) % keys.length]; touch(); renderListing(); };
    list.append(el('div', { className: 'check' }, pill, el('div', {}, el('strong', { textContent: c.document }), el('div', { className: 'small muted', textContent: c.raison }))));
  });
  out.append(list,
    card('Description (FR)', l.description_fr),
    card('Description (EN)', l.description_en),
    card('Points forts', l.points_forts.map((p) => '• ' + p).join('\n')),
    card('Courriel au vendeur', l.courriel_vendeur));
}

// ---------- Contrats ----------
function renderContracts() {
  const sel = $('#contract-type');
  if (!sel.options.length) Object.entries(state.contracts).forEach(([k, v]) => sel.append(el('option', { value: k, textContent: v })));
  const out = $('#contract-out'); out.innerHTML = '';
  (dossier().contracts || []).forEach((c) => {
    const box = card(`${state.contracts[c.type] || c.type} — ${new Date(c.at).toLocaleString('fr-CA')}`, c.texte);
    const dl = el('button', { className: 'link copy', textContent: 'Télécharger (.txt)', onclick: () => {
      const a = el('a', { href: URL.createObjectURL(new Blob([c.texte], { type: 'text/plain' })), download: `${dossier().nom} - ${c.type}.txt` }); a.click();
    } });
    box.append(dl); out.append(box);
  });
}

function renderAll() {
  if (!dossier()) { newDossier(); return; }
  renderDossiers(); renderFiche(); renderListing(); renderContracts();
  $('#source').value = dossier().source || '';
  $('#pdf-name').textContent = ''; state.pdf = '';
}

// ---------- Démarrage ----------
async function start() {
  await load();
  if (!state.token) return show('login');
  try {
    const me = await api('me');
    state.fields = me.fields; state.contracts = me.contracts;
    if (!me.access) return show('noaccess');
    show('app'); renderAll();
    const { pending } = await chrome.storage.local.get('pending');
    if (pending) { $('#source').value = ($('#source').value ? $('#source').value + '\n\n' : '') + pending; dossier().source = $('#source').value; touch(); chrome.storage.local.remove('pending'); tab('saisie'); }
  } catch (e) { if (state.token) toast(e.message, true); }
}

$('#login-form').onsubmit = (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  busy('Connexion…', async () => { const r = await api('login', { email: f.get('email'), password: f.get('password') }); await setToken(r.token); await start(); });
};
$('#logout').onclick = async () => { await api('logout', {}).catch(() => {}); await setToken(''); show('login'); };
$('#recheck').onclick = () => busy('Vérification…', start);
document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => tab(b.dataset.tab)));
$('#dossier').onchange = (e) => { state.current = e.target.value; save(); renderAll(); };
$('#new-dossier').onclick = () => newDossier();
$('#del-dossier').onclick = () => {
  if (!confirm(`Supprimer le dossier « ${dossier().nom} » de ce navigateur ?`)) return;
  delete state.dossiers[state.current]; state.current = Object.keys(state.dossiers)[0] || ''; save(); renderAll();
};
$('#source').oninput = (e) => { dossier().source = e.target.value; touch(); };
$('#recus').oninput = (e) => { dossier().recus = e.target.value; touch(); };
$('#capture').onclick = () => busy('Capture de la page…', capture);
$('#pdf').onchange = (e) => {
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 3_000_000) { toast('PDF trop volumineux (3 Mo maximum).', true); return; }
  const reader = new FileReader();
  reader.onload = () => { state.pdf = String(reader.result).split(',')[1]; $('#pdf-name').textContent = '📄 ' + file.name; };
  reader.readAsDataURL(file);
};
$('#extract').onclick = () => busy('Extraction de la fiche…', async () => {
  const d = dossier();
  const r = await api('extract', { source: $('#source').value, url: d.url || '', pdf: state.pdf || undefined });
  for (const [k, v] of Object.entries(r.fiche)) if (v) d.fiche[k] = v;
  d.verify = r.a_verifier;
  if (d.nom === 'Nouveau dossier' && d.fiche.adresse) d.nom = d.fiche.adresse;
  touch(); renderDossiers(); renderFiche(); tab('fiche');
  toast(r.resume || 'Fiche remplie.');
});
$('#fill').onclick = () => busy('Remplissage du formulaire…', fill);
$('#copy-fiche').onclick = () => copy(ficheText());
$('#listing').onclick = () => busy('Préparation de l’inscription…', async () => {
  const d = dossier(); d.listing = await api('listing', { fiche: d.fiche, recus: d.recus }); touch(); renderListing();
});
$('#contract').onclick = () => busy('Rédaction de l’ébauche…', async () => {
  const d = dossier(); const type = $('#contract-type').value;
  const r = await api('contract', { type, details: $('#contract-details').value, fiche: d.fiche });
  d.contracts = [{ type, texte: r.texte, at: Date.now() }, ...(d.contracts || [])].slice(0, 10); touch(); renderContracts();
});

start();
