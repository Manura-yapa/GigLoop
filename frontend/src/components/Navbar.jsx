import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout, switchRole } = useAuth();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState('');
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSwitchRole = async () => {
    const targetRole =
      user.activeRole === 'freelancer' ? 'customer' : 'freelancer';

    setSwitching(true);
    setSwitchError('');

    try {
      await switchRole(targetRole);
    } catch (err) {
      setSwitchError(
        err.response?.data?.error || 'Unable to switch mode.'
      );
    } finally {
      setSwitching(false);
    }
  };

  return (
    <nav className="p-4 bg-blue-600 text-white shadow-md">
      <div className="max-w-5xl mx-auto flex flex-wrap justify-between items-center gap-4">
        <Link to="/" className="text-2xl font-bold tracking-wide">
          GigLoop
        </Link>

        <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
          {user ? (
            <>
              <span className="text-blue-100">
                Hello, {user.name?.split(' ')[0]}
              </span>

              <Link to="/" className="hover:text-blue-200">
                Feed
              </Link>

              <Link to="/post-gig" className="hover:text-blue-200">
                Post Gig
              </Link>

              <Link to="/dashboard" className="hover:underline">
                Dashboard
              </Link>

              <span className="text-blue-100 capitalize">
                {user.activeRole} mode
              </span>

              {user.canSwitchRole && (
                <button
                  onClick={handleSwitchRole}
                  disabled={switching}
                  className="bg-white text-blue-700 px-3 py-2 rounded hover:bg-blue-50 disabled:opacity-50"
                >
                  {switching
                    ? 'Switching...'
                    : `Switch to ${
                        user.activeRole === 'freelancer'
                          ? 'Customer'
                          : 'Freelancer'
                      }`}
                </button>
              )}

              {switchError && (
                <span role="alert" className="text-yellow-200">
                  {switchError}
                </span>
              )}

              <button
                onClick={handleLogout}
                className="bg-blue-700 px-4 py-2 rounded hover:bg-blue-800"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-blue-200">
                Login
              </Link>

              <Link
                to="/register"
                className="bg-white text-blue-600 px-4 py-2 rounded"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}