'use client';

import { PublicShell } from '../landing';
import IcourtierPresentation from '../icourtier-presentation';

export default function IcourtierPage() {
  const go = (view: string, id?: string) => {
    const q = new URLSearchParams({ view });
    if (id) q.set('id', id);
    window.location.assign('/?' + q.toString());
  };
  return (
    <PublicShell go={go} user={null}>
      <IcourtierPresentation go={go} user={null} />
    </PublicShell>
  );
}
