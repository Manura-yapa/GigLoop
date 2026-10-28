import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    () => localStorage.getItem('token') || ''
  );
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  }, []);

  const saveUser = useCallback((nextUser) => {
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  // Clear the session when a protected request reports an invalid token.
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const requestToken =
          error.config?.headers?.['x-auth-token'];

        const isLoginRequest =
          error.config?.url === '/auth/login' ||
          error.config?.url === '/auth/register';

        if (
          error.response?.status === 401 &&
          !isLoginRequest &&
          requestToken &&
          requestToken === localStorage.getItem('token')
        ) {
          logout();
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  // Restore the session when the application first opens.
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const storedToken = localStorage.getItem('token');

      if (!storedToken) {
        logout();
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');

        if (!cancelled) {
          saveUser(response.data.user);
          setToken(storedToken);
        }
      } catch (error) {
        if (cancelled) return;

        const status = error.response?.status;

        if (status === 401 || status === 403) {
          logout();
        } else {
          // A temporary network/server failure does not erase the token.
          setSessionError(
            'Unable to check your session. Check that the backend is running, then retry.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [logout, saveUser]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password
    });

    const nextToken = response.data.token;
    const nextUser = response.data.user;

    localStorage.setItem('token', nextToken);
    setToken(nextToken);
    saveUser(nextUser);

    return nextUser;
  };

  const register = async (formData) => {
    const response = await api.post('/auth/register', formData);
    return response.data;
  };

  const switchRole = async (targetRole) => {
    const response = await api.put('/auth/switch-role', {
      targetRole
    });

    saveUser(response.data.user);
    return response.data.user;
  };

  const updateProfile = async (profileData) => {
    const response = await api.put('/auth/profile', profileData);

    saveUser(response.data.user);
    return response.data;
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-600">
        Checking your session...
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <p className="mb-4 text-red-600">{sessionError}</p>

        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        switchRole,
        updateProfile,
        isStudent: user?.userType === 'student',
        isAdmin: user?.role === 'admin',
        isFreelancerMode: user?.activeRole === 'freelancer',
        isCustomerMode: user?.activeRole === 'customer'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// This module intentionally exports the provider and its matching hook.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}