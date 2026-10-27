import { useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, switchRole } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState('');

  const switchingRef = useRef(false);
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    closeMenu();
    setSwitchError('');
    logout();
    navigate('/login', { replace: true });
  };

  const handleSwitchRole = async () => {
    if (switchingRef.current || !user?.canSwitchRole) return;

    const targetRole =
      user.activeRole === 'freelancer' ? 'customer' : 'freelancer';

    switchingRef.current = true;
    setSwitching(true);
    setSwitchError('');

    try {
      await switchRole(targetRole);
    } catch (err) {
      setSwitchError(
        err.response?.data?.error || 'Unable to switch mode.'
      );
    } finally {
      switchingRef.current = false;
      setSwitching(false);
    }
  };

  const linkClass = ({ isActive }) =>
    `nav-link ${isActive ? 'nav-link-active' : ''}`;

  const modeLabel =
    user?.activeRole === 'freelancer'
      ? 'Freelancer mode'
      : user?.activeRole === 'customer'
        ? 'Customer mode'
        : 'Admin mode';

  return (
    <header className="glass-panel sticky top-0 z-40 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 py-3">
          <Link
            to="/"
            onClick={closeMenu}
            className="flex shrink-0 items-center gap-3 rounded-lg"
          >
            <span
              aria-hidden="true"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-xl text-white shadow-md shadow-indigo-100"
            >
              🎓
            </span>

            <span className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                GigLoop
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Campus freelance
              </span>
            </span>
          </Link>

          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen((previous) => !previous)}
            className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            {menuOpen ? 'Close menu' : 'Menu'}
          </button>

          <nav
            id="main-navigation"
            aria-label="Main navigation"
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeMenu();
            }}
            className={`${
              menuOpen ? 'flex' : 'hidden'
            } w-full flex-col gap-1 border-t border-slate-100 pt-3 lg:flex lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:border-0 lg:pt-0`}
          >
            {user ? (
              <>
                <NavLink
                  to="/"
                  end
                  onClick={closeMenu}
                  className={linkClass}
                >
                  Explore gigs
                </NavLink>

                <NavLink
                  to="/post-gig"
                  onClick={closeMenu}
                  className={linkClass}
                >
                  + Post a gig
                </NavLink>

                <NavLink
                  to="/dashboard"
                  onClick={closeMenu}
                  className={linkClass}
                >
                  My activity
                </NavLink>

                <NavLink
                  to="/profile"
                  onClick={closeMenu}
                  className={linkClass}
                >
                  My profile
                </NavLink>

                {user.role === 'admin' && (
                  <NavLink
                    to="/admin"
                    onClick={closeMenu}
                    className={linkClass}
                  >
                    Admin dashboard
                  </NavLink>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={switching}
                  className="min-h-11 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 lg:ml-2"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={closeMenu}
                  className={linkClass}
                >
                  Log in
                </NavLink>

                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>

        {user && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="max-w-52 truncate text-sm font-semibold text-slate-700">
                Hello, {user.name?.split(' ')[0] || 'there'}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  user.role === 'admin'
                    ? 'border-purple-200 bg-purple-50 text-purple-700'
                    : user.activeRole === 'freelancer'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                }`}
              >
                {user.role === 'admin'
                  ? `Administrator · ${modeLabel}`
                  : user.userType === 'client'
                    ? 'Public client'
                    : modeLabel}
              </span>
            </div>

            {user.canSwitchRole && (
              <button
                type="button"
                onClick={handleSwitchRole}
                disabled={switching}
                className="min-h-11 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
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
              <p
                role="alert"
                className="w-full rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {switchError}
              </p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}