'use client';
import { useState } from 'react';
import { api } from './learning';
const offers: Record<string, { name: string; price: string; detail: string }> =
  {
    signature: {
      name: 'Structurer et automatiser · Accompagné',
      price: '1 200 CAD + taxes',
      detail:
        'Paiement unique, accès illimité et une heure privée incluse au total.',
    },
    autonomous: {
      name: 'Claude + ChatGPT · 100 % autonome',
      price: '499 CAD + taxes',
      detail:
        'Paiement unique. 28 ateliers pour comparer, choisir et combiner les deux assistants.',
    },
    'immo-pro': {
      name: 'i-Courtier · Extension pour courtiers',
      price: '250 CAD / mois + taxes',
      detail:
        'Aucuns frais fixes, résiliable à tout moment. Accès à l’extension i-Courtier (outil uniquement, sans formation).',
    },
  };
const legacy: Record<string, string> = { monthly: 'signature', 'immo-signature': 'immo-pro', 'immo-monthly': 'immo-pro' };
export function EnrollmentForm(props: any) {
  const id = legacy[props.id] || props.id;
  const key = offers[id] ? id : 'signature';
  const offer = offers[key];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [authenticated, setAuthenticated] = useState(false);
  async function pay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      if (!props.user && !authenticated) {
        await api('auth/' + mode, { name: form.get('name'), email: form.get('email'), password: form.get('password'), accept: form.get('accept') === 'on' });
        setAuthenticated(true);
      }
      const result = await api('billing/checkout', { offer: key });
      window.location.assign(result.url);
    } catch (reason: any) {
      setError(reason.message);
      setBusy(false);
    }
  }
  return <>
      <div className="purchase-summary">
        <span className="badge">1. Vos coordonnées · 2. Paiement sécurisé</span>
        <h2>{offer.name}</h2>
        <div className="price">{offer.price}</div>
        <p>{offer.detail}</p>
      </div>
      <form className="express-enrollment" onSubmit={pay}>
        <h2>{props.user || authenticated ? 'Votre profil est prêt' : mode === 'register' ? 'Vos informations' : 'Retrouver mon compte'}</h2>
        {!props.user && !authenticated ? <>
          <p>Votre profil et votre commande se préparent au même endroit.</p>
          {mode === 'register' && <label>Nom complet<input name="name" autoComplete="name" required maxLength={100}/></label>}
          <label>Adresse courriel<input name="email" type="email" autoComplete="email" required/></label>
          <label>Mot de passe<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 12 : undefined} required/></label>
          {mode === 'register' && <><small>Au moins 12 caractères.</small><label className="enrollment-consent"><input name="accept" type="checkbox" required/><span>J’accepte les <a href="/?view=privacy" target="_blank" rel="noreferrer">conditions de vente</a> et la <a href="/?view=privacy" target="_blank" rel="noreferrer">politique de confidentialité</a>.</span></label></>}
          <button type="button" className="text-button" disabled={busy} onClick={()=>setMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Déjà un compte ? Se connecter' : 'Créer un nouveau compte'}</button>
        </> : <p>{props.user?.email || 'Votre compte est enregistré. Vous pouvez poursuivre le paiement.'}</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button" disabled={busy} type="submit">{busy ? 'Préparation du paiement…' : 'Continuer vers le paiement sécurisé →'}</button>
        <small>Paiement sécurisé par carte. Votre accès est activé dès la confirmation du paiement.</small>
      </form>
  </>;
}

export default function Checkout(props: any) {
  const id = legacy[props.id] || props.id;
  const key = offers[id] ? id : 'signature';
  return <section className="sales-section checkout-page">
    <span className="eyebrow">VOTRE INSCRIPTION</span>
    <h1>{props.user ? 'Votre commande' : 'Votre formation, votre inscription, votre paiement.'}</h1>
    <div className="panel checkout-complete"><EnrollmentForm {...props} id={key}/></div>
  </section>;
}
