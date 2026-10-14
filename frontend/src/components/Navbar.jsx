import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login'; // Forces a hard redirect to clear state
  };

  return (
    <nav className="p-4 bg-blue-600 text-white shadow-md">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold tracking-wide">GigLoop</Link>
        
        <div className="space-x-6 font-semibold text-sm flex items-center">
          {token ? (
            <>
              <span className="text-blue-200">Hello, {user?.name?.split(' ')[0]}</span>
              <Link to="/" className="hover:text-blue-200 transition">Feed</Link>
              <button 
                onClick={handleLogout} 
                className="bg-blue-700 px-4 py-2 rounded hover:bg-blue-800 transition cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-blue-200 transition">Login</Link>
              <Link to="/register" className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100 transition">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}