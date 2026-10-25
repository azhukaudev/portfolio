import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string) {
  const subscribe = (onChange: () => void) => {
    const media = matchMedia(query);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  };

  return useSyncExternalStore(subscribe, () => matchMedia(query).matches);
}
