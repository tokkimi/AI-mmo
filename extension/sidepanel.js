'use strict';

const DEFAULT_API = 'https://i-ateliers.com/api/icourtier/';
const $ = (s) => document.querySelector(s);
const state = { token: '', api: DEFAULT_API, fields: {}, pages: [], limits: {}, contracts: {}, dossiers: {}, current: '', pdf: '' };

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
  state.dossiers[id] = { id, nom, fiche: {}, verify: [], source: '', recus: '', docs: {}, proprietaires: [], pieces: [], textes: {}, parcours: {}, listing: null, contracts: [], updated: Date.now() };
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
  const pages = state.pages.length ? state.pages : [{ page: 'fiche', titre: 'Fiche', champs: state.fields }];
  for (const pg of pages) {
    const keys = Object.keys(pg.champs); const filled = keys.filter((k) => d.fiche[k]).length;
    const box = el('details', { className: 'fiche-page', open: pg.page === 'dossier' || pg.page === '1' }, el('summary', {}, pg.titre, el('span', { className: 'count', textContent: `${filled}/${keys.length}` })));
    for (const [key, label] of Object.entries(pg.champs)) {
      const input = el('input', { name: key, value: d.fiche[key] || '' });
      input.classList.toggle('empty', !input.value);
      input.oninput = () => { d.fiche[key] = input.value; input.classList.toggle('empty', !input.value); touch(); renderChecks(); };
      box.append(el('label', { textContent: label }, input));
    }
    // Les propriétaires (page 3) et les pièces (page 5) ont leurs propres listes.
    if (pg.page === '3') box.append(ownersEditor());
    if (pg.page === '5') box.append(roomsEditor());
    form.append(box);
  }
  renderChecks();
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
    // Texte du libellé sans celui des champs qu'il contient (sinon une liste ajoute toutes ses options au nom du champ).
    const text = (l) => { const c = l.cloneNode(true); c.querySelectorAll('input, select, textarea, option').forEach((x) => x.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
    let label = '';
    if (n.id) { const l = document.querySelector(`label[for="${CSS.escape(n.id)}"]`); if (l) label = text(l); }
    if (!label && n.closest('label')) label = text(n.closest('label'));
    if (!label) label = n.getAttribute('aria-label') || n.placeholder || n.title || '';
    if (!label) { const prev = n.closest('td, div, li')?.previousElementSibling; if (prev) label = prev.innerText; }
    const field = { k: key, label: label.trim().slice(0, 120), name: n.name || n.id || '', type: n.tagName === 'SELECT' ? 'select' : n.type || 'text' };
    if (n.tagName === 'SELECT') field.options = [...n.options].map((o) => o.text.trim()).filter(Boolean).slice(0, 60);
    const v = n.tagName === 'SELECT' ? (n.selectedOptions[0]?.text || '').trim() : (n.type === 'checkbox' || n.type === 'radio') ? (n.checked ? 'oui' : '') : n.value;
    if (v) field.v = String(v).slice(0, 3200);
    if (n.maxLength > 0) field.max = n.maxLength;
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
async function pageFields() {
  const t = await activeTab();
  const frames = await chrome.scripting.executeScript({ target: { tabId: t.id, allFrames: true }, func: collectFields });
  const fields = frames.flatMap((f) => (f.result || []).map((x) => ({ ...x, k: f.frameId + ':' + x.k })));
  if (!fields.length) throw new Error('Aucun champ de formulaire trouvé sur cette page.');
  return { t, frames, fields };
}
async function fill(page = '') {
  const { t, frames, fields } = await pageFields();
  const res = await api('map', { fields, fiche: dossier().fiche, dossier: dossierPayload(), page });
  let total = 0;
  for (const f of frames) {
    const values = res.remplissage.filter((v) => v.champ.startsWith(f.frameId + ':')).map((v) => ({ champ: v.champ.split(':')[1], valeur: v.valeur }));
    if (!values.length) continue;
    const [r] = await chrome.scripting.executeScript({ target: { tabId: t.id, frameIds: [f.frameId] }, func: fillFields, args: [values] });
    total += r.result || 0;
  }
  $('#fill-report').textContent = `${total} champ(s) remplis et surlignés${page ? ` (${page})` : ''}. Vérifiez chaque valeur, sauvegardez, puis cliquez sur « Relire la page ».` + (res.non_remplis.length ? ` Non remplis : ${res.non_remplis.join(', ')}.` : '');
  toast(`${total} champ(s) remplis.`);
  return total;
}

// ---------- Inscription ----------
const STATUS = { 'reçu': 'reçu', 'à obtenir': 'obtenir', 'à vérifier': 'verifier' };
const TEXTS = [
  ['description_fr', 'Description (FR)'], ['description_en', 'Description (EN)'], ['addenda_fr', 'Addenda (FR)'], ['addenda_en', 'Addenda (EN)'],
  ['inclusions_fr', 'Inclusions (FR)'], ['inclusions_en', 'Inclusions (EN)'], ['exclusions_fr', 'Exclusions (FR)'], ['exclusions_en', 'Exclusions (EN)'],
  ['info_collaborateur', 'Info courtier collaborateur'],
];
function renderListing() {
  const d = dossier(); const out = $('#listing-out'); out.innerHTML = '';
  $('#recus').value = d.recus || '';
  const l = d.listing;
  if (l?.questions_courtier?.length) out.append(el('div', { className: 'notice' }, el('strong', { textContent: 'À confirmer avant d’entrer les textes' }), el('ul', {}, ...l.questions_courtier.map((q) => el('li', { textContent: q })))));
  if (l?.alertes?.length) out.append(el('div', { className: 'notice' }, el('strong', { textContent: 'Alertes' }), el('ul', {}, ...l.alertes.map((a) => el('li', { textContent: a })))));
  // Textes modifiables, avec le décompte de caractères exigé par la saisie.
  const texts = el('div', { className: 'card' }, el('h3', { textContent: 'Textes de l’inscription (page 7)' }));
  for (const [key, label] of TEXTS) {
    const max = state.limits[key];
    const counter = el('small', { className: 'counter' });
    const area = el('textarea', { rows: key.startsWith('addenda') ? 6 : 3, value: d.textes[key] || '', placeholder: key === 'info_collaborateur' ? 'À écrire selon vos instructions (onglet Rédaction : « Info courtier collaborateur »)' : '' });
    const update = () => { const n = area.value.length; counter.textContent = max ? `${n} / ${max} caractères` : `${n} caractères`; counter.classList.toggle('over', !!max && n > max); };
    area.oninput = () => { d.textes[key] = area.value; touch(); update(); renderChecks(); };
    update();
    texts.append(el('div', { className: 'text-field' }, el('div', { className: 'text-head' }, el('strong', { textContent: label }), counter, el('button', { className: 'link copy', textContent: 'Copier', onclick: () => copy(area.value) })), area));
  }
  out.append(texts);
  if (!l) return;
  const list = el('div', { className: 'card' }, el('h3', { textContent: 'Documents de l’inscription' }));
  l.checklist.forEach((c) => {
    const pill = el('button', { className: 'pill ' + STATUS[c.statut], textContent: c.statut, title: 'Changer le statut' });
    pill.onclick = () => { const keys = Object.keys(STATUS); c.statut = keys[(keys.indexOf(c.statut) + 1) % keys.length]; touch(); renderListing(); };
    list.append(el('div', { className: 'check' }, pill, el('div', {}, el('strong', { textContent: c.document }), el('div', { className: 'small muted', textContent: c.raison }))));
  });
  out.append(list,
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

// ---------- Documents à récupérer (registre foncier, taxes, Hydro-Québec) ----------
const google = (q) => 'https://www.google.com/search?q=' + encodeURIComponent(q);
const isMontreal = (f) => /montr[ée]al/i.test(f.ville || f.adresse || '');
const civic = (f) => (f.adresse || '').split(',')[0].trim();
const DOCS = [
  { key: 'index', title: 'Index des immeubles', source: 'Registre foncier', url: () => 'https://www.registrefoncier.gouv.qc.ca', copy: 'cadastre', copyLabel: 'N° de lot',
    steps: ['Consulter → Index des immeubles', 'Collez le n° de lot (déjà copié) dans « N° de lot »', 'Soumettre → Confirmer → Sauvegarder le PDF'] },
  { key: 'hypotheque', title: 'Acte de prêt (hypothèque)', source: 'Registre foncier', url: () => 'https://www.registrefoncier.gouv.qc.ca', copy: 'cadastre', copyLabel: 'N° de lot',
    steps: ['Ouvrez le PDF de l’index des immeubles', 'Cliquez sur le lien de l’hypothèque', 'Confirmer → Sauvegarder le PDF'] },
  { key: 'vente', title: 'Acte de vente', source: 'Registre foncier', url: () => 'https://www.registrefoncier.gouv.qc.ca', copy: 'cadastre', copyLabel: 'N° de lot',
    steps: ['Retournez sur le PDF de l’index des immeubles', 'Cliquez sur la vente', 'Confirmer → Sauvegarder le PDF'] },
  { key: 'transmission', title: 'Déclaration de transmission', source: 'Registre foncier', optional: 'Seulement en cas de succession ou de servitude.', url: () => 'https://www.registrefoncier.gouv.qc.ca', copy: 'cadastre', copyLabel: 'N° de lot',
    steps: ['Depuis l’index des immeubles, cliquez sur la déclaration de transmission', 'Confirmer → Sauvegarder le PDF'] },
  { key: 'municipal', title: 'Rôle d’évaluation et rôle de taxation', source: 'Taxes municipales', copy: 'civique', copyLabel: 'N° civique et rue',
    url: (f) => google(isMontreal(f) ? 'eval web Montréal rôle d’évaluation foncière' : `rôle d'évaluation ${f.ville || ''}`),
    steps: (f) => isMontreal(f)
      ? ['Montréal : utilisez « eval web » (recherche déjà lancée)', 'Recherchez l’adresse (copiée)', 'Enregistrez le rôle d’évaluation et le compte de taxes en PDF']
      : ['Ouvrez le 1er résultat → Accès citoyen', 'Remplissez n° civique + rue (copiés)', 'Rôle de taxation et rôle d’évaluation : petite loupe → Visualiser → Enregistrer le PDF'] },
  { key: 'scolaire', title: 'Compte de taxes scolaires', source: 'Taxes scolaires', url: (f) => google(`TFP ${f.ville || ''} compte de taxes scolaires`), copy: 'cadastre', copyLabel: 'N° de lot',
    steps: ['Ouvrez le site TFP de la région → Compte de taxes', 'Recherche par n° de cadastre (copié) → Rechercher', 'Téléchargez le fichier le plus récent'] },
  { key: 'hydro', title: 'Estimation Hydro-Québec', source: 'Hydro-Québec', capture: true, copy: 'civique', copyLabel: 'Adresse',
    url: () => 'https://www.hydroquebec.com/residentiel/espace-clients/demenagement/estimer-couts-residence.html',
    steps: ['Entrez l’adresse (copiée) et lancez l’estimation', 'Quand le montant s’affiche, cliquez sur « Capturer le montant »'] },
  { key: 'contrat', title: 'Contrat de courtage et modifications', source: 'Dossier du courtier', signed: true,
    steps: ['Importez la version signée et chaque modification', 'Vérifiez l’adresse, les dates et le numéro du contrat'] },
  { key: 'declaration', title: 'Déclaration du vendeur et modifications', source: 'Vendeur', signed: true,
    steps: ['Importez la version signée', '« Non », « ne sais pas » et champ vide ne veulent pas dire la même chose'] },
  { key: 'certificat', title: 'Certificat de localisation (rapport et plan)', source: 'Arpenteur-géomètre', copy: 'adresse', copyLabel: 'Adresse',
    steps: ['Relevez l’année, le lot, les dimensions et la superficie', 'Plus de 10 ans : vérifiez s’il faut le renouveler'] },
  { key: 'cadastral', title: 'Plan cadastral', source: 'Infolot', url: () => 'https://appli.mern.gouv.qc.ca/infolot/', copy: 'cadastre', copyLabel: 'N° de lot',
    steps: ['Recherchez le lot (copié)', 'Enregistrez le plan en PDF'] },
  { key: 'matrix', title: 'Ancienne fiche Matrix', source: 'Matrix', optional: 'Si la propriété a déjà été inscrite.',
    steps: ['Retrouvez l’ancienne fiche et enregistrez-la en PDF', 'Elle sert de point de départ pour les caractéristiques (page 8)'] },
  { key: 'plans', title: 'Plans cotés', source: 'Vendeur ou photographe', rooms: true,
    steps: ['Importez le plan avec les dimensions', 'Les pièces sont créées automatiquement (page 5)'] },
  { key: 'inspection', title: 'Rapport d’inspection', source: 'Inspecteur', optional: 'S’il existe.',
    steps: ['Importez le rapport', 'Les points d’alerte vont dans « À vérifier »'] },
  { key: 'photos', title: 'Photos et vidéos', source: 'Photographe', link: true,
    steps: ['Collez le lien du photographe', 'Vérifiez que les fichiers sont bien ceux de cette propriété'] },
];
function copyValue(doc, f) {
  if (!doc.copy) return '';
  if (doc.copy === 'civique') return [civic(f), f.ville].filter(Boolean).join(', ');
  return f[doc.copy] || '';
}
function renderDocs() {
  const d = dossier(); d.docs = d.docs || {};
  const box = $('#docs'); box.innerHTML = '';
  const done = DOCS.filter((x) => d.docs[x.key]?.status === 'reçu').length;
  $('#docs-progress').textContent = `${done}/${DOCS.length} documents reçus pour ce dossier.`;
  for (const doc of DOCS) {
    const st = d.docs[doc.key] || { status: 'à obtenir' };
    const steps = typeof doc.steps === 'function' ? doc.steps(d.fiche) : doc.steps;
    const pill = el('button', { className: 'pill ' + (st.status === 'reçu' ? 'reçu' : 'obtenir'), textContent: st.status, title: 'Changer le statut',
      onclick: () => { d.docs[doc.key] = { ...st, status: st.status === 'reçu' ? 'à obtenir' : 'reçu' }; touch(); renderDocs(); } });
    const open = doc.url && el('button', { className: 'btn ghost', textContent: 'Ouvrir le site', onclick: () => openDoc(doc) });
    // Version signée et date du document : un ancien document ne prouve pas que la situation est inchangée.
    const meta = el('div', { className: 'doc-meta' },
      doc.signed && el('label', { className: 'check-line' }, el('input', { type: 'checkbox', checked: !!st.signe, onchange: (e) => { d.docs[doc.key] = { ...st, signe: e.target.checked }; touch(); } }), 'Version signée'),
      doc.link ? el('input', { placeholder: 'Lien du photographe', value: st.lien || '', onchange: (e) => { d.docs[doc.key] = { ...st, lien: e.target.value, status: e.target.value ? 'reçu' : st.status }; touch(); renderDocs(); } })
        : el('input', { placeholder: 'Date du document (ex. 2024-03)', value: st.date || '', onchange: (e) => { d.docs[doc.key] = { ...st, date: e.target.value }; touch(); renderChecks(); } }));
    const action = doc.link ? null : doc.capture
      ? el('button', { className: 'btn', textContent: 'Capturer le montant', onclick: () => busy('Lecture du montant…', () => captureDoc(doc)) })
      : el('button', { className: 'btn', textContent: 'Importer le PDF', onclick: () => { state.docKey = doc.key; $('#doc-file').value = ''; $('#doc-file').click(); } });
    box.append(el('div', { className: 'doc' + (st.status === 'reçu' ? ' ok' : '') },
      el('header', {}, el('div', {}, el('strong', { textContent: doc.title }), el('div', { className: 'small muted', textContent: doc.source })), pill),
      doc.optional && el('div', { className: 'small muted', textContent: doc.optional }),
      el('ol', {}, ...steps.map((s) => el('li', { textContent: s }))),
      doc.copy && !copyValue(doc, d.fiche) && el('div', { className: 'warn', textContent: `${doc.copyLabel} manquant dans la fiche : complétez-le pour gagner du temps.` }),
      meta,
      (open || action) && el('div', { className: 'row' }, open, action),
      st.file && el('div', { className: 'file', textContent: `✓ ${st.file} · ${new Date(st.at).toLocaleDateString('fr-CA')}` })));
  }
}
async function openDoc(doc) {
  const f = dossier().fiche; const value = copyValue(doc, f);
  if (value) { await navigator.clipboard.writeText(value).catch(() => {}); toast(`${doc.copyLabel} copié : ${value}`); }
  chrome.tabs.create({ url: doc.url(f) });
}
// Ajoute à la fiche ce qu'une extraction établit : champs, propriétaires et pièces.
function applyExtraction(r, replaceRooms = false) {
  const d = dossier();
  for (const [k, v] of Object.entries(r.fiche || {})) if (v) d.fiche[k] = v;
  d.verify = [...new Set([...(d.verify || []), ...(r.a_verifier || [])])].slice(0, 40);
  d.proprietaires = d.proprietaires || [];
  for (const o of r.proprietaires || []) if (o.nom && !d.proprietaires.some((x) => x.nom.toLowerCase() === o.nom.toLowerCase())) d.proprietaires.push(o);
  if ((r.pieces || []).length && (replaceRooms || !(d.pieces || []).length)) d.pieces = r.pieces;
  if (d.nom === 'Nouveau dossier' && d.fiche.adresse) d.nom = d.fiche.adresse;
}
async function mergeExtraction(doc, r, file) {
  const d = dossier();
  applyExtraction(r, !!doc.rooms);
  d.docs[doc.key] = { ...(d.docs[doc.key] || {}), status: 'reçu', file, at: Date.now() };
  touch(); renderDossiers(); renderFiche(); renderDocs(); renderExtras();
  toast(`${doc.title} : fiche mise à jour.`);
}
async function captureDoc(doc) {
  const t = await activeTab();
  const url = await chrome.tabs.captureVisibleTab(t.windowId, { format: 'jpeg', quality: 85 });
  const r = await api('extract', { image: url.split(',')[1], imageType: 'image/jpeg', doc: `${doc.title} (capture d’écran du montant affiché; inscris le coût annuel estimé dans hydro_cout_annuel)`, url: t.url });
  await mergeExtraction(doc, r, 'Capture d’écran');
}
$('#doc-file').onchange = (e) => {
  const file = e.target.files[0]; const doc = DOCS.find((x) => x.key === state.docKey); if (!file || !doc) return;
  if (file.size > 3_000_000) { toast('PDF trop volumineux (3 Mo maximum).', true); return; }
  const reader = new FileReader();
  reader.onload = () => busy(`Lecture : ${doc.title}…`, async () => {
    const r = await api('extract', { pdf: String(reader.result).split(',')[1], doc: `${doc.title} (${doc.source})${doc.rooms ? ' : crée la liste des pièces d’après le plan' : ''}` });
    await mergeExtraction(doc, r, file.name);
  });
  reader.readAsDataURL(file);
};

// ---------- Plateformes : Centris et Instanet ----------
function nameTransaction(name) {
  const visible = (n) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const label = (n) => [n.id && document.querySelector(`label[for="${CSS.escape(n.id)}"]`)?.innerText, n.closest('label')?.innerText, n.getAttribute('aria-label'), n.placeholder, n.name, n.id].filter(Boolean).join(' ');
  const fields = [...document.querySelectorAll('input:not([type]), input[type=text]')].filter((n) => visible(n) && !n.disabled && !n.readOnly);
  const best = fields.map((n) => ({ n, score: (/nom|name|titre|title/i.test(label(n)) ? 2 : 0) + (/transaction|dossier|file|folder/i.test(label(n)) ? 2 : 0) + (!n.value ? 1 : 0) }))
    .filter((x) => x.score >= 2).sort((a, b) => b.score - a.score)[0];
  if (!best) return false;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(best.n, name);
  best.n.dispatchEvent(new Event('input', { bubbles: true })); best.n.dispatchEvent(new Event('change', { bubbles: true }));
  best.n.style.outline = '2px solid #b8914a'; best.n.focus();
  return true;
}
$('#open-centris').onclick = () => chrome.tabs.create({ url: 'https://zone.centris.ca/Dashboard?ml-page=1&ml-status=Incomplete&ml-showAllListings=false&tab=list' });
$('#open-instanet').onclick = () => chrome.tabs.create({ url: 'https://pr.transactiondesk.com/' });
$('#name-instanet').onclick = () => busy('Nommage du dossier…', async () => {
  const name = dossier().fiche.adresse;
  if (!name) throw new Error('Ajoutez d’abord l’adresse dans la fiche.');
  await navigator.clipboard.writeText(name).catch(() => {});
  const t = await activeTab();
  const results = await chrome.scripting.executeScript({ target: { tabId: t.id, allFrames: true }, func: nameTransaction, args: [name] });
  toast(results.some((r) => r.result) ? `Dossier nommé : ${name}` : 'Champ du nom introuvable : l’adresse est copiée, collez-la (Ctrl+V).', !results.some((r) => r.result));
});

function renderAll() {
  if (!dossier()) { newDossier(); return; }
  const d = dossier(); d.proprietaires = d.proprietaires || []; d.pieces = d.pieces || []; d.textes = d.textes || {}; d.parcours = d.parcours || {}; d.docs = d.docs || {};
  renderDossiers(); renderFiche(); renderDocs(); renderListing(); renderContracts(); renderExtras();
  $('#source').value = dossier().source || '';
  $('#pdf-name').textContent = ''; state.pdf = '';
}

// ---------- Démarrage ----------
async function start() {
  await load();
  if (!state.token) return show('login');
  try {
    const me = await api('me');
    state.fields = me.fields; state.pages = me.pages || []; state.limits = me.limits || {}; state.contracts = me.contracts; state.writings = me.writings || {}; state.docKinds = me.docKinds || {};
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
  applyExtraction(r);
  touch(); renderDossiers(); renderFiche(); renderExtras(); tab('fiche');
  toast(r.resume || 'Fiche remplie.');
});
$('#fill').onclick = () => busy('Remplissage du formulaire…', () => fill($('#fill-page').value));
$('#copy-fiche').onclick = () => copy(ficheText());
$('#listing').onclick = () => busy('Préparation de l’inscription…', async () => {
  const d = dossier();
  const recus = [d.recus, ...DOCS.filter((x) => d.docs?.[x.key]?.status === 'reçu').map((x) => x.title)].filter(Boolean).join(', ');
  const r = await api('listing', { fiche: d.fiche, recus, dossier: dossierPayload() });
  d.listing = r;
  // Les textes déjà validés par le courtier ne sont pas écrasés.
  for (const k of ['description_fr', 'description_en', 'addenda_fr', 'addenda_en', 'inclusions_fr', 'inclusions_en', 'exclusions_fr', 'exclusions_en']) if (!d.textes[k]?.trim()) d.textes[k] = r[k];
  touch(); renderListing(); renderChecks();
});
$('#contract').onclick = () => busy('Rédaction de l’ébauche…', async () => {
  const d = dossier(); const type = $('#contract-type').value;
  const r = await api('contract', { type, details: $('#contract-details').value, fiche: d.fiche, profil: profile });
  d.contracts = [{ type, texte: r.texte, at: Date.now() }, ...(d.contracts || [])].slice(0, 10); touch(); renderContracts();
});

