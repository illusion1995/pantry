import { useEffect, useRef, useState } from 'react';
import { shrinkPhoto } from '../photos';
import { CameraIcon, PencilIcon, PhotosIcon } from './icons';
import { ItemThumb } from './ItemThumb';
import { PhotoViewer } from './PhotoViewer';
import { useToast } from './Toast';

interface Props {
  name: string;
  /** The user's own photo, if any. */
  photo?: string;
  /** The product database's picture, shown when there's no own photo. */
  fallbackUrl?: string;
  /** A new photo, or null when the user removes theirs. */
  onChange: (photo: string | null) => void;
}

/**
 * The item's picture with a pen badge. Tapping the picture shows it bigger;
 * tapping the pen (or the empty box) offers "Take a photo" or "Choose from my
 * photos". Nothing is saved until the form it's in is saved.
 */
export function PhotoControl({ name, photo, fallbackUrl, onChange }: Props) {
  const showToast = useToast();
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [choosing, setChoosing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const src = photo ?? fallbackUrl;

  async function takeFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await shrinkPhoto(file));
    } catch (error) {
      console.error('Could not use photo', error);
      showToast({ message: 'That photo couldn’t be used. Try a different one.' });
    } finally {
      setBusy(false);
    }
  }

  const fileInput = (ref: typeof cameraInput, camera: boolean) => (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      capture={camera ? 'environment' : undefined}
      hidden
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        void takeFile(file);
      }}
    />
  );

  return (
    <div className="photo-control" aria-busy={busy}>
      {fileInput(cameraInput, true)}
      {fileInput(galleryInput, false)}

      {src ? (
        <>
          <button
            type="button"
            className="photo-control__picture"
            aria-label={`See a bigger picture of ${name || 'this item'}`}
            onClick={() => setViewing(true)}
          >
            <ItemThumb name={name} imageUrl={src} large />
          </button>
          <button
            type="button"
            className="photo-control__edit"
            aria-label={photo ? 'Change the photo' : 'Use your own photo'}
            onClick={() => setChoosing(true)}
          >
            <PencilIcon />
          </button>
        </>
      ) : (
        <button type="button" className="photo-control__add" onClick={() => setChoosing(true)}>
          <CameraIcon />
          <span>Add photo</span>
        </button>
      )}

      {choosing && (
        <PhotoSheet
          canRemove={Boolean(photo)}
          onCamera={() => cameraInput.current?.click()}
          onGallery={() => galleryInput.current?.click()}
          onRemove={() => onChange(null)}
          onClose={() => setChoosing(false)}
        />
      )}
      {viewing && src && <PhotoViewer src={src} name={name} onClose={() => setViewing(false)} />}
    </div>
  );
}

interface SheetProps {
  canRemove: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onRemove: () => void;
  onClose: () => void;
}

/** Slides up from the bottom with big choices. Back, Cancel or tapping outside closes it. */
function PhotoSheet({ canRemove, onCamera, onGallery, onRemove, onClose }: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  // Don't wait for the close event (it arrives on the next repaint); the Back
  // button still closes the sheet through it.
  const close = () => {
    dialog.current?.close();
    onClose();
  };

  // Act before closing: the phone only opens the camera or photo picker during the tap itself.
  const choose = (action: () => void) => () => {
    action();
    close();
  };

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby="photo-sheet-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) close(); // tap on the dimmed area
      }}
    >
      <div className="sheet__body">
        <h2 id="photo-sheet-title" className="sheet__title">
          Photo
        </h2>
        <button type="button" className="btn btn--primary" onClick={choose(onCamera)}>
          <CameraIcon /> Take a photo
        </button>
        <button type="button" className="btn btn--outline" onClick={choose(onGallery)}>
          <PhotosIcon /> Choose from my photos
        </button>
        {canRemove && (
          <button type="button" className="btn btn--danger" onClick={choose(onRemove)}>
            Remove my photo
          </button>
        )}
        <button type="button" className="link-btn sheet__cancel" onClick={close}>
          Cancel
        </button>
      </div>
    </dialog>
  );
}
