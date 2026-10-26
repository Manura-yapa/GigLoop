import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const buttonClass =
  'rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50';

const secondaryClass =
  'rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50';

export default function Dashboard() {
  const [gigs, setGigs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedGigId, setSelectedGigId] = useState('');
  const [proposals, setProposals] = useState([]);

  const [loading, setLoading] = useState(true);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState('');
  const [proposalError, setProposalError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const loadDashboard = useCallback(async (signal) => {
    const [gigResponse, applicationResponse] = await Promise.all([
      api.get('/gigs/my-posted', { signal }),
      api.get('/applications/my-applications', { signal }),
    ]);

    return {
      gigs: gigResponse.data,
      applications: applicationResponse.data,
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDashboard() {
      try {
        const data = await loadDashboard(controller.signal);

        if (!controller.signal.aborted) {
          setGigs(data.gigs);
          setApplications(data.applications);
          setError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.response?.data?.error || 'Failed to load your dashboard.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => controller.abort();
  }, [loadDashboard, reloadKey]);

  useEffect(() => {
    if (!selectedGigId) return undefined;

    const controller = new AbortController();

    async function fetchProposals() {
      try {
        const response = await api.get(
          `/applications/gig/${selectedGigId}`,
          { signal: controller.signal }
        );

        if (!controller.signal.aborted) {
          setProposals(response.data);
          setProposalError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setProposalError(
            err.response?.data?.error || 'Failed to load proposals.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setProposalLoading(false);
        }
      }
    }

    fetchProposals();

    return () => controller.abort();
  }, [selectedGigId, reloadKey]);

  const refresh = () => {
    setLoading(true);
    setError('');

    if (selectedGigId) {
      setProposalLoading(true);
      setProposalError('');
    }

    setReloadKey((value) => value + 1);
  };

  const openProposals = (gigId) => {
    if (selectedGigId === gigId) {
      setSelectedGigId('');
      setProposals([]);
      setProposalError('');
      return;
    }

    setProposals([]);
    setProposalError('');
    setProposalLoading(true);
    setSelectedGigId(gigId);
  };

  const runAction = async (request, successMessage) => {
    if (busy) return;

    setBusy(true);
    setError('');
    setNotice('');

    try {
      await request();
      setNotice(successMessage);
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'The action failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const decideProposal = (applicationId, status) => {
    const question =
      status === 'accepted'
        ? 'Hire this applicant? Other pending proposals will be rejected.'
        : 'Reject this proposal?';

    if (!window.confirm(question)) return;

    runAction(
      () => api.put(`/applications/${applicationId}/status`, { status }),
      status === 'accepted'
        ? 'Applicant hired. The gig is now in progress.'
        : 'Proposal rejected.'
    );
  };

  const changeGigStatus = (gigId, status) => {
    if (!window.confirm(`Mark this gig as ${status}?`)) return;

    runAction(
      () => api.put(`/gigs/${gigId}/status`, { status }),
      `Gig ${status} successfully.`
    );
  };

  const withdrawApplication = (applicationId) => {
    if (!window.confirm('Withdraw this pending proposal?')) return;

    runAction(
      () => api.delete(`/applications/${applicationId}`),
      'Proposal withdrawn.'
    );
  };

  const actionsDisabled = busy || loading || proposalLoading;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My dashboard</h1>
          <p className="text-sm text-gray-600">
            Manage your gigs and track your proposals.
          </p>
        </div>

        <div className="flex gap-2">
          <Link to="/post-gig" className={buttonClass}>
            Post a gig
          </Link>

          <button
            type="button"
            onClick={refresh}
            disabled={actionsDisabled}
            className={secondaryClass}
          >
            Refresh
          </button>
        </div>
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
            disabled={actionsDisabled}
            className="mt-2 underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <p role="status" className="text-gray-600">
          Loading dashboard...
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">My posted gigs</h2>

        {!loading && !error && gigs.length === 0 && (
          <p className="rounded border bg-white p-4 text-gray-600">
            You have not posted any gigs yet.
          </p>
        )}

        {gigs.map((gig) => (
          <article
            key={gig._id}
            className="space-y-4 rounded-lg border bg-white p-5"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <h3 className="font-semibold">{gig.title}</h3>
                <p className="text-sm text-gray-600">
                  {gig.category} · LKR {Number(gig.budget).toLocaleString()}
                </p>
              </div>

              <span className="text-sm font-medium capitalize">
                {gig.status}
              </span>
            </div>

            <p className="text-sm text-gray-600">
              Proposals: {gig.applicationsCount ?? 0}
            </p>

            {gig.assignedFreelancer && (
              <p className="text-sm">
                Assigned freelancer:{' '}
                <strong>
                  {gig.assignedFreelancer.name || 'Assigned account'}
                </strong>
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openProposals(gig._id)}
                disabled={busy || loading}
                className={secondaryClass}
              >
                {selectedGigId === gig._id
                  ? 'Hide proposals'
                  : 'View proposals'}
              </button>

              {gig.status === 'in progress' && (
                <button
                  type="button"
                  onClick={() => changeGigStatus(gig._id, 'completed')}
                  disabled={actionsDisabled}
                  className={buttonClass}
                >
                  Mark completed
                </button>
              )}

              {['open', 'in progress'].includes(gig.status) && (
                <button
                  type="button"
                  onClick={() => changeGigStatus(gig._id, 'cancelled')}
                  disabled={actionsDisabled}
                  className={secondaryClass}
                >
                  Cancel gig
                </button>
              )}
            </div>

            {selectedGigId === gig._id && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-semibold">Submitted proposals</h4>

                {proposalLoading ? (
                  <p role="status">Loading proposals...</p>
                ) : proposalError ? (
                  <p role="alert" className="text-red-600">
                    {proposalError}
                  </p>
                ) : proposals.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No proposals have been submitted.
                  </p>
                ) : (
                  proposals.map((proposal) => (
                    <div
                      key={proposal._id}
                      className="space-y-2 rounded border bg-gray-50 p-4"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <h5 className="font-semibold">
                          {proposal.applicantId?.name ||
                            'Unavailable account'}
                        </h5>
                        <span className="text-sm capitalize">
                          {proposal.status}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600">
                        {proposal.applicantId?.faculty || 'Faculty not provided'}
                      </p>

                      <p className="text-sm">
                        LKR {Number(proposal.bidAmount).toLocaleString()}
                        {' · '}
                        {proposal.estimatedDays} days
                      </p>

                      <p className="whitespace-pre-wrap break-words text-sm">
                        {proposal.pitch}
                      </p>

                      {proposal.applicantId?.skills?.length > 0 && (
                        <p className="text-sm text-gray-600">
                          Skills: {proposal.applicantId.skills.join(', ')}
                        </p>
                      )}

                      {gig.status === 'open' &&
                        proposal.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                decideProposal(proposal._id, 'accepted')
                              }
                              disabled={
                                actionsDisabled || !proposal.applicantId
                              }
                              className={buttonClass}
                            >
                              Accept proposal
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                decideProposal(proposal._id, 'rejected')
                              }
                              disabled={actionsDisabled}
                              className={secondaryClass}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
            )}
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">My applications</h2>

        {!loading && !error && applications.length === 0 && (
          <p className="rounded border bg-white p-4 text-gray-600">
            You have not submitted any proposals yet.
          </p>
        )}

        {applications.map((application) => (
          <article
            key={application._id}
            className="space-y-3 rounded-lg border bg-white p-5"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-semibold">
                {application.gigId?.title || 'Gig no longer available'}
              </h3>

              <span className="text-sm font-medium capitalize">
                Proposal: {application.status}
              </span>
            </div>

            <p className="text-sm text-gray-600">
              Client: {application.gigId?.posterId?.name || 'Unavailable'}
              {' · '}
              Gig status: {application.gigId?.status || 'Unavailable'}
            </p>

            <p className="text-sm">
              Your bid: LKR {Number(application.bidAmount).toLocaleString()}
              {' · '}
              {application.estimatedDays} days
            </p>

            <p className="whitespace-pre-wrap break-words text-sm">
              {application.pitch}
            </p>

            {application.status === 'pending' && (
              <button
                type="button"
                onClick={() => withdrawApplication(application._id)}
                disabled={actionsDisabled}
                className={secondaryClass}
              >
                Withdraw proposal
              </button>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}