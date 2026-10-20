import React, { createContext, useContext, useEffect, useState } from 'react';

export interface RouteState {
  path: string;
  params: Record<string, string>;
}

interface RouterContextType {
  route: RouteState;
  path: string;
  navigate: (path: string) => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

function parsePath(pathname: string): RouteState {
  const cleanPath = pathname || '/';
  
  const tableMatch = cleanPath.match(/^\/table\/(\d+)/);
  if (tableMatch) {
    return {
      path: cleanPath,
      params: { tableId: tableMatch[1] },
    };
  }

  return {
    path: cleanPath,
    params: {},
  };
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<RouteState>(() => {
    if (typeof window !== 'undefined') {
      return parsePath(window.location.pathname);
    }
    return { path: '/', params: {} };
  });

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parsePath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setRoute(parsePath(path));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <RouterContext.Provider value={{ route, path: route.path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
