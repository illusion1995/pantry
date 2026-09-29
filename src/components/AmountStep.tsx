import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { createItem, describe, store } from '../data/pantry';
import type { PantryItem, ProductInfo } from '../data/types';
import { ItemThumb } from './ItemThumb';
import { QuantityPicker } from './QuantityPicker';

type Target =
  /** Already in the pantry: just add to its count. */
  | { kind: 'existing'; item: PantryItem }
  /** Not in the pantry yet. The name can still be changed. */
  | { kind: 'new'; product: ProductInfo };

interface Props {
  target: Target;
  question?: string;
  /** Shown above the form, e.g. to explain why the name needs typing. */
  note?: ReactNode;
  onAdded: (item: PantryItem, added: number) => void;
}

/** Asks how many, then adds them to the pantry. */
export function AmountStep({ target, question = 'How many are you adding?', note, onAdded }: Props) {
  const nameId = useId();
  const [amount, setAmount] = useState(1);
  const [name, setName] = useState(target.kind === 'new' ? target.product.name : target.item.name);
  // A looked-up name is usually right, so only show the text box when there's no name yet.
  const [editingName, setEditingName] = useState(target.kind === 'new' && !target.product.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const shown = target.kind === 'existing' ? target.item : target.product;
  const details = describe(shown);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setError('Type a name for this item.');
      return;
    }
    setSaving(true);
    try {
      if (target.kind === 'existing') {
        const quantity = await store.adjustQuantity(target.item.id, amount);
        onAdded({ ...target.item, quantity }, amount);
      } else {
        const item = await createItem({ ...target.product, name }, amount);
        onAdded(item, amount);
      }
    } catch (e) {
      console.error(e);
      setError('It couldn’t be saved. Try again.');
      setSaving(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      {note && <div className="note">{note}</div>}

      {target.kind === 'existing' ? (
        <div className="product">
          <ItemThumb name={shown.name} imageUrl={shown.imageUrl} large />
          <div>
            <h2 className="product__name">{shown.name}</h2>
            {details && <p className="product__details">{details}</p>}
            <p className="product__have">
              {target.item.quantity === 0 ? (
                'You’re out of this right now.'
              ) : (
                <>
                  You have <strong>{target.item.quantity}</strong> now.
                </>
              )}
            </p>
          </div>
        </div>
      ) : editingName ? (
        <div className="field">
          <label htmlFor={nameId}>{shown.name ? 'Name' : 'What is it?'}</label>
          <input
            id={nameId}
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
            aria-invalid={Boolean(error) && !name.trim()}
          />
          {details && <p className="product__details">{details}</p>}
        </div>
      ) : (
        <div className="product">
          <ItemThumb name={name} imageUrl={shown.imageUrl} large />
          <div>
            <h2 className="product__name">{name}</h2>
            {details && <p className="product__details">{details}</p>}
            <button type="button" className="link-btn" onClick={() => setEditingName(true)}>
              Change the name
            </button>
          </div>
        </div>
      )}

      <QuantityPicker label={question} value={amount} onChange={setAmount} />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn--primary" disabled={saving}>
        Add to pantry
      </button>
    </form>
  );
}
