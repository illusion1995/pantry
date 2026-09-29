import { useId } from 'react';
import { SECTION_NAMES, SECTIONS } from '../data/pantry';
import type { Section } from '../data/types';
import { FoodIcon, HouseholdIcon } from './icons';

const ICONS: Record<Section, typeof FoodIcon> = { food: FoodIcon, household: HouseholdIcon };

/** "Where does it go?" with two big buttons: Food or Household. */
export function SectionPicker({
  value,
  onChange,
  invalid,
}: {
  value?: Section;
  onChange: (section: Section) => void;
  invalid?: boolean;
}) {
  const labelId = useId();
  return (
    <div className="field">
      <span id={labelId} className="field__label">
        Where does it go?
      </span>
      <div className={invalid ? 'choice choice--invalid' : 'choice'} role="radiogroup" aria-labelledby={labelId}>
        {SECTIONS.map((section) => {
          const SectionIcon = ICONS[section];
          return (
            <button
              key={section}
              type="button"
              role="radio"
              aria-checked={value === section}
              className="choice__option"
              onClick={() => onChange(section)}
            >
              <SectionIcon />
              {SECTION_NAMES[section]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Food | Household tabs at the top of My pantry. */
export function SectionTabs({ value, onChange }: { value: Section; onChange: (section: Section) => void }) {
  return (
    <div className="tabs" role="tablist" aria-label="Show">
      {SECTIONS.map((section) => {
        const SectionIcon = ICONS[section];
        return (
          <button
            key={section}
            type="button"
            role="tab"
            aria-selected={value === section}
            className="tabs__tab"
            onClick={() => onChange(section)}
          >
            <SectionIcon />
            {SECTION_NAMES[section]}
          </button>
        );
      })}
    </div>
  );
}
