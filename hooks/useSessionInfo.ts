import { useMemo } from 'react';
import { AuthSession, UserRole } from '../types';

export const useSessionInfo = (session: AuthSession | null) => {
  return useMemo(() => {
    const role = session?.user.role ?? UserRole.GUEST;
    const token = session?.token ?? '';
    return { role, token };
  }, [session]);
};

