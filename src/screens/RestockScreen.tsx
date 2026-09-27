import { useState } from 'react';
import { AmountStep } from '../components/AmountStep';
import { DoneStep } from '../components/DoneStep';
import { Screen } from '../components/Screen';
import { useItem } from '../data/hooks';
import type { PantryItem } from '../data/types';

/** "Bought it" from the Need to buy list. Handy for items without a barcode. */
export function RestockScreen({ id }: { id: string }) {
  const item = useItem(id);
  const [done, setDone] = useState<{ item: PantryItem; added: number } | null>(null);

  return (
    <Screen title="Bought it">
      {done ? (
        <DoneStep item={done.item} added={done.added} />
      ) : item === null ? (
        <p className="empty">This item isn’t in the app anymore.</p>
      ) : item ? (
        <AmountStep
          target={{ kind: 'existing', item }}
          question="How many did you buy?"
          onAdded={(updated, added) => setDone({ item: updated, added })}
        />
      ) : null}
    </Screen>
  );
}
