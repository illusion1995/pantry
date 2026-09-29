import { useState } from 'react';
import { ItemPicture } from '../components/ItemPicture';
import { MinusIcon, PlusIcon } from '../components/icons';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { useItems } from '../data/hooks';
import { byName, describe, store } from '../data/pantry';
import type { PantryItem } from '../data/types';

export function PantryScreen() {
  const items = useItems();
  const showToast = useToast();
  const [search, setSearch] = useState('');
  // Items used up while this screen is open stay in place (showing 0), so the list
  // doesn't shift under a finger and a quick second tap can't hit the wrong item.
  const [justEmptied, setJustEmptied] = useState<ReadonlySet<string>>(new Set());

  if (!items) {
    return (
      <Screen title="My pantry">
        <p className="loading" role="status">
          Opening your pantry…
        </p>
      </Screen>
    );
  }

  const query = search.trim().toLocaleLowerCase();
  const shown = items
    .filter((i) => i.quantity > 0 || justEmptied.has(i.id))
    .filter((i) => !query || i.name.toLocaleLowerCase().includes(query) || i.brand?.toLocaleLowerCase().includes(query))
    .sort(byName);
  const anyInStock = items.some((i) => i.quantity > 0 || justEmptied.has(i.id));

  async function usedOne(item: PantryItem) {
    const quantity = await store.adjustQuantity(item.id, -1);
    if (quantity === 0) {
      setJustEmptied((prev) => new Set(prev).add(item.id));
      showToast({
        message: `${item.name} is on your Need to buy list.`,
        actionLabel: 'Undo',
        onAction: () => void store.adjustQuantity(item.id, 1),
      });
    }
  }

  return (
    <Screen title="My pantry">
      {!anyInStock ? (
        <div className="empty">
          <p>Your pantry is empty. Scan an item to add it.</p>
          <a className="btn btn--primary" href="#/scan">
            Scan item
          </a>
        </div>
      ) : (
        <>
          <input
            className="text-input search"
            type="search"
            placeholder="Search your pantry"
            aria-label="Search your pantry"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            enterKeyHint="search"
          />

          {shown.length === 0 ? (
            <div className="empty">
              <p>Nothing in your pantry matches “{search.trim()}”.</p>
              <button type="button" className="btn btn--outline" onClick={() => setSearch('')}>
                Clear search
              </button>
            </div>
          ) : (
            <ul className="shelf">
              {shown.map((item) => (
                <li key={item.id} className="shelf__item">
                  <div className="shelf__info">
                    <ItemPicture item={item} />
                    <a className="shelf__link" href={`#/item/${encodeURIComponent(item.id)}`}>
                      <span className="shelf__name">{item.name}</span>
                      {describe(item) && <span className="shelf__details">{describe(item)}</span>}
                      {item.quantity === 0 && <span className="shelf__out">Out. It’s on your Need to buy list.</span>}
                    </a>
                  </div>
                  <div className="shelf__controls">
                    <button
                      type="button"
                      className="round-btn"
                      aria-label={`Used one ${item.name}`}
                      disabled={item.quantity === 0}
                      onClick={() => usedOne(item)}
                    >
                      <MinusIcon />
                    </button>
                    <span
                      className={item.quantity === 0 ? 'tag tag--alert' : 'tag'}
                      aria-label={`${item.quantity} left`}
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="round-btn"
                      aria-label={`Add one ${item.name}`}
                      onClick={() => void store.adjustQuantity(item.id, 1)}
                    >
                      <PlusIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Screen>
  );
}
