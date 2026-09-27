import type { SVGProps } from 'react';

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="icon"
      {...props}
    />
  );
}

export const BarcodeIcon = () => (
  <Icon>
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <path d="M7 8v8M10.5 8v8M13 8v8M17 8v8" />
  </Icon>
);

export const ShelfIcon = () => (
  <Icon>
    <path d="M3 3v18M21 3v18M3 11h18M3 20h18" />
    <rect x="6" y="5" width="4" height="6" rx="1" />
    <rect x="12.5" y="7" width="5" height="4" rx="1" />
    <rect x="6.5" y="15" width="6" height="5" rx="1" />
  </Icon>
);

export const CartIcon = () => (
  <Icon>
    <path d="M2.5 3h2.8l2.4 12.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2L21 7H6.1" />
    <circle cx="9.5" cy="20.5" r="1.2" />
    <circle cx="17.5" cy="20.5" r="1.2" />
  </Icon>
);

export const BackIcon = () => (
  <Icon>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);

export const MinusIcon = () => (
  <Icon strokeWidth={3}>
    <path d="M5 12h14" />
  </Icon>
);

export const PlusIcon = () => (
  <Icon strokeWidth={3}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const ShareIcon = () => (
  <Icon>
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
  </Icon>
);

export const LightIcon = () => (
  <Icon>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
  </Icon>
);

export const CheckIcon = () => (
  <Icon strokeWidth={3}>
    <path d="M4.5 12.5l5 5 10-11" />
  </Icon>
);

export const PencilIcon = () => (
  <Icon>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
  </Icon>
);
