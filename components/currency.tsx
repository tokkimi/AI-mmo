"use client";
// Les prix sont toujours affichés en dollars canadiens, sans conversion selon le pays.
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function useMoney() {
  return (amount: number) => new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 0 }).format(amount) + ' CAD';
}
export function CurrencyPicker() {
  return <div className="currency-picker"><small>Prix en dollars canadiens. Taxes en sus.</small></div>;
}
