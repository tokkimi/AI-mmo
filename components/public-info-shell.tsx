'use client';

import type { ReactNode } from 'react';
import { PublicShell } from '@/app/landing';

export function PublicInfoShell({ children }: { children: ReactNode }) {
  const go = (view: string) => {
    if (view === 'privacy') window.location.assign('/conditions');
    else window.location.assign(view === 'home' ? '/' : `/?view=${encodeURIComponent(view)}`);
  };
  return <PublicShell go={go} user={null}>{children}</PublicShell>;
}
