import { useState, useEffect } from 'react';
import { getSession, type SessionData } from '../lib/auth';
import { applyTheme } from '../lib/theme';

export const useSession = () => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = getSession();
    if (data) {
      setSession(data);
      applyTheme(data.tema);
    }
    setLoading(false);
  }, []);

  return { session, loading };
};
