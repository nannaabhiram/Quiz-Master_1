import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router';
import AdminPanel from '../components/AdminPanel';
import { getApiBase } from '../utils/api-config';

export default function DynamicAdminRoute() {
  const { adminToken } = useParams();
  const [validToken, setValidToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Fetch the current admin path from backend
    getApiBase()
      .then(apiBase => fetch(`${apiBase}/api/admin/path`))
      .then(res => res.json())
      .then(data => {
        setValidToken(data.adminPath);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch admin path:', err);
        setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Error</h1>
          <p className="mt-2 text-gray-600">Unable to verify admin access</p>
        </div>
      </div>
    );
  }

  // Check if the provided token matches the valid token
  if (adminToken !== validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600">403</h1>
          <p className="mt-2 text-xl text-gray-700">Access Denied</p>
          <p className="mt-1 text-gray-500">Invalid admin path</p>
        </div>
      </div>
    );
  }

  // Valid token - render admin panel
  return <AdminPanel />;
}
