'use strict';
// Agent, rédaction et outils. Ce fichier s'appuie sur les fonctions de sidepanel.js (api, dossier, touch, el, busy, toast…).

const STATUTS = ['Prospection', 'Inscription en préparation', 'Inscription en vigueur', 'Promesse acceptée', 'Conditions remplies', 'Vendu', 'Annulé'];
const IDEAS = [
  'Qu’est-ce qui manque pour compléter ce dossier ?',
  'Ajoute les échéances : promesse acceptée aujourd’hui, financement 10 jours, inspection 7 jours.',
  'Rédige un courriel au notaire pour lui transmettre le dossier.',
  'Prépare 3 publications pour annoncer cette propriété.',
];
let profile = {};

// ---------- Profil du courtier ----------
async function loadProfile() {
  ({ profile = {} } = await chrome.storage.local.get('profile'));
  const form = $('#profile-form');
  for (const input of form.elements) input.value = profile[input.name] || '';
  form.oninput = () => { profile = Object.fromEntries([...form.elements].map((i) => [i.name, i.value.trim()])); chrome.storage.local.set({ profile }); };
}

// ---------- Statut et tâches du dossier ----------
function renderStatus() {
  const d = dossier(); const sel = $('#dossier-statut');
  sel.innerHTML = ''; STATUTS.forEach((s) => sel.append(el('option', { value: s, textContent: s, selected: (d.statut || 'Prospection') === s })));
  const open = (d.tasks || []).filter((t) => !t.done);
  const late = open.filter((t) => t.due && t.due < today()).length;
  $('#dossier-taches').textContent = open.length ? `${open.length} tâche(s)${late ? ` · ${late} en retard` : ''}` : '';
}
const today = () => new Date().toISOString().slice(0, 10);
function addTask(text, due = '') {
  const d = dossier(); d.tasks = d.tasks || [];
  d.tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text, due, done: false });
  touch();
}
function renderTasks() {
  const d = dossier(); const box = $('#tasks'); box.innerHTML = '';
  const tasks = (d.tasks || []).slice().sort((a, b) => (a.done - b.done) || (a.due || '9999').localeCompare(b.due || '9999'));
  if (!tasks.length) box.append(el('p', { className: 'small muted', textContent: 'Aucune tâche. L’agent peut en créer pour vous.' }));
  for (const t of tasks) {
    const check = el('input', { type: 'checkbox', checked: t.done, onchange: () => { t.done = check.checked; touch(); renderTasks(); renderStatus(); } });
    const late = !t.done && t.due && t.due < today();
    const del = el('button', { className: 'link small', textContent: 'Retirer', onclick: () => { d.tasks = d.tasks.filter((x) => x.id !== t.id); touch(); renderTasks(); renderStatus(); } });
    box.append(el('div', { className: 'task' + (t.done ? ' done' : '') + (late ? ' late' : '') }, check,
      el('div', {}, el('span', { textContent: t.text }), t.due && el('small', { textContent: (late ? 'En retard · ' : 'Échéance : ') + new Date(t.due + 'T12:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }) })), del));
  }
}

// ---------- Agent ----------
async function pageText() {
  const t = await activeTab();
  const results = await chrome.scripting.executeScript({ target: { tabId: t.id, allFrames: true }, func: () => (document.body ? document.body.innerText : '') });
  return `Page : ${t.title} (${t.url})\n` + results.map((r) => r.result || '').join('\n').slice(0, 38000);
}
async function generateContract(type, details) {
  const d = dossier();
  const r = await api('contract', { type, details, fiche: d.fiche, profil: profile });
  d.contracts = [{ type, texte: r.texte, at: Date.now() }, ...(d.contracts || [])].slice(0, 10); touch(); renderContracts();
}
// Exécute une action proposée par l'agent et renvoie une ligne de compte rendu.
async function runAction(a) {
  const d = dossier();
  switch (a.type) {
    case 'maj_fiche':
      if (!(a.champ in state.fields)) return null;
      d.fiche[a.champ] = a.valeur; touch(); renderFiche();
      return `Fiche · ${state.fields[a.champ]} : ${a.valeur || '(vidé)'}`;
    case 'statut_document': {
      const doc = DOCS.find((x) => x.key === a.document); if (!doc) return null;
      d.docs = d.docs || {}; d.docs[doc.key] = { ...(d.docs[doc.key] || {}), status: a.statut === 'reçu' ? 'reçu' : 'à obtenir' }; touch(); renderDocs();
      return `Document · ${doc.title} : ${d.docs[doc.key].status}`;
    }
    case 'ajouter_tache':
      if (!a.tache) return null;
      addTask(a.tache, /^\d{4}-\d{2}-\d{2}$/.test(a.echeance) ? a.echeance : ''); renderTasks();
      return `Tâche · ${a.tache}${a.echeance ? ' (' + a.echeance + ')' : ''}`;
    case 'statut_dossier':
      if (!STATUTS.includes(a.statut)) return null;
      d.statut = a.statut; touch();
      return `Statut du dossier : ${a.statut}`;
    case 'ouvrir_site':
      if (!/^https:\/\//.test(a.url)) return null;
      await chrome.tabs.create({ url: a.url });
      return `Site ouvert : ${new URL(a.url).hostname}`;
    case 'remplir_page':
      await fill();
      return 'Formulaire de la page rempli (champs surlignés)';
    case 'generer_contrat':
      if (!state.contracts[a.contrat]) return null;
      await generateContract(a.contrat, a.details);
      return `Ébauche créée : ${state.contracts[a.contrat]} (onglet Contrats)`;
    default: return null;
  }
}
function renderChat() {
  const d = dossier(); const box = $('#chat'); box.innerHTML = '';
  for (const m of d.chat || []) {
    const bubble = el('div', { className: 'msg ' + m.role }, el('pre', { textContent: m.content }));
    if (m.done?.length) bubble.append(el('ul', { className: 'done' }, ...m.done.map((x) => el('li', { textContent: '✓ ' + x }))));
    if (m.role === 'assistant') bubble.append(el('button', { className: 'link copy', textContent: 'Copier', onclick: () => copy(m.content) }));
    box.append(bubble);
  }
  box.scrollTop = box.scrollHeight;
  const ideas = $('#agent-ideas'); ideas.innerHTML = '';
  if (!(d.chat || []).length) IDEAS.forEach((i) => ideas.append(el('button', { className: 'chip', textContent: i, onclick: () => { $('#agent-input').value = i; $('#agent-input').focus(); } })));
}
async function askAgent(text) {
  const d = dossier(); d.chat = d.chat || [];
  d.chat.push({ role: 'user', content: text }); touch(); renderChat();
  const r = await api('agent', {
    messages: d.chat.map(({ role, content }) => ({ role, content })),
    fiche: d.fiche,
    dossier: { nom: d.nom, statut: d.statut || 'Prospection', documents: Object.fromEntries(DOCS.map((x) => [x.key, d.docs?.[x.key]?.status || 'à obtenir'])), taches: (d.tasks || []).filter((t) => !t.done).map((t) => ({ tache: t.text, echeance: t.due })), a_verifier: d.verify, contrats: (d.contracts || []).map((c) => c.type) },
    page: $('#agent-page').checked ? await pageText() : '',
    profil: profile,
  });
  const done = [];
  for (const a of r.actions) {
    try { const line = await runAction(a); if (line) done.push(line); } catch (e) { done.push(`Action non réalisée : ${e.message}`); }
  }
  d.chat.push({ role: 'assistant', content: r.reponse, done }); touch();
  renderChat(); renderStatus(); renderTasks();
}
$('#agent-form').onsubmit = (e) => {
  e.preventDefault();
  const text = $('#agent-input').value.trim(); if (!text) return;
  $('#agent-input').value = '';
  busy('L’agent travaille…', () => askAgent(text));
};
$('#agent-input').onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('#agent-form').requestSubmit(); };
$('#agent-clear').onclick = () => { if (confirm('Effacer la conversation de ce dossier ?')) { dossier().chat = []; touch(); renderChat(); } };

// ---------- Rédaction ----------
function renderWriting() {
  const sel = $('#writing-type');
  if (!sel.options.length) Object.entries(state.writings).forEach(([k, v]) => sel.append(el('option', { value: k, textContent: v })));
  const out = $('#writing-out'); out.innerHTML = '';
  (dossier().writings || []).forEach((w) => out.append(card(`${state.writings[w.type] || w.type} — ${new Date(w.at).toLocaleString('fr-CA')}`, w.texte)));
}
$('#writing').onclick = () => busy('Rédaction…', async () => {
  const d = dossier(); const type = $('#writing-type').value;
  const r = await api('redaction', { type, ton: $('#writing-tone').value, langue: $('#writing-lang').value, consignes: $('#writing-notes').value, fiche: d.fiche, profil: profile });
  d.writings = [{ type, texte: r.texte, at: Date.now() }, ...(d.writings || [])].slice(0, 15); touch(); renderWriting();
});

// ---------- Analyse de document ----------
function renderAnalyse() {
  const sel = $('#analyse-kind');
  if (!sel.options.length) Object.entries(state.docKinds).forEach(([k, v]) => sel.append(el('option', { value: k, textContent: v })));
  const out = $('#analyse-out'); out.innerHTML = '';
  const a = dossier().analyse; if (!a) return;
  const list = (title, items) => items.length && el('div', {}, el('strong', { textContent: title }), el('ul', {}, ...items.map((x) => el('li', { textContent: x }))));
  const apply = a.champs.length && el('button', { className: 'btn ghost', textContent: `Appliquer ${a.champs.length} valeur(s) à la fiche`, onclick: () => {
    const d = dossier(); a.champs.forEach((c) => { if (c.champ in state.fields && c.valeur) d.fiche[c.champ] = c.valeur; }); touch(); renderFiche(); toast('Fiche mise à jour.');
  } });
  out.append(el('div', { className: 'analysis' }, el('strong', { textContent: a.fichier }), el('p', { textContent: a.resume }),
    list('Points clés', a.points_cles), list('Points d’alerte', a.points_alerte), list('Questions à poser', a.questions), apply));
}
$('#analyse-file').onchange = (e) => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  if (file.size > 3_000_000) { toast('PDF trop volumineux (3 Mo maximum).', true); return; }
  const reader = new FileReader();
  reader.onload = () => busy('Analyse du document…', async () => {
    const d = dossier();
    const r = await api('analyse', { pdf: String(reader.result).split(',')[1], kind: $('#analyse-kind').value, fiche: d.fiche });
    d.analyse = { ...r, fichier: file.name }; touch(); renderAnalyse();
  });
  reader.readAsDataURL(file);
};

// ---------- Calculatrices ----------
const money = (n) => n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' });
const num = (id) => Number($(id).value) || 0;
function calcMortgage() {
  const principal = num('#c-prix') - num('#c-mise'), years = num('#c-ans'), rate = num('#c-taux') / 100;
  if (principal <= 0 || !years) return ($('#c-hypo').textContent = '');
  // Au Canada, le taux fixe est composé semestriellement.
  const monthly = rate ? Math.pow(1 + rate / 2, 2 / 12) - 1 : 0;
  const n = years * 12;
  const payment = monthly ? principal * monthly / (1 - Math.pow(1 + monthly, -n)) : principal / n;
  $('#c-hypo').textContent = `Prêt : ${money(principal)} · Mensualité : ${money(payment)} · Intérêts totaux : ${money(payment * n - principal)}. Estimation, hors assurance prêt hypothécaire.`;
}
function calcCommission() {
  const base = num('#m-prix') * num('#m-taux') / 100;
  if (!base) return ($('#c-comm').textContent = '');
  const tps = base * 0.05, tvq = base * 0.09975;
  $('#c-comm').textContent = `Commission : ${money(base)} · TPS (5 %) : ${money(tps)} · TVQ (9,975 %) : ${money(tvq)} · Total : ${money(base + tps + tvq)}`;
}
function calcAdjustment() {
  const tax = num('#a-taxe'), date = $('#a-date').value;
  if (!tax || !date) return ($('#c-ajust').textContent = '');
  // Dates en UTC pour compter des jours entiers, sans effet de fuseau ni d'heure d'été.
  const [y, m, day] = date.split('-').map(Number);
  const d = Date.UTC(y, m - 1, day), start = Date.UTC(y, 0, 1), end = Date.UTC(y + 1, 0, 1);
  const days = Math.round((end - start) / 864e5), sellerDays = Math.round((d - start) / 864e5);
  const seller = tax * sellerDays / days, buyer = tax - seller;
  $('#c-ajust').textContent = `Part du vendeur (${sellerDays} j) : ${money(seller)} · Part de l’acheteur (${days - sellerDays} j) : ${money(buyer)}. ` +
    ($('#a-payee').checked ? `L’acheteur rembourse ${money(buyer)} au vendeur.` : `Le vendeur crédite ${money(seller)} à l’acheteur.`);
}
['#c-prix', '#c-mise', '#c-taux', '#c-ans'].forEach((s) => ($(s).oninput = calcMortgage));
['#m-prix', '#m-taux'].forEach((s) => ($(s).oninput = calcCommission));
['#a-taxe', '#a-date', '#a-payee'].forEach((s) => ($(s).oninput = calcAdjustment));
function prefillCalculators() {
  const f = dossier().fiche; const price = Number(String(f.prix_demande || '').replace(/[^\d]/g, ''));
  if (price && !$('#c-prix').value) { $('#c-prix').value = price; $('#m-prix').value = price; calcMortgage(); calcCommission(); }
}

// ---------- Sauvegarde ----------
function download(name, text, type) {
  el('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name }).click();
}
$('#export-all').onclick = () => download(`i-courtier-dossiers-${today()}.json`, JSON.stringify({ app: 'i-courtier', version: 1, dossiers: state.dossiers }, null, 2), 'application/json');
$('#export-fiche').onclick = () => {
  const d = dossier(); const esc = (v) => '"' + String(v || '').replace(/"/g, '""') + '"';
  download(`${d.nom}.csv`, '﻿Champ;Valeur\n' + Object.entries(state.fields).map(([k, l]) => `${esc(l)};${esc(d.fiche[k])}`).join('\n'), 'text/csv');
};
$('#import-file').onchange = (e) => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  file.text().then((text) => {
    const data = JSON.parse(text);
    if (data.app !== 'i-courtier' || typeof data.dossiers !== 'object') throw new Error('Ce fichier n’est pas une sauvegarde i-Courtier.');
    const count = Object.keys(data.dossiers).length;
    Object.assign(state.dossiers, data.dossiers); save(); renderAll();
    toast(`${count} dossier(s) importé(s).`);
  }).catch((err) => toast(err.message || 'Fichier illisible.', true));
};

// ---------- Rendu et démarrage ----------
$('#dossier-statut').onchange = (e) => { dossier().statut = e.target.value; touch(); };
$('#task-form').onsubmit = (e) => {
  e.preventDefault(); addTask($('#task-text').value.trim(), $('#task-date').value);
  $('#task-text').value = ''; $('#task-date').value = ''; renderTasks(); renderStatus();
};
function renderExtras() { renderStatus(); renderTasks(); renderChat(); renderWriting(); renderAnalyse(); prefillCalculators(); }

loadProfile().then(start);
