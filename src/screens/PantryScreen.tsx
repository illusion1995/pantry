import { useState } from 'react';
import { ItemPicture } from '../components/ItemPicture';
import { MinusIcon, PlusIcon } from '../components/icons';
import { Screen } from '../components/Screen';
import { SectionTabs } from '../components/SectionChoice';
import { useToast } from '../components/Toast';
import { useItems } from '../data/hooks';
import { byName, describe, SECTION_NAMES, sectionOf, store } from '../data/pantry';
import type { PantryItem, Section } from '../data/types';

// The tab she used last, remembered on this phone.
const TAB_KEY = 'pantry:tab';

function savedTab(): Section {
  try {
    return localStorage.getItem(TAB_KEY) === 'household' ? 'household' : 'food';
  } catch {
    return 'food';
  }
}

export function PantryScreen() {
  const items = useItems();
  const showToast = useToast();
  const [search, setSearch] = useState('');
  // Items used up while this screen is open stay in place (showing 0), so the list
  // doesn't shift under a finger and a quick second tap can't hit the wrong item.
  const [justEmptied, setJustEmptied] = useState<ReadonlySet<string>>(new Set());
  const [tab, setTab] = useState<Section>(savedTab);

  function chooseTab(next: Section) {
    setTab(next);
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {
      // Not remembering the tab is fine.
    }
  }

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
  const onShelf = items.filter((i) => i.quantity > 0 || justEmptied.has(i.id));
  const matching = onShelf.filter(
    (i) => !query || i.name.toLocaleLowerCase().includes(query) || i.brand?.toLocaleLowerCase().includes(query),
  );
  const shown = matching.filter((i) => sectionOf(i) === tab).sort(byName);
  const anyInTab = onShelf.some((i) => sectionOf(i) === tab);
  // Searching on the wrong tab shouldn't look like "you don't have it".
  const otherTab: Section = tab === 'food' ? 'household' : 'food';
  const matchesInOtherTab = query ? matching.filter((i) => sectionOf(i) === otherTab).length : 0;

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
      <SectionTabs value={tab} onChange={chooseTab} />

      {!anyInTab ? (
        <div className="empty">
          <p>
            {tab === 'food'
              ? 'Nothing in Food yet. Scan an item to add it.'
              : 'Nothing in Household yet. Cleaning supplies, toiletries and pet food go here.'}
          </p>
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
              <p>
                Nothing in {SECTION_NAMES[tab]} matches “{search.trim()}”.
              </p>
              {matchesInOtherTab > 0 && (
                <button type="button" className="btn btn--primary" onClick={() => chooseTab(otherTab)}>
                  Look in {SECTION_NAMES[otherTab]} ({matchesInOtherTab})
                </button>
              )}
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
