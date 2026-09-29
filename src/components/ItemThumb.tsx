import { useState } from 'react';

interface Props {
  name: string;
  imageUrl?: string;
  large?: boolean;
}

/** Product photo, or the first letter of the name when there is no photo. */
export function ItemThumb({ name, imageUrl, large }: Props) {
  // Remember which picture failed, so a new picture gets its own chance to load.
  const [failedUrl, setFailedUrl] = useState<string>();
  const className = large ? 'thumb thumb--large' : 'thumb';

  if (imageUrl && imageUrl !== failedUrl) {
    return <img className={className} src={imageUrl} alt="" loading="lazy" onError={() => setFailedUrl(imageUrl)} />;
  }
  return (
    <span className={`${className} thumb--letter`} aria-hidden="true">
      {name.trim().charAt(0).toLocaleUpperCase() || '?'}
    </span>
  );
}
