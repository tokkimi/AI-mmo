'use strict';
// Saisie à la source : parcours en 17 étapes, propriétaires, pièces, contrôles du métier, relecture des pages et contrôle final.
// S'appuie sur sidepanel.js (api, dossier, touch, el, busy, toast, fill, pageFields…).

// ---------- Données du dossier envoyées au moteur ----------
function dossierPayload() {
  const d = dossier();
  return {
    nom: d.nom, statut: d.statut || 'Prospection',
    proprietaires: d.proprietaires || [], pieces: d.pieces || [], textes: d.textes || {},
    documents: Object.fromEntries(DOCS.map((x) => [x.key, { statut: d.docs?.[x.key]?.status || 'à obtenir', date: d.docs?.[x.key]?.date || '', signe: !!d.docs?.[x.key]?.signe, fichier: d.docs?.[x.key]?.file || '', lien: d.docs?.[x.key]?.lien || '' }])),
    parcours: PARCOURS.map((p) => ({ etape: p.key, titre: p.titre, fait: !!d.parcours?.[p.key] })),
    etape_en_cours: currentStep()?.titre || 'Parcours terminé',
    controles: checks(),
    taches: (d.tasks || []).filter((t) => !t.done).map((t) => ({ tache: t.text, echeance: t.due })),
    a_verifier: d.verify || [],
  };
}

// ---------- Propriétaires (page 3) ----------
function ownersEditor() {
  const d = dossier(); d.proprietaires = d.proprietaires || [];
  const box = el('div', { className: 'sub-list' }, el('strong', { textContent: `Propriétaires (${d.proprietaires.length})` }));
  d.proprietaires.forEach((o, i) => {
    const input = (k, ph) => el('input', { value: o[k] || '', placeholder: ph, oninput: (e) => { o[k] = e.target.value; touch(); } });
    const genre = el('select', { onchange: (e) => { o.genre = e.target.value; touch(); } }, ...['personne physique', 'compagnie', 'succession'].map((g) => el('option', { value: g, textContent: g, selected: o.genre === g })));
    box.append(el('div', { className: 'sub-item' },
      el('div', { className: 'sub-head' }, el('span', { textContent: `Propriétaire ${i + 1}` }), el('button', { className: 'link small', textContent: 'Retirer', onclick: () => { d.proprietaires.splice(i, 1); touch(); renderFiche(); } })),
      input('nom', 'Nom exact, comme à l’acte'), genre, input('adresse', 'Adresse'), el('div', { className: 'grid2' }, input('courriel', 'Courriel'), input('langue', 'Langue (FR/EN)'))));
  });
  box.append(el('button', { className: 'btn ghost', textContent: '+ Ajouter un propriétaire', onclick: () => { d.proprietaires.push({ nom: '', genre: 'personne physique', adresse: '', courriel: '', langue: 'FR' }); touch(); renderFiche(); } }));
  return box;
}

// ---------- Pièces (page 5) ----------
const LEVELS = ['Rez-de-chaussée', 'Étage', 'Sous-sol', 'Autre'];
function sortRooms(rooms) { return rooms.slice().sort((a, b) => LEVELS.indexOf(a.niveau) - LEVELS.indexOf(b.niveau)); }
function roomsEditor() {
  const d = dossier(); d.pieces = d.pieces || [];
  const box = el('div', { className: 'sub-list' }, el('strong', { textContent: `Pièces (${d.pieces.length}) — sans l’entrée ni les couloirs` }));
  d.pieces.forEach((r, i) => {
    const input = (k, ph) => el('input', { value: r[k] || '', placeholder: ph, oninput: (e) => { r[k] = e.target.value; touch(); renderChecks(); } });
    const level = el('select', { onchange: (e) => { r.niveau = e.target.value; touch(); } }, ...LEVELS.map((l) => el('option', { value: l, textContent: l, selected: r.niveau === l })));
    box.append(el('div', { className: 'room' }, input('nom', 'Pièce'), level, input('dimensions', '12\'4" x 10\'6"'), input('revetement', 'Revêtement'),
      el('button', { className: 'link small', textContent: '✕', title: 'Retirer', onclick: () => { d.pieces.splice(i, 1); touch(); renderFiche(); } })));
  });
  box.append(el('div', { className: 'row' },
    el('button', { className: 'btn ghost', textContent: '+ Ajouter une pièce', onclick: () => { d.pieces.push({ nom: '', niveau: 'Rez-de-chaussée', dimensions: '', revetement: '' }); touch(); renderFiche(); } }),
    el('button', { className: 'btn ghost', textContent: 'Classer RDC → étage → sous-sol', onclick: () => { d.pieces = sortRooms(d.pieces); touch(); renderFiche(); } })));
  return box;
}

// ---------- Contrôles du métier (calculés dans le navigateur, sans IA) ----------
const amount = (v) => Number(String(v || '').replace(/[^\d.,]/g, '').replace(/\s/g, '').replace(',', '.')) || 0;
const year = (v) => Number((String(v || '').match(/(19|20)\d{2}/) || [])[0]) || 0;
function checks() {
  const d = dossier(); if (!d) return [];
  const f = d.fiche, out = [], now = new Date().getFullYear(), push = (niveau, texte) => out.push({ niveau, texte });
  const cert = year(f.certificat_annee) || year(d.docs?.certificat?.date);
  if (cert && now - cert > 10) push('alerte', `Certificat de localisation de ${cert} (plus de 10 ans) : vérifier s’il faut le renouveler.`);
  if (!cert) push('info', 'Année du certificat de localisation à confirmer.');
  const sc = amount(f.superficie_terrain), cc = amount(f.superficie_terrain_certificat);
  if (sc && cc && Math.abs(sc - cc) / Math.max(sc, cc) > 0.01) push('alerte', `Superficie du terrain : contrat ${f.superficie_terrain} ≠ certificat ${f.superficie_terrain_certificat}.`);
  const et = amount(f.evaluation_terrain), eb = amount(f.evaluation_batiment), tot = amount(f.evaluation_municipale);
  if (et && eb && tot && Math.abs(et + eb - tot) > 2) push('alerte', `Évaluation : terrain + bâtiment (${(et + eb).toLocaleString('fr-CA')} $) ≠ total (${f.evaluation_municipale}).`);
  for (const [k, y] of [['taxes_municipales', 'annee_taxes_municipales'], ['taxes_scolaires', 'annee_taxes_scolaires']]) {
    if (f[k] && !f[y]) push('info', `${state.fields[k]} : préciser l’année et confirmer qu’il s’agit du total annuel, pas du solde à payer.`);
    else if (year(f[y]) && now - year(f[y]) > 1) push('alerte', `${state.fields[k]} de ${year(f[y])} : retrouver le compte le plus récent.`);
  }
  if (f.hydro_cout_annuel) push('info', 'Électricité : estimation annuelle d’Hydro-Québec, pas des factures réelles.');
  const sign = f.date_signature_contrat, exp = f.date_expiration_contrat;
  if (sign && exp && exp < sign) push('alerte', 'Contrat : la date d’expiration précède la date de signature.');
  if (exp && /^\d{4}-\d{2}-\d{2}$/.test(exp) && exp < new Date().toISOString().slice(0, 10)) push('alerte', 'Contrat de courtage expiré : vérifier les modifications.');
  for (const key of ['contrat', 'declaration']) if (d.docs?.[key]?.status === 'reçu' && !d.docs[key].signe) push('alerte', `${DOCS.find((x) => x.key === key).title} : version signée non confirmée.`);
  if (/sans garantie|limit/i.test(f.garantie_legale || '') && !(f.clause_garantie_fr && f.clause_garantie_en)) push('alerte', 'Garantie légale exclue ou limitée : clause FR et EN requises.');
  if (!(d.proprietaires || []).length) push('info', 'Aucun propriétaire saisi (page 3) : les reprendre de l’acte de vente.');
  const rooms = d.pieces || [];
  const bedrooms = rooms.filter((r) => /chambre|bedroom/i.test(r.nom)).length;
  if (rooms.length && amount(f.nb_chambres) && bedrooms !== amount(f.nb_chambres)) push('alerte', `Pièces : ${bedrooms} chambre(s) dans la liste, ${f.nb_chambres} dans la fiche.`);
  if (rooms.some((r) => /entrée|couloir|corridor|hall/i.test(r.nom))) push('alerte', 'Pièces : retirer l’entrée et les couloirs.');
  if (rooms.some((r) => !r.dimensions)) push('info', 'Pièces : des dimensions manquent.');
  for (const [key, max] of Object.entries(state.limits || {})) {
    const n = (d.textes?.[key] || '').length;
    if (n > max) push('alerte', `${key.replace('_', ' ')} : ${n} caractères pour ${max} permis, le texte sera tronqué.`);
  }
  if (d.textes && !d.textes.info_collaborateur) push('info', 'Info courtier collaborateur : vous demander quoi écrire.');
  return out;
}
function renderChecks() {
  const box = $('#checks'); if (!box) return;
  const list = checks(); box.innerHTML = '';
  box.hidden = !list.length;
  if (!list.length) return;
  box.append(el('strong', { textContent: `Contrôles (${list.filter((c) => c.niveau === 'alerte').length} alerte(s))` }),
    el('ul', {}, ...list.map((c) => el('li', { className: c.niveau, textContent: c.texte }))));
}

// ---------- Relecture d'une page après sauvegarde ----------
async function verifyPage(page = '') {
  const { fields } = await pageFields();
  const r = await api('verifier', { fields, fiche: dossier().fiche, dossier: dossierPayload(), page });
  const box = $('#verify-report'); box.innerHTML = ''; box.hidden = false;
  box.append(el('strong', { textContent: r.ecarts.length ? `${r.ecarts.length} écart(s) à regarder` : `Page conforme (${r.conformes} champ(s))` }), el('p', { className: 'small', textContent: r.resume }));
  if (r.ecarts.length) box.append(el('ul', {}, ...r.ecarts.map((e) => el('li', { className: e.gravite === 'à corriger' ? 'alerte' : 'info', textContent: `${e.champ} : attendu « ${e.attendu} », trouvé « ${e.trouve || 'vide'} »` }))));
  return r;
}

// ---------- Parcours de saisie à la source (17 étapes) ----------
const maps = (f) => 'https://www.google.com/maps/search/' + encodeURIComponent([f.adresse, f.ville].filter(Boolean).join(', '));
const PARCOURS = [
  { key: 'ouvrir', titre: '1. Ouvrir le dossier', items: ['Adresse complète, catégorie et type de mandat confirmés', 'Adresse vérifiée sur Google Maps', 'Lot vérifié (JLR ou Registre foncier)', 'Aucun doublon : Drive, Instanet et saisie existante vérifiés', 'Nouvelle inscription bien distinguée d’un ancien dossier d’achat'],
    actions: [['Google Maps', () => chrome.tabs.create({ url: maps(dossier().fiche) })], ['JLR', () => chrome.tabs.create({ url: 'https://www.jlr.ca' })], ['Registre foncier', () => chrome.tabs.create({ url: 'https://www.registrefoncier.gouv.qc.ca' })], ['Chercher dans Drive', () => chrome.tabs.create({ url: 'https://drive.google.com/drive/search?q=' + encodeURIComponent(civic(dossier().fiche)) })]] },
  { key: 'documents', titre: '2. Réunir les documents', items: ['Contrat de courtage et modifications', 'Déclaration du vendeur et modifications', 'Anciennes fiches Matrix', 'Taxes municipale et scolaire, rôle d’évaluation, Hydro', 'Certificat (rapport et plan), index, acte de vente, acte hypothécaire, plan cadastral', 'Inspection, photos, plans cotés', 'Adresse, dates et versions de chaque pièce vérifiées'],
    actions: [['Onglet Documents', () => tab('documents')]] },
  { key: 'verifier', titre: '3. Vérifier les renseignements de base', items: ['Taxes : année confirmée, total annuel (pas le solde), terrain et bâtiment séparés', 'Certificat : année, lot, dimensions, superficie; renouvellement si plus de 10 ans', 'Écarts avec le contrat signalés', 'Hydro conservé comme estimation', 'Pièces classées sous la bonne adresse, documents manquants notés'],
    actions: [['Voir les contrôles', () => tab('fiche')]] },
  { key: 'formulaires', titre: '4. Préparer les formulaires', items: ['Bonne transaction Instanet créée, contrat adapté au mandat', 'Propriétaires identifiés à partir de l’acte', 'Contrat préparé (éléments manquants demandés au courtier)', 'Déclaration du vendeur préparée, contradictions signalées', 'Versions signées et modifications retrouvées'],
    actions: [['Instanet', () => chrome.tabs.create({ url: 'https://pr.transactiondesk.com/' })], ['Nommer avec l’adresse', () => $('#name-instanet').click()], ['Ébauche du contrat', () => { tab('contrats'); $('#contract-type').value = 'courtage-vente'; }]] },
  { key: 'creer', titre: '5. Créer la saisie', items: ['Fiche existante reprise, ou « Ajouter une inscription »', 'Catégorie choisie, consentements vérifiés', 'Adresse entrée et brouillon enregistré', 'Adresse et numéro de fiche vérifiés'],
    actions: [['Ouvrir la saisie', () => chrome.tabs.create({ url: 'https://zone.centris.ca/Dashboard?ml-page=1&ml-status=Incomplete&ml-showAllListings=false&tab=list' })]] },
  ...[
    ['p1', '6. Page 1 · Renseignements préliminaires', ['Courtiers inscripteurs et agence selon le contrat', 'N° de contrat, genre de propriété, type de bâtiment', 'Prix, dates de signature et d’expiration, partage de rétribution', 'Déclaration du courtier et « À vendre par le propriétaire »', 'Sauvegardé et relu']],
    ['p2', '7. Page 2 · Localisation et visites', ['Secteur, quartier, code postal, rue d’intersection, cadastre', 'Certificat de localisation et son année', 'Délais d’acte et d’occupation avec leur point de départ', 'Rendez-vous, préavis, boîte à clés selon vos instructions', 'Inscription placée sur la carte, sauvegardée et relue']],
    ['p3', '8. Page 3 · Propriétaires et hypothèque', ['Une fiche par propriétaire, noms exacts', 'Personne physique, compagnie ou succession; adresse, courriel, langue', 'Simple avis; hypothèque et créancier', 'Sauvegardé et relu']],
    ['p4', '9. Page 4 · Terrain, bâtiment et garantie', ['Année de construction (déclaration du vendeur, recoupée)', 'Dimensions et superficie du terrain comparées au certificat', 'Dimensions du bâtiment (certificat)', 'Zonage, reprise ou contrôle de justice', 'Garantie et clause FR/EN sans en changer la portée', 'Déclaration du vendeur et son numéro; sauvegardé et relu']],
    ['p5', '10. Page 5 · Pièces et dimensions', ['Plan coté consulté; pièces, chambres hors-sol et au sous-sol, salles de bain et d’eau comptées', 'Chaque pièce avec niveau et dimensions (pieds et pouces si le plan les donne)', 'Sans l’entrée ni les couloirs; RDC, étage, puis sous-sol', 'Revêtements établis; éléments ambigus confirmés', 'Sauvegardé et relu']],
    ['p6', '11. Page 6 · Évaluation, taxes et dépenses', ['Année d’évaluation, terrain, bâtiment, total', 'Comptes municipaux et scolaires avec leurs années', 'Coût annuel d’électricité', 'Montants et format vérifiés; sauvegardé']],
    ['p7', '12. Page 7 · Inclusions, exclusions et textes', ['Inclusions et exclusions FR/EN reprises du contrat', 'Info courtier collaborateur demandée au courtier', 'Description FR/EN (650 car. max) et addenda FR/EN (3 000 car. max)', 'Lieux de proximité vérifiés, rien d’inventé', 'Textes entrés, sauvegardés, non tronqués']],
    ['p8', '13. Page 8 · Caractéristiques', ['Ancienne fiche Matrix comme point de départ', 'Recoupé avec la déclaration, les documents actuels et les photos', 'Chauffage, équipements, stationnement, sous-sol, services', 'Divergences signalées, le reste laissé à confirmer; sauvegardé']],
    ['p9', '14. Page 9 · Photos et plans', ['Lien du photographe et plans de la bonne propriété vérifiés', 'Médias importés et comptés après sauvegarde, catégorie choisie pour chaque photo', 'Photo 1 : la plus belle façade; photos 2 et 3 : les deux plus belles autres', 'Photos aménagées par IA juste avant l’originale, avec mention FR/EN', 'Plans à la fin, classés « Plan (croquis) »; vidéos ajoutées; ordre revérifié']],
  ].map(([key, titre, items], i) => ({ key, titre, items, page: `Page ${i + 1}`, fill: true })),
  { key: 'joindre', titre: '15. Joindre les documents', items: ['Contrat de courtage à l’emplacement prévu', 'Déclaration du vendeur et certificat (rapport et plan) en documents additionnels', 'Taxes, inspection, Hydro, plan cadastral, etc.', 'Versions, catégories, doublons, visibilité et pièces jointes vérifiés'] },
  { key: 'controle', titre: '16. Contrôle final et publication', items: ['Pages 1 à 9 relues', 'Terminé / manquant / à valider présenté au courtier', 'Corrections appliquées', 'Vérification finale et lancement faits par le courtier (une page sauvegardée n’est pas publiée)'],
    actions: [['Lancer le contrôle final', () => busy('Contrôle final du dossier…', finalControl)]] },
  { key: 'apres', titre: '17. Après la saisie', items: ['Demande marketing préparée', 'Classement GED dans NexOne fait (distinct du rangement Drive)'],
    actions: [['Rédiger la demande marketing', () => { tab('redaction'); $('#writing-type').value = 'demande-marketing'; }]] },
];
const stepDone = (p) => !!dossier().parcours?.[p.key];
function currentStep() { return PARCOURS.find((p) => !stepDone(p)); }
function renderParcours() {
  const d = dossier(); d.parcours = d.parcours || {}; d.parcoursItems = d.parcoursItems || {};
  const box = $('#parcours'); box.innerHTML = '';
  const done = PARCOURS.filter(stepDone).length, current = currentStep();
  $('#parcours-progress').textContent = current ? `${done}/${PARCOURS.length} étapes · en cours : ${current.titre}` : `Parcours terminé (${done}/${PARCOURS.length}).`;
  for (const p of PARCOURS) {
    const checked = d.parcoursItems[p.key] || [];
    const item = el('details', { className: 'step' + (stepDone(p) ? ' done' : '') + (p === current ? ' current' : ''), open: p === current });
    const toggle = el('input', { type: 'checkbox', checked: stepDone(p), title: 'Étape terminée', onclick: (e) => e.stopPropagation(), onchange: (e) => { d.parcours[p.key] = e.target.checked; touch(); renderParcours(); renderStatus?.(); } });
    item.append(el('summary', {}, toggle, el('span', { textContent: p.titre }), el('small', { textContent: `${checked.filter(Boolean).length}/${p.items.length}` })));
    p.items.forEach((text, i) => item.append(el('label', { className: 'check-line step-item' }, el('input', { type: 'checkbox', checked: !!checked[i], onchange: (e) => {
      const list = d.parcoursItems[p.key] = d.parcoursItems[p.key] || []; list[i] = e.target.checked;
      if (p.items.every((_, j) => list[j])) d.parcours[p.key] = true;
      touch(); renderParcours();
    } }), text)));
    const actions = [...(p.actions || [])];
    if (p.fill) actions.push([`Remplir ${p.page}`, () => busy(`Remplissage : ${p.page}…`, () => fill(p.page))], ['Relire la page', () => busy('Relecture de la page…', () => verifyPage(p.page).then(() => tab('fiche')))]);
    if (actions.length) item.append(el('div', { className: 'step-actions' }, ...actions.map(([label, fn]) => el('button', { className: 'chip', textContent: label, onclick: fn }))));
    box.append(item);
  }
  renderControl();
}

// ---------- Contrôle final ----------
async function finalControl() {
  const d = dossier();
  d.controle = { ...(await api('controle', { fiche: d.fiche, dossier: dossierPayload() })), at: Date.now() };
  touch(); renderControl();
}
function renderControl() {
  const box = $('#controle-out'); if (!box) return; box.innerHTML = '';
  const c = dossier().controle; if (!c) return;
  const list = (title, items, cls) => items.length && el('div', { className: 'ctrl ' + cls }, el('strong', { textContent: `${title} (${items.length})` }), el('ul', {}, ...items.map((x) => el('li', { textContent: x }))));
  box.append(el('div', { className: 'card' },
    el('h3', { textContent: c.pret_a_publier ? '✓ Prêt pour votre vérification finale' : 'Pas encore prêt à publier' }),
    el('p', { className: 'small', textContent: c.resume }),
    list('Manquant', c.manquant, 'manquant'), list('À valider', c.a_valider, 'valider'), list('Terminé', c.termine, 'termine'),
    el('p', { className: 'small muted', textContent: `Contrôle du ${new Date(c.at).toLocaleString('fr-CA')}. C’est vous qui lancez l’inscription.` })));
}

$('#verify-page').onclick = () => busy('Relecture de la page…', () => verifyPage($('#fill-page').value));
$('#final-control').onclick = () => busy('Contrôle final du dossier…', finalControl);
