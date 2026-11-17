'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, Building2, Sparkles, Users, X } from 'lucide-react';
import { useMoney } from './currency';

export default function FormationBubble() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const money = useMoney();

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const items = [
    { name: 'Structurer & automatiser', detail: `${money(1200)} · paiement unique`, icon: BookOpen, href: '/?view=business-info' },
    { name: 'Former votre équipe', detail: `20 h en groupe · dès ${money(4900)}`, icon: Users, href: '/?view=enterprise' },
    { name: 'Claude + ChatGPT', detail: `100 % autonome · ${money(499)}`, icon: Sparkles, href: '/?view=autonomous-info' },
    { name: 'i-Courtier · outil pour courtiers', detail: 'Bientôt disponible', icon: Building2, href: '/i-courtier' },
  ];

  return <div className="formation-bubble" ref={root}>
    {open && <section className="formation-bubble-panel" id="formation-bubble-panel" aria-label="Choisir une formation">
      <header>
        <h2>Choisissez votre parcours.</h2>
        <button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }} aria-label="Fermer les formations"><X size={20} /></button>
      </header>
      <p>Ouvrez directement la page de la formation qui vous intéresse.</p>
      <div className="formation-bubble-list">
        {items.map(({ name, detail, icon: Icon, href }) => <a className="formation-bubble-item" href={href} key={name} onClick={() => setOpen(false)}>
          <Icon size={21} />
          <span><strong>{name}</strong><small>{detail}{name.startsWith('i-Courtier') ? '' : ' · taxes en sus'}</small></span>
          <ArrowUpRight size={15} />
        </a>)}
      </div>
      <small>Prix convertis à titre indicatif en EUR. Paiement en CAD.</small>
    </section>}
    <button type="button" className="formation-bubble-trigger" ref={trigger} aria-expanded={open} aria-controls="formation-bubble-panel" onClick={() => setOpen(!open)}>
      <span><BookOpen size={20} /></span>
      <span><b>Les formations</b><small>Voir les parcours</small></span>
      {open ? <X size={17} /> : <ArrowUpRight size={17} />}
    </button>
  </div>;
}
