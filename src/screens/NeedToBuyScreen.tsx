import { ItemPicture } from '../components/ItemPicture';
import { FoodIcon, HouseholdIcon, ShareIcon } from '../components/icons';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { useItems } from '../data/hooks';
import { byName, describe, SECTION_NAMES, sectionOf, SECTIONS } from '../data/pantry';
import type { PantryItem, Section } from '../data/types';

interface Group {
  section: Section;
  items: PantryItem[];
}

const SECTION_ICONS = { food: FoodIcon, household: HouseholdIcon };

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

  // One shopping list, split into Food and Household so one trip covers both.
  const needed = items.filter((i) => i.quantity === 0).sort(byName);
  const groups: Group[] = SECTIONS.map((section) => ({
    section,
    items: needed.filter((i) => sectionOf(i) === section),
  })).filter((g) => g.items.length > 0);

  async function share() {
    const text = listAsText(groups);
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
          {groups.map(({ section, items: groupItems }) => {
            const SectionIcon = SECTION_ICONS[section];
            return (
              <section key={section} className="list-group">
                <h2 className="list-group__title">
                  <SectionIcon />
                  {SECTION_NAMES[section]}
                </h2>
                <ul className="notepad">
                  {groupItems.map((item) => (
                    <li key={item.id} className="notepad__item">
                      <div className="notepad__info">
                        <ItemPicture item={item} />
                        <a className="notepad__link" href={`#/item/${encodeURIComponent(item.id)}`}>
                          <span className="notepad__name">{item.name}</span>
                          {describe(item) && <span className="notepad__details">{describe(item)}</span>}
                        </a>
                      </div>
                      <a className="btn btn--outline btn--compact" href={`#/restock/${encodeURIComponent(item.id)}`}>
                        Bought it
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </Screen>
  );
}

function listAsText(groups: Group[]): string {
  const line = (item: PantryItem) => {
    const details = describe(item);
    return `- ${item.name}${details ? ` (${details})` : ''}`;
  };
  // Only add headings when there's more than one group to separate.
  if (groups.length === 1) return ['Need to buy:', ...groups[0].items.map(line)].join('\n');
  return ['Need to buy:', ...groups.map((g) => [`\n${SECTION_NAMES[g.section]}:`, ...g.items.map(line)].join('\n'))].join(
    '\n',
  );
}
