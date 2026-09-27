import { useEffect, useId, useState, type FormEvent } from 'react';
import { ItemThumb } from '../components/ItemThumb';
import { QuantityPicker } from '../components/QuantityPicker';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { useItem } from '../data/hooks';
import { describe, store } from '../data/pantry';
import type { PantryItem } from '../data/types';
import { back } from '../router';

/** Fix a name or count, or delete an item for good. */
export function ItemScreen({ id }: { id: string }) {
  const item = useItem(id);

  return (
    <Screen title="Change item">
      {item === null ? (
        <p className="empty">This item isn’t in the app anymore.</p>
      ) : item ? (
        <EditItem item={item} />
      ) : null}
    </Screen>
  );
}

function EditItem({ item }: { item: PantryItem }) {
  const nameId = useId();
  const showToast = useToast();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [error, setError] = useState('');

  // Keep the count in step if it changes elsewhere while this screen is open.
  useEffect(() => setQuantity(item.quantity), [item.quantity]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Type a name for this item.');
      return;
    }
    await store.update(item.id, { name: name.trim(), quantity });
    showToast({ message: 'Changes saved.' });
    back();
  }

  async function remove() {
    const ok = window.confirm(`Delete ${item.name}? It will be removed from your pantry and your Need to buy list.`);
    if (!ok) return;
    await store.remove(item.id);
    showToast({ message: `${item.name} deleted.` });
    back();
  }

  return (
    <form className="stack" onSubmit={save} noValidate>
      {item.imageUrl && <ItemThumb name={name} imageUrl={item.imageUrl} large />}
      <div className="field">
        <label htmlFor={nameId}>Name</label>
        <input
          id={nameId}
          className="text-input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          autoCapitalize="sentences"
          autoComplete="off"
          aria-invalid={Boolean(error)}
        />
        {describe(item) && <p className="product__details">{describe(item)}</p>}
      </div>

      <QuantityPicker label="How many do you have?" value={quantity} onChange={setQuantity} min={0} />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn--primary">
        Save changes
      </button>

      <button type="button" className="btn btn--danger" onClick={remove}>
        Delete item
      </button>
    </form>
  );
}
