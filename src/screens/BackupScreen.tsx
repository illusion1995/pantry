import { useRef, useState } from 'react';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { downloadBackup, lastBackupDate, readBackup, restoreBackup } from '../data/backup';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });

export function BackupScreen() {
  const showToast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [lastBackup, setLastBackup] = useState(lastBackupDate);
  const [error, setError] = useState('');

  async function save() {
    const count = await downloadBackup();
    setLastBackup(lastBackupDate());
    showToast({ message: `Backup saved with ${count} ${count === 1 ? 'item' : 'items'}. It’s in your Downloads.` });
  }

  async function restore(file: File) {
    setError('');
    try {
      const { items, exportedAt } = await readBackup(file);
      const ok = window.confirm(
        `Replace everything in your pantry with the backup from ${dateFormat.format(exportedAt)}? ` +
          `It has ${items.length} ${items.length === 1 ? 'item' : 'items'}.`,
      );
      if (!ok) return;
      await restoreBackup(items);
      showToast({ message: 'Backup restored.' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That backup couldn’t be restored.');
    }
  }

  return (
    <Screen title="Back up">
      <section className="stack">
        <p>
          Your pantry is saved online, so it’s safe even if a phone is lost. A backup file is extra protection, for
          example before making big changes.
        </p>
        <p className="muted">
          {lastBackup ? `Last backup: ${dateFormat.format(lastBackup)}` : 'You haven’t saved a backup yet.'}
        </p>
        <button type="button" className="btn btn--primary" onClick={save}>
          Save a backup
        </button>
      </section>

      <section className="stack section-gap">
        <h2 className="section-title">Restore a backup</h2>
        <p>This replaces everything in the pantry with what’s in the backup file.</p>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void restore(file);
          }}
        />
        <button type="button" className="btn btn--outline" onClick={() => fileInput.current?.click()}>
          Choose a backup file
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
    </Screen>
  );
}
