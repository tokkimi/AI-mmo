'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Download, FolderOpen, Keyboard, LogIn, Pin, ToggleRight } from 'lucide-react';
import { PublicShell } from '../../landing';

type Access = { user: boolean; access: boolean } | null;

const go = (view: string) => window.location.assign('/?view=' + view);

export default function InstallerPage() {
  const [access, setAccess] = useState<Access>(null);
  const [installed, setInstalled] = useState('');
  const [mac, setMac] = useState(false);
  const [edge, setEdge] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMac(/Mac/i.test(navigator.userAgent));
    setEdge(/Edg\//.test(navigator.userAgent));
    fetch('/api/icourtier/download?check=1', { cache: 'no-store' }).then(r => r.json()).then(setAccess).catch(() => setAccess({ user: false, access: false }));
    // L'extension signale sa présence sur i-ateliers.ca (voir extension/site.js).
    const detect = () => setInstalled(document.documentElement.dataset.icourtier || '');
    detect();
    const timer = setInterval(detect, 1500);
    return () => clearInterval(timer);
  }, []);

  const extensionsUrl = edge ? 'edge://extensions' : 'chrome://extensions';
  async function copyUrl() {
    try { await navigator.clipboard.writeText(extensionsUrl); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
  }

  return (
    <PublicShell go={go} user={null}>
      <div className="installer">
        <section className="sales-section installer-hero">
          <span className="eyebrow">INSTALLATION · CHROME ET EDGE</span>
          <h1>Installez i-Courtier.</h1>
          <p>Cinq étapes, environ trois minutes. Gardez cette page ouverte : elle vous confirmera quand l’installation est réussie.</p>
          <div className={'installer-status' + (installed ? ' ok' : '')} role="status">
            {installed
              ? <><Check size={20} /> i-Courtier {installed} est installé. Ouvrez-le avec l’icône « iC » ou le raccourci {mac ? '⌥ Option + ⇧ Maj + C' : 'Alt + Maj + C'}.</>
              : <><span className="installer-dot" /> En attente de l’installation…</>}
          </div>
        </section>

        <ol className="installer-steps">
          <li>
            <div className="installer-num">1</div>
            <div>
              <h2><Download size={20} /> Téléchargez l’extension</h2>
              {access === null ? <p className="muted">Vérification de votre accès…</p>
                : access.access ? <><p>Le fichier <b>i-courtier.zip</b> arrive dans votre dossier Téléchargements.</p><a className="button" href="/api/icourtier/download"><Download size={16} /> Télécharger i-Courtier</a></>
                : access.user ? <><p>Votre compte n’a pas encore d’abonnement i-Courtier actif.</p><a className="button" href="/i-courtier#abonnement">M’abonner — 250 CAD / mois</a></>
                : <><p>Connectez-vous avec le compte associé à votre abonnement, puis revenez sur cette page.</p><button className="button" onClick={() => go('login')}><LogIn size={16} /> Me connecter</button></>}
            </div>
          </li>
          <li>
            <div className="installer-num">2</div>
            <div>
              <h2><FolderOpen size={20} /> Ouvrez le fichier</h2>
              <p>{mac ? 'Double-cliquez sur i-courtier.zip : un dossier « i-courtier » apparaît à côté.' : 'Clic droit sur i-courtier.zip → « Extraire tout » → « Extraire » : un dossier « i-courtier » apparaît.'}</p>
              <p className="installer-tip">Rangez ce dossier dans « Documents » et ne le supprimez pas : {edge ? 'Edge' : 'Chrome'} l’utilise à chaque ouverture.</p>
            </div>
          </li>
          <li>
            <div className="installer-num">3</div>
            <div>
              <h2><Copy size={20} /> Ouvrez la page des extensions</h2>
              <p>Copiez cette adresse, collez-la dans la barre d’adresse de {edge ? 'Edge' : 'Chrome'}, puis appuyez sur Entrée.</p>
              <button className="installer-copy" onClick={copyUrl}><code>{extensionsUrl}</code><span>{copied ? <><Check size={15} /> Copiée</> : <><Copy size={15} /> Copier</>}</span></button>
            </div>
          </li>
          <li>
            <div className="installer-num">4</div>
            <div>
              <h2><ToggleRight size={20} /> Activez le mode développeur et chargez le dossier</h2>
              <p>{edge ? 'Dans le menu de gauche' : 'En haut à droite'}, activez « Mode développeur ». Cliquez ensuite sur « Charger l’extension non empaquetée » et choisissez le dossier i-courtier.</p>
              <div className="installer-mock" aria-hidden="true">
                <div className="installer-mock-bar"><span>Extensions</span><span className="installer-toggle">Mode développeur <i /></span></div>
                <div className="installer-mock-actions"><b>Charger l’extension non empaquetée</b><span>Empaqueter l’extension</span><span>Mettre à jour</span></div>
                <div className="installer-mock-card"><em>iC</em><div><strong>i-Courtier — L’IA pour vos pratiques immo</strong><small>Saisie à la source, ébauches de contrats et administration des inscriptions.</small></div></div>
              </div>
            </div>
          </li>
          <li>
            <div className="installer-num">5</div>
            <div>
              <h2><Pin size={20} /> Épinglez i-Courtier et connectez-vous</h2>
              <p>Cliquez sur la pièce de puzzle en haut à droite, puis sur la punaise à côté d’i-Courtier. Ouvrez-le et connectez-vous avec votre compte i-ateliers.</p>
              <p className="installer-tip"><Keyboard size={15} /> Raccourci : {mac ? '⌥ Option + ⇧ Maj + C' : 'Alt + Maj + C'} ouvre i-Courtier à tout moment.</p>
            </div>
          </li>
        </ol>

        <section className="sales-section installer-help">
          <h2>Besoin d’aide ?</h2>
          <p>« Mode développeur » est l’option standard de {edge ? 'Edge' : 'Chrome'} pour les extensions professionnelles distribuées hors boutique. Si un message le rappelle au démarrage, vous pouvez le fermer. Pour une mise à jour, remplacez le contenu du dossier i-courtier par la nouvelle version, puis cliquez sur ↻ dans la page des extensions : vos dossiers sont conservés.</p>
          <a className="text-button" href="/?view=messages">Écrire à l’équipe i-ateliers →</a>
        </section>
      </div>
    </PublicShell>
  );
}
