import { ItemThumb } from '../components/ItemThumb';
import { ShareIcon } from '../components/icons';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { useItems } from '../data/hooks';
import { byName, describe } from '../data/pantry';
import type { PantryItem } from '../data/types';

export function NeedToBuyScreen() {
  const items = useItems();
  const showToast = useToast();

  if (!items) {
    return (
      <Screen title="Need to buy">
        <p className="loading" role="status">
          Opening your list…
        </p>
      </Screen>
    );
  }

  const needed = items.filter((i) => i.quantity === 0).sort(byName);

  async function share() {
    const text = listAsText(needed);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Need to buy', text });
        return;
      } catch (e) {
        // The share menu was closed on purpose; nothing else to do.
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast({ message: 'List copied. Paste it into a text or email.' });
    } catch {
      showToast({ message: 'The list couldn’t be shared from this device.' });
    }
  }

  return (
    <Screen title="Need to buy">
      {needed.length === 0 ? (
        <div className="empty">
          <p>You have everything. When you use the last of something, it shows up here.</p>
        </div>
      ) : (
        <>
          <button type="button" className="btn btn--primary" onClick={share}>
            <ShareIcon /> Share list
          </button>
          <ul className="notepad">
            {needed.map((item) => (
              <li key={item.id} className="notepad__item">
                <a className="notepad__info" href={`#/item/${encodeURIComponent(item.id)}`}>
                  <ItemThumb name={item.name} imageUrl={item.imageUrl} />
                  <span>
                    <span className="notepad__name">{item.name}</span>
                    {describe(item) && <span className="notepad__details">{describe(item)}</span>}
                  </span>
                </a>
                <a className="btn btn--outline btn--compact" href={`#/restock/${encodeURIComponent(item.id)}`}>
                  Bought it
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </Screen>
  );
}

function listAsText(items: PantryItem[]): string {
  const lines = items.map((item) => {
    const details = describe(item);
    return `- ${item.name}${details ? ` (${details})` : ''}`;
  });
  return ['Need to buy:', ...lines].join('\n');
}
