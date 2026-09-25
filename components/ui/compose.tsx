'use client';

import { useId, useRef, useState } from 'react';
import { Send, AtSign, ListPlus } from 'lucide-react';

type Choice = { label: string; hint: string; text: string };
const templates: Choice[] = [
  { label: 'question', hint: 'Poser une question sur une leçon', text: 'Bonjour, ma question concerne la leçon : …\nCe que j’ai essayé : …\nCe qui me bloque : …' },
  { label: 'retour', hint: 'Demander un retour sur votre travail', text: 'Bonjour, pouvez-vous me faire un retour sur mon exercice ?\nLeçon concernée : …\nPoint à vérifier : …' },
  { label: 'coaching', hint: 'Préparer un rendez-vous', text: 'Bonjour, je souhaite préparer notre prochaine séance.\nMon objectif : …\nMes disponibilités : …' },
];

export function Compose({ value, onChange, onSubmit, busy = false, recipient = 'Administration', maxLength = 5000 }: {
  value: string; onChange: (value: string) => void; onSubmit: () => Promise<void>;
  busy?: boolean; recipient?: string; maxLength?: number;
}) {
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const sending = useRef(false);
  const [picker, setPicker] = useState<{ start: number; end: number; kind: string; query: string } | null>(null);
  const [active, setActive] = useState(0);
  const choices = (picker?.kind === '@' ? [{ label: recipient, hint: 'Destinataire de cette conversation', text: `@${recipient} ` }] : templates)
    .filter(item => item.label.toLocaleLowerCase().includes(picker?.query.toLocaleLowerCase() || ''));
  function detect(text: string, caret: number) {
    const match = text.slice(0, caret).match(/(?:^|\s)([@/])([^\s@/]*)$/);
    setPicker(match ? { start: caret - match[2].length - 1, end: caret, kind: match[1], query: match[2] } : null);
    setActive(0);
  }
  function choose(choice: Choice) {
    if (!picker || busy) return;
    const next = value.slice(0, picker.start) + choice.text + value.slice(picker.end);
    if (next.length > maxLength) return;
    onChange(next); setPicker(null);
    requestAnimationFrame(() => { input.current?.focus({ preventScroll: true }); input.current?.setSelectionRange(picker.start + choice.text.length, picker.start + choice.text.length); });
  }
  async function submit() {
    if (busy || sending.current || !value.trim() || value.length > maxLength) return;
    sending.current = true; setPicker(null);
    try { await onSubmit(); } finally { sending.current = false; }
  }
  function open(kind: string) {
    const caret = input.current?.selectionStart ?? value.length;
    setPicker({ start: caret, end: caret, kind, query: '' }); setActive(0);
    input.current?.focus({ preventScroll: true });
  }
  return <div className="message-compose" aria-busy={busy}>
    <label htmlFor={id}>Votre message</label>
    <textarea id={id} ref={input} value={value} disabled={busy} maxLength={maxLength} rows={5}
      placeholder="Écrivez votre message… @ pour le destinataire, / pour un modèle"
      aria-describedby={`${id}-hint`} aria-controls={picker ? `${id}-choices` : undefined}
      onChange={e => { onChange(e.target.value); detect(e.target.value, e.target.selectionStart); }}
      onClick={e => detect(value, e.currentTarget.selectionStart)}
      onBlur={e => { if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setPicker(null); }}
      onKeyDown={e => {
        if (e.nativeEvent.isComposing) return;
        if (picker && choices.length) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i + (e.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length); return; }
          if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); choose(choices[active] || choices[0]); return; }
          if (e.key === 'Escape') { e.preventDefault(); setPicker(null); return; }
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void submit(); }
      }} />
    {picker && choices.length > 0 && <div id={`${id}-choices`} className="compose-choices" aria-label="Suggestions">
      {choices.map((item, i) => <button type="button" key={item.label} className={active === i ? 'selected' : ''} onPointerDown={e => e.preventDefault()} onClick={() => choose(item)}><strong>{picker.kind}{item.label}</strong><span>{item.hint}</span></button>)}
    </div>}
    <div className="compose-footer"><div className="compose-shortcuts">
      <button type="button" disabled={busy} onClick={() => open('@')} aria-label="Mentionner le destinataire"><AtSign size={17}/></button>
      <button type="button" disabled={busy} onClick={() => open('/')} aria-label="Insérer un modèle de message"><ListPlus size={17}/>Modèles</button>
    </div><span className="compose-count">{value.length}/{maxLength}</span><button type="button" className="button" disabled={busy || !value.trim() || value.length > maxLength} onClick={() => void submit()}><Send size={16}/>{busy ? 'Envoi…' : 'Envoyer'}</button></div>
    <small id={`${id}-hint`}>Modèles à personnaliser · Ctrl/⌘ + Entrée pour envoyer. Entrée pour une nouvelle ligne.</small>
  </div>;
}
