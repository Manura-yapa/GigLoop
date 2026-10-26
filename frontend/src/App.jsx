import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Register from './pages/Register';
import Login from './pages/Login';
import Feed from './pages/Feed';
import Navbar from './components/Navbar';
import PostGig from './pages/PostGig';

import Dashboard from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          <Navbar />

          <main className="p-4">
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Feed />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-gig"
                element={
                  <ProtectedRoute>
                    <PostGig />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;