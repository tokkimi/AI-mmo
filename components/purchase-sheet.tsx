'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CreditCard, X } from 'lucide-react';
import { EnrollmentForm } from '@/app/checkout';

export default function PurchaseSheet({ offer, user, go, label = 'M’inscrire maintenant', className = 'button' }: any) {
  const [open, setOpen] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);
  return <>
    <button type="button" className={className} onClick={() => setOpen(true)}>{label}<ArrowRight size={16}/></button>
    {open && <div className="purchase-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="purchase-sheet" role="dialog" aria-modal="true" aria-label="Finaliser votre inscription">
        <button ref={close} type="button" className="purchase-sheet-close" onClick={() => setOpen(false)} aria-label="Fermer"><X size={20}/></button>
        <div className="purchase-sheet-intro"><span><CreditCard size={18}/></span><div><small>INSCRIPTION DIRECTE</small><h2>Votre accès est à un clic du paiement.</h2></div></div>
        <EnrollmentForm id={offer} user={user} go={go}/>
      </section>
    </div>}
  </>;
}
