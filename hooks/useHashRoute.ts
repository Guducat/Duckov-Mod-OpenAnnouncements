import { useCallback, useEffect, useState } from 'react';

export type AppRoute = 'announcements' | 'admin';

const parseHashRoute = (hash: string): AppRoute => {
  const raw = (hash || '').replace(/^#\/?/, '').trim();
  if (raw === 'admin') return 'admin';
  return 'announcements';
};

export const useHashRoute = () => {
  const [route, setRoute] = useState<AppRoute>(() => parseHashRoute(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(parseHashRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: AppRoute) => {
    const nextHash = next === 'admin' ? '#/admin' : '#/';
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, []);

  return { route, navigate };
};

