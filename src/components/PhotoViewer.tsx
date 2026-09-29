import { useEffect, useRef } from 'react';

interface Props {
  src: string;
  name: string;
  onClose: () => void;
}

/**
 * The picture as big as the screen allows. Tapping anywhere closes it, and so
 * does the phone's Back button (Chrome closes modal dialogs on Back).
 */
export function PhotoViewer({ src, name, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="viewer"
      aria-label={`Picture of ${name}`}
      onClose={onClose}
      onClick={() => {
        dialog.current?.close();
        onClose(); // Don't wait for the close event, which arrives on the next repaint.
      }}
    >
      <img className="viewer__img" src={src} alt={`Picture of ${name}`} referrerPolicy="no-referrer" />
      <p className="viewer__name">{name}</p>
      <button type="button" className="btn btn--primary" autoFocus>
        Close
      </button>
    </dialog>
  );
}
