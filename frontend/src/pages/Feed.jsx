import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
// import io from 'socket.io-client';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Chat from '../components/Chat';
import ApplicationModal from '../components/ApplicationModal';

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
  maxBudget: ''
};

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

  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-5xl mx-auto mt-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Explore gigs</h1>
          <p className="text-sm text-gray-600 mt-1">
            Find projects by skill, category, status, or budget.
          </p>
        </div>

        <Link
          to="/post-gig"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Post a gig
        </Link>
      </div>

      <form
        onSubmit={handleSearch}
        className="bg-white p-5 rounded-lg shadow space-y-4"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Search
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
          >
            Reset
          </button>
        </div>
      </form>

      {loading ? (
        <p role="status" className="text-gray-600">Loading gigs...</p>
      ) : error ? (
        <div role="alert" className="bg-red-50 p-4 rounded">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setAppliedFilters({ ...appliedFilters })}
            className="mt-2 text-blue-700 underline"
          >
            Retry
          </button>
        </div>
      ) : gigs.length === 0 ? (
        <div className="bg-white p-8 rounded-lg text-center text-gray-600">
          No gigs found. Try changing your filters or post a new gig.
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {gigs.length} gig{gigs.length === 1 ? '' : 's'} found
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
                className="bg-white p-5 rounded-lg shadow border-l-4 border-blue-600"
              >
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{gig.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {gig.category}
                    </p>
                  </div>

                  <span className="font-bold text-green-700">
                    LKR {Number(gig.budget).toLocaleString()}
                  </span>
                </div>

                <p className="text-gray-700 mt-3 whitespace-pre-wrap">
                  {gig.description}
                </p>

                {(gig.skillsRequired || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {gig.skillsRequired.map((skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-4 border-t pt-3">
                  <span>
                    Posted by: {gig.posterId?.name || 'Unavailable user'}
                  </span>
                  <span>
                    Deadline: {new Date(gig.deadline).toLocaleDateString()}
                  </span>
                  <span className="capitalize">
                    Status: {gig.status}
                  </span>

                  <span>
                    Applications: {gig.applicationsCount ?? 0}
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
                      className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submittedHere ? 'Proposal submitted' : 'Apply'}
                    </button>
                  )}



                  {canDiscuss && (
                    <button
                      type="button"
                      onClick={() => setActiveChat(gig)}
                      className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-700"
                    >
                      {isOwner ? 'Student conversations' : 'Discuss privately'}
                    </button>
                  )}

                  {canDelete && (

                    

                    <button
                      onClick={() => handleDelete(gig)}
                      disabled={deletingId !== null}
                      className="text-red-600 px-3 py-2 rounded text-sm hover:bg-red-50 disabled:opacity-50"
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
    </div>
  );
}