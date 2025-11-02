import { useEffect, useState } from 'react';
import { getApiBase } from '../utils/api-config';

export function useAdminPath() {
  const [adminPath, setAdminPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    getApiBase()
      .then(apiBase => fetch(`${apiBase}/api/admin/path`))
      .then(res => res.json())
      .then(data => {
        setAdminPath(data.fullUrl);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch admin path:', err);
        setError(err);
        setLoading(false);
      });
  }, []);

  return { adminPath, loading, error };
}
