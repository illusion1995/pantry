import { useId, useState, type FormEvent } from 'react';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { addMember, normalizeEmail, removeMember, userEmail } from '../data/pantries';
import { signOut, useSession } from '../session';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Who can use this pantry, plus sign out. */
export function ShareScreen() {
  const { user, pantry } = useSession();
  const showToast = useToast();
  const inputId = useId();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const me = userEmail(user);
  const others = pantry.memberEmails.filter((m) => m !== me).sort();

  function add(event: FormEvent) {
    event.preventDefault();
    const next = normalizeEmail(email);
    if (!EMAIL.test(next)) {
      setError('Type a full email address, like name@gmail.com.');
      return;
    }
    if (pantry.memberEmails.includes(next)) {
      setError('That person can already use this pantry.');
      return;
    }
    addMember(pantry.id, next).catch((e) => {
      console.error(e);
      showToast({ message: `${next} couldn’t be added. Try again.` });
    });
    setEmail('');
    showToast({ message: `Added ${next}.` });
  }

  function remove(member: string) {
    if (!window.confirm(`Stop sharing this pantry with ${member}?`)) return;
    removeMember(pantry.id, member).catch((e) => {
      console.error(e);
      showToast({ message: `${member} couldn’t be removed. Try again.` });
    });
  }

  return (
    <Screen title="Share this pantry">
      <section className="stack">
        <p>Everyone here sees the same pantry and Need to buy list. Changes show up on every phone.</p>
        <ul className="people">
          <li className="people__row">
            <span className="people__email">{me}</span>
            <span className="muted">You</span>
          </li>
          {others.map((member) => (
            <li key={member} className="people__row">
              <span className="people__email">{member}</span>
              <button type="button" className="btn btn--outline btn--compact" onClick={() => remove(member)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <form className="stack section-gap" onSubmit={add} noValidate>
        <h2 className="section-title">Add someone</h2>
        <div className="field">
          <label htmlFor={inputId}>Their Google email</label>
          <input
            id={inputId}
            className="text-input"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            aria-invalid={Boolean(error)}
          />
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary">
          Add person
        </button>
        <p className="muted">They open this app, tap Sign in with Google, and this pantry opens for them.</p>
      </form>

      <section className="stack section-gap">
        <h2 className="section-title">Your account</h2>
        <p>
          Signed in as <strong className="nowrap-email">{me}</strong>
        </p>
        <button type="button" className="btn btn--outline" onClick={() => void signOut()}>
          Sign out
        </button>
      </section>
    </Screen>
  );
}
