// Photos are stored inside the pantry item (Firebase Storage needs a paid
// plan), so shrink them from several MB to roughly 20–50 KB: big enough to
// recognize a package, small enough to sync quickly on mobile data.
const MAX_SIDE = 480;
// Firestore allows 1 MB per item; stay far below it.
const MAX_LENGTH = 300_000;

/** Turns a camera or gallery file into a small image data URL. Throws if it can't be read. */
export async function shrinkPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode(); // Applies the photo's rotation, so sideways shots come out upright.

    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available');
    context.fillStyle = '#fff'; // Transparent images get a white background, not black.
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.72, 0.55, 0.4]) {
      let data = canvas.toDataURL('image/webp', quality);
      if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg', quality);
      if (data.length <= MAX_LENGTH) return data;
    }
    throw new Error('Photo is still too large after shrinking');
  } finally {
    URL.revokeObjectURL(url);
  }
}
