'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Download, FileText, FlaskConical, LogIn, RotateCcw, Save } from 'lucide-react';
import { PublicShell } from '../../landing';

// Banc d'essai réservé aux testeurs : installer la version d'essai, un dossier fictif, un formulaire de saisie en 9 pages et les scénarios de test.

type Access = { user: boolean; access: boolean; tester?: boolean } | null;
type Field = { id: string; label: string; type?: 'select' | 'textarea' | 'checkbox' | 'date'; options?: string[]; max?: number };

const yesNo = ['', 'Oui', 'Non'];
const levels = ['', 'Rez-de-chaussée', 'Étage', 'Sous-sol'];
const owner = (n: number): Field[] => [
  { id: `p3_prop${n}_nom`, label: `Propriétaire ${n} · Nom` },
  { id: `p3_prop${n}_type`, label: `Propriétaire ${n} · Type`, type: 'select', options: ['', 'Personne physique', 'Compagnie', 'Succession'] },
  { id: `p3_prop${n}_adresse`, label: `Propriétaire ${n} · Adresse` },
  { id: `p3_prop${n}_courriel`, label: `Propriétaire ${n} · Courriel` },
  { id: `p3_prop${n}_langue`, label: `Propriétaire ${n} · Langue`, type: 'select', options: ['', 'Français', 'Anglais'] },
];
const room = (n: number): Field[] => [
  { id: `p5_piece${n}_nom`, label: `Pièce ${n} · Nom` },
  { id: `p5_piece${n}_niveau`, label: `Pièce ${n} · Niveau`, type: 'select', options: levels },
  { id: `p5_piece${n}_dim`, label: `Pièce ${n} · Dimensions` },
  { id: `p5_piece${n}_rev`, label: `Pièce ${n} · Revêtement` },
];

const PAGES: { titre: string; fields: Field[] }[] = [
  { titre: 'Renseignements préliminaires', fields: [
    { id: 'p1_courtier', label: 'Courtier inscripteur' }, { id: 'p1_agence', label: 'Agence' }, { id: 'p1_contrat', label: 'Numéro du contrat de courtage' },
    { id: 'p1_genre', label: 'Genre de propriété', type: 'select', options: ['', 'Maison unifamiliale', 'Copropriété', 'Plex', 'Terrain'] },
    { id: 'p1_type', label: 'Type de bâtiment', type: 'select', options: ['', 'Isolé', 'Jumelé', 'En rangée'] },
    { id: 'p1_prix', label: 'Prix demandé' }, { id: 'p1_signature', label: 'Date de signature du contrat', type: 'date' }, { id: 'p1_expiration', label: "Date d'expiration du contrat", type: 'date' },
    { id: 'p1_partage', label: 'Partage de la rétribution' }, { id: 'p1_declaration', label: 'Déclaration du courtier', type: 'select', options: yesNo },
    { id: 'p1_proprio', label: 'À vendre par le propriétaire', type: 'checkbox' },
  ] },
  { titre: 'Localisation et visites', fields: [
    { id: 'p2_secteur', label: 'Secteur' }, { id: 'p2_quartier', label: 'Quartier' }, { id: 'p2_cp', label: 'Code postal' }, { id: 'p2_intersection', label: "Rue d'intersection" },
    { id: 'p2_cadastre', label: 'Numéro de cadastre' }, { id: 'p2_certificat', label: 'Certificat de localisation', type: 'select', options: yesNo }, { id: 'p2_certificat_annee', label: 'Année du certificat' },
    { id: 'p2_acte', label: "Délai pour l'acte de vente" }, { id: 'p2_occupation', label: "Délai d'occupation" }, { id: 'p2_rdv', label: 'Prise de rendez-vous' },
    { id: 'p2_preavis', label: 'Préavis de visite' }, { id: 'p2_boite', label: 'Boîte à clés', type: 'select', options: yesNo },
  ] },
  { titre: 'Propriétaires et hypothèque', fields: [
    { id: 'p3_nb', label: 'Nombre de propriétaires' }, ...owner(1), ...owner(2),
    { id: 'p3_avis', label: 'Simple avis', type: 'select', options: yesNo }, { id: 'p3_hypotheque', label: 'Hypothèque mentionnée', type: 'select', options: yesNo }, { id: 'p3_creancier', label: 'Créancier hypothécaire' },
  ] },
  { titre: 'Terrain, bâtiment et garantie', fields: [
    { id: 'p4_annee', label: 'Année de construction' }, { id: 'p4_dim_terrain', label: 'Dimensions du terrain' }, { id: 'p4_sup_terrain', label: 'Superficie du terrain' },
    { id: 'p4_dim_batiment', label: 'Dimensions du bâtiment' }, { id: 'p4_zonage', label: 'Zonage' }, { id: 'p4_reprise', label: 'Reprise de finance ou contrôle de justice', type: 'select', options: yesNo },
    { id: 'p4_garantie', label: 'Garantie légale', type: 'select', options: ['', 'Avec garantie légale', 'Sans garantie légale', 'Garantie limitée'] },
    { id: 'p4_clause_fr', label: 'Clause de garantie (FR)', type: 'textarea' }, { id: 'p4_clause_en', label: 'Clause de garantie (EN)', type: 'textarea' },
    { id: 'p4_dv', label: 'Déclaration du vendeur', type: 'select', options: yesNo }, { id: 'p4_dv_no', label: 'Numéro de la déclaration du vendeur' },
  ] },
  { titre: 'Pièces et dimensions', fields: [
    { id: 'p5_pieces', label: 'Nombre de pièces' }, { id: 'p5_ch_hs', label: 'Chambres hors-sol' }, { id: 'p5_ch_ss', label: 'Chambres au sous-sol' },
    { id: 'p5_sdb', label: 'Salles de bain' }, { id: 'p5_sde', label: "Salles d'eau" }, ...Array.from({ length: 10 }, (_, i) => room(i + 1)).flat(),
  ] },
  { titre: 'Évaluation, taxes et dépenses', fields: [
    { id: 'p6_annee_eval', label: "Année de l'évaluation" }, { id: 'p6_eval_terrain', label: 'Évaluation du terrain' }, { id: 'p6_eval_batiment', label: 'Évaluation du bâtiment' },
    { id: 'p6_eval_total', label: 'Évaluation totale' }, { id: 'p6_taxe_mun', label: 'Taxes municipales' }, { id: 'p6_taxe_mun_annee', label: 'Année des taxes municipales' },
    { id: 'p6_taxe_sco', label: 'Taxes scolaires' }, { id: 'p6_taxe_sco_annee', label: 'Année des taxes scolaires' }, { id: 'p6_elec', label: 'Électricité (coût annuel)' },
  ] },
  { titre: 'Inclusions, exclusions et textes', fields: [
    { id: 'p7_incl_fr', label: 'Inclusions (FR)', type: 'textarea' }, { id: 'p7_incl_en', label: 'Inclusions (EN)', type: 'textarea' },
    { id: 'p7_excl_fr', label: 'Exclusions (FR)', type: 'textarea' }, { id: 'p7_excl_en', label: 'Exclusions (EN)', type: 'textarea' },
    { id: 'p7_collab', label: 'Info courtier collaborateur', type: 'textarea' },
    { id: 'p7_desc_fr', label: 'Description (FR)', type: 'textarea', max: 650 }, { id: 'p7_desc_en', label: 'Description (EN)', type: 'textarea', max: 650 },
    { id: 'p7_add_fr', label: 'Addenda (FR)', type: 'textarea', max: 3000 }, { id: 'p7_add_en', label: 'Addenda (EN)', type: 'textarea', max: 3000 },
  ] },
  { titre: 'Caractéristiques', fields: [
    { id: 'p8_chauffage', label: 'Mode de chauffage' }, { id: 'p8_energie', label: 'Énergie pour le chauffage' }, { id: 'p8_fondation', label: 'Fondation' },
    { id: 'p8_toiture', label: 'Revêtement de la toiture' }, { id: 'p8_revetement', label: 'Revêtement extérieur' }, { id: 'p8_fenestration', label: 'Fenestration' },
    { id: 'p8_sous_sol', label: 'Sous-sol' }, { id: 'p8_stationnement', label: 'Stationnement' }, { id: 'p8_garage', label: 'Garage' },
    { id: 'p8_eau', label: 'Approvisionnement en eau' }, { id: 'p8_egouts', label: 'Système d’égouts' }, { id: 'p8_equipements', label: 'Équipements et services' },
  ] },
  { titre: 'Photos et plans', fields: [
    { id: 'p9_lien', label: 'Lien du photographe' }, { id: 'p9_nb', label: 'Nombre de photos importées' }, { id: 'p9_photo1', label: 'Photo 1 · Catégorie (façade)' },
    { id: 'p9_mention_fr', label: 'Mention photo aménagée par IA (FR)' }, { id: 'p9_mention_en', label: 'Mention photo aménagée par IA (EN)' }, { id: 'p9_video', label: 'Lien vidéo' },
  ] },
];

const EMAIL = `Bonjour Émilie,
Comme convenu, voici les informations pour notre maison au 1234, rue des Essais à Lévis (G6V 0Z9). C'est une maison à étages isolée construite en 1994, avec 4 chambres (3 à l'étage, 1 au sous-sol), une salle de bain et une salle d'eau. Garage détaché construit en 2015. On aimerait l'afficher à 489 000 $. Pour les visites, appelez-nous la veille (préavis de 24 h); on préfère sans boîte à clés.
Le quartier est tout près du parc des Écoliers et de l'école primaire.
Julie Tremblay et Marc Gagnon`;

const DOCUMENTS = [
  ['01-contrat-de-courtage.pdf', 'Contrat de courtage (signé)', 'Contrat de courtage et modifications'],
  ['02-declaration-du-vendeur.pdf', 'Déclaration du vendeur', 'Déclaration du vendeur et modifications'],
  ['03-certificat-de-localisation.pdf', 'Certificat de localisation de 2011', 'Certificat de localisation'],
  ['04-compte-de-taxes-municipales.pdf', 'Compte de taxes municipales 2026', 'Rôle d’évaluation et rôle de taxation'],
  ['05-compte-de-taxes-scolaires.pdf', 'Compte de taxe scolaire', 'Compte de taxes scolaires'],
  ['06-acte-de-vente.pdf', 'Acte de vente', 'Acte de vente'],
  ['07-plan-cote.pdf', 'Plan coté', 'Plans cotés'],
];

const SCENARIOS: [string, string][] = [
  ['Installer la version d’essai et se connecter', 'Le panneau s’ouvre sur l’onglet Agent avec vos dossiers.'],
  ['Saisie : coller le courriel du vendeur fictif, puis « Extraire la fiche »', 'Adresse, prix, année 1994, 4 chambres, préavis 24 h remplis; un dossier « 1234, rue des Essais » est créé.'],
  ['Documents : importer chaque PDF dans sa carte', 'Chaque carte passe à « reçu »; la fiche se complète.'],
  ['Fiche : lire les contrôles', 'Alertes attendues : certificat de 2011 (plus de 10 ans) et superficie 464,5 m² au contrat contre 452,1 m² au certificat.'],
  ['Fiche, page 6 : taxes municipales', '3 482,17 $ (total annuel 2026), pas le solde de 2 321,45 $; terrain 98 500 $ et bâtiment 301 200 $ séparés.'],
  ['Fiche, page 3 : propriétaires', 'Julie Tremblay et Marc Gagnon; hypothèque en faveur de la Banque Exemple du Canada.'],
  ['Documents : plan coté', '10 pièces au maximum, sans « Entrée » ni « Couloir », classées rez-de-chaussée, étage, sous-sol, dimensions en pieds-pouces.'],
  ['Déclaration du vendeur : pyrite', '« Ne sais pas » reste « ne sais pas » (pas « non »); servitudes laissées vides signalées à vérifier.'],
  ['Inscription : préparer les textes', 'Descriptions FR/EN ≤ 650 caractères, addenda ≤ 3 000, compteurs visibles; question « Info courtier collaborateur » posée.'],
  ['Parcours : pour chaque page 1 à 9 du formulaire d’essai, « Remplir », Sauvegarder, puis « Relire la page »', 'Les champs se remplissent et sont surlignés; la relecture indique « Page conforme » ou les écarts.'],
  ['Formulaire d’essai, page 7 : textes', 'Aucun texte tronqué (le formulaire limite à 650 et 3 000 caractères).'],
  ['Agent : « Où en est la saisie de ce dossier et quelle est la prochaine étape ? »', 'Il nomme l’étape en cours et ce qui bloque, et coche ce qui est fait si vous le lui demandez.'],
  ['Parcours, étape 16 : « Lancer le contrôle final »', 'Terminé, Manquant (photos, info collaborateur…) et À valider s’affichent; « pas encore prêt » tant que des éléments manquent.'],
  ['Rédaction : « Demande marketing après l’inscription »', 'Un texte prêt à envoyer, signé à votre nom.'],
];

const read = (key: string) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

function TestForm() {
  const [page, setPage] = useState(0);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [saved, setSaved] = useState<Record<number, string>>({});
  useEffect(() => { setValues(read('essai-formulaire') || {}); setSaved(read('essai-sauvegardes') || {}); }, []);
  const set = (id: string, v: string | boolean) => setValues((s) => ({ ...s, [id]: v }));
  function save() {
    // Relit les valeurs dans la page : l'extension les modifie directement dans les champs.
    const next = { ...values };
    for (const f of PAGES[page].fields) {
      const n = document.getElementById(f.id) as HTMLInputElement | null;
      if (n) next[f.id] = f.type === 'checkbox' ? n.checked : n.value;
    }
    setValues(next); write('essai-formulaire', next);
    const s = { ...saved, [page]: new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) };
    setSaved(s); write('essai-sauvegardes', s);
  }
  function reset() { setValues({}); setSaved({}); write('essai-formulaire', {}); write('essai-sauvegardes', {}); }
  const p = PAGES[page];
  return (
    <div className="essai-form">
      <nav className="essai-pages" aria-label="Pages du formulaire d’essai">
        {PAGES.map((x, i) => <button key={x.titre} className={i === page ? 'on' : ''} onClick={() => setPage(i)}>{i + 1}{saved[i] ? ' ✓' : ''}</button>)}
      </nav>
      <h3>Page {page + 1} · {p.titre}</h3>
      <form key={page} className="essai-fields" onSubmit={(e) => { e.preventDefault(); save(); }}>
        {p.fields.map((f) => (
          <div key={f.id} className={'essai-field' + (f.type === 'textarea' ? ' wide' : '')}>
            <label htmlFor={f.id}>{f.label}{f.max ? ` (${f.max} caractères max.)` : ''}</label>
            {f.type === 'select' ? <select id={f.id} value={String(values[f.id] || '')} onChange={(e) => set(f.id, e.target.value)}>{f.options!.map((o) => <option key={o} value={o}>{o}</option>)}</select>
              : f.type === 'textarea' ? <textarea id={f.id} maxLength={f.max} rows={f.max === 3000 ? 6 : 3} value={String(values[f.id] || '')} onChange={(e) => set(f.id, e.target.value)} />
              : f.type === 'checkbox' ? <input id={f.id} type="checkbox" checked={!!values[f.id]} onChange={(e) => set(f.id, e.target.checked)} />
              : <input id={f.id} type={f.type === 'date' ? 'date' : 'text'} value={String(values[f.id] || '')} onChange={(e) => set(f.id, e.target.value)} />}
            {f.max && <small>{String(values[f.id] || '').length} / {f.max}</small>}
          </div>
        ))}
        <div className="essai-actions">
          <button className="button" type="submit"><Save size={16} /> Sauvegarder la page {page + 1}</button>
          {saved[page] && <span className="essai-saved"><Check size={15} /> Sauvegardée à {saved[page]}</span>}
          <button className="text-button" type="button" onClick={reset}><RotateCcw size={14} /> Tout effacer</button>
        </div>
      </form>
    </div>
  );
}

function Scenarios() {
  const [results, setResults] = useState<Record<number, { etat: string; note: string }>>({});
  const [copied, setCopied] = useState(false);
  useEffect(() => setResults(read('essai-resultats') || {}), []);
  const update = (i: number, patch: Partial<{ etat: string; note: string }>) => {
    const next = { ...results, [i]: { ...{ etat: '', note: '' }, ...results[i], ...patch } }; setResults(next); write('essai-resultats', next);
  };
  async function copyReport() {
    const text = 'RAPPORT DE TEST i-COURTIER — ' + new Date().toLocaleDateString('fr-CA') + '\n\n' + SCENARIOS.map(([t], i) => `${i + 1}. ${t}\n   Résultat : ${results[i]?.etat || 'non testé'}${results[i]?.note ? '\n   Note : ' + results[i].note : ''}`).join('\n');
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
  }
  const done = SCENARIOS.filter((_, i) => results[i]?.etat).length;
  return (
    <>
      <ol className="essai-scenarios">
        {SCENARIOS.map(([t, attendu], i) => (
          <li key={t} className={results[i]?.etat === 'OK' ? 'ok' : results[i]?.etat === 'Problème' ? 'ko' : ''}>
            <div><strong>{t}</strong><p>Attendu : {attendu}</p></div>
            <div className="essai-result">
              <button className={results[i]?.etat === 'OK' ? 'on' : ''} onClick={() => update(i, { etat: 'OK' })}>OK</button>
              <button className={results[i]?.etat === 'Problème' ? 'on ko' : ''} onClick={() => update(i, { etat: 'Problème' })}>Problème</button>
              {results[i]?.etat === 'Problème' && <input placeholder="Ce qui s’est passé" value={results[i]?.note || ''} onChange={(e) => update(i, { note: e.target.value })} />}
            </div>
          </li>
        ))}
      </ol>
      <div className="essai-actions">
        <span>{done}/{SCENARIOS.length} tests faits</span>
        <button className="button" onClick={copyReport}>{copied ? <><Check size={16} /> Rapport copié</> : <><Copy size={16} /> Copier le rapport de test</>}</button>
      </div>
    </>
  );
}

export default function EssaiPage() {
  const [access, setAccess] = useState<Access>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    fetch('/api/icourtier/download?check=1', { cache: 'no-store' }).then((r) => r.json()).then(setAccess).catch(() => setAccess({ user: false, access: false }));
  }, []);
  const go = (view: string) => window.location.assign('/?view=' + view);
  async function copyEmail() { try { await navigator.clipboard.writeText(EMAIL); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {} }

  return (
    <PublicShell go={go} user={null}>
      <div className="essai">
        <section className="sales-section">
          <span className="eyebrow"><FlaskConical size={13} /> BANC D’ESSAI · RÉSERVÉ AUX TESTEURS</span>
          <h1>Tester i-Courtier avant le lancement.</h1>
          <p>Un dossier fictif, ses documents, un formulaire de saisie en 9 pages et la liste des tests. Rien de ce qui est fait ici ne touche un vrai dossier.</p>
        </section>

        {access === null ? <p className="muted">Vérification de votre accès…</p> : !access.access ? (
          <section className="sales-section essai-locked">
            <h2>Espace réservé aux testeurs</h2>
            <p>{access.user ? 'Ce compte n’est pas inscrit comme testeur d’i-Courtier. Écrivez à l’équipe i-ateliers pour être ajouté.' : 'Connectez-vous avec votre compte testeur i-ateliers, puis revenez sur cette page.'}</p>
            {!access.user && <button className="button" onClick={() => go('login')}><LogIn size={16} /> Me connecter</button>}
          </section>
        ) : (
          <>
            <section className="sales-section essai-block">
              <h2>1. Installer la version d’essai</h2>
              <ol className="essai-steps">
                <li>Téléchargez i-Courtier, puis ouvrez le fichier téléchargé pour obtenir le dossier « i-courtier ».</li>
                <li>Dans Chrome, ouvrez <code>chrome://extensions</code>, activez le mode développeur, cliquez sur « Charger l’extension non empaquetée » et choisissez le dossier.</li>
                <li>Si une ancienne version était installée : remplacez le dossier, puis cliquez sur ↻ sur la carte i-Courtier.</li>
                <li>Ouvrez i-Courtier (Alt + Maj + C) et connectez-vous avec votre compte testeur.</li>
              </ol>
              <a className="button" href="/api/icourtier/download"><Download size={16} /> Télécharger la version d’essai</a>
            </section>

            <section className="sales-section essai-block">
              <h2>2. Le dossier fictif</h2>
              <p>1234, rue des Essais, Lévis. Maison à étages de 1994, deux propriétaires. Les documents contiennent volontairement des pièges : certificat ancien, solde de taxes, superficies différentes, entrée et couloir sur le plan.</p>
              <h3>Courriel du vendeur (onglet Saisie)</h3>
              <pre className="essai-email">{EMAIL}</pre>
              <button className="text-button" onClick={copyEmail}>{copied ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier le courriel</>}</button>
              <h3>Documents (onglet Documents)</h3>
              <ul className="essai-docs">
                {DOCUMENTS.map(([file, label, card]) => (
                  <li key={file}><FileText size={18} /><div><a href={`/essai/${file}`} download>{label}</a><small>À importer dans la carte « {card} »</small></div></li>
                ))}
              </ul>
            </section>

            <section className="sales-section essai-block">
              <h2>3. Formulaire de saisie d’essai</h2>
              <p>Il reproduit la structure d’une saisie à la source en 9 pages. Dans i-Courtier, onglet Parcours, utilisez « Remplir Page N », sauvegardez ici, puis « Relire la page ».</p>
              <TestForm />
            </section>

            <section className="sales-section essai-block">
              <h2>4. Scénarios de test</h2>
              <p>Cochez le résultat de chaque test, puis copiez le rapport et envoyez-le à l’équipe.</p>
              <Scenarios />
            </section>
          </>
        )}
      </div>
    </PublicShell>
  );
}
