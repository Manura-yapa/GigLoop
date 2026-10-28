import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await login(formData.email, formData.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.error || 'Login failed. Please try again.'
      );
    }
  };

  return (
  <div className="mx-auto max-w-md py-4 sm:py-10">
    <div className="mb-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
        Welcome to GigLoop
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">
        Good to see you again.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Log in to manage your gigs, proposals, and conversations.
      </p>
    </div>

    <div className="ui-card ui-form-card">
      {error && (
        <p role="alert" className="ui-error mb-5">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="login-email"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email address
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            value={formData.email}
            onChange={(event) =>
              setFormData({
                ...formData,
                email: event.target.value,
              })
            }
            className="ui-field"
            required
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(event) =>
              setFormData({
                ...formData,
                password: event.target.value,
              })
            }
            className="ui-field"
            required
          />
        </div>

        <button
          type="submit"
          className="ui-button ui-button-primary w-full"
        >
          Log in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to GigLoop?{' '}
        <Link
          to="/register"
          className="font-semibold text-indigo-700 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  </div>
);
}