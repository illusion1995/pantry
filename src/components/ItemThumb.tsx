import { useState } from 'react';

interface Props {
  name: string;
  imageUrl?: string;
  large?: boolean;
}

/** Product photo, or the first letter of the name when there is no photo. */
export function ItemThumb({ name, imageUrl, large }: Props) {
  const [failed, setFailed] = useState(false);
  const className = large ? 'thumb thumb--large' : 'thumb';

  if (imageUrl && !failed) {
    return <img className={className} src={imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} />;
  }
  return (
    <span className={`${className} thumb--letter`} aria-hidden="true">
      {name.trim().charAt(0).toLocaleUpperCase() || '?'}
    </span>
  );
}
