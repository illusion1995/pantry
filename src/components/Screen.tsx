import type { ReactNode } from 'react';
import { back } from '../router';
import { BackIcon } from './icons';

interface Props {
  title: string;
  children: ReactNode;
  /** Replaces the default Back behaviour (used by multi-step screens). */
  onBack?: () => void;
}

/** A screen with a Back button and a large title. */
export function Screen({ title, children, onBack = back }: Props) {
  return (
    <main className="screen">
      <header className="screen__head">
        <button type="button" className="back-btn" onClick={onBack}>
          <BackIcon /> Back
        </button>
        <h1 className="screen__title">{title}</h1>
      </header>
      {children}
    </main>
  );
}
