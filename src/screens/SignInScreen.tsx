import { signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
import { auth, googleProvider } from '../firebase';

export function SignInScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signIn() {
    setBusy(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError(signInErrorMessage((e as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen home">
      <h1 className="home__title">Pantry</h1>
      <div className="stack">
        <p className="lead">Sign in with your Google account to open your pantry.</p>
        <button type="button" className="btn btn--primary btn--tall" onClick={signIn} disabled={busy}>
          Sign in with Google
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

function signInErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/popup-blocked':
      return 'The sign-in window was blocked. Allow pop-ups for this site, then try again.';
    case 'auth/network-request-failed':
      return 'There’s no internet connection. Connect, then try again.';
    case 'auth/unauthorized-domain':
      return 'This web address isn’t allowed to sign in yet. Add it in Firebase under Authentication → Settings → Authorized domains.';
    default:
      return 'Sign-in didn’t work. Try again.';
  }
}
