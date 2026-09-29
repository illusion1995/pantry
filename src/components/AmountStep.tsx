import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { createItem, describe, store } from '../data/pantry';
import type { PantryItem, ProductInfo } from '../data/types';
import { PhotoControl } from './PhotoControl';
import { SectionPicker } from './SectionChoice';
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
  // The user's own photo. Only saved together with the amount.
  const [photo, setPhoto] = useState(shown.photo);
  const photoChanged = photo !== shown.photo;
  const photoControl = (
    <PhotoControl
      name={name}
      photo={photo}
      fallbackUrl={shown.imageUrl}
      onChange={(next) => setPhoto(next ?? undefined)}
    />
  );
  // Only ask Food or Household when no product database told us.
  const askSection = target.kind === 'new' && !target.product.section;
  const [section, setSection] = useState(target.kind === 'new' ? target.product.section : undefined);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setError('Type a name for this item.');
      return;
    }
    if (askSection && !section) {
      setError('Choose Food or Household.');
      return;
    }
    setSaving(true);
    try {
      if (target.kind === 'existing') {
        const quantity = await store.adjustQuantity(target.item.id, amount);
        if (photoChanged) await store.update(target.item.id, { photo: photo ?? null });
        onAdded({ ...target.item, quantity, photo }, amount);
      } else {
        const item = await createItem({ ...target.product, name, photo, section }, amount);
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
          {photoControl}
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
          {photoControl}
          <div>
            <h2 className="product__name">{name}</h2>
            {details && <p className="product__details">{details}</p>}
            <button type="button" className="link-btn" onClick={() => setEditingName(true)}>
              Change the name
            </button>
          </div>
        </div>
      )}

      {target.kind === 'new' && editingName && photoControl}

      {askSection && (
        <SectionPicker
          value={section}
          onChange={(next) => {
            setSection(next);
            setError('');
          }}
          invalid={Boolean(error) && !section}
        />
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
