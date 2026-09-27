import { useEffect, useId, useState } from 'react';
import { MinusIcon, PlusIcon } from './icons';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

/** Big − [n] + control. The number can also be typed. */
export function QuantityPicker({ label, value, onChange, min = 1, max = 999 }: Props) {
  const id = useId();
  const [text, setText] = useState(String(value));

  useEffect(() => setText(String(value)), [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div className="qty">
      <label className="qty__label" htmlFor={id}>
        {label}
      </label>
      <div className="qty__row">
        <button
          type="button"
          className="round-btn"
          aria-label="One less"
          disabled={value <= min}
          onClick={() => onChange(clamp(value - 1))}
        >
          <MinusIcon />
        </button>
        <input
          id={id}
          className="qty__input tag"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={text}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
            setText(digits);
            if (digits) onChange(clamp(parseInt(digits, 10)));
          }}
          onBlur={() => setText(String(value))}
        />
        <button
          type="button"
          className="round-btn"
          aria-label="One more"
          disabled={value >= max}
          onClick={() => onChange(clamp(value + 1))}
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}
