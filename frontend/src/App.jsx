import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="p-4 bg-blue-600 text-white font-bold text-xl">
          GigLoop
        </nav>
        <main className="p-4">
          <Routes>
            <Route path="/" element={<h2>Welcome to GigLoop feed</h2>} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<h2>Login Page</h2>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;