'use client';

import { useEffect, useRef, useState } from 'react';
import { useMoney } from './currency';
import styles from './formation-bubble.module.css';

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
    { number: '01', name: 'Structurer & automatiser', detail: `${money(1200)} · paiement unique`, href: '/?view=business-info' },
    { number: '02', name: 'Former votre équipe', detail: `20 h · dès ${money(4900)}`, href: '/?view=enterprise' },
    { number: '03', name: 'Claude + ChatGPT', detail: `Autonome · ${money(499)}`, href: '/?view=autonomous-info' },
    { number: '04', name: 'i-Courtier', detail: 'Bientôt disponible', href: '/i-courtier', comingSoon: true },
  ];

  return <div className={styles.root} ref={root}>
    {open && <section className={styles.panel} id="formation-picker" aria-label="Choisir une formation">
      <header className={styles.heading}>
        <div><span>VOS PARCOURS</span><h2>Choisissez votre formation</h2></div>
        <button type="button" className={styles.close} onClick={() => { setOpen(false); trigger.current?.focus(); }} aria-label="Fermer les formations">×</button>
      </header>
      <nav className={styles.list} aria-label="Pages des formations">
        {items.map(item => <a className={styles.item} href={item.href} key={item.name} onClick={() => setOpen(false)}>
          <span className={styles.number}>{item.number}</span>
          <span className={styles.copy}><strong>{item.name}</strong><small className={item.comingSoon ? styles.comingSoon : undefined}>{item.detail}</small></span>
          <span className={styles.arrow} aria-hidden="true">→</span>
        </a>)}
      </nav>
      <small className={styles.note}>Prix en CAD · taxes en sus, sauf indication contraire.</small>
    </section>}
    <button type="button" className={styles.trigger} ref={trigger} aria-expanded={open} aria-controls="formation-picker" onClick={() => setOpen(value => !value)}>
      <span><strong>Les formations</strong><small>Choisir mon parcours</small></span>
      <span className={styles.triggerMark} aria-hidden="true">{open ? '×' : '+'}</span>
    </button>
  </div>;
}
