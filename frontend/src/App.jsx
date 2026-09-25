import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Feed from './pages/Feed'; // 1. Add this import

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <nav className="p-4 bg-blue-600 text-white flex justify-between items-center shadow-md">
          <Link to="/" className="text-xl font-bold tracking-wide">GigLoop</Link>
          <div className="space-x-4 font-semibold text-sm">
            <Link to="/login" className="hover:text-blue-200 transition">Login</Link>
            <Link to="/register" className="hover:text-blue-200 transition">Register</Link>
          </div>
        </nav>
        <main className="p-4">
          <Routes>
            <Route path="/" element={<Feed />} /> {/* 2. Replace the old <h2> here */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;