import { useId, useState, type FormEvent } from 'react';
import { AmountStep } from '../components/AmountStep';
import { DoneStep } from '../components/DoneStep';
import { ItemThumb } from '../components/ItemThumb';
import { Screen } from '../components/Screen';
import { useItems } from '../data/hooks';
import { byName, findByName } from '../data/pantry';
import type { PantryItem } from '../data/types';
import { back } from '../router';

type Step =
  | { step: 'name' }
  | { step: 'amount'; existing: PantryItem }
  | { step: 'amount'; name: string }
  | { step: 'done'; item: PantryItem; added: number };

/** For things without a barcode: produce, bulk bins, home-canned food. */
export function AddByNameScreen() {
  const [state, setState] = useState<Step>({ step: 'name' });
  const restart = () => setState({ step: 'name' });
  const onBack = state.step === 'name' || state.step === 'done' ? back : restart;

  return (
    <Screen title="Add without a barcode" onBack={onBack}>
      {state.step === 'name' && (
        <NameStep
          onPick={(existing) => setState({ step: 'amount', existing })}
          onNew={(name) => setState({ step: 'amount', name })}
        />
      )}

      {state.step === 'amount' && (
        <AmountStep
          target={
            'existing' in state ? { kind: 'existing', item: state.existing } : { kind: 'new', product: { name: state.name } }
          }
          onAdded={(item, added) => setState({ step: 'done', item, added })}
        />
      )}

      {state.step === 'done' && (
        <DoneStep item={state.item} added={state.added} againLabel="Add another item" onAgain={restart} />
      )}
    </Screen>
  );
}

function NameStep({ onPick, onNew }: { onPick: (item: PantryItem) => void; onNew: (name: string) => void }) {
  const id = useId();
  const items = useItems();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const query = name.trim().toLocaleLowerCase();
  const matches =
    query.length >= 2 && items
      ? items
          .filter((i) => i.name.toLocaleLowerCase().includes(query))
          .sort(byName)
          .slice(0, 5)
      : [];

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Type what you’re adding.');
      return;
    }
    const existing = await findByName(trimmed);
    if (existing) onPick(existing);
    else onNew(trimmed);
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor={id}>What is it?</label>
        <input
          id={id}
          className="text-input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          autoFocus
          autoCapitalize="sentences"
          autoComplete="off"
          enterKeyHint="next"
          aria-invalid={Boolean(error)}
        />
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {matches.length > 0 && (
        <div className="matches">
          <p className="matches__label">Already in the app. Tap one to add to it:</p>
          <ul className="matches__list">
            {matches.map((item) => (
              <li key={item.id}>
                <button type="button" className="match" onClick={() => onPick(item)}>
                  <ItemThumb name={item.name} imageUrl={item.imageUrl} />
                  <span className="match__name">{item.name}</span>
                  <span className={item.quantity > 0 ? 'tag tag--small' : 'tag tag--small tag--alert'}>
                    {item.quantity}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="submit" className="btn btn--primary">
        Next
      </button>
    </form>
  );
}
