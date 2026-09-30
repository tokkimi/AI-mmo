"use client";
import { createContext, useContext, useEffect, useState } from 'react';
type Currency = 'CAD' | 'EUR';
const Context = createContext({ currency: 'CAD' as Currency, rate: null as number | null, date: null as string | null, setCurrency: (_: Currency) => {} });
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, update] = useState<Currency>('CAD');
  const [rate, setRate] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/api/currency').then(r => r.json()).then(data => {
      if (!live) return;
      const validRate = typeof data.rate === 'number' && Number.isFinite(data.rate) && data.rate > 0 ? data.rate : null;
      setRate(validRate); setDate(data.date);
      let saved: string | null = null;
      try { saved = localStorage.getItem('iateliers-currency'); } catch {}
      update(validRate && (saved === 'EUR' || (!saved && data.currency === 'EUR')) ? 'EUR' : 'CAD');
    }).catch(() => {});
    return () => { live = false; };
  }, []);
  function setCurrency(value: Currency) {
    if (value === 'EUR' && !rate) return;
    update(value);
    try { localStorage.setItem('iateliers-currency', value); } catch {}
  }
  return <Context.Provider value={{ currency, rate, date, setCurrency }}>{children}</Context.Provider>;
}
export function useMoney() {
  const { currency, rate } = useContext(Context);
  return (amount: number) => currency === 'EUR' && rate
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount * rate)
    : new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 0 }).format(amount) + ' CAD';
}
export function CurrencyPicker() {
  const { currency, rate, date, setCurrency } = useContext(Context);
  return <div className="currency-picker"><label>Devise d’affichage <select aria-label="Devise d’affichage" value={currency} onChange={e => setCurrency(e.target.value as Currency)}><option value="CAD">CAD — Dollar canadien</option><option value="EUR" disabled={!rate}>EUR — Euro</option></select></label><small>{currency === 'EUR' ? `Conversion indicative au taux BCE${date ? ' du ' + date : ''}. Paiement en CAD ; le taux de votre banque peut varier. Taxes en sus.` : 'Prix en dollars canadiens. Taxes en sus.'}</small></div>;
}
