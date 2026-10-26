import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
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