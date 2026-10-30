import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
// import io from 'socket.io-client';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Chat from '../components/Chat';
import ApplicationModal from '../components/ApplicationModal';
import EditGigModal from '../components/EditGigModal';

const CATEGORIES = [
  'Web & App Dev',
  'Design & UI/UX',
  'Engineering & CAD',
  'Tutoring & Academics',
  'Writing & Translation',
  'Video & Animation'
];

const EMPTY_FILTERS = {
  search: '',
  category: '',
  status: '',
  minBudget: '',
  maxBudget: '',
  sortBy: 'newest'
};

function getStatusBadge(status) {
  switch (status) {
    case 'open':
      return 'ui-badge ui-badge-indigo';
    case 'in progress':
      return 'ui-badge ui-badge-warning';
    case 'completed':
      return 'ui-badge ui-badge-success';
    case 'cancelled':
      return 'ui-badge ui-badge-danger';
    default:
      return 'ui-badge ui-badge-neutral';
  }
}

export default function Feed() {
  const { user, isAdmin } = useAuth();

  const [applyingGig, setApplyingGig] = useState(null);
  const [applicationNotice, setApplicationNotice] = useState('');
  const [submittedGigIds, setSubmittedGigIds] = useState([]);

  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');

  const [draftFilters, setDraftFilters] = useState({
    ...EMPTY_FILTERS
  });
  const [appliedFilters, setAppliedFilters] = useState({
    ...EMPTY_FILTERS
  });

  const [editingGig, setEditingGig] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  // const [socket] = useState(() =>
  //   io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
  //     autoConnect: false
  //   })
  // );

  // useEffect(() => {
  //   socket.connect();

  //   return () => {
  //     socket.disconnect();
  //   };
  // }, [socket]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchGigs = async () => {
      setLoading(true);
      setError('');

      const params = {};

      for (const [key, value] of Object.entries(appliedFilters)) {
        if (value !== '') {
          params[key] = value;
        }
      }

      try {
        const response = await api.get('/gigs/all', {
          params,
          signal: controller.signal
        });

        if (!controller.signal.aborted) {
          setGigs(response.data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.response?.data?.error || 'Failed to load gigs.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchGigs();

    return () => {
      controller.abort();
    };
  }, [appliedFilters]);

  const handleApplicationSubmitted = (application) => {
    const gigId = application.gigId;

    setSubmittedGigIds((previous) =>
      previous.includes(gigId)
        ? previous
        : [...previous, gigId]
    );

    setApplyingGig(null);
    setApplicationNotice('Your proposal was submitted successfully.');

    // Reload using the current filters to get the saved application count.
    setAppliedFilters((previous) => ({ ...previous }));
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setDraftFilters((previous) => ({
      ...previous,
      [name]: value
    }));

    if (name === 'sortBy') {
      setAppliedFilters((previous) => ({
        ...previous,
        sortBy: value
      }));
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setFilterError('');

    const { minBudget, maxBudget } = draftFilters;

    if (
      minBudget !== '' &&
      maxBudget !== '' &&
      Number(minBudget) > Number(maxBudget)
    ) {
      setFilterError('Minimum budget cannot exceed maximum budget.');
      return;
    }

    setAppliedFilters({
      ...draftFilters,
      search: draftFilters.search.trim()
    });
  };

  const handleReset = () => {
    setDraftFilters({ ...EMPTY_FILTERS });
    setAppliedFilters({ ...EMPTY_FILTERS });
    setFilterError('');
  };

  const handleDelete = async (gig) => {
    if (!window.confirm(`Delete "${gig.title}"?`)) return;

    setDeletingId(gig._id);

    try {
      await api.delete(`/gigs/${gig._id}`);

      setGigs((previous) =>
        previous.filter((item) => item._id !== gig._id)
      );

      if (activeChat?._id === gig._id) {
        setActiveChat(null);
      }
    } catch (err) {
      window.alert(
        err.response?.data?.error || 'Failed to delete gig.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass = 'ui-field';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-800 p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
          The campus marketplace
        </p>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-xl">
            <h1 className="text-3xl font-bold sm:text-4xl">
              Find your next opportunity.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-indigo-100 sm:text-base">
              Explore projects, share your skills, and connect with people
              who need your expertise.
            </p>
          </div>

          <Link
            to="/post-gig"
            className="ui-button bg-white text-indigo-800 hover:bg-indigo-50"
          >
            + Post a gig
          </Link>
        </div>
      </header>

      <form
        onSubmit={handleSearch}
        className="ui-card space-y-5 p-5 sm:p-6"
      >
        <div>
          <label htmlFor="search" className="block text-sm font-medium mb-1">
            Search
          </label>
          <input
            id="search"
            name="search"
            placeholder="Search titles, descriptions, or skills..."
            maxLength={100}
            value={draftFilters.search}
            onChange={handleFilterChange}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-1">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={draftFilters.category}
              onChange={handleFilterChange}
              className={inputClass}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={draftFilters.status}
              onChange={handleFilterChange}
              className={inputClass}
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label htmlFor="minBudget" className="block text-sm font-medium mb-1">
              Minimum budget (LKR)
            </label>
            <input
              id="minBudget"
              name="minBudget"
              type="number"
              min="0"
              step="0.01"
              value={draftFilters.minBudget}
              onChange={handleFilterChange}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="maxBudget" className="block text-sm font-medium mb-1">
              Maximum budget (LKR)
            </label>
            <input
              id="maxBudget"
              name="maxBudget"
              type="number"
              min="0"
              step="0.01"
              value={draftFilters.maxBudget}
              onChange={handleFilterChange}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="sortBy" className="block text-sm font-medium mb-1">
              Sort by
            </label>
            <select
              id="sortBy"
              name="sortBy"
              value={draftFilters.sortBy}
              onChange={handleFilterChange}
              className={inputClass}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="budget_asc">Budget: Low to High</option>
              <option value="budget_desc">Budget: High to Low</option>
              <option value="deadline">Deadline: Soonest</option>
            </select>
          </div>
        </div>

        {filterError && (
          <p role="alert" className="text-sm text-red-600">
            {filterError}
          </p>
        )}


        {applicationNotice && (
          <div
            role="status"
            className="flex justify-between items-center gap-3 bg-green-50 text-green-800 p-4 rounded-lg"
          >
            <p>{applicationNotice}</p>

            <button
              type="button"
              onClick={() => setApplicationNotice('')}
              aria-label="Dismiss success message"
              className="font-bold"
            >
              ×
            </button>
          </div>
         )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="ui-button ui-button-primary"
          >
            Search
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="ui-button ui-button-secondary"
          >
            Reset
          </button>
        </div>
      </form>

      {loading ? (
        <div className="ui-card p-8 text-center text-slate-500">
          Loading gigs...
        </div>
      ) : error ? (
        <div role="alert" className="ui-error">
          <p>{error}</p>
          <button
            onClick={() => setAppliedFilters({ ...appliedFilters })}
            className="mt-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : gigs.length === 0 ? (
        <div className="ui-card p-8 text-center text-slate-600">
          No gigs found. Try changing your filters or post a new gig.
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {gigs.length} {gigs.length === 1 ? 'project' : 'projects'} available
          </p>

          {gigs.map((gig) => {
            const isOwner = user.id === gig.posterId?._id;
            const canDelete = isOwner || isAdmin;
            const canDiscuss = isOwner || user.userType === 'student';

            const canApply =
              user.userType === 'student' &&
              user.activeRole === 'freelancer' &&
              gig.status === 'open' &&
              Boolean(gig.posterId?._id) &&
              !isOwner;

            const submittedHere = submittedGigIds.includes(gig._id);

            return (
              <article
                key={gig._id}
                className="ui-card ui-gig-card"
              >
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{gig.title}</h2>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">
                      {gig.category}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-xl bg-emerald-50 px-3 py-1.5 font-bold text-emerald-800 text-sm">
                      LKR {Number(gig.budget).toLocaleString()}
                    </span>
                    <span className={getStatusBadge(gig.status)}>
                      {gig.status}
                    </span>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                  {gig.description}
                </p>

                {(gig.skillsRequired || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {gig.skillsRequired.map((skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        className="ui-skill"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-4 border-t border-slate-100 pt-3">
                  <span>
                    Posted by: <strong>{gig.posterId?.name || 'Unavailable user'}</strong>
                  </span>
                  <span>
                    Deadline: <strong>{new Date(gig.deadline).toLocaleDateString()}</strong>
                  </span>
                  <span>
                    Proposals: <strong>{gig.applicationsCount ?? 0}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">

                  {canApply && (
                    <button
                      type="button"
                      disabled={submittedHere}
                      onClick={() => {
                        setApplicationNotice('');
                        setActiveChat(null);
                        setApplyingGig(gig);
                      }}
                      className="ui-button ui-button-primary"
                    >
                      {submittedHere ? 'Proposal submitted' : 'Apply'}
                    </button>
                  )}



                  {isOwner && ['open', 'in progress'].includes(gig.status) && (
                    <button
                      type="button"
                      onClick={() => setEditingGig(gig)}
                      className="ui-button ui-button-secondary"
                    >
                      Edit gig
                    </button>
                  )}

                  {canDiscuss && (
                    <button
                      type="button"
                      onClick={() => setActiveChat(gig)}
                      className="ui-button ui-button-secondary"
                    >
                      {isOwner ? 'Student conversations' : 'Discuss privately'}
                    </button>
                  )}

                  {canDelete && (

                    

                    <button
                      onClick={() => handleDelete(gig)}
                      disabled={deletingId !== null}
                      className="ui-button ui-button-danger"
                    >
                      {deletingId === gig._id ? 'Deleting...' : 'Delete gig'}
                    </button>
                  )}

                  


                </div>
              </article>
            );

            

          })}
        </div>
      )}

      

        {applyingGig && (
          <ApplicationModal
            key={applyingGig._id}
            gig={applyingGig}
            onClose={() => setApplyingGig(null)}
            onSubmitted={handleApplicationSubmitted}
          />
        )}

      {activeChat && (
        <Chat
          key={activeChat._id}
          gig={activeChat}
          onClose={() => setActiveChat(null)}
        />
      )}

      {editingGig && (
        <EditGigModal
          gig={editingGig}
          onClose={() => setEditingGig(null)}
          onUpdated={() => {
            setEditingGig(null);
            setApplicationNotice('Gig updated successfully.');
            setAppliedFilters((previous) => ({ ...previous }));
          }}
        />
      )}
    </div>
  );
}