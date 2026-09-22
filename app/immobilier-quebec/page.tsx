'use client';

import { PublicShell } from '../landing';
import ImmoPresentation from '../immo-presentation';

export default function ImmobilierQuebec() {
  const go = (view: string, id?: string) => {
    const q = new URLSearchParams({ view });
    if (id) q.set('id', id);
    window.location.assign('/?' + q.toString());
  };
  return (
    <PublicShell go={go} user={null}>
      <ImmoPresentation go={go} />
    </PublicShell>
  );
}
