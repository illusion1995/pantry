import type { User } from 'firebase/auth';
import { useState } from 'react';
import { createPantry, userEmail } from '../data/pantries';
import { signOut } from '../session';

/** Signed in, but not part of any pantry yet. */
export function SetupScreen({ user }: { user: User }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const email = userEmail(user);

  async function start() {
    setBusy(true);
    setError('');
    try {
      await createPantry(user);
      // The session notices the new pantry and opens it.
    } catch (e) {
      console.error(e);
      setError('The pantry couldn’t be created. Check the internet connection and try again.');
      setBusy(false);
    }
  }

  return (
    <main className="screen home">
      <h1 className="home__title">Pantry</h1>
      <div className="stack">
        <p className="lead">
          You’re signed in as <strong className="nowrap-email">{email}</strong>.
        </p>
        <p>
          If someone in your family already uses this app, ask them to add this email in “Share this pantry.” Your
          pantry will open here on its own.
        </p>
        <p>Or start a new pantry of your own:</p>
        <button type="button" className="btn btn--primary" onClick={start} disabled={busy}>
          Start a new pantry
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="link-btn" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </main>
  );
}
