// User Profile Component - displays current user info
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { LogOut, User as UserIcon, Mail } from 'lucide-react';

export default function UserProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-white/30 rounded-full p-3">
          <UserIcon size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{user.displayName || 'User'}</h3>
          <div className="flex items-center gap-1 text-sm opacity-80">
            <Mail size={14} />
            <span>{user.email}</span>
          </div>
        </div>
      </div>
      
      <button
        onClick={handleLogout}
        className="w-full bg-white/20 hover:bg-white/30 text-white rounded-lg py-2 px-4 flex items-center justify-center gap-2 transition-colors font-medium"
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </div>
  );
}
