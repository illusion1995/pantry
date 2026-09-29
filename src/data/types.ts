export interface PantryItem {
  id: string;
  /** Missing for things added by name (produce, bulk bins, home-canned). */
  barcode?: string;
  name: string;
  brand?: string;
  /** Package size as printed, e.g. "14.5 oz". */
  size?: string;
  /** Picture from a product database. */
  imageUrl?: string;
  /**
   * A photo the user took or chose, shrunk and stored inline as a data URL
   * (Firebase Storage needs a paid plan). Shown instead of imageUrl.
   */
  photo?: string;
  /** Whole number. Zero means it belongs on the "Need to buy" list. */
  quantity: number;
  createdAt: number;
  updatedAt: number;
}

/** What we know about a product before it is in the pantry. */
export interface ProductInfo {
  barcode?: string;
  name: string;
  brand?: string;
  size?: string;
  imageUrl?: string;
  photo?: string;
}

export type ItemChanges = Partial<Pick<PantryItem, 'name' | 'brand' | 'size' | 'quantity'>> & {
  /** A new photo, or null to remove the user's photo. */
  photo?: string | null;
};
