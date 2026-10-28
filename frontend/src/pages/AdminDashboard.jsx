import { useEffect, useRef, useState } from 'react';
import api from '../utils/api';

const buttonClass = 'ui-button ui-button-secondary';
const dangerClass = 'ui-button ui-button-danger';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [gigs, setGigs] = useState([]);

  const [activeTab, setActiveTab] = useState('users');
  const [search, setSearch] = useState('');
  const [userType, setUserType] = useState('all');

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const actionRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const [statsResponse, usersResponse, gigsResponse] =
          await Promise.all([
            api.get('/admin/stats', { signal: controller.signal }),
            api.get('/admin/users', { signal: controller.signal }),
            api.get('/admin/gigs', { signal: controller.signal }),
          ]);

        if (!controller.signal.aborted) {
          setStats(statsResponse.data);
          setUsers(usersResponse.data);
          setGigs(gigsResponse.data);
          setError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          // Hide outdated moderation controls after a failed refresh.
          setStats(null);
          setUsers([]);
          setGigs([]);
          setError(
            err.response?.data?.error || 'Failed to load the admin dashboard.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [reloadKey]);

  const refresh = () => {
    setLoading(true);
    setError('');
    setReloadKey((value) => value + 1);
  };

  const runAction = async (question, request, successMessage) => {
    if (actionRef.current || loading) return;
    if (!window.confirm(question)) return;

    actionRef.current = true;
    setBusy(true);
    setError('');
    setNotice('');

    try {
      await request();
      setNotice(successMessage);
      refresh();
    } catch (err) {
      setError(
        err.response?.data?.error || 'The action failed. Please try again.'
      );
    } finally {
      actionRef.current = false;
      setBusy(false);
    }
  };

  const changeSuspension = (account) => {
    const isBanned = !account.isBanned;

    runAction(
      `${isBanned ? 'Suspend' : 'Reactivate'} ${account.name}?`,
      () => api.put(`/admin/users/${account._id}/ban`, { isBanned }),
      isBanned ? 'Account suspended.' : 'Account reactivated.'
    );
  };

  const changeVerification = (account) => {
    const isVerifiedStudent = !account.isVerifiedStudent;

    const question = isVerifiedStudent
      ? `Have you checked ${account.name}'s student evidence and want to mark this account verified?`
      : `Remove student verification for ${account.name}?`;

    runAction(
      question,
      () =>
        api.put(`/admin/users/${account._id}/verify-student`, {
          isVerifiedStudent,
        }),
      isVerifiedStudent
        ? 'Student verification recorded.'
        : 'Student verification removed.'
    );
  };

  const cancelGig = (gig) => {
    runAction(
      `Cancel "${gig.title}"? Pending proposals will be rejected.`,
      () => api.put(`/gigs/${gig._id}/status`, { status: 'cancelled' }),
      'Gig cancelled.'
    );
  };

  const deleteGig = (gig) => {
    runAction(
      `Permanently delete "${gig.title}" and its applications? Existing reviews will remain as account history.`,
      () => api.delete(`/gigs/${gig._id}`),
      'Gig deleted.'
    );
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredUsers = users.filter((account) => {
    const matchesType =
      userType === 'all' || account.userType === userType;

    const matchesSearch = [
      account.name,
      account.email,
      account.faculty,
      account.studentId,
    ].some((value) =>
      String(value || '').toLowerCase().includes(normalizedSearch)
    );

    return matchesType && matchesSearch;
  });

  const disabled = loading || busy;

  const metrics = stats
    ? [
        ['Total accounts', stats.totalUsers],
        ['Students', stats.studentUsers],
        ['Public clients', stats.clientUsers],
        ['Administrators', stats.adminUsers],
        ['Suspended accounts', stats.bannedUsers],
        ['Total gigs', stats.totalGigs],
        ['Open gigs', stats.openGigs],
        ['In progress', stats.inProgressGigs],
        ['Completed gigs', stats.completedGigs],
        ['Cancelled gigs', stats.cancelledGigs],
        ['Applications', stats.totalApplications],
        ['Reviews', stats.totalReviews],
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            Platform Administration
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Admin dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor activity, moderate user accounts, and oversee gig listings.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={disabled}
          className="ui-button ui-button-secondary"
        >
          Refresh data
        </button>
      </header>

      {notice && (
        <p role="status" className="ui-notice">
          {notice}
        </p>
      )}

      {error && (
        <div role="alert" className="ui-error">
          <p>{error}</p>
          <button
            type="button"
            onClick={refresh}
            disabled={disabled}
            className="mt-2 font-semibold underline disabled:opacity-50"
          >
            Reload dashboard
          </button>
        </div>
      )}

      {loading ? (
        <div className="ui-card p-8 text-center text-slate-600">
          Loading admin dashboard...
        </div>
      ) : stats ? (
        <>
          <section aria-label="Platform statistics" className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Overview metrics</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {metrics.map(([label, value]) => (
                <div key={label} className="ui-card p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {Number(value || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="ui-card p-5 bg-gradient-to-r from-indigo-900 to-blue-900 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
                Total posted gig budgets
              </p>
              <p className="mt-2 text-3xl font-bold text-white">
                LKR {Number(stats.totalBudgetVolume || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-indigo-200">
                Sum of all listed gig budgets across the campus platform.
              </p>
            </div>
          </section>

          <div className="flex gap-2 border-b border-slate-200 pb-2" aria-label="Dashboard sections">
            <button
              type="button"
              aria-pressed={activeTab === 'users'}
              onClick={() => setActiveTab('users')}
              className={`ui-button ${
                activeTab === 'users'
                  ? 'ui-button-primary'
                  : 'ui-button-secondary'
              }`}
            >
              Accounts ({users.length})
            </button>

            <button
              type="button"
              aria-pressed={activeTab === 'gigs'}
              onClick={() => setActiveTab('gigs')}
              className={`ui-button ${
                activeTab === 'gigs'
                  ? 'ui-button-primary'
                  : 'ui-button-secondary'
              }`}
            >
              Gigs ({gigs.length})
            </button>
          </div>

          {activeTab === 'users' ? (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Account moderation</h2>

              <div className="ui-card p-4 sm:p-5 flex flex-wrap gap-4 items-center">
                <div className="min-w-0 flex-1">
                  <label htmlFor="admin-search-users" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Search accounts
                  </label>
                  <input
                    id="admin-search-users"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name, email, faculty, or student ID..."
                    className="ui-field"
                  />
                </div>

                <div className="w-full sm:w-56">
                  <label htmlFor="admin-filter-type" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Account type
                  </label>
                  <select
                    id="admin-filter-type"
                    value={userType}
                    onChange={(event) => setUserType(event.target.value)}
                    className="ui-field"
                  >
                    <option value="all">All accounts</option>
                    <option value="student">Students</option>
                    <option value="client">Public clients</option>
                    <option value="admin">Administrators</option>
                  </select>
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="ui-card p-8 text-center text-slate-600">
                  No accounts match these filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((account) => (
                    <article
                      key={account._id}
                      className="ui-card space-y-3 p-5"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-3">
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-slate-900">{account.name}</h3>
                          <p className="break-words text-sm text-slate-500">
                            {account.email}
                          </p>
                        </div>

                        <span
                          className={account.isBanned ? 'ui-badge ui-badge-danger' : 'ui-badge ui-badge-success'}
                        >
                          {account.isBanned ? 'Suspended' : 'Active'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                        <p className="capitalize">
                          Type: <strong>{account.userType}</strong>
                        </p>
                        <p>Faculty: <strong>{account.faculty || 'Not provided'}</strong></p>
                        <p>
                          Rating:{' '}
                          <strong>
                            {account.reviewCount > 0
                              ? `${Number(account.rating).toFixed(1)}/5 (${account.reviewCount} reviews)`
                              : 'No reviews yet'}
                          </strong>
                        </p>

                        {account.userType === 'student' && (
                          <>
                            <p>
                              Student ID: <strong>{account.studentId || 'Not provided'}</strong>
                            </p>
                            <p>
                              Verification:{' '}
                              <span className={account.isVerifiedStudent ? 'font-semibold text-emerald-700' : 'text-slate-500'}>
                                {account.isVerifiedStudent
                                  ? 'Verified'
                                  : 'Not verified'}
                              </span>
                            </p>
                          </>
                        )}
                      </div>

                      {account.role !== 'admin' && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => changeSuspension(account)}
                            disabled={disabled}
                            className={
                              account.isBanned ? buttonClass : dangerClass
                            }
                          >
                            {account.isBanned ? 'Reactivate account' : 'Suspend account'}
                          </button>

                          {account.userType === 'student' && (
                            <button
                              type="button"
                              onClick={() => changeVerification(account)}
                              disabled={disabled}
                              className={buttonClass}
                            >
                              {account.isVerifiedStudent
                                ? 'Remove verification'
                                : 'Mark student verified'}
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Gig moderation</h2>

              {gigs.length === 0 ? (
                <div className="ui-card p-8 text-center text-slate-600">
                  No gigs have been posted.
                </div>
              ) : (
                <div className="space-y-4">
                  {gigs.map((gig) => (
                    <article
                      key={gig._id}
                      className="ui-card space-y-3 p-5 sm:p-6"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-3">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">{gig.title}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {gig.category} · LKR {Number(gig.budget).toLocaleString()}
                          </p>
                        </div>
                        <span className="ui-badge ui-badge-indigo capitalize">
                          {gig.status}
                        </span>
                      </div>

                      <p className="whitespace-pre-wrap break-words text-sm text-slate-600 leading-relaxed">
                        {gig.description}
                      </p>

                      <div className="space-y-1 text-sm text-slate-600 border-t border-slate-100 pt-3">
                        <p>
                          Posted by: <strong>{gig.posterId?.name || 'Unavailable account'}</strong> ({gig.posterId?.email || ''})
                        </p>

                        {gig.posterId?.isBanned && (
                          <p className="font-semibold text-rose-600">
                            Notice: The poster’s account is currently suspended.
                          </p>
                        )}

                        {gig.assignedFreelancer && (
                          <p>
                            Assigned freelancer: <strong>{gig.assignedFreelancer.name}</strong>
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                        {['open', 'in progress'].includes(gig.status) && (
                          <button
                            type="button"
                            onClick={() => cancelGig(gig)}
                            disabled={disabled}
                            className="ui-button ui-button-secondary"
                          >
                            Cancel gig
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteGig(gig)}
                          disabled={disabled}
                          className={dangerClass}
                        >
                          Delete gig
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}