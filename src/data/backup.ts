import { store } from './pantry';
import type { PantryItem } from './types';

interface BackupFile {
  app: 'pantry';
  version: 1;
  exportedAt: string;
  items: PantryItem[];
}

const LAST_BACKUP_KEY = 'pantry:lastBackup';

/** Downloads every item as a JSON file. */
export async function downloadBackup(): Promise<number> {
  const items = await store.getAll();
  const backup: BackupFile = { app: 'pantry', version: 1, exportedAt: new Date().toISOString(), items };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pantry-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
  } catch {
    // Not being able to remember the date is fine.
  }
  return items.length;
}

export function lastBackupDate(): Date | null {
  try {
    const value = localStorage.getItem(LAST_BACKUP_KEY);
    return value ? new Date(Number(value)) : null;
  } catch {
    return null;
  }
}

/** Reads a backup file. Throws an Error with a plain-language message if it isn't one. */
export async function readBackup(file: File): Promise<{ items: PantryItem[]; exportedAt: Date }> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('That file isn’t a pantry backup.');
  }

  const backup = data as Partial<BackupFile>;
  if (backup?.app !== 'pantry' || !Array.isArray(backup.items)) {
    throw new Error('That file isn’t a pantry backup.');
  }
  if (backup.version !== 1) {
    throw new Error('That backup was made by a newer version of the app.');
  }

  const items = backup.items.filter(isItem);
  if (items.length !== backup.items.length) {
    throw new Error('That backup file is damaged, so it can’t be used.');
  }
  return { items, exportedAt: new Date(backup.exportedAt ?? 0) };
}

export function restoreBackup(items: PantryItem[]): Promise<void> {
  return store.replaceAll(items);
}

function isItem(value: unknown): value is PantryItem {
  const v = value as Partial<PantryItem>;
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    Number.isInteger(v.quantity) &&
    (v.quantity ?? -1) >= 0 &&
    (v.barcode === undefined || typeof v.barcode === 'string')
  );
}
