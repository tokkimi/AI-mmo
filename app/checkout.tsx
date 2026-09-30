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
    monthly: {
      name: 'Structurer et automatiser · Autonomie',
      price: '100 CAD / mois + taxes',
      detail: 'Résiliable à tout moment. Sans coaching privé inclus.',
    },
    autonomous: {
      name: 'Claude + ChatGPT · 100 % autonome',
      price: '499 CAD + taxes',
      detail:
        'Paiement unique. 28 ateliers pour comparer, choisir et combiner les deux assistants.',
    },
    'immo-signature': {
      name: 'Immobilier Québec · Accès complet',
      price: '1 200 CAD + taxes',
      detail:
        'Paiement unique, accès illimité au programme immobilier, aux exercices, QCM et une heure privée incluse au total.',
    },
    'immo-monthly': {
      name: 'Immobilier Québec · À votre rythme',
      price: '100 CAD / mois + taxes',
      detail:
        'Parcours immobilier complet. Résiliable à tout moment, sans coaching privé inclus.',
    },
  };
export function EnrollmentForm(props: any) {
  const key = offers[props.id] ? props.id : 'signature';
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
        {key !== 'autonomous' && <label>Votre formule<select value={key} disabled={busy} onChange={event=>props.go('checkout',event.target.value)}><option value={key.startsWith('immo-') ? 'immo-signature' : 'signature'}>Paiement unique · 1 200 CAD + taxes</option><option value={key.startsWith('immo-') ? 'immo-monthly' : 'monthly'}>Abonnement · 100 CAD/mois + taxes</option></select></label>}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button" disabled={busy} type="submit">{busy ? 'Préparation du paiement…' : 'Continuer vers le paiement sécurisé →'}</button>
        <small>Vous saisirez votre carte sur Stripe. L’accès à la formation sera activé après confirmation du paiement.</small>
      </form>
  </>;
}

export default function Checkout(props: any) {
  const key = offers[props.id] ? props.id : 'signature';
  return <section className="sales-section checkout-page">
    <span className="eyebrow">VOTRE INSCRIPTION</span>
    <h1>{props.user ? 'Votre commande' : 'Votre formation, votre inscription, votre paiement.'}</h1>
    <div className="panel checkout-complete"><EnrollmentForm {...props} id={key}/></div>
  </section>;
}
