import { useEffect, useRef, useState } from 'react';
import api from '../utils/api';

const buttonClass =
  'rounded border px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50';

const dangerClass =
  'rounded border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50';

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
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Admin dashboard</h1>
          <p className="text-sm text-gray-600">
            Monitor activity and manage accounts and gigs.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={disabled}
          className={buttonClass}
        >
          Refresh
        </button>
      </header>

      {notice && (
        <p
          role="status"
          className="rounded border border-green-200 bg-green-50 p-3 text-green-800"
        >
          {notice}
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-red-700"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={refresh}
            disabled={disabled}
            className="mt-2 underline disabled:opacity-50"
          >
            Reload dashboard
          </button>
        </div>
      )}

      {loading ? (
        <p role="status" className="text-gray-600">
          Loading admin dashboard...
        </p>
      ) : stats ? (
        <>
          <section aria-label="Platform statistics">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {metrics.map(([label, value]) => (
                <div key={label} className="rounded-lg border bg-white p-4">
                  <p className="text-sm text-gray-600">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {Number(value || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-600">
                Total posted gig budgets
              </p>
              <p className="text-xl font-semibold">
                LKR {Number(stats.totalBudgetVolume || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Sum of all listed gig budgets, including cancelled gigs.
                This does not represent payments or revenue.
              </p>
            </div>
          </section>

          <div className="flex gap-2" aria-label="Dashboard sections">
            <button
              type="button"
              aria-pressed={activeTab === 'users'}
              onClick={() => setActiveTab('users')}
              className={`${buttonClass} ${
                activeTab === 'users' ? 'bg-blue-50 font-semibold' : ''
              }`}
            >
              Accounts ({users.length})
            </button>

            <button
              type="button"
              aria-pressed={activeTab === 'gigs'}
              onClick={() => setActiveTab('gigs')}
              className={`${buttonClass} ${
                activeTab === 'gigs' ? 'bg-blue-50 font-semibold' : ''
              }`}
            >
              Gigs ({gigs.length})
            </button>
          </div>

          {activeTab === 'users' ? (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Account management</h2>

              <div className="flex flex-wrap gap-3">
                <label className="min-w-0 flex-1 text-sm">
                  Search accounts
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Name, email, faculty, or student ID"
                    className="mt-1 block w-full rounded border bg-white p-2"
                  />
                </label>

                <label className="text-sm">
                  Account type
                  <select
                    value={userType}
                    onChange={(event) => setUserType(event.target.value)}
                    className="mt-1 block rounded border bg-white p-2"
                  >
                    <option value="all">All accounts</option>
                    <option value="student">Students</option>
                    <option value="client">Public clients</option>
                    <option value="admin">Administrators</option>
                  </select>
                </label>
              </div>

              {filteredUsers.length === 0 ? (
                <p className="rounded border bg-white p-4 text-gray-600">
                  No accounts match these filters.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((account) => (
                    <article
                      key={account._id}
                      className="space-y-3 rounded-lg border bg-white p-4"
                    >
                      <div className="flex flex-wrap justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold">{account.name}</h3>
                          <p className="break-words text-sm text-gray-600">
                            {account.email}
                          </p>
                        </div>

                        <p
                          className={`text-sm font-medium ${
                            account.isBanned
                              ? 'text-red-700'
                              : 'text-green-700'
                          }`}
                        >
                          {account.isBanned ? 'Suspended' : 'Active'}
                        </p>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="capitalize">
                          Account type: {account.userType}
                        </p>
                        <p>Faculty: {account.faculty || 'Not provided'}</p>
                        <p>
                          Rating:{' '}
                          {account.reviewCount > 0
                            ? `${Number(account.rating).toFixed(1)}/5 (${account.reviewCount} reviews)`
                            : 'No reviews yet'}
                        </p>

                        {account.userType === 'student' && (
                          <>
                            <p>
                              Student ID: {account.studentId || 'Not provided'}
                            </p>
                            <p>
                              Verification:{' '}
                              {account.isVerifiedStudent
                                ? 'Verified'
                                : 'Not verified'}
                            </p>
                          </>
                        )}
                      </div>

                      {account.role !== 'admin' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => changeSuspension(account)}
                            disabled={disabled}
                            className={
                              account.isBanned ? buttonClass : dangerClass
                            }
                          >
                            {account.isBanned ? 'Reactivate' : 'Suspend'}
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
              <h2 className="text-xl font-semibold">Gig moderation</h2>

              {gigs.length === 0 ? (
                <p className="rounded border bg-white p-4 text-gray-600">
                  No gigs have been posted.
                </p>
              ) : (
                gigs.map((gig) => (
                  <article
                    key={gig._id}
                    className="space-y-3 rounded-lg border bg-white p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <h3 className="font-semibold">{gig.title}</h3>
                      <p className="text-sm font-medium capitalize">
                        {gig.status}
                      </p>
                    </div>

                    <p className="whitespace-pre-wrap break-words text-sm">
                      {gig.description}
                    </p>

                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        {gig.category} · LKR{' '}
                        {Number(gig.budget).toLocaleString()}
                      </p>
                      <p>
                        Posted by: {gig.posterId?.name || 'Unavailable account'}
                      </p>
                      <p className="break-words">
                        {gig.posterId?.email || ''}
                      </p>

                      {gig.posterId?.isBanned && (
                        <p className="text-red-700">
                          The poster’s account is suspended.
                        </p>
                      )}

                      {gig.assignedFreelancer && (
                        <p>
                          Assigned freelancer: {gig.assignedFreelancer.name}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {['open', 'in progress'].includes(gig.status) && (
                        <button
                          type="button"
                          onClick={() => cancelGig(gig)}
                          disabled={disabled}
                          className={buttonClass}
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
                ))
              )}
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}