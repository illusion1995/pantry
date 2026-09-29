import { useId, useRef, useState, type FormEvent } from 'react';
import { AmountStep } from '../components/AmountStep';
import { DoneStep } from '../components/DoneStep';
import { Screen } from '../components/Screen';
import { normalizeBarcode, store } from '../data/pantry';
import type { PantryItem, ProductInfo } from '../data/types';
import { lookupBarcode } from '../lookup/productLookup';
import { languageName } from '../lookup/translate';
import { back, goInstead } from '../router';
import { BarcodeScanner } from '../scanner/BarcodeScanner';

/** Why the product step needs a word of explanation, if it does. */
type Notice =
  | { kind: 'translated'; language: string; original: string }
  | { kind: 'not-found'; barcode: string }
  | { kind: 'offline' };

type Step =
  | { step: 'camera' }
  | { step: 'type-code' }
  | { step: 'looking-up'; barcode: string }
  | { step: 'amount'; existing: PantryItem }
  | { step: 'amount'; product: ProductInfo; notice?: Notice }
  | { step: 'done'; item: PantryItem; added: number };

export function ScanScreen() {
  const [state, setState] = useState<Step>({ step: 'camera' });
  // Bumped whenever the flow restarts, so a slow lookup can't overwrite a newer step.
  const scanId = useRef(0);

  async function handleBarcode(raw: string) {
    const id = ++scanId.current;
    const barcode = normalizeBarcode(raw);
    setState({ step: 'looking-up', barcode });

    const existing = await store.getByBarcode(barcode);
    if (id !== scanId.current) return;
    if (existing) {
      setState({ step: 'amount', existing });
      return;
    }

    const result = await lookupBarcode(barcode);
    if (id !== scanId.current) return;
    if (result.kind === 'found') {
      const notice = result.translatedFrom && ({ kind: 'translated', ...result.translatedFrom } as const);
      setState({ step: 'amount', product: result.product, notice });
    } else {
      setState({
        step: 'amount',
        product: { barcode, name: '' },
        notice: result.kind === 'offline' ? { kind: 'offline' } : { kind: 'not-found', barcode },
      });
    }
  }

  const restart = () => {
    scanId.current++;
    setState({ step: 'camera' });
  };
  // Back from a later step returns to the camera; from the camera it leaves the screen.
  const onBack = state.step === 'camera' || state.step === 'done' ? back : restart;

  return (
    <Screen title="Scan item" onBack={onBack}>
      {state.step === 'camera' && (
        <div className="stack">
          <BarcodeScanner onDetected={handleBarcode} />
          <button type="button" className="btn btn--outline" onClick={() => goInstead('/add')}>
            No barcode? Type the name
          </button>
          <button type="button" className="link-btn" onClick={() => setState({ step: 'type-code' })}>
            Type the barcode numbers instead
          </button>
        </div>
      )}

      {state.step === 'type-code' && <TypeBarcode onSubmit={handleBarcode} />}

      {state.step === 'looking-up' && (
        <p className="loading" role="status">
          Looking up {state.barcode}…
        </p>
      )}

      {state.step === 'amount' && (
        <AmountStep
          target={'existing' in state ? { kind: 'existing', item: state.existing } : { kind: 'new', product: state.product }}
          note={'notice' in state && state.notice ? <NoticeText notice={state.notice} /> : undefined}
          onAdded={(item, added) => setState({ step: 'done', item, added })}
        />
      )}

      {state.step === 'done' && (
        <DoneStep item={state.item} added={state.added} againLabel="Scan another item" onAgain={restart} />
      )}
    </Screen>
  );
}

function NoticeText({ notice }: { notice: Notice }) {
  switch (notice.kind) {
    case 'translated':
      return (
        <p>
          Translated from {languageName(notice.language)}. The package says “{notice.original}”.
        </p>
      );
    case 'offline':
      return <p>There’s no internet right now, so the name can’t be looked up. Type what it is.</p>;
    case 'not-found':
      return (
        <>
          <p>This barcode isn’t in the product lists. Type what it is. The app will remember it next time.</p>
          <a
            className="link-btn"
            href={`https://www.google.com/search?q=${encodeURIComponent(notice.barcode)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Search the web for this barcode
          </a>
        </>
      );
  }
}

function TypeBarcode({ onSubmit }: { onSubmit: (code: string) => void }) {
  const id = useId();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const digits = code.replace(/\D/g, '');
    if (digits.length < 6) {
      setError('Type all the numbers under the barcode.');
      return;
    }
    onSubmit(digits);
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor={id}>Numbers under the barcode</label>
        <input
          id={id}
          className="text-input text-input--digits"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
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
        Look it up
      </button>
    </form>
  );
}
