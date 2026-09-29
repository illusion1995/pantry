import { useState } from 'react';
import { pictureOf } from '../data/pantry';
import type { PantryItem } from '../data/types';
import { ItemThumb } from './ItemThumb';
import { PhotoViewer } from './PhotoViewer';

/** A list thumbnail. When there's a picture, tapping it shows it bigger. */
export function ItemPicture({ item }: { item: Pick<PantryItem, 'name' | 'photo' | 'imageUrl'> }) {
  const [viewing, setViewing] = useState(false);
  const src = pictureOf(item);

  if (!src) return <ItemThumb name={item.name} />;
  return (
    <>
      <button
        type="button"
        className="thumb-btn"
        aria-label={`See a bigger picture of ${item.name}`}
        onClick={() => setViewing(true)}
      >
        <ItemThumb name={item.name} imageUrl={src} />
      </button>
      {viewing && <PhotoViewer src={src} name={item.name} onClose={() => setViewing(false)} />}
    </>
  );
}
