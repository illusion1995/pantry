import type { PantryItem } from '../data/types';
import { back } from '../router';
import { CheckIcon } from './icons';

interface Props {
  item: PantryItem;
  added: number;
  /** e.g. "Scan another item". Omit to show only Done. */
  againLabel?: string;
  onAgain?: () => void;
}

/** Confirms what was added and what the new total is. */
export function DoneStep({ item, added, againLabel, onAgain }: Props) {
  return (
    <div className="stack done">
      <div className="done__mark" aria-hidden="true">
        <CheckIcon />
      </div>
      <div role="status">
        <h2 className="done__title">Added {added}</h2>
        <p className="done__name">{item.name}</p>
        <p className="done__total">
          You now have <span className="tag tag--inline">{item.quantity}</span>
        </p>
      </div>
      {againLabel && onAgain && (
        <button type="button" className="btn btn--primary" onClick={onAgain} autoFocus>
          {againLabel}
        </button>
      )}
      <button type="button" className="btn btn--outline" onClick={back} autoFocus={!againLabel}>
        Done
      </button>
    </div>
  );
}
