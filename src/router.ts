import { useEffect, useState } from 'react';

/**
 * Tiny hash router. Using the URL hash means the phone's Back button moves
 * between screens instead of closing the app, and it works on any static host.
 */
export type Route =
  | { name: 'home' }
  | { name: 'scan' }
  | { name: 'add-by-name' }
  | { name: 'pantry' }
  | { name: 'need' }
  | { name: 'item'; id: string }
  | { name: 'restock'; id: string }
  | { name: 'backup' }
  | { name: 'share' };

export function parseRoute(hash: string): Route {
  const [, first = '', second = ''] = hash.replace(/^#/, '').split('/');
  switch (first) {
    case 'scan':
      return { name: 'scan' };
    case 'add':
      return { name: 'add-by-name' };
    case 'pantry':
      return { name: 'pantry' };
    case 'need':
      return { name: 'need' };
    case 'item':
      return second ? { name: 'item', id: decodeURIComponent(second) } : { name: 'home' };
    case 'restock':
      return second ? { name: 'restock', id: decodeURIComponent(second) } : { name: 'home' };
    case 'backup':
      return { name: 'backup' };
    case 'share':
      return { name: 'share' };
    default:
      return { name: 'home' };
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

// True once we've moved between screens, so "Back" can safely use browser history.
let navigatedInApp = false;
window.addEventListener('hashchange', () => {
  navigatedInApp = true;
});

export function go(path: string) {
  location.hash = path;
}

/** Switches screens without adding a history entry, so Back skips the current screen. */
export function goInstead(path: string) {
  location.replace(`#${path}`);
}

/** Goes to the previous screen, or home if the app was opened straight onto this one. */
export function back() {
  if (navigatedInApp && history.length > 1) history.back();
  else location.replace('#/');
}
