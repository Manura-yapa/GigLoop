import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="p-4 bg-blue-600 text-white font-bold flex justify-between items-center">
          <Link to="/" className="text-xl">GigLoop</Link>
          <div className="space-x-4">
            <Link to="/login" className="hover:underline">Login</Link>
            <Link to="/register" className="hover:underline">Register</Link>
          </div>
        </nav>
        <main className="p-4">
          <Routes>
            <Route path="/" element={<h2 className="text-center mt-10 text-xl">Welcome to GigLoop feed</h2>} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;